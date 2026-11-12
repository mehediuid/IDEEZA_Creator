"use client";

// The listing terms on the phone (Figma 13, 13f, 13h, 13i, 14j): the web's
// ONE listing form (components/projects/listing/listing-fields.tsx) with the
// same props, order, words and rules (`listingProblems`; the caller decides
// which messages show), laid out as the Figma draws it at 375 px: every field
// full width; selects are A06 pick-one sheets; Listing type is the A15 Button
// Group; Minting type is two radio cards (`mintTypeOptions`); Token above
// Price; Selling percentage a select (13i); the share-sale note as a warning
// alert; Holder benefits with Add benefit; the ownership box. Edit locks the
// first four (Blockchain, Collection, Listing type, Minting type).

import * as React from "react";
import { Calendar03Icon, Cancel01Icon, LockIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field } from "@/components/auth/auth-parts";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { ButtonGroup } from "@/components/ideeza/button-group";
import { Checkbox, Radio } from "@/components/ideeza/checkbox";
import { IconButton } from "@/components/ideeza/icon-button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { TextInput } from "@/components/ideeza/text-input";
import type { ListingFieldsProps } from "@/components/projects/listing/listing-fields";
import { LISTING_TYPES, NETWORKS, TOKENS_BY_NETWORK, type Intent, type ListingType, type Network, type Token } from "@/lib/brief/types";
import { ROYALTY_MEANING, SHARE_SALE_NOTE } from "@/lib/commerce/share-copy";
import { sellingSteps } from "@/lib/market/listing-form";
import { BENEFIT_DURATIONS, BENEFIT_NAME_MAX, BENEFITS_MAX, LOCKED_HELP, durationKeyOf, durationOf, type BenefitDurationKey } from "@/lib/market/listing-flow";
import type { UtilityBenefit } from "@/lib/market/types";
import { mintTypeOptions } from "@/lib/wallet/mint";
import { cn } from "@/lib/utils";
import { SheetSelect } from "../kit/sheet-select";
import { T } from "../type";

const HINT = T.meta;

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

/** The hint under a field, unless it has an error (the Field shows that). */
function Hint({ id, text, error }: { id: string; text?: string; error?: string }) {
  return text && !error ? (
    <span id={id} className={HINT}>
      {text}
    </span>
  ) : null;
}

/** A fact of the minted NFT: read-only, a lock, "Set when it was minted." */
function LockedField({ label, value }: { label: string; value: string }) {
  const id = React.useId();
  const help = React.useId();
  return (
    <Field label={label} htmlFor={id}>
      <TextInput id={id} size="xl" value={value} readOnly aria-describedby={help} containerClassName="bg-bg-surface-raised" suffix={<Icon icon={LockIcon} size={16} />} />
      <span id={help} className={HINT}>
        {LOCKED_HELP}
      </span>
    </Field>
  );
}

const NETWORK_OPTIONS = NETWORKS.map((n) => ({ value: n.value, label: n.label }));
const DURATION_OPTIONS = BENEFIT_DURATIONS.map((d) => ({ value: d.value, label: d.label }));

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
    network: React.useId(),
    type: React.useId(),
    token: React.useId(),
    price: React.useId(),
    minBid: React.useId(),
    buyNow: React.useId(),
    ends: React.useId(),
    percent: React.useId(),
    royalties: React.useId(),
    hint: React.useId(),
    err: React.useId(),
    benefits: React.useId(),
    confirm: React.useId(),
  };
  const errId = (k: string) => `${ids.err}-${k}`;
  const endsRef = React.useRef<HTMLInputElement>(null);
  const editing = mode === "edit";
  const network = value.network;
  const auction = value.type === "auction";
  const tokens = network ? TOKENS_BY_NETWORK[network].map((t) => ({ value: t, label: t })) : [];
  const steps = sellingSteps(creatorPct).filter((s) => !s.disabled).map((s) => ({ value: String(s.value), label: s.label }));
  const typeLabel = LISTING_TYPES.find((t) => t.id === value.type)?.label ?? "";
  const networkLabel = NETWORKS.find((n) => n.value === network)?.label ?? "Not known";
  const setBenefit = (id: string, patch: Partial<UtilityBenefit>) => onChange({ benefits: value.benefits.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const amount = (key: "price" | "minBid" | "auctionBuyNow", id: string, label: string, placeholder: string) => (
    <Field label={label} htmlFor={id} error={errors[key]} errorId={errId(key)}>
      <TextInput
        id={id}
        size="xl"
        value={value[key]}
        onValueChange={(v) => onChange({ [key]: decimal(v) })}
        onBlur={() => onLeave(key)}
        inputMode="decimal"
        placeholder={placeholder}
        invalid={!!errors[key]}
        aria-invalid={!!errors[key] || undefined}
        aria-describedby={errors[key] ? errId(key) : undefined}
      />
    </Field>
  );

  return (
    <div className="flex flex-col gap-8">
      {mode === "brief" ? (
        <Field label="Blockchain" htmlFor={ids.network}>
          <SheetSelect
            id={ids.network}
            title="Blockchain"
            placeholder="Select a blockchain"
            value={network ?? ""}
            options={NETWORK_OPTIONS}
            onChange={(n) => onChange({ network: n as Network, token: TOKENS_BY_NETWORK[n as Network][0], collection: "" })}
          />
        </Field>
      ) : (
        <LockedField label="Blockchain" value={networkLabel} />
      )}

      {mode === "brief" ? collectionField : <LockedField label="Collection" value={value.collection || "Not known"} />}

      {editing ? (
        <LockedField label="Listing type" value={typeLabel} />
      ) : (
        <div className="flex flex-col gap-3">
          <span id={ids.type} className={T.label}>
            Listing type
          </span>
          <ButtonGroup
            size="xl"
            className="w-full [&>button]:flex-1"
            value={value.type}
            onChange={(t) => onChange({ type: t as ListingType })}
            items={LISTING_TYPES.map((t) => ({ value: t.id, label: t.label }))}
          />
          <span className={HINT}>{LISTING_TYPES.find((t) => t.id === value.type)?.sub}</span>
        </div>
      )}

      {network && <MintTypeCards value={value.mintingType} onChange={(mintingType) => onChange({ mintingType })} network={network} current={mintStatus} locked={editing} address={mintAddress} />}

      <Field label="Token" htmlFor={ids.token}>
        <SheetSelect id={ids.token} title="Token" placeholder="Token" value={value.token ?? ""} options={tokens} onChange={(t) => onChange({ token: t as Token })} />
      </Field>
      {auction ? (
        <>
          {amount("minBid", ids.minBid, "Minimum bid", "e.g. 0.001")}
          {amount("auctionBuyNow", ids.buyNow, "Buy now price (optional)", "e.g. 0.5")}
          <Field label="Auction ends" htmlFor={ids.ends} error={errors.endsAt} errorId={errId("endsAt")}>
            <div className="flex items-center gap-4">
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
                aria-describedby={errors.endsAt ? errId("endsAt") : undefined}
                containerClassName="min-w-0 flex-1"
              />
              <IconButton
                hierarchy="secondary"
                size="xl"
                aria-label="Open the date picker"
                icon={<Icon icon={Calendar03Icon} size={20} />}
                onClick={() => {
                  const el = endsRef.current;
                  if (el && typeof el.showPicker === "function") el.showPicker();
                  else el?.focus();
                }}
              />
            </div>
          </Field>
        </>
      ) : (
        amount("price", ids.price, "Price", "e.g. 0.001")
      )}

      <Field label="Selling percentage" htmlFor={ids.percent} error={errors.percentSelling} errorId={errId("percentSelling")}>
        <SheetSelect
          id={ids.percent}
          title="Selling percentage"
          placeholder="Choose a share"
          value={value.percentSelling === null ? "" : String(value.percentSelling)}
          options={steps}
          invalid={!!errors.percentSelling}
          onChange={(v) => {
            onChange({ percentSelling: Number(v) });
            onLeave("percentSelling");
          }}
        />
        <Hint id={`${ids.hint}-pct`} text="How much of the project's ownership this sale passes to whoever buys it." error={errors.percentSelling} />
      </Field>

      <Banner tone="attention">{SHARE_SALE_NOTE}</Banner>

      <Field label="Royalties (%)" htmlFor={ids.royalties} error={errors.royalties} errorId={errId("royalties")}>
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
          aria-describedby={errors.royalties ? errId("royalties") : `${ids.hint}-roy`}
        />
        <Hint id={`${ids.hint}-roy`} text={`${ROYALTY_MEANING} Between 2 and 10%, one decimal place.`} error={errors.royalties} />
      </Field>

      <section aria-labelledby={ids.benefits} className="flex flex-col gap-3">
        <h3 id={ids.benefits} className={T.label}>
          Holder benefits (optional)
        </h3>
        <p className={HINT}>
          Perks people get while they hold this NFT, like a private group or a subscription.
          {editing && " Changes apply to future sales only."}
        </p>
        {value.benefits.length > 0 && (
          <ul className="flex flex-col gap-6">
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
          <div>
            <Button
              hierarchy="secondary"
              size="xl"
              iconLeading={<Icon icon={PlusSignIcon} size={20} />}
              onClick={() => onChange({ benefits: [...value.benefits, { id: newBenefitId(), name: "", duration: { months: 12 } }] })}
            >
              Add benefit
            </Button>
          </div>
        ) : (
          <p className={HINT}>Up to 5 benefits.</p>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <label className="relative flex cursor-pointer items-start gap-6">
          <input
            type="checkbox"
            className="sr-only"
            checked={value.confirmOwner}
            aria-invalid={!!errors.confirmOwner || undefined}
            aria-describedby={errors.confirmOwner ? ids.confirm : undefined}
            onChange={() => {
              onChange({ confirmOwner: !value.confirmOwner });
              onLeave("confirmOwner");
            }}
          />
          <Checkbox checked={value.confirmOwner} decorative className="mt-1" />
          <span className={cn(T.meta, "text-text-primary")}>
            I confirm I&apos;m the rightful owner of this project, virtually and physically, and I take responsibility for any legal or
            intellectual-property issue it raises.
          </span>
        </label>
        {errors.confirmOwner && (
          <span id={ids.confirm} className={cn(T.meta, "text-text-error")}>
            {errors.confirmOwner}
          </span>
        )}
      </div>
    </div>
  );
}

/** Minting type (MINT's shared field): Lazy · Instant as radio cards with their cost; locked on Edit. */
export function MintTypeCards({
  intent = "sell",
  value,
  onChange,
  network,
  current,
  locked = false,
  address,
}: {
  intent?: Intent;
  value: "lazy" | "instant";
  onChange: (t: "lazy" | "instant") => void;
  network: Network;
  current: ListingFieldsProps["mintStatus"];
  locked?: boolean;
  address?: string;
}) {
  const labelId = React.useId();
  const opts = mintTypeOptions({ intent, current, network, locked, address });
  const label = (
    <div className="flex items-center gap-4">
      <span id={labelId} className={T.label}>
        Minting type
      </span>
      <TestnetDemoBadge />
    </div>
  );
  if (opts.locked) {
    const title = current === "onChain" ? (opts.lockedText?.title ?? "Minted on chain") : (opts.options.find((o) => o.type === value)?.title ?? opts.lockedText?.title ?? "");
    return (
      <div role="group" aria-labelledby={labelId} className="flex flex-col gap-4">
        {label}
        <div className="flex flex-col gap-1 rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface-raised p-6">
          <span className={T.rowTitle}>{title}</span>
          {opts.lockedText?.note && <span className={T.meta}>{opts.lockedText.note}</span>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {label}
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-col gap-4">
        {opts.options.map((o) => {
          const on = o.type === value;
          return (
            <label
              key={o.type}
              className={cn(
                "relative flex cursor-pointer items-start gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid p-6",
                on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface",
              )}
            >
              <input type="radio" name={labelId} className="sr-only" checked={on} onChange={() => onChange(o.type)} />
              <Radio checked={on} decorative className="mt-1" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={T.rowTitle}>{o.title}</span>
                <span className={T.meta}>{o.sub}</span>
                <span className={cn(T.meta, "text-text-primary")}>{o.cost}</span>
              </span>
            </label>
          );
        })}
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
  const durId = React.useId();
  const name = benefit.name.trim();
  return (
    <li className="flex flex-col gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border p-6">
      <div className="flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <Field label={`Benefit ${n} name`} htmlFor={nameId} error={error} errorId={errId}>
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
          </Field>
        </div>
        <IconButton hierarchy="secondary" size="xl" aria-label={`Remove ${name || `benefit ${n}`}`} onClick={onRemove} icon={<Icon icon={Cancel01Icon} size={20} />} />
      </div>
      <Field label="Duration" htmlFor={durId}>
        <SheetSelect id={durId} title="Duration" placeholder="Choose how long" value={durationKeyOf(benefit.duration)} options={DURATION_OPTIONS} onChange={(k) => onDuration(k as BenefitDurationKey)} />
      </Field>
    </li>
  );
}
