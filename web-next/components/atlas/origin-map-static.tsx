"use client";

import * as React from "react";
import { UAE_CENTROID } from "@/lib/atlas/country-centroids";
import type { OriginCountry } from "@/lib/atlas/types";

// Equirectangular projection clamped to the populated latitude band so the
// dots aren't squashed against the top edge. (Latitudes above +80 or below
// -60 are effectively unused here.)
const VIEW_W = 800;
const VIEW_H = 360;
const LAT_TOP = 80;
const LAT_BOTTOM = -60;

function project([lat, lng]: [number, number]): [number, number] {
  const x = ((lng + 180) / 360) * VIEW_W;
  const y = ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * VIEW_H;
  return [x, y];
}

function colorForCount(count: number): string {
  if (count >= 6) return "#1A1A2E";
  if (count >= 4) return "#2B3E8F";
  if (count >= 2) return "#00A2E9";
  if (count >= 1) return "#B8D4E3";
  return "#E8F4FA";
}

function radiusForCount(count: number): number {
  return Math.max(4, Math.min(12, 4 + count * 1.4));
}

export default function OriginMapStatic({
  countries,
}: {
  countries: OriginCountry[];
}) {
  const [uaeX, uaeY] = project(UAE_CENTROID);
  const visible = countries.filter((c) => c.centroid && c.band_a_count > 0);

  return (
    <div className="rounded-md border border-line bg-glacier/30 p-2">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Schematic origin map for mobile"
        className="block h-auto w-full"
      >
        <rect width={VIEW_W} height={VIEW_H} fill="#E8F4FA" />
        {/* Faint lat/lng grid as orientation anchors. */}
        <g stroke="#B8D4E3" strokeWidth={0.4} opacity={0.6}>
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={`h${t}`}
              x1={0}
              x2={VIEW_W}
              y1={VIEW_H * t}
              y2={VIEW_H * t}
            />
          ))}
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={`v${t}`}
              y1={0}
              y2={VIEW_H}
              x1={VIEW_W * t}
              x2={VIEW_W * t}
            />
          ))}
        </g>

        {/* Flow lines from origin to UAE. */}
        <g stroke="#2B3E8F" strokeOpacity={0.35} strokeDasharray="3 4">
          {visible.map((c) => {
            const [x, y] = project(c.centroid!);
            return (
              <line
                key={`flow-${c.iso2}`}
                x1={x}
                y1={y}
                x2={uaeX}
                y2={uaeY}
                strokeWidth={Math.max(0.5, Math.min(2, c.band_a_count * 0.4))}
              />
            );
          })}
        </g>

        {/* Origin markers. */}
        <g>
          {visible.map((c) => {
            const [x, y] = project(c.centroid!);
            return (
              <circle
                key={`dot-${c.iso2}`}
                cx={x}
                cy={y}
                r={radiusForCount(c.band_a_count)}
                fill={colorForCount(c.band_a_count)}
                stroke="white"
                strokeWidth={1.2}
                opacity={0.92}
              >
                <title>{`${c.country_name} : ${c.band_a_count} Band A`}</title>
              </circle>
            );
          })}
        </g>

        {/* UAE destination. */}
        <g>
          <circle cx={uaeX} cy={uaeY} r={9} fill="#00A2E9" stroke="white" strokeWidth={2.5} />
          <text
            x={uaeX}
            y={uaeY + 22}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fill="#2B3E8F"
          >
            UAE
          </text>
        </g>
      </svg>
      <p className="mt-2 text-center text-[10px] uppercase tracking-[0.18em] font-mono text-ink-faint">
        Schematic view : tap the list below for country detail
      </p>
    </div>
  );
}
