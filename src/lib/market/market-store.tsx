"use client";

// Explore marketplace's store (Phase 2 spec §3.4, §3.6.2): listings, sales,
// bids and support requests, one localStorage key each, read together through
// one `useSyncExternalStore`. So a purchase or a bid in another tab flips the
// owner's page without a reload (P2-LISTING-25).
//
// - Reading never writes. A key that is present but isn't a JSON list reads
//   as [] with `unreadable: true` and is left exactly as it is
//   (P2-CUSTOMERS-7); every writer refuses to touch it.
// - A sale is ONE append (P2-MARKETPLACE-16, C11): ownership, the mint's
//   settlement, Customers and the log all derive from it.
// - Appends re-read the key just before writing, so a row another tab wrote
//   meanwhile is kept, and a second Main sale of one listing is refused.
// - On `ideeza:project-deleted` the project's listings, the bids on them and
//   its support requests go (`dropProjectListings`, P2-LISTING-19). Sales
//   never do: a project with a sale can't be deleted. The journey's files
//   are swept from here too, since this is the one store at the root.
//
// Mounted in layout.tsx inside ManualProjectsProvider. The pure parts
// (`readMarketData`, the append and purge plans, `settleWithWallets`) are
// exported for node:test.

import * as React from "react";
import { estimateGas } from "../brief/gas";
import { parseStored, readStoredKey, subscribeStores, writeStoredKey } from "../key-store";
import { onProjectDeleted } from "../manual/events";
import { useJourneyMediaSweep } from "../manual/journey-store";
import { availableOf, type BalanceCtx } from "../wallet/balances";
import { addAmounts, compareAmounts } from "../wallet/money";
import { settleAuction, type SettleResult } from "./auction";
import { dropProjectListings, normalizeListings } from "./listing";
import { normalizeBids, normalizeSales, normalizeSupport } from "./sales";
import {
  BIDS_KEY,
  LISTINGS_KEY,
  SALES_KEY,
  SUPPORT_KEY,
  type Bid,
  type Listing,
  type MarketData,
  type Sale,
  type SupportRequest,
} from "./types";

/** A writer's outcome. `unreadable`: the key couldn't be read, so it isn't
 *  overwritten. `conflict`: the row is already there (another tab), or the
 *  listing already has its Main sale. `storage`: the browser refused. */
export type MarketWriteResult = { ok: true } | { ok: false; reason: "unreadable" | "conflict" | "storage" };

type Get = (key: string) => string | null;
type Part = { rows: unknown[]; unreadable: boolean };
type Parts = { listings: Part; sales: Part; bids: Part; support: Part };

const MARKET_KEYS = [LISTINGS_KEY, SALES_KEY, BIDS_KEY, SUPPORT_KEY] as const;

function safeGet(get: Get, key: string): string | null {
  try {
    return get(key);
  } catch {
    return null;
  }
}

function partOf(get: Get, key: string): Part {
  const { value, unreadable } = parseStored(safeGet(get, key));
  if (unreadable) return { rows: [], unreadable: true };
  if (value === undefined) return { rows: [], unreadable: false };
  return Array.isArray(value) ? { rows: value, unreadable: false } : { rows: [], unreadable: true };
}

function partsOf(get: Get): Parts {
  return {
    listings: partOf(get, LISTINGS_KEY),
    sales: partOf(get, SALES_KEY),
    bids: partOf(get, BIDS_KEY),
    support: partOf(get, SUPPORT_KEY),
  };
}

/** The four keys, normalized. A missing key reads as []; one present but not
 *  a JSON list reads as [] and sets `unreadable`. Never writes. */
export function readMarketData(get: Get): MarketData {
  const p = partsOf(get);
  return {
    listings: normalizeListings(p.listings.rows),
    sales: normalizeSales(p.sales.rows),
    bids: normalizeBids(p.bids.rows),
    support: normalizeSupport(p.support.rows),
    unreadable: p.listings.unreadable || p.sales.unreadable || p.bids.unreadable || p.support.unreadable,
  };
}

export type MarketWrite = { key: string; value: unknown[] };
type Plan = { ok: true; write: MarketWrite } | { ok: false; reason: "unreadable" | "conflict" };

const idOf = (row: unknown): unknown => (typeof row === "object" && row !== null ? (row as { id?: unknown }).id : undefined);

function appendPlan(get: Get, key: string, row: { id: string }): Plan {
  const p = partOf(get, key);
  if (p.unreadable) return { ok: false, reason: "unreadable" };
  if (p.rows.some((r) => idOf(r) === row.id)) return { ok: false, reason: "conflict" };
  return { ok: true, write: { key, value: [...p.rows, row] } };
}

/** The one write a sale makes: `sale` appended to the stored rows, as they
 *  are. Refused when a Main sale already names the same listing. */
export function appendSalePlan(get: Get, sale: Sale): Plan {
  if (sale.item.nft === "main") {
    const sales = normalizeSales(partOf(get, SALES_KEY).rows);
    if (sales.some((s) => s.listingId === sale.listingId && s.item.nft === "main")) {
      return { ok: false, reason: "conflict" };
    }
  }
  return appendPlan(get, SALES_KEY, sale);
}

export function appendBidPlan(get: Get, bid: Bid): Plan {
  return appendPlan(get, BIDS_KEY, bid);
}

export function appendSupportPlan(get: Get, request: SupportRequest): Plan {
  return appendPlan(get, SUPPORT_KEY, request);
}

/** What deleting project `projectId` writes: its listings dropped, then the
 *  bids on them, then its support requests. A key that can't be read is
 *  left alone, and so are the bids while the listings can't be read (which
 *  bids were the project's isn't known). Keys with nothing to drop aren't
 *  written. Sales are never touched. */
export function marketPurgeOf(projectId: string, get: Get): MarketWrite[] {
  const p = partsOf(get);
  const writes: MarketWrite[] = [];
  const own = (r: unknown) =>
    typeof r === "object" && r !== null && (r as { projectId?: unknown }).projectId === projectId;
  if (!p.listings.unreadable) {
    const listingIds = new Set(p.listings.rows.filter(own).map(idOf));
    if (listingIds.size) {
      writes.push({ key: LISTINGS_KEY, value: dropProjectListings(normalizeListings(p.listings.rows), projectId) });
    }
    if (listingIds.size && !p.bids.unreadable) {
      const bids = p.bids.rows.filter(
        (r) => !(typeof r === "object" && r !== null && listingIds.has((r as { listingId?: unknown }).listingId)),
      );
      if (bids.length !== p.bids.rows.length) writes.push({ key: BIDS_KEY, value: bids });
    }
  }
  if (!p.support.unreadable) {
    const support = p.support.rows.filter((r) => !own(r));
    if (support.length !== p.support.rows.length) writes.push({ key: SUPPORT_KEY, value: support });
  }
  return writes;
}

/**
 * Closes an ended auction against the bidders' demo wallets (P2-MARKETPLACE-17,
 * errata 11): the winner is the highest bid, earliest on a tie, whose wallet
 * still covers the bid plus the network fee the sale charges. Once the
 * auction has ended its holds are released, so `availableOf` counts the
 * winner's own held bid back in.
 */
export function settleWithWallets(listing: Listing, ctx: BalanceCtx): SettleResult {
  const gas = estimateGas(listing.network);
  const fee = String(gas.fee);
  const payable = (bid: Bid): boolean => {
    const have = availableOf(bid.bidderId, listing.token, listing.network, ctx);
    if (gas.native === listing.token) return compareAmounts(have, addAmounts(bid.amount, fee)) >= 0;
    const gasHave = availableOf(bid.bidderId, gas.native, listing.network, ctx);
    return compareAmounts(have, bid.amount) >= 0 && compareAmounts(gasHave, fee) >= 0;
  };
  return settleAuction(listing, ctx.market.bids, ctx.now, payable);
}

// ─────────────────────────── the browser store ───────────────────────────

const EMPTY: MarketData = { listings: [], sales: [], bids: [], support: [], unreadable: false };

let cached: { raws: (string | null)[]; data: MarketData } | null = null;

/** The four keys as they are now; the same object until one of them changes. */
export function readMarketNow(): MarketData {
  const raws = MARKET_KEYS.map(readStoredKey);
  if (cached && raws.every((r, i) => r === cached!.raws[i])) return cached.data;
  const byKey = new Map<string, string | null>(MARKET_KEYS.map((k, i) => [k, raws[i]]));
  cached = { raws, data: readMarketData((k) => byKey.get(k) ?? null) };
  return cached.data;
}

function commit(plan: Plan): MarketWriteResult {
  if (!plan.ok) return plan;
  return writeStoredKey(plan.write.key, plan.write.value).ok ? { ok: true } : { ok: false, reason: "storage" };
}

/** Replaces the stored listings. Refused while the key can't be read. */
export function writeListings(next: Listing[]): MarketWriteResult {
  if (partOf(readStoredKey, LISTINGS_KEY).unreadable) return { ok: false, reason: "unreadable" };
  return writeStoredKey(LISTINGS_KEY, next).ok ? { ok: true } : { ok: false, reason: "storage" };
}

export function appendSale(sale: Sale): MarketWriteResult {
  return commit(appendSalePlan(readStoredKey, sale));
}

export function appendBid(bid: Bid): MarketWriteResult {
  return commit(appendBidPlan(readStoredKey, bid));
}

export function appendSupport(request: SupportRequest): MarketWriteResult {
  return commit(appendSupportPlan(readStoredKey, request));
}

function purgeProject(projectId: string): void {
  for (const w of marketPurgeOf(projectId, readStoredKey)) writeStoredKey(w.key, w.value);
}

export type MarketStore = {
  /** False until this browser's copy has been read; surfaces wait on it (P2-CUSTOMERS-7). */
  hydrated: boolean;
  data: MarketData;
  writeListings: (next: Listing[]) => MarketWriteResult;
  appendSale: (sale: Sale) => MarketWriteResult;
  appendBid: (bid: Bid) => MarketWriteResult;
  appendSupport: (request: SupportRequest) => MarketWriteResult;
};

const MarketContext = React.createContext<MarketStore | null>(null);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const data = React.useSyncExternalStore(subscribeStores, readMarketNow, () => EMPTY);
  const hydrated = data !== EMPTY;
  React.useEffect(() => onProjectDeleted(purgeProject), []);
  useJourneyMediaSweep();
  const value = React.useMemo<MarketStore>(
    () => ({ hydrated, data, writeListings, appendSale, appendBid, appendSupport }),
    [hydrated, data],
  );
  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket(): MarketStore {
  const ctx = React.useContext(MarketContext);
  if (!ctx) throw new Error("useMarket must be used inside <MarketProvider>");
  return ctx;
}
