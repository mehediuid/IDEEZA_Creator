"use client";

// The page's frame (spec COR-5, COR-54, COR-56): the page container that the
// layout's container queries read, the two columns and the rail's one
// surface. One rail block is C7's RailBlock (./rail-block.tsx), which C8
// unified the whole rail on; this file no longer draws its own. The skeleton
// draws the same frame, so the page never changes shape when the stores
// arrive (COR-2).

import * as React from "react";

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

export function ProjectFrame({
  banner,
  breadcrumb,
  main,
  rail,
}: {
  banner?: React.ReactNode;
  breadcrumb: React.ReactNode;
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
        <div className="mt-10 grid grid-cols-1 gap-y-16 [@container(min-width:1024px)]:grid-cols-[minmax(0,1fr)_360px] [@container(min-width:1024px)]:items-start [@container(min-width:1024px)]:gap-x-[calc(var(--spacing-7)*2)]">
          <div className="min-w-0">{main}</div>
          {rail}
        </div>
      </div>
    </div>
  );
}
