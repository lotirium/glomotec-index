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
    <section className="mx-auto w-full md:max-w-[78%] space-y-8">
      <SectionHeading
        eyebrow="Test profiles"
        title="Profiles you've scored"
        description="Stored locally in this browser. Open any to see its scoring or re-run it."
        trailing={
          <Button asChild variant="explore" size="pill">
            <Link href="/clients/new">SCORE ANOTHER</Link>
          </Button>
        }
      />
      <ul className="space-y-3">
        {drafts.map((d) => (
          <li key={d.slug}>
            <Link href={`/clients/${d.slug}`} className="group block">
              <Card className="p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge tone="accent">Test profile</Badge>
                      <p className="text-2xs text-ink-faint tabular truncate">
                        {d.slug}
                      </p>
                    </div>
                    <p className="text-base font-semibold tracking-tight text-ink truncate">
                      {d.displayName}
                    </p>
                    <p className="text-2xs text-ink-faint tabular">
                      Created {formatRelative(d.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    {d.result ? (
                      <>
                        <div className="text-right">
                          <p className="text-kicker uppercase text-ink-faint">
                            Readiness
                          </p>
                          <p className="mt-1 flex items-baseline justify-end gap-1">
                            <span className="text-3xl font-semibold tracking-tight text-ink tabular leading-none">
                              {d.result.overall_pct}
                            </span>
                            <span className="text-sm text-ink-muted">%</span>
                          </p>
                        </div>
                        <Badge tone={verdictTone[d.result.verdict_class] ?? "neutral"}>
                          {d.result.verdict_headline}
                        </Badge>
                      </>
                    ) : d.error ? (
                      <p className="max-w-xs text-2xs text-band-low-fg leading-relaxed line-clamp-2">
                        Scoring error · {d.error}
                      </p>
                    ) : (
                      <p className="text-2xs text-ink-muted">Scoring in progress…</p>
                    )}
                    <ArrowUpRight className="h-4 w-4 text-ink-faint transition-colors group-hover:text-ink" />
                  </div>
                </div>
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
    <section className="mx-auto w-full md:max-w-[78%]">
      <div className="rounded-lg border border-dashed border-line p-12 text-center">
        <p className="text-kicker uppercase text-ink-faint">Test profiles</p>
        <h3 className="mt-3 text-h2 text-ink">Score your own profile.</h3>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-muted leading-relaxed">
          Run a hypothetical or anonymised profile through the scorer and see how
          it lands on all Innovator Founder criteria. Results stay in your browser.
        </p>
        <div className="mt-8">
          <Button asChild variant="engage" size="pill">
            <Link href="/clients/new">
              <Plus className="h-3.5 w-3.5" />
              SCORE A PROFILE
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
