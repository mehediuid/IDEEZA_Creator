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
import { auctionStateOf } from "./auction";
import { liveTracksOf } from "./editions";
import type { AuctionState, Bid, EditionKind, EditionTrack, Listing, Sale } from "./types";
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
  /** The newest listing among them. */
  listedAt: number;
};

export type MarketItem = {
  projectId: string;
  name: string;
  cover: string | null;
  productCount: number;
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
  const amount = listings
    .filter((l) => l.token === token)
    .map((l) => l.regular)
    .sort(compareAmounts)[0];
  const kinds = (["physical", "virtual"] as EditionKind[]).filter((k) => live.some((t) => t.kind === k));
  return { count: live.length, kinds, from: { amount, token }, listedAt: Math.max(...listings.map((l) => l.listedAt)) };
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

export type ListingCardText = { price: string; sub: string };

function buyerName(id: DemoBuyerId): string {
  const names: Record<DemoBuyerId, string> = { "buyer-mira": "Mira", "buyer-leo": "Leo", "buyer-sam": "Sam" };
  return `${names[id]} (demo creator)`;
}

/** The card's price block (P2-MARKETPLACE-6), which depends on the tab and
 *  the listing. `tab` defaults to "forSale": a sold item the active buyer
 *  also holds reads differently on Purchased ("You own …") than on Sold
 *  ("Sold for … to …"), so callers on the Purchased tab pass it. */
const KIND_COPIES: Record<EditionKind, string> = { physical: "Physical", virtual: "Virtual" };

/** "From 0.05 MATIC" when there's more than one offer, else the one price. */
function copiesPriceOf(c: CopyOffer): string {
  const price = formatAmount(c.from.amount, c.from.token);
  return c.count > 1 ? `From ${price}` : price;
}

/** A Main card's extra line while copies are on sale too: "Copies from 0.05 MATIC". */
export function copiesLineOf(item: MarketItem): string | null {
  if (!item.listing || !item.copies) return null;
  return `Copies from ${formatAmount(item.copies.from.amount, item.copies.from.token)}`;
}

export function listingCardText(item: MarketItem, now: number, tab: MarketQuery["tab"] = "forSale"): ListingCardText {
  const l = item.listing;
  if (!l) {
    const c = item.copies as CopyOffer;
    return { price: copiesPriceOf(c), sub: `${c.kinds.map((k) => KIND_COPIES[k]).join(" and ")} copies · not the project itself` };
  }
  if (tab === "purchased" && item.holding) {
    return {
      price: `You own ${item.holding.sharePct}%`,
      sub: item.sale ? `Bought ${formatDate(item.sale.at)} for ${formatAmount(item.sale.price, l.token)}` : "",
    };
  }
  if (item.sale) {
    const s = item.sale;
    const pct = s.item.nft === "main" ? s.item.sharePct : 0;
    return {
      price: `Sold for ${formatAmount(s.price, s.token)} · ${pct}% · to ${buyerName(s.buyerId)}`,
      sub: formatDate(s.at),
    };
  }
  if (l.type === "auction") {
    const state = item.auction ?? auctionStateOf(l, [], now);
    const bidLine = state.top
      ? `Current bid ${formatAmount(state.top.amount, l.token)}`
      : `Starting bid ${formatAmount(l.minBid ?? "0", l.token)}`;
    const endLine = state.phase === "ended" ? "Auction ended" : `Ends ${formatDateTime(l.endsAt ?? now)}`;
    return { price: bidLine, sub: endLine };
  }
  return { price: formatAmount(l.price ?? "0", l.token), sub: `for ${l.percentSelling}% of the project` };
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
