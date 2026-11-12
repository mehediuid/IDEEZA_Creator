"use client";

// The one FAQ accordion of /m: Help's questions and Plan & pricing's Pricing
// FAQs read the same — one card, a border/default line between questions, the
// question in Body/SM Medium (T.rowTitle), the answer in Body/SM (T.body),
// the same arrow. Pricing's Figma numbers its questions (`numbered`), and
// either may add something under an answer (`extra`: the screen that does it,
// or "Was this helpful?").

import * as React from "react";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";
import { LIST_CARD, LIST_DIVIDERS } from "../kit/list";
import { T } from "../type";

export type FaqEntry = { id: string; q: string; a: string };

export function FaqList<F extends FaqEntry>({
  items,
  open,
  onToggle,
  numbered,
  extra,
  label,
}: {
  items: readonly F[];
  /** The id of the open question; null when all are closed. */
  open: string | null;
  onToggle: (id: string) => void;
  numbered?: boolean;
  extra?: (item: F) => React.ReactNode;
  label?: string;
}) {
  const base = React.useId();
  return (
    <ul aria-label={label} className={cn(LIST_CARD, LIST_DIVIDERS)}>
      {items.map((f, i) => {
        const on = open === f.id;
        const panel = `${base}-${i}`;
        return (
          <li key={f.id} className="flex flex-col">
            <h3>
              <button
                type="button"
                aria-expanded={on}
                aria-controls={panel}
                onClick={() => onToggle(f.id)}
                className="flex min-h-[56px] w-full items-center gap-5 px-8 py-5 text-left outline-none focus-visible:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
              >
                {numbered && (
                  <span aria-hidden className={cn(T.micro, "inline-flex h-[24px] min-w-[28px] shrink-0 items-center justify-center rounded-full bg-bg-subtle tabular-nums")}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
                <span className={cn(T.rowTitle, "min-w-0 flex-1")}>{f.q}</span>
                <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
                  <Icon icon={on ? ArrowUp01Icon : ArrowDown01Icon} size={20} />
                </span>
              </button>
            </h3>
            {on && (
              <div id={panel} className="flex flex-col items-start gap-4 px-8 pb-6">
                <p className={T.body}>{f.a}</p>
                {extra?.(f)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
