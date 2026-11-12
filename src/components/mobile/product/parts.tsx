"use client";

// The product page's few shared pieces, all made from the kit:
// · LINK / LinkButton — the page's one inline link (A03 Link MD Brand, 14/20
//   medium, on the kit's 44 px tap area): Show more, See why, History, Earlier…
// · BANNER_LINK — the same link inside a Banner, in the banner's own tone;
// · CARD — the kit's list card with its row dividers, for a card whose rows
//   aren't kit ListRows (a table of facts, a piece row with its own button);
// · FactCard — label and value rows ("Part reference · U1"), the value whole;
// · TABS_SCROLL / TABS_FIT — the M14 strip's fit: every tab keeps its whole label and the
//   strip scrolls sideways when four don't fit (320 px, "Contributors").

import * as React from "react";
import { cn } from "@/lib/utils";
import { TEXT_LINK } from "../kit/bottom-bar";
import { LIST_CARD, LIST_DIVIDERS } from "../kit/list";
import { T } from "../type";

export const LINK = TEXT_LINK;

export const BANNER_LINK = cn(T.rowTitle, "-my-6 inline-flex min-h-[44px] items-center text-current outline-none hover:underline focus-visible:underline");

export function LinkButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={cn(LINK, className)} />;
}

export const CARD = cn(LIST_CARD, LIST_DIVIDERS);

export function FactCard({ rows, label, className }: { rows: readonly (readonly [string, React.ReactNode])[]; label?: string; className?: string }) {
  return (
    <dl aria-label={label} className={cn(CARD, className)}>
      {rows.map(([k, v], i) => (
        <div key={`${i}-${k}`} className="flex min-h-[44px] items-center justify-between gap-6 px-6 py-4">
          <dt className={cn(T.body, "shrink-0")}>{k}</dt>
          <dd className={cn(T.body, "min-w-0 break-words text-right text-text-primary")}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** On the strip's wrapper and on MobileTabs: the tabs share the width, none cut short. */
export const TABS_SCROLL = "overflow-x-auto";
export const TABS_FIT = "min-w-max [&>button]:min-w-fit [&>button]:px-4";
