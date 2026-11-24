"use client";

// One bought copy on Earn › Sell, on the phone (CL-036 › The item panel; the web's resale-panel.tsx, its words and
// its writes): `…/earn/sell/<tileKey>`, its own screen in the order a holder decides it.
// · The head: the kind and use, the number large, the chip (Not for sale · For sale · Sold), what it is a copy of,
//   a Physical copy's units.
// · Not for sale — Sell this copy: Price with the token inside the field, filled with the creator's current price
//   for that kind and use (else what was paid); only digits and a point; under it You paid …, New copies from …
//   (or sold out / not selling), Lowest from other holders …; the split, live (Price, Creator's royalty, IDEEZA
//   fee, You get); The buyer gets / Stays yours; the bottom bar's one primary List for sale with its note. It signs
//   through the phone's wallet sheet (a free signature), rechecking that the copy is still the holder's.
// · For sale — the price large and since when, the split, what moves and what stays; then rows: Change price (a
//   sheet with the same field and split, one primary Sign the new price; ✕ keeps the price), Take off sale (a
//   confirm: nothing to sign) and See it on Explore marketplace.
// · Sold — the receipt: Sold to, On, Price, Creator's royalty, IDEEZA fee, Paid to you, Units handed over,
//   Transaction; "The copy and its licence are {buyer}'s now. The payout went to your demo wallet."
// Each write says so in a toast. A copy no longer on this Sell (sold meanwhile, another demo creator picked) says so.

import * as React from "react";
import { Delete02Icon, PencilEdit01Icon, ShoppingBag01Icon, Store01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field } from "@/components/auth/auth-parts";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { TextInput } from "@/components/ideeza/text-input";
import { KIND_ICON } from "@/components/marketplace/kind-icon";
import { readSampleSales, useSampleSales } from "@/components/mobile/project-earn/buyer/sample-sales-store";
import { lowestHolderPriceOf, useResaleTerms, type ResaleTerms } from "@/components/projects/purchased/earn/resale-terms";
import { readResales, useResales, writeResales } from "@/components/projects/purchased/resales-store";
import { useUnitsLog } from "@/components/projects/purchased/units-store";
import { usePurchased } from "@/components/projects/purchased/use-purchased";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { formatDate } from "@/lib/manual/project-summary";
import { FEE_LABEL } from "@/lib/market/fee";
import { readMarketNow } from "@/lib/market/market-store";
import { holderNowOf, KIND_NAME, resaleDraftOf, wholeProjectOnly, type PurchasedProject } from "@/lib/market/purchases";
import { resaleTilesOf, type ResaleTile } from "@/lib/market/resale-desk";
import {
  BAD_PRICE,
  cancelResale,
  handsOverOf,
  listResale,
  readPrice,
  repriceResale,
  resaleListRequestOf,
  resaleSplitOf,
  type Resale,
} from "@/lib/market/resales";
import { randomId } from "@/lib/market/sales";
import { unitsLineOf } from "@/lib/market/units";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import type { DemoBuyer } from "@/lib/wallet/identities";
import { formatAmount } from "@/lib/wallet/money";
import { cn } from "@/lib/utils";
import { BottomBar } from "../../kit/bottom-bar";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { ListCard, ListRow } from "../../kit/list";
import { Sheet } from "../../kit/sheet";
import { EmptyState } from "../../kit/state";
import { OfflineBanner } from "../../kit/states";
import { useToast } from "../../kit/toast";
import { FactRows } from "../../project-earn/parts";
import { PhoneWalletScope } from "../../project-earn/phone-wallet";
import { Screen } from "../../screen";
import { TopBar } from "../../top-bar";
import { T } from "../../type";
import { NothingBought, PurchasedLoading, useScrolledPast } from "../parts";
import { PURCHASED_TAB_HREF, purchasedEarnPath, purchasedPhoneHrefOf, purchasedShopHref } from "../paths";
import { STATE_CHIP } from "./earn-screen";

const STORAGE_FULL = "Your browser didn't save this — storage is full.";

export function ResaleItemScreen({ id, tileKey }: { id: string; tileKey: string }) {
  return (
    <PhoneWalletScope>
      <ResaleItem id={id} tileKey={tileKey} />
    </PhoneWalletScope>
  );
}

function ResaleItem({ id, tileKey }: { id: string; tileKey: string }) {
  const { ready, buyer, purchases } = usePurchased();
  const log = useUnitsLog();
  const back = purchasedEarnPath(id, "sell");
  if (!ready) return <PurchasedLoading back={back} />;
  const p = purchases.find((x) => x.id === id);
  if (!p || wholeProjectOnly(p)) return <NothingBought buyerName={buyer.name} back={p ? purchasedPhoneHrefOf(p) : PURCHASED_TAB_HREF} />;
  const tile = resaleTilesOf(p, buyer.id, log).find((t) => t.key === tileKey);
  if (!tile) {
    return (
      <Screen top={<TopBar back={back} />} className="px-8 pb-8">
        <EmptyState
          icon={ShoppingBag01Icon}
          title="This copy isn’t on your Sell now"
          body={`${buyer.name} doesn’t hold it any more, or it belongs to another demo creator.`}
          action={{ label: "Back to Sell", href: back }}
        />
      </Screen>
    );
  }
  return <ItemBody p={p} tile={tile} buyer={buyer} back={back} />;
}

function ItemBody({ p, tile, buyer, back }: { p: PurchasedProject; tile: ResaleTile; buyer: DemoBuyer; back: string }) {
  const resales = useResales();
  const sampleSales = useSampleSales();
  const terms = useResaleTerms(p, sampleSales);
  const listing = tile.copy?.listing ? (resales.find((r) => r.id === tile.copy?.listing?.id) ?? null) : null;
  const form = useListForm({ p, tile, buyer, terms, resales, editing: null, onDone: () => undefined });
  const chip = STATE_CHIP[tile.state];
  const held = tile.state === "held" || (tile.state === "listed" && !listing);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const gone = useScrolledPast(titleRef);
  return (
    <Screen
      top={<TopBar back={back} titleAs="p" title={gone ? tile.number : undefined} />}
      footer={
        held && form ? (
          <BottomBar>
            <p className={cn(T.meta, "text-center")}>Listing is a free signature. The copy stays yours, and in your wallet, until someone buys it.</p>
            {form.submit}
          </BottomBar>
        ) : undefined
      }
    >
      <OfflineBanner />
      <div className="flex flex-col gap-12 px-8 pb-12 pt-2">
        <header className="flex flex-col gap-3">
          <p className={cn(T.meta, "flex items-center gap-2")}>
            <span aria-hidden className="inline-flex text-[color:var(--color-icon-default)]">
              <Icon icon={KIND_ICON[tile.kind]} size={16} />
            </span>
            {[KIND_NAME[tile.kind], tile.use].join(" · ")}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 ref={titleRef} className={cn(T.display, "font-mono tabular-nums")}>
              {tile.number}
            </h1>
            <Badge tone={chip.tone}>{chip.label}</Badge>
          </div>
          <p className={T.body}>
            {tile.product ? `A copy of ${tile.product}, from ${p.name}.` : p.products.length > 1 ? `A copy of the whole project: ${p.products.join(", ")}.` : `A copy of ${p.name}.`}
          </p>
          {tile.units && <p className={cn(T.rowTitle, "tabular-nums")}>{unitsLineOf(tile.units)}</p>}
        </header>

        {tile.state === "sold" && tile.sold ? (
          <SoldReceipt tile={tile} />
        ) : tile.state === "listed" && listing ? (
          <ListedBody p={p} tile={tile} listing={listing} buyer={buyer} terms={terms} resales={resales} />
        ) : form ? (
          <section aria-labelledby="sell-this-copy" className="flex flex-col gap-8">
            <h2 id="sell-this-copy" className={T.section}>
              Sell this copy
            </h2>
            {form.fields}
            <Moves tile={tile} />
          </section>
        ) : null}
      </div>
    </Screen>
  );
}

// ─────────────────────────── the price form ───────────────────────────

/** The price field, its references and the live split, and the one button that signs it — kept apart so a
 *  screen puts the button in its bottom bar and a sheet in its actions. Null for a tile without a copy. */
function useListForm({
  p,
  tile,
  buyer,
  terms,
  resales,
  editing,
  onDone,
}: {
  p: PurchasedProject;
  tile: ResaleTile;
  buyer: DemoBuyer;
  terms: ResaleTerms;
  resales: readonly Resale[];
  /** A live listing whose price this form changes; null to list. */
  editing: Resale | null;
  onDone: () => void;
}): { fields: React.ReactNode; submit: React.ReactNode } | null {
  const { request } = useWalletRequest();
  const toast = useToast();
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
        toast({ title: editing ? `New price: ${formatAmount(price, token)}.` : `${tile.number} is for sale at ${formatAmount(price, token)}.` });
        onDone();
      } else if (result.reason !== "rejected" && result.message) setProblem(result.message);
    } finally {
      setBusy(false);
    }
  };

  const fields = (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field htmlFor={id} label={editing ? "New price" : "Price"} error={error ?? undefined} errorId={`${id}-err`}>
        <TextInput
          id={id}
          size="xl"
          value={text}
          onValueChange={(v) => setText(v.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          enterKeyHint="done"
          suffix={token}
          invalid={!!error}
          aria-invalid={!!error || undefined}
          aria-describedby={`${id}-refs${error ? ` ${id}-err` : ""}`}
        />
      </Field>
      <ul id={`${id}-refs`} className={cn(T.meta, "flex flex-col gap-1 tabular-nums")}>
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
      <Split price={price ?? "0"} token={token} royaltyPct={royaltyPct} />
    </form>
  );
  const submitButton = (
    <Button size="xl" className="w-full" aria-disabled={busy || undefined} onClick={() => void submit()}>
      {editing ? "Sign the new price" : "List for sale"}
    </Button>
  );
  return { fields, submit: submitButton };
}

/** The price split, live: the creator's royalty, IDEEZA's fee, what the seller gets. */
function Split({ price, token, royaltyPct }: { price: string; token: Resale["token"]; royaltyPct: number }) {
  const s = resaleSplitOf(price, royaltyPct);
  const row = "flex items-baseline justify-between gap-6";
  return (
    <dl className="flex flex-col gap-3 rounded-xl bg-bg-subtle px-8 py-6">
      <div className={row}>
        <dt className={T.body}>Price</dt>
        <dd className={cn(T.body, "tabular-nums text-text-primary")}>{formatAmount(price, token)}</dd>
      </div>
      <div className={row}>
        <dt className={T.body}>Creator&apos;s royalty ({royaltyPct}%)</dt>
        <dd className={cn(T.body, "tabular-nums")}>−{formatAmount(s.royalty, token)}</dd>
      </div>
      <div className={row}>
        <dt className={T.body}>{FEE_LABEL}</dt>
        <dd className={cn(T.body, "tabular-nums")}>−{formatAmount(s.fee, token)}</dd>
      </div>
      <div className={cn(row, "border-t-[length:var(--border-width-1)] border-solid border-border pt-3")}>
        <dt className={T.rowTitle}>You get</dt>
        <dd className={cn(T.rowTitle, "tabular-nums")}>{formatAmount(s.payout, token)}</dd>
      </div>
    </dl>
  );
}

/** What moves with the copy and what stays the seller's. */
function Moves({ tile }: { tile: ResaleTile }) {
  const kept = tile.units?.madeByHolder ?? 0;
  return (
    <dl className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <dt className={cn(T.label, "text-text-tertiary")}>The buyer gets</dt>
        <dd className={cn(T.body, "text-text-primary")}>{handsOverOf(tile, tile.units?.left ?? null)}.</dd>
      </div>
      <div className="flex flex-col gap-1">
        <dt className={cn(T.label, "text-text-tertiary")}>Stays yours</dt>
        <dd className={cn(T.body, "text-text-primary")}>
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

// ─────────────────────────── for sale ───────────────────────────

function ListedBody({
  p,
  tile,
  listing,
  buyer,
  terms,
  resales,
}: {
  p: PurchasedProject;
  tile: ResaleTile;
  listing: Resale;
  buyer: DemoBuyer;
  terms: ResaleTerms;
  resales: readonly Resale[];
}) {
  const toast = useToast();
  const [sheet, setSheet] = React.useState<"price" | "off" | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);
  const takeOff = () => {
    const out = cancelResale(readResales(), listing.id, Date.now());
    if (!out.ok) {
      setProblem(out.message);
      throw new Error(out.message);
    }
    if (!writeResales(out.resales)) {
      setProblem(STORAGE_FULL);
      throw new Error(STORAGE_FULL);
    }
    toast({ title: `${tile.number} is off sale.` });
  };
  return (
    <>
      <section aria-labelledby="for-sale" className="flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <h2 id="for-sale" className={cn(T.amountHero, "min-w-0 break-words")}>
              {formatAmount(listing.price, listing.token)}
            </h2>
            <TestnetDemoBadge />
          </div>
          <p className={T.meta}>
            For sale on Explore marketplace since {formatDate(listing.listedAt)}
            {listing.updatedAt !== listing.listedAt ? ` · new price ${formatDate(listing.updatedAt)}` : ""}
          </p>
        </div>
        <Split price={listing.price} token={listing.token} royaltyPct={listing.royaltyPct} />
        <Moves tile={tile} />
        {tile.kind === "physical" && <p className={T.meta}>No units are made with a copy while it&apos;s for sale, so the buyer gets exactly what this says.</p>}
        {problem && (
          <p role="alert" className={cn(T.caption, "text-text-error")}>
            {problem}
          </p>
        )}
        <ListCard label="Manage the listing">
          <ListRow icon={PencilEdit01Icon} title="Change price" meta="A new price is a free signature." onClick={() => setSheet("price")} />
          <ListRow icon={Delete02Icon} title="Take off sale" meta="Nothing to sign" onClick={() => setSheet("off")} />
          <ListRow icon={Store01Icon} title="See it on Explore marketplace" href={purchasedShopHref(p, tile.kind)} />
        </ListCard>
      </section>
      {sheet === "price" && <PriceSheet p={p} tile={tile} listing={listing} buyer={buyer} terms={terms} resales={resales} onClose={() => setSheet(null)} />}
      <ConfirmSheet
        open={sheet === "off"}
        onClose={() => setSheet(null)}
        title={`Take ${tile.number} off sale?`}
        body="It leaves Explore marketplace at once. Nothing to sign, and you can list it again any time."
        verb="Take off sale"
        cancelLabel="Keep it for sale"
        onConfirm={takeOff}
      />
    </>
  );
}

/** Change price: the same field and split in a sheet, one primary; ✕ keeps the price. */
function PriceSheet({
  p,
  tile,
  listing,
  buyer,
  terms,
  resales,
  onClose,
}: {
  p: PurchasedProject;
  tile: ResaleTile;
  listing: Resale;
  buyer: DemoBuyer;
  terms: ResaleTerms;
  resales: readonly Resale[];
  onClose: () => void;
}) {
  const form = useListForm({ p, tile, buyer, terms, resales, editing: listing, onDone: onClose });
  return (
    <Sheet
      open
      onClose={onClose}
      title="Change price"
      description={`Now ${formatAmount(listing.price, listing.token)}.`}
      actions={
        <>
          <p className={cn(T.meta, "text-center")}>A new price is a free signature.</p>
          {form?.submit}
        </>
      }
    >
      <div className="pb-4">{form?.fields}</div>
    </Sheet>
  );
}

// ─────────────────────────── sold ───────────────────────────

function SoldReceipt({ tile }: { tile: ResaleTile }) {
  const s = tile.sold;
  if (!s) return null;
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Sold to", value: s.to },
    { label: "On", value: formatDate(s.at) },
    { label: "Price", value: formatAmount(s.price, s.token) },
    { label: `Creator's royalty (${s.royaltyPct}%)`, value: `−${formatAmount(s.royalty, s.token)}` },
    { label: FEE_LABEL, value: `−${formatAmount(s.fee, s.token)}` },
    { label: "Paid to you", value: <span className={cn(T.rowTitle, "text-text-success")}>{formatAmount(s.payout, s.token)}</span> },
    ...(s.unitsLeft !== null ? [{ label: "Units handed over", value: s.unitsLeft === 0 ? "None left" : String(s.unitsLeft) }] : []),
    { label: "Transaction", value: <span className="font-mono">{shortAddress(s.txHash)}</span> },
  ];
  return (
    <section aria-labelledby="receipt" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="receipt" className={T.section}>
          Receipt
        </h2>
        <TestnetDemoBadge />
      </div>
      <FactRows label="Receipt" rows={rows} />
      <p className={T.meta}>The copy and its licence are {s.to}&apos;s now. The payout went to your demo wallet.</p>
    </section>
  );
}
