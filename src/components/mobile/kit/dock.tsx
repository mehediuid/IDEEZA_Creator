"use client";

// Where the things that follow the maker around the app sit (mobile UX lens
// 13: a floating build pill or render tray never covers a title, a field or a
// button). A screen marks two places in its own layout flow, and the floater
// is drawn there, so the content starts under it (or ends above it) instead
// of running beneath it:
//
// · `top`  — under the screen's header (Screen draws it after `top`): the
//   build's live bar (ai/build-pill.tsx);
// · `foot` — between the content and the screen's foot (Screen draws it
//   before `footer`): the video render tray, like a mini-player.
//
// Screen draws both, empty and 0 px tall until something docks. A screen that
// doesn't use Screen (the Feed's full-bleed clips) draws `<DockSlot edge="top" />`
// where its header ends. With no slot on the page, the floater floats as it
// did before.
//
//   const slot = useDockSlot("top");          // the newest slot, or null
//   return slot ? createPortal(<Bar />, slot) : <Floating />;

import * as React from "react";
import { cn } from "@/lib/utils";

export type DockEdge = "top" | "foot";

/** On each slot; a floater inside one stops floating. */
export const DOCK_ATTR = "data-m-dock";

const slots: Record<DockEdge, HTMLElement[]> = { top: [], foot: [] };
const watchers = new Set<() => void>();
const changed = () => watchers.forEach((w) => w());

function subscribe(onChange: () => void) {
  watchers.add(onChange);
  return () => {
    watchers.delete(onChange);
  };
}

/** The newest slot on that edge (the screen that arrived last), or null. */
export function useDockSlot(edge: DockEdge): HTMLElement | null {
  return React.useSyncExternalStore(
    subscribe,
    () => slots[edge][slots[edge].length - 1] ?? null,
    () => null,
  );
}

/** A place in the layout flow that a floater docks into. Empty, it takes no room. */
export function DockSlot({ edge, className }: { edge: DockEdge; className?: string }) {
  const ref = React.useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      slots[edge].push(el);
      changed();
      return () => {
        const i = slots[edge].indexOf(el);
        if (i >= 0) slots[edge].splice(i, 1);
        changed();
      };
    },
    [edge],
  );
  return <div ref={ref} {...{ [DOCK_ATTR]: edge }} className={cn("flex shrink-0 flex-col empty:hidden", className)} />;
}
