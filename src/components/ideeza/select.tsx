"use client";

// IDEEZA Design System — A06 Select
// Token-driven dropdown trigger: value + chevron, opens an options panel.
// Mirrors the Figma _Select item / _Select dropdown panel / _Chevron helpers.
// Controlled via value/onChange.
//
// It is a real listbox, not a painted one: the trigger is a `combobox` and the
// panel a `listbox` of `option`s, so a screen reader announces the control and
// how many choices it has. The options used to be `<div onClick>` with no role
// and no key handling — the value could only be changed with a mouse, which
// made every filter and form built on this component keyboard-dead.
// ArrowDown/Up move the active option (wrapping), Home/End jump to the ends,
// Enter/Space commit, Escape closes and returns focus to the trigger, Tab
// closes and moves on. Focus stays on the trigger and the active option is
// named by `aria-activedescendant`, the pattern that keeps typing and
// arrowing in one place.

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
  /** Names the control when no visible <label> does. */
  "aria-label"?: string;
  /** Id of the element that labels it, when one is on screen. */
  "aria-labelledby"?: string;
}

const Chevron = () => (
  <svg className="shrink-0" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth={2.2}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export function Select({
  value,
  options = [],
  placeholder = "Select…",
  onChange,
  size = "md",
  minWidth,
  disabled,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const selectedIndex = options.findIndex((o) => o.value === value);

  // Which option the keyboard is on. Opening starts from the current value, so
  // arrowing continues from where the user already is rather than the top.
  const [active, setActive] = React.useState(0);
  // useId, not a module counter: the ids have to match between the server
  // render and the client one, and a counter incremented during render is a
  // side effect that drifts as components re-render.
  const id = React.useId().replace(/:/g, "");

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Keep the active option in view when arrowing past the panel's edge.
  React.useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`#${id}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  const openAt = (i: number) => {
    setActive(Math.max(0, Math.min(options.length - 1, i)));
    setOpen(true);
  };
  const commit = (i: number) => {
    const o = options[i];
    if (o) onChange?.(o.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || !options.length) return;
    const last = options.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openAt(selectedIndex < 0 ? 0 : selectedIndex);
        else setActive((i) => (i >= last ? 0 : i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openAt(selectedIndex < 0 ? last : selectedIndex);
        else setActive((i) => (i <= 0 ? last : i - 1));
        break;
      case "Home":
        if (open) { e.preventDefault(); setActive(0); }
        break;
      case "End":
        if (open) { e.preventDefault(); setActive(last); }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) commit(active);
        else openAt(selectedIndex < 0 ? 0 : selectedIndex);
        break;
      case "Escape":
        if (open) { e.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
        break;
      case "Tab":
        // Tab leaves the control, so the panel must not linger over the page.
        if (open) setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={ref} className="relative" style={{ minWidth }}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex < 0 ? 0 : selectedIndex))}
        onKeyDown={onKeyDown}
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
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[120] max-h-[280px] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] py-[var(--spacing-2)] shadow-[var(--elevation-5)]"
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <div
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(i)}
                className={cn(
                  "cursor-pointer px-[var(--spacing-6)] py-[var(--spacing-3)] text-[length:var(--font-size-sm)] transition-colors",
                  // Hover and keyboard share one highlight, so arrowing looks
                  // like pointing; the committed value keeps the brand tint.
                  i === active && !isSelected && "bg-[var(--color-bg-subtle)]",
                  isSelected
                    ? "bg-[var(--color-bg-brand-subtle)] text-[color:var(--color-text-brand)] font-[var(--font-weight-semibold)]"
                    : "text-[color:var(--color-text-primary)]",
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
