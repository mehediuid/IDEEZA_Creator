"use client";

// IDEEZA Design System — A15 Button Group
// Converted from Figma (node 422:928). Connected segmented control: 2–5 items,
// one selected at a time. Sizes MD/LG/XL. Token-driven; selected segment fills
// brand-subtle with brand text, others stay neutral. Mirrors _Button group
// segment.

import * as React from "react";
import { cn } from "@/lib/utils";

const SIZES: Record<string, string> = {
  md: "px-[var(--spacing-6)] py-[var(--spacing-4)] text-[length:var(--font-size-sm)]",
  lg: "px-[var(--spacing-7)] py-[var(--spacing-5)] text-[length:var(--font-size-md)]",
  xl: "px-[var(--spacing-8)] py-[var(--spacing-6)] text-[length:var(--font-size-md)]",
};

type Size = keyof typeof SIZES;

export interface ButtonGroupItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
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
      className={cn(
        "inline-flex overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)]",
        className,
      )}
    >
      {items.map((it, i) => {
        const selected = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange?.(it.value)}
            className={cn(
              "inline-flex items-center justify-center gap-[var(--spacing-3)] font-[var(--font-weight-semibold)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-border-focus)]",
              SIZES[size],
              i > 0 && "border-l border-[var(--color-border-default)]",
              selected
                ? "bg-[var(--color-bg-brand-subtle)] text-[color:var(--color-text-brand)]"
                : "bg-[var(--color-bg-surface)] text-[color:var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]",
            )}
          >
            {it.icon && <span className="inline-flex shrink-0 size-[16px] items-center justify-center">{it.icon}</span>}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
