import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "ATLAS · About the product",
  description:
    "ATLAS is glomotec's sovereign mobility intelligence preview for policy teams and free zone authorities. Jurisdictional dashboards extending the INDEX scoring engine.",
};

export default function AtlasAboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="ATLAS · ABOUT THE PRODUCT"
        title="Sovereign mobility intelligence."
        description="Phase 1 scaffold. ATLAS extends the INDEX scoring engine to jurisdiction-level dashboards for free zone authorities, policy teams, and family offices."
      />
      <div className="container py-20 space-y-12">
        <section className="mx-auto w-full md:max-w-[78%] space-y-6">
          <h2 className="text-h3 font-mono uppercase tracking-[0.18em] text-ink-soft">
            Jurisdictions
          </h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <li>
              <Link
                href="/atlas/uae"
                className="block rounded-md border border-line p-6 hover:border-accent/40 transition-colors"
              >
                <p className="text-2xs font-mono uppercase tracking-[0.18em] text-ink-faint">UAE</p>
                <p className="mt-2 text-base font-semibold tracking-tight text-ink">
                  Free zones overview
                </p>
                <p className="mt-1 text-2xs text-ink-muted">DMCC · DIFC · ADGM · JAFZA</p>
              </Link>
            </li>
            <li>
              <Link
                href="/atlas/uk"
                className="block rounded-md border border-line p-6 hover:border-accent/40 transition-colors"
              >
                <p className="text-2xs font-mono uppercase tracking-[0.18em] text-ink-faint">UK</p>
                <p className="mt-2 text-base font-semibold tracking-tight text-ink">
                  Innovator Founder precedent
                </p>
                <p className="mt-1 text-2xs text-ink-muted">
                  gMC v1.0 framework reference set.
                </p>
              </Link>
            </li>
            <li>
              <div className="block rounded-md border border-line/60 p-6 opacity-60">
                <p className="text-2xs font-mono uppercase tracking-[0.18em] text-ink-faint">
                  Saudi Arabia
                </p>
                <p className="mt-2 text-base font-semibold tracking-tight text-ink-soft">
                  Soon
                </p>
                <p className="mt-1 text-2xs text-ink-muted">
                  Coverage planning underway.
                </p>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
