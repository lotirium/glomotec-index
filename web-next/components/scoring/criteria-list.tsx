"use client";

import * as React from "react";
import type { Criterion, ScoringResult } from "@/lib/types";
import { CriterionRow } from "./criterion-row";
import { CriterionSkeleton } from "./criterion-skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "high" | "medium" | "low" | "below_threshold";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
  { key: "below_threshold", label: "Below threshold" },
];

const EMPTY_BY_FILTER: Record<FilterKey, { title: string; body: string }> = {
  all: {
    title: "Nothing scored yet.",
    body: "The scorer hasn't returned any results for this client.",
  },
  high: {
    title: "No criteria in the High band.",
    body: "Nothing on this file currently reads as a clean recommend-submission decision.",
  },
  medium: {
    title: "No criteria in the Medium band.",
    body: "Nothing on this file currently sits at the advisor-review threshold.",
  },
  low: {
    title: "No criteria in the Low band.",
    body: "Nothing currently calls for further evidence — switch to High or Medium for the headline criteria.",
  },
  below_threshold: {
    title: "No criteria below threshold.",
    body: "Nothing on this file currently reads as do-not-submit.",
  },
};

interface Props {
  results: ScoringResult[];
  /**
   * When provided, the list renders one row per criterion in this order;
   * unscored criteria render as skeleton rows. This is used during streamed
   * scoring so the advisor sees what's coming, not just an empty list.
   */
  criteriaOrder?: Criterion[];
  /** When true, the header band-counts include un-scored criteria as blank. */
  scoring?: boolean;
}

export function CriteriaList({ results, criteriaOrder, scoring = false }: Props) {
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const resultById = React.useMemo(
    () => new Map(results.map((r) => [r.criterion_id, r])),
    [results],
  );

  // Render order: criteriaOrder when streaming, otherwise the result order.
  const renderOrder: Array<{ result?: ScoringResult; criterion?: Criterion; id: string }> =
    criteriaOrder
      ? criteriaOrder.map((c) => ({ id: c.id, result: resultById.get(c.id), criterion: c }))
      : results.map((r) => ({ id: r.criterion_id, result: r }));

  const counts = React.useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: criteriaOrder?.length ?? results.length,
      high: 0,
      medium: 0,
      low: 0,
      below_threshold: 0,
    };
    for (const r of results) c[r.confidence_level] = (c[r.confidence_level] ?? 0) + 1;
    return c;
  }, [results, criteriaOrder]);

  const filtered = renderOrder.filter((row) => {
    if (filter === "all") return true;
    return row.result?.confidence_level === filter;
  });

  const allRowsAreSkeletons =
    filtered.length > 0 && filtered.every((row) => !row.result);

  return (
    <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.key} value={f.key} className="gap-2">
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-2xs tabular leading-none",
                  filter === f.key
                    ? "bg-line text-ink-soft"
                    : "bg-line-soft text-ink-faint",
                )}
              >
                {counts[f.key]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        <p className="text-2xs text-ink-faint">
          {scoring && filter === "all"
            ? `${results.length} of ${counts.all} scored`
            : `${filtered.length} shown`}
        </p>
      </div>

      <TabsContent value={filter} className="mt-4">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface-soft/60 p-10 text-center">
            <p className="text-sm font-semibold text-ink">
              {EMPTY_BY_FILTER[filter].title}
            </p>
            <p className="mt-1 text-2xs text-ink-muted">
              {EMPTY_BY_FILTER[filter].body}
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-line/70 rounded-lg border border-line bg-surface shadow-soft">
            {filtered.map((row, i) => {
              if (row.result) {
                return (
                  <CriterionRow
                    key={row.id}
                    result={row.result}
                    index={
                      criteriaOrder
                        ? criteriaOrder.findIndex((c) => c.id === row.id)
                        : i
                    }
                  />
                );
              }
              return row.criterion ? (
                <CriterionSkeleton
                  key={row.id}
                  criterion={row.criterion}
                  index={
                    criteriaOrder
                      ? criteriaOrder.findIndex((c) => c.id === row.id)
                      : i
                  }
                />
              ) : null;
            })}
          </ol>
        )}
        {allRowsAreSkeletons && (
          <p className="mt-3 text-center text-2xs text-ink-faint">
            Scoring runs in parallel. Rows fill in as each call lands.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
