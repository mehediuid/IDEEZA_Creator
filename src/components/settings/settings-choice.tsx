"use client";

// The Figma radio-list modal (Select Language 22048:34277, Date & Time
// Formatting 22048:34355, "Who can send you contribution request?"
// 22048:34563): a title, one radio row per option with an optional line under
// it, Cancel / Update. Nothing changes until Update. An option can be
// disabled with its reason ("Not available yet").
//
// ChoiceRow is the row on its own, for choices that save as they are made.

import * as React from "react";
import { Button, ModalFrame, Radio } from "@/components/ideeza";
import { cn } from "@/lib/utils";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  disabled?: boolean;
  reason?: string;
}

const ROW =
  "flex min-h-[44px] items-start gap-[12px] rounded-lg px-[12px] py-[10px] transition-colors duration-fast has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus";

export function ChoiceRow<T extends string>({
  name,
  option,
  checked,
  onChange,
}: {
  name: string;
  option: ChoiceOption<T>;
  checked: boolean;
  onChange: (v: T) => void;
}) {
  const off = !!option.disabled;
  return (
    <label className={cn(ROW, off ? "cursor-not-allowed" : "cursor-pointer hover:bg-bg-subtle")}>
      <input
        type="radio"
        name={name}
        value={option.value}
        checked={checked}
        disabled={off}
        onChange={() => onChange(option.value)}
        className="sr-only"
      />
      <Radio checked={checked} decorative disabled={off} className="mt-[2px]" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("text-md font-medium leading-md", off ? "text-text-disabled" : "text-text-primary")}>{option.label}</span>
        {option.hint && <span className="text-md leading-md text-text-secondary">{option.hint}</span>}
        {off && option.reason && <span className="text-md leading-md text-text-tertiary">{option.reason}</span>}
      </span>
    </label>
  );
}

export function SettingsChoiceDialog<T extends string>({
  open,
  title,
  description,
  options,
  value,
  onClose,
  onSave,
  saveLabel = "Update",
}: {
  open: boolean;
  title: string;
  description?: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onClose: () => void;
  /** Returns false when the write was refused; the dialog then stays open. */
  onSave: (v: T) => boolean | void;
  saveLabel?: string;
}) {
  const [draft, setDraft] = React.useState<T>(value);
  const [failed, setFailed] = React.useState(false);
  const name = React.useId();
  // Every opening starts from the saved value (during render, no second pass).
  const [seenOpen, setSeenOpen] = React.useState(open);
  if (seenOpen !== open) {
    setSeenOpen(open);
    if (open) {
      setDraft(value);
      setFailed(false);
    }
  }

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      description={description}
      footer={
        <div className="flex w-full flex-col gap-[8px]">
          {failed && (
            <p role="alert" className="m-0 text-md leading-md text-text-error">
              This browser couldn&apos;t save it (storage is full or blocked). Nothing changed.
            </p>
          )}
          <div className="flex justify-end gap-[8px]">
            <Button type="button" hierarchy="secondary" size="lg" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              hierarchy="primary"
              size="lg"
              onClick={() => {
                if (onSave(draft) === false) setFailed(true);
                else onClose();
              }}
            >
              {saveLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div role="radiogroup" aria-label={title} className="flex flex-col gap-[2px]">
        {options.map((o) => (
          <ChoiceRow key={o.value} name={name} option={o} checked={draft === o.value} onChange={setDraft} />
        ))}
      </div>
    </ModalFrame>
  );
}
