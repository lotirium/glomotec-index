import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { BAND_DESCRIPTORS, RUBRIC_VERSION } from "@/lib/atlas/rubric";
import { cn } from "@/lib/utils";
import type { RubricBand } from "@/lib/atlas/types";

export const metadata: Metadata = {
  title: "ATLAS rubric",
  description:
    "Four-band rubric definition (paraphrased) and the composite formula that maps Innovation, Viability, Scalability to a band.",
};

const BAND_TONE: Record<RubricBand, string> = {
  A: "border-cyan/40 bg-cyan-tint/50",
  B: "border-accent/30 bg-accent-tint/40",
  C: "border-frost/40 bg-glacier/30",
  D: "border-charcoal/30 bg-band-below-bg/40",
};

const BAND_TEXT: Record<RubricBand, string> = {
  A: "text-accent",
  B: "text-accent",
  C: "text-accent-deep",
  D: "text-charcoal",
};

const BANDS: RubricBand[] = ["A", "B", "C", "D"];

export default function AtlasRubricPage() {
  return (
    <>
      <PageHeader
        eyebrow={`ATLAS · RUBRIC ${RUBRIC_VERSION}`}
        title="Three pillars, four bands."
        description="ATLAS scores every entity against three pillars and assigns one of four bands. Descriptions paraphrase the public three-pillar framework; the composite formula is auditable below."
      />

      <div className="container py-16 md:py-20 space-y-16">
        <section className="mx-auto w-full md:max-w-[78%] space-y-8">
          <header>
            <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
              Pillars
            </p>
            <h2 className="mt-1 text-h2 font-bold tracking-tight text-ink">
              Innovation, Viability, Scalability.
            </h2>
          </header>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <li className="rounded-md border border-line bg-surface p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                Innovation
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                Differentiation versus the prevailing approach.
              </p>
              <p className="mt-1 text-2xs text-ink-muted leading-relaxed">
                Weighted 50% of the composite. Drives Band A eligibility.
              </p>
            </li>
            <li className="rounded-md border border-line bg-surface p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                Viability
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                Plausibility of sustained operation under realistic conditions.
              </p>
              <p className="mt-1 text-2xs text-ink-muted leading-relaxed">
                Weighted 25% of the composite.
              </p>
            </li>
            <li className="rounded-md border border-line bg-surface p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                Scalability
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                Capacity to expand without proportional input growth.
              </p>
              <p className="mt-1 text-2xs text-ink-muted leading-relaxed">
                Weighted 25% of the composite.
              </p>
            </li>
          </ul>
        </section>

        <section className="mx-auto w-full md:max-w-[78%] space-y-8">
          <header>
            <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
              Composite formula
            </p>
            <h2 className="mt-1 text-h2 font-bold tracking-tight text-ink">
              How a band is assigned.
            </h2>
          </header>
          <div className="rounded-md border border-line bg-surface p-6 space-y-3">
            <p className="font-mono text-sm text-ink-soft">
              composite = (0.5 × Innovation) + (0.25 × Viability) + (0.25 × Scalability)
            </p>
            <ul className="space-y-2 text-2xs text-ink-muted">
              <li>
                <span className="font-mono uppercase tracking-[0.18em] text-cyan">
                  A
                </span>{" "}
                : Innovation ≥ 80 AND composite ≥ 78
              </li>
              <li>
                <span className="font-mono uppercase tracking-[0.18em] text-accent">
                  B
                </span>{" "}
                : composite ≥ 62
              </li>
              <li>
                <span className="font-mono uppercase tracking-[0.18em] text-frost">
                  C
                </span>{" "}
                : composite ≥ 45
              </li>
              <li>
                <span className="font-mono uppercase tracking-[0.18em] text-charcoal">
                  D
                </span>{" "}
                : composite below 45
              </li>
            </ul>
          </div>
        </section>

        <section className="mx-auto w-full md:max-w-[78%] space-y-8">
          <header>
            <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
              Bands (paraphrased)
            </p>
            <h2 className="mt-1 text-h2 font-bold tracking-tight text-ink">
              The four-band ladder.
            </h2>
            <p className="mt-2 text-2xs text-ink-muted">
              Descriptions are ATLAS paraphrases of the public three-pillar framework. Not verbatim source language.
            </p>
          </header>
          <ul className="space-y-3">
            {BANDS.map((b) => {
              const descriptor = BAND_DESCRIPTORS[b];
              return (
                <li
                  key={b}
                  className={cn(
                    "rounded-md border p-5",
                    BAND_TONE[b],
                  )}
                >
                  <div className="flex items-baseline gap-4">
                    <span
                      className={cn(
                        "font-mono text-3xl font-semibold tabular",
                        BAND_TEXT[b],
                      )}
                    >
                      {b}
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-ink">
                        {descriptor.label}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted leading-relaxed">
                        {descriptor.description}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
