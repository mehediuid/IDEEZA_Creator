"use client";

// IDEEZA Design System — A02 Icon Button
// Converted from Figma (node 167:1479). Square icon-only button for compact
// actions (close, edit, delete, more). Token-driven; the icon is A02's 16 · 18
// · 20 · 22 · 24 and the corner radius/md · lg · lg · xl · xl by size.
// Hierarchy: primary/secondary/ghost/danger · Size: 32/36/40/44/48.
// States follow A02: primary steps its fill; secondary keeps its look on
// hover and press; ghost fills on hover and fades to 80 % pressed; danger
// keeps its red and fades the whole button, 88 % on hover and 76 % pressed;
// disabled is the disabled fill and ink at 50 %, for every hierarchy.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center shrink-0 transition-[background-color,opacity] [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-easing-standard)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[var(--color-button-disabled-bg)] disabled:text-[color:var(--color-button-disabled-text)] disabled:opacity-50",
  {
    variants: {
      hierarchy: {
        primary:
          "bg-[var(--color-button-primary-bg)] text-[color:var(--color-button-primary-text)] hover:bg-[var(--color-button-primary-bg-hover)] active:bg-[var(--color-button-primary-bg-pressed)]",
        secondary:
          "bg-[var(--color-button-secondary-bg)] text-[color:var(--color-button-secondary-text)] border-[length:var(--border-width-1-5)] border-solid border-[var(--color-button-secondary-border)]",
        ghost:
          "bg-transparent text-[color:var(--color-button-ghost-text)] hover:bg-[var(--color-button-ghost-bg-hover)] active:bg-transparent active:opacity-80",
        danger:
          "bg-[var(--color-button-danger-bg)] text-[color:var(--color-button-danger-text)] hover:opacity-[0.88] active:opacity-[0.76]",
      },
      size: {
        sm: "size-[32px] rounded-[var(--radius-md)]",
        md: "size-[36px] rounded-[var(--radius-lg)]",
        lg: "size-[40px] rounded-[var(--radius-lg)]",
        xl: "size-[44px] rounded-[var(--radius-xl)]",
        "2xl": "size-[48px] rounded-[var(--radius-xl)]",
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
        <span className="inline-flex items-center justify-center [&_svg]:size-full" style={{ width: px, height: px }}>
          {icon}
        </span>
      </button>
    );
  },
);
IconButton.displayName = "IconButton";

export { iconButtonVariants };
