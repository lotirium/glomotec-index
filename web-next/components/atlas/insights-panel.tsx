"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuditAnchor } from "@/components/atlas/audit-anchor";
import { rubricGrade, RUBRIC_METHOD_LINE, zoneEvidence } from "@/components/atlas/audit-helpers";
import type { PolicyInsight } from "@/lib/atlas/types";
import type { ZoneSummary } from "@/lib/atlas/data";

const SEVERITY_STYLES: Record<
  PolicyInsight["severity"],
  { dot: string; badge: string; label: string }
> = {
  opportunity: {
    dot: "bg-cyan",
    badge: "border-cyan/30 bg-cyan-tint text-accent",
    label: "Opportunity",
  },
  watch: {
    dot: "bg-frost",
    badge: "border-frost/40 bg-glacier/50 text-accent",
    label: "Watch",
  },
  intervention: {
    dot: "bg-charcoal",
    badge: "border-charcoal/30 bg-band-below-bg text-band-below-fg",
    label: "Intervention",
  },
};

interface Props {
  zone: ZoneSummary;
  insights: PolicyInsight[];
}

export function InsightsPanel({ zone, insights }: Props) {
  if (!insights.length) {
    return (
      <div className="rounded-md border border-line p-6 text-2xs text-ink-muted">
        No insights derived for this rubric pass.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {insights.map((insight, i) => (
        <InsightCard key={i} zone={zone} insight={insight} index={i} />
      ))}
    </ul>
  );
}

function InsightCard({
  zone,
  insight,
  index,
}: {
  zone: ZoneSummary;
  insight: PolicyInsight;
  index: number;
}) {
  const [open, setOpen] = React.useState(false);
  const sev = SEVERITY_STYLES[insight.severity];
  const evidence = zoneEvidence(zone);

  return (
    <li className="rounded-md border border-line bg-surface p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", sev.dot)} />
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.18em]",
              sev.badge,
            )}
          >
            {sev.label}
          </span>
        </div>
        <AuditAnchor
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint"
          anchor={{
            id: `insight/${zone.zone}/${index}`,
            proposition: `Insight : ${insight.title}. Affected sector : ${insight.affectedSector}.`,
            evidence: [evidence],
            grade: rubricGrade(RUBRIC_METHOD_LINE),
          }}
        >
          {insight.affectedSector}
        </AuditAnchor>
      </header>

      <p className="mt-3 text-sm font-semibold text-ink leading-snug">{insight.title}</p>
      <p className="mt-2 text-2xs text-ink-muted leading-relaxed">{insight.body}</p>
      {insight.bodyDetail && (
        <p className="mt-1.5 text-2xs text-ink-muted leading-relaxed">{insight.bodyDetail}</p>
      )}

      <div className="mt-4 rounded-sm border border-cyan/30 bg-cyan-tint/30 p-3">
        <div className="flex items-baseline gap-2">
          <Lightbulb className="h-3 w-3 text-accent shrink-0 translate-y-0.5" />
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
            Suggested action
          </p>
        </div>
        <p className="mt-1 text-2xs text-ink-soft leading-relaxed">{insight.suggestedAction}</p>
      </div>

      {insight.evidenceCompanies.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded-sm"
          >
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
              aria-hidden
            />
            {open ? "Hide evidence" : `Evidence (${insight.evidenceCompanies.length})`}
          </button>
          {open && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {insight.evidenceCompanies.map((id) => (
                <li key={id}>
                  <AuditAnchor
                    as="div"
                    className="inline-flex"
                    anchor={{
                      id: `insight/${zone.zone}/${index}/evidence/${id}`,
                      proposition: `Evidence company supporting "${insight.title}" : ${id}.`,
                      evidence: [evidence],
                      grade: rubricGrade(RUBRIC_METHOD_LINE),
                    }}
                  >
                    <Link
                      href={`/atlas/company/${id}`}
                      className="inline-flex items-center rounded-full border border-line bg-surface-soft px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.18em] text-ink-soft hover:border-accent/40 hover:text-accent transition-colors"
                    >
                      {id}
                    </Link>
                  </AuditAnchor>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
