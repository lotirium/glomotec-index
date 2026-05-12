import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  UaeOverview,
  type ZoneDetailBundle,
} from "@/components/atlas/uae-overview";
import {
  getAllZonesSummary,
  getAtlasOverviewStats,
  getPolicyInsights,
  getSectorHeatmapData,
  getSectorSummary,
  getTopBandA,
} from "@/lib/atlas/data";
import type { FreeZone } from "@/lib/atlas/types";

export const metadata: Metadata = {
  title: "ATLAS · UAE Free Zone Intelligence",
  description:
    "Every company licensed across DMCC, DIFC, ADGM and JAFZA, continuously graded against the three-pillar rubric.",
};

const ZONES: FreeZone[] = ["DMCC", "DIFC", "ADGM", "JAFZA"];

export default async function AtlasUaePage() {
  const [summaries, stats, heatmap] = await Promise.all([
    getAllZonesSummary(),
    getAtlasOverviewStats(),
    getSectorHeatmapData(),
  ]);
  const summaryByZone = Object.fromEntries(summaries.map((s) => [s.zone, s])) as Record<
    FreeZone,
    (typeof summaries)[number]
  >;

  const details = await Promise.all(
    ZONES.map(async (z) => {
      const [sectors, insights, topBandA] = await Promise.all([
        getSectorSummary(z),
        getPolicyInsights(z),
        getTopBandA(z, 10),
      ]);
      return [
        z,
        {
          summary: summaryByZone[z],
          sectors,
          insights,
          topBandA,
        },
      ] as const;
    }),
  );

  const bundles = Object.fromEntries(details) as Record<FreeZone, ZoneDetailBundle>;

  const basePageAudit = {
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    fixtureVersions: summaries.map((s) => ({
      name: `${s.zone.toLowerCase()}.json`,
      lastUpdated: s.lastUpdated,
    })),
    subject: "UAE Free Zone Intelligence",
  };

  return (
    <>
      <PageHeader
        eyebrow="ATLAS · UAE FREE ZONE INTELLIGENCE"
        title="Every company you've licensed, continuously graded."
        description="Free Zone authorities publish sector totals. ATLAS adds the rubric layer that turns totals into pipeline intelligence : graded, evidence anchored, audit-trail native."
      />

      <div className="container py-16 md:py-20">
        <UaeOverview
          bundles={bundles}
          stats={stats}
          heatmap={heatmap}
          basePageAudit={basePageAudit}
        />
      </div>

      <section
        aria-labelledby="footer-cta-heading"
        className="border-t border-line bg-surface-soft"
      >
        <div className="container py-16">
          <div className="mx-auto w-full md:max-w-[78%] space-y-10">
            <div>
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Cross-jurisdiction
              </p>
              <h2
                id="footer-cta-heading"
                className="mt-2 text-h2 font-bold tracking-tight text-ink"
              >
                Same engine, three jurisdictions.
              </h2>
              <p className="mt-2 text-sm text-ink-muted max-w-2xl leading-relaxed">
                ATLAS applies one rubric across jurisdictions. The UK Innovator Founder
                precedent is the reference set. Saudi Arabia coverage is being scoped.
              </p>
            </div>

            <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <li>
                <Link
                  href="/atlas/uae"
                  className="block rounded-md border border-accent/40 bg-surface p-5 transition-colors hover:border-accent"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                    UAE
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink">Free zone intelligence</p>
                  <p className="mt-1 text-2xs text-ink-muted">DMCC · DIFC · ADGM · JAFZA</p>
                </Link>
              </li>
              <li>
                <Link
                  href="/atlas/uk"
                  className="block rounded-md border border-line bg-surface p-5 transition-colors hover:border-accent/40"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                    UK
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    Innovator Founder precedent
                  </p>
                  <p className="mt-1 text-2xs text-ink-muted">
                    Three-pillar framework reference set.
                  </p>
                </Link>
              </li>
              <li>
                <div className="block rounded-md border border-line/60 bg-surface p-5 opacity-60">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                    Saudi Arabia
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink-soft">Soon</p>
                  <p className="mt-1 text-2xs text-ink-muted">Coverage planning underway.</p>
                </div>
              </li>
            </ul>

            <Link
              href="/atlas/uk"
              className="inline-flex items-center gap-2 rounded-full border border-accent bg-surface px-6 py-3 text-kicker uppercase text-accent transition-colors hover:bg-accent-tint"
            >
              Compare with UK Innovator Founder precedent
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
