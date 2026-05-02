import type { SignalVerdict } from "@/lib/signal/types";

/**
 * Map the substantive readiness percentage to a prospect-friendly verdict.
 *
 * Bands:
 * - >= 85: Strong fit (high)
 * - 60–84: Likely fit (high)
 * - 40–59: Worth exploring (medium)
 * - < 40:  Not a fit yet (low)
 */
export function verdictFromSubstantivePct(pct: number): {
  headline: SignalVerdict;
  verdict_class: "high" | "medium" | "low";
} {
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
  return "Strengthen these areas first.";
}
