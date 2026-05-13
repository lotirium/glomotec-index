"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  AuditTrailProvider,
  useAuditTrail,
  type AuditEvidence,
  type AuditFocus,
  type PageAudit,
} from "@/components/atlas/audit-context";
import { cn } from "@/lib/utils";
import { AuditSidebar } from "@/components/atlas/audit-sidebar";
import { CollapsibleContext } from "@/components/atlas/collapsible-context";
import { TalentLeversPanel } from "@/components/atlas/talent-levers-panel";
import { TopOriginsList } from "@/components/atlas/top-origins-list";
import OriginMapStatic from "@/components/atlas/origin-map-static";
import {
  applyTalentLevers,
  useTalentLevers,
} from "@/lib/atlas/talent-lever-fixtures";
import { rubricGrade, RUBRIC_METHOD_LINE } from "@/components/atlas/audit-helpers";
import type { OriginMapResponse, OriginCountry } from "@/lib/atlas/types";
import {
  ORIGIN_HISTORY_FIXTURE_VERSION,
  ORIGIN_YEARS,
  TALENT_CATEGORY_COLOR,
  TALENT_CATEGORY_LABEL,
  TALENT_CATEGORY_ORDER,
  YEAR_CONTEXT,
  originResponseForYear,
  type MapLayer,
  type OriginYear,
} from "@/lib/atlas/origin-history";

// Leaflet must not run on the server (touches window on init).
const OriginMapLeaflet = dynamic(
  () => import("@/components/atlas/origin-map-leaflet"),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        aria-live="polite"
        className="flex h-[520px] w-full items-center justify-center rounded-md bg-glacier/40"
      >
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
          Loading map ...
        </p>
      </div>
    ),
  },
);

function useIsDesktop(query = "(min-width: 768px)"): boolean | null {
  const [isMatch, setIsMatch] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setIsMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return isMatch;
}

function buildCountryFocus(c: OriginCountry, evidence: AuditEvidence): AuditFocus {
  const sectorTop = Object.entries(c.sector_breakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([s, n]) => `${s} ${n}`)
    .join(" · ");
  return {
    id: `origin/${c.iso2}`,
    proposition: `${c.country_name} : ${c.band_a_count} Band A ${
      c.band_a_count === 1 ? "entity" : "entities"
    }, average composite ${c.avg_composite}${
      sectorTop ? `, ${sectorTop.toLowerCase()}` : ""
    }.`,
    evidence: [evidence],
    grade: rubricGrade(RUBRIC_METHOD_LINE),
  };
}

interface Props {
  data: OriginMapResponse;
  basePageAudit: Omit<PageAudit, "jurisdiction">;
  description: string;
}

export function OriginMapView({ data, basePageAudit, description }: Props) {
  const pageAudit: PageAudit = React.useMemo(
    () => ({
      ...basePageAudit,
      jurisdiction: "UAE · Origin map",
    }),
    [basePageAudit],
  );

  return (
    <AuditTrailProvider pageAudit={pageAudit}>
      <OriginMapBody data={data} description={description} />
    </AuditTrailProvider>
  );
}

function OriginMapBody({
  data: _data,
  description,
}: {
  data: OriginMapResponse;
  description: string;
}) {
  const [focusedIso2, setFocusedIso2] = React.useState<string | null>(null);
  const [year, setYear] = React.useState<OriginYear>(2025);
  const [layer, setLayer] = React.useState<MapLayer>("entities");
  const isDesktop = useIsDesktop();
  const { hover } = useAuditTrail();
  const talent = useTalentLevers();

  // Display data is year-keyed : the production fixture is only used as the
  // page-audit anchor (it represents "what the live system holds"). The map,
  // strip, top-origins list and takeaway all run off origin-history.ts so
  // 2000 to 2025 can be scrubbed independently.
  const displayData = React.useMemo(() => originResponseForYear(year), [year]);

  // Talent layer applies the per-demographic levers on top of the year-keyed
  // mix. Entities layer ignores the levers entirely so the panel can't
  // accidentally over-filter the marker pool when it isn't visible.
  const renderCountries = React.useMemo(
    () =>
      layer === "talent"
        ? applyTalentLevers(displayData.countries, talent.values)
        : displayData.countries,
    [layer, displayData.countries, talent.values],
  );

  const evidence: AuditEvidence = React.useMemo(
    () => ({
      authority: "Aggregate of four UAE free zone registers (sample)",
      dataset: `Band A origin distribution, ${year} snapshot (paraphrased)`,
      lastUpdated: ORIGIN_HISTORY_FIXTURE_VERSION,
      confidence: "medium",
      fixtureRef: "lib/atlas/origin-history.ts",
    }),
    [year],
  );

  const yearFocus: AuditFocus = React.useMemo(
    () => ({
      id: `origin-map/year-${year}`,
      proposition: `UAE Band A origin distribution in ${year}. ${YEAR_CONTEXT[year]}`,
      evidence: [evidence],
      grade: rubricGrade(
        "Historical snapshot at five-year interval. Per-country counts anchored to recorded free-zone register summaries.",
      ),
    }),
    [year, evidence],
  );

  // Keep the audit sidebar showing the year focus until a country focus
  // overrides it (mirrors the FlowView pattern).
  React.useEffect(() => {
    hover(yearFocus);
  }, [yearFocus, hover]);

  const handleMapHover = React.useCallback(
    (c: OriginCountry | null) => {
      if (c) hover(buildCountryFocus(c, evidence));
      else hover(null);
    },
    [hover, evidence],
  );

  const handleMapClick = React.useCallback(
    (c: OriginCountry) => setFocusedIso2(c.iso2),
    [],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_19rem] lg:gap-10">
      <div className="min-w-0 space-y-10">
        <CollapsibleContext label="Why this map">
          <p>{description}</p>
        </CollapsibleContext>
        <StatsStrip data={displayData} />

        <section aria-labelledby="origin-map-heading" className="space-y-5">
          <header className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Geographic
              </p>
              <h2
                id="origin-map-heading"
                className="mt-1 text-h2 font-bold tracking-tight text-ink"
              >
                Where UAE Band A talent comes from.
              </h2>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint tabular">
              Snapshot · {year}
            </p>
          </header>

          <YearSelector year={year} setYear={setYear} yearFocus={yearFocus} />
          <LayerSelector layer={layer} setLayer={setLayer} />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
            <div className="min-w-0">
              {isDesktop === null ? (
                <div
                  aria-hidden
                  className="h-[520px] w-full rounded-md bg-glacier/40"
                />
              ) : isDesktop ? (
                <div
                  key={`map-${year}-${layer}`}
                  className="origin-map-fade"
                >
                  <OriginMapLeaflet
                    countries={renderCountries}
                    layer={layer}
                    focusedIso2={focusedIso2}
                    onCountryHover={handleMapHover}
                    onCountryClick={handleMapClick}
                  />
                </div>
              ) : (
                <OriginMapStatic countries={renderCountries} />
              )}
              {layer === "talent" && <TalentLegend />}
            </div>
            <TopOriginsList
              countries={renderCountries}
              evidence={evidence}
              focusedIso2={focusedIso2}
              onSelect={(iso2) => setFocusedIso2(iso2)}
              layer={layer}
            />
          </div>
        </section>

        {layer === "talent" && (
          <TalentLeversPanel state={talent} evidence={evidence} />
        )}

        <TakeawayBanner data={displayData} />
      </div>

      <AuditSidebar />
      <style>{`
        .origin-map-fade { animation: origin-map-fade-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1); }
        @keyframes origin-map-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function LayerSelector({
  layer,
  setLayer,
}: {
  layer: MapLayer;
  setLayer: (l: MapLayer) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
        Layer
      </p>
      <div
        role="tablist"
        aria-label="Map layer"
        className="inline-flex rounded-full border border-line bg-surface-soft p-1"
      >
        {(
          [
            { id: "entities", label: "Entities view" },
            { id: "talent", label: "Talent view" },
          ] as const
        ).map((opt) => {
          const active = layer === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setLayer(opt.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors",
                active
                  ? "bg-accent text-surface"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TalentLegend() {
  return (
    <div className="mt-3 rounded-md border border-line bg-surface-soft/40 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Talent categories
      </p>
      <ul className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
        {TALENT_CATEGORY_ORDER.map((cat) => (
          <li key={cat} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: TALENT_CATEGORY_COLOR[cat] }}
            />
            <span className="text-[11px] text-ink">
              {TALENT_CATEGORY_LABEL[cat]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function YearSelector({
  year,
  setYear,
  yearFocus,
}: {
  year: OriginYear;
  setYear: (y: OriginYear) => void;
  yearFocus: AuditFocus;
}) {
  const { hover } = useAuditTrail();
  return (
    <section
      aria-label="Year selector for the origin map"
      className="rounded-md border border-line bg-surface px-4 py-3 md:px-5 md:py-4"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
          Year
        </p>
        <div
          role="tablist"
          aria-label="Snapshot year"
          className="flex flex-wrap items-center gap-1.5"
        >
          {ORIGIN_YEARS.map((y) => {
            const active = y === year;
            return (
              <button
                key={y}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setYear(y)}
                onMouseEnter={() => hover(yearFocus)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] tabular transition-colors",
                  active
                    ? "border-accent bg-accent text-surface"
                    : "border-line bg-surface-soft text-ink-muted hover:border-cyan/40 hover:text-ink",
                )}
              >
                {y}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
        What drove the shift to {year} : {YEAR_CONTEXT[year]}
      </p>
    </section>
  );
}

function StatsStrip({ data }: { data: OriginMapResponse }) {
  return (
    <section
      aria-labelledby="origin-stats-heading"
      className="sticky top-16 z-10 -mx-3 rounded-md border border-line bg-surface/95 px-3 py-3 backdrop-blur md:top-20 md:px-5"
    >
      <h2 id="origin-stats-heading" className="sr-only">
        Origin map stats
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Band A total" value={data.total_band_a.toString()} />
        <Stat
          label="Origin countries"
          value={data.total_origin_countries.toString()}
        />
        <Stat label="Outside GCC" value={`${data.non_gcc_pct}%`} accent />
        <Stat label="Last refresh" value={data.last_refresh || "—"} mono />
      </ul>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <li className="rounded-sm border border-line/60 bg-surface px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </p>
      <p
        className={
          accent
            ? "mt-1 text-xl font-bold tabular text-cyan"
            : mono
              ? "mt-1 font-mono text-sm tabular text-ink"
              : "mt-1 text-xl font-bold tabular text-ink"
        }
      >
        {value}
      </p>
    </li>
  );
}

function TakeawayBanner({ data }: { data: OriginMapResponse }) {
  const populated = data.countries.filter((c) => c.band_a_count > 0);
  const top3 = populated.slice(0, 3);
  const top3Sum = top3.reduce((s, c) => s + c.band_a_count, 0);
  const top3Pct = data.total_band_a
    ? Math.round((top3Sum / data.total_band_a) * 100)
    : 0;
  const top3Names =
    top3.length === 3
      ? `${top3[0].country_name}, ${top3[1].country_name}, and ${top3[2].country_name}`
      : top3.map((c) => c.country_name).join(", ");

  let body: React.ReactNode;
  if (!populated.length) {
    body = "No Band A activity recorded in the current sample.";
  } else if (data.non_gcc_pct === 100) {
    body = (
      <>
        Every Band A entity in the sample originates from{" "}
        <strong>outside the GCC</strong>.{" "}
        {top3.length === 3 && (
          <>
            <strong>{top3Names}</strong> together account for{" "}
            <strong>{top3Pct}%</strong> : a single talent corridor that an
            authority-level intervention can plausibly influence.
          </>
        )}
      </>
    );
  } else {
    body = (
      <>
        <strong>{data.non_gcc_pct}%</strong> of UAE Band A activity originates
        from outside the GCC.{" "}
        {top3.length === 3 && (
          <>
            <strong>{top3Names}</strong> together account for{" "}
            <strong>{top3Pct}%</strong> : a single talent corridor that an
            authority-level intervention can plausibly influence.
          </>
        )}
      </>
    );
  }

  return (
    <div className="overflow-hidden rounded-md bg-gradient-to-br from-accent to-accent-deep px-5 py-5 md:px-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
        Takeaway
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-surface">
        {body}
      </p>
    </div>
  );
}
