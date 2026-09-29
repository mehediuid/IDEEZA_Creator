"use client";

// The page's frame (spec COR-5, COR-54, COR-56; Phase 2 §2.2, C21): the page
// container that the layout's container queries read, the two columns and
// the rail's one surface. One rail block is C7's RailBlock (./rail-block.tsx).
// The skeleton draws the same frame, so the page never changes shape when the
// stores arrive (COR-2). The product page reuses it with its own rail
// (P2-EDITOR-19, P2-TABS-3).
//
// The project page also hands in its header ("head") and the rail's
// Marketplace block ("lead") on their own. The page then reads, in the DOM
// and so in the Tab order, header → Marketplace block → tab strip and panel
// → the rest of the rail: below a 1024 px page container that is also the
// order on screen, so Close auction and Relist sit above the fold on a phone
// (C21). From 1024 px one grid places them as two columns — header over the
// panel on the left, the Marketplace block over the rest of the rail on the
// right, one surface. Two stacks of independent heights in one grid need the
// taller of header and block to span the row line the other stops at, or one
// column gets a gap; which one is taller is read by a ResizeObserver (before
// paint) and only moves grid lines — nothing remounts.

import * as React from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";

/** The page container: as wide as "main", and that width is what the container
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

const WIDE_COLUMNS =
  "[@container(min-width:1024px)]:grid-cols-[minmax(0,1fr)_360px] [@container(min-width:1024px)]:items-start [@container(min-width:1024px)]:gap-x-[calc(var(--spacing-7)*2)]";

const COLUMNS = cn("mt-10 grid grid-cols-1 gap-y-16", WIDE_COLUMNS);

/** Three rows from 1024 px: the header and the Marketplace block share the first
 *  line, the taller spans the second, and the third (flexible) takes the rest. No
 *  row gap there — the panel keeps the header's 32 px itself. */
const SPLIT_COLUMNS = cn(
  COLUMNS,
  "[@container(min-width:1024px)]:grid-rows-[auto_auto_1fr] [@container(min-width:1024px)]:gap-y-0",
);

export function ProjectFrame({
  banner,
  breadcrumb,
  head,
  lead,
  main,
  rail,
}: {
  banner?: React.ReactNode;
  breadcrumb: React.ReactNode;
  /** The page header, when the rail's first block goes above the tabs on a phone:
   *  pass that block as `lead` and the rest of the rail as a `<RailRest>` then.
   *  Without it, `main` is the whole column. */
  head?: React.ReactNode;
  /** With `head`: the Marketplace block, second in the DOM (C21). */
  lead?: React.ReactNode;
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
        {head === undefined ? (
          <div className={COLUMNS}>
            <div className="min-w-0">{main}</div>
            {rail}
          </div>
        ) : (
          <SplitColumns head={head} lead={lead} main={main} rest={rail} />
        )}
      </div>
    </div>
  );
}

// From 1024 px, where each part sits: `short` while the header is the taller
// of the two, `tall` once the Marketplace block is. Literal strings, so
// Tailwind sees every class.
const PART = {
  head: {
    base: "min-w-0 [@container(min-width:1024px)]:col-start-1 [@container(min-width:1024px)]:row-start-1",
    short: "[@container(min-width:1024px)]:row-span-2",
    tall: "[@container(min-width:1024px)]:row-span-1",
  },
  lead: {
    base: cn(
      "min-w-0 border-y border-solid border-border empty:hidden",
      "[@container(min-width:1024px)]:col-start-2 [@container(min-width:1024px)]:row-start-1",
      "[@container(min-width:1024px)]:rounded-2xl [@container(min-width:1024px)]:border [@container(min-width:1024px)]:bg-bg-surface",
      // One surface with the rest of the rail under it: the hairline between is the rest's.
      "[@container(min-width:1024px)]:[&:has(~*_[data-rail-rest]:not(:empty))]:rounded-b-none",
      "[@container(min-width:1024px)]:[&:has(~*_[data-rail-rest]:not(:empty))]:border-b-0",
    ),
    short: "[@container(min-width:1024px)]:row-span-1",
    tall: "[@container(min-width:1024px)]:row-span-2",
  },
  main: {
    base: "min-w-0 [@container(min-width:1024px)]:col-start-1 [@container(min-width:1024px)]:mt-16",
    short: "[@container(min-width:1024px)]:row-start-3",
    tall: "[@container(min-width:1024px)]:row-start-2 [@container(min-width:1024px)]:row-span-2",
  },
  rest: {
    base: "min-w-0 [@container(min-width:1024px)]:col-start-2 [&:not(:has(>:not(:empty)))]:hidden",
    short: "[@container(min-width:1024px)]:row-start-2 [@container(min-width:1024px)]:row-span-2",
    tall: "[@container(min-width:1024px)]:row-start-3",
  },
} as const;

function SplitColumns({
  head,
  lead,
  main,
  rest,
}: {
  head: React.ReactNode;
  lead: React.ReactNode;
  main: React.ReactNode;
  rest: React.ReactNode;
}) {
  const headRef = React.useRef<HTMLDivElement>(null);
  const leadRef = React.useRef<HTMLDivElement>(null);
  const [leadTaller, setLeadTaller] = React.useState(false);
  React.useLayoutEffect(() => {
    const h = headRef.current;
    const l = leadRef.current;
    if (!h || !l || typeof ResizeObserver === "undefined") return;
    // Every part is top-aligned, so each box is its content's height, and
    // moving the grid lines never changes it: no observer loop can start.
    // The first observation lands before the first paint.
    const ro = new ResizeObserver(() => {
      const next = l.offsetHeight > h.offsetHeight;
      flushSync(() => setLeadTaller(next));
    });
    ro.observe(h);
    ro.observe(l);
    return () => ro.disconnect();
  }, []);
  const at = leadTaller ? "tall" : "short";
  return (
    <div className={SPLIT_COLUMNS}>
      <div ref={headRef} className={cn(PART.head.base, PART.head[at])}>
        {head}
      </div>
      <div ref={leadRef} data-rail-lead className={cn(PART.lead.base, PART.lead[at])}>
        {lead}
      </div>
      <div className={cn(PART.main.base, PART.main[at])}>{main}</div>
      <div className={cn(PART.rest.base, PART.rest[at])}>{rest}</div>
    </div>
  );
}

/**
 * The rail after the Marketplace block, on a page with a `head` (C21): the
 * rail landmark (COR-99), its blocks on one surface. Below 1024 px it follows
 * the panel as a hairline-topped run of blocks; from 1024 px it is the rail's
 * surface under the Marketplace block, its top corners joining it there. A
 * rail whose blocks all return null is `:empty` and drops out, leaving no
 * stray hairline or surface (COR-54).
 */
export function RailRest({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <aside
      aria-label={label}
      data-rail-rest
      className={cn(
        "min-w-0 divide-y divide-border border-t border-solid border-border empty:hidden",
        "[@container(min-width:1024px)]:rounded-2xl [@container(min-width:1024px)]:border [@container(min-width:1024px)]:bg-bg-surface",
        "[@container(min-width:1024px)]:[[data-rail-lead]:not(:empty)~*_&]:rounded-t-none",
      )}
    >
      {children}
    </aside>
  );
}
