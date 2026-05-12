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
      suitability_flags: {
        type: "array",
        description:
          "0-3 Part Suitability findings named in plain English. Use ONLY when the suitability criteria show a real refusal risk (immigration bail, prior refusal for false representations, NHS debt, criminal conviction). Each flag is a short noun phrase the prospect should resolve with a regulated advisor before applying (e.g. 'current immigration bail', 'prior UK refusal on the file'). Empty array when suitability looks clean.",
        maxItems: 3,
        items: { type: "string" },
      },
    },
  },
} as const;

export const VERDICT_SYNTH_SYSTEM_PROMPT = `You are SIGNAL, glomotec's mobility advisor. You have just finished a chat with a prospect exploring whether they could qualify for the UK Innovator Founder route. The structured scorer has now returned per-criterion probabilities across substantive (route fit) and suitability (Part Suitability) criteria for that route.

Your job: write a prospect-friendly verdict using the record_prospect_verdict tool.

Tone: warm, direct, plain English. No legalese. No schema fields. No criterion ids. No percentages. The prospect is not technical.

Never use em-dashes (—). Use commas, colons, parentheses, or new sentences instead. (Hyphens in compound words and en-dashes in numeric ranges are fine.)

Content:
- The explanation (2-3 sentences) should reflect what the criteria collectively say. Lean on what is concretely strong and what is concretely missing. If a Part Suitability criterion is failing, name that as the headline reason: a suitability failure overrides route fit. Do not promise outcomes.
- The gaps (1-3) should be the substantive items the prospect could act on (endorsing-body engagement, business stage, English qualification, etc.). Phrase as short noun phrases. If a criterion failed because the prospect simply has not reached that stage yet, name what they would need to reach it. If there are genuinely no gaps, return an empty array.
- The suitability_flags (0-3) are reserved for Part Suitability findings: immigration bail, prior refusals on grounds of false representations or non-disclosure, unpaid NHS debt, criminal convictions or pending proceedings. Use them ONLY when the suitability criteria show a real refusal risk. Phrase each as a short noun phrase the prospect should resolve with a regulated advisor before applying (e.g. 'current immigration bail', 'prior UK refusal on the file', 'unpaid NHS charges of GBP 500 or more'). Return an empty array when suitability looks clean.

Do not include any free text outside the tool call.`;

export interface ProspectVerdictBody {
  explanation: string;
  gaps: string[];
  suitability_flags?: string[];
}

export function buildVerdictUserPrompt(results: ScoringResult[]): string {
  const lines = results.map((r) => {
    const verbatim =
      r.criterion?.predicate?.statement?.trim() ?? "(predicate unavailable)";
    const category = r.criterion?.category ?? "substantive";
    const evidence =
      r.supporting_evidence
        .map((e) => `- ${e.matches}`)
        .join("\n") || "(no supporting evidence)";
    const missing =
      r.missing_inputs.length > 0
        ? r.missing_inputs.map((m) => `- ${m}`).join("\n")
        : "(none)";
    return `Category: ${category}
Predicate: ${verbatim}
Probability the prospect meets this: ${(r.probability_meets * 100).toFixed(0)}%
Reasoning: ${r.reasoning.trim()}
Supporting evidence:
${evidence}
Missing inputs:
${missing}`;
  });

  return `Criteria scored for this prospect against the Innovator Founder route. Each entry is tagged with its category: substantive (route fit) or suitability (Part Suitability gate).

${lines.join("\n\n---\n\n")}

Now write the prospect-facing verdict using the record_prospect_verdict tool. Keep it plain. No criterion ids. No probabilities. No schema fields. Place any genuine refusal-risk findings in suitability_flags rather than in gaps.`;
}
