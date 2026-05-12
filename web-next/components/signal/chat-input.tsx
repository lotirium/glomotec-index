"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Initial draft text when the input mounts. Useful for the landing screen. */
  initialValue?: string;
  className?: string;
}

export function ChatInput({
  onSubmit,
  disabled = false,
  placeholder = "Reply…",
  initialValue = "",
  className,
}: Props) {
  const [value, setValue] = React.useState(initialValue);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea to fit content, capped at ~6 lines.
  React.useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 168) + "px";
  }, [value]);

  const handle = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setValue("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handle();
    }
  };

  return (
    <div
      className={cn(
        "flex items-end gap-2 rounded-2xl border border-line bg-surface px-3 py-2 shadow-soft focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/15",
        className,
      )}
    >
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none bg-transparent px-1.5 py-1.5 text-sm leading-relaxed text-ink placeholder:text-ink-faint outline-none disabled:opacity-60"
      />
      <button
        type="button"
        onClick={handle}
        disabled={disabled || value.trim().length === 0}
        aria-label="Send"
        className="inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-ink text-surface transition-colors hover:bg-ink-soft disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </div>
  );
}
