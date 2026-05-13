"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useLeverState,
  useSimulatorState,
} from "@/lib/atlas/simulator-state";
import {
  AuditTrailProvider,
  useAuditTrail,
  type AuditEvidence,
  type AuditFocus,
  type PageAudit,
} from "@/components/atlas/audit-context";
import { AuditSidebar } from "@/components/atlas/audit-sidebar";
import { CollapsibleContext } from "@/components/atlas/collapsible-context";
import { RUBRIC_VERSION } from "@/lib/atlas/rubric";
import {
  BACKTEST_SCENARIOS,
  DEFAULTS,
  ENGLISH_ORDER,
  FORECAST_BASE_YEAR,
  FORECAST_HORIZON_YEARS,
  INVESTOR_CLOSED,
  INVESTOR_MIN,
  INVESTOR_STEP,
  SCOPE_ROUTES,
  SCOPE_ROUTE_LABEL,
  SIMULATOR_ENTITIES,
  SIMULATOR_FIXTURE_VERSION,
  backtestUnitLabel,
  categoriseEntities,
  dominantSalaryFloorSectors,
  entityPoolSize,
  findScenario,
  formatBacktestValue,
  projectEligibleTrajectory,
  type BacktestScenario,
  type CategoriseResult,
  type EnglishLevel,
  type ForecastTrajectory,
  type LeverState,
  type ScopeRoute,
} from "@/lib/atlas/simulator-fixtures";

// Horizon options for the forecast chart. The numbers are years from
// FORECAST_BASE_YEAR (2026); end-year labels are derived.
const HORIZON_OPTIONS = [3, 10, FORECAST_HORIZON_YEARS] as const;
type HorizonYears = (typeof HORIZON_OPTIONS)[number];

const SKILLED_WORKER_TOTAL = SIMULATOR_ENTITIES.filter(
  (e) => e.route === "Skilled Worker",
).length;

// ----- View root -----

interface Props {
  basePageAudit: Omit<PageAudit, "jurisdiction">;
  description: string;
}

export function PolicySimulatorView({ basePageAudit, description }: Props) {
  const pageAudit: PageAudit = React.useMemo(
    () => ({ ...basePageAudit, jurisdiction: "United Kingdom" }),
    [basePageAudit],
  );
  return (
    <AuditTrailProvider pageAudit={pageAudit}>
      <SimulatorBody description={description} />
    </AuditTrailProvider>
  );
}

// ----- Body -----

function SimulatorBody({ description }: { description: string }) {
  // Live levers now live in the shared store so /atlas/rubric and
  // /atlas/methodology read the same state. Backtest mode bypasses the
  // store — the scenario's leversBeforeEvent feeds the re-score pipeline
  // directly and never persists.
  const liveLevers = useLeverState();
  const setStoreLever = useSimulatorState((s) => s.setLever);
  const storeReset = useSimulatorState((s) => s.reset);

  const [backtestActive, setBacktestActive] = React.useState(false);
  const [scenarioId, setScenarioId] = React.useState<string>(
    BACKTEST_SCENARIOS[0].id,
  );
  const [horizonYears, setHorizonYears] = React.useState<HorizonYears>(3);
  const [scopeRoute, setScopeRoute] = React.useState<ScopeRoute>("all");
  // Effective scope : backtest mode forces "all" so the historical scenarios
  // continue to span their full sample. The picker is rendered disabled in
  // that state.
  const effectiveScope: ScopeRoute = backtestActive ? "all" : scopeRoute;

  const scenario = React.useMemo(
    () => findScenario(scenarioId) ?? BACKTEST_SCENARIOS[0],
    [scenarioId],
  );

  // Levers shown to the user. In live mode they come from liveLevers (the
  // user's editable state). In backtest mode they come from the selected
  // scenario's leversBeforeEvent and are read-only.
  const levers: LeverState = backtestActive
    ? scenario.leversBeforeEvent
    : liveLevers;

  const baseline = React.useMemo(
    () => categoriseEntities(DEFAULTS, effectiveScope),
    [effectiveScope],
  );
  const current = React.useMemo(
    () => categoriseEntities(levers, effectiveScope),
    [levers, effectiveScope],
  );
  const forecast = React.useMemo(
    () =>
      projectEligibleTrajectory(
        baseline.counts.eligible,
        current.counts.eligible,
      ),
    [baseline.counts.eligible, current.counts.eligible],
  );

  const reset = React.useCallback(() => {
    storeReset();
    setScopeRoute("all");
  }, [storeReset]);

  const setLever = React.useCallback(
    <K extends keyof LeverState>(key: K, value: LeverState[K]) =>
      setStoreLever(key, value),
    [setStoreLever],
  );

  return (
    <>
      <SliderThumbStyles />
      <CollapsibleContext label="How the sliders work" className="mb-7">
        <p>{description}</p>
      </CollapsibleContext>
      <div className="grid grid-cols-1 gap-7 simulator-shell:grid-cols-[400px_1fr_19rem] simulator-shell:gap-10">
        <SimulatorControls
          levers={levers}
          setLever={setLever}
          reset={reset}
          backtestActive={backtestActive}
          setBacktestActive={setBacktestActive}
          scenarioId={scenarioId}
          setScenarioId={setScenarioId}
          scopeRoute={scopeRoute}
          setScopeRoute={setScopeRoute}
          effectiveScope={effectiveScope}
        />
        <div className="min-w-0 space-y-6">
          <StateDistributionBar
            result={current}
            backtestActive={backtestActive}
            scope={effectiveScope}
          />
          {backtestActive && <BacktestComparisonPanel scenario={scenario} />}
          <ForecastChart
            forecast={forecast}
            horizonYears={horizonYears}
            setHorizonYears={setHorizonYears}
          />
          <InsightBanner
            levers={levers}
            current={current}
            baseline={baseline}
            backtestActive={backtestActive}
            scenario={scenario}
            horizonYears={horizonYears}
            scope={effectiveScope}
          />
        </div>
        <AuditSidebar />
      </div>
    </>
  );
}

// ----- Controls -----

interface ControlsProps {
  levers: LeverState;
  setLever: <K extends keyof LeverState>(key: K, value: LeverState[K]) => void;
  reset: () => void;
  backtestActive: boolean;
  setBacktestActive: (active: boolean) => void;
  scenarioId: string;
  setScenarioId: (id: string) => void;
  scopeRoute: ScopeRoute;
  setScopeRoute: (s: ScopeRoute) => void;
  effectiveScope: ScopeRoute;
}

function SimulatorControls({
  levers,
  setLever,
  reset,
  backtestActive,
  setBacktestActive,
  scenarioId,
  setScenarioId,
  scopeRoute,
  setScopeRoute,
  effectiveScope,
}: ControlsProps) {
  const readOnly = backtestActive;
  const isDefault =
    levers.isc === DEFAULTS.isc &&
    levers.ihs === DEFAULTS.ihs &&
    levers.cos === DEFAULTS.cos &&
    levers.minSalary === DEFAULTS.minSalary &&
    levers.englishLevel === DEFAULTS.englishLevel &&
    levers.settlementYears === DEFAULTS.settlementYears &&
    levers.ilrFee === DEFAULTS.ilrFee &&
    levers.investorThreshold === DEFAULTS.investorThreshold;

  return (
    <aside className="simulator-controls-sticky h-fit space-y-3 lg:sticky lg:top-20 lg:self-start">
      <header className="space-y-3 px-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
              {backtestActive ? "Backtest mode" : "Home Office policy levers"}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-accent">
              {backtestActive ? "Rules of the day." : "Eight levers."}
            </h2>
            <Link
              href="/atlas/rubric"
              className="mt-1.5 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan hover:underline"
            >
              View current weights on /atlas/rubric
              <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={backtestActive}
              onClick={() => setBacktestActive(!backtestActive)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                backtestActive
                  ? "border-slate bg-slate text-surface"
                  : "border-line bg-surface-soft text-ink-muted hover:text-ink hover:border-accent/40",
              )}
            >
              Backtest mode
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={isDefault || backtestActive}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-surface-soft px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                isDefault || backtestActive
                  ? "text-ink-faint"
                  : "text-ink-muted hover:text-ink hover:border-accent/40",
              )}
            >
              Reset to April 2026
            </button>
          </div>
        </div>
        {backtestActive && (
          <div className="rounded-md border border-dashed border-slate/60 bg-surface-soft/40 px-3 py-2.5">
            <label
              htmlFor="backtest-scenario"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted"
            >
              Select a historical event
            </label>
            <select
              id="backtest-scenario"
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              className="mt-1 block w-full rounded-sm border border-line bg-surface px-2 py-1.5 text-sm font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {BACKTEST_SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      <RoutePicker
        scopeRoute={scopeRoute}
        setScopeRoute={setScopeRoute}
        effectiveScope={effectiveScope}
        backtestActive={backtestActive}
      />

      <LeverSection label="Cost levers" defaultOpen>
        <SliderGroup
          id="isc-slider"
          name="immigration-skills-charge"
          label="Immigration Skills Charge"
          helper="Higher charge reduces sponsorships from cost-sensitive employers."
          value={levers.isc}
          onChange={(v) => setLever("isc", v)}
          min={0}
          max={2000}
          step={40}
          formatValue={(v) => `£${v.toLocaleString("en-GB")}/yr`}
          metaLeft="Medium/large : £1,320"
          metaCentre=""
          metaRight="Small/charitable : £480"
          note="Post 32% rise December 2025."
          readOnly={readOnly}
          audit={{
            label: "Immigration Skills Charge",
            defaultValue: `£${DEFAULTS.isc.toLocaleString("en-GB")}/yr`,
            evidence: {
              authority: "UK Home Office",
              dataset: "Immigration Skills Charge published rates",
              lastUpdated: SIMULATOR_FIXTURE_VERSION,
              confidence: "high",
            },
          }}
        />
        <SliderGroup
          id="ihs-slider"
          name="immigration-health-surcharge"
          label="Immigration Health Surcharge"
          helper="Higher surcharge raises total cost of a Skilled Worker route for the applicant."
          value={levers.ihs}
          onChange={(v) => setLever("ihs", v)}
          min={0}
          max={2000}
          step={5}
          formatValue={(v) => `£${v.toLocaleString("en-GB")}/yr`}
          metaLeft="£0"
          metaCentre={`Default £${DEFAULTS.ihs.toLocaleString("en-GB")}`}
          metaRight="£2,000"
          readOnly={readOnly}
          audit={{
            label: "Immigration Health Surcharge",
            defaultValue: `£${DEFAULTS.ihs.toLocaleString("en-GB")}/yr`,
            evidence: {
              authority: "UK Home Office",
              dataset: "Immigration Health Surcharge schedule",
              lastUpdated: SIMULATOR_FIXTURE_VERSION,
              confidence: "high",
            },
          }}
        />
        <SliderGroup
          id="cos-slider"
          name="certificate-of-sponsorship"
          label="Certificate of Sponsorship fee"
          helper="Per-CoS fee charged to sponsoring employer at point of issue."
          value={levers.cos}
          onChange={(v) => setLever("cos", v)}
          min={0}
          max={1000}
          step={25}
          formatValue={(v) => `£${v.toLocaleString("en-GB")}`}
          metaLeft="£0"
          metaCentre={`Default £${DEFAULTS.cos.toLocaleString("en-GB")}`}
          metaRight="£1,000"
          readOnly={readOnly}
          audit={{
            label: "Certificate of Sponsorship fee",
            defaultValue: `£${DEFAULTS.cos.toLocaleString("en-GB")}`,
            evidence: {
              authority: "UK Home Office",
              dataset: "Certificate of Sponsorship fees",
              lastUpdated: SIMULATOR_FIXTURE_VERSION,
              confidence: "high",
            },
          }}
        />
      </LeverSection>

      <LeverSection label="Threshold levers" defaultOpen>
        <SliderGroup
          id="min-salary-slider"
          name="skilled-worker-minimum-salary"
          label="Skilled Worker minimum salary"
          helper="Higher minimum salary excludes lower-paid roles from the Skilled Worker route."
          value={levers.minSalary}
          onChange={(v) => setLever("minSalary", v)}
          min={20_000}
          max={60_000}
          step={100}
          formatValue={(v) => `£${v.toLocaleString("en-GB")}`}
          metaLeft="£20K"
          metaCentre={`Default £${DEFAULTS.minSalary.toLocaleString("en-GB")}`}
          metaRight="£60K"
          note="Up from £38,700 (April 2024)."
          readOnly={readOnly}
          audit={{
            label: "Skilled Worker minimum salary",
            defaultValue: `£${DEFAULTS.minSalary.toLocaleString("en-GB")}`,
            evidence: {
              authority: "UK Home Office",
              dataset: "Skilled Worker minimum salary thresholds",
              lastUpdated: SIMULATOR_FIXTURE_VERSION,
              confidence: "high",
            },
          }}
        />
        <EnglishLevelSelector
          value={levers.englishLevel}
          onChange={(lvl) => setLever("englishLevel", lvl)}
          readOnly={readOnly}
        />
        <SliderGroup
          id="settlement-years-slider"
          name="settlement-qualifying-period"
          label="Settlement qualifying period"
          helper="Years of continuous residence required before ILR eligibility."
          value={levers.settlementYears}
          onChange={(v) => setLever("settlementYears", v)}
          min={5}
          max={15}
          step={1}
          formatValue={(v) => `${v} years`}
          metaLeft="5"
          metaCentre={`Default ${DEFAULTS.settlementYears}`}
          metaRight="15"
          readOnly={readOnly}
          audit={{
            label: "Settlement qualifying period",
            defaultValue: `${DEFAULTS.settlementYears} years`,
            evidence: {
              authority: "UK Home Office",
              dataset: "ILR qualifying period rules",
              lastUpdated: SIMULATOR_FIXTURE_VERSION,
              confidence: "high",
            },
          }}
        />
      </LeverSection>

      <LeverSection label="Settlement levers" defaultOpen>
        <SliderGroup
          id="ilr-fee-slider"
          name="ilr-application-fee"
          label="ILR fee"
          helper="Indefinite Leave to Remain application fee."
          value={levers.ilrFee}
          onChange={(v) => setLever("ilrFee", v)}
          min={0}
          max={6000}
          step={1}
          formatValue={(v) => `£${v.toLocaleString("en-GB")}`}
          metaLeft="£0"
          metaCentre={`Default £${DEFAULTS.ilrFee.toLocaleString("en-GB")}`}
          metaRight="£6,000"
          note="From 8 April 2026."
          readOnly={readOnly}
          audit={{
            label: "ILR application fee",
            defaultValue: `£${DEFAULTS.ilrFee.toLocaleString("en-GB")}`,
            evidence: {
              authority: "UK Home Office",
              dataset: "ILR application fee schedule",
              lastUpdated: SIMULATOR_FIXTURE_VERSION,
              confidence: "high",
            },
          }}
        />
        <SliderGroup
          id="investor-slider"
          name="investor-threshold"
          label="Investor threshold"
          helper="Minimum investment required for the Investor route. Currently closed since 2022."
          value={levers.investorThreshold}
          onChange={(v) => setLever("investorThreshold", v)}
          min={INVESTOR_MIN}
          max={INVESTOR_CLOSED}
          step={INVESTOR_STEP}
          formatValue={(v) =>
            v >= INVESTOR_CLOSED
              ? "Closed"
              : v === 0
                ? "£0"
                : `£${(v / 1_000_000).toFixed(1)}M`
          }
          metaLeft="£0"
          metaCentre={`Default £${(DEFAULTS.investorThreshold / 1_000_000).toFixed(0)}M`}
          metaRight="Closed"
          note="Currently closed (2022 closure)."
          readOnly={readOnly}
          audit={{
            label: "Investor route threshold",
            defaultValue: `£${(DEFAULTS.investorThreshold / 1_000_000).toFixed(0)}M`,
            evidence: {
              authority: "UK Home Office",
              dataset: "Tier 1 Investor route history",
              lastUpdated: SIMULATOR_FIXTURE_VERSION,
              confidence: "high",
            },
          }}
        />
      </LeverSection>
    </aside>
  );
}

// ----- Route picker -----
//
// Five-pill segmented control scoping the simulator to a single Home Office
// route. Disabled during backtest mode (the historical scenarios scope by
// year, not by route). The audit sidebar gets a per-pick focus describing
// the route + pool size.

function RoutePicker({
  scopeRoute,
  setScopeRoute,
  effectiveScope,
  backtestActive,
}: {
  scopeRoute: ScopeRoute;
  setScopeRoute: (s: ScopeRoute) => void;
  effectiveScope: ScopeRoute;
  backtestActive: boolean;
}) {
  const { hover } = useAuditTrail();
  const focusFor = React.useCallback(
    (scope: ScopeRoute): AuditFocus => ({
      id: `simulator/scope/${scope}`,
      proposition: `Simulator scope: ${SCOPE_ROUTE_LABEL[scope]}. ${entityPoolSize(scope)} entities in pool.`,
      evidence: [
        {
          authority: "gMC v1.0 route definitions",
          dataset: "Entity classification (fixture)",
          lastUpdated: SIMULATOR_FIXTURE_VERSION,
          confidence: "high",
          fixtureRef: "lib/atlas/simulator-fixtures.ts",
        },
      ],
      grade: {
        rubricVersion: RUBRIC_VERSION,
        rubricHref: "/atlas/rubric",
        method:
          "Live re-score filtered to the picked route. Lever filters and cost pressure apply per the route's policy lens.",
      },
    }),
    [],
  );

  return (
    <div
      className={cn(
        "rounded-md border bg-surface-soft/40 p-3",
        backtestActive ? "border-dashed border-slate/60" : "border-line",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
          Scope
        </p>
        <div
          role="tablist"
          aria-label="Simulator scope"
          className="flex w-full flex-1 flex-wrap items-center gap-1.5"
        >
          {SCOPE_ROUTES.map((s) => {
            const active = effectiveScope === s;
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={backtestActive}
                onClick={() => setScopeRoute(s)}
                onMouseEnter={() => hover(focusFor(s))}
                onMouseLeave={() => hover(null)}
                className={cn(
                  "flex-1 rounded-full border px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] tabular transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  active
                    ? "border-cyan bg-cyan text-surface"
                    : "border-line bg-surface text-ink-muted hover:border-cyan/40 hover:text-ink",
                )}
              >
                {SCOPE_ROUTE_LABEL[s]}
              </button>
            );
          })}
        </div>
      </div>
      {backtestActive && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate">
          Scope locked to all routes during backtest mode.
        </p>
      )}
    </div>
  );
}

// ----- Lever section accordion -----

function LeverSection({
  label,
  defaultOpen = true,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-md border border-glacier bg-surface"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-5 py-3 outline-none transition-colors hover:bg-surface-soft/60 focus-visible:ring-2 focus-visible:ring-accent/40">
        <ChevronRight
          aria-hidden
          className="h-3 w-3 shrink-0 text-cyan transition-transform duration-200 group-open:rotate-90"
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan">
          {label}
        </span>
      </summary>
      <div className="space-y-6 border-t border-line/60 px-5 py-5">
        {children}
      </div>
    </details>
  );
}

// ----- Slider group -----

interface SliderProps {
  id: string;
  name: string;
  label: string;
  helper: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  formatValue: (v: number) => string;
  metaLeft: string;
  metaCentre: string;
  metaRight: string;
  note?: string;
  readOnly?: boolean;
  audit: {
    label: string;
    defaultValue: string;
    evidence: AuditEvidence;
  };
}

function SliderGroup(props: SliderProps) {
  const { hover } = useAuditTrail();
  const [isActive, setIsActive] = React.useState(false);

  const focus: AuditFocus = {
    id: `simulator/${props.name}`,
    proposition: `${props.audit.label} : ${props.formatValue(
      props.value,
    )}. Default policy ${props.audit.defaultValue}.`,
    evidence: [props.audit.evidence],
    grade: {
      rubricVersion: RUBRIC_VERSION,
      rubricHref: "/atlas/rubric",
      method:
        "Live re-score across the 280-entity sample. Filters and cost pressure applied in-browser.",
    },
  };

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
      <div className="flex items-baseline justify-between gap-3">
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
        className={cn(
          "atlas-slider mt-3",
          props.readOnly && "atlas-slider-readonly",
        )}
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        disabled={props.readOnly}
        aria-readonly={props.readOnly}
        onChange={(e) => props.onChange(Number(e.target.value))}
        onFocus={activate}
        onBlur={deactivate}
      />
      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
        <span>{props.metaLeft}</span>
        <span className="text-center">{props.metaCentre}</span>
        <span className="text-right">{props.metaRight}</span>
      </div>
      {props.note && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          {props.note}
        </p>
      )}
    </div>
  );
}

// ----- English level segmented control -----

function EnglishLevelSelector({
  value,
  onChange,
  readOnly = false,
}: {
  value: EnglishLevel;
  onChange: (lvl: EnglishLevel) => void;
  readOnly?: boolean;
}) {
  const { hover } = useAuditTrail();
  const focus: AuditFocus = {
    id: "simulator/english-level",
    proposition: `English language requirement : ${value}. Default policy ${DEFAULTS.englishLevel}.`,
    evidence: [
      {
        authority: "UK Home Office",
        dataset: "English language requirements (CEFR)",
        lastUpdated: SIMULATOR_FIXTURE_VERSION,
        confidence: "high",
      },
    ],
    grade: {
      rubricVersion: RUBRIC_VERSION,
      rubricHref: "/atlas/rubric",
      method:
        "Hard exclusion filter : entities below the required CEFR level fail the route.",
    },
  };
  return (
    <div
      className="rounded-sm focus-within:bg-cyan-tint/20"
      onMouseEnter={() => hover(focus)}
      onMouseLeave={() => hover(null)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink">
          English language requirement
        </span>
        <span className="font-mono text-sm font-bold tabular text-cyan">
          CEFR {value}
        </span>
      </div>
      <p className="mt-1 text-2xs text-ink-muted">
        Higher CEFR level excludes applicants with lower English proficiency.
      </p>
      <div
        role="radiogroup"
        aria-label="English language requirement"
        className="mt-3 inline-flex w-full rounded-full border border-line bg-surface-soft p-1"
      >
        {ENGLISH_ORDER.map((lvl) => {
          const active = lvl === value;
          return (
            <button
              key={lvl}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={readOnly}
              onClick={() => onChange(lvl)}
              onFocus={() => hover(focus)}
              onBlur={() => hover(null)}
              className={cn(
                "flex-1 rounded-full px-2 py-1 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed",
                active
                  ? "bg-accent text-surface"
                  : readOnly
                    ? "text-ink-faint"
                    : "text-ink-muted hover:text-ink",
              )}
            >
              {lvl}
            </button>
          );
        })}
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
        Raised from B1 in January 2026.
      </p>
    </div>
  );
}

// ----- Four-state stacked bar -----

function StateDistributionBar({
  result,
  backtestActive = false,
  scope = "all",
}: {
  result: CategoriseResult;
  backtestActive?: boolean;
  scope?: ScopeRoute;
}) {
  const { counts } = result;
  const total =
    counts.eligible + counts.marginal + counts.excluded + counts.uncategorised;
  const slices = [
    {
      key: "eligible" as const,
      label: "Eligible",
      value: counts.eligible,
      cssColor: "bg-cyan",
      swatch: "hsl(var(--cyan))",
    },
    {
      key: "marginal" as const,
      label: "Marginal",
      value: counts.marginal,
      cssColor: "bg-glacier",
      swatch: "hsl(var(--glacier))",
    },
    {
      key: "excluded" as const,
      label: "Excluded",
      value: counts.excluded,
      cssColor: "bg-slate",
      swatch: "hsl(var(--slate))",
    },
    {
      key: "uncategorised" as const,
      label: "Uncategorised",
      value: counts.uncategorised,
      cssColor: "bg-frost",
      swatch: "hsl(var(--frost))",
    },
  ];

  return (
    <section
      aria-labelledby="state-dist-heading"
      className={cn(
        "rounded-md border bg-surface p-5 md:p-7",
        backtestActive
          ? "border-dashed border-slate/70"
          : "border-glacier",
      )}
    >
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
            Sample distribution
          </p>
          <h3
            id="state-dist-heading"
            className="mt-1 text-[1.05rem] font-bold tracking-tight text-accent"
          >
            {scope === "all"
              ? `How the levers categorise the ${total} entities.`
              : `${total} ${SCOPE_ROUTE_LABEL[scope]} entities, re-scored.`}
          </h3>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          eligible + marginal pass · excluded fails · uncategorised out of scope
        </p>
      </header>
      <div className="flex h-9 w-full overflow-hidden rounded-sm border border-line">
        {slices.map((s) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={s.key}
              role="img"
              aria-label={`${s.label} : ${s.value}`}
              title={`${s.label} : ${s.value}`}
              style={{ width: `${pct}%`, background: s.swatch }}
              className="h-full transition-[width] duration-200"
            />
          );
        })}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: s.swatch }}
            />
            <div className="leading-tight">
              <p className="text-xl font-extrabold tabular text-accent">
                {s.value}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                {s.label}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ----- Backtest comparison panel -----

function BacktestComparisonPanel({ scenario }: { scenario: BacktestScenario }) {
  const { metric } = scenario;
  const unitLabel = backtestUnitLabel(metric.unit);
  return (
    <section
      aria-label={`Backtest comparison : ${scenario.label}`}
      className="rounded-md border border-dashed border-slate/70 bg-surface p-5 md:p-7"
    >
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-slate">
            Recorded backtest · {scenario.eventYear}
          </p>
          <h3 className="mt-1 text-[1.05rem] font-bold tracking-tight text-accent">
            {metric.label}
          </h3>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          {unitLabel}
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BacktestCell
          kicker="Predicted by authority"
          value={formatBacktestValue(metric.authorityPrediction, metric.unit)}
          source={metric.authoritySource}
        />
        <BacktestCell
          kicker="Predicted by ATLAS"
          value={formatBacktestValue(metric.atlasPrediction, metric.unit)}
          source={metric.atlasSource}
          highlighted
        />
        <BacktestCell
          kicker="Actual recorded"
          value={formatBacktestValue(metric.actualValue, metric.unit)}
          source={metric.actualSource}
        />
      </div>
    </section>
  );
}

function BacktestCell({
  kicker,
  value,
  source,
  highlighted = false,
}: {
  kicker: string;
  value: string;
  source: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-sm border bg-surface-soft/40 p-4",
        highlighted ? "border-cyan/50 bg-cyan-tint/30" : "border-line",
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate">
        {kicker}
      </p>
      <p className="mt-2 text-[28px] font-bold leading-none tabular tracking-tight text-accent">
        {value}
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate leading-snug">
        {source}
      </p>
    </div>
  );
}

// ----- Eligible-pool forecast -----

function tickYearsFor(horizonYears: HorizonYears): number[] {
  if (horizonYears <= 3) {
    return [0, 1, 2, 3];
  }
  if (horizonYears <= 10) {
    return [0, 4, 10];
  }
  return [0, 4, 9, 14, 19, 24];
}

function ForecastChart({
  forecast,
  horizonYears,
  setHorizonYears,
}: {
  forecast: ForecastTrajectory;
  horizonYears: HorizonYears;
  setHorizonYears: (y: HorizonYears) => void;
}) {
  const endIdx = horizonYears;
  const baseline = forecast.baseline.slice(0, endIdx + 1);
  const sim = forecast.sim.slice(0, endIdx + 1);
  const bandLow = forecast.bandLow.slice(0, endIdx + 1);
  const bandHigh = forecast.bandHigh.slice(0, endIdx + 1);

  const w = 100;
  const h = 36;
  const all = [...baseline, ...bandHigh, ...bandLow, 0];
  const yMin = Math.min(...all, 0);
  const yMax = Math.max(...all, 1);
  const yRange = Math.max(1, yMax - yMin);
  const xFor = (i: number) => (i / Math.max(endIdx, 1)) * w;
  const yFor = (v: number) => h - ((v - yMin) / yRange) * h;

  const baselinePts = baseline
    .map((v, i) => `${xFor(i).toFixed(2)},${yFor(v).toFixed(2)}`)
    .join(" ");
  const simPts = sim
    .map((v, i) => `${xFor(i).toFixed(2)},${yFor(v).toFixed(2)}`)
    .join(" ");
  // Closed polygon for the confidence band : upper edge forwards, lower edge
  // reversed, so the fill renders a continuous ribbon around the sim line.
  const bandPolygon =
    bandHigh.map((v, i) => `${xFor(i).toFixed(2)},${yFor(v).toFixed(2)}`).join(" ") +
    " " +
    bandLow
      .slice()
      .reverse()
      .map((v, idx) => {
        const i = bandLow.length - 1 - idx;
        return `${xFor(i).toFixed(2)},${yFor(v).toFixed(2)}`;
      })
      .join(" ");

  const endYear = FORECAST_BASE_YEAR + endIdx;
  const tickYears = tickYearsFor(horizonYears);

  return (
    <section
      aria-labelledby="forecast-heading"
      className="rounded-md border border-glacier bg-surface p-5 md:p-7"
    >
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
            Projection · 2026 to {endYear}
          </p>
          <h3
            id="forecast-heading"
            className="mt-1 text-[1.05rem] font-bold tracking-tight text-accent"
          >
            Eligible pool under current levers vs April 2026 baseline.
          </h3>
        </div>
        <div
          role="tablist"
          aria-label="Forecast horizon"
          className="inline-flex rounded-full border border-line bg-surface-soft p-1"
        >
          {HORIZON_OPTIONS.map((y) => {
            const active = y === horizonYears;
            const label = `${y === FORECAST_HORIZON_YEARS ? 25 : y} years`;
            return (
              <button
                key={y}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setHorizonYears(y)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors",
                  active
                    ? "bg-accent text-surface"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </header>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="block h-32 w-full"
        aria-hidden
      >
        <polygon
          points={bandPolygon}
          fill="hsl(var(--cyan))"
          fillOpacity="0.18"
        />
        <polyline
          points={baselinePts}
          fill="none"
          stroke="hsl(var(--accent))"
          strokeOpacity="0.4"
          strokeWidth="0.6"
          strokeDasharray="2 2"
        />
        <polyline
          points={simPts}
          fill="none"
          stroke="hsl(var(--cyan))"
          strokeWidth="1.2"
        />
      </svg>
      <div
        className="mt-3 grid gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint"
        style={{
          gridTemplateColumns: `repeat(${tickYears.length}, minmax(0, 1fr))`,
        }}
      >
        {tickYears.map((yr) => (
          <div key={yr} className="text-center">
            <p className="text-xs font-extrabold tabular text-accent">
              {sim[yr] ?? "—"}
            </p>
            <p>{FORECAST_BASE_YEAR + yr}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Cyan band : ±{Math.round(bandPctAtYear(endIdx) * 100)}% confidence at {endYear} · widens with horizon.
      </p>
    </section>
  );
}

function bandPctAtYear(n: number): number {
  if (n <= 0) return 0;
  if (n <= 3) return (n / 3) * 0.1;
  return 0.1 + ((n - 3) / 22) * 0.25;
}

// ----- Insight banner -----

function InsightBanner({
  levers,
  current,
  baseline,
  backtestActive,
  scenario,
  horizonYears,
  scope,
}: {
  levers: LeverState;
  current: CategoriseResult;
  baseline: CategoriseResult;
  backtestActive: boolean;
  scenario: BacktestScenario;
  horizonYears: HorizonYears;
  scope: ScopeRoute;
}) {
  const endYear = FORECAST_BASE_YEAR + horizonYears;
  let body: string;
  if (backtestActive) {
    body = scenario.punchline;
  } else {
    const sentences = buildInsight(levers, current, baseline, scope);
    const isDefault = sentences.length === 1 && sentences[0].startsWith("You are at the current April 2026 policy");
    body = isDefault
      ? sentences.join(" ")
      : `By ${endYear}, ${sentences.join(" ")}`;
  }
  return (
    <section
      aria-label={backtestActive ? "Backtest punchline" : "Policy insight"}
      className="rounded-md bg-gradient-to-br from-accent-deep to-accent px-6 py-6 text-surface md:px-8"
    >
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
        {backtestActive
          ? `Backtest · ${scenario.eventYear}`
          : `Insight · horizon ${endYear}`}
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-surface md:text-[15px]">
        {body}
      </p>
    </section>
  );
}

function buildInsight(
  levers: LeverState,
  current: CategoriseResult,
  baseline: CategoriseResult,
  scope: ScopeRoute = "all",
): string[] {
  const scopeNoun = scope === "all" ? "entities" : `${SCOPE_ROUTE_LABEL[scope]} entities`;
  const allDefault =
    levers.isc === DEFAULTS.isc &&
    levers.ihs === DEFAULTS.ihs &&
    levers.cos === DEFAULTS.cos &&
    levers.minSalary === DEFAULTS.minSalary &&
    levers.englishLevel === DEFAULTS.englishLevel &&
    levers.settlementYears === DEFAULTS.settlementYears &&
    levers.ilrFee === DEFAULTS.ilrFee &&
    levers.investorThreshold === DEFAULTS.investorThreshold;

  if (allDefault) {
    return ["You are at the current April 2026 policy. Move a lever to test."];
  }

  const sentences: string[] = [];
  const investorClosed = levers.investorThreshold >= INVESTOR_CLOSED;
  const salaryRaised = levers.minSalary > DEFAULTS.minSalary;
  const iscRaised = levers.isc > DEFAULTS.isc;

  // Investor closure dominates when active (the headline event).
  if (investorClosed) {
    const thresholdM = INVESTOR_CLOSED / 1_000_000;
    sentences.push(
      `Investor route closed at £${thresholdM}M threshold equivalent. FDI inflows on this category were £22.9B in 2022 and £1.3B the year after closure. The model carries that elasticity forward.`,
    );
  }

  if (salaryRaised) {
    const excluded = current.reasons.salaryFloor;
    const topSectors = dominantSalaryFloorSectors(
      current.salaryFloorSectorBreakdown,
      2,
    );
    const sectorsText =
      topSectors.length === 0
        ? "below-threshold"
        : topSectors.join(" and ").toLowerCase();
    const sectorCount = topSectors.reduce(
      (n, s) => n + (current.salaryFloorSectorBreakdown[s] ?? 0),
      0,
    );
    sentences.push(
      `Skilled Worker minimum salary at £${levers.minSalary.toLocaleString("en-GB")} excludes ${excluded} ${scope === "all" ? "entities" : scopeNoun}. ${sectorCount} of those are ${sectorsText} roles, where the floor most often binds.`,
    );
  }

  if (iscRaised) {
    const dropPct = Math.round(
      (current.reasons.costPressure / Math.max(SKILLED_WORKER_TOTAL, 1)) * 100,
    );
    sentences.push(
      `Higher Immigration Skills Charge reduces sponsored hiring by ${dropPct}%. Medium and large employers absorb the increase; small sponsors deprioritise.`,
    );
  }

  // Catch-all summary if no template fired but a lever moved.
  if (sentences.length === 0) {
    const eligibleDelta =
      current.counts.eligible - baseline.counts.eligible;
    const excludedDelta =
      current.counts.excluded - baseline.counts.excluded;
    const direction = eligibleDelta < 0 ? "narrows" : "broadens";
    sentences.push(
      `Current levers ${direction} the eligible pool by ${Math.abs(eligibleDelta)} ${scopeNoun} and shift ${Math.abs(excludedDelta)} into the excluded category.`,
    );
  }

  // If two or more dominant levers fired, append a combined summary line.
  if (sentences.length > 1) {
    const eligibleDelta = current.counts.eligible - baseline.counts.eligible;
    sentences.push(
      `Combined effect : ${Math.abs(eligibleDelta)} fewer ${scopeNoun} now reach the eligible state at the current lever positions.`,
    );
  }

  return sentences;
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
      input.atlas-slider-readonly,
      input.atlas-slider:disabled {
        cursor: not-allowed;
        opacity: 0.7;
      }
      input.atlas-slider-readonly::-webkit-slider-thumb,
      input.atlas-slider:disabled::-webkit-slider-thumb {
        background: hsl(var(--slate));
        cursor: not-allowed;
      }
      input.atlas-slider-readonly::-moz-range-thumb,
      input.atlas-slider:disabled::-moz-range-thumb {
        background: hsl(var(--slate));
        cursor: not-allowed;
      }
      /* Custom breakpoint : the 3-col layout (controls + views + audit
         sidebar) only fits comfortably at >= 1280px. Below that, stack. */
      @media (min-width: 1280px) {
        .simulator-shell\\:grid-cols-\\[400px_1fr_19rem\\] {
          grid-template-columns: 400px 1fr 19rem;
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
