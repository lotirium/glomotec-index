import Link from "next/link";
import { ArrowUpRight, Activity, FileText, GitBranch } from "lucide-react";
import {
  getRoutes,
  getClients,
  getRecentChanges,
  getModuleStatus,
  summariseClient,
} from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { PreviewBanner } from "@/components/preview-banner";
import { LivePipelineDemo } from "@/components/pipeline/live-pipeline";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChangeBadges,
  isOperatorOnlyTier,
} from "@/components/changes/change-badges";
import { formatDate, formatRelative } from "@/lib/utils";
import type { SourceTier } from "@/lib/types";

export default async function HomePage() {
  const [routes, clients, recent, modules] = await Promise.all([
    getRoutes(),
    getClients(),
    getRecentChanges(4),
    Promise.resolve(getModuleStatus()),
  ]);

  const visaRoutes = routes.filter((r) => (r.kind ?? "route") === "route");
  const ukRoutes = visaRoutes.filter((r) => (r.jurisdiction ?? "UK") === "UK");
  const uaeRoutes = visaRoutes.filter((r) => r.jurisdiction === "UAE");
  const enabledRoute = routes.find((r) => r.enabled);
  const totalCriteria = routes.reduce((sum, r) => sum + r.criteria_count, 0);

  const advisorImpactTone: Record<
    "operational_disruption" | "advisory" | "informational",
    "low" | "medium" | "neutral"
  > = {
    operational_disruption: "low",
    advisory: "medium",
    informational: "neutral",
  };
  const advisorImpactLabel: Record<
    "operational_disruption" | "advisory" | "informational",
    string
  > = {
    operational_disruption: "Operational disruption",
    advisory: "Advisory",
    informational: "Informational",
  };

  return (
    <>
      <PreviewBanner />
      <PageHeader
        variant="hero"
        eyebrow="ENGINE · Pipeline"
        title="UK immigration guidance, continuously indexed."
        description="INDEX reads Home Office caseworker guidance, extracts each predicate as a structured criterion, and scores operator profiles against it. Every criterion stays anchored to its source."
        meta={
          <>
            <span>
              <strong className="font-medium text-surface">{totalCriteria}</strong> criteria
              indexed
            </span>
            <span aria-hidden>·</span>
            <span>
              <strong className="font-medium text-surface">{clients.length}</strong> active
              operators
            </span>
            <span aria-hidden>·</span>
            <span>
              <strong className="font-medium text-surface">{routes.length}</strong> routes
              tracked
            </span>
            <span aria-hidden>·</span>
            <span>Refreshed {formatRelative(enabledRoute?.last_refreshed)}</span>
          </>
        }
      />

      <div className="container py-20 md:py-24 space-y-24 md:space-y-28">
        <section className="mx-auto w-full md:max-w-[78%] space-y-8">
          <SectionHeading
            eyebrow="Modules"
            title="Pipeline status"
            description="Five modules cooperate to keep guidance, criteria and assessments in sync. Click below to watch the first four run against live gov.uk data."
          />
          <LivePipelineDemo
            modules={modules}
            apiKeyConfigured={Boolean(process.env.ANTHROPIC_API_KEY)}
          />
        </section>

        <section className="mx-auto w-full md:max-w-[78%] space-y-8">
          <SectionHeading
            eyebrow="Routes"
            title="Routes tracked"
            description="Innovator Founder is fully indexed against UK caseworker guidance. The UAE Golden Visa Founder track is queued for ingestion."
            trailing={
              <Button asChild variant="explore" size="pill">
                <Link href="/sources">SOURCE REGISTRY</Link>
              </Button>
            }
          />
          <div className="space-y-12">
            <RouteJurisdictionBlock label="United Kingdom" routes={ukRoutes} />
            {uaeRoutes.length > 0 && (
              <RouteJurisdictionBlock
                label="United Arab Emirates"
                routes={uaeRoutes}
              />
            )}
          </div>
        </section>

        <section className="mx-auto w-full md:max-w-[78%] grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <SectionHeading
              eyebrow="COMPASS"
              title="Active operators"
              description="Each profile is scored against every criterion and updated whenever guidance changes."
              trailing={
                <Button asChild variant="explore" size="pill">
                  <Link href="/clients">ALL OPERATORS</Link>
                </Button>
              }
            />
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {clients.map((c) => {
                const s = summariseClient(c);
                return (
                  <li key={c.slug} className="group">
                    <Link
                      href={`/clients/${c.slug}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-soft outline-none focus-visible:bg-surface-soft"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-ink truncate">
                            {s.primary}
                          </p>
                          <Badge tone="neutral">{s.badge}</Badge>
                        </div>
                        <p className="mt-0.5 text-2xs text-ink-muted truncate">
                          {s.secondary}
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center gap-4 text-2xs text-ink-faint tabular">
                        <span>{c.business.stage ?? "stage unknown"}</span>
                        <span>{c.intended_route.replace(/_/g, " ")}</span>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-ink" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-8">
            <SectionHeading
              eyebrow="Change feed"
              title="Recent changes"
              trailing={
                <Button asChild variant="explore" size="pill">
                  <Link href="/changes">ALL CHANGES</Link>
                </Button>
              }
            />
            <ol className="space-y-3">
              {recent.map((entry) => {
                const tier: SourceTier = entry.tier ?? "T1";
                const operatorOnly = isOperatorOnlyTier(tier);
                return (
                  <li key={entry.id}>
                    <Link
                      href={`/changes#${entry.id}`}
                      className={
                        "group block rounded-lg border border-line bg-surface p-5 transition-colors hover:border-ink-faint" +
                        (operatorOnly
                          ? " border-l-2 border-l-charcoal/40"
                          : "")
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-kicker uppercase text-ink-faint tabular shrink-0">
                          {formatDate(entry.observed_at)}
                        </p>
                        <ChangeBadges entry={entry} compact />
                      </div>
                      <p
                        className={
                          "mt-3 text-sm font-semibold leading-snug " +
                          (operatorOnly ? "text-charcoal" : "text-ink")
                        }
                      >
                        {entry.headline}
                      </p>
                      <p className="mt-1 text-2xs text-ink-muted line-clamp-2 leading-relaxed">
                        {entry.summary}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="mx-auto w-full md:max-w-[78%] grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Hint
            icon={Activity}
            title="Re-scored on change"
            body="When the underlying guidance or an operator's profile is updated, every affected criterion is re-scored and the verdict is recomputed."
          />
          <Hint
            icon={GitBranch}
            title="Anchored to the source"
            body="Each criterion records the verbatim sentence in caseworker guidance it was extracted from, and the document version at the time of extraction."
          />
          <Hint
            icon={FileText}
            title="Burden-aware"
            body="Each criterion is tagged with whose work it is (applicant, endorsing body, or caseworker) so it's clear what falls inside an operator's preparation."
          />
        </section>
      </div>
    </>
  );
}

function Hint({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-6 transition-colors hover:border-ink-faint">
      <Icon className="h-4 w-4 text-ink-muted" />
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-2xs text-ink-muted leading-relaxed">{body}</p>
    </div>
  );
}

function RouteJurisdictionBlock({
  label,
  routes,
}: {
  label: string;
  routes: import("@/lib/types").Route[];
}) {
  return (
    <div className="space-y-4">
      <div className="border-b border-line pb-3">
        <p className="text-kicker uppercase text-ink-faint">
          Jurisdiction · {label.toUpperCase()}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {routes.map((r) => (
          <Card
            key={r.id}
            className="p-6 animate-fade-up"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold tracking-tight text-ink leading-snug">
                    {r.name}
                  </p>
                  {r.enabled ? (
                    <Badge tone="high">Indexed</Badge>
                  ) : (
                    <Badge tone="outline" className="uppercase tracking-[0.18em] text-2xs">
                      {r.status_label ?? "Tracked"}
                    </Badge>
                  )}
                </div>
                {r.document_version && r.document_version !== "—" && (
                  <p className="mt-2 text-2xs text-ink-faint tabular">
                    {r.document_version}
                  </p>
                )}
              </div>
              <a
                href={r.document_url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${r.name} source`}
                className="rounded-sm text-ink-muted transition-colors hover:text-ink"
              >
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-2xs text-ink-muted">
              <div>
                <p className="text-kicker uppercase text-ink-faint">Criteria</p>
                <p className="mt-1 text-sm font-semibold text-ink tabular">
                  {r.enabled ? r.criteria_count : "not yet indexed"}
                </p>
              </div>
              <div>
                <p className="text-kicker uppercase text-ink-faint">Polled</p>
                <p className="mt-1 text-sm font-semibold text-ink tabular">
                  {r.polling_label ??
                    (r.polling_cadence_days === 1
                      ? "Daily"
                      : `${r.polling_cadence_days}d`)}
                </p>
              </div>
              <div>
                <p className="text-kicker uppercase text-ink-faint">Last run</p>
                <p className="mt-1 text-sm font-semibold text-ink-soft tabular">
                  {r.last_refreshed
                    ? formatRelative(r.last_refreshed)
                    : "not yet"}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
