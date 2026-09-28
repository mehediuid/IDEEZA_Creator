// The one record a purchase writes (Phase 2 spec §3.5.5, C11): a Sale is
// never edited after it's written, so every store hook and every derived
// view (ownership, the mint status, Customers, the project log) reads the
// same append-only list. Bids and support requests are the marketplace's
// other two append-only stores.
//
// Pure, relative imports only, so node:test loads the compiled module.

import type { Coin, DemoBuyerId, MintType } from "../wallet/types";
import type { Network, Token } from "../brief/types";
import { toMicros } from "../wallet/money";
import type { Bid, EditionKind, EditionUse, Sale, SaleItem, SupportRequest, UtilityBenefit } from "./types";

const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";

/** One id of the §3.1 shape: `prefix` + 8 random base-36 characters. Never
 *  reused, and never contains ":" (the ids convention). */
export function randomId(prefix: string): string {
  let id = prefix;
  for (const b of crypto.getRandomValues(new Uint8Array(8))) id += BASE36[b % 36];
  return id;
}

// ───────────────────────── normalizers ─────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === "boolean";

const BUYER_IDS = new Set<DemoBuyerId>(["buyer-mira", "buyer-leo", "buyer-sam"]);
export const isBuyerId = (v: unknown): v is DemoBuyerId => isStr(v) && BUYER_IDS.has(v as DemoBuyerId);

const NETWORKS = new Set<Network>(["baseSepolia", "mumbai"]);
const TOKENS = new Set<Token>(["ETH", "WETH", "USDC", "USDT", "MATIC"]);
const USES = new Set<EditionUse>(["private", "commercial"]);
const TIERS = new Set(["regular", "extended"]);
const KINDS = new Set<EditionKind>(["physical", "virtual"]);
const VIAS = new Set(["buyNow", "auctionBuyNow", "auctionWin"]);

function benefitsIn(v: unknown): UtilityBenefit[] {
  if (!Array.isArray(v)) return [];
  const out: UtilityBenefit[] = [];
  for (const b of v) {
    if (!isRecord(b) || !isStr(b.id) || !isStr(b.name)) continue;
    const d = b.duration;
    if (isRecord(d) && (d.months === 1 || d.months === 3 || d.months === 6 || d.months === 12)) {
      out.push({ id: b.id, name: b.name, duration: { months: d.months } });
    } else if (isRecord(d) && d.whileHeld === true) {
      out.push({ id: b.id, name: b.name, duration: { whileHeld: true } });
    }
  }
  return out;
}

function saleItemIn(v: unknown): SaleItem | null {
  if (!isRecord(v)) return null;
  if (v.nft === "main") {
    return isNum(v.sharePct) ? { nft: "main", sharePct: v.sharePct } : null;
  }
  if (KINDS.has(v.nft as EditionKind)) {
    if (!isStr(v.trackId) || !isStr(v.productId) || !isStr(v.productName)) return null;
    if (!USES.has(v.use as EditionUse)) return null;
    if (!TIERS.has(v.tier as string)) return null;
    if (!isNum(v.serial)) return null;
    return {
      nft: v.nft as EditionKind,
      trackId: v.trackId,
      productId: v.productId,
      productName: v.productName,
      use: v.use as EditionUse,
      tier: v.tier as "regular" | "extended",
      serial: v.serial,
    };
  }
  return null;
}

/** A stored `Sale`, or null when the row is malformed — dropped, never
 *  repaired: a half-read purchase record must never be guessed at. */
function saleIn(v: unknown): Sale | null {
  if (!isRecord(v)) return null;
  const item = saleItemIn(v.item);
  if (!item) return null;
  if (!isStr(v.id) || !isStr(v.listingId) || !isStr(v.projectId) || !isNum(v.at)) return null;
  if (!isBuyerId(v.buyerId) || !isStr(v.buyerAddress) || !isStr(v.sellerAddress)) return null;
  if (!isStr(v.via) || !VIAS.has(v.via)) return null;
  if (!isStr(v.token) || !TOKENS.has(v.token as Token)) return null;
  if (!isStr(v.price) || toMicros(v.price) === null) return null;
  const fees = v.fees;
  if (!isRecord(fees) || !isNum(fees.ideezaBps) || !isStr(fees.ideeza)) return null;
  const net = fees.network;
  if (!isRecord(net) || !isStr(net.coin) || !isStr(net.amount)) return null;
  if (!isStr(v.payout) || !isNum(v.royaltiesPct)) return null;
  if (v.mint !== "lazy" && v.mint !== "instant") return null;
  if (!isBool(v.mintedAtSale)) return null;
  if (v.tokenId !== null && !isNum(v.tokenId)) return null;
  if (!isStr(v.network) || !NETWORKS.has(v.network as Network)) return null;
  if (!isStr(v.collection)) return null;
  if (!isStr(v.txHash)) return null;
  if (v.demo !== true) return null;
  return {
    id: v.id,
    listingId: v.listingId,
    projectId: v.projectId,
    at: v.at,
    buyerId: v.buyerId,
    buyerAddress: v.buyerAddress,
    sellerAddress: v.sellerAddress,
    item,
    via: v.via as Sale["via"],
    token: v.token as Token,
    price: v.price,
    fees: { ideezaBps: fees.ideezaBps, ideeza: fees.ideeza, network: { coin: net.coin as Coin, amount: net.amount } },
    payout: v.payout,
    royaltiesPct: v.royaltiesPct,
    mint: v.mint as MintType,
    mintedAtSale: v.mintedAtSale,
    tokenId: v.tokenId === null ? null : (v.tokenId as number),
    network: v.network as Network,
    collection: v.collection,
    benefits: benefitsIn(v.benefits),
    txHash: v.txHash,
    demo: true,
  };
}

/** Every stored sale, malformed rows dropped. A Main NFT sells once per
 *  listing (C11): when more than one sale names the same **Main**
 *  `listingId`, the earliest (by `at`) wins and the rest are dropped — a
 *  storage race must never mint the token twice. An edition track's
 *  `listingId` (its `EditionTrack.id`) may carry many sales, one per unit
 *  sold, up to its supply (enforced by `makeSale`'s caller, not here). */
export function normalizeSales(v: unknown): Sale[] {
  if (!Array.isArray(v)) return [];
  const rows: Sale[] = [];
  for (const raw of v) {
    const s = saleIn(raw);
    if (s) rows.push(s);
  }
  const earliestMain = new Map<string, Sale>();
  for (const s of rows) {
    if (s.item.nft !== "main") continue;
    const cur = earliestMain.get(s.listingId);
    if (!cur || s.at < cur.at) earliestMain.set(s.listingId, s);
  }
  return rows.filter((s) => s.item.nft !== "main" || earliestMain.get(s.listingId) === s);
}

export function normalizeBids(v: unknown): Bid[] {
  if (!Array.isArray(v)) return [];
  const out: Bid[] = [];
  for (const raw of v) {
    if (!isRecord(raw)) continue;
    const { id, listingId, bidderId, amount, token, at } = raw;
    if (!isStr(id) || !isStr(listingId) || !isBuyerId(bidderId)) continue;
    if (!isStr(amount) || toMicros(amount) === null) continue;
    if (!isStr(token) || !TOKENS.has(token as Token) || !isNum(at)) continue;
    out.push({ id, listingId, bidderId, amount, token: token as Token, at });
  }
  return out;
}

export function normalizeSupport(v: unknown): SupportRequest[] {
  if (!Array.isArray(v)) return [];
  const out: SupportRequest[] = [];
  for (const raw of v) {
    if (!isRecord(raw)) continue;
    const { id, saleId, projectId, buyerId, message, at } = raw;
    if (!isStr(id) || !isStr(saleId) || !isStr(projectId) || !isBuyerId(buyerId)) continue;
    if (!isStr(message) || !isNum(at)) continue;
    out.push({ id, saleId, projectId, buyerId, message, at });
  }
  return out;
}

// ───────────────────────── reads ─────────────────────────

export function salesOfProject(projectId: string, sales: Sale[]): Sale[] {
  return sales.filter((s) => s.projectId === projectId);
}

/** Main NFT sales only — the ones that move the project's ownership. */
export function mainSalesOf(projectId: string, sales: Sale[]): Sale[] {
  return sales.filter((s) => s.projectId === projectId && s.item.nft === "main");
}

/** What one demo buyer holds of a project's Main NFT — their summed
 *  `sharePct` over every Main sale to them, and the sales themselves
 *  (P2-MARKETPLACE-18's "in {n} purchases"). `null` when they hold nothing. */
export function holdingOf(
  projectId: string,
  buyerId: DemoBuyerId,
  sales: Sale[],
): { sharePct: number; sales: Sale[] } | null {
  const mine = mainSalesOf(projectId, sales).filter((s) => s.buyerId === buyerId);
  if (!mine.length) return null;
  const sharePct = mine.reduce((sum, s) => sum + (s.item.nft === "main" ? s.item.sharePct : 0), 0);
  return { sharePct, sales: mine };
}
