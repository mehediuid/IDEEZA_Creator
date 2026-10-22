"use client";

// IDEEZA Design System — Text Input (+ Textarea)
//
// The field the DS was missing: every text field in the app was hand-rolled at
// its call site, so no two agreed on height, radius or focus treatment. It
// follows Figma Text Input (227:2517) on the shared field ramp, sm 32 ·
// radius/lg · px 10 │ md 36 · radius/lg · px 10 │ lg 40 · radius/xl · px 12 │
// xl 44 · radius/xl · px 12, value type 14/20 up to lg and 16/24 at xl — the
// same heights A06 Select, A07 Search and A12 Number Input use for the same
// names. The border is 1.5 px; focus is the focus border plus the 3 px halo,
// and an error keeps its border and takes the danger halo.
//
// `suffix` carries a unit adornment inside the field (mm · mil · USD), which
// is what a dimension or amount field needs — the unit belongs to the value.
// Text is Figma's Suffix Text addon: a bg/subtle segment at least 60 wide,
// the unit centred in it in text/secondary. Anything else (an icon) sits where
// Figma's right icon does, inside the field's padding.

import * as React from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { h: 32, radius: "var(--radius-lg)", px: "var(--spacing-5)", text: "text-[length:var(--font-size-md)]", lh: "leading-md" },
  md: { h: 36, radius: "var(--radius-lg)", px: "var(--spacing-5)", text: "text-[length:var(--font-size-md)]", lh: "leading-md" },
  lg: { h: 40, radius: "var(--radius-xl)", px: "var(--spacing-6)", text: "text-[length:var(--font-size-md)]", lh: "leading-md" },
  xl: { h: 44, radius: "var(--radius-xl)", px: "var(--spacing-6)", text: "text-[length:var(--font-size-lg)]", lh: "leading-lg" },
} as const;

type Size = keyof typeof SIZES;

// The border width is a style (as the height and radius are): `border-1-5`
// is dropped by tailwind-merge beside a border colour.
const shell = (invalid?: boolean, disabled?: boolean) =>
  cn(
    "flex items-stretch overflow-hidden border-solid bg-[var(--color-input-bg)] transition-[border-color,box-shadow] duration-fast",
    disabled
      ? "cursor-not-allowed border-[var(--color-input-border-disabled)] bg-[var(--color-input-bg-disabled)]"
      : invalid
        ? "border-[var(--color-input-border-error)] focus-within:shadow-focus-danger"
        : "border-[var(--color-input-border)] hover:border-[var(--color-input-border-hover)] focus-within:border-[var(--color-input-border-focus)] focus-within:shadow-focus-brand",
  );

const field = (s: (typeof SIZES)[Size]) =>
  cn(
    "min-w-0 flex-1 bg-transparent text-[color:var(--color-input-text)] outline-none font-[family-name:var(--font-family-body)]",
    "placeholder:text-[color:var(--color-input-placeholder)] disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)]",
    s.text,
    s.lh,
  );

export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "onChange"> {
  value?: string;
  onValueChange?: (value: string) => void;
  size?: Size;
  invalid?: boolean;
  /** Unit or action adornment rendered inside the field, on the right. */
  suffix?: React.ReactNode;
  containerClassName?: string;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { value, onValueChange, size = "md", invalid, suffix, disabled, className, containerClassName, ...props },
  ref,
) {
  const s = SIZES[size];
  const unit = typeof suffix === "string" || typeof suffix === "number";
  return (
    <div
      className={cn(shell(invalid, disabled), containerClassName)}
      style={{ height: s.h, borderRadius: s.radius, borderWidth: "var(--border-width-1-5)" }}
    >
      <input
        ref={ref}
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={cn(field(s), className)}
        // Figma keeps 8 between the value and whatever trails it.
        style={{ paddingLeft: s.px, paddingRight: suffix ? "var(--spacing-4)" : s.px }}
        {...props}
      />
      {suffix ? (
        unit ? (
          <span
            aria-hidden
            className={cn(
              "inline-flex min-w-[60px] shrink-0 items-center justify-center bg-[var(--color-bg-subtle)] pr-[var(--spacing-5)] font-[family-name:var(--font-family-body)]",
              disabled ? "text-[color:var(--color-input-placeholder)]" : "text-[color:var(--color-text-secondary)]",
              s.text,
              s.lh,
            )}
          >
            {suffix}
          </span>
        ) : (
          <span aria-hidden className="inline-flex shrink-0 items-center text-[color:var(--color-text-tertiary)]" style={{ paddingRight: s.px }}>
            {suffix}
          </span>
        )
      ) : null}
    </div>
  );
});

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  value?: string;
  onValueChange?: (value: string) => void;
  invalid?: boolean;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { value, onValueChange, invalid, disabled, rows = 4, className, containerClassName, ...props },
  ref,
) {
  const s = SIZES.md;
  // Figma Textarea (223:492) Rows=MD: radius/xl, 1.5 px border, padding 12 top,
  // 14 across, 8 below. Height stays the caller's `rows`.
  return (
    <div
      className={cn(shell(invalid, disabled), containerClassName)}
      style={{ borderRadius: "var(--radius-xl)", borderWidth: "var(--border-width-1-5)" }}
    >
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        disabled={disabled}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={cn(field(s), "resize-y pb-[var(--spacing-4)] pt-[var(--spacing-6)]", className)}
        style={{ paddingInline: "var(--spacing-7)" }}
        {...props}
      />
    </div>
  );
});
