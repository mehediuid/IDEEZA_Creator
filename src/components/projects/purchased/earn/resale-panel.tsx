"use client";

// Earn › Sell's item panel for one bought copy (beside the board from a 1024 px page, a side drawer below it, as the
// project's own Sell desk): everything about selling that copy on, in the order a holder decides it.
// - Not for sale: Sell this copy — a price (what they paid, what the creator asks for a new one and the lowest other
//   holder's price beside it), the price split live (the creator's royalty, IDEEZA's fee, what they get), what the
//   buyer gets and what stays theirs, then List for sale: a free signature.
// - For sale: the price and since when, the split, what the buyer gets; Change price (signs again) and Take off sale
//   (no signature: a lazy listing has nothing on chain), and the listing on Explore marketplace. No units are made
//   with a copy while it is for sale.
// - Sold: the receipt — who bought it, when, the price, the royalty, the fee, what it paid, the units handed over.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, TextInput, type BadgeTone } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { readSampleSales } from "@/components/mobile/project-earn/buyer/sample-sales-store";
import { KindDot } from "@/components/projects/earn/sell/board";
import { FEE_LABEL } from "@/lib/market/fee";
import { readMarketNow } from "@/lib/market/market-store";
import { formatDate } from "@/lib/manual/project-summary";
import { holderNowOf, KIND_NAME, resaleDraftOf, type PurchasedProject } from "@/lib/market/purchases";
import type { ResaleTile } from "@/lib/market/resale-desk";
import {
  cancelResale,
  handsOverOf,
  listResale,
  readPrice,
  repriceResale,
  resaleListRequestOf,
  resaleSplitOf,
  BAD_PRICE,
  type Resale,
} from "@/lib/market/resales";
import { randomId } from "@/lib/market/sales";
import { unitsLineOf } from "@/lib/market/units";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import type { DemoBuyer } from "@/lib/wallet/identities";
import { cn } from "@/lib/utils";
import { readResales, writeResales } from "../resales-store";
import { lowestHolderPriceOf, type ResaleTerms } from "./resale-terms";

const STORAGE_FULL = "Your browser didn't save this — storage is full.";
const ROW = "flex items-baseline justify-between gap-6 text-md leading-md";
const SECTION = "flex flex-col gap-6 px-8 py-8";

export const STATE_CHIP: Record<ResaleTile["state"], { label: string; tone: BadgeTone }> = {
  held: { label: "Not for sale", tone: "neutral" },
  listed: { label: "For sale", tone: "brand" },
  sold: { label: "Sold", tone: "success" },
};

/** The drawer's title and line for a tile: what the panel's head says beside the board. */
export function resaleHeadOf(t: ResaleTile): { title: string; description: string } {
  return { title: t.number, description: [KIND_NAME[t.kind], t.use, t.product].filter(Boolean).join(" · ") };
}

export function ResalePanel({
  p,
  tile,
  buyer,
  terms,
  resales,
  announce,
  inDrawer,
}: {
  p: PurchasedProject;
  tile: ResaleTile;
  buyer: DemoBuyer;
  terms: ResaleTerms;
  resales: readonly Resale[];
  announce: (message: string) => void;
  /** The drawer's own header already says the copy's number and name. */
  inDrawer: boolean;
}) {
  const chip = STATE_CHIP[tile.state];
  const listing = tile.copy?.listing ? (resales.find((r) => r.id === tile.copy?.listing?.id) ?? null) : null;
  return (
    <>
      <div className={cn(SECTION, "gap-4")}>
        {!inDrawer && (
          <span className="flex items-center gap-3 text-sm font-semibold leading-sm text-text-secondary">
            <KindDot kind={tile.kind} />
            {[KIND_NAME[tile.kind], tile.use].join(" · ")}
          </span>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {!inDrawer && <h2 className="m-0 font-mono text-2xl font-semibold leading-2xl text-text-primary tabular-nums">{tile.number}</h2>}
          <Badge tone={chip.tone} className="h-[24px] px-[10px] py-0 text-sm font-semibold leading-sm">
            {chip.label}
          </Badge>
        </div>
        <p className="m-0 text-md leading-md text-text-secondary">
          {tile.product ? `A copy of ${tile.product}, from ${p.name}.` : p.products.length > 1 ? `A copy of the whole project: ${p.products.join(", ")}.` : `A copy of ${p.name}.`}
        </p>
        {tile.units && <p className="m-0 text-md leading-md tabular-nums text-text-primary">{unitsLineOf(tile.units)}</p>}
      </div>
      {tile.state === "sold" && tile.sold ? (
        <SoldReceipt tile={tile} />
      ) : tile.state === "listed" && listing ? (
        <ListedBody key={listing.id + listing.price} p={p} tile={tile} listing={listing} buyer={buyer} terms={terms} resales={resales} announce={announce} />
      ) : (
        <ListForm p={p} tile={tile} buyer={buyer} terms={terms} resales={resales} announce={announce} editing={null} onDone={() => {}} />
      )}
    </>
  );
}

/** The price split, live: the creator's royalty, IDEEZA's fee, what the seller gets. */
function Split({ price, token, royaltyPct }: { price: string; token: Resale["token"]; royaltyPct: number }) {
  const s = resaleSplitOf(price, royaltyPct);
  return (
    <dl className="m-0 flex flex-col gap-3 rounded-xl bg-bg-subtle px-7 py-6">
      <div className={ROW}>
        <dt className="text-text-secondary">Price</dt>
        <dd className="m-0 tabular-nums text-text-primary">{formatAmount(price, token)}</dd>
      </div>
      <div className={ROW}>
        <dt className="text-text-secondary">Creator&apos;s royalty ({royaltyPct}%)</dt>
        <dd className="m-0 tabular-nums text-text-secondary">−{formatAmount(s.royalty, token)}</dd>
      </div>
      <div className={ROW}>
        <dt className="text-text-secondary">{FEE_LABEL}</dt>
        <dd className="m-0 tabular-nums text-text-secondary">−{formatAmount(s.fee, token)}</dd>
      </div>
      <div className={cn(ROW, "border-x-0 border-b-0 border-t border-solid border-border pt-3")}>
        <dt className="font-semibold text-text-primary">You get</dt>
        <dd className="m-0 font-semibold tabular-nums text-text-primary">{formatAmount(s.payout, token)}</dd>
      </div>
    </dl>
  );
}

/** What moves with the copy and what stays the seller's. */
function Moves({ tile }: { tile: ResaleTile }) {
  const kept = tile.units?.madeByHolder ?? 0;
  return (
    <dl className="m-0 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <dt className="text-sm font-semibold text-text-tertiary">The buyer gets</dt>
        <dd className="m-0 text-md leading-md text-text-primary">{handsOverOf(tile, tile.units?.left ?? null)}.</dd>
      </div>
      <div className="flex flex-col gap-1">
        <dt className="text-sm font-semibold text-text-tertiary">Stays yours</dt>
        <dd className="m-0 text-md leading-md text-text-primary">
          {tile.kind === "physical"
            ? kept > 0
              ? `The ${kept} ${kept === 1 ? "unit" : "units"} you made${tile.use === "Business use" ? ", and you can still sell them" : ""}.`
              : "Nothing: you haven't made units with it."
            : "What you made with it. You stop starting new work with it once it sells."}
        </dd>
      </div>
    </dl>
  );
}

function ListForm({
  p,
  tile,
  buyer,
  terms,
  resales,
  announce,
  editing,
  onDone,
}: {
  p: PurchasedProject;
  tile: ResaleTile;
  buyer: DemoBuyer;
  terms: ResaleTerms;
  resales: readonly Resale[];
  announce: (message: string) => void;
  /** A live listing whose price this form changes; null to list. */
  editing: Resale | null;
  onDone: () => void;
}) {
  const { request } = useWalletRequest();
  const line = tile.line;
  const copy = tile.copy;
  const creator = line && copy ? terms.creatorPriceOf(line, copy) : null;
  const royaltyPct = editing?.royaltyPct ?? (line && copy ? terms.royaltyOf(line, copy) : 10);
  const [text, setText] = React.useState(editing ? editing.price : creator ? creator.amount : (copy?.price ?? ""));
  const [tried, setTried] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);
  const id = React.useId();
  if (!line || !copy) return null;
  const token = copy.token;
  const price = readPrice(text);
  const error = tried && !price ? BAD_PRICE : problem;
  const low = lowestHolderPriceOf(resales, p.id, line, copy.key);
  const draft = resaleDraftOf(p, line, copy, royaltyPct);

  const submit = async () => {
    setTried(true);
    setProblem(null);
    if (!price || !draft || busy) return;
    setBusy(true);
    try {
      const holderNow = () => holderNowOf(copy.key, readSampleSales(), readMarketNow().sales, readResales());
      const result = await request(resaleListRequestOf(draft, buyer.id, price, editing !== null), {
        recheck: () => (holderNow() === buyer.id ? null : "You don't hold this copy any more."),
        commit: (proof) => {
          const stored = readResales();
          const out = editing ? repriceResale(stored, editing.id, price, proof.at) : listResale(stored, draft, buyer.id, holderNow() ?? buyer.id, price, proof.at, randomId("rsl"));
          if (!out.ok) return { ok: false, conflict: true, message: out.message };
          if (!writeResales(out.resales)) return { ok: false, message: STORAGE_FULL };
          return { ok: true };
        },
      });
      if (result.ok) {
        announce(editing ? `New price: ${formatAmount(price, token)}.` : `${tile.number} is for sale at ${formatAmount(price, token)}.`);
        onDone();
      } else if (result.reason !== "rejected" && result.message) setProblem(result.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className={SECTION}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {!editing && <h3 className="m-0 text-lg font-semibold leading-lg text-text-primary">Sell this copy</h3>}
      <div className="flex flex-col gap-3">
        <label htmlFor={id} className="text-md font-semibold text-text-primary">
          {editing ? "New price" : "Price"}
        </label>
        <TextInput
          id={id}
          size="xl"
          value={text}
          onValueChange={(v) => setText(v.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          suffix={token}
          invalid={!!error}
          aria-invalid={!!error || undefined}
          aria-describedby={`${id}-refs${error ? ` ${id}-err` : ""}`}
        />
        {error && (
          <span id={`${id}-err`} role="alert" className="text-sm font-medium text-text-error">
            {error}
          </span>
        )}
        <ul id={`${id}-refs`} className="m-0 flex list-none flex-col gap-1 p-0 text-sm leading-sm text-text-secondary tabular-nums">
          <li>
            You paid {formatAmount(copy.price, copy.token)}
            {copy.from ? ` to ${copy.from}` : ""}
          </li>
          <li>
            {creator
              ? creator.open
                ? `New copies from ${p.creator}: ${formatAmount(creator.amount, creator.token)}`
                : `New copies from ${p.creator} are sold out: holders are the only sellers`
              : `${p.creator} isn't selling new copies of this kind`}
          </li>
          {low && <li>Lowest from other holders: {formatAmount(low.amount, low.token)}</li>}
        </ul>
      </div>
      <Split price={price ?? "0"} token={token} royaltyPct={royaltyPct} />
      {!editing && <Moves tile={tile} />}
      <div className="flex flex-wrap gap-4">
        <Button type="submit" hierarchy="primary" size="lg" aria-disabled={busy || undefined} className="h-[44px] max-sm:w-full">
          {editing ? "Sign the new price" : "List for sale"}
        </Button>
        {editing && (
          <Button type="button" hierarchy="secondary" size="lg" onClick={onDone} className="h-[44px] max-sm:w-full">
            Keep {formatAmount(editing.price, editing.token)}
          </Button>
        )}
      </div>
      <p className="m-0 text-sm leading-sm text-text-tertiary">
        {editing ? "A new price is a free signature." : "Listing is a free signature. The copy stays yours, and in your wallet, until someone buys it."}
      </p>
    </form>
  );
}

function ListedBody({
  p,
  tile,
  listing,
  buyer,
  terms,
  resales,
  announce,
}: {
  p: PurchasedProject;
  tile: ResaleTile;
  listing: Resale;
  buyer: DemoBuyer;
  terms: ResaleTerms;
  resales: readonly Resale[];
  announce: (message: string) => void;
}) {
  const [mode, setMode] = React.useState<"view" | "price" | "off">("view");
  const [problem, setProblem] = React.useState<string | null>(null);
  if (mode === "price")
    return <ListForm p={p} tile={tile} buyer={buyer} terms={terms} resales={resales} announce={announce} editing={listing} onDone={() => setMode("view")} />;
  const takeOff = () => {
    const out = cancelResale(readResales(), listing.id, Date.now());
    if (!out.ok) return setProblem(out.message);
    if (!writeResales(out.resales)) return setProblem(STORAGE_FULL);
    announce(`${tile.number} is off sale.`);
  };
  return (
    <div className={SECTION}>
      <div className="flex flex-col gap-1">
        <span className="text-3xl font-semibold leading-3xl tabular-nums text-text-primary">{formatAmount(listing.price, listing.token)}</span>
        <span className="text-sm leading-sm text-text-secondary">
          For sale on Explore marketplace since {formatDate(listing.listedAt)}
          {listing.updatedAt !== listing.listedAt ? ` · new price ${formatDate(listing.updatedAt)}` : ""}
        </span>
      </div>
      <Split price={listing.price} token={listing.token} royaltyPct={listing.royaltyPct} />
      <Moves tile={tile} />
      {tile.kind === "physical" && <p className="m-0 text-sm leading-sm text-text-secondary">No units are made with a copy while it&apos;s for sale, so the buyer gets exactly what this says.</p>}
      {mode === "off" ? (
        <div role="group" aria-label={`Take ${tile.number} off sale?`} className="flex flex-col gap-4 rounded-xl border border-solid border-border px-7 py-6">
          <p className="m-0 text-md font-semibold leading-md text-text-primary">Take {tile.number} off sale?</p>
          <p className="m-0 text-md leading-md text-text-secondary">It leaves Explore marketplace at once. Nothing to sign, and you can list it again any time.</p>
          <div className="flex flex-wrap gap-4">
            <Button type="button" hierarchy="primary" size="md" onClick={takeOff} className="max-sm:w-full">
              Take off sale
            </Button>
            <Button type="button" hierarchy="secondary" size="md" onClick={() => setMode("view")} className="max-sm:w-full">
              Keep it for sale
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          <Button type="button" hierarchy="secondary" size="lg" onClick={() => setMode("price")} className="h-[44px] max-sm:w-full">
            Change price
          </Button>
          <Button type="button" hierarchy="secondary" size="lg" onClick={() => setMode("off")} className="h-[44px] max-sm:w-full">
            Take off sale
          </Button>
        </div>
      )}
      {problem && (
        <p role="alert" className="m-0 text-sm font-medium text-text-error">
          {problem}
        </p>
      )}
      <Link
        href={`${p.marketHref}?nft=${tile.kind}`}
        className="inline-flex min-h-[24px] items-center gap-2 self-start rounded-sm text-md font-semibold text-text-link outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]"
      >
        See it on Explore marketplace
        <Icon icon={ArrowRight01Icon} size={14} />
      </Link>
    </div>
  );
}

function SoldReceipt({ tile }: { tile: ResaleTile }) {
  const s = tile.sold;
  if (!s) return null;
  const rows: [string, string][] = [
    ["Sold to", s.to],
    ["On", formatDate(s.at)],
    ["Price", formatAmount(s.price, s.token)],
    [`Creator's royalty (${s.royaltyPct}%)`, `−${formatAmount(s.royalty, s.token)}`],
    [FEE_LABEL, `−${formatAmount(s.fee, s.token)}`],
    ["Paid to you", formatAmount(s.payout, s.token)],
    ...(s.unitsLeft !== null ? ([["Units handed over", s.unitsLeft === 0 ? "None left" : String(s.unitsLeft)]] as [string, string][]) : []),
    ["Transaction", shortAddress(s.txHash)],
  ];
  return (
    <div className={SECTION}>
      <h3 className="m-0 text-lg font-semibold leading-lg text-text-primary">Receipt</h3>
      <dl className="m-0 flex flex-col gap-3">
        {rows.map(([k, v]) => (
          <div key={k} className={cn(ROW, k === "Paid to you" && "font-semibold")}>
            <dt className={k === "Paid to you" ? "text-text-primary" : "text-text-secondary"}>{k}</dt>
            <dd className={cn("m-0 tabular-nums text-text-primary", k === "Transaction" && "font-mono text-sm")}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="m-0 text-sm leading-sm text-text-tertiary">The copy and its licence are {s.to}&apos;s now. The payout went to your demo wallet.</p>
    </div>
  );
}
