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
//
// The panel portals to <body> with `position: fixed`, measured off the
// trigger and clamped into the viewport — the same treatment its sibling
// `SelectMenu` uses, and for the same reason: this control lives inside the
// package flow's `overflow-x-auto` tables and the PCB settings' scroll panes,
// where an absolutely positioned panel was cut down to a sliver by the first
// ancestor with `overflow` set. It flips above the trigger when the rows do
// not fit below, shifts left of the right edge, and closes when an ancestor
// scrolls or the window resizes, since the anchor it was measured from has
// then moved out from under it.

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const SIZES: Record<string, string> = {
  sm: "px-[var(--spacing-4)] py-[var(--spacing-3)] text-[length:var(--font-size-sm)] rounded-[var(--radius-md)]",
  md: "px-[var(--spacing-6)] py-[var(--spacing-4)] text-[length:var(--font-size-sm)] rounded-[var(--radius-lg)]",
  lg: "px-[var(--spacing-6)] py-[var(--spacing-5)] text-[length:var(--font-size-md)] rounded-[var(--radius-lg)]",
};

type Size = keyof typeof SIZES;

/** Viewport margin, trigger↔panel gap and the panel's own height cap. */
const MARGIN = 8;
const GAP = 4;
const MAX_PANEL_H = 280;

type Pos = { top: number; left: number; width: number; maxH: number; ready: boolean };

const clampTo = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

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
  const [pos, setPos] = React.useState<Pos | null>(null);
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

  const close = React.useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  // The panel now lives in a portal, so "outside" has two insides: the field
  // and the panel itself. An ancestor scroll or a resize moves the trigger the
  // panel was measured against, so the panel closes rather than hanging in the
  // wrong place.
  React.useEffect(() => {
    if (!open) return;
    const inside = (n: Node) => !!ref.current?.contains(n) || !!listRef.current?.contains(n);
    const onDoc = (e: MouseEvent) => {
      if (!inside(e.target as Node)) close();
    };
    const onScroll = (e: Event) => {
      if (listRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("mousedown", onDoc, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDoc, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open, close]);

  // Measure once the panel is mounted at the trigger's width, so the height
  // read back is the height these rows really take: prefer below, flip above
  // when they do not fit there and there is more room above, and cap to what
  // the viewport really leaves.
  React.useLayoutEffect(() => {
    if (!open || !pos || pos.ready) return;
    const t = triggerRef.current?.getBoundingClientRect();
    const el = listRef.current;
    if (!t || !el) return;
    const natural = Math.min(el.scrollHeight, MAX_PANEL_H);
    const below = window.innerHeight - t.bottom - GAP - MARGIN;
    const above = t.top - GAP - MARGIN;
    const flip = natural > below && above > below;
    const maxH = Math.max(64, Math.min(natural, flip ? above : below));
    const width = Math.min(t.width, window.innerWidth - MARGIN * 2);
    setPos({
      top: clampTo(flip ? t.top - GAP - maxH : t.bottom + GAP, MARGIN, Math.max(MARGIN, window.innerHeight - MARGIN - maxH)),
      left: clampTo(t.left, MARGIN, Math.max(MARGIN, window.innerWidth - MARGIN - width)),
      width,
      maxH,
      ready: true,
    });
  }, [open, pos]);

  // Keep the active option in view when arrowing past the panel's edge.
  React.useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`#${id}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  const openAt = (i: number) => {
    const r = triggerRef.current?.getBoundingClientRect();
    setActive(Math.max(0, Math.min(options.length - 1, i)));
    setPos({
      top: (r?.bottom ?? 0) + GAP,
      left: r?.left ?? 0,
      width: r?.width ?? 0,
      maxH: MAX_PANEL_H,
      ready: false,
    });
    setOpen(true);
  };
  const commit = (i: number) => {
    const o = options[i];
    if (o) onChange?.(o.value);
    close();
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
        if (open) { e.preventDefault(); close(); triggerRef.current?.focus(); }
        break;
      case "Tab":
        // Tab leaves the control, so the panel must not linger over the page.
        if (open) close();
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
        onClick={() => (open ? close() : openAt(selectedIndex < 0 ? 0 : selectedIndex))}
        onKeyDown={onKeyDown}
        className={cn(
          // `button { border: 0 }` in the reset drops the border style, so a
          // bordered button has to name it — without `border-solid` the width
          // and colour below drew nothing.
          "flex w-full items-center justify-between gap-[var(--spacing-5)] border-1 border-solid border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[color:var(--color-text-primary)] outline-none transition-colors hover:border-[var(--color-border-strong)] focus-visible:border-[var(--color-border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] disabled:cursor-not-allowed disabled:opacity-50",
          SIZES[size],
          className,
        )}
      >
        <span className={cn("truncate", !selected && "text-[color:var(--color-text-tertiary)]")}>{selected ? selected.label : placeholder}</span>
        <Chevron />
      </button>
      {open && options.length > 0 && typeof document !== "undefined" && createPortal(
        <div
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={ariaLabel}
          className="z-dropdown overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] py-[var(--spacing-2)] shadow-[var(--elevation-5)]"
          style={{
            position: "fixed",
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            width: pos?.width,
            maxHeight: pos?.maxH ?? MAX_PANEL_H,
            // Hidden, not unmounted, until it has been measured — the measure
            // needs the real rows on the page, and a frame at the wrong
            // position would read as a jump.
            visibility: pos?.ready ? "visible" : "hidden",
          }}
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
        </div>,
        document.body,
      )}
    </div>
  );
}
