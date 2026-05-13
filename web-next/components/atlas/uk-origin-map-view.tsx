"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import {
  AuditTrailProvider,
  useAuditTrail,
  type AuditEvidence,
  type AuditFocus,
  type PageAudit,
} from "@/components/atlas/audit-context";
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
import { COUNTRY_TABLE } from "@/lib/atlas/country-centroids";
import {
  TALENT_CATEGORY_COLOR,
  TALENT_CATEGORY_LABEL,
  TALENT_CATEGORY_ORDER,
  type MapLayer,
} from "@/lib/atlas/origin-history";
import {
  UK_FLOW_YEARS,
  UK_FLOW_YEAR_CONTEXT,
  totalsForYear,
  ukFlowResponseFor,
  type UkFlowDirection,
  type UkFlowYear,
} from "@/lib/atlas/uk-flows";
import type { OriginCountry, OriginMapResponse } from "@/lib/atlas/types";

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

const UK_CENTROID: [number, number] =
  COUNTRY_TABLE.GB?.centroid ?? [54.7024, -3.2766];

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

interface Props {
  basePageAudit: Omit<PageAudit, "jurisdiction">;
  description: string;
}

export function UkOriginMapView({ basePageAudit, description }: Props) {
  const pageAudit: PageAudit = React.useMemo(
    () => ({ ...basePageAudit, jurisdiction: "United Kingdom · flows" }),
    [basePageAudit],
  );
  return (
    <AuditTrailProvider pageAudit={pageAudit}>
      <UkOriginMapBody description={description} />
    </AuditTrailProvider>
  );
}

function UkOriginMapBody({ description }: { description: string }) {
  const [focusedIso2, setFocusedIso2] = React.useState<string | null>(null);
  const [year, setYear] = React.useState<UkFlowYear>(2025);
  const [direction, setDirection] = React.useState<UkFlowDirection>("inbound");
  const [layer, setLayer] = React.useState<MapLayer>("entities");
  const isDesktop = useIsDesktop();
  const { hover } = useAuditTrail();
  const talent = useTalentLevers();

  const data = React.useMemo(
    () => ukFlowResponseFor(year, direction),
    [year, direction],
  );
  const totals = React.useMemo(() => totalsForYear(year), [year]);
  const renderCountries = React.useMemo(
    () =>
      layer === "talent"
        ? applyTalentLevers(data.countries, talent.values)
        : data.countries,
    [layer, data.countries, talent.values],
  );

  const evidence: AuditEvidence = React.useMemo(
    () => ({
      authority: "UK Home Office aggregates · ONS / HMRC paraphrased",
      dataset: `UK ${direction} Band A flow, ${year} snapshot`,
      lastUpdated: "uk-flows.ts @ 2026-05-13",
      confidence: "medium",
      fixtureRef: "lib/atlas/uk-flows.ts",
    }),
    [year, direction],
  );

  const yearFocus: AuditFocus = React.useMemo(
    () => ({
      id: `uk-origin-map/${direction}/${year}`,
      proposition: `UK ${direction === "inbound" ? "Band A inbound" : "Band A outbound"} flows in ${year}. ${UK_FLOW_YEAR_CONTEXT[year]}`,
      evidence: [evidence],
      grade: rubricGrade(
        "Historical UK flow snapshot at decade-style intervals. Counts paraphrased from ONS / HMRC published series.",
      ),
    }),
    [year, direction, evidence],
  );

  React.useEffect(() => {
    hover(yearFocus);
  }, [yearFocus, hover]);

  const handleMapHover = React.useCallback(
    (c: OriginCountry | null) => {
      if (c) {
        hover({
          id: `uk-origin-map/${direction}/${c.iso2}`,
          proposition: `${c.country_name} : ${c.band_a_count} ${direction === "inbound" ? "inbound" : "outbound"} Band A in ${year}.`,
          evidence: [evidence],
          grade: rubricGrade(RUBRIC_METHOD_LINE),
        });
      } else {
        hover(yearFocus);
      }
    },
    [hover, evidence, year, direction, yearFocus],
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
        <UkStatsStrip totals={totals} year={year} />

        <section aria-labelledby="uk-origin-map-heading" className="space-y-5">
          <header className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Geographic · {direction === "inbound" ? "inbound" : "outbound"}
              </p>
              <h2
                id="uk-origin-map-heading"
                className="mt-1 text-h2 font-bold tracking-tight text-ink"
              >
                Where UK gained and lost talent.
              </h2>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint tabular">
              Snapshot · {year}
            </p>
          </header>

          <DirectionSelector direction={direction} setDirection={setDirection} />
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
                <div key={`uk-map-${year}-${direction}-${layer}`} className="uk-origin-fade">
                  <OriginMapLeaflet
                    countries={renderCountries}
                    layer={layer}
                    focusedIso2={focusedIso2}
                    onCountryHover={handleMapHover}
                    onCountryClick={handleMapClick}
                    centerCentroid={UK_CENTROID}
                    centerLabel="UK"
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

        <UkTakeawayBanner data={data} year={year} direction={direction} totals={totals} />
      </div>

      <AuditSidebar />
      <style>{`
        .uk-origin-fade { animation: uk-origin-fade-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1); }
        @keyframes uk-origin-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function UkStatsStrip({
  totals,
  year,
}: {
  totals: { inbound: number; outbound: number; net: number };
  year: UkFlowYear;
}) {
  return (
    <section
      aria-labelledby="uk-flow-stats-heading"
      className="sticky top-16 z-10 -mx-3 rounded-md border border-line bg-surface/95 px-3 py-3 backdrop-blur md:top-20 md:px-5"
    >
      <h2 id="uk-flow-stats-heading" className="sr-only">
        UK flow stats
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Band A inbound total" value={totals.inbound.toString()} />
        <Stat label="Band A outbound total" value={totals.outbound.toString()} />
        <Stat
          label="Net balance"
          value={`${totals.net >= 0 ? "+" : ""}${totals.net}`}
          accent={totals.net >= 0}
          slate={totals.net < 0}
        />
        <Stat label="Last refresh" value={`${year}-12-31`} mono />
      </ul>
    </section>
  );
}

function Stat({
  label,
  value,
  accent = false,
  slate = false,
  mono = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  slate?: boolean;
  mono?: boolean;
}) {
  return (
    <li className="rounded-sm border border-line/60 bg-surface px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-bold tabular",
          accent && "text-cyan",
          slate && "text-slate",
          !accent && !slate && (mono ? "font-mono text-sm text-ink" : "text-ink"),
        )}
      >
        {value}
      </p>
    </li>
  );
}

function DirectionSelector({
  direction,
  setDirection,
}: {
  direction: UkFlowDirection;
  setDirection: (d: UkFlowDirection) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
        Direction
      </p>
      <div
        role="tablist"
        aria-label="Flow direction"
        className="inline-flex rounded-full border border-line bg-surface-soft p-1"
      >
        {(
          [
            { id: "inbound" as const, label: "Inbound (where UK gains talent)" },
            { id: "outbound" as const, label: "Outbound (where UK loses talent)" },
          ]
        ).map((opt) => {
          const active = direction === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setDirection(opt.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors",
                active ? "bg-accent text-surface" : "text-ink-muted hover:text-ink",
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

function YearSelector({
  year,
  setYear,
  yearFocus,
}: {
  year: UkFlowYear;
  setYear: (y: UkFlowYear) => void;
  yearFocus: AuditFocus;
}) {
  const { hover } = useAuditTrail();
  return (
    <section
      aria-label="Year selector for the UK origin map"
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
          {UK_FLOW_YEARS.map((y) => {
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
        What drove the shift to {year} : {UK_FLOW_YEAR_CONTEXT[year]}
      </p>
    </section>
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
            { id: "entities" as const, label: "Entities view" },
            { id: "talent" as const, label: "Talent view" },
          ]
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
                active ? "bg-accent text-surface" : "text-ink-muted hover:text-ink",
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

function UkTakeawayBanner({
  data,
  year,
  direction,
  totals,
}: {
  data: OriginMapResponse;
  year: UkFlowYear;
  direction: UkFlowDirection;
  totals: { inbound: number; outbound: number; net: number };
}) {
  const top = data.countries.slice(0, 3);
  const topNames =
    top.length === 0
      ? "no recorded flow"
      : top.map((c) => `${c.country_name} (${c.band_a_count})`).join(", ");
  const netDirection = totals.net >= 0 ? "net gain" : "net loss";
  return (
    <div className="overflow-hidden rounded-md bg-gradient-to-br from-accent to-accent-deep px-5 py-5 md:px-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
        Takeaway
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-surface">
        In {year}, UK ran a <strong>{netDirection} of {Math.abs(totals.net)}</strong> Band A entities ({totals.inbound} inbound · {totals.outbound} outbound). Largest {direction === "inbound" ? "origins" : "destinations"} : <strong>{topNames}</strong>.
      </p>
    </div>
  );
}
