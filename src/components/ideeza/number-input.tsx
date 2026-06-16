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
}

export function NumberInput({ value, onChange, step = 1, min, max, size = "md", disabled, placeholder, className }: NumberInputProps) {
  const s = SIZES[size];

  const bump = (dir: 1 | -1) => {
    const n = parseFloat(value);
    let next = (isNaN(n) ? 0 : n) + dir * step;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange?.(String(next));
  };

  const StepBtn = ({ dir, glyph }: { dir: 1 | -1; glyph: string }) => (
    <button
      type="button"
      tabIndex={-1}
      disabled={disabled}
      onClick={() => bump(dir)}
      aria-label={dir === 1 ? "Increase" : "Decrease"}
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
      <StepBtn dir={-1} glyph="M6 12h12" />
      <input
        inputMode="decimal"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          "w-full min-w-0 flex-1 border-x border-[var(--color-border-subtle)] bg-transparent px-[var(--spacing-4)] text-center text-[color:var(--color-text-primary)] outline-none font-[family-name:var(--font-family-body)]",
          s.text,
        )}
      />
      <StepBtn dir={1} glyph="M12 6v12M6 12h12" />
    </div>
  );
}
