import "server-only";

/**
 * Detects when an error from the Anthropic SDK is a billing/quota/credit
 * problem rather than a real outage. We use this to swap a stack-trace
 * 5xx for a friendly fallback envelope on the prospect-facing demos.
 *
 * Network errors, malformed input, and schema validation failures should
 * NOT match — they still bubble up so they can be fixed.
 */

export interface QuotaExceeded {
  quota_exceeded: true;
  raw: unknown;
}

const QUOTA_PATTERN = /credit|quota|billing|balance/i;

/**
 * Best-effort introspection of an unknown error value. Anthropic SDK errors
 * typically expose `status` (HTTP code) and `message`; some carry a nested
 * `error` body of shape `{ type, message }` (e.g. "billing_error",
 * "credits_exceeded"). We check all three layers.
 */
export function detectQuotaError(err: unknown): QuotaExceeded | null {
  if (!err || typeof err !== "object") return null;

  const e = err as {
    status?: number;
    message?: string;
    name?: string;
    type?: string;
    error?: { type?: string; message?: string };
  };

  const status = typeof e.status === "number" ? e.status : null;
  const topMessage = typeof e.message === "string" ? e.message : "";
  const topType = typeof e.type === "string" ? e.type : "";
  const innerType = typeof e.error?.type === "string" ? e.error.type : "";
  const innerMessage =
    typeof e.error?.message === "string" ? e.error.message : "";
  const name = typeof e.name === "string" ? e.name : "";

  // 402 Payment Required is unambiguous.
  if (status === 402) return { quota_exceeded: true, raw: err };

  // 403 / 429 with quota-flavoured wording in any of the message/type fields.
  if (status === 403 || status === 429) {
    if (
      QUOTA_PATTERN.test(topMessage) ||
      QUOTA_PATTERN.test(topType) ||
      QUOTA_PATTERN.test(innerType) ||
      QUOTA_PATTERN.test(innerMessage)
    ) {
      return { quota_exceeded: true, raw: err };
    }
  }

  // Anthropic.APIError instances may carry the structured type/message
  // even when the status code itself is generic. Match the same patterns
  // there. Avoids missing a quota error that surfaces as e.g. status 400
  // with type "billing_error".
  if (name.includes("APIError")) {
    if (
      QUOTA_PATTERN.test(topMessage) ||
      QUOTA_PATTERN.test(topType) ||
      QUOTA_PATTERN.test(innerType) ||
      QUOTA_PATTERN.test(innerMessage)
    ) {
      return { quota_exceeded: true, raw: err };
    }
  }

  return null;
}

/**
 * The on-the-wire fallback shape emitted by the JSON routes
 * (/api/signal/qualify, /api/pipeline/extract) and inside the
 * NDJSON stream of /api/score.
 */
export interface QuotaFallback {
  status: "fallback_quota";
  headline: string;
  body: string;
}

export const SCORE_FALLBACK: QuotaFallback = {
  status: "fallback_quota",
  headline: "The rules engine has stepped out for tea.",
  body: "We are out of API credit on this preview. Top up the meter and rerun.",
};

export const QUALIFY_FALLBACK: QuotaFallback = {
  status: "fallback_quota",
  headline: "The rules engine is on a brief coffee break.",
  body: "I have everything I need from you, but the rules engine is on a brief coffee break. Top up the API and rerun.",
};

export const SIGNAL_CHAT_FALLBACK_MESSAGE =
  "I have run out of API credit and cannot reason against the rules right now. Top up the meter and we can pick this up in a minute.";

export const EXTRACT_FALLBACK_MESSAGE =
  "EXTRACTOR is out of API credit. Refill required before rerunning.";
