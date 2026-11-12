"use client";

// Plans & credits, Payments, Get paid and KYC on the phone: the parts they
// share. Layout from the mobile Figma (the white cards with label–value rows,
// the full-screen Success & Failed results, the searchable country sheet),
// words and data from the web. Every text takes its role from the one type
// scale (`T`, ../type.ts); the cards wear the kit's border/default edge.

import * as React from "react";
import Link from "next/link";
import { ArrowDown01Icon, Cancel01Icon, CheckmarkCircle02Icon, CancelCircleIcon, Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { SearchInput } from "@/components/ideeza/search-input";
import { coinAmount } from "@/lib/create/credit-pricing";
import type { Network } from "@/lib/brief/types";
import { useMarket } from "@/lib/market/market-store";
import { availableOf } from "@/lib/wallet/balances";
import { makerId } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import type { Amount } from "@/lib/wallet/types";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { T } from "../type";

/** A card that isn't a list: surface, border/default, radius/xl (the kit's card edge). */
export const CARD = "rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface";
/** A03 Link MD, brand. */
export const LINK = cn(T.rowTitle, "text-text-brand outline-none hover:underline focus-visible:underline");
/** The hairline between the parts of a card. */
export const HAIRLINE = "border-solid border-border";

/** Why a money action is off while the phone is offline. */
export const OFFLINE_REASON = "You’re offline. Try again when you’re back online.";

export const dateOf = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const n = (v: number) => v.toLocaleString("en-US");
export const pct = (d: number) => `${Math.round(d * 100)}%`;
/** "$8" for whole dollars, "$6.40" otherwise: the Figma's plan prices only. Every other price shows its cents (`usd`). */
export const dollars = (v: number) => (Number.isInteger(v) ? `$${v}` : `$${v.toFixed(2)}`);

export const checkoutPath = (tier: string, cycle: "monthly" | "yearly") => `/m/plans/checkout?plan=${tier}&cycle=${cycle}`;
export const downgradePath = (tier: string, cycle: "monthly" | "yearly") => `/m/plans/downgrade?plan=${tier}&cycle=${cycle}`;
export const invoicePath = (id: string) => `/m/plans/invoice/${encodeURIComponent(id)}`;

export function newOrderId(prefix: "plan" | "order"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Dollars as the token a withdrawal pays out in, at the one IDZ price: "10 USDT", "≈ 398.96 IDZ". */
export function payoutLine(usdAmount: Amount, token: "USDT" | "IDZ"): string {
  if (token === "USDT") return formatAmount(usdAmount, "USDT");
  return `≈ ${coinAmount(Number(usdAmount), "IDZ").toLocaleString("en-US")} IDZ`;
}

/** What the maker's connected demo wallet can pay with on `network`; null while it is read or not connected. */
export function usePayBalances(network: Network): Record<"USDT" | "IDZ", Amount> | null {
  const wallet = useDemoWallet();
  const { data: market } = useMarket();
  const [now] = React.useState(() => Date.now());
  if (!wallet) return null;
  const id = makerId(wallet.account);
  if (!wallet.identities[id]?.connected) return null;
  const ctx = { wallet, market, now };
  return { USDT: availableOf(id, "USDT", network, ctx), IDZ: availableOf(id, "IDZ", network, ctx) };
}

/** A two-way pill switch (Monthly | Annual) as radios. */
export function PillSwitch<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: { value: V; label: React.ReactNode }[];
  onChange: (v: V) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn(CARD, "flex gap-2 rounded-full p-2")}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              T.rowTitle,
              "min-h-[36px] flex-1 rounded-full px-4 outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
              on ? "bg-bg-subtle ring-[length:var(--border-width-1)] ring-inset ring-border" : "text-text-tertiary",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── rows ───────────────────────────────────────────────────────────────

/** One "label … value" line of a card. */
export function Row({ label, children, tone, strong }: { label: React.ReactNode; children: React.ReactNode; tone?: "success" | "error"; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <dt className={cn(strong ? T.rowTitle : T.body, "min-w-0", tone === "success" && "text-text-success")}>{label}</dt>
      <dd
        className={cn(
          strong ? T.rowTitle : T.body,
          "min-w-0 text-right tabular-nums [overflow-wrap:anywhere]",
          tone === "success" ? "text-text-success" : tone === "error" ? "text-text-error" : "text-text-primary",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

/** A white card of rows, divided by hairlines. */
export function RowsCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={cn(CARD, "flex flex-col divide-y divide-border px-8 py-2", className)}>{children}</dl>;
}

/** A tick, cross or other glyph (Upgrade to unlock, Cancel subscription lists). */
export function Bullet({ icon = Tick02Icon, tone = "brand" }: { icon?: IconValue; tone?: "brand" | "error" }) {
  return (
    <span aria-hidden className={cn("mt-[2px] shrink-0", tone === "brand" ? "text-text-brand" : "text-[color:var(--color-icon-error)]")}>
      <Icon icon={icon} size={16} />
    </span>
  );
}

export function BulletList({ items, icon, tone }: { items: string[]; icon?: IconValue; tone?: "brand" | "error" }) {
  return (
    <ul className="flex flex-col gap-4 rounded-xl bg-bg-subtle p-8">
      {items.map((t) => (
        <li key={t} className={cn(T.body, "flex items-start gap-4 text-text-primary")}>
          <Bullet icon={icon} tone={tone} />
          {t}
        </li>
      ))}
    </ul>
  );
}

/** The soft icon disc at the top of an informative sheet (Better deal, Reached your limit). */
export function SheetMark({ icon, tone = "brand" }: { icon: IconValue; tone?: "brand" | "warning" | "error" | "success" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-[44px] items-center justify-center self-center rounded-full",
        tone === "brand" && "bg-bg-brand-subtle text-text-brand",
        tone === "warning" && "bg-badge-warning-bg text-text-warning",
        tone === "error" && "bg-bg-error-subtle text-text-error",
        tone === "success" && "bg-bg-success-subtle text-text-success",
      )}
    >
      <Icon icon={icon} size={22} />
    </span>
  );
}

// ── Success & Failed (full screen) ─────────────────────────────────────

export type ResultAction = { label: string; href?: string; onClick?: () => void };

/** Figma "Success / Plan · Credits" and "Failed / Plan · Credits": ✕, the mark, the title and line, the facts, two ways on. */
export function ResultView({
  tone,
  title,
  line,
  rows,
  primary,
  secondary,
  onClose,
}: {
  tone: "success" | "error";
  title: string;
  line: React.ReactNode;
  rows: { label: string; value: React.ReactNode; tone?: "success" | "error" }[];
  primary: ResultAction;
  secondary?: ResultAction;
  onClose: () => void;
}) {
  const heading = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => heading.current?.focus(), []);
  const act = (a: ResultAction, hierarchy: "primary" | "ghost") =>
    a.href ? (
      <Link href={a.href} className={cn(buttonVariants({ hierarchy, size: "xl" }), "w-full border-solid")}>
        {a.label}
      </Link>
    ) : (
      <Button hierarchy={hierarchy} size="xl" className="w-full" onClick={a.onClick}>
        {a.label}
      </Button>
    );
  return (
    <div className="flex min-h-full flex-col px-8 pb-8">
      <div className="flex justify-end py-4">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="inline-flex size-[44px] items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Cancel01Icon} size={24} />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <span
          aria-hidden
          className={cn(
            "inline-flex size-[64px] items-center justify-center rounded-full text-[color:var(--color-white)]",
            tone === "success" ? "bg-[var(--color-icon-success)]" : "bg-[var(--color-icon-error)]",
          )}
        >
          <Icon icon={tone === "success" ? CheckmarkCircle02Icon : CancelCircleIcon} size={32} />
        </span>
        <div className="flex flex-col gap-4">
          <h1 ref={heading} tabIndex={-1} className={cn(T.display, "outline-none")}>
            {title}
          </h1>
          <p role={tone === "error" ? "alert" : "status"} className={T.body}>
            {line}
          </p>
        </div>
        <RowsCard className="w-full text-left">
          {rows.map((r) => (
            <Row key={r.label} label={r.label} tone={r.tone}>
              {r.value}
            </Row>
          ))}
        </RowsCard>
      </div>
      <div className="flex flex-col gap-4 pt-12">
        {act(primary, "primary")}
        {secondary && act(secondary, "ghost")}
      </div>
    </div>
  );
}

// ── a searchable pick-one sheet (Search your country / dial code) ──────

export function SearchPickSheet({
  open,
  onClose,
  title,
  placeholder,
  options,
  value,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  placeholder: string;
  options: readonly { value: string; label: string }[];
  value: string | null;
  onPick: (value: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const close = () => {
    setQuery("");
    onClose();
  };
  return (
    <Sheet open={open} onClose={close} title={title} fill>
      <SearchInput size="xl" aria-label={placeholder} placeholder={placeholder} value={query} onValueChange={setQuery} onClear={() => setQuery("")} />
      {shown.length === 0 ? (
        <p role="status" className={cn(T.body, "flex items-center gap-4 py-8")}>
          <Icon icon={Search01Icon} size={16} />
          Nothing matches “{query.trim()}”.
        </p>
      ) : (
        <ul role="listbox" aria-label={title} className="-mx-8 flex flex-col">
          {shown.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onPick(o.value);
                  close();
                }}
                className={cn(T.bodyLg, "flex min-h-[44px] w-full items-center justify-between gap-4 rounded-md px-8 text-left outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus")}
              >
                {o.label}
                {o.value === value && (
                  <span className="text-[color:var(--color-icon-brand)]">
                    <Icon icon={Tick02Icon} size={16} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/** A field that looks like the DS select and opens a SearchPickSheet. `shown` is what the field itself
 *  reads when it differs from the picked row ("+880" for "Bangladesh (+880)"). */
export function SearchSelectField({
  id,
  label,
  placeholder,
  value,
  options,
  onChange,
  invalid,
  describedBy,
  shown,
  className,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string | null;
  options: readonly { value: string; label: string }[];
  onChange: (v: string) => void;
  invalid?: boolean;
  describedBy?: string;
  shown?: string;
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
        aria-label={picked ? `${label}: ${picked.label}` : label}
        aria-describedby={describedBy}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-[44px] w-full items-center justify-between gap-4 rounded-xl border-[length:var(--border-width-1-5)] border-solid bg-[var(--color-input-bg)] px-6 text-left outline-none transition-[border-color,box-shadow] duration-fast focus-visible:shadow-focus-brand",
          invalid ? "border-[var(--color-input-border-error)]" : "border-[var(--color-input-border)] focus-visible:border-[var(--color-input-border-focus)]",
          className,
        )}
      >
        <span className={cn(T.bodyLg, "truncate", picked ? "text-[color:var(--color-input-text)]" : "text-[color:var(--color-input-placeholder)]")}>
          {picked ? (shown ?? picked.label) : placeholder}
        </span>
        <span aria-hidden className="text-[color:var(--color-icon-default)]">
          <Icon icon={ArrowDown01Icon} size={16} />
        </span>
      </button>
      <SearchPickSheet open={open} onClose={() => setOpen(false)} title={label} placeholder={`Search ${label.toLowerCase()}`} options={options} value={value} onPick={onChange} />
    </>
  );
}
