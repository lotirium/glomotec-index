"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Check, Loader2, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Phase = "idle" | "submitting" | "sent" | "error";

const REACTIONS = [
  { value: "useful", label: "Useful" },
  { value: "unclear", label: "Unclear" },
  { value: "wrong", label: "Wrong" },
  { value: "broken", label: "Broken" },
] as const;

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [reaction, setReaction] = React.useState<string | null>(null);
  const [text, setText] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [showToast, setShowToast] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  React.useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setPhase("idle");
      setErrorMessage(null);
      setReaction(null);
      setText("");
    }, 200);
    return () => clearTimeout(t);
  }, [open]);

  // Toast auto-dismiss after 2s.
  React.useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 2000);
    return () => clearTimeout(t);
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !reaction) return;
    setPhase("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          viewport: {
            w: window.innerWidth,
            h: window.innerHeight,
            dpr: window.devicePixelRatio,
          },
          userAgent: navigator.userAgent,
          reaction,
          text: text.trim(),
          ts: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.message ?? `HTTP ${res.status}`);
      }
      setPhase("sent");
      setTimeout(() => {
        setOpen(false);
        setShowToast(true);
      }, 1400);
    } catch (err) {
      setPhase("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Could not send your feedback.",
      );
    }
  };

  return (
    <>
      {!open && !showToast && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-feedback-portal
          aria-label="Open feedback"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
        >
          <MessageSquare className="h-4 w-4" />
          Feedback
        </button>
      )}

      {showToast && (
        <div
          role="status"
          aria-live="polite"
          data-feedback-portal
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-band-high-fg/30 bg-band-high-bg px-4 py-2.5 text-sm font-medium text-band-high-fg animate-fade-up"
        >
          <Check className="h-4 w-4" />
          Thanks &mdash; sent.
        </div>
      )}

      {open && (
        <div
          ref={panelRef}
          data-feedback-portal
          role="dialog"
          aria-modal="true"
          aria-label="Send feedback"
          className="fixed bottom-5 right-5 z-40 w-[min(380px,calc(100vw-2.5rem))] animate-fade-up rounded-lg border border-line bg-surface"
        >
          <form onSubmit={handleSubmit}>
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">Send feedback</p>
                <p className="text-2xs text-ink-muted truncate">
                  Sent direct to the team. Tagged with this path.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close feedback panel"
                className="rounded-sm text-ink-muted transition-colors hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="px-4 py-3 space-y-3">
              <fieldset>
                <legend className="sr-only">Quick reaction</legend>
                <div className="flex flex-wrap gap-1.5">
                  {REACTIONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      aria-pressed={reaction === r.value}
                      onClick={() =>
                        setReaction((prev) => (prev === r.value ? null : r.value))
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        reaction === r.value
                          ? "border-accent/30 bg-accent-tint text-accent-deep"
                          : "border-line bg-surface text-ink-muted hover:text-ink-soft hover:border-line/70",
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What didn't read right, what's missing, what would you do differently."
                rows={4}
                className="w-full resize-none rounded-md border border-line bg-surface-soft px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-faint outline-none focus:border-accent/40 focus:bg-surface focus:ring-2 focus:ring-accent/20"
              />

              {errorMessage && (
                <p className="text-2xs text-band-low-fg">{errorMessage}</p>
              )}
            </div>

            <footer className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
              <p className="text-2xs text-ink-faint">
                {phase === "sent" ? (
                  <span className="inline-flex items-center gap-1 text-band-high-fg">
                    <Check className="h-3 w-3" />
                    Sent.
                  </span>
                ) : (
                  <>Path and viewport will be attached.</>
                )}
              </p>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={
                  phase === "submitting" ||
                  phase === "sent" ||
                  (!text.trim() && !reaction)
                }
              >
                {phase === "submitting" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending
                  </>
                ) : phase === "sent" ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Sent
                  </>
                ) : (
                  "Send"
                )}
              </Button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
