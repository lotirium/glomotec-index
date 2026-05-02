import "server-only";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

/**
 * Live-pipeline CHANGEFEED demo. Mirrors the Python changefeed/changefeed.py
 * three-layer compare, scoped to what we can do without re-extracting in the
 * browser tab: byte-hash compare and version-string compare against the
 * stored snapshot at fixtures/snapshot_v10.0.json.
 *
 * The full Python CHANGEFEED also runs criterion-level diffs (additions,
 * removals, threshold tweaks). That requires a complete fresh extraction,
 * which is the production Python path's job. The demo reports honestly:
 * byte-level diff fires whenever gov.uk's HTML drifts (it almost always
 * does, due to nonce-like markers in the page header), but the version
 * string and criterion count come from the same v10.0 publication.
 */

interface Snapshot {
  route_id: string;
  version_string: string;
  content_hash: string;
  fetched_at: string;
  source_url: string;
  criterion_count: number;
  criterion_ids: string[];
}

const SNAPSHOT_PATH = path.join(
  process.cwd(),
  "fixtures",
  "snapshot_v10.0.json",
);

interface RequestBody {
  routeId?: string;
  contentHash?: string;
  versionString?: string;
}

function jsonError(status: number, message: string) {
  return Response.json({ ok: false, message }, { status });
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonError(400, "Invalid request body.");
  }

  const currentHash = (body.contentHash ?? "").trim();
  if (!currentHash) {
    return jsonError(400, "Missing contentHash. Run /api/pipeline/crawl first.");
  }

  let snapshot: Snapshot;
  try {
    snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8")) as Snapshot;
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error
        ? `Snapshot fixture missing or unreadable: ${err.message}`
        : "Snapshot fixture missing or unreadable.",
    );
  }

  const byteHashChanged = currentHash !== snapshot.content_hash;
  const currentVersion = (body.versionString ?? "").trim();
  const versionChanged =
    currentVersion.length > 0 &&
    !snapshot.version_string.includes(currentVersion);

  // Classify the diff. The Python changefeed splits into numeric / pathway /
  // process / cosmetic; we can only honestly say one of three things from
  // this scope: structurally same, byte-drifted same content, or new version.
  let change_class: "no_change" | "byte_drift" | "version_changed";
  let summary: string;
  let priority: "alert_immediate" | "alert_digest" | "log_only";

  if (versionChanged) {
    change_class = "version_changed";
    summary = `New caseworker guidance version detected. Stored: ${snapshot.version_string}. Live: ${currentVersion}. Re-run EXTRACTOR for full criterion-level diff.`;
    priority = "alert_immediate";
  } else if (byteHashChanged) {
    change_class = "byte_drift";
    summary = `Byte hash differs but version unchanged (${snapshot.version_string}). Likely page-header drift; criterion-level diff against ${snapshot.criterion_count} stored criteria would confirm zero semantic changes.`;
    priority = "log_only";
  } else {
    change_class = "no_change";
    summary = `Byte-identical to snapshot. ${snapshot.version_string}, ${snapshot.criterion_count} criteria stable.`;
    priority = "log_only";
  }

  return Response.json({
    ok: true,
    change_class,
    priority,
    summary,
    byte_hash_changed: byteHashChanged,
    version_changed: versionChanged,
    snapshot: {
      version_string: snapshot.version_string,
      content_hash: snapshot.content_hash,
      criterion_count: snapshot.criterion_count,
      fetched_at: snapshot.fetched_at,
    },
    current: {
      content_hash: currentHash,
      version_string: currentVersion || null,
    },
  });
}
