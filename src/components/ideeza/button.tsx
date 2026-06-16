"use client";

// IDEEZA Design System — A01 Button
// Converted from Figma (node 172:1679). Token-driven via the IDEEZA design
// tokens: semantic button colors, --spacing-*, --radius-*, --font-* scales.
// Variants: hierarchy (primary/secondary/ghost/danger) × size (sm–2xl) +
// icon leading/trailing, loading, disabled. Light/dark ready through tokens.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap select-none font-[family-name:var(--font-family-display)] font-[var(--font-weight-semibold)] tracking-[0.1px] leading-[16px] transition-[background-color,filter,box-shadow] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] disabled:cursor-not-allowed",
  {
    variants: {
      hierarchy: {
        primary:
          "bg-[var(--color-button-primary-bg)] text-[color:var(--color-button-primary-text)] hover:bg-[var(--color-button-primary-bg-hover)] active:bg-[var(--color-button-primary-bg-pressed)] disabled:bg-[var(--color-button-disabled-bg)] disabled:text-[color:var(--color-button-disabled-text)]",
        secondary:
          "bg-[var(--color-button-secondary-bg)] text-[color:var(--color-button-secondary-text)] border border-[var(--color-button-secondary-border)] hover:bg-[var(--color-bg-subtle)] disabled:text-[color:var(--color-button-disabled-text)]",
        ghost:
          "bg-transparent text-[color:var(--color-button-ghost-text)] hover:bg-[var(--color-button-ghost-bg-hover)] disabled:text-[color:var(--color-button-disabled-text)]",
        danger:
          "bg-[var(--color-button-danger-bg)] text-[color:var(--color-button-danger-text)] hover:brightness-105 active:brightness-95",
      },
      size: {
        sm: "gap-[var(--spacing-2)] px-[var(--spacing-5)] py-[var(--spacing-4)] rounded-[var(--radius-sm)] text-[length:var(--font-size-xs)]",
        md: "gap-[var(--spacing-3)] px-[var(--spacing-6)] py-[var(--spacing-5)] rounded-[var(--radius-md)] text-[length:var(--font-size-sm)]",
        lg: "gap-[var(--spacing-3)] px-[var(--spacing-7)] py-[var(--spacing-6)] rounded-[var(--radius-lg)] text-[length:var(--font-size-md)]",
        xl: "gap-[var(--spacing-3)] px-[var(--spacing-8)] py-[var(--spacing-7)] rounded-[var(--radius-lg)] text-[length:var(--font-size-md)]",
        "2xl": "gap-[var(--spacing-4)] px-[var(--spacing-10)] py-[var(--spacing-8)] rounded-[var(--radius-lg)] text-[length:var(--font-size-lg)]",
      },
      iconOnly: {
        true: "px-0 py-0 aspect-square",
        false: "",
      },
    },
    compoundVariants: [
      { iconOnly: true, size: "sm", class: "size-[32px]" },
      { iconOnly: true, size: "md", class: "size-[36px]" },
      { iconOnly: true, size: "lg", class: "size-[40px]" },
      { iconOnly: true, size: "xl", class: "size-[44px]" },
      { iconOnly: true, size: "2xl", class: "size-[48px]" },
    ],
    defaultVariants: { hierarchy: "primary", size: "md", iconOnly: false },
  },
);

const Spinner = () => (
  <svg
    className="animate-spin size-[16px] shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof buttonVariants> {
  label?: string;
  iconLeading?: React.ReactNode;
  iconTrailing?: React.ReactNode;
  loading?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      hierarchy,
      size,
      iconOnly,
      label,
      iconLeading,
      iconTrailing,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const content = label ?? children;
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ hierarchy, size, iconOnly }), className)}
        {...props}
      >
        {loading ? (
          <Spinner />
        ) : (
          <>
            {iconLeading && (
              <span className="inline-flex shrink-0 size-[16px] items-center justify-center">
                {iconLeading}
              </span>
            )}
            {!iconOnly && content}
            {iconTrailing && (
              <span className="inline-flex shrink-0 size-[16px] items-center justify-center">
                {iconTrailing}
              </span>
            )}
            {iconOnly && content}
          </>
        )}
      </button>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
