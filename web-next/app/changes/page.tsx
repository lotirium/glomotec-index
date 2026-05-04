import { ExternalLink } from "lucide-react";
import { getChangefeed, getRoutes } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { ChangefeedEntry, ChangeKind } from "@/lib/types";

export const metadata = { title: "Changes" };

const kindLabel: Record<ChangeKind, string> = {
  criterion_added: "Criterion added",
  criterion_amended: "Criterion amended",
  criterion_removed: "Criterion removed",
  threshold_changed: "Threshold changed",
  evidence_requirement_changed: "Evidence requirement",
  guidance_clarified: "Guidance clarified",
  form_updated: "Form updated",
};

type ImpactKind = ChangefeedEntry["advisor_impact"];

/**
 * Reframed from "advisor impact" (how big) to "what should the team do".
 * operational_disruption stays loud (low tone), advisory sits on the medium
 * tier, informational drops to neutral so the eye glides past it.
 */
const impactTone: Record<ImpactKind, BadgeProps["tone"]> = {
  operational_disruption: "low",
  advisory: "medium",
  informational: "neutral",
};

const impactLabel: Record<ImpactKind, string> = {
  operational_disruption: "Operational disruption",
  advisory: "Advisory",
  informational: "Informational",
};

export default async function ChangesPage() {
  const [entries, routes] = await Promise.all([getChangefeed(), getRoutes()]);
  const sorted = [...entries].sort(
    (a, b) => +new Date(b.observed_at) - +new Date(a.observed_at),
  );
  const routeById = new Map(routes.map((r) => [r.id, r]));

  return (
    <>
      <PageHeader
        eyebrow="Change feed"
        title="Guidance changes worth knowing about"
        description="Each entry is a diff between two versions of caseworker guidance. Each entry is labelled by what the team should do with it: operational disruption (immediate action), advisory (shapes future advice), or informational."
        meta={
          <>
            <span>
              <strong className="font-medium text-ink-soft">{entries.length}</strong> entries
              indexed
            </span>
            <span aria-hidden>·</span>
            <span>Last 6 months</span>
          </>
        }
      />
      <div className="container py-10">
        <ol className="space-y-6">
          {sorted.map((entry) => {
            const route = routeById.get(entry.route_id);
            return (
              <li key={entry.id} id={entry.id} className="scroll-mt-20">
                <article className="grid grid-cols-1 gap-5 md:grid-cols-[160px_1fr]">
                  <div className="md:pt-1">
                    <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint tabular">
                      {formatDate(entry.observed_at)}
                    </p>
                    <p className="mt-1 text-2xs text-ink-muted">
                      {route?.name ?? entry.route_id}
                    </p>
                    <p className="mt-3 font-mono text-2xs text-ink-faint tabular">
                      {entry.document_version_before}
                      <span className="mx-1.5 text-ink-faint" aria-hidden>→</span>
                      <br />
                      {entry.document_version_after}
                    </p>
                  </div>
                  <Card className="p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{kindLabel[entry.kind]}</Badge>
                      <Badge tone={impactTone[entry.advisor_impact]}>
                        {impactLabel[entry.advisor_impact]}
                      </Badge>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-ink leading-snug tracking-tight">
                      {entry.headline}
                    </h3>
                    <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                      {entry.summary}
                    </p>
                    {entry.diff_excerpt && (
                      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {entry.diff_excerpt.before && (
                          <DiffBlock label="Before" tone="below" text={entry.diff_excerpt.before} />
                        )}
                        {entry.diff_excerpt.after && (
                          <DiffBlock label="After" tone="high" text={entry.diff_excerpt.after} />
                        )}
                      </div>
                    )}
                    <a
                      href={entry.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-1 text-2xs text-accent-deep hover:underline"
                    >
                      Open source
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Card>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}

function DiffBlock({ label, tone, text }: { label: string; tone: "below" | "high"; text: string }) {
  const cls =
    tone === "high"
      ? "border-band-high-fg/15 bg-band-high-bg/40 text-band-high-fg"
      : "border-band-below-fg/20 bg-band-below-bg/60 text-ink-soft";
  return (
    <div className={`rounded-md border px-3 py-2 text-2xs leading-relaxed ${cls}`}>
      <p className="font-mono uppercase tracking-[0.18em] text-ink-faint mb-1">{label}</p>
      <p>{text}</p>
    </div>
  );
}
