"use client";

// IDEEZA Design System — A01 Button
// Converted from Figma (node 172:1679). Token-driven via the IDEEZA design
// tokens: semantic button colors, --spacing-*, --radius-*, --font-* scales.
// Variants: hierarchy (primary/secondary/ghost/danger/tonal/outline-brand) × size (sm–2xl) +
// icon leading/trailing, loading, disabled. Light/dark ready through tokens.
//
// The focus ring's 2 px offset gap is the surface colour, not the page's:
// most filled Buttons sit in dialogs, panels and cards (bg-surface), where a
// page-coloured gap showed as a darker band in dark. A caller on the bare
// page can pass its own `ring-offset-bg-page`.
//
// Every hierarchy draws A01's 1.5 px secondary stroke as a border —
// transparent unless it is secondary — so a primary beside a secondary is the
// same size.
//
// Each size states its A01 height (SM 32 · MD 36 · LG 40 · XL 44 · 2XL 48)
// instead of building it from padding: Figma's stroke sits inside the frame,
// the CSS border adds to the box, and `cn` drops any line height written
// before the size's `text-[length:…]`. For the same reason the side padding
// is A01's (12 · 14 · 16 · 20 · 24) less the border, so the width matches
// Figma too. Type is A01's Label style per size (MD · LG · LG · XL · XL);
// the line height sits after the font size.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap select-none font-[family-name:var(--font-family-display)] font-[var(--font-weight-semibold)] tracking-wide transition-[background-color,filter,box-shadow] [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-easing-standard)] cursor-pointer outline-none ring-offset-bg-surface focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-border-focus)] disabled:cursor-not-allowed",
  {
    variants: {
      hierarchy: {
        primary:
          "border-[length:var(--border-width-1-5)] border-solid border-transparent bg-[var(--color-button-primary-bg)] text-[color:var(--color-button-primary-text)] hover:bg-[var(--color-button-primary-bg-hover)] active:bg-[var(--color-button-primary-bg-pressed)] disabled:bg-[var(--color-button-disabled-bg)] disabled:text-[color:var(--color-button-disabled-text)]",
        secondary:
          "bg-[var(--color-button-secondary-bg)] text-[color:var(--color-button-secondary-text)] border-[length:var(--border-width-1-5)] border-solid border-[var(--color-button-secondary-border)] hover:bg-[var(--color-bg-subtle)] disabled:text-[color:var(--color-button-disabled-text)]",
        ghost:
          "border-[length:var(--border-width-1-5)] border-solid border-transparent bg-transparent text-[color:var(--color-button-ghost-text)] hover:bg-[var(--color-button-ghost-bg-hover)] disabled:text-[color:var(--color-button-disabled-text)]",
        danger:
          "border-[length:var(--border-width-1-5)] border-solid border-transparent bg-[var(--color-button-danger-bg)] text-[color:var(--color-button-danger-text)] hover:bg-[var(--color-button-danger-bg-hover)] active:bg-[var(--color-button-danger-bg-pressed)] disabled:bg-[var(--color-button-disabled-bg)] disabled:text-[color:var(--color-button-disabled-text)]",
        // DS Hierarchy=Tonal (3288:640) and Outline brand (3289:700).
        tonal:
          "border-[length:var(--border-width-1-5)] border-solid border-transparent bg-[var(--color-button-tonal-bg)] text-[color:var(--color-button-tonal-text)] hover:bg-[var(--color-button-tonal-bg-hover)] active:bg-[var(--color-button-tonal-bg-pressed)] disabled:bg-[var(--color-button-disabled-bg)] disabled:text-[color:var(--color-button-disabled-text)]",
        "outline-brand":
          "border-[length:var(--border-width-1-5)] border-solid border-[var(--color-border-brand)] bg-transparent text-[color:var(--color-text-brand)] hover:bg-[var(--color-bg-brand-subtle)] disabled:border-[var(--color-border-default)] disabled:text-[color:var(--color-button-disabled-text)]",
      },
      size: {
        sm: "h-[32px] gap-[var(--spacing-3)] px-[calc(var(--spacing-6)_-_var(--border-width-1-5))] rounded-[var(--radius-lg)] text-[length:var(--font-size-sm)] leading-xs",
        md: "h-[36px] gap-[var(--spacing-3)] px-[calc(var(--spacing-7)_-_var(--border-width-1-5))] rounded-[var(--radius-lg)] text-[length:var(--font-size-md)] leading-md",
        lg: "h-[40px] gap-[var(--spacing-3)] px-[calc(var(--spacing-8)_-_var(--border-width-1-5))] rounded-[var(--radius-xl)] text-[length:var(--font-size-md)] leading-md",
        xl: "h-[44px] gap-[var(--spacing-4)] px-[calc(var(--spacing-10)_-_var(--border-width-1-5))] rounded-[var(--radius-xl)] text-[length:var(--font-size-lg)] leading-lg",
        "2xl": "h-[48px] gap-[var(--spacing-4)] px-[calc(var(--spacing-12)_-_var(--border-width-1-5))] rounded-[var(--radius-2xl)] text-[length:var(--font-size-lg)] leading-lg",
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
      onClick,
      ...props
    },
    ref,
  ) => {
    const content = label ?? children;
    // While loading the button stays focusable (a native `disabled` would drop the keyboard
    // focus to the page): it says it is busy and ignores presses until the work is done.
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(buttonVariants({ hierarchy, size, iconOnly }), loading && "cursor-progress", className)}
        {...props}
        aria-busy={loading || undefined}
        aria-disabled={loading || props["aria-disabled"] || undefined}
        onClick={loading ? (e) => e.preventDefault() : onClick}
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
