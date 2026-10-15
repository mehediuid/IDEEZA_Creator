// IDEEZA Design System — the page frame (O01 App Shell; Figma Foundations
// "F07 — Page Layout" and the "📐 Layout" variables). Every in-app page sits
// in it: main less --layout-page-inset on every side, filling the width — no
// max-width, nothing centred — so a page's title starts at the same edge on
// every page at every screen size. What fills the frame depends on the page
// type (spec docs/superpowers/specs/2026-10-16-page-frame-design.md); the
// edge never moves. No hooks, so server pages and route fallbacks use it too.

import * as React from "react";
import { cn } from "@/lib/utils";

/** The page container: as wide as main. Page-level layout switches query it
 *  (`[@container(min-width:…)]`), never the window, so they hold with the
 *  sidebar open, collapsed or gone. */
export const PAGE_CONTAINER = "[container-type:inline-size]";

/** The frame: the inset on every side. While render toasts are up its foot
 *  clears their capped stack (global-render-indicator.tsx: two toasts and a
 *  line from `md`, one below it), so the last controls scroll out from under it. */
export const PAGE_FRAME =
  "w-full px-[var(--layout-page-inset)] pt-[var(--layout-page-inset)] pb-24 max-md:[body:has(.ix-render-toast)_&]:pb-[120px] md:[body:has(.ix-render-toast)_&]:pb-[184px]";

/** A gallery: as many columns as fit, none narrower than --layout-card-min, so
 *  a wider screen adds columns instead of blowing cards up. */
export const PAGE_GRID =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,var(--layout-card-min)),1fr))] gap-[var(--layout-gutter)]";

/** A narrow column (forms, the editor and reader, Earn, checkout) on the
 *  frame's left edge — never re-centred, so the title does not move. */
export const NARROW_COLUMN = "w-full min-w-0 max-w-[var(--layout-content-narrow)]";

/** A main column and the rail, side by side from a 1024 px page container;
 *  below it the rail stacks under the column. */
export const WITH_RAIL =
  "grid grid-cols-1 items-start gap-[var(--layout-gutter)] [@container(min-width:1024px)]:grid-cols-[minmax(0,1fr)_var(--layout-rail)]";

/** The narrow column and the rail: the column gives way first, so the rail
 *  keeps its width beside it from a 1024 px page container. */
export const NARROW_WITH_RAIL =
  "grid grid-cols-1 items-start gap-[var(--layout-gutter)] [@container(min-width:1024px)]:grid-cols-[minmax(0,var(--layout-content-narrow))_var(--layout-rail)]";

/** The page container and its frame. `className` adds to the frame. */
export function Page({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={PAGE_CONTAINER}>
      <div className={cn(PAGE_FRAME, className)}>{children}</div>
    </div>
  );
}
