"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { AssessmentRun } from "@/lib/types";
import { bandFromPct } from "@/lib/scoring";

const headlineTone: Record<
  AssessmentRun["verdict_class"],
  { ring: string; halo: string; pill: string }
> = {
  high: {
    ring: "from-band-high-fg/30 via-band-high-fg/0 to-transparent",
    halo: "bg-band-high-fg/10",
    pill: "bg-band-high-bg text-band-high-fg",
  },
  medium: {
    ring: "from-band-medium-fg/25 via-band-medium-fg/0 to-transparent",
    halo: "bg-band-medium-fg/10",
    pill: "bg-band-medium-bg text-band-medium-fg",
  },
  low: {
    ring: "from-band-low-fg/25 via-band-low-fg/0 to-transparent",
    halo: "bg-band-low-fg/10",
    pill: "bg-band-low-bg text-band-low-fg",
  },
};

export function VerdictHero({
  run,
  scoredCount,
  scoring = false,
  expectedTotal,
}: {
  run: AssessmentRun;
  /** Number of criteria scored so far (defaults to run.total when not streaming). */
  scoredCount?: number;
  /** When true, the headline is suppressed and a "scoring" affordance is shown. */
  scoring?: boolean;
  /** Total expected criteria — known up front during streaming, when run.total still grows from 0. */
  expectedTotal?: number;
}) {
  const t = headlineTone[run.verdict_class];
  const total = expectedTotal ?? run.total;
  const scored = scoredCount ?? run.total;
  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-surface shadow-hero">
      <div
        aria-hidden
        className={cn(
          "absolute -top-32 -right-32 h-72 w-72 rounded-full blur-3xl",
          t.halo,
        )}
      />
      <div className="relative grid grid-cols-1 gap-8 p-8 md:grid-cols-[1fr_auto] md:p-10">
        <div className="flex flex-col justify-center gap-5 min-w-0">
          {scoring ? (
            <ScoringPill scored={scored} total={total} />
          ) : (
            <span
              className={cn(
                "inline-flex w-fit items-center rounded-full px-3 py-1 text-2xs font-medium tracking-tight animate-result-arrive",
                t.pill,
              )}
            >
              {run.verdict_headline}
            </span>
          )}

          {scoring ? (
            <LiveCounter scored={scored} total={total} />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 animate-result-arrive">
              <ScoreColumn
                label="Substantive readiness"
                tooltip="Average across criteria that test the applicant's underlying fit (role, age, status, history)."
                pct={run.substantive_pct}
                count={run.category_summary.substantive.count}
              />
              <ScoreColumn
                label="Submission readiness"
                tooltip="Average across criteria that test the application package (translations, biometrics, fees, ID)."
                pct={run.submission_pct}
                count={run.category_summary.procedural.count}
              />
            </div>
          )}

          {!scoring && (
            <p className="max-w-xl text-sm text-ink-muted leading-relaxed">
              Across {run.total} criteria from the Innovator Founder caseworker
              guidance. Each criterion carries a probability, a reasoning trace
              and a link to its source.
            </p>
          )}
        </div>

        <div className="flex flex-row gap-3 md:flex-col md:justify-center">
          <SummaryStat
            label="High"
            value={run.summary.high}
            tone="high"
            scoring={scoring}
          />
          <SummaryStat
            label="Medium"
            value={run.summary.medium}
            tone="medium"
            scoring={scoring}
          />
          <SummaryStat
            label="Low"
            value={run.summary.low + run.summary.below_threshold}
            tone="low"
            scoring={scoring}
          />
        </div>
      </div>

      <div className="relative">
        <SegmentedBar run={run} />
      </div>
    </div>
  );
}

function LiveCounter({ scored, total }: { scored: number; total: number }) {
  // Before the first result arrives, the screen would otherwise read "0 of N",
  // which looks like a final answer rather than a loading state. Replace it
  // with a loading affordance: heading + cycling dots + shimmer bar. As soon
  // as the first result lands, fade in the real counter.
  if (scored === 0) {
    return (
      <div className="animate-result-arrive">
        <p className="text-2xl font-medium tracking-tight text-ink-soft md:text-3xl">
          Scoring {total} criteria
          <LoadingDots />
        </p>
        <div className="shimmer-bar mt-3 h-2 w-[200px] rounded-full" aria-hidden />
      </div>
    );
  }
  return (
    <div className="animate-result-arrive">
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
        Scoring
      </p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-tightest tabular text-ink leading-none md:text-5xl">
          {scored}
        </span>
        <span className="text-sm text-ink-muted font-medium tracking-tight">
          of {total} criteria scored
        </span>
      </p>
    </div>
  );
}

function LoadingDots() {
  const [count, setCount] = React.useState(1);
  React.useEffect(() => {
    const id = setInterval(() => setCount((c) => (c % 3) + 1), 400);
    return () => clearInterval(id);
  }, []);
  // Reserved width so the heading doesn't shift as dots cycle.
  return (
    <span
      aria-hidden
      className="inline-block w-[1.2em] text-left align-baseline"
    >
      {".".repeat(count)}
    </span>
  );
}

function ScoringPill({ scored, total }: { scored: number; total: number }) {
  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface-soft px-3 py-1 text-2xs font-medium tracking-tight text-ink-soft">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      Scoring · {scored}/{total}
    </span>
  );
}

function ScoreColumn({
  label,
  tooltip,
  pct,
  count,
}: {
  label: string;
  tooltip: string;
  pct: number;
  count: number;
}) {
  const band = bandFromPct(pct);
  const bandColor =
    band === "high"
      ? "text-band-high-fg"
      : band === "medium"
        ? "text-band-medium-fg"
        : band === "low"
          ? "text-band-low-fg"
          : "text-band-below-fg";
  const bandLabel =
    band === "high"
      ? "High"
      : band === "medium"
        ? "Medium"
        : band === "low"
          ? "Low"
          : "Below threshold";
  return (
    <div title={tooltip}>
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-tightest tabular text-ink leading-none md:text-5xl">
          {pct}
        </span>
        <span className="text-sm text-ink-muted font-medium tracking-tight">/100</span>
      </p>
      <p className="mt-1.5 text-2xs text-ink-muted">
        <span className={cn("font-semibold", bandColor)}>{bandLabel}</span>{" "}
        <span className="text-ink-faint">· {count} criteria</span>
      </p>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
  scoring,
}: {
  label: string;
  value: number;
  tone: "high" | "medium" | "low";
  scoring: boolean;
}) {
  const fg =
    tone === "high"
      ? "text-band-high-fg"
      : tone === "medium"
        ? "text-band-medium-fg"
        : "text-band-low-fg";
  // While scoring, "0" reads as a final count of zero. Render an em-dash
  // until results actually land in this band — standard data-design
  // convention for "no data yet".
  const isPending = scoring && value === 0;
  return (
    <div className="flex items-center gap-3 rounded-md border border-line/70 bg-surface-soft/60 px-4 py-2.5 md:flex-col md:items-start md:gap-0">
      <span
        className={cn(
          "text-2xl font-semibold tabular leading-none",
          isPending ? "text-ink-faint" : fg,
        )}
      >
        {isPending ? "—" : value}
      </span>
      <span className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </span>
    </div>
  );
}

function SegmentedBar({ run }: { run: AssessmentRun }) {
  const total = Math.max(1, run.total);
  const segments = [
    { count: run.summary.high, cls: "bg-band-high-fg" },
    { count: run.summary.medium, cls: "bg-band-medium-fg" },
    { count: run.summary.low, cls: "bg-band-low-fg" },
    { count: run.summary.below_threshold, cls: "bg-band-below-fg" },
  ];
  return (
    <div className="flex h-1.5 w-full overflow-hidden">
      {segments.map((s, i) =>
        s.count > 0 ? (
          <div
            key={i}
            className={cn(s.cls, "origin-left animate-scale-x")}
            style={{ width: `${(s.count / total) * 100}%` }}
          />
        ) : null,
      )}
    </div>
  );
}
