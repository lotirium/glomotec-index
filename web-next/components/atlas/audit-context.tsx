"use client";

import * as React from "react";

export interface AuditEvidence {
  authority: string;
  dataset: string;
  publishedDate?: string;
  lastUpdated: string;
  confidence?: "high" | "medium" | "low";
  fixtureRef?: string;
}

export interface AuditGrade {
  rubricVersion: string;
  rubricHref?: string;
  method?: string;
}

export interface AuditFocus {
  /** Stable id so we can tell whether a re-click is the same focus (unpin). */
  id: string;
  /** PROPOSITION : the fact being asserted in plain English. */
  proposition: string;
  /** EVIDENCE : one or more source records that produced the proposition. */
  evidence: AuditEvidence[];
  /** GRADE : the rubric pass that derived band assignments, if any. */
  grade: AuditGrade;
}

export interface PageAudit {
  generatedAt: string;
  jurisdiction: string;
  fixtureVersions: { name: string; lastUpdated: string }[];
  /** Subject of the page (zone name, company name, etc). Used by the sidebar
   *  in default mode so the rail is never empty. */
  subject?: string;
}

interface AuditTrailContextValue {
  pinned: AuditFocus | null;
  hovered: AuditFocus | null;
  pageAudit: PageAudit;
  pin: (focus: AuditFocus) => void;
  unpin: () => void;
  hover: (focus: AuditFocus | null) => void;
}

const AuditTrailContext = React.createContext<AuditTrailContextValue | null>(null);

export function AuditTrailProvider({
  pageAudit,
  children,
}: {
  pageAudit: PageAudit;
  children: React.ReactNode;
}) {
  const [pinned, setPinned] = React.useState<AuditFocus | null>(null);
  const [hovered, setHovered] = React.useState<AuditFocus | null>(null);

  const pin = React.useCallback((focus: AuditFocus) => {
    setPinned((current) => (current?.id === focus.id ? null : focus));
  }, []);
  const unpin = React.useCallback(() => setPinned(null), []);
  const hover = React.useCallback((focus: AuditFocus | null) => setHovered(focus), []);

  const value = React.useMemo(
    () => ({ pinned, hovered, pageAudit, pin, unpin, hover }),
    [pinned, hovered, pageAudit, pin, unpin, hover],
  );

  return (
    <AuditTrailContext.Provider value={value}>{children}</AuditTrailContext.Provider>
  );
}

export function useAuditTrail() {
  const ctx = React.useContext(AuditTrailContext);
  if (!ctx) throw new Error("useAuditTrail must be used inside AuditTrailProvider");
  return ctx;
}
