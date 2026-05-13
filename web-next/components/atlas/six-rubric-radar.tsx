"use client";

import * as React from "react";
import { AuditAnchor } from "@/components/atlas/audit-anchor";
import { rubricGrade } from "@/components/atlas/audit-helpers";
import {
  RUBRIC_BAND_COLOR_HSL,
  bandForRubricByName,
} from "@/lib/atlas/rubric";
import type { AtlasCompany } from "@/lib/atlas/types";

interface Props {
  company: AtlasCompany;
  rubricScores: Array<{ name: string; score: number }>;
  composite: number;
}

const CX = 270;
const CY = 200;
const R = 130;

export function SixRubricRadar({ company, rubricScores, composite }: Props) {
  const n = rubricScores.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const polygonPoints = rubricScores
    .map((rs, i) => {
      const a = angle(i);
      const x = CX + Math.cos(a) * R * (rs.score / 100);
      const y = CY + Math.sin(a) * R * (rs.score / 100);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <AuditAnchor
      as="div"
      className="block rounded-md border border-glacier bg-surface p-6"
      anchor={{
        id: `company/${company.id}/six-rubric-radar`,
        proposition: `Six-rubric composite for ${company.name} : ${composite} / 100, Band A.`,
        evidence: [
          {
            authority: "MoHRSD case file 2024-08-1247 (illustrative)",
            dataset: "DMCC entity registration 047 (illustrative)",
            lastUpdated: company.dataSource.lastUpdated,
            confidence: "high",
            fixtureRef: "fixtures/atlas/dmcc.json",
          },
        ],
        grade: rubricGrade(
          "Six-rubric weighted composite, anchored on five evidence records.",
        ),
      }}
    >
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
        Six-rubric scorecard
      </p>
      <h3 className="mt-1.5 text-[1.25rem] font-bold tracking-tight text-accent">
        How this entity scores across every lens
      </h3>
      <p className="mt-1 text-[13px] text-ink-muted">
        Composite {composite}, anchored on five evidence records.
      </p>
      <div className="flex justify-center pt-3">
        <svg
          viewBox="0 0 540 400"
          className="h-auto w-full max-w-[540px]"
          role="img"
          aria-label={`Six-rubric radar for ${company.name}`}
        >
          {[25, 50, 75, 100].map((level) => (
            <circle
              key={level}
              cx={CX}
              cy={CY}
              r={(level / 100) * R}
              fill="none"
              stroke="#E8F4FA"
              strokeWidth="1"
            />
          ))}
          {rubricScores.map((rs, i) => {
            const a = angle(i);
            const ax = CX + Math.cos(a) * R;
            const ay = CY + Math.sin(a) * R;
            const lx = CX + Math.cos(a) * (R + 28);
            const ly = CY + Math.sin(a) * (R + 28);
            const vx = CX + Math.cos(a) * (R + 44);
            const vy = CY + Math.sin(a) * (R + 44);
            const textAnchor =
              Math.abs(Math.cos(a)) < 0.3
                ? "middle"
                : Math.cos(a) > 0
                  ? "start"
                  : "end";
            return (
              <g key={rs.name}>
                <line
                  x1={CX}
                  y1={CY}
                  x2={ax}
                  y2={ay}
                  stroke="#E8F4FA"
                  strokeWidth="1"
                />
                <text
                  x={lx}
                  y={ly}
                  textAnchor={textAnchor}
                  dominantBaseline="middle"
                  fontFamily="Inter"
                  fontSize="11"
                  fontWeight="600"
                  fill="#334155"
                >
                  {rs.name}
                </text>
                <text
                  x={vx}
                  y={vy}
                  textAnchor={textAnchor}
                  dominantBaseline="middle"
                  fontFamily="Inter"
                  fontSize="12"
                  fontWeight="700"
                  fill={rs.score >= 60 ? "#00A2E9" : "#64748B"}
                >
                  {rs.score}
                </text>
                {(() => {
                  const lookup = bandForRubricByName(rs.name, rs.score);
                  if (!lookup) return null;
                  return (
                    <text
                      x={vx}
                      y={vy + 13}
                      textAnchor={textAnchor}
                      dominantBaseline="middle"
                      fontFamily="Inter"
                      fontSize="9"
                      fontWeight="700"
                      letterSpacing="0.18em"
                      fill={RUBRIC_BAND_COLOR_HSL[lookup.band.color]}
                    >
                      {lookup.band.code.toUpperCase()}
                    </text>
                  );
                })()}
              </g>
            );
          })}
          <polygon
            points={polygonPoints}
            fill="rgba(0,162,233,0.18)"
            stroke="#00A2E9"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {rubricScores.map((rs, i) => {
            const a = angle(i);
            const x = CX + Math.cos(a) * R * (rs.score / 100);
            const y = CY + Math.sin(a) * R * (rs.score / 100);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="5"
                fill="white"
                stroke="#00A2E9"
                strokeWidth="2.5"
              />
            );
          })}
          {[25, 50, 75, 100].map((level) => (
            <text
              key={level}
              x={CX + 4}
              y={CY - (level / 100) * R + 3}
              fontFamily="Inter"
              fontSize="9"
              fill="#94A3B8"
            >
              {level}
            </text>
          ))}
        </svg>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-2 border-t border-glacier pt-4 sm:grid-cols-2 lg:grid-cols-3">
        {rubricScores.map((rs) => {
          const lookup = bandForRubricByName(rs.name, rs.score);
          return (
            <li
              key={rs.name}
              className="flex items-center gap-2.5 rounded-sm border border-line/60 bg-surface-soft/40 px-3 py-2"
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{
                  background: lookup
                    ? RUBRIC_BAND_COLOR_HSL[lookup.band.color]
                    : "hsl(var(--ink-faint))",
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-ink">
                  {rs.name}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                  {lookup
                    ? `${lookup.band.code} · ${lookup.band.label}`
                    : "—"}
                </p>
              </div>
              <span className="font-mono text-base font-bold tabular text-accent">
                {rs.score}
              </span>
            </li>
          );
        })}
      </ul>
    </AuditAnchor>
  );
}
