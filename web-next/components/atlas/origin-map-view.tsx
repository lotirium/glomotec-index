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
import { AuditSidebar } from "@/components/atlas/audit-sidebar";
import { TopOriginsList } from "@/components/atlas/top-origins-list";
import OriginMapStatic from "@/components/atlas/origin-map-static";
import { rubricGrade, RUBRIC_METHOD_LINE } from "@/components/atlas/audit-helpers";
import type { OriginMapResponse, OriginCountry } from "@/lib/atlas/types";

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
}

export function OriginMapView({ data, basePageAudit }: Props) {
  const pageAudit: PageAudit = React.useMemo(
    () => ({
      ...basePageAudit,
      jurisdiction: "UAE · Origin map",
    }),
    [basePageAudit],
  );

  return (
    <AuditTrailProvider pageAudit={pageAudit}>
      <OriginMapBody data={data} />
    </AuditTrailProvider>
  );
}

function OriginMapBody({ data }: { data: OriginMapResponse }) {
  const [focusedIso2, setFocusedIso2] = React.useState<string | null>(null);
  const isDesktop = useIsDesktop();
  const { hover } = useAuditTrail();

  const evidence: AuditEvidence = React.useMemo(
    () => ({
      authority: "Aggregate of four UAE free zone registers (sample)",
      dataset: "DMCC, DIFC, ADGM, JAFZA registers with augmented origin field",
      lastUpdated: data.last_refresh,
      confidence: "medium",
      fixtureRef: "fixtures/atlas/{dmcc,difc,adgm,jafza}.json",
    }),
    [data.last_refresh],
  );

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
        <StatsStrip data={data} />

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
              <p className="mt-2 max-w-2xl text-2xs text-ink-muted leading-relaxed">
                Founder and HQ origin for every Band A entity in the
                UAE free zone sample. Flow lines trace where the talent is
                coming from.
              </p>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint tabular">
              Last refresh : {data.last_refresh || "—"}
            </p>
          </header>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
            <div className="min-w-0">
              {isDesktop === null ? (
                <div
                  aria-hidden
                  className="h-[520px] w-full rounded-md bg-glacier/40"
                />
              ) : isDesktop ? (
                <OriginMapLeaflet
                  countries={data.countries}
                  focusedIso2={focusedIso2}
                  onCountryHover={handleMapHover}
                  onCountryClick={handleMapClick}
                />
              ) : (
                <OriginMapStatic countries={data.countries} />
              )}
            </div>
            <TopOriginsList
              countries={data.countries}
              evidence={evidence}
              focusedIso2={focusedIso2}
              onSelect={(iso2) => setFocusedIso2(iso2)}
            />
          </div>
        </section>

        <TakeawayBanner data={data} />
      </div>

      <AuditSidebar />
    </div>
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
