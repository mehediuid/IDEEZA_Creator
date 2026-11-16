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
// bought on the web shows on the phone and the other way round. The rows are
// the offers: the Main NFT is the whole project, sold once, and selling it
// takes the copies off with it.
//
// Pure. Relative imports only (node:test loads the compiled module).

import type { Token } from "../brief/types";
import { PROJECTS } from "../feed";
import { SAMPLE_POSTS } from "../innovations/sample-posts";
import type { InnovationPost } from "../innovations/types";
import { compareAmounts } from "../wallet/money";
import type { DemoBuyerId } from "../wallet/types";
import { ideezaFeeOf } from "./fee";
import type { CopyOffer, MarketItem } from "./market-list";
import { offerStateOf, SAMPLE_NETWORK, sampleOffersOf, type SampleOffer, type SampleSale } from "./phone-sample-sales";
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

/** The copies still on sale: not sold out, and none once the Main NFT is sold. */
export function sampleCopiesOf(m: SampleMarket, sales: readonly SampleSale[]): CopyOffer | null {
  const open = m.offers.filter((o) => o.kind !== "main" && !offerStateOf(o, m.feedId, sales).soldOut && !offerStateOf(o, m.feedId, sales).locked);
  if (open.length === 0) return null;
  const token = open.map((o) => o.token).sort()[0] as Token;
  const amount = open
    .filter((o) => o.token === token)
    .map((o) => o.price)
    .sort(compareAmounts)[0];
  return {
    count: open.length,
    kinds: KINDS.filter((k) => open.some((o) => o.kind === k)),
    from: { amount, token },
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
