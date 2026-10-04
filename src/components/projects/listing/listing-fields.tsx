"use client";

// ListingFields — the "Add To Main NFT Marketplace" fields (Figma
// 41505:142407…143557; P2-LISTING-4 as changed in spec §4.5, P2-CUSTOMERS-16).
// ONE component for the page's Add and Edit and for the Brief's Sell step
// (P2-LISTING-22, T26), so the order, the labels and the rules can't drift.
//
// In Figma order: Blockchain · Collection (locked to the mint on the page,
// editable in the Brief) · Listing type · Minting type (MINT's shared field) ·
// Token and Price, or Token, Minimum bid, Buy now price and Auction ends ·
// Selling percentage · Royalties · Holder benefits · the ownership box.
// Edit locks the first four (143717) and keeps the rest editable.
//
// The rules and their copy are `listingProblems` (listing-form.ts): the
// caller decides which field messages show (after a blur, or at once for a
// typed value that is wrong) and passes them in `errors`.

import * as React from "react";
import { Calendar03Icon, Cancel01Icon, LockIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Checkbox, IconButton, SelectMenu, TextInput, type SelectOption } from "@/components/ideeza";
import { MintTypeField } from "@/components/wallet/mint-type-field";
import { LISTING_TYPES, NETWORKS, TOKENS_BY_NETWORK, type ListingType, type Network, type Token } from "@/lib/brief/types";
import type { ListingInput } from "@/lib/market/listing-form";
import { sellingSteps } from "@/lib/market/listing-form";
import {
  BENEFIT_DURATIONS,
  BENEFIT_NAME_MAX,
  BENEFITS_MAX,
  LOCKED_HELP,
  durationKeyOf,
  durationOf,
  type BenefitDurationKey,
} from "@/lib/market/listing-flow";
import type { UtilityBenefit } from "@/lib/market/types";
import type { MintStatus } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";

export type ListingField = keyof ListingInput;

export type ListingFieldsProps = {
  mode: "brief" | "add" | "edit";
  value: ListingInput;
  onChange: (patch: Partial<ListingInput>) => void;
  /** The field messages to show now; the caller decides when (P2-LISTING-5). */
  errors: Partial<Record<ListingField, string>>;
  /** A field was left: its message may show from now on. */
  onLeave: (field: ListingField) => void;
  /** The maker's own share: steps above it are disabled (P2-LISTING-5). */
  creatorPct: number;
  /** The project's mint status now: Minting type follows it (`mintTypeOptions`). */
  mintStatus: MintStatus;
  /** The on-chain wallet, named in Minting type's locked note. */
  mintAddress?: string;
  /** The clock the auction end is checked against. */
  now: number;
  /** A new benefit's id ("ben_" + 8 base-36). */
  newBenefitId: () => string;
  /** The Brief's own collection picker (brief mode). */
  collectionField?: React.ReactNode;
};

const LABEL = "w-fit text-md text-[color:var(--color-input-label)]";
const HINT = "text-sm text-[color:var(--color-input-helper)]";
const ERROR = "text-sm text-[color:var(--color-input-error-text)]";
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

const NETWORK_OPTIONS: SelectOption<Network>[] = NETWORKS.map((n) => ({ value: n.value, label: n.label }));
const TYPE_OPTIONS: SelectOption<ListingType>[] = LISTING_TYPES.map((t) => ({ value: t.id, label: t.label, sub: t.sub }));
const DURATION_OPTIONS: SelectOption<BenefitDurationKey>[] = BENEFIT_DURATIONS.map((d) => ({ value: d.value, label: d.label }));

/** Digits and one dot; the rules decide what's wrong with what's left. */
function decimal(raw: string): string {
  const kept = raw.replace(/[^\d.]/g, "");
  const dot = kept.indexOf(".");
  return dot === -1 ? kept : kept.slice(0, dot + 1) + kept.slice(dot + 1).replace(/\./g, "");
}

/** A percentage with at most one decimal place (Royalties). */
function percent(raw: string): string {
  const d = decimal(raw);
  const dot = d.indexOf(".");
  return dot === -1 ? d : d.slice(0, dot + 2);
}

function localDateTime(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Label above, control, then the error (or the hint) under it — SelectMenu's own stack. */
function Field({
  label,
  controlId,
  hint,
  hintId,
  error,
  errorId,
  children,
}: {
  label: string;
  controlId: string;
  hint?: string;
  hintId?: string;
  error?: string;
  errorId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
      <label htmlFor={controlId} className={LABEL}>
        {label}
      </label>
      {children}
      {error ? (
        <span id={errorId} className={ERROR}>
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className={HINT}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function describedBy(...ids: (string | false | null | undefined)[]): string | undefined {
  return ids.filter(Boolean).join(" ") || undefined;
}

/** A fact of the minted NFT: read-only, with a lock glyph and "Set when it was minted." */
function LockedField({ label, value }: { label: string; value: string }) {
  const id = React.useId();
  const helpId = React.useId();
  return (
    <Field label={label} controlId={id} hint={LOCKED_HELP} hintId={helpId}>
      <TextInput
        id={id}
        size="xl"
        value={value}
        readOnly
        aria-describedby={helpId}
        containerClassName="bg-bg-surface-raised"
        suffix={<Icon icon={LockIcon} size={16} />}
      />
    </Field>
  );
}

export function ListingFields({
  mode,
  value,
  onChange,
  errors,
  onLeave,
  creatorPct,
  mintStatus,
  mintAddress,
  now,
  newBenefitId,
  collectionField,
}: ListingFieldsProps) {
  const ids = {
    price: React.useId(),
    minBid: React.useId(),
    buyNow: React.useId(),
    ends: React.useId(),
    royalties: React.useId(),
    err: React.useId(),
    hint: React.useId(),
    benefitsHead: React.useId(),
    benefitsNote: React.useId(),
    confirmErr: React.useId(),
  };
  const endsRef = React.useRef<HTMLInputElement>(null);
  const editing = mode === "edit";
  const network = value.network;
  const tokens: SelectOption<Token>[] = network ? TOKENS_BY_NETWORK[network].map((t) => ({ value: t, label: t })) : [];
  const steps: SelectOption<string>[] = sellingSteps(creatorPct).map((s) => ({
    value: String(s.value),
    label: s.label,
    disabled: s.disabled,
  }));
  const auction = value.type === "auction";
  const typeLabel = LISTING_TYPES.find((t) => t.id === value.type)?.label ?? "";
  const networkLabel = NETWORKS.find((n) => n.value === network)?.label ?? "Not known";

  const errId = (k: string) => `${ids.err}-${k}`;

  const setBenefit = (id: string, patch: Partial<UtilityBenefit>) =>
    onChange({ benefits: value.benefits.map((b) => (b.id === id ? { ...b, ...patch } : b)) });

  return (
    <div className="flex flex-col gap-8">
      {mode === "brief" ? (
        <SelectMenu
          label="Blockchain"
          placeholder="Select a blockchain"
          value={network}
          onChange={(n) => onChange({ network: n, token: TOKENS_BY_NETWORK[n][0], collection: "" })}
          options={NETWORK_OPTIONS}
        />
      ) : (
        <LockedField label="Blockchain" value={networkLabel} />
      )}

      {mode === "brief" ? collectionField : <LockedField label="Collection" value={value.collection || "Not known"} />}

      {editing ? (
        <LockedField label="Listing type" value={typeLabel} />
      ) : (
        <SelectMenu
          label="Listing type"
          placeholder="Select listing type"
          value={value.type}
          onChange={(type) => onChange({ type })}
          options={TYPE_OPTIONS}
        />
      )}

      {network && (
        <MintTypeField
          value={value.mintingType}
          onChange={(mintingType) => onChange({ mintingType })}
          intent="sell"
          network={network}
          current={mintStatus}
          locked={editing}
          address={mintAddress}
        />
      )}

      {auction ? (
        <>
          <div className="grid grid-cols-[minmax(0,128px)_minmax(0,1fr)] items-start gap-6">
            <SelectMenu
              label="Token"
              placeholder="Token"
              value={value.token}
              onChange={(token) => onChange({ token })}
              options={tokens}
            />
            <Field label="Minimum bid" controlId={ids.minBid} error={errors.minBid} errorId={errId("minBid")}>
              <TextInput
                id={ids.minBid}
                size="xl"
                value={value.minBid}
                onValueChange={(v) => onChange({ minBid: decimal(v) })}
                onBlur={() => onLeave("minBid")}
                inputMode="decimal"
                placeholder="e.g. 0.001"
                invalid={!!errors.minBid}
                aria-invalid={!!errors.minBid || undefined}
                aria-describedby={describedBy(errors.minBid && errId("minBid"))}
              />
            </Field>
          </div>
          <Field
            label="Buy now price (optional)"
            controlId={ids.buyNow}
            error={errors.auctionBuyNow}
            errorId={errId("auctionBuyNow")}
          >
            <TextInput
              id={ids.buyNow}
              size="xl"
              value={value.auctionBuyNow}
              onValueChange={(v) => onChange({ auctionBuyNow: decimal(v) })}
              onBlur={() => onLeave("auctionBuyNow")}
              inputMode="decimal"
              placeholder="e.g. 0.5"
              invalid={!!errors.auctionBuyNow}
              aria-invalid={!!errors.auctionBuyNow || undefined}
              aria-describedby={describedBy(errors.auctionBuyNow && errId("auctionBuyNow"))}
            />
          </Field>
          <Field label="Auction ends" controlId={ids.ends} error={errors.endsAt} errorId={errId("endsAt")}>
            <div className="flex items-center gap-3">
              <TextInput
                ref={endsRef}
                id={ids.ends}
                size="xl"
                type="datetime-local"
                value={value.endsAt}
                min={localDateTime(now)}
                max={localDateTime(now + 30 * 86_400_000)}
                onValueChange={(endsAt) => onChange({ endsAt })}
                onBlur={() => onLeave("endsAt")}
                invalid={!!errors.endsAt}
                aria-invalid={!!errors.endsAt || undefined}
                aria-describedby={describedBy(errors.endsAt && errId("endsAt"))}
                containerClassName="min-w-0 flex-1"
              />
              <IconButton
                type="button"
                hierarchy="secondary"
                size="xl"
                aria-label="Open the date picker"
                onClick={() => {
                  const el = endsRef.current;
                  if (!el) return;
                  if (typeof el.showPicker === "function") el.showPicker();
                  else el.focus();
                }}
                icon={<Icon icon={Calendar03Icon} size={18} />}
              />
            </div>
          </Field>
        </>
      ) : (
        <div className="grid grid-cols-[minmax(0,128px)_minmax(0,1fr)] items-start gap-6">
          <SelectMenu
            label="Token"
            placeholder="Token"
            value={value.token}
            onChange={(token) => onChange({ token })}
            options={tokens}
          />
          <Field label="Price" controlId={ids.price} error={errors.price} errorId={errId("price")}>
            <TextInput
              id={ids.price}
              size="xl"
              value={value.price}
              onValueChange={(v) => onChange({ price: decimal(v) })}
              onBlur={() => onLeave("price")}
              inputMode="decimal"
              placeholder="e.g. 0.001"
              invalid={!!errors.price}
              aria-invalid={!!errors.price || undefined}
              aria-describedby={describedBy(errors.price && errId("price"))}
            />
          </Field>
        </div>
      )}

      <SelectMenu
        label="Selling percentage"
        placeholder="Choose a share"
        value={value.percentSelling === null ? null : String(value.percentSelling)}
        onChange={(v) => {
          onChange({ percentSelling: Number(v) });
          onLeave("percentSelling");
        }}
        options={steps}
        hint="How much of the project's ownership this sale passes to the buyer."
        error={errors.percentSelling}
      />

      <Field
        label="Royalties (%)"
        controlId={ids.royalties}
        hint="Between 2 and 10% — one decimal place."
        hintId={`${ids.hint}-royalties`}
        error={errors.royalties}
        errorId={errId("royalties")}
      >
        <TextInput
          id={ids.royalties}
          size="xl"
          value={value.royalties}
          onValueChange={(v) => onChange({ royalties: percent(v) })}
          onBlur={() => onLeave("royalties")}
          inputMode="decimal"
          placeholder="Suggested: 2%, 2.5%, 5% Maximum is 10%"
          invalid={!!errors.royalties}
          aria-invalid={!!errors.royalties || undefined}
          aria-describedby={errors.royalties ? errId("royalties") : `${ids.hint}-royalties`}
        />
      </Field>

      <section aria-labelledby={ids.benefitsHead} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 id={ids.benefitsHead} className="text-md font-semibold text-text-primary">
            Holder benefits (optional)
          </h3>
          <p id={ids.benefitsNote} className="text-sm text-text-secondary">
            Perks buyers get while they hold this NFT, like a private group or a subscription.
            {editing && " Changes apply to future sales only."}
          </p>
        </div>
        {value.benefits.length > 0 && (
          <ul role="list" className="flex flex-col gap-6">
            {value.benefits.map((b, i) => (
              <BenefitRow
                key={b.id}
                benefit={b}
                n={i + 1}
                error={errors.benefits && !b.name.trim() ? errors.benefits : undefined}
                onName={(name) => setBenefit(b.id, { name })}
                onDuration={(key) => setBenefit(b.id, { duration: durationOf(key) })}
                onLeave={() => onLeave("benefits")}
                onRemove={() => onChange({ benefits: value.benefits.filter((x) => x.id !== b.id) })}
              />
            ))}
          </ul>
        )}
        {value.benefits.length < BENEFITS_MAX ? (
          <button
            type="button"
            onClick={() =>
              onChange({ benefits: [...value.benefits, { id: newBenefitId(), name: "", duration: { months: 12 } }] })
            }
            className={cn(
              "inline-flex min-h-[36px] items-center gap-3 self-start rounded-lg border border-solid border-border bg-bg-surface px-6 text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus",
              TAP,
            )}
          >
            <Icon icon={PlusSignIcon} size={16} />
            Add benefit
          </button>
        ) : (
          <p className="text-sm text-text-secondary">Up to 5 benefits.</p>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={value.confirmOwner}
          aria-invalid={!!errors.confirmOwner || undefined}
          aria-describedby={errors.confirmOwner ? ids.confirmErr : undefined}
          onClick={() => {
            onChange({ confirmOwner: !value.confirmOwner });
            onLeave("confirmOwner");
          }}
          className={cn(
            "flex items-start gap-4 rounded-md p-1 text-left text-sm font-medium leading-relaxed text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            TAP,
          )}
        >
          <Checkbox checked={value.confirmOwner} decorative className="mt-[2px]" />
          <span>
            I confirm I&apos;m the rightful owner of this project, virtually and physically, and I take responsibility
            for any legal or intellectual-property issue it raises.
          </span>
        </button>
        {errors.confirmOwner && (
          <span id={ids.confirmErr} className={ERROR}>
            {errors.confirmOwner}
          </span>
        )}
      </div>
    </div>
  );
}

function BenefitRow({
  benefit,
  n,
  error,
  onName,
  onDuration,
  onLeave,
  onRemove,
}: {
  benefit: UtilityBenefit;
  n: number;
  error?: string;
  onName: (name: string) => void;
  onDuration: (key: BenefitDurationKey) => void;
  onLeave: () => void;
  onRemove: () => void;
}) {
  const nameId = React.useId();
  const errId = React.useId();
  const name = benefit.name.trim();
  return (
    <li className="flex flex-col gap-4 rounded-lg border border-solid border-border p-6">
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-3)]">
          <label htmlFor={nameId} className={LABEL}>
            {`Benefit ${n} name`}
          </label>
          <TextInput
            id={nameId}
            size="xl"
            value={benefit.name}
            maxLength={BENEFIT_NAME_MAX}
            onValueChange={onName}
            onBlur={onLeave}
            placeholder="e.g. Exclusive group"
            invalid={!!error}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? errId : undefined}
          />
          {error && (
            <span id={errId} className={ERROR}>
              {error}
            </span>
          )}
        </div>
        <IconButton
          type="button"
          size="xl"
          aria-label={`Remove ${name || `benefit ${n}`}`}
          onClick={onRemove}
          className="mt-[28px]"
          icon={<Icon icon={Cancel01Icon} size={18} />}
        />
      </div>
      <SelectMenu
        label="Duration"
        placeholder="Choose how long"
        value={durationKeyOf(benefit.duration)}
        onChange={onDuration}
        options={DURATION_OPTIONS}
      />
    </li>
  );
}
