import { AlertCircle } from "lucide-react";
import type { SponsorFounder, SponsorFounderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const ROUTE_LABEL: Record<string, string> = {
  innovator_founder: "Innovator Founder",
  global_talent: "Global Talent",
  uae_golden_visa_founder: "Golden Visa · UAE",
};

const STATUS_LABEL: Record<SponsorFounderStatus, string> = {
  stable: "MONITORED · STABLE",
  guidance_shifted: "ALERT · GUIDANCE SHIFTED",
  score_dropped: "ALERT · SCORE DROPPED",
};

const STATUS_TONE: Record<SponsorFounderStatus, string> = {
  stable: "bg-surface-soft text-ink-muted",
  guidance_shifted: "bg-band-medium-bg text-band-medium-fg",
  score_dropped: "bg-band-low-bg text-band-low-fg",
};

const SCORE_TONE = (score: number): string =>
  score >= 75
    ? "text-band-high-fg"
    : score >= 50
      ? "text-band-medium-fg"
      : "text-band-low-fg";

export function FounderCard({ founder }: { founder: SponsorFounder }) {
  const isAlert = founder.status !== "stable";
  return (
    <Card
      className={cn(
        "h-full p-5 flex flex-col",
        isAlert && "border-l-2 border-l-charcoal/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
          {ROUTE_LABEL[founder.route_id] ?? founder.route_id}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-2xs font-mono uppercase tracking-[0.16em]",
            STATUS_TONE[founder.status],
          )}
        >
          {STATUS_LABEL[founder.status]}
        </span>
      </div>

      <p className="mt-4 text-base font-semibold tracking-tight text-ink leading-snug">
        {founder.name}
      </p>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-3xl font-semibold tabular leading-none",
            SCORE_TONE(founder.score),
          )}
        >
          {founder.score}
        </span>
        <span className="text-2xs text-ink-muted">/100 readiness</span>
      </div>

      <div className="mt-auto pt-4">
        {isAlert ? (
          <div className="rounded-md border border-line/70 bg-surface-soft/60 px-3 py-2">
            <p className="flex items-start gap-1.5 text-2xs text-ink-soft leading-relaxed">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-band-low-fg" />
              <span>{founder.alert_summary}</span>
            </p>
            {founder.alert_observed_at && (
              <p className="mt-1 pl-4 font-mono text-2xs text-ink-faint tabular">
                {founder.alert_observed_at}
              </p>
            )}
          </div>
        ) : (
          <p className="text-2xs text-ink-faint tabular">
            Last reviewed{" "}
            {founder.last_reviewed_days === 1
              ? "1 day ago"
              : `${founder.last_reviewed_days ?? 0} days ago`}
          </p>
        )}
      </div>
    </Card>
  );
}
