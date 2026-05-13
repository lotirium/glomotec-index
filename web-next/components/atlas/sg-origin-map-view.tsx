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
  SG_FLOW_YEAR_CONTEXT,
  SG_FLOW_YEAR_TAKEAWAY,
  SG_FLOW_YEARS,
  SG_HISTORY_FIXTURE_VERSION,
  SG_POLICY_EVENTS,
  activeSgLeversAt,
  sgOriginResponseFor,
  sgTotalsForYear,
  type SgFlowYear,
} from "@/lib/atlas/sg-origin-history";
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

const SG_CENTROID: [number, number] =
  COUNTRY_TABLE.SG?.centroid ?? [1.3521, 103.8198];

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

export function SgOriginMapView({ basePageAudit, description }: Props) {
  const pageAudit: PageAudit = React.useMemo(
    () => ({ ...basePageAudit, jurisdiction: "Singapore · inbound" }),
    [basePageAudit],
  );
  return (
    <AuditTrailProvider pageAudit={pageAudit}>
      <SgOriginMapBody description={description} />
    </AuditTrailProvider>
  );
}

function SgOriginMapBody({ description }: { description: string }) {
  const [focusedIso2, setFocusedIso2] = React.useState<string | null>(null);
  const [year, setYear] = React.useState<SgFlowYear>(2025);
  const [layer, setLayer] = React.useState<MapLayer>("entities");
  const isDesktop = useIsDesktop();
  const { hover } = useAuditTrail();
  const talent = useTalentLevers();

  const data = React.useMemo(() => sgOriginResponseFor(year), [year]);
  const totals = React.useMemo(() => sgTotalsForYear(year), [year]);
  const activeLevers = React.useMemo(() => activeSgLeversAt(year), [year]);
  const renderCountries = React.useMemo(
    () =>
      layer === "talent"
        ? applyTalentLevers(data.countries, talent.values)
        : data.countries,
    [layer, data.countries, talent.values],
  );

  const evidence: AuditEvidence = React.useMemo(
    () => ({
      authority: "Singapore MOM Employment Pass releases · EDB workforce mix",
      dataset: `Singapore inbound Band A mix, ${year} snapshot (paraphrased)`,
      lastUpdated: SG_HISTORY_FIXTURE_VERSION,
      confidence: "medium",
      fixtureRef: "lib/atlas/sg-origin-history.ts",
    }),
    [year],
  );

  const yearFocus: AuditFocus = React.useMemo(() => {
    const leverList =
      activeLevers.length === 0
        ? "none"
        : activeLevers.map((l) => l.label).join(", ");
    return {
      id: `sg-origin-map/${year}`,
      proposition: `Singapore inbound Band A in ${year}. ${SG_FLOW_YEAR_CONTEXT[year]} Active levers : ${leverList}.`,
      evidence: [evidence],
      grade: rubricGrade(
        "Five-year cadence inbound snapshot. Counts paraphrased from MOM EP releases and EDB workforce summaries; each tightening event anchored to the published threshold or framework.",
      ),
    };
  }, [year, evidence, activeLevers]);

  React.useEffect(() => {
    hover(yearFocus);
  }, [yearFocus, hover]);

  const handleMapHover = React.useCallback(
    (c: OriginCountry | null) => {
      if (c) {
        hover({
          id: `sg-origin-map/${year}/${c.iso2}`,
          proposition: `${c.country_name} : ${c.band_a_count} inbound Band A in ${year}.`,
          evidence: [evidence],
          grade: rubricGrade(RUBRIC_METHOD_LINE),
        });
      } else {
        hover(yearFocus);
      }
    },
    [hover, evidence, year, yearFocus],
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
        <SgStatsStrip totals={totals} year={year} />

        <section aria-labelledby="sg-origin-map-heading" className="space-y-5">
          <header className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Geographic · inbound
              </p>
              <h2
                id="sg-origin-map-heading"
                className="mt-1 text-h2 font-bold tracking-tight text-ink"
              >
                Where Singapore drew its talent.
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
                <div key={`sg-map-${year}-${layer}`} className="sg-origin-fade">
                  <OriginMapLeaflet
                    countries={renderCountries}
                    layer={layer}
                    focusedIso2={focusedIso2}
                    onCountryHover={handleMapHover}
                    onCountryClick={handleMapClick}
                    centerCentroid={SG_CENTROID}
                    centerLabel="SG"
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

        <SgPolicyTimeline activeLevers={activeLevers} year={year} />

        <SgTakeawayBanner year={year} totals={totals} data={data} />
      </div>

      <AuditSidebar />
      <style>{`
        .sg-origin-fade { animation: sg-origin-fade-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1); }
        @keyframes sg-origin-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function SgStatsStrip({
  totals,
  year,
}: {
  totals: { inbound: number; origins: number; epThreshold: string };
  year: SgFlowYear;
}) {
  return (
    <section
      aria-labelledby="sg-flow-stats-heading"
      className="sticky top-16 z-10 -mx-3 rounded-md border border-line bg-surface/95 px-3 py-3 backdrop-blur md:top-20 md:px-5"
    >
      <h2 id="sg-flow-stats-heading" className="sr-only">
        Singapore flow stats
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Inbound Band A total" value={totals.inbound.toString()} />
        <Stat label="Origin countries" value={totals.origins.toString()} />
        <Stat label="EP threshold" value={totals.epThreshold} accent mono />
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
          !accent && !slate && "text-ink",
          mono && "font-mono text-sm",
        )}
      >
        {value}
      </p>
    </li>
  );
}

function YearSelector({
  year,
  setYear,
  yearFocus,
}: {
  year: SgFlowYear;
  setYear: (y: SgFlowYear) => void;
  yearFocus: AuditFocus;
}) {
  const { hover } = useAuditTrail();
  return (
    <section
      aria-label="Year selector for the Singapore origin map"
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
          {SG_FLOW_YEARS.map((y) => {
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
        What drove the shift to {year} : {SG_FLOW_YEAR_CONTEXT[year]}
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

function SgPolicyTimeline({
  activeLevers,
  year,
}: {
  activeLevers: ReturnType<typeof activeSgLeversAt>;
  year: SgFlowYear;
}) {
  return (
    <section
      aria-label="Active Singapore policy levers"
      className="rounded-md border border-glacier bg-surface p-5 md:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
            In force at {year}
          </p>
          <h3 className="mt-1 text-[1.05rem] font-bold tracking-tight text-accent">
            {activeLevers.length} policy lever{activeLevers.length === 1 ? "" : "s"} active.
          </h3>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Tightening · system · expansion
        </p>
      </div>

      {activeLevers.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          Pre Singaporean First baseline. No tightening events on the timeline.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {activeLevers.map((ev) => (
            <li
              key={`${ev.year}-${ev.label}`}
              className="grid grid-cols-[64px_1fr] items-baseline gap-4 rounded-sm border border-line/60 bg-surface-soft/40 px-4 py-3"
            >
              <span className="font-mono text-sm font-bold tabular text-accent">
                {ev.year}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink leading-snug">
                  {ev.label}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                  {ev.impactNote}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        {SG_POLICY_EVENTS.length} total events on the timeline · scrub the year above to advance the cursor.
      </p>
    </section>
  );
}

function SgTakeawayBanner({
  year,
  totals,
  data,
}: {
  year: SgFlowYear;
  totals: { inbound: number; origins: number; epThreshold: string };
  data: OriginMapResponse;
}) {
  const top = data.countries.slice(0, 3);
  const topNames =
    top.length === 0
      ? "no recorded flow"
      : top.map((c) => `${c.country_name} (${c.band_a_count})`).join(", ");
  return (
    <div className="overflow-hidden rounded-md bg-gradient-to-br from-accent to-accent-deep px-5 py-5 md:px-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
        Takeaway · {year}
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-surface">
        {SG_FLOW_YEAR_TAKEAWAY[year]}
      </p>
      <p className="mt-3 text-[12px] leading-relaxed text-surface/85">
        <strong className="font-semibold text-surface">
          {totals.inbound}
        </strong>{" "}
        inbound Band A across{" "}
        <strong className="font-semibold text-surface">
          {totals.origins}
        </strong>{" "}
        origin countries. Top corridor : <strong>{topNames}</strong>. EP threshold in force :{" "}
        <strong className="font-mono">{totals.epThreshold}</strong>.
      </p>
    </div>
  );
}
