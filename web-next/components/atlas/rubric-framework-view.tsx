"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  AuditTrailProvider,
  useAuditTrail,
  type AuditEvidence,
  type AuditFocus,
  type AuditGrade,
  type PageAudit,
} from "@/components/atlas/audit-context";
import { AuditSidebar } from "@/components/atlas/audit-sidebar";
import {
  PER_RUBRIC_CATEGORIZATIONS,
  RUBRIC_BAND_COLOR_HSL,
  RUBRIC_VERSION,
  rubricKeyFromName,
} from "@/lib/atlas/rubric";

// ----- Static framework content -----

const BANDS = [
  { letter: "A", label: "Strong", threshold: "Composite ≥ 80" },
  { letter: "B", label: "Acceptable", threshold: "Composite 60–79" },
  { letter: "C", label: "Borderline", threshold: "Composite 40–59" },
  { letter: "D", label: "Below threshold", threshold: "Composite < 40" },
] as const;

type Region = "UK" | "US" | "EU" | "GCC" | "ASEAN";

interface Rubric {
  num: string;
  name: string;
  anchorProfile: string;
  dimensions: Array<{ name: string; weight: number }>;
  hardCap?: string;
}

const RUBRICS: Rubric[] = [
  {
    num: "01",
    name: "Innovation",
    anchorProfile:
      "Innovation-led entities (tech founders, R&D-heavy operations, IP-driven businesses)",
    dimensions: [
      { name: "Differentiation", weight: 50 },
      { name: "Viability", weight: 25 },
      { name: "Scalability", weight: 25 },
    ],
  },
  {
    num: "02",
    name: "Economic Substance",
    anchorProfile:
      "Industrial, logistics, investor, and family-office entities",
    dimensions: [
      { name: "Jobs created", weight: 25 },
      { name: "Capital deployed", weight: 20 },
      { name: "Revenue generated", weight: 15 },
      { name: "Exports", weight: 15 },
      { name: "Local supplier integration", weight: 15 },
      { name: "Local payroll", weight: 10 },
    ],
  },
  {
    num: "03",
    name: "Talent Localisation",
    anchorProfile:
      "GCC operations under national workforce quotas (Emiratisation, Nitaqat)",
    dimensions: [
      { name: "National workforce ratio vs quota", weight: 30 },
      { name: "Leadership representation", weight: 20 },
      { name: "Salary parity", weight: 15 },
      { name: "Training programmes", weight: 15 },
      { name: "Retention", weight: 10 },
      { name: "Sector-specific compliance", weight: 10 },
    ],
    hardCap:
      "Band C cap if headline quota missed. An entity that fails the quota threshold cannot rise above Borderline, regardless of other dimensions.",
  },
  {
    num: "04",
    name: "Strategic Sector Alignment",
    anchorProfile:
      "Entities operating in nationally-designated strategic sectors (defence, critical infrastructure, frontier tech)",
    dimensions: [
      { name: "National strategy fit", weight: 30 },
      { name: "Sovereign capability contribution", weight: 25 },
      { name: "Supply-chain resilience", weight: 20 },
      { name: "IP and data location", weight: 15 },
      { name: "Sector criticality", weight: 10 },
    ],
    hardCap:
      "National-security override caps adverse acquirers at Band C. Where a jurisdiction's national security review (UK NSI Act, US CFIUS, EU FDI Regulation) flags a beneficial owner as adverse, the entity is capped at Borderline.",
  },
  {
    num: "05",
    name: "Fiscal Contribution",
    anchorProfile:
      "Large-revenue and high-payroll entities subject to corporate tax regimes",
    dimensions: [
      { name: "Corporate tax paid", weight: 30 },
      { name: "Payroll and social contribution", weight: 20 },
      { name: "VAT and customs duties", weight: 15 },
      { name: "Economic substance compliance", weight: 15 },
      { name: "Transfer-pricing risk", weight: 10 },
      { name: "Tax-base growth", weight: 10 },
    ],
  },
  {
    num: "06",
    name: "Sustainability and Net Zero",
    anchorProfile:
      "Industrial, energy, and infrastructure entities; entities subject to CSRD or ISSB reporting",
    dimensions: [
      { name: "Scope 1–3 emissions disclosed", weight: 25 },
      { name: "Net-zero pathway credibility", weight: 20 },
      { name: "Green CapEx", weight: 15 },
      { name: "Energy mix", weight: 15 },
      { name: "ESG reporting standard adopted", weight: 15 },
      { name: "Carbon credit quality", weight: 10 },
    ],
  },
];

type Variant = "anchor" | "strong" | "standard" | "light" | "per-state";
interface MatrixCell {
  variant: Variant;
  note?: string;
}

const REGIONS: Region[] = ["UK", "US", "EU", "GCC", "ASEAN"];

const MATRIX: Record<string, Record<Region, MatrixCell>> = {
  "01": {
    UK: { variant: "anchor" },
    US: { variant: "anchor" },
    EU: { variant: "per-state" },
    GCC: { variant: "light" },
    ASEAN: { variant: "strong" },
  },
  "02": {
    UK: { variant: "anchor" },
    US: { variant: "anchor" },
    EU: { variant: "per-state" },
    GCC: { variant: "strong" },
    ASEAN: { variant: "anchor", note: "Singapore-led" },
  },
  "03": {
    UK: { variant: "light" },
    US: { variant: "light" },
    EU: { variant: "light" },
    GCC: { variant: "anchor" },
    ASEAN: { variant: "light" },
  },
  "04": {
    UK: { variant: "strong" },
    US: { variant: "strong" },
    EU: { variant: "strong" },
    GCC: { variant: "strong" },
    ASEAN: { variant: "strong" },
  },
  "05": {
    UK: { variant: "strong" },
    US: { variant: "strong" },
    EU: { variant: "strong" },
    GCC: { variant: "standard" },
    ASEAN: { variant: "strong" },
  },
  "06": {
    UK: { variant: "standard" },
    US: { variant: "light", note: "partial" },
    EU: { variant: "anchor" },
    GCC: { variant: "light" },
    ASEAN: { variant: "light" },
  },
};

const REGION_EVIDENCE: Record<Region, AuditEvidence> = {
  UK: {
    authority: "UK Home Office",
    dataset: "Caseworker guidance, gov.uk",
    lastUpdated: "rolling",
    confidence: "high",
    fixtureRef: "external authority feed",
  },
  US: {
    authority: "USCIS",
    dataset: "Policy Manual : EB-1A, EB-2 NIW, EB-5, O-1",
    lastUpdated: "rolling",
    confidence: "high",
    fixtureRef: "external authority feed",
  },
  EU: {
    authority: "Member-state authorities + European Commission",
    dataset: "Member-state authority guidance; EU FDI Regulation 2025-26",
    lastUpdated: "rolling",
    confidence: "high",
    fixtureRef: "external authority feed",
  },
  GCC: {
    authority: "UAE ICP / MoHRE; Saudi MHRSD; free-zone authorities",
    dataset:
      "ICP residence guidance; MoHRE Emiratisation; DMCC/DIFC/ADGM/JAFZA registers; Saudi MHRSD Nitaqat regulations",
    lastUpdated: "rolling",
    confidence: "high",
    fixtureRef: "external authority feed",
  },
  ASEAN: {
    authority: "Singapore EDB; Thailand BoI; Indonesia BKPM; Malaysia MIDA",
    dataset: "EDB factsheets; BoI / BKPM / MIDA published criteria",
    lastUpdated: "rolling",
    confidence: "high",
    fixtureRef: "external authority feed",
  },
};

// Derive anchor regions per rubric, with the Singapore-led note kept inline
// so the audit-sidebar's proposition reads naturally.
function anchorRegionsFor(rubricNum: string): { label: string; codes: Region[] } {
  const row = MATRIX[rubricNum];
  const labels: string[] = [];
  const codes: Region[] = [];
  for (const r of REGIONS) {
    if (row[r].variant === "anchor") {
      codes.push(r);
      labels.push(row[r].note ? `${r} (${row[r].note})` : r);
    }
  }
  if (labels.length === 0) {
    // Fall back to the strongest cells; covers Strategic Sector and Fiscal
    // Contribution which carry "Strong" rather than "Anchor" everywhere.
    const strong = REGIONS.filter((r) => row[r].variant === "strong");
    return { label: `supported as Strong across ${strong.join(", ")}`, codes: strong };
  }
  return { label: `anchored in ${labels.join(", ")}`, codes };
}

// ----- View root -----

interface Props {
  basePageAudit: Omit<PageAudit, "jurisdiction">;
}

export function RubricFrameworkView({ basePageAudit }: Props) {
  const pageAudit: PageAudit = React.useMemo(
    () => ({ ...basePageAudit, jurisdiction: "UK · US · EU · GCC · ASEAN" }),
    [basePageAudit],
  );
  return (
    <AuditTrailProvider pageAudit={pageAudit}>
      <FrameworkBody />
    </AuditTrailProvider>
  );
}

function FrameworkBody() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_19rem] lg:gap-10">
      <div className="min-w-0 space-y-16">
        <BandLadder />
        <CompositeFormula />
        <RubricsGrid />
        <RegionalMatrix />
        <AuthoritySources />
        <VersionControl />
        <FooterCard />
      </div>
      <AuditSidebar />
    </div>
  );
}

// ----- Band ladder -----

function BandLadder() {
  return (
    <section className="space-y-5">
      <header>
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
          Band ladder
        </p>
        <h2 className="mt-1 text-h2 font-bold tracking-tight text-ink">
          Four bands, applied universally.
        </h2>
      </header>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BANDS.map((b) => (
          <li key={b.letter} className="rounded-md border border-line bg-surface p-5">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-3xl font-extrabold tabular text-accent">
                {b.letter}
              </span>
              <span className="text-sm font-semibold text-ink">{b.label}</span>
            </div>
            <p className="mt-2 font-mono text-2xs uppercase tracking-[0.18em] text-cyan tabular">
              {b.threshold}
            </p>
          </li>
        ))}
      </ul>
      <p className="max-w-3xl text-2xs leading-relaxed text-ink-muted">
        The band ladder is rubric-agnostic. An entity scored Band A in
        Innovation is structurally comparable to an entity scored Band A in
        Talent Localisation : the engine produces commensurable signals across
        the matrix.
      </p>
    </section>
  );
}

// ----- Composite formula -----

function CompositeFormula() {
  return (
    <section className="space-y-5">
      <header>
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
          Composite formula
        </p>
        <h2 className="mt-1 text-h2 font-bold tracking-tight text-ink">
          How a single rubric score is computed.
        </h2>
      </header>
      <pre className="overflow-x-auto rounded-md border border-line bg-surface-soft px-5 py-4 font-mono text-2xs leading-relaxed text-accent">
        <code>{`composite = Σ (dimension_score × dimension_weight)
band      = lookup(composite, [80 → A, 60 → B, 40 → C, _ → D])
hard_cap  = applies_if(rubric.has_hard_cap, jurisdiction.config)`}</code>
      </pre>
      <p className="max-w-3xl text-2xs leading-relaxed text-ink-muted">
        Hard caps override the composite. Where a hard cap applies, an entity
        that would have scored Band A or B on raw composite is reduced to the
        cap level. This is how the framework absorbs non-negotiable
        jurisdictional priorities like workforce localisation quotas.
      </p>
    </section>
  );
}

// ----- Six rubrics -----

function RubricsGrid() {
  return (
    <section className="space-y-5">
      <header>
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
          The six rubrics
        </p>
        <h2 className="mt-1 text-h2 font-bold tracking-tight text-ink">
          What each rubric measures.
        </h2>
      </header>
      <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {RUBRICS.map((r) => (
          <li key={r.num}>
            <RubricCard rubric={r} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RubricCard({ rubric }: { rubric: Rubric }) {
  const { hover, pin, pinned } = useAuditTrail();
  const anchors = anchorRegionsFor(rubric.num);
  const evidence: AuditEvidence[] =
    anchors.codes.length > 0
      ? anchors.codes.map((c) => REGION_EVIDENCE[c])
      : REGIONS.map((c) => REGION_EVIDENCE[c]);
  const grade: AuditGrade = {
    rubricVersion: RUBRIC_VERSION,
    rubricHref: "/atlas/rubric",
    method: `${rubric.dimensions.length}-dimension weighted composite. Hard cap: ${
      rubric.hardCap ? "yes" : "none"
    }.`,
  };
  const focus: AuditFocus = {
    id: `rubric/${rubric.num}`,
    proposition: `${rubric.name} : ${rubric.dimensions.length} dimensions, ${anchors.label}.`,
    evidence,
    grade,
  };
  const isPinned = pinned?.id === focus.id;

  return (
    <button
      type="button"
      onMouseEnter={() => hover(focus)}
      onMouseLeave={() => hover(null)}
      onFocus={() => hover(focus)}
      onBlur={() => hover(null)}
      onClick={() => pin(focus)}
      className={cn(
        "block w-full rounded-md border bg-surface p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
        isPinned
          ? "border-cyan/50 ring-1 ring-cyan/30"
          : "border-line hover:border-frost",
      )}
      aria-pressed={isPinned}
    >
      <header className="flex items-baseline gap-3">
        <span className="font-mono text-2xs font-extrabold uppercase tracking-[0.18em] text-cyan">
          {rubric.num}
        </span>
        <h3 className="text-xl font-bold tracking-tight text-accent">
          {rubric.name}
        </h3>
      </header>
      <p className="mt-2 text-2xs leading-relaxed text-ink-muted">
        Anchor for: {rubric.anchorProfile}
      </p>
      <ul className="mt-4 space-y-1.5 border-t border-line/60 pt-4">
        {rubric.dimensions.map((d) => (
          <li
            key={d.name}
            className="flex items-baseline justify-between gap-3 text-2xs"
          >
            <span className="text-ink">{d.name}</span>
            <span className="font-mono tabular text-ink-muted">
              {d.weight}%
            </span>
          </li>
        ))}
      </ul>
      {rubric.hardCap ? (
        <div className="mt-4 rounded-sm border border-cyan/40 bg-cyan-tint/30 p-3 text-2xs leading-relaxed text-ink-soft">
          <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan">
            Hard cap
          </p>
          {rubric.hardCap}
        </div>
      ) : (
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Hard cap : none
        </p>
      )}

      <RubricBandLadder rubricName={rubric.name} />
    </button>
  );
}

// ----- Per-rubric band ladder -----

function RubricBandLadder({ rubricName }: { rubricName: string }) {
  const key = rubricKeyFromName(rubricName);
  if (!key) return null;
  const cat = PER_RUBRIC_CATEGORIZATIONS[key];
  return (
    <div className="mt-4 rounded-sm border border-line/60 bg-surface-soft/40 p-3">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan">
        Categorization
      </p>
      <p className="mt-1 text-[11px] leading-snug text-ink">{cat.label}</p>
      <ul className="mt-2.5 space-y-1">
        {cat.bands.map((b) => (
          <li
            key={b.code}
            className="flex items-center gap-2 text-[11px] text-ink"
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: RUBRIC_BAND_COLOR_HSL[b.color] }}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent w-20 shrink-0">
              {b.code}
            </span>
            <span className="flex-1 truncate">{b.label}</span>
            <span className="font-mono tabular text-ink-muted text-[10px]">
              {b.composite[0]} to {b.composite[1]}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-line/60 pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint leading-relaxed">
        Source : {cat.sourceAuthority}
      </p>
    </div>
  );
}

// ----- Regional matrix -----

function RegionalMatrix() {
  return (
    <section className="space-y-5">
      <header>
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
          Regional matrix
        </p>
        <h2 className="mt-1 text-h2 font-bold tracking-tight text-ink">
          Where each rubric anchors.
        </h2>
        <p className="mt-2 max-w-3xl text-2xs leading-relaxed text-ink-muted">
          Each region tunes which rubrics anchor its mobility framework.
          Anchor means the rubric is core to the jurisdiction&apos;s policy
          intent. Strong means the rubric is well-supported by published
          authority data. Standard, Light, and Per-state indicate
          progressively weaker integration; some cells aren&apos;t applicable
          at all.
        </p>
      </header>

      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[680px] border-collapse text-2xs">
          <thead>
            <tr className="border-b border-line">
              <th className="sticky left-0 z-10 bg-surface-soft px-4 py-3 text-left font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">
                Rubric
              </th>
              {REGIONS.map((r) => (
                <th
                  key={r}
                  className="px-3 py-3 text-left font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint"
                >
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RUBRICS.map((rb) => (
              <tr key={rb.num} className="border-b border-line/60 last:border-b-0">
                <th className="sticky left-0 z-10 bg-surface px-4 py-3 text-left align-middle">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan">
                    {rb.num}
                  </div>
                  <div className="text-sm font-medium text-ink">{rb.name}</div>
                </th>
                {REGIONS.map((rg) => (
                  <td key={rg} className="px-3 py-3 align-middle">
                    <MatrixChip cell={MATRIX[rb.num][rg]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Scroll horizontally on narrow viewports to see all five regions.
      </p>
    </section>
  );
}

const VARIANT_STYLES: Record<Variant, string> = {
  anchor:
    "border-cyan bg-cyan text-surface",
  strong:
    "border-cyan/70 text-cyan bg-cyan-tint/40",
  standard:
    "border-slate bg-slate text-surface",
  light:
    "border-slate text-slate bg-transparent",
  "per-state":
    "border-dashed border-slate text-slate bg-transparent",
};

const VARIANT_LABELS: Record<Variant, string> = {
  anchor: "Anchor",
  strong: "Strong",
  standard: "Standard",
  light: "Light",
  "per-state": "Per-state",
};

function MatrixChip({ cell }: { cell: MatrixCell }) {
  return (
    <div>
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em]",
          VARIANT_STYLES[cell.variant],
        )}
      >
        {VARIANT_LABELS[cell.variant]}
      </span>
      {cell.note && (
        <span className="ml-1.5 text-[10px] text-ink-faint">({cell.note})</span>
      )}
    </div>
  );
}

// ----- Authority sources -----

const SOURCES: Array<{ region: Region; body: string }> = [
  { region: "UK", body: "UK Home Office caseworker guidance, gov.uk" },
  { region: "US", body: "USCIS Policy Manual, EB-1A / EB-2 NIW / EB-5 / O-1" },
  {
    region: "EU",
    body: "Member-state authority guidance, EU FDI Regulation 2025-26",
  },
  {
    region: "GCC",
    body: "UAE ICP / MoHRE / DMCC / DIFC / ADGM / JAFZA, Saudi MHRSD Nitaqat regulations",
  },
  {
    region: "ASEAN",
    body: "Singapore EDB factsheets, Thailand BoI, Indonesia BKPM, Malaysia MIDA",
  },
];

function AuthoritySources() {
  return (
    <section className="space-y-4">
      <header>
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
          Authority sources
        </p>
        <h2 className="mt-1 text-base font-semibold text-ink">
          Every score is traceable to its primary jurisdictional authority.
        </h2>
        <p className="mt-2 max-w-3xl text-2xs leading-relaxed text-ink-muted">
          This is the source-anchoring layer that satisfies Article 22C
          transparency : every assigned band can be traced back to the source
          guidance under which it was scored.
        </p>
      </header>
      <ul className="space-y-2">
        {SOURCES.map((s) => (
          <li
            key={s.region}
            className="grid grid-cols-[56px_1fr] items-baseline gap-3 rounded-sm border border-line/60 bg-surface px-4 py-3"
          >
            <span className="font-mono text-2xs font-bold uppercase tracking-[0.18em] text-accent">
              {s.region}
            </span>
            <span className="text-2xs leading-relaxed text-ink">{s.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ----- Version control -----

function VersionControl() {
  return (
    <section className="space-y-5">
      <header>
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
          Version control
        </p>
        <h2 className="mt-1 text-h2 font-bold tracking-tight text-ink">
          Three-tier publish cadence.
        </h2>
      </header>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <VersionTier
          tier="Major"
          range="v1.0 → v2.0"
          cadence="Three-year cadence"
          body="Substantive rubric / weight / band changes."
        />
        <VersionTier
          tier="Minor"
          range="v1.0 → v1.1"
          cadence="Annual cadence"
          body="Jurisdictional config updates as regulations change."
        />
        <VersionTier
          tier="Patch"
          range="v1.0 → v1.0.1"
          cadence="As-needed"
          body="Corrections and clarifications."
        />
      </ul>
      <p className="max-w-3xl text-2xs leading-relaxed text-ink-muted">
        Adoption clauses cite the specific version (e.g. &ldquo;scored against
        gMC v1.0&rdquo;). Past scoring history remains interpretable against
        the version under which it was generated. The data model tags every
        score record with its <code className="font-mono">gmc_version</code>.
        A v1.1 publish does not automatically re-score existing records :
        re-scoring is initiated explicitly when a jurisdiction adopts the new
        version.
      </p>
    </section>
  );
}

function VersionTier({
  tier,
  range,
  cadence,
  body,
}: {
  tier: string;
  range: string;
  cadence: string;
  body: string;
}) {
  return (
    <li className="rounded-md border border-line bg-surface p-4">
      <p className="font-mono text-2xs font-bold uppercase tracking-[0.18em] text-cyan">
        {tier}
      </p>
      <p className="mt-2 font-mono text-sm font-semibold tabular text-accent">
        {range}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        {cadence}
      </p>
      <p className="mt-3 text-2xs leading-relaxed text-ink-soft">{body}</p>
    </li>
  );
}

// ----- Footer card -----

function FooterCard() {
  return (
    <section className="overflow-hidden rounded-md bg-gradient-to-br from-accent to-accent-deep px-6 py-10 text-surface md:px-14 md:py-12">
      <h2 className="max-w-3xl text-2xl font-extrabold leading-[1.15] tracking-tight md:text-[2rem]">
        The framework is the <span className="text-cyan">standard</span>. The
        implementation is the <span className="text-cyan">moat</span>.
      </h2>
      <p className="mt-4 max-w-[52rem] text-[15px] leading-relaxed text-surface/85 md:text-[17px]">
        gMC v1.0 is published openly. Anyone can adopt the framework by citing
        it in their policy or due diligence work. The advantage of running it
        through ATLAS is the engine : scoring at scale against live authority
        data feeds, with the audit trail visible at every step. Article 22C
        transparency requirements are satisfied natively because every score
        is anchored to its source.
      </p>
    </section>
  );
}
