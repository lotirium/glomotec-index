import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { RubricFrameworkView } from "@/components/atlas/rubric-framework-view";
import { RUBRIC_VERSION } from "@/lib/atlas/rubric";

export const metadata: Metadata = {
  title: "ATLAS · Rubric framework",
  description: `Six rubrics, five regions, one engine. The ${RUBRIC_VERSION} mobility framework — composite formula, dimension weights, hard caps, and the regional configuration matrix.`,
};

export default function AtlasRubricPage() {
  const basePageAudit = {
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    fixtureVersions: [
      { name: "gmc-framework.ts", lastUpdated: "2026-05-12" },
    ],
    subject: `${RUBRIC_VERSION} framework`,
  };

  return (
    <>
      <PageHeader
        eyebrow="ATLAS · RUBRIC FRAMEWORK"
        title="Six rubrics. Five regions. One engine."
        description={`${RUBRIC_VERSION} : the glomotec Mobility Code. Each rubric scores a different facet of an entity's contribution to a jurisdiction. Each region tunes weights, thresholds, and hard caps to local policy. Same band ladder, same composite formula, same audit trail across the matrix.`}
      />
      <div className="container py-12 md:py-16">
        <RubricFrameworkView basePageAudit={basePageAudit} />
      </div>
    </>
  );
}
