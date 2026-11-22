"use client";

// From holders on the phone's shop screens (CL-036, the web's marketplace/holder-offers.tsx): the copies
// of one kind other creators bought and sell on, cheapest first, under the creator's own copy rows — the
// only way to get one once the creator's copies are sold out. Each row says what a buyer gets (its number,
// its use, a Physical copy's units left) and who sells it, then its price and a small Buy, the same row
// as a creator's copy. Buy is the buyer's wallet transaction (the web's resale request and commit, through
// whichever wallet sheet the screen gives — PhoneWalletScope's, or `request`); the copy moves to them with
// its licence and units left, and the seller is paid (`payOut`). The active demo creator's own listing
// reads "Your listing" with Manage, to its Earn. Nobody selling: no section.

import * as React from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { useWalletRequest, type WalletRequestApi } from "@/components/wallet/wallet-provider";
import { payOut, readResales, useResales, writeResales } from "@/components/projects/purchased/resales-store";
import { readUnitsLog, useUnitsLog } from "@/components/projects/purchased/units-store";
import { estimateGas } from "@/lib/commerce/gas";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import { holderNowOf } from "@/lib/market/purchases";
import { tileKeyOfCopy } from "@/lib/market/resale-desk";
import { resaleItemPath } from "../../purchased/paths";
import { buyerNameOf, buyResale, copyNumberOf, onSaleOf, resaleBuyBlock, resaleBuyRequestOf, type Resale } from "@/lib/market/resales";
import { copyUnitsOf, unitsAllowanceOf, unitsLineOf, type UnitsEntry } from "@/lib/market/units";
import type { EditionKind } from "@/lib/market/types";
import { formatAmount } from "@/lib/wallet/money";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { LIST_CARD, LIST_DIVIDERS } from "../../kit/list";
import { T } from "../../type";
import type { DoneFacts } from "./parts";
import { readSampleSales, useSampleSales } from "./sample-sales-store";

const STORAGE_FULL = "Your browser didn't save this purchase — storage is full.";

/** A row's small button (A01 MD, 36 px) on the phone's 44 px tap area. */
export const HIT44 = "relative after:absolute after:inset-x-0 after:-inset-y-[4px] after:content-['']";

/** Where "Manage" leads: the Earn of the project the holder bought copies of. */
export const purchasedEarnPath = (projectId: string) => `/m/projects/purchased/${encodeURIComponent(projectId)}/earn`;

/** A Physical copy's units left with its seller now; null for a Virtual copy. */
function unitsLeftOf(r: Resale, log: readonly UnitsEntry[]): number | null {
  return r.kind === "physical" ? copyUnitsOf(r.copyKey, unitsAllowanceOf(r.use), r.sellerId, log).left : null;
}

/** The listings on sale now of one kind, cheapest first: a product's own copies (`product` = its name), or
 *  the whole project's (null). Only those whose seller still holds the copy. */
export function useHolderListings(projectId: string, kind: EditionKind, product: string | null): Resale[] {
  const resales = useResales();
  const sampleSales = useSampleSales();
  const market = useMarket();
  return React.useMemo(
    () => onSaleOf(projectId, kind, resales, (r) => holderNowOf(r.copyKey, sampleSales, market.data.sales, resales)).filter((r) => r.product === product),
    [projectId, kind, product, resales, sampleSales, market.data.sales],
  );
}

export function HolderOffers({
  projectId,
  kind,
  product,
  request: askWallet,
  onBought,
}: {
  projectId: string;
  kind: EditionKind;
  /** A product's screen: that product's own copies (its name); null for the whole project's. */
  product: string | null;
  /** The screen's own wallet sheet, when it isn't the scope's (the product page's). */
  request?: WalletRequestApi["request"];
  /** The purchase went through: what to say on Purchase successful. */
  onBought: (done: DoneFacts) => void;
}) {
  const rows = useHolderListings(projectId, kind, product);
  const log = useUnitsLog();
  const { buyer } = useActiveBuyer();
  const scope = useWalletRequest();
  const request = askWallet ?? scope.request;
  const [busy, setBusy] = React.useState<string | null>(null);
  const headingId = React.useId();
  if (!rows.length) return null;

  const buy = async (r: Resale) => {
    if (busy) return;
    const holderFresh = () => holderNowOf(r.copyKey, readSampleSales(), readMarketNow().sales, readResales());
    const req = resaleBuyRequestOf(r, buyer.id, unitsLeftOf(r, readUnitsLog()));
    setBusy(r.id);
    try {
      const result = await request(req, {
        recheck: () => resaleBuyBlock(readResales(), r.id, buyer.id, holderFresh()),
        commit: (proof) => {
          const out = buyResale(readResales(), r.id, { id: buyer.id, address: proof.address }, holderFresh(), { at: proof.at, txHash: proof.txHash ?? "" }, unitsLeftOf(r, readUnitsLog()));
          if (!out.ok) return { ok: false, conflict: true, message: out.message };
          if (!writeResales(out.resales)) return { ok: false, message: STORAGE_FULL };
          return { ok: true };
        },
      });
      if (result.ok) {
        payOut(r.id);
        const gas = estimateGas(r.network);
        onBought({
          sentence: req.doneLine,
          transaction: result.proof.txHash ?? null,
          paid: `${formatAmount(r.price, r.token)} (+ ${formatAmount(String(gas.fee), gas.native)} network fee)`,
        });
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h5 id={headingId} className={cn(T.rowTitle, "tabular-nums")}>
          {`From holders · ${rows.length}`}
        </h5>
        <p className={T.meta}>
          Copies others bought and sell on. You get the copy, its licence{kind === "physical" ? " and its units left" : ""}; the creator still gets a royalty.
        </p>
      </div>
      <ul className={cn(LIST_CARD, LIST_DIVIDERS)}>
        {rows.map((r) => (
          <HolderRow key={r.id} r={r} buyerId={buyer.id} log={log} busy={busy === r.id} onBuy={() => void buy(r)} />
        ))}
      </ul>
    </section>
  );
}

function HolderRow({ r, buyerId, log, busy, onBuy }: { r: Resale; buyerId: DemoBuyerId; log: readonly UnitsEntry[]; busy: boolean; onBuy: () => void }) {
  const mine = r.sellerId === buyerId;
  const price = formatAmount(r.price, r.token);
  const units = r.kind === "physical" ? copyUnitsOf(r.copyKey, unitsAllowanceOf(r.use), r.sellerId, log) : null;
  const who = mine ? "Your listing" : `Sold by ${buyerNameOf(r.sellerId)}`;
  return (
    <li className="flex items-center gap-6 px-8 py-6">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn(T.rowTitle, "break-words tabular-nums")}>{`${copyNumberOf(r)} · ${r.use}`}</span>
        <span className={cn(T.meta, "tabular-nums text-text-primary")}>{price}</span>
        <span className={cn(T.caption, "tabular-nums")}>
          {who}
          {units ? ` · ${units.left === 0 ? "no units left" : unitsLineOf(units)}` : ""}
        </span>
      </div>
      {mine ? (
        <Link href={resaleItemPath(r.projectId, tileKeyOfCopy(r.copyKey))} className={cn(buttonVariants({ hierarchy: "secondary", size: "md" }), HIT44, "shrink-0")}>
          Manage
        </Link>
      ) : (
        <Button
          hierarchy="secondary"
          size="md"
          className={cn(HIT44, "shrink-0")}
          data-copy-buy=""
          aria-label={`Buy ${copyNumberOf(r)} · ${r.use} from ${buyerNameOf(r.sellerId)}, ${price}`}
          aria-disabled={busy || undefined}
          loading={busy}
          onClick={() => {
            if (!busy) onBuy();
          }}
        >
          Buy
        </Button>
      )}
    </li>
  );
}
