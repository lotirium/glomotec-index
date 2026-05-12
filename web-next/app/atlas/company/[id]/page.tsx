import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { CompanyView } from "@/components/atlas/company-view";
import { getCompanyById } from "@/lib/atlas/data";

const SIZE_LABEL: Record<string, string> = {
  micro: "Micro (1 to 9)",
  small: "Small (10 to 49)",
  medium: "Medium (50 to 249)",
  large: "Large (250+)",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const c = await getCompanyById(id);
  return { title: c ? `ATLAS · ${c.name}` : "ATLAS · entity" };
}

export default async function AtlasCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCompanyById(id);
  if (!company) notFound();

  const peerHref = company.zone
    ? `/atlas/uae/${company.zone.toLowerCase()}#company-${company.id}`
    : "/atlas/uk";

  const subline = [
    company.zone ? `${company.jurisdiction} · ${company.zone}` : company.jurisdiction,
    company.sector,
    `Registered ${company.yearRegistered}`,
    SIZE_LABEL[company.size] ?? company.size,
  ].join(" · ");

  const basePageAudit = {
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    fixtureVersions: [
      {
        name: company.zone
          ? `${company.zone.toLowerCase()}.json`
          : "uk-innovator.json",
        lastUpdated: company.dataSource.lastUpdated,
      },
    ],
  };

  return (
    <>
      <PageHeader
        eyebrow={`COMPANY · ${company.id.toUpperCase()}`}
        title={company.name}
        description={subline}
        trailing={
          <Link
            href={peerHref}
            className="inline-flex items-center gap-2 rounded-full border border-accent bg-surface px-5 py-2 text-kicker uppercase text-accent transition-colors hover:bg-accent-tint"
          >
            Compare to peers
            <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />

      <div className="container py-16 md:py-20">
        <CompanyView company={company} basePageAudit={basePageAudit} />
      </div>
    </>
  );
}
