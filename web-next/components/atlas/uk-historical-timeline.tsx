"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  AuditTrailProvider,
  useAuditTrail,
  type PageAudit,
  type AuditFocus,
} from "@/components/atlas/audit-context";
import { AuditSidebar } from "@/components/atlas/audit-sidebar";
import { CollapsibleContext } from "@/components/atlas/collapsible-context";
import { RUBRIC_VERSION } from "@/lib/atlas/rubric";
import {
  GDP_GROWTH_BY_YEAR,
  NET_MIGRATION_BY_YEAR,
  POLICY_EVENTS,
  TALENT_ROUTE_COLOR,
  TALENT_ROUTE_LABEL,
  TALENT_ROUTE_ORDER,
  UK_HISTORY_FIXTURE_VERSION,
  UK_POPULATION_BY_YEAR,
  UK_TALENT_INFLOWS_BY_ROUTE,
  activePolicyLeversAt,
  nearestValueAt,
  netMigrationAt,
  totalTalentInflows,
  type PolicyCategory,
  type PolicyEvent,
  type TalentInflowYear,
  type TalentRouteKey,
  type YearValue,
} from "@/lib/atlas/uk-history";

// Chart geometry. The line plot covers data years 2000 to 2025, but the x
// domain extends to 2026 so the future tightening event still renders as a
// marker rather than getting clipped.
const X_MIN = 2000;
const X_MAX = 2026;
const Y_MAX = 800_000;
const VB_W = 1000;
const VB_H = 420;
const PAD_LEFT = 64;
const PAD_RIGHT = 28;
const PAD_TOP = 28;
const PAD_BOTTOM = 84;
const INNER_W = VB_W - PAD_LEFT - PAD_RIGHT;
const INNER_H = VB_H - PAD_TOP - PAD_BOTTOM;

const CURSOR_RANGE_MIN = 2000;
const CURSOR_RANGE_MAX = 2025;
const DEFAULT_CURSOR_YEAR = 2012;

function xForYear(year: number): number {
  return PAD_LEFT + ((year - X_MIN) / (X_MAX - X_MIN)) * INNER_W;
}
function yearForX(x: number): number {
  const raw = X_MIN + ((x - PAD_LEFT) / INNER_W) * (X_MAX - X_MIN);
  return Math.max(CURSOR_RANGE_MIN, Math.min(CURSOR_RANGE_MAX, Math.round(raw)));
}
function yForValue(v: number): number {
  return PAD_TOP + (1 - v / Y_MAX) * INNER_H;
}

const CATEGORY_STROKE: Record<PolicyCategory, string> = {
  restriction: "hsl(var(--cyan))",
  tightening: "hsl(var(--accent))",
  expansion: "hsl(var(--glacier))",
  system: "hsl(var(--slate))",
};
const CATEGORY_LABEL: Record<PolicyCategory, string> = {
  restriction: "Restriction",
  tightening: "Tightening",
  expansion: "Expansion",
  system: "System change",
};

// ----- Root view -----

interface Props {
  basePageAudit: Omit<PageAudit, "jurisdiction">;
  description: string;
}

export function UkHistoricalTimeline({ basePageAudit, description }: Props) {
  const pageAudit: PageAudit = React.useMemo(
    () => ({ ...basePageAudit, jurisdiction: "United Kingdom" }),
    [basePageAudit],
  );
  return (
    <AuditTrailProvider pageAudit={pageAudit}>
      <TimelineBody description={description} />
    </AuditTrailProvider>
  );
}

// ----- Body with state + layout -----

function TimelineBody({ description }: { description: string }) {
  const [cursorYear, setCursorYear] = React.useState<number>(DEFAULT_CURSOR_YEAR);
  const [hoveredEventYear, setHoveredEventYear] = React.useState<number | null>(
    null,
  );

  // Drive the audit sidebar from the cursor year. The hover() call sets a
  // preview focus that the sidebar surfaces unless something is pinned.
  const { hover } = useAuditTrail();
  React.useEffect(() => {
    const focus = focusForCursorYear(cursorYear);
    hover(focus);
    return () => hover(null);
  }, [cursorYear, hover]);

  return (
    <div className="grid grid-cols-1 gap-10 uk-shell:grid-cols-[1fr_19rem]">
      <ShellStyles />
      <div className="min-w-0 space-y-10">
        <CollapsibleContext label="What the timeline shows">
          <p>{description}</p>
        </CollapsibleContext>
        <HeroStatRow />
        <TimelineChart
          cursorYear={cursorYear}
          setCursorYear={setCursorYear}
          hoveredEventYear={hoveredEventYear}
          setHoveredEventYear={setHoveredEventYear}
        />
        <MacroOverlayPanel
          cursorYear={cursorYear}
          setCursorYear={setCursorYear}
        />
        <BacktestCallout />
        <TakeawayBanner />
      </div>
      <AuditSidebar />
    </div>
  );
}

function focusForCursorYear(year: number): AuditFocus {
  const value = netMigrationAt(year);
  const levers = activePolicyLeversAt(year);
  const leverList =
    levers.length === 0
      ? "none"
      : levers.map((l) => l.label).join(", ");
  const valueLabel =
    value === null ? "no published figure" : formatThousands(value.value);
  return {
    id: `uk-history-cursor-${year}`,
    proposition: `Net UK migration in ${year} : ${valueLabel}. Active policy levers : ${leverList}.`,
    evidence: [
      {
        authority: "Office for National Statistics",
        dataset: `ONS Long-term International Migration estimates, ${year} release`,
        lastUpdated: UK_HISTORY_FIXTURE_VERSION,
        confidence: "high",
        fixtureRef: "uk-history.json",
      },
    ],
    grade: {
      rubricVersion: RUBRIC_VERSION,
      method:
        "Historical lens : recorded net migration anchored to in-force policy levers at the cursor year.",
      rubricHref: "/atlas/rubric",
    },
  };
}

// ----- Hero stat row -----

function HeroStatRow() {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-md border border-glacier bg-surface p-5 md:grid-cols-4 md:gap-6 md:p-7">
      <Stat n="25" label="Years of data on the timeline" />
      <Stat n="7" label="Major policy events tracked" />
      <Stat n="£745B" label="Cumulative GDP contribution from migration" />
      <Stat n="488K" label="Net migration peak (2021)" />
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-extrabold leading-none tabular tracking-tight text-accent md:text-[2.25rem]">
        {n}
      </p>
      <p className="mt-1.5 text-[13px] font-medium text-ink-soft">{label}</p>
    </div>
  );
}

// ----- Timeline chart -----

interface ChartProps {
  cursorYear: number;
  setCursorYear: (n: number) => void;
  hoveredEventYear: number | null;
  setHoveredEventYear: (y: number | null) => void;
}

function useIsNarrow(query = "(max-width: 599px)"): boolean {
  const [isMatch, setIsMatch] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setIsMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return isMatch;
}

function TimelineChart({
  cursorYear,
  setCursorYear,
  hoveredEventYear,
  setHoveredEventYear,
}: ChartProps) {
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const draggingRef = React.useRef(false);
  const isNarrow = useIsNarrow();

  const linePoints = NET_MIGRATION_BY_YEAR.map(
    (p) => `${xForYear(p.year).toFixed(2)},${yForValue(p.value).toFixed(2)}`,
  ).join(" ");

  const updateCursorFromEvent = React.useCallback(
    (clientX: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const xVb = ((clientX - rect.left) / rect.width) * VB_W;
      setCursorYear(yearForX(xVb));
    },
    [setCursorYear],
  );

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    draggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    updateCursorFromEvent(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current) return;
    updateCursorFromEvent(e.clientX);
  };
  const onPointerUp = () => {
    draggingRef.current = false;
  };

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setCursorYear(Math.max(CURSOR_RANGE_MIN, cursorYear - 1));
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setCursorYear(Math.min(CURSOR_RANGE_MAX, cursorYear + 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setCursorYear(CURSOR_RANGE_MIN);
    } else if (e.key === "End") {
      e.preventDefault();
      setCursorYear(CURSOR_RANGE_MAX);
    }
  };

  const cursorX = xForYear(cursorYear);
  const cursorValue = netMigrationAt(cursorYear);
  const cursorY = cursorValue ? yForValue(cursorValue.value) : null;
  const hoveredEvent = hoveredEventYear
    ? POLICY_EVENTS.find((e) => e.year === hoveredEventYear) ?? null
    : null;

  const yTicks = [0, 200_000, 400_000, 600_000, 800_000];
  const xTicks = [2000, 2005, 2010, 2015, 2020, 2025];

  return (
    <section
      aria-label="UK net migration timeline, 2000 to 2025"
      className="rounded-md border border-glacier bg-surface p-4 md:p-6"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
            Twenty-five-year record
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-accent md:text-[1.5rem]">
            Net migration with every policy lever marked.
          </h2>
        </div>
        <CategoryLegend />
      </div>

      <div
        className="relative w-full"
        style={{ aspectRatio: `${VB_W} / ${VB_H}`, maxHeight: 420 }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 block h-full w-full cursor-ew-resize touch-none select-none"
          role="slider"
          aria-label="Scrub through years to inspect each policy event"
          aria-valuemin={CURSOR_RANGE_MIN}
          aria-valuemax={CURSOR_RANGE_MAX}
          aria-valuenow={cursorYear}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          {/* Gridlines + y-axis labels */}
          {yTicks.map((v) => {
            const y = yForValue(v);
            return (
              <g key={v}>
                <line
                  x1={PAD_LEFT}
                  x2={VB_W - PAD_RIGHT}
                  y1={y}
                  y2={y}
                  stroke="hsl(var(--line))"
                  strokeWidth={1}
                />
                <text
                  x={PAD_LEFT - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontFamily="var(--font-inter), Inter, sans-serif"
                  fontSize="11"
                  fill="hsl(var(--ink-muted))"
                  className="tabular"
                >
                  {v === 0 ? "0" : `${v / 1000}K`}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {xTicks.map((yr) => {
            const x = xForYear(yr);
            return (
              <text
                key={yr}
                x={x}
                y={VB_H - PAD_BOTTOM + 18}
                textAnchor="middle"
                fontFamily="var(--font-inter), Inter, sans-serif"
                fontSize="11"
                fill="hsl(var(--ink-muted))"
                className="tabular"
              >
                {yr}
              </text>
            );
          })}

          {/* Net migration line */}
          <polyline
            points={linePoints}
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {NET_MIGRATION_BY_YEAR.map((p) => (
            <circle
              key={p.year}
              cx={xForYear(p.year)}
              cy={yForValue(p.value)}
              r={2.5}
              fill="hsl(var(--accent))"
            />
          ))}

          {/* Event markers */}
          {POLICY_EVENTS.map((ev) => {
            const x = xForYear(ev.year);
            const stroke = CATEGORY_STROKE[ev.category];
            const isHovered = hoveredEventYear === ev.year;
            return (
              <g
                key={`${ev.year}-${ev.label}`}
                onMouseEnter={() => setHoveredEventYear(ev.year)}
                onMouseLeave={() => setHoveredEventYear(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (ev.year >= CURSOR_RANGE_MIN && ev.year <= CURSOR_RANGE_MAX) {
                    setCursorYear(ev.year);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <line
                  x1={x}
                  x2={x}
                  y1={PAD_TOP}
                  y2={VB_H - PAD_BOTTOM}
                  stroke={stroke}
                  strokeWidth={isHovered ? 2.5 : 1.25}
                  strokeOpacity={isHovered ? 0.95 : 0.55}
                  strokeDasharray={ev.category === "system" ? "3 4" : undefined}
                />
                <circle
                  cx={x}
                  cy={PAD_TOP}
                  r={isHovered ? 4.5 : 3.25}
                  fill={stroke}
                  stroke="hsl(var(--surface))"
                  strokeWidth={1.5}
                />
                {!isNarrow && (
                  <text
                    x={x + 6}
                    y={PAD_TOP - 6}
                    fontFamily="var(--font-inter), Inter, sans-serif"
                    fontSize="10"
                    fontWeight={600}
                    fill="hsl(var(--ink))"
                    transform={`rotate(-45 ${x + 6} ${PAD_TOP - 6})`}
                  >
                    {`${ev.year} · ${ev.label}`}
                  </text>
                )}
                {/* Invisible hit-target widens the hover zone around the line */}
                <rect
                  x={x - 8}
                  y={PAD_TOP - 4}
                  width={16}
                  height={INNER_H + 8}
                  fill="transparent"
                />
              </g>
            );
          })}

          {/* Scrubbable cursor */}
          <g pointerEvents="none">
            <line
              x1={cursorX}
              x2={cursorX}
              y1={PAD_TOP - 4}
              y2={VB_H - PAD_BOTTOM + 4}
              stroke="hsl(var(--accent-deep))"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            {cursorY !== null && (
              <circle
                cx={cursorX}
                cy={cursorY}
                r={6}
                fill="hsl(var(--cyan))"
                stroke="hsl(var(--surface))"
                strokeWidth={2.5}
              />
            )}
            <rect
              x={cursorX - 22}
              y={VB_H - PAD_BOTTOM + 26}
              width={44}
              height={18}
              rx={2}
              fill="hsl(var(--accent-deep))"
            />
            <text
              x={cursorX}
              y={VB_H - PAD_BOTTOM + 38}
              textAnchor="middle"
              fontFamily="var(--font-inter), Inter, sans-serif"
              fontSize="11"
              fontWeight={700}
              fill="hsl(var(--surface))"
              className="tabular"
            >
              {cursorYear}
            </text>
          </g>
        </svg>

        {hoveredEvent?.impactNote && (
          <EventTooltip event={hoveredEvent} />
        )}
      </div>

      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Drag the cursor or click any event marker to inspect the year.
      </p>
    </section>
  );
}

function CategoryLegend() {
  const items: PolicyCategory[] = [
    "restriction",
    "tightening",
    "expansion",
    "system",
  ];
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((c) => (
        <li
          key={c}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted"
        >
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: CATEGORY_STROKE[c] }}
          />
          {CATEGORY_LABEL[c]}
        </li>
      ))}
    </ul>
  );
}

function EventTooltip({ event }: { event: PolicyEvent }) {
  return (
    <div
      className="pointer-events-none absolute z-10 max-w-[260px] -translate-x-1/2 rounded-sm border border-accent/30 bg-surface px-3 py-2 shadow-[0_2px_6px_-3px_rgba(15,23,42,0.25)]"
      style={{
        left: `${(xForYear(event.year) / VB_W) * 100}%`,
        top: 8,
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
        {event.year} · {CATEGORY_LABEL[event.category]}
      </p>
      <p className="mt-1 text-[13px] font-semibold leading-snug text-accent">
        {event.label}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-ink-muted">
        {event.impactNote}
      </p>
    </div>
  );
}

// ----- Macro overlay panel : four scrubbable charts sharing the cursor year -----

const MACRO_X_MIN = 2000;
const MACRO_X_MAX = 2025;
const MACRO_W = 240;
const MACRO_H = 120;

function macroXFor(year: number): number {
  return ((year - MACRO_X_MIN) / (MACRO_X_MAX - MACRO_X_MIN)) * MACRO_W;
}

function MacroOverlayPanel({
  cursorYear,
  setCursorYear,
}: {
  cursorYear: number;
  setCursorYear: (n: number) => void;
}) {
  const migration = netMigrationAt(cursorYear);
  const population = nearestValueAt(UK_POPULATION_BY_YEAR, cursorYear);
  const gdp = nearestValueAt(GDP_GROWTH_BY_YEAR, cursorYear);
  const talentRow = nearestTalentRow(cursorYear);
  const skilledTotal = talentRow ? totalTalentInflows(talentRow) : 0;

  return (
    <section
      aria-label="Macro context at the cursor year"
      className="rounded-md border border-glacier bg-surface p-5 md:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
            Macro context · {cursorYear}
          </p>
          <h3 className="mt-1 text-[1.05rem] font-bold tracking-tight text-accent">
            What the country looked like that year.
          </h3>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Drag any chart : the cursor moves on all four
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        <NetMigrationChart cursorYear={cursorYear} setCursorYear={setCursorYear} />
        <PopulationChart cursorYear={cursorYear} setCursorYear={setCursorYear} />
        <GDPBarChart cursorYear={cursorYear} setCursorYear={setCursorYear} />
        <TalentInflowChart
          cursorYear={cursorYear}
          setCursorYear={setCursorYear}
        />
      </div>

      <p className="mt-5 rounded-sm border-l-2 border-cyan bg-cyan-tint/20 px-4 py-3 text-sm leading-relaxed text-ink">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan mr-2">
          In {cursorYear}
        </span>
        net migration{" "}
        <strong>
          {migration ? formatThousands(migration.value) : "no published figure"}
        </strong>
        , population{" "}
        <strong>{population ? `${population.value.toFixed(1)}M` : "—"}</strong>
        , GDP growth{" "}
        <strong>
          {gdp ? `${gdp.value > 0 ? "+" : ""}${gdp.value.toFixed(1)}%` : "—"}
        </strong>
        , total skilled inflows{" "}
        <strong>{talentRow ? formatThousands(skilledTotal) : "—"}</strong>.
      </p>
    </section>
  );
}

function nearestTalentRow(year: number): TalentInflowYear | null {
  if (UK_TALENT_INFLOWS_BY_ROUTE.length === 0) return null;
  let best = UK_TALENT_INFLOWS_BY_ROUTE[0];
  let bestDist = Math.abs(best.year - year);
  for (let i = 1; i < UK_TALENT_INFLOWS_BY_ROUTE.length; i++) {
    const d = Math.abs(UK_TALENT_INFLOWS_BY_ROUTE[i].year - year);
    if (d < bestDist) {
      best = UK_TALENT_INFLOWS_BY_ROUTE[i];
      bestDist = d;
    }
  }
  return best;
}

// Generic scrubbable chart shell. Renders a kicker + cursor-value line above
// the SVG; handles pointer drag/click to update the cursor year via the
// provided setter. The actual chart content is passed in as children.
function ScrubChart({
  title,
  cursorValueLine,
  cursorYear,
  setCursorYear,
  children,
}: {
  title: string;
  cursorValueLine: string;
  cursorYear: number;
  setCursorYear: (n: number) => void;
  children: React.ReactNode;
}) {
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const draggingRef = React.useRef(false);

  const updateFromClient = React.useCallback(
    (clientX: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const xVb = ((clientX - rect.left) / rect.width) * MACRO_W;
      const raw =
        MACRO_X_MIN + (xVb / MACRO_W) * (MACRO_X_MAX - MACRO_X_MIN);
      const yr = Math.max(
        CURSOR_RANGE_MIN,
        Math.min(CURSOR_RANGE_MAX, Math.round(raw)),
      );
      setCursorYear(yr);
    },
    [setCursorYear],
  );

  return (
    <div className="rounded-sm border border-line bg-surface-soft/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          {title}
        </p>
      </div>
      <p className="mt-1 text-[13px] font-semibold text-accent tabular leading-tight">
        {cursorValueLine}
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MACRO_W} ${MACRO_H}`}
        preserveAspectRatio="none"
        className="mt-2 block w-full cursor-ew-resize touch-none select-none"
        style={{ aspectRatio: `${MACRO_W} / ${MACRO_H}` }}
        onPointerDown={(e) => {
          draggingRef.current = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          updateFromClient(e.clientX);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) updateFromClient(e.clientX);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        role="slider"
        aria-valuemin={CURSOR_RANGE_MIN}
        aria-valuemax={CURSOR_RANGE_MAX}
        aria-valuenow={cursorYear}
        aria-label={`${title} chart · drag to scrub year`}
      >
        {children}
        <CursorLine cursorYear={cursorYear} />
      </svg>
    </div>
  );
}

function CursorLine({ cursorYear }: { cursorYear: number }) {
  const x = macroXFor(Math.max(MACRO_X_MIN, Math.min(MACRO_X_MAX, cursorYear)));
  return (
    <line
      x1={x}
      x2={x}
      y1={0}
      y2={MACRO_H}
      stroke="hsl(var(--accent-deep))"
      strokeWidth={1.25}
      strokeDasharray="3 3"
    />
  );
}

function NetMigrationChart({
  cursorYear,
  setCursorYear,
}: {
  cursorYear: number;
  setCursorYear: (n: number) => void;
}) {
  const at = netMigrationAt(cursorYear);
  const yMin = 0;
  const yMax = 800_000;
  const yFor = (v: number) =>
    MACRO_H - ((v - yMin) / (yMax - yMin)) * MACRO_H;
  const pts = NET_MIGRATION_BY_YEAR.map(
    (p) => `${macroXFor(p.year).toFixed(1)},${yFor(p.value).toFixed(1)}`,
  ).join(" ");
  const valueLine = at
    ? `${formatThousands(at.value)} in ${at.year}`
    : `no figure in ${cursorYear}`;
  return (
    <ScrubChart
      title="Net migration"
      cursorValueLine={valueLine}
      cursorYear={cursorYear}
      setCursorYear={setCursorYear}
    >
      <polyline
        points={pts}
        fill="none"
        stroke="hsl(var(--accent))"
        strokeWidth={2}
      />
      {NET_MIGRATION_BY_YEAR.map((p) => (
        <circle
          key={p.year}
          cx={macroXFor(p.year)}
          cy={yFor(p.value)}
          r={1.75}
          fill="hsl(var(--accent))"
        />
      ))}
    </ScrubChart>
  );
}

function PopulationChart({
  cursorYear,
  setCursorYear,
}: {
  cursorYear: number;
  setCursorYear: (n: number) => void;
}) {
  const at = nearestValueAt(UK_POPULATION_BY_YEAR, cursorYear);
  const yMin = 58;
  const yMax = 70;
  const yFor = (v: number) =>
    MACRO_H - ((v - yMin) / (yMax - yMin)) * MACRO_H;
  const pts = UK_POPULATION_BY_YEAR.map(
    (p) => `${macroXFor(p.year).toFixed(1)},${yFor(p.value).toFixed(1)}`,
  ).join(" ");
  const valueLine = at
    ? `${at.value.toFixed(1)}M in ${at.year}`
    : `no figure in ${cursorYear}`;
  return (
    <ScrubChart
      title="UK population (M)"
      cursorValueLine={valueLine}
      cursorYear={cursorYear}
      setCursorYear={setCursorYear}
    >
      <polyline
        points={pts}
        fill="none"
        stroke="hsl(var(--cyan))"
        strokeWidth={2}
      />
      {UK_POPULATION_BY_YEAR.map((p) => (
        <circle
          key={p.year}
          cx={macroXFor(p.year)}
          cy={yFor(p.value)}
          r={2}
          fill="hsl(var(--cyan))"
        />
      ))}
    </ScrubChart>
  );
}

function GDPBarChart({
  cursorYear,
  setCursorYear,
}: {
  cursorYear: number;
  setCursorYear: (n: number) => void;
}) {
  const at = nearestValueAt(GDP_GROWTH_BY_YEAR, cursorYear);
  const yMin = -12;
  const yMax = 10;
  const yFor = (v: number) =>
    MACRO_H - ((v - yMin) / (yMax - yMin)) * MACRO_H;
  const zeroY = yFor(0);
  const barW = 5;
  const valueLine = at
    ? `${at.value > 0 ? "+" : ""}${at.value.toFixed(1)}% in ${at.year}`
    : `no figure in ${cursorYear}`;
  return (
    <ScrubChart
      title="GDP growth (%)"
      cursorValueLine={valueLine}
      cursorYear={cursorYear}
      setCursorYear={setCursorYear}
    >
      <line
        x1={0}
        x2={MACRO_W}
        y1={zeroY}
        y2={zeroY}
        stroke="hsl(var(--line))"
        strokeWidth={0.75}
      />
      {GDP_GROWTH_BY_YEAR.map((p) => {
        const x = macroXFor(p.year);
        const top = yFor(Math.max(0, p.value));
        const bottom = yFor(Math.min(0, p.value));
        const height = Math.max(1, bottom - top);
        const isNegative = p.value < 0;
        return (
          <rect
            key={p.year}
            x={x - barW / 2}
            y={top}
            width={barW}
            height={height}
            fill={isNegative ? "#C0414B" : "hsl(var(--accent))"}
            opacity={0.9}
          />
        );
      })}
    </ScrubChart>
  );
}

function TalentInflowChart({
  cursorYear,
  setCursorYear,
}: {
  cursorYear: number;
  setCursorYear: (n: number) => void;
}) {
  const at = nearestTalentRow(cursorYear);
  const yMax = Math.max(
    ...UK_TALENT_INFLOWS_BY_ROUTE.map((r) => totalTalentInflows(r)),
    1,
  );
  const yFor = (v: number) => MACRO_H - (v / yMax) * MACRO_H;

  // Build a stacked area, layered from bottom up in TALENT_ROUTE_ORDER.
  const reversed = [...TALENT_ROUTE_ORDER].reverse(); // draw biggest layer last
  const layerPaths: Array<{ route: TalentRouteKey; d: string }> = [];

  // Compute cumulative top for each layer per year.
  const yearCount = UK_TALENT_INFLOWS_BY_ROUTE.length;
  const cumulativeByYear: number[][] = UK_TALENT_INFLOWS_BY_ROUTE.map(() => []);
  for (let i = 0; i < yearCount; i++) {
    let running = 0;
    for (const route of TALENT_ROUTE_ORDER) {
      running += UK_TALENT_INFLOWS_BY_ROUTE[i][route];
      cumulativeByYear[i].push(running);
    }
  }

  for (let layerIdx = 0; layerIdx < TALENT_ROUTE_ORDER.length; layerIdx++) {
    const route = TALENT_ROUTE_ORDER[layerIdx];
    const topPts: string[] = [];
    const bottomPts: string[] = [];
    for (let i = 0; i < yearCount; i++) {
      const x = macroXFor(UK_TALENT_INFLOWS_BY_ROUTE[i].year);
      const topV = cumulativeByYear[i][layerIdx];
      const bottomV = layerIdx === 0 ? 0 : cumulativeByYear[i][layerIdx - 1];
      topPts.push(`${x.toFixed(1)},${yFor(topV).toFixed(1)}`);
      bottomPts.push(`${x.toFixed(1)},${yFor(bottomV).toFixed(1)}`);
    }
    bottomPts.reverse();
    const d = `M ${topPts.join(" L ")} L ${bottomPts.join(" L ")} Z`;
    layerPaths.push({ route, d });
  }

  // Find dominant route for the cursor year.
  let dominantRoute: TalentRouteKey | null = null;
  let dominantValue = 0;
  if (at) {
    for (const route of TALENT_ROUTE_ORDER) {
      if (at[route] > dominantValue) {
        dominantRoute = route;
        dominantValue = at[route];
      }
    }
  }
  const valueLine = at
    ? `${formatThousands(totalTalentInflows(at))} total in ${at.year}${dominantRoute ? ` · ${TALENT_ROUTE_LABEL[dominantRoute]} leads` : ""}`
    : `no figure in ${cursorYear}`;

  return (
    <ScrubChart
      title="Talent inflows by route"
      cursorValueLine={valueLine}
      cursorYear={cursorYear}
      setCursorYear={setCursorYear}
    >
      {layerPaths.map(({ route, d }) => (
        <path
          key={route}
          d={d}
          fill={TALENT_ROUTE_COLOR[route]}
          fillOpacity={0.85}
        />
      ))}
    </ScrubChart>
  );
}

// Legacy Sparkline retained below for any older references; unused after the
// macro panel rewrite. Safe to remove in a later pass.
function _Sparkline({
  series,
  cursorYear,
}: {
  series: YearValue[];
  cursorYear: number;
}) {
  if (series.length === 0) return null;
  const w = 220;
  const h = 36;
  const xs = series.map((p) => p.year);
  const ys = series.map((p) => p.value);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys, 0);
  const yMax = Math.max(...ys, 1);
  const xRange = Math.max(1, xMax - xMin);
  const yRange = Math.max(1e-9, yMax - yMin);
  const x = (yr: number) => ((yr - xMin) / xRange) * w;
  const y = (v: number) => h - ((v - yMin) / yRange) * h;
  const points = series.map((p) => `${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const cursorX = x(Math.max(xMin, Math.min(xMax, cursorYear)));
  const nearest = nearestValueAt(series, cursorYear);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="mt-2 block h-9 w-full"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--accent))"
        strokeWidth={1.5}
      />
      {nearest && (
        <circle
          cx={x(nearest.year)}
          cy={y(nearest.value)}
          r={2.5}
          fill="hsl(var(--cyan))"
        />
      )}
      <line
        x1={cursorX}
        x2={cursorX}
        y1={0}
        y2={h}
        stroke="hsl(var(--accent-deep))"
        strokeWidth={0.75}
        strokeDasharray="2 2"
      />
    </svg>
  );
}

// ----- Backtest callout -----

function BacktestCallout() {
  return (
    <section className="relative overflow-hidden rounded-md bg-gradient-to-br from-accent-deep to-accent px-6 py-8 text-surface md:px-10 md:py-10">
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-surface/70">
        Backtest ready
      </p>
      <h3 className="mt-3 max-w-3xl text-2xl font-extrabold leading-[1.15] tracking-tight md:text-[1.875rem]">
        The 2012 PSW closure is the cleanest test case.
      </h3>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-surface/85">
        The government scored the 2012 Post-Study Work closure as a 49% real
        reduction in PSW grants. The All-Party Parliamentary Group measured
        88% once cohort-tracking caught up. That gap, between the in-flight
        estimate and the recorded outcome, is what a credible forecasting
        model has to close. Rewind the cursor to 2011, run the model with
        the rules of that day, and compare its prediction to the recorded
        2012 to 2014 actuals.
      </p>
      <Link
        href="/atlas/simulator"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan px-6 py-3 text-kicker uppercase text-surface transition-colors hover:bg-cyan/85"
      >
        Open the policy console
        <span aria-hidden>→</span>
      </Link>
    </section>
  );
}

// ----- Takeaway banner -----

function TakeawayBanner() {
  return (
    <section className="rounded-md bg-gradient-to-br from-accent to-accent-deep px-6 py-8 text-surface md:px-10 md:py-10">
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
        Takeaway
      </p>
      <p className="mt-3 max-w-4xl text-[17px] font-semibold leading-[1.45] text-surface md:text-[1.25rem]">
        The model anchors on twenty-five years of UK migration policy. Each
        policy lever produced a measurable effect on the curve. The
        forecasting credibility comes from this record, not from rubric
        arithmetic alone.
      </p>
    </section>
  );
}

// ----- Helpers -----

function formatThousands(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("en-GB");
}

function ShellStyles() {
  return (
    <style>{`
      @media (min-width: 1280px) {
        .uk-shell\\:grid-cols-\\[1fr_19rem\\] {
          grid-template-columns: 1fr 19rem;
        }
      }
    `}</style>
  );
}
