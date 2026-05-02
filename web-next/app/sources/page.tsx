import { ExternalLink } from "lucide-react";
import { getRoutes } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatRelative } from "@/lib/utils";

export const metadata = { title: "Sources" };

export default async function SourcesPage() {
  const routes = await getRoutes();
  return (
    <>
      <PageHeader
        eyebrow="Source registry"
        title="The documents INDEX is reading"
        description="One row per route. Every criterion and changefeed entry is anchored to the linked document and version."
      />
      <div className="container py-10">
        <ul className="space-y-3">
          {routes.map((r) => (
            <li key={r.id}>
              <Card className="p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold tracking-tight text-ink">
                        {r.name}
                      </p>
                      {r.enabled ? (
                        <Badge tone="high">Indexed</Badge>
                      ) : (
                        <Badge tone="outline">Tracked</Badge>
                      )}
                    </div>
                    <p className="font-mono text-2xs text-ink-faint tabular">
                      {r.document_version}
                    </p>
                    <a
                      href={r.document_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-2xs text-accent-deep hover:underline break-all"
                    >
                      {r.document_url}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                  <dl className="grid grid-cols-3 gap-4 md:gap-6 md:text-right text-2xs shrink-0">
                    <div>
                      <dt className="font-mono uppercase tracking-[0.18em] text-ink-faint">
                        Criteria
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold text-ink tabular">
                        {r.enabled ? r.criteria_count : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono uppercase tracking-[0.18em] text-ink-faint">
                        Polling
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold text-ink tabular">
                        {r.polling_cadence_days}d
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono uppercase tracking-[0.18em] text-ink-faint">
                        Refreshed
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold text-ink-soft tabular">
                        {formatRelative(r.last_refreshed)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
