"use client";

// IDEEZA Design System — A08 Selection Control (Checkbox + Radio)
// Token-driven selection primitives. Checkbox is a square (radius-sm) with a
// check glyph; Radio is a circle with a filled dot. Both share size/state logic
// and theme via the IDEEZA tokens. Mirrors the Figma _Checkbox base / _Radio
// base helpers consumed by A08.

import * as React from "react";
import { cn } from "@/lib/utils";

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
}

export function Checkbox({ checked, onChange, size = "md", disabled, className }: CheckboxProps) {
  const s = SIZES[size];
  return (
    <span
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onChange}
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
}

export function Radio({ checked, onChange, size = "md", disabled, className }: RadioProps) {
  const s = SIZES[size];
  return (
    <span
      role="radio"
      aria-checked={checked}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onChange}
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
