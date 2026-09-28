// The purchase confirm's quote, and the one write a purchase makes
// (Phase 2 spec §3.5.5, P2-MARKETPLACE-14, -16). `makeSale` never mints
// twice, never oversells a Main share, and produces a deterministic,
// honestly-labelled "Testnet demo" `txHash` — nothing here touches a chain.
//
// Pure, relative imports only, so node:test loads the compiled module.

import type { Amount, Coin, DemoBuyerId, MintView } from "../wallet/types";
import type { Network, Token } from "../brief/types";
import { estimateGas } from "../brief/gas";
import { addAmounts, toMicros } from "../wallet/money";
import { FEE_LABEL, IDEEZA_FEE_BPS, ideezaFeeOf, payoutOf } from "./fee";
import type { EditionTrack, Listing, Sale, SaleItem, UtilityBenefit } from "./types";
import { randomId } from "./sales";

// ───────────────────────── the quote ─────────────────────────

export type PurchaseQuote = {
  price: Amount;
  ideezaFee: Amount;
  networkFee: Amount;
  payout: Amount;
  lines: string[];
};

function isTrack(x: Listing | EditionTrack): x is EditionTrack {
  return "supply" in x;
}

/**
 * The purchase confirm's lines (P2-MARKETPLACE-14): what the buyer pays
 * (price + the reference network fee, §3.1), and — for the record, not
 * shown to the buyer — the seller's IDEEZA fee and payout.
 *
 * Contract note: `EditionTrack` (spec §3.3.2) carries no `network` of its
 * own — editions share the project's collection and chain (P2-TABS-24), so
 * a track quote needs one from its caller. The bound §3.5.5 signature is
 * `purchaseQuote(listing | track, via, tier?)`; the minimal compatible
 * extension here is one more *optional* trailing parameter, `network`,
 * required only for the track overload. Flagged for the consolidator.
 */
export function purchaseQuote(listing: Listing, via: "buyNow" | "auctionBuyNow"): PurchaseQuote;
export function purchaseQuote(
  track: EditionTrack,
  via: "buyNow",
  tier: "regular" | "extended",
  network: Network,
): PurchaseQuote;
export function purchaseQuote(
  target: Listing | EditionTrack,
  via: "buyNow" | "auctionBuyNow",
  tier?: "regular" | "extended",
  network?: Network,
): PurchaseQuote {
  let price: Amount;
  let token: Token;
  let net: Network;
  if (isTrack(target)) {
    const listing = target.listing;
    token = listing?.token ?? "MATIC";
    price = (tier === "extended" ? listing?.extended : listing?.regular) ?? "0";
    net = network ?? "mumbai";
  } else {
    token = target.token;
    price = (via === "auctionBuyNow" ? target.auctionBuyNow : target.price) ?? "0";
    net = target.network;
  }
  const ideezaFee = ideezaFeeOf(price);
  const payout = payoutOf(price);
  const gas = estimateGas(net);
  const networkFee: Amount = String(gas.fee);
  const total = addAmounts(price, networkFee);
  const lines: string[] = [
    `Price · ${price} ${token}`,
    `${gas.label} · ${networkFee} ${gas.native} — ${gas.note}`,
    `Includes ${FEE_LABEL} · ${ideezaFee} ${token} — taken from the price, not added to it`,
    `Total · ${total} ${token}`,
  ];
  return { price, ideezaFee, networkFee, payout, lines };
}

// ───────────────────────── recording a sale ─────────────────────────

export type SaleRefusal = { ok: false; reason: "alreadySold" | "overShare" | "badAmount"; message: string };

export type MakeSaleInput = {
  listingId: string;
  projectId: string;
  buyerId: DemoBuyerId;
  buyerAddress: string;
  sellerAddress: string;
  item: SaleItem;
  via: Sale["via"];
  token: Token;
  price: Amount;
  royaltiesPct: number;
  network: Network;
  collection: string;
  benefits?: UtilityBenefit[];
};

export type MakeSaleCtx = {
  /** Every sale so far — used only for the "already sold" guard. */
  sales: Sale[];
  /** The project's mint view (MINT/T02's `mintViewOf`), computed *before*
   *  this sale. `mintedAtSale` is true only while it still reads
   *  "lazyMinted": once a prior sale (or an instant mint) has settled it,
   *  `mint.status` reads "onChain" and a later share sale reuses the same
   *  token with `mintedAtSale: false` (C12 — settlement is derived, never
   *  written by this function). */
  mint: MintView;
  /** The creator's current sellable share, 0–100 (`ownershipOf`, T05). */
  ownership: { creatorPct: number };
  now: number;
};

/** A pure, deterministic stand-in for the demo wallet's future `demoHex`
 *  (owned by T02, `wallet/demo-wallet.ts`, not yet landed): an FNV-1a hash
 *  of `seed` seeds a small xorshift32 PRNG, expanded to `len` hex
 *  characters. Same seed → same hex, always — no `Math.random`, no crypto
 *  randomness. Once T02 lands, callers can switch to its canonical
 *  `demoHex` without changing any `Sale.txHash` this produced meaning. */
function demoHex(seed: string, len: number): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let state = (h >>> 0) || 1;
  let out = "";
  while (out.length < len) {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    out += state.toString(16).padStart(8, "0");
  }
  return out.slice(0, len);
}

/** The sale's `txHash`: deterministic for a given sale id, always
 *  "0x" + 64 hex — never a link (§3.1: nothing links to an explorer). */
export function txHashOf(saleId: string): string {
  return `0x${demoHex(`ideeza:testnet-demo:sale:${saleId}`, 64)}`;
}

/**
 * Appends the one record a purchase writes (P2-MARKETPLACE-16, C11).
 * Refuses, never half-writes, when:
 * - the amount doesn't parse or isn't positive (`badAmount`);
 * - this `listingId` already has a sale (`alreadySold` — a Main listing
 *   sells once; another share needs a new listing);
 * - a Main sale's `sharePct` is more than the creator's current share
 *   (`overShare`).
 */
export function makeSale(input: MakeSaleInput, ctx: MakeSaleCtx): Sale | SaleRefusal {
  const priceMicros = toMicros(input.price);
  if (priceMicros === null || priceMicros <= BigInt(0)) {
    return { ok: false, reason: "badAmount", message: "Enter a valid amount." };
  }
  if (ctx.sales.some((s) => s.listingId === input.listingId)) {
    return { ok: false, reason: "alreadySold", message: "This listing already has a sale." };
  }
  if (input.item.nft === "main" && input.item.sharePct > ctx.ownership.creatorPct) {
    return { ok: false, reason: "overShare", message: "That's more than the creator's current share." };
  }

  const id = randomId("sale_");
  const ideeza = ideezaFeeOf(input.price);
  const payout = payoutOf(input.price);
  const gas = estimateGas(input.network);
  const mintedAtSale = ctx.mint.status === "lazyMinted";
  const tokenId = input.item.nft === "main" ? ctx.mint.tokenId : null;

  return {
    id,
    listingId: input.listingId,
    projectId: input.projectId,
    at: ctx.now,
    buyerId: input.buyerId,
    buyerAddress: input.buyerAddress,
    sellerAddress: input.sellerAddress,
    item: input.item,
    via: input.via,
    token: input.token,
    price: input.price,
    fees: { ideezaBps: IDEEZA_FEE_BPS, ideeza, network: { coin: gas.native as Coin, amount: String(gas.fee) } },
    payout,
    royaltiesPct: input.royaltiesPct,
    mint: ctx.mint.record ? ctx.mint.record.type : "lazy",
    mintedAtSale,
    tokenId,
    network: input.network,
    collection: input.collection,
    benefits: input.benefits ?? [],
    txHash: txHashOf(id),
    demo: true,
  };
}
