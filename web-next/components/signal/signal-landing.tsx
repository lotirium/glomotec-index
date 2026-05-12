"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { SignalDisclaimer } from "@/components/signal/signal-disclaimer";
import { listSessions, newSession, saveSession } from "@/lib/signal/sessions";
import { loadOperatorProfile } from "@/lib/signal/operator-profile";
import type { ChatMessage, SignalSession } from "@/lib/signal/types";
import { formatRelative } from "@/lib/utils";

const VERDICT_TONE: Record<string, BadgeProps["tone"]> = {
  high: "high",
  medium: "medium",
  low: "low",
};

const WELCOME_MESSAGE =
  "Welcome. Based on your profile, let me ask a few more questions.";

function freshMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function SignalLanding() {
  const router = useRouter();
  const [sessions, setSessions] = React.useState<SignalSession[] | null>(null);
  const [profileChecked, setProfileChecked] = React.useState(false);
  const handledRef = React.useRef(false);

  React.useEffect(() => {
    if (handledRef.current) return;
    const profile = loadOperatorProfile();
    if (!profile) {
      handledRef.current = true;
      router.replace("/signal/start");
      return;
    }
    const past = listSessions();
    if (past.length === 0) {
      handledRef.current = true;
      const session = newSession();
      const welcomeMsg: ChatMessage = {
        id: freshMessageId(),
        role: "assistant",
        content: WELCOME_MESSAGE,
        createdAt: new Date().toISOString(),
      };
      const seeded: SignalSession = {
        ...session,
        structuredProfile: profile,
        messages: [welcomeMsg],
        updatedAt: new Date().toISOString(),
      };
      saveSession(seeded);
      router.replace(`/signal/${seeded.id}`);
      return;
    }
    setSessions(past);
    setProfileChecked(true);
  }, [router]);

  const beginNew = () => {
    const profile = loadOperatorProfile();
    if (!profile) {
      router.replace("/signal/start");
      return;
    }
    const session = newSession();
    const welcomeMsg: ChatMessage = {
      id: freshMessageId(),
      role: "assistant",
      content: WELCOME_MESSAGE,
      createdAt: new Date().toISOString(),
    };
    const seeded: SignalSession = {
      ...session,
      structuredProfile: profile,
      messages: [welcomeMsg],
      updatedAt: new Date().toISOString(),
    };
    saveSession(seeded);
    router.push(`/signal/${seeded.id}`);
  };

  if (!profileChecked) {
    return (
      <div className="container max-w-md py-24 text-center">
        <p className="text-kicker uppercase text-ink-faint">SIGNAL</p>
        <p className="mt-3 text-sm text-ink-muted">Preparing qualification…</p>
      </div>
    );
  }

  return (
    <div className="container py-24 md:py-32 mx-auto md:max-w-[78%]">
      <div className="space-y-6">
        <p className="text-kicker uppercase text-ink-faint">SIGNAL</p>
        <hr className="max-w-[3rem] border-t border-line" aria-hidden />
        <h1 className="font-bold tracking-tight text-ink leading-[1.1] text-[2.5rem] md:text-[3rem] lg:text-[3.5rem]">
          Qualification.
        </h1>
        <p className="text-lead text-ink-muted leading-relaxed max-w-md pt-2">
          SIGNAL covers UK Innovator Founder pre-qualification only. Each
          conversation stays in this browser.
        </p>
      </div>

      <div className="mt-16">
        <button type="button" onClick={beginNew} className="pill-engage">
          BEGIN NEW CONVERSATION
        </button>
      </div>

      {sessions && sessions.length > 0 && (
        <section className="mt-24 md:mt-28 space-y-6">
          <div className="space-y-2 border-b border-line pb-4">
            <p className="text-kicker uppercase text-ink-faint">
              Past conversations
            </p>
            <h2 className="text-h2 text-ink">Stored in this browser.</h2>
          </div>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link href={`/signal/${s.id}`} className="group block h-full">
                  <Card className="h-full p-6">
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
                      <p className="text-2xs text-ink-faint tabular">
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

      <div className="mt-24 md:mt-28">
        <SignalDisclaimer />
      </div>
    </div>
  );
}

function firstUserPreview(s: SignalSession): string {
  const firstUser = s.messages.find((m) => m.role === "user");
  if (firstUser) return firstUser.content;
  const firstAny = s.messages[0];
  return firstAny ? firstAny.content : "(no message yet)";
}
