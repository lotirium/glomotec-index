import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line bg-bg mt-32">
      <div className="container py-20">
        <div className="mx-auto w-full md:max-w-[78%] flex flex-col gap-4 text-2xs text-ink-muted md:flex-row md:items-center md:justify-between">
          <p className="leading-relaxed">
            INDEX is the regulatory and scoring layer of ENGINE. SIGNAL queries
            it for qualification. COMPASS consumes its outputs for execution.
          </p>
          <div className="flex gap-6 shrink-0">
            <Link
              href="/sources"
              className="whitespace-nowrap hover:underline transition-colors"
            >
              Source registry
            </Link>
            <Link
              href="/about"
              className="hover:underline transition-colors"
            >
              About
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
