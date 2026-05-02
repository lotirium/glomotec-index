"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  generateSlug,
  saveDraft,
  type DraftInput,
  profileTextFromInput,
} from "@/lib/drafts";
import { cn } from "@/lib/utils";

const FIELDS: Array<{
  key: keyof StructuredFields;
  label: string;
  placeholder: string;
  type?: "textarea" | "select" | "text";
  options?: Array<{ value: string; label: string }>;
  span?: 1 | 2;
}> = [
  { key: "name", label: "Name (display only — not used for scoring)", placeholder: "e.g. Profile A", span: 2 },
  { key: "nationality", label: "Nationality", placeholder: "e.g. Brazil", span: 1 },
  { key: "age", label: "Age", placeholder: "e.g. 32", span: 1 },
  {
    key: "qualification",
    label: "Highest qualification + institution",
    placeholder: "e.g. PhD Computer Science, University of Cambridge (2021)",
    span: 2,
  },
  {
    key: "role",
    label: "Current role + employer",
    placeholder: "e.g. Co-founder and CTO, Northwind Climate (UK Ltd)",
    span: 2,
  },
  {
    key: "experience",
    label: "Years of relevant experience",
    placeholder: "e.g. 8 years across machine learning and climate modelling",
    span: 2,
  },
  {
    key: "businessStage",
    label: "Business stage",
    type: "select",
    placeholder: "Select stage",
    span: 1,
    options: [
      { value: "", label: "Not specified" },
      { value: "idea", label: "Idea" },
      { value: "pre_revenue", label: "Pre-revenue" },
      { value: "revenue", label: "Revenue" },
      { value: "scaling", label: "Scaling" },
    ],
  },
  {
    key: "fundingRaised",
    label: "Funding raised (GBP, optional)",
    placeholder: "e.g. £450,000 from two angels and a SEIS round",
    span: 1,
  },
  {
    key: "endorsementStatus",
    label: "Endorsing body status",
    type: "select",
    placeholder: "Select status",
    span: 2,
    options: [
      { value: "", label: "Not specified" },
      { value: "none", label: "None — not yet approached" },
      { value: "approached", label: "Approached" },
      { value: "in_conversation", label: "In conversation" },
      { value: "endorsed", label: "Endorsed" },
    ],
  },
  {
    key: "evidence",
    label: "Evidence available",
    type: "textarea",
    placeholder:
      "Documents, traction metrics, prior endorsements, customer counts, IP filings, hires made, awards, accelerators, etc.",
    span: 2,
  },
  {
    key: "other",
    label: "Anything else relevant",
    type: "textarea",
    placeholder: "Visa history, English qualifications, prior refusals, employer dependencies, anything ambiguous.",
    span: 2,
  },
];

type StructuredFields = {
  name: string;
  nationality: string;
  age: string;
  qualification: string;
  role: string;
  experience: string;
  businessStage: string;
  fundingRaised: string;
  endorsementStatus: string;
  evidence: string;
  other: string;
};

const EMPTY_FIELDS: StructuredFields = {
  name: "",
  nationality: "",
  age: "",
  qualification: "",
  role: "",
  experience: "",
  businessStage: "",
  fundingRaised: "",
  endorsementStatus: "",
  evidence: "",
  other: "",
};

const PASTE_PLACEHOLDER = `e.g.

Founder & CEO of Northwind Climate, an early-stage climate-tech company building emissions-tracking software for SME exporters. Brazilian national, age 34, PhD in Earth Systems Science (Imperial College London, 2022).

The business was founded in 2024 in London. We have £210k in pre-seed funding (SFC + 2 angels), 6 paying pilot customers, and 1 IP filing. The team has 2 full-time UK-resident hires plus me.

We are in conversation with Innovator International about endorsement and have submitted a draft contact-point document. No endorsement letter issued yet. I hold a current Skilled Worker visa as a research scientist; I'm switching to take a key role in the business full-time.

English: PhD taught in English. Documents in English. Funds: £18k personal, held continuously since November 2025.`;

export function NewProfileForm() {
  const router = useRouter();
  const [tab, setTab] = React.useState<"structured" | "paste">("structured");
  const [fields, setFields] = React.useState<StructuredFields>(EMPTY_FIELDS);
  const [pasted, setPasted] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [scoringConfigured, setScoringConfigured] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/score/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setScoringConfigured(Boolean(j.configured));
      })
      .catch(() => {
        if (!cancelled) setScoringConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const draftInput: DraftInput = React.useMemo(
    () => (tab === "paste" ? { mode: "paste", text: pasted } : { mode: "structured", fields }),
    [tab, pasted, fields],
  );
  const profileText = profileTextFromInput(draftInput);
  const profileEmpty = profileText.length < 20;
  const offline = scoringConfigured === false;
  const checking = scoringConfigured === null;
  const disabled = submitting || profileEmpty || offline || checking;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    setSubmitting(true);
    const slug = generateSlug();
    const displayName =
      tab === "structured" && fields.name.trim()
        ? fields.name.trim()
        : `Test profile ${slug.slice(-6)}`;
    saveDraft({
      slug,
      createdAt: new Date().toISOString(),
      displayName,
      input: draftInput,
      result: null,
      error: null,
    });
    router.push(`/clients/${slug}`);
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {offline && <OfflineBanner />}
        <Tabs value={tab} onValueChange={(v) => setTab(v as "structured" | "paste")}>
          <TabsList>
            <TabsTrigger value="structured">Structured</TabsTrigger>
            <TabsTrigger value="paste">Paste profile</TabsTrigger>
          </TabsList>

          <TabsContent value="structured" className="mt-4">
            <Card className="p-6">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                {FIELDS.map((f) => (
                  <Field
                    key={f.key}
                    field={f}
                    value={fields[f.key]}
                    onChange={(v) => setFields((s) => ({ ...s, [f.key]: v }))}
                    disabled={offline || submitting}
                  />
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="paste" className="mt-4">
            <Card className="p-6">
              <label
                htmlFor="paste-textarea"
                className="block text-sm font-medium text-ink-soft mb-2"
              >
                Paste a profile narrative
              </label>
              <textarea
                id="paste-textarea"
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder={PASTE_PLACEHOLDER}
                rows={14}
                disabled={offline || submitting}
                className="w-full resize-y rounded-md border border-line bg-surface-soft px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-faint outline-none focus:border-accent/40 focus:bg-surface focus:ring-2 focus:ring-accent/20 font-mono disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <p className="mt-2 text-2xs text-ink-faint">
                {pasted.trim().length} characters · 100–800 words is plenty.
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="space-y-3">
          <p className="text-2xs text-ink-muted leading-relaxed">
            Profiles are sent to Anthropic's Claude API for scoring.{" "}
            <strong className="text-ink-soft">
              Do not include identifying client information.
            </strong>{" "}
            Results are kept in your browser only.
          </p>
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={disabled}
            >
              Score against Innovator Founder
            </Button>
            {profileEmpty && !offline && !checking && (
              <p className="text-2xs text-ink-faint">
                Add a few details before scoring.
              </p>
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card className="p-5">
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
            What gets scored
          </p>
          <p className="mt-2 text-sm text-ink leading-relaxed">
            All 16 criteria from v10.0 (27 February 2026) of the Innovator Founder caseworker
            guidance.
          </p>
          <p className="mt-3 text-2xs text-ink-muted leading-relaxed">
            Each criterion gets a probability, a 4-step reasoning trace and a band
            (High / Medium / Low / Below threshold). Aggregate verdict and gap-list follow.
          </p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
            Tips for a useful score
          </p>
          <ul className="mt-2 space-y-1.5 text-2xs text-ink-muted leading-relaxed list-disc pl-4">
            <li>Be specific about evidence and dates.</li>
            <li>Where you don't have evidence, say so explicitly.</li>
            <li>Mention current visa status and English qualifications.</li>
            <li>Funding amounts and customer counts move scoring noticeably.</li>
          </ul>
        </Card>
      </aside>
    </form>
  );
}

function Field({
  field,
  value,
  onChange,
  disabled,
}: {
  field: (typeof FIELDS)[number];
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const id = `field-${field.key}`;
  const cls = cn(field.span === 2 && "md:col-span-2");
  const baseInput =
    "w-full rounded-md border border-line bg-surface-soft px-3 py-2 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent/40 focus:bg-surface focus:ring-2 focus:ring-accent/20 disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className={cls}>
      <label
        htmlFor={id}
        className="block text-2xs font-mono uppercase tracking-[0.18em] text-ink-faint mb-1.5"
      >
        {field.label}
      </label>
      {field.type === "textarea" ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          disabled={disabled}
          className={cn(baseInput, "resize-y leading-relaxed")}
        />
      ) : field.type === "select" ? (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={baseInput}
        >
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          className={baseInput}
        />
      )}
    </div>
  );
}

function OfflineBanner() {
  return (
    <div className="rounded-lg border border-line bg-surface-soft px-4 py-3 text-2xs text-ink-soft">
      <p className="font-medium text-ink">Live scoring is offline on this deployment.</p>
      <p className="mt-1 text-ink-muted leading-relaxed">
        Set <code className="font-mono">ANTHROPIC_API_KEY</code> in the deployment environment to
        enable scoring. The form is preserved below for review.
      </p>
    </div>
  );
}
