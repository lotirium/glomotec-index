"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/";
  const onSignal = pathname.startsWith("/signal");
  const subtitle = onSignal ? "prospect preview" : "advisor preview";
  const homeHref = onSignal ? "/signal" : "/";

  return (
    <Link
      href={homeHref}
      className={cn(
        "inline-flex items-baseline gap-2 group outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-sm",
        className,
      )}
      aria-label={
        onSignal ? "glomotec SIGNAL home" : "glomotec INDEX home"
      }
    >
      <span className="font-mono text-[13px] font-medium tracking-[0.18em] uppercase text-ink-muted transition-colors group-hover:text-ink-soft whitespace-nowrap">
        glomotec
      </span>
      <span className="font-sans text-[15px] font-semibold tracking-tight text-ink">
        {onSignal ? "SIGNAL" : "INDEX"}
      </span>
      <span aria-hidden className="text-ink-faint text-[13px] leading-none hidden lg:inline">·</span>
      <span className="font-sans text-[12px] tracking-tight text-ink-muted whitespace-nowrap hidden lg:inline">
        {subtitle}
      </span>
    </Link>
  );
}
