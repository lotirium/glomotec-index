import type { SignalVerdict } from "@/lib/signal/types";

/** Suitability is a hard gate: any real refusal risk overrides substantive fit. */
const SUITABILITY_GATE_PCT = 50;

/**
 * Map the substantive readiness percentage (and the optional suitability
 * gate) to a prospect-friendly verdict.
 *
 * Suitability override: when suitability_pct is non-null and below the gate
 * (any real refusal risk), the headline is "Refusal risk identified" with a
 * low verdict class regardless of how strong substantive fit looks.
 *
 * Otherwise the substantive bands apply:
 * - >= 85: Strong fit (high)
 * - 60–84: Likely fit (high)
 * - 40–59: Worth exploring (medium)
 * - < 40:  Not a fit yet (low)
 */
export function verdictFromSubstantivePct(
  pct: number,
  suitability_pct: number | null = null,
): {
  headline: SignalVerdict;
  verdict_class: "high" | "medium" | "low";
} {
  if (suitability_pct !== null && suitability_pct < SUITABILITY_GATE_PCT) {
    return { headline: "Refusal risk identified", verdict_class: "low" };
  }
  if (pct >= 85) return { headline: "Strong fit", verdict_class: "high" };
  if (pct >= 60) return { headline: "Likely fit", verdict_class: "high" };
  if (pct >= 40)
    return { headline: "Worth exploring", verdict_class: "medium" };
  return { headline: "Not a fit yet", verdict_class: "low" };
}

export function nextStepForVerdict(headline: SignalVerdict): string {
  if (headline === "Strong fit" || headline === "Likely fit") {
    return "Speak to a glomotec advisor.";
  }
  if (headline === "Refusal risk identified") {
    return "Resolve the suitability concern with a regulated advisor before applying.";
  }
  return "Strengthen these areas first.";
}
