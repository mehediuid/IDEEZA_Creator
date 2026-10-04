"use client";

// The purchase: Buy now, and an auction's "Buy now with X" (Phase 2 spec §3.9;
// P2-MARKETPLACE-14, -16 as changed). There is no dialog of its own here: the
// confirm is the one Demo wallet dialog (`useWalletRequest`, T13), and this
// file writes its lines and runs the one write a purchase makes.
//
// - The request is the demo buyer's transaction: the price and the network
//   fee, same-coin lines summed by the dialog, so "Total to pay now" is
//   0.071 MATIC and the funds check covers both (errata 50). Its note is
//   `purchaseQuote(...)`'s fee line: IDEEZA's 2.5 % comes out of the price
//   and is never added to what the buyer pays (decision 11).
// - `recheck`, just before confirming, reads the market fresh: the listing
//   must still be live, unsold and at the same price. The wallet provider
//   re-checks the funds itself.
// - `commit` makes the `Sale` (`makeSale`, T04) and appends it (`appendSale`,
//   T11) — ONE write, carrying the transaction hash the wallet showed.
//   Ownership, the lazy mint's settlement, Customers, the owner's log and
//   both wallets' balances all derive from it. A second Main sale of the
//   listing comes back `conflict`, and the dialog says "This listing was just
//   sold." with nothing written (errata 37) and a single Close.
// - An auction's "Buy now with X" names the listing it `releases`: its own
//   top bidder's held bid counts back in to the funds check (R1-3).
// - A Main sale that leaves the maker 0 % locks the project (decision 12):
//   its Physical and Virtual NFT listings come off the marketplace with it.
// - A demo buyer is never the maker (C4); the seller's payout wallet is the
//   mint record's, else Demo account 1 (lib `payoutAddressOf`, one rule for a
//   purchase and an auction's close).
// - A Physical or Virtual NFT (T27, P2-TABS-26) is the same request with the
//   buyer's tier: Regular (this version only) or Extended (every future
//   version). Its quote is `purchaseQuote(track, "buyNow", tier, network)` on
//   the project's own chain (errata 9). `recheck` reads the track fresh — still
//   listed at the same price, not sold out, and not hidden by a paused or
//   removed Main listing, and the project not sold in full (the lock) — and
//   `commit` appends one Sale for the next unit. A unit another tab sold in
//   between is a conflict: buying again gets the next one.

import * as React from "react";
import { estimateGas } from "@/lib/brief/gas";
import type { ProjectView } from "@/lib/manual/project-read";
import type { ManualProject } from "@/lib/manual/projects";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import { makeSale, purchaseQuote } from "@/lib/market/purchase";
import { holdingOf } from "@/lib/market/sales";
import type { EditionTrack, Listing, MarketData } from "@/lib/market/types";
import { readEditions } from "@/lib/market/editions-store";
import {
  editionChainOf,
  editionsHiddenWith,
  KIND_WORD,
  nextSerialOf,
  soldOf,
  unlistProjectTracks,
  USE_WORD,
} from "@/lib/market/editions";
import { listingViewOf } from "@/lib/market/listing";
import { projectLockOf } from "@/lib/manual/edit-gate";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { demoAddress, shortAddress } from "@/lib/wallet/demo-wallet";
import { DEMO_BUYERS } from "@/lib/wallet/identities";
import { payoutAddressOf } from "@/lib/wallet/mint";
import type { DemoBuyerId, WalletRequest } from "@/lib/wallet/types";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { writeTracks } from "@/components/projects/editions/create-dialog";

export const JUST_SOLD = "This listing was just sold.";
const TAKEN_OFF = "The creator took this listing off the marketplace.";
const PAUSED = "Paused by the creator — it can't be bought right now.";
const AUCTION_OVER = "The auction ended before you confirmed.";
const STORAGE_FULL = "Your browser didn't save this purchase — storage is full.";
const UNREADABLE = "This browser's marketplace records couldn't be read, so the purchase wasn't saved.";
const SOLD_IN_FULL = "This project was just sold in full, so its NFTs are off the marketplace.";

export function buyerNameOf(id: DemoBuyerId): string {
  return DEMO_BUYERS.find((b) => b.id === id)?.name ?? "Demo buyer";
}

/** The listing as the market holds it now, or why it can't be bought. `auction` asks for a running auction. */
export function stillOpenReason(listing: Listing, data: MarketData, now: number, auction: boolean): string | null {
  const cur = data.listings.find((l) => l.id === listing.id);
  if (!cur) return TAKEN_OFF;
  if (data.sales.some((s) => s.listingId === listing.id && s.item.nft === "main")) return JUST_SOLD;
  if (cur.status === "paused") return PAUSED;
  if (cur.status !== "live") return TAKEN_OFF;
  if (auction && cur.type === "auction" && now >= (cur.endsAt ?? now)) return AUCTION_OVER;
  return null;
}

/** A Main sale that sold the project in full takes its edition listings off with it (R1-2).
 *  The lock already hides them and refuses their sale, so a refused write changes nothing a
 *  buyer sees. */
export function unlistTracksIfLocked(project: ManualProject, sales: MarketData["sales"]): void {
  if (!projectLockOf(project, sales)) return;
  writeTracks(project.id, (all) => {
    const { tracks, removed } = unlistProjectTracks(all, project.id);
    return removed ? tracks : null;
  });
}

export function usePurchase({
  project,
  view,
  buyerId,
}: {
  project: ManualProject;
  view: ProjectView;
  buyerId: DemoBuyerId;
}): { busy: boolean; buy: (listing: Listing, via: "buyNow" | "auctionBuyNow") => Promise<string | null> } {
  const { request } = useWalletRequest();
  const { appendSale } = useMarket();
  const [busy, setBusy] = React.useState(false);

  /** Resolves with the success sentence once the sale is written, else null. */
  const buy = React.useCallback(
    async (listing: Listing, via: "buyNow" | "auctionBuyNow"): Promise<string | null> => {
      const quote = purchaseQuote(listing, via);
      const gas = estimateGas(listing.network);
      const name = buyerNameOf(buyerId);
      const buyerAddress = demoAddress(buyerId);
      const sellerAddress = payoutAddressOf(view.mint.record);
      const share = listing.percentSelling;
      const lazy = view.mint.status === "lazyMinted";
      const token = view.mint.tokenId !== null ? `Token #${view.mint.tokenId}` : "The token";
      const owned = (holdingOf(project.id, buyerId, view.sales)?.sharePct ?? 0) + share;
      // The dialog's heading is "Purchase successful"; the page's live region says both.
      const doneLine = `You own ${owned}% of ${project.name}. ${token} ${
        lazy ? "was minted to" : "moved to"
      } ${name}'s demo wallet.`;

      const req: WalletRequest = {
        kind: "transaction",
        purpose: "purchase",
        identity: buyerId,
        network: listing.network,
        title: "Confirm purchase",
        summary: [
          { label: "Project", value: `${project.name} · ${share}% of the project` },
          {
            label: "Token",
            value: lazy ? "Mints the token on this sale (lazy mint)" : `${token} moves to your demo wallet`,
          },
          { label: "Paying from", value: `${name}'s demo wallet · ${shortAddress(buyerAddress)}` },
        ],
        note: quote.lines.find((l) => l.startsWith("Includes")) ?? "",
        doneLine,
        charge: {
          network: listing.network,
          lines: [
            { coin: listing.token, amount: quote.price },
            { coin: gas.native, amount: quote.networkFee },
          ],
        },
        ...(via === "auctionBuyNow" ? { releases: listing.id } : null),
      };

      setBusy(true);
      try {
        const result = await request(req, {
          recheck: () => {
            const data = readMarketNow();
            const why = stillOpenReason(listing, data, Date.now(), via === "auctionBuyNow");
            if (why) return why;
            const cur = data.listings.find((l) => l.id === listing.id);
            const price = via === "auctionBuyNow" ? cur?.auctionBuyNow : cur?.price;
            if (price !== quote.price) {
              return `The creator changed the price to ${price ?? "nothing"} ${listing.token} — close this and check it again.`;
            }
            return null;
          },
          commit: (proof) => {
            const data = readMarketNow();
            const sale = makeSale(
              {
                listingId: listing.id,
                projectId: project.id,
                buyerId,
                buyerAddress: proof.address,
                sellerAddress,
                item: { nft: "main", sharePct: share },
                via,
                token: listing.token,
                price: quote.price,
                royaltiesPct: listing.royaltiesPct,
                network: listing.network,
                collection: listing.collection,
                benefits: listing.benefits,
              },
              { sales: data.sales, mint: view.mint, ownership: { creatorPct: view.ownership.maker }, now: proof.at },
            );
            // A refusal here is the market's (sold, or the share went elsewhere): no retry clears it.
            if ("ok" in sale) {
              return { ok: false, conflict: true, message: sale.reason === "alreadySold" ? JUST_SOLD : sale.message };
            }
            const final = { ...sale, txHash: proof.txHash ?? sale.txHash };
            const written = appendSale(final);
            if (written.ok) {
              unlistTracksIfLocked(project, [...data.sales, final]);
              return { ok: true };
            }
            if (written.reason === "conflict") return { ok: false, conflict: true, message: JUST_SOLD };
            return { ok: false, message: written.reason === "storage" ? STORAGE_FULL : UNREADABLE };
          },
        });
        return result.ok ? `Purchase successful. ${doneLine}` : null;
      } finally {
        setBusy(false);
      }
    },
    [request, appendSale, project, view, buyerId],
  );

  return { busy, buy };
}

// ─────────────────────────── a Physical or Virtual NFT (T27) ───────────────────────────

const SOLD_OUT = "These NFTs just sold out.";
const TRACK_GONE = "The creator took these NFTs off the marketplace.";
const UNIT_TAKEN = "Another buyer took that NFT a moment ago. Close this and buy again to get the next one.";

export type EditionTier = "regular" | "extended";
export const TIER_WORD: Record<EditionTier, string> = { regular: "Regular", extended: "Extended" };
export const TIER_LINE: Record<EditionTier, string> = {
  regular: "Regular (this version only)",
  extended: "Extended (includes future versions)",
};

/** Why a track can't be bought right now, read from the stores as they are. */
function trackClosedReason(
  project: ManualProject,
  track: EditionTrack,
  tier: EditionTier,
  data: MarketData,
  now: number,
  price: string,
): string | null {
  const cur = readEditions(track.projectId).find((t) => t.id === track.id);
  if (!cur || !cur.listing) return TRACK_GONE;
  const locked = projectLockOf(project, data.sales) !== null;
  if (locked) return SOLD_IN_FULL;
  const main = listingViewOf(track.projectId, {
    listings: data.listings,
    sales: data.sales,
    bids: data.bids,
    now,
    current: { name: "", description: "", products: [], cover: null, at: 0 },
  });
  if (main.kind === "paused") return PAUSED;
  if (editionsHiddenWith(main, locked)) return TRACK_GONE;
  if (soldOf(cur.id, data.sales) >= cur.supply.total) return SOLD_OUT;
  const nowPrice = tier === "extended" ? cur.listing.extended : cur.listing.regular;
  if (nowPrice !== price || cur.listing.token !== track.listing?.token) {
    return `The creator changed the price to ${nowPrice} ${cur.listing.token} — close this and check it again.`;
  }
  return null;
}

export function useEditionPurchase({
  project,
  view,
  buyerId,
}: {
  project: ManualProject;
  view: ProjectView;
  buyerId: DemoBuyerId;
}): { busyId: string | null; buy: (track: EditionTrack, tier: EditionTier) => Promise<string | null> } {
  const { request } = useWalletRequest();
  const { appendSale } = useMarket();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const buy = React.useCallback(
    async (track: EditionTrack, tier: EditionTier): Promise<string | null> => {
      const terms = track.listing;
      const main = view.listing.kind === "none" ? null : view.listing.listing;
      const chain = editionChainOf(view.mint.record, main, null);
      // The offers render only with a known chain and a live listing (edition-offers.tsx).
      if (!terms || !chain) return null;
      const quote = purchaseQuote(track, "buyNow", tier, chain.network);
      const gas = estimateGas(chain.network);
      const name = buyerNameOf(buyerId);
      const buyerAddress = demoAddress(buyerId);
      const sellerAddress = payoutAddressOf(view.mint.record);
      const productName = displayProductName(view.products.find((p) => p.id === track.productId)?.name ?? "");
      const what = `${USE_WORD[track.use]} ${KIND_WORD[track.kind]} NFT`;
      const serialNow = nextSerialOf(track.id, view.sales);
      const doneLine = `${productName} · ${what} (${TIER_WORD[tier]}) was minted to ${name}'s demo wallet.`;

      const req: WalletRequest = {
        kind: "transaction",
        purpose: "purchase",
        identity: buyerId,
        network: chain.network,
        title: "Confirm purchase",
        summary: [
          { label: "Product", value: `${productName} · ${project.name}` },
          { label: "NFT", value: `${KIND_WORD[track.kind]} NFT · ${USE_WORD[track.use]} · #${serialNow} of ${track.supply.total}` },
          { label: "Tier", value: TIER_LINE[tier] },
          { label: "Token", value: "Minted on this sale (lazy mint)" },
          { label: "Paying from", value: `${name}'s demo wallet · ${shortAddress(buyerAddress)}` },
        ],
        note: quote.lines.find((l) => l.startsWith("Includes")) ?? "",
        doneLine,
        charge: {
          network: chain.network,
          lines: [
            { coin: terms.token, amount: quote.price },
            { coin: gas.native, amount: quote.networkFee },
          ],
        },
      };

      setBusyId(track.id);
      try {
        const result = await request(req, {
          recheck: () => trackClosedReason(project, track, tier, readMarketNow(), Date.now(), quote.price),
          commit: (proof) => {
            const data = readMarketNow();
            const why = trackClosedReason(project, track, tier, data, proof.at, quote.price);
            if (why) return { ok: false, conflict: true, message: why };
            const sale = makeSale(
              {
                listingId: track.id,
                projectId: project.id,
                buyerId,
                buyerAddress: proof.address,
                sellerAddress,
                item: {
                  nft: track.kind,
                  trackId: track.id,
                  productId: track.productId,
                  productName,
                  use: track.use,
                  tier,
                  serial: nextSerialOf(track.id, data.sales),
                },
                via: "buyNow",
                token: terms.token,
                price: quote.price,
                royaltiesPct: terms.royaltyPct,
                network: chain.network,
                collection: chain.collection,
              },
              {
                sales: data.sales,
                mint: view.mint,
                ownership: { creatorPct: view.ownership.maker },
                now: proof.at,
                locked: projectLockOf(project, data.sales) !== null,
              },
            );
            if ("ok" in sale) return { ok: false, conflict: true, message: sale.message };
            const written = appendSale({ ...sale, txHash: proof.txHash ?? sale.txHash });
            if (written.ok) return { ok: true };
            // Read just before this write, the unit was free: another tab sold it in between.
            if (written.reason === "conflict") return { ok: false, conflict: true, message: UNIT_TAKEN };
            return { ok: false, message: written.reason === "storage" ? STORAGE_FULL : UNREADABLE };
          },
        });
        return result.ok ? `Purchase successful. ${doneLine}` : null;
      } finally {
        setBusyId(null);
      }
    },
    [request, appendSale, project, view, buyerId],
  );

  return { busyId, buy };
}
