import { ExternalLink } from "lucide-react";
import type { ScoringResult, SourceTier } from "@/lib/types";
import { cn, pct } from "@/lib/utils";
import { TierBadge } from "@/components/scoring/tier-badge";

const FIELD_LABEL: Record<string, string> = {
  // Operator profile field provenance — translates the dotted JSON path on
  // ScoringResult.supporting_evidence[].field into a human label.
  nationality: "Nationality",
  intended_route: "Intended route",
  stage: "Application stage",
  filed_on: "Filed on",
  "endorsement.endorsing_body": "Endorsing body",
  "endorsement.letter_issued_date": "Endorsement letter date",
  "endorsement.endorsement_path": "Endorsement path",
  "endorsement.withdrawn": "Endorsement withdrawn",
  "endorsement.endorsement_letter_states_innovative_viable_scalable":
    "Endorsement letter states the three tests",
  "endorsement.endorsement_letter_describes_how_requirements_met":
    "Endorsement letter describes how requirements are met",
  "business.stage": "Business stage",
  "business.applicant_role": "Role in the business",
  "business.applicant_active_in_day_to_day_management":
    "Active in day-to-day management",
  "business.investment_to_date_gbp": "Investment to date",
  "business.annual_revenue_gbp": "Annual revenue",
  "business.customers_count": "Customers",
  "business.ip_filings": "IP filings",
  "business.full_time_jobs_for_settled_workers":
    "Full-time jobs for settled workers",
  "english_language.level": "English level",
  "english_language.evidence_type": "English evidence",
  "finance.personal_funds_gbp": "Personal funds",
  "finance.held_for_at_least_28_days": "Funds held 28 days",
  documents_in_english_or_welsh: "Documents in English or Welsh",
  absences_from_uk_days_last_12_months: "Absences (12 months)",
  suitability_concerns: "Suitability concerns",
  previous_visa_history: "Previous visa history",
};

const BAND_LABEL = {
  high: "High",
  medium: "Medium",
  low: "Low",
  below_threshold: "Below threshold",
} as const;

function fieldLabel(field: string): string {
  if (FIELD_LABEL[field]) return FIELD_LABEL[field];
  // Pasted-profile inputs surface as the bare key "profile". Render that
  // (and any other underscored fallback) as a human phrase rather than
  // leaking a snake_case schema name into the UI.
  if (field === "profile") return "Pasted profile narrative";
  return field
    .split(".")
    .map((segment) =>
      segment
        .split("_")
        .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
        .join(" "),
    )
    .join(" · ");
}

export function CitationChain({ result }: { result: ScoringResult }) {
  const c = result.criterion;
  // All 19 currently-indexed criteria are gov.uk caseworker guidance (T1).
  // Once the extractor surfaces tier on the criterion, this falls through.
  const tier: SourceTier = (c as { tier?: SourceTier } | undefined)?.tier ?? "T1";
  const verbatim = c?.verbatim_text ?? c?.predicate_statement ?? c?.predicate?.statement;
  const documentVersion = c?.source.document_version;
  const sectionHeading = c?.source.section_heading ?? c?.section_heading;
  const documentName =
    (c?.source as { document_name?: string } | undefined)?.document_name ??
    "Innovator Founder caseworker guidance";
  const evidence = result.supporting_evidence ?? [];
  const flags = result.sanity_check_flags ?? [];

  return (
    <div className="mt-3 space-y-3 border-l-2 border-line pl-4">
      {/* RULE */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-kicker uppercase text-ink-faint">Rule</p>
          <TierBadge tier={tier} />
        </div>
        {verbatim && (
          <p className="text-sm italic text-ink leading-relaxed">
            &ldquo;{verbatim}&rdquo;
          </p>
        )}
        <p className="text-2xs text-ink-muted leading-relaxed">
          {documentName}
          {documentVersion ? ` · ${documentVersion}` : ""}
          {sectionHeading ? ` · ${sectionHeading}` : ""}
          {c?.source.document_url && (
            <>
              {" · "}
              <a
                href={c.source.document_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                source
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </p>
      </div>

      {/* FACTS */}
      <div className="space-y-1.5">
        <p className="text-kicker uppercase text-ink-faint">Facts</p>
        {evidence.length > 0 ? (
          <ul className="space-y-1">
            {evidence.map((e, i) => (
              <li key={i} className="text-sm text-ink leading-relaxed">
                {e.matches ? (
                  <span>{e.matches}</span>
                ) : (
                  <span>
                    <span className="font-medium">{fieldLabel(e.field)}:</span>{" "}
                    <span className="text-ink-soft">{String(e.value)}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted leading-relaxed">
            No evidence on file for this criterion yet.
          </p>
        )}
        {evidence.length > 0 && (
          <p className="text-2xs text-ink-muted leading-relaxed">
            From operator profile
            {evidence.some((e) => e.field)
              ? `: ${Array.from(
                  new Set(
                    evidence
                      .map((e) => fieldLabel(e.field))
                      .filter((s) => s && s.length > 0),
                  ),
                ).join(" · ")}`
              : ""}
          </p>
        )}
      </div>

      {/* MATCH */}
      <div className="space-y-1.5">
        <p className="text-kicker uppercase text-ink-faint">Match</p>
        <p className="text-sm text-ink leading-relaxed">
          <span className="font-semibold tabular">
            {pct(result.probability_meets)}%
          </span>
          <span className="text-ink-muted">
            {" · "}
            {BAND_LABEL[result.confidence_level]} band
          </span>
          {result.reasoning ? (
            <span className="text-ink-soft">. {result.reasoning}</span>
          ) : null}
        </p>
        {flags.length > 0 && (
          <ul className={cn("text-2xs text-ink-muted leading-relaxed space-y-0.5")}>
            {flags.map((f, i) => (
              <li key={i}>
                <span className="font-medium text-ink-soft">{fieldLabel(f.field)}:</span>{" "}
                {f.reason}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
