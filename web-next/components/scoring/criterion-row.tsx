import { ExternalLink } from "lucide-react";
import type { ScoringResult } from "@/lib/types";
import { cn, pct } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const bandTone = {
  high: {
    dot: "bg-band-high-fg",
    band: "High",
    action: "Recommend submission",
    badge: "high" as const,
  },
  medium: {
    dot: "bg-band-medium-fg",
    band: "Medium",
    action: "Advisor review",
    badge: "medium" as const,
  },
  low: {
    dot: "bg-band-low-fg",
    band: "Low",
    action: "Further evidence",
    badge: "low" as const,
  },
  below_threshold: {
    dot: "bg-band-below-fg",
    band: "Below threshold",
    action: "Do not submit",
    badge: "below" as const,
  },
};

const stageLabel: Record<string, string> = {
  eligibility: "Eligibility",
  validity: "Validity",
  suitability: "Suitability",
  decision: "Decision",
  post_decision: "Post-decision",
};

const actorLabel: Record<string, string> = {
  applicant: "Applicant",
  endorsing_body: "Endorsing body",
  sponsor: "Sponsor",
  caseworker: "Caseworker",
};

export function CriterionRow({ result, index }: { result: ScoringResult; index: number }) {
  const tone = bandTone[result.confidence_level];
  const c = result.criterion;
  const burdenActors = c?.burden_allocation ? Object.keys(c.burden_allocation) : [];
  return (
    <li
      id={result.criterion_id}
      className="group relative scroll-mt-20 px-5 py-5 transition-colors hover:bg-surface-soft/60 animate-result-arrive"
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-x-5 gap-y-2">
        <span className="font-mono text-2xs text-ink-faint tabular pt-1">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} aria-hidden />
            <span className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
              {c?.decision_stage ? stageLabel[c.decision_stage] ?? c.decision_stage : "—"}
            </span>
            <span aria-hidden className="text-ink-faint">·</span>
            <span className="text-2xs text-ink-muted capitalize">
              {c?.modality ?? "—"}
            </span>
          </div>
          <p className="text-sm text-ink leading-relaxed">
            {c?.predicate?.statement ?? result.criterion_id}
          </p>

          {burdenActors.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Burden
              </span>
              {burdenActors.map((actor) => (
                <span
                  key={actor}
                  className="inline-flex items-center rounded-full border border-line bg-surface-soft px-2 py-0.5 text-2xs text-ink-soft"
                >
                  {actorLabel[actor] ?? actor}
                </span>
              ))}
            </div>
          )}

          {result.supporting_evidence?.length > 0 && (
            <div className="mt-1.5 space-y-1.5">
              {result.supporting_evidence.slice(0, 3).map((e, i) => (
                <p
                  key={i}
                  className="text-2xs text-ink-muted leading-relaxed"
                >
                  <span className="font-mono text-ink-faint mr-1.5">→</span>
                  {e.matches}
                </p>
              ))}
            </div>
          )}

          {result.missing_inputs?.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Outstanding
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.missing_inputs.slice(0, 4).map((m, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full border border-band-low-fg/15 bg-band-low-bg/60 px-2 py-0.5 text-2xs text-band-low-fg"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          <details className="group/details mt-2">
            <summary className="cursor-pointer list-none text-2xs text-ink-faint transition-colors hover:text-ink-muted [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                <span className="font-mono uppercase tracking-[0.18em]">Reasoning</span>
                <span className="opacity-60 group-open/details:rotate-180 transition-transform" aria-hidden>
                  ▾
                </span>
              </span>
            </summary>
            <p className="mt-2 text-2xs text-ink-muted leading-relaxed border-l border-line pl-3">
              {result.reasoning}
            </p>
            {c?.verbatim_text && (
              <a
                href={c.source.document_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-2xs text-accent-deep hover:underline"
              >
                Source · {c.source.document_version}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </details>
        </div>

        <div className="flex flex-col items-end gap-1.5 pt-0.5 min-w-[8.5rem]">
          <span className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
            {tone.band}
          </span>
          <span className="text-xl font-semibold text-ink tabular leading-none">
            {pct(result.probability_meets)}%
          </span>
          <Badge tone={tone.badge}>{tone.action}</Badge>
        </div>
      </div>
    </li>
  );
}
