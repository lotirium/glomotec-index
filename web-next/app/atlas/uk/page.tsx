import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { UkHistoricalTimeline } from "@/components/atlas/uk-historical-timeline";
import { UK_HISTORY_FIXTURE_VERSION } from "@/lib/atlas/uk-history";

export const metadata: Metadata = {
  title: "ATLAS · UK historical view",
  description:
    "Twenty-five years of UK migration policy, visualised. Scrub through the timeline to see how each policy lever moved the curve, and where the model would have predicted what actually happened.",
};

export default function AtlasUkPage() {
  const basePageAudit = {
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    fixtureVersions: [
      { name: "uk-history.json", lastUpdated: UK_HISTORY_FIXTURE_VERSION },
    ],
    subject: "UK historical view · 2000 to 2025",
  };

  return (
    <>
      <PageHeader
        eyebrow="ATLAS · UK HISTORICAL VIEW"
        title="Twenty-five years of UK migration policy, visualised."
      />
      <div className="container py-12 md:py-16">
        <UkHistoricalTimeline
          basePageAudit={basePageAudit}
          description="The UK has the published evidential base to anchor the model. Scrub through the timeline to see how each policy lever moved the curve, and where the model would have predicted what actually happened."
        />
      </div>
    </>
  );
}
