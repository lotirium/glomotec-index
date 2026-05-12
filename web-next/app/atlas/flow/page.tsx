import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { FlowView } from "@/components/atlas/flow-view";
import { getFlowSankeyData } from "@/lib/atlas/data";

export const metadata: Metadata = {
  title: "ATLAS · Cross-jurisdictional flows",
  description:
    "Sample of 400 applicants who applied for high-value mobility programmes across five jurisdictions in 2025. Each ribbon shows the second-choice destination for applicants rejected or unrenewed in their first-choice jurisdiction.",
};

export default async function AtlasFlowPage() {
  const data = await getFlowSankeyData();

  const basePageAudit = {
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    fixtureVersions: [
      { name: "flow-pairs.json", lastUpdated: data.sample_window_end },
    ],
    subject: "Cross-jurisdictional flow tracking",
  };

  return (
    <>
      <PageHeader
        eyebrow="ATLAS · CROSS-JURISDICTIONAL FLOWS"
        title="When one country says no, where do they go?"
        description="Sample of 400 applicants who applied for high-value mobility programmes across five jurisdictions in 2025. Each ribbon shows the second-choice destination for applicants rejected or unrenewed in their first-choice jurisdiction."
      />
      <div className="container py-12 md:py-16">
        <FlowView data={data} basePageAudit={basePageAudit} />
      </div>
    </>
  );
}
