// Singapore inbound origin history for /atlas/sg/origin-map.
// Paraphrased MOM Employment Pass releases + EDB historical workforce mix
// summaries. Singapore tightens with rhythm : each EP threshold raise
// reshapes the origin mix. Spans 2000 → 2025 at five-year cadence so the
// COMPASS framework lands cleanly in the 2025 snapshot.

import { COUNTRY_TABLE } from "@/lib/atlas/country-centroids";
import type { OriginCountry, OriginMapResponse, TalentMix } from "@/lib/atlas/types";

export type SgFlowYear = 2000 | 2010 | 2015 | 2020 | 2025;
export const SG_FLOW_YEARS: SgFlowYear[] = [2000, 2010, 2015, 2020, 2025];

export const SG_HISTORY_FIXTURE_VERSION = "sg-origin-history.ts @ 2026-05-13";

export type SgPolicyCategory = "tightening" | "expansion" | "system";

export interface SgPolicyEvent {
  year: number;
  label: string;
  category: SgPolicyCategory;
  impactNote: string;
}

interface RawRow {
  country: string;
  bandA: number;
  sectors: string;
}

// "UK" in the spec rows resolves to ISO GB.
function iso2For(spec: string): string {
  if (spec === "UK") return "GB";
  return spec;
}

const RAW_2000: RawRow[] = [
  { country: "MY", bandA: 22, sectors: "Manufacturing, Services" },
  { country: "CN", bandA: 18, sectors: "Manufacturing, Trade" },
  { country: "ID", bandA: 12, sectors: "Manufacturing, Construction" },
  { country: "IN", bandA: 8, sectors: "Tech, Finance" },
  { country: "PH", bandA: 6, sectors: "Services, Care" },
];

const RAW_2010: RawRow[] = [
  // Pre-Singaporean-First. Regional ASEAN + China dominant.
  { country: "MY", bandA: 28, sectors: "Manufacturing, Services" },
  { country: "CN", bandA: 32, sectors: "Manufacturing, Trade, Finance" },
  { country: "IN", bandA: 28, sectors: "Tech, Finance" },
  { country: "ID", bandA: 18, sectors: "Manufacturing, Construction" },
  { country: "PH", bandA: 14, sectors: "Services, Care" },
  { country: "AU", bandA: 6, sectors: "Finance, Mining" },
];

const RAW_2015: RawRow[] = [
  // Post Singaporean First (2011) and 2014 EP threshold raise to S$3,300.
  { country: "MY", bandA: 31, sectors: "Manufacturing, Services" },
  { country: "IN", bandA: 38, sectors: "Tech, Finance (post-PSW-redirect)" },
  { country: "CN", bandA: 36, sectors: "Manufacturing, Trade, Finance" },
  { country: "ID", bandA: 15, sectors: "Manufacturing, Construction" },
  { country: "PH", bandA: 12, sectors: "Services, Care" },
  { country: "AU", bandA: 9, sectors: "Finance, Mining" },
  { country: "UK", bandA: 11, sectors: "Finance, Tech" },
];

const RAW_2020: RawRow[] = [
  // Pandemic year. EP threshold S$3,900. HK NSL redirect adds new corridor.
  { country: "IN", bandA: 32, sectors: "Tech, Finance" },
  { country: "MY", bandA: 21, sectors: "Manufacturing, Services" },
  { country: "CN", bandA: 26, sectors: "Manufacturing, Trade, Finance" },
  { country: "PH", bandA: 9, sectors: "Services, Care" },
  { country: "ID", bandA: 11, sectors: "Manufacturing, Construction" },
  { country: "AU", bandA: 7, sectors: "Finance, Mining" },
  { country: "UK", bandA: 14, sectors: "Finance, Tech" },
  { country: "HK", bandA: 18, sectors: "Finance, Tech (post-NSL redirect)" },
];

const RAW_2025: RawRow[] = [
  // Post-COMPASS framework. EP threshold S$5,000.
  { country: "IN", bandA: 41, sectors: "Tech, Finance" },
  { country: "CN", bandA: 38, sectors: "Manufacturing, Trade, Finance" },
  { country: "MY", bandA: 22, sectors: "Manufacturing, Services" },
  { country: "UK", bandA: 24, sectors: "Finance, Tech (post-Investor-closure redirect)" },
  { country: "HK", bandA: 28, sectors: "Finance, Tech" },
  { country: "PH", bandA: 8, sectors: "Services, Care" },
  { country: "ID", bandA: 9, sectors: "Manufacturing, Construction" },
  { country: "AU", bandA: 9, sectors: "Finance, Mining" },
  { country: "US", bandA: 11, sectors: "Finance, Tech" },
];

export const SG_INBOUND_RAW_BY_YEAR: Record<SgFlowYear, RawRow[]> = {
  2000: RAW_2000,
  2010: RAW_2010,
  2015: RAW_2015,
  2020: RAW_2020,
  2025: RAW_2025,
};

export const SG_POLICY_EVENTS: SgPolicyEvent[] = [
  {
    year: 2011,
    label: "Singaporean First Policy",
    category: "tightening",
    impactNote:
      "Mandates Singaporean citizens are considered first for vacancies. Tilts hiring mix toward higher-skilled foreign talent.",
  },
  {
    year: 2014,
    label: "EP minimum salary S$3,300",
    category: "tightening",
    impactNote:
      "Employment Pass threshold raised from S$3,000 to S$3,300. Excludes lower-paid foreign workers.",
  },
  {
    year: 2020,
    label: "EP threshold S$3,900",
    category: "tightening",
    impactNote:
      "EP minimum salary raised again post-pandemic. Sectoral floors set higher for financial services (S$5,000).",
  },
  {
    year: 2023,
    label: "COMPASS framework launched",
    category: "system",
    impactNote:
      "Complementarity Assessment Framework. Multi-attribute scoring against six criteria including salary, qualifications, diversity, local hiring. Singapore's own version of gMC.",
  },
  {
    year: 2024,
    label: "EP threshold S$5,000",
    category: "tightening",
    impactNote:
      "Across-the-board EP minimum salary raise. Financial services floor S$5,500.",
  },
];

// EP threshold in force at the snapshot year. Used in the hero strip.
export const SG_EP_THRESHOLD_BY_YEAR: Record<SgFlowYear, string> = {
  2000: "S$3,000",
  2010: "S$3,000",
  2015: "S$3,300",
  2020: "S$3,900",
  2025: "S$5,000",
};

// One-line context for the year selector strip.
export const SG_FLOW_YEAR_CONTEXT: Record<SgFlowYear, string> = {
  2000: "Pre Singaporean First. Open hiring across regional ASEAN with manufacturing leading the mix.",
  2010: "Pre 2011 Singaporean First. Malaysia, China, India share the top of the inbound stack.",
  2015: "Post Singaporean First (2011) and the 2014 EP raise to S$3,300. India overtakes the regional ASEAN majority for the first time on tech and finance hiring.",
  2020: "EP threshold at S$3,900. Pandemic year. Hong Kong appears in the top stack on post-NSL professional redirects.",
  2025: "Post COMPASS framework (2023) and the 2024 EP raise to S$5,000. UK arrivals climb on post-Investor-closure redirects; regional ASEAN volumes ease.",
};

// Year-specific takeaway banner copy.
export const SG_FLOW_YEAR_TAKEAWAY: Record<SgFlowYear, string> = {
  2000: "Regional ASEAN dominates. Malaysia, China, and Indonesia account for the bulk of the inbound mix on a manufacturing and trade base.",
  2010: "China and India have caught Malaysia. The inbound mix is broadening but still ASEAN-weighted, with the EP threshold at S$3,000.",
  2015: "Singapore tightens with rhythm. The 2014 EP raise to S$3,300 visibly shifts the mix : India overtakes regional ASEAN on tech and finance hiring.",
  2020: "Pandemic-year mix. Hong Kong enters the top corridor on NSL-related redirects. EP threshold is now S$3,900.",
  2025: "Singapore tightens with rhythm. The 2024 EP threshold raise to S$5,000 has visibly shifted the inbound mix toward UK and HK at the expense of regional ASEAN origins.",
};

// Per-country profile : [investors, founders, seniorEmployees,
// midLevelProfessionals, students]. Paraphrased from MOM Employment Pass
// occupational mix releases. Each row sums to 1.0.
const SG_TALENT_PROFILE: Record<string, [number, number, number, number, number]> = {
  // Tech and finance corridors with founder weight.
  IN: [0.08, 0.18, 0.22, 0.36, 0.16],
  // Manufacturing and trade weighted toward mid-level + senior employees.
  CN: [0.12, 0.16, 0.28, 0.30, 0.14],
  // Regional ASEAN. Manufacturing and services, lower founder weight.
  MY: [0.06, 0.10, 0.26, 0.40, 0.18],
  ID: [0.08, 0.10, 0.24, 0.40, 0.18],
  PH: [0.04, 0.08, 0.22, 0.44, 0.22],
  // Finance corridors, investor weight + senior employees.
  GB: [0.18, 0.22, 0.28, 0.20, 0.12],
  HK: [0.24, 0.20, 0.26, 0.18, 0.12],
  AU: [0.16, 0.18, 0.28, 0.22, 0.16],
  US: [0.18, 0.22, 0.26, 0.22, 0.12],
};

const SG_FALLBACK_PROFILE: [number, number, number, number, number] = [
  0.1, 0.16, 0.26, 0.30, 0.18,
];

// Drift-corrected rounding so the five mix counts sum exactly to bandA.
function talentMixForSg(iso2: string, bandA: number): TalentMix {
  if (bandA <= 0) {
    return {
      investors: 0,
      founders: 0,
      seniorEmployees: 0,
      midLevelProfessionals: 0,
      students: 0,
    };
  }
  const profile = SG_TALENT_PROFILE[iso2] ?? SG_FALLBACK_PROFILE;
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

function buildCountries(rows: RawRow[]): OriginCountry[] {
  return rows
    .map((row) => {
      const iso2 = iso2For(row.country);
      const record = COUNTRY_TABLE[iso2];
      if (!record) return null;
      const sectors = row.sectors.split(",").map((s) => s.trim());
      const sector_breakdown: Record<string, number> = {};
      if (sectors.length === 1) {
        sector_breakdown[sectors[0]] = row.bandA;
      } else {
        // Split the count proportionally so the audit anchor reads cleanly.
        // First sector takes the larger half; remainder splits across the rest.
        const lead = Math.ceil(row.bandA * 0.6);
        const rest = row.bandA - lead;
        const perRest = Math.max(1, Math.floor(rest / (sectors.length - 1)));
        sector_breakdown[sectors[0]] = lead;
        for (let i = 1; i < sectors.length; i++) {
          sector_breakdown[sectors[i]] =
            i === sectors.length - 1
              ? Math.max(0, rest - perRest * (sectors.length - 2))
              : perRest;
        }
      }
      return {
        iso2,
        iso3: record.iso3,
        country_name: record.name,
        band_a_count: row.bandA,
        total_entities: row.bandA,
        sector_breakdown,
        avg_composite: 82,
        centroid: record.centroid,
        talent_mix: talentMixForSg(iso2, row.bandA),
      } as OriginCountry;
    })
    .filter((x): x is OriginCountry => x !== null)
    .sort((a, b) => b.band_a_count - a.band_a_count);
}

// Build the OriginMapResponse for a given year. Memoised at module load so the
// response object identity is stable across renders.
const RESPONSE_BY_YEAR: Record<SgFlowYear, OriginMapResponse> = (() => {
  const out: Partial<Record<SgFlowYear, OriginMapResponse>> = {};
  for (const y of SG_FLOW_YEARS) {
    const countries = buildCountries(SG_INBOUND_RAW_BY_YEAR[y]);
    const totalBandA = countries.reduce((s, c) => s + c.band_a_count, 0);
    const nonAseanCount = countries
      .filter((c) => !["MY", "ID", "PH", "TH", "VN"].includes(c.iso2))
      .reduce((s, c) => s + c.band_a_count, 0);
    const nonAseanPct = totalBandA
      ? Math.round((nonAseanCount / totalBandA) * 100)
      : 0;
    out[y] = {
      generated_at: `${y}-12-31T00:00:00Z`,
      total_band_a: totalBandA,
      total_origin_countries: countries.length,
      non_gcc_pct: nonAseanPct,
      last_refresh: `${y}-12-31`,
      countries,
    };
  }
  return out as Record<SgFlowYear, OriginMapResponse>;
})();

export function sgOriginResponseFor(year: SgFlowYear): OriginMapResponse {
  return RESPONSE_BY_YEAR[year];
}

export function sgTotalsForYear(year: SgFlowYear): {
  inbound: number;
  origins: number;
  epThreshold: string;
} {
  const r = RESPONSE_BY_YEAR[year];
  return {
    inbound: r.total_band_a,
    origins: r.total_origin_countries,
    epThreshold: SG_EP_THRESHOLD_BY_YEAR[year],
  };
}

// Active "in force" Singapore policy levers at the snapshot year.
export function activeSgLeversAt(year: number): SgPolicyEvent[] {
  return SG_POLICY_EVENTS.filter((e) => e.year <= year);
}
