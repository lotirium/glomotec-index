"use client";

/**
 * StructuredOperatorProfile — the five fields collected at /signal/start
 * before the qualification chat begins. Persisted to localStorage so the
 * operator does not re-enter on every conversation. Sent with each chat
 * turn as system-level context so the model asks targeted follow-ups
 * instead of starting from zero.
 */
export interface StructuredOperatorProfile {
  nationality: string;
  background: string;
  currently_based_in: string;
  purpose: string;
  target_jurisdiction: string;
  /** ISO timestamp of when the profile was last saved. */
  saved_at: string;
}

const STORAGE_KEY = "signal.profile";

export function loadOperatorProfile(): StructuredOperatorProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.nationality === "string" &&
      typeof parsed.background === "string" &&
      typeof parsed.currently_based_in === "string" &&
      typeof parsed.purpose === "string" &&
      typeof parsed.target_jurisdiction === "string"
    ) {
      return parsed as StructuredOperatorProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveOperatorProfile(
  profile: Omit<StructuredOperatorProfile, "saved_at">,
): StructuredOperatorProfile {
  const next: StructuredOperatorProfile = {
    ...profile,
    saved_at: new Date().toISOString(),
  };
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // best-effort
  }
  return next;
}

export function clearOperatorProfile(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort
  }
}

/** Render the structured profile as a system-prompt-friendly bullet block. */
export function renderProfileForPrompt(p: StructuredOperatorProfile): string {
  return [
    "Operator profile (collected at /signal/start, prior to this chat):",
    `- Nationality: ${p.nationality}`,
    `- Background: ${p.background}`,
    `- Currently based in: ${p.currently_based_in}`,
    `- Purpose of move: ${p.purpose}`,
    `- Target jurisdiction: ${p.target_jurisdiction}`,
  ].join("\n");
}
