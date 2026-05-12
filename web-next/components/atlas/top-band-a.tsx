"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AuditAnchor } from "@/components/atlas/audit-anchor";
import { companyEvidence, rubricGrade, RUBRIC_METHOD_LINE } from "@/components/atlas/audit-helpers";
import type { AtlasCompany } from "@/lib/atlas/types";
import type { ZoneSummary } from "@/lib/atlas/data";

interface Props {
  zone: ZoneSummary;
  companies: AtlasCompany[];
}

export function TopBandA({ zone, companies }: Props) {
  if (!companies.length) {
    return (
      <div className="rounded-md border border-line p-6 text-2xs text-ink-muted">
        No Band A entities in {zone.zone} on the current rubric pass.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line/60 overflow-hidden rounded-md border border-line">
      {companies.map((c, i) => (
        <li key={c.id}>
          <Link
            href={`/atlas/company/${c.id}`}
            className="group flex items-center gap-4 bg-surface px-4 py-3 transition-colors hover:bg-surface-soft"
          >
            <span className="w-6 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint tabular">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{c.name}</p>
              <p className="mt-0.5 text-2xs text-ink-muted truncate">
                {c.sector}
                <span aria-hidden className="mx-1.5 text-ink-faint">·</span>
                {c.subSector}
              </p>
            </div>
            <AuditAnchor
              className="hidden md:inline-flex items-center gap-2 px-2 py-1"
              anchor={{
                id: `topA/${zone.zone}/${c.id}/pillars`,
                proposition: `${c.name} pillar scores : Innovation ${c.grading.innovation}, Viability ${c.grading.viability}, Scalability ${c.grading.scalability}.`,
                evidence: [companyEvidence(c)],
                grade: rubricGrade(RUBRIC_METHOD_LINE),
              }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                I {c.grading.innovation}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                V {c.grading.viability}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                S {c.grading.scalability}
              </span>
            </AuditAnchor>
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan/30 bg-cyan-tint px-2.5 py-0.5 text-2xs font-medium text-accent">
              Band A
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-ink-faint transition-colors group-hover:text-ink" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
