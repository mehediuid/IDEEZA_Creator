"use client";

// The page's frame (spec COR-5, COR-54, COR-56): the page container that the
// layout's container queries read, the two columns, the rail's one surface and
// one rail block. The skeleton draws the same frame, so the page never changes
// shape when the stores arrive (COR-2).

import * as React from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
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

/**
 * One rail block (COR-54, COR-56): a section under its own h2. Beside the tabs,
 * from a 1024 px page container, it is always open. Stacked under the tab
 * panel, it is a disclosure that stays closed until pressed. It is the same
 * element either way, switched by the container query, so nothing renders
 * twice and the hidden variant is out of the accessibility tree.
 *
 * - `summary` rides on the closed row: "Outcome · Listed · Showcased" (COM-55).
 * - `collapsible={false}` keeps a block open at every width: Manage, whose
 *   Delete is the last thing on the page at 400 px.
 */
export function RailBlock({
  id,
  title,
  summary,
  collapsible = true,
  children,
}: {
  id: string;
  title: string;
  summary?: string;
  collapsible?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const headingId = `rail-${id}-heading`;
  const bodyId = `rail-${id}-body`;
  return (
    <section aria-labelledby={headingId} className="py-4 [@container(min-width:1024px)]:p-10">
      <h2 id={headingId} className="text-lg font-bold leading-lg text-text-primary">
        {collapsible ? (
          <>
            <span className="hidden [@container(min-width:1024px)]:inline">{title}</span>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setOpen((v) => !v)}
              className="flex min-h-[var(--touch-min)] w-full items-center justify-between gap-6 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus [@container(min-width:1024px)]:hidden"
            >
              <span className="min-w-0">
                {title}
                {summary ? (
                  <span className="font-medium text-text-secondary"> · {summary}</span>
                ) : null}
              </span>
              <span
                aria-hidden
                className={cn(
                  "inline-flex shrink-0 text-text-tertiary transition-transform duration-normal ease-out motion-reduce:transition-none",
                  open && "rotate-90",
                )}
              >
                <Icon icon={ArrowRight01Icon} size={18} />
              </span>
            </button>
          </>
        ) : (
          title
        )}
      </h2>
      <div
        id={bodyId}
        className={cn(
          "mt-6",
          collapsible && !open && "hidden [@container(min-width:1024px)]:block",
        )}
      >
        {children}
      </div>
    </section>
  );
}
