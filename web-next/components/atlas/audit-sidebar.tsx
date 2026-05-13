"use client";

import Link from "next/link";
import { ChevronRight, Pin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAuditTrail,
  type AuditEvidence,
  type AuditFocus,
} from "@/components/atlas/audit-context";

export function AuditSidebar() {
  const { pinned, hovered, pageAudit, unpin } = useAuditTrail();
  // Pinned has priority. Hover is a preview. When neither is set, fall back
  // to page-level audit (generation time, fixtures, jurisdiction).
  const active = pinned ?? hovered;
  const mode: "pinned" | "preview" | "page" = pinned
    ? "pinned"
    : hovered
      ? "preview"
      : "page";

  const innerBody = (
    <>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              mode === "pinned"
                ? "bg-cyan"
                : mode === "preview"
                  ? "bg-accent"
                  : "bg-ink-faint/60",
            )}
          />
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
            Audit trail
          </p>
        </div>
        {mode === "pinned" ? (
          <button
            type="button"
            onClick={unpin}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-soft px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.18em] text-ink-muted hover:text-ink hover:border-accent/40 transition-colors"
            aria-label="Unpin audit focus"
          >
            <X className="h-2.5 w-2.5" />
            Unpin
          </button>
        ) : mode === "preview" ? (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            <Pin className="h-2.5 w-2.5" />
            Click to pin
          </span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            Page view
          </span>
        )}
      </header>

      {mode === "page" ? <PageAuditView /> : <FocusView focus={active!} />}

      <p className="mt-5 border-t border-line/60 pt-4 text-[10px] uppercase tracking-[0.18em] font-mono text-ink-faint">
        Article 22C : evidence chain visible
      </p>
    </>
  );

  return (
    <>
      {/* Desktop : sticky right-rail sidebar at lg+ */}
      <aside className="sticky top-20 hidden self-start lg:block">
        <div
          className={cn(
            "rounded-md border bg-surface p-5 transition-colors",
            mode === "pinned" ? "border-accent/40" : "border-line",
          )}
        >
          {innerBody}
        </div>
      </aside>

      {/* Mobile / tablet : collapsible disclosure below content, <lg */}
      <details
        className={cn(
          "group rounded-md border bg-surface lg:hidden",
          mode === "pinned" ? "border-accent/40" : "border-line",
        )}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md px-5 py-3 outline-none transition-colors hover:bg-surface-soft/60 focus-visible:ring-2 focus-visible:ring-accent/40">
          <div className="flex items-center gap-2">
            <ChevronRight
              aria-hidden
              className="h-3 w-3 shrink-0 text-cyan transition-transform duration-200 group-open:rotate-90"
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan">
              View audit chain
            </span>
          </div>
          <span
            aria-hidden
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              mode === "pinned"
                ? "bg-cyan"
                : mode === "preview"
                  ? "bg-accent"
                  : "bg-ink-faint/60",
            )}
          />
        </summary>
        <div className="border-t border-line/60 px-5 py-5">{innerBody}</div>
      </details>
    </>
  );
}

function FocusView({ focus }: { focus: AuditFocus }) {
  return (
    <div className="mt-4 space-y-5">
      <Section label="Proposition">
        <p className="text-sm font-medium text-ink leading-snug">{focus.proposition}</p>
      </Section>

      <Section label="Evidence">
        <ul className="space-y-3">
          {focus.evidence.map((e, i) => (
            <li key={i} className="rounded-sm border border-line/60 bg-surface-soft/60 p-3">
              <EvidenceRow evidence={e} />
            </li>
          ))}
        </ul>
      </Section>

      <Section label="Grade">
        <div className="space-y-1">
          <p className="text-2xs text-ink">
            <span className="font-mono uppercase tracking-[0.18em] text-ink-faint">
              Rubric :
            </span>{" "}
            <span className="font-medium">{focus.grade.rubricVersion}</span>
          </p>
          {focus.grade.method && (
            <p className="text-2xs text-ink-muted leading-snug">{focus.grade.method}</p>
          )}
          {focus.grade.rubricHref && (
            <Link
              href={focus.grade.rubricHref}
              className="inline-flex items-center gap-1 mt-1 text-2xs font-medium text-accent hover:underline"
            >
              Rubric definition
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      </Section>
    </div>
  );
}

function EvidenceRow({ evidence }: { evidence: AuditEvidence }) {
  return (
    <dl className="space-y-1.5">
      <Field label="Authority" value={evidence.authority} />
      <Field label="Dataset" value={evidence.dataset} />
      <div className="grid grid-cols-2 gap-3">
        {evidence.publishedDate && (
          <Field label="Published" value={evidence.publishedDate} mono />
        )}
        <Field label="Last refresh" value={evidence.lastUpdated} mono />
      </div>
      {evidence.confidence && (
        <Field
          label="Confidence"
          value={
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-mono uppercase tracking-[0.18em]",
                evidence.confidence === "high"
                  ? "border-cyan/30 bg-cyan-tint text-accent"
                  : evidence.confidence === "medium"
                    ? "border-frost/40 bg-glacier/40 text-accent-deep"
                    : "border-line bg-surface-soft text-ink-muted",
              )}
            >
              {evidence.confidence}
            </span>
          }
        />
      )}
      {evidence.fixtureRef && (
        <Field label="Fixture" value={evidence.fixtureRef} mono />
      )}
    </dl>
  );
}

function PageAuditView() {
  const { pageAudit } = useAuditTrail();
  return (
    <div className="mt-4 space-y-4">
      {pageAudit.subject && (
        <Section label="Subject">
          <p className="text-sm font-medium text-ink leading-snug">{pageAudit.subject}</p>
        </Section>
      )}

      <Section label="Jurisdiction">
        <p className="text-2xs text-ink">{pageAudit.jurisdiction}</p>
      </Section>

      <Section label="Generated">
        <p className="text-2xs text-ink tabular">{pageAudit.generatedAt}</p>
      </Section>

      <Section label="Fixtures loaded">
        <ul className="space-y-1">
          {pageAudit.fixtureVersions.map((f) => (
            <li key={f.name} className="flex items-baseline justify-between text-2xs">
              <span className="font-mono uppercase tracking-[0.18em] text-ink-muted">
                {f.name}
              </span>
              <span className="text-ink-muted tabular">{f.lastUpdated}</span>
            </li>
          ))}
        </ul>
      </Section>

      <p className="text-2xs text-ink-muted leading-relaxed">
        Click any graded number to pin its proposition, evidence, and grade.
      </p>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint shrink-0">
        {label}
      </dt>
      <dd className={cn("text-2xs text-ink text-right min-w-0", mono && "tabular")}>
        {value}
      </dd>
    </div>
  );
}
