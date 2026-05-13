import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AtlasUaeTabs } from "@/components/atlas/atlas-uae-tabs";
import { OriginMapView } from "@/components/atlas/origin-map-view";
import { getOriginMapData } from "@/lib/atlas/data";

export const metadata: Metadata = {
  title: "ATLAS · UAE Origin map",
  description:
    "Where UAE Band A talent comes from. Founder and HQ origin country for every Band A entity in the UAE free zone sample.",
};

export default async function AtlasUaeOriginMapPage() {
  const data = await getOriginMapData();

  const basePageAudit = {
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    fixtureVersions: ["dmcc", "difc", "adgm", "jafza"].map((z) => ({
      name: `${z}.json`,
      lastUpdated: data.last_refresh,
    })),
    subject: "UAE Origin map",
  };

  return (
    <>
      <PageHeader
        eyebrow="ATLAS · UAE ORIGIN MAP"
        title="Where UAE Band A talent comes from."
      />
      <AtlasUaeTabs current="origin-map" />

      <div className="container py-12 md:py-16">
        <OriginMapView
          data={data}
          basePageAudit={basePageAudit}
          description="Founder and HQ origin country for every Band A entity in the UAE free zone sample. Flow lines trace where the talent is coming from."
        />
      </div>
    </>
  );
}
