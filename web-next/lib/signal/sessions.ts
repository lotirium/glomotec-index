"use client";

import type { SignalSession } from "@/lib/signal/types";

const STORAGE_KEY = "signal.sessions";

export function generateSessionId(): string {
  // RFC 4122 v4 if available; fall back to a stable random hex.
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) {
    return c.randomUUID();
  }
  const buf = new Uint8Array(16);
  if (c?.getRandomValues) {
    c.getRandomValues(buf);
  } else {
    for (let i = 0; i < 16; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function loadAllSessions(): Record<string, SignalSession> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, SignalSession>;
    }
    return {};
  } catch {
    return {};
  }
}

export function listSessions(): SignalSession[] {
  return Object.values(loadAllSessions()).sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
  );
}

export function loadSession(id: string): SignalSession | null {
  return loadAllSessions()[id] ?? null;
}

export function saveSession(session: SignalSession): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadAllSessions();
    all[session.id] = session;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // best-effort
  }
}

export function deleteSession(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadAllSessions();
    delete all[id];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // best-effort
  }
}

export function newSession(): SignalSession {
  const now = new Date().toISOString();
  return {
    id: generateSessionId(),
    createdAt: now,
    updatedAt: now,
    messages: [],
    structuredProfile: null,
    profile: null,
    qualification: null,
    qualifyFallback: null,
    error: null,
  };
}
