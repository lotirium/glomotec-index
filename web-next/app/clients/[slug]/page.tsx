import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  getClient,
  getClients,
  getAssessment,
  getRoute,
  getCriteria,
  getMonitoring,
  getChangefeed,
} from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { VerdictHero } from "@/components/scoring/verdict-hero";
import { CriteriaList } from "@/components/scoring/criteria-list";
import { CacheDot } from "@/components/scoring/cache-dot";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRelative } from "@/lib/utils";
import { DraftClientView } from "@/components/draft/draft-client-view";
import { OperatorTabs } from "@/components/monitor/operator-tabs";
import { MonitorPanel, MonitorOffer } from "@/components/monitor/monitor-panel";

export const dynamicParams = true;

export async function generateStaticParams() {
  const clients = await getClients();
  return clients.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug.startsWith("draft-")) return { title: "Test profile · scoring" };
  const c = await getClient(slug);
  return { title: c ? `${c.full_name} · scoring` : "Operator" };
}

export default async function ClientPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug.startsWith("draft-")) {
    // Pre-load criteria server-side so the draft view can render all 16
    // ghost rows from t=0, before the /api/score stream replies.
    const criteria = await getCriteria("innovator_founder");
    return <DraftClientView slug={slug} criteria={criteria} />;
  }
  const client = await getClient(slug);
  if (!client) notFound();
  const [assessment, route, monitoring, criteria, changefeed] = await Promise.all([
    getAssessment(slug),
    getRoute(client.intended_route),
    getMonitoring(slug),
    getCriteria(client.intended_route),
    getChangefeed(),
  ]);
  if (!assessment) notFound();

  const stageLabel: Record<string, string> = {
    endorsement_sought: "Endorsement sought",
    endorsement_received: "Endorsement received",
    filed: "Filed",
    under_review: "Under review",
    extension: "Extension",
  };

  const profileFacts: Array<{ label: string; value: string; tone?: "neutral" | "warn" }> = [
    { label: "Nationality", value: client.nationality },
    { label: "Route", value: route?.name ?? client.intended_route },
    { label: "Stage", value: stageLabel[client.stage] ?? client.stage },
    {
      label: "Endorsement",
      value: client.endorsement.endorsing_body ?? "—",
    },
    {
      label: "Endorsement letter",
      value: client.endorsement.letter_issued_date
        ? formatDate(client.endorsement.letter_issued_date)
        : "—",
    },
    {
      label: "Filed",
      value: client.filed_on ? formatDate(client.filed_on) : "Not yet filed",
    },
    {
      label: "Personal funds",
      value:
        client.finance.personal_funds_gbp != null
          ? `GBP ${client.finance.personal_funds_gbp.toLocaleString("en-GB")} ${
              client.finance.held_for_at_least_28_days ? "· 28-day held" : "· not 28-day held"
            }`
          : "—",
      tone:
        client.finance.held_for_at_least_28_days === false ? "warn" : "neutral",
    },
    {
      label: "English",
      value: client.english_language.level
        ? `${client.english_language.level} · ${client.english_language.evidence_type ?? "evidence on file"}`
        : "—",
    },
    {
      label: "Documents",
      value: client.documents_in_english_or_welsh
        ? "English or Welsh"
        : "Translations required",
      tone: client.documents_in_english_or_welsh ? "neutral" : "warn",
    },
    {
      label: "Absences (12mo)",
      value: `${client.absences_from_uk_days_last_12_months ?? 0} days`,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={`Operator · ${client.candidate_id}`}
        title={client.full_name}
        description={`${client.business.applicant_role ?? "Founder"} · ${client.business.stage ? `${client.business.stage}-stage business` : "stage unspecified"} · scored against ${assessment.total} criteria`}
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              Scored {formatRelative(assessment.scored_at)}
              <CacheDot state="hit" />
            </span>
            <span aria-hidden>·</span>
            <span>{route?.document_version}</span>
            <span aria-hidden>·</span>
            <Link
              href="/clients"
              className="inline-flex items-center gap-1 text-ink-muted hover:text-ink-soft transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              All operators
            </Link>
          </>
        }
      />

      <div className="container py-20 md:py-24 space-y-20 md:space-y-24">
        <VerdictHero run={assessment} />

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <OperatorTabs
              monitorStatus={monitoring?.monitor_status ?? "offer"}
              criteria={
                <div className="space-y-6">
                  <SectionHeading
                    eyebrow="Criteria"
                    title="Where the score comes from"
                    description="Each criterion was scored against the live profile. Open the reasoning to read the trace."
                  />
                  <CriteriaList results={assessment.results} />
                </div>
              }
              monitor={
                monitoring && monitoring.monitor_status === "active" ? (
                  <MonitorPanel
                    monitoring={monitoring}
                    criteria={criteria}
                    changefeed={changefeed}
                  />
                ) : (
                  <MonitorOffer />
                )
              }
            />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            <Card>
              <div className="border-b border-line/70 px-5 py-4">
                <p className="text-sm font-semibold text-ink">Profile</p>
                <p className="mt-0.5 text-2xs text-ink-muted">
                  The facts the scorer used. Anything missing here flows into outstanding evidence.
                </p>
              </div>
              <dl className="divide-y divide-line/70 px-5 text-2xs">
                {profileFacts.map((fact) => (
                  <div
                    key={fact.label}
                    className="grid grid-cols-[110px_1fr] items-baseline gap-3 py-2.5"
                  >
                    <dt className="font-mono uppercase tracking-[0.16em] text-ink-faint">
                      {fact.label}
                    </dt>
                    <dd
                      className={
                        fact.tone === "warn"
                          ? "text-band-low-fg leading-snug"
                          : "text-ink leading-snug"
                      }
                    >
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="p-5">
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Source
              </p>
              <p className="mt-2 text-sm font-semibold text-ink leading-snug">
                {route?.name} caseworker guidance
              </p>
              <p className="mt-1 text-2xs text-ink-muted tabular">
                {route?.document_version}
              </p>
              {route && (
                <a
                  href={route.document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-2xs text-accent-deep hover:underline"
                >
                  Open on gov.uk
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </Card>

            {client.suitability_concerns && (
              <Card className="border-band-low-fg/30 bg-band-low-bg/40 p-5">
                <Badge tone="low">Suitability flag</Badge>
                <p className="mt-3 text-2xs text-band-low-fg leading-relaxed">
                  {client.suitability_concerns}
                </p>
              </Card>
            )}
          </aside>
        </section>
      </div>
    </>
  );
}
