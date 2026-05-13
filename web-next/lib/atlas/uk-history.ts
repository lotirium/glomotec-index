// UK historical fixtures for the /atlas/uk hub.
// Authority sources (ONS Long-term International Migration, ONS FDI, HESA / Home
// Office student grant statistics) are paraphrased and shaped for the demo.
// Values anchor on known events so the timeline reads as plausibly recorded
// history rather than a smooth synthetic line.

export type PolicyCategory = "restriction" | "tightening" | "expansion" | "system";

export interface YearValue {
  year: number;
  value: number;
}

export interface PolicyEvent {
  year: number;
  label: string;
  category: PolicyCategory;
  impactNote?: string;
}

// Net migration to UK by year, 2000 to 2025.
// Source : ONS Long-term International Migration estimates, paraphrased for demo.
export const NET_MIGRATION_BY_YEAR: YearValue[] = [
  { year: 2000, value: 158_000 },
  { year: 2001, value: 179_000 },
  { year: 2002, value: 153_000 },
  { year: 2003, value: 185_000 },
  { year: 2004, value: 268_000 },
  { year: 2005, value: 267_000 },
  { year: 2006, value: 273_000 },
  { year: 2007, value: 273_000 },
  { year: 2008, value: 229_000 },
  { year: 2009, value: 229_000 },
  { year: 2010, value: 256_000 },
  { year: 2011, value: 205_000 },
  { year: 2012, value: 177_000 }, // PSW closure took effect April 2012
  { year: 2013, value: 209_000 },
  { year: 2014, value: 313_000 },
  { year: 2015, value: 332_000 },
  { year: 2016, value: 248_000 }, // Brexit referendum
  { year: 2017, value: 270_000 },
  { year: 2018, value: 275_000 },
  { year: 2019, value: 270_000 },
  { year: 2020, value: 93_000 }, // pandemic year
  { year: 2021, value: 488_000 },
  { year: 2022, value: 745_000 }, // post-pandemic + Ukraine + Hong Kong BNO
  { year: 2023, value: 685_000 },
  { year: 2024, value: 431_000 },
  { year: 2025, value: 312_000 },
];

// Policy events to mark on the timeline.
export const POLICY_EVENTS: PolicyEvent[] = [
  { year: 2008, label: "Points-Based System introduced", category: "system" },
  {
    year: 2012,
    label: "Tier 1 Post-Study Work closed",
    category: "restriction",
    impactNote:
      "49,600 PSW grants in 2011. APPG measured 88% real reduction against government's 49% estimate.",
  },
  {
    year: 2014,
    label: "Tier 1 Investor threshold raised £1M to £2M",
    category: "tightening",
    impactNote: "Clean controlled-variable test of a single number moving.",
  },
  { year: 2016, label: "Brexit referendum", category: "system" },
  { year: 2020, label: "EU Settlement Scheme deadline", category: "system" },
  { year: 2021, label: "Skilled Worker route opens", category: "expansion" },
  {
    year: 2022,
    label: "Tier 1 Investor route closed",
    category: "restriction",
    impactNote:
      "FDI flows fell from £22.9B in 2022 to £1.3B the following year.",
  },
  {
    year: 2024,
    label: "Skilled Worker minimum salary raised to £38,700",
    category: "tightening",
  },
  {
    year: 2026,
    label:
      "Skilled Worker minimum salary £41,700, ILR fee £3,226, English to B2",
    category: "tightening",
  },
];

// Macro context series (paraphrased fixtures).
// £ billions inward FDI, 2000 to 2025, ONS UK FDI statistics paraphrased.
export const FDI_INWARD_BY_YEAR: YearValue[] = [
  { year: 2000, value: 88.3 },
  { year: 2005, value: 124.6 },
  { year: 2010, value: 41.2 },
  { year: 2015, value: 76.4 },
  { year: 2020, value: 19.7 },
  { year: 2022, value: 22.9 },
  { year: 2023, value: 1.3 },
  { year: 2024, value: 7.8 },
  { year: 2025, value: 12.4 },
];

// Tier 4 / Student route grants, HESA / Home Office paraphrased.
export const STUDENT_VISAS_BY_YEAR: YearValue[] = [
  { year: 2010, value: 285_000 },
  { year: 2011, value: 271_000 }, // PSW closure announced
  { year: 2012, value: 209_000 }, // PSW closure takes effect
  { year: 2013, value: 219_000 },
  { year: 2015, value: 232_000 },
  { year: 2020, value: 273_000 },
  { year: 2022, value: 486_000 },
  { year: 2024, value: 394_000 },
  { year: 2025, value: 343_000 },
];

// GDP year-on-year growth (%), ONS UK GDP paraphrased.
export const GDP_GROWTH_BY_YEAR: YearValue[] = [
  { year: 2000, value: 3.7 },
  { year: 2005, value: 3.2 },
  { year: 2008, value: -0.3 }, // financial crisis
  { year: 2010, value: 1.9 },
  { year: 2015, value: 2.4 },
  { year: 2020, value: -9.7 }, // pandemic
  { year: 2021, value: 7.6 },
  { year: 2025, value: 1.2 },
];

// Population estimates, millions, ONS UK population paraphrased.
export const UK_POPULATION_BY_YEAR: YearValue[] = [
  { year: 2000, value: 58.9 },
  { year: 2005, value: 60.4 },
  { year: 2010, value: 62.8 },
  { year: 2015, value: 65.1 },
  { year: 2020, value: 67.0 },
  { year: 2025, value: 68.7 },
];

// Annual visa grants by primary route, paraphrased Home Office quarterly stats.
// Routes that didn't exist in a given year carry value 0.
export interface TalentInflowYear {
  year: number;
  skilledWorker: number;
  innovatorFounder: number;
  investor: number;
  globalTalent: number;
  postStudyWork: number;
}

export const UK_TALENT_INFLOWS_BY_ROUTE: TalentInflowYear[] = [
  {
    year: 2010,
    skilledWorker: 0,
    innovatorFounder: 0,
    investor: 354,
    globalTalent: 0,
    postStudyWork: 49_600,
  },
  {
    year: 2015,
    skilledWorker: 0,
    innovatorFounder: 0,
    investor: 192,
    globalTalent: 0,
    postStudyWork: 0,
  },
  {
    year: 2020,
    skilledWorker: 0,
    innovatorFounder: 1140,
    investor: 480,
    globalTalent: 580,
    postStudyWork: 0,
  },
  {
    year: 2022,
    skilledWorker: 87_420,
    innovatorFounder: 1320,
    investor: 0,
    globalTalent: 1200,
    postStudyWork: 0,
  },
  {
    year: 2025,
    skilledWorker: 156_200,
    innovatorFounder: 1810,
    investor: 0,
    globalTalent: 2400,
    postStudyWork: 0,
  },
];

export type TalentRouteKey =
  | "skilledWorker"
  | "innovatorFounder"
  | "investor"
  | "globalTalent"
  | "postStudyWork";

export const TALENT_ROUTE_ORDER: TalentRouteKey[] = [
  "skilledWorker",
  "innovatorFounder",
  "investor",
  "globalTalent",
  "postStudyWork",
];

export const TALENT_ROUTE_LABEL: Record<TalentRouteKey, string> = {
  skilledWorker: "Skilled Worker",
  innovatorFounder: "Innovator Founder",
  investor: "Investor",
  globalTalent: "Global Talent",
  postStudyWork: "Post-Study Work",
};

export const TALENT_ROUTE_COLOR: Record<TalentRouteKey, string> = {
  skilledWorker: "#0F2C5C", // navy
  innovatorFounder: "#00A2E9", // cyan
  investor: "#7C3AED", // violet
  globalTalent: "#B8D4E3", // glacier
  postStudyWork: "#64748B", // slate
};

export function totalTalentInflows(row: TalentInflowYear): number {
  return (
    row.skilledWorker +
    row.innovatorFounder +
    row.investor +
    row.globalTalent +
    row.postStudyWork
  );
}

export const UK_HISTORY_FIXTURE_VERSION = "uk-history.json @ 2026-05-13";

const RESTRICTION_CATEGORIES: PolicyCategory[] = [
  "restriction",
  "tightening",
];

// Active policy levers at a given year : every event with category restriction
// or tightening whose effective year is on or before `year`. Used by the
// macro panel + audit anchor to describe what was in force at the cursor.
export function activePolicyLeversAt(year: number): PolicyEvent[] {
  return POLICY_EVENTS.filter(
    (e) => e.year <= year && RESTRICTION_CATEGORIES.includes(e.category),
  );
}

// Nearest value lookup for sparse macro series. Returns null when the series is
// empty so callers can render a dash.
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

export function netMigrationAt(year: number): YearValue | null {
  return NET_MIGRATION_BY_YEAR.find((p) => p.year === year) ?? null;
}
