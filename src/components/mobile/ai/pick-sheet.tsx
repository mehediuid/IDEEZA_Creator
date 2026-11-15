"use client";

// A06 Select on a phone for the AI tab's forms (the project, a spec choice, a
// link's protocol): a 44 px field that opens the kit's pick-one sheet
// (kit/pick-list.tsx — one row look for every pick in /m). An option can say
// a little more on a line under it, one that can't be picked is greyed, and
// options may sit under a heading ("Existing projects"). A pick applies on
// tap and closes the sheet (Shared kit rule: no button). `PickRow` is the
// same pick drawn as a grouped-list row (label, value, chevron), for a sheet
// of several choices (Change link).

import * as React from "react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { Eyebrow } from "../kit/eyebrow";
import { Chevron, LIST_ROW } from "../kit/list";
import { PickList } from "../kit/pick-list";
import { Sheet } from "../kit/sheet";

export type PickOption = { value: string; label: string; sub?: string; disabled?: boolean; group?: string };

/** The options in their groups, in order: one kit list per heading. */
function groupsOf(options: readonly PickOption[]): { head: string | null; options: PickOption[] }[] {
  const out: { head: string | null; options: PickOption[] }[] = [];
  for (const o of options) {
    const head = o.group ?? null;
    const last = out[out.length - 1];
    if (last && last.head === head) last.options.push(o);
    else out.push({ head, options: [o] });
  }
  return out;
}

/** The field and its sheet. */
export function PickField({
  value,
  options,
  onChange,
  title,
  placeholder,
  id,
  disabled,
}: {
  value: string | null;
  options: readonly PickOption[];
  onChange: (value: string) => void;
  title: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const picked = options.find((o) => o.value === value);
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };
  return (
    <>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-label={picked ? `${title}: ${picked.label}` : title}
        onClick={() => setOpen(true)}
        className="flex h-[44px] w-full items-center justify-between gap-4 rounded-xl border-[length:var(--border-width-1-5)] border-solid border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-6 text-left outline-none transition-[border-color,box-shadow] duration-fast focus-visible:border-[var(--color-input-border-focus)] focus-visible:shadow-focus-brand disabled:cursor-not-allowed disabled:bg-[var(--color-input-bg-disabled)]"
      >
        <span className={cn(T.bodyLg, "truncate", picked ? "text-[color:var(--color-input-text)]" : "text-[color:var(--color-input-placeholder)]")}>
          {picked?.label ?? placeholder}
        </span>
        <span className="text-[color:var(--color-icon-default)]">
          <Icon icon={ArrowDown01Icon} size={16} />
        </span>
      </button>
      <OptionsSheet open={open} onClose={() => setOpen(false)} title={title} value={value} options={options} onPick={pick} />
    </>
  );
}

/** The same pick as a grouped-list row (the iOS Settings pattern): the label, the picked
 *  value at the end and the chevron; a tap opens the same pick-one sheet. Put it in a kit
 *  `ListCard` — it renders its own `<li>`. */
export function PickRow({
  label,
  value,
  options,
  onChange,
  title,
  placeholder,
  disabled,
}: {
  label: string;
  value: string | null;
  options: readonly PickOption[];
  onChange: (value: string) => void;
  /** The sheet's title; the label when left out. */
  title?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const picked = options.find((o) => o.value === value);
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-label={`${label}: ${picked?.label ?? placeholder ?? "not set"}`}
        onClick={() => setOpen(true)}
        className={cn(LIST_ROW, "disabled:cursor-not-allowed disabled:hover:bg-transparent")}
      >
        <span className={cn(T.body, "shrink-0", disabled ? "text-text-disabled" : "text-text-primary")}>{label}</span>
        <span className={cn(T.body, "min-w-0 flex-1 text-right", (!picked || disabled) && "text-text-tertiary")}>{picked?.label ?? placeholder}</span>
        <Chevron disabled={disabled} />
      </button>
      <OptionsSheet
        open={open}
        onClose={() => setOpen(false)}
        title={title ?? label}
        value={value}
        options={options}
        onPick={(v) => {
          onChange(v);
          setOpen(false);
        }}
      />
    </li>
  );
}

/** The pick-one sheet both share: one kit list per heading. */
function OptionsSheet({
  open,
  onClose,
  title,
  value,
  options,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  value: string | null;
  options: readonly PickOption[];
  onPick: (value: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {groupsOf(options).map((g, i) => (
        <div key={g.head ?? `group-${i}`} className="flex flex-col gap-2">
          {g.head && (
            <Eyebrow tone="tertiary" as="h3">
              {g.head}
            </Eyebrow>
          )}
          <PickList
            label={g.head ?? title}
            value={value}
            options={g.options.map((o) => ({ value: o.value, label: o.label, helper: o.sub, disabled: o.disabled }))}
            onPick={onPick}
          />
        </div>
      ))}
    </Sheet>
  );
}
