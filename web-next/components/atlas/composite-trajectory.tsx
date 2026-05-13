"use client";

import * as React from "react";
import { AuditAnchor } from "@/components/atlas/audit-anchor";
import { rubricGrade } from "@/components/atlas/audit-helpers";
import type {
  AtlasCompany,
  IndustryPeerTrajectory,
  SettlementTrajectory,
} from "@/lib/atlas/types";

interface Props {
  company: AtlasCompany;
  trajectory: SettlementTrajectory;
  industryPeers?: IndustryPeerTrajectory;
}

const HEIGHT = 360;
const PAD = { top: 24, right: 60, bottom: 50, left: 56 };
const MIN_Y = 50;
const MAX_Y = 100;

// Map a peer year to its x-coordinate inside the chart. Looks for the first
// period that mentions the year (e.g. "Q1 2024"); returns null when the peer
// year falls outside the chart's window.
function peerIndexForYear(year: number, periods: string[]): number | null {
  for (let i = 0; i < periods.length; i++) {
    if (periods[i].includes(String(year))) return i;
  }
  return null;
}

export function CompositeTrajectory({
  company,
  trajectory,
  industryPeers,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(900);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth || 900);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const w = Math.max(560, width);
  const innerW = w - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const { periods, historical, projected, confLow, confHigh, todayIndex, ilrIndex } =
    trajectory;

  const xAt = (i: number) =>
    PAD.left + (i / (periods.length - 1)) * innerW;
  const yAt = (v: number) =>
    PAD.top + innerH - ((v - MIN_Y) / (MAX_Y - MIN_Y)) * innerH;

  let confTop = "";
  let confBot = "";
  projected.forEach((_, i) => {
    confTop += `${i === 0 ? "M" : "L"} ${xAt(todayIndex + i)} ${yAt(confHigh[i])} `;
  });
  for (let i = projected.length - 1; i >= 0; i--) {
    confBot += `L ${xAt(todayIndex + i)} ${yAt(confLow[i])} `;
  }

  const histPath = historical
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`)
    .join(" ");
  const projPath = projected
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(todayIndex + i)} ${yAt(v)}`)
    .join(" ");

  // Peer line : map each yearly average to the first chart period that
  // mentions the year. Skip peers that fall outside the chart window.
  const peerPoints = industryPeers
    ? industryPeers.yearlyAverages
        .map((p) => {
          const idx = peerIndexForYear(p.year, periods);
          return idx === null ? null : { idx, value: p.avgComposite };
        })
        .filter((p): p is { idx: number; value: number } => p !== null)
        .sort((a, b) => a.idx - b.idx)
    : [];
  const peerPath = peerPoints
    .map(
      (p, i) => `${i === 0 ? "M" : "L"} ${xAt(p.idx)} ${yAt(p.value)}`,
    )
    .join(" ");

  const thresholdY = yAt(80);

  return (
    <AuditAnchor
      as="div"
      className="block rounded-md border border-glacier bg-surface p-6"
      anchor={{
        id: `company/${company.id}/trajectory`,
        proposition: `Composite trajectory : ${periods[0]} to ${periods[periods.length - 1]}, projection confidence widens with horizon.`,
        evidence: [
          {
            authority: "DMCC quarterly evidence update record (illustrative)",
            dataset: `Composite trajectory, ${historical.length} quarters historical + ${projected.length - 1} quarters forward`,
            lastUpdated: company.dataSource.lastUpdated,
            confidence: company.dataSource.confidence,
          },
        ],
        grade: rubricGrade(
          `Projection from historical trajectory, ${historical.length} quarters historical + ${projected.length - 1} quarters forward.`,
        ),
      }}
    >
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
        Trajectory and ILR pathway
      </p>
      <h3 className="mt-1.5 text-[1.25rem] font-bold tracking-tight text-accent">
        Composite score trajectory and UK ILR probability through 2029
      </h3>
      <p className="mt-1 text-[13px] text-ink-muted">
        Quarterly evidence updates project the composite forward. Confidence
        band widens with time horizon.
      </p>

      <div
        ref={containerRef}
        className="mt-5 w-full overflow-x-auto"
        style={{ height: HEIGHT }}
      >
        <svg
          viewBox={`0 0 ${w} ${HEIGHT}`}
          width={w < width ? "100%" : w}
          height={HEIGHT}
          role="img"
          aria-label="Composite score trajectory and ILR probability through 2029"
        >
          <defs>
            <linearGradient id="trajGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#00A2E9" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00A2E9" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {Array.from({ length: 6 }).map((_, i) => {
            const gy = PAD.top + (i / 5) * innerH;
            const v = Math.round(MAX_Y - (i / 5) * (MAX_Y - MIN_Y));
            return (
              <g key={i}>
                <line
                  x1={PAD.left}
                  y1={gy}
                  x2={w - PAD.right}
                  y2={gy}
                  stroke="#E8F4FA"
                />
                <text
                  x={PAD.left - 10}
                  y={gy + 4}
                  fontFamily="Inter"
                  fontSize="11"
                  fill="#64748B"
                  textAnchor="end"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {v}
                </text>
              </g>
            );
          })}

          <line
            x1={PAD.left}
            y1={thresholdY}
            x2={w - PAD.right}
            y2={thresholdY}
            stroke="#64748B"
            strokeWidth="1.5"
            strokeDasharray="6 5"
          />
          <text
            x={w - PAD.right + 8}
            y={thresholdY + 4}
            fontFamily="Inter"
            fontSize="11"
            fill="#64748B"
            fontWeight="600"
          >
            Band A · 80
          </text>

          {periods.map((p, i) => {
            if (i % 2 === 0 || i === periods.length - 1) {
              return (
                <text
                  key={`x-${i}`}
                  x={xAt(i)}
                  y={HEIGHT - PAD.bottom + 22}
                  fontFamily="Inter"
                  fontSize="11"
                  fill="#64748B"
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {p}
                </text>
              );
            }
            return null;
          })}

          <line
            x1={xAt(todayIndex)}
            y1={PAD.top}
            x2={xAt(todayIndex)}
            y2={HEIGHT - PAD.bottom}
            stroke="#00A2E9"
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity="0.5"
          />
          <text
            x={xAt(todayIndex)}
            y={PAD.top - 6}
            fontFamily="Inter"
            fontSize="11"
            fill="#00A2E9"
            fontWeight="700"
            textAnchor="middle"
          >
            TODAY
          </text>

          <text
            x={PAD.left - 38}
            y={PAD.top + innerH / 2}
            fontFamily="Inter"
            fontSize="11"
            fill="#64748B"
            fontWeight="500"
            textAnchor="middle"
            transform={`rotate(-90, ${PAD.left - 38}, ${PAD.top + innerH / 2})`}
          >
            Composite score
          </text>

          <path d={`${confTop}${confBot}Z`} fill="url(#trajGrad)" />

          {peerPath && (
            <>
              <path
                d={peerPath}
                stroke="#64748B"
                strokeWidth="2"
                strokeDasharray="6 5"
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.85"
              />
              {peerPoints.map((p) => (
                <circle
                  key={`peer-${p.idx}`}
                  cx={xAt(p.idx)}
                  cy={yAt(p.value)}
                  r="3.25"
                  fill="white"
                  stroke="#64748B"
                  strokeWidth="1.75"
                />
              ))}
            </>
          )}

          <path
            d={histPath}
            stroke="#2B3E8F"
            strokeWidth="3"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <path
            d={projPath}
            stroke="#00A2E9"
            strokeWidth="3"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {historical.map((v, i) => (
            <circle
              key={`h-${i}`}
              cx={xAt(i)}
              cy={yAt(v)}
              r="4.5"
              fill="white"
              stroke="#2B3E8F"
              strokeWidth="2.5"
            />
          ))}

          {projected.map((v, i) =>
            i > 0 ? (
              <circle
                key={`p-${i}`}
                cx={xAt(todayIndex + i)}
                cy={yAt(v)}
                r="4.5"
                fill="#00A2E9"
                stroke="white"
                strokeWidth="2"
              />
            ) : null,
          )}

          <line
            x1={xAt(ilrIndex)}
            y1={PAD.top}
            x2={xAt(ilrIndex)}
            y2={HEIGHT - PAD.bottom}
            stroke="#00A2E9"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.7"
          />
          <rect
            x={xAt(ilrIndex) - 70}
            y={PAD.top + 8}
            width="140"
            height="36"
            rx="6"
            fill="white"
            stroke="#00A2E9"
            strokeWidth="1.5"
          />
          <text
            x={xAt(ilrIndex)}
            y={PAD.top + 22}
            fontFamily="Inter"
            fontSize="10"
            fill="#00A2E9"
            fontWeight="700"
            textAnchor="middle"
          >
            UK ILR ELIGIBILITY
          </text>
          <text
            x={xAt(ilrIndex)}
            y={PAD.top + 36}
            fontFamily="Inter"
            fontSize="11"
            fill="#2B3E8F"
            fontWeight="600"
            textAnchor="middle"
          >
            36 months from today
          </text>
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-[22px] gap-y-2 border-t border-glacier pt-4">
        <LegendItem swatch={<DotSolid color="#2B3E8F" />} label="Composite score (historical)" />
        <LegendItem swatch={<DotSolid color="#00A2E9" />} label="Composite score (projected)" />
        {industryPeers && (
          <LegendItem
            swatch={<DotDashed color="#64748B" />}
            label={`Industry peer average · ${industryPeers.peerCount} peers`}
          />
        )}
        <LegendItem swatch={<DotDashed color="#64748B" />} label="UK ILR threshold (Band A composite 80)" />
        <LegendItem swatch={<DotSolid color="rgba(0,162,233,0.2)" />} label="Confidence band" />
      </div>
    </AuditAnchor>
  );
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-medium text-charcoal">
      {swatch}
      <span>{label}</span>
    </div>
  );
}

function DotSolid({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-1 w-3.5 rounded-sm"
      style={{ background: color }}
    />
  );
}

function DotDashed({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-[2.5px] w-3.5 rounded-sm"
      style={{
        backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)`,
      }}
    />
  );
}
