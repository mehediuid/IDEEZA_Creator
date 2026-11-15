"use client";

// The one pick-one list of /m: _Select item rows (M12 10362:1563) in a sheet —
// MD with the label in Body/MD (44 tall, the phone's least tap target, lens
// 16), or LG 48 with a helper line under it, both with the pressed layer;
// the picked row carries the brand tick at its end. A pick applies on tap and
// closes the sheet (kit rule: a pick-one sheet has no button). Settings' own
// choices with Done (ST-31, radio on the left) are not this.
//
//   <PickSheet open={open} onClose={…} title="Sort by" value={sort} options={SORTS} onPick={setSort} />
//   <PickList label="Sort by" value={sort} options={SORTS} onPick={…} />   — inside your own Sheet

import * as React from "react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { PRESSED } from "./press";
import { Sheet } from "./sheet";

export type PickOption<V extends string = string> = {
  value: V;
  label: string;
  /** A line under the label (LG rows). */
  helper?: string;
  icon?: IconValue;
  disabled?: boolean;
};

export function PickList<V extends string>({
  options,
  value,
  onPick,
  label,
  className,
}: {
  options: readonly PickOption<V>[];
  value: V | null;
  onPick: (value: V) => void;
  /** The list's name for assistive tech (the sheet's title). */
  label: string;
  className?: string;
}) {
  const lg = options.some((o) => o.helper);
  return (
    <ul role="listbox" aria-label={label} className={cn("-mx-8 flex flex-col", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <li key={o.value}>
            <button
              type="button"
              role="option"
              aria-selected={on}
              disabled={o.disabled}
              onClick={() => onPick(o.value)}
              className={cn(
                "flex w-full items-center gap-4 rounded-md px-8 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:hover:bg-transparent",
                PRESSED,
                lg ? "min-h-[48px] py-2" : "min-h-[44px]",
              )}
            >
              {o.icon && (
                <span className="shrink-0 text-[color:var(--color-icon-default)]">
                  <Icon icon={o.icon} size={16} />
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn(T.bodyLg, "truncate", o.disabled && "text-text-disabled")}>{o.label}</span>
                {o.helper && <span className={T.meta}>{o.helper}</span>}
              </span>
              {on && (
                <span className="shrink-0 text-[color:var(--color-icon-brand)]">
                  <Icon icon={Tick02Icon} size={16} />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** A pick-one sheet: the title, the list; a pick applies and closes it. */
export function PickSheet<V extends string>({
  open,
  onClose,
  title,
  description,
  options,
  value,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  options: readonly PickOption<V>[];
  value: V | null;
  onPick: (value: V) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} description={description}>
      <PickList
        label={title}
        options={options}
        value={value}
        onPick={(v) => {
          onPick(v);
          onClose();
        }}
      />
    </Sheet>
  );
}
