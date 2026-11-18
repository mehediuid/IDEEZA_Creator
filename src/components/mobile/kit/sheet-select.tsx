"use client";

// A06 Select (Size 44) on a phone: the field looks like the DS select, and
// its list is a pick-one sheet (owner rule: every list rises from the bottom;
// a pick-one sheet applies on tap and has no button): the kit's PickSheet.

import * as React from "react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { PickSheet } from "./pick-list";

export type SheetOption = { value: string; label: string };

export function SheetSelect({
  value,
  options,
  onChange,
  placeholder,
  title,
  id,
  invalid,
  className,
}: {
  value: string;
  options: readonly SheetOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** The sheet's title (the field's label). */
  title: string;
  id?: string;
  invalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const picked = options.find((o) => o.value === value);
  return (
    <>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-label={picked ? `${title}: ${picked.label}` : title}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-[44px] w-full items-center justify-between gap-4 rounded-xl border-[length:var(--border-width-1-5)] border-solid bg-[var(--color-input-bg)] px-6 text-left outline-none transition-[border-color,box-shadow] duration-fast focus-visible:shadow-focus-brand",
          invalid ? "border-[var(--color-input-border-error)]" : "border-[var(--color-input-border)] focus-visible:border-[var(--color-input-border-focus)]",
          className,
        )}
      >
        <span className={cn(T.bodyLg, "truncate", picked ? "text-[color:var(--color-input-text)]" : "text-[color:var(--color-input-placeholder)]")}>
          {picked?.label ?? placeholder}
        </span>
        <span className="text-[color:var(--color-icon-default)]">
          <Icon icon={ArrowDown01Icon} size={16} />
        </span>
      </button>
      <PickSheet open={open} onClose={() => setOpen(false)} title={title} value={value} options={options} onPick={onChange} />
    </>
  );
}
