import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { MethodologyView } from "@/components/atlas/methodology-view";

export const metadata: Metadata = {
  title: "ATLAS · Methodology and sources",
  description:
    "gMC v1.0 is auditable by design. This page catalogues every dataset, fixture, and authority reference behind ATLAS.",
};

export default function AtlasMethodologyPage() {
  const basePageAudit = {
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    fixtureVersions: [
      { name: "methodology-view.tsx", lastUpdated: "2026-05-13" },
    ],
    subject: "ATLAS methodology and source index",
  };

  return (
    <>
      <PageHeader
        eyebrow="ATLAS · METHODOLOGY"
        title="Every score points back to a source."
        description="gMC v1.0 is auditable by design. This page catalogues every dataset, fixture, and authority reference behind ATLAS. Each entry names what it draws on, what has been paraphrased, and what the live equivalent would be."
      />
      <div className="container py-12 md:py-16">
        <MethodologyView basePageAudit={basePageAudit} />
      </div>
    </>
  );
}
