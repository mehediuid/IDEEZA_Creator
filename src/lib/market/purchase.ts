// The purchase confirm's quote, and the one write a purchase makes
// (Phase 2 spec §3.5.5, P2-MARKETPLACE-14, -16). `makeSale` never mints
// twice, never oversells a Main share, and produces a deterministic,
// honestly-labelled "Testnet demo" `txHash` — nothing here touches a chain.
//
// Pure, relative imports only, so node:test loads the compiled module.

import type { Amount, Coin, DemoBuyerId, MintView } from "../wallet/types";
import type { Network, Token } from "../brief/types";
import { estimateGas } from "../brief/gas";
import { toMicros } from "../wallet/money";
import { FEE_LABEL, IDEEZA_FEE_BPS, ideezaFeeOf, payoutOf } from "./fee";
import type { EditionTrack, Listing, Sale, SaleItem, UtilityBenefit } from "./types";
import { randomId } from "./sales";
import { demoHex } from "../wallet/demo-wallet";

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
  // No "Total" line: the price and the network fee can be different coins.
  const lines: string[] = [
    `Price · ${price} ${token}`,
    `${gas.label} · ${networkFee} ${gas.native} — ${gas.note}`,
    `Includes ${FEE_LABEL} · ${ideezaFee} ${token} — taken from the price, not added to it`,
  ];
  return { price, ideezaFee, networkFee, payout, lines };
}

// ───────────────────────── recording a sale ─────────────────────────

export type SaleRefusal = { ok: false; reason: "alreadySold" | "overShare" | "badAmount" | "locked"; message: string };

const LOCKED_MESSAGE = "This project was sold in full, so its NFTs aren't for sale any more.";

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
  /** `view.lock !== null`. Without it, the lock is read from `sales` and
   *  `creatorPct` the way `lockOf` reads it: 0 % left after a Main sale. */
  locked?: boolean;
};

/** The sale's `txHash`: deterministic for a given sale id, always
 *  "0x" + 64 hex — never a link (§3.1: nothing links to an explorer). */
export function txHashOf(saleId: string): string {
  return `0x${demoHex(`ideeza:testnet-demo:sale:${saleId}`, 64)}`;
}

/**
 * Appends the one record a purchase writes (P2-MARKETPLACE-16, C11).
 * Refuses, never half-writes, when:
 * - the amount doesn't parse or isn't positive (`badAmount`);
 * - this Main `listingId` already has a sale (`alreadySold` — a Main listing
 *   sells once; another share needs a new listing). An edition track's
 *   `listingId` takes one sale per unit, and its caller keeps it within the supply;
 * - a Main sale's `sharePct` is more than the creator's current share
 *   (`overShare`);
 * - the project is sold in full (`locked`, decision 12): its editions stop
 *   selling with it (R1-2).
 */
export function makeSale(input: MakeSaleInput, ctx: MakeSaleCtx): Sale | SaleRefusal {
  const priceMicros = toMicros(input.price);
  if (priceMicros === null || priceMicros <= BigInt(0)) {
    return { ok: false, reason: "badAmount", message: "Enter a valid amount." };
  }
  const soldInFull =
    ctx.ownership.creatorPct <= 0 && ctx.sales.some((s) => s.projectId === input.projectId && s.item.nft === "main");
  if (input.item.nft !== "main" && (ctx.locked || soldInFull)) {
    return { ok: false, reason: "locked", message: LOCKED_MESSAGE };
  }
  // A Main listing sells once; an edition track sells one unit per sale, up to
  // its supply, which the caller checks (sales.ts, P2-TABS-27).
  if (input.item.nft === "main" && ctx.sales.some((s) => s.listingId === input.listingId && s.item.nft === "main")) {
    return { ok: false, reason: "alreadySold", message: "This listing already has a sale." };
  }
  if (input.item.nft === "main" && input.item.sharePct > ctx.ownership.creatorPct) {
    return { ok: false, reason: "overShare", message: "That's more than the creator's current share." };
  }

  const id = randomId("sale_");
  const ideeza = ideezaFeeOf(input.price);
  const payout = payoutOf(input.price);
  const gas = estimateGas(input.network);
  // Editions are always lazy: each unit is minted by its own sale (P2-TABS-25).
  const edition = input.item.nft !== "main";
  const mintedAtSale = edition || ctx.mint.status === "lazyMinted";
  const tokenId = edition ? null : ctx.mint.tokenId;

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
    mint: !edition && ctx.mint.record ? ctx.mint.record.type : "lazy",
    mintedAtSale,
    tokenId,
    network: input.network,
    collection: input.collection,
    benefits: input.benefits ?? [],
    txHash: txHashOf(id),
    demo: true,
  };
}
