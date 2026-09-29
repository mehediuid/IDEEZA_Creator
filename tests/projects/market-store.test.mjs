// The stores (Phase 2 spec §3.4, §3.6.2; T11): the market's pure read and
// write plans, the delete purge, settling against the wallets, and the
// per-project stores' decoders and shared subscription.
import { test } from "node:test";
import assert from "node:assert/strict";

const { readMarketData, appendSalePlan, appendBidPlan, appendSupportPlan, marketPurgeOf, settleWithWallets } =
  await import("../../.tmp-test/lib/market/market-store.js");
const { subscribeStores, writeStoredKey, parseStored, STORE_CHANGE_EVENT } = await import(
  "../../.tmp-test/lib/key-store.js"
);
const { currentWriteError } = await import("../../.tmp-test/lib/storage-status.js");
const { PROJECT_DELETED_EVENT } = await import("../../.tmp-test/lib/manual/events.js");
const { normalizePlan, decodeBusinessPlan } = await import("../../.tmp-test/lib/manual/business-plan-store.js");
const { decodeJourney, mediaKeysOfActivity } = await import("../../.tmp-test/lib/manual/journey-store.js");
const { decodeEditions } = await import("../../.tmp-test/lib/market/editions-store.js");
const { decodeProjectVideos } = await import("../../.tmp-test/lib/video/store.js");

const K = {
  listings: "ideeza:market:listings",
  sales: "ideeza:market:sales",
  bids: "ideeza:market:bids",
  support: "ideeza:market:support",
};

/** A storage stand-in whose `get` records nothing but reads. */
function storeOf(entries) {
  const map = new Map(Object.entries(entries));
  return { map, get: (k) => (map.has(k) ? map.get(k) : null) };
}

function listing(overrides = {}) {
  return {
    id: "lst_aaaaaaaa",
    projectId: "proj_1",
    slot: "main",
    source: "page",
    listedAt: 1000,
    updatedAt: 1000,
    type: "buyNow",
    token: "MATIC",
    price: "0.05",
    percentSelling: 10,
    royaltiesPct: 5,
    mintingType: "lazy",
    network: "mumbai",
    collection: "Cars",
    benefits: [],
    metadata: { name: "Car", description: "", products: [], cover: null, at: 1000 },
    status: "live",
    events: [{ kind: "listed", at: 1000 }],
    ...overrides,
  };
}

function sale(overrides = {}) {
  return {
    id: "sale_aaaaaaaa",
    listingId: "lst_aaaaaaaa",
    projectId: "proj_1",
    at: 2000,
    buyerId: "buyer-mira",
    buyerAddress: "0xbuyer",
    sellerAddress: "0xseller",
    item: { nft: "main", sharePct: 10 },
    via: "buyNow",
    token: "MATIC",
    price: "0.05",
    fees: { ideezaBps: 250, ideeza: "0.00125", network: { coin: "MATIC", amount: "0.021" } },
    payout: "0.04875",
    royaltiesPct: 5,
    mint: "lazy",
    mintedAtSale: true,
    tokenId: 1001,
    network: "mumbai",
    collection: "Cars",
    benefits: [],
    txHash: `0x${"a".repeat(64)}`,
    demo: true,
    ...overrides,
  };
}

const bid = (id, listingId, bidderId, amount, at) => ({ id, listingId, bidderId, amount, token: "MATIC", at });
const support = (id, projectId) => ({ id, saleId: "sale_x", projectId, buyerId: "buyer-mira", message: "Hi", at: 5 });

// ─────────────────────────── readMarketData ───────────────────────────

test("readMarketData: every missing key reads as [] and nothing is unreadable", () => {
  const { get } = storeOf({});
  assert.deepEqual(readMarketData(get), { listings: [], sales: [], bids: [], support: [], unreadable: false });
});

test("readMarketData: a corrupt :sales reads as unreadable and the key is left as it is", () => {
  const s = storeOf({ [K.sales]: "{not json", [K.listings]: JSON.stringify([listing()]) });
  const data = readMarketData(s.get);
  assert.equal(data.unreadable, true);
  assert.deepEqual(data.sales, []);
  assert.equal(data.listings.length, 1, "the other keys still read");
  assert.equal(s.map.get(K.sales), "{not json");
  // …and no writer overwrites it.
  assert.deepEqual(appendSalePlan(s.get, sale()), { ok: false, reason: "unreadable" });
  assert.equal(s.map.get(K.sales), "{not json");
});

test("readMarketData: JSON that isn't a list is unreadable too; a malformed row is only dropped", () => {
  assert.equal(readMarketData(storeOf({ [K.bids]: "{}" }).get).unreadable, true);
  const rows = storeOf({ [K.bids]: JSON.stringify([bid("bid_1", "lst_a", "buyer-leo", "0.04", 1), { nope: true }]) });
  const data = readMarketData(rows.get);
  assert.equal(data.unreadable, false);
  assert.deepEqual(data.bids.map((b) => b.id), ["bid_1"]);
});

test("readMarketData: storage that throws reads as empty, not unreadable", () => {
  const data = readMarketData(() => {
    throw new Error("SecurityError");
  });
  assert.deepEqual(data, { listings: [], sales: [], bids: [], support: [], unreadable: false });
});

// ─────────────────────────── the append plans ───────────────────────────

test("appendSalePlan: one append onto the stored rows as they are, keeping a row this version can't read", () => {
  const odd = { id: "sale_future", shape: "v9" };
  const s = storeOf({ [K.sales]: JSON.stringify([odd]) });
  const plan = appendSalePlan(s.get, sale());
  assert.equal(plan.ok, true);
  assert.equal(plan.write.key, K.sales);
  assert.deepEqual(plan.write.value, [odd, sale()]);
});

test("appendSalePlan: a second Main sale of one listing is refused; edition sales of one track aren't", () => {
  const s = storeOf({ [K.sales]: JSON.stringify([sale()]) });
  assert.deepEqual(appendSalePlan(s.get, sale({ id: "sale_bbbbbbbb", buyerId: "buyer-leo" })), {
    ok: false,
    reason: "conflict",
  });
  const edition = (id, serial) =>
    sale({
      id,
      listingId: "ed_track001",
      item: { nft: "physical", trackId: "ed_track001", productId: "p1", productName: "Car", use: "private", tier: "regular", serial },
    });
  const e = storeOf({ [K.sales]: JSON.stringify([edition("sale_e1", 1)]), [EDITIONS("proj_1")]: JSON.stringify([track(3)]) });
  assert.equal(appendSalePlan(e.get, edition("sale_e2", 2)).ok, true);
});

const EDITIONS = (projectId) => `ideeza:project:editions:${projectId}`;
function track(total) {
  return {
    id: "ed_track001", projectId: "proj_1", productId: "p1", kind: "physical", use: "private",
    supply: { total }, createdAt: 1, lazy: true,
    listing: { token: "MATIC", regular: "0.01", extended: "0.02", royaltyPct: 5, listedAt: 1, updatedAt: 1 }, demo: true,
  };
}
const editionSale = (id, serial, at = 3000) =>
  sale({
    id, at, listingId: "ed_track001",
    item: { nft: "physical", trackId: "ed_track001", productId: "p1", productName: "Car", use: "private", tier: "regular", serial },
  });

test("appendSalePlan: an edition sale past the track's supply, re-read from its store, is refused (another tab sold the last)", () => {
  const full = storeOf({
    [K.sales]: JSON.stringify([editionSale("sale_e1", 1), editionSale("sale_e2", 2)]),
    [EDITIONS("proj_1")]: JSON.stringify([track(2)]),
  });
  assert.deepEqual(appendSalePlan(full.get, editionSale("sale_e3", 3)), { ok: false, reason: "conflict" });
  // The same serial twice: two tabs priced the same unit.
  const room = storeOf({ [K.sales]: JSON.stringify([editionSale("sale_e1", 1)]), [EDITIONS("proj_1")]: JSON.stringify([track(5)]) });
  assert.deepEqual(appendSalePlan(room.get, editionSale("sale_e9", 1)), { ok: false, reason: "conflict" });
  assert.equal(appendSalePlan(room.get, editionSale("sale_e2", 2)).ok, true);
  // No such track, or an editions key that can't be read: never sold blind.
  assert.deepEqual(appendSalePlan(storeOf({}).get, editionSale("sale_e1", 1)), { ok: false, reason: "conflict" });
  assert.deepEqual(appendSalePlan(storeOf({ [EDITIONS("proj_1")]: "{nope" }).get, editionSale("sale_e1", 1)), {
    ok: false,
    reason: "unreadable",
  });
});

test("appendBidPlan / appendSupportPlan: a row already stored (another tab) is a conflict", () => {
  const b = bid("bid_1", "lst_a", "buyer-leo", "0.04", 1);
  const s = storeOf({ [K.bids]: JSON.stringify([b]) });
  assert.deepEqual(appendBidPlan(s.get, b), { ok: false, reason: "conflict" });
  const next = appendBidPlan(s.get, bid("bid_2", "lst_a", "buyer-sam", "0.05", 2));
  assert.equal(next.ok, true);
  assert.equal(next.write.value.length, 2);
  const r = appendSupportPlan(storeOf({}).get, support("sup_1", "proj_1"));
  assert.deepEqual(r.write, { key: K.support, value: [support("sup_1", "proj_1")] });
});

// ─────────────────────────── the delete purge ───────────────────────────

test("marketPurgeOf: the project's listings, the bids on them and its support go; sales and others stay", () => {
  const mine = listing({ id: "lst_mine0001", status: "closed", type: "auction", endsAt: 500 });
  const theirs = listing({ id: "lst_other001", projectId: "proj_2" });
  const s = storeOf({
    [K.listings]: JSON.stringify([mine, theirs]),
    [K.bids]: JSON.stringify([
      bid("bid_1", "lst_mine0001", "buyer-leo", "0.04", 1),
      bid("bid_2", "lst_other001", "buyer-leo", "0.04", 1),
    ]),
    [K.support]: JSON.stringify([support("sup_1", "proj_1"), support("sup_2", "proj_2")]),
    [K.sales]: JSON.stringify([sale({ projectId: "proj_2", listingId: "lst_other001" })]),
  });
  const writes = marketPurgeOf("proj_1", s.get);
  assert.deepEqual(
    writes.map((w) => w.key),
    [K.listings, K.bids, K.support],
  );
  const by = Object.fromEntries(writes.map((w) => [w.key, w.value]));
  assert.deepEqual(by[K.listings].map((l) => l.id), ["lst_other001"]);
  assert.deepEqual(by[K.bids].map((b) => b.id), ["bid_2"]);
  assert.deepEqual(by[K.support].map((r) => r.id), ["sup_2"]);
  assert.ok(!(K.sales in by), "sales are never written");
});

test("marketPurgeOf: nothing of the project → no writes; an unreadable key is left alone", () => {
  const clean = storeOf({ [K.listings]: JSON.stringify([listing({ projectId: "proj_2" })]) });
  assert.deepEqual(marketPurgeOf("proj_1", clean.get), []);
  const broken = storeOf({
    [K.listings]: "{broken",
    [K.bids]: JSON.stringify([bid("bid_1", "lst_aaaaaaaa", "buyer-leo", "0.04", 1)]),
    [K.support]: JSON.stringify([support("sup_1", "proj_1")]),
  });
  const writes = marketPurgeOf("proj_1", broken.get);
  assert.deepEqual(
    writes.map((w) => w.key),
    [K.support],
    "listings unreadable: neither they nor the bids (whose they are isn't known) are touched",
  );
});

// ─────────────────────────── settling against the wallets ───────────────────────────

test("settleWithWallets: a bid the bidder's wallet can't cover with the fee is skipped", () => {
  const auction = listing({ type: "auction", price: undefined, minBid: "0.01", endsAt: 10_000 });
  const market = {
    listings: [auction],
    sales: [],
    bids: [
      // Mira's 10 test MATIC can't cover 9.99 + the 0.021 network fee.
      bid("bid_m", auction.id, "buyer-mira", "9.99", 1),
      bid("bid_l", auction.id, "buyer-leo", "5", 2),
    ],
    support: [],
    unreadable: false,
  };
  assert.deepEqual(settleWithWallets(auction, { wallet: undefined, market, now: 9_999 }), { kind: "running" });
  const r = settleWithWallets(auction, { wallet: undefined, market, now: 10_000 });
  assert.equal(r.kind, "sale");
  assert.equal(r.bid.id, "bid_l");
  const covered = { ...market, bids: [bid("bid_m", auction.id, "buyer-mira", "9.979", 1)] };
  assert.equal(settleWithWallets(auction, { wallet: undefined, market: covered, now: 10_000 }).bid.id, "bid_m");
  const none = { ...market, bids: [] };
  assert.deepEqual(settleWithWallets(auction, { wallet: undefined, market: none, now: 10_000 }), { kind: "noBids" });
});

// ─────────────────────────── the per-project stores ───────────────────────────

test("decoders: a missing or corrupt key reads as empty and never throws", () => {
  assert.deepEqual(decodeJourney(null), { v: 1, activities: [] });
  assert.deepEqual(decodeJourney("{nope"), { v: 1, activities: [] });
  assert.deepEqual(decodeEditions(null), []);
  assert.deepEqual(decodeEditions("{nope"), []);
  assert.equal(decodeProjectVideos(null, "proj_1"), null);
  assert.equal(decodeProjectVideos("{nope", "proj_1"), null);
  assert.equal(decodeBusinessPlan(null, "proj_1"), null);
  assert.equal(decodeBusinessPlan("[1,2]", "proj_1"), null);
  const videos = decodeProjectVideos(JSON.stringify({ version: 1, projectId: "other", products: {} }), "proj_1");
  assert.equal(videos.projectId, "proj_1", "the key's project wins");
});

test("mediaKeysOfActivity: each file and each poster", () => {
  const a = {
    media: [
      { id: "m1", name: "a.png", mime: "image/png", kind: "image", size: 1, blobKey: "b1" },
      { id: "m2", name: "v.mp4", mime: "video/mp4", kind: "video", size: 1, blobKey: "b2", posterKey: "b2p" },
    ],
  };
  assert.deepEqual(mediaKeysOfActivity(a), ["b1", "b2", "b2p"]);
});

test("normalizePlan: drops a malformed version or section, keeps the newest 5, and repairs `current`", () => {
  const section = (id, extra = {}) => ({
    id,
    kind: "identity",
    title: "Identity",
    fields: { tagline: "Hi", tiers: [{ name: "Pro", price: "9", cadence: "mo", features: ["a", 1] }], bad: 3 },
    origin: "ai",
    state: "done",
    ...extra,
  });
  const version = (n) => ({ n, prompt: "p", createdAt: n, sections: [section(`s${n}`), section("x", { origin: "?" })] });
  const plan = normalizePlan(
    {
      v: 1,
      projectId: "wrong",
      current: 99,
      versions: [version(1), version(2), { n: "3" }, version(4), version(5), version(6), version(7)],
      run: { version: 8, next: 2, startedAt: 10 },
    },
    "proj_1",
  );
  assert.equal(plan.projectId, "proj_1");
  assert.deepEqual(plan.versions.map((v) => v.n), [2, 4, 5, 6, 7]);
  assert.equal(plan.current, 7);
  assert.deepEqual(plan.versions[0].sections.map((s) => s.id), ["s2"]);
  assert.deepEqual(plan.versions[0].sections[0].fields, {
    tagline: "Hi",
    tiers: [{ name: "Pro", price: "9", cadence: "mo", features: ["a"] }],
  });
  assert.deepEqual(plan.run, { version: 8, next: 2, startedAt: 10 });
  assert.equal(normalizePlan({ v: 2, versions: [] }, "proj_1"), null);
});

test("subscribeStores: every store re-reads on storage, focus, its own writes and the delete event", () => {
  const prev = globalThis.window;
  globalThis.window = new EventTarget();
  try {
    let n = 0;
    const off = subscribeStores(() => {
      n += 1;
    });
    for (const type of ["storage", "focus", STORE_CHANGE_EVENT, PROJECT_DELETED_EVENT]) {
      window.dispatchEvent(new Event(type));
    }
    assert.equal(n, 4);
    off();
    window.dispatchEvent(new Event("focus"));
    assert.equal(n, 4, "unsubscribed");
  } finally {
    globalThis.window = prev;
  }
});

test("writeStoredKey: a refused write is reported (COR-93) and returns { ok: false }", () => {
  const prev = globalThis.window;
  const target = new EventTarget();
  let notified = 0;
  target.addEventListener(STORE_CHANGE_EVENT, () => (notified += 1));
  target.localStorage = {
    setItem() {
      throw new Error("QuotaExceededError");
    },
  };
  globalThis.window = target;
  try {
    assert.deepEqual(writeStoredKey("ideeza:test:full", [1]), { ok: false });
    assert.equal(currentWriteError()?.key, "ideeza:test:full");
    assert.equal(notified, 1);
    const saved = new Map();
    target.localStorage = { setItem: (k, v) => saved.set(k, v) };
    assert.deepEqual(writeStoredKey("ideeza:test:full", [1]), { ok: true });
    assert.equal(saved.get("ideeza:test:full"), "[1]");
    assert.equal(currentWriteError(), null, "the next good write clears it");
  } finally {
    globalThis.window = prev;
  }
});

test("parseStored: absent, JSON and not-JSON", () => {
  assert.deepEqual(parseStored(null), { value: undefined, unreadable: false });
  assert.deepEqual(parseStored("[1]"), { value: [1], unreadable: false });
  assert.deepEqual(parseStored("{x"), { value: undefined, unreadable: true });
});
