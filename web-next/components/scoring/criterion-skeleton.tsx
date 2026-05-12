import type { Criterion } from "@/lib/types";

const stageLabel: Record<string, string> = {
  eligibility: "Eligibility",
  validity: "Validity",
  suitability: "Suitability",
  decision: "Decision",
  post_decision: "Post-decision",
};

/**
 * A pending row shown while its scoring is in flight. The predicate is
 * already known (criteria are static) so the advisor sees what's being scored
 * underneath at 70% opacity. A semi-transparent gradient overlay sweeps
 * left-to-right across the row to read as "loading" rather than "data".
 */
export function CriterionSkeleton({
  criterion,
  index,
}: {
  criterion: Criterion;
  index: number;
}) {
  return (
    <li
      id={criterion.id}
      className="group relative scroll-mt-20 overflow-hidden px-5 py-5"
    >
      <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] items-start gap-x-5 gap-y-2 opacity-70">
        <span className="font-mono text-2xs text-ink-faint tabular pt-1">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-faint/40" aria-hidden />
            <span className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
              {stageLabel[criterion.decision_stage] ?? criterion.decision_stage}
            </span>
            <span aria-hidden className="text-ink-faint">
              ·
            </span>
            <span className="text-2xs text-ink-muted capitalize">
              {criterion.modality}
            </span>
            <span aria-hidden className="text-ink-faint">
              ·
            </span>
            <span className="text-2xs text-ink-muted">
              {criterion.category === "substantive" ? "Substantive" : "Procedural"}
            </span>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            {criterion.predicate.statement}
          </p>
        </div>

        <div className="hidden sm:block sm:min-w-[8.5rem]" aria-hidden />
      </div>

      <div
        aria-hidden
        className="shimmer-row pointer-events-none absolute inset-0"
      />
    </li>
  );
}
