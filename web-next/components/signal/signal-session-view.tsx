"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatThread } from "@/components/signal/chat-thread";
import { ChatInput } from "@/components/signal/chat-input";
import { QualificationCard } from "@/components/signal/qualification-card";
import { SignalDisclaimer } from "@/components/signal/signal-disclaimer";
import { CriterionRow } from "@/components/scoring/criterion-row";
import {
  deleteSession,
  loadSession,
  saveSession,
} from "@/lib/signal/sessions";
import type {
  ChatMessage,
  ProspectProfile,
  SignalQualification,
  SignalQuotaFallback,
  SignalSession,
} from "@/lib/signal/types";
import type { StructuredOperatorProfile } from "@/lib/signal/operator-profile";
import { formatRelative } from "@/lib/utils";

interface Props {
  sessionId: string;
}

function freshMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

interface ChatTurnResult {
  text: string;
  profile: ProspectProfile | null;
  error: string | null;
  /**
   * Set when the route detected a quota/billing error and emitted a
   * fallback_quota event. The view renders a calm assistant bubble using
   * this message instead of surfacing a stack-trace toast.
   */
  fallbackMessage: string | null;
}

async function fetchChatTurn(
  messages: ChatMessage[],
  structuredProfile: StructuredOperatorProfile | null,
  signal: AbortSignal,
): Promise<ChatTurnResult> {
  const out: ChatTurnResult = {
    text: "",
    profile: null,
    error: null,
    fallbackMessage: null,
  };
  const res = await fetch("/api/signal/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, structuredProfile }),
    signal,
  });
  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => ({}));
    out.error = json?.message ?? `SIGNAL couldn't reply (HTTP ${res.status}).`;
    return out;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as Record<string, unknown>;
        if (event.type === "assistant_turn") {
          out.text = String(event.text ?? "");
          out.profile =
            (event.profile as ProspectProfile | null | undefined) ?? null;
        } else if (event.type === "fallback_quota") {
          out.fallbackMessage = String(
            event.message ??
              "I have run out of API credit and cannot reason against the rules right now. Top up the meter and we can pick this up in a minute.",
          );
        } else if (event.type === "error") {
          out.error = String(event.message ?? "SIGNAL chat failed.");
        }
      } catch {
        // ignore malformed lines
      }
    }
  }
  return out;
}

export function SignalSessionView({ sessionId }: Props) {
  const router = useRouter();
  const [session, setSession] = React.useState<
    SignalSession | null | "missing"
  >(null);
  const [pending, setPending] = React.useState(false);
  const [qualifying, setQualifying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // We dedupe assistant requests by tracking which user-message id we have
  // already replied to. A second mount or a state update that doesn't change
  // the latest user id will not re-trigger the request.
  const repliedUserIdRef = React.useRef<string | null>(null);
  const inflightRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const s = loadSession(sessionId);
    if (s) {
      // If the persisted session already shows an assistant turn at the end,
      // mark the prior user turn as already replied to so we don't re-fire.
      const last = s.messages[s.messages.length - 1];
      if (last?.role === "assistant") {
        const priorUser = [...s.messages]
          .reverse()
          .find((m) => m.role === "user");
        if (priorUser) repliedUserIdRef.current = priorUser.id;
      }
    }
    setSession(s ?? "missing");
  }, [sessionId]);

  React.useEffect(() => {
    return () => {
      inflightRef.current?.abort();
    };
  }, []);

  const persist = React.useCallback((next: SignalSession) => {
    saveSession(next);
    setSession(next);
  }, []);

  const runQualify = React.useCallback(
    async (current: SignalSession, profile: ProspectProfile) => {
      setQualifying(true);
      setError(null);
      try {
        const res = await fetch("/api/signal/qualify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile }),
        });
        const json = (await res.json()) as
          | { ok: true; qualification: SignalQualification }
          | { ok: true; fallback_quota: SignalQuotaFallback }
          | { ok: false; message: string };
        if (!("ok" in json) || json.ok !== true) {
          const msg =
            "message" in json
              ? json.message
              : "SIGNAL couldn't run qualification.";
          persist({
            ...current,
            updatedAt: new Date().toISOString(),
            error: msg,
          });
          setError(msg);
          return;
        }
        if ("fallback_quota" in json) {
          persist({
            ...current,
            updatedAt: new Date().toISOString(),
            qualification: null,
            qualifyFallback: json.fallback_quota,
            error: null,
          });
          return;
        }
        persist({
          ...current,
          updatedAt: new Date().toISOString(),
          qualification: json.qualification,
          qualifyFallback: null,
          error: null,
        });
      } catch (e) {
        const msg =
          (e as Error)?.message ?? "SIGNAL couldn't run qualification.";
        persist({
          ...current,
          updatedAt: new Date().toISOString(),
          error: msg,
        });
        setError(msg);
      } finally {
        setQualifying(false);
      }
    },
    [persist],
  );

  /**
   * Send the current message list to /api/signal/chat, then append the
   * assistant turn (and trigger qualify if the model handed off a profile).
   * Idempotent on a per-user-message basis: callers can fire-and-forget.
   */
  const requestAssistantReply = React.useCallback(
    async (current: SignalSession) => {
      const last = current.messages[current.messages.length - 1];
      if (!last || last.role !== "user") return;
      if (repliedUserIdRef.current === last.id) return;
      if (inflightRef.current) return;

      repliedUserIdRef.current = last.id;
      const controller = new AbortController();
      inflightRef.current = controller;
      setPending(true);
      setError(null);

      let result: ChatTurnResult;
      try {
        result = await fetchChatTurn(
          current.messages,
          current.structuredProfile ?? null,
          controller.signal,
        );
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") {
          inflightRef.current = null;
          setPending(false);
          return;
        }
        result = {
          text: "",
          profile: null,
          error: (e as Error)?.message ?? "SIGNAL couldn't reply.",
          fallbackMessage: null,
        };
      } finally {
        inflightRef.current = null;
        setPending(false);
      }

      // Quota fallback: render the supplied copy as a calm assistant
      // bubble, persist as a normal turn so refresh restores the same
      // surface. No qualify call.
      if (result.fallbackMessage) {
        const fallbackMsg: ChatMessage = {
          id: freshMessageId(),
          role: "assistant",
          content: result.fallbackMessage,
          createdAt: new Date().toISOString(),
        };
        const next: SignalSession = {
          ...current,
          updatedAt: new Date().toISOString(),
          messages: [...current.messages, fallbackMsg],
          error: null,
        };
        persist(next);
        return;
      }

      if (result.error) {
        const updated: SignalSession = {
          ...current,
          updatedAt: new Date().toISOString(),
          error: result.error,
        };
        persist(updated);
        setError(result.error);
        // Allow a retry on the same user message after a failure.
        repliedUserIdRef.current = null;
        return;
      }

      const assistantMsg: ChatMessage | null = result.text.trim()
        ? {
            id: freshMessageId(),
            role: "assistant",
            content: result.text.trim(),
            createdAt: new Date().toISOString(),
          }
        : null;

      const next: SignalSession = {
        ...current,
        updatedAt: new Date().toISOString(),
        messages: assistantMsg
          ? [...current.messages, assistantMsg]
          : current.messages,
        profile: result.profile ?? current.profile,
      };
      persist(next);

      if (result.profile) {
        await runQualify(next, result.profile);
      }
    },
    [persist, runQualify],
  );

  // Auto-fire when the session loads with a user-only ending (initial intake
  // message from the landing page, or a refresh mid-conversation).
  React.useEffect(() => {
    if (!session || session === "missing") return;
    void requestAssistantReply(session);
  }, [session, requestAssistantReply]);

  const handleUserSend = (text: string) => {
    if (!session || session === "missing") return;
    if (pending || qualifying) return;
    const userMsg: ChatMessage = {
      id: freshMessageId(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    const next: SignalSession = {
      ...session,
      updatedAt: new Date().toISOString(),
      messages: [...session.messages, userMsg],
      error: null,
    };
    persist(next);
    setError(null);
    // The session-effect above will pick the new user message up and call
    // requestAssistantReply.
  };

  const handleRetryQualify = () => {
    if (!session || session === "missing") return;
    if (!session.profile) return;
    void runQualify(session, session.profile);
  };

  const handleDelete = () => {
    if (!session || session === "missing") return;
    if (
      !window.confirm(
        "Discard this conversation? It will be removed from this browser.",
      )
    )
      return;
    deleteSession(session.id);
    router.push("/signal");
  };

  if (session === null) return null;
  if (session === "missing") return <SessionMissing id={sessionId} />;

  const inputDisabled = pending || qualifying;
  const inputPlaceholder = session.qualification
    ? "Add more info or ask a follow-up…"
    : "Reply to SIGNAL…";

  return (
    <div className="container max-w-3xl py-8 md:py-12">
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/signal"
          className="inline-flex items-center gap-1 text-2xs text-ink-muted hover:text-ink-soft transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          All conversations
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-ink-faint tabular hidden sm:inline">
            Started {formatRelative(session.createdAt)}
          </span>
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Discard
          </Button>
        </div>
      </div>

      <ChatThread messages={session.messages} pending={pending} />

      {qualifying && (
        <Card className="mt-6 p-5">
          <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-faint">
            Checking against the rules
          </p>
          <p className="mt-2 text-sm text-ink-muted leading-relaxed">
            Scoring this profile against the substantive Innovator Founder
            criteria. Usually 10–15 seconds.
          </p>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full w-1/3 shimmer-bar" />
          </div>
        </Card>
      )}

      {session.qualification && !qualifying && (
        <div className="mt-6 space-y-4">
          <QualificationCard qualification={session.qualification} />
          {session.qualification.results &&
            session.qualification.results.length > 0 && (
              <section className="space-y-3 pt-4">
                <div className="space-y-1">
                  <p className="text-kicker uppercase text-ink-faint">
                    Reasoning chain
                  </p>
                  <h2 className="text-h2 text-ink">
                    Where the verdict comes from.
                  </h2>
                </div>
                <ol className="divide-y divide-line rounded-lg border border-line bg-surface">
                  {session.qualification.results.map((r, i) => (
                    <CriterionRow key={r.criterion_id} result={r} index={i} />
                  ))}
                </ol>
              </section>
            )}
          {session.profile && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryQualify}
                disabled={qualifying}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Re-qualify
              </Button>
            </div>
          )}
        </div>
      )}

      {session.qualifyFallback && !session.qualification && !qualifying && (
        <div className="mt-6 space-y-4">
          <Card className="p-6 md:p-8 animate-fade-up">
            <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-faint">
              glomotec preview status
            </p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-ink leading-tight">
              {session.qualifyFallback.headline}
            </h3>
            <p className="mt-3 text-sm text-ink-soft leading-relaxed md:text-base">
              {session.qualifyFallback.body}
            </p>
          </Card>
          {session.profile && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryQualify}
                disabled={qualifying}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </Button>
            </div>
          )}
        </div>
      )}

      {error && !pending && !qualifying && (
        <Card className="mt-6 border-band-low-fg/30 bg-band-low-bg/40 p-5">
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-band-low-fg">
            Something went wrong
          </p>
          <p className="mt-2 text-sm text-band-low-fg leading-relaxed">
            {error}
          </p>
          {session.profile && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryQualify}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try qualifying again
              </Button>
            </div>
          )}
        </Card>
      )}

      <div className="mt-6 sticky bottom-4">
        <ChatInput
          onSubmit={handleUserSend}
          disabled={inputDisabled}
          placeholder={inputPlaceholder}
        />
      </div>

      <div className="mt-10">
        <SignalDisclaimer />
      </div>
    </div>
  );
}

function SessionMissing({ id }: { id: string }) {
  return (
    <div className="container max-w-2xl py-24 text-center">
      <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-faint">
        Conversation not found
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        We don't have <span className="font-mono text-base">{id.slice(0, 8)}</span> in this browser.
      </h1>
      <p className="mt-2 text-sm text-ink-muted leading-relaxed">
        SIGNAL conversations are stored locally. They don't sync across browsers
        or private windows.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2">
        <Button asChild variant="primary" size="sm">
          <Link href="/signal">Start a new conversation</Link>
        </Button>
      </div>
    </div>
  );
}
