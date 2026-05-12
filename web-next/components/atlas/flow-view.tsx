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
import { FlowSankey, type FramingMode } from "@/components/atlas/flow-sankey";
import { FlowListMobile } from "@/components/atlas/flow-list-mobile";
import { rubricGrade } from "@/components/atlas/audit-helpers";
import type { FlowSankeyData } from "@/lib/atlas/types";

interface Props {
  data: FlowSankeyData;
  basePageAudit: Omit<PageAudit, "jurisdiction">;
}

export function FlowView({ data, basePageAudit }: Props) {
  const pageAudit: PageAudit = React.useMemo(
    () => ({
      ...basePageAudit,
      jurisdiction: "UK · US · EU · UAE · Singapore",
    }),
    [basePageAudit],
  );
  return (
    <AuditTrailProvider pageAudit={pageAudit}>
      <FlowBody data={data} />
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

function FlowBody({ data }: { data: FlowSankeyData }) {
  const [framing, setFraming] = React.useState<FramingMode>("rejected");
  const isDesktop = useIsDesktop();

  const evidence: AuditEvidence = React.useMemo(
    () => ({
      authority: "Anonymised caseworker decision logs + ORBIT partner network sample",
      dataset: "fixtures/atlas/flow-pairs.json",
      lastUpdated: data.sample_window_end,
      confidence: "medium",
      fixtureRef: "fixtures/atlas/flow-pairs.json",
    }),
    [data.sample_window_end],
  );

  // Stats derived from the fixture per spec.
  const ukUae = data.pairs.find((p) => p.from === "UK" && p.to === "UAE")?.value ?? 0;
  const usSg = data.pairs.find((p) => p.from === "US" && p.to === "Singapore")?.value ?? 0;
  const uaeUk = data.pairs.find((p) => p.from === "UAE" && p.to === "UK")?.value ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_19rem] lg:gap-10">
      <div className="min-w-0 space-y-10">
        <StatsStrip
          evidence={evidence}
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
              proposition: "Estimated time for the next destination to fully absorb a tightened-policy spillover : five years.",
              hardcoded: true,
            },
          ]}
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
              pairs={data.pairs}
              framing={framing}
              evidence={evidence}
            />
          ) : (
            <FlowListMobile
              pairs={data.pairs}
              framing={framing}
              evidence={evidence}
            />
          )}
        </section>

        <TakeawayBanner />
      </div>

      <AuditSidebar />
    </div>
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
