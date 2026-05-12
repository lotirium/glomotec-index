import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import {
  getCompaniesByZone,
  getPolicyInsights,
  getSectorSummary,
} from "@/lib/atlas/data";
import type { FreeZone } from "@/lib/atlas/types";

const ZONES: FreeZone[] = ["DMCC", "DIFC", "ADGM", "JAFZA"];

function normalise(slug: string): FreeZone | null {
  const up = slug.toUpperCase() as FreeZone;
  return ZONES.includes(up) ? up : null;
}

export function generateStaticParams() {
  return ZONES.map((z) => ({ zone: z.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ zone: string }>;
}): Promise<Metadata> {
  const { zone } = await params;
  const z = normalise(zone);
  return { title: z ? `ATLAS · ${z}` : "ATLAS · zone" };
}

export default async function AtlasZonePage({
  params,
}: {
  params: Promise<{ zone: string }>;
}) {
  const { zone } = await params;
  const z = normalise(zone);
  if (!z) notFound();

  const companies = await getCompaniesByZone(z);
  const sectors = await getSectorSummary(z);
  const insights = await getPolicyInsights(z);

  return (
    <>
      <PageHeader
        eyebrow={`ATLAS · UAE · ${z}`}
        title={`${z} free zone.`}
        description={`${companies.length} entities indexed across ${sectors.length} sectors. Phase 1 scaffold output.`}
      />
      <div className="container py-20 space-y-12">
        <section className="mx-auto w-full md:max-w-[78%] space-y-6">
          <h2 className="text-h3 font-mono uppercase tracking-[0.18em] text-ink-soft">
            Sector mix
          </h2>
          <ul className="space-y-2">
            {sectors.map((s) => (
              <li
                key={s.sector}
                className="flex items-baseline justify-between border-b border-line/60 pb-2 text-sm"
              >
                <span className="text-ink">{s.sector}</span>
                <span className="font-mono text-2xs text-ink-muted tabular">
                  {s.total} · A {s.byBand.A} · B {s.byBand.B} · C {s.byBand.C} · D {s.byBand.D}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto w-full md:max-w-[78%] space-y-6">
          <h2 className="text-h3 font-mono uppercase tracking-[0.18em] text-ink-soft">
            Policy insights
          </h2>
          <ul className="space-y-3">
            {insights.map((insight, i) => (
              <li key={i} className="rounded-md border border-line p-4">
                <p className="text-2xs font-mono uppercase tracking-[0.18em] text-ink-faint">
                  {insight.severity}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">{insight.title}</p>
                <p className="mt-1 text-2xs text-ink-muted">{insight.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto w-full md:max-w-[78%] space-y-6">
          <h2 className="text-h3 font-mono uppercase tracking-[0.18em] text-ink-soft">
            All entities
          </h2>
          <p className="text-2xs text-ink-muted">
            {companies.length} entities indexed. Use Compare to peers from any company page to jump to its row.
          </p>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {companies.map((c) => (
              <li
                key={c.id}
                id={`company-${c.id}`}
                className="rounded-sm border border-line/60 target:border-accent target:bg-cyan-tint/40 target:ring-1 target:ring-cyan/30 scroll-mt-24"
              >
                <Link
                  href={`/atlas/company/${c.id}`}
                  className="flex items-baseline justify-between px-3 py-2 text-2xs hover:bg-surface-soft transition-colors"
                >
                  <span className="truncate text-ink">{c.name}</span>
                  <span className="ml-3 font-mono uppercase tracking-[0.18em] text-ink-muted">
                    Band {c.grading.band}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
