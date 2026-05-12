"use client";

import * as React from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "glomotec.preview-banner.dismissed";

export function PreviewBanner() {
  const [dismissed, setDismissed] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed !== false) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <div className="border-b border-line/60 bg-surface/30">
      <div className="container flex items-center justify-between gap-3 py-1.5 text-2xs text-ink-faint">
        <p className="truncate tracking-tight">
          <span className="font-mono uppercase tracking-[0.18em]">INDEX</span>
          <span aria-hidden className="mx-1.5">·</span>
          operator preview
          <span aria-hidden className="mx-1.5">·</span>
          Innovator Founder route
          <span aria-hidden className="mx-1.5">·</span>
          sample data
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss preview banner"
          className="shrink-0 -my-1 flex h-8 w-8 items-center justify-center rounded-sm text-ink-faint transition-colors hover:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
