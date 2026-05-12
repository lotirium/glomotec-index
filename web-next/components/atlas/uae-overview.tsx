"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AuditTrailProvider, type PageAudit } from "@/components/atlas/audit-context";
import { AuditSidebar } from "@/components/atlas/audit-sidebar";
import { TodayVsAtlas } from "@/components/atlas/today-vs-atlas";
import { SectorGrid } from "@/components/atlas/sector-grid";
import { SectorHeatmap } from "@/components/atlas/sector-heatmap";
import { TopBandA } from "@/components/atlas/top-band-a";
import { InsightsPanel } from "@/components/atlas/insights-panel";
import { StatStrip } from "@/components/atlas/stat-strip";
import type {
  AtlasCompany,
  FreeZone,
  HeatmapCell,
  PolicyInsight,
  SectorSummary,
} from "@/lib/atlas/types";
import type { AtlasOverviewStats, ZoneSummary } from "@/lib/atlas/data";

const ZONES: FreeZone[] = ["DMCC", "DIFC", "ADGM", "JAFZA"];

export interface ZoneDetailBundle {
  summary: ZoneSummary;
  sectors: SectorSummary[];
  insights: PolicyInsight[];
  topBandA: AtlasCompany[];
}

interface Props {
  bundles: Record<FreeZone, ZoneDetailBundle>;
  stats: AtlasOverviewStats;
  heatmap: HeatmapCell[][];
  basePageAudit: Omit<PageAudit, "jurisdiction">;
}

export function UaeOverview({ bundles, stats, heatmap, basePageAudit }: Props) {
  const [selected, setSelected] = React.useState<FreeZone>("DMCC");
  const zones = ZONES.map((z) => bundles[z].summary);
  const current = bundles[selected];

  const pageAudit: PageAudit = React.useMemo(
    () => ({
      ...basePageAudit,
      jurisdiction: `UAE · ${selected} selected`,
    }),
    [basePageAudit, selected],
  );

  return (
    <AuditTrailProvider pageAudit={pageAudit}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_19rem] lg:gap-10">
        <div className="min-w-0 space-y-16">
          {/* STAT STRIP */}
          <section aria-labelledby="stat-heading">
            <h2 id="stat-heading" className="sr-only">
              Overview stats
            </h2>
            <StatStrip stats={stats} zones={zones} />
          </section>

          {/* COMPARISON */}
          <section aria-labelledby="comparison-heading" className="space-y-5">
            <header className="flex items-baseline justify-between">
              <div>
                <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                  Side by side
                </p>
                <h2
                  id="comparison-heading"
                  className="mt-1 text-h2 font-bold tracking-tight text-ink"
                >
                  Today vs ATLAS.
                </h2>
              </div>
            </header>
            <TodayVsAtlas zones={zones} />
          </section>

          {/* SECTOR CONCENTRATION HEAT MAP */}
          <section aria-labelledby="heatmap-heading" className="space-y-5">
            <header>
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Sector concentration
              </p>
              <h2
                id="heatmap-heading"
                className="mt-1 text-h2 font-bold tracking-tight text-ink"
              >
                Where Band A activity clusters.
              </h2>
              <p className="mt-2 max-w-2xl text-2xs text-ink-muted leading-relaxed">
                Same engine, same rubric, plotted by zone × sector. The empty
                cells matter as much as the full ones.
              </p>
            </header>
            <SectorHeatmap cells={heatmap} zoneSummaries={zones} />
          </section>

          {/* ZONE SELECTOR */}
          <section aria-labelledby="zone-heading" className="space-y-5">
            <header className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                  Free zone deep dive
                </p>
                <h2
                  id="zone-heading"
                  className="mt-1 text-h2 font-bold tracking-tight text-ink"
                >
                  Zone view : {selected}.
                </h2>
              </div>
              <div
                role="tablist"
                aria-label="Free zone selector"
                className="inline-flex rounded-full border border-line bg-surface p-1"
              >
                {ZONES.map((z) => {
                  const active = z === selected;
                  return (
                    <button
                      key={z}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSelected(z)}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors",
                        active
                          ? "bg-accent text-surface"
                          : "text-ink-muted hover:text-ink",
                      )}
                    >
                      {z}
                    </button>
                  );
                })}
              </div>
            </header>

            <div className="space-y-3">
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Sector breakdown
              </p>
              <SectorGrid zone={current.summary} sectors={current.sectors} />
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.4fr_1fr]">
              <div className="space-y-3">
                <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                  Top 10 Band A entities
                </p>
                <TopBandA zone={current.summary} companies={current.topBandA} />
              </div>
              <div className="space-y-3">
                <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                  Policy insights
                </p>
                <InsightsPanel zone={current.summary} insights={current.insights} />
              </div>
            </div>
          </section>
        </div>

        <AuditSidebar />
      </div>
    </AuditTrailProvider>
  );
}
