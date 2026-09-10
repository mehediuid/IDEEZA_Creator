"use client";

// IDEEZA Design System — Segmented control
//
// Picks one *value* out of a small set: a unit (mm / mil), an angle, a mode.
// Deliberately a separate atom from `ButtonGroup`, which announces
// `role="tablist"` — right for switching which view you are looking at, wrong
// for choosing a value, because a screen reader then calls these tabs and
// arrow-key semantics differ. Same visual language, correct semantics:
// `role="radiogroup"` with `role="radio"` children.
//
// Use ButtonGroup when the choice changes *what is shown*; use Segmented when
// the choice *is* the data.

import * as React from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { h: 32, px: "var(--spacing-5)", text: "text-sm" },
  md: { h: 36, px: "var(--spacing-6)", text: "text-md" },
} as const;

export type SegmentedSize = keyof typeof SIZES;

export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

export interface SegmentedProps<T extends string> {
  /** Accessible name for the group — required, since the options alone rarely say what is being chosen. */
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  size?: SegmentedSize;
  disabled?: boolean;
  className?: string;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
  disabled,
  className,
}: SegmentedProps<T>) {
  const s = SIZES[size];
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)]",
        disabled && "opacity-[var(--opacity-disabled)]",
        className,
      )}
      style={{ borderWidth: "var(--border-width-1)", height: s.h }}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "cursor-pointer font-[family-name:var(--font-family-display)] font-medium leading-none outline-none",
              "transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-border-focus)]",
              "disabled:cursor-not-allowed",
              s.text,
              i > 0 && "border-l border-[var(--color-border-default)]",
              on
                ? "bg-[var(--color-bg-brand)] text-[color:var(--color-text-on-brand)]"
                : "bg-[var(--color-bg-surface)] text-[color:var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-raised)] hover:text-[color:var(--color-text-primary)]",
            )}
            style={{ paddingInline: s.px }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
