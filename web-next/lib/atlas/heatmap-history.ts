// Historical sector × zone Band A snapshots for the V03 heat map.
// Five snapshots at irregular intervals tracing the JAFZA technology drift :
// JAFZA held a measurable AI / Fintech presence in 2010 and 2015; by 2023
// the row had gone to zero and remains empty in 2026. The Economic
// Substance rubric exists to flag exactly this kind of drift.

import type { FreeZone, HeatmapCell } from "@/lib/atlas/types";

export type HeatmapYear = 2010 | 2015 | 2020 | 2023 | 2026;
export const HEATMAP_YEARS: HeatmapYear[] = [2010, 2015, 2020, 2023, 2026];

const ZONES: FreeZone[] = ["DMCC", "DIFC", "ADGM", "JAFZA"];
const SECTORS = [
  "AI",
  "Fintech",
  "Financial Services",
  "Family Office",
  "Logistics",
  "Manufacturing",
  "Commodities",
  "Healthcare",
] as const;

// Per-year Band A count matrix, shape [zone][sector].
// DMCC AI rises 2 → 12 ; DIFC Fintech rises 3 → 15 ; ADGM Family Office
// rises 4 → 11 ; JAFZA holds Logistics / Commodities but loses AI / Fintech.
const BAND_A_BY_YEAR: Record<HeatmapYear, number[][]> = {
  2010: [
    // DMCC : AI, Fintech, FinSvc, FamOff, Log, Mfg, Comm, Health
    [2, 1, 2, 2, 1, 1, 4, 1],
    // DIFC
    [1, 3, 5, 3, 0, 0, 1, 1],
    // ADGM
    [1, 2, 4, 4, 0, 0, 1, 1],
    // JAFZA  ← 3 AI seats, 2 Fintech seats here
    [3, 2, 1, 0, 5, 3, 4, 1],
  ],
  2015: [
    [4, 2, 2, 3, 1, 1, 5, 2],
    [2, 6, 7, 4, 0, 0, 1, 1],
    [1, 3, 6, 6, 0, 0, 1, 2],
    [2, 1, 1, 0, 6, 3, 4, 1],
  ],
  2020: [
    [6, 3, 2, 3, 1, 1, 5, 2],
    [3, 9, 8, 5, 0, 0, 1, 2],
    [2, 4, 7, 8, 0, 0, 1, 3],
    [1, 0, 1, 0, 7, 3, 5, 1],
  ],
  2023: [
    [9, 5, 2, 4, 1, 1, 5, 3],
    [4, 12, 9, 6, 0, 0, 1, 3],
    [3, 5, 8, 10, 0, 0, 1, 4],
    [0, 0, 1, 0, 8, 3, 5, 1], // JAFZA AI / Fintech now zero
  ],
  2026: [
    [12, 6, 2, 4, 1, 1, 5, 3],
    [5, 15, 10, 6, 0, 0, 1, 4],
    [3, 6, 9, 11, 0, 0, 1, 5],
    [0, 0, 1, 0, 8, 3, 5, 1], // JAFZA AI / Fintech still zero in 2026
  ],
};

// Zone reputation baseline for avg composite. DIFC is the financial regulator
// hub, ADGM has the strongest family office track, DMCC has been investing
// in AI, JAFZA's substance pipeline runs lower-composite.
const ZONE_COMPOSITE_BASE: Record<FreeZone, number> = {
  DMCC: 82,
  DIFC: 84,
  ADGM: 83,
  JAFZA: 78,
};

function buildCell(
  zone: FreeZone,
  sector: string,
  bandA: number,
  i: number,
): HeatmapCell {
  // totalEntities ≈ bandA scaled by sector vibrancy + a deterministic
  // offset so the legend totals don't look templated.
  const totalEntities =
    bandA === 0 ? Math.max(0, ((i * 3) % 5) - 2) : bandA * 2 + 4 + (i % 5);
  // Avg composite : zone base, lifted slightly when the cell is dense, and
  // pulled down a touch where bandA is sparse.
  const composite = bandA === 0
    ? 0
    : Math.round(
        ZONE_COMPOSITE_BASE[zone] +
          Math.min(4, bandA / 3) -
          (totalEntities > bandA * 3 ? 2 : 0),
      );
  return {
    zone,
    sector,
    bandACount: bandA,
    totalEntities,
    avgComposite: composite,
  };
}

const _cache = new Map<HeatmapYear, HeatmapCell[][]>();

export function heatmapForYear(year: HeatmapYear): HeatmapCell[][] {
  const cached = _cache.get(year);
  if (cached) return cached;
  const matrix = BAND_A_BY_YEAR[year];
  const rows = matrix.map((zoneRow, zi) =>
    zoneRow.map((bandA, si) =>
      buildCell(ZONES[zi], SECTORS[si], bandA, zi * SECTORS.length + si),
    ),
  );
  _cache.set(year, rows);
  return rows;
}

export const YEAR_NARRATIVE: Record<HeatmapYear, string> = {
  2010:
    "Multi-sector resilience across all four zones, including JAFZA technology presence.",
  2015:
    "DIFC fintech firms up; JAFZA still holds AI and Fintech seats but is starting to thin.",
  2020:
    "Pandemic year. DIFC fintech and ADGM family office accelerate; JAFZA loses its Fintech seats.",
  2023:
    "Concentration tightening. JAFZA's AI row hits zero. Economic Substance pressure now visible.",
  2026:
    "Concentration in DIFC fintech and DMCC AI. JAFZA technology row now empty.",
};

export const HEATMAP_HISTORY_FIXTURE_VERSION =
  "heatmap-history.ts @ 2026-05-13";
