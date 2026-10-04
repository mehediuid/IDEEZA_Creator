// The Auction bid card's pure logic (Phase 2 spec §3.5.5, P2-MARKETPLACE-11,
// -12, -17): the running state, bid validation copy and settlement. Money is
// bigint micros throughout (§3.1) — no float ever compares two bids.
//
// Pure, relative imports only, so node:test loads the compiled module.

import type { Amount, DemoBuyerId } from "../wallet/types";
import type { Token } from "../brief/types";
import { compareAmounts, formatAmount, fromMicros, toMicros } from "../wallet/money";
import type { AuctionPhase, AuctionState, Bid, Listing } from "./types";
import { randomId } from "./sales";

const HOUR_MS = 3_600_000;
const ONE_MICRO = BigInt(1);
const ZERO = BigInt(0);

/** Highest first; a tie goes to the earlier bid (P2-MARKETPLACE-17). */
export function bidsOf(listingId: string, bids: Bid[]): Bid[] {
  return bids
    .filter((b) => b.listingId === listingId)
    .slice()
    .sort((a, b) => {
      const c = compareAmounts(b.amount, a.amount);
      return c !== 0 ? c : a.at - b.at;
    });
}

/** "2h 14m left" · "42m left" · "Under a minute left". */
export function timeLeftLabel(ms: number): string {
  if (ms < 60_000) return "Under a minute left";
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

/** The auction's running state at `now`. `endingSoon` means under an hour
 *  left. `minNext` is the smallest amount `validateBid` would accept next:
 *  the starting bid when there are none yet, else one micro above the top
 *  bid (a bid must be strictly *more* than the current one). */
export function auctionStateOf(listing: Listing, bids: Bid[], now: number): AuctionState {
  const top = bidsOf(listing.id, bids)[0] ?? null;
  const endsAt = listing.endsAt ?? now;
  const msLeft = Math.max(0, endsAt - now);
  const phase: AuctionPhase = now >= endsAt ? "ended" : msLeft <= HOUR_MS ? "endingSoon" : "running";
  const minNext = top ? fromMicros((toMicros(top.amount) ?? ZERO) + ONE_MICRO) : (listing.minBid ?? "0");
  return { phase, top, minNext, msLeft };
}

export type BidCheck = { ok: true; micros: bigint } | { ok: false; message: string };

/** The copy of P2-MARKETPLACE-11's validation table, checked on submit and
 *  on blur. `freeMicros` is the bidder's free balance after holds and the
 *  network fee a win would add (`availableOf`, owned by MINT/T02) — this
 *  function only compares against it, it never computes it. */
export function validateBid(input: string, state: AuctionState, listing: Listing, freeMicros: bigint): BidCheck {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, message: "Enter a bid." };
  const micros = toMicros(trimmed);
  if (micros === null || micros <= ZERO) {
    return { ok: false, message: "Enter an amount like 0.05, up to 6 decimal places." };
  }
  const token = listing.token;
  if (!state.top) {
    const minMicros = toMicros(listing.minBid ?? "0") ?? ZERO;
    if (micros < minMicros) {
      return { ok: false, message: `Bid at least ${formatAmount(listing.minBid ?? "0", token)} — the starting bid.` };
    }
  } else {
    const topMicros = toMicros(state.top.amount) ?? ZERO;
    if (micros <= topMicros) {
      return { ok: false, message: `Bid more than the current bid, ${formatAmount(state.top.amount, token)}.` };
    }
  }
  if (listing.auctionBuyNow) {
    const buyNowMicros = toMicros(listing.auctionBuyNow);
    if (buyNowMicros !== null && micros >= buyNowMicros) {
      return {
        ok: false,
        message: `That's the buy-now price or more — use Buy now with ${formatAmount(listing.auctionBuyNow, token)} instead.`,
      };
    }
  }
  if (micros > freeMicros) {
    return {
      ok: false,
      message: `Your demo wallet has ${formatAmount(fromMicros(freeMicros), token)} free. Bid less, or top up the demo wallet.`,
    };
  }
  return { ok: true, micros };
}

/** Appends a validated bid (§3.1 id shape: `bid_` + 8 base-36). The caller
 *  runs `validateBid` first — this never re-checks it, so a caller that
 *  skips validation gets exactly the bid it asked for. */
export function makeBid(input: {
  listingId: string;
  bidderId: DemoBuyerId;
  amount: Amount;
  token: Token;
  now: number;
}): Bid {
  return {
    id: randomId("bid_"),
    listingId: input.listingId,
    bidderId: input.bidderId,
    amount: input.amount,
    token: input.token,
    at: input.now,
  };
}

/** `noBids` with `unpaid`: there were bids, but `availableOf` refused every one. */
export type SettleResult = { kind: "running" } | { kind: "sale"; bid: Bid } | { kind: "noBids"; unpaid?: true };

/** Called by LISTING's Close (P2-MARKETPLACE-17), once the auction has
 *  ended: the highest bid whose wallet still covers it, earliest on a tie.
 *  `availableOf` is optional — omitted, every bid is treated as payable —
 *  so this runs standalone in this task's tests; MINT/T02's real balance
 *  check is wired in by the caller once it lands. A bid `availableOf`
 *  refuses is skipped, never disqualifying the auction outright. */
export function settleAuction(
  listing: Listing,
  bids: Bid[],
  now: number,
  availableOf: (bid: Bid) => boolean = () => true,
): SettleResult {
  const endsAt = listing.endsAt ?? now;
  if (now < endsAt) return { kind: "running" };
  const ordered = bidsOf(listing.id, bids);
  for (const bid of ordered) {
    if (availableOf(bid)) return { kind: "sale", bid };
  }
  return ordered.length ? { kind: "noBids", unpaid: true } : { kind: "noBids" };
}
