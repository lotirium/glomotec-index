import { Building2, ChevronDown } from "lucide-react";
import { getSponsor } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { FounderCard } from "@/components/sponsor/founder-card";

export const metadata = { title: "SPONSOR" };

export default async function SponsorPage() {
  const sponsor = await getSponsor("octopus-ventures");
  if (!sponsor) {
    return (
      <div className="container py-24 text-sm text-ink-muted">
        Sponsor portfolio data unavailable.
      </div>
    );
  }

  return (
    <>
      {/* Disclosure ribbon at top of route */}
      <div className="border-b border-line/60 bg-surface/40">
        <div className="container py-1.5">
          <p className="text-2xs text-ink-faint tracking-tight">
            <span className="font-mono uppercase tracking-[0.18em]">INDEX</span>
            <span aria-hidden className="mx-1.5">·</span>
            sponsor preview
            <span aria-hidden className="mx-1.5">·</span>
            sample portfolio data
            <span aria-hidden className="mx-1.5">·</span>
            not affiliated with named sponsor
          </p>
        </div>
      </div>

      <PageHeader
        eyebrow="Sponsor · Corporate portfolio"
        title="Every founder you've sponsored, continuously scored."
        description="Rule changes affect your hires before they affect their visas. INDEX surfaces the changes that matter to your portfolio, ranked by exposure."
      />

      <div className="container py-20 md:py-24 space-y-12">
        {/* Faux corporate selector */}
        <div className="mx-auto w-full md:max-w-[78%]">
          <button
            type="button"
            disabled
            className="inline-flex w-full items-center gap-3 rounded-lg border border-line bg-surface px-5 py-3 text-left shadow-soft md:w-auto disabled:cursor-default"
          >
            <Building2 className="h-4 w-4 text-ink-muted" />
            <span className="flex-1 text-sm text-ink">
              <span className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Viewing
              </span>
              <span aria-hidden className="mx-2 text-ink-faint">·</span>
              <span className="font-semibold text-ink">
                {sponsor.sponsor_name}
              </span>
              <span className="text-ink-muted"> portfolio</span>
              <span aria-hidden className="mx-2 text-ink-faint">·</span>
              <span className="text-ink-soft tabular">
                {sponsor.founders.length} founders
              </span>
              <span aria-hidden className="mx-2 text-ink-faint">·</span>
              <span className="text-ink-soft tabular">
                {sponsor.route_count} routes
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-ink-faint" />
          </button>
        </div>

        {/* Grid of founder cards */}
        <ul className="mx-auto grid w-full md:max-w-[78%] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sponsor.founders.map((f) => (
            <li key={f.name}>
              <FounderCard founder={f} />
            </li>
          ))}
        </ul>

        {/* Subscription strip */}
        <section className="mx-auto w-full md:max-w-[78%] border-t border-line/70 pt-6">
          <p className="text-2xs text-ink-muted leading-relaxed">
            <span className="font-mono uppercase tracking-[0.18em] text-ink-soft">
              SPONSOR DASHBOARD
            </span>
            <span aria-hidden className="mx-2 text-ink-faint">·</span>
            <span>alerts delivered to assigned partner</span>
            <span aria-hidden className="mx-2 text-ink-faint">·</span>
            <span>monthly digest emailed</span>
          </p>
        </section>
      </div>
    </>
  );
}
