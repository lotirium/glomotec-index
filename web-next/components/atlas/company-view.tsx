"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  DollarSign,
  ExternalLink,
  FileCheck,
  Newspaper,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuditTrailProvider, type PageAudit } from "@/components/atlas/audit-context";
import { AuditSidebar } from "@/components/atlas/audit-sidebar";
import { AuditAnchor } from "@/components/atlas/audit-anchor";
import {
  companyEvidence,
  rubricGrade,
  RUBRIC_METHOD_LINE,
} from "@/components/atlas/audit-helpers";
import { describeBand } from "@/lib/atlas/rubric";
import type { AtlasCompany, AtlasEvidence } from "@/lib/atlas/types";

const EVIDENCE_ICON: Record<AtlasEvidence["type"], LucideIcon> = {
  ip: Award,
  funding: DollarSign,
  team: Users,
  filing: FileCheck,
  press: Newspaper,
};

const EVIDENCE_LABEL: Record<AtlasEvidence["type"], string> = {
  ip: "Intellectual property",
  funding: "Funding round",
  team: "Team and headcount",
  filing: "Authority filing",
  press: "Trade press",
};

function relevanceFor(e: AtlasEvidence, c: AtlasCompany): string {
  switch (e.type) {
    case "ip":
      return `Anchors the Innovation pillar : evidences protected differentiation in ${c.subSector}.`;
    case "funding":
      return `Anchors the Viability pillar : market validation through committed capital.`;
    case "team":
      return `Anchors the Scalability pillar : operational headcount supporting growth capacity.`;
    case "filing":
      return `Anchors data lineage : registration confirms entity status with ${e.source}.`;
    case "press":
      return `Supporting signal : public coverage of ${c.sector.toLowerCase()} activity.`;
  }
}

interface Props {
  company: AtlasCompany;
  basePageAudit: Omit<PageAudit, "jurisdiction">;
}

export function CompanyView({ company, basePageAudit }: Props) {
  const band = describeBand(company.grading.band);
  const evidence = companyEvidence(company);
  const composite =
    company.grading.innovation * 0.5 +
    company.grading.viability * 0.25 +
    company.grading.scalability * 0.25;

  const pageAudit: PageAudit = React.useMemo(
    () => ({
      ...basePageAudit,
      jurisdiction: company.zone
        ? `${company.jurisdiction} · ${company.zone}`
        : company.jurisdiction,
      subject: company.name,
    }),
    [basePageAudit, company],
  );

  return (
    <AuditTrailProvider pageAudit={pageAudit}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_19rem] lg:gap-10">
        <div className="min-w-0 space-y-12">
          {/* PILLARS + BAND */}
          <section
            aria-labelledby="grading-heading"
            className="rounded-lg border border-line bg-surface p-6 md:p-8"
          >
            <header className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                  Three-pillar grading
                </p>
                <h2
                  id="grading-heading"
                  className="mt-1 text-h2 font-bold tracking-tight text-ink"
                >
                  Pillars and band.
                </h2>
              </div>
              <AuditAnchor
                as="div"
                className="inline-flex w-fit"
                anchor={{
                  id: `company/${company.id}/band`,
                  proposition: `${company.name} graded Band ${band.band} (${band.label}). Composite ${Math.round(composite)} / 100.`,
                  evidence: [evidence],
                  grade: rubricGrade(RUBRIC_METHOD_LINE),
                }}
              >
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-2xs font-medium",
                    band.band === "A" && "border-cyan/40 bg-cyan-tint text-accent",
                    band.band === "B" && "border-accent/30 bg-accent-tint text-accent-deep",
                    band.band === "C" && "border-frost/40 bg-glacier/40 text-accent-deep",
                    band.band === "D" && "border-charcoal/30 bg-band-below-bg text-band-below-fg",
                  )}
                >
                  <span className="font-mono uppercase tracking-[0.18em]">
                    Band {band.band}
                  </span>
                  <span className="opacity-50">·</span>
                  <span>{band.label}</span>
                </span>
              </AuditAnchor>
            </header>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <PillarColumn
                companyId={company.id}
                companyName={company.name}
                evidence={evidence}
                pillar="Innovation"
                pct={company.grading.innovation}
                weight="50% weight"
                note="Differentiation versus the prevailing approach."
              />
              <PillarColumn
                companyId={company.id}
                companyName={company.name}
                evidence={evidence}
                pillar="Viability"
                pct={company.grading.viability}
                weight="25% weight"
                note="Plausibility of sustained operation."
              />
              <PillarColumn
                companyId={company.id}
                companyName={company.name}
                evidence={evidence}
                pillar="Scalability"
                pct={company.grading.scalability}
                weight="25% weight"
                note="Capacity to expand without proportional input growth."
              />
            </div>

            <p className="mt-8 max-w-2xl text-sm text-ink-muted leading-relaxed">
              {band.description}
            </p>
          </section>

          {/* EVIDENCE */}
          <section aria-labelledby="evidence-heading" className="space-y-5">
            <header>
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Evidence trail
              </p>
              <h2
                id="evidence-heading"
                className="mt-1 text-h2 font-bold tracking-tight text-ink"
              >
                What this grading rests on.
              </h2>
            </header>
            <ul className="overflow-hidden rounded-md border border-line divide-y divide-line/60 bg-surface">
              {company.grading.evidence.map((e, i) => {
                const Icon = EVIDENCE_ICON[e.type];
                return (
                  <li key={i}>
                    <AuditAnchor
                      as="div"
                      className="grid grid-cols-[auto_1fr_auto] items-start gap-4 px-5 py-4"
                      anchor={{
                        id: `company/${company.id}/evidence/${i}`,
                        proposition: `${company.name} : ${EVIDENCE_LABEL[e.type]} evidence (${e.source}).`,
                        evidence: [
                          {
                            authority: e.source,
                            dataset: `${EVIDENCE_LABEL[e.type]} record`,
                            publishedDate: e.date,
                            lastUpdated: e.date,
                            confidence: company.dataSource.confidence,
                          },
                        ],
                        grade: rubricGrade(
                          `Evidence anchor type : ${e.type}. ${relevanceFor(e, company)}`,
                        ),
                      }}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface-soft">
                        <Icon className="h-4 w-4 text-accent" />
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                            {EVIDENCE_LABEL[e.type]}
                          </span>
                          <span className="text-sm font-medium text-ink truncate">
                            {e.source}
                          </span>
                        </p>
                        <p className="mt-1 text-2xs text-ink-muted leading-relaxed">
                          {relevanceFor(e, company)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-center">
                        <span className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint tabular">
                          {e.date}
                        </span>
                        {e.url && (
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-ink-faint hover:text-accent"
                            aria-label="Open source"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </AuditAnchor>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* REASONING */}
          <section aria-labelledby="reasoning-heading" className="space-y-5">
            <header>
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Reasoning
              </p>
              <h2
                id="reasoning-heading"
                className="mt-1 text-h2 font-bold tracking-tight text-ink"
              >
                Why Band {band.band}.
              </h2>
            </header>
            <AuditAnchor
              as="div"
              className="block rounded-md border border-line bg-surface p-6"
              anchor={{
                id: `company/${company.id}/reasoning`,
                proposition: `${company.name} reasoning trace for Band ${band.band}.`,
                evidence: [evidence],
                grade: rubricGrade(RUBRIC_METHOD_LINE),
              }}
            >
              <p className="text-sm text-ink leading-relaxed">
                {company.grading.reasoning}
              </p>
              {company.grading.evidence.length > 0 && (
                <p className="mt-3 text-sm text-ink-muted leading-relaxed">
                  Grading draws on {company.grading.evidence.length} evidence record
                  {company.grading.evidence.length === 1 ? "" : "s"}, including{" "}
                  {company.grading.evidence.slice(0, 2).map((e, i, arr) => (
                    <React.Fragment key={i}>
                      <span className="text-ink">
                        “{e.source}” ({e.date})
                      </span>
                      {i < arr.length - 1 ? ", and " : ""}
                    </React.Fragment>
                  ))}
                  . Innovation {company.grading.innovation}, Viability{" "}
                  {company.grading.viability}, Scalability {company.grading.scalability}{" "}
                  compose to {Math.round(composite)} / 100.
                </p>
              )}
            </AuditAnchor>
          </section>

          {/* DATA SOURCE FOOTER */}
          <section aria-labelledby="data-source-heading" className="space-y-3">
            <h2
              id="data-source-heading"
              className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint"
            >
              Data lineage
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-md border border-line bg-surface p-5 text-2xs">
              <div>
                <dt className="font-mono uppercase tracking-[0.18em] text-ink-faint">
                  Authority
                </dt>
                <dd className="mt-0.5 text-ink">{company.dataSource.authority}</dd>
              </div>
              <div>
                <dt className="font-mono uppercase tracking-[0.18em] text-ink-faint">
                  Confidence
                </dt>
                <dd className="mt-0.5 text-ink">{company.dataSource.confidence}</dd>
              </div>
              <div>
                <dt className="font-mono uppercase tracking-[0.18em] text-ink-faint">
                  Last refresh
                </dt>
                <dd className="mt-0.5 text-ink tabular">{company.dataSource.lastUpdated}</dd>
              </div>
            </dl>
          </section>
        </div>

        <AuditSidebar />
      </div>
    </AuditTrailProvider>
  );
}

function PillarColumn({
  companyId,
  companyName,
  evidence,
  pillar,
  pct,
  weight,
  note,
}: {
  companyId: string;
  companyName: string;
  evidence: ReturnType<typeof companyEvidence>;
  pillar: "Innovation" | "Viability" | "Scalability";
  pct: number;
  weight: string;
  note: string;
}) {
  return (
    <AuditAnchor
      as="div"
      className="block rounded-md p-1"
      anchor={{
        id: `company/${companyId}/pillar/${pillar.toLowerCase()}`,
        proposition: `${companyName} ${pillar} score : ${pct} / 100 (${weight}).`,
        evidence: [evidence],
        grade: rubricGrade(
          `Pillar score sourced from the ATLAS scoring pass. ${weight} in the composite.`,
        ),
      }}
    >
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
        {pillar}
      </p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-tightest tabular text-ink leading-none md:text-5xl">
          {pct}
        </span>
        <span className="text-sm text-ink-muted font-medium tracking-tight">/100</span>
      </p>
      <p className="mt-1.5 text-2xs text-ink-muted">
        <span className="font-mono uppercase tracking-[0.18em] text-ink-faint">
          {weight}
        </span>
      </p>
      <p className="mt-1 text-2xs text-ink-faint leading-relaxed">{note}</p>
    </AuditAnchor>
  );
}
