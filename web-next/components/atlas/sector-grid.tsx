"use client";

import { BandBar } from "@/components/atlas/band-bar";
import { AuditAnchor } from "@/components/atlas/audit-anchor";
import { rubricGrade, RUBRIC_METHOD_LINE, zoneEvidence } from "@/components/atlas/audit-helpers";
import type { SectorSummary } from "@/lib/atlas/types";
import type { ZoneSummary } from "@/lib/atlas/data";

interface Props {
  zone: ZoneSummary;
  sectors: SectorSummary[];
}

export function SectorGrid({ zone, sectors }: Props) {
  const evidence = zoneEvidence(zone);
  return (
    <div className="overflow-hidden rounded-md border border-line">
      <div className="grid grid-cols-[1.6fr_0.6fr_2fr_0.4fr_0.4fr_0.4fr_0.4fr] gap-3 border-b border-line bg-surface-soft px-4 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-ink-faint">
        <span>Sector</span>
        <span className="text-right">Total</span>
        <span>Distribution</span>
        <span className="text-right">A</span>
        <span className="text-right">B</span>
        <span className="text-right">C</span>
        <span className="text-right">D</span>
      </div>
      <ul>
        {sectors.map((s) => (
          <li
            key={s.sector}
            className="grid grid-cols-[1.6fr_0.6fr_2fr_0.4fr_0.4fr_0.4fr_0.4fr] items-center gap-3 border-b border-line/60 px-4 py-3 text-2xs last:border-b-0 hover:bg-surface-soft/60"
          >
            <span className="truncate text-sm text-ink">{s.sector}</span>
            <AuditAnchor
              className="text-right tabular text-ink"
              anchor={{
                id: `sector/${zone.zone}/${s.sector}/total`,
                proposition: `${zone.zone} ${s.sector} sector : ${s.total} registered entities.`,
                evidence: [evidence],
                grade: rubricGrade("Aggregation only (count of entities in sector)."),
              }}
            >
              {s.total}
            </AuditAnchor>
            <AuditAnchor
              as="div"
              className="block"
              anchor={{
                id: `sector/${zone.zone}/${s.sector}/distribution`,
                proposition: `${zone.zone} ${s.sector} rubric mix : A ${s.byBand.A}, B ${s.byBand.B}, C ${s.byBand.C}, D ${s.byBand.D}.`,
                evidence: [evidence],
                grade: rubricGrade(RUBRIC_METHOD_LINE),
              }}
            >
              <BandBar
                counts={s.byBand}
                total={s.total}
                height="md"
                label={`${s.sector} band distribution`}
              />
            </AuditAnchor>
            <AuditAnchor
              className="text-right tabular text-cyan"
              anchor={{
                id: `sector/${zone.zone}/${s.sector}/band-A`,
                proposition: `${zone.zone} ${s.sector} : ${s.byBand.A} Band A entities.`,
                evidence: [evidence],
                grade: rubricGrade(RUBRIC_METHOD_LINE),
              }}
            >
              {s.byBand.A}
            </AuditAnchor>
            <AuditAnchor
              className="text-right tabular text-accent"
              anchor={{
                id: `sector/${zone.zone}/${s.sector}/band-B`,
                proposition: `${zone.zone} ${s.sector} : ${s.byBand.B} Band B entities.`,
                evidence: [evidence],
                grade: rubricGrade(RUBRIC_METHOD_LINE),
              }}
            >
              {s.byBand.B}
            </AuditAnchor>
            <AuditAnchor
              className="text-right tabular text-frost"
              anchor={{
                id: `sector/${zone.zone}/${s.sector}/band-C`,
                proposition: `${zone.zone} ${s.sector} : ${s.byBand.C} Band C entities.`,
                evidence: [evidence],
                grade: rubricGrade(RUBRIC_METHOD_LINE),
              }}
            >
              {s.byBand.C}
            </AuditAnchor>
            <AuditAnchor
              className="text-right tabular text-charcoal"
              anchor={{
                id: `sector/${zone.zone}/${s.sector}/band-D`,
                proposition: `${zone.zone} ${s.sector} : ${s.byBand.D} Below threshold entities.`,
                evidence: [evidence],
                grade: rubricGrade(RUBRIC_METHOD_LINE),
              }}
            >
              {s.byBand.D}
            </AuditAnchor>
          </li>
        ))}
      </ul>
    </div>
  );
}
