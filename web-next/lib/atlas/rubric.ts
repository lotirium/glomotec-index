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

// ----- Per-rubric categorizations -----
//
// Different rubrics warrant different categorizations. Each rubric uses a
// continuous 0 to 100 composite anchored to a published authority framework
// (OECD Frascati, BEPS Action 5, Saudi Nitaqat, CSRD/ISSB). The four-band
// ladder per rubric is bespoke to the source ladder; the colour palette is
// the same brand-cool set across all rubrics.

export type RubricKey =
  | "innovation"
  | "economicSubstance"
  | "talentLocalisation"
  | "strategicSectorAlignment"
  | "fiscalContribution"
  | "sustainabilityNetZero";

export type RubricBandColor = "navy" | "cyan" | "slate" | "frost";

export interface RubricBandRecord {
  code: string;
  label: string;
  composite: [number, number]; // inclusive lower, inclusive upper
  color: RubricBandColor;
}

export interface PerRubricCategorization {
  label: string;
  bands: RubricBandRecord[];
  sourceAuthority: string;
}

export const PER_RUBRIC_CATEGORIZATIONS: Record<
  RubricKey,
  PerRubricCategorization
> = {
  innovation: {
    label: "OECD innovation-intensity tiers (Frascati Manual R&D categories)",
    bands: [
      { code: "T1", label: "Frontier", composite: [85, 100], color: "navy" },
      { code: "T2", label: "Advanced", composite: [70, 84], color: "cyan" },
      { code: "T3", label: "Active", composite: [50, 69], color: "slate" },
      { code: "T4", label: "Minimal", composite: [0, 49], color: "frost" },
    ],
    sourceAuthority:
      "OECD Frascati Manual 7th edition, R&D classification framework",
  },
  economicSubstance: {
    label: "OECD BEPS Action 5 substantial-activity thresholds",
    bands: [
      {
        code: "Substantial",
        label: "Substantial economic activity",
        composite: [80, 100],
        color: "cyan",
      },
      {
        code: "Adequate",
        label: "Adequate substance",
        composite: [60, 79],
        color: "navy",
      },
      {
        code: "Marginal",
        label: "Marginal substance",
        composite: [40, 59],
        color: "slate",
      },
      {
        code: "Insufficient",
        label: "Insufficient substance",
        composite: [0, 39],
        color: "frost",
      },
    ],
    sourceAuthority:
      "OECD BEPS Action 5 substantial-activity requirements, 2023 peer review",
  },
  talentLocalisation: {
    label: "Saudi Nitaqat-style bands",
    bands: [
      {
        code: "Platinum",
        label: "Platinum",
        composite: [85, 100],
        color: "cyan",
      },
      { code: "Green", label: "Green", composite: [65, 84], color: "navy" },
      { code: "Yellow", label: "Yellow", composite: [45, 64], color: "slate" },
      { code: "Red", label: "Red", composite: [0, 44], color: "frost" },
    ],
    sourceAuthority:
      "Saudi MHRSD Nitaqat classification, latest revision",
  },
  strategicSectorAlignment: {
    label: "Strategic sector alignment categories",
    bands: [
      { code: "Anchor", label: "Anchor", composite: [80, 100], color: "navy" },
      {
        code: "Strong",
        label: "Strong alignment",
        composite: [60, 79],
        color: "cyan",
      },
      {
        code: "Moderate",
        label: "Moderate alignment",
        composite: [40, 59],
        color: "slate",
      },
      {
        code: "Weak",
        label: "Weak alignment",
        composite: [0, 39],
        color: "frost",
      },
    ],
    sourceAuthority:
      "Multi-jurisdictional national strategy alignment, illustrative composite",
  },
  fiscalContribution: {
    label: "Fiscal contribution tiers",
    bands: [
      {
        code: "Major",
        label: "Major contributor",
        composite: [80, 100],
        color: "navy",
      },
      {
        code: "Significant",
        label: "Significant contributor",
        composite: [60, 79],
        color: "cyan",
      },
      {
        code: "Modest",
        label: "Modest contributor",
        composite: [40, 59],
        color: "slate",
      },
      {
        code: "Minimal",
        label: "Minimal contributor",
        composite: [0, 39],
        color: "frost",
      },
    ],
    sourceAuthority:
      "Jurisdiction-specific corporate tax and payroll contribution thresholds",
  },
  sustainabilityNetZero: {
    label: "CSRD / ISSB disclosure compliance tiers",
    bands: [
      {
        code: "Leader",
        label: "Disclosure leader",
        composite: [85, 100],
        color: "cyan",
      },
      {
        code: "Compliant",
        label: "Fully compliant",
        composite: [65, 84],
        color: "navy",
      },
      {
        code: "Partial",
        label: "Partial compliance",
        composite: [40, 64],
        color: "slate",
      },
      {
        code: "NonCompliant",
        label: "Non-compliant",
        composite: [0, 39],
        color: "frost",
      },
    ],
    sourceAuthority:
      "EU CSRD reporting framework, ISSB IFRS S1 and S2 standards",
  },
};

export const RUBRIC_KEYS: RubricKey[] = [
  "innovation",
  "economicSubstance",
  "talentLocalisation",
  "strategicSectorAlignment",
  "fiscalContribution",
  "sustainabilityNetZero",
];

// Display-name to RubricKey. Fixtures use slightly shortened headers
// ("Strategic Sector", "Sustainability") so we map both the short and the
// canonical labels.
export const RUBRIC_DISPLAY_NAME: Record<RubricKey, string> = {
  innovation: "Innovation",
  economicSubstance: "Economic Substance",
  talentLocalisation: "Talent Localisation",
  strategicSectorAlignment: "Strategic Sector Alignment",
  fiscalContribution: "Fiscal Contribution",
  sustainabilityNetZero: "Sustainability / Net Zero",
};

const NAME_TO_RUBRIC_KEY_TABLE: Record<string, RubricKey> = {
  innovation: "innovation",
  "economic substance": "economicSubstance",
  "talent localisation": "talentLocalisation",
  "strategic sector": "strategicSectorAlignment",
  "strategic sector alignment": "strategicSectorAlignment",
  "fiscal contribution": "fiscalContribution",
  sustainability: "sustainabilityNetZero",
  "sustainability / net zero": "sustainabilityNetZero",
};

export function rubricKeyFromName(name: string): RubricKey | null {
  const norm = name.trim().toLowerCase();
  return NAME_TO_RUBRIC_KEY_TABLE[norm] ?? null;
}

// Resolve the brand-cool palette token referenced by a band's `color` field
// to its CSS HSL var() so the component can use it in inline styles, SVGs,
// or computed classNames without coupling to Tailwind.
export const RUBRIC_BAND_COLOR_HSL: Record<RubricBandColor, string> = {
  navy: "hsl(var(--accent))",
  cyan: "hsl(var(--cyan))",
  slate: "hsl(var(--slate))",
  frost: "hsl(var(--frost))",
};

export function bandForRubric(
  key: RubricKey,
  composite: number,
): RubricBandRecord {
  const ladder = PER_RUBRIC_CATEGORIZATIONS[key];
  for (const band of ladder.bands) {
    if (composite >= band.composite[0] && composite <= band.composite[1]) {
      return band;
    }
  }
  // Composite out of the 0..100 range : fall back to the closest band by
  // distance to either boundary, so a stray 110 lands on the top tier rather
  // than crashing.
  if (composite > 100) return ladder.bands[0];
  return ladder.bands[ladder.bands.length - 1];
}

// Try to classify by display name; returns null if the rubric name doesn't
// have a per-rubric categorization (callers fall back to the legacy A/B/C/D
// ladder in that case).
export function bandForRubricByName(
  name: string,
  composite: number,
): { key: RubricKey; band: RubricBandRecord } | null {
  const key = rubricKeyFromName(name);
  if (!key) return null;
  return { key, band: bandForRubric(key, composite) };
}
