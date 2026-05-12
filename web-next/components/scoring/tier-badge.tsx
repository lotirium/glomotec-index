import { cn } from "@/lib/utils";
import type { SourceTier } from "@/lib/types";

const TIER_TONE: Record<SourceTier, string> = {
  // Cool palette only per brand v1.0 §11.
  T1: "bg-cyan text-surface",
  T2: "bg-glacier text-ink",
  T3: "bg-frost text-ink",
  T4: "bg-slate text-surface",
  T5: "bg-charcoal text-surface",
};

const TIER_LABEL: Record<SourceTier, string> = {
  T1: "Caseworker guidance",
  T2: "Published policy",
  T3: "Case law",
  T4: "Operator inference",
  T5: "Statistical inference",
};

export function TierBadge({
  tier,
  className,
}: {
  tier: SourceTier;
  className?: string;
}) {
  return (
    <span
      title={TIER_LABEL[tier]}
      className={cn(
        "inline-flex items-center justify-center rounded-sm px-2 py-0.5 text-kicker uppercase tabular",
        TIER_TONE[tier],
        className,
      )}
    >
      {tier}
    </span>
  );
}
