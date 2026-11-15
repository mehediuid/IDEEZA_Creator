"use client";

// The one list card and list row of /m (Shared kit People card 10605:2746,
// Settings ST-01 10690:27 / 10690:137, Project 10325:2): a bg/surface card with
// a border/default edge and radius/xl, rows split by a border/default line.
// Every area used to draw its own (gray-100 or gray-200 edges, radius lg or
// xl, three dividers); build cards and row lists from these instead.
//
//   <ListCard label="Account">            — a <ul>; each child a <li> row
//     <ListRow href="/m/settings/account" icon={UserIcon} title="Account" />
//     <ListRow onClick={…} title="Language" value="English" />
//   </ListCard>
//   <div className={LIST_CARD}>…</div>     — a card that isn't a list
//
// ListRow is the "row → page" (PR-01 / ST-01): 48 tall at least, 16 to the
// sides, a 24 px icon, the title in Body/SM (T.body, primary), an optional
// meta line (T.meta), an optional value at the end, and the 24 px chevron when
// it opens something. Rows that show content of their own (a sale, a product)
// keep their layout and take LIST_ROW for the padding and the line.
// Settings' grouped cards are the one documented exception: radius/lg
// (`radius="lg"`, Settings 10690:137).

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { PRESSED } from "./press";

/** The card: surface, border/default, radius/xl, clipping its rows. */
export const LIST_CARD =
  "flex flex-col overflow-hidden rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface";

/** Between the rows of a card: one border/default line over every row but the first. */
export const LIST_DIVIDERS =
  "[&>*+*]:border-t-[length:var(--border-width-1)] [&>*+*]:border-solid [&>*+*]:border-border";

/** A content row inside a ListCard: its padding (12 / 16) and its press states — the pressed
 *  layer (kit/press.ts) lights only when the row is an enabled button or a link. */
export const LIST_ROW = cn(
  "flex w-full min-h-[48px] items-center gap-6 px-8 py-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
  PRESSED,
);

export function ListCard({
  children,
  label,
  radius = "xl",
  className,
}: {
  children: React.ReactNode;
  /** Names the list for assistive tech when no heading does. */
  label?: string;
  radius?: "xl" | "lg";
  className?: string;
}) {
  return (
    <ul aria-label={label} className={cn(LIST_CARD, LIST_DIVIDERS, radius === "lg" && "rounded-lg", className)}>
      {children}
    </ul>
  );
}

/** The row's end: "opens a page" (ST-01 10690:132, 24 × 24, icon/default). */
export function Chevron({ disabled, className }: { disabled?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "shrink-0",
        disabled ? "text-[color:var(--color-icon-disabled)]" : "text-[color:var(--color-icon-default)]",
        className,
      )}
    >
      <Icon icon={ArrowRight01Icon} size={24} />
    </span>
  );
}

type RowAction = { href: string; onClick?: never } | { onClick: () => void; href?: never } | { href?: never; onClick?: never };

export type ListRowProps = {
  title: React.ReactNode;
  meta?: React.ReactNode;
  icon?: IconValue;
  /** Anything at the start in place of the icon (an Avatar, a Thumb). */
  leading?: React.ReactNode;
  value?: React.ReactNode;
  /** Anything at the end before the chevron (a Badge, a Toggle). */
  trailing?: React.ReactNode;
  danger?: boolean;
  /** Greyed, with its reason as the meta line. */
  disabled?: boolean;
  reason?: string;
} & RowAction;

export function ListRow(props: ListRowProps) {
  const { title, meta, icon, leading, value, trailing, danger, disabled, reason } = props;
  const opens = !!(props.href || props.onClick);
  const line = disabled && reason ? reason : meta;
  const body = (
    <>
      {leading ??
        (icon && (
          <span className={cn("shrink-0", danger ? "text-[color:var(--color-icon-error)]" : "text-[color:var(--color-icon-default)]")}>
            <Icon icon={icon} size={24} />
          </span>
        ))}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn(T.body, disabled ? "text-text-disabled" : danger ? "text-text-error" : "text-text-primary")}>{title}</span>
        {line ? <span className={T.meta}>{line}</span> : null}
      </span>
      {value != null && value !== "" && (
        <span className={cn(T.body, "min-w-0 max-w-[55%] truncate text-right", disabled && "text-text-disabled")}>{value}</span>
      )}
      {trailing}
      {opens && <Chevron disabled={disabled} />}
    </>
  );
  if (props.href && !disabled)
    return (
      <li>
        <Link href={props.href} className={LIST_ROW}>
          {body}
        </Link>
      </li>
    );
  if (props.onClick || (props.href && disabled))
    return (
      <li>
        <button type="button" disabled={disabled} onClick={props.onClick} className={cn(LIST_ROW, "disabled:cursor-not-allowed disabled:hover:bg-transparent")}>
          {body}
        </button>
      </li>
    );
  return <li className={cn(LIST_ROW, "hover:bg-transparent")}>{body}</li>;
}
