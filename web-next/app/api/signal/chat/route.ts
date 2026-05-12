import Anthropic from "@anthropic-ai/sdk";
import {
  RECORD_PROSPECT_PROFILE_TOOL,
  SIGNAL_SYSTEM_PROMPT,
} from "@/lib/signal/system-prompt";
import {
  detectQuotaError,
  SIGNAL_CHAT_FALLBACK_MESSAGE,
} from "@/lib/anthropic-fallback";
import { stripEmDash } from "@/lib/text-sanitize";
import type { ChatMessage, ProspectProfile } from "@/lib/signal/types";

/**
 * Render the five-field structured profile collected at /signal/start as a
 * system-prompt-friendly bullet block. Server-side mirror of
 * lib/signal/operator-profile.renderProfileForPrompt — duplicated here
 * because that file is "use client".
 */
interface StructuredProfileShape {
  nationality: string;
  background: string;
  currently_based_in: string;
  purpose: string;
  target_jurisdiction: string;
}

function isStructuredProfile(v: unknown): v is StructuredProfileShape {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as Record<string, unknown>).nationality === "string" &&
    typeof (v as Record<string, unknown>).background === "string" &&
    typeof (v as Record<string, unknown>).currently_based_in === "string" &&
    typeof (v as Record<string, unknown>).purpose === "string" &&
    typeof (v as Record<string, unknown>).target_jurisdiction === "string"
  );
}

function profileBlock(p: StructuredProfileShape): string {
  return [
    "",
    "## Operator profile (collected at /signal/start, prior to this chat)",
    "",
    `- Nationality: ${p.nationality}`,
    `- Background: ${p.background}`,
    `- Currently based in: ${p.currently_based_in}`,
    `- Purpose of move: ${p.purpose}`,
    `- Target jurisdiction: ${p.target_jurisdiction}`,
    "",
    "Use this profile as your starting point. Do NOT re-ask for any of these five fields. Ask targeted follow-up questions on the remaining substantive and suitability ground (current visa status, education, business stage, funding, endorsement, English proficiency, immigration history) instead of starting from zero.",
  ].join("\n");
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Sonnet 4.6 is the model that powers SIGNAL on signal.glomotec.com. */
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;

interface RequestBody {
  /** Full chat transcript so far, oldest-first. The newest entry must be a user turn. */
  messages?: ChatMessage[];
  /** Five-field structured profile from /signal/start, if any. */
  structuredProfile?: StructuredProfileShape | null;
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ ok: false, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function toAnthropicMessages(
  messages: ChatMessage[],
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.content }));
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError(
      503,
      "SIGNAL is not configured on this deployment. Set ANTHROPIC_API_KEY to enable.",
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonError(400, "Invalid request body.");
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return jsonError(400, "Conversation has no messages.");
  }
  if (messages[messages.length - 1].role !== "user") {
    return jsonError(400, "The last message must be from the user.");
  }
  if (messages.length > 30) {
    return jsonError(400, "Conversation has grown too long for a single chat session.");
  }

  const anthropic = new Anthropic({ apiKey, maxRetries: 3 });
  const apiMessages = toAnthropicMessages(messages);
  const systemPrompt = isStructuredProfile(body.structuredProfile)
    ? `${SIGNAL_SYSTEM_PROMPT}\n${profileBlock(body.structuredProfile)}`
    : SIGNAL_SYSTEM_PROMPT;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const write = (obj: unknown) => {
        controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
      };

      try {
        const response = await anthropic.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          tools: [RECORD_PROSPECT_PROFILE_TOOL] as unknown as Anthropic.Tool[],
          messages: apiMessages,
        });

        let assistantText = "";
        let profile: ProspectProfile | null = null;

        for (const block of response.content) {
          if (block.type === "text") {
            assistantText += block.text;
          } else if (
            block.type === "tool_use" &&
            block.name === RECORD_PROSPECT_PROFILE_TOOL.name
          ) {
            const input = block.input as Partial<ProspectProfile>;
            if (typeof input.narrative_summary === "string") {
              const clean = (v?: string) =>
                typeof v === "string" ? stripEmDash(v) : v;
              profile = {
                nationality: clean(input.nationality),
                age: clean(input.age),
                current_visa_status: clean(input.current_visa_status),
                education: clean(input.education),
                business_stage: clean(input.business_stage),
                funding: clean(input.funding),
                endorsement_status: clean(input.endorsement_status),
                english_proficiency: clean(input.english_proficiency),
                prior_immigration_history: clean(input.prior_immigration_history),
                narrative_summary: stripEmDash(input.narrative_summary),
              };
            }
          }
        }

        write({
          type: "assistant_turn",
          // Persistence boundary for SIGNAL chat. The assistant turn lands
          // in localStorage and is rendered verbatim into the chat thread,
          // so em-dashes get scrubbed on write.
          text: stripEmDash(assistantText),
          profile,
          stop_reason: response.stop_reason ?? null,
          usage: response.usage,
        });
        controller.close();
      } catch (err) {
        if (detectQuotaError(err)) {
          write({
            type: "fallback_quota",
            message: SIGNAL_CHAT_FALLBACK_MESSAGE,
          });
          controller.close();
          return;
        }
        const e = err as { status?: number; message?: string };
        let msg = e.message ?? "SIGNAL chat failed unexpectedly.";
        if (e.status === 429) msg = "SIGNAL is rate-limited right now. Try again in a moment.";
        if (e.status === 401 || e.status === 403)
          msg = "SIGNAL credentials are invalid on this deployment.";
        write({ type: "error", message: msg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
      "Content-Encoding": "identity",
    },
  });
}
