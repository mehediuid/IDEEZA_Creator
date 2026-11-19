// Selling a bought copy on (owner, 2026-11-19: "if I want to sell it again, complete that flow — and like the
// project's Earn, somewhere I see it all"). One record per listing a holder makes of a Physical or Virtual copy
// they hold, whoever made the project (this browser's own listings or another creator's samples).
//
// The rules (prototype defaults until the owner words them):
// - Only copies sell on here. The Main NFT is the whole project: its holder sells it from that project's own Earn.
// - Buy now at one price, in the copy's own token and network. Listing it is a free signature; a new price is
//   another; taking it off sale needs none (a lazy listing has nothing on chain).
// - While a copy is for sale it stays its holder's, and no units are made with it (what the buyer gets can't
//   change under them).
// - A sale moves the copy (its number), its licence (the same use) and its units left (units.ts). The seller keeps
//   the units they made. Out of the price come the creator's royalty and IDEEZA's fee; the seller gets the rest.
// - A copy can sell on any number of times; it keeps its key, so its units follow it.
// - The holder now is the last buyer in the copy's chain of sales, else whoever bought it first.
//
// Pure. Relative imports only (node:test loads the compiled module).

import type { Network, Token } from "../brief/types";
import { estimateGas } from "../commerce/gas";
import { demoAddress, demoHex, shortAddress } from "../wallet/demo-wallet";
import { DEMO_BUYERS } from "../wallet/identities";
import { compareAmounts, formatAmount, fromMicros, normalizeAmount, subAmounts, toMicros } from "../wallet/money";
import type { Amount, DemoBuyerId, IdentityId, WalletActivity, WalletRequest } from "../wallet/types";
import { FEE_LABEL, ideezaFeeOf } from "./fee";
import type { EditionKind } from "./types";

export const RESALES_KEY = "ideeza:market:resales";

export type ResaleUse = "Personal use" | "Business use";

export type ResaleSale = {
  buyerId: DemoBuyerId;
  buyerAddress: string;
  at: number;
  txHash: string;
  /** The creator's royalty, IDEEZA's fee and what the seller got: the price, split. */
  royalty: Amount;
  fee: Amount;
  payout: Amount;
  /** What the buyer paid the network. */
  networkFee: Amount;
  /** A Physical copy's units handed over; null for a Virtual copy. */
  unitsLeft: number | null;
};

export type Resale = {
  id: string;
  /** The copy's key (units.ts): the same however often it sells. */
  copyKey: string;
  source: "own" | "sample";
  /** This browser's project id, or a sample's feed id. */
  projectId: string;
  projectName: string;
  kind: EditionKind;
  use: ResaleUse;
  /** A product's own copy names it; null for a copy of the whole project. */
  product: string | null;
  serial: number;
  of: number | null;
  sellerId: DemoBuyerId;
  sellerAddress: string;
  price: Amount;
  token: Token;
  network: Network;
  royaltyPct: number;
  listedAt: number;
  updatedAt: number;
  status: "listed" | "cancelled" | "sold";
  cancelledAt: number | null;
  sale: ResaleSale | null;
  demo: true;
};

/** What a holder lists: the copy and its terms. */
export type ResaleDraft = Pick<
  Resale,
  "copyKey" | "source" | "projectId" | "projectName" | "kind" | "use" | "product" | "serial" | "of" | "token" | "network" | "royaltyPct"
>;

const BUYERS: readonly DemoBuyerId[] = DEMO_BUYERS.map((b) => b.id);
const TOKENS: readonly Token[] = ["ETH", "WETH", "USDC", "USDT", "MATIC"];

export const JUST_SOLD = "This copy was just sold.";
export const OFF_SALE = "The holder took this copy off sale.";
export const OWN_LISTING = "This is your own listing.";
export const ALREADY_LISTED = "This copy is already for sale.";
export const NOT_YOURS = "You don't hold this copy any more.";
export const BAD_PRICE = "Enter a price above 0, with up to 6 decimals.";

export function buyerNameOf(id: DemoBuyerId): string {
  return DEMO_BUYERS.find((b) => b.id === id)?.name ?? "A demo creator";
}

// ─────────────────────────────── reading ───────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const amountOk = (v: unknown): v is Amount => typeof v === "string" && normalizeAmount(v) !== null;

function saleOf(v: unknown): ResaleSale | null {
  if (!isRecord(v)) return null;
  const { buyerId, buyerAddress, at, txHash, royalty, fee, payout, networkFee, unitsLeft } = v;
  if (!BUYERS.includes(buyerId as DemoBuyerId) || typeof at !== "number" || typeof txHash !== "string") return null;
  if (!amountOk(royalty) || !amountOk(fee) || !amountOk(payout) || !amountOk(networkFee)) return null;
  if (unitsLeft !== null && (typeof unitsLeft !== "number" || !Number.isInteger(unitsLeft) || unitsLeft < 0)) return null;
  return {
    buyerId: buyerId as DemoBuyerId,
    buyerAddress: typeof buyerAddress === "string" ? buyerAddress : demoAddress(buyerId as DemoBuyerId),
    at,
    txHash,
    royalty,
    fee,
    payout,
    networkFee,
    unitsLeft: unitsLeft as number | null,
  };
}

/** The stored list; a malformed record is dropped, never the list. */
export function normalizeResales(raw: unknown): Resale[] {
  if (!Array.isArray(raw)) return [];
  const out: Resale[] = [];
  for (const r of raw) {
    if (!isRecord(r)) continue;
    const { id, copyKey, source, projectId, projectName, kind, use, product, serial, of, sellerId, sellerAddress } = r;
    const { price, token, network, royaltyPct, listedAt, updatedAt, status, cancelledAt } = r;
    if (typeof id !== "string" || typeof copyKey !== "string" || typeof projectId !== "string") continue;
    if (source !== "own" && source !== "sample") continue;
    if (kind !== "physical" && kind !== "virtual") continue;
    if (use !== "Personal use" && use !== "Business use") continue;
    if (product !== null && typeof product !== "string") continue;
    if (typeof serial !== "number" || !Number.isInteger(serial) || serial < 1) continue;
    if (of !== null && (typeof of !== "number" || !Number.isInteger(of) || of < 1)) continue;
    if (!BUYERS.includes(sellerId as DemoBuyerId) || !amountOk(price) || !TOKENS.includes(token as Token)) continue;
    if (network !== "baseSepolia" && network !== "mumbai") continue;
    if (typeof royaltyPct !== "number" || royaltyPct < 0 || royaltyPct > 50) continue;
    if (typeof listedAt !== "number" || typeof updatedAt !== "number") continue;
    if (status !== "listed" && status !== "cancelled" && status !== "sold") continue;
    const sale = status === "sold" ? saleOf(r.sale) : null;
    if (status === "sold" && !sale) continue;
    out.push({
      id,
      copyKey,
      source,
      projectId,
      projectName: typeof projectName === "string" ? projectName : "",
      kind,
      use,
      product: product as string | null,
      serial,
      of: of as number | null,
      sellerId: sellerId as DemoBuyerId,
      sellerAddress: typeof sellerAddress === "string" ? sellerAddress : demoAddress(sellerId as DemoBuyerId),
      price,
      token: token as Token,
      network,
      royaltyPct,
      listedAt,
      updatedAt,
      status,
      cancelledAt: typeof cancelledAt === "number" ? cancelledAt : null,
      sale,
      demo: true,
    });
  }
  return out;
}

/** A copy's sales on, oldest first. */
export function chainOf(copyKey: string, resales: readonly Resale[]): Resale[] {
  return resales.filter((r) => r.copyKey === copyKey && r.status === "sold" && r.sale).sort((a, b) => (a.sale as ResaleSale).at - (b.sale as ResaleSale).at);
}

/** Who holds the copy now: the last buyer in its chain, else whoever bought it first. */
export function holderOf(copyKey: string, firstBuyer: DemoBuyerId, resales: readonly Resale[]): DemoBuyerId {
  const last = chainOf(copyKey, resales).at(-1);
  return last ? (last.sale as ResaleSale).buyerId : firstBuyer;
}

/** How the holder got it, when it was from another holder: the last sale in its chain. */
export function boughtOnOf(copyKey: string, holder: DemoBuyerId, resales: readonly Resale[]): Resale | null {
  const last = chainOf(copyKey, resales).at(-1) ?? null;
  return last && (last.sale as ResaleSale).buyerId === holder ? last : null;
}

/** The copy's live listing, made by whoever holds it now; null when it isn't for sale. */
export function liveListingOf(copyKey: string, holder: DemoBuyerId, resales: readonly Resale[]): Resale | null {
  return resales.find((r) => r.copyKey === copyKey && r.status === "listed" && r.sellerId === holder) ?? null;
}

/** The listings on sale now for one project and kind, cheapest first (the marketplace's "From holders"). */
export function onSaleOf(projectId: string, kind: EditionKind, resales: readonly Resale[], holderNow: (r: Resale) => DemoBuyerId | null): Resale[] {
  return resales
    .filter((r) => r.projectId === projectId && r.kind === kind && r.status === "listed" && holderNow(r) === r.sellerId)
    .sort((a, b) => compareAmounts(a.price, b.price) || a.listedAt - b.listedAt);
}

/** What one holder sold, newest first. */
export function soldByOf(sellerId: DemoBuyerId, resales: readonly Resale[], projectId?: string): Resale[] {
  return resales
    .filter((r) => r.sellerId === sellerId && r.status === "sold" && r.sale && (projectId === undefined || r.projectId === projectId))
    .sort((a, b) => (b.sale as ResaleSale).at - (a.sale as ResaleSale).at);
}

// ─────────────────────────────── money ───────────────────────────────

/** The price split: the creator's royalty (floored to the micro), IDEEZA's fee, and what the seller gets. */
export function resaleSplitOf(price: Amount, royaltyPct: number): { royalty: Amount; fee: Amount; payout: Amount } {
  const micros = toMicros(price) ?? BigInt(0);
  // In basis points: 10% = 1,000.
  const pct = BigInt(Math.round(Math.max(0, Math.min(50, royaltyPct)) * 100));
  const royalty = fromMicros((micros * pct) / BigInt(10_000));
  const fee = ideezaFeeOf(price);
  return { royalty, fee, payout: subAmounts(subAmounts(price, royalty), fee) };
}

/** A price the holder typed, read: up to 6 decimals, above 0; null when it doesn't read. */
export function readPrice(text: string): Amount | null {
  const a = normalizeAmount(text.trim());
  return a && compareAmounts(a, "0") > 0 ? a : null;
}

// ─────────────────────────────── writing ───────────────────────────────

export type Outcome = { ok: true; resales: Resale[]; resale: Resale } | { ok: false; message: string };

/** The list with the copy for sale, or why it can't be (already for sale, not theirs, no price). */
export function listResale(
  resales: readonly Resale[],
  draft: ResaleDraft,
  seller: DemoBuyerId,
  holder: DemoBuyerId,
  price: Amount,
  at: number,
  id: string,
): Outcome {
  if (holder !== seller) return { ok: false, message: NOT_YOURS };
  if (!readPrice(price)) return { ok: false, message: BAD_PRICE };
  if (liveListingOf(draft.copyKey, seller, resales)) return { ok: false, message: ALREADY_LISTED };
  const resale: Resale = {
    ...draft,
    id,
    sellerId: seller,
    sellerAddress: demoAddress(seller),
    price: readPrice(price) as Amount,
    listedAt: at,
    updatedAt: at,
    status: "listed",
    cancelledAt: null,
    sale: null,
    demo: true,
  };
  return { ok: true, resales: [...resales, resale], resale };
}

function change(resales: readonly Resale[], id: string, edit: (r: Resale) => Resale | string): Outcome {
  const r = resales.find((x) => x.id === id);
  if (!r) return { ok: false, message: OFF_SALE };
  if (r.status === "sold") return { ok: false, message: JUST_SOLD };
  if (r.status === "cancelled") return { ok: false, message: OFF_SALE };
  const next = edit(r);
  if (typeof next === "string") return { ok: false, message: next };
  return { ok: true, resales: resales.map((x) => (x.id === id ? next : x)), resale: next };
}

/** A new price for a live listing. */
export function repriceResale(resales: readonly Resale[], id: string, price: Amount, at: number): Outcome {
  return change(resales, id, (r) => (readPrice(price) ? { ...r, price: readPrice(price) as Amount, updatedAt: at } : BAD_PRICE));
}

/** The listing off sale. */
export function cancelResale(resales: readonly Resale[], id: string, at: number): Outcome {
  return change(resales, id, (r) => ({ ...r, status: "cancelled", cancelledAt: at, updatedAt: at }));
}

/** Why the buyer can't buy this listing now; null when they can. */
export function resaleBuyBlock(resales: readonly Resale[], id: string, buyer: DemoBuyerId, holder: DemoBuyerId | null): string | null {
  const r = resales.find((x) => x.id === id);
  if (!r || r.status === "cancelled") return OFF_SALE;
  if (r.status === "sold") return JUST_SOLD;
  if (holder !== r.sellerId) return OFF_SALE;
  if (r.sellerId === buyer) return OWN_LISTING;
  return null;
}

/** The list with the listing sold to the buyer, or why it can't be. `unitsLeft`: a Physical copy's, at the sale. */
export function buyResale(
  resales: readonly Resale[],
  id: string,
  buyer: { id: DemoBuyerId; address: string },
  holder: DemoBuyerId | null,
  proof: { at: number; txHash: string },
  unitsLeft: number | null,
): Outcome {
  const why = resaleBuyBlock(resales, id, buyer.id, holder);
  if (why) return { ok: false, message: why };
  return change(resales, id, (r) => ({
    ...r,
    status: "sold",
    updatedAt: proof.at,
    sale: {
      buyerId: buyer.id,
      buyerAddress: buyer.address,
      at: proof.at,
      txHash: proof.txHash,
      ...resaleSplitOf(r.price, r.royaltyPct),
      networkFee: String(estimateGas(r.network).fee),
      unitsLeft: r.kind === "physical" ? unitsLeft : null,
    },
  }));
}

// ─────────────────────────────── words ───────────────────────────────

const KIND_NAME: Record<EditionKind, string> = { physical: "Physical NFT", virtual: "Virtual NFT" };

/** "#7 of 50" · "#3". */
export function copyNumberOf(r: Pick<Resale, "serial" | "of">): string {
  return r.of !== null ? `#${r.serial} of ${r.of}` : `#${r.serial}`;
}

/** "Physical NFT · Business use" · "Virtual NFT · Personal use · Soil Probe". */
export function copyNameOf(r: Pick<Resale, "kind" | "use" | "product">): string {
  return [KIND_NAME[r.kind], r.use, r.product].filter(Boolean).join(" · ");
}

/** What a sale hands the buyer, in one line. */
export function handsOverOf(r: Pick<Resale, "kind" | "use">, unitsLeft: number | null): string {
  if (r.kind === "virtual") return `The copy and its ${r.use} licence`;
  const n = unitsLeft ?? 0;
  return `The copy, its ${r.use} licence and ${n === 0 ? "no units" : `${n} ${n === 1 ? "unit" : "units"}`} left to make`;
}

/** The seller's free signature for the listing's terms (a new price signs again). */
export function resaleListRequestOf(r: Pick<Resale, "kind" | "use" | "product" | "serial" | "of" | "projectName" | "token" | "network" | "royaltyPct">, seller: DemoBuyerId, price: Amount, editing: boolean): WalletRequest {
  const split = resaleSplitOf(price, r.royaltyPct);
  return {
    kind: "signature",
    purpose: editing ? "editListing" : "list",
    identity: seller,
    network: r.network,
    title: editing ? "Sign the new price — no fee" : "Sign the listing — no fee",
    summary: [
      { label: "Project", value: `${r.projectName} · a copy, not the project` },
      { label: "NFT", value: `${copyNameOf(r)} · ${copyNumberOf(r)}` },
      { label: "Price", value: formatAmount(price, r.token) },
      { label: "You get", value: `${formatAmount(split.payout, r.token)} after the ${r.royaltyPct}% royalty and the ${FEE_LABEL}` },
      { label: "From", value: `${buyerNameOf(seller)}'s demo wallet · ${shortAddress(demoAddress(seller))}` },
    ],
    note: editing ? "You're signing the new price. Nothing is charged." : "You're signing the listing's terms. Nothing is charged, and the copy stays yours until someone buys it.",
    doneLine: editing ? "New price signed." : `${copyNameOf(r)} ${copyNumberOf(r)} is for sale on Explore marketplace.`,
  };
}

/** The buyer's transaction: the price and the network fee, paid from their demo wallet (off the market store). */
export function resaleBuyRequestOf(r: Resale, buyer: DemoBuyerId, unitsLeft: number | null): WalletRequest {
  const gas = estimateGas(r.network);
  return {
    kind: "transaction",
    purpose: "purchase",
    identity: buyer,
    network: r.network,
    title: "Confirm purchase",
    summary: [
      { label: "Project", value: `${r.projectName} · a copy, not the project` },
      { label: "NFT", value: `${copyNameOf(r)} · ${copyNumberOf(r)}` },
      { label: "You get", value: handsOverOf(r, unitsLeft) },
      { label: "From", value: `${buyerNameOf(r.sellerId)} · ${shortAddress(r.sellerAddress)}` },
      { label: "Paying from", value: `${buyerNameOf(buyer)}'s demo wallet · ${shortAddress(demoAddress(buyer))}` },
    ],
    note: `The token moves from ${buyerNameOf(r.sellerId)}'s wallet to yours. ${r.royaltyPct}% of the price goes to the creator as a royalty and the ${FEE_LABEL} to IDEEZA, both out of the price, not added to it.`,
    doneLine: `${copyNameOf(r)} ${copyNumberOf(r)} moved to ${buyerNameOf(buyer)}'s demo wallet.`,
    charge: {
      network: r.network,
      lines: [
        { coin: r.token, amount: r.price },
        { coin: gas.native, amount: String(gas.fee) },
      ],
    },
    offMarket: true,
  };
}

/** The wallet line that pays a sold listing's payout to its seller (or its royalty to the creator), once: its id
 *  names the listing. */
export function resalePayoutActivityOf(r: Resale, to: IdentityId, part: "payout" | "royalty"): WalletActivity | null {
  if (!r.sale) return null;
  const amount = part === "payout" ? r.sale.payout : r.sale.royalty;
  if (compareAmounts(amount, "0") <= 0) return null;
  return {
    id: `resale-${part}:${r.id}`,
    at: r.sale.at,
    identity: to,
    network: r.network,
    kind: "transaction",
    title: part === "payout" ? `Sold ${copyNumberOf(r)} · ${r.projectName}` : `Royalty · ${r.projectName} ${copyNumberOf(r)} resold`,
    projectId: r.projectId,
    txHash: `0x${demoHex(`ideeza:testnet-demo:resale-${part}:${r.id}`, 64)}`,
    credit: { network: r.network, lines: [{ coin: r.token, amount }] },
  };
}

/** Every sold listing's payout to its seller, and the royalty on this browser's own projects to the creator, not
 *  yet in the wallet. */
export function missingPayoutsOf(resales: readonly Resale[], have: ReadonlySet<string>, creator: IdentityId | null): WalletActivity[] {
  const out: WalletActivity[] = [];
  for (const r of resales) {
    if (r.status !== "sold") continue;
    const payout = resalePayoutActivityOf(r, r.sellerId, "payout");
    if (payout && !have.has(payout.id)) out.push(payout);
    if (r.source === "own" && creator) {
      const royalty = resalePayoutActivityOf(r, creator, "royalty");
      if (royalty && !have.has(royalty.id)) out.push(royalty);
    }
  }
  return out;
}
