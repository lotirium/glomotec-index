"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

const NAV: Array<{
  href: string;
  label: string;
  matchPrefix?: string;
}> = [
  { href: "/", label: "Pipeline" },
  { href: "/signal", label: "SIGNAL", matchPrefix: "/signal" },
  { href: "/atlas", label: "ATLAS", matchPrefix: "/atlas" },
  { href: "/atlas/flow", label: "FLOW", matchPrefix: "/atlas/flow" },
  { href: "/clients", label: "COMPASS", matchPrefix: "/clients" },
  { href: "/sponsor", label: "SPONSOR", matchPrefix: "/sponsor" },
  { href: "/changes", label: "Changes", matchPrefix: "/changes" },
  { href: "/sources", label: "Sources", matchPrefix: "/sources" },
  { href: "/about", label: "About", matchPrefix: "/about" },
];

// Pick the single active nav entry as the longest matching prefix. This
// keeps ATLAS / FLOW from both highlighting on /atlas/flow (FLOW wins, by
// length).
function pickActive(pathname: string): string | null {
  let bestHref: string | null = null;
  let bestLen = -1;
  for (const item of NAV) {
    let matches = false;
    if (item.href === "/") matches = pathname === "/";
    else if (item.matchPrefix) matches = pathname.startsWith(item.matchPrefix);
    else matches = pathname === item.href;
    if (!matches) continue;
    const len = item.matchPrefix?.length ?? item.href.length;
    if (len > bestLen) {
      bestLen = len;
      bestHref = item.href;
    }
  }
  return bestHref;
}

export function Topbar() {
  const pathname = usePathname();
  const activeHref = pickActive(pathname);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-bg/70">
      <div className="container flex h-14 items-center justify-between gap-6">
        <Wordmark />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative inline-flex items-baseline gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none",
                  "focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                  active
                    ? "text-ink"
                    : "text-ink-muted hover:text-ink-soft",
                )}
              >
                <span>{item.label}</span>
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 -bottom-[15px] h-px bg-ink"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      <nav className="md:hidden border-t border-line/60">
        <div className="container flex gap-1 overflow-x-auto py-1.5">
          {NAV.map((item) => {
            const active = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-surface text-ink" : "text-ink-muted",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
