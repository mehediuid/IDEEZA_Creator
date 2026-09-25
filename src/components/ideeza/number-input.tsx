"use client";

// IDEEZA Design System — A12 Number Input
// Numeric field with −/+ stepper buttons. Token-driven; theme-aware. Mirrors the
// Figma _Stepper icon helper. Value is controlled (string, to preserve the
// prototype's free-text numeric fields); steppers clamp to optional min/max.

import * as React from "react";
import { cn } from "@/lib/utils";

const SIZES: Record<string, { h: number; text: string; btn: number }> = {
  sm: { h: 30, text: "text-[length:var(--font-size-sm)]", btn: 26 },
  md: { h: 38, text: "text-[length:var(--font-size-md)]", btn: 30 },
  lg: { h: 44, text: "text-[length:var(--font-size-md)]", btn: 34 },
};

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

  const stepBtn = (dir: 1 | -1, glyph: string) => (
    <button
      type="button"
      tabIndex={-1}
      disabled={disabled}
      onClick={() => bump(dir)}
      aria-label={`${dir === 1 ? "Increase" : "Decrease"}${stepsWhat ? ` ${stepsWhat}` : ""}`}
      className="inline-flex items-center justify-center text-[color:var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
      style={{ width: s.btn, height: "100%", flex: "0 0 auto" }}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
        <path d={glyph} />
      </svg>
    </button>
  );

  return (
    <div
      className={cn(
        "flex items-stretch overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] transition-colors focus-within:border-[var(--color-border-focus)]",
        className,
      )}
      style={{ height: s.h }}
    >
      {stepBtn(-1, "M6 12h12")}
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
          "w-full min-w-0 flex-1 border-x border-[var(--color-border-subtle)] bg-transparent px-[var(--spacing-4)] text-center text-[color:var(--color-text-primary)] outline-none font-[family-name:var(--font-family-body)]",
          s.text,
        )}
      />
      {stepBtn(1, "M12 6v12M6 12h12")}
    </div>
  );
}
