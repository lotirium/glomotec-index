"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/signal/types";

interface Props {
  messages: ChatMessage[];
  /** True while waiting for the assistant's next turn. */
  pending: boolean;
  className?: string;
}

export function ChatThread({ messages, pending, className }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Scroll the latest turn into view as messages stream in.
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, pending]);

  return (
    <div className={cn("space-y-4", className)}>
      {messages.map((m) => (
        <Bubble key={m.id} role={m.role}>{m.content}</Bubble>
      ))}
      {pending && <PendingBubble />}
      <div ref={ref} />
    </div>
  );
}

function Bubble({
  role,
  children,
}: {
  role: ChatMessage["role"];
  children: React.ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-soft whitespace-pre-wrap break-words",
          isUser
            ? "bg-surface border border-line/70 text-ink-soft rounded-br-sm"
            : "bg-ink text-surface rounded-bl-sm",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function PendingBubble() {
  return (
    <div className="flex w-full justify-start">
      <div className="rounded-2xl rounded-bl-sm bg-ink text-surface px-4 py-3 shadow-soft">
        <div className="flex items-center gap-1.5" aria-label="SIGNAL is typing">
          <span className="h-1.5 w-1.5 rounded-full bg-surface/70 animate-pulse [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-surface/70 animate-pulse [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-surface/70 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
