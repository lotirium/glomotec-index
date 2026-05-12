import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="What INDEX is."
        description="A preview build for operator review. Static fixtures, no live data, no PII."
      />
      <article className="container py-20 md:py-24 mx-auto md:max-w-[78%] space-y-16 text-sm leading-relaxed text-ink-soft">
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-ink">What INDEX does.</h2>
          <p>
            INDEX reads UK Home Office caseworker guidance for a given route,
            extracts each checkable predicate as a structured criterion
            anchored to its source, and scores operator profiles against it.
            Five infrastructure modules (CRAWLER, EXTRACTOR, SCORER,
            CHANGEFEED, EVALUATOR) operate on a polling cadence per route. The
            change feed surfaces material differences between published
            versions of guidance so jurisdictional drift is visible at a
            glance.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-ink">Where INDEX sits.</h2>
          <p>
            glomotec is composed of six modules: SIGNAL, COMPASS, VECTOR,
            ORBIT, ENGINE, ATLAS. INDEX is not a peer to those modules. INDEX
            is the regulatory and scoring layer inside ENGINE. SIGNAL queries
            it to qualify operators at the front of the funnel. COMPASS
            consumes its outputs to execute submission. Every other surface
            that touches jurisdictional fact (VECTOR routing, ORBIT
            monitoring, ATLAS knowledge) reads from the same indexed source.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-ink">What INDEX is not.</h2>
          <p>
            INDEX is not a separate platform. It is not an app. It is not a
            SaaS product an operator subscribes to. It has no marketing
            surface, no signup, no pricing page. It is infrastructure: the
            layer that turns published caseworker guidance into a computable
            index, kept in sync with its source, and read by the modules that
            need it. The only reason this preview exists is so the underlying
            behaviour can be evaluated against real guidance before the
            modules above it consume it in production.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-ink">Coverage in this preview.</h2>
          <p>
            Three Innovator Founder profiles are scored against the v10.0 (27
            February 2026) caseworker guidance. The criteria, change feed
            entries and source URLs are taken directly from gov.uk. The
            operator profiles are fictional and contain no personal data.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-ink">Jurisdiction roadmap.</h2>
          <p>
            INDEX currently indexes the United Kingdom across four caseworker
            guidance routes. The United Arab Emirates is the next jurisdiction
            queued for ingestion, with five sources monitored: ICP, the
            Federal Tax Authority, the Ministry of Finance, Cabinet and
            Executive Council Resolutions, and the major Free Zone
            Authorities. Saudi Arabia, Qatar, and Bahrain follow on the GCC
            roadmap. Each new jurisdiction inherits the same source-tier
            system that governs the UK index (T1 binding primary, T2
            authoritative secondary, T3 operational guidance, T4 field
            intelligence, T5 inferential) without modification.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-ink">Scoring bands.</h2>
          <p>
            Each criterion is placed into one of four bands based on the
            model&rsquo;s probability that the predicate is met on the current
            evidence:{" "}
            <strong className="text-ink">High</strong> (recommend submission),{" "}
            <strong className="text-ink">Medium</strong> (operator review),{" "}
            <strong className="text-ink">Low</strong> (further evidence), and{" "}
            <strong className="text-ink">Below threshold</strong> (do not
            submit). The reasoning chain (rule, facts, match) is accessible
            from every criterion row, anchored to the verbatim source quote
            and its tier.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-ink">Feedback.</h2>
          <p>
            The pinned button at the bottom right of every screen captures a
            screenshot, a reaction and a free-text comment. Each submission is
            tagged with the screen path and viewport so context is preserved.
            Nothing else is tracked.
          </p>
        </section>
      </article>
    </>
  );
}
