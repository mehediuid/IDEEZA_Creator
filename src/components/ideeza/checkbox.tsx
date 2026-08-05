"use client";

// IDEEZA Design System — A08 Selection Control (Checkbox + Radio)
// Token-driven selection primitives. Checkbox is a square (radius-sm) with a
// check glyph; Radio is a circle with a filled dot. Both share size/state logic
// and theme via the IDEEZA tokens. Mirrors the Figma _Checkbox base / _Radio
// base helpers consumed by A08.

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

const SIZES: Record<string, { box: number; radius: number; glyph: number; dot: number }> = {
  sm: { box: 16, radius: 4, glyph: 10, dot: 8 },
  md: { box: 18, radius: 5, glyph: 11, dot: 9 },
  lg: { box: 22, radius: 6, glyph: 13, dot: 11 },
};

type Size = keyof typeof SIZES;

export interface CheckboxProps {
  checked: boolean;
  onChange?: () => void;
  size?: Size;
  disabled?: boolean;
  className?: string;
  /** The box is only the picture — a labelled control around it already
   *  carries `role="checkbox"`, and two nested checkbox roles announce the
   *  same state twice. */
  decorative?: boolean;
}

export function Checkbox({ checked, onChange, size = "md", disabled, className, decorative }: CheckboxProps) {
  const s = SIZES[size];
  return (
    <span
      role={decorative ? undefined : "checkbox"}
      aria-checked={decorative ? undefined : checked}
      aria-hidden={decorative || undefined}
      aria-disabled={decorative ? undefined : disabled}
      onClick={disabled ? undefined : onChange}
      {...keyProps(onChange, disabled, decorative)}
      className={cn("inline-flex items-center justify-center shrink-0 transition-colors", className)}
      style={{
        width: s.box,
        height: s.box,
        borderRadius: s.radius,
        border: `var(--border-width-1-5) solid ${checked ? "var(--color-violet-600)" : "var(--color-border-strong)"}`,
        background: checked ? "var(--color-violet-600)" : "var(--color-bg-surface)",
        opacity: disabled ? "var(--opacity-disabled, .4)" : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {checked && (
        <svg width={s.glyph} height={s.glyph} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-on-brand)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 6" />
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
      className={cn("inline-flex items-center justify-center shrink-0 transition-colors", className)}
      style={{
        width: s.box,
        height: s.box,
        borderRadius: "var(--radius-full)",
        border: `var(--border-width-1-5) solid ${checked ? "var(--color-violet-600)" : "var(--color-border-strong)"}`,
        opacity: disabled ? "var(--opacity-disabled, .4)" : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {checked && (
        <span style={{ width: s.dot, height: s.dot, borderRadius: "var(--radius-full)", background: "var(--color-violet-600)", display: "block" }} />
      )}
    </span>
  );
}
