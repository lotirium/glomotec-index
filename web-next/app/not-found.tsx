import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container py-24">
      <div className="mx-auto max-w-md rounded-lg border border-line bg-surface p-8 shadow-card text-center space-y-4">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-faint">
          404
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Page not found.
        </h1>
        <p className="text-2xs text-ink-muted">
          The page may have moved or never existed. Try the pipeline overview.
        </p>
        <Button asChild variant="primary" size="sm">
          <Link href="/">Back to pipeline</Link>
        </Button>
      </div>
    </div>
  );
}
