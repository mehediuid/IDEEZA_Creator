// Explore marketplace's grid (Phase 2 spec §3.5.5, P2-MARKETPLACE-4…7): the
// For sale · Sold · Purchased tabs, search, the type filter, sort, paging
// and the URL codec. A project with copies on sale is an item too, with or
// without a Main listing (owner, 2026-10-11: copies are listed on their own). Pages hold 12 items, the My projects rule (LST-28): the
// URL only ever carries a param that differs from its default.
//
// Pure, relative imports only, so node:test loads the compiled module.

import type { Amount, DemoBuyerId } from "../wallet/types";
import type { Token } from "../brief/types";
import { compareAmounts, formatAmount } from "../wallet/money";
import { auctionStateOf, timeLeftLabel } from "./auction";
import { liveTracksOf } from "./editions";
import { PROJECT_SCOPE, type AuctionState, type Bid, type EditionKind, type EditionTrack, type Listing, type Sale } from "./types";
import { formatDate, formatDateTime } from "../manual/public";

export const PAGE_SIZE = 12;

/** The project fields the grid reads — whatever `projectSummary` (T10)
 *  already derives, kept minimal here so this module doesn't import the
 *  whole summary graph. */
export type MarketProjectLike = {
  id: string;
  name: string;
  cover: string | null;
  productCount: number;
  /** Sold in full (`summary.lock !== null`): its copies are off the marketplace. */
  locked?: boolean;
};

/** A project's copies on sale now, of the whole project or of its products: listed, not sold out. */
export type CopyOffer = {
  count: number;
  kinds: EditionKind[];
  /** The lowest price, in the first token by name (no rate between test tokens). */
  from: { amount: Amount; token: Token };
  /** The kind that lowest price is for: the card lights its tag. */
  fromKind: EditionKind;
  /** Each kind's lowest price and how many offers it has: a card's tag shows it when clicked. */
  byKind: Partial<Record<EditionKind, KindOffer>>;
  /** The newest listing among them. */
  listedAt: number;
};

/** One kind's lowest price (in its first token by name) and how many offers of it are on sale. */
export type KindOffer = { amount: Amount; token: Token; count: number };

/** The lowest of these prices, in the first token by name; null for none. */
export function lowestOf(prices: readonly { amount: Amount; token: Token }[]): KindOffer | null {
  if (!prices.length) return null;
  const token = prices.map((p) => p.token).sort()[0] as Token;
  const amount = prices
    .filter((p) => p.token === token)
    .map((p) => p.amount)
    .sort(compareAmounts)[0];
  return { amount, token, count: prices.length };
}

export type MarketItem = {
  projectId: string;
  name: string;
  cover: string | null;
  productCount: number;
  /** Another creator's name, on a sample's card (sample-market.ts); absent for this browser's own. */
  creator?: string;
  /** The Main listing; null for a project that sells only copies. */
  listing: Listing | null;
  /** Its copies on sale, beside a live Main listing or alone; null on a sold card. */
  copies: CopyOffer | null;
  status: "live" | "ended" | "sold";
  sale: Sale | null;
  auction: AuctionState | null;
  /** The active buyer's own share, when they hold one. */
  holding: { sharePct: number } | null;
  /** What "newest" sorts by: the sale time once sold, else the listing time. */
  sortAt: number;
};

/** The copies a project has on sale, or null. None once it's sold in full (R1-2). */
export function copyOfferOf(tracks: readonly EditionTrack[], sales: Sale[], locked: boolean): CopyOffer | null {
  const live = liveTracksOf(tracks, sales, locked);
  if (!live.length) return null;
  const listings = live.map((t) => t.listing as NonNullable<EditionTrack["listing"]>);
  const token = listings.map((l) => l.token).sort()[0] as Token;
  const cheapest = live
    .filter((t) => t.listing?.token === token)
    .sort((x, y) => compareAmounts((x.listing as NonNullable<EditionTrack["listing"]>).regular, (y.listing as NonNullable<EditionTrack["listing"]>).regular))[0];
  const amount = (cheapest.listing as NonNullable<EditionTrack["listing"]>).regular;
  const kinds = (["physical", "virtual"] as EditionKind[]).filter((k) => live.some((t) => t.kind === k));
  // A tag's price is what the details page sells under that tab: the whole project's copies of that kind, or,
  // with none, its products' (which their own pages sell).
  const byKind: CopyOffer["byKind"] = {};
  for (const k of kinds) {
    const scoped = live.filter((t) => t.kind === k && t.productId === PROJECT_SCOPE);
    const pool = scoped.length ? scoped : live.filter((t) => t.kind === k);
    const of = lowestOf(pool.map((t) => ({ amount: (t.listing as NonNullable<EditionTrack["listing"]>).regular, token: (t.listing as NonNullable<EditionTrack["listing"]>).token })));
    if (of) byKind[k] = of;
  }
  return { count: live.length, kinds, from: { amount, token }, fromKind: cheapest.kind, byKind, listedAt: Math.max(...listings.map((l) => l.listedAt)) };
}

/** One card per live (or ended-unclosed) listing, one per sale, and one per project whose copies
 *  are on sale without a live Main card, filtered by the active buyer's holdings for Purchased.
 *  Paused and removed listings are never items here (P2-MARKETPLACE-4): they appear in no tab,
 *  but a project's copies still do. `tracks` is every project's copy tracks. */
export function marketItemsOf(
  listings: Listing[],
  projects: MarketProjectLike[],
  sales: Sale[],
  bids: Bid[],
  buyerId: DemoBuyerId | null,
  now: number,
  tracks: readonly EditionTrack[] = [],
): MarketItem[] {
  const byProject = new Map(projects.map((p) => [p.id, p]));
  const offers = new Map<string, CopyOffer>();
  for (const p of projects) {
    const offer = copyOfferOf(
      tracks.filter((t) => t.projectId === p.id),
      sales,
      p.locked === true,
    );
    if (offer) offers.set(p.id, offer);
  }
  const out: MarketItem[] = [];
  for (const listing of listings) {
    const sale = sales.find((s) => s.listingId === listing.id && s.item.nft === "main") ?? null;
    // Live (including an ended-but-not-yet-closed auction) or already sold.
    // A paused, removed, or closed-with-no-sale (no bids) listing shows in
    // no tab (P2-MARKETPLACE-4).
    if (listing.status !== "live" && !sale) continue;
    const project = byProject.get(listing.projectId);
    if (!project) continue;
    const auction = listing.type === "auction" ? auctionStateOf(listing, bids, now) : null;
    const status: MarketItem["status"] = sale ? "sold" : auction?.phase === "ended" ? "ended" : "live";
    const holding =
      buyerId && sale && sale.buyerId === buyerId && sale.item.nft === "main" ? { sharePct: sale.item.sharePct } : null;
    out.push({
      projectId: listing.projectId,
      name: project.name,
      cover: project.cover,
      productCount: project.productCount,
      listing,
      copies: sale ? null : (offers.get(project.id) ?? null),
      status,
      sale,
      auction,
      holding,
      sortAt: sale ? sale.at : listing.listedAt,
    });
  }
  for (const [projectId, copies] of offers) {
    if (out.some((i) => i.projectId === projectId && i.status !== "sold")) continue;
    const project = byProject.get(projectId) as MarketProjectLike;
    out.push({
      projectId,
      name: project.name,
      cover: project.cover,
      productCount: project.productCount,
      listing: null,
      copies,
      status: "live",
      sale: null,
      auction: null,
      holding: null,
      sortAt: copies.listedAt,
    });
  }
  return out;
}

export type MarketQuery = {
  tab: "forSale" | "sold" | "purchased";
  q: string;
  type: "all" | "buyNow" | "auction";
  sort: "newest" | "ending" | "priceAsc" | "priceDesc";
  page: number;
};

export const DEFAULT_MARKET_QUERY: MarketQuery = { tab: "forSale", q: "", type: "all", sort: "newest", page: 1 };

export type MarketFilterResult = {
  counts: { forSale: number; sold: number; purchased: number };
  items: MarketItem[];
  pages: number;
};

function priceAmountOf(item: MarketItem): Amount {
  if (!item.listing) return item.copies?.from.amount ?? "0";
  if (item.listing.type === "buyNow") return item.listing.price ?? "0";
  return item.auction?.top?.amount ?? item.listing.minBid ?? "0";
}

function priceTokenOf(item: MarketItem): Token {
  return item.listing?.token ?? item.copies?.from.token ?? "ETH";
}

/** A copies card is bought now, at a fixed price. */
const typeOf = (item: MarketItem): "buyNow" | "auction" => item.listing?.type ?? "buyNow";

/** For sale · Sold · Purchased (P2-MARKETPLACE-4…5). Auctions that have
 *  ended but aren't closed yet sort last within For sale. Price sorts order
 *  by token name first, then amount — test tokens are never compared across
 *  one another, because there's no rate between them. */
export function filterMarket(items: MarketItem[], query: MarketQuery): MarketFilterResult {
  const forSale = items.filter((i) => i.status !== "sold");
  const sold = items.filter((i) => i.status === "sold");
  const purchased = items.filter((i) => i.holding !== null);
  const counts = { forSale: forSale.length, sold: sold.length, purchased: purchased.length };

  let pool = query.tab === "sold" ? sold : query.tab === "purchased" ? purchased : forSale;

  const q = query.q.trim().toLowerCase();
  if (q) pool = pool.filter((i) => i.name.toLowerCase().includes(q));

  if (query.tab !== "purchased" && query.type !== "all") {
    pool = pool.filter((i) => typeOf(i) === query.type);
  }

  const sorted = [...pool];
  if (query.tab === "purchased") {
    sorted.sort((a, b) => b.sortAt - a.sortAt);
  } else if (query.sort === "ending") {
    sorted.sort((a, b) => {
      const aRun = a.status === "live" && a.auction !== null;
      const bRun = b.status === "live" && b.auction !== null;
      if (aRun && bRun) return a.auction!.msLeft - b.auction!.msLeft;
      if (aRun) return -1;
      if (bRun) return 1;
      return b.sortAt - a.sortAt;
    });
  } else if (query.sort === "priceAsc" || query.sort === "priceDesc") {
    const dir = query.sort === "priceAsc" ? 1 : -1;
    sorted.sort((a, b) => {
      const tokenCmp = priceTokenOf(a).localeCompare(priceTokenOf(b));
      if (tokenCmp !== 0) return tokenCmp;
      return dir * compareAmounts(priceAmountOf(a), priceAmountOf(b));
    });
  } else {
    // "newest listed": ended-unclosed auctions sort last within For sale.
    sorted.sort((a, b) => {
      if (query.tab === "forSale") {
        const aEnded = a.status === "ended" ? 1 : 0;
        const bEnded = b.status === "ended" ? 1 : 0;
        if (aEnded !== bEnded) return aEnded - bEnded;
      }
      return b.sortAt - a.sortAt;
    });
  }

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(query.page) || 1), pages);
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return { counts, items: pageItems, pages };
}

function buyerName(id: DemoBuyerId): string {
  const names: Record<DemoBuyerId, string> = { "buyer-mira": "Mira", "buyer-leo": "Leo", "buyer-sam": "Sam" };
  return names[id];
}

export type CardTagKind = "main" | EditionKind;

/** The card's facts in the design system's Asset Card (M25, owner 2026-11-16: "the card's information is in
 *  the design system"): the status badge on the picture, the NFT tags (the one the price is for lit), the price
 *  block (label, amount, token apart), the block beside it (an auction's end, a buyer, a share) and the hover
 *  button's words. */
export type ListingCardFacts = {
  badge: string;
  tags: { kind: CardTagKind; label: string; on: boolean }[];
  price: { label: string; amount: string; token: string };
  side: { label: string; value: string } | null;
  action: "View details" | "View auction";
};

export const CARD_TAG_LABEL: Record<CardTagKind, string> = { main: "Main NFT", physical: "Physical NFT", virtual: "Virtual NFT" };

/** "0.05 MATIC" as its amount and its token. */
function priceParts(amount: Amount, token: Token): { amount: string; token: string } {
  const text = formatAmount(amount, token);
  return { amount: text.slice(0, text.length - token.length - 1), token };
}

const tagsOf = (kinds: readonly CardTagKind[], on: CardTagKind) => kinds.map((k) => ({ kind: k, label: CARD_TAG_LABEL[k], on: k === on }));

/** The facts a card shows. `tab` matters: an item the active buyer holds reads "You own …" on Purchased and
 *  "Sold for …" on Sold. `heldPct`: the share the active buyer already holds of a project still for sale. */
export function listingCardFacts(
  item: MarketItem,
  now: number,
  tab: MarketQuery["tab"] = "forSale",
  heldPct: number | null = null,
  /** The tag the viewer clicked (owner, 2026-11-16: the tags are clickable and the price follows): a copy kind
   *  shows that kind's lowest price; absent or "main", the card's own price. */
  picked: CardTagKind | null = null,
): ListingCardFacts {
  const l = item.listing;
  const copyKinds = item.copies?.kinds ?? [];
  const kindOffer = picked && picked !== "main" && tab !== "purchased" && !item.sale ? (item.copies?.byKind[picked] ?? null) : null;
  if (picked && picked !== "main" && kindOffer) {
    const base = listingCardFacts(item, now, tab, heldPct);
    return {
      ...base,
      tags: base.tags.map((t) => ({ ...t, on: t.kind === picked })),
      price: { label: kindOffer.count > 1 ? "From" : "Current price", ...priceParts(kindOffer.amount, kindOffer.token) },
      side: null,
      action: "View details",
    };
  }
  if (tab === "purchased" && item.holding) {
    return {
      badge: "Purchased",
      tags: tagsOf(["main"], "main"),
      price: { label: "You own", amount: `${item.holding.sharePct}%`, token: "" },
      side: item.sale ? { label: "Bought", value: formatDate(item.sale.at) } : null,
      action: "View details",
    };
  }
  if (item.sale) {
    const s = item.sale;
    const pct = s.item.nft === "main" ? s.item.sharePct : 0;
    return {
      badge: "Sold",
      tags: tagsOf(["main"], "main"),
      price: { label: pct >= 100 ? "Sold for" : `Sold for ${pct}%`, ...priceParts(s.price, s.token) },
      side: { label: "Bought by", value: buyerName(s.buyerId) },
      action: "View details",
    };
  }
  if (!l) {
    const c = item.copies as CopyOffer;
    return {
      badge: "Copies",
      tags: tagsOf(c.kinds, c.fromKind),
      price: { label: c.count > 1 ? "From" : "Current price", ...priceParts(c.from.amount, c.from.token) },
      side: null,
      action: "View details",
    };
  }
  const kinds: CardTagKind[] = ["main", ...copyKinds];
  if (l.type === "auction") {
    const state = item.auction ?? auctionStateOf(l, [], now);
    const ended = state.phase === "ended";
    return {
      badge: ended ? "Auction ended" : `Auction · ${timeLeftLabel(state.msLeft)}`,
      tags: tagsOf(kinds, "main"),
      price: { label: state.top ? (ended ? "Winning bid" : "Current bid") : "Starting bid", ...priceParts(state.top?.amount ?? l.minBid ?? "0", l.token) },
      side: { label: ended ? "Ended" : "Ends", value: formatDateTime(l.endsAt ?? now) },
      action: "View auction",
    };
  }
  const side =
    l.percentSelling < 100
      ? { label: "Share", value: `${l.percentSelling}%` }
      : heldPct !== null && heldPct > 0
        ? { label: "You own", value: `${heldPct}%` }
        : null;
  return { badge: "Buy now", tags: tagsOf(kinds, "main"), price: { label: "Current price", ...priceParts(l.price ?? "0", l.token) }, side, action: "View details" };
}

// ───────────────────────── the URL codec ─────────────────────────

const TABS = new Set(["forSale", "sold", "purchased"]);
const TYPES = new Set(["all", "buyNow", "auction"]);
const SORTS = new Set(["newest", "ending", "priceAsc", "priceDesc"]);

/** Reads `?tab=&q=&type=&sort=&page=`, unknown or missing values falling
 *  back to the defaults. */
export function parseMarketQuery(params: URLSearchParams | Record<string, string | null | undefined>): MarketQuery {
  const get = (k: string): string | null =>
    params instanceof URLSearchParams ? params.get(k) : ((params[k] ?? null) as string | null);
  const tab = get("tab");
  const type = get("type");
  const sort = get("sort");
  const q = get("q") ?? "";
  const pageRaw = get("page");
  const page = (() => {
    const n = Number(pageRaw);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  })();
  return {
    tab: tab && TABS.has(tab) ? (tab as MarketQuery["tab"]) : "forSale",
    q,
    type: type && TYPES.has(type) ? (type as MarketQuery["type"]) : "all",
    sort: sort && SORTS.has(sort) ? (sort as MarketQuery["sort"]) : "newest",
    page,
  };
}

/** Writes the query with every default left out (LST-28) — `""` for the
 *  defaults, so `replaceState` never litters the URL. */
export function marketQueryString(query: MarketQuery): string {
  const parts: string[] = [];
  if (query.tab !== "forSale") parts.push(`tab=${query.tab}`);
  if (query.q) parts.push(`q=${encodeURIComponent(query.q)}`);
  if (query.type !== "all") parts.push(`type=${query.type}`);
  if (query.sort !== "newest") parts.push(`sort=${query.sort}`);
  if (query.page !== 1) parts.push(`page=${query.page}`);
  return parts.length ? `?${parts.join("&")}` : "";
}
