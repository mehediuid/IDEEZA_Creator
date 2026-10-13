"use client";

// A ⋯ menu button for Messages (the conversation's actions, a message's
// actions, the composer's +). The menu portals to <body> with position: fixed,
// measured off the trigger and clamped into the viewport: it opens below and
// right-aligned to the trigger, flips above when it doesn't fit, and closes
// when anything outside it scrolls or the window resizes.
//
// A menu button (WAI-ARIA APG): Enter, Space or ↓ opens on the first item, ↑ on
// the last; ↑ ↓ Home End move; Escape closes back to the trigger; Tab closes.
// An item puts focus back on the trigger before it runs, so a dialog it opens
// hands focus back there.

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type MenuItem = { id: string; label: string; danger?: boolean; onSelect: () => void };

const MARGIN = 8;
const GAP = 4;

type Pos = { top: number; left: number; ready: boolean };

export function MenuButton({
  label,
  items,
  trigger,
  align = "end",
  className,
}: {
  /** Names the trigger and the menu: "Conversation actions". */
  label: string;
  items: MenuItem[];
  /** The trigger's content (an icon). */
  trigger: React.ReactNode;
  /** Which trigger edge the menu lines up with. */
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<Pos | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const startAt = React.useRef<"first" | "last">("first");
  const menuId = React.useId();

  const close = React.useCallback((back: boolean) => {
    setOpen(false);
    setPos(null);
    if (back) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  const openAt = (at: "first" | "last") => {
    startAt.current = at;
    setPos({ top: -9999, left: -9999, ready: false });
    setOpen(true);
  };

  React.useLayoutEffect(() => {
    if (!open || !pos || pos.ready) return;
    const t = triggerRef.current?.getBoundingClientRect();
    const m = menuRef.current?.getBoundingClientRect();
    if (!t || !m) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const below = t.bottom + GAP;
    const fitsBelow = below + m.height <= vh - MARGIN;
    const top = fitsBelow ? below : Math.max(MARGIN, t.top - GAP - m.height);
    const rawLeft = align === "end" ? t.right - m.width : t.left;
    const left = Math.min(Math.max(MARGIN, rawLeft), Math.max(MARGIN, vw - MARGIN - m.width));
    setPos({ top, left, ready: true });
  }, [open, pos, align]);

  React.useEffect(() => {
    if (!pos?.ready) return;
    const list = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    (startAt.current === "first" ? list[0] : list[list.length - 1])?.focus({ preventScroll: true });
  }, [pos?.ready]);

  React.useEffect(() => {
    if (!open) return;
    const inside = (n: EventTarget | null) =>
      n instanceof Node && (!!menuRef.current?.contains(n) || !!triggerRef.current?.contains(n));
    const onDown = (e: PointerEvent) => {
      if (!inside(e.target)) close(false);
    };
    const onScroll = (e: Event) => {
      if (!(e.target instanceof Node && menuRef.current?.contains(e.target))) close(false);
    };
    const onResize = () => close(false);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, close]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    const list = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const at = list.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      e.preventDefault();
      list[(i + list.length) % list.length]?.focus();
    };
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(list.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === "Tab") close(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openAt("first"))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openAt(e.key === "ArrowDown" ? "first" : "last");
          }
        }}
        className={cn(
          "inline-flex size-[36px] shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus aria-expanded:bg-bg-subtle aria-expanded:text-text-primary max-md:size-[var(--touch-min)]",
          className,
        )}
      >
        {trigger}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKey}
            style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999, visibility: pos?.ready ? "visible" : "hidden" }}
            className="z-popover flex w-max min-w-[180px] max-w-[calc(100vw-16px)] flex-col rounded-xl border border-solid border-border bg-bg-surface py-2 shadow-3 motion-safe:animate-in motion-safe:fade-in"
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  close(true);
                  item.onSelect();
                }}
                className={cn(
                  "flex min-h-[36px] w-full cursor-pointer items-center px-6 text-left text-md leading-md outline-none transition-colors duration-fast max-md:min-h-[var(--touch-min)]",
                  item.danger
                    ? "text-text-error hover:bg-bg-error-subtle focus-visible:bg-bg-error-subtle"
                    : "text-text-primary hover:bg-bg-subtle focus-visible:bg-bg-subtle",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
