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
import { formatDate, formatRelative } from "@/lib/utils";

export default async function HomePage() {
  const [routes, clients, recent, modules] = await Promise.all([
    getRoutes(),
    getClients(),
    getRecentChanges(4),
    Promise.resolve(getModuleStatus()),
  ]);

  const enabledRoute = routes.find((r) => r.enabled);
  const totalCriteria = routes.reduce((sum, r) => sum + r.criteria_count, 0);

  const advisorImpactTone: Record<"high" | "medium" | "low", "low" | "medium" | "neutral"> = {
    high: "low",
    medium: "medium",
    low: "neutral",
  };

  return (
    <>
      <PreviewBanner />
      <PageHeader
        eyebrow="Pipeline overview"
        title="UK immigration guidance, continuously indexed."
        description="INDEX reads Home Office caseworker guidance, extracts each predicate as a structured criterion, and scores client profiles against it. Every criterion stays anchored to its source."
        meta={
          <>
            <span>
              <strong className="font-medium text-ink-soft">{totalCriteria}</strong> criteria
              indexed
            </span>
            <span aria-hidden>·</span>
            <span>
              <strong className="font-medium text-ink-soft">{clients.length}</strong> active
              clients
            </span>
            <span aria-hidden>·</span>
            <span>
              <strong className="font-medium text-ink-soft">{routes.length}</strong> routes
              tracked
            </span>
            <span aria-hidden>·</span>
            <span>Refreshed {formatRelative(enabledRoute?.last_refreshed)}</span>
          </>
        }
      />

      <div className="container space-y-12 py-10">
        <section className="space-y-4">
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

        <section className="space-y-4">
          <SectionHeading
            eyebrow="Routes"
            title="Routes tracked"
            description="Innovator Founder is fully indexed. Other routes are tracked in the registry; criteria extraction is queued."
            trailing={
              <Button asChild variant="ghost" size="sm">
                <Link href="/sources">
                  Source registry
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {routes.map((r) => (
              <Card
                key={r.id}
                className="p-5 transition-shadow hover:shadow-card animate-fade-up"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold tracking-tight text-ink">
                        {r.name}
                      </p>
                      {r.enabled ? (
                        <Badge tone="high">Indexed</Badge>
                      ) : (
                        <Badge tone="outline">Tracked</Badge>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-2xs text-ink-faint tabular">
                      {r.document_version}
                    </p>
                  </div>
                  <a
                    href={r.document_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${r.name} guidance on gov.uk`}
                    className="rounded-sm text-ink-muted transition-colors hover:text-ink"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-2xs text-ink-muted">
                  <div>
                    <p className="font-mono uppercase tracking-[0.18em] text-ink-faint">
                      Criteria
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink tabular">
                      {r.enabled ? r.criteria_count : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono uppercase tracking-[0.18em] text-ink-faint">
                      Polled
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink tabular">
                      {r.polling_cadence_days}d
                    </p>
                  </div>
                  <div>
                    <p className="font-mono uppercase tracking-[0.18em] text-ink-faint">
                      Last run
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-soft tabular">
                      {formatRelative(r.last_refreshed)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <SectionHeading
              eyebrow="Clients"
              title="Active clients"
              description="Each profile is scored against every criterion and updated whenever guidance changes."
              trailing={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/clients">
                    All clients
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              }
            />
            <ul className="divide-y divide-line/80 rounded-lg border border-line bg-surface shadow-soft">
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
                        <span>{c.business.stage ?? "—"}</span>
                        <span>{c.intended_route.replace(/_/g, " ")}</span>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-ink" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-4">
            <SectionHeading
              eyebrow="Change feed"
              title="Recent changes"
              trailing={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/changes">
                    All
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              }
            />
            <ol className="space-y-3">
              {recent.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={`/changes#${entry.id}`}
                    className="group block rounded-lg border border-line bg-surface p-4 shadow-soft transition-shadow hover:shadow-card"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-2xs font-mono uppercase tracking-[0.18em] text-ink-faint tabular">
                        {formatDate(entry.observed_at)}
                      </p>
                      <Badge tone={advisorImpactTone[entry.advisor_impact]}>
                        {entry.advisor_impact} impact
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink leading-snug group-hover:text-accent-deep transition-colors">
                      {entry.headline}
                    </p>
                    <p className="mt-1 text-2xs text-ink-muted line-clamp-2 leading-relaxed">
                      {entry.summary}
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Hint
            icon={Activity}
            title="Re-scored on change"
            body="When the underlying guidance or a client's profile is updated, every affected criterion is re-scored and the verdict is recomputed."
          />
          <Hint
            icon={GitBranch}
            title="Anchored to the source"
            body="Each criterion records the verbatim sentence in caseworker guidance it was extracted from, and the document version at the time of extraction."
          />
          <Hint
            icon={FileText}
            title="Burden-aware"
            body="Each criterion is tagged with whose work it is — applicant, endorsing body, or caseworker — so it's clear what falls inside an advisor's preparation."
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
    <div className="rounded-lg border border-line/70 bg-surface/60 p-5">
      <Icon className="h-4 w-4 text-ink-muted" />
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-2xs text-ink-muted leading-relaxed">{body}</p>
    </div>
  );
}
