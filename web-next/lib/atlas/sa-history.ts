// Saudi Arabia historical + projected fixtures for /atlas/sa.
// Saudi has a shorter published record than the UK but a stronger forward
// narrative. Vision 2030 sectoral targets and the Nitaqat localisation
// regime anchor the macro panel; the timeline charts net skilled-foreign
// worker inflows against the eight major policy events from 2011 onwards.

export type SaPolicyCategory =
  | "system"
  | "tightening"
  | "expansion";

export interface YearValue {
  year: number;
  value: number;
}

export interface SaPolicyEvent {
  year: number;
  label: string;
  category: SaPolicyCategory;
  impactNote?: string;
}

// Skilled foreign worker inflows (paraphrased MHRSD Nitaqat data, thousands).
export const SA_NET_TALENT_INFLOW_BY_YEAR: YearValue[] = [
  { year: 2010, value: 1240 },
  { year: 2012, value: 1380 },
  { year: 2014, value: 1450 },
  { year: 2016, value: 1290 }, // Vision 2030 announced, Nitaqat tightening
  { year: 2018, value: 1180 }, // continued localisation push
  { year: 2020, value: 980 }, // pandemic
  { year: 2022, value: 1220 },
  { year: 2023, value: 1310 }, // NEOM hiring ramps
  { year: 2024, value: 1480 },
  { year: 2025, value: 1620 },
];

export const SA_POLICY_EVENTS: SaPolicyEvent[] = [
  {
    year: 2011,
    label: "Nitaqat localisation system introduced",
    category: "system",
    impactNote:
      "Four-tier Saudization quota framework (Platinum/Green/Yellow/Red) tied to private-sector employment ratios.",
  },
  {
    year: 2016,
    label: "Vision 2030 announced",
    category: "expansion",
    impactNote:
      "Diversification away from hydrocarbon; talent strategy across tourism, tech, mining, manufacturing.",
  },
  {
    year: 2019,
    label: "Saudi tourist visa opens",
    category: "expansion",
    impactNote:
      "Visa-free or visa-on-arrival for 49 nationalities. Tourism workforce projected at 1.6M roles by 2030.",
  },
  {
    year: 2019,
    label: "Premium Residency Program launched",
    category: "expansion",
    impactNote:
      "Permanent and temporary tracks. First non-citizen residency available without sponsor.",
  },
  {
    year: 2021,
    label: "Regional HQ programme requirement",
    category: "tightening",
    impactNote:
      "From January 2024, government contracts conditional on Saudi-based regional HQ. Tightens at the corporate substance layer.",
  },
  {
    year: 2023,
    label: "NEOM hiring scale-up",
    category: "expansion",
    impactNote:
      "Projected workforce 450K by 2030. Sector mix: tech, energy, hospitality, construction.",
  },
  {
    year: 2024,
    label: "Premium Residency expanded categories",
    category: "expansion",
    impactNote:
      "Investor, talent, real-estate-owner, retiree, distinguished tracks. Each with sector and asset thresholds.",
  },
  {
    year: 2025,
    label: "National Talent Strategy 2030",
    category: "system",
    impactNote:
      "Sectoral hiring targets across 14 priority sectors. Composite tracking against Nitaqat colour bands.",
  },
];

// Riyal billions, paraphrased MISA / MoIA published statistics.
export const SA_FDI_INWARD_BY_YEAR: YearValue[] = [
  { year: 2010, value: 28 },
  { year: 2015, value: 32 },
  { year: 2018, value: 38 },
  { year: 2020, value: 21 },
  { year: 2022, value: 71 },
  { year: 2023, value: 96 },
  { year: 2024, value: 112 },
  { year: 2025, value: 148 },
];

// Distribution of Saudi establishments across Nitaqat tiers, paraphrased MHRSD.
export interface NitaqatTierRow {
  year: number;
  platinum: number;
  green: number;
  yellow: number;
  red: number;
}
export const SA_NITAQAT_TIER_DIST: NitaqatTierRow[] = [
  { year: 2011, platinum: 8, green: 22, yellow: 41, red: 29 },
  { year: 2016, platinum: 14, green: 31, yellow: 36, red: 19 },
  { year: 2020, platinum: 18, green: 38, yellow: 32, red: 12 },
  { year: 2025, platinum: 25, green: 44, yellow: 24, red: 7 },
];

export type NitaqatTier = "platinum" | "green" | "yellow" | "red";
export const NITAQAT_TIER_ORDER: NitaqatTier[] = [
  "platinum",
  "green",
  "yellow",
  "red",
];
export const NITAQAT_TIER_LABEL: Record<NitaqatTier, string> = {
  platinum: "Platinum",
  green: "Green",
  yellow: "Yellow",
  red: "Red",
};
export const NITAQAT_TIER_COLOR: Record<NitaqatTier, string> = {
  platinum: "hsl(var(--cyan))",
  green: "hsl(var(--accent))",
  yellow: "hsl(var(--glacier))",
  red: "hsl(var(--slate))",
};

// Vision 2030 priority sectors with current employment, 2030 target, gap.
// All values in thousands of roles. Paraphrased composite of sector
// strategy releases (NEOM, MISA, MHRSD).
export interface SaSectorProjection {
  sector: string;
  current2025: number;
  target2030: number;
  gap: number;
}

const RAW_SECTORS: Array<{
  sector: string;
  current2025: number;
  target2030: number;
}> = [
  { sector: "Tourism", current2025: 920, target2030: 1600 },
  { sector: "Tech", current2025: 240, target2030: 660 },
  { sector: "Mining", current2025: 130, target2030: 470 },
  { sector: "Manufacturing", current2025: 1180, target2030: 1820 },
  { sector: "Logistics", current2025: 560, target2030: 920 },
  { sector: "Healthcare", current2025: 480, target2030: 740 },
  { sector: "Education", current2025: 510, target2030: 620 },
  { sector: "Financial Services", current2025: 220, target2030: 380 },
  { sector: "Renewable Energy", current2025: 60, target2030: 290 },
  { sector: "Petrochemicals", current2025: 340, target2030: 420 },
  { sector: "Defence", current2025: 140, target2030: 240 },
  { sector: "Entertainment", current2025: 110, target2030: 320 },
  { sector: "Cultural Heritage", current2025: 70, target2030: 180 },
  { sector: "Sport", current2025: 50, target2030: 160 },
];

export const SA_SECTOR_PROJECTIONS: SaSectorProjection[] = RAW_SECTORS.map(
  (s) => ({
    ...s,
    gap: s.target2030 - s.current2025,
  }),
);

export const SA_HISTORY_FIXTURE_VERSION = "sa-history.ts @ 2026-05-13";

// Nearest-year lookup for sparse macro series. Returns null when empty.
export function nearestValueAt(
  series: YearValue[],
  year: number,
): YearValue | null {
  if (series.length === 0) return null;
  let best = series[0];
  let bestDist = Math.abs(best.year - year);
  for (let i = 1; i < series.length; i++) {
    const d = Math.abs(series[i].year - year);
    if (d < bestDist) {
      best = series[i];
      bestDist = d;
    }
  }
  return best;
}

export function nearestNitaqatAt(year: number): NitaqatTierRow | null {
  if (SA_NITAQAT_TIER_DIST.length === 0) return null;
  let best = SA_NITAQAT_TIER_DIST[0];
  let bestDist = Math.abs(best.year - year);
  for (let i = 1; i < SA_NITAQAT_TIER_DIST.length; i++) {
    const d = Math.abs(SA_NITAQAT_TIER_DIST[i].year - year);
    if (d < bestDist) {
      best = SA_NITAQAT_TIER_DIST[i];
      bestDist = d;
    }
  }
  return best;
}

// Talent inflow at an exact year if recorded; null otherwise.
export function talentInflowAt(year: number): YearValue | null {
  return SA_NET_TALENT_INFLOW_BY_YEAR.find((p) => p.year === year) ?? null;
}

// Active "in force" policy levers at a year — restriction + tightening
// events whose effective year is on or before `year`.
const ACTIVE_LEVER_CATEGORIES: SaPolicyCategory[] = ["tightening", "system"];
export function activeSaLeversAt(year: number): SaPolicyEvent[] {
  return SA_POLICY_EVENTS.filter(
    (e) => e.year <= year && ACTIVE_LEVER_CATEGORIES.includes(e.category),
  );
}
