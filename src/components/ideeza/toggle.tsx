"use client";

// IDEEZA Design System — A10 Toggle (iOS-style switch)
// Token-driven on/off switch. Track fills brand on, the input edge colour off;
// the knob slides via transform. Sizes are A10's own (Figma _Toggle base
// 315:683): SM 36×20 and MD 44×24, a 2px inset round the knob. LG is ours, for
// the rare big switch. Hover steps the track, focus is the 3 px halo outside,
// and Disabled is its own track colour rather than a faded control.

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
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-[var(--radius-full)] outline-none transition-[background-color,box-shadow] [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-easing-standard)] focus-visible:shadow-focus-brand",
        disabled
          ? "cursor-not-allowed bg-[var(--color-input-bg-disabled)]"
          : checked
            ? "cursor-pointer bg-[var(--color-bg-brand)] hover:bg-[var(--color-bg-brand-hover)]"
            : "cursor-pointer bg-[var(--color-input-border)] hover:bg-[var(--color-input-border-hover)]",
        className,
      )}
      style={{ width: s.w, height: s.h, padding: s.pad }}
      {...props}
    >
      <span
        className="rounded-[var(--radius-full)] bg-[var(--color-bg-surface)] shadow-toggle-thumb transition-transform [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-easing-standard)]"
        style={{
          width: s.knob,
          height: s.knob,
          transform: checked ? `translateX(${s.w - s.knob - s.pad * 2}px)` : "translateX(0)",
        }}
      />
    </button>
  );
}
