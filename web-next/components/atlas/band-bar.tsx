import { cn } from "@/lib/utils";
import type { RubricBand } from "@/lib/atlas/types";

// A → cyan, B → navy (accent), C → frost, D → charcoal.
// Tokens chosen from the cool-only brand palette.
export const BAND_FILL: Record<RubricBand, string> = {
  A: "bg-cyan",
  B: "bg-accent",
  C: "bg-frost",
  D: "bg-charcoal",
};

export const BAND_TEXT: Record<RubricBand, string> = {
  A: "text-cyan",
  B: "text-accent",
  C: "text-frost",
  D: "text-charcoal",
};

export const BAND_LABEL: Record<RubricBand, string> = {
  A: "Strong",
  B: "Acceptable",
  C: "Borderline",
  D: "Below",
};

interface BandBarProps {
  counts: Record<RubricBand, number>;
  total: number;
  className?: string;
  height?: "sm" | "md" | "lg";
  /** Render the bar in monochrome (today/before state). */
  mono?: boolean;
  /** Optional aria label. */
  label?: string;
}

const HEIGHTS: Record<NonNullable<BandBarProps["height"]>, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-3.5",
};

export function BandBar({
  counts,
  total,
  className,
  height = "md",
  mono = false,
  label,
}: BandBarProps) {
  const segments: { band: RubricBand; pct: number }[] = (["A", "B", "C", "D"] as RubricBand[]).map(
    (band) => ({
      band,
      pct: total > 0 ? (counts[band] / total) * 100 : 0,
    }),
  );

  return (
    <div
      role="img"
      aria-label={label ?? `Band distribution across ${total} entities`}
      className={cn(
        "flex w-full overflow-hidden rounded-sm border border-line/60",
        HEIGHTS[height],
        className,
      )}
    >
      {segments.map((s) =>
        s.pct <= 0 ? null : (
          <div
            key={s.band}
            className={cn(
              "transition-colors duration-700 ease-out",
              mono ? "bg-ink-faint/30" : BAND_FILL[s.band],
            )}
            style={{ width: `${s.pct}%` }}
          />
        ),
      )}
    </div>
  );
}

export function BandLegend({ mono = false }: { mono?: boolean }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-ink-muted">
      {(["A", "B", "C", "D"] as RubricBand[]).map((band) => (
        <li key={band} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "h-2 w-2 rounded-sm",
              mono ? "bg-ink-faint/40" : BAND_FILL[band],
            )}
          />
          <span className="font-mono uppercase tracking-[0.18em] text-[10px]">
            {band}
          </span>
          <span>{BAND_LABEL[band]}</span>
        </li>
      ))}
    </ul>
  );
}
