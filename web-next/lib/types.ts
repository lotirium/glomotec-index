// Domain types for INDEX advisor preview.
// These mirror the canonical schema used by the SCORER + EXTRACTOR.

export type Stage = "eligibility" | "validity" | "suitability" | "decision" | "post_decision";
export type Modality = "mandatory" | "discretionary";
export type Mechanism =
  | "binary_pass"
  | "compound_threshold"
  | "evidential_test"
  | "discretionary_assessment";
export type Band = "high" | "medium" | "low" | "below_threshold";

// ---------- Routes ----------
export interface Route {
  id: string;
  name: string;
  document_url: string;
  document_version: string;
  enabled: boolean;
  criteria_count: number;
  polling_cadence_days: number;
  last_refreshed: string; // ISO
}

// ---------- Criteria ----------
export type CriterionCategory = "substantive" | "procedural" | "suitability";

export interface Criterion {
  id: string;
  route: string;
  decision_stage: Stage;
  modality: Modality;
  assessment_mechanism: Mechanism;
  category: CriterionCategory;
  predicate: { statement: string };
  burden_allocation?: Record<string, string[]>;
  source: {
    document_url: string;
    document_version: string;
    section_heading?: string;
    anchor?: { section_heading?: string; verbatim_text?: string };
  };
  inputs?: string[];
  lifecycle?: {
    version_first_seen?: string;
    last_modified_in_version?: string;
    last_change_class?: string;
  };
}

// ---------- Client profile ----------
export interface ClientProfile {
  slug: string;
  candidate_id: string;
  full_name: string;
  nationality: string;
  intended_route: string;
  // Application stage as an advisor would describe it
  stage: "endorsement_sought" | "endorsement_received" | "filed" | "under_review" | "extension";
  filed_on?: string; // ISO
  endorsement: {
    endorsing_body?: string | null;
    endorsement_path?: "new_business" | "same_business" | null;
    letter_issued_date?: string | null;
    letter_received_application_date?: string | null;
    withdrawn?: boolean;
    endorsement_letter_states_innovative_viable_scalable?: boolean;
    endorsement_letter_describes_how_requirements_met?: boolean;
  };
  business: {
    stage?: "pre_launch" | "early" | "growth" | null;
    founded?: string | null;
    applicant_role?: string | null;
    applicant_active_in_day_to_day_management?: boolean;
    investment_to_date_gbp?: number | null;
    annual_revenue_gbp?: number | null;
    customers_count?: number | null;
    ip_filings?: number | null;
    full_time_jobs_for_settled_workers?: number | null;
  };
  english_language: {
    level?: "A2" | "B1" | "B2" | "C1" | "C2" | "native" | null;
    evidence_type?: string | null;
    score_overall?: number | null;
    test_date?: string | null;
  };
  finance: {
    personal_funds_gbp?: number | null;
    held_for_at_least_28_days?: boolean;
  };
  documents_in_english_or_welsh?: boolean;
  absences_from_uk_days_last_12_months?: number | null;
  suitability_concerns?: string | null;
  previous_visa_history?: Array<{ category?: string; from?: string; to?: string }>;
}

// ---------- Scoring result ----------
export interface ScoringResult {
  criterion_id: string;
  probability_meets: number;
  confidence_level: Band;
  supporting_evidence: Array<{ field: string; value?: unknown; matches?: string }>;
  missing_inputs: string[];
  reasoning: string;
  scored_at: string;
  model_version: string;
  sanity_check_flags?: Array<{ field: string; reason: string }>;
  // Convenience derivations attached at fixture-build time
  criterion?: Pick<
    Criterion,
    | "id"
    | "decision_stage"
    | "modality"
    | "assessment_mechanism"
    | "predicate"
    | "source"
    | "burden_allocation"
    | "category"
  > & { predicate_statement?: string; section_heading?: string; verbatim_text?: string };
  error?: string;
}

export interface AssessmentRun {
  client_slug: string;
  route_id: string;
  scored_at: string;
  total: number;
  cached: number;
  cold: number;
  results: ScoringResult[];
  summary: { high: number; medium: number; low: number; below_threshold: number; error: number };
  overall_pct: number;
  /** Average probability for `substantive` criteria, expressed 0–100. */
  substantive_pct: number;
  /** Average probability for `procedural` criteria, expressed 0–100. */
  submission_pct: number;
  /**
   * Average probability for `suitability` criteria, expressed 0–100. Null when
   * the route has no suitability criteria. Suitability is a hard gate: when
   * this score is below 50, the verdict headline is overridden to "Refusal
   * risk identified" regardless of substantive and procedural readiness.
   */
  suitability_pct: number | null;
  /** Counts split by category, useful for the verdict-hero readout. */
  category_summary: {
    substantive: { count: number; high: number; medium: number; low: number; below_threshold: number };
    procedural: { count: number; high: number; medium: number; low: number; below_threshold: number };
    suitability: { count: number; high: number; medium: number; low: number; below_threshold: number };
  };
  verdict_class: "high" | "medium" | "low";
  verdict_headline: string;
}

// ---------- Changefeed ----------
export type ChangeKind =
  | "criterion_added"
  | "criterion_amended"
  | "criterion_removed"
  | "threshold_changed"
  | "evidence_requirement_changed"
  | "guidance_clarified"
  | "form_updated";

export interface ChangefeedEntry {
  id: string;
  observed_at: string; // ISO
  route_id: string;
  document_version_before?: string;
  document_version_after: string;
  kind: ChangeKind;
  headline: string;
  summary: string;
  affected_criterion_ids: string[];
  source_url: string;
  diff_excerpt?: { before?: string; after?: string };
  /**
   * What the team should do with this change. operational_disruption =
   * immediate action required by operations; could materially change how
   * teams process or structure cases. advisory = helpful but non-urgent;
   * may affect advice quality or strategy. informational = good to know,
   * minimal immediate consequence.
   */
  advisor_impact: "operational_disruption" | "advisory" | "informational";
}

// ---------- Pipeline status ----------
export interface ModuleStatus {
  id: "crawler" | "extractor" | "scorer" | "changefeed" | "evaluator";
  name: string;
  status: "live" | "idle" | "error";
  last_run?: string; // ISO
  detail?: string;
}
