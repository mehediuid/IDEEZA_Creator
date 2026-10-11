// Explore marketplace's grid (Phase 2 spec §3.5.5, P2-MARKETPLACE-4…6).
import { test } from "node:test";
import assert from "node:assert/strict";

const { copiesLineOf, copyOfferOf, filterMarket, listingCardText, marketItemsOf, marketQueryString, parseMarketQuery } = await import(
  "../../.tmp-test/lib/market/market-list.js"
);

function listingFixture(overrides = {}) {
  return {
    id: "lst_1",
    projectId: "p1",
    slot: "main",
    source: "page",
    listedAt: 1000,
    updatedAt: 1000,
    type: "buyNow",
    token: "MATIC",
    price: "0.05",
    percentSelling: 10,
    royaltiesPct: 10,
    mintingType: "lazy",
    network: "mumbai",
    collection: "Test Collection",
    benefits: [],
    metadata: { name: "Car", description: "", products: [], cover: null, at: 1000 },
    status: "live",
    events: [],
    ...overrides,
  };
}

function itemFixture(overrides = {}) {
  return {
    projectId: "p1",
    name: "Car",
    cover: null,
    productCount: 1,
    listing: listingFixture(),
    copies: null,
    status: "live",
    sale: null,
    auction: null,
    holding: null,
    sortAt: 1000,
    ...overrides,
  };
}

test("filterMarket: 'Price: low to high' lists the auction (0.02) before the Buy now (0.05)", () => {
  const buyNow = itemFixture({ projectId: "p_buy", listing: listingFixture({ id: "lst_buy", type: "buyNow", price: "0.05" }) });
  const auction = itemFixture({
    projectId: "p_auction",
    listing: listingFixture({ id: "lst_auction", type: "auction", price: undefined, minBid: "0.02", endsAt: 999_999 }),
    auction: { phase: "running", top: null, minNext: "0.02", msLeft: 5000 },
  });
  const { items } = filterMarket([buyNow, auction], { tab: "forSale", q: "", type: "all", sort: "priceAsc", page: 1 });
  assert.equal(items[0].projectId, "p_auction");
  assert.equal(items[1].projectId, "p_buy");
});

test("filterMarket: 'Type: Auction' hides the Buy now card", () => {
  const buyNow = itemFixture({ projectId: "p_buy" });
  const auction = itemFixture({ projectId: "p_auction", listing: listingFixture({ id: "lst_auction", type: "auction", price: undefined }) });
  const { items } = filterMarket([buyNow, auction], { tab: "forSale", q: "", type: "auction", sort: "newest", page: 1 });
  assert.deepEqual(items.map((i) => i.projectId), ["p_auction"]);
});

test("filterMarket: price sorts go by token, then amount — tokens are never compared to one another", () => {
  const eth = itemFixture({ projectId: "p_eth", listing: listingFixture({ id: "lst_eth", token: "ETH", price: "9" }) });
  const matic = itemFixture({ projectId: "p_matic", listing: listingFixture({ id: "lst_matic", token: "MATIC", price: "0.01" }) });
  const { items } = filterMarket([matic, eth], { tab: "forSale", q: "", type: "all", sort: "priceAsc", page: 1 });
  // "ETH" sorts before "MATIC" alphabetically, even though 9 ETH > 0.01 MATIC in face value.
  assert.deepEqual(items.map((i) => i.projectId), ["p_eth", "p_matic"]);
});

test("filterMarket: no match gives an empty result, not an error", () => {
  const { items, counts } = filterMarket([itemFixture()], { tab: "forSale", q: "zzz", type: "all", sort: "newest", page: 1 });
  assert.deepEqual(items, []);
  assert.equal(counts.forSale, 1); // the count is over the whole tab, not the filtered pool
});

test("filterMarket: counts and tabs — Sold and Purchased read from sale and holding", () => {
  const sold = itemFixture({
    projectId: "p_sold",
    status: "sold",
    sale: { at: 5, price: "0.05", token: "MATIC", buyerId: "buyer-mira", item: { nft: "main", sharePct: 10 } },
    holding: { sharePct: 10 },
  });
  const live = itemFixture({ projectId: "p_live" });
  const result = filterMarket([live, sold], { tab: "purchased", q: "", type: "all", sort: "newest", page: 1 });
  assert.equal(result.counts.forSale, 1);
  assert.equal(result.counts.sold, 1);
  assert.equal(result.counts.purchased, 1);
  assert.deepEqual(result.items.map((i) => i.projectId), ["p_sold"]);
});

test("listingCardText: a Buy now card reads the price, then the share sold", () => {
  const text = listingCardText(itemFixture(), 0);
  assert.equal(text.price, "0.05 MATIC");
  assert.equal(text.sub, "for 10% of the project");
});

test("listingCardText: the Purchased tab reads 'You own …'", () => {
  const purchased = itemFixture({
    holding: { sharePct: 10 },
    sale: { at: 5, price: "0.05", token: "MATIC", buyerId: "buyer-mira", item: { nft: "main", sharePct: 10 } },
  });
  const text = listingCardText(purchased, 0, "purchased");
  assert.equal(text.price, "You own 10%");
  assert.match(text.sub, /^Bought .* for 0\.05 MATIC$/);
});

test("marketItemsOf: paused and removed listings appear in no tab", () => {
  const listings = [
    listingFixture({ id: "lst_live", status: "live" }),
    listingFixture({ id: "lst_paused", status: "paused" }),
    listingFixture({ id: "lst_removed", status: "removed" }),
  ];
  const projects = [{ id: "p1", name: "Car", cover: null, productCount: 1 }];
  const items = marketItemsOf(listings, projects, [], [], null, 0);
  assert.deepEqual(items.map((i) => i.listing.id), ["lst_live"]);
});

// ───────────────────────── copies sold on their own (owner, 2026-10-11) ─────────────────────────

const TRACK_LISTING = { token: "MATIC", regular: "0.05", extended: "0.08", royaltyPct: 10, listedAt: 2000, updatedAt: 2000 };
function trackFixture(overrides = {}) {
  return {
    id: "ed_1",
    projectId: "p2",
    productId: "project",
    kind: "virtual",
    use: "private",
    supply: { total: 30 },
    createdAt: 1,
    lazy: true,
    listing: TRACK_LISTING,
    demo: true,
    ...overrides,
  };
}
const PROJECTS = [
  { id: "p1", name: "Car", cover: null, productCount: 1 },
  { id: "p2", name: "Lamp", cover: null, productCount: 2 },
];

test("marketItemsOf: a project with only copy listings is an item — no Main listing needed", () => {
  const tracks = [trackFixture(), trackFixture({ id: "ed_2", productId: "prd_a", kind: "physical", listing: { ...TRACK_LISTING, regular: "0.4", listedAt: 3000 } })];
  const items = marketItemsOf([], PROJECTS, [], [], null, 0, tracks);
  assert.equal(items.length, 1);
  const [copies] = items;
  assert.equal(copies.projectId, "p2");
  assert.equal(copies.listing, null);
  assert.equal(copies.status, "live");
  assert.deepEqual(copies.copies, { count: 2, kinds: ["physical", "virtual"], from: { amount: "0.05", token: "MATIC" }, listedAt: 3000 });
  assert.deepEqual(listingCardText(copies, 0), { price: "From 0.05 MATIC", sub: "Physical and Virtual copies · not the project itself" });
  // For sale, and a Buy now, not an auction.
  assert.equal(filterMarket(items, { tab: "forSale", q: "", type: "buyNow", sort: "newest", page: 1 }).items.length, 1);
  assert.equal(filterMarket(items, { tab: "forSale", q: "", type: "auction", sort: "newest", page: 1 }).items.length, 0);
});

test("marketItemsOf: a live Main card carries the copies; a sold-out, unlisted or locked project's copies don't count", () => {
  const listings = [listingFixture({ projectId: "p2" })];
  const items = marketItemsOf(listings, PROJECTS, [], [], null, 0, [trackFixture()]);
  assert.equal(items.length, 1);
  assert.equal(items[0].listing.id, "lst_1");
  assert.equal(copiesLineOf(items[0]), "Copies from 0.05 MATIC");
  assert.equal(copyOfferOf([trackFixture({ listing: null })], [], false), null);
  assert.equal(copyOfferOf([trackFixture({ supply: { total: 1 } })], [{ id: "s", at: 1, item: { nft: "virtual", trackId: "ed_1" } }], false), null);
  const locked = [{ ...PROJECTS[1], locked: true }];
  assert.deepEqual(marketItemsOf([], locked, [], [], null, 0, [trackFixture()]), []);
});

test("marketItemsOf: a paused Main listing hides no copies — the project still shows for them", () => {
  const items = marketItemsOf([listingFixture({ projectId: "p2", status: "paused" })], PROJECTS, [], [], null, 0, [trackFixture()]);
  assert.deepEqual(items.map((i) => [i.projectId, i.listing]), [["p2", null]]);
});

test("parseMarketQuery / marketQueryString: URL codec with defaults left out", () => {
  const parsed = parseMarketQuery(new URLSearchParams("tab=sold"));
  assert.deepEqual(parsed, { tab: "sold", q: "", type: "all", sort: "newest", page: 1 });
  assert.equal(marketQueryString({ tab: "forSale", q: "", type: "all", sort: "newest", page: 1 }), "");
  assert.equal(marketQueryString({ tab: "sold", q: "", type: "all", sort: "newest", page: 1 }), "?tab=sold");
  // An unknown tab reads as the default.
  assert.equal(parseMarketQuery({ tab: "bogus" }).tab, "forSale");
});
