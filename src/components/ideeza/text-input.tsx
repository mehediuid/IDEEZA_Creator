"use client";

// IDEEZA Design System — Text Input (+ Textarea)
//
// The field the DS was missing: every text field in the app was hand-rolled at
// its call site, so no two agreed on height, radius or focus treatment. Its own
// ramp is sm 32 · radius/lg · px 10 │ md 36 · radius/lg · px 10 │ lg 40 ·
// radius/xl · px 12 │ xl 44 · radius/xl · px 12, value type 14/20 up to lg and
// 16/24 at xl — shared, as of today, with A07 Search alone.
//
// It is **not** yet the system-wide field ramp, and this comment used to claim
// it was. A12 Number Input runs its own 30/38/44 on three sizes, and A06 Select
// has no fixed height at all — it sizes by padding — so a `size="md"` TextInput
// (36) beside a `size="md"` NumberInput (38) does not line up. Making the ramp
// true means editing those two atoms, which changes the height of every numeric
// field in the PCB modals and every Select in the editor; that is a design-system
// decision with a visual diff across the app, not a comment fix, so the comment
// is honest about the state of things until it is taken.
//
// `suffix` carries a unit adornment inside the field (mm · mil · °), which is
// what a dimension field needs — the unit belongs to the value, not to a
// separate label somewhere else in the form. It is drawn as quiet text inside
// the field, with no divider or fill: it labels the value, and anything with an
// edge and a background reads as a button you can press.

import * as React from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { h: 32, radius: "var(--radius-lg)", px: "var(--spacing-5)", text: "text-[length:var(--font-size-md)]", lh: "leading-md" },
  md: { h: 36, radius: "var(--radius-lg)", px: "var(--spacing-5)", text: "text-[length:var(--font-size-md)]", lh: "leading-md" },
  lg: { h: 40, radius: "var(--radius-xl)", px: "var(--spacing-6)", text: "text-[length:var(--font-size-md)]", lh: "leading-md" },
  xl: { h: 44, radius: "var(--radius-xl)", px: "var(--spacing-6)", text: "text-[length:var(--font-size-lg)]", lh: "leading-lg" },
} as const;

type Size = keyof typeof SIZES;

// The focus ring is a literal `0 0 0 3px` rather than an `--elevation-*`: the
// elevation scale is six drop shadows in rgba black, and none of them is a
// flat 3px ring in a theme colour — a focus ring is a different thing from a
// lift. A real token for it (`--ring-focus`) would be the right answer, and
// minting one is the design-system owner's call, not an agent's. Until then
// the same literal is written in Search, Select's menu and this field, so the
// three at least agree.
const shell = (invalid?: boolean, disabled?: boolean) =>
  cn(
    "flex items-stretch overflow-hidden border bg-[var(--color-input-bg)] transition-[border-color,box-shadow] duration-fast",
    disabled
      ? "cursor-not-allowed border-[var(--color-border-default)] bg-[var(--color-input-bg-disabled)]"
      : invalid
        ? "border-[var(--color-input-border-error)] focus-within:shadow-[0_0_0_3px_var(--color-bg-error-subtle)]"
        : "border-[var(--color-input-border)] hover:border-[var(--color-input-border-hover)] focus-within:border-[var(--color-input-border-focus)] focus-within:shadow-[0_0_0_3px_var(--color-bg-brand-subtle)]",
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
  return (
    <div
      className={cn(shell(invalid, disabled), containerClassName)}
      style={{ height: s.h, borderRadius: s.radius, borderWidth: "var(--border-width-1)" }}
    >
      <input
        ref={ref}
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={cn(field(s), className)}
        style={{ paddingInline: s.px }}
        {...props}
      />
      {suffix ? (
        <span
          aria-hidden
          className="inline-flex shrink-0 items-center pr-[var(--spacing-5)] font-[family-name:var(--font-family-mono)] text-[length:var(--font-size-sm)] text-[color:var(--color-text-tertiary)]"
        >
          {suffix}
        </span>
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
  return (
    <div
      className={cn(shell(invalid, disabled), containerClassName)}
      style={{ borderRadius: s.radius, borderWidth: "var(--border-width-1)" }}
    >
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        disabled={disabled}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={cn(field(s), "resize-y py-[var(--spacing-4)]", className)}
        style={{ paddingInline: s.px }}
        {...props}
      />
    </div>
  );
});
