"use client";

// The product page's few shared pieces, all made from the kit:
// · LINK / LinkButton — the page's one inline link (A03 Link MD Brand, 14/20
//   medium, on the kit's 44 px tap area): Show more, See why, History, Earlier…
// · BANNER_LINK — the same link inside a Banner, in the banner's own tone;
// · CARD — the kit's list card with its row dividers, for a card whose rows
//   aren't kit ListRows (a table of facts, a piece row with its own button);
// · FactCard — label and value rows ("Part reference · U1"), the value whole;
// · TABS_SCROLL / TABS_FIT — the M14 strip's fit: every tab keeps its whole label and the
//   strip scrolls sideways when four don't fit (320 px, "Contributors");
// · InfoButton — the ⓘ beside a heading, opening the words the page doesn't print inline;
// · SectionHead — the object page's section heading (title, ⓘ, a live value or an action);
// · ListFooter — the line under a grouped list ("Worked out from the parts.");
// · FactGrid — a summary's facts, three to a row (the Parts list's Summary).

import * as React from "react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IconButton } from "@/components/ideeza/icon-button";
import { cn } from "@/lib/utils";
import { TEXT_LINK } from "../kit/bottom-bar";
import { LIST_CARD, LIST_DIVIDERS } from "../kit/list";
import { Sheet } from "../kit/sheet";
import { T } from "../type";

export const LINK = TEXT_LINK;

export const BANNER_LINK = cn(T.rowTitle, "-my-6 inline-flex min-h-[44px] items-center text-current outline-none hover:underline focus-visible:underline");

export function LinkButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={cn(LINK, className)} />;
}

export const CARD = cn(LIST_CARD, LIST_DIVIDERS);

/** `inset="row"`: the rows sit 16 in, as the object page's ListRows do (Specs beside the Build rows). */
export function FactCard({
  rows,
  label,
  className,
  inset = "card",
}: {
  rows: readonly (readonly [string, React.ReactNode])[];
  label?: string;
  className?: string;
  inset?: "card" | "row";
}) {
  return (
    <dl aria-label={label} className={cn(CARD, className)}>
      {rows.map(([k, v], i) => (
        <div key={`${i}-${k}`} className={cn("flex min-h-[44px] items-center justify-between gap-6 py-4", inset === "row" ? "min-h-[48px] px-8 py-6" : "px-6")}>
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

/** ⓘ beside a heading (lens 1): a 44 px icon button that opens the kit Sheet with the words the
 *  page no longer prints inline. */
export function InfoButton({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <IconButton
        hierarchy="ghost"
        size="xl"
        aria-label={label}
        aria-haspopup="dialog"
        icon={<Icon icon={InformationCircleIcon} size={20} />}
        onClick={() => setOpen(true)}
        className="-my-4 text-[color:var(--color-icon-default)]"
      />
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className={cn(T.body, "flex flex-col gap-4 pb-8")}>{children}</div>
      </Sheet>
    </>
  );
}

/** A section's head on the object page: Heading/H6, an optional ⓘ, then a live value (T.meta) or
 *  an action at the end. */
export function SectionHead({
  id,
  title,
  info,
  value,
  action,
}: {
  id: string;
  title: string;
  info?: React.ReactNode;
  value?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[32px] items-center gap-1">
      <h2 id={id} className={T.section}>
        {title}
      </h2>
      {info}
      <span className="flex-1" />
      {value != null && value !== "" && <span className={cn(T.meta, "text-right")}>{value}</span>}
      {action}
    </div>
  );
}

/** Under a grouped list: its footer line (iOS grouped-list footer), 16 in from the card's edge. */
export function ListFooter({ children }: { children: React.ReactNode }) {
  return <p className={cn(T.meta, "px-8")}>{children}</p>;
}

/** The small facts grid a summary leads with (BuyBox / ReceiptCard's): label over value, three to a row. */
export function FactGrid({ facts, label }: { facts: readonly { label: string; value: string }[]; label?: string }) {
  return (
    <dl aria-label={label} className={cn(LIST_CARD, "grid grid-cols-3 gap-x-8 gap-y-6 p-8")}>
      {facts.map((f) => (
        <div key={f.label} className="flex min-w-0 flex-col gap-1">
          <dt className={T.micro}>{f.label}</dt>
          <dd className={cn(T.rowTitle, "break-words tabular-nums")}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The page's address with `patch` laid over its query, written in place: no request, no new
 *  history entry (a tab, a version). Next reads the change through useSearchParams. */
export function replaceQuery(patch: Record<string, string | null>) {
  const q = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) q.delete(k);
    else q.set(k, v);
  }
  const search = q.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`);
}
