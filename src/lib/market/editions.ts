// The product page's Physical / Virtual NFT tracks (Phase 2 spec §3.5.5,
// P2-TABS-24…28): a lazy-minted batch per kind × use, gated by the project's
// mint and listing state, listed against the project's own collection and
// chain. Every track and sale here is a labelled "Testnet demo" record.
//
// Pure, relative imports only, so node:test loads the compiled module.

import type { Intent } from "../brief/types";
import { ROYALTY_MAX, ROYALTY_MIN } from "../brief/types";
import { toMicros } from "../wallet/money";
import type { EditionKind, EditionTrack, EditionUse, ListingView, Sale } from "./types";
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
 *  Main sale, leaves editions exactly as they were. */
export function editionsHiddenWith(mainView: ListingView): boolean {
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
