import "server-only";
import { createHash } from "node:crypto";
import { createClient, type RedisClientType } from "redis";

/**
 * Deterministic-scoring cache.
 *
 * Anthropic models at temperature:0 are "near-deterministic" but not strictly
 * deterministic: backend batching effects and GPU floating-point arithmetic
 * produce small residual variance (typically ±1pt on aggregates, occasionally
 * crossing a band boundary) on identical inputs. For an immigration-readiness
 * tool, score drift between consecutive re-scores erodes trust.
 *
 * The fix is to cache the assembled response, keyed by a SHA-256 of the
 * inputs. Re-scoring the same profile against the same criteria returns the
 * cached envelope verbatim, byte-identical down to scored_at and wall_ms.
 *
 * Storage: Vercel Redis (Marketplace integration, TCP via REDIS_URL) with a
 * 30-day TTL refreshed on read. Survives function cold-starts and instance
 * reshuffles, so re-scoring the same profile 20 minutes later (instance
 * fully cold) still returns the cached envelope.
 *
 * Graceful fallback: when Redis is unreachable (missing REDIS_URL, network
 * blip, quota), the cache transparently degrades to a per-instance Map.
 * Scoring keeps working; we log once per outage and stop attempting Redis
 * round-trips until the next deploy. The cache header (X-Score-Cache) still
 * reports hit / miss accurately for whichever backend served the request.
 *
 * Bypass: R_NONDETERMINISTIC=1 short-circuits both layers. Reserved for the
 * EVALUATOR concordance harness which intentionally wants sampling variance.
 */

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

type CacheBucket = "score" | "qualify";

const memoryFallback: Record<CacheBucket, Map<string, unknown>> = {
  score: new Map(),
  qualify: new Map(),
};

// Shared lazy Redis client. The official `redis` package keeps a single TCP
// connection per process; in a Vercel function instance that means one
// socket reused across warm invocations, no per-request TLS handshake.
let redisClient: RedisClientType | null = null;
let redisInitPromise: Promise<RedisClientType | null> | null = null;
let redisOutageLogged = false;

function markRedisDown(op: "connect" | "get" | "set" | "expire", err: unknown): void {
  if (redisOutageLogged) return;
  redisOutageLogged = true;
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(
    `[scoring-cache] Vercel Redis ${op} failed; falling back to in-memory cache for the rest of this instance. Error: ${msg}`,
  );
}

async function getRedis(): Promise<RedisClientType | null> {
  if (redisOutageLogged) return null;
  if (redisClient && redisClient.isOpen) return redisClient;
  if (!process.env.REDIS_URL) {
    markRedisDown("connect", new Error("REDIS_URL is not set"));
    return null;
  }
  if (!redisInitPromise) {
    redisInitPromise = (async () => {
      try {
        const client: RedisClientType = createClient({
          url: process.env.REDIS_URL,
          // Don't let an init-time blip crash the function. We catch errors
          // ourselves and flip to in-memory.
          socket: {
            connectTimeout: 2000,
            reconnectStrategy: false,
          },
        });
        // Suppress unhandled-error events; we surface failures via the
        // try/catch in get/set instead.
        client.on("error", () => {});
        await client.connect();
        redisClient = client;
        return client;
      } catch (err) {
        markRedisDown("connect", err);
        return null;
      }
    })();
  }
  return redisInitPromise;
}

function fullKey(bucket: CacheBucket, key: string): string {
  return `${bucket}:v1:${key}`;
}

export function deterministicKey(parts: ReadonlyArray<string>): string {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(part);
    hash.update("\x00"); // null-byte separator — won't collide with any input.
  }
  return hash.digest("hex");
}

async function redisGet<T>(key: string): Promise<T | undefined> {
  const client = await getRedis();
  if (!client) return undefined;
  try {
    const raw = await client.get(key);
    if (raw == null) return undefined;
    const parsed = JSON.parse(raw) as T;
    // Refresh TTL on read so frequently-replayed scorings never age out.
    // expire() failure is non-fatal — the read already succeeded.
    void client.expire(key, TTL_SECONDS).catch(() => {});
    return parsed;
  } catch (err) {
    markRedisDown("get", err);
    return undefined;
  }
}

async function redisSet<T>(key: string, value: T): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: TTL_SECONDS });
  } catch (err) {
    markRedisDown("set", err);
  }
}

export async function getCached<T>(
  bucket: CacheBucket,
  key: string,
): Promise<T | undefined> {
  if (!isDeterministicMode()) return undefined;
  const fk = fullKey(bucket, key);
  const fromRedis = await redisGet<T>(fk);
  if (fromRedis !== undefined) return fromRedis;
  return memoryFallback[bucket].get(fk) as T | undefined;
}

export async function setCached<T>(
  bucket: CacheBucket,
  key: string,
  value: T,
): Promise<void> {
  if (!isDeterministicMode()) return;
  const fk = fullKey(bucket, key);
  // Always populate the in-memory layer too: on Redis outage we still get
  // intra-instance determinism, and on Redis success the in-memory layer
  // is a cheap zero-RTT shortcut for warm-instance reads.
  memoryFallback[bucket].set(fk, value);
  await redisSet(fk, value);
}

export function clearCache(bucket?: CacheBucket): void {
  if (bucket) memoryFallback[bucket].clear();
  else {
    memoryFallback.score.clear();
    memoryFallback.qualify.clear();
  }
}

/**
 * Scoring is deterministic by default. Set R_NONDETERMINISTIC=1 in the
 * environment to opt out (for the EVALUATOR concordance harness).
 */
export function isDeterministicMode(): boolean {
  return process.env.R_NONDETERMINISTIC !== "1";
}

/**
 * Sampling overrides applied to every Anthropic call that contributes to a
 * probability, band, MATCH narrative, or readiness pillar. temperature:0
 * triggers greedy decoding inside the API; top_p is intentionally NOT set
 * (Anthropic's API requires top_p in (0, 1] and rejects 0).
 *
 * Even at temperature:0 Anthropic models exhibit small residual variance
 * from backend batching and floating-point nondeterminism. The Redis cache
 * in this file is what guarantees byte-identical replays across function
 * cold-starts — sampling pinning is defence in depth.
 */
export function deterministicSampling(): { temperature: 0 } | {} {
  if (isDeterministicMode()) {
    return { temperature: 0 };
  }
  return {};
}
