"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuditTrailProvider, type PageAudit } from "@/components/atlas/audit-context";
import { AuditSidebar } from "@/components/atlas/audit-sidebar";
import { AuditAnchor } from "@/components/atlas/audit-anchor";
import { BandBar } from "@/components/atlas/band-bar";
import { InsightsPanel } from "@/components/atlas/insights-panel";
import {
  rubricGrade,
  RUBRIC_METHOD_LINE,
  zoneEvidence,
} from "@/components/atlas/audit-helpers";
import { BAND_DESCRIPTORS } from "@/lib/atlas/rubric";
import type { AtlasCompany, PolicyInsight, RubricBand, SectorSummary } from "@/lib/atlas/types";
import type { UkOverviewStats, ZoneSummary } from "@/lib/atlas/data";

const PILLARS = [
  {
    label: "Innovation",
    blurb: "Differentiation versus the prevailing approach.",
    weight: "50% of composite",
  },
  {
    label: "Viability",
    blurb: "Plausibility of sustained operation under realistic conditions.",
    weight: "25% of composite",
  },
  {
    label: "Scalability",
    blurb: "Capacity to expand without proportional input growth.",
    weight: "25% of composite",
  },
] as const;

const BANDS: RubricBand[] = ["A", "B", "C", "D"];
const BAND_FILL: Record<RubricBand, string> = {
  A: "bg-cyan",
  B: "bg-accent",
  C: "bg-frost",
  D: "bg-charcoal",
};
const BAND_BG: Record<RubricBand, string> = {
  A: "border-cyan/40 bg-cyan-tint/40",
  B: "border-accent/30 bg-accent-tint/40",
  C: "border-frost/40 bg-glacier/30",
  D: "border-charcoal/30 bg-band-below-bg/40",
};

interface Props {
  summary: ZoneSummary;
  stats: UkOverviewStats;
  sectors: SectorSummary[];
  insights: PolicyInsight[];
  topStrong: AtlasCompany[];
  belowSamples: AtlasCompany[];
  basePageAudit: Omit<PageAudit, "jurisdiction">;
}

export function UkOverview({
  summary,
  stats,
  sectors,
  insights,
  topStrong,
  belowSamples,
  basePageAudit,
}: Props) {
  const pageAudit: PageAudit = React.useMemo(
    () => ({
      ...basePageAudit,
      jurisdiction: "UK · Innovator Founder precedent",
    }),
    [basePageAudit],
  );

  const evidence = zoneEvidence(summary);
  const strongPctTotal = Math.round(
    ((stats.byBand.A + stats.byBand.B) / Math.max(1, stats.total)) * 100,
  );

  // Sector concentrations for the public-language view: which sectors lean
  // Strong, which lean Below. Pre-computed in the component because it's
  // a simple derivation off SectorSummary.
  const sectorWithPct = sectors.map((s) => {
    const strong = s.byBand.A + s.byBand.B;
    return {
      ...s,
      strongPct: Math.round((strong / s.total) * 100),
      belowPct: Math.round((s.byBand.D / s.total) * 100),
    };
  });
  const topStrongSectors = [...sectorWithPct]
    .filter((s) => s.total >= 4)
    .sort((a, b) => b.strongPct - a.strongPct)
    .slice(0, 4);
  const topBelowSectors = [...sectorWithPct]
    .filter((s) => s.total >= 4)
    .sort((a, b) => b.belowPct - a.belowPct)
    .slice(0, 4);

  return (
    <AuditTrailProvider pageAudit={pageAudit}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_19rem] lg:gap-10">
        <div className="min-w-0 space-y-16">
          {/* STAT STRIP */}
          <section aria-labelledby="stat-heading">
            <h2 id="stat-heading" className="sr-only">
              UK precedent stats
            </h2>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <li>
                <AuditAnchor
                  as="div"
                  className="block rounded-md border border-line bg-surface px-5 py-4"
                  anchor={{
                    id: "uk/stat/bodies",
                    proposition: `${stats.endorsingBodies} endorsing bodies represented in the UK Innovator Founder sample.`,
                    evidence: [evidence],
                    grade: rubricGrade("Aggregation only (count of distinct authority values)."),
                  }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                    Endorsing bodies
                  </p>
                  <p className="mt-2 text-xl md:text-2xl font-semibold tracking-tight text-ink tabular">
                    {stats.endorsingBodies}
                  </p>
                  <p className="mt-0.5 text-2xs text-ink-muted">
                    distinct authorities in sample
                  </p>
                </AuditAnchor>
              </li>
              <li>
                <AuditAnchor
                  as="div"
                  className="block rounded-md border border-line bg-surface px-5 py-4"
                  anchor={{
                    id: "uk/stat/endorsed-this-year",
                    proposition: `${stats.endorsedThisYear} applicants endorsed in 2025 (sample).`,
                    evidence: [evidence],
                    grade: rubricGrade("Aggregation only (count where yearRegistered ≥ 2025)."),
                  }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                    Endorsed 2025
                  </p>
                  <p className="mt-2 text-xl md:text-2xl font-semibold tracking-tight text-ink tabular">
                    {stats.endorsedThisYear}
                  </p>
                  <p className="mt-0.5 text-2xs text-ink-muted">
                    applicants this year (sample)
                  </p>
                </AuditAnchor>
              </li>
              <li>
                <AuditAnchor
                  as="div"
                  className="block rounded-md border border-line bg-surface px-5 py-4"
                  anchor={{
                    id: "uk/stat/strong-pct",
                    proposition: `${strongPctTotal}% of UK Innovator Founder sample graded Strong or Acceptable.`,
                    evidence: [evidence],
                    grade: rubricGrade(RUBRIC_METHOD_LINE),
                  }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                    Strong or Acceptable
                  </p>
                  <p className="mt-2 text-xl md:text-2xl font-semibold tracking-tight text-ink tabular">
                    {strongPctTotal}%
                  </p>
                  <p className="mt-0.5 text-2xs text-ink-muted">
                    {stats.byBand.A + stats.byBand.B} of {stats.total} applicants
                  </p>
                </AuditAnchor>
              </li>
              <li>
                <AuditAnchor
                  as="div"
                  className="block rounded-md border border-line bg-surface px-5 py-4"
                  anchor={{
                    id: "uk/stat/last-refresh",
                    proposition: `Most recent UK sample refresh : ${stats.lastRefresh}.`,
                    evidence: [evidence],
                    grade: rubricGrade("Aggregation only (max of lastUpdated)."),
                  }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                    Last refresh
                  </p>
                  <p className="mt-2 text-xl md:text-2xl font-semibold tracking-tight text-ink tabular">
                    {stats.lastRefresh}
                  </p>
                  <p className="mt-0.5 text-2xs text-ink-muted">across sample fixture</p>
                </AuditAnchor>
              </li>
            </ul>
          </section>

          {/* PUBLIC FRAMEWORK */}
          <section aria-labelledby="framework-heading" className="space-y-6">
            <header>
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Public framework
              </p>
              <h2
                id="framework-heading"
                className="mt-1 text-h2 font-bold tracking-tight text-ink"
              >
                gMC framework, four bands.
              </h2>
              <p className="mt-2 max-w-2xl text-2xs text-ink-muted leading-relaxed">
                The UK Innovator Founder programme grades applicants against three public pillars. ATLAS adopts the same pillars and the same four-band ladder (paraphrased), so the architecture transfers to other jurisdictions without inventing a new rubric.
              </p>
            </header>

            <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {PILLARS.map((p) => (
                <li key={p.label} className="rounded-md border border-line bg-surface p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                    {p.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink">{p.blurb}</p>
                  <p className="mt-1 text-2xs text-ink-muted">{p.weight}</p>
                </li>
              ))}
            </ul>

            <div className="rounded-md border border-line bg-surface p-5 space-y-3">
              <div className="flex items-baseline justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                  Band ladder (paraphrased)
                </p>
                <Link
                  href="/atlas/rubric"
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent hover:underline"
                >
                  Rubric definition
                </Link>
              </div>
              <AuditAnchor
                as="div"
                className="block"
                anchor={{
                  id: "uk/band-ladder",
                  proposition: `UK Innovator Founder sample : A ${stats.byBand.A}, B ${stats.byBand.B}, C ${stats.byBand.C}, D ${stats.byBand.D} across ${stats.total} applicants.`,
                  evidence: [evidence],
                  grade: rubricGrade(RUBRIC_METHOD_LINE),
                }}
              >
                <BandBar counts={stats.byBand} total={stats.total} height="lg" />
              </AuditAnchor>
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {BANDS.map((b) => {
                  const d = BAND_DESCRIPTORS[b];
                  return (
                    <li
                      key={b}
                      className={cn("rounded-sm border p-3", BAND_BG[b])}
                    >
                      <div className="flex items-baseline gap-2">
                        <span
                          aria-hidden
                          className={cn("h-1.5 w-1.5 rounded-full", BAND_FILL[b])}
                        />
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                          {b} : {d.short}
                        </p>
                      </div>
                      <p className="mt-2 text-base font-semibold text-ink tabular">
                        {stats.byBand[b]}
                      </p>
                      <p className="mt-1 text-2xs text-ink-muted leading-snug">
                        {d.description}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          {/* SECTOR CONCENTRATIONS */}
          <section aria-labelledby="concentrations-heading" className="space-y-5">
            <header>
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Sector concentrations
              </p>
              <h2
                id="concentrations-heading"
                className="mt-1 text-h2 font-bold tracking-tight text-ink"
              >
                Where Strong concentrates and where Below threshold concentrates.
              </h2>
            </header>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ConcentrationList
                title="Concentrating Strong and Acceptable"
                tone="opportunity"
                sectors={topStrongSectors.map((s) => ({
                  sector: s.sector,
                  pct: s.strongPct,
                  total: s.total,
                  counts: s.byBand,
                }))}
                summary={summary}
                kind="strong"
              />
              <ConcentrationList
                title="Concentrating Below threshold"
                tone="intervention"
                sectors={topBelowSectors.map((s) => ({
                  sector: s.sector,
                  pct: s.belowPct,
                  total: s.total,
                  counts: s.byBand,
                }))}
                summary={summary}
                kind="below"
              />
            </div>
          </section>

          {/* TOP STRONG + BELOW SAMPLES */}
          <section aria-labelledby="samples-heading" className="space-y-5">
            <header>
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Sample applicants
              </p>
              <h2
                id="samples-heading"
                className="mt-1 text-h2 font-bold tracking-tight text-ink"
              >
                Read the rubric at the entity level.
              </h2>
            </header>
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
              <div className="space-y-3">
                <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
                  Strong (Band A)
                </p>
                <ApplicantList companies={topStrong} band="A" />
              </div>
              <div className="space-y-3">
                <p className="font-mono text-2xs uppercase tracking-[0.18em] text-charcoal">
                  Below threshold (Band D)
                </p>
                <ApplicantList companies={belowSamples} band="D" />
              </div>
            </div>
          </section>

          {/* INSIGHTS */}
          <section aria-labelledby="insights-heading" className="space-y-5">
            <header>
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Policy console
              </p>
              <h2
                id="insights-heading"
                className="mt-1 text-h2 font-bold tracking-tight text-ink"
              >
                Insights from this pipeline.
              </h2>
            </header>
            <InsightsPanel zone={summary} insights={insights} />
          </section>
        </div>

        <AuditSidebar />
      </div>
    </AuditTrailProvider>
  );
}

function ConcentrationList({
  title,
  tone,
  sectors,
  summary,
  kind,
}: {
  title: string;
  tone: "opportunity" | "intervention";
  sectors: { sector: string; pct: number; total: number; counts: Record<RubricBand, number> }[];
  summary: ZoneSummary;
  kind: "strong" | "below";
}) {
  const evidence = zoneEvidence(summary);
  const ring =
    tone === "opportunity" ? "border-cyan/30 bg-cyan-tint/20" : "border-charcoal/30 bg-surface-soft/60";
  const fg = tone === "opportunity" ? "text-accent" : "text-charcoal";

  return (
    <div className={cn("rounded-md border p-5", ring)}>
      <p className={cn("font-mono text-[10px] uppercase tracking-[0.18em]", fg)}>{title}</p>
      <ul className="mt-4 space-y-3">
        {sectors.map((s) => (
          <li key={s.sector}>
            <AuditAnchor
              as="div"
              className="block"
              anchor={{
                id: `uk/concentration/${kind}/${s.sector}`,
                proposition: `UK ${s.sector} : ${s.pct}% ${kind === "strong" ? "Strong or Acceptable" : "Below threshold"} across ${s.total} applicants.`,
                evidence: [evidence],
                grade: rubricGrade(RUBRIC_METHOD_LINE),
              }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-ink truncate">{s.sector}</p>
                <p className={cn("font-mono text-sm tabular shrink-0", fg)}>{s.pct}%</p>
              </div>
              <div className="mt-2">
                <BandBar counts={s.counts} total={s.total} height="sm" />
              </div>
              <p className="mt-1 text-2xs text-ink-muted">
                {s.total} applicants in sector
              </p>
            </AuditAnchor>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ApplicantList({
  companies,
  band,
}: {
  companies: AtlasCompany[];
  band: RubricBand;
}) {
  if (!companies.length) {
    return (
      <div className="rounded-md border border-line p-6 text-2xs text-ink-muted">
        No Band {band} applicants in the current sample.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-line/60 overflow-hidden rounded-md border border-line bg-surface">
      {companies.map((c) => (
        <li key={c.id}>
          <Link
            href={`/atlas/company/${c.id}`}
            className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-soft"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{c.name}</p>
              <p className="mt-0.5 text-2xs text-ink-muted truncate">
                {c.sector}
                <span aria-hidden className="mx-1.5 text-ink-faint">·</span>
                {c.subSector}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-2xs font-medium",
                band === "A" && "border-cyan/30 bg-cyan-tint text-accent",
                band === "D" && "border-charcoal/30 bg-band-below-bg text-band-below-fg",
              )}
            >
              Band {band}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-ink-faint transition-colors group-hover:text-ink" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
