"use client";

// IDEEZA Design System — A01 Button
// Converted from Figma (node 172:1679). Token-driven via the IDEEZA design
// tokens: semantic button colors, --spacing-*, --radius-*, --font-* scales.
// Variants: hierarchy (primary/secondary/ghost/danger/tonal/outline-brand/
// inverse/ai) × size (sm–2xl) + icon leading/trailing, loading, disabled.
// Light/dark ready through tokens.
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
// the line height sits after the font size. Icon slots are 14 · 16 · 18 · 20 ·
// 24 beside a label and 16 · 18 · 20 · 22 · 24 alone; the spinner is 16.
//
// States follow A01 per hierarchy: the filled ones (primary, danger, AI) wear
// the Depth/Top-line accent; focus is A01's own treatment — a 3 px halo
// outside (on-fill, danger, inverse, brand), or the focus border on secondary;
// disabled is one look for all: the disabled fill and ink, no stroke, no
// depth. Outline brand's Figma focus repeats its default, so it takes the
// brand halo to stay visible.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap select-none font-[family-name:var(--font-family-display)] font-[var(--font-weight-semibold)] tracking-wide border-[length:var(--border-width-1-5)] border-solid border-transparent transition-[background-color,border-color,box-shadow] [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-easing-standard)] cursor-pointer outline-none disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[var(--color-button-disabled-bg)] disabled:bg-none disabled:text-[color:var(--color-button-disabled-text)] disabled:shadow-none disabled:[--btn-icon:var(--color-button-disabled-text)]",
  {
    variants: {
      hierarchy: {
        primary:
          "bg-[var(--color-button-primary-bg)] text-[color:var(--color-button-primary-text)] shadow-depth hover:bg-[var(--color-button-primary-bg-hover)] active:bg-[var(--color-button-primary-bg-pressed)] focus-visible:shadow-depth-focus-on-fill",
        secondary:
          "bg-[var(--color-button-secondary-bg)] text-[color:var(--color-button-secondary-text)] border-[var(--color-button-secondary-border)] hover:bg-[var(--color-button-secondary-bg-hover)] hover:border-[var(--color-button-secondary-border-hover)] active:bg-[var(--color-button-secondary-bg-pressed)] active:border-[var(--color-button-secondary-border-hover)] focus-visible:border-[var(--color-border-focus)]",
        ghost:
          "bg-transparent text-[color:var(--color-button-ghost-text)] hover:bg-[var(--color-button-ghost-bg-hover)] active:bg-[var(--color-bg-surface-raised)] focus-visible:shadow-focus-brand",
        danger:
          "bg-[var(--color-button-danger-bg)] text-[color:var(--color-button-danger-text)] shadow-depth hover:bg-[var(--color-button-danger-bg-hover)] active:bg-[var(--color-button-danger-bg-pressed)] focus-visible:shadow-depth-focus-danger",
        // DS Hierarchy=Tonal (3288:640) and Outline brand (3289:700).
        tonal:
          "bg-[var(--color-button-tonal-bg)] text-[color:var(--color-button-tonal-text)] [--btn-icon:var(--color-icon-brand)] hover:bg-[var(--color-button-tonal-bg-hover)] active:bg-[var(--color-button-tonal-bg-pressed)] focus-visible:shadow-focus-on-fill",
        "outline-brand":
          "border-[var(--color-border-brand)] bg-transparent text-[color:var(--color-text-brand)] [--btn-icon:var(--color-icon-brand)] hover:bg-[var(--color-button-outline-bg-hover)] active:bg-[var(--color-button-outline-bg-pressed)] focus-visible:shadow-focus-brand",
        inverse:
          "bg-[var(--color-button-inverse-bg)] text-[color:var(--color-button-inverse-text)] [--btn-icon:var(--color-icon-default)] hover:bg-[var(--color-button-inverse-bg-hover)] active:bg-[var(--color-button-inverse-bg-pressed)] focus-visible:shadow-focus-inverse",
        ai:
          "bg-[image:var(--gradient-button-ai)] text-[color:var(--color-text-on-brand)] shadow-depth hover:bg-[image:var(--gradient-button-ai-hover)] active:bg-[image:var(--gradient-button-ai-pressed)] focus-visible:shadow-depth-focus-on-fill",
      },
      size: {
        sm: "h-[32px] gap-[var(--spacing-3)] px-[calc(var(--spacing-6)_-_var(--border-width-1-5))] rounded-[var(--radius-lg)] text-[length:var(--font-size-sm)] leading-xs [--btn-icon-size:14px]",
        md: "h-[36px] gap-[var(--spacing-3)] px-[calc(var(--spacing-7)_-_var(--border-width-1-5))] rounded-[var(--radius-lg)] text-[length:var(--font-size-md)] leading-md [--btn-icon-size:16px]",
        lg: "h-[40px] gap-[var(--spacing-3)] px-[calc(var(--spacing-8)_-_var(--border-width-1-5))] rounded-[var(--radius-xl)] text-[length:var(--font-size-md)] leading-md [--btn-icon-size:18px]",
        xl: "h-[44px] gap-[var(--spacing-4)] px-[calc(var(--spacing-10)_-_var(--border-width-1-5))] rounded-[var(--radius-xl)] text-[length:var(--font-size-lg)] leading-lg [--btn-icon-size:20px]",
        "2xl": "h-[48px] gap-[var(--spacing-4)] px-[calc(var(--spacing-12)_-_var(--border-width-1-5))] rounded-[var(--radius-2xl)] text-[length:var(--font-size-lg)] leading-lg [--btn-icon-size:24px]",
      },
      iconOnly: {
        true: "px-0 py-0 aspect-square",
        false: "",
      },
    },
    compoundVariants: [
      { iconOnly: true, size: "sm", class: "size-[32px] [--btn-icon-size:16px]" },
      { iconOnly: true, size: "md", class: "size-[36px] [--btn-icon-size:18px]" },
      { iconOnly: true, size: "lg", class: "size-[40px] [--btn-icon-size:20px]" },
      { iconOnly: true, size: "xl", class: "size-[44px] [--btn-icon-size:22px]" },
      { iconOnly: true, size: "2xl", class: "size-[48px] [--btn-icon-size:24px]" },
    ],
    defaultVariants: { hierarchy: "primary", size: "md", iconOnly: false },
  },
);

/** An icon at the size's A01 slot, in the hierarchy's icon colour. */
const ICON_SLOT =
  "inline-flex shrink-0 size-[var(--btn-icon-size)] items-center justify-center text-[color:var(--btn-icon,currentColor)] [&_svg]:size-full";

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
            {iconLeading && <span className={ICON_SLOT}>{iconLeading}</span>}
            {!iconOnly && content}
            {iconTrailing && <span className={ICON_SLOT}>{iconTrailing}</span>}
            {iconOnly && <span className={ICON_SLOT}>{content}</span>}
          </>
        )}
      </button>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
