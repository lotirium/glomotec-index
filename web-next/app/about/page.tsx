import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="What INDEX does."
        description="A preview build for advisor review. Static fixtures, no live data, no PII."
      />
      <article className="container max-w-2xl py-10 space-y-8 text-sm leading-relaxed text-ink-soft">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink">Pipeline</h2>
          <p>
            INDEX reads UK Home Office caseworker guidance for a given route, extracts each
            checkable predicate as a structured criterion, and scores client profiles against it.
            Five modules — crawler, extractor, scorer, change feed, evaluator — operate on a
            polling cadence per route. The change feed surfaces material differences between
            published versions so advisors aren't reading 80-page PDFs to find the diff.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink">Coverage in this preview</h2>
          <p>
            Three Innovator Founder profiles are scored against the v10.0 (27 February 2026)
            caseworker guidance. The criteria, change feed entries and source URLs are taken
            directly from gov.uk. The client profiles are fictional and contain no personal data.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink">Scoring bands</h2>
          <p>
            Each criterion is placed into one of four bands based on the model's probability that
            the predicate is met on the current evidence: <strong className="text-ink">High</strong>{" "}
            (recommend submission), <strong className="text-ink">Medium</strong> (advisor review),{" "}
            <strong className="text-ink">Low</strong> (further evidence), and{" "}
            <strong className="text-ink">Below threshold</strong> (do not submit). The reasoning
            trace and the verbatim guidance text are accessible from every criterion row.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink">Feedback</h2>
          <p>
            The pinned button at the bottom right of every screen captures a screenshot, a
            reaction and a free-text comment. Each submission is tagged with the screen path and
            viewport so context is preserved. Nothing else is tracked.
          </p>
        </section>
      </article>
    </>
  );
}
