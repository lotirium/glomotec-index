import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SgOriginMapView } from "@/components/atlas/sg-origin-map-view";
import { SG_HISTORY_FIXTURE_VERSION } from "@/lib/atlas/sg-origin-history";

export const metadata: Metadata = {
  title: "ATLAS · Singapore origin map",
  description:
    "Where Singapore drew its talent. Five-year inbound snapshots paired with every EP threshold raise and the COMPASS framework, from 2000 through 2025.",
};

export default function AtlasSgOriginMapPage() {
  const basePageAudit = {
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    fixtureVersions: [
      {
        name: "sg-origin-history.json",
        lastUpdated: SG_HISTORY_FIXTURE_VERSION,
      },
    ],
    subject: "Singapore inbound origin map · 2000 to 2025",
  };

  return (
    <>
      <PageHeader
        eyebrow="ATLAS · SINGAPORE · ORIGIN MAP"
        title="Where Singapore drew its talent."
      />
      <div className="container py-12 md:py-16">
        <SgOriginMapView
          basePageAudit={basePageAudit}
          description="Singapore tightens with rhythm. Each EP threshold raise reshapes the origin mix. The COMPASS framework added a multi-attribute lens. Scrub through the timeline to see how Singapore's foreign talent profile changed before and after each tightening."
        />
      </div>
    </>
  );
}
