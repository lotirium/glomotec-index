"use client";

import * as React from "react";
import Link from "next/link";
import {
  AuditTrailProvider,
  type AuditFocus,
  type PageAudit,
} from "@/components/atlas/audit-context";
import { AuditAnchor } from "@/components/atlas/audit-anchor";
import { AuditSidebar } from "@/components/atlas/audit-sidebar";
import { CollapsibleContext } from "@/components/atlas/collapsible-context";
import { RUBRIC_VERSION } from "@/lib/atlas/rubric";

interface Props {
  basePageAudit: Omit<PageAudit, "jurisdiction">;
}

// Standard paraphrasing disclaimer reused across the fixture entries.
const PARAPHRASE_NOTE =
  "Series values shifted within ±15% of published anchor years to keep the demo on synthesised footings.";

interface AuthorityRow {
  id: string;
  rubric: string;
  authority: string;
  anchors: string;
  href?: string;
}

const AUTHORITY_ROWS: AuthorityRow[] = [
  {
    id: "auth/innovation",
    rubric: "Innovation",
    authority: "OECD Frascati Manual 7th edition",
    anchors:
      "Four-tier R&D classification (Frontier / Advanced / Active / Minimal) anchored on Frascati's research-intensity criteria.",
    href: "https://www.oecd.org/sti/inno/frascati-manual.htm",
  },
  {
    id: "auth/economic-substance",
    rubric: "Economic Substance",
    authority:
      "OECD BEPS Action 5 substantial-activity requirements, 2023 peer review",
    anchors:
      "Substantial / Adequate / Marginal / Insufficient ladder anchored on the BEPS Action 5 substantial-activity tests.",
    href: "https://www.oecd.org/tax/beps/beps-actions/action5/",
  },
  {
    id: "auth/talent-localisation",
    rubric: "Talent Localisation",
    authority: "Saudi MHRSD Nitaqat classification",
    anchors:
      "Platinum / Green / Yellow / Red bands ported directly from the Nitaqat colour-tier ladder.",
    href: "https://www.hrsd.gov.sa",
  },
  {
    id: "auth/strategic-sector",
    rubric: "Strategic Sector Alignment",
    authority:
      "Multi-jurisdictional national strategy alignment (composite, illustrative)",
    anchors:
      "Anchor / Strong / Moderate / Weak categories derived from the dominant national-strategy framings across UK, GCC, ASEAN.",
  },
  {
    id: "auth/fiscal-contribution",
    rubric: "Fiscal Contribution",
    authority:
      "Jurisdiction-specific corporate tax and payroll contribution thresholds",
    anchors:
      "Major / Significant / Modest / Minimal tiers anchored on each jurisdiction's published corporate-tax and payroll thresholds.",
  },
  {
    id: "auth/sustainability",
    rubric: "Sustainability and Net Zero",
    authority: "EU CSRD reporting framework, ISSB IFRS S1 and S2 standards",
    anchors:
      "Leader / Compliant / Partial / Non-compliant tiers anchored on CSRD reporting expectations and ISSB IFRS S1 / S2 disclosure depth.",
    href: "https://www.ifrs.org/sustainability/",
  },
];

interface DatasetRow {
  id: string;
  dataset: string;
  authority: string;
  paraphrase: string;
  fixturePath: string;
  href?: string;
}

const DATASET_ROWS: DatasetRow[] = [
  {
    id: "data/uk-net-migration",
    dataset: "UK net migration",
    authority: "ONS Long-term International Migration estimates",
    paraphrase: PARAPHRASE_NOTE,
    fixturePath: "web-next/lib/atlas/uk-history.ts (NET_MIGRATION_BY_YEAR)",
    href: "https://www.ons.gov.uk",
  },
  {
    id: "data/uk-fdi",
    dataset: "UK FDI inward",
    authority: "ONS UK FDI statistics annual release",
    paraphrase: PARAPHRASE_NOTE,
    fixturePath: "web-next/lib/atlas/uk-history.ts (FDI_INWARD_BY_YEAR)",
    href: "https://www.ons.gov.uk",
  },
  {
    id: "data/uk-student-visas",
    dataset: "UK student visas",
    authority:
      "HESA Tier 4 / Student route grants, Home Office quarterly statistics",
    paraphrase: PARAPHRASE_NOTE,
    fixturePath: "web-next/lib/atlas/uk-history.ts (STUDENT_VISAS_BY_YEAR)",
    href: "https://www.hesa.ac.uk",
  },
  {
    id: "data/uk-population",
    dataset: "UK population",
    authority: "ONS UK population estimates",
    paraphrase: PARAPHRASE_NOTE,
    fixturePath: "web-next/lib/atlas/uk-history.ts (UK_POPULATION_BY_YEAR)",
    href: "https://www.ons.gov.uk",
  },
  {
    id: "data/uk-gdp",
    dataset: "UK GDP growth",
    authority: "ONS GDP annual growth",
    paraphrase: PARAPHRASE_NOTE,
    fixturePath: "web-next/lib/atlas/uk-history.ts (GDP_GROWTH_BY_YEAR)",
    href: "https://www.ons.gov.uk",
  },
  {
    id: "data/uk-talent-inflows",
    dataset: "UK talent inflows by route",
    authority: "Home Office quarterly visa statistics",
    paraphrase: PARAPHRASE_NOTE,
    fixturePath:
      "web-next/lib/atlas/uk-history.ts (UK_TALENT_INFLOWS_BY_ROUTE)",
    href: "https://www.gov.uk/government/collections/migration-statistics",
  },
  {
    id: "data/uae-zones",
    dataset: "UAE free zone entity counts",
    authority:
      "Four free zone register summaries (DMCC, DIFC, ADGM, JAFZA)",
    paraphrase:
      "Entity-level records synthesised from public register summaries; identifiers, names and revenue figures are illustrative.",
    fixturePath:
      "web-next/fixtures/atlas/{dmcc,difc,adgm,jafza}.json",
  },
  {
    id: "data/flow-pairs",
    dataset: "Cross-jurisdictional flow pairs",
    authority:
      "Five-jurisdiction case file aggregates (UK, US, EU, UAE, Singapore)",
    paraphrase:
      "Sample of 400 applicant case files paraphrased into ribbon volumes across five jurisdictions and four years.",
    fixturePath:
      "web-next/fixtures/atlas/flow-pairs.json + web-next/lib/atlas/flow-data.ts",
  },
];

interface PolicyEventRow {
  year: number;
  label: string;
  citation: string;
}

const POLICY_EVENT_ROWS: PolicyEventRow[] = [
  {
    year: 2008,
    label: "Points-Based System introduced",
    citation: "Home Office White Paper 2008",
  },
  {
    year: 2012,
    label: "Tier 1 Post-Study Work closed",
    citation:
      "Home Office Statement of Changes March 2012; All-Party Parliamentary Group on Migration 2013 (real reduction measurement)",
  },
  {
    year: 2014,
    label: "Tier 1 Investor threshold raised £1M to £2M",
    citation: "Home Office Impact Assessment October 2014",
  },
  {
    year: 2016,
    label: "Brexit referendum",
    citation: "Official referendum result",
  },
  {
    year: 2020,
    label: "EU Settlement Scheme deadline",
    citation: "Home Office EUSS framework",
  },
  {
    year: 2022,
    label: "Tier 1 Investor route closed",
    citation:
      "Home Office Statement of Changes February 2022; Treasury impact note",
  },
  {
    year: 2024,
    label: "Skilled Worker salary raise to £38,700",
    citation: "Home Office Statement of Changes April 2024",
  },
  {
    year: 2026,
    label: "Skilled Worker £41,700, ILR £3,226, English to B2",
    citation: "Home Office Statement of Changes April 2026",
  },
];

export function MethodologyView({ basePageAudit }: Props) {
  const pageAudit: PageAudit = React.useMemo(
    () => ({ ...basePageAudit, jurisdiction: "Methodology · all jurisdictions" }),
    [basePageAudit],
  );
  return (
    <AuditTrailProvider pageAudit={pageAudit}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_19rem] lg:gap-10">
        <div className="min-w-0 space-y-12">
          <Article22cCard />
          <AuthoritySources />
          <LiveDataSources />
          <PolicyEventCitations />
          <FrameworkLineage />
          <TakeawayBanner />
        </div>
        <AuditSidebar />
      </div>
    </AuditTrailProvider>
  );
}

function Article22cCard() {
  return (
    <section
      aria-label="Article 22C framing"
      className="rounded-md border-l-4 border-cyan border border-line bg-surface px-5 py-5 md:px-6"
    >
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
        Article 22C · evidence chain visible
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft md:text-[16px]">
        Article 22C of the EU AI Act requires that high-risk decision-support
        systems disclose the basis for each output. ATLAS satisfies this
        natively because every score, band, and trajectory traces back to a
        source record. This page is the index of those sources.
      </p>
    </section>
  );
}

function AuthoritySources() {
  return (
    <section aria-labelledby="authority-sources-heading" className="space-y-5">
      <header>
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
          Authority sources
        </p>
        <h2
          id="authority-sources-heading"
          className="mt-1 text-h2 font-bold tracking-tight text-ink"
        >
          What each rubric anchors on.
        </h2>
        <p className="mt-2 max-w-3xl text-2xs text-ink-muted leading-relaxed">
          Six rubrics, each anchored on a published authority framework. The
          per-rubric band ladders on /atlas/rubric are derived directly from
          the structures below.
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {AUTHORITY_ROWS.map((row) => {
          const focus: AuditFocus = {
            id: row.id,
            proposition: `${row.rubric} : ${row.authority}.`,
            evidence: [
              {
                authority: row.authority,
                dataset: row.anchors,
                lastUpdated: row.href ?? "Published reference",
                confidence: "high",
                fixtureRef: row.href,
              },
            ],
            grade: {
              rubricVersion: RUBRIC_VERSION,
              rubricHref: "/atlas/rubric",
              method:
                "Rubric anchored to a public authority framework; band ladder mirrors the source structure.",
            },
          };
          return (
            <li key={row.id}>
              <AuditAnchor
                anchor={focus}
                as="div"
                className="block h-full rounded-md border border-line bg-surface p-5"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
                  {row.rubric}
                </p>
                <p className="mt-1 text-[15px] font-bold tracking-tight text-accent leading-snug">
                  {row.authority}
                </p>
                <p className="mt-2 text-2xs leading-relaxed text-ink-soft">
                  {row.anchors}
                </p>
                {row.href && (
                  <Link
                    href={row.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-accent hover:underline"
                  >
                    Authority site
                    <span aria-hidden>→</span>
                  </Link>
                )}
              </AuditAnchor>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LiveDataSources() {
  return (
    <section aria-labelledby="live-data-heading" className="space-y-5">
      <header>
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
          Live data sources
        </p>
        <h2
          id="live-data-heading"
          className="mt-1 text-h2 font-bold tracking-tight text-ink"
        >
          What each time series draws on.
        </h2>
        <p className="mt-2 max-w-3xl text-2xs text-ink-muted leading-relaxed">
          Eight time-series fixtures power the historical visuals. Each one
          paraphrases a public release; in production ENGINE would draw from
          the live authority feeds shown below.
        </p>
      </header>
      <CollapsibleContext label="Paraphrasing policy">
        <p>
          All ATLAS fixtures are paraphrased from public authority releases.
          Series values are shifted within ±15% of the published anchor years
          so the demo runs on synthesised footings while preserving the
          policy-event inflections the visuals depend on. ENGINE running gMC
          at scale would replace the fixtures with live feeds (UK Home Office,
          ONS, USCIS, UAE ICP, Saudi MHRSD, Singapore EDB, EU member-state
          authorities).
        </p>
      </CollapsibleContext>
      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full text-left text-2xs">
          <thead>
            <tr className="border-b border-line">
              <th className="bg-surface-soft px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                Dataset
              </th>
              <th className="bg-surface-soft px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                Source authority
              </th>
              <th className="bg-surface-soft px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                Fixture path
              </th>
            </tr>
          </thead>
          <tbody>
            {DATASET_ROWS.map((row, i) => {
              const focus: AuditFocus = {
                id: row.id,
                proposition: `${row.dataset} : ${row.authority}.`,
                evidence: [
                  {
                    authority: row.authority,
                    dataset: row.dataset,
                    lastUpdated: row.fixturePath,
                    confidence: "medium",
                    fixtureRef: row.fixturePath,
                  },
                ],
                grade: {
                  rubricVersion: RUBRIC_VERSION,
                  rubricHref: "/atlas/methodology",
                  method: row.paraphrase,
                },
              };
              return (
                <tr
                  key={row.id}
                  className={
                    i < DATASET_ROWS.length - 1 ? "border-b border-line/60" : ""
                  }
                >
                  <td className="px-4 py-3 align-top">
                    <AuditAnchor anchor={focus} as="div" className="block">
                      <p className="font-semibold text-ink">{row.dataset}</p>
                      <p className="mt-1 text-[10px] text-ink-muted leading-snug">
                        {row.paraphrase}
                      </p>
                    </AuditAnchor>
                  </td>
                  <td className="px-4 py-3 align-top text-ink-soft">
                    {row.authority}
                    {row.href && (
                      <>
                        {" "}
                        <Link
                          href={row.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent hover:underline"
                        >
                          ↗
                        </Link>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <code className="font-mono text-[10px] text-ink-muted">
                      {row.fixturePath}
                    </code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PolicyEventCitations() {
  return (
    <section aria-labelledby="policy-events-heading" className="space-y-5">
      <header>
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
          Policy event citations
        </p>
        <h2
          id="policy-events-heading"
          className="mt-1 text-h2 font-bold tracking-tight text-ink"
        >
          Every event marker traces back to a Statement of Changes.
        </h2>
        <p className="mt-2 max-w-3xl text-2xs text-ink-muted leading-relaxed">
          Each historical event in the simulator backtest and the UK timeline
          is anchored on a published Home Office record. The 2012 PSW closure
          and 2022 Investor closure additionally carry independent measurement
          sources.
        </p>
      </header>
      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full text-left text-2xs">
          <thead>
            <tr className="border-b border-line">
              <th className="bg-surface-soft px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint w-20">
                Year
              </th>
              <th className="bg-surface-soft px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                Event
              </th>
              <th className="bg-surface-soft px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                Citation
              </th>
            </tr>
          </thead>
          <tbody>
            {POLICY_EVENT_ROWS.map((row, i) => {
              const focus: AuditFocus = {
                id: `event/${row.year}`,
                proposition: `${row.year} ${row.label} : ${row.citation}.`,
                evidence: [
                  {
                    authority: "UK Home Office and supporting bodies",
                    dataset: row.citation,
                    lastUpdated: `${row.year} statement`,
                    confidence: "high",
                  },
                ],
                grade: {
                  rubricVersion: RUBRIC_VERSION,
                  rubricHref: "/atlas/methodology",
                  method:
                    "Historical event anchored to a published Home Office statement and (where applicable) an independent measurement source.",
                },
              };
              return (
                <tr
                  key={row.year}
                  className={
                    i < POLICY_EVENT_ROWS.length - 1
                      ? "border-b border-line/60"
                      : ""
                  }
                >
                  <td className="px-4 py-3 align-top font-mono tabular text-accent">
                    {row.year}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <AuditAnchor anchor={focus} as="div" className="block">
                      <p className="font-semibold text-ink">{row.label}</p>
                    </AuditAnchor>
                  </td>
                  <td className="px-4 py-3 align-top text-ink-soft leading-relaxed">
                    {row.citation}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FrameworkLineage() {
  return (
    <section aria-label="gMC framework lineage" className="space-y-3">
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
        gMC framework lineage
      </p>
      <p className="max-w-3xl text-[15px] leading-relaxed text-ink-soft md:text-[16px]">
        gMC v1.0 is glomotec's foundational draft of a unified scoring
        framework for cross-jurisdictional mobility. Pattern-anchored on ICC
        Incoterms 2020 and UCP 600. The framework is published openly. The
        implementation is licensable through ENGINE, running gMC at scale
        against real authority data feeds.
      </p>
    </section>
  );
}

function TakeawayBanner() {
  return (
    <section className="overflow-hidden rounded-md bg-gradient-to-br from-accent to-accent-deep px-6 py-8 text-surface md:px-10 md:py-10">
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-cyan">
        Takeaway
      </p>
      <p className="mt-3 max-w-3xl text-[17px] font-semibold leading-[1.45] text-surface md:text-[1.25rem]">
        Every score in ATLAS is anchored to a source. The framework is open.
        The implementation is the moat.
      </p>
    </section>
  );
}
