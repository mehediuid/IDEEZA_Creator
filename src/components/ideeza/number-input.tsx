"use client";

// IDEEZA Design System — A12 Number Input
// Numeric field with −/+ stepper buttons. Token-driven; theme-aware. Mirrors
// Figma A12 (688:1756), Stepper=Plus-minus: the value on the left, then a
// [−][+] group of square radius/md buttons at the right, on the shared field
// ramp (sm 32 · md 36 · lg 40) with a 1.5 px input border, the focus border
// plus the 3 px halo, and Disabled as its own fill, edge and ink. Value is
// controlled (string, to preserve the prototype's free-text numeric fields);
// steppers clamp to optional min/max.

import * as React from "react";
import { cn } from "@/lib/utils";

// `pr` is the inset after the [+] button. Figma draws 10 at 32 and 36 (the
// field's padding-x) but 4 at 40; until that is settled lg keeps its
// padding-x, as the A12 description's ramp states.
const SIZES = {
  sm: { h: 32, radius: "var(--radius-lg)", px: "var(--spacing-5)", text: "text-[length:var(--font-size-md)] leading-md", btn: 24 },
  md: { h: 36, radius: "var(--radius-lg)", px: "var(--spacing-5)", text: "text-[length:var(--font-size-md)] leading-md", btn: 28 },
  lg: { h: 40, radius: "var(--radius-xl)", px: "var(--spacing-6)", text: "text-[length:var(--font-size-md)] leading-md", btn: 32 },
} as const;

type Size = keyof typeof SIZES;

export interface NumberInputProps {
  value: string;
  onChange?: (value: string) => void;
  step?: number;
  min?: number;
  max?: number;
  size?: Size;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  /** The field's name when no `<label htmlFor>` points at it — the −/+
   *  buttons are named, so the number between them has to be too. */
  ariaLabel?: string;
  ariaDescribedBy?: string;
  /** What the −/+ buttons step, for their names — "motor count" makes them
   *  "Decrease motor count" and "Increase motor count", so two steppers on
   *  one screen can be told apart by touch, out of context. */
  stepsWhat?: string;
  onBlur?: () => void;
}

export function NumberInput({
  value,
  onChange,
  step = 1,
  min,
  max,
  size = "md",
  disabled,
  placeholder,
  className,
  id,
  ariaLabel,
  ariaDescribedBy,
  stepsWhat,
  onBlur,
}: NumberInputProps) {
  const s = SIZES[size];
  // A half-typed value has no number to state; the field still says its
  // range.
  const now = value.trim() === "" ? NaN : Number(value);

  const bump = (dir: 1 | -1) => {
    const n = parseFloat(value);
    let next = (isNaN(n) ? 0 : n) + dir * step;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange?.(String(next));
  };

  // icon-stepper minus / plus: 16 px at 1.5 px, in icon/default in every state.
  const stepBtn = (dir: 1 | -1, glyph: string) => (
    <button
      type="button"
      tabIndex={-1}
      disabled={disabled}
      onClick={() => bump(dir)}
      aria-label={`${dir === 1 ? "Increase" : "Decrease"}${stepsWhat ? ` ${stepsWhat}` : ""}`}
      className="inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[color:var(--color-icon-default)] transition-colors enabled:hover:bg-[var(--color-bg-subtle)] disabled:cursor-not-allowed"
      style={{ width: s.btn, height: s.btn }}
    >
      <svg aria-hidden width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round">
        <path d={glyph} />
      </svg>
    </button>
  );

  return (
    <div
      className={cn(
        "flex items-center gap-[var(--spacing-4)] border-[length:var(--border-width-1-5)] border-solid transition-[border-color,box-shadow] [transition-duration:var(--motion-duration-fast)]",
        disabled
          ? "border-[var(--color-input-border-disabled)] bg-[var(--color-input-bg-disabled)]"
          : "border-[var(--color-input-border)] bg-[var(--color-input-bg)] focus-within:border-[var(--color-input-border-focus)] focus-within:shadow-focus-brand",
        className,
      )}
      style={{ height: s.h, borderRadius: s.radius, paddingRight: s.px }}
    >
      {/* A spinbutton, as a native number field is: a screen reader says the
          value with its range, not "edit text". */}
      <input
        id={id}
        role="spinbutton"
        inputMode="decimal"
        aria-valuenow={Number.isFinite(now) ? now : undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        // The steppers are not Tab stops, so the arrows step from the field
        // itself, as a native number field's do.
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          bump(e.key === "ArrowUp" ? 1 : -1);
        }}
        className={cn(
          "h-full w-full min-w-0 flex-1 bg-transparent text-left text-[color:var(--color-input-text)] outline-none font-[family-name:var(--font-family-body)] placeholder:text-[color:var(--color-input-placeholder)] disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)]",
          s.text,
        )}
        style={{ paddingLeft: s.px }}
      />
      <div className="flex shrink-0 items-center gap-[var(--spacing-1)]">
        {stepBtn(-1, "M5 12h14")}
        {stepBtn(1, "M12 5v14M5 12h14")}
      </div>
    </div>
  );
}
