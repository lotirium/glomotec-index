"use client";

import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SignalQualification } from "@/lib/signal/types";

interface Props {
  qualification: SignalQualification;
  className?: string;
}

const VERDICT_TONE: Record<
  SignalQualification["verdict_class"],
  "high" | "medium" | "low"
> = {
  high: "high",
  medium: "medium",
  low: "low",
};

export function QualificationCard({ qualification, className }: Props) {
  const tone = VERDICT_TONE[qualification.verdict_class];
  const flags = qualification.suitability_flags ?? [];
  const gaps = qualification.gaps ?? [];
  const showWhatYoudNeed = flags.length > 0 || gaps.length > 0;
  return (
    <Card className={cn("p-6 md:p-8 animate-fade-up", className)}>
      <div className="flex items-center gap-3">
        <Sparkles className="h-4 w-4 text-accent" />
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-faint">
          SIGNAL preview verdict
        </p>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Badge tone={tone} className="text-xs px-3 py-1">
          {qualification.verdict_headline}
        </Badge>
        <p className="text-sm text-ink-muted">{qualification.next_step}</p>
      </div>
      <p className="mt-5 text-base text-ink leading-relaxed md:text-lg">
        {qualification.explanation}
      </p>
      {showWhatYoudNeed && (
        <div className="mt-6 rounded-lg border border-line/70 bg-surface-soft p-5">
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
            What you'd need
          </p>
          <ul className="mt-3 space-y-2.5">
            {/*
             * Suitability flags read first: a Part Suitability gap often
             * kills the case even when route fit is strong, so the prospect
             * should see it before any substantive items.
             */}
            {flags.map((f, i) => (
              <li
                key={`s-${i}`}
                className="flex items-start gap-2 text-sm text-band-low-fg leading-relaxed"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="font-semibold">Refusal risk · </span>
                  {f}
                </span>
              </li>
            ))}
            {gaps.map((g, i) => (
              <li
                key={`g-${i}`}
                className="flex items-start gap-2 text-sm text-ink-soft leading-relaxed"
              >
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-6 text-2xs text-ink-faint leading-relaxed">
        Substantive and suitability pre-qualification only. Submission
        readiness (documents, biometrics, fees) is checked at submission with
        a regulated advisor.
      </p>
    </Card>
  );
}
