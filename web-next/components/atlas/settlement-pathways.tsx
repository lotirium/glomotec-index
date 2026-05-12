"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AuditAnchor } from "@/components/atlas/audit-anchor";
import { rubricGrade } from "@/components/atlas/audit-helpers";
import type {
  AtlasCompany,
  SettlementJurisdiction,
  SettlementPathway,
} from "@/lib/atlas/types";

interface Props {
  company: AtlasCompany;
  pathways: SettlementPathway[];
}

const JURISDICTION_BORDER: Record<SettlementJurisdiction, string> = {
  UK: "#2B3E8F",
  US: "#00A2E9",
  Singapore: "#7C3AED",
  UAE: "#1A1A2E",
};

const JURISDICTION_FILL: Record<SettlementJurisdiction, string> = {
  UK: "linear-gradient(90deg, #2B3E8F, #00A2E9)",
  US: "linear-gradient(90deg, #00A2E9, #38bdf8)",
  Singapore: "linear-gradient(90deg, #7C3AED, #a78bfa)",
  UAE: "linear-gradient(90deg, #1A1A2E, #2B3E8F)",
};

const JURISDICTION_EVIDENCE: Record<
  SettlementJurisdiction,
  { authority: string; dataset: string }
> = {
  UK: {
    authority: "UK Home Office",
    dataset: "Caseworker guidance, Innovator Founder route § 7.2",
  },
  US: {
    authority: "USCIS",
    dataset: "Policy Manual, EB-1A extraordinary-ability criteria",
  },
  Singapore: {
    authority: "Singapore EDB",
    dataset: "Global Investor Programme, Option A renewal terms",
  },
  UAE: {
    authority: "ICP / MoHRE",
    dataset: "Golden Visa Founder track regulations",
  },
};

const PROB_COLOR = {
  high: "text-cyan",
  mid: "text-[#F59E0B]",
  low: "text-[#94A3B8]",
};

export function SettlementPathways({ company, pathways }: Props) {
  return (
    <article className="rounded-md border border-glacier bg-surface p-6">
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
        Settlement pathway probability
      </p>
      <h3 className="mt-1.5 text-[1.25rem] font-bold tracking-tight text-accent">
        Where could this entity unlock permanent settlement?
      </h3>
      <p className="mt-1 text-[13px] text-ink-muted">
        Probabilities project from current scores and assume continuation of
        trajectory.
      </p>

      <div className="mt-5 flex flex-col gap-3.5">
        {pathways.map((p) => (
          <PathwayCard key={p.jurisdiction} company={company} pathway={p} />
        ))}
      </div>
    </article>
  );
}

function PathwayCard({
  company,
  pathway,
}: {
  company: AtlasCompany;
  pathway: SettlementPathway;
}) {
  const border = JURISDICTION_BORDER[pathway.jurisdiction];
  const fill = JURISDICTION_FILL[pathway.jurisdiction];
  const evidenceMeta = JURISDICTION_EVIDENCE[pathway.jurisdiction];
  const active = pathway.active;

  return (
    <div
      className="rounded-[10px]"
      style={{ borderLeft: `4px solid ${border}` }}
    >
    <AuditAnchor
      as="div"
      className={cn(
        "block rounded-r-[10px] px-5 py-[18px] transition-transform duration-150",
        active
          ? "border border-cyan border-l-0 bg-surface shadow-[0_2px_8px_rgba(0,162,233,0.1)]"
          : "border border-transparent border-l-0 bg-glacier/30 hover:translate-x-1",
      )}
      anchor={{
        id: `company/${company.id}/pathway/${pathway.jurisdiction.toLowerCase()}`,
        proposition: `${pathway.name} : probability ${pathway.probability}%.`,
        evidence: [
          {
            authority: evidenceMeta.authority,
            dataset: evidenceMeta.dataset,
            lastUpdated: company.dataSource.lastUpdated,
            confidence: company.dataSource.confidence,
          },
        ],
        grade: rubricGrade(
          "Pathway probability derived from current rubric scores against the jurisdiction's published criteria.",
        ),
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-bold leading-tight tracking-[-0.2px] text-ink">
          {pathway.name}
        </span>
        <span
          className={cn(
            "text-[28px] font-extrabold leading-none tabular tracking-[-0.6px]",
            PROB_COLOR[pathway.probabilityClass],
          )}
        >
          {pathway.probability}%
        </span>
      </div>
      <p className="mt-2 text-[12px] text-slate">{pathway.meta}</p>
      <div className="mt-3 h-[6px] overflow-hidden rounded-[3px] bg-surface">
        <div
          className="h-full rounded-[3px] transition-[width] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ width: `${pathway.probability}%`, backgroundImage: fill }}
          aria-hidden
        />
      </div>
      <p className="mt-2 text-[11px] leading-[1.5] text-charcoal">
        {pathway.criteria.map((seg, i) =>
          seg.strong ? (
            <strong key={i} className="font-bold text-ink">
              {seg.text}
            </strong>
          ) : (
            <React.Fragment key={i}>{seg.text}</React.Fragment>
          ),
        )}
      </p>
    </AuditAnchor>
    </div>
  );
}
