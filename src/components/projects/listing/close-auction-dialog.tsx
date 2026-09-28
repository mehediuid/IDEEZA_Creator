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
// closed it meanwhile.

import * as React from "react";
import { Banner, Button, ModalFrame } from "@/components/ideeza";
import type { StoredDraft } from "@/lib/brief/project-brief";
import { ownershipOf } from "@/lib/manual/ownership";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { closeListing } from "@/lib/market/listing";
import { closeCopyOf, closedAnnouncement, saleShareOf } from "@/lib/market/listing-flow";
import { readMarketNow, settleWithWallets, useMarket } from "@/lib/market/market-store";
import { makeSale } from "@/lib/market/purchase";
import { mainSalesOf } from "@/lib/market/sales";
import type { Listing } from "@/lib/market/types";
import { demoAddress, makerId, readWallet } from "@/lib/wallet/demo-wallet";
import { mintViewOf } from "@/lib/wallet/mint";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { refusedCopy } from "./listing-dialog";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

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
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const result = React.useMemo(
    () => settleWithWallets(listing, { wallet, market, now: Math.max(now, listing.endsAt ?? now) }),
    [listing, wallet, market, now],
  );
  const copy = closeCopyOf(result, listing, market.bids);

  const confirm = () => {
    setError(null);
    const at = Date.now();
    const m = readMarketNow();
    const cur = m.listings.find((l) => l.id === listing.id);
    if (m.sales.some((s) => s.listingId === listing.id && s.item.nft === "main")) {
      setError("This auction has already been settled.");
      return;
    }
    if (!cur || cur.status !== "live") {
      setError("This auction has already been closed.");
      return;
    }
    const settled = settleWithWallets(cur, { wallet: readWallet(), market: m, now: at });
    if (settled.kind === "running") {
      setError("The auction hasn't ended yet.");
      return;
    }
    if (settled.kind === "noBids") {
      const closed = closeListing(m.listings, cur.id, at);
      if (!closed.ok) return setError(closed.reason);
      const w = writeListings(closed.listings);
      if (!w.ok) return setError(refusedCopy(w.reason));
      onDone(closedAnnouncement(settled, cur));
      return;
    }
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
        sellerAddress: p.mint?.wallet.address ?? demoAddress(makerId(readWallet().account)),
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
    if ("ok" in sale) return setError(sale.message);
    const w = appendSale(sale);
    if (!w.ok) return setError(w.reason === "conflict" ? "This auction has already been settled." : refusedCopy(w.reason));
    onDone(closedAnnouncement(settled, cur));
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
          <Button type="button" hierarchy="primary" size="lg" className={TAP} onClick={confirm}>
            {copy.confirm}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-text-secondary">
        <p>{copy.body}</p>
        {copy.skipped && <p>{copy.skipped}</p>}
        {error && <Banner tone="error">{error}</Banner>}
      </div>
    </ModalFrame>
  );
}
