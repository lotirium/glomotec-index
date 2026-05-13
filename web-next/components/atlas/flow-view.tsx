"use client";

import * as React from "react";
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
import { FlowSankey, type FramingMode } from "@/components/atlas/flow-sankey";
import { FlowListMobile } from "@/components/atlas/flow-list-mobile";
import { rubricGrade } from "@/components/atlas/audit-helpers";
import {
  FLOW_PAIRS_BY_YEAR,
  FLOW_YEARS,
  FLOW_HISTORY_FIXTURE_VERSION,
  YEAR_CONTEXT,
  YEAR_REGIME,
  type FlowYear,
} from "@/lib/atlas/flow-data";
import type { FlowSankeyData } from "@/lib/atlas/types";

interface Props {
  data: FlowSankeyData;
  basePageAudit: Omit<PageAudit, "jurisdiction">;
  description: string;
}

const DEFAULT_YEAR: FlowYear = 2025;

export function FlowView({ data, basePageAudit, description }: Props) {
  const pageAudit: PageAudit = React.useMemo(
    () => ({
      ...basePageAudit,
      jurisdiction: "UK · US · EU · UAE · Singapore",
    }),
    [basePageAudit],
  );
  return (
    <AuditTrailProvider pageAudit={pageAudit}>
      <FlowBody data={data} description={description} />
    </AuditTrailProvider>
  );
}

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

function FlowBody({
  data,
  description,
}: {
  data: FlowSankeyData;
  description: string;
}) {
  const [framing, setFraming] = React.useState<FramingMode>("rejected");
  const [year, setYear] = React.useState<FlowYear>(DEFAULT_YEAR);
  const isDesktop = useIsDesktop();

  // Stats strip stays anchored to the published 2025 JSON fixture : these are
  // the four headline takeaways for the sample window and shouldn't move as
  // the user scrubs through history.
  const stripEvidence: AuditEvidence = React.useMemo(
    () => ({
      authority: "Anonymised caseworker decision logs + ORBIT partner network sample",
      dataset: "fixtures/atlas/flow-pairs.json",
      lastUpdated: data.sample_window_end,
      confidence: "medium",
      fixtureRef: "fixtures/atlas/flow-pairs.json",
    }),
    [data.sample_window_end],
  );

  // Sankey + mobile list use the year-selected fixture. Evidence reflects
  // the selected year so the audit sidebar is honest about the source.
  const yearEvidence: AuditEvidence = React.useMemo(
    () => ({
      authority: "UK Home Office case file aggregates",
      dataset: `Cross-jurisdictional flow snapshot, ${year} window (illustrative)`,
      lastUpdated: FLOW_HISTORY_FIXTURE_VERSION,
      confidence: "medium",
      fixtureRef: "lib/atlas/flow-data.ts",
    }),
    [year],
  );

  const yearPairs = FLOW_PAIRS_BY_YEAR[year];

  // Strip stats derived from the published 2025 JSON fixture per spec.
  const ukUae = data.pairs.find((p) => p.from === "UK" && p.to === "UAE")?.value ?? 0;
  const usSg = data.pairs.find((p) => p.from === "US" && p.to === "Singapore")?.value ?? 0;
  const uaeUk = data.pairs.find((p) => p.from === "UAE" && p.to === "UK")?.value ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_19rem] lg:gap-10">
      <div className="min-w-0 space-y-10">
        <CollapsibleContext label="What the ribbons trace">
          <p>{description}</p>
        </CollapsibleContext>
        <StatsStrip
          evidence={stripEvidence}
          cells={[
            {
              id: "stats/uk-to-uae",
              value: ukUae,
              label: "UK Innovator Founder rejections found UAE Golden Visa",
              proposition: `UK Innovator Founder rejected applicants : ${ukUae} placed in UAE Golden Visa.`,
            },
            {
              id: "stats/us-to-sg",
              value: usSg,
              label: "US EB-5 backlog applicants moved to Singapore GIP",
              proposition: `US EB-5 backlog applicants : ${usSg} placed in Singapore GIP.`,
            },
            {
              id: "stats/uae-to-uk",
              value: uaeUk,
              label: "UAE non-renewals were placed by UK Innovator Founder",
              proposition: `UAE non-renewals : ${uaeUk} placed in UK Innovator Founder.`,
            },
            {
              id: "stats/absorption-years",
              value: 5,
              label: "Years for the next destination to fully absorb the flow",
              proposition:
                "Estimated time for the next destination to fully absorb a tightened-policy spillover : five years.",
              hardcoded: true,
            },
          ]}
        />

        <YearSelector
          year={year}
          setYear={setYear}
          evidence={yearEvidence}
        />

        {/* TOGGLE */}
        <section aria-labelledby="flow-toggle-heading" className="space-y-4">
          <h2 id="flow-toggle-heading" className="sr-only">
            Flow framing selector
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Flow framing"
              className="inline-flex rounded-full border border-line bg-surface-soft p-1"
            >
              {(
                [
                  { id: "rejected", label: "Rejected in first choice" },
                  { id: "approved", label: "Approved by destination" },
                ] as const
              ).map((t) => {
                const active = framing === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFraming(t.id)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors",
                      active
                        ? "bg-accent text-surface"
                        : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
              Hover a ribbon to isolate the flow
            </p>
          </div>

          {isDesktop === null ? (
            <div
              aria-hidden
              className="aspect-[1200/540] w-full rounded-md border border-line bg-glacier/40"
            />
          ) : isDesktop ? (
            <FlowSankey
              pairs={yearPairs}
              framing={framing}
              evidence={yearEvidence}
            />
          ) : (
            <FlowListMobile
              pairs={yearPairs}
              framing={framing}
              evidence={yearEvidence}
            />
          )}
        </section>

        <TakeawayBanner />
      </div>

      <AuditSidebar />
    </div>
  );
}

function YearSelector({
  year,
  setYear,
  evidence,
}: {
  year: FlowYear;
  setYear: (y: FlowYear) => void;
  evidence: AuditEvidence;
}) {
  const { hover } = useAuditTrail();

  const focusFor = React.useCallback(
    (y: FlowYear): AuditFocus => ({
      id: `flow/year-${y}`,
      proposition: `Cross-jurisdictional flows for ${y}. Active policy regime : ${YEAR_REGIME[y]}.`,
      evidence: [evidence],
      grade: rubricGrade(
        "Historical flow snapshot at five-year interval. Volumes anchored to recorded policy inflection points.",
      ),
    }),
    [evidence],
  );

  // Keep the audit sidebar showing the year focus as long as the selector
  // is active. Pinning the year would toggle off on re-click, which is
  // surprising; using hover() keeps the proposition visible until a ribbon
  // or stat takes over.
  React.useEffect(() => {
    hover(focusFor(year));
  }, [year, hover, focusFor]);

  return (
    <section
      aria-label="Year selector for cross-jurisdictional flows"
      className="rounded-md border border-line bg-surface px-4 py-4 md:px-6 md:py-5"
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
          {FLOW_YEARS.map((y) => {
            const active = y === year;
            return (
              <button
                key={y}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setYear(y)}
                onMouseEnter={() => hover(focusFor(y))}
                onMouseLeave={() => hover(focusFor(year))}
                onFocus={() => hover(focusFor(y))}
                onBlur={() => hover(focusFor(year))}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] tabular transition-colors",
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
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        {YEAR_CONTEXT[year]}
      </p>
    </section>
  );
}

interface StatCell {
  id: string;
  value: number;
  label: string;
  proposition: string;
  hardcoded?: boolean;
}

function StatsStrip({
  cells,
  evidence,
}: {
  cells: StatCell[];
  evidence: AuditEvidence;
}) {
  const { hover, pin, pinned } = useAuditTrail();
  return (
    <section
      aria-labelledby="flow-stats-heading"
      className="sticky top-16 z-10 -mx-3 rounded-md border border-line bg-surface/95 px-3 py-3 backdrop-blur md:top-20 md:px-5"
    >
      <h2 id="flow-stats-heading" className="sr-only">
        Flow stats
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cells.map((c) => {
          const focus: AuditFocus = {
            id: c.id,
            proposition: c.proposition,
            evidence: [evidence],
            grade: rubricGrade(
              c.hardcoded
                ? "Editorial estimate. Not derived from sample data."
                : "Cell value aggregated from the flow-pairs fixture.",
            ),
          };
          const isPinned = pinned?.id === focus.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                onMouseEnter={() => hover(focus)}
                onMouseLeave={() => hover(null)}
                onFocus={() => hover(focus)}
                onBlur={() => hover(null)}
                onClick={() => pin(focus)}
                className={cn(
                  "block w-full rounded-sm border-l-2 border-cyan bg-surface px-4 py-3 text-left transition-colors hover:bg-cyan-tint/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
                  isPinned && "bg-cyan-tint/70",
                )}
              >
                <p className="text-2xl font-bold tabular text-accent">
                  {c.value}
                </p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.06em] leading-snug text-ink-muted">
                  {c.label}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TakeawayBanner() {
  return (
    <div className="overflow-hidden rounded-md bg-gradient-to-br from-accent to-accent-deep px-6 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
        Takeaway
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-surface">
        The strongest flow in the sample is{" "}
        <strong className="font-bold text-surface">
          UK Innovator Founder rejection to UAE Golden Visa approval
        </strong>
        . 68 applicants in the sample window. If a UK policy team tightens
        innovation-led criteria, UAE absorbs the spillover. This is the
        cross-jurisdictional intelligence the system makes visible.
      </p>
    </div>
  );
}
