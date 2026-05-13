"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

// Native <details>-based context disclosure. Used across ATLAS surfaces to
// keep the interactive element the visual hero and tuck descriptive prose
// behind an eyebrow-styled summary that the reader can open if they want it.
export function CollapsibleContext({
  label,
  children,
  className,
  defaultOpen = false,
}: Props) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group rounded-md border border-line bg-surface",
        className,
      )}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-2 rounded-md px-4 py-2.5 outline-none transition-colors",
          "hover:bg-surface-soft/60 focus-visible:ring-2 focus-visible:ring-accent/40",
        )}
      >
        <ChevronRight
          aria-hidden
          className="h-3 w-3 shrink-0 text-cyan transition-transform duration-200 group-open:rotate-90"
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan">
          {label}
        </span>
      </summary>
      <div className="border-t border-line/60 px-4 py-3 text-sm leading-relaxed text-ink-muted">
        {children}
      </div>
    </details>
  );
}
