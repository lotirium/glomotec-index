import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";
import type {
  ChangefeedEntry,
  Criterion,
  Monitoring,
  MonitoringMilestone,
  MonitoringRuleChange,
} from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { TierBadge } from "@/components/scoring/tier-badge";

/**
 * MONITOR view replaces the criterion chain on operator detail pages when the
 * subscription is active. Three stacked sections, each one a piece of evidence
 * that the post-grant relationship exists in product (not just in pitch):
 *   - Compliance timeline (M12/M24/M36/M60 milestones)
 *   - Rule-change cross-reference (which guidance updates moved this score)
 *   - Subscription strip (the unit-economics line)
 *
 * All inputs are seed data (fixtures/monitoring/<slug>.json). The strip is
 * a state display, not a marketing surface — there are no CTAs by design.
 */
export function MonitorPanel({
  monitoring,
  criteria,
  changefeed,
}: {
  monitoring: Monitoring;
  criteria: Criterion[];
  changefeed: ChangefeedEntry[];
}) {
  return (
    <div className="space-y-12">
      <ComplianceTimeline monitoring={monitoring} />
      <RuleChangeXRef
        changes={monitoring.rule_changes}
        criteria={criteria}
        changefeed={changefeed}
      />
      <SubscriptionStrip monitoring={monitoring} />
    </div>
  );
}

export function MonitorOffer() {
  return (
    <div className="rounded-lg border border-line bg-surface px-6 py-10 shadow-soft">
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
        MONITOR · OFFER
      </p>
      <p className="mt-3 text-base leading-relaxed text-ink-soft">
        Monitor surfaces every guidance change relevant to this operator&apos;s
        case. Activate in COMPASS.
      </p>
    </div>
  );
}

// ---------- (a) Compliance timeline ----------

function ComplianceTimeline({ monitoring }: { monitoring: Monitoring }) {
  const preGrant = monitoring.grant_date == null;
  return (
    <section>
      <header className="space-y-1">
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
          Compliance timeline
        </p>
        <h3 className="text-base font-semibold tracking-tight text-ink">
          {preGrant
            ? "Awaiting grant"
            : "Post-grant milestones for an Innovator Founder visa"}
        </h3>
        {preGrant && (
          <p className="text-2xs text-ink-muted leading-relaxed">
            Milestones begin from the grant date. Tracking will start the day
            this operator&apos;s entry clearance is granted.
          </p>
        )}
        {!preGrant && monitoring.grant_date && (
          <p className="text-2xs text-ink-muted leading-relaxed">
            Granted {formatDate(monitoring.grant_date)}. The Home Office
            contact-point reviews are mandatory engagement points; the M60
            check is the ILR application itself.
          </p>
        )}
      </header>

      <div className="mt-6 overflow-x-auto">
        <ol className="relative flex min-w-[640px] gap-0">
          {monitoring.milestones.map((m, i) => (
            <MilestoneNode
              key={m.id}
              milestone={m}
              isFirst={i === 0}
              isLast={i === monitoring.milestones.length - 1}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}

function MilestoneNode({
  milestone,
  isFirst,
  isLast,
}: {
  milestone: MonitoringMilestone;
  isFirst: boolean;
  isLast: boolean;
}) {
  const tone = nodeTone(milestone.status);
  return (
    <li className="relative flex flex-1 flex-col items-center text-center">
      {/* connector line on each side of the node */}
      {!isFirst && (
        <span
          aria-hidden
          className={cn(
            "absolute left-0 right-1/2 top-3 h-px",
            tone.connector,
          )}
        />
      )}
      {!isLast && (
        <span
          aria-hidden
          className={cn(
            "absolute left-1/2 right-0 top-3 h-px",
            tone.connector,
          )}
        />
      )}

      <span
        className={cn(
          "relative z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-surface",
          tone.ring,
        )}
      >
        {milestone.status === "complete" && (
          <Check className="h-3 w-3 text-band-high-fg" strokeWidth={3} />
        )}
        {milestone.status === "due" && (
          <span className="h-2 w-2 rounded-full bg-accent" />
        )}
        {milestone.status === "upcoming" && (
          <span className="h-1.5 w-1.5 rounded-full bg-ink-faint/50" />
        )}
        {milestone.status === "pending" && (
          <span className="h-1 w-1 rounded-full bg-ink-faint/30" />
        )}
      </span>

      <p
        className={cn(
          "mt-3 text-2xs font-mono uppercase tracking-[0.18em]",
          tone.label,
        )}
      >
        {milestone.id.toUpperCase()}
      </p>
      <p className="mt-1.5 text-2xs font-medium text-ink leading-snug max-w-[8rem]">
        {milestone.label.replace(/^Month \d+ /, "").replace(/ application$/, "")}
      </p>
      <p className="mt-1 text-2xs text-ink-muted tabular">
        {milestone.due_date
          ? formatDate(milestone.due_date)
          : "awaits grant"}
      </p>
      <p className={cn("mt-1 text-2xs uppercase tracking-[0.16em]", tone.label)}>
        {statusLabel(milestone)}
      </p>
    </li>
  );
}

function statusLabel(m: MonitoringMilestone): string {
  if (m.status === "complete") return "Complete";
  if (m.status === "due") return "Due";
  if (m.status === "upcoming") return "Upcoming";
  return "Pending";
}

function nodeTone(status: MonitoringMilestone["status"]) {
  if (status === "complete")
    return {
      ring: "border-band-high-fg/40 bg-band-high-bg/40",
      connector: "bg-band-high-fg/30",
      label: "text-band-high-fg",
    };
  if (status === "due")
    return {
      ring: "border-accent/50 ring-2 ring-accent/15",
      connector: "bg-accent/30",
      label: "text-accent-deep",
    };
  if (status === "upcoming")
    return {
      ring: "border-line",
      connector: "bg-line",
      label: "text-ink-muted",
    };
  return {
    ring: "border-line border-dashed",
    connector: "bg-line/60",
    label: "text-ink-faint",
  };
}

// ---------- (b) Rule-change cross-reference ----------

function RuleChangeXRef({
  changes,
  criteria,
  changefeed,
}: {
  changes: MonitoringRuleChange[];
  criteria: Criterion[];
  changefeed: ChangefeedEntry[];
}) {
  const cfById = new Map(changefeed.map((e) => [e.id, e]));
  const critIndex = new Map(criteria.map((c, i) => [c.id, i + 1]));
  const critById = new Map(criteria.map((c) => [c.id, c]));

  return (
    <section>
      <header className="space-y-1">
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
          Rule-change cross-reference
        </p>
        <h3 className="text-base font-semibold tracking-tight text-ink">
          Guidance updates that moved this operator&apos;s score
        </h3>
        <p className="text-2xs text-ink-muted leading-relaxed">
          Each entry is a Home Office guidance change re-scored against this
          profile the moment it landed. Scores are continuously updating
          against a moving target.
        </p>
      </header>

      <ol className="mt-6 space-y-4">
        {changes.map((rc, i) => {
          const entry = cfById.get(rc.change_id);
          const idx = critIndex.get(rc.criterion_id);
          const c = critById.get(rc.criterion_id);
          const delta = rc.match_after - rc.match_before;
          const direction = delta >= 0 ? "+" : "";
          const deltaTone =
            delta > 0
              ? "text-band-high-fg"
              : delta < 0
                ? "text-band-low-fg"
                : "text-ink-muted";
          return (
            <li key={i}>
              <article className="rounded-lg border border-line bg-surface p-5 shadow-soft">
                <div className="flex flex-wrap items-center gap-3 text-2xs text-ink-muted">
                  <span className="tabular">
                    {entry ? formatDate(entry.observed_at) : "—"}
                  </span>
                  <TierBadge tier={entry?.tier ?? "T1"} />
                  {entry && (
                    <Link
                      href={`/changes#${entry.id}`}
                      className="ml-auto inline-flex items-center gap-1 text-2xs text-accent-deep hover:underline"
                    >
                      Open in change feed
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                <p className="mt-3 text-sm font-semibold text-ink leading-snug">
                  {entry?.headline ?? rc.change_id}
                </p>
                <div className="mt-4 rounded-md border border-line/70 bg-surface-soft/60 px-4 py-3">
                  <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                    Score delta
                  </p>
                  <p className="mt-1.5 text-sm text-ink-soft leading-relaxed">
                    <span className="font-semibold">
                      MATCH on criterion {idx ?? "—"}
                    </span>
                    {c?.predicate?.statement && (
                      <span className="text-ink-muted">
                        {" · "}
                        {shortPredicate(c.predicate.statement)}
                      </span>
                    )}
                  </p>
                  <p className="mt-2 text-sm tabular">
                    <span className="text-ink-muted">{rc.match_before}%</span>
                    <span className="mx-2 text-ink-faint" aria-hidden>
                      →
                    </span>
                    <span className="font-semibold text-ink">
                      {rc.match_after}%
                    </span>
                    <span className={cn("ml-2 font-medium", deltaTone)}>
                      ({direction}
                      {delta}pt)
                    </span>
                  </p>
                </div>
                {rc.note && (
                  <p className="mt-3 text-2xs italic text-ink-muted leading-relaxed">
                    {rc.note}
                  </p>
                )}
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function shortPredicate(s: string): string {
  if (s.length <= 90) return s;
  return s.slice(0, 87).trimEnd() + "…";
}

// ---------- (c) Subscription strip ----------

function SubscriptionStrip({ monitoring }: { monitoring: Monitoring }) {
  const tenure =
    monitoring.months_active > 0
      ? `${monitoring.months_active} months active`
      : monitoring.grant_date == null
        ? "grant pending"
        : "0 months active";
  const review = monitoring.next_review_in_days
    ? `next review in ${monitoring.next_review_in_days} days`
    : monitoring.grant_date == null
      ? "first review opens at grant"
      : "no scheduled review";
  const alerts = `${monitoring.alerts_since_enrolment} alert${monitoring.alerts_since_enrolment === 1 ? "" : "s"} since enrolment`;
  return (
    <section className="border-t border-line/70 pt-6">
      <p className="text-2xs text-ink-muted leading-relaxed">
        <span className="font-mono uppercase tracking-[0.18em] text-ink-soft">
          MONITOR
        </span>
        <span aria-hidden className="mx-2 text-ink-faint">·</span>
        <span>{tenure}</span>
        <span aria-hidden className="mx-2 text-ink-faint">·</span>
        <span>{review}</span>
        <span aria-hidden className="mx-2 text-ink-faint">·</span>
        <span>{alerts}</span>
      </p>
    </section>
  );
}

export function MonitorPillState({
  status,
}: {
  status: "active" | "offer";
}) {
  return (
    <span className="font-mono uppercase tracking-[0.18em]">
      {status === "active" ? (
        <>
          MONITOR
          <span className="mx-1.5 text-ink-faint" aria-hidden>·</span>
          <span className="text-band-high-fg">ACTIVE</span>
        </>
      ) : (
        <>
          MONITOR
          <span className="mx-1.5 text-ink-faint" aria-hidden>·</span>
          <span className="text-accent-deep">OFFER</span>
        </>
      )}
    </span>
  );
}

