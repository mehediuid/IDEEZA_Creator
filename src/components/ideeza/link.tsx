"use client";

// IDEEZA Design System — A03 Link
// Converted from Figma (node 607:928). Text link with optional trailing icon.
// Color: brand / neutral / inverse / error · Size: sm / md / lg ·
// States: default / hover (underline) / focus (ring) / disabled. Token-driven.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const linkVariants = cva(
  "inline-flex items-center gap-[var(--spacing-2)] underline-offset-[3px] outline-none transition-colors cursor-pointer rounded-[var(--radius-xs)] focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] hover:underline aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:no-underline",
  {
    variants: {
      color: {
        brand: "text-[color:var(--color-text-brand)] hover:text-[color:var(--color-violet-700,var(--color-text-brand))]",
        neutral: "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
        inverse: "text-[color:var(--color-text-on-brand)] hover:opacity-90",
        error: "text-[color:var(--color-text-error)] hover:brightness-90",
      },
      size: {
        sm: "text-[length:var(--font-size-xs)]",
        md: "text-[length:var(--font-size-sm)]",
        lg: "text-[length:var(--font-size-md)]",
      },
    },
    defaultVariants: { color: "brand", size: "md" },
  },
);

export interface LinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "color">,
    VariantProps<typeof linkVariants> {
  iconTrailing?: React.ReactNode;
  disabled?: boolean;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, color, size, iconTrailing, disabled, children, onClick, ...props }, ref) => (
    <a
      ref={ref}
      aria-disabled={disabled || undefined}
      onClick={disabled ? (e) => e.preventDefault() : onClick}
      className={cn(linkVariants({ color, size }), className)}
      {...props}
    >
      {children}
      {iconTrailing && <span className="inline-flex shrink-0 size-[1em] items-center justify-center">{iconTrailing}</span>}
    </a>
  ),
);
Link.displayName = "Link";

export { linkVariants };
