"use client";

// Settings › Notifications' own sheets (M09, Done saves and says "Saved"):
// · ST-21 Quiet hours: Starts / Ends rows, each the phone's native time wheel
//   (an <input type="time">).
// · ST-24 Bids to hear about: Every bid, or bids from an amount with the
//   Minimum bid field. The web's rule (lib/notifications/filter.ts isHeard): a
//   bid under the amount still lists, but doesn't pop up or count.

import * as React from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { TextInput } from "@/components/ideeza/text-input";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { DEMO_USD_RATES } from "@/lib/account/payout";
import { Sheet } from "../kit/sheet";
import { cn } from "@/lib/utils";
import { LIST_CARD, LIST_DIVIDERS } from "../kit/list";
import { T } from "../type";
import { useToast } from "../kit/toast";

const SAVE_FAILED = "Couldn’t save. Nothing changed.";
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

function SheetActions({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  return (
    <>
      <Button size="xl" className="w-full" onClick={onDone}>
        Done
      </Button>
      <Button hierarchy="secondary" size="xl" className="w-full" onClick={onCancel}>
        Cancel
      </Button>
    </>
  );
}

// ─────────────────────────── ST-21 quiet hours ───────────────────────────

function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const input = React.useRef<HTMLInputElement>(null);
  const open = () => {
    try {
      input.current?.showPicker();
    } catch {
      input.current?.focus();
    }
  };
  return (
    <label
      onClick={(e) => {
        if (e.target === input.current) return;
        e.preventDefault();
        open();
      }}
      className="flex min-h-[48px] cursor-pointer items-center gap-6 px-8 py-6 has-[:focus-visible]:bg-bg-subtle"
    >
      <span className={cn(T.body, "min-w-0 flex-1 text-text-primary")}>{label}</span>
      <input
        ref={input}
        type="time"
        value={value}
        aria-label={label}
        onChange={(e) => CLOCK.test(e.target.value) && onChange(e.target.value)}
        className={cn(T.body, "w-[96px] shrink-0 cursor-pointer bg-transparent text-right outline-none [&::-webkit-calendar-picker-indicator]:hidden")}
      />
      <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
        <Icon icon={ArrowRight01Icon} size={24} />
      </span>
    </label>
  );
}

export function QuietHoursSheet({
  open,
  onClose,
  from,
  to,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  from: string;
  to: string;
  /** False when the browser refused: the sheet stays open and says so. */
  onSave: (from: string, to: string) => boolean;
}) {
  const toast = useToast();
  const [draft, setDraft] = React.useState({ from, to });
  const [failed, setFailed] = React.useState(false);
  // Each opening starts from what is saved.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft({ from, to });
      setFailed(false);
    }
  }
  const done = () => {
    if (!onSave(draft.from, draft.to)) return setFailed(true);
    onClose();
    toast({ title: "Saved" });
  };
  return (
    <Sheet open={open} onClose={onClose} title="Quiet hours" actions={<SheetActions onDone={done} onCancel={onClose} />}>
      <div className={cn(LIST_CARD, LIST_DIVIDERS, "rounded-lg")}>
        <TimeRow label="Starts" value={draft.from} onChange={(v) => setDraft((d) => ({ ...d, from: v }))} />
        <TimeRow label="Ends" value={draft.to} onChange={(v) => setDraft((d) => ({ ...d, to: v }))} />
      </div>
      <p className={T.meta}>
        {draft.from === draft.to ? "Start and end are the same time, so quiet hours never start." : "In this phone’s time."}
      </p>
      {failed && <p className={cn(T.meta, "text-text-error")}>{SAVE_FAILED}</p>}
    </Sheet>
  );
}

// ─────────────────────────── ST-24 bids ───────────────────────────

const EVERY = "every";
const AMOUNT = "amount";
type BidChoice = typeof EVERY | typeof AMOUNT;

const BID_OPTIONS: { value: BidChoice; label: string; hint: string }[] = [
  { value: EVERY, label: "Every bid", hint: "Each new bid on your listings." },
  { value: AMOUNT, label: "Bids from an amount", hint: "Only bids of the amount below or more. Smaller bids still list." },
];

export const dollars = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** "50", "12.5" → the amount; null for anything that isn't over $0 with at most two decimals. */
function amountOf(text: string): number | null {
  const t = text.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 && n <= 1_000_000 ? n : null;
}

export function BidsSheet({
  open,
  onClose,
  value,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  /** In USD; null = every bid. */
  value: number | null;
  onSave: (v: number | null) => boolean;
}) {
  const toast = useToast();
  const ids = useFieldIds(["amount"] as const);
  const name = React.useId();
  const [picked, setPicked] = React.useState<BidChoice>(value === null ? EVERY : AMOUNT);
  const [text, setText] = React.useState(value === null ? "" : String(value));
  const [checked, setChecked] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPicked(value === null ? EVERY : AMOUNT);
      setText(value === null ? "" : String(value));
      setChecked(false);
      setFailed(false);
    }
  }

  const amount = amountOf(text);
  const error = picked === AMOUNT && checked && amount === null ? "Enter an amount over $0, like 50." : undefined;
  const done = () => {
    setChecked(true);
    if (picked === AMOUNT && amount === null) return;
    if (!onSave(picked === EVERY ? null : amount)) return setFailed(true);
    onClose();
    toast({ title: "Saved" });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Bids to hear about" actions={<SheetActions onDone={done} onCancel={onClose} />}>
      <div role="radiogroup" aria-label="Bids to hear about" className="flex flex-col gap-4">
        {BID_OPTIONS.map((o) => (
          <label
            key={o.value}
            className="relative flex min-h-[44px] cursor-pointer items-start gap-8 rounded-md py-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus"
          >
            <input type="radio" className="sr-only" name={name} checked={picked === o.value} onChange={() => setPicked(o.value)} />
            <Radio checked={picked === o.value} decorative className="mt-1" />
            <span className="flex flex-col gap-1">
              <span className={T.bodyLg}>{o.label}</span>
              <span className={T.meta}>{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
      {picked === AMOUNT && (
        <div className="flex flex-col gap-3">
          <Field label="Minimum bid" htmlFor={ids.amount.id} error={error} errorId={ids.amount.errorId}>
            <TextInput
              id={ids.amount.id}
              size="xl"
              prefixText="$"
              inputMode="decimal"
              placeholder="50"
              value={text}
              onValueChange={setText}
              onBlur={() => setChecked(true)}
              {...errorProps(error, ids.amount.errorId)}
            />
          </Field>
          <p className={T.meta}>
            A test ETH counts as {dollars(Number(DEMO_USD_RATES.ETH))}, the demo rate Get paid uses.
          </p>
        </div>
      )}
      {failed && <p className={cn(T.meta, "text-text-error")}>{SAVE_FAILED}</p>}
    </Sheet>
  );
}
