"use client";

// IDEEZA Design System — A10 Toggle (iOS-style switch)
// Token-driven on/off switch. Track fills brand on, neutral off; the knob
// slides via transform. Sizes are A10's own (Figma 45367:717): SM 36×20 and
// MD 44×24, a 2px inset round the knob. LG is ours, for the rare big switch.

import * as React from "react";
import { cn } from "@/lib/utils";

const SIZES: Record<string, { w: number; h: number; knob: number; pad: number }> = {
  sm: { w: 36, h: 20, knob: 16, pad: 2 },
  md: { w: 44, h: 24, knob: 20, pad: 2 },
  lg: { w: 48, h: 28, knob: 23, pad: 2.5 },
};

type Size = keyof typeof SIZES;

export interface ToggleProps {
  checked: boolean;
  onChange?: () => void;
  size?: Size;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function Toggle({ checked, onChange, size = "md", disabled, className, ...props }: ToggleProps) {
  const s = SIZES[size];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn("relative inline-flex items-center shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] disabled:cursor-not-allowed", className)}
      style={{
        width: s.w,
        height: s.h,
        borderRadius: "var(--radius-full)",
        background: checked ? "var(--color-violet-600)" : "var(--color-border-strong)",
        padding: s.pad,
        transition: "background-color var(--motion-duration-fast, .15s) var(--motion-easing-standard, ease)",
        opacity: disabled ? "var(--opacity-disabled, .4)" : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      {...props}
    >
      <span
        style={{
          width: s.knob,
          height: s.knob,
          borderRadius: "var(--radius-full)",
          background: "var(--color-bg-surface)",
          boxShadow: "var(--elevation-2, 0 1px 3px rgba(0,0,0,.25))",
          transform: checked ? `translateX(${s.w - s.knob - s.pad * 2}px)` : "translateX(0)",
          transition: "transform var(--motion-duration-fast, .15s) var(--motion-easing-standard, ease)",
        }}
      />
    </button>
  );
}
