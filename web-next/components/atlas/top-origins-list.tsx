"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  useAuditTrail,
  type AuditEvidence,
  type AuditFocus,
} from "@/components/atlas/audit-context";
import { rubricGrade, RUBRIC_METHOD_LINE } from "@/components/atlas/audit-helpers";
import { flagEmoji } from "@/lib/atlas/country-centroids";
import type { OriginCountry } from "@/lib/atlas/types";

interface Props {
  countries: OriginCountry[];
  evidence: AuditEvidence;
  onSelect: (iso2: string) => void;
  focusedIso2: string | null;
}

export function TopOriginsList({ countries, evidence, onSelect, focusedIso2 }: Props) {
  const { hover, pin, pinned } = useAuditTrail();
  const top = countries.filter((c) => c.band_a_count > 0).slice(0, 8);
  const max = top.length ? top[0].band_a_count : 1;

  if (!top.length) {
    return (
      <div className="rounded-md border border-line bg-surface p-5 text-2xs text-ink-muted">
        No Band A origins in this sample.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-surface p-5">
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
        Top origins
      </p>
      <p className="mt-1 text-h2 font-bold tracking-tight text-ink">
        Where Band A comes from.
      </p>
      <ul className="mt-5 space-y-1">
        {top.map((c, i) => {
          const focused = c.iso2 === focusedIso2;
          const sectorTop = Object.entries(c.sector_breakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([s, n]) => `${s} ${n}`)
            .join(" · ");
          const focus: AuditFocus = {
            id: `origin/${c.iso2}`,
            proposition: `${c.country_name} : ${c.band_a_count} Band A ${
              c.band_a_count === 1 ? "entity" : "entities"
            }, average composite ${c.avg_composite}${
              sectorTop ? `, ${sectorTop.toLowerCase()}` : ""
            }.`,
            evidence: [evidence],
            grade: rubricGrade(RUBRIC_METHOD_LINE),
          };
          const isPinned = pinned?.id === focus.id;
          return (
            <li key={c.iso2}>
              <button
                type="button"
                onMouseEnter={() => hover(focus)}
                onMouseLeave={() => hover(null)}
                onFocus={() => hover(focus)}
                onBlur={() => hover(null)}
                onClick={(e) => {
                  // Shift-click pins without panning; bare click pans + pins.
                  if (e.shiftKey) {
                    pin(focus);
                  } else {
                    pin(focus);
                    onSelect(c.iso2);
                  }
                }}
                className={cn(
                  "group grid w-full grid-cols-[24px_20px_1fr_auto] items-center gap-3 rounded-sm px-3 py-2.5 text-left transition-colors",
                  "hover:bg-cyan-tint/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
                  isPinned && "bg-cyan-tint/70 ring-1 ring-cyan/40",
                  focused && !isPinned && "ring-1 ring-cyan/30",
                )}
              >
                <span className="font-mono text-2xs tabular text-ink-faint">
                  {(i + 1).toString().padStart(2, "0")}
                </span>
                <span aria-hidden className="text-base leading-none">
                  {flagEmoji(c.iso2)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {c.country_name}
                  </span>
                  {sectorTop && (
                    <span className="block truncate text-[10px] font-mono uppercase tracking-[0.18em] text-ink-faint">
                      {sectorTop}
                    </span>
                  )}
                </span>
                <span className="font-mono text-sm font-bold tabular text-accent">
                  {c.band_a_count}
                </span>
                <div className="col-span-4 mt-1 h-1 overflow-hidden rounded-full bg-line-soft">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan to-accent"
                    style={{ width: `${(c.band_a_count / max) * 100}%` }}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
