"use client";

// "From holders" in a Physical or Virtual tab of the Marketplace box (owner, 2026-11-19: a bought copy can be sold
// on): the copies of this kind other creators bought and put up for sale, cheapest first, under the creator's own
// Buy now — the only way to get one once the creator's copies are sold out. Each row says what a buyer gets (its
// number, its use, a Physical copy's units left) and who sells it; Buy is the buyer's wallet transaction, and the
// copy moves to them with its licence and units left (lib/market/resales.ts). The active demo creator's own listing
// reads "Your listing" and leads to its Earn.

import * as React from "react";
import Link from "next/link";
import { Badge, Button, buttonVariants } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { readSampleSales, useSampleSales } from "@/components/mobile/project-earn/buyer/sample-sales-store";
import { payOut, readResales, useResales, writeResales } from "@/components/projects/purchased/resales-store";
import { readUnitsLog, useUnitsLog } from "@/components/projects/purchased/units-store";
import { purchasedEarnHref } from "@/components/projects/purchased/earn/href";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import { holderNowOf } from "@/lib/market/purchases";
import { buyerNameOf, buyResale, copyNumberOf, onSaleOf, resaleBuyBlock, resaleBuyRequestOf, type Resale } from "@/lib/market/resales";
import { copyUnitsOf, unitsAllowanceOf, unitsLineOf, type UnitsEntry } from "@/lib/market/units";
import type { EditionKind } from "@/lib/market/types";
import { formatAmount } from "@/lib/wallet/money";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";

const STORAGE_FULL = "Your browser didn't save this purchase — storage is full.";

/** A Physical copy's units left with its seller now; null for a Virtual copy. */
function unitsLeftOf(r: Resale, log: readonly UnitsEntry[]): number | null {
  return r.kind === "physical" ? copyUnitsOf(r.copyKey, unitsAllowanceOf(r.use), r.sellerId, log).left : null;
}

export function HolderOffers({
  projectId,
  kind,
  product,
  announce,
}: {
  projectId: string;
  kind: EditionKind;
  /** A product page's tab: that product's own copies; null for the whole project's. */
  product: string | null;
  announce: (message: string) => void;
}) {
  const resales = useResales();
  const sampleSales = useSampleSales();
  const market = useMarket();
  const log = useUnitsLog();
  const { buyer } = useActiveBuyer();
  const { request } = useWalletRequest();
  const [busy, setBusy] = React.useState<string | null>(null);
  const headingId = React.useId();
  const rows = onSaleOf(projectId, kind, resales, (r) => holderNowOf(r.copyKey, sampleSales, market.data.sales, resales)).filter((r) => r.product === product);
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
        announce(`Purchase successful. ${req.doneLine}`);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 border-x-0 border-b-0 border-t border-solid border-border pt-6">
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="m-0 flex items-center gap-3 text-md font-semibold leading-md text-text-primary">
          From holders
          <Badge tone="neutral" className="h-[22px] px-[8px] py-0 text-sm font-semibold leading-sm">
            {rows.length}
          </Badge>
        </h3>
        <p className="m-0 text-sm leading-sm text-text-secondary">Copies others bought and sell on. You get the copy, its licence{kind === "physical" ? " and its units left" : ""}; the creator still gets a royalty.</p>
      </div>
      <ul role="list" className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map((r) => (
          <HolderRow key={r.id} r={r} buyerId={buyer.id} unitsLeft={unitsLeftOf(r, log)} busy={busy === r.id} onBuy={() => buy(r)} log={log} />
        ))}
      </ul>
    </section>
  );
}

function HolderRow({
  r,
  buyerId,
  unitsLeft,
  busy,
  onBuy,
  log,
}: {
  r: Resale;
  buyerId: DemoBuyerId;
  unitsLeft: number | null;
  busy: boolean;
  onBuy: () => void;
  log: readonly UnitsEntry[];
}) {
  const mine = r.sellerId === buyerId;
  const price = formatAmount(r.price, r.token);
  const units = r.kind === "physical" ? copyUnitsOf(r.copyKey, unitsAllowanceOf(r.use), r.sellerId, log) : null;
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-solid border-border px-6 py-5">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-md font-semibold tabular-nums text-text-primary">{copyNumberOf(r)}</span>
          <span className="text-sm text-text-secondary">{r.use}</span>
        </span>
        <span className="text-sm leading-sm text-text-tertiary">
          {mine ? "Your listing" : `Sold by ${buyerNameOf(r.sellerId)}`}
          {units ? ` · ${unitsLeft === 0 ? "no units left" : unitsLineOf(units)}` : ""}
        </span>
      </span>
      <span className="flex items-center gap-4">
        <span className="text-md font-semibold tabular-nums text-text-primary">{price}</span>
        {mine ? (
          <Link
            href={purchasedEarnHref(r.projectId, "sell", r.copyKey)}
            className={cn(buttonVariants({ hierarchy: "secondary", size: "md" }), "hover:text-[color:var(--color-button-secondary-text)] max-md:min-h-[var(--touch-min)]")}
          >
            Manage
          </Link>
        ) : (
          <Button
            type="button"
            hierarchy="secondary"
            size="md"
            aria-label={`Buy ${copyNumberOf(r)} · ${r.use} from ${buyerNameOf(r.sellerId)}, ${price}`}
            // Not `disabled`: that drops its focus before the wallet dialog reads its opener.
            aria-disabled={busy || undefined}
            onClick={(e) => {
              if (busy) return;
              e.currentTarget.focus();
              onBuy();
            }}
            className="max-md:min-h-[var(--touch-min)]"
          >
            Buy
          </Button>
        )}
      </span>
    </li>
  );
}
