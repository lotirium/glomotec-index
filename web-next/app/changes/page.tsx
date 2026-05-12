import { ExternalLink } from "lucide-react";
import { getChangefeed, getRoutes } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import {
  ChangeBadges,
  isOperatorOnlyTier,
} from "@/components/changes/change-badges";
import { formatDate } from "@/lib/utils";
import type { Jurisdiction, SourceTier } from "@/lib/types";

export const metadata = { title: "Changes" };

const JURISDICTION_LABEL: Record<Jurisdiction, string> = {
  UK: "UK",
  UAE: "UAE",
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
        title="Guidance changes worth knowing about."
        description="Each entry is a diff between two published versions of caseworker guidance, tagged by source tier and what the team should do with it."
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
      <div className="container py-20 md:py-24">
        <ol className="mx-auto w-full md:max-w-[78%] space-y-16">
          {sorted.map((entry) => {
            const route = routeById.get(entry.route_id);
            const tier: SourceTier = entry.tier ?? "T1";
            const operatorOnly = isOperatorOnlyTier(tier);
            return (
              <li key={entry.id} id={entry.id} className="scroll-mt-20">
                <article className="grid grid-cols-1 gap-6 md:grid-cols-[160px_1fr]">
                  <div className="md:pt-1">
                    <p className="text-kicker uppercase text-ink-faint tabular">
                      {formatDate(entry.observed_at)}
                    </p>
                    <p className="mt-2 text-2xs text-ink-muted">
                      {route?.name ?? entry.route_id}
                    </p>
                    <p className="mt-1 text-2xs text-ink-faint">
                      {JURISDICTION_LABEL[entry.jurisdiction ?? "UK"]}
                    </p>
                    {entry.document_version_before && (
                      <p className="mt-3 text-2xs text-ink-faint tabular leading-relaxed">
                        {entry.document_version_before}
                        <span className="mx-1.5 text-ink-faint" aria-hidden>→</span>
                        <br />
                        {entry.document_version_after}
                      </p>
                    )}
                    {!entry.document_version_before && (
                      <p className="mt-3 text-2xs text-ink-faint tabular leading-relaxed">
                        {entry.document_version_after}
                      </p>
                    )}
                  </div>
                  <div
                    className={
                      operatorOnly
                        ? "border-l-2 border-charcoal/40 pl-6"
                        : ""
                    }
                  >
                    <ChangeBadges entry={entry} />
                    <h3
                      className={
                        "mt-4 text-base font-semibold leading-snug tracking-tight " +
                        (operatorOnly ? "text-charcoal" : "text-ink")
                      }
                    >
                      {entry.headline}
                    </h3>
                    <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                      {entry.summary}
                    </p>
                    {entry.diff_excerpt && (
                      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {entry.diff_excerpt.before && (
                          <DiffBlock
                            label="Before"
                            tone="below"
                            text={entry.diff_excerpt.before}
                          />
                        )}
                        {entry.diff_excerpt.after && (
                          <DiffBlock
                            label="After"
                            tone="high"
                            text={entry.diff_excerpt.after}
                          />
                        )}
                      </div>
                    )}
                    <a
                      href={entry.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-1 text-2xs text-ink-muted hover:underline"
                    >
                      Open source
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}

function DiffBlock({
  label,
  tone,
  text,
}: {
  label: string;
  tone: "below" | "high";
  text: string;
}) {
  const cls =
    tone === "high"
      ? "border-band-high-fg/15 bg-band-high-bg/40 text-band-high-fg"
      : "border-band-below-fg/20 bg-band-below-bg/60 text-ink-soft";
  return (
    <div className={`rounded-md border px-3 py-2 text-2xs leading-relaxed ${cls}`}>
      <p className="text-kicker uppercase text-ink-faint mb-1">{label}</p>
      <p>{text}</p>
    </div>
  );
}
