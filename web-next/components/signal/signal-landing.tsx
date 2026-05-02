"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, MessageCircle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { ChatInput } from "@/components/signal/chat-input";
import { SignalDisclaimer } from "@/components/signal/signal-disclaimer";
import { listSessions, newSession, saveSession } from "@/lib/signal/sessions";
import type { ChatMessage, SignalSession } from "@/lib/signal/types";
import { formatRelative } from "@/lib/utils";

const VERDICT_TONE: Record<string, BadgeProps["tone"]> = {
  high: "high",
  medium: "medium",
  low: "low",
};

function freshMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function SignalLanding() {
  const router = useRouter();
  const [sessions, setSessions] = React.useState<SignalSession[] | null>(null);

  React.useEffect(() => {
    setSessions(listSessions());
    const onStorage = () => setSessions(listSessions());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const startConversation = (text: string) => {
    const session = newSession();
    const userMsg: ChatMessage = {
      id: freshMessageId(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    const seeded: SignalSession = {
      ...session,
      messages: [userMsg],
      updatedAt: new Date().toISOString(),
    };
    saveSession(seeded);
    router.push(`/signal/${seeded.id}`);
  };

  return (
    <div className="container max-w-3xl py-12 md:py-16">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 shadow-soft">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-soft">
            glomotec SIGNAL · prospect preview
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink leading-[1.1] md:text-4xl">
          Hi, I'm SIGNAL.
        </h1>
        <p className="mx-auto max-w-xl text-base text-ink-muted leading-relaxed md:text-lg">
          Tell me about yourself — what kind of move are you considering?
        </p>
      </div>

      <Card className="mt-8 p-5 md:p-6">
        <ChatInput
          onSubmit={startConversation}
          placeholder="I'm a software engineer in São Paulo and I want to start a fintech in the UK…"
        />
        <p className="mt-3 text-2xs text-ink-faint leading-relaxed">
          SIGNAL covers UK Innovator Founder pre-qualification only. Your
          conversation stays in this browser.
        </p>
      </Card>

      <div className="mt-12">
        <SignalDisclaimer />
      </div>

      {sessions && sessions.length > 0 && (
        <section className="mt-14 space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Past conversations
              </p>
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                Stored in this browser.
              </h2>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link href={`/signal/${s.id}`} className="group block h-full">
                  <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-card">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="accent">
                        <MessageCircle className="h-3 w-3" />
                        Conversation
                      </Badge>
                      <ArrowUpRight className="h-4 w-4 text-ink-faint transition-colors group-hover:text-ink" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-ink leading-snug line-clamp-3">
                      {firstUserPreview(s)}
                    </p>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <p className="font-mono text-2xs text-ink-faint tabular">
                        {formatRelative(s.updatedAt)}
                      </p>
                      {s.qualification ? (
                        <Badge
                          tone={
                            VERDICT_TONE[s.qualification.verdict_class] ??
                            "neutral"
                          }
                        >
                          {s.qualification.verdict_headline}
                        </Badge>
                      ) : s.qualifyFallback ? (
                        <Badge tone="neutral">Paused</Badge>
                      ) : s.error ? (
                        <Badge tone="low">Error</Badge>
                      ) : (
                        <Badge tone="neutral">In progress</Badge>
                      )}
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function firstUserPreview(s: SignalSession): string {
  const firstUser = s.messages.find((m) => m.role === "user");
  if (!firstUser) return "(no message yet)";
  return firstUser.content;
}
