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
// Every state is Figma's _Button group segment (419:802), the same look as
// `ButtonGroup`: primary ink on the surface, the subtle fill on hover, brand
// fill with on-brand ink when chosen, the subtle fill with disabled ink when
// an option (or the whole group) is disabled, and the 3 px halo outside on
// focus. The group does not clip, so the halo shows whole; the end options
// take the group's inner corner instead, so no fill leaves the rounded edge.
// A disabled option stays in the row but the arrows skip it.

import * as React from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { h: "h-[32px]", px: "px-[var(--spacing-5)]", text: "text-sm leading-sm" },
  md: { h: "h-[36px]", px: "px-[var(--spacing-6)]", text: "text-md leading-md" },
} as const;

export type SegmentedSize = keyof typeof SIZES;

export interface SegmentedOption<T extends string> {
  /** Usually a word; a node when part of it is coloured (Plans' "Annual (save 20%)"). */
  label: React.ReactNode;
  value: T;
  disabled?: boolean;
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
  /** A required choice not yet made: the group reads invalid and names its error. */
  invalid?: boolean;
  describedBy?: string;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
  disabled,
  className,
  invalid,
  describedBy,
}: SegmentedProps<T>) {
  const s = SIZES[size];
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const off = (i: number) => !!(disabled || options[i]?.disabled);
  // The next enabled option from `from`, stepping `dir` and wrapping; -1 when
  // every option is disabled.
  const step = (from: number, dir: 1 | -1) => {
    const n = options.length;
    for (let k = 1; k <= n; k++) {
      const i = (((from + dir * k) % n) + n) % n;
      if (!off(i)) return i;
    }
    return -1;
  };
  // The chosen option is the one Tab stop; when nothing matches the value, or
  // the chosen one is disabled, the first enabled option after it, so the
  // group can always be reached and then arrowed.
  const chosen = options.findIndex((o) => o.value === value);
  const at = chosen >= 0 && !off(chosen) ? chosen : step(chosen, 1);

  const move = (i: number) => {
    if (i < 0) return;
    onChange(options[i].value);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(step(at, 1));
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(step(at, -1));
        break;
      case "Home":
        e.preventDefault();
        move(step(-1, 1));
        break;
      case "End":
        e.preventDefault();
        move(step(options.length, -1));
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex w-fit self-start rounded-[var(--radius-lg)] border",
        s.h,
        invalid ? "border-[var(--color-border-error)]" : "border-[var(--color-border-default)]",
        className,
      )}
      style={{ borderWidth: "var(--border-width-1)" }}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        const isOff = off(i);
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
            disabled={isOff}
            onClick={() => onChange(o.value)}
            className={cn(
              "cursor-pointer font-[family-name:var(--font-family-display)] font-medium outline-none",
              "transition-colors duration-fast focus-visible:relative focus-visible:shadow-focus-brand",
              "first:rounded-l-[calc(var(--radius-lg)_-_var(--border-width-1))] last:rounded-r-[calc(var(--radius-lg)_-_var(--border-width-1))]",
              s.text,
              s.px,
              i > 0 && "border-l border-solid border-[var(--color-border-default)]",
              isOff
                ? "cursor-not-allowed bg-[var(--color-bg-subtle)] text-[color:var(--color-text-disabled)]"
                : on
                  ? "bg-[var(--color-bg-brand)] text-[color:var(--color-text-on-brand)]"
                  : "bg-[var(--color-bg-surface)] text-[color:var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
