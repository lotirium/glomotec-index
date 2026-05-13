import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PolicySimulatorView } from "@/components/atlas/policy-simulator-view";

export const metadata: Metadata = {
  title: "ATLAS · Policy simulator",
  description:
    "Move the sliders to test policy changes against the UAE free-zone sample. See the impact today, and the projected impact three years from now under the same conditions.",
};

export default function AtlasSimulatorPage() {
  const basePageAudit = {
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    fixtureVersions: [
      { name: "simulator-280-fixture", lastUpdated: "2026-05-12" },
    ],
    subject: "Policy simulator · UAE free-zone sample",
  };

  return (
    <>
      <PageHeader
        eyebrow="ATLAS · POLICY SIMULATOR"
        title="What happens if you change the rules?"
      />
      <div className="container py-12 md:py-16">
        <PolicySimulatorView
          basePageAudit={basePageAudit}
          description="Move the sliders to test policy changes against the UAE free-zone sample. See the impact today, and the projected impact three years from now under the same conditions."
        />
      </div>
    </>
  );
}
