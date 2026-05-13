// Per-demographic talent levers for the V01 origin maps.
// Each of the five demographic categories on the pie-marker pies has its
// own real-world policy variable that most directly affects that pool.
// Moving a lever scales the corresponding demographic's contribution to
// every origin country's talent_mix, then re-sums band_a_count.

import * as React from "react";
import { TALENT_CATEGORY_COLOR } from "@/lib/atlas/origin-history";
import type { OriginCountry, TalentMix } from "@/lib/atlas/types";

export type TalentDemographic = keyof TalentMix;

export interface TalentLeverDef {
  demographic: TalentDemographic;
  label: string;
  helper: string;
  unit: string;
  min: number;
  max: number;
  default: number;
  step: number;
  note: string;
  /** Token name used for the panel kicker. The slider track uses the matching
   *  TALENT_CATEGORY_COLOR hex so the panel stays in sync with the markers. */
  colourToken: "navy" | "cyan" | "slate" | "glacier" | "violet";
}

export const TALENT_LEVERS: Record<TalentDemographic, TalentLeverDef> = {
  investors: {
    demographic: "investors",
    label: "Investment threshold",
    helper: "Higher threshold filters out lower-capital investors.",
    unit: "£M",
    min: 0,
    max: 10,
    default: 2,
    step: 0.1,
    note: "Tier 1 Investor route closed at £2M (2022). Slider explores sensitivity.",
    colourToken: "navy",
  },
  founders: {
    demographic: "founders",
    label: "Innovator Founder seed capital",
    helper: "Higher seed requirement narrows the founder pool.",
    unit: "£K",
    min: 0,
    max: 200,
    default: 50,
    step: 5,
    note: "Innovator Founder route requires £50K minimum investment plus endorsement.",
    colourToken: "cyan",
  },
  seniorEmployees: {
    demographic: "seniorEmployees",
    label: "Senior tier salary minimum",
    helper: "Higher senior-tier salary excludes mid-rate executive hires.",
    unit: "£K/yr",
    min: 35,
    max: 80,
    default: 41.7,
    step: 0.5,
    note: "April 2026 Skilled Worker minimum is £41,700. Senior tier above this in practice.",
    colourToken: "slate",
  },
  midLevelProfessionals: {
    demographic: "midLevelProfessionals",
    label: "Skilled Worker standard salary",
    helper: "Higher standard salary excludes lower-paid Skilled Worker roles.",
    unit: "£K/yr",
    min: 20,
    max: 60,
    default: 41.7,
    step: 0.5,
    note: "Same as the simulator's standard Skilled Worker minimum salary lever.",
    colourToken: "glacier",
  },
  students: {
    demographic: "students",
    label: "Student maintenance funds",
    helper: "Higher maintenance requirement excludes lower-income applicants.",
    unit: "£K/yr",
    min: 1,
    max: 20,
    default: 10,
    step: 0.5,
    note: "Student route requires evidence of maintenance funds. Higher floor narrows the pool.",
    colourToken: "violet",
  },
};

export const TALENT_LEVER_ORDER: TalentDemographic[] = [
  "investors",
  "founders",
  "seniorEmployees",
  "midLevelProfessionals",
  "students",
];

export type TalentLeverValues = Record<TalentDemographic, number>;

export const TALENT_LEVER_DEFAULTS: TalentLeverValues = (() => {
  const out: Partial<TalentLeverValues> = {};
  for (const d of TALENT_LEVER_ORDER) out[d] = TALENT_LEVERS[d].default;
  return out as TalentLeverValues;
})();

export const TALENT_LEVER_COLOUR_HEX: Record<TalentDemographic, string> = {
  investors: TALENT_CATEGORY_COLOR.investors, // navy
  founders: TALENT_CATEGORY_COLOR.founders, // cyan
  seniorEmployees: TALENT_CATEGORY_COLOR.seniorEmployees, // slate
  midLevelProfessionals: TALENT_CATEGORY_COLOR.midLevelProfessionals, // glacier
  students: TALENT_CATEGORY_COLOR.students, // violet
};

// Factor for a single lever value. 1.0 at default, scales linearly to 0.0
// at max (tightening) and 2.0 at min (loosening). Clamped to [0, 2] so a
// reasonable extreme doesn't produce negative counts.
export function factorFor(demographic: TalentDemographic, leverValue: number): number {
  const lever = TALENT_LEVERS[demographic];
  if (leverValue === lever.default) return 1;
  const distFromDefault = leverValue - lever.default;
  if (distFromDefault > 0) {
    const denom = lever.max - lever.default;
    return Math.max(0, 1 - distFromDefault / Math.max(1e-9, denom));
  } else {
    const denom = lever.default - lever.min;
    return Math.min(2, 1 + Math.abs(distFromDefault) / Math.max(1e-9, denom));
  }
}

// Apply every demographic's scaling factor to each country in one pass.
// When all levers sit at default this returns the input unchanged (by
// referential equality so React memoisation downstream stays cheap).
export function applyTalentLevers(
  countries: OriginCountry[],
  values: TalentLeverValues,
): OriginCountry[] {
  const factors: Record<TalentDemographic, number> = {
    investors: factorFor("investors", values.investors),
    founders: factorFor("founders", values.founders),
    seniorEmployees: factorFor("seniorEmployees", values.seniorEmployees),
    midLevelProfessionals: factorFor("midLevelProfessionals", values.midLevelProfessionals),
    students: factorFor("students", values.students),
  };
  const anyChange = TALENT_LEVER_ORDER.some((d) => factors[d] !== 1);
  if (!anyChange) return countries;

  return countries
    .map((country) => {
      if (!country.talent_mix) return country;
      const m = country.talent_mix;
      const newMix: TalentMix = {
        investors: Math.max(0, Math.round((m.investors ?? 0) * factors.investors)),
        founders: Math.max(0, Math.round((m.founders ?? 0) * factors.founders)),
        seniorEmployees: Math.max(
          0,
          Math.round((m.seniorEmployees ?? 0) * factors.seniorEmployees),
        ),
        midLevelProfessionals: Math.max(
          0,
          Math.round((m.midLevelProfessionals ?? 0) * factors.midLevelProfessionals),
        ),
        students: Math.max(0, Math.round((m.students ?? 0) * factors.students)),
      };
      const newBandA =
        newMix.investors +
        newMix.founders +
        newMix.seniorEmployees +
        newMix.midLevelProfessionals +
        newMix.students;
      return {
        ...country,
        talent_mix: newMix,
        band_a_count: newBandA,
      };
    })
    // Hide countries the levers wiped out so the marker map doesn't render
    // empty zero-radius dots, and the Top Origins list culls them.
    .filter((c) => c.band_a_count > 0)
    .sort((a, b) => b.band_a_count - a.band_a_count);
}

// Stateful hook for the panel. Owns the five lever values, exposes setters,
// a single-call reset, and a derived `isDirty` flag.
export interface TalentLeverState {
  values: TalentLeverValues;
  setValue: (d: TalentDemographic, value: number) => void;
  reset: () => void;
  isDirty: boolean;
}

export function useTalentLevers(): TalentLeverState {
  const [values, setValues] = React.useState<TalentLeverValues>(
    TALENT_LEVER_DEFAULTS,
  );

  const setValue = React.useCallback(
    (d: TalentDemographic, value: number) =>
      setValues((prev) => ({ ...prev, [d]: value })),
    [],
  );
  const reset = React.useCallback(
    () => setValues(TALENT_LEVER_DEFAULTS),
    [],
  );

  const isDirty = TALENT_LEVER_ORDER.some(
    (d) => values[d] !== TALENT_LEVER_DEFAULTS[d],
  );

  return { values, setValue, reset, isDirty };
}

// Pretty-print a lever value with its unit. £41.7K/yr, £2.0M, etc.
export function formatLeverValue(d: TalentDemographic, value: number): string {
  const lever = TALENT_LEVERS[d];
  if (lever.unit === "£M") return `£${value.toFixed(1)}M`;
  if (lever.unit === "£K" || lever.unit === "£K/yr") {
    const suffix = lever.unit === "£K/yr" ? "K/yr" : "K";
    return `£${value.toFixed(value % 1 === 0 ? 0 : 1)}${suffix}`;
  }
  return `${value}${lever.unit}`;
}
