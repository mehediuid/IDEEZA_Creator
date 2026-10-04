// The product page's Physical / Virtual NFT tracks (Phase 2 spec §3.5.5,
// P2-TABS-24…28): a lazy-minted batch per kind × use, gated by the project's
// mint and listing state, listed against the project's own collection and
// chain. Every track and sale here is a labelled "Testnet demo" record.
//
// Pure, relative imports only, so node:test loads the compiled module.

import type { Intent, Network } from "../brief/types";
import { ROYALTY_MAX, ROYALTY_MIN } from "../brief/types";
import { normalizeAmount, toMicros } from "../wallet/money";
import type { EditionKind, EditionTrack, EditionUse, Listing, ListingView, Sale } from "./types";
import { randomId } from "./sales";

// ───────────────────────── normalizer ─────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const KINDS = new Set<EditionKind>(["physical", "virtual"]);
const USES = new Set<EditionUse>(["private", "commercial"]);

function supplyIn(v: unknown): EditionTrack["supply"] | null {
  if (!isRecord(v) || !isNum(v.total) || v.total < 1) return null;
  const la = v.lastAdded;
  if (la === undefined) return { total: v.total };
  if (isRecord(la) && isNum(la.n) && isNum(la.at)) return { total: v.total, lastAdded: { n: la.n, at: la.at } };
  return { total: v.total };
}

type TrackListing = NonNullable<EditionTrack["listing"]>;
const TOKENS = new Set(["ETH", "WETH", "USDC", "USDT", "MATIC"]);

function listingIn(v: unknown): TrackListing | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) return null;
  const { token, regular, extended, royaltyPct, listedAt, updatedAt } = v;
  if (!isStr(token) || !TOKENS.has(token) || !isStr(regular) || !isStr(extended)) return null;
  if (toMicros(regular) === null || toMicros(extended) === null) return null;
  if (!isNum(royaltyPct) || !isNum(listedAt) || !isNum(updatedAt)) return null;
  return { token: token as TrackListing["token"], regular, extended, royaltyPct, listedAt, updatedAt };
}

/** Every stored `EditionTrack`, malformed rows dropped — never repaired. */
export function normalizeEditions(v: unknown): EditionTrack[] {
  if (!Array.isArray(v)) return [];
  const out: EditionTrack[] = [];
  for (const raw of v) {
    if (!isRecord(raw)) continue;
    const { id, projectId, productId, kind, use, supply, createdAt, listing } = raw;
    if (!isStr(id) || !isStr(projectId) || !isStr(productId)) continue;
    if (!KINDS.has(kind as EditionKind) || !USES.has(use as EditionUse)) continue;
    const s = supplyIn(supply);
    if (!s || !isNum(createdAt)) continue;
    const l = listing === null ? null : listingIn(listing);
    if (listing !== null && listing !== undefined && !l) continue;
    out.push({
      id,
      projectId,
      productId,
      kind: kind as EditionKind,
      use: use as EditionUse,
      supply: s,
      createdAt,
      lazy: true,
      listing: l,
      demo: true,
    });
  }
  return out;
}

// ───────────────────────── reads ─────────────────────────

export function tracksOf(productId: string, tracks: EditionTrack[]): EditionTrack[] {
  return tracks.filter((t) => t.productId === productId);
}

/** How many units of a track have sold (CUSTOMERS' sales for this track,
 *  P2-TABS-27's "NFTs sold {s}/{t}"). */
export function soldOf(trackId: string, sales: Sale[]): number {
  return sales.filter((s) => s.item.nft !== "main" && s.item.trackId === trackId).length;
}

// ───────────────────────── gates ─────────────────────────

export type EditionGate = { kind: "ok" } | { kind: "blocked"; reason: string };

/** The block's top gate (P2-TABS-24): first match wins, and each gate
 *  replaces the tracks entirely, with no disabled buttons. */
export function editionGate(ctx: { minted: boolean; intent: Intent | null; projectName: string }): EditionGate {
  if (!ctx.minted) {
    return { kind: "blocked", reason: `Mint ${ctx.projectName} first — its NFTs use the project's collection and blockchain.` };
  }
  if (ctx.intent === "give") {
    return { kind: "blocked", reason: `${ctx.projectName} was given to the community, so licences for it aren't sold.` };
  }
  return { kind: "ok" };
}

/** Whether a track can be *listed* (P2-TABS-26): the project's Main NFT
 *  listing must be live or paused — editions share the project's public
 *  page, collection and chain, so they can't be listed on their own. */
export function listGate(mainView: ListingView, projectName: string): EditionGate {
  if (mainView.kind === "live" || mainView.kind === "paused") return { kind: "ok" };
  return {
    kind: "blocked",
    reason: `List ${projectName} on the marketplace first — its NFTs are sold on the project's listing.`,
  };
}

/** Pausing or removing the Main listing hides or removes its editions
 *  (TABS C19-3): hidden while Main has never been listed, is paused, or was
 *  explicitly removed. An auction that simply lapsed with no bids, or a
 *  Main sale, leaves editions exactly as they were — unless that sale sold
 *  the project in full: `locked` (`view.lock !== null`) hides them all, since
 *  the maker has nothing left to sell them from (R1-2). */
export function editionsHiddenWith(mainView: ListingView, locked = false): boolean {
  if (locked) return true;
  if (mainView.kind === "none" || mainView.kind === "paused") return true;
  return mainView.kind === "ended" && mainView.why === "removed";
}

// ───────────────────────── create ─────────────────────────

export type CreateState = { availableUses: EditionUse[]; bothCreated: boolean };

/** Which uses of `kind` are still uncreated for this product (P2-TABS-25):
 *  the Create button stays while one is, and reads "Both … are created."
 *  once neither is. */
export function canCreate(tracks: EditionTrack[], productId: string, kind: EditionKind): CreateState {
  const created = new Set(
    tracksOf(productId, tracks)
      .filter((t) => t.kind === kind)
      .map((t) => t.use),
  );
  const availableUses = (["private", "commercial"] as EditionUse[]).filter((u) => !created.has(u));
  return { availableUses, bothCreated: availableUses.length === 0 };
}

export type CreateTrackInput = { use: EditionUse | null; count: number | null; confirmed: boolean };

/** Mint's validation copy for the Create dialog (P2-TABS-25), checked on
 *  press, first match wins. `null` once everything is valid. */
export function checkCreateTrack(input: CreateTrackInput): string | null {
  if (!input.use) return "Choose a use.";
  if (input.count === null || !Number.isInteger(input.count) || input.count < 1 || input.count > 10_000) {
    return "Enter a whole number from 1 to 10,000.";
  }
  if (!input.confirmed) return "Tick the box to confirm lazy minting.";
  return null;
}

export function createTrack(input: {
  projectId: string;
  productId: string;
  kind: EditionKind;
  use: EditionUse;
  count: number;
  now: number;
}): EditionTrack {
  return {
    id: randomId("ed_"),
    projectId: input.projectId,
    productId: input.productId,
    kind: input.kind,
    use: input.use,
    supply: { total: input.count },
    createdAt: input.now,
    lazy: true,
    listing: null,
    demo: true,
  };
}

// ───────────────────────── list ─────────────────────────

export type EditionListingInput = { regular: string; extended: string; royaltiesPct: number; confirmed: boolean };

function decimalPlaces(s: string): number {
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
}

const AMOUNT_SHAPE = /^\d*\.?\d*$/;

/** The Add-to-marketplace form's validation copy (P2-TABS-26), checked on
 *  press, first match wins. `null` once everything is valid. */
export function checkEditionListing(input: EditionListingInput): string | null {
  const reg = input.regular.trim();
  const ext = input.extended.trim();
  const regShape = reg !== "" && AMOUNT_SHAPE.test(reg) && Number(reg) > 0;
  const extShape = ext !== "" && AMOUNT_SHAPE.test(ext) && Number(ext) > 0;
  if (!regShape || !extShape) return "Enter a price above 0.";
  if (decimalPlaces(reg) > 6 || decimalPlaces(ext) > 6) return "Use at most 6 decimal places.";
  const regMicros = toMicros(reg);
  const extMicros = toMicros(ext);
  if (regMicros === null || extMicros === null) return "Use at most 6 decimal places.";
  if (extMicros < regMicros) return "Extended can't cost less than Regular.";
  if (!Number.isInteger(input.royaltiesPct) || input.royaltiesPct < ROYALTY_MIN || input.royaltiesPct > ROYALTY_MAX) {
    return `Royalties are ${ROYALTY_MIN}–${ROYALTY_MAX} %.`;
  }
  if (!input.confirmed) return "Tick the box to confirm the listing.";
  return null;
}

// ───────────────────────── the track's transitions (T27) ─────────────────────────
// Each returns the next list, or null when the track isn't there (another tab
// removed it) or isn't in the state the change needs. Callers re-read the
// stored tracks just before applying one, then write the result once.

export type TrackTerms = { token: TrackListing["token"]; regular: string; extended: string; royaltyPct: number };

function mapTrack(tracks: EditionTrack[], trackId: string, f: (t: EditionTrack) => EditionTrack | null): EditionTrack[] | null {
  const at = tracks.findIndex((t) => t.id === trackId);
  if (at === -1) return null;
  const next = f(tracks[at]);
  if (!next) return null;
  return tracks.map((t, i) => (i === at ? next : t));
}

/** The terms with each price in its one written form (§3.1: "0.010" → "0.01"). */
function termsOf(terms: TrackTerms): TrackTerms {
  return { ...terms, regular: normalizeAmount(terms.regular) ?? terms.regular, extended: normalizeAmount(terms.extended) ?? terms.extended };
}

/** P2-TABS-26: an unlisted track goes on sale at `terms`. */
export function listTrack(tracks: EditionTrack[], trackId: string, terms: TrackTerms, now: number): EditionTrack[] | null {
  return mapTrack(tracks, trackId, (t) =>
    t.listing ? null : { ...t, listing: { ...termsOf(terms), listedAt: now, updatedAt: now } },
  );
}

/** P2-TABS-27 Edit: a listed track's token, prices and royalties; use and supply stay. */
export function editTrackListing(tracks: EditionTrack[], trackId: string, terms: TrackTerms, now: number): EditionTrack[] | null {
  return mapTrack(tracks, trackId, (t) =>
    t.listing ? { ...t, listing: { ...termsOf(terms), listedAt: t.listing.listedAt, updatedAt: now } } : null,
  );
}

/** P2-TABS-27 Remove listing: back to "Add to marketplace"; the supply and its sales stay. */
export function unlistTrack(tracks: EditionTrack[], trackId: string): EditionTrack[] | null {
  return mapTrack(tracks, trackId, (t) => (t.listing ? { ...t, listing: null } : null));
}

/** P2-TABS-27 Add NFTs: `n` more lazy NFTs on the track, remembered as its "+{n} new". */
export function addToSupply(tracks: EditionTrack[], trackId: string, n: number, now: number): EditionTrack[] | null {
  return mapTrack(tracks, trackId, (t) => ({ ...t, supply: { total: t.supply.total + n, lastAdded: { n, at: now } } }));
}

/** Removing the Main listing removes its editions' listings too (spec C23, TABS T3). */
export function unlistProjectTracks(tracks: EditionTrack[], projectId: string): { tracks: EditionTrack[]; removed: number } {
  let removed = 0;
  const next = tracks.map((t) => {
    if (t.projectId !== projectId || !t.listing) return t;
    removed++;
    return { ...t, listing: null };
  });
  return { tracks: next, removed };
}

/** Add NFTs' validation copy, first match wins; `null` once valid. */
export function checkAddNfts(input: { count: number | null; confirmed: boolean }): string | null {
  if (input.count === null || !Number.isInteger(input.count) || input.count < 1 || input.count > 10_000) {
    return "Enter a whole number from 1 to 10,000.";
  }
  if (!input.confirmed) return "Tick the box to add them at the listing's current prices.";
  return null;
}

/** A typed whole number, or null ("", "1.5", "abc"). */
export function wholeNumberOf(raw: string): number | null {
  const t = raw.trim();
  return /^\d+$/.test(t) ? Number(t) : null;
}

// ───────────────────────── what a track card and a summary say (T27) ─────────────────────────

export const KIND_WORD: Record<EditionKind, string> = { physical: "Physical", virtual: "Virtual" };
export const USE_WORD: Record<EditionUse, string> = { private: "Private use", commercial: "Commercial use" };
export const TIER_HELP: Record<"regular" | "extended", string> = {
  regular: "For the current version only.",
  extended: "Buyers get every future version of this design.",
};

export type TrackCard = {
  sold: number;
  total: number;
  soldOut: boolean;
  /** "NFTs sold 1/30" or "Sold out". */
  soldLine: string;
  /** The "+{n} new" badge: the last Add NFTs, until the next sale after it. */
  newBadge: string | null;
};

export function trackCardOf(track: EditionTrack, sales: Sale[]): TrackCard {
  const mine = sales.filter((s) => s.item.nft !== "main" && s.item.trackId === track.id);
  const sold = mine.length;
  const total = track.supply.total;
  const soldOut = sold >= total;
  const added = track.supply.lastAdded;
  const soldSince = added ? mine.some((s) => s.at >= added.at) : true;
  return {
    sold,
    total,
    soldOut,
    soldLine: soldOut ? "Sold out" : `NFTs sold ${sold}/${total}`,
    newBadge: added && !soldSince ? `+${added.n} new` : null,
  };
}

/** The next unit's serial number, 1-based. */
export function nextSerialOf(trackId: string, sales: Sale[]): number {
  return soldOf(trackId, sales) + 1;
}

/** One product's lines in the project page's Physical or Virtual tab (P2-TABS-28):
 *  "Private use · Listed · 0/30 sold", "Commercial use · Not created". */
export type EditionSummaryRow = { productId: string; name: string; lines: string[] };

/** Empty ([]) until some product has a track of this kind; then one row per product —
 *  a product without one reads "Not created" twice — and in a preview only listed lines. */
export function editionSummaryOf(
  products: { id: string; name: string }[],
  tracks: EditionTrack[],
  sales: Sale[],
  kind: EditionKind,
  opts: { listedOnly: boolean },
): EditionSummaryRow[] {
  const ids = new Set(products.map((p) => p.id));
  if (!tracks.some((t) => t.kind === kind && ids.has(t.productId))) return [];
  const rows: EditionSummaryRow[] = [];
  for (const p of products) {
    const mine = tracksOf(p.id, tracks).filter((t) => t.kind === kind);
    const lines: string[] = [];
    for (const use of ["private", "commercial"] as EditionUse[]) {
      const t = mine.find((x) => x.use === use);
      if (opts.listedOnly && !t?.listing) continue;
      if (!t) {
        lines.push(`${USE_WORD[use]} · Not created`);
        continue;
      }
      const card = trackCardOf(t, sales);
      const state = t.listing ? "Listed" : "Not listed";
      lines.push(`${USE_WORD[use]} · ${state} · ${card.soldOut ? "Sold out" : `${card.sold}/${card.total} sold`}`);
    }
    if (lines.length) rows.push({ productId: p.id, name: p.name, lines });
  }
  return rows;
}

/** A buyer's offers (spec §2.4, TABS T2): every listed track whose Main listing
 *  doesn't hide it, grouped by product in the products' order. None while the
 *  project is `locked` (sold in full, R1-2). */
export function editionOffersOf(
  products: { id: string; name: string }[],
  tracks: EditionTrack[],
  mainView: ListingView,
  locked = false,
): { productId: string; name: string; tracks: EditionTrack[] }[] {
  if (editionsHiddenWith(mainView, locked)) return [];
  const order: Record<EditionKind, number> = { physical: 0, virtual: 1 };
  const useOrder: Record<EditionUse, number> = { private: 0, commercial: 1 };
  return products
    .map((p) => ({
      productId: p.id,
      name: p.name,
      tracks: tracksOf(p.id, tracks)
        .filter((t) => t.listing !== null)
        .sort((a, b) => order[a.kind] - order[b.kind] || useOrder[a.use] - useOrder[b.use]),
    }))
    .filter((g) => g.tracks.length > 0);
}

/** The chain and collection every edition shares with its project (P2-TABS-24, errata 9):
 *  the mint record's, else the Main listing's, else a v1 mint's draft. Null when none says. */
export function editionChainOf(
  record: { network: Network; collection: string } | null,
  main: Pick<Listing, "network" | "collection"> | null,
  draft: { network: Network | null; collection: string } | null,
): { network: Network; collection: string } | null {
  const from = record ?? main ?? (draft?.network ? { network: draft.network, collection: draft.collection } : null);
  if (!from || !from.collection.trim()) return null;
  return { network: from.network, collection: from.collection.trim() };
}
