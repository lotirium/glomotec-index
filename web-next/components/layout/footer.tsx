import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line/80 bg-surface/40 mt-16">
      <div className="container flex flex-col gap-3 py-8 text-2xs text-ink-muted md:flex-row md:items-center md:justify-between">
        <p className="leading-relaxed">
          INDEX indexes UK Home Office caseworker guidance and matches it to client profiles.
          Every criterion stays anchored to its source.
        </p>
        <div className="flex gap-4 shrink-0">
          <Link
            href="/sources"
            className="whitespace-nowrap hover:text-ink-soft transition-colors"
          >
            Source registry
          </Link>
          <Link href="/about" className="hover:text-ink-soft transition-colors">
            About
          </Link>
        </div>
      </div>
    </footer>
  );
}
