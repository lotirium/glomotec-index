import "server-only";
import type { ScoringResult } from "@/lib/types";

/**
 * Tool the synthesiser uses to write the prospect-friendly verdict on top of
 * the per-criterion scoring results. We use a tool call rather than free text
 * to keep the output strictly structured: a 2–3 sentence explanation and 1–3
 * gaps phrased in plain English. No criterion ids, no percentages.
 */
export const RECORD_PROSPECT_VERDICT_TOOL = {
  name: "record_prospect_verdict",
  description:
    "Record the prospect-facing verdict written on top of the per-criterion scores. Call exactly once. Keep the language plain — never quote criterion ids, schema fields, or percentages.",
  input_schema: {
    type: "object",
    required: ["explanation", "gaps"],
    properties: {
      explanation: {
        type: "string",
        description:
          "2-3 sentence plain-language explanation of why the prospect lands at this verdict. Frame as a conversation between SIGNAL and the prospect, not as a checklist. Do not mention probabilities or schema fields.",
      },
      gaps: {
        type: "array",
        description:
          "1-3 gaps named in plain English. Each gap is a short noun phrase the prospect could act on (e.g. 'a UK endorsing body in active conversation', 'a recognised English qualification'). Empty array if there are genuinely no gaps.",
        maxItems: 3,
        items: { type: "string" },
      },
    },
  },
} as const;

export const VERDICT_SYNTH_SYSTEM_PROMPT = `You are SIGNAL, glomotec's mobility advisor. You have just finished a chat with a prospect exploring whether they could qualify for the UK Innovator Founder route. The structured scorer has now returned per-criterion probabilities for the substantive criteria of that route.

Your job: write a prospect-friendly verdict using the record_prospect_verdict tool.

Tone: warm, direct, plain English. No legalese. No schema fields. No criterion ids. No percentages. The prospect is not technical.

Content:
- The explanation (2-3 sentences) should reflect what the criteria collectively say. Lean on what is concretely strong and what is concretely missing. Do not promise outcomes.
- The gaps (1-3) should be the items the prospect could act on. Phrase as short noun phrases the prospect can read at a glance. If a criterion failed because the prospect simply has not reached that stage yet, name what they would need to reach it. If there are genuinely no gaps, return an empty array.

Do not include any free text outside the tool call.`;

export interface ProspectVerdictBody {
  explanation: string;
  gaps: string[];
}

export function buildVerdictUserPrompt(results: ScoringResult[]): string {
  const lines = results.map((r) => {
    const verbatim =
      r.criterion?.predicate?.statement?.trim() ?? "(predicate unavailable)";
    const evidence =
      r.supporting_evidence
        .map((e) => `- ${e.matches}`)
        .join("\n") || "(no supporting evidence)";
    const missing =
      r.missing_inputs.length > 0
        ? r.missing_inputs.map((m) => `- ${m}`).join("\n")
        : "(none)";
    return `Predicate: ${verbatim}
Probability the prospect meets this: ${(r.probability_meets * 100).toFixed(0)}%
Reasoning: ${r.reasoning.trim()}
Supporting evidence:
${evidence}
Missing inputs:
${missing}`;
  });

  return `Substantive criteria scored for this prospect against the Innovator Founder route:

${lines.join("\n\n---\n\n")}

Now write the prospect-facing verdict using the record_prospect_verdict tool. Keep it plain. No criterion ids. No probabilities. No schema fields.`;
}
