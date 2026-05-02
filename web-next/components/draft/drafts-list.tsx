"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { listDrafts, type Draft } from "@/lib/drafts";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/shared/section-heading";
import { formatRelative } from "@/lib/utils";

const verdictTone: Record<string, BadgeProps["tone"]> = {
  high: "high",
  medium: "medium",
  low: "low",
};

export function DraftsList() {
  const [drafts, setDrafts] = React.useState<Draft[] | null>(null);

  React.useEffect(() => {
    setDrafts(listDrafts());
    const onStorage = () => setDrafts(listDrafts());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (drafts === null) return null;
  if (drafts.length === 0) return <DraftsEmpty />;

  return (
    <section className="space-y-4">
      <SectionHeading
        eyebrow="Test profiles"
        title="Profiles you've scored"
        description="Stored locally in this browser. Click into one to see its scoring or re-run it."
        trailing={
          <Button asChild variant="outline" size="sm">
            <Link href="/clients/new">
              <Plus className="h-3.5 w-3.5" />
              Score another
            </Link>
          </Button>
        }
      />
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {drafts.map((d) => (
          <li key={d.slug}>
            <Link href={`/clients/${d.slug}`} className="group block h-full">
              <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="accent">Test profile</Badge>
                  <ArrowUpRight className="h-4 w-4 text-ink-faint transition-colors group-hover:text-ink" />
                </div>
                <p className="mt-4 text-base font-semibold tracking-tight text-ink truncate">
                  {d.displayName}
                </p>
                <p className="mt-0.5 font-mono text-2xs text-ink-faint tabular truncate">
                  {d.slug}
                </p>
                {d.result ? (
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                        Readiness
                      </p>
                      <p className="mt-1 flex items-baseline gap-1">
                        <span className="text-3xl font-semibold tracking-tight text-ink tabular">
                          {d.result.overall_pct}
                        </span>
                        <span className="text-sm text-ink-muted">%</span>
                      </p>
                    </div>
                    <Badge tone={verdictTone[d.result.verdict_class] ?? "neutral"}>
                      {d.result.verdict_headline}
                    </Badge>
                  </div>
                ) : d.error ? (
                  <p className="mt-5 text-2xs text-band-low-fg leading-relaxed line-clamp-2">
                    Scoring error · {d.error}
                  </p>
                ) : (
                  <p className="mt-5 text-2xs text-ink-muted">Scoring in progress…</p>
                )}
                <p className="mt-4 text-2xs text-ink-faint tabular">
                  Created {formatRelative(d.createdAt)}
                </p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DraftsEmpty() {
  return (
    <section>
      <Card className="border-dashed bg-surface-soft/40 p-8 text-center">
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
          Test profiles
        </p>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink">
          Score your own profile.
        </h3>
        <p className="mx-auto mt-1 max-w-md text-2xs text-ink-muted leading-relaxed">
          Run a hypothetical or anonymised profile through the scorer and see how it lands on
          all 16 criteria. Results stay in your browser.
        </p>
        <Button asChild variant="primary" size="sm" className="mt-4">
          <Link href="/clients/new">
            <Plus className="h-3.5 w-3.5" />
            Score a profile
          </Link>
        </Button>
      </Card>
    </section>
  );
}
