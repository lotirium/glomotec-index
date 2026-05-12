import { Lock } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { TierBadge } from "@/components/scoring/tier-badge";
import type { ChangefeedEntry, ChangeKind, SourceTier } from "@/lib/types";

const KIND_LABEL: Record<ChangeKind, string> = {
  criterion_added: "Criterion added",
  criterion_amended: "Criterion amended",
  criterion_removed: "Criterion removed",
  threshold_changed: "Threshold changed",
  evidence_requirement_changed: "Evidence requirement",
  guidance_clarified: "Guidance clarified",
  form_updated: "Form updated",
};

type ImpactKind = ChangefeedEntry["advisor_impact"];

const IMPACT_TONE: Record<ImpactKind, BadgeProps["tone"]> = {
  operational_disruption: "low",
  advisory: "medium",
  informational: "neutral",
};

const IMPACT_LABEL: Record<ImpactKind, string> = {
  operational_disruption: "Operational disruption",
  advisory: "Advisory",
  informational: "Informational",
};

/**
 * Single source of truth for the change-entry badge stack.
 * Used on /changes (full entry layout) and on the home Recent changes widget
 * so both surfaces show identical signals: tier, operator-only chip on
 * T4/T5, kind, and (when not operator-only) impact.
 */
export function ChangeBadges({
  entry,
  compact = false,
}: {
  entry: ChangefeedEntry;
  compact?: boolean;
}) {
  const tier: SourceTier = entry.tier ?? "T1";
  const isOperatorOnly = tier === "T4" || tier === "T5";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <TierBadge tier={tier} />
      {isOperatorOnly && (
        <span className="inline-flex items-center gap-1 rounded-sm bg-charcoal/10 px-2 py-0.5 text-kicker uppercase text-charcoal">
          <Lock className="h-2.5 w-2.5" />
          {compact ? "Operator-only" : "Operator-only · field note"}
        </span>
      )}
      {!compact && <Badge tone="neutral">{KIND_LABEL[entry.kind]}</Badge>}
      {!isOperatorOnly && (
        <Badge tone={IMPACT_TONE[entry.advisor_impact]}>
          {IMPACT_LABEL[entry.advisor_impact]}
        </Badge>
      )}
    </div>
  );
}

export function isOperatorOnlyTier(tier: SourceTier): boolean {
  return tier === "T4" || tier === "T5";
}
