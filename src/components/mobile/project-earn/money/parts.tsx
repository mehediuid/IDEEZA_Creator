"use client";

// Earn › Money's phone parts (Figma 17 at 375 px), grouped like a native
// settings list:
// · MoneySection — the section's heading (Heading/H6) with ⓘ, which holds
//   the web's lead line in a sheet (lens 1), an aside on its row (the
//   Testnet demo badge), an optional one-line `sub`, then its list;
// · ROW_BUTTON — a row a ListCard opens a sheet from (Mobile / Info row: 12
//   padding, the value at its end, a chevron), with its pressed state;
// · AddRow — a list's last row that adds to it (+, brand ink), its line under
//   it (the empty or the limit line); off, with that line, at the limit.

import * as React from "react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";
import { EARN_H2_CLASS, InfoButton } from "../parts";
import { T } from "../../type";

export const ROW_BUTTON =
  "flex min-h-[44px] w-full items-center gap-4 p-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle active:bg-bg-subtle";

export function MoneySection({
  id,
  title,
  lead,
  more,
  sub,
  aside,
  children,
}: {
  id: string;
  title: string;
  /** The web's line under the heading: in the ⓘ sheet. */
  lead: string;
  /** More of the ⓘ sheet (a note that used to sit under the list). */
  more?: React.ReactNode;
  /** One short line that stays under the heading. */
  sub?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="flex scroll-mt-8 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 id={headingId} className={cn(EARN_H2_CLASS, "min-w-0")}>
            {title}
          </h2>
          <InfoButton title={title}>
            <p className={cn(T.body, "text-text-primary")}>{lead}</p>
            {more}
          </InfoButton>
          {aside && <span className="ml-auto shrink-0">{aside}</span>}
        </div>
        {sub && <p className={T.meta}>{sub}</p>}
      </div>
      {children}
    </section>
  );
}

/** A list's last row that adds to it; `disabled` keeps it in place with its reason as the line. */
export function AddRow({ label, line, disabled, onClick }: { label: string; line?: string | null; disabled?: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        aria-disabled={disabled || undefined}
        onClick={() => {
          if (!disabled) onClick();
        }}
        className={cn(ROW_BUTTON, disabled && "cursor-not-allowed hover:bg-transparent active:bg-transparent")}
      >
        <span aria-hidden className={cn("shrink-0", disabled ? "text-[color:var(--color-icon-disabled)]" : "text-text-brand")}>
          <Icon icon={PlusSignIcon} size={24} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn(T.rowTitle, disabled ? "text-text-disabled" : "text-text-brand")}>{label}</span>
          {line && <span className={T.meta}>{line}</span>}
        </span>
      </button>
    </li>
  );
}
