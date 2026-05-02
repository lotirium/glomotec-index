import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-baseline gap-2 group outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-sm",
        className,
      )}
      aria-label="glomotec INDEX home"
    >
      <span className="font-mono text-[13px] font-medium tracking-[0.18em] uppercase text-ink-muted transition-colors group-hover:text-ink-soft whitespace-nowrap">
        glomotec
      </span>
      <span className="font-sans text-[15px] font-semibold tracking-tight text-ink">
        INDEX
      </span>
      <span aria-hidden className="text-ink-faint text-[13px] leading-none hidden lg:inline">·</span>
      <span className="font-sans text-[12px] tracking-tight text-ink-muted whitespace-nowrap hidden lg:inline">
        advisor preview
      </span>
    </Link>
  );
}
