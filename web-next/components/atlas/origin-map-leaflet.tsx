"use client";

import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { UAE_CENTROID } from "@/lib/atlas/country-centroids";
import {
  TALENT_CATEGORY_COLOR,
  TALENT_CATEGORY_LABEL,
  TALENT_CATEGORY_ORDER,
  type MapLayer,
} from "@/lib/atlas/origin-history";
import type { OriginCountry } from "@/lib/atlas/types";

interface Props {
  countries: OriginCountry[];
  layer?: MapLayer;
  focusedIso2: string | null;
  onCountryHover: (c: OriginCountry | null) => void;
  onCountryClick: (c: OriginCountry) => void;
}

// Five-stop scale mirroring the heat map. Single source of truth across
// the two visuals so the audience reads them as the same intensity ladder.
function colorForCount(count: number): string {
  if (count >= 6) return "#1A1A2E";
  if (count >= 4) return "#2B3E8F";
  if (count >= 2) return "#00A2E9";
  if (count >= 1) return "#B8D4E3";
  return "#E8F4FA";
}

function radiusForCount(count: number): number {
  return Math.max(6, Math.min(24, 6 + count * 3));
}

// SVG pie marker for talent view. Returns a Leaflet DivIcon with five wedges
// proportional to the country's talent mix. Handles the single-non-zero
// category edge case (where the wedge spans 360°) by rendering a solid disc
// instead — SVG arc with start=end points is ambiguous.
function pieIcon(country: OriginCountry, radius: number): L.DivIcon {
  const mix = country.talent_mix;
  const size = radius * 2 + 4;
  const cx = size / 2;
  const cy = size / 2;

  if (!mix || country.band_a_count === 0) {
    return L.divIcon({
      className: "atlas-talent-marker",
      html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cy}" r="${radius}" fill="#94A3B8" stroke="white" stroke-width="1.5"/></svg>`,
      iconSize: [size, size],
      iconAnchor: [cx, cy],
    });
  }

  const total = TALENT_CATEGORY_ORDER.reduce((s, c) => s + mix[c], 0);
  const nonZero = TALENT_CATEGORY_ORDER.filter((c) => mix[c] > 0);
  const paths: string[] = [];

  if (nonZero.length === 1) {
    const cat = nonZero[0];
    paths.push(
      `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${TALENT_CATEGORY_COLOR[cat]}" stroke="white" stroke-width="1.5"/>`,
    );
  } else {
    let cumAngle = -Math.PI / 2; // start at 12 o'clock so the first wedge reads "top"
    for (const cat of TALENT_CATEGORY_ORDER) {
      const v = mix[cat];
      if (v === 0) continue;
      const slice = (v / total) * 2 * Math.PI;
      const endAngle = cumAngle + slice;
      const x0 = cx + radius * Math.cos(cumAngle);
      const y0 = cy + radius * Math.sin(cumAngle);
      const x1 = cx + radius * Math.cos(endAngle);
      const y1 = cy + radius * Math.sin(endAngle);
      const large = slice > Math.PI ? 1 : 0;
      paths.push(
        `<path d="M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${TALENT_CATEGORY_COLOR[cat]}" stroke="white" stroke-width="1.25"/>`,
      );
      cumAngle = endAngle;
    }
  }

  return L.divIcon({
    className: "atlas-talent-marker",
    html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible">${paths.join("")}<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="white" stroke-width="1.5"/></svg>`,
    iconSize: [size, size],
    iconAnchor: [cx, cy],
  });
}

function talentPopupHTML(c: OriginCountry): string {
  if (!c.talent_mix) return "";
  const rows = TALENT_CATEGORY_ORDER.filter((cat) => c.talent_mix![cat] > 0)
    .map((cat) => {
      const label = TALENT_CATEGORY_LABEL[cat];
      const color = TALENT_CATEGORY_COLOR[cat];
      const value = c.talent_mix![cat];
      return `<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#334155;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};"></span>${label} : <strong>${value}</strong></div>`;
    })
    .join("");
  return rows;
}

export default function OriginMapLeaflet({
  countries,
  layer = "entities",
  focusedIso2,
  onCountryHover,
  onCountryClick,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const markerByIso = React.useRef<Map<string, L.CircleMarker | L.Marker>>(
    new Map(),
  );
  const flowByIso = React.useRef<Map<string, L.Polyline>>(new Map());

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [25, 30],
      zoom: 2,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: false,
      worldCopyJump: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
      { maxZoom: 10, minZoom: 2, attribution: "© OSM contributors, © CARTO" },
    ).addTo(map);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png",
      { maxZoom: 10, minZoom: 2 },
    ).addTo(map);

    // UAE destination marker with CSS pulse.
    const uaeIcon = L.divIcon({
      className: "atlas-uae-marker",
      html: `
        <div style="position: relative;">
          <div class="atlas-uae-dot"></div>
          <div class="atlas-uae-label">UAE</div>
        </div>
        <style>
          .atlas-uae-dot {
            width: 22px; height: 22px; background: #00A2E9;
            border: 3px solid white; border-radius: 50%;
            box-shadow: 0 0 0 4px rgba(0,162,233,0.3), 0 2px 12px rgba(43,62,143,0.4);
            animation: atlas-uae-pulse 2s infinite;
          }
          .atlas-uae-label {
            position: absolute; top: 26px; left: 50%; transform: translateX(-50%);
            white-space: nowrap; font-size: 10px; font-weight: 700;
            color: #2B3E8F; background: white; padding: 2px 7px; border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.1); letter-spacing: 0.06em;
          }
          @keyframes atlas-uae-pulse {
            0%, 100% { box-shadow: 0 0 0 4px rgba(0,162,233,0.3), 0 2px 12px rgba(43,62,143,0.4); }
            50% { box-shadow: 0 0 0 14px rgba(0,162,233,0), 0 2px 12px rgba(43,62,143,0.4); }
          }
        </style>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    L.marker(UAE_CENTROID, { icon: uaeIcon, interactive: false }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerByIso.current.clear();
      flowByIso.current.clear();
    };
  }, []);

  // Render / re-render origin markers and flow lines.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers/lines.
    for (const m of markerByIso.current.values()) m.remove();
    for (const l of flowByIso.current.values()) l.remove();
    markerByIso.current.clear();
    flowByIso.current.clear();

    for (const c of countries) {
      if (!c.centroid || c.band_a_count === 0) continue;

      const baseWeight = Math.max(1, Math.min(4, c.band_a_count * 0.6));
      const flow = L.polyline([c.centroid, UAE_CENTROID], {
        color: colorForCount(c.band_a_count),
        weight: baseWeight,
        opacity: 0.4,
        dashArray: "6, 8",
      }).addTo(map);

      const radius = radiusForCount(c.band_a_count);
      let marker: L.CircleMarker | L.Marker;
      if (layer === "talent") {
        marker = L.marker(c.centroid, {
          icon: pieIcon(c, radius),
          interactive: true,
        }).addTo(map);
      } else {
        marker = L.circleMarker(c.centroid, {
          radius,
          fillColor: colorForCount(c.band_a_count),
          color: "white",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85,
        }).addTo(map);
      }

      const topSectors = Object.entries(c.sector_breakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([s, n]) => `${s} ${n}`)
        .join(", ");

      const talentRows = layer === "talent" ? talentPopupHTML(c) : "";

      marker.bindPopup(
        `<div style="font-family: var(--font-inter), Inter, sans-serif; min-width: 180px;">
          <div style="font-size: 13px; font-weight: 700; color: #2B3E8F; margin-bottom: 4px;">${c.country_name}</div>
          <div style="font-size: 11px; color: #334155; margin-bottom: 2px;"><strong>${c.band_a_count}</strong> Band A ${c.band_a_count === 1 ? "entity" : "entities"}</div>
          <div style="font-size: 11px; color: #334155; margin-bottom: 2px;">Avg composite: <strong>${c.avg_composite}</strong></div>
          ${talentRows ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #E2E8F0;display:flex;flex-direction:column;gap:3px;">${talentRows}</div>` : ""}
          ${topSectors && layer !== "talent" ? `<div style="font-size: 11px; color: #64748B; margin-top: 4px;">${topSectors}</div>` : ""}
        </div>`,
      );

      marker.on("mouseover", () => {
        marker.openPopup();
        flow.setStyle({ opacity: 0.75, weight: Math.max(2, c.band_a_count * 0.8) });
        onCountryHover(c);
      });
      marker.on("mouseout", () => {
        flow.setStyle({ opacity: 0.4, weight: baseWeight });
        onCountryHover(null);
      });
      marker.on("click", () => onCountryClick(c));

      markerByIso.current.set(c.iso2, marker);
      flowByIso.current.set(c.iso2, flow);
    }
  }, [countries, layer, onCountryHover, onCountryClick]);

  // Pan to focused country when sidebar selects one.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusedIso2) return;
    const country = countries.find((c) => c.iso2 === focusedIso2);
    if (!country?.centroid) return;
    map.flyTo(country.centroid, 4, { duration: 1.2 });
    const marker = markerByIso.current.get(focusedIso2);
    if (marker) marker.openPopup();
    // Dim all flow lines, emphasise the focused one.
    for (const [iso, flow] of flowByIso.current.entries()) {
      if (iso === focusedIso2) {
        flow.setStyle({ opacity: 0.85, weight: 3 });
      } else {
        flow.setStyle({ opacity: 0.12 });
      }
    }
    const reset = window.setTimeout(() => {
      for (const [iso, flow] of flowByIso.current.entries()) {
        const ctry = countries.find((c) => c.iso2 === iso);
        const w = ctry ? Math.max(1, Math.min(4, ctry.band_a_count * 0.6)) : 1;
        flow.setStyle({ opacity: 0.4, weight: w });
      }
    }, 4000);
    return () => window.clearTimeout(reset);
  }, [focusedIso2, countries]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="World map of UAE Band A origin countries"
      className="h-[520px] w-full rounded-md bg-glacier/40"
    />
  );
}
