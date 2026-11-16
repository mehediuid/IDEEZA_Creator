// Explore marketplace's always-there listings (owner, 2026-11-16: "the data
// Innovations always has, keep it on the marketplace too"). Innovations reads
// its sample posts from code (sample-posts.ts), so every browser and every
// account has them; the marketplace held only this browser's own listings, so
// a new account found it empty. The sample posts that are for sale — their
// "On Marketplace" rows — are now marketplace items too, another creator's
// each: "By {creator}", one card in the grid and a shop page at
// `/marketplace/<feed id>` (the phone's address for the same project).
//
// Purchases are the phone's own (phone-sample-sales.ts, one store), so a copy
// bought on the web shows on the phone and the other way round.
//
// Each copy is sold for Personal use or Business use (owner, 2026-11-16:
// "there is no place to choose private or commercial use when buying"). A
// post's row names one licence and its price; the other use is offered too,
// Business use at twice the Personal price, starting with none sold. On the
// web a copy's sold count is per use (by the sale's name); the phone keeps
// one row per kind and counts both. The rows are
// the offers: the Main NFT is the whole project, sold once, and selling it
// takes the copies off with it.
//
// Pure. Relative imports only (node:test loads the compiled module).

import { PROJECTS } from "../feed";
import { SAMPLE_POSTS } from "../innovations/sample-posts";
import type { InnovationPost } from "../innovations/types";
import { fromMicros, toMicros } from "../wallet/money";
import type { Amount, DemoBuyerId } from "../wallet/types";
import { ideezaFeeOf } from "./fee";
import { lowestOf, type CopyOffer, type MarketItem } from "./market-list";
import {
  offerStateOf,
  SAMPLE_NETWORK,
  sampleOffersOf,
  sampleSalesOf,
  SOLD_IN_FULL,
  SOLD_OUT,
  type SampleOffer,
  type SampleSale,
} from "./phone-sample-sales";
import type { EditionKind, Listing, Sale } from "./types";

/** The collection a sample is minted to (a name only: nothing is on chain). */
export const SAMPLE_COLLECTION = "IDEEZA Creators";
/** Royalties a sample's resales carry, as the post's rows don't say. */
export const SAMPLE_ROYALTIES_PCT = 10;

export type SampleMarket = {
  /** The feed project's id ("p2"): the address and the sales' `projectId`. */
  feedId: string;
  post: InnovationPost;
  /** The Main NFT first, then the copies; only rows whose price reads. */
  offers: SampleOffer[];
};

/** Every sample post that is for sale, in feed order. */
export const SAMPLE_MARKETS: readonly SampleMarket[] = SAMPLE_POSTS.flatMap((post, i) => {
  const offers = sampleOffersOf(post);
  const feedId = PROJECTS[i]?.id;
  return feedId && offers.length > 0 ? [{ feedId, post, offers }] : [];
});

/** The sample on sale at this address, or null (a project of this browser's, or nothing). */
export function sampleMarketOf(id: string): SampleMarket | null {
  return SAMPLE_MARKETS.find((m) => m.feedId === id) ?? null;
}

/** Its cover: the post's first picture. */
export function sampleCoverOf(post: InnovationPost): string | null {
  return post.media.find((m) => m.kind === "image")?.src ?? post.products[0]?.image ?? null;
}

/** The Main row as the grid's Listing: Buy now, the whole project, at its price. */
export function sampleListingOf(m: SampleMarket, main: SampleOffer): Listing {
  const at = m.post.sharedAt;
  return {
    id: `sample-listing:${m.feedId}`,
    projectId: m.feedId,
    slot: "main",
    source: "page",
    listedAt: at,
    updatedAt: at,
    type: "buyNow",
    token: main.token,
    price: main.price,
    percentSelling: 100,
    royaltiesPct: SAMPLE_ROYALTIES_PCT,
    mintingType: "lazy",
    network: SAMPLE_NETWORK,
    collection: SAMPLE_COLLECTION,
    benefits: [],
    metadata: {
      name: m.post.title,
      description: m.post.description,
      products: m.post.products.map((p) => ({ id: p.id, name: p.name })),
      cover: null,
      at,
    },
    status: "live",
    events: [{ kind: "listed", at }],
  };
}

/** The Main NFT's sale as the grid reads a Sale. */
function saleOf(m: SampleMarket, s: SampleSale): Sale {
  return {
    id: s.id,
    listingId: `sample-listing:${m.feedId}`,
    projectId: m.feedId,
    at: s.at,
    buyerId: s.buyerId,
    buyerAddress: s.buyerAddress,
    sellerAddress: "",
    item: { nft: "main", sharePct: 100 },
    via: "buyNow",
    token: s.token,
    price: s.price,
    fees: { ideezaBps: 250, ideeza: ideezaFeeOf(s.price), network: { coin: "ETH", amount: s.networkFee } },
    payout: s.price,
    royaltiesPct: SAMPLE_ROYALTIES_PCT,
    mint: "lazy",
    mintedAtSale: true,
    tokenId: null,
    network: s.network,
    collection: SAMPLE_COLLECTION,
    benefits: [],
    txHash: s.txHash,
    demo: true,
  };
}

const KINDS: EditionKind[] = ["physical", "virtual"];

export type SampleUse = "Personal use" | "Business use";
export const SAMPLE_USES: readonly SampleUse[] = ["Personal use", "Business use"];

/** A copy offer for one use. `base`: the post's own row (its licence, its price, its sold count). */
export type UseOffer = SampleOffer & { use: SampleUse; base: boolean };

/** Business use is twice Personal use: the other use's price from the row's. */
function otherUsePrice(price: Amount, rowUse: SampleUse): Amount {
  const m = toMicros(price) ?? BigInt(0);
  return fromMicros(rowUse === "Business use" ? m / BigInt(2) : m * BigInt(2));
}

/** One kind's copies, Personal use first: the row's own use and the other one. Empty when the post sells none. */
export function copyUsesOf(m: SampleMarket, kind: EditionKind): UseOffer[] {
  const row = m.offers.find((o) => o.kind === kind);
  if (!row) return [];
  const rowUse: SampleUse = /business/i.test(row.name) ? "Business use" : "Personal use";
  const kindName = row.name.split(" · ")[0];
  return SAMPLE_USES.map((use) =>
    use === rowUse
      ? { ...row, use, base: true }
      : {
          ...row,
          use,
          base: false,
          name: `${kindName} · ${use}`,
          price: otherUsePrice(row.price, rowUse),
          sold: row.sold ? { count: 0, of: row.sold.of } : null,
        },
  );
}

export type UseState = {
  /** Sold of this use: the row's own count (its use only) and this browser's sales of it. */
  count: number;
  of: number | null;
  soldOut: boolean;
  /** The Main NFT is sold, so the whole project is: no copy sells. */
  locked: boolean;
  /** This browser's sales of this use, oldest first. */
  sales: SampleSale[];
};

export function copyUseStateOf(o: UseOffer, feedId: string, sales: readonly SampleSale[]): UseState {
  const all = sampleSalesOf(feedId, sales);
  const mine = all.filter((s) => s.kind === o.kind && s.name === o.name);
  const count = (o.base ? (o.sold?.count ?? 0) : 0) + mine.length;
  const of = o.sold?.of ?? null;
  return { count, of, soldOut: of !== null && count >= of, locked: all.some((s) => s.kind === "main"), sales: mine };
}

/** Why this use can't be bought now, in the web's words; null when it can. */
export function copyUseBlockOf(o: UseOffer, feedId: string, sales: readonly SampleSale[]): string | null {
  const st = copyUseStateOf(o, feedId, sales);
  return st.locked ? SOLD_IN_FULL : st.soldOut ? SOLD_OUT : null;
}

/** The copies still on sale, each use apart: not sold out, and none once the Main NFT is sold. */
export function sampleCopiesOf(m: SampleMarket, sales: readonly SampleSale[]): CopyOffer | null {
  const open = KINDS.flatMap((k) => copyUsesOf(m, k)).filter((o) => copyUseBlockOf(o, m.feedId, sales) === null);
  const from = lowestOf(open.map((o) => ({ amount: o.price, token: o.token })));
  if (!from) return null;
  const kinds = KINDS.filter((k) => open.some((o) => o.kind === k));
  const byKind: CopyOffer["byKind"] = {};
  for (const k of kinds) {
    const of = lowestOf(open.filter((o) => o.kind === k).map((o) => ({ amount: o.price, token: o.token })));
    if (of) byKind[k] = of;
  }
  const cheapest = open.find((o) => o.token === from.token && o.price === from.amount) ?? open[0];
  return {
    count: open.length,
    kinds,
    from: { amount: from.amount, token: from.token },
    fromKind: cheapest.kind as EditionKind,
    byKind,
    listedAt: m.post.sharedAt,
  };
}

/** One grid item per sample: its Main card (sold, once a demo creator bought it), else its copies. */
export function sampleMarketItemsOf(sales: readonly SampleSale[], buyerId: DemoBuyerId | null): MarketItem[] {
  const out: MarketItem[] = [];
  for (const m of SAMPLE_MARKETS) {
    const main = m.offers.find((o) => o.kind === "main") ?? null;
    const soldTo = main ? offerStateOf(main, m.feedId, sales).soldTo : null;
    const copies = soldTo ? null : sampleCopiesOf(m, sales);
    if (!main && !copies) continue;
    const sale = soldTo ? saleOf(m, soldTo) : null;
    out.push({
      projectId: m.feedId,
      name: m.post.title,
      cover: sampleCoverOf(m.post),
      productCount: m.post.products.length,
      creator: m.post.creator.name,
      listing: main ? sampleListingOf(m, main) : null,
      copies,
      status: sale ? "sold" : "live",
      sale,
      auction: null,
      holding: sale && buyerId && sale.buyerId === buyerId ? { sharePct: 100 } : null,
      sortAt: sale ? sale.at : m.post.sharedAt,
    });
  }
  return out;
}

/** Search over a sample: its title, its creator, its products' names and summaries, its description. */
export function sampleMatches(m: SampleMarket, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [m.post.title, m.post.creator.name, m.post.description, ...m.post.products.flatMap((p) => [p.name, p.summary])];
  return hay.some((s) => s.toLowerCase().includes(needle));
}
