// Domain types for ATLAS — sovereign mobility intelligence preview.
// Distinct from the INDEX caseworker schema in `@/lib/types`.

export type Jurisdiction = "UAE" | "UK" | "SAUDI";

export type FreeZone = "DMCC" | "DIFC" | "ADGM" | "JAFZA";

export type RubricBand = "A" | "B" | "C" | "D";

export type CompanySize = "micro" | "small" | "medium" | "large";

export interface AtlasEvidence {
  type: "ip" | "funding" | "team" | "filing" | "press";
  source: string;
  date: string;
  url?: string;
}

export interface AtlasGrading {
  band: RubricBand;
  innovation: number;
  viability: number;
  scalability: number;
  reasoning: string;
  evidence: AtlasEvidence[];
}

export interface AtlasDataSource {
  authority: string;
  confidence: "high" | "medium" | "low";
  lastUpdated: string;
}

export interface AtlasCompany {
  id: string;
  name: string;
  jurisdiction: Jurisdiction;
  zone: FreeZone | null;
  sector: string;
  subSector: string;
  yearRegistered: number;
  size: CompanySize;
  headcount?: number;
  revenue?: number;
  /** ISO-3166 alpha-2 of the founder or HQ origin country. Populated by
   *  scripts/augment-origin-data.mjs; absent on records pre-augmentation. */
  origin_country?: string;
  grading: AtlasGrading;
  dataSource: AtlasDataSource;
}

export interface SectorSummary {
  sector: string;
  total: number;
  byBand: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
}

export type FlowJurisdiction = "UK" | "US" | "EU" | "UAE" | "Singapore";

export interface FlowPair {
  from: FlowJurisdiction;
  to: FlowJurisdiction;
  value: number;
}

export interface FlowSankeyData {
  sample_window_start: string;
  sample_window_end: string;
  sample_size: number;
  pairs: FlowPair[];
}

export interface OriginCountry {
  iso2: string;
  iso3: string;
  country_name: string;
  band_a_count: number;
  total_entities: number;
  sector_breakdown: Record<string, number>;
  avg_composite: number;
  /** [lat, lng] tuple. Undefined if the country isn't in the centroid table. */
  centroid?: [number, number];
}

export interface OriginMapResponse {
  generated_at: string;
  total_band_a: number;
  total_origin_countries: number;
  non_gcc_pct: number;
  last_refresh: string;
  countries: OriginCountry[];
}

export type HeatmapMetric = "bandADensity" | "avgComposite" | "totalEntities";

export interface HeatmapCell {
  zone: FreeZone;
  sector: string;
  bandACount: number;
  totalEntities: number;
  avgComposite: number;
}

export interface PolicyInsight {
  title: string;
  body: string;
  /** Additional 1-2 sentences explaining what was detected and why it matters. */
  bodyDetail?: string;
  severity: "opportunity" | "watch" | "intervention";
  affectedSector: string;
  evidenceCompanies: string[];
  /** A concrete suggested action an authority could take. */
  suggestedAction: string;
}
