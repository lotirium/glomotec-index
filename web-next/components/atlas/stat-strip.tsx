"use client";

import { AuditAnchor } from "@/components/atlas/audit-anchor";
import { aggregateEvidence, rubricGrade, RUBRIC_METHOD_LINE } from "@/components/atlas/audit-helpers";
import type { AtlasOverviewStats, ZoneSummary } from "@/lib/atlas/data";

interface Props {
  stats: AtlasOverviewStats;
  zones: ZoneSummary[];
}

function fmt(n: number): string {
  return n.toLocaleString("en-GB");
}

export function StatStrip({ stats, zones }: Props) {
  const evidence = aggregateEvidence(zones, stats.lastRefresh);

  const items = [
    {
      id: "stat-total",
      label: "Entities indexed",
      value: fmt(stats.totalCompanies),
      hint: "across four UAE free zones",
      proposition: `ATLAS preview sample covers ${fmt(stats.totalCompanies)} entities across DMCC, DIFC, ADGM, and JAFZA.`,
      method: "Aggregation only (count of entities across four fixture sets).",
    },
    {
      id: "stat-band-a",
      label: "Band A entities",
      value: fmt(stats.totalBandA),
      hint: "rubric-graded Strong",
      proposition: `${fmt(stats.totalBandA)} entities graded Band A across the four UAE free zones (rubric pass).`,
      method: RUBRIC_METHOD_LINE,
    },
    {
      id: "stat-fintech-ai",
      label: "Fintech and AI",
      value: `${stats.fintechAiGrowthPct}%`,
      hint: `registered 2024 onward (n=${stats.fintechAiTotal})`,
      proposition: `${stats.fintechAiGrowthPct}% of ${stats.fintechAiTotal} fintech and AI entities registered 2024 or later.`,
      method: "Recency share : count of entities with yearRegistered ≥ 2024 over fintech and AI total.",
    },
    {
      id: "stat-last-refresh",
      label: "Last refresh",
      value: stats.lastRefresh,
      hint: "across all sample fixtures",
      proposition: `Most recent dataset refresh across all four UAE fixtures : ${stats.lastRefresh}.`,
      method: "Aggregation only (max of lastUpdated across fixture rows).",
    },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <li key={item.id}>
          <AuditAnchor
            as="div"
            anchor={{
              id: item.id,
              proposition: item.proposition,
              evidence: [evidence],
              grade: rubricGrade(item.method),
            }}
            className="block rounded-md border border-line bg-surface px-4 py-4 md:px-5"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
              {item.label}
            </p>
            <p className="mt-2 text-xl md:text-2xl font-semibold tracking-tight text-ink tabular">
              {item.value}
            </p>
            <p className="mt-0.5 text-2xs text-ink-muted">{item.hint}</p>
          </AuditAnchor>
        </li>
      ))}
    </ul>
  );
}
