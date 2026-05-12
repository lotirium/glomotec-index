import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Free zone overview", href: "/atlas/uae" },
  { id: "origin-map", label: "Origin map", href: "/atlas/uae/origin-map" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AtlasUaeTabs({ current }: { current: TabId }) {
  return (
    <div className="border-b border-line bg-surface-soft/40">
      <div className="container">
        <nav
          aria-label="Atlas UAE views"
          className="flex gap-1 overflow-x-auto py-3"
        >
          {TABS.map((t) => {
            const active = t.id === current;
            return (
              <Link
                key={t.id}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors",
                  active
                    ? "bg-accent text-surface"
                    : "border border-line bg-surface text-ink-muted hover:text-ink hover:border-accent/40",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
