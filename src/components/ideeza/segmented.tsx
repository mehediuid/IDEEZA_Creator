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
//
// Announcing `radiogroup` obliges it to behave like one, and it did not: every
// option was a Tab stop and the arrow keys did nothing, so a screen reader
// called this a radio group and then handed over a row of buttons. It is the
// real contract now — the group is **one** Tab stop (roving tabindex, landing
// on the chosen option), Arrow Left/Right/Up/Down move the choice and wrap,
// Home/End jump to the ends. Selection follows focus, which is what a radio
// group does and what makes arrowing feel like turning a dial.
//
// The chosen option is painted the way the rest of the app paints a chosen
// segment — brand-subtle fill with brand text, as `ButtonGroup` and the PCB
// right panel's own segmented control already do. It used to fill solid brand,
// which made one state wear two looks inside one design system, and spent the
// accent on a control that is not the page's primary action.

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
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  // Nothing matching the value still leaves one Tab stop: the first option, so
  // the group can always be reached and then arrowed.
  const at = Math.max(0, options.findIndex((o) => o.value === value));

  const move = (to: number) => {
    const n = options.length;
    if (!n) return;
    const i = ((to % n) + n) % n;
    onChange(options[i].value);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(at + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(at - 1);
        break;
      case "Home":
        e.preventDefault();
        move(0);
        break;
      case "End":
        e.preventDefault();
        move(options.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex w-fit self-start overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)]",
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
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={i === at ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "cursor-pointer font-[family-name:var(--font-family-display)] font-medium leading-none outline-none",
              "transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-border-focus)]",
              "disabled:cursor-not-allowed",
              s.text,
              i > 0 && "border-l border-[var(--color-border-default)]",
              on
                ? "bg-[var(--color-bg-brand-subtle)] text-[color:var(--color-text-brand)]"
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
