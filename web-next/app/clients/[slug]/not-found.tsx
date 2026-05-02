import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ClientNotFound() {
  return (
    <div className="container py-24">
      <div className="mx-auto max-w-md rounded-lg border border-line bg-surface p-8 shadow-card text-center space-y-4">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-faint">
          Client not found
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          We don't have that profile.
        </h1>
        <p className="text-2xs text-ink-muted">
          Three profiles are loaded in this preview build. The link you followed may be stale.
        </p>
        <Button asChild variant="primary" size="sm">
          <Link href="/clients">Back to clients</Link>
        </Button>
      </div>
    </div>
  );
}
