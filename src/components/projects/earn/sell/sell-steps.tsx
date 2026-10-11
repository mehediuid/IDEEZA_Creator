"use client";

// The seven step bodies of the Sell the design / Sell the product flow
// (Build and Earn P1-3). Presentational: the dialog (sell-flow-dialog.tsx)
// owns the draft, the problem shown and the wallet requests, and every value
// and rule comes from sell-flow.ts. Each control's id is `${prefix}-${field}`,
// so the dialog can send focus to the field a problem names.
//
// The pieces every edition dialog shares — the read-only field, the "?" help,
// the checkbox row, the labels, the Each sale box — are reused from
// editions/create-dialog.tsx and editions/list-dialog.tsx, so the flow reads
// like the Create and Add to marketplace dialogs it stands in for.

import * as React from "react";
import Link from "next/link";
import { CheckmarkCircle02Icon, CircleIcon, Image01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Radio, SelectMenu, Textarea, TextInput, type SelectOption } from "@/components/ideeza";
import { ROYALTY_MAX, ROYALTY_MIN, TOKENS_BY_NETWORK, type Network, type Token } from "@/lib/brief/types";
import { TIER_HELP, USE_WORD } from "@/lib/market/editions";
import {
  buyerGetsOf,
  NO_INCOME_LINE,
  NOTE_MAX,
  ROYALTY_BEST_EFFORT,
  type SellCheck,
  type SellDraft,
  type SellField,
  type SellProblem,
} from "@/lib/market/sell-flow";
import type { EditionKind } from "@/lib/market/types";
import { cn } from "@/lib/utils";
import { CheckRow, DemoLine, ERROR, HINT, LABEL, ReadOnlyField, TAP } from "../../editions/create-dialog";
import { EachSale } from "../../editions/list-dialog";

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

// ───────────────────────── a radio group of cards ─────────────────────────

export type Choice<V extends string> = { value: V; title: string; lines: string[]; disabled: boolean; thumb?: string | null };

/** The Create dialog's Use cards as a group: arrows move and pick, a closed option is skipped. */
function ChoiceGroup<V extends string>({
  id,
  label,
  choices,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  choices: Choice<V>[];
  value: V | null;
  onChange: (v: V) => void;
  error: string | null;
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
      <span id={labelId} className={LABEL}>
        {label}
      </span>
      <div
        id={id}
        role="radiogroup"
        aria-labelledby={labelId}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errId : undefined}
        className="flex flex-col gap-[12px]"
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
                "flex min-h-[var(--touch-min)] items-start gap-[10px] rounded-lg border border-solid p-[14px] text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                c.disabled
                  ? "cursor-not-allowed border-border bg-bg-surface-raised"
                  : on
                    ? "border-border-brand bg-bg-brand-subtle"
                    : "border-border bg-bg-surface hover:bg-bg-subtle",
              )}
            >
              <Radio checked={on} disabled={c.disabled} decorative size="sm" className="mt-[2px]" />
              {c.thumb !== undefined && <Thumb src={c.thumb} />}
              <span className="flex min-w-0 flex-1 flex-col gap-[6px]">
                <span className={cn("break-words text-md font-semibold", c.disabled ? "text-text-secondary" : "text-text-primary")}>
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

function Thumb({ src }: { src: string | null }) {
  const [broken, setBroken] = React.useState(false);
  return (
    <span
      aria-hidden
      className="inline-flex size-[40px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-surface-raised text-text-tertiary"
    >
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <Icon icon={Image01Icon} size={16} />
      )}
    </span>
  );
}

// ───────────────────────── 1 · Product ─────────────────────────

export function ProductStep({
  draft,
  change,
  problem,
  prefix,
  choices,
}: StepProps & { choices: Choice<string>[] }) {
  return (
    <ChoiceGroup
      id={`${prefix}-product`}
      label="Which product?"
      choices={choices}
      value={draft.productId}
      onChange={(productId) => change({ productId })}
      error={errOf(problem, "product")}
    />
  );
}

// ───────────────────────── 2 · Use ─────────────────────────

export function UseStep({ draft, change, problem, prefix, choices }: StepProps & { choices: Choice<"private" | "commercial">[] }) {
  return (
    <ChoiceGroup
      id={`${prefix}-use`}
      label="Which use?"
      choices={choices}
      value={draft.use}
      onChange={(use) => change({ use })}
      error={errOf(problem, "use")}
    />
  );
}

// ───────────────────────── 3 · Supply ─────────────────────────

export function SupplyStep({
  draft,
  change,
  problem,
  prefix,
  kind,
  created,
}: StepProps & { kind: EditionKind; created: number | null }) {
  const id = `${prefix}-count`;
  const err = errOf(problem, "count");
  if (created !== null) {
    return (
      <ReadOnlyField
        label="Number of NFTs"
        value={String(created)}
        hint={`Created with ${created} NFTs. Once it's listed, Add NFTs adds more.`}
      />
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
      <label htmlFor={id} className={LABEL}>
        Number of NFTs
      </label>
      <TextInput
        id={id}
        size="xl"
        value={draft.count}
        onValueChange={(v) => change({ count: v.replace(/[^\d]/g, "").slice(0, 6) })}
        inputMode="numeric"
        invalid={!!err}
        aria-invalid={!!err || undefined}
        aria-describedby={`${id}-note`}
      />
      <span id={`${id}-note`} className={err ? ERROR : HINT}>
        {err ??
          (kind === "physical"
            ? "Each NFT is one pre-order, so list only as many as you can make and ship. A whole number from 1 to 10,000."
            : "Each NFT is one licence. A whole number from 1 to 10,000.")}
      </span>
      <p className="m-0 text-sm leading-relaxed text-text-secondary">
        They&apos;re lazy minted: each one is minted only when it&apos;s bought, so nothing is charged now.
      </p>
    </div>
  );
}

// ───────────────────────── 4 · Price tiers ─────────────────────────

function AmountField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
}) {
  const noteId = `${id}-note`;
  return (
    <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <TextInput
        id={id}
        size="xl"
        value={value}
        onValueChange={(v) => onChange(decimal(v))}
        inputMode="decimal"
        placeholder="e.g. 0.01"
        invalid={!!error}
        aria-invalid={!!error || undefined}
        aria-describedby={noteId}
      />
      <span id={noteId} className={error ? ERROR : HINT}>
        {error ?? hint}
      </span>
    </div>
  );
}

export function PriceStep({ draft, change, problem, prefix, network }: StepProps & { network: Network }) {
  const tokens: SelectOption<Token>[] = TOKENS_BY_NETWORK[network].map((t) => ({ value: t, label: t }));
  return (
    <>
      <SelectMenu
        id={`${prefix}-token`}
        label="Token"
        placeholder="Choose a token"
        value={draft.token}
        onChange={(token) => change({ token })}
        options={tokens}
        error={errOf(problem, "token") ?? undefined}
      />
      <div className="grid grid-cols-1 gap-8 [@media(min-width:480px)]:grid-cols-2 [@media(min-width:480px)]:gap-6">
        <AmountField
          id={`${prefix}-regular`}
          label="Regular price"
          hint={TIER_HELP.regular}
          value={draft.regular}
          onChange={(regular) => change({ regular })}
          error={errOf(problem, "regular")}
        />
        <AmountField
          id={`${prefix}-extended`}
          label="Extended price"
          hint={TIER_HELP.extended}
          value={draft.extended}
          onChange={(extended) => change({ extended })}
          error={errOf(problem, "extended")}
        />
      </div>
      <EachSale input={{ token: draft.token, regular: draft.regular, extended: draft.extended, royalties: draft.royalties }} />
    </>
  );
}

// ───────────────────────── 5 · Terms ─────────────────────────

const PROMISES: { field: "leadTime" | "refund" | "seller"; text: string }[] = [
  { field: "leadTime", text: "Lead time: I'll tell each buyer when to expect it, and ship within that time." },
  { field: "refund", text: "Refund promise: if I can't make or ship an order, I'll refund the buyer in full." },
  { field: "seller", text: "I'm the seller: I make, ship and support each one myself. IDEEZA doesn't make or ship it." },
];

export function TermsStep({
  draft,
  change,
  problem,
  prefix,
  kind,
  productName,
  askOwner,
}: StepProps & { kind: EditionKind; productName: string; askOwner: boolean }) {
  const royaltiesId = `${prefix}-royalties`;
  const noteId = `${prefix}-note`;
  const royaltiesErr = errOf(problem, "royalties");
  const noteErr = errOf(problem, "note");
  const reasonId = `${prefix}-reason`;
  const boxProps = (field: SellField) => ({
    id: `${prefix}-${field}`,
    invalid: problem?.field === field,
    describedBy: problem?.field === field ? reasonId : undefined,
  });
  return (
    <>
      {draft.use && (
        <section aria-label="What buyers get" className="flex flex-col gap-2 rounded-lg border border-solid border-border p-6">
          <span className="text-2xs font-bold uppercase tracking-caps text-text-tertiary">What buyers get</span>
          <p className="m-0 text-sm leading-relaxed text-text-primary">
            <span className="font-semibold">{USE_WORD[draft.use]}.</span> {buyerGetsOf(kind, draft.use, productName)}
          </p>
        </section>
      )}

      <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
        <label htmlFor={royaltiesId} className={LABEL}>
          Royalties (%)
        </label>
        <TextInput
          id={royaltiesId}
          size="xl"
          value={draft.royalties}
          onValueChange={(v) => change({ royalties: v.replace(/[^\d]/g, "").slice(0, 2) })}
          inputMode="numeric"
          placeholder={`${ROYALTY_MIN} to ${ROYALTY_MAX}`}
          invalid={!!royaltiesErr}
          aria-invalid={!!royaltiesErr || undefined}
          aria-describedby={`${royaltiesId}-note`}
        />
        <span id={`${royaltiesId}-note`} className={royaltiesErr ? ERROR : HINT}>
          {royaltiesErr ?? ROYALTY_BEST_EFFORT}
        </span>
      </div>

      {kind === "physical" && (
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
                {...boxProps(p.field)}
                checked={draft.checks[p.field]}
                onToggle={() => change({ checks: { ...draft.checks, [p.field]: !draft.checks[p.field] } })}
              >
                {p.text}
              </CheckRow>
            ))}
          </fieldset>
        </>
      )}

      <div className="flex flex-col gap-3">
        {askOwner && (
          <CheckRow {...boxProps("owner")} checked={draft.owner} onToggle={() => change({ owner: !draft.owner })}>
            I confirm I&apos;m the rightful owner of this project, virtually and physically, and I take responsibility for any legal or
            intellectual-property issue it raises.
          </CheckRow>
        )}
        <CheckRow {...boxProps("lazy")} checked={draft.lazy} onToggle={() => change({ lazy: !draft.lazy })}>
          I understand these NFTs are lazy minted: each one is minted only when it&apos;s bought, so nothing is charged now.
        </CheckRow>
      </div>

      <p className="m-0 max-w-[62ch] text-sm leading-relaxed text-text-secondary">{NO_INCOME_LINE}</p>
    </>
  );
}

// ───────────────────────── 6 · Readiness ─────────────────────────

const FIX_LABEL: Record<NonNullable<SellCheck["fix"]>, string> = {
  projectNft: "Go to Project NFT",
  video: "Generate AI video",
  terms: "Back to Terms",
};

export function ReadinessStep({
  checks,
  projectNftHref,
  onFix,
  fixRef,
}: {
  checks: SellCheck[];
  projectNftHref: string;
  onFix: (fix: "video" | "terms") => void;
  /** The first fix's control, where a press on the blocked CTA sends focus. */
  fixRef: React.RefObject<HTMLElement | null>;
}) {
  const firstFixAt = checks.findIndex((c) => !c.ok && c.fix !== null);
  return (
    <ul className="m-0 flex list-none flex-col gap-6 p-0">
      {checks.map((c, i) => {
        const ref = i === firstFixAt ? fixRef : undefined;
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
              {!c.ok && c.fix === "projectNft" && (
                <Link
                  ref={ref as React.RefObject<HTMLAnchorElement> | undefined}
                  href={projectNftHref}
                  className={cn(
                    "mt-2 inline-flex min-h-[32px] items-center self-start rounded-lg border border-solid border-border bg-bg-surface px-6 text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus",
                    TAP,
                  )}
                >
                  {FIX_LABEL.projectNft}
                </Link>
              )}
              {!c.ok && (c.fix === "video" || c.fix === "terms") && (
                <Button
                  ref={ref as React.RefObject<HTMLButtonElement> | undefined}
                  type="button"
                  hierarchy="secondary"
                  size="md"
                  className={cn("mt-2 self-start", TAP)}
                  onClick={() => onFix(c.fix as "video" | "terms")}
                >
                  {FIX_LABEL[c.fix]}
                </Button>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ───────────────────────── 7 · Sign ─────────────────────────

export type SignState = "done" | "next" | "waiting";

export function SignStep({
  rows,
  signatures,
}: {
  rows: { label: string; value: string }[];
  signatures: { label: string; state: SignState }[];
}) {
  return (
    <>
      <DemoLine />
      <dl className="m-0 flex flex-col divide-y divide-border rounded-lg border border-solid border-border">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-1 px-6 py-4 [@media(min-width:480px)]:flex-row [@media(min-width:480px)]:gap-6">
            <dt className="shrink-0 text-sm text-text-secondary [@media(min-width:480px)]:w-[160px]">{r.label}</dt>
            <dd className="m-0 min-w-0 whitespace-pre-line break-words text-sm font-medium text-text-primary">{r.value}</dd>
          </div>
        ))}
      </dl>
      <section aria-label="Signatures" className="flex flex-col gap-4">
        <p className="m-0 text-sm leading-relaxed text-text-secondary">
          {signatures.length === 2
            ? "Two free signatures in your demo wallet: one creates the NFTs, one lists them. Nothing is charged."
            : "One free signature in your demo wallet lists them. Nothing is charged."}
        </p>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {signatures.map((s, i) => (
            <li key={s.label} className="flex items-center gap-4 text-sm">
              <span aria-hidden className={cn("inline-flex", s.state === "done" ? "text-text-success" : "text-text-tertiary")}>
                <Icon icon={s.state === "done" ? CheckmarkCircle02Icon : CircleIcon} size={18} />
              </span>
              <span className={cn(s.state === "waiting" ? "text-text-secondary" : "font-medium text-text-primary")}>
                {signatures.length > 1 ? `${i + 1}. ` : ""}
                {s.label}
              </span>
              <span className="sr-only">{s.state === "done" ? ", signed" : s.state === "next" ? ", next" : ", after that"}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
