"use client";

// Placing a bid (Phase 2 spec §3.9; P2-MARKETPLACE-15 as changed). Like the
// purchase, the confirm is the one Demo wallet dialog: a demo buyer's
// signature, "Place bid — no fee". This file writes its lines and runs the
// one write a bid makes, `appendBid` (T11).
//
// - What a bid may spend is `freeMicrosFor`: the buyer's balance of the
//   listing's token after every hold (`availableOf`, T02), plus their own
//   hold on THIS auction — a new top bid replaces it — minus the network fee
//   a win would add when it's paid in the same coin.
// - `recheck`, just before signing, reads the market and the wallet fresh:
//   the auction still running, nobody outbid it meanwhile, and the funds.

import * as React from "react";
import { estimateGas } from "@/lib/brief/gas";
import type { ManualProject } from "@/lib/manual/projects";
import { auctionStateOf, makeBid } from "@/lib/market/auction";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import type { Listing } from "@/lib/market/types";
import { availableOf, type BalanceCtx } from "@/lib/wallet/balances";
import { readWallet } from "@/lib/wallet/demo-wallet";
import { buyerLabel } from "@/lib/wallet/identities";
import { formatAmount, fromMicros, toMicros } from "@/lib/wallet/money";
import type { Amount, DemoBuyerId, WalletRequest } from "@/lib/wallet/types";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { buyerNameOf, stillOpenReason } from "./purchase-dialog";

const ZERO = BigInt(0);

/** What `buyerId` may bid on `listing` right now, in micros of its token (P2-MARKETPLACE-11's "free"). */
export function freeMicrosFor(buyerId: DemoBuyerId, listing: Listing, ctx: BalanceCtx): bigint {
  let free = toMicros(availableOf(buyerId, listing.token, listing.network, ctx)) ?? ZERO;
  const top = auctionStateOf(listing, ctx.market.bids, ctx.now).top;
  if (top && top.bidderId === buyerId) free += toMicros(top.amount) ?? ZERO;
  const gas = estimateGas(listing.network);
  if (gas.native === listing.token) free -= toMicros(String(gas.fee)) ?? ZERO;
  return free > ZERO ? free : ZERO;
}

export function usePlaceBid({
  project,
  buyerId,
}: {
  project: ManualProject;
  buyerId: DemoBuyerId;
}): { busy: boolean; place: (listing: Listing, amount: Amount, freeMicros: bigint) => Promise<string | null> } {
  const { request } = useWalletRequest();
  const { appendBid } = useMarket();
  const [busy, setBusy] = React.useState(false);

  /** Resolves with the "Bid placed" sentence once the bid is written, else null. */
  const place = React.useCallback(
    async (listing: Listing, amount: Amount, freeMicros: bigint): Promise<string | null> => {
      const gas = estimateGas(listing.network);
      const bid = formatAmount(amount, listing.token);
      const after = fromMicros(freeMicros - (toMicros(amount) ?? ZERO));
      const doneLine = `Bid placed: ${bid}. You're the highest bidder.`;
      const req: WalletRequest = {
        kind: "signature",
        purpose: "bid",
        identity: buyerId,
        network: listing.network,
        title: "Confirm bid",
        summary: [
          { label: "Bid", value: `${bid} on ${project.name} · ${listing.percentSelling}% of the project` },
          { label: "Bidding as", value: buyerLabel(buyerId) },
        ],
        note: `No network fee to bid. If you win, ${formatAmount(String(gas.fee), gas.native)} is added when the creator closes the auction. Held in your demo wallet until you're outbid or the auction ends · free after this bid: ${formatAmount(after, listing.token)}.`,
        doneLine,
      };

      setBusy(true);
      try {
        const result = await request(req, {
          recheck: () => {
            const market = readMarketNow();
            const now = Date.now();
            const why = stillOpenReason(listing, market, now, true);
            if (why) return why;
            const cur = market.listings.find((l) => l.id === listing.id) ?? listing;
            const top = auctionStateOf(cur, market.bids, now).top;
            const micros = toMicros(amount) ?? ZERO;
            if (top && (toMicros(top.amount) ?? ZERO) >= micros) {
              return top.bidderId === buyerId
                ? `You already lead with ${formatAmount(top.amount, cur.token)} — bid more than that.`
                : `${buyerNameOf(top.bidderId)} bid ${formatAmount(top.amount, cur.token)} while you confirmed — bid more than that.`;
            }
            const free = freeMicrosFor(buyerId, cur, { wallet: readWallet(), market, now });
            if (micros > free) {
              return `Your demo wallet no longer covers this bid — it has ${formatAmount(fromMicros(free), cur.token)} free.`;
            }
            return null;
          },
          commit: (proof) => {
            const written = appendBid(
              makeBid({ listingId: listing.id, bidderId: buyerId, amount, token: listing.token, now: proof.at }),
            );
            if (written.ok) return { ok: true };
            return {
              ok: false,
              message:
                written.reason === "storage"
                  ? "Your browser didn't save this bid — storage is full."
                  : "This browser's marketplace records couldn't be read, so the bid wasn't saved.",
            };
          },
        });
        return result.ok ? doneLine : null;
      } finally {
        setBusy(false);
      }
    },
    [request, appendBid, project.name, buyerId],
  );

  return { busy, place };
}
