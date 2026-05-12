"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { BandBar, BandLegend } from "@/components/atlas/band-bar";
import { AuditAnchor } from "@/components/atlas/audit-anchor";
import { rubricGrade, RUBRIC_METHOD_LINE, zoneEvidence } from "@/components/atlas/audit-helpers";
import { RUBRIC_VERSION } from "@/lib/atlas/rubric";
import type { ZoneSummary } from "@/lib/atlas/data";

// Headline numbers that represent what UAE free zones publish today.
// These are illustrative public-record style totals (DMCC, DIFC, Hub71)
// so the "today" panel shows operator-familiar figures alongside the
// graded ATLAS view of the same population.
const TODAY_HEADLINES: { label: string; figure: string }[] = [
  { label: "DMCC companies", figure: "26,000" },
  { label: "DIFC active", figure: "8,844" },
  { label: "Fintech and AI entities", figure: "1,677" },
  { label: "Hub71 startups", figure: "370" },
];

interface Props {
  zones: ZoneSummary[];
}

export function TodayVsAtlas({ zones }: Props) {
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), 280);
    return () => window.clearTimeout(t);
  }, []);

  const totalBandA = zones.reduce((s, z) => s + z.byBand.A, 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* LEFT — TODAY */}
      <section
        aria-labelledby="today-heading"
        className="rounded-md border border-line bg-surface-soft p-6"
      >
        <header className="flex items-baseline justify-between">
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
            Today
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            Authority publication
          </p>
        </header>
        <h3
          id="today-heading"
          className="mt-3 text-base font-semibold tracking-tight text-ink-soft"
        >
          Sector totals (counts only).
        </h3>
        <p className="mt-1 text-2xs text-ink-muted leading-relaxed">
          What free zone authorities publish today : aggregate registration counts and
          sector splits. No rubric layer. No company-level grading.
        </p>

        <ul className="mt-6 grid grid-cols-2 gap-3">
          {TODAY_HEADLINES.map((h) => (
            <li
              key={h.label}
              className="rounded-sm border border-line/60 bg-surface px-3 py-3"
            >
              <p className="text-xl font-semibold text-ink-soft tabular">{h.figure}</p>
              <p className="mt-0.5 text-2xs text-ink-faint">{h.label}</p>
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            Per zone (counts)
          </p>
          {zones.map((z) => (
            <div
              key={z.zone}
              className="flex items-center gap-3 text-2xs text-ink-soft"
            >
              <span className="w-14 font-mono uppercase tracking-[0.18em] text-ink-faint">
                {z.zone}
              </span>
              <BandBar
                counts={z.byBand}
                total={z.total}
                mono
                height="sm"
                label={`${z.zone} total ${z.total} (today view)`}
              />
              <span className="w-10 text-right tabular">{z.total}</span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-2xs text-ink-faint leading-relaxed">
          This is the view available to policy teams now. Totals tell you population,
          not pipeline quality.
        </p>
      </section>

      {/* RIGHT — WITH ATLAS */}
      <section
        aria-labelledby="atlas-heading"
        className={cn(
          "relative rounded-md border bg-surface p-6 transition-all duration-1000 ease-out",
          revealed
            ? "border-accent/30 opacity-100 grayscale-0"
            : "border-line opacity-70 grayscale",
        )}
      >
        <header className="flex items-baseline justify-between">
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-accent">
            With ATLAS
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            Rubric {RUBRIC_VERSION}
          </p>
        </header>
        <h3
          id="atlas-heading"
          className="mt-3 text-base font-semibold tracking-tight text-ink"
        >
          Same companies, continuously graded.
        </h3>
        <p className="mt-1 text-2xs text-ink-muted leading-relaxed">
          Every registered entity scored against the three-pillar rubric
          (innovation, viability, scalability). Evidence anchored, audit-trail
          native.
        </p>

        <ul className="mt-6 grid grid-cols-2 gap-3">
          {zones.map((z) => (
            <li key={z.zone}>
              <AuditAnchor
                as="div"
                className="block rounded-sm border border-line/60 bg-surface px-3 py-3"
                anchor={{
                  id: `today-vs-atlas/${z.zone}/band-a`,
                  proposition: `${z.zone} : ${z.byBand.A} Band A entities out of ${z.total} graded.`,
                  evidence: [zoneEvidence(z)],
                  grade: rubricGrade(RUBRIC_METHOD_LINE),
                }}
              >
                <p className="text-xl font-semibold text-ink tabular">
                  <span className="text-cyan">{z.byBand.A}</span>
                  <span className="ml-1 text-2xs text-ink-faint">/ {z.total}</span>
                </p>
                <p className="mt-0.5 text-2xs text-ink-faint">
                  <span className="font-mono uppercase tracking-[0.18em]">{z.zone}</span>{" "}
                  Band A entities
                </p>
              </AuditAnchor>
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
              Per zone (A / B / C / D)
            </p>
            <BandLegend />
          </div>
          {zones.map((z) => (
            <AuditAnchor
              key={z.zone}
              as="div"
              className="flex items-center gap-3 text-2xs text-ink-soft"
              anchor={{
                id: `today-vs-atlas/${z.zone}/distribution`,
                proposition: `${z.zone} rubric distribution : A ${z.byBand.A}, B ${z.byBand.B}, C ${z.byBand.C}, D ${z.byBand.D} across ${z.total} entities.`,
                evidence: [zoneEvidence(z)],
                grade: rubricGrade(RUBRIC_METHOD_LINE),
              }}
            >
              <span className="w-14 font-mono uppercase tracking-[0.18em] text-ink-faint">
                {z.zone}
              </span>
              <BandBar
                counts={z.byBand}
                total={z.total}
                height="sm"
                label={`${z.zone} A/B/C/D distribution`}
              />
              <span className="w-10 text-right tabular">{z.total}</span>
            </AuditAnchor>
          ))}
        </div>

        <AuditAnchor
          as="div"
          className="mt-6 block rounded-sm border border-cyan/30 bg-cyan-tint/40 px-3 py-3"
          anchor={{
            id: "today-vs-atlas/total-band-a",
            proposition: `${totalBandA} Band A intervention opportunities across the four free zones.`,
            evidence: zones.map((z) => zoneEvidence(z)),
            grade: rubricGrade(RUBRIC_METHOD_LINE),
          }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
            Band A intervention opportunities
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink tabular">{totalBandA}</p>
          <p className="mt-0.5 text-2xs text-ink-muted">
            Entities flagged for accelerator, incentive, or showcase pipelines.
          </p>
        </AuditAnchor>
      </section>
    </div>
  );
}
