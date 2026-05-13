import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { UkOriginMapView } from "@/components/atlas/uk-origin-map-view";

export const metadata: Metadata = {
  title: "ATLAS · UK origin map",
  description:
    "Both directions, scrubbable. The UK has the published evidential base to anchor both flows.",
};

export default function AtlasUkOriginMapPage() {
  const basePageAudit = {
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    fixtureVersions: [
      { name: "uk-flows.ts", lastUpdated: "uk-flows.ts @ 2026-05-13" },
    ],
    subject: "UK Band A flows · inbound + outbound",
  };

  return (
    <>
      <PageHeader
        eyebrow="ATLAS · UK ORIGIN MAP"
        title="Where UK gained and lost talent."
      />
      <div className="container py-12 md:py-16">
        <UkOriginMapView
          basePageAudit={basePageAudit}
          description="Both directions, scrubbable. The UK has the published evidential base to anchor both flows. Inbound shows where UK gained Band A talent from each year; Outbound traces the brain drain — where UK lost Band A talent to."
        />
      </div>
    </>
  );
}
