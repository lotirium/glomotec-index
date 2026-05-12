"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { MonitorStatus } from "@/lib/types";

/**
 * Two-tab switcher rendered above the criteria column on operator detail
 * pages. The Monitor pill carries its own subscription state in the label
 * (ACTIVE / OFFER) so Ray sees the commercial relationship the moment the
 * page loads, before he's even clicked anything.
 */
export function OperatorTabs({
  monitorStatus,
  criteria,
  monitor,
}: {
  monitorStatus: MonitorStatus;
  criteria: React.ReactNode;
  monitor: React.ReactNode;
}) {
  const [tab, setTab] = React.useState<"criteria" | "monitor">("criteria");
  const isActive = monitorStatus === "active";
  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Operator view"
        className="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-soft"
      >
        <TabButton
          active={tab === "criteria"}
          onClick={() => setTab("criteria")}
          ariaControls="panel-criteria"
        >
          Criteria
        </TabButton>
        <TabButton
          active={tab === "monitor"}
          onClick={() => setTab("monitor")}
          ariaControls="panel-monitor"
        >
          <span className="font-mono uppercase tracking-[0.18em] text-2xs">
            MONITOR
          </span>
          <span aria-hidden className="text-ink-faint">·</span>
          <span
            className={cn(
              "font-mono uppercase tracking-[0.18em] text-2xs",
              isActive ? "text-band-high-fg" : "text-accent-deep",
            )}
          >
            {isActive ? "ACTIVE" : "OFFER"}
          </span>
        </TabButton>
      </div>

      <div
        role="tabpanel"
        id="panel-criteria"
        hidden={tab !== "criteria"}
        className={tab === "criteria" ? "" : "hidden"}
      >
        {criteria}
      </div>
      <div
        role="tabpanel"
        id="panel-monitor"
        hidden={tab !== "monitor"}
        className={tab === "monitor" ? "" : "hidden"}
      >
        {monitor}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  ariaControls,
  children,
}: {
  active: boolean;
  onClick: () => void;
  ariaControls: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={ariaControls}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        active
          ? "bg-ink text-surface shadow-soft"
          : "text-ink-muted hover:text-ink-soft",
      )}
    >
      {children}
    </button>
  );
}
