// Buying a Feed sample project on the phone (mobile Figma "Project Details ·
// 2026 update" 18b–18e; the lead's decision 2026-11-05: every phone purchase
// is a testnet demo made by the active demo creator — Mira, Leo or Sam — for a
// sample project as for one's own listing). A sample's listing is static rows
// ("Whole project (Main NFT)" 0.25 ETH, "Virtual copy" 0.01 ETH) that the
// market store doesn't hold, so its purchases are kept here, one record each,
// under PHONE_SAMPLE_SALES_KEY. The money moves through the demo wallet's own
// request (`purpose: "purchase"`, `offMarket`), whose activity line carries
// the charge, so the buyer's balance really drops.
//
// The selling rules hold: the Main NFT is the whole project, sold once; a
// Main sale sells the project in full, so its copies come off with it; each
// copy row sells on its own, up to its supply when the row states one.
//
// Pure. Value imports are relative, so node:test loads the compiled module.

import type { Network, Token } from "../brief/types";
import { estimateGas } from "../commerce/gas";
import { SHARE_SALE_NOTE } from "../commerce/share-copy";
import { offerOf, type ClipOfferKind } from "../innovations/clips";
import type { InnovationPost } from "../innovations/types";
import { demoAddress, shortAddress } from "../wallet/demo-wallet";
import { DEMO_BUYERS } from "../wallet/identities";
import { normalizeAmount } from "../wallet/money";
import type { Amount, DemoBuyerId, WalletRequest } from "../wallet/types";
import { FEE_LABEL, ideezaFeeOf } from "./fee";

export const PHONE_SAMPLE_SALES_KEY = "ideeza:market:phone-sample-sales";

/** A sample's prices are in ETH: the demo pays them on Base Sepolia, its ETH testnet. */
export const SAMPLE_NETWORK: Network = "baseSepolia";

/** The web's purchase words (marketplace/purchase-dialog.tsx). */
export const JUST_SOLD = "This listing was just sold.";
export const SOLD_IN_FULL = "This project was just sold in full, so its NFTs are off the marketplace.";
export const SOLD_OUT = "These NFTs just sold out.";
export const STORAGE_FULL = "Your browser didn't save this purchase — storage is full.";

export type SampleOffer = {
  kind: ClipOfferKind;
  /** The listing row's own words: "Whole project (Main NFT)", "Physical copy · 6 of 50 sold". */
  label: string;
  /** What a buyer gets: "Main NFT", "Physical NFT · Business use". */
  name: string;
  price: Amount;
  token: Token;
  /** The copies the row says were sold before this browser's, and of how many; null when it doesn't say. */
  sold: { count: number; of: number } | null;
};

export type SampleSale = {
  id: string;
  /** The feed project's id ("p1"). */
  projectId: string;
  kind: ClipOfferKind;
  name: string;
  buyerId: DemoBuyerId;
  buyerAddress: string;
  price: Amount;
  token: Token;
  network: Network;
  networkFee: Amount;
  /** A copy's number ("#7 of 50"); null for the Main NFT. */
  serial: number | null;
  txHash: string;
  at: number;
  demo: true;
};

const TOKENS: readonly Token[] = ["ETH", "WETH", "USDC", "USDT", "MATIC"];
const KINDS: readonly ClipOfferKind[] = ["main", "physical", "virtual"];
const BUYERS: readonly DemoBuyerId[] = DEMO_BUYERS.map((b) => b.id);

/** "0.25 ETH" → { amount: "0.25", token: "ETH" }; null for anything else. */
export function parsePrice(text: string): { amount: Amount; token: Token } | null {
  const m = /^\s*(\d*\.?\d+)\s+([A-Z]+)\s*$/.exec(text);
  if (!m || !TOKENS.includes(m[2] as Token)) return null;
  const amount = normalizeAmount(m[1]);
  return amount && Number(amount) > 0 ? { amount, token: m[2] as Token } : null;
}

const KIND_NAME: Record<Exclude<ClipOfferKind, "main">, string> = { physical: "Physical NFT", virtual: "Virtual NFT" };

/** The post's listing rows as offers a buyer can pay for: the Main NFT first, then the copies. A row
 *  whose price doesn't read is left out. */
export function sampleOffersOf(post: Pick<InnovationPost, "listing" | "license">): SampleOffer[] {
  if (!post.listing) return [];
  const out: SampleOffer[] = [];
  for (const row of post.listing.rows) {
    const offer = offerOf(row, post.license);
    const price = parsePrice(row.price);
    if (!offer || !price) continue;
    const name = offer.kind === "main" ? "Main NFT" : [KIND_NAME[offer.kind], offer.use].filter(Boolean).join(" · ");
    out.push({ kind: offer.kind, label: row.label, name, price: price.amount, token: price.token, sold: offer.sold });
  }
  return out.sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** The stored list; a malformed record is dropped, never the list. */
export function normalizeSampleSales(raw: unknown): SampleSale[] {
  if (!Array.isArray(raw)) return [];
  const out: SampleSale[] = [];
  for (const r of raw) {
    if (!isRecord(r)) continue;
    const { id, projectId, kind, name, buyerId, buyerAddress, price, token, network, networkFee, serial, txHash, at } = r;
    if (typeof id !== "string" || typeof projectId !== "string" || typeof name !== "string") continue;
    if (!KINDS.includes(kind as ClipOfferKind) || !BUYERS.includes(buyerId as DemoBuyerId)) continue;
    if (typeof price !== "string" || !normalizeAmount(price) || typeof networkFee !== "string" || !normalizeAmount(networkFee)) continue;
    if (!TOKENS.includes(token as Token) || (network !== "baseSepolia" && network !== "mumbai")) continue;
    if (typeof txHash !== "string" || typeof at !== "number" || !Number.isFinite(at)) continue;
    if (serial !== null && (typeof serial !== "number" || !Number.isInteger(serial) || serial < 1)) continue;
    out.push({
      id,
      projectId,
      kind: kind as ClipOfferKind,
      name,
      buyerId: buyerId as DemoBuyerId,
      buyerAddress: typeof buyerAddress === "string" ? buyerAddress : demoAddress(buyerId as DemoBuyerId),
      price,
      token: token as Token,
      network: network as Network,
      networkFee,
      serial: serial as number | null,
      txHash,
      at,
      demo: true,
    });
  }
  return out;
}

/** One project's sales, oldest first. */
export function sampleSalesOf(projectId: string, sales: readonly SampleSale[]): SampleSale[] {
  return sales.filter((s) => s.projectId === projectId).sort((a, b) => a.at - b.at);
}

export type SampleOfferState = {
  /** The Main NFT's one sale, once it is sold. */
  soldTo: SampleSale | null;
  /** Copies sold, the row's own count included; null for the Main NFT. */
  count: number | null;
  /** The copy row's supply, when it states one. */
  of: number | null;
  soldOut: boolean;
  /** The Main NFT is sold, so the whole project is: its copies are off the marketplace. */
  locked: boolean;
};

export function offerStateOf(offer: Pick<SampleOffer, "kind" | "sold">, projectId: string, sales: readonly SampleSale[]): SampleOfferState {
  const mine = sampleSalesOf(projectId, sales);
  const main = mine.find((s) => s.kind === "main") ?? null;
  if (offer.kind === "main") return { soldTo: main, count: null, of: null, soldOut: main !== null, locked: false };
  const count = (offer.sold?.count ?? 0) + mine.filter((s) => s.kind === offer.kind).length;
  const of = offer.sold?.of ?? null;
  return { soldTo: null, count, of, soldOut: of !== null && count >= of, locked: main !== null };
}

/** Why the offer can't be bought now, in the web's words; null when it can. */
export function sampleBuyBlock(offer: Pick<SampleOffer, "kind" | "sold">, projectId: string, sales: readonly SampleSale[]): string | null {
  const state = offerStateOf(offer, projectId, sales);
  if (offer.kind === "main") return state.soldTo ? JUST_SOLD : null;
  if (state.locked) return SOLD_IN_FULL;
  return state.soldOut ? SOLD_OUT : null;
}

/** The number the next copy gets; null for the Main NFT. */
export function nextSampleSerial(offer: Pick<SampleOffer, "kind" | "sold">, projectId: string, sales: readonly SampleSale[]): number | null {
  const { count } = offerStateOf(offer, projectId, sales);
  return count === null ? null : count + 1;
}

/** What the active buyer holds of this project, newest first. */
export function sampleHoldingOf(projectId: string, buyerId: DemoBuyerId, sales: readonly SampleSale[]): SampleSale[] {
  return sampleSalesOf(projectId, sales)
    .filter((s) => s.buyerId === buyerId)
    .reverse();
}

function buyerName(id: DemoBuyerId): string {
  return DEMO_BUYERS.find((b) => b.id === id)?.name ?? "Demo creator";
}

/** "#7 of 50" · "#3". */
export function serialText(serial: number, of: number | null): string {
  return of !== null ? `#${serial} of ${of}` : `#${serial}`;
}

/** The sentence a confirmed purchase says (the web's: "You own 100% of …" for the Main NFT, a
 *  copy "… was minted to Mira's demo wallet."). */
export function sampleDoneLine(title: string, offer: Pick<SampleOffer, "kind" | "name">, buyerId: DemoBuyerId): string {
  const name = buyerName(buyerId);
  return offer.kind === "main"
    ? `You own 100% of ${title}. The token moved to ${name}'s demo wallet.`
    : `${title} · ${offer.name} was minted to ${name}'s demo wallet.`;
}

/**
 * The demo wallet's request for one offer: the buyer's transaction, the price and the network fee as
 * its charge (the sheet sums same-coin lines into "Total to pay now" and checks the funds), the
 * web's rows and fee note. `offMarket`: no market Sale debits it, so the wallet line does.
 */
export function sampleRequestOf(input: {
  title: string;
  offer: SampleOffer;
  buyerId: DemoBuyerId;
  /** The copy's number now (`nextSampleSerial`); null for the Main NFT. */
  serial: number | null;
}): WalletRequest {
  const { title, offer, buyerId, serial } = input;
  const gas = estimateGas(SAMPLE_NETWORK);
  const name = buyerName(buyerId);
  const fee = `Includes ${FEE_LABEL} · ${ideezaFeeOf(offer.price)} ${offer.token} — taken from the price, not added to it`;
  const main = offer.kind === "main";
  const summary = main
    ? [
        { label: "Project", value: `${title} · 100% of the project` },
        { label: "Token", value: "The token moves to your demo wallet" },
      ]
    : [
        { label: "Project", value: `${title} · a copy, not the project` },
        { label: "NFT", value: serial !== null ? `${offer.name} · ${serialText(serial, offer.sold?.of ?? null)}` : offer.name },
        { label: "Token", value: "Minted on this sale (lazy mint)" },
      ];
  return {
    kind: "transaction",
    purpose: "purchase",
    identity: buyerId,
    network: SAMPLE_NETWORK,
    title: "Confirm purchase",
    summary: [...summary, { label: "Paying from", value: `${name}'s demo wallet · ${shortAddress(demoAddress(buyerId))}` }],
    note: main ? `${fee}. ${SHARE_SALE_NOTE}` : `${fee}.`,
    doneLine: sampleDoneLine(title, offer, buyerId),
    charge: {
      network: SAMPLE_NETWORK,
      lines: [
        { coin: offer.token, amount: offer.price },
        { coin: gas.native, amount: String(gas.fee) },
      ],
    },
    offMarket: true,
  };
}

/** The record a confirmed purchase writes. */
export function makeSampleSale(input: {
  projectId: string;
  offer: Pick<SampleOffer, "kind" | "name" | "price" | "token">;
  buyerId: DemoBuyerId;
  buyerAddress: string;
  serial: number | null;
  txHash: string;
  at: number;
  id: string;
}): SampleSale {
  return {
    id: input.id,
    projectId: input.projectId,
    kind: input.offer.kind,
    name: input.offer.name,
    buyerId: input.buyerId,
    buyerAddress: input.buyerAddress,
    price: input.offer.price,
    token: input.offer.token,
    network: SAMPLE_NETWORK,
    networkFee: String(estimateGas(SAMPLE_NETWORK).fee),
    serial: input.offer.kind === "main" ? null : input.serial,
    txHash: input.txHash,
    at: input.at,
    demo: true,
  };
}

/** The list with one more sale, or why it can't take it (sold, sold out, sold in full meanwhile). */
export function withSampleSale(
  sales: readonly SampleSale[],
  offer: Pick<SampleOffer, "kind" | "sold">,
  sale: SampleSale,
): { ok: true; sales: SampleSale[] } | { ok: false; message: string } {
  const why = sampleBuyBlock(offer, sale.projectId, sales);
  return why ? { ok: false, message: why } : { ok: true, sales: [...sales, sale] };
}
