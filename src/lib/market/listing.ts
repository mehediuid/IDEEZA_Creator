// The Main listing's pure state machine (Phase 2 spec §3.5.4, LISTING §2-3).
// `ideeza:market:listings` (T11's MarketProvider) holds every project's
// listing history; only the project's NEWEST row is "the" listing — an older
// one stays only for the log and for Relist's prefill (P2-LISTING-15).
//
// Every transition is pure: it takes the current array, the clock and an id
// maker, and returns the next array. Nothing here reads storage, so a plain
// node:test can drive the whole state machine (P2-LISTING-25).
//
// Pure, relative imports only.

import { formatDate } from "../manual/project-summary";
import type { ProjectLogEntry } from "../manual/project-read";
import type { Readiness } from "../manual/p2-types";
import { NETWORKS, LISTING_TYPES, TOKENS_BY_NETWORK } from "../brief/types";
import { normalizeAmount } from "../wallet/money";
import { auctionStateOf, timeLeftLabel } from "./auction";
import type {
  Bid,
  Listing,
  ListingChange,
  ListingEvent,
  ListingMetadata,
  ListingView,
  Sale,
  UtilityBenefit,
} from "./types";
import { sameAmount, type ListingInput } from "./listing-form";

// ─────────────────────────── normalizing the store ────────────────────────

const LISTING_STATUSES = ["live", "paused", "removed", "closed"] as const;
const LISTING_SOURCES = ["page", "brief"] as const;
const MINTING_TYPES = ["lazy", "instant"] as const;
const LISTING_CHANGES = ["rename", "description", "cover", "addProduct", "editProduct", "dropProduct"] as const;
const NETWORK_IDS = NETWORKS.map((n) => n.value);
const LISTING_TYPE_IDS = LISTING_TYPES.map((t) => t.id);
const TOKEN_IDS = new Set<string>(Object.values(TOKENS_BY_NETWORK).flat());

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : NaN;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

function isListingChange(v: unknown): v is ListingChange {
  return typeof v === "string" && (LISTING_CHANGES as readonly string[]).includes(v);
}

function normalizeBenefitsList(v: unknown): UtilityBenefit[] {
  if (!Array.isArray(v)) return [];
  const out: UtilityBenefit[] = [];
  for (const raw of v) {
    if (!isRecord(raw)) continue;
    if (typeof raw.id !== "string" || !raw.id || typeof raw.name !== "string") continue;
    const d = isRecord(raw.duration) ? raw.duration : {};
    if (typeof d.months === "number" && [1, 3, 6, 12].includes(d.months)) {
      out.push({ id: raw.id, name: raw.name, duration: { months: d.months as 1 | 3 | 6 | 12 } });
    } else if (d.whileHeld === true) {
      out.push({ id: raw.id, name: raw.name, duration: { whileHeld: true } });
    }
    if (out.length >= 5) break;
  }
  return out;
}

function normalizeMetadata(v: unknown): ListingMetadata {
  const m = isRecord(v) ? v : {};
  const products = Array.isArray(m.products)
    ? m.products
        .filter(isRecord)
        .filter((p) => typeof p.id === "string" && typeof p.name === "string")
        .map((p) => ({ id: p.id as string, name: p.name as string }))
    : [];
  const cover = isRecord(m.cover) && typeof m.cover.buildId === "string" && typeof m.cover.productId === "string"
    ? { buildId: m.cover.buildId, productId: m.cover.productId }
    : null;
  const at = num(m.at);
  return { name: str(m.name), description: str(m.description), products, cover, at: Number.isFinite(at) ? at : 0 };
}

function normalizeEvents(v: unknown): ListingEvent[] {
  if (!Array.isArray(v)) return [];
  const out: ListingEvent[] = [];
  for (const raw of v) {
    if (!isRecord(raw)) continue;
    const at = num(raw.at);
    if (!Number.isFinite(at)) continue;
    const kind = raw.kind;
    if (kind === "listed" || kind === "relisted" || kind === "removed" || kind === "closed") {
      out.push({ kind, at });
    } else if (kind === "updated") {
      out.push({ kind: "updated", at, ...(typeof raw.price === "string" ? { price: raw.price } : {}) });
    } else if (kind === "paused") {
      const changes = Array.isArray(raw.changes) ? raw.changes.filter(isListingChange) : [];
      out.push({ kind: "paused", at, changes });
    }
  }
  return out;
}

/** Drops a malformed row; keeps the rest. A non-array (corrupt JSON, once the
 *  caller's `JSON.parse` has already failed to `null`/`undefined`) reads as
 *  `[]` — the page says nothing is listed rather than crashing. */
export function normalizeListings(raw: unknown): Listing[] {
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const out: Listing[] = [];
  for (const row of value) {
    const l = normalizeListingRow(row);
    if (l) out.push(l);
  }
  return out;
}

function normalizeListingRow(raw: unknown): Listing | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" && raw.id ? raw.id : null;
  const projectId = typeof raw.projectId === "string" && raw.projectId ? raw.projectId : null;
  const type = oneOf(raw.type, LISTING_TYPE_IDS);
  const status = oneOf(raw.status, LISTING_STATUSES);
  const mintingType = oneOf(raw.mintingType, MINTING_TYPES);
  const network = oneOf(raw.network, NETWORK_IDS);
  const source = oneOf(raw.source, LISTING_SOURCES);
  const token = typeof raw.token === "string" && TOKEN_IDS.has(raw.token) ? raw.token : null;
  if (!id || !projectId || !type || !status || !mintingType || !network || !source || !token) return null;
  const percentSelling = num(raw.percentSelling);
  if (!Number.isFinite(percentSelling) || percentSelling < 1 || percentSelling > 100) return null;
  const royaltiesPct = num(raw.royaltiesPct);
  if (!Number.isFinite(royaltiesPct)) return null;
  const listedAt = num(raw.listedAt);
  const updatedAt = num(raw.updatedAt);
  if (!Number.isFinite(listedAt) || !Number.isFinite(updatedAt)) return null;

  const listing: Listing = {
    id,
    projectId,
    slot: "main",
    source,
    listedAt,
    updatedAt,
    type,
    token: token as Listing["token"],
    percentSelling,
    royaltiesPct,
    mintingType,
    network,
    collection: str(raw.collection),
    benefits: normalizeBenefitsList(raw.benefits),
    metadata: normalizeMetadata(raw.metadata),
    status,
    events: normalizeEvents(raw.events),
  };
  if (typeof raw.price === "string") listing.price = raw.price;
  if (typeof raw.minBid === "string") listing.minBid = raw.minBid;
  if (typeof raw.auctionBuyNow === "string") listing.auctionBuyNow = raw.auctionBuyNow;
  const endsAt = num(raw.endsAt);
  if (Number.isFinite(endsAt)) listing.endsAt = endsAt;
  const endedAt = num(raw.endedAt);
  if (Number.isFinite(endedAt)) listing.endedAt = endedAt;
  if (isRecord(raw.pause)) {
    const at = num(raw.pause.at);
    const changes = Array.isArray(raw.pause.changes) ? raw.pause.changes.filter(isListingChange) : [];
    if (Number.isFinite(at)) listing.pause = { at, changes };
  }
  return listing;
}

// ─────────────────────────────── the view ──────────────────────────────────

function newestListingOf(ls: Listing[], projectId: string): Listing | null {
  const rows = ls.filter((l) => l.projectId === projectId && l.slot === "main");
  if (!rows.length) return null;
  return rows.reduce((a, b) => (b.listedAt >= a.listedAt ? b : a));
}

/** The project's newest listing, read with its sales and bids — a live
 *  auction through MARKETPLACE's own `auctionStateOf`, and a closed one that
 *  had bids as `unpaid` (Close found none payable). No `ready` input:
 *  readiness is checked by callers (C5). */
export function listingViewOf(
  projectId: string,
  f: { listings: Listing[]; sales: Sale[]; bids: Bid[]; now: number; current: ListingMetadata },
): ListingView {
  const listing = newestListingOf(f.listings, projectId);
  if (!listing) return { kind: "none" };
  const sale = f.sales.find((s) => s.listingId === listing.id && s.item.nft === "main");
  if (sale) return { kind: "sold", listing, sale };
  if (listing.status === "live") {
    const auction = listing.type === "auction" ? auctionStateOf(listing, f.bids, f.now) : null;
    return { kind: "live", listing, auction };
  }
  if (listing.status === "paused") {
    return { kind: "paused", listing, changed: metadataDiff(listing.metadata, f.current) };
  }
  if (listing.status === "removed") return { kind: "ended", listing, why: "removed" };
  const unpaid = f.bids.some((b) => b.listingId === listing.id);
  return unpaid ? { kind: "ended", listing, why: "noBids", unpaid: true } : { kind: "ended", listing, why: "noBids" };
}

/** The listing-driven part of the status line (§3.2). `live` and `paused`
 *  stand on their own; `none`/`ended`/`sold` need the mint phrase or the
 *  ownership split too, so `statusLineOf` (T10) composes those itself from
 *  `ProjectView`. */
export function listingStatusLine(v: ListingView, now: number): string | null {
  if (v.kind === "live") {
    if (v.listing.type === "buyNow") {
      const price = v.listing.price ? `${v.listing.price} ${v.listing.token}` : "no price set";
      return `Listed ${formatDate(v.listing.listedAt)} · Buy now · ${price}`;
    }
    const a = v.auction;
    if (!a || a.phase === "ended") return "Auction ended · close it to settle";
    const left = timeLeftLabel(a.msLeft);
    return a.top ? `Auction · top bid ${a.top.amount} ${v.listing.token} · ${left}` : `Auction · no bids yet · ${left}`;
  }
  if (v.kind === "paused") {
    return `Paused ${formatDate(v.listing.pause?.at ?? v.listing.updatedAt)} · relist it from the Marketplace block`;
  }
  void now;
  return null;
}

// ────────────────────────────── transitions ────────────────────────────────

export type Result = { ok: true; listings: Listing[] } | { ok: false; reason: string };
export type Ids = { listing: () => string };

const OPEN_STATUSES = new Set<Listing["status"]>(["live", "paused"]);

/** A typed amount in its one written form (§3.1: "0.050" → "0.05"); as typed when it doesn't parse. */
function amountOf(typed: string): string {
  return normalizeAmount(typed) ?? typed;
}

function sameEditableFields(l: Listing, i: ListingInput): boolean {
  const royalties = Number(i.royalties) || 0;
  const percentSelling = i.percentSelling ?? l.percentSelling;
  return (
    l.token === i.token &&
    sameAmount(l.price ?? "", i.price) &&
    l.percentSelling === percentSelling &&
    l.royaltiesPct === royalties &&
    JSON.stringify(l.benefits) === JSON.stringify(i.benefits)
  );
}

/**
 * Whether the project may take a NEW listing is the caller's call, made with
 * `listingViewOf` and `can(viewer, "listing.create", ctx)` (permissions.ts
 * NEEDS `listing ∈ {none, ended, sold}`): a *sold* listing's own `status`
 * field is still "live" forever (sold is derived, never written back, C12),
 * so a raw-status check here could not tell a genuinely-open listing apart
 * from a sold one and would wrongly block "List another share" (P2-LISTING-16)
 * — this transition trusts the caller and only validates the new row's own
 * fields.
 */
export function createListing(
  ls: Listing[],
  projectId: string,
  i: ListingInput,
  meta: ListingMetadata,
  source: Listing["source"],
  now: number,
  ids: Ids,
): Result {
  if (!i.token) return { ok: false, reason: "Choose a token." };
  if (i.percentSelling === null) return { ok: false, reason: "Choose how much you're selling." };
  if (!i.network) return { ok: false, reason: "The mint's network isn't known." };
  const endsAt = i.type === "auction" ? new Date(i.endsAt).getTime() : NaN;
  if (i.type === "auction" && (!i.endsAt || !Number.isFinite(endsAt))) {
    return { ok: false, reason: "Set the date the auction ends." };
  }

  const listing: Listing = {
    id: ids.listing(),
    projectId,
    slot: "main",
    source,
    listedAt: now,
    updatedAt: now,
    type: i.type,
    token: i.token,
    percentSelling: i.percentSelling,
    royaltiesPct: Number(i.royalties) || 0,
    mintingType: i.mintingType,
    network: i.network,
    collection: i.collection,
    benefits: i.benefits,
    metadata: meta,
    status: "live",
    events: [{ kind: "listed", at: now }],
  };
  if (i.type === "auction") {
    listing.minBid = amountOf(i.minBid);
    if (i.auctionBuyNow.trim()) listing.auctionBuyNow = amountOf(i.auctionBuyNow);
    listing.endsAt = endsAt;
  } else {
    listing.price = amountOf(i.price);
  }
  return { ok: true, listings: [...ls, listing] };
}

/** Buy now, live or paused only — an auction has no Edit (P2-LISTING-7). */
export function editListing(ls: Listing[], id: string, i: ListingInput, now: number): Result {
  const idx = ls.findIndex((l) => l.id === id);
  if (idx === -1) return { ok: false, reason: "This listing no longer exists." };
  const listing = ls[idx];
  if (listing.type === "auction") return { ok: false, reason: "An auction can't be edited." };
  if (!OPEN_STATUSES.has(listing.status)) {
    return { ok: false, reason: "Only a live or paused listing can be edited." };
  }
  if (!i.token) return { ok: false, reason: "Choose a token." };
  if (sameEditableFields(listing, i)) {
    return { ok: false, reason: "Change the price, the selling percentage, the royalties or a benefit to update." };
  }
  const price = amountOf(i.price);
  const next: Listing = {
    ...listing,
    token: i.token,
    price,
    percentSelling: i.percentSelling ?? listing.percentSelling,
    royaltiesPct: Number(i.royalties) || 0,
    benefits: i.benefits,
    updatedAt: now,
    events: [...listing.events, { kind: "updated", at: now, price }],
  };
  const listings = ls.slice();
  listings[idx] = next;
  return { ok: true, listings };
}

/** Buy now or auction, live or paused. */
export function removeListing(ls: Listing[], id: string, now: number): Result {
  const idx = ls.findIndex((l) => l.id === id);
  if (idx === -1) return { ok: false, reason: "This listing no longer exists." };
  const listing = ls[idx];
  if (!OPEN_STATUSES.has(listing.status)) {
    return { ok: false, reason: "Only a live or paused listing can be removed." };
  }
  const next: Listing = {
    ...listing,
    status: "removed",
    endedAt: now,
    events: [...listing.events, { kind: "removed", at: now }],
  };
  const listings = ls.slice();
  listings[idx] = next;
  return { ok: true, listings };
}

/** Live buy now pauses; an already-paused listing appends the new change
 *  reason instead of starting a second pause (P2-LISTING-13). An auction is
 *  never paused — `editGateOf` blocks the write before this runs. */
export function pauseForEdit(ls: Listing[], id: string, change: ListingChange, now: number): Result {
  const idx = ls.findIndex((l) => l.id === id);
  if (idx === -1) return { ok: false, reason: "This listing no longer exists." };
  const listing = ls[idx];
  if (listing.type === "auction") return { ok: false, reason: "An auction can't be paused." };
  if (listing.status !== "live" && listing.status !== "paused") {
    return { ok: false, reason: "Only a live or paused listing can be paused." };
  }
  const changes = Array.from(new Set([...(listing.pause?.changes ?? []), change]));
  const next: Listing = {
    ...listing,
    status: "paused",
    pause: { at: listing.pause?.at ?? now, changes },
    events: [...listing.events, { kind: "paused", at: now, changes }],
  };
  const listings = ls.slice();
  listings[idx] = next;
  return { ok: true, listings };
}

/** Paused only, and only once `ready` (VIDEO's readiness, checked by the
 *  caller) — otherwise "Finish the items above to relist." (P2-LISTING-14).
 *  `opts.creatorPct` (the maker's share now, `ownership.maker`) re-checks the
 *  listing's own percent, which a co-owner written meanwhile may have taken (R1-1). */
export function relistListing(
  ls: Listing[],
  id: string,
  meta: ListingMetadata,
  ready: boolean,
  now: number,
  opts: { creatorPct?: number } = {},
): Result {
  const idx = ls.findIndex((l) => l.id === id);
  if (idx === -1) return { ok: false, reason: "This listing no longer exists." };
  const listing = ls[idx];
  if (listing.status !== "paused") return { ok: false, reason: "Only a paused listing can be relisted." };
  if (!ready) return { ok: false, reason: "Finish the items above to relist." };
  if (opts.creatorPct !== undefined && listing.percentSelling > opts.creatorPct) {
    return { ok: false, reason: `You hold ${Math.max(0, opts.creatorPct)}% now — lower the selling percentage in Edit, then relist.` };
  }
  const next: Listing = {
    ...listing,
    status: "live",
    metadata: meta,
    updatedAt: now,
    events: [...listing.events, { kind: "relisted", at: now }],
  };
  delete next.pause;
  const listings = ls.slice();
  listings[idx] = next;
  return { ok: true, listings };
}

/** A live auction, once it has ended, with no winning bid — the caller
 *  decides that (it calls MARKETPLACE's sale writer instead when there is a
 *  winner, and never calls this). */
export function closeListing(ls: Listing[], id: string, now: number): Result {
  const idx = ls.findIndex((l) => l.id === id);
  if (idx === -1) return { ok: false, reason: "This listing no longer exists." };
  const listing = ls[idx];
  if (listing.type !== "auction") return { ok: false, reason: "Only an auction can be closed this way." };
  if (listing.status !== "live") return { ok: false, reason: "Only a live auction can be closed." };
  const endsAt = listing.endsAt ?? now;
  if (now < endsAt) return { ok: false, reason: "The auction hasn't ended yet." };
  const next: Listing = {
    ...listing,
    status: "closed",
    endedAt: now,
    events: [...listing.events, { kind: "closed", at: now }],
  };
  const listings = ls.slice();
  listings[idx] = next;
  return { ok: true, listings };
}

/** The delete sweep (§3.1, P2-LISTING-19). */
export function dropProjectListings(ls: Listing[], projectId: string): Listing[] {
  return ls.filter((l) => l.projectId !== projectId);
}

// ───────────────────────── paused card & the log ───────────────────────────

/** What buyers would see differently: ["the name", "1 product added"]. */
export function metadataDiff(was: ListingMetadata, now: ListingMetadata): string[] {
  const out: string[] = [];
  if (was.name !== now.name) out.push("the name");
  if (was.description !== now.description) out.push("the description");
  const wasIds = new Set(was.products.map((p) => p.id));
  const nowIds = new Set(now.products.map((p) => p.id));
  const added = now.products.filter((p) => !wasIds.has(p.id)).length;
  const removed = was.products.filter((p) => !nowIds.has(p.id)).length;
  if (added === 1) out.push("1 product added");
  else if (added > 1) out.push(`${added} products added`);
  if (removed === 1) out.push("1 product removed");
  else if (removed > 1) out.push(`${removed} products removed`);
  const wasNameById = new Map(was.products.map((p) => [p.id, p.name]));
  const renamed = now.products.filter((p) => {
    const before = wasNameById.get(p.id);
    return before !== undefined && before !== p.name;
  }).length;
  if (renamed === 1) out.push("1 product renamed");
  else if (renamed > 1) out.push(`${renamed} products renamed`);
  if (JSON.stringify(was.cover) !== JSON.stringify(now.cover)) out.push("the cover");
  return out;
}

export type RelistChecklistItem = { id: string; label: string; ok: boolean; href?: string };

/** The Paused card's checklist (P2-LISTING-14 as changed): videos, plus the
 *  metadata note. The image and project-video rows are dropped. */
export function relistChecklist(readiness: Readiness, diff: string[]): RelistChecklistItem[] {
  const videosRule = readiness.rules.find((r) => r.id === "videos");
  const videosOk = videosRule ? videosRule.ok : true;
  const videos: RelistChecklistItem = { id: "videos", label: "An AI video for every product", ok: videosOk };
  if (!videosOk) videos.href = "generate-videos";
  const metadata: RelistChecklistItem = {
    id: "metadata",
    label: diff.length
      ? `Updated NFT metadata — updates: ${diff.join(", ")}`
      : "Updated NFT metadata — updated when you relist",
    ok: true,
  };
  return [videos, metadata];
}

/** Every event of every listing this project ever had, newest first — the
 *  raw facts; the exact line text is `logLinesOf`'s (T10). */
export function listingLogOf(ls: Listing[], projectId: string): ProjectLogEntry[] {
  const rows = ls.filter((l) => l.projectId === projectId && l.slot === "main");
  const out: ProjectLogEntry[] = [];
  for (const l of rows) {
    for (const event of l.events) out.push({ kind: "listing", at: event.at, event });
  }
  return out.sort((a, b) => b.at - a.at);
}
