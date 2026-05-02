import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-medium tracking-tight tabular",
  {
    variants: {
      tone: {
        neutral: "border-line bg-surface-soft text-ink-soft",
        accent: "border-accent/20 bg-accent-tint text-accent-deep",
        high: "border-band-high-fg/20 bg-band-high-bg text-band-high-fg",
        medium: "border-band-medium-fg/20 bg-band-medium-bg text-band-medium-fg",
        low: "border-band-low-fg/20 bg-band-low-bg text-band-low-fg",
        below: "border-band-below-fg/20 bg-band-below-bg text-band-below-fg",
        outline: "border-line bg-transparent text-ink-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
