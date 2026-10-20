"use client";

// The controls the Audience pages share (User Panel V2 "Audience | Profile &
// Tagging" 22048:34433): a "who can…" row whose value sits on the right as a
// bordered choice with a chevron (Figma's "Public ⌄") and opens the Figma
// radio modal (22048:34563), and a toggle row. Both save at once — the
// modal on Update, the toggle on the switch (spec §1.7) — and a refused write
// says so under the row.

import * as React from "react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Toggle } from "@/components/ideeza";
import type { Reach } from "@/lib/settings/prefs";
import { SAVE_FAILED, SettingsRow } from "./settings-card";
import { SettingsChoiceDialog, type ChoiceOption } from "./settings-choice";

/** A 44 px hit area round a small control under a finger (DS --touch-min), the control's own size under a mouse. */
export const TOUCH_AREA =
  "relative [@media(pointer:coarse)]:after:absolute [@media(pointer:coarse)]:after:left-1/2 [@media(pointer:coarse)]:after:top-1/2 [@media(pointer:coarse)]:after:size-[var(--touch-min)] [@media(pointer:coarse)]:after:-translate-x-1/2 [@media(pointer:coarse)]:after:-translate-y-1/2 [@media(pointer:coarse)]:after:content-['']";

/** Anyone · People you work with · Only me (D9), each with the row's own line under it. */
export function reachOptions(hints: Record<Reach, string>): ChoiceOption<Reach>[] {
  return [
    { value: "everyone", label: "Anyone", hint: hints.everyone },
    { value: "work", label: "People you work with", hint: hints.work },
    { value: "nobody", label: "Only me", hint: hints.nobody },
  ];
}

/** The value on the right of a row, opening its choices. */
export function ChoiceButton({
  value,
  label,
  onClick,
  disabled,
}: {
  value: string;
  /** "Who can follow you: Anyone" — the row and its value, for assistive tech. */
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-[36px] max-w-[260px] cursor-pointer items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-surface px-[12px] py-[6px] text-left text-md font-medium leading-md text-text-primary outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:text-text-disabled max-md:min-h-[var(--touch-min)]"
    >
      <span className="min-w-0">{value}</span>
      <Icon icon={ArrowDown01Icon} size={16} className="shrink-0 text-text-secondary" />
    </button>
  );
}

export function ChoiceSettingRow<T extends string>({
  id,
  label,
  help,
  dialogTitle,
  dialogDescription,
  options,
  value,
  valueLabel,
  onSave,
  disabled,
}: {
  id: string;
  label: string;
  help?: React.ReactNode;
  dialogTitle: string;
  dialogDescription?: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  /** What the button shows; the chosen option's label when absent. */
  valueLabel?: string;
  /** False when the browser refused the write. */
  onSave: (v: T) => boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const shown = valueLabel ?? options.find((o) => o.value === value)?.label ?? "";
  return (
    <>
      <SettingsRow
        id={id}
        label={label}
        help={help}
        className={WRAP_ON_NARROW}
        control={<ChoiceButton value={shown} label={`${label}: ${shown}`} onClick={() => setOpen(true)} disabled={disabled} />}
      />
      <SettingsChoiceDialog
        open={open}
        title={dialogTitle}
        description={dialogDescription}
        options={options}
        value={value}
        onClose={() => setOpen(false)}
        onSave={onSave}
      />
    </>
  );
}

export function ToggleSettingRow({
  id,
  label,
  help,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  help?: React.ReactNode;
  checked: boolean;
  /** False when the browser refused the write. */
  onChange: (next: boolean) => boolean;
}) {
  const [failed, setFailed] = React.useState(false);
  return (
    <SettingsRow
      id={id}
      label={label}
      help={
        <>
          {help}
          {failed && (
            <span role="alert" className="mt-[4px] block text-md leading-md text-text-error">
              {SAVE_FAILED}
            </span>
          )}
        </>
      }
      control={<Toggle checked={checked} aria-label={label} className={TOUCH_AREA} onChange={() => setFailed(!onChange(!checked))} />}
    />
  );
}

/** On a narrow page a choice row's value sits under its label, so a long one ("People you
 *  work with") never squeezes the label into a column. */
const WRAP_ON_NARROW = "[@container(max-width:520px)]:flex-wrap [@container(max-width:520px)]:gap-y-[8px] [@container(max-width:520px)]:[&>span:first-child]:basis-full";
