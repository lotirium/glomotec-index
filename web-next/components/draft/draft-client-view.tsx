"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import {
  loadDraft,
  saveDraft,
  deleteDraft,
  profileTextFromInput,
  type Draft,
} from "@/lib/drafts";
import type { AssessmentRun, Criterion, ScoringResult } from "@/lib/types";
import { buildAssessmentRun } from "@/lib/scoring";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { VerdictHero } from "@/components/scoring/verdict-hero";
import { CriteriaList } from "@/components/scoring/criteria-list";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelative } from "@/lib/utils";

const DOC_VERSION = "v10.0 27 February 2026";
const DOC_URL =
  "https://www.gov.uk/government/publications/innovator-appendix-w-workers/innovator-founder-caseworker-guidance-accessible";

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  nationality: "Nationality",
  age: "Age",
  qualification: "Qualification",
  role: "Role",
  experience: "Experience",
  businessStage: "Business stage",
  fundingRaised: "Funding raised",
  endorsementStatus: "Endorsement status",
  evidence: "Evidence",
  other: "Other",
};

interface ScoringState {
  criteria: Criterion[];
  results: ScoringResult[];
  partial: AssessmentRun | null;
  done: boolean;
  wallMs: number | null;
  error: string | null;
  /**
   * Set when the stream emits a fallback_quota event. Tells the view to
   * render a calm fallback card instead of the verdict hero / criteria list.
   */
  fallbackQuota: { headline: string; body: string } | null;
}

export function DraftClientView({
  slug,
  criteria: preloadedCriteria,
}: {
  slug: string;
  criteria: Criterion[];
}) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Draft | null | "missing">(null);
  // Seed scoring state with the pre-loaded criteria so the criteria list and
  // verdict hero can render immediately, before the /api/score stream replies.
  const initialState: ScoringState = React.useMemo(
    () => ({
      criteria: preloadedCriteria,
      results: [],
      partial: null,
      done: false,
      wallMs: null,
      error: null,
      fallbackQuota: null,
    }),
    [preloadedCriteria],
  );
  const [scoring, setScoring] = React.useState<ScoringState>(initialState);
  const [scoringActive, setScoringActive] = React.useState(false);
  const startedAtRef = React.useRef<number | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Mount: load the draft from localStorage.
  React.useEffect(() => {
    const d = loadDraft(slug);
    setDraft(d ?? "missing");
  }, [slug]);

  const runScoring = React.useCallback(
    async (current: Draft) => {
      if (scoringActive) return;
      setScoringActive(true);
      setScoring(initialState);
      startedAtRef.current = performance.now();

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const profileText = profileTextFromInput(current.input);
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            routeId: "innovator_founder",
            clientSlug: current.slug,
            profile: profileText,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          const msg = json?.message ?? `Scoring couldn't complete (HTTP ${res.status}).`;
          const updated: Draft = { ...current, error: msg, result: null };
          saveDraft(updated);
          setDraft(updated);
          setScoring((s) => ({ ...s, error: msg }));
          return;
        }

        if (!res.body) {
          throw new Error("Streaming not supported by this connection.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let localCriteria: Criterion[] = [];
        let localResults: ScoringResult[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            let event: Record<string, unknown>;
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }
            if (event.type === "started") {
              localCriteria = (event.criteria as Criterion[]) ?? [];
              setScoring((s) => ({ ...s, criteria: localCriteria }));
            } else if (event.type === "criterion") {
              const result = event.result as ScoringResult;
              localResults = [...localResults, result];
              const partial = buildAssessmentRun({
                client_slug: current.slug,
                route_id: "innovator_founder",
                results: localResults,
              });
              setScoring((s) => ({
                ...s,
                results: localResults,
                partial,
              }));
            } else if (event.type === "complete") {
              const assessment = event.assessment as AssessmentRun;
              const wallMs =
                typeof event.wall_ms === "number"
                  ? (event.wall_ms as number)
                  : startedAtRef.current
                    ? Math.round(performance.now() - startedAtRef.current)
                    : null;
              const updated: Draft = {
                ...current,
                result: assessment,
                error: null,
              };
              saveDraft(updated);
              setDraft(updated);
              setScoring({
                criteria: localCriteria,
                results: assessment.results,
                partial: assessment,
                done: true,
                wallMs,
                error: null,
                fallbackQuota: null,
              });
            } else if (event.type === "fallback_quota") {
              const headline = String(
                event.headline ?? "The rules engine has stepped out for tea.",
              );
              const fallbackBody = String(
                event.body ??
                  "We are out of API credit on this preview. Top up the meter and rerun.",
              );
              // Persist so a refresh keeps the calm card and doesn't auto-rerun.
              const updated: Draft = {
                ...current,
                result: null,
                error: null,
              };
              saveDraft(updated);
              setDraft(updated);
              setScoring((s) => ({
                ...s,
                fallbackQuota: { headline, body: fallbackBody },
                done: true,
                error: null,
              }));
            } else if (event.type === "error") {
              const msg = String(event.message ?? "Scoring failed.");
              setScoring((s) => ({ ...s, error: msg }));
            }
          }
        }
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Scoring couldn't complete.";
        const updated: Draft = { ...current, error: msg, result: null };
        saveDraft(updated);
        setDraft(updated);
        setScoring((s) => ({ ...s, error: msg }));
      } finally {
        setScoringActive(false);
        abortRef.current = null;
      }
    },
    [scoringActive, initialState],
  );

  // Auto-kick scoring once the draft loads if no result yet.
  React.useEffect(() => {
    if (!draft || draft === "missing") return;
    if (draft.result || draft.error) return;
    if (scoringActive) return;
    void runScoring(draft);
  }, [draft, scoringActive, runScoring]);

  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleRescore = () => {
    if (!draft || draft === "missing") return;
    const cleared: Draft = { ...draft, result: null, error: null };
    saveDraft(cleared);
    setDraft(cleared);
  };

  const handleDelete = () => {
    if (!draft || draft === "missing") return;
    if (!window.confirm("Delete this test profile? This cannot be undone."))
      return;
    deleteDraft(draft.slug);
    router.push("/clients");
  };

  // Synthesised zero-state assessment used during the dead zone before the
  // first criterion arrives. Memoised here (above any conditional returns) so
  // the hook count stays stable across renders.
  const zeroPartialSlug =
    draft && draft !== "missing" ? draft.slug : "draft";
  const zeroPartial = React.useMemo(
    () =>
      buildAssessmentRun({
        client_slug: zeroPartialSlug,
        route_id: "innovator_founder",
        results: [],
      }),
    [zeroPartialSlug],
  );

  if (draft === null) {
    return null; // brief blank during SSR/initial mount; effect runs immediately
  }
  if (draft === "missing") {
    return <DraftMissing slug={slug} />;
  }

  const persisted = draft.result;
  const hasError = Boolean(scoring.error || draft.error) && !persisted && !scoringActive;
  const liveAssessment: AssessmentRun =
    scoring.partial ?? persisted ?? zeroPartial;
  const renderCriteria = scoring.criteria.length > 0 ? scoring.criteria : undefined;
  // The expected total — known up front from the pre-loaded criteria.
  const expectedTotal = preloadedCriteria.length;
  // True from t=0 until the run completes — covers the brief gap between
  // draft-loaded and runScoring kicking, so the hero never flickers through
  // the "regular" layout with empty-zero scores.
  const isScoringView = !persisted && !scoring.done;

  if (hasError) {
    return (
      <DraftError
        message={scoring.error ?? draft.error ?? "Scoring couldn't complete."}
        onRetry={handleRescore}
        slug={draft.slug}
        onDelete={handleDelete}
      />
    );
  }

  if (scoring.fallbackQuota && !persisted) {
    return (
      <DraftQuotaFallback
        slug={draft.slug}
        displayName={draft.displayName}
        headline={scoring.fallbackQuota.headline}
        body={scoring.fallbackQuota.body}
        onRetry={handleRescore}
        onDelete={handleDelete}
      />
    );
  }

  const profileLines: Array<{ label: string; value: string }> =
    draft.input.mode === "structured"
      ? Object.entries(draft.input.fields)
          .filter(([, v]) => v?.trim())
          .map(([k, v]) => ({ label: FIELD_LABELS[k] ?? k, value: v.trim() }))
      : [{ label: "Pasted profile", value: draft.input.text.trim() }];

  return (
    <>
      <PageHeader
        eyebrow={`Test profile · ${draft.slug}`}
        title={draft.displayName}
        description={`Scored on ${formatDate(draft.createdAt)} · against the v10.0 (27 February 2026) Innovator Founder caseworker guidance`}
        meta={
          <>
            {liveAssessment && (
              <span>Scored {formatRelative(liveAssessment.scored_at)}</span>
            )}
            {liveAssessment && <span aria-hidden>·</span>}
            <span>{DOC_VERSION}</span>
            {scoring.wallMs != null && scoring.done && (
              <>
                <span aria-hidden>·</span>
                <span>{(scoring.wallMs / 1000).toFixed(1)}s wall</span>
              </>
            )}
            <span aria-hidden>·</span>
            <Link
              href="/clients"
              className="inline-flex items-center gap-1 text-ink-muted hover:text-ink-soft transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              All clients
            </Link>
          </>
        }
        trailing={
          <div className="flex items-center gap-2">
            <Badge tone="accent">Test profile</Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRescore}
              disabled={scoringActive}
            >
              <RefreshCw
                className={
                  scoringActive ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"
                }
              />
              Re-score
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="container space-y-10 py-10">
        <VerdictHero
          run={liveAssessment}
          scoring={isScoringView}
          scoredCount={scoring.results.length}
          expectedTotal={expectedTotal}
        />

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <SectionHeading
              eyebrow="Criteria"
              title="Where the score comes from"
              description="Each criterion was scored from your input. Open the reasoning to read the trace."
            />
            <CriteriaList
              results={persisted ? liveAssessment.results : scoring.results}
              criteriaOrder={persisted ? undefined : renderCriteria}
              scoring={isScoringView}
            />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            <Card>
              <div className="border-b border-line/70 px-5 py-4">
                <p className="text-sm font-semibold text-ink">Profile input</p>
                <p className="mt-0.5 text-2xs text-ink-muted">
                  What the scorer was given.
                </p>
              </div>
              <dl className="divide-y divide-line/70 px-5 text-2xs">
                {profileLines.length === 0 && (
                  <p className="py-4 text-ink-muted">No input fields filled.</p>
                )}
                {profileLines.map((line) => (
                  <div
                    key={line.label}
                    className={
                      draft.input.mode === "paste"
                        ? "py-3 space-y-1"
                        : "grid grid-cols-[110px_1fr] items-baseline gap-3 py-2.5"
                    }
                  >
                    <dt className="font-mono uppercase tracking-[0.16em] text-ink-faint">
                      {line.label}
                    </dt>
                    <dd className="text-ink leading-snug whitespace-pre-wrap break-words">
                      {line.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card className="p-5">
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Source
              </p>
              <p className="mt-2 text-sm font-semibold text-ink leading-snug">
                Innovator Founder caseworker guidance
              </p>
              <p className="mt-1 text-2xs text-ink-muted tabular">{DOC_VERSION}</p>
              <a
                href={DOC_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-2xs text-accent-deep hover:underline"
              >
                Open on gov.uk
                <ExternalLink className="h-3 w-3" />
              </a>
            </Card>
          </aside>
        </section>
      </div>
    </>
  );
}

function DraftMissing({ slug }: { slug: string }) {
  return (
    <div className="container py-24">
      <div className="mx-auto max-w-md rounded-lg border border-line bg-surface p-8 shadow-card text-center space-y-4">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-faint">
          Test profile not found
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          We don't have <span className="font-mono text-base">{slug}</span> in this browser.
        </h1>
        <p className="text-2xs text-ink-muted">
          Test profiles are stored locally. They don't sync across browsers, devices or private windows.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button asChild variant="primary" size="sm">
            <Link href="/clients/new">Score a new profile</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/clients">All clients</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function DraftError({
  message,
  onRetry,
  slug,
  onDelete,
}: {
  message: string;
  onRetry: () => void;
  slug: string;
  onDelete: () => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow={`Test profile · ${slug}`}
        title="Scoring couldn't complete."
        description={message}
      />
      <div className="container py-10">
        <Card className="p-6 max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Button onClick={onRetry} variant="primary" size="sm">
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </Button>
            <Button onClick={onDelete} variant="ghost" size="sm">
              <Trash2 className="h-3.5 w-3.5" />
              Delete this draft
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

function DraftQuotaFallback({
  slug,
  displayName,
  headline,
  body,
  onRetry,
  onDelete,
}: {
  slug: string;
  displayName: string;
  headline: string;
  body: string;
  onRetry: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow={`Test profile · ${slug}`}
        title={displayName}
        description="Scoring is paused on this preview."
      />
      <div className="container py-10">
        <Card className="max-w-2xl p-6 md:p-8">
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
            glomotec preview status
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink leading-tight">
            {headline}
          </h2>
          <p className="mt-3 text-sm text-ink-soft leading-relaxed">{body}</p>
          <div className="mt-6 flex items-center gap-2">
            <Button onClick={onRetry} variant="primary" size="sm">
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </Button>
            <Button onClick={onDelete} variant="ghost" size="sm">
              <Trash2 className="h-3.5 w-3.5" />
              Delete this draft
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
