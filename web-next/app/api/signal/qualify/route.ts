import Anthropic from "@anthropic-ai/sdk";
import { getCriteria, getRoute } from "@/lib/data";
import {
  BATCH_SCORING_TOOL,
  buildBatchPrompt,
  type BatchScoringToolItem,
} from "@/lib/score-prompt";
import { bandFromProbability } from "@/lib/scoring";
import {
  RECORD_PROSPECT_VERDICT_TOOL,
  VERDICT_SYNTH_SYSTEM_PROMPT,
  buildVerdictUserPrompt,
  type ProspectVerdictBody,
} from "@/lib/signal/qualify";
import {
  nextStepForVerdict,
  verdictFromSubstantivePct,
} from "@/lib/signal/verdict";
import {
  detectQuotaError,
  QUALIFY_FALLBACK,
  type QuotaFallback,
} from "@/lib/anthropic-fallback";
import type {
  ProspectProfile,
  SignalQualification,
} from "@/lib/signal/types";
import type { Criterion, ScoringResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Haiku 4.5 keeps both the per-criterion scoring and the synthesis fast. */
const SCORE_MODEL = "claude-haiku-4-5-20251001";
const VERDICT_MODEL = "claude-haiku-4-5-20251001";
const BATCH_SIZE = 4;
const MAX_TOKENS_PER_BATCH = 500 * BATCH_SIZE;

/** Innovator Founder is the only route SIGNAL pre-qualifies against in v0. */
const ROUTE_ID = "innovator_founder";

interface RequestBody {
  profile?: ProspectProfile;
  /** Free-form text fallback. Used only when profile is missing. */
  profile_text?: string;
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ ok: false, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildProfileText(p: ProspectProfile): string {
  const lines: string[] = [];
  if (p.nationality) lines.push(`Nationality: ${p.nationality}`);
  if (p.age) lines.push(`Age: ${p.age}`);
  if (p.current_visa_status) lines.push(`Current visa status: ${p.current_visa_status}`);
  if (p.education) lines.push(`Education: ${p.education}`);
  if (p.business_stage) lines.push(`Business stage: ${p.business_stage}`);
  if (p.funding) lines.push(`Funding raised: ${p.funding}`);
  if (p.endorsement_status)
    lines.push(`Endorsement status: ${p.endorsement_status}`);
  if (p.english_proficiency)
    lines.push(`English proficiency: ${p.english_proficiency}`);
  if (p.prior_immigration_history)
    lines.push(`Prior immigration history: ${p.prior_immigration_history}`);
  lines.push("", `Narrative summary: ${p.narrative_summary.trim()}`);
  return lines.join("\n");
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
    model_version: SCORE_MODEL,
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
    model_version: SCORE_MODEL,
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
}): Promise<{ results: ScoringResult[]; quota_exceeded?: true }> {
  const { system, user } = buildBatchPrompt({ criteria, profile, routeName });
  try {
    const response = await anthropic.messages.create({
      model: SCORE_MODEL,
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
      };
    }
    const input = toolBlock.input as {
      criteria_scored?: Array<Partial<BatchScoringToolItem>>;
    };
    const items = Array.isArray(input.criteria_scored) ? input.criteria_scored : [];
    const byId = new Map<string, Partial<BatchScoringToolItem>>();
    for (const it of items) {
      if (it && typeof it.criterion_id === "string") byId.set(it.criterion_id, it);
    }
    return {
      results: criteria.map((c) => {
        const raw = byId.get(c.id);
        if (!raw)
          return failedResult(
            c,
            "Model omitted this criterion in batch output.",
          );
        return buildResultFromItem(c, raw);
      }),
    };
  } catch (err) {
    if (detectQuotaError(err)) {
      return {
        results: criteria.map((c) =>
          failedResult(c, "Scorer is out of API credit on this preview."),
        ),
        quota_exceeded: true,
      };
    }
    const e = err as { message?: string; status?: number };
    let msg = e.message ?? "Unknown scoring error.";
    if (e.status === 429) msg = "Rate limit reached.";
    if (e.status === 401 || e.status === 403)
      msg = "Scoring credentials are invalid.";
    return { results: criteria.map((c) => failedResult(c, msg)) };
  }
}

/**
 * Cap rule mirrors the canonical web-next/lib/scoring.ts:computeAggregates
 * implementation: arithmetic mean of probability_meets, capped at 50 when any
 * criterion in the category is below the 0.35 threshold. We re-implement
 * here for the substantive and suitability subsets because SIGNAL never
 * reports the procedural axis.
 */
const BELOW_THRESHOLD_PROB = 0.35;
const CAPPED_READINESS = 50;

function pctFromResults(results: ScoringResult[]): number {
  if (results.length === 0) return 0;
  const live = results.filter((r) => !r.error);
  if (live.length === 0) return 0;
  const total = live.reduce((acc, r) => acc + r.probability_meets, 0);
  const arithmeticMean = Math.round((total / live.length) * 100);
  const anyBelow = live.some((r) => r.probability_meets < BELOW_THRESHOLD_PROB);
  return anyBelow ? Math.min(arithmeticMean, CAPPED_READINESS) : arithmeticMean;
}

async function synthesiseVerdict({
  results,
  anthropic,
}: {
  results: ScoringResult[];
  anthropic: Anthropic;
}): Promise<{
  explanation: string;
  gaps: string[];
  suitability_flags: string[];
  quota_exceeded?: true;
}> {
  const fallback = {
    explanation:
      "The substantive picture is mixed and we couldn't write a verdict automatically. The criteria below describe what the scorer found.",
    gaps: [] as string[],
    suitability_flags: [] as string[],
  };
  try {
    const response = await anthropic.messages.create({
      model: VERDICT_MODEL,
      max_tokens: 700,
      system: VERDICT_SYNTH_SYSTEM_PROMPT,
      tools: [RECORD_PROSPECT_VERDICT_TOOL] as unknown as Anthropic.Tool[],
      tool_choice: { type: "tool", name: RECORD_PROSPECT_VERDICT_TOOL.name },
      messages: [{ role: "user", content: buildVerdictUserPrompt(results) }],
    });
    const toolBlock = response.content.find(
      (b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use",
    );
    if (!toolBlock) return fallback;
    const input = toolBlock.input as Partial<ProspectVerdictBody>;
    const explanation =
      typeof input.explanation === "string" && input.explanation.trim().length > 0
        ? input.explanation.trim()
        : fallback.explanation;
    const gaps = Array.isArray(input.gaps)
      ? input.gaps.slice(0, 3).map(String).filter((s) => s.trim().length > 0)
      : [];
    const suitability_flags = Array.isArray(input.suitability_flags)
      ? input.suitability_flags
          .slice(0, 3)
          .map(String)
          .filter((s) => s.trim().length > 0)
      : [];
    return { explanation, gaps, suitability_flags };
  } catch (err) {
    if (detectQuotaError(err)) {
      return { ...fallback, quota_exceeded: true };
    }
    return fallback;
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError(
      503,
      "SIGNAL is not configured on this deployment. Set ANTHROPIC_API_KEY to enable.",
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonError(400, "Invalid request body.");
  }

  const profile = body.profile;
  const profileText = profile
    ? buildProfileText(profile).trim()
    : (body.profile_text ?? "").trim();
  if (!profileText) {
    return jsonError(400, "Profile is empty.");
  }
  if (profileText.length > 12_000) {
    return jsonError(400, "Profile is too long.");
  }

  const route = await getRoute(ROUTE_ID);
  if (!route) return jsonError(400, "Innovator Founder route is not loaded.");

  const allCriteria = await getCriteria(ROUTE_ID);
  // SIGNAL pre-qualifies on substantive fit and the suitability gate. The
  // procedural axis is checked at submission with a regulated advisor.
  const scored = allCriteria.filter(
    (c) => c.category === "substantive" || c.category === "suitability",
  );
  if (scored.length === 0) {
    return jsonError(500, "No scoreable criteria available for this route.");
  }

  const anthropic = new Anthropic({ apiKey, maxRetries: 3 });
  const t0 = performance.now();

  const batchCount = Math.max(1, Math.ceil(scored.length / BATCH_SIZE));
  const batches: Criterion[][] = Array.from({ length: batchCount }, () => []);
  scored.forEach((c, i) => batches[i % batchCount].push(c));

  const batchResults = await Promise.all(
    batches.map((batch) =>
      scoreBatch({
        criteria: batch,
        profile: profileText,
        routeName: route.name,
        anthropic,
      }),
    ),
  );

  const quotaTripped = batchResults.some((b) => b.quota_exceeded);
  if (quotaTripped) {
    const fallback: { ok: true; fallback_quota: QuotaFallback } = {
      ok: true,
      fallback_quota: QUALIFY_FALLBACK,
    };
    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  const results = batchResults.flatMap((b) => b.results);
  const order = new Map(scored.map((c, i) => [c.id, i]));
  results.sort(
    (a, b) =>
      (order.get(a.criterion_id) ?? 0) - (order.get(b.criterion_id) ?? 0),
  );

  const substantiveResults = results.filter(
    (r) => r.criterion?.category === "substantive",
  );
  const suitabilityResults = results.filter(
    (r) => r.criterion?.category === "suitability",
  );
  const substantive_pct = pctFromResults(substantiveResults);
  const suitability_pct =
    suitabilityResults.length === 0 ? null : pctFromResults(suitabilityResults);

  const { headline, verdict_class } = verdictFromSubstantivePct(
    substantive_pct,
    suitability_pct,
  );
  const next_step = nextStepForVerdict(headline);

  const synth = await synthesiseVerdict({ results, anthropic });
  if (synth.quota_exceeded) {
    const fallback: { ok: true; fallback_quota: QuotaFallback } = {
      ok: true,
      fallback_quota: QUALIFY_FALLBACK,
    };
    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  const wall_ms = Math.round(performance.now() - t0);
  const qualification: SignalQualification = {
    substantive_pct,
    procedural_pct: null,
    suitability_pct,
    verdict_class,
    verdict_headline: headline,
    explanation: synth.explanation,
    gaps: synth.gaps,
    suitability_flags: synth.suitability_flags,
    next_step,
    results,
    scored_at: new Date().toISOString(),
    wall_ms,
  };

  return new Response(JSON.stringify({ ok: true, qualification }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
