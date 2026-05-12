import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type {
  AtlasCompany,
  FlowSankeyData,
  FreeZone,
  HeatmapCell,
  HeatmapMetric,
  OriginCountry,
  OriginMapResponse,
  PolicyInsight,
  RubricBand,
  SectorSummary,
} from "@/lib/atlas/types";
import { COUNTRY_TABLE, GCC_CODES } from "@/lib/atlas/country-centroids";

export { RUBRIC_VERSION } from "@/lib/atlas/rubric";

const ZONE_AUTHORITY: Record<FreeZone, string> = {
  DMCC: "DMCC Authority",
  DIFC: "DIFC Authority",
  ADGM: "ADGM Registration Authority",
  JAFZA: "Jebel Ali Free Zone Authority",
};

const ZONE_DATASET_LABEL: Record<FreeZone, string> = {
  DMCC: "DMCC member entity register (sample)",
  DIFC: "DIFC active firm register (sample)",
  ADGM: "ADGM registered entity index (sample)",
  JAFZA: "JAFZA licensed entity register (sample)",
};

const root = path.join(process.cwd(), "fixtures", "atlas");

const ZONE_FILE: Record<FreeZone, string> = {
  DMCC: "dmcc.json",
  DIFC: "difc.json",
  ADGM: "adgm.json",
  JAFZA: "jafza.json",
};

const UK_FILE = "uk-innovator.json";

const _cache = new Map<string, AtlasCompany[]>();

async function readCompanies(file: string): Promise<AtlasCompany[]> {
  if (_cache.has(file)) return _cache.get(file)!;
  const buf = await fs.readFile(path.join(root, file), "utf8");
  const parsed = JSON.parse(buf) as AtlasCompany[];
  _cache.set(file, parsed);
  return parsed;
}

export async function getCompaniesByZone(zone: FreeZone): Promise<AtlasCompany[]> {
  return readCompanies(ZONE_FILE[zone]);
}

export async function getUkInnovatorCompanies(): Promise<AtlasCompany[]> {
  return readCompanies(UK_FILE);
}

async function getAllCompanies(): Promise<AtlasCompany[]> {
  const sets = await Promise.all([
    getCompaniesByZone("DMCC"),
    getCompaniesByZone("DIFC"),
    getCompaniesByZone("ADGM"),
    getCompaniesByZone("JAFZA"),
    getUkInnovatorCompanies(),
  ]);
  return sets.flat();
}

export async function getCompanyById(id: string): Promise<AtlasCompany | null> {
  const all = await getAllCompanies();
  return all.find((c) => c.id === id) ?? null;
}

function emptyBandCount() {
  return { A: 0, B: 0, C: 0, D: 0 } as Record<RubricBand, number>;
}

export function compositeScore(c: AtlasCompany): number {
  return (
    c.grading.innovation * 0.5 +
    c.grading.viability * 0.25 +
    c.grading.scalability * 0.25
  );
}

export async function getSectorSummary(zone: FreeZone): Promise<SectorSummary[]> {
  const companies = await getCompaniesByZone(zone);
  const bySector = new Map<string, SectorSummary>();
  for (const c of companies) {
    let entry = bySector.get(c.sector);
    if (!entry) {
      entry = { sector: c.sector, total: 0, byBand: emptyBandCount() };
      bySector.set(c.sector, entry);
    }
    entry.total += 1;
    entry.byBand[c.grading.band] += 1;
  }
  return [...bySector.values()].sort((a, b) => b.total - a.total);
}

const ZONE_DESK: Record<FreeZone, string> = {
  DMCC: "DMCC commercial services desk",
  DIFC: "DIFC innovation desk",
  ADGM: "ADGM business development team",
  JAFZA: "JAFZA trade facilitation team",
};

export async function getPolicyInsights(zone: FreeZone): Promise<PolicyInsight[]> {
  const companies = await getCompaniesByZone(zone);
  const summaries = await getSectorSummary(zone);
  const insights: PolicyInsight[] = [];

  const totalA = companies.filter((c) => c.grading.band === "A").length;
  const totalD = companies.filter((c) => c.grading.band === "D").length;
  const total = companies.length;
  const desk = ZONE_DESK[zone];

  for (const s of summaries) {
    const strong = s.byBand.A + s.byBand.B;
    const strongPct = Math.round((strong / s.total) * 100);
    const weak = s.byBand.D;
    const weakPct = Math.round((weak / s.total) * 100);

    if (strongPct >= 60 && s.total >= 6) {
      const evidence = companies
        .filter((c) => c.sector === s.sector && (c.grading.band === "A" || c.grading.band === "B"))
        .slice(0, 4)
        .map((c) => c.id);
      insights.push({
        title: `${s.sector} concentrating Strong and Acceptable activity`,
        body: `${s.sector} sector in ${zone} shows ${strongPct}% Strong or Acceptable grading across ${s.total} registered entities.`,
        bodyDetail: `Concentrations at this density typically precede pipeline acceleration. The cluster is dominated by entities with defensible differentiation rather than scale-only plays, which is the pattern accelerator and showcase programmes are built to amplify.`,
        severity: "opportunity",
        affectedSector: s.sector,
        evidenceCompanies: evidence,
        suggestedAction: `Engage ${desk} to design an accelerator or showcase track for Band A ${s.sector.toLowerCase()} applicants; consider matched-grant or visa-fast-track incentives.`,
      });
    }

    if (weakPct >= 50 && s.total >= 6) {
      const evidence = companies
        .filter((c) => c.sector === s.sector && c.grading.band === "D")
        .slice(0, 4)
        .map((c) => c.id);
      insights.push({
        title: `${s.sector} grading concentrated Below threshold`,
        body: `${weakPct}% of ${s.sector} entities in ${zone} fall Below threshold.`,
        bodyDetail: `Sustained Below-threshold density across a sector signals that current entry criteria are admitting entities without defensible differentiation. Left unaddressed, this dilutes the zone's quality signal and reduces the policy levers available downstream.`,
        severity: "intervention",
        affectedSector: s.sector,
        evidenceCompanies: evidence,
        suggestedAction: `Commission ${desk} to review entry criteria for ${s.sector.toLowerCase()}; consider tightening evidence thresholds or introducing pillar-specific minimums.`,
      });
    }
  }

  if (insights.length < 2) {
    insights.push({
      title: `${zone} portfolio mix needs monitoring`,
      body: `${zone} portfolio of ${total} entities shows ${Math.round((totalA / total) * 100)}% Band A and ${Math.round((totalD / total) * 100)}% Below threshold.`,
      bodyDetail: `No single sector triggers an automatic action threshold this pass. The portfolio is balanced but warrants quarterly rebalancing review to keep pace with sector drift.`,
      severity: "watch",
      affectedSector: "All sectors",
      evidenceCompanies: companies.slice(0, 3).map((c) => c.id),
      suggestedAction: `Schedule a quarterly cross-sector review with ${desk}; no immediate intervention required.`,
    });
  }

  return insights.slice(0, 4);
}

// ----- Sector heat map (cross-zone visual) -----

export const HEATMAP_ZONES: FreeZone[] = ["DMCC", "DIFC", "ADGM", "JAFZA"];

export const HEATMAP_SECTORS = [
  "AI",
  "Fintech",
  "Financial Services",
  "Family Office",
  "Logistics",
  "Manufacturing",
  "Commodities",
  "Healthcare",
] as const;

// Fixture sectors are richer than the heat map's canonical 8-sector lens.
// This map folds compatible fixture sectors into a single heat map column.
// Anything unmapped (Professional services, Technology, Other, etc.) sits
// outside this visual.
const FIXTURE_SECTOR_MAP: Record<string, (typeof HEATMAP_SECTORS)[number]> = {
  AI: "AI",
  Fintech: "Fintech",
  "Regulated fintech": "Fintech",
  "Asset management": "Financial Services",
  "Family office": "Family Office",
  Logistics: "Logistics",
  Manufacturing: "Manufacturing",
  Commodities: "Commodities",
  Trade: "Commodities",
};

export async function getSectorHeatmapData(
  metric: HeatmapMetric = "bandADensity",
): Promise<HeatmapCell[][]> {
  // The same cell payload drives all three views; the metric is a hint for
  // downstream presentation and any future server-side caching key.
  void metric;

  const zoneCompanies = await Promise.all(
    HEATMAP_ZONES.map((z) => getCompaniesByZone(z)),
  );

  return HEATMAP_ZONES.map((zone, zi) => {
    const companies = zoneCompanies[zi];
    return HEATMAP_SECTORS.map((sector) => {
      const matching = companies.filter(
        (c) => FIXTURE_SECTOR_MAP[c.sector] === sector,
      );
      const bandACount = matching.filter((c) => c.grading.band === "A").length;
      const totalEntities = matching.length;
      const avgComposite = matching.length
        ? Math.round(
            matching.reduce((s, c) => s + compositeScore(c), 0) /
              matching.length,
          )
        : 0;
      return { zone, sector, bandACount, totalEntities, avgComposite };
    });
  });
}

// ----- Origin map (Visual 01) -----

export async function getOriginMapData(): Promise<OriginMapResponse> {
  const all = await getAllUaeCompanies();
  const bandA = all.filter((c) => c.grading.band === "A");

  const byCountry = new Map<string, AtlasCompany[]>();
  let latestRefresh = "";
  for (const c of all) {
    const code = c.origin_country;
    if (!code) continue;
    if (c.dataSource.lastUpdated > latestRefresh) {
      latestRefresh = c.dataSource.lastUpdated;
    }
    const list = byCountry.get(code) ?? [];
    list.push(c);
    byCountry.set(code, list);
  }

  const countries: OriginCountry[] = [];
  for (const [code, list] of byCountry) {
    const bandAList = list.filter((c) => c.grading.band === "A");
    const meta = COUNTRY_TABLE[code];
    const sector_breakdown: Record<string, number> = {};
    for (const c of bandAList) {
      sector_breakdown[c.sector] = (sector_breakdown[c.sector] ?? 0) + 1;
    }
    const avg = bandAList.length
      ? Math.round(
          bandAList.reduce((s, c) => s + compositeScore(c), 0) / bandAList.length,
        )
      : 0;
    countries.push({
      iso2: code,
      iso3: meta?.iso3 ?? code,
      country_name: meta?.name ?? code,
      band_a_count: bandAList.length,
      total_entities: list.length,
      sector_breakdown,
      avg_composite: avg,
      centroid: meta?.centroid,
    });
  }
  // Stable order: band_a_count desc, then name asc.
  countries.sort(
    (a, b) =>
      b.band_a_count - a.band_a_count ||
      a.country_name.localeCompare(b.country_name),
  );

  const total_band_a = bandA.length;
  const gccBandA = bandA.filter((c) =>
    c.origin_country ? GCC_CODES.has(c.origin_country) : false,
  ).length;
  const non_gcc_pct = total_band_a
    ? Math.round(((total_band_a - gccBandA) / total_band_a) * 100)
    : 0;

  return {
    generated_at: new Date().toISOString().slice(0, 16).replace("T", " "),
    total_band_a,
    total_origin_countries: countries.filter((c) => c.band_a_count > 0).length,
    non_gcc_pct,
    last_refresh: latestRefresh,
    countries,
  };
}

// ----- Cross-jurisdictional flow (Visual 04) -----

let _flowCache: FlowSankeyData | null = null;

export async function getFlowSankeyData(): Promise<FlowSankeyData> {
  if (_flowCache) return _flowCache;
  const buf = await fs.readFile(path.join(root, "flow-pairs.json"), "utf8");
  _flowCache = JSON.parse(buf) as FlowSankeyData;
  return _flowCache;
}

async function getAllUaeCompanies(): Promise<AtlasCompany[]> {
  const sets = await Promise.all([
    getCompaniesByZone("DMCC"),
    getCompaniesByZone("DIFC"),
    getCompaniesByZone("ADGM"),
    getCompaniesByZone("JAFZA"),
  ]);
  return sets.flat();
}

export async function getTopBandA(zone: FreeZone, limit = 10): Promise<AtlasCompany[]> {
  const companies = await getCompaniesByZone(zone);
  return [...companies]
    .filter((c) => c.grading.band === "A")
    .sort((a, b) => compositeScore(b) - compositeScore(a))
    .slice(0, limit);
}

export type ZoneOrUk = FreeZone | "UK";

export interface ZoneSummary {
  zone: ZoneOrUk;
  authority: string;
  dataset: string;
  lastUpdated: string;
  total: number;
  byBand: Record<RubricBand, number>;
  bandAOpportunities: number;
  topSectors: { sector: string; total: number }[];
}

export async function getZoneSummary(zone: FreeZone): Promise<ZoneSummary> {
  const companies = await getCompaniesByZone(zone);
  const byBand = emptyBandCount();
  let latest = "";
  for (const c of companies) {
    byBand[c.grading.band] += 1;
    if (c.dataSource.lastUpdated > latest) latest = c.dataSource.lastUpdated;
  }
  const sectors = await getSectorSummary(zone);
  return {
    zone,
    authority: ZONE_AUTHORITY[zone],
    dataset: ZONE_DATASET_LABEL[zone],
    lastUpdated: latest,
    total: companies.length,
    byBand,
    bandAOpportunities: byBand.A,
    topSectors: sectors.slice(0, 4).map((s) => ({ sector: s.sector, total: s.total })),
  };
}

export async function getAllZonesSummary(): Promise<ZoneSummary[]> {
  return Promise.all((["DMCC", "DIFC", "ADGM", "JAFZA"] as FreeZone[]).map(getZoneSummary));
}

export interface AtlasOverviewStats {
  totalCompanies: number;
  totalBandA: number;
  fintechAiGrowthPct: number;
  fintechAiTotal: number;
  lastRefresh: string;
}

export async function getAtlasOverviewStats(): Promise<AtlasOverviewStats> {
  const zones: FreeZone[] = ["DMCC", "DIFC", "ADGM", "JAFZA"];
  const sets = await Promise.all(zones.map(getCompaniesByZone));
  const all = sets.flat();

  const totalBandA = all.filter((c) => c.grading.band === "A").length;
  const fintechAi = all.filter(
    (c) => c.sector === "Fintech" || c.sector === "AI" || c.sector === "Regulated fintech",
  );
  const recent = fintechAi.filter((c) => c.yearRegistered >= 2024).length;
  const fintechAiGrowthPct = fintechAi.length
    ? Math.round((recent / fintechAi.length) * 100)
    : 0;

  const lastRefresh = all.reduce(
    (latest, c) => (c.dataSource.lastUpdated > latest ? c.dataSource.lastUpdated : latest),
    "",
  );

  return {
    totalCompanies: all.length,
    totalBandA,
    fintechAiGrowthPct,
    fintechAiTotal: fintechAi.length,
    lastRefresh,
  };
}

export function zoneAuthority(zone: FreeZone): string {
  return ZONE_AUTHORITY[zone];
}

export function zoneDatasetLabel(zone: FreeZone): string {
  return ZONE_DATASET_LABEL[zone];
}

// ----- UK Innovator Founder precedent helpers -----

export const UK_DATASET = "Endorsing-body sample register";
export const UK_AUTHORITY = "Endorsing bodies (sample)";

export interface UkOverviewStats {
  total: number;
  endorsingBodies: number;
  endorsedThisYear: number;
  byBand: Record<RubricBand, number>;
  lastRefresh: string;
}

export async function getUkOverviewStats(): Promise<UkOverviewStats> {
  const companies = await getUkInnovatorCompanies();
  const byBand = emptyBandCount();
  let latest = "";
  for (const c of companies) {
    byBand[c.grading.band] += 1;
    if (c.dataSource.lastUpdated > latest) latest = c.dataSource.lastUpdated;
  }
  const endorsingBodies = new Set(companies.map((c) => c.dataSource.authority)).size;
  const endorsedThisYear = companies.filter((c) => c.yearRegistered >= 2025).length;
  return {
    total: companies.length,
    endorsingBodies,
    endorsedThisYear,
    byBand,
    lastRefresh: latest,
  };
}

export async function getUkSectorSummary(): Promise<SectorSummary[]> {
  const companies = await getUkInnovatorCompanies();
  const bySector = new Map<string, SectorSummary>();
  for (const c of companies) {
    let entry = bySector.get(c.sector);
    if (!entry) {
      entry = { sector: c.sector, total: 0, byBand: emptyBandCount() };
      bySector.set(c.sector, entry);
    }
    entry.total += 1;
    entry.byBand[c.grading.band] += 1;
  }
  return [...bySector.values()].sort((a, b) => b.total - a.total);
}

export async function getUkTopByBand(band: RubricBand, limit = 5): Promise<AtlasCompany[]> {
  const companies = await getUkInnovatorCompanies();
  return [...companies]
    .filter((c) => c.grading.band === band)
    .sort((a, b) => compositeScore(b) - compositeScore(a))
    .slice(0, limit);
}

export async function getUkSummary(): Promise<ZoneSummary> {
  const stats = await getUkOverviewStats();
  const sectors = await getUkSectorSummary();
  return {
    zone: "UK",
    authority: UK_AUTHORITY,
    dataset: UK_DATASET,
    lastUpdated: stats.lastRefresh,
    total: stats.total,
    byBand: stats.byBand,
    bandAOpportunities: stats.byBand.A,
    topSectors: sectors.slice(0, 4).map((s) => ({ sector: s.sector, total: s.total })),
  };
}

export async function getUkInsights(): Promise<PolicyInsight[]> {
  const companies = await getUkInnovatorCompanies();
  const sectors = await getUkSectorSummary();
  const insights: PolicyInsight[] = [];

  for (const s of sectors) {
    const strong = s.byBand.A + s.byBand.B;
    const strongPct = Math.round((strong / s.total) * 100);
    const weak = s.byBand.D;
    const weakPct = Math.round((weak / s.total) * 100);

    if (strongPct >= 60 && s.total >= 5) {
      const evidence = companies
        .filter((c) => c.sector === s.sector && (c.grading.band === "A" || c.grading.band === "B"))
        .slice(0, 4)
        .map((c) => c.id);
      insights.push({
        title: `${s.sector} concentrating Strong and Acceptable activity`,
        body: `${s.sector} pipeline shows ${strongPct}% Strong or Acceptable grading across ${s.total} sampled applicants.`,
        bodyDetail: `Concentrations at this density typically precede pipeline acceleration. The cluster is dominated by entities with defensible differentiation, the pattern endorsing bodies are designed to recognise.`,
        severity: "opportunity",
        affectedSector: s.sector,
        evidenceCompanies: evidence,
        suggestedAction: `Coordinate with endorsing bodies to surface ${s.sector.toLowerCase()} Band A applicants for showcase or scale-up programmes.`,
      });
    }

    if (weakPct >= 50 && s.total >= 5) {
      const evidence = companies
        .filter((c) => c.sector === s.sector && c.grading.band === "D")
        .slice(0, 4)
        .map((c) => c.id);
      insights.push({
        title: `${s.sector} grading concentrated Below threshold`,
        body: `${weakPct}% of ${s.sector} sampled applicants fall Below threshold.`,
        bodyDetail: `Sustained Below-threshold density signals that current endorsement evidence is admitting entities without defensible differentiation. Worth reviewing endorsing-body criteria for this sector.`,
        severity: "intervention",
        affectedSector: s.sector,
        evidenceCompanies: evidence,
        suggestedAction: `Brief Home Office and endorsing bodies on tightening evidence thresholds for ${s.sector.toLowerCase()}.`,
      });
    }
  }

  if (insights.length < 2) {
    insights.push({
      title: "UK pipeline mix is balanced",
      body: "The UK Innovator Founder sample shows no single sector at threshold for automatic action.",
      bodyDetail: "Distribution across the four bands is consistent with a mature programme. Quarterly review is appropriate.",
      severity: "watch",
      affectedSector: "All sectors",
      evidenceCompanies: companies.slice(0, 3).map((c) => c.id),
      suggestedAction: "Maintain quarterly review cadence with endorsing bodies.",
    });
  }

  return insights.slice(0, 4);
}
