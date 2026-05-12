"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  AuditTrailProvider,
  useAuditTrail,
  type AuditEvidence,
  type AuditFocus,
  type PageAudit,
} from "@/components/atlas/audit-context";
import { AuditSidebar } from "@/components/atlas/audit-sidebar";
import { RUBRIC_VERSION } from "@/lib/atlas/rubric";

// ----- Entity generation (deterministic, module-scope memoized) -----

interface Entity {
  id: number;
  innovation: number;
  viability: number;
  scalability: number;
  localisation: number;
  sector: string;
  zone: string;
}

const SECTORS = [
  "AI",
  "Fintech",
  "Logistics",
  "Manufacturing",
  "Family Office",
  "Healthcare",
  "Commodities",
  "Professional Services",
] as const;
const ZONES = ["DMCC", "DIFC", "ADGM", "JAFZA"] as const;

function generateEntities(): Entity[] {
  const entities: Entity[] = [];
  for (let i = 0; i < 280; i++) {
    const rand = ((i * 9301 + 49297) % 233280) / 233280;
    let target: number;
    if (i < 28) target = 82 + rand * 14;
    else if (i < 120) target = 62 + rand * 16;
    else if (i < 225) target = 42 + rand * 16;
    else target = 24 + rand * 14;
    const innovation = Math.max(15, Math.min(100, target + Math.sin(i * 0.3) * 10));
    const viability = Math.max(15, Math.min(100, target + Math.cos(i * 0.4) * 10));
    const scalability = Math.max(15, Math.min(100, target + Math.sin(i * 0.5) * 10));
    // Source uses 0.7, not 7 — spec contains a typo; with *7 every entity
    // would clamp to 100 and the localisation lever would have no effect.
    const localisation = Math.max(
      0,
      Math.min(100, 25 + ((i * 13) % 100) * 0.7),
    );
    entities.push({
      id: i,
      innovation,
      viability,
      scalability,
      localisation,
      sector: SECTORS[i % SECTORS.length],
      zone: ZONES[i % ZONES.length],
    });
  }
  return entities;
}

const ENTITIES: Entity[] = generateEntities();

// ----- Scoring -----

interface Bands {
  A: number;
  B: number;
  C: number;
  D: number;
}

function scoreEntities(
  innovWeight: number,
  threshold: number,
  locFloor: number,
): Bands {
  const innovW = innovWeight / 100;
  const remaining = (1 - innovW) / 2;
  const bands: Bands = { A: 0, B: 0, C: 0, D: 0 };
  for (const e of ENTITIES) {
    let composite =
      e.innovation * innovW + e.viability * remaining + e.scalability * remaining;
    if (locFloor > 0 && e.localisation < locFloor) {
      composite = Math.min(composite, 59);
    }
    if (composite >= threshold) bands.A++;
    else if (composite >= 60) bands.B++;
    else if (composite >= 40) bands.C++;
    else bands.D++;
  }
  return bands;
}

function projectForecast(currentBands: Bands, simBands: Bands) {
  const growthRate = 0.14;
  const currentTraj = [currentBands.A];
  const simTraj = [simBands.A];
  for (let yr = 1; yr < 4; yr++) {
    currentTraj.push(Math.round(currentTraj[yr - 1] * (1 + growthRate)));
    simTraj.push(
      Math.round(
        simTraj[yr - 1] *
          (1 + growthRate * (simBands.A / Math.max(currentBands.A, 1))),
      ),
    );
  }
  return { currentTraj, simTraj };
}

// Default settings (the "current policy" baseline).
const DEFAULT_INNOV = 50;
const DEFAULT_THRESH = 80;
const DEFAULT_LOC = 0;

// ----- View root -----

interface Props {
  basePageAudit: Omit<PageAudit, "jurisdiction">;
}

export function PolicySimulatorView({ basePageAudit }: Props) {
  const pageAudit: PageAudit = React.useMemo(
    () => ({ ...basePageAudit, jurisdiction: "UAE" }),
    [basePageAudit],
  );
  return (
    <AuditTrailProvider pageAudit={pageAudit}>
      <SimulatorBody />
    </AuditTrailProvider>
  );
}

// ----- Body with state + layout -----

function SimulatorBody() {
  const [innovWeight, setInnovWeight] = React.useState(DEFAULT_INNOV);
  const [threshold, setThreshold] = React.useState(DEFAULT_THRESH);
  const [locFloor, setLocFloor] = React.useState(DEFAULT_LOC);

  const currentBands = React.useMemo(
    () => scoreEntities(DEFAULT_INNOV, DEFAULT_THRESH, DEFAULT_LOC),
    [],
  );
  const simBands = React.useMemo(
    () => scoreEntities(innovWeight, threshold, locFloor),
    [innovWeight, threshold, locFloor],
  );
  const forecast = React.useMemo(
    () => projectForecast(currentBands, simBands),
    [currentBands, simBands],
  );

  const reset = React.useCallback(() => {
    setInnovWeight(DEFAULT_INNOV);
    setThreshold(DEFAULT_THRESH);
    setLocFloor(DEFAULT_LOC);
  }, []);

  return (
    <>
      <SliderThumbStyles />
      <div className="grid grid-cols-1 gap-7 simulator-shell:grid-cols-[360px_1fr_19rem] simulator-shell:gap-10">
        <SimulatorControls
          innovWeight={innovWeight}
          threshold={threshold}
          locFloor={locFloor}
          setInnovWeight={setInnovWeight}
          setThreshold={setThreshold}
          setLocFloor={setLocFloor}
          reset={reset}
        />
        <div className="min-w-0 space-y-6">
          <ComparisonPanels
            innovWeight={innovWeight}
            threshold={threshold}
            locFloor={locFloor}
            currentBands={currentBands}
            simBands={simBands}
          />
          <ForecastChart
            currentTraj={forecast.currentTraj}
            simTraj={forecast.simTraj}
          />
          <InsightBanner
            currentBands={currentBands}
            simBands={simBands}
            innovWeight={innovWeight}
            threshold={threshold}
            locFloor={locFloor}
          />
        </div>
        <AuditSidebar />
      </div>
    </>
  );
}

// ----- Slider thumb styling (scoped via class) -----

function SliderThumbStyles() {
  return (
    <style>{`
      input.atlas-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        background: hsl(var(--glacier));
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }
      input.atlas-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 22px;
        height: 22px;
        background: hsl(var(--cyan));
        border: 3px solid white;
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.1s;
      }
      input.atlas-slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }
      input.atlas-slider::-moz-range-thumb {
        width: 22px;
        height: 22px;
        background: hsl(var(--cyan));
        border: 3px solid white;
        border-radius: 50%;
        cursor: pointer;
      }
      input.atlas-slider:focus-visible {
        box-shadow: 0 0 0 3px hsl(var(--accent) / 0.3);
        border-radius: 3px;
      }
      /* Custom breakpoint : the 3-col layout (controls + views + audit
         sidebar) only fits comfortably at >= 1280px. Below that, stack. */
      @media (min-width: 1280px) {
        .simulator-shell\\:grid-cols-\\[360px_1fr_19rem\\] {
          grid-template-columns: 360px 1fr 19rem;
        }
        .simulator-shell\\:gap-10 { gap: 2.5rem; }
      }
      @media (max-width: 1099.98px) {
        .simulator-controls-sticky {
          position: relative;
          top: 0;
        }
      }
    `}</style>
  );
}

// ----- Controls -----

interface ControlsProps {
  innovWeight: number;
  threshold: number;
  locFloor: number;
  setInnovWeight: (n: number) => void;
  setThreshold: (n: number) => void;
  setLocFloor: (n: number) => void;
  reset: () => void;
}

function SimulatorControls({
  innovWeight,
  threshold,
  locFloor,
  setInnovWeight,
  setThreshold,
  setLocFloor,
  reset,
}: ControlsProps) {
  return (
    <aside className="simulator-controls-sticky h-fit rounded-md border border-glacier bg-surface p-6 md:p-7 lg:sticky lg:top-20 lg:self-start">
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
        Adjust the policy
      </p>
      <h2 className="mt-2 text-xl font-bold tracking-tight text-accent">
        Three levers
      </h2>

      <div className="mt-6 space-y-6">
        <SliderGroup
          id="innov-slider"
          name="innovation-weight"
          label="How much should innovation matter?"
          helper="Higher means innovation weighs more in the composite score."
          value={innovWeight}
          onChange={setInnovWeight}
          min={20}
          max={80}
          step={5}
          formatValue={(v) => `${v}%`}
          metaLeft="Less"
          metaCentre="Default 50%"
          metaRight="More"
          audit={{
            propositionLabel: "Innovation weight",
            defaultValue: `${DEFAULT_INNOV}%`,
            evidence: {
              authority: "gMC v1.0 Innovation rubric",
              dataset:
                "Differentiation / Viability / Scalability dimension weights",
              lastUpdated: "rolling",
              confidence: "high",
              fixtureRef: "/atlas/rubric",
            },
          }}
        />
        <SliderGroup
          id="thresh-slider"
          name="band-a-threshold"
          label="How strict is the Band A threshold?"
          helper="Higher means fewer entities qualify as Band A."
          value={threshold}
          onChange={setThreshold}
          min={70}
          max={90}
          step={2}
          formatValue={(v) => `${v}`}
          metaLeft="70"
          metaCentre="Default 80"
          metaRight="90"
          audit={{
            propositionLabel: "Band A threshold",
            defaultValue: `${DEFAULT_THRESH}`,
            evidence: {
              authority: "gMC v1.0 band ladder",
              dataset: "Band A composite ≥ 80",
              lastUpdated: "rolling",
              confidence: "high",
              fixtureRef: "/atlas/rubric",
            },
          }}
        />
        <SliderGroup
          id="loc-slider"
          name="localisation-floor"
          label="Talent localisation requirement"
          helper="Add a localisation floor. Entities below it cap at Band C."
          value={locFloor}
          onChange={setLocFloor}
          min={0}
          max={40}
          step={5}
          formatValue={(v) => `${v}%`}
          metaLeft="Off"
          metaCentre="+20%"
          metaRight="+40%"
          audit={{
            propositionLabel: "Talent localisation floor",
            defaultValue: `${DEFAULT_LOC}%`,
            evidence: {
              authority: "gMC v1.0 Talent Localisation rubric",
              dataset: "Hard-cap pattern : Band C cap on quota miss",
              lastUpdated: "rolling",
              confidence: "high",
              fixtureRef: "/atlas/rubric",
            },
          }}
        />
      </div>

      <button
        type="button"
        onClick={reset}
        className="mt-6 w-full rounded-md border border-glacier bg-glacier/40 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-glacier focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        Reset to current policy
      </button>
    </aside>
  );
}

// ----- Slider group -----

interface SliderProps {
  id: string;
  name: string;
  label: string;
  helper: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  formatValue: (v: number) => string;
  metaLeft: string;
  metaCentre: string;
  metaRight: string;
  audit: {
    propositionLabel: string;
    defaultValue: string;
    evidence: AuditEvidence;
  };
}

function SliderGroup(props: SliderProps) {
  const { hover } = useAuditTrail();
  const [isActive, setIsActive] = React.useState(false);

  const focus: AuditFocus = {
    id: `simulator/${props.name}`,
    proposition: `${props.audit.propositionLabel} — currently ${props.formatValue(
      props.value,
    )}. Default policy ${props.audit.defaultValue}.`,
    evidence: [props.audit.evidence],
    grade: {
      rubricVersion: RUBRIC_VERSION,
      rubricHref: "/atlas/rubric",
      method:
        "Live re-score across 280-entity sample, in-browser computation.",
    },
  };

  // Re-emit the focus to the audit context whenever the slider value changes
  // while the user is still interacting — otherwise the sidebar text freezes
  // on the value at the moment of hover.
  React.useEffect(() => {
    if (isActive) hover(focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value, isActive]);

  const activate = () => {
    setIsActive(true);
    hover(focus);
  };
  const deactivate = () => {
    setIsActive(false);
    hover(null);
  };

  return (
    <div
      className="group rounded-sm focus-within:bg-cyan-tint/20"
      onMouseEnter={activate}
      onMouseLeave={deactivate}
    >
      <div className="flex items-baseline justify-between">
        <label htmlFor={props.id} className="text-sm font-semibold text-ink">
          {props.label}
        </label>
        <span className="font-mono text-sm font-bold tabular text-cyan">
          {props.formatValue(props.value)}
        </span>
      </div>
      <p className="mt-1 text-2xs text-ink-muted">{props.helper}</p>
      <input
        id={props.id}
        type="range"
        className="atlas-slider mt-3"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        onFocus={activate}
        onBlur={deactivate}
      />
      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
        <span>{props.metaLeft}</span>
        <span>{props.metaCentre}</span>
        <span>{props.metaRight}</span>
      </div>
    </div>
  );
}

// ----- Comparison panels -----

interface ComparisonProps {
  innovWeight: number;
  threshold: number;
  locFloor: number;
  currentBands: Bands;
  simBands: Bands;
}

function ComparisonPanels({
  innovWeight,
  threshold,
  locFloor,
  currentBands,
  simBands,
}: ComparisonProps) {
  const { hover, pin, pinned } = useAuditTrail();
  const sameAsCurrent =
    innovWeight === DEFAULT_INNOV &&
    threshold === DEFAULT_THRESH &&
    locFloor === DEFAULT_LOC;

  const newPolicyFocus: AuditFocus = {
    id: "simulator/new-policy-distribution",
    proposition: `Band distribution under your new policy : Band A ${simBands.A}, Band B ${simBands.B}, Band C ${simBands.C}, Band D ${simBands.D}.`,
    evidence: [
      {
        authority: "gMC v1.0 framework",
        dataset:
          "280-entity UAE free-zone sample, in-browser re-score with current slider settings",
        lastUpdated: "rolling",
        confidence: "high",
        fixtureRef: "/atlas/rubric",
      },
    ],
    grade: {
      rubricVersion: RUBRIC_VERSION,
      rubricHref: "/atlas/rubric",
      method:
        "Live re-score across 280-entity sample, in-browser computation.",
    },
  };
  const isPolicyPinned = pinned?.id === newPolicyFocus.id;

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <article className="rounded-md border border-glacier bg-surface p-6">
        <header className="flex items-center justify-between">
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
            Today
          </p>
          <span className="rounded-sm bg-glacier px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-accent">
            Current policy
          </span>
        </header>
        <h3 className="mt-2 text-[1.25rem] font-bold tracking-tight text-accent">
          280 entities, current bands
        </h3>
        <p className="mt-1 text-[13px] text-ink-muted">
          DMCC, DIFC, ADGM, JAFZA combined
        </p>
        <BandList bands={currentBands} />
      </article>

      <article
        onMouseEnter={() => hover(newPolicyFocus)}
        onMouseLeave={() => hover(null)}
        onClick={() => pin(newPolicyFocus)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pin(newPolicyFocus);
          }
        }}
        role="button"
        tabIndex={0}
        className={cn(
          "rounded-md border bg-surface p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          isPolicyPinned
            ? "border-cyan/50 ring-1 ring-cyan/40"
            : "border-glacier hover:border-frost",
        )}
        aria-pressed={isPolicyPinned}
      >
        <header className="flex items-center justify-between">
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
            Under your new policy
          </p>
          <span className="rounded-sm bg-cyan/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-cyan">
            Live
          </span>
        </header>
        <h3 className="mt-2 text-[1.25rem] font-bold tracking-tight text-accent">
          280 entities, re-scored
        </h3>
        <p className="mt-1 text-[13px] text-ink-muted">
          {sameAsCurrent
            ? "No change from current policy"
            : `Innovation ${innovWeight}% · Threshold ${threshold} · Localisation floor ${locFloor}%`}
        </p>
        <BandList bands={simBands} comparison={currentBands} />
      </article>
    </div>
  );
}

const BAND_FILL_COLOR: Record<keyof Bands, string> = {
  A: "hsl(var(--cyan))",
  B: "hsl(var(--accent))",
  C: "hsl(var(--slate))",
  D: "hsl(var(--frost))",
};

function BandList({
  bands,
  comparison,
}: {
  bands: Bands;
  comparison?: Bands;
}) {
  const max = Math.max(bands.A, bands.B, bands.C, bands.D);
  return (
    <ul className="mt-4 space-y-2.5">
      {(["A", "B", "C", "D"] as const).map((b) => {
        const count = bands[b];
        const fillPct = max ? (count / max) * 100 : 0;
        let delta: number | null = null;
        if (comparison) delta = count - comparison[b];
        return (
          <li
            key={b}
            className="grid grid-cols-[48px_1fr_64px] items-center gap-3"
          >
            <span className="text-[13px] font-bold text-ink-soft">
              Band {b}
            </span>
            <div className="relative h-7 overflow-hidden rounded-md bg-glacier/50">
              <div
                className="h-full rounded-md"
                style={{
                  width: `${fillPct}%`,
                  background: BAND_FILL_COLOR[b],
                  transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </div>
            <span className="flex items-baseline justify-end gap-1 text-base font-bold tabular text-ink">
              {count}
              {delta !== null && (
                <DeltaChip delta={delta} />
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span
        aria-label="No change"
        className="ml-1 inline-block rounded-sm px-1 font-mono text-[11px] font-bold text-frost"
      >
        ·
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "ml-1 inline-block rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-bold tabular",
        up ? "bg-cyan/15 text-cyan" : "bg-slate/15 text-slate",
      )}
    >
      {up ? `+${delta}` : delta}
    </span>
  );
}

// ----- Forecast chart -----

const YEARS = ["2026", "2027", "2028", "2029"] as const;

function ForecastChart({
  currentTraj,
  simTraj,
}: {
  currentTraj: number[];
  simTraj: number[];
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(720);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth || 720);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const h = 280;
  const pad = { top: 20, right: 30, bottom: 36, left: 50 };
  const innerW = Math.max(50, width - pad.left - pad.right);
  const innerH = h - pad.top - pad.bottom;
  const allValues = [...currentTraj, ...simTraj];
  const maxVal = Math.max(1, ...allValues) * 1.15;
  const xAt = (i: number) =>
    pad.left + (i / (YEARS.length - 1)) * innerW;
  const yAt = (v: number) =>
    pad.top + innerH - (v / maxVal) * innerH;

  // Confidence band path : top edge left→right, bottom edge right→left, close.
  let confTop = "";
  let confBot = "";
  simTraj.forEach((v, i) => {
    const conf = v * 0.12 + 3;
    confTop += `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v + conf)} `;
    const rev = simTraj.length - 1 - i;
    confBot += `L ${xAt(rev)} ${yAt(simTraj[rev] - simTraj[rev] * 0.12 - 3)} `;
  });
  const currentPath = currentTraj
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`)
    .join(" ");
  const simPath = simTraj
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`)
    .join(" ");
  const lastIdx = simTraj.length - 1;

  return (
    <article className="rounded-md border border-glacier bg-surface p-6">
      <header className="flex items-center justify-between">
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
          3-year forecast
        </p>
        <span className="rounded-sm bg-cyan/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-cyan">
          Live
        </span>
      </header>
      <h3 className="mt-2 text-[1.25rem] font-bold tracking-tight text-accent">
        Band A trajectory through 2029
      </h3>
      <p className="mt-1 text-[13px] text-ink-muted">
        Projection assumes current entity growth rate of 14% annually and your
        policy held constant from today.
      </p>

      <div ref={containerRef} className="mt-4 h-[280px] w-full">
        <svg
          viewBox={`0 0 ${width} ${h}`}
          width="100%"
          height={h}
          preserveAspectRatio="none"
          role="img"
          aria-label="Three-year Band A projection chart"
        >
          <defs>
            <linearGradient id="simGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#00A2E9" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#00A2E9" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines + count labels */}
          {[0, 1, 2, 3, 4].map((i) => {
            const gy = pad.top + (i / 4) * innerH;
            const v = Math.round(maxVal - (i / 4) * maxVal);
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={gy}
                  y2={gy}
                  stroke="hsl(var(--glacier))"
                  strokeWidth={1}
                />
                <text
                  x={pad.left - 8}
                  y={gy + 4}
                  fontFamily="Inter, sans-serif"
                  fontSize={11}
                  fill="hsl(var(--ink-muted))"
                  textAnchor="end"
                >
                  {v}
                </text>
              </g>
            );
          })}

          {/* X axis year labels */}
          {YEARS.map((yr, i) => (
            <text
              key={yr}
              x={xAt(i)}
              y={h - pad.bottom + 22}
              fontFamily="Inter, sans-serif"
              fontSize={12}
              fill="hsl(var(--ink-muted))"
              textAnchor="middle"
              fontWeight={500}
            >
              {yr}
            </text>
          ))}

          {/* Y axis rotated label */}
          <text
            x={pad.left - 36}
            y={pad.top + innerH / 2}
            fontFamily="Inter, sans-serif"
            fontSize={11}
            fill="hsl(var(--ink-muted))"
            textAnchor="middle"
            fontWeight={500}
            transform={`rotate(-90 ${pad.left - 36} ${pad.top + innerH / 2})`}
          >
            Band A entities
          </text>

          {/* Confidence band */}
          <path d={`${confTop}${confBot}Z`} fill="url(#simGrad)" opacity={0.5} />

          {/* Current policy dashed line */}
          <path
            d={currentPath}
            stroke="#B8D4E3"
            strokeWidth={2.5}
            fill="none"
            strokeDasharray="6 4"
            strokeLinecap="round"
          />

          {/* Sim policy solid line */}
          <path
            d={simPath}
            stroke="#00A2E9"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current policy circle markers (hollow) */}
          {currentTraj.map((v, i) => (
            <circle
              key={`curr-${i}`}
              cx={xAt(i)}
              cy={yAt(v)}
              r={4}
              fill="white"
              stroke="#B8D4E3"
              strokeWidth={2}
            />
          ))}

          {/* Sim policy circle markers (filled cyan) */}
          {simTraj.map((v, i) => (
            <circle
              key={`sim-${i}`}
              cx={xAt(i)}
              cy={yAt(v)}
              r={5}
              fill="#00A2E9"
              stroke="white"
              strokeWidth={2.5}
            />
          ))}

          {/* End-of-line annotation */}
          <text
            x={xAt(lastIdx) + 10}
            y={yAt(simTraj[lastIdx]) + 4}
            fontFamily="Inter, sans-serif"
            fontSize={13}
            fontWeight={700}
            fill="hsl(var(--accent))"
          >
            {Math.round(simTraj[lastIdx])} entities
          </text>
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-glacier pt-4 text-[13px] text-ink-soft">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="block h-2.5 w-2.5 rounded-full"
            style={{ background: "#B8D4E3" }}
          />
          Current policy
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="block h-2.5 w-2.5 rounded-full"
            style={{ background: "#00A2E9" }}
          />
          Your new policy
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="block h-2.5 w-2.5 rounded-full"
            style={{ background: "hsl(var(--accent) / 0.4)" }}
          />
          Confidence band
        </span>
      </div>
    </article>
  );
}

// ----- Insight banner -----

interface InsightProps {
  currentBands: Bands;
  simBands: Bands;
  innovWeight: number;
  threshold: number;
  locFloor: number;
}

function InsightBanner({
  currentBands,
  simBands,
  innovWeight,
  threshold,
  locFloor,
}: InsightProps) {
  const deltaA = simBands.A - currentBands.A;
  const isDefault =
    innovWeight === DEFAULT_INNOV &&
    threshold === DEFAULT_THRESH &&
    locFloor === DEFAULT_LOC;

  let body: React.ReactNode;
  if (isDefault) {
    body =
      "You are at the current policy. Move a slider to see how a change would reshape the pipeline.";
  } else {
    const dir = deltaA >= 0 ? "increases" : "decreases";
    const absChange = Math.abs(deltaA);
    const pctChange = currentBands.A
      ? Math.round((deltaA / currentBands.A) * 100)
      : 0;
    const forecastDelta = Math.round(
      (simBands.A - currentBands.A) * Math.pow(1.14, 3),
    );
    const fragments: React.ReactNode[] = [];

    fragments.push(
      <React.Fragment key="lead">
        Your policy{" "}
        <strong className="font-bold text-surface">
          {dir} Band A entities by {absChange}
        </strong>{" "}
        ({pctChange >= 0 ? "+" : ""}
        {pctChange}%) today.{" "}
      </React.Fragment>,
    );
    if (innovWeight > DEFAULT_INNOV) {
      fragments.push(
        <React.Fragment key="innov-up">
          Innovation now weighs {innovWeight}% of the composite, favouring
          tech-led entities.{" "}
        </React.Fragment>,
      );
    } else if (innovWeight < DEFAULT_INNOV) {
      fragments.push(
        <React.Fragment key="innov-down">
          Innovation weighs only {innovWeight}%, opening Band A to operational
          substance entities.{" "}
        </React.Fragment>,
      );
    }
    if (threshold !== DEFAULT_THRESH) {
      fragments.push(
        <React.Fragment key="thresh">
          Band A threshold is{" "}
          {threshold > DEFAULT_THRESH ? "tighter" : "more permissive"} at{" "}
          {threshold}.{" "}
        </React.Fragment>,
      );
    }
    if (locFloor > 0) {
      fragments.push(
        <React.Fragment key="loc">
          Localisation floor at {locFloor}% caps non-compliant entities at Band
          C.{" "}
        </React.Fragment>,
      );
    }
    fragments.push(
      <React.Fragment key="forecast">
        By 2029, projected{" "}
        <strong className="font-bold text-surface">
          {forecastDelta >= 0 ? "+" : ""}
          {forecastDelta} Band A entities
        </strong>{" "}
        versus current policy.
      </React.Fragment>,
    );
    body = <>{fragments}</>;
  }

  return (
    <div className="overflow-hidden rounded-md bg-gradient-to-br from-accent to-accent-deep px-6 py-5 md:px-7">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
        What just happened
      </p>
      <p className="mt-2 text-[17px] font-medium leading-relaxed text-surface">
        {body}
      </p>
    </div>
  );
}
