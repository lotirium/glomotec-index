"use client";

import type { AssessmentRun } from "@/lib/types";

const STORAGE_KEY = "index.draft-profiles";

export interface DraftInputStructured {
  mode: "structured";
  fields: Record<string, string>;
}

export interface DraftInputPaste {
  mode: "paste";
  text: string;
}

export type DraftInput = DraftInputStructured | DraftInputPaste;

export interface Draft {
  slug: string;
  createdAt: string;
  displayName: string;
  input: DraftInput;
  result: AssessmentRun | null;
  error: string | null;
}

export function generateSlug(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  // 6 hex chars from crypto.getRandomValues so collisions are unlikely
  const buf = new Uint8Array(3);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < 3; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  return `draft-${yyyy}${mm}${dd}-${hex}`;
}

export function loadAllDrafts(): Record<string, Draft> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, Draft>;
    return {};
  } catch {
    return {};
  }
}

export function listDrafts(): Draft[] {
  return Object.values(loadAllDrafts()).sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function loadDraft(slug: string): Draft | null {
  return loadAllDrafts()[slug] ?? null;
}

export function saveDraft(draft: Draft): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadAllDrafts();
    all[draft.slug] = draft;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // best-effort
  }
}

export function deleteDraft(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadAllDrafts();
    delete all[slug];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // best-effort
  }
}

export function profileTextFromInput(input: DraftInput): string {
  if (input.mode === "paste") return input.text.trim();
  const order = [
    "name",
    "nationality",
    "age",
    "qualification",
    "role",
    "experience",
    "businessStage",
    "fundingRaised",
    "endorsementStatus",
    "evidence",
    "other",
  ];
  const labels: Record<string, string> = {
    name: "Name",
    nationality: "Nationality",
    age: "Age",
    qualification: "Highest qualification + institution",
    role: "Current role + employer",
    experience: "Years of relevant experience",
    businessStage: "Business stage",
    fundingRaised: "Funding raised (GBP)",
    endorsementStatus: "Endorsing body status",
    evidence: "Evidence available",
    other: "Anything else relevant",
  };
  const lines: string[] = [];
  for (const key of order) {
    const v = input.fields[key]?.trim();
    if (v) lines.push(`${labels[key]}: ${v}`);
  }
  return lines.join("\n");
}
