import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SaHistoricalView } from "@/components/atlas/sa-historical-view";
import { SA_HISTORY_FIXTURE_VERSION } from "@/lib/atlas/sa-history";

export const metadata: Metadata = {
  title: "ATLAS · Saudi Arabia strategy lens",
  description:
    "Vision 2030 sector targets paired with the Nitaqat localisation regime. Scrub through the timeline to read fourteen priority sectors against eight policy events from 2011 onwards.",
};

export default function AtlasSaPage() {
  const basePageAudit = {
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    fixtureVersions: [
      { name: "sa-history.json", lastUpdated: SA_HISTORY_FIXTURE_VERSION },
    ],
    subject: "Saudi Arabia strategy lens · 2010 to 2030",
  };

  return (
    <>
      <PageHeader
        eyebrow="ATLAS · SAUDI ARABIA STRATEGY LENS"
        title="Vision 2030 sector targets, Nitaqat localisation, one surface."
      />
      <div className="container py-12 md:py-16">
        <SaHistoricalView
          basePageAudit={basePageAudit}
          description="Saudi Arabia has a shorter published record than the UK but a stronger forward narrative. Scrub through the timeline to see how each Vision 2030 lever lands against the Nitaqat tier distribution, and where the kingdom is hiring against declared sector targets to 2030."
        />
      </div>
    </>
  );
}
