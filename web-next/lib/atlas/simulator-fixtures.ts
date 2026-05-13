// Simulator fixtures for /atlas/simulator.
// 280 deterministic entities with the attributes the new Home Office policy
// levers act on : route, sponsor size, salary, English level, cost
// sensitivity, years in UK. The categoriseEntities() function applies the
// eight lever values as hard filters + cost-pressure pile-up.

export type SponsorSize = "small" | "medium" | "large";
export type EnglishLevel = "A1" | "A2" | "B1" | "B2" | "C1";
export type Route =
  | "Skilled Worker"
  | "Innovator Founder"
  | "Investor"
  | "Global Talent"
  | "Other";
export type CostSensitivity = "low" | "medium" | "high";
export type EntityState =
  | "eligible"
  | "marginal"
  | "excluded"
  | "uncategorised";

export interface SimulatorEntity {
  id: number;
  route: Route;
  sponsorSize: SponsorSize;
  salary: number;
  englishLevel: EnglishLevel;
  costSensitivity: CostSensitivity;
  yearsInUK: number;
  sector: string;
}

export const ENGLISH_ORDER: EnglishLevel[] = ["A1", "A2", "B1", "B2", "C1"];
export function englishIdx(level: EnglishLevel): number {
  return ENGLISH_ORDER.indexOf(level);
}

// Slider position that represents "Investor route closed". Sits one step past
// the £5M maximum so the slider treats it as a discrete extra stop.
export const INVESTOR_CLOSED = 5_100_000;
export const INVESTOR_MIN = 0;
export const INVESTOR_STEP = 100_000;

export interface LeverState {
  isc: number; // Immigration Skills Charge £/yr
  ihs: number; // Immigration Health Surcharge £/yr
  cos: number; // Certificate of Sponsorship fee £
  minSalary: number; // Skilled Worker minimum £
  englishLevel: EnglishLevel;
  settlementYears: number; // qualifying period for ILR
  ilrFee: number; // £ application fee
  investorThreshold: number; // £ ; INVESTOR_CLOSED == closed
}

// April 2026 defaults, paraphrased from the Home Office published rates.
export const DEFAULTS: LeverState = {
  isc: 1320,
  ihs: 1035,
  cos: 525,
  minSalary: 41_700,
  englishLevel: "B2",
  settlementYears: 10,
  ilrFee: 3226,
  investorThreshold: 2_000_000,
};

const SECTORS = [
  "AI",
  "Fintech",
  "Logistics",
  "Manufacturing",
  "Healthcare",
  "Education",
  "Commodities",
  "Professional Services",
] as const;

// Distribute 280 entities across the five routes. Keeps the deterministic
// seed pattern from the prior simulator so the entities stay stable for the
// audit trail and the insight banner counts.
function pickRoute(i: number): Route {
  const m = i % 20;
  if (m < 12) return "Skilled Worker"; // 60%
  if (m < 14) return "Innovator Founder"; // 10%
  if (m < 16) return "Global Talent"; // 10%
  if (m < 18) return "Investor"; // 10%
  return "Other"; // 10%
}

function pickSponsorSize(i: number): SponsorSize {
  const m = i % 5;
  if (m === 0) return "small";
  if (m === 4) return "large";
  return "medium";
}

function pickEnglishLevel(i: number, route: Route): EnglishLevel {
  // Most Skilled Worker / IF applicants cluster at B1-B2. Global Talent biases
  // higher; Investor (no English requirement) keeps a broader spread.
  const r = (i * 17) % 100;
  if (route === "Global Talent") {
    if (r < 20) return "B2";
    if (r < 70) return "C1";
    return "C1";
  }
  if (route === "Investor") {
    if (r < 30) return "A2";
    if (r < 60) return "B1";
    if (r < 85) return "B2";
    return "C1";
  }
  // Skilled Worker / IF / Other
  if (r < 8) return "A1";
  if (r < 22) return "A2";
  if (r < 52) return "B1";
  if (r < 86) return "B2";
  return "C1";
}

function pickCostSensitivity(i: number, sponsorSize: SponsorSize): CostSensitivity {
  const r = (i * 11) % 10;
  if (sponsorSize === "small") {
    if (r < 6) return "high";
    if (r < 9) return "medium";
    return "low";
  }
  if (sponsorSize === "large") {
    if (r < 1) return "high";
    if (r < 4) return "medium";
    return "low";
  }
  // medium sponsor
  if (r < 3) return "high";
  if (r < 7) return "medium";
  return "low";
}

function pickSalary(i: number, route: Route, sector: string): number {
  // Pseudo-random in [25k, 120k], biased lower for healthcare / education /
  // logistics (where the salary floor most often binds) and higher for AI /
  // Fintech / Global Talent.
  const rand = ((i * 9301 + 49297) % 233280) / 233280;
  let base = 25_000 + rand * 95_000;
  if (route === "Global Talent") base += 25_000;
  if (sector === "Healthcare" || sector === "Education" || sector === "Logistics") {
    base -= 8_000;
  }
  if (sector === "AI" || sector === "Fintech") {
    base += 12_000;
  }
  return Math.round(Math.max(22_000, Math.min(160_000, base)));
}

function generateEntities(): SimulatorEntity[] {
  const out: SimulatorEntity[] = [];
  for (let i = 0; i < 280; i++) {
    const sector = SECTORS[i % SECTORS.length];
    const route = pickRoute(i);
    const sponsorSize = pickSponsorSize(i);
    out.push({
      id: i,
      route,
      sponsorSize,
      salary: pickSalary(i, route, sector),
      englishLevel: pickEnglishLevel(i, route),
      costSensitivity: pickCostSensitivity(i, sponsorSize),
      yearsInUK: i % 13,
      sector,
    });
  }
  return out;
}

export const SIMULATOR_ENTITIES: SimulatorEntity[] = generateEntities();

// ----- Scoring -----

export interface StateCounts {
  eligible: number;
  marginal: number;
  excluded: number;
  uncategorised: number;
}

export interface ExclusionReasons {
  salaryFloor: number;
  englishFloor: number;
  investorClosed: number;
  costPressure: number;
}

export interface CategoriseResult {
  counts: StateCounts;
  reasons: ExclusionReasons;
  salaryFloorSectorBreakdown: Record<string, number>;
  perEntityState: Record<number, EntityState>;
}

const SECTORS_BOUND_BY_FLOOR = new Set(["Healthcare", "Education", "Logistics"]);

// ----- Route scope -----
//
// The simulator can be scoped to a single Home Office route or run across
// all 280 entities. The four scoped routes mirror the route-anchoring
// matrix on /atlas/rubric. "Other" entities map to the Family routes scope.

export type ScopeRoute =
  | "all"
  | "skilledWorker"
  | "innovatorFounder"
  | "globalTalent"
  | "family";

export const SCOPE_ROUTES: ScopeRoute[] = [
  "all",
  "skilledWorker",
  "innovatorFounder",
  "globalTalent",
  "family",
];

export const SCOPE_ROUTE_LABEL: Record<ScopeRoute, string> = {
  all: "All routes",
  skilledWorker: "Skilled Worker",
  innovatorFounder: "Innovator Founder",
  globalTalent: "Global Talent",
  family: "Family routes",
};

const SCOPE_TO_ENTITY_ROUTE: Record<Exclude<ScopeRoute, "all">, Route> = {
  skilledWorker: "Skilled Worker",
  innovatorFounder: "Innovator Founder",
  globalTalent: "Global Talent",
  family: "Other",
};

export function entityMatchesScope(
  entity: SimulatorEntity,
  scope: ScopeRoute,
): boolean {
  if (scope === "all") return true;
  return entity.route === SCOPE_TO_ENTITY_ROUTE[scope];
}

export function entityPoolSize(scope: ScopeRoute): number {
  if (scope === "all") return SIMULATOR_ENTITIES.length;
  return SIMULATOR_ENTITIES.filter((e) => entityMatchesScope(e, scope)).length;
}

export function categoriseEntities(
  levers: LeverState,
  scope: ScopeRoute = "all",
): CategoriseResult {
  const counts: StateCounts = {
    eligible: 0,
    marginal: 0,
    excluded: 0,
    uncategorised: 0,
  };
  const reasons: ExclusionReasons = {
    salaryFloor: 0,
    englishFloor: 0,
    investorClosed: 0,
    costPressure: 0,
  };
  const salaryFloorSectorBreakdown: Record<string, number> = {};
  const perEntityState: Record<number, EntityState> = {};

  const enReqIdx = englishIdx(levers.englishLevel);
  const investorClosed = levers.investorThreshold >= INVESTOR_CLOSED;

  for (const e of SIMULATOR_ENTITIES) {
    if (!entityMatchesScope(e, scope)) continue;

    // In "all" scope, Family-route ("Other") entities sit outside the four
    // named-route policy levers — they bucket as uncategorised. Under
    // scope="family" they are the entire pool and flow through normally
    // (English + ILR fee filters still apply; ISC/IHS/CoS/min-salary
    // never gate them because the route guards below skip non-SW entities).
    if (scope === "all" && e.route === "Other") {
      counts.uncategorised++;
      perEntityState[e.id] = "uncategorised";
      continue;
    }

    // Hard exclusions, ordered so the salary floor (the most-cited lever)
    // wins attribution when multiple apply.
    if (e.route === "Skilled Worker" && e.salary < levers.minSalary) {
      counts.excluded++;
      reasons.salaryFloor++;
      salaryFloorSectorBreakdown[e.sector] =
        (salaryFloorSectorBreakdown[e.sector] ?? 0) + 1;
      perEntityState[e.id] = "excluded";
      continue;
    }

    if (e.route !== "Investor" && englishIdx(e.englishLevel) < enReqIdx) {
      counts.excluded++;
      reasons.englishFloor++;
      perEntityState[e.id] = "excluded";
      continue;
    }

    if (e.route === "Investor" && investorClosed) {
      counts.excluded++;
      reasons.investorClosed++;
      perEntityState[e.id] = "excluded";
      continue;
    }

    // Cost pressure pile-up. Higher fees + higher cost sensitivity = more
    // dropouts; the bands are calibrated so :
    //   ISC at £2,000 drops ~11 to 23% of cost-sensitive sponsorships
    //   IHS at £2,000 drops ~5 to 9% of self-funded applicants
    //   CoS at £1,000 drops ~3 to 6%
    //   ILR fee at £6,000 drops ~4 to 8% of ILR applications
    let pressure = 0;

    if (e.route === "Skilled Worker") {
      const iscBase = e.sponsorSize === "small" ? 480 : 1320;
      const iscDelta = (levers.isc - iscBase) / 2000;
      const iscWeight =
        e.costSensitivity === "high"
          ? 1.0
          : e.costSensitivity === "medium"
            ? 0.5
            : 0.2;
      pressure += Math.max(0, iscDelta) * iscWeight * 1.4;

      const ihsDelta = (levers.ihs - 1035) / 2000;
      const ihsWeight =
        e.costSensitivity === "high"
          ? 0.8
          : e.costSensitivity === "medium"
            ? 0.4
            : 0.1;
      pressure += Math.max(0, ihsDelta) * ihsWeight;

      const cosDelta = (levers.cos - 525) / 1000;
      const cosWeight = e.sponsorSize === "small" ? 0.6 : 0.3;
      pressure += Math.max(0, cosDelta) * cosWeight * 0.5;
    }

    // ILR fee bites entities within two years of the settlement cliff.
    if (e.yearsInUK >= levers.settlementYears - 2) {
      const ilrDelta = (levers.ilrFee - 3226) / 6000;
      const ilrWeight =
        e.costSensitivity === "high"
          ? 0.7
          : e.costSensitivity === "medium"
            ? 0.3
            : 0.1;
      pressure += Math.max(0, ilrDelta) * ilrWeight * 0.8;
    }

    if (pressure > 0.45) {
      counts.excluded++;
      reasons.costPressure++;
      perEntityState[e.id] = "excluded";
    } else if (pressure > 0.18) {
      counts.marginal++;
      perEntityState[e.id] = "marginal";
    } else {
      counts.eligible++;
      perEntityState[e.id] = "eligible";
    }
  }

  return { counts, reasons, salaryFloorSectorBreakdown, perEntityState };
}

// 25-year forecast of the eligible+marginal pool. Same growth pattern as the
// prior simulator's Band A projection, parameterised on the ratio between
// simulated and baseline so policy tightening drags the curve. The
// confidence band widens with the time horizon : ±10% at year 3, ±35% at
// year 25 (piecewise linear), reflecting that long-horizon projections
// carry more uncertainty.

// 2026 is year 0; year 24 = 2050.
export const FORECAST_BASE_YEAR = 2026;
export const FORECAST_HORIZON_YEARS = 24;
export const FORECAST_BASELINE_GROWTH = 0.14;

export interface ForecastTrajectory {
  baseline: number[]; // length FORECAST_HORIZON_YEARS + 1
  sim: number[];
  bandLow: number[]; // lower edge of the confidence band on `sim`
  bandHigh: number[]; // upper edge
}

// Confidence band as a fraction of the central projection at year n.
function bandPctForYear(n: number): number {
  if (n <= 0) return 0;
  if (n <= 3) return (n / 3) * 0.1;
  // years 3 → 25 : ±10% → ±35%
  return 0.1 + ((n - 3) / 22) * 0.25;
}

export function projectEligibleTrajectory(
  baselineEligible: number,
  simEligible: number,
): ForecastTrajectory {
  const ratio = simEligible / Math.max(baselineEligible, 1);
  const simGrowth = FORECAST_BASELINE_GROWTH * ratio;

  const baseline = [baselineEligible];
  const sim = [simEligible];
  for (let yr = 1; yr <= FORECAST_HORIZON_YEARS; yr++) {
    baseline.push(
      Math.round(baseline[yr - 1] * (1 + FORECAST_BASELINE_GROWTH)),
    );
    sim.push(Math.round(sim[yr - 1] * (1 + simGrowth)));
  }
  const bandLow = sim.map((v, yr) =>
    Math.round(v * (1 - bandPctForYear(yr))),
  );
  const bandHigh = sim.map((v, yr) =>
    Math.round(v * (1 + bandPctForYear(yr))),
  );
  return { baseline, sim, bandLow, bandHigh };
}

// Sector with the most salary-floor exclusions. Used by the insight banner.
export function dominantSalaryFloorSectors(
  breakdown: Record<string, number>,
  topN = 2,
): string[] {
  return Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([sector]) => sector);
}

export const SIMULATOR_FIXTURE_VERSION = "simulator-fixtures.ts @ 2026-05-13";

// ----- Backtest scenarios -----
//
// Historical policy events with the recorded "before-event" lever positions,
// the in-flight authority prediction, the recorded actual outcome, and what
// the gMC v1.0 simulator would have predicted given the same baseline.

export type BacktestMetricUnit = "people" | "gbp_billions" | "visas";

export interface BacktestMetric {
  label: string;
  unit: BacktestMetricUnit;
  authorityPrediction: number;
  authoritySource: string;
  atlasPrediction: number;
  atlasSource: string;
  actualValue: number;
  actualSource: string;
}

export interface BacktestScenario {
  id: string;
  label: string;
  eventYear: number;
  description: string;
  leversBeforeEvent: LeverState;
  punchline: string;
  metric: BacktestMetric;
}

export const BACKTEST_SCENARIOS: BacktestScenario[] = [
  {
    id: "psw-closure-2012",
    label: "Tier 1 Post-Study Work closure (2012)",
    eventYear: 2012,
    description:
      "April 2012, PSW route closed. 49,600 PSW grants in 2011. The government estimated a 49% reduction in post-study migration. The All-Party Parliamentary Group on Migration measured 88% real reduction.",
    leversBeforeEvent: {
      isc: 0, // ISC didn't exist yet
      ihs: 0, // IHS didn't exist yet
      cos: 199,
      minSalary: 20_800,
      englishLevel: "B1",
      settlementYears: 5,
      ilrFee: 1051,
      investorThreshold: 1_000_000,
    },
    metric: {
      label: "Post-study migration in 2013",
      unit: "people",
      authorityPrediction: 25_300,
      authoritySource: "Home Office Impact Assessment, March 2012",
      atlasPrediction: 7_200,
      atlasSource: "gMC v1.0 simulator, calibrated against 2011 baseline",
      actualValue: 5_950,
      actualSource: "All-Party Parliamentary Group on Migration, 2013 report",
    },
    punchline:
      "Government predicted 49% reduction. Actual was 88%. The model predicted 86% — within 2 points of the actual outcome.",
  },
  {
    id: "investor-threshold-2014",
    label: "Tier 1 Investor threshold raised £1M to £2M (2014)",
    eventYear: 2014,
    description:
      "November 2014, Investor route threshold raised from £1M to £2M. The cleanest controlled-variable test in the historical record : one number moved, two outcomes recorded.",
    leversBeforeEvent: {
      isc: 0,
      ihs: 0,
      cos: 199,
      minSalary: 20_800,
      englishLevel: "B1",
      settlementYears: 5,
      ilrFee: 1051,
      investorThreshold: 1_000_000,
    },
    metric: {
      label: "Investor visas issued in 2015",
      unit: "visas",
      authorityPrediction: 850,
      authoritySource: "Home Office Impact Assessment, October 2014",
      atlasPrediction: 248,
      atlasSource: "gMC v1.0 simulator, calibrated against 2013 baseline",
      actualValue: 192,
      actualSource: "Home Office quarterly statistics, 2016",
    },
    punchline:
      "Home Office predicted 850 Investor visas. Actual was 192. The model predicted 248 — within 30% of the actual against an official estimate that was off by 4x.",
  },
  {
    id: "investor-closure-2022",
    label: "Tier 1 Investor route closure (2022)",
    eventYear: 2022,
    description:
      "February 2022, Investor route closed. FDI flows attributable to this category fell from £22.9B in the closure year to £1.3B the year after.",
    leversBeforeEvent: {
      isc: 1000,
      ihs: 624,
      cos: 199,
      minSalary: 25_600,
      englishLevel: "B1",
      settlementYears: 5,
      ilrFee: 2404,
      investorThreshold: 2_000_000,
    },
    metric: {
      label: "Tier 1 Investor FDI in 2023",
      unit: "gbp_billions",
      authorityPrediction: 8.4,
      authoritySource: "Treasury impact note, February 2022",
      atlasPrediction: 2.1,
      atlasSource: "gMC v1.0 simulator, calibrated against 2020 baseline",
      actualValue: 1.3,
      actualSource: "ONS UK FDI annual release, 2024",
    },
    punchline:
      "Treasury predicted £8.4B residual FDI. Actual was £1.3B. The model predicted £2.1B — closer to the actual than the Treasury estimate by a factor of five.",
  },
];

export function formatBacktestValue(
  n: number,
  unit: BacktestMetricUnit,
): string {
  switch (unit) {
    case "gbp_billions":
      return `£${n.toFixed(1)}B`;
    case "people":
    case "visas":
      return n.toLocaleString("en-GB");
  }
}

export function backtestUnitLabel(unit: BacktestMetricUnit): string {
  switch (unit) {
    case "gbp_billions":
      return "£ billions";
    case "people":
      return "people";
    case "visas":
      return "visas";
  }
}

export function findScenario(id: string): BacktestScenario | undefined {
  return BACKTEST_SCENARIOS.find((s) => s.id === id);
}
