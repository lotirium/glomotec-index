import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { UkOverview } from "@/components/atlas/uk-overview";
import {
  getUkInsights,
  getUkOverviewStats,
  getUkSectorSummary,
  getUkSummary,
  getUkTopByBand,
} from "@/lib/atlas/data";

export const metadata: Metadata = {
  title: "ATLAS · UK Innovator Founder precedent",
  description:
    "The UK Innovator Founder programme runs on public three-pillar criteria. ATLAS adapts that pattern for sovereign deployment across jurisdictions.",
};

export default async function AtlasUkPage() {
  const [summary, stats, sectors, insights, topStrong, belowSamples] = await Promise.all([
    getUkSummary(),
    getUkOverviewStats(),
    getUkSectorSummary(),
    getUkInsights(),
    getUkTopByBand("A", 5),
    getUkTopByBand("D", 5),
  ]);

  const basePageAudit = {
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    fixtureVersions: [
      { name: "uk-innovator.json", lastUpdated: stats.lastRefresh },
    ],
    subject: "UK Innovator Founder precedent",
  };

  return (
    <>
      <PageHeader
        eyebrow="ATLAS · UK INNOVATOR FOUNDER PRECEDENT"
        title="Where the rubric was born."
        description="The UK Innovator Founder programme runs on public criteria (innovative, viable, scalable) and endorsing-body rubrics. ATLAS adapts that pattern for sovereign deployment across jurisdictions."
      />

      <div className="container py-16 md:py-20">
        <UkOverview
          summary={summary}
          stats={stats}
          sectors={sectors}
          insights={insights}
          topStrong={topStrong}
          belowSamples={belowSamples}
          basePageAudit={basePageAudit}
        />
      </div>

      <section
        aria-labelledby="footer-cta-heading"
        className="border-t border-line bg-surface-soft"
      >
        <div className="container py-16">
          <div className="mx-auto w-full md:max-w-[78%] space-y-8">
            <div>
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Same engine
              </p>
              <h2
                id="footer-cta-heading"
                className="mt-2 text-h2 font-bold tracking-tight text-ink"
              >
                Now applied to UAE free zones.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-ink-muted leading-relaxed">
                The UK precedent is one programme with one set of endorsing bodies. ATLAS extends the gMC v1.0 framework across UAE free zones (DMCC, DIFC, ADGM, JAFZA) so policy teams can compare and act on the same scoring fabric.
              </p>
            </div>
            <Link
              href="/atlas/uae"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-kicker uppercase text-surface transition-colors hover:bg-accent-soft"
            >
              See UAE free zone view
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
