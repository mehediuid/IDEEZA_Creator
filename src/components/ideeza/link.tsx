"use client";

// IDEEZA Design System — A03 Link
// Converted from Figma (node 607:928). Text link with optional trailing icon.
// Color: brand / neutral / inverse / error · Size: sm 12/16, md 14/20,
// lg 16/24, Medium · States as A03: hover underlines (brand and error also
// step to their hover ink), focus is the 3 px halo outside on radius sm,
// disabled takes the disabled ink. Token-driven.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const linkVariants = cva(
  "inline-flex items-center gap-[var(--spacing-2)] font-medium no-underline hover:underline outline-none transition-colors cursor-pointer rounded-[var(--radius-sm)] focus-visible:shadow-focus-brand aria-disabled:cursor-not-allowed aria-disabled:no-underline aria-disabled:text-[color:var(--color-text-disabled)]",
  {
    variants: {
      color: {
        brand: "text-[color:var(--color-text-brand)] hover:text-[color:var(--color-text-brand-hover)]",
        neutral: "text-[color:var(--color-text-primary)] hover:text-[color:var(--color-text-primary)]",
        inverse: "text-[color:var(--color-text-inverse)] hover:text-[color:var(--color-text-inverse)]",
        error: "text-[color:var(--color-text-error)] hover:text-[color:var(--color-text-error-hover)]",
      },
      size: {
        sm: "text-[length:var(--font-size-sm)] leading-xs",
        md: "text-[length:var(--font-size-md)] leading-md",
        lg: "text-[length:var(--font-size-lg)] leading-lg",
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
