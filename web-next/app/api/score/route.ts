import Anthropic from "@anthropic-ai/sdk";
import { getCriteria, getRoute } from "@/lib/data";
import {
  BATCH_SCORING_TOOL,
  buildBatchPrompt,
  type BatchScoringToolItem,
} from "@/lib/score-prompt";
import { bandFromProbability, buildAssessmentRun } from "@/lib/scoring";
import type { Criterion, ScoringResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Per-batch calls use Haiku 4.5 — fast structured-output latency is what
 * makes parallel batch scoring feel live (full result in 5-8s).
 */
const MODEL = "claude-haiku-4-5-20251001";
/**
 * Criteria per batch. With 16 criteria total at 4-per-batch we make 4
 * concurrent requests — well under Tier 1 RPM (50/min) — and the wall
 * time is one batch's latency. Smaller batches generate less output
 * per call, so the slowest batch finishes faster.
 */
const BATCH_SIZE = 4;
const MAX_TOKENS_PER_BATCH = 500 * BATCH_SIZE;

interface RequestBody {
  routeId?: string;
  clientSlug?: string;
  profile?: string;
}

function jsonError(status: number, message: string, extra: object = {}) {
  return new Response(JSON.stringify({ ok: false, message, ...extra }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function enrichedCriterion(c: Criterion) {
  return {
    id: c.id,
    decision_stage: c.decision_stage,
    modality: c.modality,
    assessment_mechanism: c.assessment_mechanism,
    category: c.category,
    predicate: c.predicate,
    source: c.source,
    burden_allocation: c.burden_allocation,
    predicate_statement: c.predicate.statement,
    section_heading:
      c.source.section_heading ??
      c.source.anchor?.section_heading ??
      c.source.anchor?.verbatim_text,
    verbatim_text: c.source.anchor?.verbatim_text,
  };
}

function failedResult(c: Criterion, message: string): ScoringResult {
  return {
    criterion_id: c.id,
    probability_meets: 0,
    confidence_level: "below_threshold",
    supporting_evidence: [],
    missing_inputs: [message],
    reasoning: `Scorer error: ${message}`,
    scored_at: new Date().toISOString(),
    model_version: MODEL,
    sanity_check_flags: [{ field: "model_output", reason: "scoring_failed" }],
    criterion: enrichedCriterion(c),
    error: message,
  };
}

function buildResultFromItem(
  criterion: Criterion,
  raw: Partial<BatchScoringToolItem>,
): ScoringResult {
  const p = Math.max(0, Math.min(1, Number(raw.probability_meets) || 0));
  return {
    criterion_id: criterion.id,
    probability_meets: p,
    confidence_level: bandFromProbability(p),
    supporting_evidence: Array.isArray(raw.supporting_evidence)
      ? raw.supporting_evidence.slice(0, 3).map((e) => ({
          field: "profile",
          matches: typeof e?.matches === "string" ? e.matches : "",
        }))
      : [],
    missing_inputs: Array.isArray(raw.missing_inputs)
      ? raw.missing_inputs.slice(0, 3).map((m) => String(m))
      : [],
    reasoning: typeof raw.reasoning === "string" ? raw.reasoning : "",
    scored_at: new Date().toISOString(),
    model_version: MODEL,
    criterion: enrichedCriterion(criterion),
  };
}

async function scoreBatch({
  criteria,
  profile,
  routeName,
  anthropic,
}: {
  criteria: Criterion[];
  profile: string;
  routeName: string;
  anthropic: Anthropic;
}): Promise<{ results: ScoringResult[]; error?: string }> {
  const { system, user } = buildBatchPrompt({ criteria, profile, routeName });
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS_PER_BATCH,
      system,
      tools: [BATCH_SCORING_TOOL] as unknown as Anthropic.Tool[],
      tool_choice: { type: "tool", name: BATCH_SCORING_TOOL.name },
      messages: [{ role: "user", content: user }],
    });
    const toolBlock = response.content.find(
      (b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use",
    );
    if (!toolBlock) {
      return {
        results: criteria.map((c) =>
          failedResult(c, "Model returned no structured output."),
        ),
        error: "no_tool_use",
      };
    }
    const input = toolBlock.input as {
      criteria_scored?: Array<Partial<BatchScoringToolItem>>;
    };
    const items = Array.isArray(input.criteria_scored) ? input.criteria_scored : [];
    const byId = new Map<string, Partial<BatchScoringToolItem>>();
    for (const it of items) {
      if (it && typeof it.criterion_id === "string") {
        byId.set(it.criterion_id, it);
      }
    }
    const results = criteria.map((c) => {
      const raw = byId.get(c.id);
      if (!raw) {
        return failedResult(c, "Model omitted this criterion in batch output.");
      }
      return buildResultFromItem(c, raw);
    });
    return { results };
  } catch (err) {
    const e = err as { status?: number; headers?: Record<string, string>; message?: string };
    let kind = "unknown";
    let msg = e.message ?? "Unknown scoring error.";
    if (e.status === 429) {
      kind = "rate_limit";
      msg = "Rate limit reached on this batch.";
    } else if (e.status === 401 || e.status === 403) {
      kind = "auth";
      msg = "Scoring credentials are invalid.";
    }
    return {
      results: criteria.map((c) => failedResult(c, msg)),
      error: kind,
    };
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError(
      503,
      "Scoring is not configured on this deployment. Set ANTHROPIC_API_KEY to enable.",
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonError(400, "Invalid request body.");
  }

  const profile = (body.profile ?? "").trim();
  if (!profile) {
    return jsonError(400, "Profile is empty. Add details and try again.");
  }
  if (profile.length > 12_000) {
    return jsonError(400, "Profile is too long. Keep it under ~12,000 characters.");
  }

  const routeId = body.routeId ?? "innovator_founder";
  const route = await getRoute(routeId);
  if (!route) return jsonError(400, "Unknown route.");

  const criteria = await getCriteria(routeId);
  if (criteria.length === 0) {
    return jsonError(400, "No criteria available for this route.");
  }

  // maxRetries: 5 lets the SDK transparently retry transient 429s on the
  // parallel block — cheap because retries hit the cached system prompt.
  const anthropic = new Anthropic({ apiKey, maxRetries: 5 });
  const clientSlug = body.clientSlug ?? "draft";
  const startedAt = new Date().toISOString();
  const t0 = performance.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const write = (obj: unknown) => {
        controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
      };

      write({
        type: "started",
        total: criteria.length,
        scored_at: startedAt,
        route_id: routeId,
        client_slug: clientSlug,
        criteria: criteria.map(enrichedCriterion),
      });

      const results: ScoringResult[] = [];

      // Distribute the heavyweight criteria (eligibility-stage, deeper
      // reasoning) into separate batches so no single batch carries both —
      // otherwise that batch's latency dominates wall time. Lighter
      // validity-stage criteria fill the remaining slots, smallest-batch
      // first to keep batch sizes equal.
      const batchCount = Math.ceil(criteria.length / BATCH_SIZE);
      const heavy = criteria.filter((c) => c.decision_stage === "eligibility");
      const light = criteria.filter((c) => c.decision_stage !== "eligibility");
      const batches: Criterion[][] = Array.from({ length: batchCount }, () => []);
      heavy.forEach((c, i) => batches[i % batchCount].push(c));
      for (const c of light) {
        let target = 0;
        for (let i = 1; i < batches.length; i++) {
          if (batches[i].length < batches[target].length) target = i;
        }
        batches[target].push(c);
      }

      const runBatch = async (batch: Criterion[]) => {
        const { results: batchResults, error } = await scoreBatch({
          criteria: batch,
          profile,
          routeName: route.name,
          anthropic,
        });
        // Stream rows in the order they appear inside this batch.
        for (const r of batchResults) {
          results.push(r);
          write({ type: "criterion", result: r, error: error ?? null });
        }
      };

      try {
        // All batches in parallel. With 4 batches × 4 criteria we make 4
        // concurrent requests — well under Tier 1's 50 RPM — and the wall
        // time is the slowest batch's latency (typically 5-7s on Haiku 4.5).
        await Promise.all(batches.map(runBatch));
      } catch (err) {
        write({
          type: "error",
          message:
            err instanceof Error ? err.message : "Scoring failed unexpectedly.",
        });
      }

      // Sort results into criterion order before assembling the final envelope.
      const order = new Map(criteria.map((c, i) => [c.id, i]));
      results.sort(
        (a, b) =>
          (order.get(a.criterion_id) ?? 0) - (order.get(b.criterion_id) ?? 0),
      );

      const assessment = buildAssessmentRun({
        client_slug: clientSlug,
        route_id: routeId,
        results,
        scored_at: startedAt,
      });

      const wallMs = Math.round(performance.now() - t0);
      write({ type: "complete", assessment, wall_ms: wallMs });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      // no-transform forbids any proxy compression/recoding that would force
      // buffering; X-Accel-Buffering: no is the Nginx/Vercel-edge opt-out.
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Connection": "keep-alive",
      // Belt-and-braces: explicitly tell intermediaries not to gzip this
      // response. A compression layer buffers until its window is full,
      // which can collapse 4 progressive batches into one final flush.
      "Content-Encoding": "identity",
    },
  });
}
