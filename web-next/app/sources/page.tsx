import { ExternalLink } from "lucide-react";
import { getRoutes } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";
import type { Jurisdiction, Route } from "@/lib/types";

export const metadata = { title: "Sources" };

const JURISDICTION_LABEL: Record<Jurisdiction, string> = {
  UK: "United Kingdom",
  UAE: "United Arab Emirates",
};

const GCC_FUTURE: ReadonlyArray<{ name: string; note: string }> = [
  { name: "Saudi Arabia", note: "Ministry of Investment, MISA, GAZT" },
  { name: "Qatar", note: "Ministry of Interior, QFC, QFZA" },
  { name: "Bahrain", note: "Bahrain Economic Development Board, NBR" },
];

function pollingLabel(r: Route): string {
  if (r.polling_label) return r.polling_label;
  if (r.polling_cadence_days === 1) return "Daily";
  if (r.polling_cadence_days === 7) return "Weekly";
  return `${r.polling_cadence_days}d`;
}

export default async function SourcesPage() {
  const routes = await getRoutes();
  const uk = routes.filter((r) => (r.jurisdiction ?? "UK") === "UK");
  const uae = routes.filter((r) => r.jurisdiction === "UAE");

  return (
    <>
      <PageHeader
        eyebrow="Source registry"
        title="The documents INDEX is reading."
        description="One row per source. Every criterion and changefeed entry is anchored to the linked document and version."
      />
      <div className="container py-20 md:py-24 space-y-24 md:space-y-28">
        {uk.length > 0 && (
          <JurisdictionSection
            label={JURISDICTION_LABEL.UK}
            routes={uk}
            pollingLabelFor={pollingLabel}
          />
        )}
        {uae.length > 0 && (
          <JurisdictionSection
            label={JURISDICTION_LABEL.UAE}
            routes={uae}
            pollingLabelFor={pollingLabel}
          />
        )}
        <GccExpansion />
      </div>
    </>
  );
}

function JurisdictionSection({
  label,
  routes,
  pollingLabelFor,
}: {
  label: string;
  routes: Route[];
  pollingLabelFor: (r: Route) => string;
}) {
  return (
    <section className="mx-auto w-full md:max-w-[78%]">
      <header className="border-b border-line pb-4">
        <p className="text-kicker uppercase text-ink-faint">
          Jurisdiction · {label.toUpperCase()}
        </p>
      </header>
      <ul className="divide-y divide-line">
        {routes.map((r) => (
          <li key={r.id}>
            <SourceRow route={r} pollingLabel={pollingLabelFor(r)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SourceRow({ route: r, pollingLabel }: { route: Route; pollingLabel: string }) {
  const statusLabel =
    r.status_label ?? (r.enabled ? "Indexed" : "Tracked");
  const refreshed = r.last_refreshed
    ? formatRelative(r.last_refreshed)
    : "not yet";
  return (
    <div className="grid grid-cols-1 gap-6 py-8 md:grid-cols-[1fr_auto] md:gap-10">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-base font-semibold tracking-tight text-ink leading-snug">
            {r.name}
          </p>
          {r.enabled ? (
            <Badge tone="high">Indexed</Badge>
          ) : (
            <Badge tone="outline" className="uppercase tracking-[0.18em] text-2xs">
              {statusLabel}
            </Badge>
          )}
        </div>
        {r.document_version && r.document_version !== "—" && (
          <p className="text-2xs text-ink-faint tabular">{r.document_version}</p>
        )}
        <a
          href={r.document_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-2xs text-ink-muted hover:underline break-all"
        >
          {r.document_url}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      </div>
      <dl className="grid grid-cols-3 gap-4 md:gap-10 md:text-right shrink-0 self-start">
        <div>
          <dt className="text-kicker uppercase text-ink-faint">Criteria</dt>
          <dd className="mt-1 text-sm font-semibold text-ink tabular">
            {r.enabled ? r.criteria_count : "not yet"}
          </dd>
        </div>
        <div>
          <dt className="text-kicker uppercase text-ink-faint">Polling</dt>
          <dd className="mt-1 text-sm font-semibold text-ink tabular">
            {pollingLabel}
          </dd>
        </div>
        <div>
          <dt className="text-kicker uppercase text-ink-faint">Refreshed</dt>
          <dd className="mt-1 text-sm font-semibold text-ink-soft tabular">
            {refreshed}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function GccExpansion() {
  return (
    <section className="mx-auto w-full md:max-w-[78%]">
      <header className="border-b border-line pb-4">
        <p className="text-kicker uppercase text-ink-faint">
          Jurisdiction · GCC Expansion
        </p>
      </header>
      <ul className="divide-y divide-line">
        {GCC_FUTURE.map((g) => (
          <li
            key={g.name}
            className="flex items-baseline justify-between gap-6 py-6"
          >
            <p className="text-base font-semibold text-ink">{g.name}</p>
            <p className="text-2xs text-ink-faint">{g.note}</p>
            <Badge
              tone="outline"
              className="uppercase tracking-[0.18em] text-2xs"
            >
              Future · not yet tracked
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
