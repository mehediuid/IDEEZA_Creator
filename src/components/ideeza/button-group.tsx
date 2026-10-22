"use client";

// IDEEZA Design System — A15 Button Group
// Converted from Figma (node 422:928). Connected segmented control: 2–5 items,
// one selected at a time. Sizes MD/LG/XL. Every state is _Button group segment
// (419:802): primary ink on the surface, the subtle fill on hover, brand fill
// with on-brand ink when selected, the subtle fill with disabled ink when
// disabled, and the 3 px halo outside on focus. The group does not clip, so
// the halo shows whole; the end segments take the group's inner corner
// instead, so no fill leaves the rounded edge.

import * as React from "react";
import { cn } from "@/lib/utils";

const SIZES: Record<string, { group: string; segment: string }> = {
  md: {
    group: "h-[36px] rounded-[var(--radius-lg)]",
    segment:
      "px-[var(--spacing-6)] text-[length:var(--font-size-md)] leading-md first:rounded-l-[calc(var(--radius-lg)_-_var(--border-width-1))] last:rounded-r-[calc(var(--radius-lg)_-_var(--border-width-1))]",
  },
  lg: {
    group: "h-[40px] rounded-[var(--radius-xl)]",
    segment:
      "px-[var(--spacing-7)] text-[length:var(--font-size-lg)] leading-lg first:rounded-l-[calc(var(--radius-xl)_-_var(--border-width-1))] last:rounded-r-[calc(var(--radius-xl)_-_var(--border-width-1))]",
  },
  xl: {
    group: "h-[44px] rounded-[var(--radius-xl)]",
    segment:
      "px-[var(--spacing-8)] text-[length:var(--font-size-lg)] leading-lg first:rounded-l-[calc(var(--radius-xl)_-_var(--border-width-1))] last:rounded-r-[calc(var(--radius-xl)_-_var(--border-width-1))]",
  },
};

type Size = keyof typeof SIZES;

export interface ButtonGroupItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface ButtonGroupProps {
  items: ButtonGroupItem[];
  value: string;
  onChange?: (value: string) => void;
  size?: Size;
  className?: string;
}

export function ButtonGroup({ items, value, onChange, size = "md", className }: ButtonGroupProps) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex border border-solid border-[var(--color-border-default)]", SIZES[size].group, className)}
    >
      {items.map((it, i) => {
        const selected = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={it.disabled}
            onClick={() => onChange?.(it.value)}
            className={cn(
              "inline-flex items-center justify-center gap-[var(--spacing-3)] font-medium outline-none transition-colors focus-visible:relative focus-visible:shadow-focus-brand",
              SIZES[size].segment,
              i > 0 && "border-l border-solid border-[var(--color-border-default)]",
              it.disabled
                ? "cursor-not-allowed bg-[var(--color-bg-subtle)] text-[color:var(--color-text-disabled)]"
                : selected
                  ? "bg-[var(--color-bg-brand)] text-[color:var(--color-text-on-brand)]"
                  : "bg-[var(--color-bg-surface)] text-[color:var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]",
            )}
          >
            {it.icon && (
              <span
                className={cn(
                  "inline-flex shrink-0 size-[16px] items-center justify-center",
                  it.disabled
                    ? "text-[color:var(--color-icon-disabled)]"
                    : selected && "text-[color:var(--color-icon-on-brand)]",
                )}
              >
                {it.icon}
              </span>
            )}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
