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
