"use client";

import * as React from "react";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Three-tier commercial routing strip rendered on /clients/draft-* result
 * pages. Branches on overall readiness:
 *   ≥ 75  → STRONG FIT      (refund-backed engage)
 *   50-74 → WORTH EXPLORING (free re-score consultation)
 *   < 50  → BELOW THRESHOLD (zero-fee watchlist)
 *
 * The funnel has three commercial motions, not one. The CTAs are placeholder
 * triggers — they open a brand-clean modal explaining that production wires
 * them through to the operator's regional partner.
 */

export type RoutingTier = "strong" | "exploring" | "below";

export function routingTier(overallPct: number): RoutingTier {
  if (overallPct >= 75) return "strong";
  if (overallPct >= 50) return "exploring";
  return "below";
}

interface TierCopy {
  chip: string;
  cta: string;
  caption: string;
  subline: string;
}

const TIER: Record<RoutingTier, TierCopy> = {
  strong: {
    chip: "READINESS · STRONG FIT",
    cta: "ENGAGE GLOMOTEC",
    caption: "Refund-backed engagement",
    subline:
      "For high-confidence cases, glomotec offers a results-tied engagement: full fee refunded if endorsement is declined. Direct path: 4-6 weeks to filing.",
  },
  exploring: {
    chip: "READINESS · WORTH EXPLORING",
    cta: "BOOK CONSULTATION",
    caption: "Close the listed gaps, then re-score",
    subline:
      "Three gaps to close before this profile passes our acceptance threshold. A 30-minute consultation with glomotec maps the path; re-score is free.",
  },
  below: {
    chip: "READINESS · BELOW THRESHOLD",
    cta: "JOIN THE WATCHLIST",
    caption: "Monitoring · we'll re-score when your situation changes",
    subline:
      "glomotec doesn't take cases below threshold today, but the watchlist re-scores you automatically when guidance changes or you update your profile.",
  },
};

const CHIP_TONE: Record<RoutingTier, string> = {
  strong: "bg-band-high-bg text-band-high-fg",
  exploring: "bg-band-medium-bg text-band-medium-fg",
  below: "bg-band-below-bg text-ink-soft",
};

export function RoutingHeadline({ tier }: { tier: RoutingTier }) {
  const [open, setOpen] = React.useState(false);
  const t = TIER[tier];
  return (
    <>
      <div className="flex flex-col items-start gap-4 animate-result-arrive sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-kicker uppercase tracking-[0.18em]",
            CHIP_TONE[tier],
          )}
        >
          {t.chip}
        </span>

        <div className="flex flex-col items-start gap-1.5">
          {tier === "strong" && (
            <Button
              type="button"
              variant="engage"
              size="pill"
              onClick={() => setOpen(true)}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              {t.cta}
            </Button>
          )}
          {tier === "exploring" && (
            <Button
              type="button"
              variant="explore"
              size="pill"
              onClick={() => setOpen(true)}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              {t.cta}
            </Button>
          )}
          {tier === "below" && (
            <Button
              type="button"
              variant="ghost"
              size="pill"
              onClick={() => setOpen(true)}
              className="rounded-full text-ink-muted hover:text-ink"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              {t.cta}
            </Button>
          )}
          <p className="text-2xs text-ink-muted leading-snug">{t.caption}</p>
        </div>
      </div>

      <RoutingModal open={open} onClose={() => setOpen(false)} tier={tier} />
    </>
  );
}

export function RoutingSubline({ tier }: { tier: RoutingTier }) {
  return (
    <p className="max-w-xl text-sm text-ink-muted leading-relaxed animate-result-arrive">
      {TIER[tier].subline}
    </p>
  );
}

function RoutingModal({
  open,
  onClose,
  tier,
}: {
  open: boolean;
  onClose: () => void;
  tier: RoutingTier;
}) {
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const t = TIER[tier];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Preview build notice"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/40 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-lg border border-line bg-surface p-7 shadow-hero md:p-8">
        <button
          ref={closeRef}
          type="button"
          aria-label="Dismiss"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-faint transition-colors hover:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
          Preview build
        </p>
        <p className="mt-3 text-base font-semibold text-ink leading-snug">
          For preview build · this routes to the operator&apos;s regional
          partner in production.
        </p>
        <p className="mt-3 text-2xs text-ink-muted leading-relaxed">
          Selected path:{" "}
          <span className="font-mono uppercase tracking-[0.18em] text-ink-soft">
            {t.cta}
          </span>
        </p>
        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
