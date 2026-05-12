import type { ScoringResult } from "@/lib/types";
import type { StructuredOperatorProfile } from "@/lib/signal/operator-profile";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

/**
 * The structured profile the chat model emits via tool call once it has
 * collected enough information to qualify the prospect. Free-form fields
 * (no fixed enums) so the chat can capture whatever the user actually said.
 */
export interface ProspectProfile {
  nationality?: string;
  age?: string;
  current_visa_status?: string;
  education?: string;
  business_stage?: string;
  funding?: string;
  endorsement_status?: string;
  english_proficiency?: string;
  prior_immigration_history?: string;
  narrative_summary: string;
}

export type SignalVerdict =
  | "Strong fit"
  | "Likely fit"
  | "Worth exploring"
  | "Not a fit yet"
  | "Refusal risk identified";

export interface SignalQualification {
  /** Aggregate readiness for substantive criteria, 0–100. Cap rule applied. */
  substantive_pct: number;
  /** SIGNAL never measures procedural readiness; always null. */
  procedural_pct: null;
  /**
   * Aggregate readiness for suitability criteria, 0–100. Cap rule applied.
   * Null when the route has no suitability criteria. When non-null and
   * below 50, the verdict is forced to "Refusal risk identified".
   */
  suitability_pct: number | null;
  verdict_class: "high" | "medium" | "low";
  verdict_headline: SignalVerdict;
  /** 2–3 sentence plain-language explanation. */
  explanation: string;
  /** 1–3 gaps named in plain English. No schema fields. No criterion ids. */
  gaps: string[];
  /**
   * Suitability findings (Part Suitability flags) named in plain English.
   * Surfaced first in the qualification card because suitability gaps often
   * kill a case even when route fit is strong.
   */
  suitability_flags: string[];
  next_step: string;
  results: ScoringResult[];
  scored_at: string;
  wall_ms: number;
}

export interface SignalQuotaFallback {
  status: "fallback_quota";
  headline: string;
  body: string;
}

export interface SignalSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  /**
   * The five-field structured profile collected at /signal/start before the
   * chat begins. Sent with each chat turn as system context so the model asks
   * targeted follow-ups instead of starting from zero. Null for legacy
   * sessions created before profile-first onboarding shipped.
   */
  structuredProfile: StructuredOperatorProfile | null;
  /** Profile emitted by the chat once it has enough to qualify. */
  profile: ProspectProfile | null;
  /** Result of the qualify step. Null until the chat completes intake. */
  qualification: SignalQualification | null;
  /**
   * Set when the qualify step returned the friendly quota-fallback envelope
   * instead of a real qualification. Persisted so refresh keeps the calm
   * card visible.
   */
  qualifyFallback: SignalQuotaFallback | null;
  /** Per-session error from chat or qualify. */
  error: string | null;
}
