import "server-only";
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import {
  detectQuotaError,
  EXTRACT_FALLBACK_MESSAGE,
} from "@/lib/anthropic-fallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Live-pipeline EXTRACTOR demo. Mirrors the Python extractor/extractor.py:
 * loads the same shared/extractor_*.{json,md} contracts, calls Claude with
 * tool use, returns the recorded AssessableCriterion objects.
 *
 * Scope: ONE small section per request, not the full document. The cohort
 * watches the EXTRACTOR shape produce real structured output from real
 * caseworker prose, in <20s. The Python pipeline still does the full
 * document.
 */

// Match the Python extractor's frontier-model choice. Opus is slower than
// Sonnet but produces more reliable schema-conforming output for the demo.
const MODEL = "claude-opus-4-7";

const SHARED_DIR = path.join(process.cwd(), "shared");
const SYSTEM_PROMPT = fs.readFileSync(
  path.join(SHARED_DIR, "extractor_system_prompt.md"),
  "utf8",
);
const TOOL = JSON.parse(
  fs.readFileSync(path.join(SHARED_DIR, "extractor_tool_schema.json"), "utf8"),
) as {
  name: string;
  description: string;
  input_schema: { type: "object"; required: string[]; properties: Record<string, unknown> };
};

interface RequestBody {
  routeId?: string;
  documentUrl?: string;
  documentVersion?: string;
  sectionHeading?: string;
  sectionText?: string;
}

function jsonError(status: number, message: string, extra: object = {}) {
  return new Response(JSON.stringify({ ok: false, message, ...extra }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fillSourceDefaults(
  criterion: Record<string, unknown>,
  routeId: string,
  documentUrl: string,
  documentVersion: string,
  sectionHeading: string,
): Record<string, unknown> {
  if (!criterion.route) criterion.route = routeId;
  const source = (criterion.source ?? {}) as Record<string, unknown>;
  source.document_url ??= documentUrl;
  source.document_version ??= documentVersion;
  const anchor = (source.anchor ?? {}) as Record<string, unknown>;
  anchor.section_heading ??= sectionHeading;
  source.anchor = anchor;
  criterion.source = source;
  return criterion;
}

/**
 * Match the Python validator's verbatim_text round-trip check: reject any
 * criterion whose verbatim_text doesn't appear in the input section. This
 * catches the dominant EXTRACTOR hallucination mode (model invents prose).
 */
function verbatimRoundTrips(criterion: Record<string, unknown>, sectionText: string): boolean {
  const source = criterion.source as { anchor?: { verbatim_text?: string } } | undefined;
  const verbatim = source?.anchor?.verbatim_text?.trim() ?? "";
  if (!verbatim) return false;
  const norm = (s: string) => s.replace(/\s+/g, " ").toLowerCase();
  const head = norm(verbatim).slice(0, 80);
  return head.length > 0 && norm(sectionText).includes(head);
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError(
      503,
      "Live extraction is not configured on this deployment. Set ANTHROPIC_API_KEY to enable.",
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonError(400, "Invalid request body.");
  }

  const sectionText = (body.sectionText ?? "").trim();
  if (!sectionText) {
    return jsonError(400, "Missing sectionText. Run /api/pipeline/crawl first.");
  }
  if (sectionText.length > 6000) {
    return jsonError(
      400,
      "Section is too large for the live demo. The Python pipeline handles the full document.",
    );
  }

  const routeId = body.routeId ?? "innovator_founder";
  const documentUrl =
    body.documentUrl ??
    "https://www.gov.uk/government/publications/innovator-appendix-w-workers/innovator-founder-caseworker-guidance-accessible";
  const documentVersion = body.documentVersion ?? "v10.0 27 February 2026";
  const sectionHeading = body.sectionHeading ?? "Untitled section";

  const userMessage =
    `Route: ${routeId}\n` +
    `Document URL: ${documentUrl}\n` +
    `Document version: ${documentVersion}\n` +
    `Section heading: ${sectionHeading}\n\n` +
    `Section text:\n---\n${sectionText}\n---\n\n` +
    "Extract any assessable criteria from this section. If none, return no tool calls.";

  const t0 = performance.now();
  const anthropic = new Anthropic({ apiKey, maxRetries: 3 });

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      tools: [TOOL] as unknown as Anthropic.Tool[],
      messages: [{ role: "user", content: userMessage }],
    });
  } catch (err) {
    if (detectQuotaError(err)) {
      // Friendly fallback envelope for the live cohort demo. The shape
      // intentionally keeps `ok: true` so the live-pipeline UI marks the
      // EXTRACTOR step as a calm "paused" state instead of red "failed".
      return Response.json(
        {
          ok: true,
          status: "fallback_quota",
          message: EXTRACT_FALLBACK_MESSAGE,
          model_version: MODEL,
          section_heading: sectionHeading,
          section_text: sectionText,
          criteria: [],
          rejected: [],
          wall_ms: Math.round(performance.now() - t0),
        },
        { status: 200 },
      );
    }
    const e = err as { status?: number; message?: string };
    let message = e.message ?? "EXTRACTOR call failed.";
    if (e.status === 429) message = "Rate limit reached on EXTRACTOR call.";
    if (e.status === 401 || e.status === 403)
      message = "EXTRACTOR credentials are invalid.";
    return jsonError(502, message);
  }

  const criteria: Array<Record<string, unknown>> = [];
  const rejected: Array<{ id?: unknown; reason: string }> = [];
  for (const block of response.content) {
    if (block.type !== "tool_use" || block.name !== TOOL.name) continue;
    const raw = block.input as Record<string, unknown>;
    const filled = fillSourceDefaults(
      { ...raw },
      routeId,
      documentUrl,
      documentVersion,
      sectionHeading,
    );
    if (!verbatimRoundTrips(filled, sectionText)) {
      rejected.push({ id: filled.id, reason: "verbatim_text_not_in_section" });
      continue;
    }
    criteria.push(filled);
  }

  const wall_ms = Math.round(performance.now() - t0);

  return Response.json({
    ok: true,
    model_version: MODEL,
    section_heading: sectionHeading,
    section_text: sectionText,
    criteria,
    rejected,
    wall_ms,
  });
}
