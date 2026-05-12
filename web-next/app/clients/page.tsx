import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { getClients, getAssessment } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DraftsList } from "@/components/draft/drafts-list";
import { SectionHeading } from "@/components/shared/section-heading";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "COMPASS" };

const stageLabel: Record<string, string> = {
  endorsement_sought: "Endorsement sought",
  endorsement_received: "Endorsement received",
  filed: "Filed",
  under_review: "Under review",
  extension: "Extension",
};

export default async function ClientsPage() {
  const clients = await getClients();
  const enriched = await Promise.all(
    clients.map(async (c) => ({
      client: c,
      assessment: await getAssessment(c.slug),
    })),
  );

  const verdictTone: Record<string, BadgeProps["tone"]> = {
    high: "high",
    medium: "medium",
    low: "low",
  };

  return (
    <>
      <PageHeader
        eyebrow="COMPASS"
        title="Operator profiles."
        description="Three profiles, scored against the Innovator Founder caseworker guidance. Open any profile for the full readiness report."
        trailing={
          <Button asChild variant="engage" size="pill">
            <Link href="/clients/new">
              <Plus className="h-3.5 w-3.5" />
              SCORE A PROFILE
            </Link>
          </Button>
        }
      />
      <div className="container py-20 md:py-24 space-y-24 md:space-y-28">
        <section className="mx-auto w-full md:max-w-[78%] space-y-8">
          <SectionHeading
            eyebrow="Seeded operators"
            title="Pre-scored profiles"
            description="Loaded with the preview build. Open any profile for the full readiness report."
          />
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {enriched.map(({ client, assessment }) => (
            <li key={client.slug}>
              <Link
                href={`/clients/${client.slug}`}
                className="group block h-full"
              >
                <Card className="h-full p-6">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="neutral">{stageLabel[client.stage] ?? client.stage}</Badge>
                    <ArrowUpRight className="h-4 w-4 text-ink-faint transition-colors group-hover:text-ink" />
                  </div>
                  <p className="mt-4 text-base font-semibold tracking-tight text-ink">
                    {client.full_name}
                  </p>
                  <p className="mt-0.5 text-2xs text-ink-muted">
                    {client.nationality} · {client.business.applicant_role ?? "Founder"}
                  </p>

                  {assessment && (
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <div>
                        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                          Readiness
                        </p>
                        <p className="mt-1 flex items-baseline gap-1">
                          <span className="text-3xl font-semibold tracking-tight text-ink tabular">
                            {assessment.overall_pct}
                          </span>
                          <span className="text-sm text-ink-muted">%</span>
                        </p>
                      </div>
                      <Badge tone={verdictTone[assessment.verdict_class] ?? "neutral"}>
                        {assessment.verdict_headline}
                      </Badge>
                    </div>
                  )}

                  <dl className="mt-4 grid grid-cols-4 gap-3 border-t border-line/70 pt-4 text-2xs">
                    <div>
                      <dt className="font-mono uppercase tracking-[0.18em] text-ink-faint">High</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-band-high-fg tabular">
                        {assessment?.summary.high ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono uppercase tracking-[0.18em] text-ink-faint">Medium</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-band-medium-fg tabular">
                        {assessment?.summary.medium ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono uppercase tracking-[0.18em] text-ink-faint">Low</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-band-low-fg tabular">
                        {assessment?.summary.low ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono uppercase tracking-[0.18em] text-ink-faint">Below</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-band-below-fg tabular">
                        {assessment?.summary.below_threshold ?? "—"}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-4 text-2xs text-ink-faint tabular">
                    {assessment
                      ? `${assessment.total} criteria · `
                      : ""}
                    {client.filed_on
                      ? `filed ${formatDate(client.filed_on)}`
                      : "not yet filed"}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
        </section>
        <DraftsList />
      </div>
    </>
  );
}
