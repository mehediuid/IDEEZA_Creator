"use client";

// The Earn tabs' one visual system (owner, 2026-10-11: the area looked messy),
// so every tab reads the same:
// - one column, left-aligned, at most 760 px (EARN_COLUMN);
// - one card (EARN_CARD): the same radius, border, padding and width;
// - one heading scale: an h2 per section, an h3 inside one;
// - one rhythm: 32 px between sections, 16 px between a section's blocks,
//   4 px between a heading and its one-line explanation;
// - a section is `EarnBlock`: its h2, one plain sentence under it, then its
//   body, addressed by `id` when a link names it (`#copies`, `#customers`).
// Never violet: each tab's one violet control is its own.

import * as React from "react";
import { cn } from "@/lib/utils";

export const EARN_COLUMN = "w-full max-w-[760px]";

/** The gap between a tab's sections. */
export const EARN_STACK = "flex flex-col gap-16";

export const EARN_CARD =
  "flex min-w-0 flex-col gap-8 rounded-2xl border border-solid border-border bg-bg-surface p-8 [@container(min-width:640px)]:p-12";

export const EARN_H2 = "m-0 text-xl font-bold leading-xl text-text-primary";
export const EARN_H3 = "m-0 text-lg font-semibold leading-lg text-text-primary";
/** A section's one-line explanation, and a compact empty state's line. */
export const EARN_LEAD = "m-0 max-w-[62ch] text-md leading-md text-text-secondary";

/** 44 px at phone width and on a coarse pointer. */
export const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export const EARN_LINK = cn(
  "inline-flex min-h-[24px] items-center gap-2 self-start rounded-sm text-md font-semibold text-text-link underline-offset-2 outline-none transition-colors duration-normal ease-out hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none",
  TAP,
);

/** One section of a tab: its h2 and one sentence, then its body. `card` draws the frame around
 *  the heading too, for a section that is one object ("Your project"). */
export function EarnBlock({
  id,
  title,
  lead,
  card = false,
  aside,
  children,
  className,
}: {
  id?: string;
  title: string;
  lead?: React.ReactNode;
  card?: boolean;
  /** Beside the heading, e.g. the Testnet demo badge. */
  aside?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const headingId = React.useId();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(card ? EARN_CARD : "flex min-w-0 flex-col gap-8", "scroll-mt-10", className)}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <h2 id={headingId} className={EARN_H2}>
            {title}
          </h2>
          {aside}
        </div>
        {lead && <p className={EARN_LEAD}>{lead}</p>}
      </div>
      {children}
    </section>
  );
}
