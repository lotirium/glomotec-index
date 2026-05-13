// UK inbound + outbound Band A flow snapshots, paraphrased ONS / HMRC
// patterns. Four years at decade-style intervals (2000 / 2010 / 2020 / 2025).
// Inbound = where UK gained Band A talent from. Outbound = where UK lost
// Band A talent to (the brain drain story).

import { COUNTRY_TABLE } from "@/lib/atlas/country-centroids";
import {
  TALENT_CATEGORY_ORDER,
  type MapLayer,
} from "@/lib/atlas/origin-history";
import type { OriginCountry, OriginMapResponse, TalentMix } from "@/lib/atlas/types";

export type UkFlowYear = 2000 | 2010 | 2020 | 2025;
export const UK_FLOW_YEARS: UkFlowYear[] = [2000, 2010, 2020, 2025];

export type UkFlowDirection = "inbound" | "outbound";

interface FlowCountrySpec {
  country: string; // iso2
  bandA: number;
  sectors: string;
}

export const UK_INBOUND_ORIGIN_BY_YEAR: Record<UkFlowYear, FlowCountrySpec[]> = {
  2000: [
    { country: "IN", bandA: 18, sectors: "Healthcare, IT" },
    { country: "PK", bandA: 12, sectors: "Healthcare, Retail" },
    { country: "PL", bandA: 9, sectors: "Construction, Logistics" },
    { country: "AU", bandA: 6, sectors: "Finance, Tech" },
    { country: "US", bandA: 5, sectors: "Finance, Tech" },
  ],
  2010: [
    { country: "IN", bandA: 42, sectors: "Healthcare, IT, Engineering" },
    { country: "PL", bandA: 35, sectors: "Construction, Manufacturing" },
    { country: "PK", bandA: 24, sectors: "Healthcare, Retail" },
    { country: "PH", bandA: 18, sectors: "Healthcare, Care" },
    { country: "NG", bandA: 12, sectors: "Healthcare, Finance" },
    { country: "AU", bandA: 8, sectors: "Finance, Tech" },
    { country: "US", bandA: 7, sectors: "Finance, Tech" },
  ],
  2020: [
    { country: "IN", bandA: 38, sectors: "Healthcare, IT, Engineering" },
    { country: "PH", bandA: 22, sectors: "Healthcare, Care" },
    { country: "NG", bandA: 16, sectors: "Healthcare, Tech" },
    { country: "ZA", bandA: 9, sectors: "Healthcare, Engineering" },
    { country: "PK", bandA: 14, sectors: "Healthcare, Retail" },
    { country: "AU", bandA: 6, sectors: "Finance, Tech" },
    { country: "HK", bandA: 19, sectors: "Finance, Tech (BNO scheme)" },
  ],
  2025: [
    { country: "IN", bandA: 54, sectors: "Healthcare, IT, Engineering" },
    { country: "PH", bandA: 31, sectors: "Healthcare, Care" },
    { country: "NG", bandA: 27, sectors: "Healthcare, Tech, Finance" },
    { country: "HK", bandA: 23, sectors: "Finance, Tech (BNO scheme)" },
    { country: "ZW", bandA: 18, sectors: "Healthcare, Care" },
    { country: "AU", bandA: 9, sectors: "Finance, Tech" },
    { country: "US", bandA: 12, sectors: "Finance, Tech (post-trade-war redirect)" },
  ],
};

export const UK_OUTBOUND_DESTINATION_BY_YEAR: Record<UkFlowYear, FlowCountrySpec[]> = {
  2000: [
    { country: "US", bandA: 8, sectors: "Finance, Tech" },
    { country: "AU", bandA: 5, sectors: "Finance, Mining" },
    { country: "CA", bandA: 3, sectors: "Finance, Energy" },
  ],
  2010: [
    { country: "US", bandA: 14, sectors: "Finance, Tech" },
    { country: "AU", bandA: 11, sectors: "Finance, Mining" },
    { country: "AE", bandA: 9, sectors: "Finance, Trade" },
    { country: "SG", bandA: 7, sectors: "Finance, Tech" },
    { country: "CA", bandA: 5, sectors: "Finance, Energy" },
  ],
  2020: [
    { country: "AE", bandA: 28, sectors: "Finance, Tech, Trade" },
    { country: "US", bandA: 21, sectors: "Finance, Tech" },
    { country: "SG", bandA: 16, sectors: "Finance, Tech" },
    { country: "AU", bandA: 12, sectors: "Finance, Mining" },
    { country: "CA", bandA: 7, sectors: "Finance, Energy" },
  ],
  2025: [
    { country: "AE", bandA: 48, sectors: "Finance, Tech, Trade (post-Investor closure)" },
    { country: "US", bandA: 28, sectors: "Finance, Tech" },
    { country: "SG", bandA: 24, sectors: "Finance, Tech" },
    { country: "AU", bandA: 15, sectors: "Finance, Mining" },
    { country: "CA", bandA: 9, sectors: "Finance, Energy" },
  ],
};

// Light talent-profile coverage for the UK flow countries that aren't in
// the UAE origin-history profile table. Same shape :
// [investors, founders, seniorEmployees, midLevelProfessionals, students].
const UK_FLOW_TALENT_PROFILE: Record<string, [number, number, number, number, number]> = {
  CA: [0.14, 0.22, 0.26, 0.24, 0.14],
  HK: [0.32, 0.22, 0.22, 0.16, 0.08],
  NG: [0.06, 0.18, 0.24, 0.32, 0.20],
  PH: [0.04, 0.10, 0.22, 0.40, 0.24],
  PL: [0.06, 0.16, 0.24, 0.34, 0.20],
  ZA: [0.10, 0.20, 0.28, 0.26, 0.16],
  ZW: [0.04, 0.10, 0.22, 0.38, 0.26],
};

const FALLBACK_PROFILE: [number, number, number, number, number] = [
  0.1, 0.2, 0.22, 0.28, 0.2,
];

// Profile used per country. Falls back to the UK flow table, then to a
// generic default. Same drift-patch as the UAE version so the five counts
// sum to exactly bandA.
function talentMixForUk(iso2: string, bandA: number): TalentMix {
  if (bandA <= 0) {
    return {
      investors: 0,
      founders: 0,
      seniorEmployees: 0,
      midLevelProfessionals: 0,
      students: 0,
    };
  }
  const profile = UK_FLOW_TALENT_PROFILE[iso2] ?? FALLBACK_PROFILE;
  const raw = profile.map((p) => p * bandA);
  const rounded = raw.map((v) => Math.round(v));
  let drift = bandA - rounded.reduce((s, v) => s + v, 0);
  while (drift !== 0) {
    const targetIdx =
      drift > 0
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

function specsToCountries(specs: FlowCountrySpec[]): OriginCountry[] {
  return specs
    .map((s) => {
      const meta = COUNTRY_TABLE[s.country];
      const sector_breakdown: Record<string, number> = {};
      // The sector field is a free-text comma-list; split into a count map
      // for compatibility with the existing OriginCountry shape.
      const sectorTokens = s.sectors.split(",").map((t) => t.trim()).filter(Boolean);
      const perSector = Math.max(1, Math.floor(s.bandA / Math.max(1, sectorTokens.length)));
      let assigned = 0;
      for (let i = 0; i < sectorTokens.length; i++) {
        const value = i === sectorTokens.length - 1 ? s.bandA - assigned : perSector;
        sector_breakdown[sectorTokens[i]] = value;
        assigned += value;
      }
      return {
        iso2: s.country,
        iso3: meta?.iso3 ?? s.country,
        country_name: meta?.name ?? s.country,
        band_a_count: s.bandA,
        total_entities: Math.round(s.bandA * 1.6) + 4,
        sector_breakdown,
        avg_composite: 82,
        centroid: meta?.centroid,
        talent_mix: talentMixForUk(s.country, s.bandA),
      } as OriginCountry;
    })
    .sort(
      (a, b) =>
        b.band_a_count - a.band_a_count ||
        a.country_name.localeCompare(b.country_name),
    );
}

const GCC = new Set(["AE", "BH", "KW", "OM", "QA", "SA"]);

function buildResponse(
  countries: OriginCountry[],
  year: UkFlowYear,
): OriginMapResponse {
  const total_band_a = countries.reduce((s, c) => s + c.band_a_count, 0);
  const gcc = countries
    .filter((c) => GCC.has(c.iso2))
    .reduce((s, c) => s + c.band_a_count, 0);
  const non_gcc_pct = total_band_a
    ? Math.round(((total_band_a - gcc) / total_band_a) * 100)
    : 0;
  return {
    generated_at: new Date().toISOString().slice(0, 16).replace("T", " "),
    total_band_a,
    total_origin_countries: countries.filter((c) => c.band_a_count > 0).length,
    non_gcc_pct,
    last_refresh: `${year}-12-31`,
    countries,
  };
}

const _inboundCache = new Map<UkFlowYear, OriginMapResponse>();
const _outboundCache = new Map<UkFlowYear, OriginMapResponse>();

export function ukFlowResponseFor(
  year: UkFlowYear,
  direction: UkFlowDirection,
): OriginMapResponse {
  const cache = direction === "inbound" ? _inboundCache : _outboundCache;
  const cached = cache.get(year);
  if (cached) return cached;
  const source =
    direction === "inbound"
      ? UK_INBOUND_ORIGIN_BY_YEAR[year]
      : UK_OUTBOUND_DESTINATION_BY_YEAR[year];
  const countries = specsToCountries(source);
  const response = buildResponse(countries, year);
  cache.set(year, response);
  return response;
}

export function totalsForYear(year: UkFlowYear): {
  inbound: number;
  outbound: number;
  net: number;
} {
  const inbound = UK_INBOUND_ORIGIN_BY_YEAR[year].reduce(
    (s, c) => s + c.bandA,
    0,
  );
  const outbound = UK_OUTBOUND_DESTINATION_BY_YEAR[year].reduce(
    (s, c) => s + c.bandA,
    0,
  );
  return { inbound, outbound, net: inbound - outbound };
}

export const UK_FLOW_YEAR_CONTEXT: Record<UkFlowYear, string> = {
  2000:
    "Pre-PSW era. Inbound flow led by India and Pakistan; outbound slim and US-anchored.",
  2010:
    "Tier 1 / Tier 2 expansion. Polish workers rise sharply; Singapore and UAE emerge as outbound destinations.",
  2020:
    "Pandemic year. Hong Kong BNO scheme starts; UAE overtakes US as outbound destination.",
  2025:
    "Post-Investor closure. UAE dominates outbound (48 of 124); Nigeria and Hong Kong rise as inbound origins.",
};

// Re-export for components that need to drive the layer toggle without
// circular imports. The Entities / Talent layer behaviour is identical to
// the UAE origin map.
export type { MapLayer };
export { TALENT_CATEGORY_ORDER };
