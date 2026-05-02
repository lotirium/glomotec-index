import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Payload {
  path?: string;
  reaction?: string | null;
  text?: string;
  viewport?: { w: number; h: number; dpr: number };
  userAgent?: string;
  ts?: string;
}

const REACTION_EMOJI: Record<string, string> = {
  love: "💚",
  useful: "👍",
  confused: "🤔",
  broken: "🐛",
};

export async function POST(req: Request) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const text = (body.text ?? "").trim().slice(0, 4000);
  const reaction = body.reaction ?? null;
  if (!text && !reaction) {
    return NextResponse.json(
      { ok: false, message: "Empty feedback — add a reaction or a comment." },
      { status: 400 },
    );
  }

  const webhook = process.env.FEEDBACK_WEBHOOK_URL;

  const reactionLabel = reaction
    ? `${REACTION_EMOJI[reaction] ?? "•"} ${reaction}`
    : "—";
  const headline = text
    ? text.length > 140
      ? `${text.slice(0, 137)}…`
      : text
    : `Reaction: ${reactionLabel}`;

  const slackPayload = {
    text: `INDEX advisor preview · ${headline}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "INDEX advisor preview · feedback", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Path*\n\`${body.path ?? "/"}\`` },
          { type: "mrkdwn", text: `*Reaction*\n${reactionLabel}` },
          {
            type: "mrkdwn",
            text: `*Viewport*\n${body.viewport?.w ?? "?"}×${body.viewport?.h ?? "?"} @${body.viewport?.dpr ?? 1}x`,
          },
          {
            type: "mrkdwn",
            text: `*When*\n${body.ts ?? new Date().toISOString()}`,
          },
        ],
      },
      ...(text
        ? [
            {
              type: "section",
              text: { type: "mrkdwn", text: `*Comment*\n>${text.replace(/\n/g, "\n>")}` },
            },
          ]
        : []),
      ...(body.userAgent
        ? [
            {
              type: "context",
              elements: [{ type: "mrkdwn", text: `\`${body.userAgent.slice(0, 200)}\`` }],
            },
          ]
        : []),
    ],
  };

  if (!webhook) {
    console.warn(
      "[feedback] FEEDBACK_WEBHOOK_URL not set — feedback received but not forwarded.",
      JSON.stringify(slackPayload).slice(0, 1200),
    );
    return NextResponse.json({ ok: true, forwarded: false });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackPayload),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, message: `Webhook returned ${res.status}`, detail: detail.slice(0, 200) },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, forwarded: true });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Webhook delivery failed.",
      },
      { status: 502 },
    );
  }
}
