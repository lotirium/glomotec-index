"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAuditTrail, type AuditFocus } from "@/components/atlas/audit-context";

interface Props {
  anchor: AuditFocus;
  as?: "span" | "div" | "li";
  className?: string;
  children: React.ReactNode;
}

export function AuditAnchor({ anchor, as: Tag = "span", className, children }: Props) {
  const { pin, hover, pinned } = useAuditTrail();
  const isPinned = pinned?.id === anchor.id;

  const onEnter = React.useCallback(() => hover(anchor), [anchor, hover]);
  const onLeave = React.useCallback(() => hover(null), [hover]);
  const onClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      pin(anchor);
    },
    [anchor, pin],
  );
  const onKey = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pin(anchor);
      }
    },
    [anchor, pin],
  );

  return (
    <Tag
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onClick}
      onKeyDown={onKey}
      tabIndex={0}
      role="button"
      aria-pressed={isPinned}
      data-audit-pinned={isPinned ? "true" : undefined}
      className={cn(
        "rounded-sm outline-none transition-colors cursor-pointer",
        "focus-visible:ring-2 focus-visible:ring-accent/30",
        isPinned
          ? "bg-cyan-tint/70 ring-1 ring-cyan/40"
          : "hover:bg-accent-tint/40",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
