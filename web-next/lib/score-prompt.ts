import "server-only";
import fs from "fs";
import path from "path";
import type { Criterion } from "@/lib/types";

// Canonical scorer prompt + tool schema live at glomotec_index/shared/.
// A prebuild step mirrors them into web-next/shared/ so Vercel sees them.
// Both Python (scorer/scorer.py) and this module load the same files at
// runtime; if they drift, scoring drifts.
const SHARED_DIR = path.join(process.cwd(), "shared");
const SYSTEM_PROMPT = fs.readFileSync(
  path.join(SHARED_DIR, "scorer_system_prompt.md"),
  "utf8",
);
const SHARED_TOOL = JSON.parse(
  fs.readFileSync(path.join(SHARED_DIR, "scorer_tool_schema.json"), "utf8"),
) as {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    required: string[];
    properties: Record<string, unknown>;
  };
};

export const SCORING_TOOL = SHARED_TOOL;

export interface ScoringToolItem {
  criterion_id: string;
  reasoning: string;
  probability_meets: number;
  supporting_evidence: Array<{ field?: string; matches: string }>;
  missing_inputs: string[];
  burden_actor?: string;
  burden_obligation_met?: boolean;
}

export interface SystemBlock {
  type: "text";
  text: string;
  cache_control: { type: "ephemeral" };
}

function buildUserSection(c: Criterion, i?: number, n?: number): string {
  const burden = c.burden_allocation
    ? Object.entries(c.burden_allocation)
        .map(([actor, items]) => `  ${actor}: ${items.join(" | ")}`)
        .join("\n")
    : "(no burden allocation defined)";

  const heading =
    i != null && n != null
      ? `CRITERION ${i + 1} of ${n}\n================`
      : `CRITERION\n=========`;

  return `${heading}
id: ${c.id}
stage: ${c.decision_stage}
modality: ${c.modality}
mechanism: ${c.assessment_mechanism}
category: ${c.category}

predicate:
${c.predicate.statement}

burden_allocation:
${burden}`;
}

export function buildSinglePrompt({
  criterion,
  profile,
  routeName,
}: {
  criterion: Criterion;
  profile: string;
  routeName: string;
}): { system: SystemBlock[]; user: string } {
  const user = `Route: ${routeName}

${buildUserSection(criterion)}

CLIENT PROFILE
==============
${profile.trim()}

Score this single criterion against the profile. Use the ${SHARED_TOOL.name} tool exactly once.`;

  // Mark the system prompt as cacheable. The first call writes the cache;
  // subsequent calls in the burst read from it, cutting effective TPM and
  // avoiding rate-limit pressure.
  const system: SystemBlock[] = [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
  ];
  return { system, user };
}

// Batch wrapper. The single-criterion item-shape is exactly the shared schema's
// properties; the wrapper just collects an array of them. Both consumers stay
// aligned on the per-criterion shape.
export const BATCH_SCORING_TOOL = {
  name: "submit_batch_scoring",
  description:
    "Submit per-criterion evaluations for a batch of criteria. Must be called exactly once with one entry per criterion in the batch.",
  input_schema: {
    type: "object",
    properties: {
      criteria_scored: {
        type: "array",
        description:
          "One entry per criterion in the batch, in the same order they were given.",
        items: {
          type: "object",
          required: SHARED_TOOL.input_schema.required,
          properties: SHARED_TOOL.input_schema.properties,
        },
      },
    },
    required: ["criteria_scored"],
  },
} as const;

export interface BatchScoringToolItem extends ScoringToolItem {
  criterion_id: string;
}

export function buildBatchPrompt({
  criteria,
  profile,
  routeName,
}: {
  criteria: Criterion[];
  profile: string;
  routeName: string;
}): { system: SystemBlock[]; user: string } {
  const blocks = criteria
    .map((c, i) => buildUserSection(c, i, criteria.length))
    .join("\n\n");

  const user = `Route: ${routeName}

${blocks}

CLIENT PROFILE
==============
${profile.trim()}

Score every criterion above against the profile. Use the submit_batch_scoring tool exactly once, with one entry per criterion. Set criterion_id on each entry to the criterion's id verbatim.`;

  const system: SystemBlock[] = [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
  ];
  return { system, user };
}
