"use client";

// IDEEZA Design System — A02 Icon Button
// Converted from Figma (node 167:1479). Square icon-only button for compact
// actions (close, edit, delete, more). Token-driven. radius-lg, icon = size/2.
// Hierarchy: primary/secondary/ghost/danger · Size: 32/36/40/44/48.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center shrink-0 rounded-[var(--radius-lg)] transition-[background-color,filter] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] disabled:cursor-not-allowed",
  {
    variants: {
      hierarchy: {
        primary:
          "bg-[var(--color-button-primary-bg)] text-[color:var(--color-button-primary-text)] hover:bg-[var(--color-button-primary-bg-hover)] active:bg-[var(--color-button-primary-bg-pressed)] disabled:bg-[var(--color-button-disabled-bg)] disabled:text-[color:var(--color-button-disabled-text)]",
        secondary:
          "bg-[var(--color-button-secondary-bg)] text-[color:var(--color-button-secondary-text)] border border-[var(--color-button-secondary-border)] hover:bg-[var(--color-bg-subtle)]",
        ghost:
          "bg-transparent text-[color:var(--color-icon-default)] hover:bg-[var(--color-button-ghost-bg-hover)]",
        danger:
          "bg-[var(--color-button-danger-bg)] text-[color:var(--color-button-danger-text)] hover:brightness-105 active:brightness-95",
      },
      size: {
        sm: "size-[32px]",
        md: "size-[36px]",
        lg: "size-[40px]",
        xl: "size-[44px]",
        "2xl": "size-[48px]",
      },
    },
    defaultVariants: { hierarchy: "ghost", size: "md" },
  },
);

const ICON_PX: Record<string, number> = { sm: 16, md: 18, lg: 20, xl: 22, "2xl": 24 };

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof iconButtonVariants> {
  /** The icon node (svg / <Icon/>). Rendered at size/2 per the design spec. */
  icon: React.ReactNode;
  "aria-label": string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, hierarchy, size = "md", icon, disabled, ...props }, ref) => {
    const px = ICON_PX[size ?? "md"];
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(iconButtonVariants({ hierarchy, size }), className)}
        {...props}
      >
        <span className="inline-flex items-center justify-center" style={{ width: px, height: px }}>
          {icon}
        </span>
      </button>
    );
  },
);
IconButton.displayName = "IconButton";

export { iconButtonVariants };
