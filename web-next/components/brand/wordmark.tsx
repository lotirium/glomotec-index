"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-baseline gap-2",
        className,
      )}
    >
      <Link
        href="/"
        className="inline-flex items-baseline gap-2 group rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        aria-label="glomotec home"
      >
        <span className="text-[13px] font-medium tracking-[0.18em] uppercase text-ink-soft transition-colors group-hover:text-ink whitespace-nowrap">
          glomotec
        </span>
      </Link>
      <span aria-hidden className="text-ink-faint text-[13px] leading-none">
        ·
      </span>
      <Link
        href="/about"
        className="text-[13px] font-medium tracking-[0.18em] uppercase text-ink-soft rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg hover:text-ink transition-colors"
        aria-label="ENGINE: about INDEX"
      >
        ENGINE
      </Link>
      <span aria-hidden className="text-ink-faint/60 text-[10px] leading-none hidden lg:inline">
        ·
      </span>
      <span className="hidden lg:inline text-[9px] font-bold tracking-[0.18em] uppercase text-ink-soft/60 whitespace-nowrap">
        INDEX preview
      </span>
    </div>
  );
}
