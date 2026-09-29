"use client";

// "Close the auction?" (P2-LISTING-12; §3.9 "Close auction": an owner
// confirm, no wallet step). The winner is `settleWithWallets`' (T11,
// errata 11): the highest bid, earliest on a tie, whose demo wallet still
// covers it and the network fee; a higher bid it can't pay is skipped, and
// the body says so.
// - A winner: "Close and sell" appends the ONE Sale (`via: "auctionWin"`),
//   which is what turns the card Sold, moves ownership and fills Customers
//   (C11). The listing's own status is left as it is — sold is derived.
// - No payable bid: "Close auction" writes `closeListing` (status "closed").
// Everything is read again at the press: another tab may have bid, bought or
// closed it meanwhile. If the winner it would settle isn't the one the body
// named, nothing is written: the body shows the new winner and asks again.
// If the sale itself is refused (the maker no longer holds the share it
// sells), the dialog says why and offers "Close without a sale" (R5-19).

import * as React from "react";
import { Banner, Button, ModalFrame } from "@/components/ideeza";
import { payoutAddressOf } from "@/components/marketplace/purchase-dialog";
import type { StoredDraft } from "@/lib/brief/project-brief";
import { ownershipOf } from "@/lib/manual/ownership";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { closeListing } from "@/lib/market/listing";
import { closeCopyOf, closedAnnouncement, saleShareOf } from "@/lib/market/listing-flow";
import { readMarketNow, settleWithWallets, useMarket } from "@/lib/market/market-store";
import { makeSale } from "@/lib/market/purchase";
import { mainSalesOf } from "@/lib/market/sales";
import type { SettleResult } from "@/lib/market/auction";
import type { Listing, MarketData } from "@/lib/market/types";
import { demoAddress, readWallet } from "@/lib/wallet/demo-wallet";
import { buyerLabel } from "@/lib/wallet/identities";
import { mintViewOf } from "@/lib/wallet/mint";
import { formatAmount } from "@/lib/wallet/money";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { refusedCopy } from "./listing-dialog";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

const winnerKey = (r: SettleResult) => (r.kind === "sale" ? `sale:${r.bid.id}` : r.kind);

/** The body named one outcome and the market now settles another. */
function changedCopy(r: SettleResult, l: Listing): string {
  return r.kind === "sale"
    ? `The bids changed while this was open: ${buyerLabel(r.bid.bidderId)} now wins with ${formatAmount(r.bid.amount, l.token)}. Check it, then close again.`
    : "The bids changed while this was open: no bid can be paid now. Check it, then close again.";
}

export function CloseAuctionDialog({
  project,
  brief,
  listing,
  now,
  onClose,
  onDone,
}: {
  project: ManualProject;
  brief: StoredDraft | null;
  listing: Listing;
  /** The page's minute clock: the auction has ended by it. */
  now: number;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { projects } = useManualProjects();
  const { data: market, appendSale, writeListings } = useMarket();
  const wallet = useDemoWallet();
  const [error, setError] = React.useState<string | null>(null);
  // The sale was refused: why, and the way out ("Close without a sale").
  const [refused, setRefused] = React.useState<string | null>(null);
  // What the press found when it differed from what the body said: shown until the next press.
  const [seen, setSeen] = React.useState<SettleResult | null>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const live = React.useMemo(
    () => settleWithWallets(listing, { wallet, market, now: Math.max(now, listing.endsAt ?? now) }),
    [listing, wallet, market, now],
  );
  const shown = seen ?? live;
  const copy = closeCopyOf(shown, listing, market.bids);

  /** The listing as the store holds it now, or why it can't be closed. */
  const fresh = (m: MarketData): Listing | string => {
    const cur = m.listings.find((l) => l.id === listing.id);
    if (m.sales.some((s) => s.listingId === listing.id && s.item.nft === "main")) return "This auction has already been settled.";
    if (!cur || cur.status !== "live") return "This auction has already been closed.";
    return cur;
  };

  const closeWithoutSale = (m: MarketData, cur: Listing, at: number, announce: string) => {
    const closed = closeListing(m.listings, cur.id, at);
    if (!closed.ok) return setError(closed.reason);
    const w = writeListings(closed.listings);
    if (!w.ok) return setError(refusedCopy(w.reason));
    onDone(announce);
  };

  const confirm = () => {
    setError(null);
    const at = Date.now();
    const m = readMarketNow();
    const cur = fresh(m);
    if (typeof cur === "string") return setError(cur);
    const settled = settleWithWallets(cur, { wallet: readWallet(), market: m, now: at });
    if (settled.kind === "running") {
      setError("The auction hasn't ended yet.");
      return;
    }
    // Settle only the outcome the body named.
    if (winnerKey(settled) !== winnerKey(shown)) {
      setSeen(settled);
      setError(changedCopy(settled, cur));
      return;
    }
    if (settled.kind === "noBids") return closeWithoutSale(m, cur, at, closedAnnouncement(settled, cur));
    const p = projects.find((x) => x.id === project.id) ?? project;
    const split = ownershipOf({
      createdAt: p.createdAt,
      contributors: p.contributors ?? [],
      sales: mainSalesOf(p.id, m.sales),
      listedPercent: 0,
    });
    const sale = makeSale(
      {
        listingId: cur.id,
        projectId: p.id,
        buyerId: settled.bid.bidderId,
        buyerAddress: demoAddress(settled.bid.bidderId),
        sellerAddress: payoutAddressOf(p.mint),
        item: saleShareOf(cur),
        via: "auctionWin",
        token: cur.token,
        price: settled.bid.amount,
        royaltiesPct: cur.royaltiesPct,
        network: cur.network,
        collection: cur.collection,
        benefits: cur.benefits,
      },
      { sales: m.sales, mint: mintViewOf(p, brief, m.sales), ownership: { creatorPct: split.maker }, now: at },
    );
    if ("ok" in sale) {
      const winner = buyerLabel(settled.bid.bidderId);
      setRefused(
        sale.reason === "overShare"
          ? `You hold ${split.maker}% of ${p.name} now, less than the ${cur.percentSelling}% this auction sells, so ${winner}'s bid can't be settled. Close it without a sale, or free up the share in Contributors and close it again.`
          : `${winner}'s bid can't be settled: ${sale.message} Close it without a sale instead.`,
      );
      return;
    }
    const w = appendSale(sale);
    if (!w.ok) return setError(w.reason === "conflict" ? "This auction has already been settled." : refusedCopy(w.reason));
    onDone(closedAnnouncement(settled, cur));
  };

  /** The way out of a refused sale: the auction ends, no sale, and every hold is released. */
  const closeAnyway = () => {
    setError(null);
    const m = readMarketNow();
    const cur = fresh(m);
    if (typeof cur === "string") return setError(cur);
    closeWithoutSale(m, cur, Date.now(), "Auction closed without a sale");
  };

  return (
    <ModalFrame
      open
      onClose={onClose}
      size="sm"
      title={copy.title}
      initialFocus={cancelRef}
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button ref={cancelRef} type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
            Cancel
          </Button>
          {refused ? (
            <Button type="button" hierarchy="primary" size="lg" className={TAP} onClick={closeAnyway}>
              Close without a sale
            </Button>
          ) : (
            <Button type="button" hierarchy="primary" size="lg" className={TAP} onClick={confirm}>
              {copy.confirm}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-text-secondary">
        <p>{copy.body}</p>
        {copy.skipped && <p>{copy.skipped}</p>}
        {refused && (
          <div role="alert">
            <Banner tone="error">{refused}</Banner>
          </div>
        )}
        {error && (
          <div role="alert">
            <Banner tone="error">{error}</Banner>
          </div>
        )}
      </div>
    </ModalFrame>
  );
}
