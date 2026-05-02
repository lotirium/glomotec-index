"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[index] page error", error);
  }, [error]);

  return (
    <div className="container py-24">
      <div className="mx-auto max-w-md rounded-lg border border-line bg-surface p-8 shadow-card text-center space-y-4">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-faint">
          Error
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          This view didn't load.
        </h1>
        <p className="text-2xs text-ink-muted">
          {error.message || "An unexpected error stopped this page from rendering."}
          {error.digest && (
            <span className="block mt-2 font-mono text-ink-faint">
              ref: {error.digest}
            </span>
          )}
        </p>
        <Button onClick={reset} variant="primary" size="sm">
          Try again
        </Button>
      </div>
    </div>
  );
}
