"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AuditAnchor } from "@/components/atlas/audit-anchor";
import { rubricGrade, zoneEvidence } from "@/components/atlas/audit-helpers";
import type { HeatmapCell, HeatmapMetric } from "@/lib/atlas/types";
import type { ZoneSummary } from "@/lib/atlas/data";

const ZONES = ["DMCC", "DIFC", "ADGM", "JAFZA"] as const;
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

const METRIC_LABELS: Record<HeatmapMetric, string> = {
  bandADensity: "Band A density",
  avgComposite: "Avg composite",
  totalEntities: "Total entities",
};

const LEGEND_ENDS: Record<HeatmapMetric, [string, string]> = {
  bandADensity: ["Sparse", "Dense"],
  avgComposite: ["Low avg score", "High avg score"],
  totalEntities: ["Few entities", "Many entities"],
};

const CELL_UNIT: Record<HeatmapMetric, string> = {
  bandADensity: "Band A",
  avgComposite: "Avg",
  totalEntities: "Entities",
};

// Five-stop sequential palette: cloud-grey → ice-blue → frost → cyan → navy.
// Cloud-grey, frost, cyan, and navy match the brand variables in
// app/globals.css; the second stop is the source addendum's intermediate
// tint (#E8F4FA), kept here as a single source of truth so the JS
// interpolation and the legend bar gradient stay in lockstep.
const GRADIENT_STOPS: [number, number, number][] = [
  [245, 247, 250],
  [232, 244, 250],
  [184, 212, 227],
  [0, 162, 233],
  [43, 62, 143],
];

const LEGEND_BG = `linear-gradient(90deg, rgb(${GRADIENT_STOPS[0].join(",")}) 0%, rgb(${GRADIENT_STOPS[1].join(",")}) 25%, rgb(${GRADIENT_STOPS[2].join(",")}) 50%, rgb(${GRADIENT_STOPS[3].join(",")}) 75%, rgb(${GRADIENT_STOPS[4].join(",")}) 100%)`;

function colorAt(t: number): string {
  if (t <= 0) return `rgb(${GRADIENT_STOPS[0].join(",")})`;
  if (t >= 1) return `rgb(${GRADIENT_STOPS[GRADIENT_STOPS.length - 1].join(",")})`;
  const seg = t * (GRADIENT_STOPS.length - 1);
  const i = Math.floor(seg);
  const lt = seg - i;
  const a = GRADIENT_STOPS[i];
  const b = GRADIENT_STOPS[Math.min(i + 1, GRADIENT_STOPS.length - 1)];
  const mixed = a.map((v, k) => Math.round(v + (b[k] - v) * lt));
  return `rgb(${mixed.join(",")})`;
}

function valueForMetric(c: HeatmapCell, metric: HeatmapMetric): number {
  if (metric === "bandADensity") return c.bandACount;
  if (metric === "totalEntities") return c.totalEntities;
  return c.avgComposite;
}

function computeTakeaway(metric: HeatmapMetric, cells: HeatmapCell[][]): string {
  const flat = cells.flat();
  if (!flat.length) return "No cells in scope.";

  if (metric === "bandADensity") {
    const totalA = flat.reduce((s, c) => s + c.bandACount, 0);
    const top = [...flat].sort((a, b) => b.bandACount - a.bandACount)[0];
    const pct = totalA && top.bandACount > 0
      ? Math.round((top.bandACount / totalA) * 100)
      : 0;
    const jafzaFin = flat
      .filter(
        (c) =>
          c.zone === "JAFZA" &&
          (c.sector === "Fintech" ||
            c.sector === "Financial Services" ||
            c.sector === "Family Office"),
      )
      .reduce((s, c) => s + c.bandACount, 0);
    const jafzaClause = jafzaFin === 0
      ? "JAFZA shows zero Band A in financial sectors"
      : `JAFZA carries only ${jafzaFin} Band A entities in financial sectors`;
    if (top.bandACount === 0) {
      return "No Band A activity in this sample. The multi-rubric architecture surfaces this kind of gap, which a single-pillar lens cannot.";
    }
    return `${top.sector} concentrates ${pct}% of Band A activity across ${top.zone}. ${jafzaClause} : the multi-rubric architecture surfaces this gap that single-pillar scoring cannot.`;
  }

  if (metric === "avgComposite") {
    const meaningful = flat.filter((c) => c.totalEntities >= 2);
    if (!meaningful.length) {
      return "Avg composite is only meaningful where a cell holds at least two entities.";
    }
    const top = [...meaningful].sort((a, b) => b.avgComposite - a.avgComposite)[0];
    return `${top.zone} ${top.sector} averages ${top.avgComposite}/100, the highest average composite of any zone × sector cell.`;
  }

  const top = [...flat].sort((a, b) => b.totalEntities - a.totalEntities)[0];
  if (top.totalEntities === 0) {
    return "No entities mapped into this 8-sector lens in the current sample.";
  }
  return `${top.zone} ${top.sector} holds ${top.totalEntities} entities, the largest single-cell concentration.`;
}

interface Props {
  cells: HeatmapCell[][];
  zoneSummaries: ZoneSummary[];
}

export function SectorHeatmap({ cells, zoneSummaries }: Props) {
  const [metric, setMetric] = React.useState<HeatmapMetric>("bandADensity");

  const flat = cells.flat();
  const max = Math.max(1, ...flat.map((c) => valueForMetric(c, metric)));
  const takeaway = computeTakeaway(metric, cells);

  const evidenceByZone = React.useMemo(() => {
    const out: Record<string, ReturnType<typeof zoneEvidence>> = {};
    for (const z of zoneSummaries) {
      if (z.zone !== "UK") out[z.zone] = zoneEvidence(z);
    }
    return out;
  }, [zoneSummaries]);

  return (
    <div className="rounded-md border border-line bg-surface p-5 md:p-8">
      {/* TOGGLE */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Metric
        </p>
        <div
          role="tablist"
          aria-label="Heat map metric"
          className="inline-flex rounded-full border border-line bg-surface-soft p-1"
        >
          {(Object.keys(METRIC_LABELS) as HeatmapMetric[]).map((m) => {
            const active = metric === m;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMetric(m)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors",
                  active
                    ? "bg-accent text-surface"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {METRIC_LABELS[m]}
              </button>
            );
          })}
        </div>
      </div>

      {/* DESKTOP GRID — 9-col layout (zone label + 8 sectors). */}
      <div className="mt-6 hidden md:grid md:grid-cols-[112px_repeat(8,minmax(0,1fr))] md:gap-1.5">
        <div aria-hidden />
        {SECTORS.map((s) => (
          <div
            key={s}
            className="flex items-end rounded-sm bg-surface-soft px-2 py-2"
          >
            <p className="text-[10px] font-semibold text-ink leading-tight">
              {s}
            </p>
          </div>
        ))}

        {ZONES.map((zone, zi) => (
          <React.Fragment key={zone}>
            <div className="flex items-center rounded-sm bg-glacier/40 px-3 py-3">
              <p className="font-mono text-2xs font-semibold uppercase tracking-[0.18em] text-accent">
                {zone}
              </p>
            </div>
            {SECTORS.map((sector, si) => {
              const cell = cells[zi]?.[si];
              if (!cell) return <div key={`${zone}-${sector}`} aria-hidden />;
              const v = valueForMetric(cell, metric);
              const t = max > 0 ? Math.min(1, v / max) : 0;
              const evidence = evidenceByZone[zone];
              return (
                <AuditAnchor
                  key={`${zone}-${sector}`}
                  as="div"
                  className="block"
                  anchor={{
                    id: `heatmap/${zone}/${sector}`,
                    proposition: `${zone} × ${sector} : ${cell.bandACount} Band A entities across ${cell.totalEntities} total, average composite ${cell.avgComposite}.`,
                    evidence: evidence ? [evidence] : [],
                    grade: rubricGrade(
                      `Cell value (${METRIC_LABELS[metric].toLowerCase()}) aggregated from the ${zone} fixture.`,
                    ),
                  }}
                >
                  <div
                    className="flex h-full min-h-[78px] flex-col items-center justify-center rounded-sm transition-transform hover:scale-[1.03]"
                    style={{
                      background: colorAt(t),
                      color: t > 0.5 ? "white" : "hsl(var(--ink))",
                    }}
                  >
                    <p className="text-lg font-bold tabular leading-none">
                      {v}
                    </p>
                    <p className="mt-1 text-[9px] font-mono uppercase tracking-[0.18em] opacity-80">
                      {CELL_UNIT[metric]}
                    </p>
                  </div>
                </AuditAnchor>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* MOBILE STACK — one zone per row, horizontally scrollable cells. */}
      <div className="mt-6 space-y-5 md:hidden">
        {ZONES.map((zone, zi) => (
          <div key={zone}>
            <p className="mb-2 font-mono text-2xs font-semibold uppercase tracking-[0.18em] text-accent">
              {zone}
            </p>
            <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2">
              {SECTORS.map((sector, si) => {
                const cell = cells[zi]?.[si];
                if (!cell) return null;
                const v = valueForMetric(cell, metric);
                const t = max > 0 ? Math.min(1, v / max) : 0;
                const evidence = evidenceByZone[zone];
                return (
                  <AuditAnchor
                    key={`${zone}-${sector}-m`}
                    as="div"
                    className="block min-w-[112px] shrink-0 snap-start"
                    anchor={{
                      id: `heatmap/${zone}/${sector}`,
                      proposition: `${zone} × ${sector} : ${cell.bandACount} Band A entities across ${cell.totalEntities} total, average composite ${cell.avgComposite}.`,
                      evidence: evidence ? [evidence] : [],
                      grade: rubricGrade(
                        `Cell value (${METRIC_LABELS[metric].toLowerCase()}) aggregated from the ${zone} fixture.`,
                      ),
                    }}
                  >
                    <div
                      className="rounded-sm px-3 py-3"
                      style={{
                        background: colorAt(t),
                        color: t > 0.5 ? "white" : "hsl(var(--ink))",
                      }}
                    >
                      <p className="text-[10px] font-medium opacity-90 leading-tight">
                        {sector}
                      </p>
                      <p className="mt-1.5 text-base font-bold tabular leading-none">
                        {v}
                      </p>
                      <p className="mt-1 text-[9px] font-mono uppercase tracking-[0.18em] opacity-75">
                        {CELL_UNIT[metric]}
                      </p>
                    </div>
                  </AuditAnchor>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* LEGEND */}
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Intensity
        </span>
        <div className="flex items-center gap-3">
          <span className="text-2xs text-ink-muted">
            {LEGEND_ENDS[metric][0]}
          </span>
          <div
            aria-hidden
            className="h-2.5 w-32 rounded-full sm:w-44"
            style={{ background: LEGEND_BG }}
          />
          <span className="text-2xs text-ink-muted">
            {LEGEND_ENDS[metric][1]}
          </span>
        </div>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint tabular">
          Max {max}
        </span>
      </div>

      {/* TAKEAWAY BANNER */}
      <div className="mt-6 overflow-hidden rounded-md bg-gradient-to-br from-accent to-accent-deep px-5 py-5 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
          Takeaway
        </p>
        <p className="mt-2 text-sm font-medium leading-relaxed text-surface">
          {takeaway}
        </p>
      </div>
    </div>
  );
}
