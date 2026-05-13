"use client";

import * as React from "react";
import Link from "next/link";
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
  NITAQAT_TIER_COLOR,
  NITAQAT_TIER_LABEL,
  NITAQAT_TIER_ORDER,
  SA_FDI_INWARD_BY_YEAR,
  SA_HISTORY_FIXTURE_VERSION,
  SA_NET_TALENT_INFLOW_BY_YEAR,
  SA_NITAQAT_TIER_DIST,
  SA_POLICY_EVENTS,
  SA_SECTOR_PROJECTIONS,
  activeSaLeversAt,
  nearestNitaqatAt,
  nearestValueAt,
  talentInflowAt,
  type NitaqatTier,
  type SaPolicyCategory,
  type SaPolicyEvent,
} from "@/lib/atlas/sa-history";

// Main chart geometry. The x domain extends to 2030 so Vision 2030 horizon
// targets and the National Talent Strategy event still render in-frame.
const X_MIN = 2010;
const X_MAX = 2030;
const Y_MAX = 1800; // thousands of skilled inflows
const VB_W = 1000;
const VB_H = 420;
const PAD_LEFT = 64;
const PAD_RIGHT = 28;
const PAD_TOP = 28;
const PAD_BOTTOM = 84;
const INNER_W = VB_W - PAD_LEFT - PAD_RIGHT;
const INNER_H = VB_H - PAD_TOP - PAD_BOTTOM;

const CURSOR_RANGE_MIN = 2010;
const CURSOR_RANGE_MAX = 2030;
const DEFAULT_CURSOR_YEAR = 2016;

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

const CATEGORY_STROKE: Record<SaPolicyCategory, string> = {
  system: "hsl(var(--slate))",
  tightening: "hsl(var(--accent))",
  expansion: "hsl(var(--cyan))",
};
const CATEGORY_LABEL: Record<SaPolicyCategory, string> = {
  system: "System change",
  tightening: "Tightening",
  expansion: "Expansion",
};

// ----- Root view -----

interface Props {
  basePageAudit: Omit<PageAudit, "jurisdiction">;
  description: string;
}

export function SaHistoricalView({ basePageAudit, description }: Props) {
  const pageAudit: PageAudit = React.useMemo(
    () => ({ ...basePageAudit, jurisdiction: "Saudi Arabia" }),
    [basePageAudit],
  );
  return (
    <AuditTrailProvider pageAudit={pageAudit}>
      <ViewBody description={description} />
    </AuditTrailProvider>
  );
}

function ViewBody({ description }: { description: string }) {
  const [cursorYear, setCursorYear] = React.useState<number>(
    DEFAULT_CURSOR_YEAR,
  );
  const [hoveredEventYear, setHoveredEventYear] = React.useState<number | null>(
    null,
  );

  const { hover } = useAuditTrail();
  React.useEffect(() => {
    const focus = focusForCursorYear(cursorYear);
    hover(focus);
    return () => hover(null);
  }, [cursorYear, hover]);

  return (
    <div className="grid grid-cols-1 gap-10 sa-shell:grid-cols-[1fr_19rem]">
      <ShellStyles />
      <div className="min-w-0 space-y-10">
        <CollapsibleContext label="What the strategy lens shows">
          <p>{description}</p>
        </CollapsibleContext>
        <HeroStatRow />
        <PolicyTimeline
          cursorYear={cursorYear}
          setCursorYear={setCursorYear}
          hoveredEventYear={hoveredEventYear}
          setHoveredEventYear={setHoveredEventYear}
        />
        <MacroOverlayPanel
          cursorYear={cursorYear}
          setCursorYear={setCursorYear}
        />
        <SectorProjections />
        <ForecastCallout />
        <TakeawayBanner />
      </div>
      <AuditSidebar />
    </div>
  );
}

function focusForCursorYear(year: number): AuditFocus {
  const value = talentInflowAt(year);
  const levers = activeSaLeversAt(year);
  const leverList =
    levers.length === 0 ? "none" : levers.map((l) => l.label).join(", ");
  const valueLabel =
    value === null
      ? "no published figure at this year"
      : `${formatThousands(value.value * 1000)} skilled inflows`;
  return {
    id: `sa-history-cursor-${year}`,
    proposition: `Saudi skilled inflows in ${year} : ${valueLabel}. Active policy levers : ${leverList}.`,
    evidence: [
      {
        authority: "Ministry of Human Resources and Social Development",
        dataset: `MHRSD Nitaqat releases, ${year} snapshot`,
        lastUpdated: SA_HISTORY_FIXTURE_VERSION,
        confidence: "high",
        fixtureRef: "sa-history.json",
      },
    ],
    grade: {
      rubricVersion: RUBRIC_VERSION,
      method:
        "Strategy lens : Vision 2030 sector targets paired with Nitaqat tier distribution and in-force policy levers.",
      rubricHref: "/atlas/rubric",
    },
  };
}

// ----- Hero stat row -----

function HeroStatRow() {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-md border border-glacier bg-surface p-5 md:grid-cols-4 md:gap-6 md:p-7">
      <Stat n="14" label="Vision 2030 priority sectors" />
      <Stat n="450K" label="NEOM workforce target by 2030" />
      <Stat n="25%" label="Platinum Nitaqat share by 2025" />
      <Stat n="R$148B" label="Inward FDI in 2025" />
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

// ----- Policy timeline -----

interface TimelineProps {
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

function PolicyTimeline({
  cursorYear,
  setCursorYear,
  hoveredEventYear,
  setHoveredEventYear,
}: TimelineProps) {
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const draggingRef = React.useRef(false);
  const isNarrow = useIsNarrow();

  // Talent inflows are in thousands. Multiply for axis display.
  const linePoints = SA_NET_TALENT_INFLOW_BY_YEAR.map(
    (p) =>
      `${xForYear(p.year).toFixed(2)},${yForValue(p.value).toFixed(2)}`,
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
  const cursorValue = talentInflowAt(cursorYear);
  const cursorY = cursorValue ? yForValue(cursorValue.value) : null;
  const hoveredEvent = hoveredEventYear
    ? SA_POLICY_EVENTS.find((e) => e.year === hoveredEventYear) ?? null
    : null;

  const yTicks = [0, 400, 800, 1200, 1600];
  const xTicks = [2010, 2014, 2018, 2022, 2026, 2030];

  return (
    <section
      aria-label="Saudi policy timeline, 2010 to 2030"
      className="rounded-md border border-glacier bg-surface p-4 md:p-6"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
            Vision 2030 spine
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-accent md:text-[1.5rem]">
            Skilled inflows against every Vision 2030 lever.
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
                  {v === 0 ? "0" : `${v}K`}
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

          {/* Skilled inflow line */}
          <polyline
            points={linePoints}
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {SA_NET_TALENT_INFLOW_BY_YEAR.map((p) => (
            <circle
              key={p.year}
              cx={xForYear(p.year)}
              cy={yForValue(p.value)}
              r={2.5}
              fill="hsl(var(--accent))"
            />
          ))}

          {/* Event markers */}
          {SA_POLICY_EVENTS.map((ev) => {
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
                  if (
                    ev.year >= CURSOR_RANGE_MIN &&
                    ev.year <= CURSOR_RANGE_MAX
                  ) {
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

        {hoveredEvent?.impactNote && <EventTooltip event={hoveredEvent} />}
      </div>

      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Drag the cursor or click any event marker to inspect the year.
      </p>
    </section>
  );
}

function CategoryLegend() {
  const items: SaPolicyCategory[] = ["expansion", "tightening", "system"];
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

function EventTooltip({ event }: { event: SaPolicyEvent }) {
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

// ----- Macro overlay panel : three scrubbable charts sharing the cursor year -----

const MACRO_X_MIN = 2010;
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
  const talent = talentInflowAt(cursorYear);
  const fdi = nearestValueAt(SA_FDI_INWARD_BY_YEAR, cursorYear);
  const nitaqat = nearestNitaqatAt(cursorYear);

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
            What the kingdom looked like that year.
          </h3>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Drag any chart : the cursor moves on all three
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-5">
        <TalentInflowChart cursorYear={cursorYear} setCursorYear={setCursorYear} />
        <FdiChart cursorYear={cursorYear} setCursorYear={setCursorYear} />
        <NitaqatChart cursorYear={cursorYear} setCursorYear={setCursorYear} />
      </div>

      <p className="mt-5 rounded-sm border-l-2 border-cyan bg-cyan-tint/20 px-4 py-3 text-sm leading-relaxed text-ink">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan mr-2">
          In {cursorYear}
        </span>
        skilled inflows{" "}
        <strong>
          {talent ? formatThousands(talent.value * 1000) : "no recorded figure"}
        </strong>
        , inward FDI{" "}
        <strong>{fdi ? `R$${fdi.value}B` : "—"}</strong>
        , Platinum share{" "}
        <strong>{nitaqat ? `${nitaqat.platinum}%` : "—"}</strong>
        , Red-band share{" "}
        <strong>{nitaqat ? `${nitaqat.red}%` : "—"}</strong>.
      </p>
    </section>
  );
}

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
      const raw = MACRO_X_MIN + (xVb / MACRO_W) * (MACRO_X_MAX - MACRO_X_MIN);
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
  const x = macroXFor(
    Math.max(MACRO_X_MIN, Math.min(MACRO_X_MAX, cursorYear)),
  );
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

function TalentInflowChart({
  cursorYear,
  setCursorYear,
}: {
  cursorYear: number;
  setCursorYear: (n: number) => void;
}) {
  const at = nearestValueAt(SA_NET_TALENT_INFLOW_BY_YEAR, cursorYear);
  const yMin = 0;
  const yMax = 1800;
  const yFor = (v: number) =>
    MACRO_H - ((v - yMin) / (yMax - yMin)) * MACRO_H;
  const pts = SA_NET_TALENT_INFLOW_BY_YEAR.map(
    (p) => `${macroXFor(p.year).toFixed(1)},${yFor(p.value).toFixed(1)}`,
  ).join(" ");
  const valueLine = at
    ? `${formatThousands(at.value * 1000)} in ${at.year}`
    : `no figure in ${cursorYear}`;
  return (
    <ScrubChart
      title="Skilled inflows"
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
      {SA_NET_TALENT_INFLOW_BY_YEAR.map((p) => (
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

function FdiChart({
  cursorYear,
  setCursorYear,
}: {
  cursorYear: number;
  setCursorYear: (n: number) => void;
}) {
  const at = nearestValueAt(SA_FDI_INWARD_BY_YEAR, cursorYear);
  const yMin = 0;
  const yMax = 160;
  const yFor = (v: number) =>
    MACRO_H - ((v - yMin) / (yMax - yMin)) * MACRO_H;
  const pts = SA_FDI_INWARD_BY_YEAR.map(
    (p) => `${macroXFor(p.year).toFixed(1)},${yFor(p.value).toFixed(1)}`,
  ).join(" ");
  const valueLine = at ? `R$${at.value}B in ${at.year}` : `no figure in ${cursorYear}`;
  return (
    <ScrubChart
      title="Inward FDI (R$ billions)"
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
      {SA_FDI_INWARD_BY_YEAR.map((p) => (
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

function NitaqatChart({
  cursorYear,
  setCursorYear,
}: {
  cursorYear: number;
  setCursorYear: (n: number) => void;
}) {
  const yFor = (pct: number) => MACRO_H - (pct / 100) * MACRO_H;

  // Build cumulative stacked-area paths layered platinum → green → yellow → red.
  const yearCount = SA_NITAQAT_TIER_DIST.length;
  const cumulativeByYear: number[][] = SA_NITAQAT_TIER_DIST.map(() => []);
  for (let i = 0; i < yearCount; i++) {
    let running = 0;
    for (const tier of NITAQAT_TIER_ORDER) {
      running += SA_NITAQAT_TIER_DIST[i][tier];
      cumulativeByYear[i].push(running);
    }
  }

  const layerPaths: Array<{ tier: NitaqatTier; d: string }> = [];
  for (let layerIdx = 0; layerIdx < NITAQAT_TIER_ORDER.length; layerIdx++) {
    const tier = NITAQAT_TIER_ORDER[layerIdx];
    const topPts: string[] = [];
    const bottomPts: string[] = [];
    for (let i = 0; i < yearCount; i++) {
      const x = macroXFor(SA_NITAQAT_TIER_DIST[i].year);
      const topV = cumulativeByYear[i][layerIdx];
      const bottomV = layerIdx === 0 ? 0 : cumulativeByYear[i][layerIdx - 1];
      topPts.push(`${x.toFixed(1)},${yFor(topV).toFixed(1)}`);
      bottomPts.push(`${x.toFixed(1)},${yFor(bottomV).toFixed(1)}`);
    }
    bottomPts.reverse();
    const d = `M ${topPts.join(" L ")} L ${bottomPts.join(" L ")} Z`;
    layerPaths.push({ tier, d });
  }

  const at = nearestNitaqatAt(cursorYear);
  const valueLine = at
    ? `Platinum ${at.platinum}% · Red ${at.red}% in ${at.year}`
    : `no figure in ${cursorYear}`;

  return (
    <ScrubChart
      title="Nitaqat tier mix"
      cursorValueLine={valueLine}
      cursorYear={cursorYear}
      setCursorYear={setCursorYear}
    >
      {layerPaths.map(({ tier, d }) => (
        <path
          key={tier}
          d={d}
          fill={NITAQAT_TIER_COLOR[tier]}
          fillOpacity={0.85}
        />
      ))}
    </ScrubChart>
  );
}

// ----- Sector projections table -----

function SectorProjections() {
  const maxTarget = Math.max(
    ...SA_SECTOR_PROJECTIONS.map((s) => s.target2030),
  );

  return (
    <section
      aria-label="Vision 2030 sector projections"
      className="rounded-md border border-glacier bg-surface p-5 md:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
            Where the model forecasts hiring demand
          </p>
          <h3 className="mt-1 text-[1.05rem] font-bold tracking-tight text-accent">
            Fourteen Vision 2030 sectors with 2025 baseline, 2030 target, and
            the gap to close.
          </h3>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          All values in thousands of roles
        </p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-ink-faint">
              <th className="py-2 pr-3 font-mono font-semibold">Sector</th>
              <th className="py-2 pr-3 font-mono font-semibold tabular text-right">
                2025
              </th>
              <th className="py-2 pr-3 font-mono font-semibold tabular text-right">
                2030 target
              </th>
              <th className="py-2 pr-3 font-mono font-semibold tabular text-right">
                Gap
              </th>
              <th className="py-2 pl-3 font-mono font-semibold">Trajectory</th>
            </tr>
          </thead>
          <tbody>
            {SA_SECTOR_PROJECTIONS.map((s) => {
              const currentW = (s.current2025 / maxTarget) * 100;
              const targetW = (s.target2030 / maxTarget) * 100;
              return (
                <tr
                  key={s.sector}
                  className="border-b border-line/60 align-middle"
                >
                  <td className="py-2.5 pr-3 font-medium text-ink">
                    {s.sector}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-ink-soft tabular">
                    {s.current2025}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-accent tabular">
                    {s.target2030}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-cyan font-semibold tabular">
                    +{s.gap}
                  </td>
                  <td className="py-2.5 pl-3">
                    <div className="relative h-3 w-full overflow-hidden rounded-sm bg-glacier/40">
                      <div
                        className="absolute inset-y-0 left-0 bg-cyan/45"
                        style={{ width: `${targetW}%` }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 bg-accent"
                        style={{ width: `${currentW}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Solid bar : 2025 baseline · Cyan tint : 2030 target headroom
      </p>
    </section>
  );
}

// ----- Forecast callout -----

function ForecastCallout() {
  return (
    <section className="relative overflow-hidden rounded-md bg-gradient-to-br from-accent-deep to-accent px-6 py-8 text-surface md:px-10 md:py-10">
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-surface/70">
        The forward read
      </p>
      <h3 className="mt-3 max-w-3xl text-2xl font-extrabold leading-[1.15] tracking-tight md:text-[1.875rem]">
        The UK has the record. Saudi has the runway.
      </h3>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-surface/85">
        Twenty-five years of published UK migration data is the model&apos;s
        backtest spine. Saudi Arabia&apos;s Vision 2030 spine runs the other
        way : declared sectoral targets that the kingdom is hiring against
        now. The model treats both records the same way. Active levers at the
        cursor year, recorded inflows where the data exists, and a projection
        to 2030 anchored on declared sector employment targets and Nitaqat
        tier discipline.
      </p>
      <Link
        href="/atlas/simulator"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan px-6 py-3 text-kicker uppercase text-surface transition-colors hover:bg-cyan/85"
      >
        Test the levers in the simulator
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
        Saudi Arabia is the cleanest forward case in the index. The Nitaqat
        framework gives the model a continuous compliance signal, Vision 2030
        gives it published targets, and the National Talent Strategy 2030
        anchors fourteen sectors of declared hiring demand. The model reads
        all three on the same surface.
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
        .sa-shell\\:grid-cols-\\[1fr_19rem\\] {
          grid-template-columns: 1fr 19rem;
        }
      }
    `}</style>
  );
}
