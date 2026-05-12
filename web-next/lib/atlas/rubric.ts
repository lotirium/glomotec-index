import type { RubricBand } from "@/lib/atlas/types";

export const RUBRIC_VERSION = "gMC v1.0";

// Paraphrased band descriptions for the ATLAS preview. These are not
// verbatim language from any source document; they restate the public
// three-pillar Innovator Founder framework in our own words so the
// preview is safe to ship without quoting protected text.
export interface BandDescriptor {
  band: RubricBand;
  label: string;
  short: string;
  description: string;
}

export const BAND_DESCRIPTORS: Record<RubricBand, BandDescriptor> = {
  A: {
    band: "A",
    label: "Strong",
    short: "Strong",
    description:
      "New innovation solving a market problem no existing tool addresses.",
  },
  B: {
    band: "B",
    label: "Acceptable",
    short: "Acceptable",
    description:
      "Improved approach to a problem where existing solutions fall short.",
  },
  C: {
    band: "C",
    label: "Borderline",
    short: "Borderline",
    description:
      "Existing technology applied in a new way; may warrant case-by-case review.",
  },
  D: {
    band: "D",
    label: "Below threshold",
    short: "Below",
    description:
      "Existing technology applied to an already-served problem; no defensible advantage.",
  },
};

export interface PillarScores {
  innovation: number;
  viability: number;
  scalability: number;
}

// Pure scoring function. Combines the three pillar scores into a single
// band using a weighted mean (innovation drives band-A eligibility, with
// viability and scalability acting as supporting evidence). Deterministic:
// the same inputs always map to the same band.
export function scoreToBand(scores: PillarScores): RubricBand {
  const composite =
    scores.innovation * 0.5 +
    scores.viability * 0.25 +
    scores.scalability * 0.25;

  if (scores.innovation >= 80 && composite >= 78) return "A";
  if (composite >= 62) return "B";
  if (composite >= 45) return "C";
  return "D";
}

export function describeBand(band: RubricBand): BandDescriptor {
  return BAND_DESCRIPTORS[band];
}
