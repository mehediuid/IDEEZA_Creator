"use client";

// The DS A19 Tooltip for one element of a row (Figma frame 02): the full title
// of a cut-off blog title, and "Authorized for use" on the reuse check. It
// opens on hover AND on keyboard focus (the Figma draws hover only; a meaning
// behind hover alone fails keyboard users), stays while the pointer moves onto
// it, and Escape, a scroll or leaving closes it (WCAG 1.4.13). The bubble is
// portalled and placed above its anchor, below when there is no room, clamped
// into the viewport, so the table never clips it.

import * as React from "react";
import { createPortal } from "react-dom";
import { Tooltip } from "@/components/ideeza";
import { cn } from "@/lib/utils";

const MARGIN = 8;
const GAP = 4;
/** The bubble's own side padding (the DS Tooltip's 12 px): a start-aligned bubble's words
 *  line up with the anchor's. */
const INSET = 12;
/** Long enough to move the pointer from the anchor onto the bubble. */
const LINGER_MS = 120;

/** `align: "start"` lines the bubble's words up with the anchor's (a cut-off title reads on in
 *  place); "center" centres it over the anchor (an icon). */
export function useHoverTip(label: string, align: "center" | "start" = "center") {
  const [shown, setShown] = React.useState(false);
  // State, not a ref: the bubble is placed against it while rendering.
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const timer = React.useRef<number | null>(null);

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const show = React.useCallback(() => {
    cancel();
    setShown(true);
  }, []);
  const hide = React.useCallback((now = false) => {
    cancel();
    if (now) setShown(false);
    else timer.current = window.setTimeout(() => setShown(false), LINGER_MS);
  }, []);

  React.useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShown(false);
    };
    const onScroll = () => setShown(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [shown]);

  React.useEffect(() => cancel, []);

  const node = shown && anchor ? <TipBubble label={label} anchor={anchor} align={align} onEnter={show} onLeave={() => hide()} /> : null;
  /** `setAnchor` is the callback ref for the element the bubble points at. */
  return { shown, show, hide, setAnchor, anchor, node };
}

function TipBubble({
  label,
  anchor,
  align,
  onEnter,
  onLeave,
}: {
  label: string;
  anchor: HTMLElement;
  align: "center" | "start";
  onEnter: () => void;
  onLeave: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [below, setBelow] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const a = anchor.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const under = a.top - GAP - r.height < MARGIN;
    setBelow(under);
    const want = align === "start" ? a.left - INSET : a.left + a.width / 2 - r.width / 2;
    const left = Math.max(MARGIN, Math.min(want, window.innerWidth - MARGIN - r.width));
    el.style.left = `${left}px`;
    el.style.top = `${under ? a.bottom + GAP : a.top - GAP - r.height}px`;
  }, [anchor, label, align]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div ref={ref} onPointerEnter={onEnter} onPointerLeave={onLeave} className="fixed left-0 top-0 z-popover">
      {/* The DS bubble's arrow points down; under the anchor it points up. */}
      <Tooltip
        label={label}
        className={cn(
          "pointer-events-auto [&>span]:max-w-[min(480px,calc(100vw-16px))] [&>span]:whitespace-normal",
          below && "flex-col-reverse [&>svg]:rotate-180",
        )}
      />
    </div>,
    document.body,
  );
}
