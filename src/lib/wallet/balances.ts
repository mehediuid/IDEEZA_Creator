// Balances, derived — never stored (Phase 2 spec §3.5.3, C4). What an
// identity has is the seed, minus its wallet activity's charges, minus what
// it spent buying, plus what it was paid as a seller, minus what a live
// auction's top bid holds of its own. Repeated debits never drift: every sum
// runs in bigint (`money.ts`).
//
// Pure, relative imports only.

import type { Bid, Listing, MarketData } from "../market/types";
import type { Network, Token } from "../brief/types";
import { addAmounts, compareAmounts, subAmounts } from "./money";
import { demoAddress } from "./demo-wallet";
import { SEED_BALANCES } from "./identities";
import type { Amount, Charge, Coin, DemoWallet, IdentityId } from "./types";

export type Balances = { idz: Amount; native: Partial<Record<Network, Partial<Record<Token, Amount>>>> };

export type BalanceCtx = { wallet: DemoWallet | undefined; market: MarketData; now: number };

function cloneBalances(b: Balances): Balances {
  const native: Balances["native"] = {};
  for (const net of Object.keys(b.native) as Network[]) native[net] = { ...b.native[net] };
  return { idz: b.idz, native };
}

/** The starting balance for a fresh identity of this kind (P2-MINT-1). */
export function seedBalancesOf(id: IdentityId): Balances {
  return cloneBalances(id.startsWith("maker-") ? SEED_BALANCES.maker : SEED_BALANCES.buyer);
}

function credit(bal: Balances, coin: Coin, network: Network, amount: Amount): void {
  if (coin === "IDZ") {
    bal.idz = addAmounts(bal.idz, amount);
    return;
  }
  const bucket = bal.native[network] ?? (bal.native[network] = {});
  bucket[coin] = addAmounts(bucket[coin] ?? "0", amount);
}

function debit(bal: Balances, coin: Coin, network: Network, amount: Amount): void {
  if (coin === "IDZ") {
    bal.idz = subAmounts(bal.idz, amount);
    return;
  }
  const bucket = bal.native[network] ?? (bal.native[network] = {});
  bucket[coin] = subAmounts(bucket[coin] ?? "0", amount);
}

/** Applies every line of `delta` onto `bal`, crediting (sign 1) or debiting (sign -1). */
function apply(bal: Balances, delta: Balances, sign: 1 | -1): void {
  if (sign === 1) credit(bal, "IDZ", "baseSepolia", delta.idz);
  else debit(bal, "IDZ", "baseSepolia", delta.idz);
  for (const net of Object.keys(delta.native) as Network[]) {
    const bucket = delta.native[net] ?? {};
    for (const coin of Object.keys(bucket) as Token[]) {
      const amount = bucket[coin] ?? "0";
      if (sign === 1) credit(bal, coin, net, amount);
      else debit(bal, coin, net, amount);
    }
  }
}

function isLiveAuction(l: Listing, now: number): boolean {
  return l.type === "auction" && l.status === "live" && (l.endsAt === undefined || now < l.endsAt);
}

/** The earlier bid wins a tie — the same rule `settleAuction` (T04) uses. */
function topBidOf(bids: readonly Bid[]): Bid | null {
  let top: Bid | null = null;
  for (const b of bids) {
    if (!top) {
      top = b;
      continue;
    }
    const cmp = compareAmounts(b.amount, top.amount);
    if (cmp > 0 || (cmp === 0 && b.at < top.at)) top = b;
  }
  return top;
}

/**
 * What `id` has tied up in live auctions: its current top bid on each one, as
 * a real escrow would hold it. An outbid bidder holds nothing.
 */
export function heldBy(id: IdentityId, ctx: { market: MarketData; now: number }): Balances {
  const held: Balances = { idz: "0", native: {} };
  if (id.startsWith("maker-")) return held; // only buyers bid
  for (const listing of ctx.market.listings) {
    if (!isLiveAuction(listing, ctx.now)) continue;
    const bids = ctx.market.bids.filter((b) => b.listingId === listing.id);
    const top = topBidOf(bids);
    if (top && top.bidderId === id) credit(held, listing.token, listing.network, top.amount);
  }
  return held;
}

/**
 * `id`'s balance right now: the seed, minus its own activity charges, minus
 * what it paid buying, plus what it was paid selling, minus what a live
 * auction's top bid holds. Never stored — every read walks the wallet and the
 * market fresh (C4).
 */
export function balancesOf(id: IdentityId, ctx: BalanceCtx): Balances {
  const bal = seedBalancesOf(id);
  for (const entry of ctx.wallet?.activity ?? []) {
    if (entry.identity !== id || !entry.charge) continue;
    for (const line of entry.charge.lines) debit(bal, line.coin, entry.charge.network, line.amount);
  }
  const address = demoAddress(id);
  for (const sale of ctx.market.sales) {
    if (sale.buyerId === id) {
      debit(bal, sale.token, sale.network, sale.price);
      debit(bal, sale.fees.network.coin, sale.network, sale.fees.network.amount);
    }
    if (sale.sellerAddress === address) {
      credit(bal, sale.token, sale.network, sale.payout);
    }
  }
  apply(bal, heldBy(id, ctx), -1);
  return bal;
}

/** One coin's balance on one network, after every hold (the "available" figure a control checks). */
export function availableOf(id: IdentityId, coin: Coin, network: Network, ctx: BalanceCtx): Amount {
  const bal = balancesOf(id, ctx);
  return coin === "IDZ" ? bal.idz : (bal.native[network]?.[coin as Token] ?? "0");
}

export type AffordResult = { ok: true } | { ok: false; short: Coin; have: Amount; need: Amount };

/** Can `id` cover every line of `charge` right now? The first short line wins. */
export function affordOf(id: IdentityId, charge: Charge, ctx: BalanceCtx): AffordResult {
  const bal = balancesOf(id, ctx);
  for (const line of charge.lines) {
    const have = line.coin === "IDZ" ? bal.idz : (bal.native[charge.network]?.[line.coin as Token] ?? "0");
    if (compareAmounts(have, line.amount) < 0) return { ok: false, short: line.coin, have, need: line.amount };
  }
  return { ok: true };
}
