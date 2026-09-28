// Explore marketplace's grid (Phase 2 spec §3.5.5, P2-MARKETPLACE-4…7): the
// For sale · Sold · Purchased tabs, search, the type filter, sort, paging
// and the URL codec. Pages hold 12 items, the My projects rule (LST-28): the
// URL only ever carries a param that differs from its default.
//
// Pure, relative imports only, so node:test loads the compiled module.

import type { Amount, DemoBuyerId } from "../wallet/types";
import type { Token } from "../brief/types";
import { compareAmounts, formatAmount } from "../wallet/money";
import { auctionStateOf } from "./auction";
import type { AuctionState, Bid, Listing, Sale } from "./types";
import { formatDate, formatDateTime } from "../manual/project-summary";

export const PAGE_SIZE = 12;

/** The project fields the grid reads — whatever `projectSummary` (T10)
 *  already derives, kept minimal here so this module doesn't import the
 *  whole summary graph. */
export type MarketProjectLike = { id: string; name: string; cover: string | null; productCount: number };

export type MarketItem = {
  projectId: string;
  name: string;
  cover: string | null;
  productCount: number;
  listing: Listing;
  status: "live" | "ended" | "sold";
  sale: Sale | null;
  auction: AuctionState | null;
  /** The active buyer's own share, when they hold one. */
  holding: { sharePct: number } | null;
  /** What "newest" sorts by: the sale time once sold, else the listing time. */
  sortAt: number;
};

/** One card per live (or ended-unclosed) listing, one per sale, filtered by
 *  the active buyer's holdings for Purchased. Paused and removed listings
 *  are never items here (P2-MARKETPLACE-4): they appear in no tab. */
export function marketItemsOf(
  listings: Listing[],
  projects: MarketProjectLike[],
  sales: Sale[],
  bids: Bid[],
  buyerId: DemoBuyerId | null,
  now: number,
): MarketItem[] {
  const byProject = new Map(projects.map((p) => [p.id, p]));
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
      status,
      sale,
      auction,
      holding,
      sortAt: sale ? sale.at : listing.listedAt,
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
  if (item.listing.type === "buyNow") return item.listing.price ?? "0";
  return item.auction?.top?.amount ?? item.listing.minBid ?? "0";
}

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
    pool = pool.filter((i) => i.listing.type === query.type);
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
      const tokenCmp = (a.listing.token as Token).localeCompare(b.listing.token as Token);
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
  return `${names[id]} (demo buyer)`;
}

/** The card's price block (P2-MARKETPLACE-6), which depends on the tab and
 *  the listing. `tab` defaults to "forSale": a sold item the active buyer
 *  also holds reads differently on Purchased ("You own …") than on Sold
 *  ("Sold for … to …"), so callers on the Purchased tab pass it. */
export function listingCardText(item: MarketItem, now: number, tab: MarketQuery["tab"] = "forSale"): ListingCardText {
  const l = item.listing;
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
