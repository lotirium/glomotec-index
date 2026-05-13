"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAuditTrail,
  type AuditEvidence,
  type AuditFocus,
} from "@/components/atlas/audit-context";
import { rubricGrade } from "@/components/atlas/audit-helpers";
import {
  TALENT_LEVERS,
  TALENT_LEVER_COLOUR_HEX,
  TALENT_LEVER_DEFAULTS,
  TALENT_LEVER_ORDER,
  formatLeverValue,
  type TalentDemographic,
  type TalentLeverDef,
  type TalentLeverState,
} from "@/lib/atlas/talent-lever-fixtures";

const COLOUR_KICKER_CLASS: Record<TalentLeverDef["colourToken"], string> = {
  navy: "text-accent-deep",
  cyan: "text-cyan",
  slate: "text-slate",
  glacier: "text-accent",
  violet: "text-[#7C3AED]",
};

interface Props {
  state: TalentLeverState;
  evidence: AuditEvidence;
}

export function TalentLeversPanel({ state, evidence }: Props) {
  return (
    <section
      aria-label="Talent policy levers"
      className="rounded-md border border-glacier bg-surface p-5 md:p-7"
    >
      <ScopedSliderStyles />
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
            Talent policy levers
          </p>
          <h3 className="mt-1 text-[1.05rem] font-bold tracking-tight text-accent">
            Five demographics, five policy variables.
          </h3>
        </div>
        <button
          type="button"
          onClick={state.reset}
          disabled={!state.isDirty}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-soft px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
            state.isDirty
              ? "text-ink-muted hover:text-ink hover:border-accent/40"
              : "text-ink-faint cursor-not-allowed",
          )}
        >
          <RotateCcw className="h-2.5 w-2.5" aria-hidden />
          Reset talent levers
        </button>
      </header>

      <ul className="grid grid-cols-1 gap-5 lg:grid-cols-5 lg:gap-4">
        {TALENT_LEVER_ORDER.map((d) => (
          <LeverCell
            key={d}
            demographic={d}
            value={state.values[d]}
            onChange={(v) => state.setValue(d, v)}
            evidence={evidence}
          />
        ))}
      </ul>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Moving a lever scales that demographic's contribution to every origin
        country. Effects compose : multiple levers sum together.
      </p>
    </section>
  );
}

function LeverCell({
  demographic,
  value,
  onChange,
  evidence,
}: {
  demographic: TalentDemographic;
  value: number;
  onChange: (v: number) => void;
  evidence: AuditEvidence;
}) {
  const lever = TALENT_LEVERS[demographic];
  const colour = TALENT_LEVER_COLOUR_HEX[demographic];
  const isDefault = value === lever.default;
  const { hover } = useAuditTrail();

  const focus: AuditFocus = React.useMemo(
    () => ({
      id: `talent-lever/${demographic}`,
      proposition: `${lever.label} : ${formatLeverValue(demographic, value)}. Default ${formatLeverValue(demographic, lever.default)}.`,
      evidence: [evidence],
      grade: rubricGrade(
        "gMC v1.0 talent layer model : per-demographic scaling against published Home Office route requirements.",
      ),
    }),
    [demographic, value, evidence, lever.label, lever.default],
  );

  const activate = React.useCallback(() => hover(focus), [hover, focus]);
  const deactivate = React.useCallback(() => hover(null), [hover]);

  return (
    <li
      onMouseEnter={activate}
      onMouseLeave={deactivate}
      className="flex flex-col gap-2 rounded-sm border border-line/60 bg-surface-soft/40 p-3"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={{ background: colour }}
        />
        <p
          className={cn(
            "font-mono text-[10px] font-bold uppercase tracking-[0.18em]",
            COLOUR_KICKER_CLASS[lever.colourToken],
          )}
        >
          {lever.label.split(" ")[0]} · {demographicShortLabel(demographic)}
        </p>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold leading-snug text-ink">
          {lever.label}
        </p>
        <span
          className={cn(
            "font-mono text-sm font-bold tabular",
            isDefault ? "text-ink-muted" : "text-accent",
          )}
        >
          {formatLeverValue(demographic, value)}
        </span>
      </div>

      <p className="text-[11px] leading-snug text-ink-muted">{lever.helper}</p>

      <input
        type="range"
        aria-label={lever.label}
        className="talent-lever-input"
        min={lever.min}
        max={lever.max}
        step={lever.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onFocus={activate}
        onBlur={deactivate}
        style={
          {
            ["--talent-lever-color" as string]: colour,
          } as React.CSSProperties
        }
      />

      <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
        <span>
          {formatLeverValue(demographic, lever.min)}
        </span>
        <span>
          {formatLeverValue(demographic, lever.max)}
        </span>
      </div>

      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-slate leading-snug">
        {lever.note}
      </p>
    </li>
  );
}

function demographicShortLabel(d: TalentDemographic): string {
  switch (d) {
    case "investors":
      return "Investors";
    case "founders":
      return "Founders";
    case "seniorEmployees":
      return "Senior";
    case "midLevelProfessionals":
      return "Mid-level";
    case "students":
      return "Students";
  }
}

function ScopedSliderStyles() {
  return (
    <style>{`
      input.talent-lever-input {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        background: hsl(var(--glacier));
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }
      input.talent-lever-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        background: var(--talent-lever-color, hsl(var(--cyan)));
        border: 3px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(15, 44, 92, 0.18);
        transition: transform 0.1s;
      }
      input.talent-lever-input::-webkit-slider-thumb:hover {
        transform: scale(1.08);
      }
      input.talent-lever-input::-moz-range-thumb {
        width: 20px;
        height: 20px;
        background: var(--talent-lever-color, hsl(var(--cyan)));
        border: 3px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(15, 44, 92, 0.18);
      }
      input.talent-lever-input:focus-visible {
        box-shadow: 0 0 0 3px hsl(var(--accent) / 0.3);
        border-radius: 3px;
      }
    `}</style>
  );
}
