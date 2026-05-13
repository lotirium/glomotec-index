// Historical origin distributions for the UAE Band A entity sample.
// Six snapshots at five-year intervals encode the narrative arc :
//   2000 : UAE indigenous talent dominant; foreign-origin entities scarce
//   2005 : DMCC launched (2002); commodities pull on South Asian talent
//   2010 : India and Pakistan rising as logistics / commodities origins
//   2015 : UK and US rising as fintech / AI origins (post-PSW UK outflow)
//   2020 : China rising as tech origin (post US trade-war redirect)
//   2025 : UK is now the dominant origin country (post-Investor closure)
//
// All values are paraphrased fixtures, shaped against published free-zone
// register summaries and Home Office migration flow tabulations.

import { COUNTRY_TABLE } from "@/lib/atlas/country-centroids";
import type {
  OriginCountry,
  OriginMapResponse,
  TalentMix,
} from "@/lib/atlas/types";

export type OriginYear = 2000 | 2005 | 2010 | 2015 | 2020 | 2025;
export const ORIGIN_YEARS: OriginYear[] = [2000, 2005, 2010, 2015, 2020, 2025];

interface YearCountrySpec {
  iso2: string;
  bandA: number;
  total: number;
  sectors: Record<string, number>;
  avgComposite: number;
}

// GCC member states. Used to compute the "outside GCC" stat each year.
const GCC = new Set(["AE", "BH", "KW", "OM", "QA", "SA"]);

const SPECS_BY_YEAR: Record<OriginYear, YearCountrySpec[]> = {
  2000: [
    {
      iso2: "AE",
      bandA: 22,
      total: 35,
      sectors: { "Family Office": 9, Commodities: 7, "Professional Services": 6 },
      avgComposite: 78,
    },
    {
      iso2: "IN",
      bandA: 4,
      total: 12,
      sectors: { Logistics: 2, Commodities: 2 },
      avgComposite: 72,
    },
    {
      iso2: "PK",
      bandA: 2,
      total: 7,
      sectors: { Logistics: 2 },
      avgComposite: 70,
    },
    {
      iso2: "GB",
      bandA: 1,
      total: 4,
      sectors: { "Professional Services": 1 },
      avgComposite: 81,
    },
    {
      iso2: "US",
      bandA: 1,
      total: 3,
      sectors: { "Professional Services": 1 },
      avgComposite: 80,
    },
  ],
  2005: [
    {
      iso2: "AE",
      bandA: 28,
      total: 55,
      sectors: { "Family Office": 12, Commodities: 9, "Professional Services": 7 },
      avgComposite: 79,
    },
    {
      iso2: "IN",
      bandA: 9,
      total: 28,
      sectors: { Logistics: 4, Commodities: 3, "Professional Services": 2 },
      avgComposite: 74,
    },
    {
      iso2: "PK",
      bandA: 5,
      total: 16,
      sectors: { Logistics: 3, Commodities: 2 },
      avgComposite: 72,
    },
    {
      iso2: "GB",
      bandA: 4,
      total: 11,
      sectors: { "Professional Services": 2, Commodities: 2 },
      avgComposite: 82,
    },
    {
      iso2: "US",
      bandA: 3,
      total: 9,
      sectors: { "Professional Services": 2, Commodities: 1 },
      avgComposite: 81,
    },
    {
      iso2: "LB",
      bandA: 2,
      total: 6,
      sectors: { "Professional Services": 1, Commodities: 1 },
      avgComposite: 73,
    },
    {
      iso2: "EG",
      bandA: 2,
      total: 8,
      sectors: { Logistics: 1, Commodities: 1 },
      avgComposite: 71,
    },
  ],
  2010: [
    {
      iso2: "AE",
      bandA: 30,
      total: 75,
      sectors: { "Family Office": 13, Commodities: 10, "Professional Services": 7 },
      avgComposite: 80,
    },
    {
      iso2: "IN",
      bandA: 18,
      total: 52,
      sectors: { Logistics: 8, Commodities: 6, "Professional Services": 4 },
      avgComposite: 76,
    },
    {
      iso2: "PK",
      bandA: 11,
      total: 36,
      sectors: { Logistics: 6, Commodities: 3, Manufacturing: 2 },
      avgComposite: 74,
    },
    {
      iso2: "GB",
      bandA: 9,
      total: 24,
      sectors: { "Professional Services": 4, Commodities: 3, Fintech: 2 },
      avgComposite: 83,
    },
    {
      iso2: "US",
      bandA: 8,
      total: 22,
      sectors: { "Professional Services": 3, Fintech: 3, AI: 2 },
      avgComposite: 82,
    },
    {
      iso2: "EG",
      bandA: 4,
      total: 14,
      sectors: { Logistics: 2, Commodities: 2 },
      avgComposite: 72,
    },
    {
      iso2: "LB",
      bandA: 3,
      total: 10,
      sectors: { "Professional Services": 2, Commodities: 1 },
      avgComposite: 74,
    },
    {
      iso2: "PH",
      bandA: 2,
      total: 8,
      sectors: { Logistics: 2 },
      avgComposite: 71,
    },
  ],
  2015: [
    {
      iso2: "AE",
      bandA: 32,
      total: 95,
      sectors: { "Family Office": 14, Commodities: 11, "Professional Services": 7 },
      avgComposite: 80,
    },
    {
      iso2: "IN",
      bandA: 24,
      total: 72,
      sectors: { Logistics: 9, Commodities: 7, "Professional Services": 5, Fintech: 3 },
      avgComposite: 77,
    },
    {
      iso2: "GB",
      bandA: 20,
      total: 48,
      sectors: { Fintech: 9, "Professional Services": 6, AI: 5 },
      avgComposite: 84,
    },
    {
      iso2: "US",
      bandA: 17,
      total: 42,
      sectors: { AI: 7, Fintech: 6, "Professional Services": 4 },
      avgComposite: 83,
    },
    {
      iso2: "PK",
      bandA: 15,
      total: 46,
      sectors: { Logistics: 8, Commodities: 4, Manufacturing: 3 },
      avgComposite: 74,
    },
    {
      iso2: "EG",
      bandA: 6,
      total: 18,
      sectors: { Logistics: 3, Commodities: 3 },
      avgComposite: 72,
    },
    {
      iso2: "DE",
      bandA: 4,
      total: 12,
      sectors: { Manufacturing: 2, Fintech: 2 },
      avgComposite: 84,
    },
    {
      iso2: "LB",
      bandA: 4,
      total: 11,
      sectors: { "Professional Services": 2, Commodities: 2 },
      avgComposite: 74,
    },
    {
      iso2: "AU",
      bandA: 3,
      total: 9,
      sectors: { Manufacturing: 2, "Professional Services": 1 },
      avgComposite: 82,
    },
  ],
  2020: [
    {
      iso2: "GB",
      bandA: 32,
      total: 68,
      sectors: { Fintech: 14, AI: 10, "Professional Services": 8 },
      avgComposite: 85,
    },
    {
      iso2: "IN",
      bandA: 30,
      total: 88,
      sectors: { Logistics: 11, Fintech: 8, Commodities: 6, "Professional Services": 5 },
      avgComposite: 78,
    },
    {
      iso2: "AE",
      bandA: 34,
      total: 110,
      sectors: { "Family Office": 14, Commodities: 11, "Professional Services": 9 },
      avgComposite: 81,
    },
    {
      iso2: "US",
      bandA: 24,
      total: 58,
      sectors: { AI: 11, Fintech: 8, "Professional Services": 5 },
      avgComposite: 84,
    },
    {
      iso2: "CN",
      bandA: 17,
      total: 48,
      sectors: { AI: 8, Manufacturing: 6, Fintech: 3 },
      avgComposite: 82,
    },
    {
      iso2: "PK",
      bandA: 18,
      total: 56,
      sectors: { Logistics: 10, Commodities: 4, Manufacturing: 4 },
      avgComposite: 75,
    },
    {
      iso2: "DE",
      bandA: 8,
      total: 20,
      sectors: { Manufacturing: 4, Fintech: 3, AI: 1 },
      avgComposite: 85,
    },
    {
      iso2: "EG",
      bandA: 8,
      total: 22,
      sectors: { Logistics: 4, Commodities: 3 },
      avgComposite: 73,
    },
    {
      iso2: "LB",
      bandA: 6,
      total: 16,
      sectors: { "Professional Services": 3, Commodities: 2 },
      avgComposite: 75,
    },
    {
      iso2: "AU",
      bandA: 5,
      total: 13,
      sectors: { Manufacturing: 2, "Professional Services": 2 },
      avgComposite: 83,
    },
    {
      iso2: "SG",
      bandA: 5,
      total: 12,
      sectors: { Fintech: 3, AI: 2 },
      avgComposite: 86,
    },
  ],
  2025: [
    {
      iso2: "GB",
      bandA: 48,
      total: 92,
      sectors: { Fintech: 20, AI: 15, "Professional Services": 9, Manufacturing: 4 },
      avgComposite: 86,
    },
    {
      iso2: "IN",
      bandA: 38,
      total: 105,
      sectors: { Logistics: 14, Fintech: 10, Commodities: 7, AI: 7 },
      avgComposite: 80,
    },
    {
      iso2: "AE",
      bandA: 36,
      total: 124,
      sectors: { "Family Office": 15, Commodities: 11, "Professional Services": 10 },
      avgComposite: 81,
    },
    {
      iso2: "US",
      bandA: 32,
      total: 68,
      sectors: { AI: 15, Fintech: 10, "Professional Services": 7 },
      avgComposite: 85,
    },
    {
      iso2: "CN",
      bandA: 24,
      total: 62,
      sectors: { AI: 11, Manufacturing: 8, Fintech: 5 },
      avgComposite: 83,
    },
    {
      iso2: "PK",
      bandA: 22,
      total: 65,
      sectors: { Logistics: 12, Commodities: 5, Manufacturing: 5 },
      avgComposite: 76,
    },
    {
      iso2: "DE",
      bandA: 11,
      total: 24,
      sectors: { Manufacturing: 5, Fintech: 4, AI: 2 },
      avgComposite: 85,
    },
    {
      iso2: "EG",
      bandA: 10,
      total: 26,
      sectors: { Logistics: 5, Commodities: 3, "Professional Services": 2 },
      avgComposite: 74,
    },
    {
      iso2: "SG",
      bandA: 9,
      total: 18,
      sectors: { Fintech: 5, AI: 3, "Professional Services": 1 },
      avgComposite: 87,
    },
    {
      iso2: "AU",
      bandA: 7,
      total: 16,
      sectors: { Manufacturing: 3, "Professional Services": 2, Fintech: 2 },
      avgComposite: 84,
    },
    {
      iso2: "LB",
      bandA: 5,
      total: 14,
      sectors: { "Professional Services": 3, Commodities: 2 },
      avgComposite: 75,
    },
    {
      iso2: "FR",
      bandA: 4,
      total: 10,
      sectors: { "Professional Services": 2, Fintech: 2 },
      avgComposite: 83,
    },
    {
      iso2: "IE",
      bandA: 3,
      total: 7,
      sectors: { Fintech: 2, AI: 1 },
      avgComposite: 85,
    },
    {
      iso2: "KR",
      bandA: 2,
      total: 6,
      sectors: { AI: 1, Manufacturing: 1 },
      avgComposite: 83,
    },
  ],
};

export const YEAR_CONTEXT: Record<OriginYear, string> = {
  2000:
    "Pre-PBS era. Free zones still small; UAE indigenous talent dominates the Band A sample.",
  2005:
    "DMCC launched in 2002; commodities pipeline begins to pull South Asian talent into the UAE.",
  2010:
    "India and Pakistan rising as logistics and commodities origins. Foreign-origin Band A count overtakes UAE for the first time.",
  2015:
    "Post-2012 PSW closure UK outflow takes shape; UK and US rise as fintech and AI origins.",
  2020:
    "US trade-war redirect; China rises as a tech origin. UK overtakes US to become a top-three origin.",
  2025:
    "Post-Investor route closure (2022) and post-2024 salary raise; UK is now the dominant origin country.",
};

// Probability distribution across the five talent categories per country,
// in order [investors, founders, seniorEmployees, midLevelProfessionals,
// students]. Each row sums to 1.0. Profiles reflect a country's typical
// archetype : Family Office hubs investor-heavy (AE, SG), tech hubs
// founder-heavy (UK, US, IE, CN), engineering pipelines mid + student
// heavy (IN, PK, PH, EG), industrial economies senior-heavy (DE, FR).
type TalentProfile = readonly [number, number, number, number, number];

const COUNTRY_TALENT_PROFILE: Record<string, TalentProfile> = {
  AE: [0.35, 0.12, 0.22, 0.18, 0.13],
  AU: [0.15, 0.22, 0.25, 0.22, 0.16],
  CN: [0.1, 0.28, 0.18, 0.2, 0.24],
  DE: [0.18, 0.22, 0.28, 0.22, 0.1],
  EG: [0.06, 0.15, 0.22, 0.32, 0.25],
  FR: [0.18, 0.2, 0.28, 0.22, 0.12],
  GB: [0.1, 0.3, 0.15, 0.2, 0.25],
  IE: [0.12, 0.3, 0.18, 0.2, 0.2],
  IN: [0.08, 0.18, 0.2, 0.3, 0.24],
  KR: [0.12, 0.22, 0.25, 0.25, 0.16],
  LB: [0.1, 0.18, 0.22, 0.3, 0.2],
  PH: [0.05, 0.12, 0.2, 0.35, 0.28],
  PK: [0.05, 0.12, 0.25, 0.32, 0.26],
  SG: [0.28, 0.18, 0.26, 0.18, 0.1],
  US: [0.12, 0.32, 0.2, 0.2, 0.16],
};
const DEFAULT_PROFILE: TalentProfile = [0.1, 0.2, 0.22, 0.28, 0.2];

// Convert a profile + bandA total into integer counts. The "round and patch"
// step ensures the five counts sum to exactly bandA so the legend totals
// don't drift.
function talentMixFor(iso2: string, bandA: number): TalentMix {
  if (bandA <= 0) {
    return {
      investors: 0,
      founders: 0,
      seniorEmployees: 0,
      midLevelProfessionals: 0,
      students: 0,
    };
  }
  const profile = COUNTRY_TALENT_PROFILE[iso2] ?? DEFAULT_PROFILE;
  const raw = profile.map((p) => p * bandA);
  const rounded = raw.map((v) => Math.round(v));
  let drift = bandA - rounded.reduce((s, v) => s + v, 0);
  // Patch the largest category until totals reconcile.
  while (drift !== 0) {
    const targetIdx = drift > 0
      ? raw.indexOf(Math.max(...raw))
      : rounded.indexOf(Math.max(...rounded));
    rounded[targetIdx] += drift > 0 ? 1 : -1;
    drift = bandA - rounded.reduce((s, v) => s + v, 0);
  }
  return {
    investors: Math.max(0, rounded[0]),
    founders: Math.max(0, rounded[1]),
    seniorEmployees: Math.max(0, rounded[2]),
    midLevelProfessionals: Math.max(0, rounded[3]),
    students: Math.max(0, rounded[4]),
  };
}

function specsToCountries(specs: YearCountrySpec[]): OriginCountry[] {
  return specs
    .map((s) => {
      const meta = COUNTRY_TABLE[s.iso2];
      return {
        iso2: s.iso2,
        iso3: meta?.iso3 ?? s.iso2,
        country_name: meta?.name ?? s.iso2,
        band_a_count: s.bandA,
        total_entities: s.total,
        sector_breakdown: s.sectors,
        avg_composite: s.avgComposite,
        centroid: meta?.centroid,
        talent_mix: talentMixFor(s.iso2, s.bandA),
      } as OriginCountry;
    })
    .sort(
      (a, b) =>
        b.band_a_count - a.band_a_count ||
        a.country_name.localeCompare(b.country_name),
    );
}

// ----- Talent layer helpers -----

export type MapLayer = "entities" | "talent";

export const TALENT_CATEGORY_ORDER: (keyof TalentMix)[] = [
  "investors",
  "founders",
  "seniorEmployees",
  "midLevelProfessionals",
  "students",
];

export const TALENT_CATEGORY_LABEL: Record<keyof TalentMix, string> = {
  investors: "Investors",
  founders: "Founders",
  seniorEmployees: "Senior employees",
  midLevelProfessionals: "Mid-level professionals",
  students: "Students",
};

export const TALENT_CATEGORY_COLOR: Record<keyof TalentMix, string> = {
  investors: "#0F2C5C", // navy (accent-deep)
  founders: "#00A2E9", // cyan
  seniorEmployees: "#64748B", // slate
  midLevelProfessionals: "#B8D4E3", // glacier
  students: "#7C3AED", // violet
};

const _cache = new Map<OriginYear, OriginMapResponse>();

export function originResponseForYear(year: OriginYear): OriginMapResponse {
  const cached = _cache.get(year);
  if (cached) return cached;
  const countries = specsToCountries(SPECS_BY_YEAR[year]);
  const total_band_a = countries.reduce((s, c) => s + c.band_a_count, 0);
  const gccBandA = countries
    .filter((c) => GCC.has(c.iso2))
    .reduce((s, c) => s + c.band_a_count, 0);
  const non_gcc_pct = total_band_a
    ? Math.round(((total_band_a - gccBandA) / total_band_a) * 100)
    : 0;
  const response: OriginMapResponse = {
    generated_at: new Date().toISOString().slice(0, 16).replace("T", " "),
    total_band_a,
    total_origin_countries: countries.filter((c) => c.band_a_count > 0).length,
    non_gcc_pct,
    last_refresh: `${year}-12-31`,
    countries,
  };
  _cache.set(year, response);
  return response;
}

export const ORIGIN_HISTORY_FIXTURE_VERSION =
  "origin-history.ts @ 2026-05-13";
