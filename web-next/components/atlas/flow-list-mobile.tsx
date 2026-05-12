"use client";

import * as React from "react";
import {
  useAuditTrail,
  type AuditEvidence,
  type AuditFocus,
} from "@/components/atlas/audit-context";
import { rubricGrade } from "@/components/atlas/audit-helpers";
import {
  JURISDICTIONS,
  JURISDICTION_COLORS,
  type FramingMode,
} from "@/components/atlas/flow-sankey";
import type { FlowPair, FlowJurisdiction } from "@/lib/atlas/types";

interface Props {
  pairs: FlowPair[];
  framing: FramingMode;
  evidence: AuditEvidence;
}

export function FlowListMobile({ pairs, framing, evidence }: Props) {
  const { hover, pin, pinned } = useAuditTrail();
  const maxValue = Math.max(...pairs.map((p) => p.value), 1);

  function focusFor(p: FlowPair): AuditFocus {
    return {
      id: `flow/${p.from}-${p.to}`,
      proposition: `${p.from} → ${p.to} : ${p.value} applicants in the sample window.`,
      evidence: [evidence],
      grade: rubricGrade(
        "Cross-jurisdictional flow tracking via paired application records over a 400-applicant sample window.",
      ),
    };
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-line bg-cyan-tint/30 p-3 text-2xs text-ink-soft">
        View on a larger screen for the visual flow diagram. This list groups
        flows by source jurisdiction.
      </div>
      {JURISDICTIONS.map((src) => {
        const outgoing = pairs
          .filter((p) => p.from === src)
          .sort((a, b) => b.value - a.value);
        if (!outgoing.length) return null;
        return (
          <section key={src} className="rounded-md border border-line bg-surface p-4">
            <header className="flex items-baseline justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: JURISDICTION_COLORS[src as FlowJurisdiction] }}
                />
                <p className="font-mono text-2xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {src}
                </p>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] tabular text-ink-faint">
                {outgoing.reduce((s, p) => s + p.value, 0)} applicants
              </p>
            </header>
            <ul className="mt-3 space-y-2">
              {outgoing.map((p) => {
                const focus = focusFor(p);
                const isPinned = pinned?.id === focus.id;
                return (
                  <li key={`${p.from}-${p.to}`}>
                    <button
                      type="button"
                      onMouseEnter={() => hover(focus)}
                      onMouseLeave={() => hover(null)}
                      onFocus={() => hover(focus)}
                      onBlur={() => hover(null)}
                      onClick={() => pin(focus)}
                      className={
                        "grid w-full grid-cols-[60px_1fr_auto] items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors hover:bg-cyan-tint/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30" +
                        (isPinned ? " bg-cyan-tint/70 ring-1 ring-cyan/40" : "")
                      }
                    >
                      <span className="font-mono text-2xs tabular text-ink-faint">
                        → {p.to}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-2xs text-ink">
                          {framing === "rejected"
                            ? `Rejected by ${p.from} placed in ${p.to}`
                            : `${p.to} approved after rejection in ${p.from}`}
                        </span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-line-soft">
                          <span
                            aria-hidden
                            className="block h-full rounded-full"
                            style={{
                              width: `${(p.value / maxValue) * 100}%`,
                              background: `linear-gradient(90deg, ${JURISDICTION_COLORS[p.from]}, ${JURISDICTION_COLORS[p.to]})`,
                            }}
                          />
                        </span>
                      </span>
                      <span className="font-mono text-sm font-bold tabular text-accent">
                        {p.value}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
