"use client";

// IDEEZA Design System — Menu: the dropdown behind a menu button, drawn as the
// M100 comment-menu (Figma 3834:1307) and sort-menu (3838:18001).
//
// Rows are 40 px with a 20 px leading icon and 14 px medium text, radius md,
// inside a 4 px-padded panel with a 2 px gap, radius xl, a subtle edge and
// the two soft dropdown shadows (Elevation/2). A `danger` row is in the error
// colour. Rows that carry `selected` are a single choice (the sort menu):
// they announce `menuitemradio` + `aria-checked`, and the chosen one is
// brand-subtle fill with brand ink. A `disabled` row stays in the list,
// `aria-disabled`, with its `hint` (the reason) under it, and the arrows skip
// it. `hint` is a second line under any row.
//
// The panel portals to <body> with `position: fixed`, measured off the
// trigger: below it (above when the rows don't fit and there is more room
// there), its start or end edge on the trigger's (`align`), clamped into the
// viewport. An ancestor scroll or a resize closes it, since the anchor it was
// measured against has moved.
//
// Keyboard, as the project ⋯ menu (WAI-ARIA APG menu button): Enter, Space or
// ↓ opens it on the first row, ↑ on the last; ↑ ↓ wrap, Home End jump;
// Escape closes it back to the trigger; Tab closes it and moves on from the
// trigger; a press outside closes it. A pointer open focuses the panel, not a
// row, and pointing at a row focuses it, so the pointer and the keyboard
// share one highlight. Choosing a row puts focus back on the trigger before
// `onSelect` runs, so a dialog it opens hands focus back there.

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type MenuItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  /** Set on every row of a single-choice menu: `true` on the chosen one. */
  selected?: boolean;
  /** A second line under the label — on a disabled row, the reason. */
  hint?: string;
  onSelect: () => void;
};

/** Spread onto the trigger `<button>` (React 19 passes `ref` as a prop). */
export type MenuTriggerProps = {
  ref: React.RefObject<HTMLButtonElement | null>;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls": string | undefined;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
};

export interface MenuProps {
  items: MenuItem[];
  /** The menu's accessible name, e.g. "Comment actions". */
  label: string;
  trigger: (props: MenuTriggerProps, state: { open: boolean }) => React.ReactNode;
  align?: "start" | "end";
  className?: string;
}

/** Viewport margin and trigger↔panel gap. */
const MARGIN = 8;
const GAP = 4;
/** Below this the panel scrolls rather than shrink further. */
const MIN_PANEL_H = 48;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

/** The rows the arrows stop on, in order. */
const enabledRows = (panel: HTMLElement | null) =>
  Array.from(
    panel?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled]), [role="menuitemradio"]:not([aria-disabled])') ?? [],
  );

export function Menu({ items, label, trigger, align = "start", className }: MenuProps) {
  const menuId = React.useId();
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const focusOnOpen = React.useRef<"first" | "last" | "panel">("first");

  const openMenu = (at: "first" | "last" | "panel") => {
    if (items.length === 0) return;
    focusOnOpen.current = at;
    setOpen(true);
  };

  const close = React.useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  // Placed before the first paint, so it never shows at the origin. Measured
  // again when the rows change, since that changes its size.
  React.useLayoutEffect(() => {
    const el = panelRef.current;
    const t = triggerRef.current?.getBoundingClientRect();
    if (!open || !el || !t) return;
    el.style.maxHeight = "";
    const width = el.offsetWidth;
    const natural = el.scrollHeight;
    const below = window.innerHeight - t.bottom - GAP - MARGIN;
    const above = t.top - GAP - MARGIN;
    const flip = natural > below && above > below;
    const room = Math.max(MIN_PANEL_H, flip ? above : below);
    const height = Math.min(natural, room);
    if (natural > room) el.style.maxHeight = `${room}px`;
    const top = flip ? t.top - GAP - height : t.bottom + GAP;
    const left = align === "end" ? t.right - width : t.left;
    el.style.top = `${clamp(top, MARGIN, Math.max(MARGIN, window.innerHeight - MARGIN - height))}px`;
    el.style.left = `${clamp(left, MARGIN, Math.max(MARGIN, window.innerWidth - MARGIN - width))}px`;
  }, [open, align, items]);

  React.useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const rows = enabledRows(panel);
    const at = focusOnOpen.current;
    const target = at === "panel" || rows.length === 0 ? panel : at === "first" ? rows[0] : rows[rows.length - 1];
    target?.focus({ preventScroll: true });
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const inPanel = (n: Node | null) => !!n && !!panelRef.current?.contains(n);
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (inPanel(t) || triggerRef.current?.contains(t)) return;
      close(inPanel(document.activeElement));
    };
    const onScroll = (e: Event) => {
      if (inPanel(e.target as Node)) return;
      close(inPanel(document.activeElement));
    };
    const onResize = () => close(inPanel(document.activeElement));
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, close]);

  const onPanelKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const rows = enabledRows(panelRef.current);
    const at = rows.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      e.preventDefault();
      if (rows.length) rows[(i + rows.length) % rows.length].focus();
    };
    switch (e.key) {
      case "ArrowDown":
        go(at < 0 ? 0 : at + 1);
        break;
      case "ArrowUp":
        go(at < 0 ? rows.length - 1 : at - 1);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(rows.length - 1);
        break;
      case "Escape":
        // Handled here, so a dialog around the trigger stays open.
        e.preventDefault();
        e.stopPropagation();
        close(true);
        break;
      case "Tab":
        // The panel sits at the end of <body>; with focus back on the trigger,
        // the browser's own Tab continues from there.
        close(true);
        break;
    }
  };

  const triggerProps: MenuTriggerProps = {
    ref: triggerRef,
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? menuId : undefined,
    // A keyboard press arrives as a click with no pointer detail.
    onClick: (e) => (open ? close(true) : openMenu(e.detail === 0 ? "first" : "panel")),
    onKeyDown: (e) => {
      if (open || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
      e.preventDefault();
      openMenu(e.key === "ArrowDown" ? "first" : "last");
    },
  };

  return (
    <>
      {trigger(triggerProps, { open })}
      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={menuId}
              role="menu"
              aria-label={label}
              tabIndex={-1}
              onKeyDown={onPanelKey}
              className={cn(
                "fixed left-0 top-0 z-popover flex w-max min-w-[240px] max-w-[calc(100vw-16px)] flex-col gap-1 overflow-y-auto rounded-xl border border-solid border-border-subtle bg-bg-surface p-2 shadow-2 outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-fast",
                className,
              )}
            >
              {items.map((item) => (
                <MenuRow key={item.id} item={item} panelRef={panelRef} onChoose={() => close(true)} />
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function MenuRow({
  item,
  panelRef,
  onChoose,
}: {
  item: MenuItem;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onChoose: () => void;
}) {
  const hintId = React.useId();
  const { disabled, danger, selected } = item;
  const radio = selected !== undefined;
  return (
    <button
      type="button"
      role={radio ? "menuitemradio" : "menuitem"}
      aria-checked={radio ? selected : undefined}
      aria-disabled={disabled || undefined}
      aria-describedby={item.hint ? hintId : undefined}
      tabIndex={-1}
      onClick={() => {
        if (disabled) return;
        onChoose();
        item.onSelect();
      }}
      onPointerMove={(e) => {
        if (!disabled && document.activeElement !== e.currentTarget) e.currentTarget.focus({ preventScroll: true });
      }}
      onPointerLeave={(e) => {
        if (document.activeElement === e.currentTarget) panelRef.current?.focus({ preventScroll: true });
      }}
      className={cn(
        "flex w-full shrink-0 items-center gap-5 rounded-md px-6 py-5 text-left outline-none transition-colors duration-fast motion-reduce:transition-none [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        selected ? "bg-bg-brand-subtle" : !disabled && (danger ? "focus:bg-bg-error-subtle" : "focus:bg-bg-subtle"),
      )}
    >
      {item.icon ? (
        <span
          aria-hidden
          className={cn(
            "inline-flex size-[20px] shrink-0 items-center justify-center",
            disabled
              ? "text-[color:var(--color-icon-disabled)]"
              : danger
                ? "text-[color:var(--color-icon-error)]"
                : "text-[color:var(--color-icon-default)]",
          )}
        >
          {item.icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={cn(
            "text-md font-medium leading-md tracking-normal",
            disabled ? "text-text-disabled" : danger ? "text-text-error" : selected ? "text-text-brand" : "text-text-primary",
          )}
        >
          {item.label}
        </span>
        {item.hint ? (
          <span id={hintId} className="text-sm leading-sm text-text-secondary">
            {item.hint}
          </span>
        ) : null}
      </span>
    </button>
  );
}
