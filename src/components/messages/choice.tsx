"use client";

// A labelled radio or checkbox row for the Messages dialogs: a native input
// (keyboard, form semantics and the radio group's arrow keys come with it)
// drawn with the design system's Radio / Checkbox, the whole row the target.

import { Checkbox, Radio } from "@/components/ideeza";

const ROW =
  "flex min-h-[44px] cursor-pointer items-start gap-4 rounded-lg px-3 py-3 transition-colors duration-fast hover:bg-bg-subtle has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus";

export function RadioRow({
  name,
  checked,
  onChange,
  label,
  hint,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className={ROW}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      <Radio checked={checked} decorative className="mt-[1px]" />
      <span className="min-w-0 flex-1">
        <span className="block text-md font-medium leading-md text-text-primary">{label}</span>
        {hint && <span className="block text-md leading-md text-text-secondary">{hint}</span>}
      </span>
    </label>
  );
}

export function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className={ROW}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <Checkbox checked={checked} decorative className="mt-[1px]" />
      <span className="min-w-0 flex-1 text-md font-medium leading-md text-text-primary">{label}</span>
    </label>
  );
}
