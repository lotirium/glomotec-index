// Simulator-to-rubric cascade.
//
// Moving a simulator lever doesn't change the underlying gMC v1.0
// framework — it changes the *effective* weights for the entity pool
// under that policy regime. Each rule maps a lever delta-from-default
// to a percentage-point delta on a specific rubric dimension. Multiple
// rules can target the same dimension; the deltas sum.

import {
  SIMULATOR_DEFAULTS,
  type LeverState,
} from "@/lib/atlas/simulator-state";
import { ENGLISH_ORDER } from "@/lib/atlas/simulator-fixtures";
import type { RubricKey } from "@/lib/atlas/rubric";

export interface CascadeRule {
  id: string;
  rubric: RubricKey;
  dimension: string;
  /** Plain-language description of what this rule encodes. Used by the
   *  methodology page table. */
  ruleSummary: string;
  /** Calibration line. e.g. "+£10K salary above default → +4pp Local
   *  payroll weight". Used by the methodology page table. */
  magnitude: string;
  /** Published Home Office reference that motivates the magnitude. */
  authorityBasis: string;
  /** How to return this rule's contribution to zero. */
  reverseRule: string;
  /** Function returning weight delta in percentage points based on the
   *  current simulator state. */
  computeDelta: (state: LeverState) => number;
  /** Human-readable explanation surfaced in the rubric "Why" popover when
   *  the rule contributes a non-zero delta. */
  reason: (state: LeverState) => string;
}

export const CASCADE_RULES: CascadeRule[] = [
  {
    id: "salary-local-payroll",
    rubric: "economicSubstance",
    dimension: "Local payroll",
    ruleSummary:
      "Skilled Worker minimum salary above default raises Local payroll weight in Economic Substance.",
    magnitude: "+£10K salary above default → +4pp Local payroll weight",
    authorityBasis:
      "Home Office Skilled Worker minimum salary threshold (£41,700 from April 2026).",
    reverseRule: "Drop minimum salary back to £41,700 to neutralise.",
    computeDelta: (s) => {
      const delta = (s.minSalary - SIMULATOR_DEFAULTS.minSalary) / 10_000;
      return Math.round(delta * 4);
    },
    reason: (s) =>
      `Min salary at £${s.minSalary.toLocaleString("en-GB")} weights Local payroll higher in Economic Substance.`,
  },
  {
    id: "salary-supplier-integration",
    rubric: "economicSubstance",
    dimension: "Local supplier integration",
    ruleSummary:
      "Skilled Worker salary raises imply larger supply-chain integration with local payroll.",
    magnitude: "+£10K salary above default → +2pp Local supplier integration",
    authorityBasis:
      "OECD BEPS Action 5 substantial-activity guidance treats payroll and supplier substance as co-moving.",
    reverseRule: "Drop minimum salary back to £41,700.",
    computeDelta: (s) => {
      const delta = (s.minSalary - SIMULATOR_DEFAULTS.minSalary) / 10_000;
      return Math.round(delta * 2);
    },
    reason: () =>
      "Salary growth implies larger supply-chain integration with local payroll.",
  },
  {
    id: "english-sector-compliance",
    rubric: "talentLocalisation",
    dimension: "Sector-specific compliance",
    ruleSummary:
      "Raising the English language requirement raises Sector-specific compliance weight in Talent Localisation.",
    magnitude: "+1 CEFR level above default → +3pp Sector-specific compliance",
    authorityBasis:
      "Home Office English-language requirements per route (CEFR).",
    reverseRule: "Restore English level to B2 to neutralise.",
    computeDelta: (s) => {
      const cur = ENGLISH_ORDER.indexOf(s.englishLevel);
      const def = ENGLISH_ORDER.indexOf(SIMULATOR_DEFAULTS.englishLevel);
      const delta = cur - def;
      return delta * 3;
    },
    reason: (s) =>
      `English at ${s.englishLevel} raises sector-compliance weight in Talent Localisation.`,
  },
  {
    id: "isc-local-payroll-down",
    rubric: "economicSubstance",
    dimension: "Local payroll",
    ruleSummary:
      "Raising the Immigration Skills Charge discourages cost-sensitive sponsorship and reduces Local payroll weight.",
    magnitude: "+£500 ISC above default → −2pp Local payroll weight",
    authorityBasis:
      "Home Office Immigration Skills Charge schedule (medium/large employer rate).",
    reverseRule: "Drop ISC back to £1,320/yr.",
    computeDelta: (s) => {
      const delta = (s.isc - SIMULATOR_DEFAULTS.isc) / 500;
      return -Math.round(delta * 2);
    },
    reason: (s) =>
      `ISC at £${s.isc.toLocaleString("en-GB")}/yr discourages cost-sensitive sponsorship.`,
  },
  {
    id: "ilr-fee-tax-base",
    rubric: "fiscalContribution",
    dimension: "Tax-base growth",
    ruleSummary:
      "Raising the ILR application fee accrues more Treasury revenue per settlement, raising Tax-base growth weight.",
    magnitude: "+£500 ILR fee above default → +1pp Tax-base growth weight",
    authorityBasis:
      "Home Office ILR application fee schedule (from 8 April 2026).",
    reverseRule: "Drop ILR fee back to £3,226.",
    computeDelta: (s) => {
      const delta = (s.ilrFee - SIMULATOR_DEFAULTS.ilrFee) / 500;
      return Math.round(delta);
    },
    reason: (s) =>
      `ILR fee at £${s.ilrFee.toLocaleString("en-GB")} accrues more Treasury revenue per settlement.`,
  },
  {
    id: "settlement-retention",
    rubric: "talentLocalisation",
    dimension: "Retention",
    ruleSummary:
      "Extending the ILR qualifying period raises Retention weight in Talent Localisation.",
    magnitude: "+1 year settlement above default → +0.4pp Retention weight",
    authorityBasis:
      "Home Office ILR continuous-residence qualifying-period rules.",
    reverseRule: "Restore settlement period to 10 years.",
    computeDelta: (s) => {
      const delta = s.settlementYears - SIMULATOR_DEFAULTS.settlementYears;
      return Math.round((delta * 2) / 5);
    },
    reason: (s) =>
      `Settlement at ${s.settlementYears} years adjusts retention weighting.`,
  },
  {
    id: "investor-capital-deployed",
    rubric: "economicSubstance",
    dimension: "Capital deployed",
    ruleSummary:
      "Raising the Investor route threshold raises Capital deployed weight in Economic Substance.",
    magnitude:
      "+£1M Investor threshold above default → +3pp Capital deployed weight",
    authorityBasis:
      "Tier 1 Investor route history (closed 2022 at £2M equivalent).",
    reverseRule: "Drop Investor threshold back to £2M.",
    computeDelta: (s) => {
      const delta =
        (s.investorThreshold - SIMULATOR_DEFAULTS.investorThreshold) /
        1_000_000;
      return Math.round(delta * 3);
    },
    reason: (s) =>
      `Investor threshold at £${(s.investorThreshold / 1e6).toFixed(1)}M raises Capital deployed weight.`,
  },
];

export interface EffectiveWeight {
  effective: number;
  delta: number;
  reasons: string[];
}

// Compute the effective weight for a single rubric × dimension pair under
// the current simulator state. Clamped to [0, 100].
export function computeEffectiveWeight(
  baseWeight: number,
  rubric: RubricKey,
  dimension: string,
  state: LeverState,
): EffectiveWeight {
  const applicableRules = CASCADE_RULES.filter(
    (r) => r.rubric === rubric && r.dimension === dimension,
  );
  const totalDelta = applicableRules.reduce(
    (sum, r) => sum + r.computeDelta(state),
    0,
  );
  const effective = Math.max(0, Math.min(100, baseWeight + totalDelta));
  const reasons = applicableRules
    .filter((r) => r.computeDelta(state) !== 0)
    .map((r) => r.reason(state));
  return { effective, delta: effective - baseWeight, reasons };
}

// Returns true when the cascade leaves at least one rubric dimension at
// a non-zero delta under the current state. Cheap : runs every rule
// once and short-circuits. Used by the rubric banner to decide whether
// to surface lever overrides at all.
export function cascadeHasAnyDelta(state: LeverState): boolean {
  return CASCADE_RULES.some((r) => r.computeDelta(state) !== 0);
}
