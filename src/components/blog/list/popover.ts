"use client";

// The toolbar's floating panels (the two filters and the calendar) follow the
// DS Menu's rules (src/components/ideeza/menu.tsx): portalled to <body> with
// `position: fixed`, measured off the trigger before the first paint — below
// it, above when it doesn't fit and there is more room there, its start or end
// edge on the trigger's, clamped into the viewport — so nothing clips it. A
// press outside, an ancestor scroll or a resize closes it; focus goes back to
// the trigger only if it was inside the panel (else it stays where the press
// put it).

import * as React from "react";

const MARGIN = 8;
const GAP = 4;
const MIN_PANEL_H = 120;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

export function useAnchoredPanel({
  open,
  triggerRef,
  panelRef,
  align,
  onDismiss,
  remeasure,
}: {
  open: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  panelRef: React.RefObject<HTMLElement | null>;
  align: "start" | "end";
  /** `restoreFocus` is true when focus was inside the panel. */
  onDismiss: (restoreFocus: boolean) => void;
  /** Anything that changes the panel's size (its rows, the month shown). */
  remeasure?: unknown;
}) {
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
  }, [open, align, panelRef, triggerRef, remeasure]);

  const dismiss = React.useRef(onDismiss);
  React.useEffect(() => {
    dismiss.current = onDismiss;
  });

  React.useEffect(() => {
    if (!open) return;
    const inPanel = (n: Node | null) => !!n && !!panelRef.current?.contains(n);
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (inPanel(t) || triggerRef.current?.contains(t)) return;
      dismiss.current(inPanel(document.activeElement));
    };
    const onScroll = (e: Event) => {
      if (inPanel(e.target as Node)) return;
      dismiss.current(inPanel(document.activeElement));
    };
    const onResize = () => dismiss.current(inPanel(document.activeElement));
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, panelRef, triggerRef]);
}

/** The toolbar's field-shaped trigger (the DS SelectMenu's border and height), brand-tinted
 *  while its filter narrows the list — accent for the active state only. */
export const TRIGGER =
  "inline-flex min-h-[42px] min-w-0 cursor-pointer items-center justify-between gap-4 rounded-lg border border-solid px-6 py-5 text-md font-medium leading-md outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface motion-reduce:transition-none [@container(max-width:599px)]:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
export const TRIGGER_IDLE = "border-border bg-bg-surface text-text-primary hover:border-border-strong";
export const TRIGGER_ON = "border-border-brand bg-bg-brand-subtle text-text-brand";

/** The floating panel's surface, as the DS Menu's (Elevation/2, radius xl). */
export const PANEL =
  "fixed left-0 top-0 z-popover overflow-y-auto rounded-xl border border-solid border-border-subtle bg-bg-surface shadow-2 outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-fast";
