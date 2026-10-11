"use client";

// The three step bodies of the Sell copies flow (Build and Earn P1-3).
// Presentational: the dialog (sell-flow-dialog.tsx) owns the draft, the
// problem shown and the wallet requests, and every value and rule comes from
// sell-flow.ts. Each control's id is `${prefix}-${field}`, so the dialog can
// send focus to the field a problem names.
//
// The checkbox row and the labels are reused from editions/create-dialog.tsx,
// so the flow reads like the edition dialogs beside it. The selected option is
// outlined in the text colour: the dialog's one violet control is its CTA.

import * as React from "react";
import { ArrowDown01Icon, CheckmarkCircle02Icon, CircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Radio, SelectMenu, Textarea, TextInput, type SelectOption } from "@/components/ideeza";
import { ROYALTY_MAX, ROYALTY_MIN, TOKENS_BY_NETWORK, type Network, type Token } from "@/lib/brief/types";
import { feePercentText, payoutOf } from "@/lib/market/fee";
import {
  NO_INCOME_LINE,
  NOTE_MAX,
  ROYALTY_HINT,
  type SellCheck,
  type SellDraft,
  type SellField,
  type SellProblem,
} from "@/lib/market/sell-flow";
import type { EditionKind, EditionUse } from "@/lib/market/types";
import { formatAmount, toMicros } from "@/lib/wallet/money";
import { cn } from "@/lib/utils";
import { CheckRow, ERROR, HINT, LABEL, TAP } from "../../editions/create-dialog";

export type StepProps = {
  draft: SellDraft;
  change: (patch: Partial<SellDraft>) => void;
  problem: SellProblem | null;
  /** Ids are `${prefix}-{field}`. */
  prefix: string;
};

const errOf = (problem: SellProblem | null, field: SellField) => (problem?.field === field ? problem.message : null);

/** Digits and one dot. */
function decimal(raw: string): string {
  const kept = raw.replace(/[^\d.]/g, "");
  const dot = kept.indexOf(".");
  return dot === -1 ? kept : kept.slice(0, dot + 1) + kept.slice(dot + 1).replace(/\./g, "");
}

// ───────────────────────── a radio group of options ─────────────────────────

export type Choice<V extends string> = { value: V; title: string; lines: string[]; disabled: boolean };

/** Arrows move and pick, a closed option is skipped. `large`: step 1's two options. */
function ChoiceGroup<V extends string>({
  id,
  label,
  labelledBy,
  choices,
  value,
  onChange,
  error,
  large = false,
}: {
  id: string;
  /** A visible label, or `labelledBy` the step's heading. */
  label?: string;
  labelledBy?: string;
  choices: Choice<V>[];
  value: V | null;
  onChange: (v: V) => void;
  error: string | null;
  large?: boolean;
}) {
  const labelId = `${id}-label`;
  const errId = `${id}-err`;
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const checkedAt = choices.findIndex((c) => c.value === value && !c.disabled);
  const tabAt = checkedAt >= 0 ? checkedAt : choices.findIndex((c) => !c.disabled);
  const move = (from: number, dir: 1 | -1) => {
    for (let step = 1; step <= choices.length; step++) {
      const i = (from + dir * step + choices.length) % choices.length;
      if (!choices[i].disabled) {
        onChange(choices[i].value);
        refs.current[i]?.focus();
        return;
      }
    }
  };
  return (
    <div className="flex flex-col gap-[var(--spacing-3)]">
      {label && (
        <span id={labelId} className={LABEL}>
          {label}
        </span>
      )}
      <div
        id={id}
        role="radiogroup"
        aria-labelledby={label ? labelId : labelledBy}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errId : undefined}
        className={cn("flex flex-col", large ? "gap-4" : "gap-3")}
      >
        {choices.map((c, i) => {
          const on = c.value === value && !c.disabled;
          return (
            <button
              key={c.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={c.disabled || undefined}
              tabIndex={i === tabAt ? 0 : -1}
              onClick={() => {
                if (!c.disabled) onChange(c.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  move(i, 1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  move(i, -1);
                }
              }}
              className={cn(
                "flex min-h-[var(--touch-min)] rounded-lg border border-solid text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                large ? "items-start gap-4 p-8" : "items-center gap-4 px-6 py-3",
                c.disabled
                  ? "cursor-not-allowed border-border bg-bg-surface-raised"
                  : on
                    ? "border-text-primary bg-bg-subtle"
                    : "border-border bg-bg-surface hover:bg-bg-subtle",
              )}
            >
              <Radio checked={on} disabled={c.disabled} decorative size="sm" className={large ? "mt-[3px]" : undefined} />
              <span className={cn("flex min-w-0 flex-1 flex-col", large ? "gap-2" : "gap-1")}>
                <span
                  className={cn(
                    "break-words font-semibold",
                    large ? "text-md" : "text-sm",
                    c.disabled ? "text-text-secondary" : "text-text-primary",
                  )}
                >
                  {c.title}
                </span>
                {c.lines.map((line) => (
                  <span key={line} className="text-sm leading-relaxed text-text-secondary">
                    {line}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
      {error && (
        <span id={errId} className={ERROR}>
          {error}
        </span>
      )}
    </div>
  );
}

// ───────────────────────── 1 · What are you selling? ─────────────────────────

export function WhatStep({
  draft,
  problem,
  prefix,
  headingId,
  choices,
  onKind,
}: Omit<StepProps, "change"> & { headingId: string; choices: Choice<EditionKind>[]; onKind: (kind: EditionKind) => void }) {
  return (
    <ChoiceGroup
      id={`${prefix}-kind`}
      labelledBy={headingId}
      choices={choices}
      value={draft.kind}
      onChange={onKind}
      error={errOf(problem, "kind")}
      large
    />
  );
}

// ───────────────────────── 2 · Copies and price ─────────────────────────

function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  decimals,
  placeholder,
}: {
  id: string;
  label: string;
  hint: string | null;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
  /** A price (digits and one dot), else a whole number. */
  decimals: boolean;
  placeholder?: string;
}) {
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <TextInput
        id={id}
        size="xl"
        value={value}
        onValueChange={(v) => onChange(decimals ? decimal(v) : v.replace(/[^\d]/g, ""))}
        inputMode={decimals ? "decimal" : "numeric"}
        placeholder={placeholder}
        invalid={!!error}
        aria-invalid={!!error || undefined}
        aria-describedby={note ? noteId : undefined}
      />
      {note && (
        <span id={noteId} className={error ? ERROR : HINT}>
          {note}
        </span>
      )}
    </div>
  );
}

const PROMISES: { field: "leadTime" | "refund" | "seller"; text: string }[] = [
  { field: "leadTime", text: "Lead time: I'll tell each buyer when to expect it, and ship within that time." },
  { field: "refund", text: "Refund promise: if I can't make or ship an order, I'll refund the buyer in full." },
  { field: "seller", text: "I'm the seller: I make, ship and support each one myself. IDEEZA doesn't make or ship it." },
];

/** "You get 0.04875 ETH per copy after the 2.5% fee.", once the price reads as one. */
function payoutLineOf(price: string, token: Token | null): string | null {
  const micros = toMicros(price.trim());
  if (!token || micros === null || micros <= BigInt(0)) return null;
  return `You get ${formatAmount(payoutOf(price.trim()), token)} per copy after the ${feePercentText()} fee.`;
}

export function PriceStep({
  draft,
  change,
  problem,
  prefix,
  network,
  isNew,
  uses,
  moreOpen,
  onMoreOpen,
}: StepProps & {
  network: Network;
  /** The track isn't created yet, so Copies is asked. */
  isNew: boolean;
  uses: Choice<EditionUse>[];
  moreOpen: boolean;
  onMoreOpen: (open: boolean) => void;
}) {
  const tokens: SelectOption<Token>[] = TOKENS_BY_NETWORK[network].map((t) => ({ value: t, label: t }));
  const physical = draft.kind === "physical";
  const noteId = `${prefix}-note`;
  const noteErr = errOf(problem, "note");
  const reasonId = `${prefix}-reason`;
  return (
    <>
      {isNew && (
        <NumberField
          id={`${prefix}-count`}
          label="Copies"
          hint={
            physical
              ? "List only as many as you can make and ship. A whole number from 1 to 10,000."
              : "Each copy is one licence. A whole number from 1 to 10,000."
          }
          value={draft.count}
          onChange={(count) => change({ count: count.slice(0, 6) })}
          error={errOf(problem, "count")}
          decimals={false}
        />
      )}
      <SelectMenu
        id={`${prefix}-token`}
        label="Token"
        placeholder="Choose a token"
        value={draft.token}
        onChange={(token) => change({ token })}
        options={tokens}
        error={errOf(problem, "token") ?? undefined}
      />
      <NumberField
        id={`${prefix}-regular`}
        label="Price"
        hint={payoutLineOf(draft.regular, draft.token)}
        value={draft.regular}
        onChange={(regular) => change({ regular })}
        error={errOf(problem, "regular")}
        decimals
        placeholder="e.g. 0.01"
      />

      {physical && (
        <>
          <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
            <label htmlFor={noteId} className={LABEL}>
              How you&apos;ll make and ship it
            </label>
            <Textarea
              id={noteId}
              rows={4}
              value={draft.note}
              maxLength={NOTE_MAX}
              onValueChange={(note) => change({ note })}
              invalid={!!noteErr}
              aria-invalid={!!noteErr || undefined}
              aria-required
              aria-describedby={`${noteId}-note`}
              placeholder="e.g. I print the case and assemble each one in my workshop, then post it tracked."
            />
            <span id={`${noteId}-note`} className={cn("flex flex-wrap justify-between gap-x-4", noteErr ? ERROR : HINT)}>
              <span>{noteErr ?? "Where it's made, how it's shipped and how long that takes."}</span>
              <span className="tabular-nums">
                {draft.note.length}/{NOTE_MAX.toLocaleString("en-US")}
              </span>
            </span>
          </div>
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className={cn(LABEL, "mb-3 p-0")}>Your promises</legend>
            {PROMISES.map((p) => (
              <CheckRow
                key={p.field}
                id={`${prefix}-${p.field}`}
                invalid={problem?.field === p.field}
                describedBy={problem?.field === p.field ? reasonId : undefined}
                checked={draft.checks[p.field]}
                onToggle={() => change({ checks: { ...draft.checks, [p.field]: !draft.checks[p.field] } })}
              >
                {p.text}
              </CheckRow>
            ))}
          </fieldset>
        </>
      )}

      <details open={moreOpen} onToggle={(e) => onMoreOpen(e.currentTarget.open)} className="group rounded-lg border border-solid border-border">
        <summary className="flex min-h-[var(--touch-min)] cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-6 text-sm font-semibold text-text-primary outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus [&::-webkit-details-marker]:hidden">
          More options
          <span
            aria-hidden
            className="inline-flex text-text-tertiary transition-transform duration-normal ease-out group-open:rotate-180 motion-reduce:transition-none"
          >
            <Icon icon={ArrowDown01Icon} size={16} />
          </span>
        </summary>
        <div className="flex flex-col gap-8 border-t border-solid border-border p-6">
          <NumberField
            id={`${prefix}-extended`}
            label="Price with future updates"
            hint="Left empty, it's the same as the price."
            value={draft.extended}
            onChange={(extended) => change({ extended })}
            error={errOf(problem, "extended")}
            decimals
            placeholder={draft.regular.trim() || "e.g. 0.02"}
          />
          <ChoiceGroup
            id={`${prefix}-use`}
            label="Use"
            choices={uses}
            value={draft.use}
            onChange={(use) => change({ use })}
            error={errOf(problem, "use")}
          />
          <NumberField
            id={`${prefix}-royalties`}
            label="Royalties (%)"
            hint={ROYALTY_HINT}
            value={draft.royalties}
            onChange={(royalties) => change({ royalties: royalties.slice(0, 2) })}
            error={errOf(problem, "royalties")}
            decimals={false}
            placeholder={`${ROYALTY_MIN} to ${ROYALTY_MAX}`}
          />
        </div>
      </details>
    </>
  );
}

// ───────────────────────── 3 · Review ─────────────────────────

const FIX_LABEL: Record<NonNullable<SellCheck["fix"]>, string> = {
  projectNft: "Go to Your project",
  video: "Generate AI video",
  price: "Back to step 2",
};

function ReadinessRows({
  checks,
  onFix,
  fixRef,
}: {
  checks: SellCheck[];
  onFix: (fix: NonNullable<SellCheck["fix"]>) => void;
  /** The first fix's control, where a press on the blocked CTA sends focus. */
  fixRef: React.RefObject<HTMLElement | null>;
}) {
  const firstFixAt = checks.findIndex((c) => !c.ok && c.fix !== null);
  return (
    <ul aria-label="Before you sell" className="m-0 flex list-none flex-col gap-6 p-0">
      {checks.map((c, i) => {
        const ref = i === firstFixAt ? fixRef : undefined;
        const fix = c.ok ? null : c.fix;
        return (
          <li key={c.id} className="flex items-start gap-4">
            <span aria-hidden className={cn("inline-flex pt-px", c.ok ? "text-text-success" : "text-text-tertiary")}>
              <Icon icon={c.ok ? CheckmarkCircle02Icon : CircleIcon} size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="break-words text-md font-semibold text-text-primary">
                {c.title}
                <span className="sr-only">{c.ok ? ", ready" : ", not ready yet"}</span>
              </span>
              {c.detail && <span className="max-w-[62ch] text-sm leading-relaxed text-text-secondary">{c.detail}</span>}
              {fix && (
                <Button
                  ref={ref as React.RefObject<HTMLButtonElement> | undefined}
                  type="button"
                  hierarchy="secondary"
                  size="md"
                  className={cn("mt-2 self-start", TAP)}
                  onClick={() => onFix(fix)}
                >
                  {FIX_LABEL[fix]}
                </Button>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ReviewStep({
  draft,
  change,
  problem,
  prefix,
  rows,
  checks,
  onFix,
  fixRef,
  askOwner,
  children,
}: StepProps & {
  rows: { label: string; value: string }[];
  checks: SellCheck[];
  /** "projectNft" closes the flow for Sell's "Your project" card, where the listing starts. */
  onFix: (fix: NonNullable<SellCheck["fix"]>) => void;
  fixRef: React.RefObject<HTMLElement | null>;
  askOwner: boolean;
  /** The ladder's level check, while a step is missing. */
  children?: React.ReactNode;
}) {
  const reasonId = `${prefix}-reason`;
  const boxProps = (field: SellField) => ({
    id: `${prefix}-${field}`,
    invalid: problem?.field === field,
    describedBy: problem?.field === field ? reasonId : undefined,
  });
  return (
    <>
      <dl className="m-0 flex flex-col divide-y divide-border rounded-lg border border-solid border-border">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-1 px-6 py-4 [@media(min-width:480px)]:flex-row [@media(min-width:480px)]:gap-6">
            <dt className="shrink-0 text-sm text-text-secondary [@media(min-width:480px)]:w-[96px]">{r.label}</dt>
            <dd className="m-0 min-w-0 break-words text-sm font-medium text-text-primary">{r.value}</dd>
          </div>
        ))}
      </dl>
      <ReadinessRows checks={checks} onFix={onFix} fixRef={fixRef} />
      {children}
      <div className="flex flex-col gap-3">
        {askOwner && (
          <CheckRow {...boxProps("owner")} checked={draft.owner} onToggle={() => change({ owner: !draft.owner })}>
            I confirm I&apos;m the rightful owner of this project, virtually and physically, and I take responsibility for any legal or
            intellectual-property issue it raises.
          </CheckRow>
        )}
        <CheckRow {...boxProps("lazy")} checked={draft.lazy} onToggle={() => change({ lazy: !draft.lazy })}>
          I understand each copy is minted only when it&apos;s bought, so nothing is charged now.
        </CheckRow>
      </div>
      <p className="m-0 max-w-[62ch] text-sm leading-relaxed text-text-secondary">{NO_INCOME_LINE}</p>
    </>
  );
}
