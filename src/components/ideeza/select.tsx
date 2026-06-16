"use client";

// IDEEZA Design System — A06 Select
// Token-driven dropdown trigger: value + chevron, opens an options panel.
// Mirrors the Figma _Select item / _Select dropdown panel / _Chevron helpers.
// Closes on outside-click and Escape. Controlled via value/onChange.

import * as React from "react";
import { cn } from "@/lib/utils";

const SIZES: Record<string, string> = {
  sm: "px-[var(--spacing-4)] py-[var(--spacing-3)] text-[length:var(--font-size-sm)] rounded-[var(--radius-md)]",
  md: "px-[var(--spacing-6)] py-[var(--spacing-4)] text-[length:var(--font-size-sm)] rounded-[var(--radius-lg)]",
  lg: "px-[var(--spacing-6)] py-[var(--spacing-5)] text-[length:var(--font-size-md)] rounded-[var(--radius-lg)]",
};

type Size = keyof typeof SIZES;

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  value?: string;
  options?: SelectOption[];
  placeholder?: string;
  onChange?: (value: string) => void;
  size?: Size;
  minWidth?: number;
  disabled?: boolean;
  className?: string;
}

const Chevron = () => (
  <svg className="shrink-0" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth={2.2}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export function Select({ value, options = [], placeholder = "Select…", onChange, size = "md", minWidth, disabled, className }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative" style={{ minWidth }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-[var(--spacing-5)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[color:var(--color-text-primary)] outline-none transition-colors hover:border-[var(--color-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] disabled:cursor-not-allowed disabled:opacity-50",
          SIZES[size],
          className,
        )}
      >
        <span className={cn("truncate", !selected && "text-[color:var(--color-text-tertiary)]")}>{selected ? selected.label : placeholder}</span>
        <Chevron />
      </button>
      {open && options.length > 0 && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[120] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] py-[var(--spacing-2)] shadow-[var(--elevation-5)]"
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <div
                key={o.value}
                onClick={() => {
                  onChange?.(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "cursor-pointer px-[var(--spacing-6)] py-[var(--spacing-3)] text-[length:var(--font-size-sm)] transition-colors hover:bg-[var(--color-bg-subtle)]",
                  active ? "bg-[var(--color-bg-brand-subtle)] text-[color:var(--color-text-brand)] font-[var(--font-weight-semibold)]" : "text-[color:var(--color-text-primary)]",
                )}
              >
                {o.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
