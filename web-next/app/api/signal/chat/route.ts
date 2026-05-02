import Anthropic from "@anthropic-ai/sdk";
import {
  RECORD_PROSPECT_PROFILE_TOOL,
  SIGNAL_SYSTEM_PROMPT,
} from "@/lib/signal/system-prompt";
import {
  detectQuotaError,
  SIGNAL_CHAT_FALLBACK_MESSAGE,
} from "@/lib/anthropic-fallback";
import type { ChatMessage, ProspectProfile } from "@/lib/signal/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Sonnet 4.6 is the model that powers SIGNAL on signal.glomotec.com. */
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;

interface RequestBody {
  /** Full chat transcript so far, oldest-first. The newest entry must be a user turn. */
  messages?: ChatMessage[];
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
          system: SIGNAL_SYSTEM_PROMPT,
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
              profile = {
                nationality: input.nationality,
                age: input.age,
                current_visa_status: input.current_visa_status,
                education: input.education,
                business_stage: input.business_stage,
                funding: input.funding,
                endorsement_status: input.endorsement_status,
                english_proficiency: input.english_proficiency,
                prior_immigration_history: input.prior_immigration_history,
                narrative_summary: input.narrative_summary,
              };
            }
          }
        }

        write({
          type: "assistant_turn",
          text: assistantText.trim(),
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
