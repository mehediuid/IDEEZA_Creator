"use client";

// From holders on the phone's shop screens (CL-036, the web's marketplace/holder-offers.tsx): the copies
// of one kind other creators bought and sell on, cheapest first — the only way to get one once the
// creator's copies are sold out. Since the buy box (owner 2026-11-22, buy-pick.tsx) they are choices in
// their kind's tab, not rows with a Buy each: `useHolderListings` lists them, `HolderChoice` draws one (its
// number and use, its price, who sells it, a Physical copy's units left), `holderFactsOf` says it on the
// bar, and `useHolderBuy` buys it — the buyer's wallet transaction (the web's resale request and commit,
// through whichever wallet sheet the screen gives); the copy moves to them with its licence and units
// left, and the seller is paid (`payOut`). The active demo creator's own listing reads "Your listing",
// with Manage to its Earn.

import * as React from "react";
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
import { T } from "../../type";
import { Choice } from "./buy-pick";
import type { DoneFacts } from "./parts";
import { readSampleSales, useSampleSales } from "./sample-sales-store";

const STORAGE_FULL = "Your browser didn't save this purchase — storage is full.";

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

/** What a holder's listing says on a choice and on the bar: its number and use, its price, who sells it
 *  and a Physical copy's units left; `mine` for the active demo creator's own listing. */
export function holderFactsOf(r: Resale, buyerId: DemoBuyerId, log: readonly UnitsEntry[]) {
  const mine = r.sellerId === buyerId;
  const units = r.kind === "physical" ? copyUnitsOf(r.copyKey, unitsAllowanceOf(r.use), r.sellerId, log) : null;
  const unitsLine = units ? (units.left === 0 ? "no units left" : unitsLineOf(units)) : null;
  return {
    mine,
    number: copyNumberOf(r),
    use: r.use,
    price: formatAmount(r.price, r.token),
    seller: buyerNameOf(r.sellerId),
    line: [mine ? "Your listing" : `Sold by ${buyerNameOf(r.sellerId)}`, unitsLine].filter(Boolean).join(" · "),
    unitsLeft: units ? units.left : null,
    manageHref: resaleItemPath(r.projectId, tileKeyOfCopy(r.copyKey)),
  };
}

/** Buying another holder's copy: the web's resale request and commit, through the screen's wallet sheet
 *  (the scope's, or `request`), titled with what is bought when `title` is given. */
export function useHolderBuy({ request: askWallet, onBought }: { request?: WalletRequestApi["request"]; onBought: (done: DoneFacts) => void }) {
  const { buyer } = useActiveBuyer();
  const scope = useWalletRequest();
  const request = askWallet ?? scope.request;
  const [busyId, setBusy] = React.useState<string | null>(null);
  const buy = async (r: Resale, title?: string) => {
    if (busyId) return;
    const holderFresh = () => holderNowOf(r.copyKey, readSampleSales(), readMarketNow().sales, readResales());
    const base = resaleBuyRequestOf(r, buyer.id, unitsLeftOf(r, readUnitsLog()));
    const req = title ? { ...base, title } : base;
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
  return { busyId, buy };
}

/** Another holder's copy as a choice: its number and use, its price, who sells it and its units left. */
export function HolderChoice({ resale, buyerId, name, checked, onSelect }: { resale: Resale; buyerId: DemoBuyerId; name: string; checked: boolean; onSelect: () => void }) {
  const log = useUnitsLog();
  const f = holderFactsOf(resale, buyerId, log);
  return (
    <Choice name={name} checked={checked} onSelect={onSelect} title={`${f.number} · ${f.use}`} price={f.price}>
      <span className={cn(T.caption, "tabular-nums")}>{f.line}</span>
    </Choice>
  );
}
