"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-surface hover:bg-ink-soft",
        primary:
          "bg-accent text-surface hover:bg-accent-deep",
        outline:
          "border border-line bg-surface text-ink hover:border-ink-faint",
        ghost: "text-ink-soft hover:text-ink",
        link: "text-accent hover:underline",
        subtle:
          "bg-surface-soft text-ink-soft hover:text-ink",
        // ENGAGE pill — deep navy, ivory text, tracked-caps. Brand v1.0
        // primary CTA. 22pt height, 32pt horizontal padding.
        engage:
          "rounded-full bg-accent text-surface hover:bg-accent-deep tracking-[0.18em] uppercase font-bold",
        // EXPLORE outline pill — outline accent, fills 4–5% on hover.
        explore:
          "rounded-full border border-accent bg-transparent text-accent hover:bg-accent/5 tracking-[0.18em] uppercase font-bold",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-6 text-sm",
        icon: "h-9 w-9",
        // Brand-spec pill: 22pt tall, 32pt horizontal padding.
        pill: "h-[44px] px-8 text-kicker",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
