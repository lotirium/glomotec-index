import type {
  AssessmentRun,
  Band,
  CriterionCategory,
  ScoringResult,
} from "@/lib/types";

export function bandFromProbability(p: number): Band {
  if (p >= 0.85) return "high";
  if (p >= 0.6) return "medium";
  if (p >= 0.4) return "low";
  return "below_threshold";
}

/** Band derived from a 0–100 percentage rather than a 0–1 probability. */
export function bandFromPct(pct: number): Band {
  if (pct >= 80) return "high";
  if (pct >= 60) return "medium";
  if (pct >= 40) return "low";
  return "below_threshold";
}

export type VerdictHeadline =
  | "Strong match"
  | "Strong candidate, preparation needed"
  | "Mixed signals"
  | "Notable gaps"
  | "Not yet"
  | "Refusal risk identified";

export interface VerdictSummary {
  high: number;
  medium: number;
  low: number;
  below_threshold: number;
  error: number;
}

export interface CategorySummary {
  count: number;
  high: number;
  medium: number;
  low: number;
  below_threshold: number;
}

const EMPTY_CATEGORY: CategorySummary = {
  count: 0,
  high: 0,
  medium: 0,
  low: 0,
  below_threshold: 0,
};

/** Suitability is a hard gate: any real refusal risk overrides the substantive+procedural matrix. */
const SUITABILITY_GATE_PCT = 50;

/**
 * Three-axis headline rubric. Suitability is a hard gate: when
 * suitability_pct is non-null and below the gate (any real refusal risk),
 * the headline is "Refusal risk identified" regardless of how strong
 * substantive and procedural look. Otherwise the existing two-axis rubric
 * applies: substantive band is the dominant axis; the submission band only
 * affects the headline when the substantive band is HIGH.
 */
export function headlineFromBands(
  substantive: Band,
  submission: Band,
  suitability_pct: number | null,
): { headline: VerdictHeadline; verdict_class: "high" | "medium" | "low" } {
  if (suitability_pct !== null && suitability_pct < SUITABILITY_GATE_PCT) {
    return { headline: "Refusal risk identified", verdict_class: "low" };
  }
  if (substantive === "below_threshold") {
    return { headline: "Not yet", verdict_class: "low" };
  }
  if (substantive === "low") {
    return { headline: "Notable gaps", verdict_class: "low" };
  }
  if (substantive === "medium") {
    return { headline: "Mixed signals", verdict_class: "medium" };
  }
  // substantive === "high"
  if (submission === "high") {
    return { headline: "Strong match", verdict_class: "high" };
  }
  return {
    headline: "Strong candidate, preparation needed",
    verdict_class: "high",
  };
}

function categoryOf(r: ScoringResult): CriterionCategory {
  return (r.criterion?.category as CriterionCategory | undefined) ?? "procedural";
}

/**
 * Per-category aggregate readiness. Arithmetic mean of probability_meets,
 * capped at 50 when any criterion in the category is BELOW THRESHOLD
 * (probability_meets < 0.35). The cap exists because a vacuously-satisfied
 * universal eligibility criterion (e.g. "applicant must be 18 or over")
 * will score ~1.0 for almost everyone and inflate the mean even when a
 * load-bearing criterion in the same category has clearly failed. Without
 * the cap, dealbreakers reflected in per-criterion pills can be hidden by
 * the aggregate. The cap applies identically to suitability.
 *
 * Mirrored in scorer/aggregator.py so Python-side aggregates and Next.js
 * aggregates match.
 */
const BELOW_THRESHOLD_PROB = 0.35;
const CAPPED_READINESS = 50;

function categoryReadiness(
  totalProbability: number,
  count: number,
  anyBelowThreshold: boolean,
): number {
  if (count === 0) return 0;
  const arithmeticMean = Math.round((totalProbability / count) * 100);
  return anyBelowThreshold
    ? Math.min(arithmeticMean, CAPPED_READINESS)
    : arithmeticMean;
}

export function computeAggregates(results: ScoringResult[]) {
  const summary: VerdictSummary = {
    high: 0,
    medium: 0,
    low: 0,
    below_threshold: 0,
    error: 0,
  };
  const subStats = { ...EMPTY_CATEGORY, total_p: 0, any_below: false };
  const procStats = { ...EMPTY_CATEGORY, total_p: 0, any_below: false };
  const suitStats = { ...EMPTY_CATEGORY, total_p: 0, any_below: false };

  for (const r of results) {
    summary[r.confidence_level] += 1;
    const cat = categoryOf(r);
    const target =
      cat === "substantive" ? subStats : cat === "suitability" ? suitStats : procStats;
    target.count += 1;
    target.total_p += r.probability_meets;
    target[r.confidence_level] += 1;
    if (r.probability_meets < BELOW_THRESHOLD_PROB) {
      target.any_below = true;
    }
  }

  const total = Math.max(1, results.length);
  const overall_pct = Math.round(
    (results.reduce((a, r) => a + r.probability_meets, 0) / total) * 100,
  );
  const substantive_pct = categoryReadiness(
    subStats.total_p,
    subStats.count,
    subStats.any_below,
  );
  const submission_pct = categoryReadiness(
    procStats.total_p,
    procStats.count,
    procStats.any_below,
  );
  const suitability_pct =
    suitStats.count === 0
      ? null
      : categoryReadiness(suitStats.total_p, suitStats.count, suitStats.any_below);

  const substantive_band = bandFromPct(substantive_pct);
  const submission_band = bandFromPct(submission_pct);
  const { headline, verdict_class } = headlineFromBands(
    substantive_band,
    submission_band,
    suitability_pct,
  );

  // Strip the working `total_p` field before returning category summaries.
  const stripTotal = (s: typeof subStats): CategorySummary => ({
    count: s.count,
    high: s.high,
    medium: s.medium,
    low: s.low,
    below_threshold: s.below_threshold,
  });

  return {
    summary,
    overall_pct,
    substantive_pct,
    submission_pct,
    suitability_pct,
    substantive_band,
    submission_band,
    category_summary: {
      substantive: stripTotal(subStats),
      procedural: stripTotal(procStats),
      suitability: stripTotal(suitStats),
    },
    headline,
    verdict_class,
  };
}

export function buildAssessmentRun({
  client_slug,
  route_id,
  results,
  scored_at = new Date().toISOString(),
}: {
  client_slug: string;
  route_id: string;
  results: ScoringResult[];
  scored_at?: string;
}): AssessmentRun {
  const agg = computeAggregates(results);
  return {
    client_slug,
    route_id,
    scored_at,
    total: results.length,
    cached: 0,
    cold: results.length,
    results,
    summary: agg.summary,
    overall_pct: agg.overall_pct,
    substantive_pct: agg.substantive_pct,
    submission_pct: agg.submission_pct,
    suitability_pct: agg.suitability_pct,
    category_summary: agg.category_summary,
    verdict_class: agg.verdict_class,
    verdict_headline: agg.headline,
  };
}
