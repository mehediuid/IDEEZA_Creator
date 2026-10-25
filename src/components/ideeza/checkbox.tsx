"use client";

// IDEEZA Design System — A08 Selection Control (Checkbox + Radio)
// Token-driven selection primitives. Checkbox is a rounded square with a
// check (or, indeterminate, a minus); Radio is a circle with a filled dot.
// Both share size/state logic and theme via the IDEEZA tokens. Mirrors the
// Figma _Checkbox base (367:698) / _Radio base (368:690) helpers consumed by
// A08: sm 20 and md 24, a 2 px input edge over the input fill, the hover edge
// and fill steps, the 3 px focus halo outside, and Disabled as its own edge,
// fill and glyph colours rather than a faded control.

import * as React from "react";
import { cn } from "@/lib/utils";

/** A control that carries `role="checkbox"`/`"radio"` must be reachable: Tab
 *  gets to it and Space/Enter activates it. Without this the box was mouse-only
 *  while announcing itself as a control. */
function keyProps(onChange?: () => void, disabled?: boolean, decorative?: boolean) {
  if (decorative || disabled || !onChange) return {};
  return {
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(); }
    },
  };
}

// Figma's own glyph vectors, in the box's coordinates: sm's check is 10×8 at a
// 2 px stroke, md's 12×9.5 at 2.5 px; the minus is 10 / 12 wide. The svg is
// the box's full size, centred over its edge, so the numbers land as drawn.
// `lg` is code-only (Figma has sm and md) and draws md's glyphs scaled.
const GLYPHS = {
  20: { check: "M5 10.5l3.5 3.5L15 6", minus: "M5 10h10", stroke: 2 },
  24: { check: "M6 12.5l4 4L18 7", minus: "M6 12h12", stroke: 2.5 },
} as const;

const SIZES: Record<string, { box: number; radius: string | number; grid: keyof typeof GLYPHS; dot: number }> = {
  sm: { box: 20, radius: "var(--radius-md)", grid: 20, dot: 8 },
  md: { box: 24, radius: "var(--radius-lg)", grid: 24, dot: 10 },
  lg: { box: 22, radius: 6, grid: 24, dot: 11 },
};

type Size = keyof typeof SIZES;

const BOX = "inline-flex items-center justify-center shrink-0 border-[length:var(--border-width-2)] border-solid outline-none transition-colors focus-visible:shadow-focus-brand";

export interface CheckboxProps {
  checked: boolean;
  /** Some but not all of what it stands for is on: a minus, announced as
   *  "mixed". Takes precedence over `checked` for the picture. */
  indeterminate?: boolean;
  onChange?: () => void;
  size?: Size;
  disabled?: boolean;
  className?: string;
  /** The box is only the picture — a labelled control around it already
   *  carries `role="checkbox"`, and two nested checkbox roles announce the
   *  same state twice. */
  decorative?: boolean;
}

export function Checkbox({ checked, indeterminate, onChange, size = "md", disabled, className, decorative }: CheckboxProps) {
  const s = SIZES[size];
  const g = GLYPHS[s.grid];
  const on = checked || indeterminate;
  return (
    <span
      role={decorative ? undefined : "checkbox"}
      aria-checked={decorative ? undefined : indeterminate ? "mixed" : checked}
      aria-hidden={decorative || undefined}
      aria-disabled={decorative ? undefined : disabled}
      onClick={disabled ? undefined : onChange}
      {...keyProps(onChange, disabled, decorative)}
      className={cn(
        BOX,
        disabled
          ? cn(
              "cursor-not-allowed",
              on
                ? "border-[var(--color-input-bg-disabled)] bg-[var(--color-input-bg-disabled)]"
                : "border-[var(--color-input-border-disabled)] bg-[var(--color-input-bg)]",
            )
          : cn(
              "cursor-pointer",
              on
                ? "border-[var(--color-bg-brand)] bg-[var(--color-bg-brand)] hover:border-[var(--color-bg-brand-hover)] hover:bg-[var(--color-bg-brand-hover)]"
                : "border-[var(--color-input-border)] bg-[var(--color-input-bg)] hover:border-[var(--color-input-border-hover)]",
            ),
        className,
      )}
      style={{ width: s.box, height: s.box, borderRadius: s.radius }}
    >
      {on && (
        <svg
          aria-hidden
          className="max-w-none shrink-0"
          width={s.box}
          height={s.box}
          viewBox={`0 0 ${s.grid} ${s.grid}`}
          fill="none"
          stroke={disabled ? "var(--color-icon-disabled)" : "var(--color-icon-on-brand)"}
          strokeWidth={g.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={indeterminate ? g.minus : g.check} />
        </svg>
      )}
    </span>
  );
}

export interface RadioProps {
  checked: boolean;
  onChange?: () => void;
  size?: Size;
  disabled?: boolean;
  className?: string;
  /** The dot is only the picture — the labelled row around it owns the role. */
  decorative?: boolean;
}

export function Radio({ checked, onChange, size = "md", disabled, className, decorative }: RadioProps) {
  const s = SIZES[size];
  return (
    <span
      role={decorative ? undefined : "radio"}
      aria-checked={decorative ? undefined : checked}
      aria-hidden={decorative || undefined}
      aria-disabled={decorative ? undefined : disabled}
      onClick={disabled ? undefined : onChange}
      {...keyProps(onChange, disabled, decorative)}
      className={cn(
        BOX,
        "group rounded-[var(--radius-full)] bg-[var(--color-input-bg)]",
        disabled
          ? "cursor-not-allowed border-[var(--color-input-border-disabled)]"
          : cn(
              "cursor-pointer",
              checked
                ? "border-[var(--color-bg-brand)] hover:border-[var(--color-bg-brand-hover)]"
                : "border-[var(--color-input-border)] hover:border-[var(--color-input-border-hover)]",
            ),
        className,
      )}
      style={{ width: s.box, height: s.box }}
    >
      {checked && (
        <span
          className={cn(
            "block shrink-0 rounded-[var(--radius-full)] transition-colors",
            disabled ? "bg-[var(--color-input-bg-disabled)]" : "bg-[var(--color-bg-brand)] group-hover:bg-[var(--color-bg-brand-hover)]",
          )}
          style={{ width: s.dot, height: s.dot }}
        />
      )}
    </span>
  );
}
