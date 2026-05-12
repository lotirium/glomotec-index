"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  useAuditTrail,
  type AuditEvidence,
  type AuditFocus,
} from "@/components/atlas/audit-context";
import { rubricGrade } from "@/components/atlas/audit-helpers";
import type {
  FlowJurisdiction,
  FlowPair,
} from "@/lib/atlas/types";

export const JURISDICTIONS: FlowJurisdiction[] = [
  "UK",
  "US",
  "EU",
  "UAE",
  "Singapore",
];

export const JURISDICTION_COLORS: Record<FlowJurisdiction, string> = {
  UK: "#2B3E8F",
  US: "#00A2E9",
  EU: "#64748B",
  UAE: "#1A1A2E",
  Singapore: "#7C3AED",
};

export const JURISDICTION_META: Record<FlowJurisdiction, string> = {
  UK: "Innovator Founder",
  US: "EB-5, EB-1A, NIW",
  EU: "Member-state pathways",
  UAE: "Golden Visa, Free zone",
  Singapore: "GIP, Tech.Pass",
};

// Viewport / layout constants — these are the spec values; do not edit
// without re-validating against the source HTML prototype.
const VW = 1200;
const VH = 540;
const LEFT_X = 180;
const NODE_W = 12;
const RIGHT_X = VW - LEFT_X - NODE_W; // = 1008
const NODE_GAP = 18;
const TOP_PAD = 40;
const BOT_PAD = 40;
const RIBBON_LABEL_MIN = 30;

export type FramingMode = "rejected" | "approved";

interface LayoutResult {
  scale: number;
  leftTotals: Record<FlowJurisdiction, number>;
  rightTotals: Record<FlowJurisdiction, number>;
  leftNodeY: Record<FlowJurisdiction, { top: number; bottom: number }>;
  rightNodeY: Record<FlowJurisdiction, { top: number; bottom: number }>;
  ribbons: Array<{
    pair: FlowPair;
    y0: number;
    y1: number;
    y2: number;
    y3: number;
  }>;
}

function computeLayout(pairs: FlowPair[]): LayoutResult {
  const leftTotals = Object.fromEntries(
    JURISDICTIONS.map((j) => [j, 0]),
  ) as Record<FlowJurisdiction, number>;
  const rightTotals = Object.fromEntries(
    JURISDICTIONS.map((j) => [j, 0]),
  ) as Record<FlowJurisdiction, number>;
  for (const p of pairs) {
    leftTotals[p.from] += p.value;
    rightTotals[p.to] += p.value;
  }
  const totalFlow = Object.values(leftTotals).reduce((s, v) => s + v, 0);
  const usable =
    VH - TOP_PAD - BOT_PAD - (JURISDICTIONS.length - 1) * NODE_GAP;
  const scale = totalFlow > 0 ? usable / totalFlow : 0;

  const leftNodeY = {} as LayoutResult["leftNodeY"];
  const rightNodeY = {} as LayoutResult["rightNodeY"];
  let lY = TOP_PAD;
  let rY = TOP_PAD;
  for (const j of JURISDICTIONS) {
    const lh = leftTotals[j] * scale;
    const rh = rightTotals[j] * scale;
    leftNodeY[j] = { top: lY, bottom: lY + lh };
    rightNodeY[j] = { top: rY, bottom: rY + rh };
    lY += lh + NODE_GAP;
    rY += rh + NODE_GAP;
  }

  // Stack outgoing ribbons within each source, in target-jurisdiction order.
  const leftCursor = { ...leftTotals };
  const rightCursor = { ...rightTotals };
  for (const j of JURISDICTIONS) {
    leftCursor[j] = leftNodeY[j].top;
    rightCursor[j] = rightNodeY[j].top;
  }

  const ribbons: LayoutResult["ribbons"] = [];
  // First pass: assign y0/y1 (left side) in target order.
  for (const src of JURISDICTIONS) {
    const out = pairs
      .filter((p) => p.from === src)
      .sort(
        (a, b) =>
          JURISDICTIONS.indexOf(a.to) - JURISDICTIONS.indexOf(b.to),
      );
    for (const p of out) {
      const h = p.value * scale;
      const y0 = leftCursor[src];
      const y1 = leftCursor[src] + h;
      ribbons.push({ pair: p, y0, y1, y2: 0, y3: 0 });
      leftCursor[src] = y1;
    }
  }
  // Second pass: assign y2/y3 (right side) in source order, matching ribbons.
  for (const tgt of JURISDICTIONS) {
    const incoming = pairs
      .filter((p) => p.to === tgt)
      .sort(
        (a, b) =>
          JURISDICTIONS.indexOf(a.from) - JURISDICTIONS.indexOf(b.from),
      );
    for (const p of incoming) {
      const h = p.value * scale;
      const ribbon = ribbons.find(
        (r) => r.pair.from === p.from && r.pair.to === p.to,
      );
      if (!ribbon) continue;
      ribbon.y2 = rightCursor[tgt];
      ribbon.y3 = rightCursor[tgt] + h;
      rightCursor[tgt] = ribbon.y3;
    }
  }

  return { scale, leftTotals, rightTotals, leftNodeY, rightNodeY, ribbons };
}

function ribbonPath(y0: number, y1: number, y2: number, y3: number): string {
  const x0 = LEFT_X + NODE_W;
  const x1 = RIGHT_X;
  const midX = (x0 + x1) / 2;
  return `M ${x0} ${y0} C ${midX} ${y0}, ${midX} ${y2}, ${x1} ${y2} L ${x1} ${y3} C ${midX} ${y3}, ${midX} ${y1}, ${x0} ${y1} Z`;
}

interface Props {
  pairs: FlowPair[];
  framing: FramingMode;
  evidence: AuditEvidence;
}

export function FlowSankey({ pairs, framing, evidence }: Props) {
  const { hover, pin, pinned, hovered } = useAuditTrail();
  const layout = React.useMemo(() => computeLayout(pairs), [pairs]);
  const activeKey = pinned?.id ?? hovered?.id ?? null;

  const leftHeader =
    framing === "rejected"
      ? "First-choice jurisdiction (rejected)"
      : "Origin jurisdiction (rejected here)";
  const rightHeader =
    framing === "rejected"
      ? "Second-choice destination (approved)"
      : "Approving jurisdiction (placed them)";

  function tooltip(p: FlowPair): string {
    return framing === "rejected"
      ? `${p.value} applicants rejected by ${p.from} found a home in ${p.to}`
      : `${p.value} applicants approved by ${p.to} after rejection in ${p.from}`;
  }

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
    <div className="rounded-md border border-line bg-surface p-4 md:p-6">
      {/* Column headers */}
      <div className="mb-3 grid grid-cols-2 gap-4 text-[10px] font-mono uppercase tracking-[0.18em] text-ink-faint">
        <p>{leftHeader}</p>
        <p className="text-right">{rightHeader}</p>
      </div>

      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Cross-jurisdictional flow Sankey diagram"
        className="block h-auto w-full"
      >
        {/* Ribbons.
            Fill perspective flips with the framing toggle:
              rejected = source colour (where they come from)
              approved = destination colour (where they land)
            Transition on `fill` makes the toggle feel deliberate. */}
        <g>
          {layout.ribbons.map((r) => {
            const key = `flow/${r.pair.from}-${r.pair.to}`;
            const isActive = activeKey === key;
            const dimmed = activeKey !== null && !isActive;
            const ribbonColor =
              framing === "rejected"
                ? JURISDICTION_COLORS[r.pair.from]
                : JURISDICTION_COLORS[r.pair.to];
            return (
              <path
                key={key}
                d={ribbonPath(r.y0, r.y1, r.y2, r.y3)}
                opacity={isActive ? 1 : dimmed ? 0.12 : 0.7}
                style={{
                  fill: ribbonColor,
                  transition:
                    "fill 0.4s ease, stroke 0.4s ease, opacity 0.25s ease",
                }}
                tabIndex={0}
                role="button"
                aria-label={tooltip(r.pair)}
                onMouseEnter={() => hover(focusFor(r.pair))}
                onMouseLeave={() => hover(null)}
                onFocus={() => hover(focusFor(r.pair))}
                onBlur={() => hover(null)}
                onClick={() => pin(focusFor(r.pair))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    pin(focusFor(r.pair));
                  }
                }}
                className="cursor-pointer focus:outline-none"
              >
                <title>{tooltip(r.pair)}</title>
              </path>
            );
          })}
        </g>

        {/* Ribbon count labels (only for ≥ 30). */}
        <g pointerEvents="none">
          {layout.ribbons.map((r) => {
            if (r.pair.value < RIBBON_LABEL_MIN) return null;
            const cx = (LEFT_X + NODE_W + RIGHT_X) / 2;
            const cy = (r.y0 + r.y1 + r.y2 + r.y3) / 4;
            return (
              <text
                key={`lbl-${r.pair.from}-${r.pair.to}`}
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontFamily="Inter, sans-serif"
                fontSize={11}
                fontWeight={700}
                fill="white"
                style={{ paintOrder: "stroke", stroke: "rgba(43,62,143,0.4)", strokeWidth: 1 }}
              >
                {r.pair.value}
              </text>
            );
          })}
        </g>

        {/* Node rectangles + labels. */}
        <g>
          {JURISDICTIONS.map((j) => {
            const ln = layout.leftNodeY[j];
            const rn = layout.rightNodeY[j];
            return (
              <g key={`nodes-${j}`}>
                <rect
                  x={LEFT_X}
                  y={ln.top}
                  width={NODE_W}
                  height={Math.max(2, ln.bottom - ln.top)}
                  rx={3}
                  fill={JURISDICTION_COLORS[j]}
                />
                <rect
                  x={RIGHT_X}
                  y={rn.top}
                  width={NODE_W}
                  height={Math.max(2, rn.bottom - rn.top)}
                  rx={3}
                  fill={JURISDICTION_COLORS[j]}
                />
                {/* Left labels */}
                <text
                  x={LEFT_X - 14}
                  y={(ln.top + ln.bottom) / 2 - 8}
                  textAnchor="end"
                  fontFamily="Inter, sans-serif"
                  fontSize={14}
                  fontWeight={700}
                  fill="#2B3E8F"
                >
                  {j}
                </text>
                <text
                  x={LEFT_X - 14}
                  y={(ln.top + ln.bottom) / 2 + 6}
                  textAnchor="end"
                  fontFamily="Inter, sans-serif"
                  fontSize={10}
                  fontWeight={500}
                  fill="#64748B"
                >
                  {JURISDICTION_META[j]}
                </text>
                <text
                  x={LEFT_X - 14}
                  y={(ln.top + ln.bottom) / 2 + 20}
                  textAnchor="end"
                  fontFamily="Inter, sans-serif"
                  fontSize={11}
                  fontWeight={500}
                  fill="#94A3B8"
                >
                  {layout.leftTotals[j]} applicants
                </text>
                {/* Right labels */}
                <text
                  x={RIGHT_X + NODE_W + 14}
                  y={(rn.top + rn.bottom) / 2 - 8}
                  textAnchor="start"
                  fontFamily="Inter, sans-serif"
                  fontSize={14}
                  fontWeight={700}
                  fill="#2B3E8F"
                >
                  {j}
                </text>
                <text
                  x={RIGHT_X + NODE_W + 14}
                  y={(rn.top + rn.bottom) / 2 + 6}
                  textAnchor="start"
                  fontFamily="Inter, sans-serif"
                  fontSize={10}
                  fontWeight={500}
                  fill="#64748B"
                >
                  {JURISDICTION_META[j]}
                </text>
                <text
                  x={RIGHT_X + NODE_W + 14}
                  y={(rn.top + rn.bottom) / 2 + 20}
                  textAnchor="start"
                  fontFamily="Inter, sans-serif"
                  fontSize={11}
                  fontWeight={500}
                  fill="#94A3B8"
                >
                  {layout.rightTotals[j]} absorbed
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <p
        className={cn(
          "mt-4 text-center font-mono text-[10px] uppercase tracking-[0.18em]",
          pinned ? "text-cyan" : "text-ink-faint",
        )}
      >
        {pinned
          ? `Pinned : ${pinned.proposition}`
          : "Hover a ribbon for the tooltip; click to pin a focus."}
      </p>
    </div>
  );
}
