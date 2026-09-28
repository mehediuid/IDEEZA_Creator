"use client";

// The page's frame (spec COR-5, COR-54, COR-56; Phase 2 §2.2, C21): the page
// container that the layout's container queries read, the two columns and
// the rail's one surface. One rail block is C7's RailBlock (./rail-block.tsx).
// The skeleton draws the same frame, so the page never changes shape when the
// stores arrive (COR-2). The product page reuses it with its own rail
// (P2-EDITOR-19, P2-TABS-3).
//
// The project page also hands in its header and the rail's Marketplace block
// on their own (`head`, and `lead` on a SplitRail). Below a 1024 px page
// container the page then reads header → Marketplace block → tab strip and
// panel → the rest of the rail, so Close auction and Relist sit above the fold
// on a phone (C21). It is ONE DOM instance of each: the two columns are
// `display: contents` below 1024 px and their parts take their places by
// `order`; from 1024 px they are the main column and the rail, and the
// Marketplace block is the rail's first block. (One grid of four cells would
// tie the header's height to the block's and leave a gap in one column.)

import * as React from "react";
import { cn } from "@/lib/utils";

/** The page container: as wide as `main`, and that width is what the container
 *  queries measure (§7 X6). At 1366 px with the sidebar open it is 1086 px, so
 *  the rail stays beside the tabs. */
export const PAGE_CONTAINER = "[container-type:inline-size]";

/** The content box: capped at 1280 px, 16 px gutters, 32 px from a 640 px page
 *  container (spacing tokens). */
export const PAGE_CONTENT =
  "mx-auto w-full max-w-[1280px] px-8 pb-24 pt-10 [@container(min-width:640px)]:px-16";

/** The rail's one surface: hairlines between blocks, no card in a card
 *  (COR-54). Stacked after the tab panel it is a hairline-topped run of blocks
 *  (COR-56); beside it, from a 1024 px page container, a bordered surface. */
export const RAIL_SURFACE =
  "min-w-0 divide-y divide-border border-t border-solid border-border [@container(min-width:1024px)]:rounded-2xl [@container(min-width:1024px)]:border [@container(min-width:1024px)]:bg-bg-surface";

const COLUMNS =
  "mt-10 grid grid-cols-1 gap-y-16 [@container(min-width:1024px)]:grid-cols-[minmax(0,1fr)_360px] [@container(min-width:1024px)]:items-start [@container(min-width:1024px)]:gap-x-[calc(var(--spacing-7)*2)]";

export function ProjectFrame({
  banner,
  breadcrumb,
  head,
  main,
  rail,
}: {
  banner?: React.ReactNode;
  breadcrumb: React.ReactNode;
  /** The page header, when the rail's first block goes above the tabs on a phone:
   *  pass `rail` as a `<SplitRail>` then. Without it, `main` is the whole column. */
  head?: React.ReactNode;
  main: React.ReactNode;
  rail?: React.ReactNode;
}) {
  return (
    <div className={PAGE_CONTAINER}>
      <div className={PAGE_CONTENT}>
        {banner}
        {breadcrumb}
        {/* One column; from a 1024 px page container a fluid main column
            (min-width 0) and the 360 px rail, 28 px apart (2 × --spacing-7),
            both top-aligned under the breadcrumb. The rail is not sticky: it
            is taller than the viewport. The Figma's fixed 633 / 482 split is
            not reproduced. */}
        <div className={COLUMNS}>
          {head === undefined ? (
            <div className="min-w-0">{main}</div>
          ) : (
            <div className="contents [@container(min-width:1024px)]:flex [@container(min-width:1024px)]:min-w-0 [@container(min-width:1024px)]:flex-col [@container(min-width:1024px)]:gap-y-16">
              <div className="order-1 min-w-0 [@container(min-width:1024px)]:order-none">{head}</div>
              <div className="order-3 min-w-0 [@container(min-width:1024px)]:order-none">{main}</div>
            </div>
          )}
          {rail}
        </div>
      </div>
    </div>
  );
}

/**
 * The rail of a page with a `head` (C21): `lead` (the Marketplace block) and
 * the other blocks, on one surface from 1024 px. Below it, `lead` stands
 * between the header and the tab strip, and the rest follows the panel. A part
 * whose blocks all return null is `:empty` and drops out, and so does the
 * whole rail when both are, leaving no stray hairline or surface (COR-54).
 */
export function SplitRail({
  label,
  lead,
  children,
}: {
  /** The rail landmark's name (COR-99): "Project record". */
  label: string;
  lead: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <aside
      aria-label={label}
      className={cn(
        "contents [@container(min-width:1024px)]:block [@container(min-width:1024px)]:min-w-0 [@container(min-width:1024px)]:rounded-2xl [@container(min-width:1024px)]:border [@container(min-width:1024px)]:border-solid [@container(min-width:1024px)]:border-border [@container(min-width:1024px)]:bg-bg-surface",
        "[&:not(:has(>:not(:empty)))]:hidden",
      )}
    >
      <div
        data-rail-lead
        className="order-2 min-w-0 border-y border-solid border-border empty:hidden [@container(min-width:1024px)]:order-none [@container(min-width:1024px)]:border-y-0"
      >
        {lead}
      </div>
      <div
        data-rail-rest
        className="order-4 min-w-0 divide-y divide-border border-t border-solid border-border empty:hidden [@container(min-width:1024px)]:order-none [@container(min-width:1024px)]:border-t-0 [@container(min-width:1024px)]:[:not(:empty)+&]:border-t"
      >
        {children}
      </div>
    </aside>
  );
}
