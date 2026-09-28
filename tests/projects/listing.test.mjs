// The Main listing's pure state machine and store (Phase 2 spec §3.5.4;
// LISTING §2-3, P2-LISTING-2, -7, -14, -17, -20, -24, -25).
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  closeListing,
  createListing,
  dropProjectListings,
  editListing,
  listingLogOf,
  listingStatusLine,
  listingViewOf,
  metadataDiff,
  normalizeListings,
  pauseForEdit,
  relistChecklist,
  relistListing,
  removeListing,
} = await import("../../.tmp-test/lib/market/listing.js");

const NOW = new Date(2026, 8, 28, 21, 9, 0, 0).getTime();
const HOUR = 60 * 60_000;

function meta(overrides = {}) {
  return { name: "Car", description: "A toy car.", products: [{ id: "prd_a", name: "Chassis" }], cover: null, at: NOW, ...overrides };
}

function buyNowInput(overrides = {}) {
  return {
    network: "mumbai",
    collection: "col",
    type: "buyNow",
    mintingType: "lazy",
    token: "MATIC",
    price: "0.05",
    minBid: "",
    auctionBuyNow: "",
    endsAt: "",
    percentSelling: 10,
    royalties: "10",
    benefits: [],
    confirmOwner: true,
    ...overrides,
  };
}

function auctionInput(overrides = {}) {
  return buyNowInput({ type: "auction", price: "", minBid: "0.02", endsAt: "2026-10-03T14:30", ...overrides });
}

function idMaker(prefix = "lst_") {
  let n = 0;
  return { listing: () => `${prefix}${String(++n).padStart(8, "0")}` };
}

// ─────────────────────────────── createListing ─────────────────────────────

test("createListing writes a live listing from a valid input", () => {
  const r = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker());
  assert.equal(r.ok, true);
  assert.equal(r.listings.length, 1);
  assert.equal(r.listings[0].status, "live");
  assert.equal(r.listings[0].price, "0.05");
  assert.deepEqual(r.listings[0].events, [{ kind: "listed", at: NOW }]);
});

test("createListing refuses an input with no token, no share or no network", () => {
  assert.equal(createListing([], "p1", buyNowInput({ token: null }), meta(), "page", NOW, idMaker()).ok, false);
  assert.equal(
    createListing([], "p1", buyNowInput({ percentSelling: null }), meta(), "page", NOW, idMaker()).ok,
    false,
  );
  assert.equal(
    createListing([], "p1", buyNowInput({ network: null }), meta(), "page", NOW, idMaker()).ok,
    false,
  );
});

test("createListing works again once the prior listing is removed", () => {
  const first = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker());
  const removed = removeListing(first.listings, first.listings[0].id, NOW + 1000);
  const again = createListing(removed.listings, "p1", buyNowInput({ price: "0.08" }), meta(), "page", NOW + 2000, idMaker());
  assert.equal(again.ok, true);
  assert.equal(again.listings.length, 2);
});

// ─────────────────────────────── editListing ────────────────────────────────

test("editListing refuses on an auction", () => {
  const created = createListing([], "p1", auctionInput(), meta(), "page", NOW, idMaker());
  const r = editListing(created.listings, created.listings[0].id, buyNowInput({ price: "0.06" }), NOW + 1);
  assert.equal(r.ok, false);
  assert.match(r.reason, /can't be edited/);
});

test("editListing refuses a removed listing, with its reason", () => {
  const created = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker());
  const removed = removeListing(created.listings, created.listings[0].id, NOW + 1);
  const r = editListing(removed.listings, created.listings[0].id, buyNowInput({ price: "0.06" }), NOW + 2);
  assert.equal(r.ok, false);
  assert.match(r.reason, /live or paused listing can be edited/);
});

test("editListing refuses when nothing changed, and applies a real change", () => {
  const created = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker());
  const id = created.listings[0].id;
  const same = editListing(created.listings, id, buyNowInput(), NOW + 1);
  assert.equal(same.ok, false);
  assert.match(same.reason, /Change the price/);

  const changed = editListing(created.listings, id, buyNowInput({ price: "0.06" }), NOW + 1);
  assert.equal(changed.ok, true);
  assert.equal(changed.listings[0].price, "0.06");
  assert.equal(changed.listings[0].updatedAt, NOW + 1);
});

// ─────────────────────────────── removeListing ──────────────────────────────

test("removeListing refuses a listing that no longer exists", () => {
  const r = removeListing([], "lst_bogus", NOW);
  assert.equal(r.ok, false);
  assert.match(r.reason, /no longer exists/);
});

test("removeListing sets removed + endedAt on a live listing", () => {
  const created = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker());
  const r = removeListing(created.listings, created.listings[0].id, NOW + 500);
  assert.equal(r.ok, true);
  assert.equal(r.listings[0].status, "removed");
  assert.equal(r.listings[0].endedAt, NOW + 500);
});

// ─────────────────────────────── pauseForEdit ───────────────────────────────

test("pauseForEdit pauses a live listing, and appends on an already-paused one", () => {
  const created = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker());
  const id = created.listings[0].id;
  const paused = pauseForEdit(created.listings, id, "rename", NOW + 10);
  assert.equal(paused.ok, true);
  assert.equal(paused.listings[0].status, "paused");
  assert.deepEqual(paused.listings[0].pause, { at: NOW + 10, changes: ["rename"] });

  const again = pauseForEdit(paused.listings, id, "description", NOW + 20);
  assert.equal(again.ok, true);
  // The original pause time is kept; the new change reason is appended.
  assert.deepEqual(again.listings[0].pause, { at: NOW + 10, changes: ["rename", "description"] });
});

test("pauseForEdit refuses an auction", () => {
  const created = createListing([], "p1", auctionInput(), meta(), "page", NOW, idMaker());
  const r = pauseForEdit(created.listings, created.listings[0].id, "rename", NOW + 1);
  assert.equal(r.ok, false);
  assert.match(r.reason, /auction can't be paused/);
});

// ─────────────────────────────── relistListing ──────────────────────────────

test("relistListing refuses a live listing (only paused relists)", () => {
  const created = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker());
  const r = relistListing(created.listings, created.listings[0].id, meta(), true, NOW + 1);
  assert.equal(r.ok, false);
  assert.match(r.reason, /Only a paused listing/);
});

test("relistListing refuses while not ready", () => {
  const created = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker());
  const paused = pauseForEdit(created.listings, created.listings[0].id, "rename", NOW + 1);
  const r = relistListing(paused.listings, created.listings[0].id, meta(), false, NOW + 2);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "Finish the items above to relist.");
});

test("relistListing goes live again with a new metadata snapshot, once ready", () => {
  const created = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker());
  const paused = pauseForEdit(created.listings, created.listings[0].id, "rename", NOW + 1);
  const newMeta = meta({ name: "Racing Car" });
  const relisted = relistListing(paused.listings, created.listings[0].id, newMeta, true, NOW + 2);
  assert.equal(relisted.ok, true);
  assert.equal(relisted.listings[0].status, "live");
  assert.equal(relisted.listings[0].metadata.name, "Racing Car");
  assert.equal(relisted.listings[0].pause, undefined);
});

// ─────────────────────────────── closeListing ───────────────────────────────

test("closeListing refuses a running auction", () => {
  const created = createListing([], "p1", auctionInput({ endsAt: "2026-10-03T14:30" }), meta(), "page", NOW, idMaker());
  const r = closeListing(created.listings, created.listings[0].id, NOW + 1);
  assert.equal(r.ok, false);
  assert.match(r.reason, /hasn't ended yet/);
});

test("closeListing refuses a Buy now listing", () => {
  const created = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker());
  const r = closeListing(created.listings, created.listings[0].id, NOW + 1);
  assert.equal(r.ok, false);
  assert.match(r.reason, /Only an auction/);
});

test("closeListing closes an ended auction with no bids", () => {
  const endsAt = NOW + 5 * 60_000;
  const created = createListing(
    [],
    "p1",
    auctionInput({ endsAt: "2026-09-28T21:14" }),
    meta(),
    "page",
    NOW,
    idMaker(),
  );
  assert.equal(created.listings[0].endsAt, new Date("2026-09-28T21:14").getTime());
  const r = closeListing(created.listings, created.listings[0].id, endsAt + 1);
  assert.equal(r.ok, true);
  assert.equal(r.listings[0].status, "closed");
  assert.equal(r.listings[0].events.at(-1).kind, "closed");
});

// ─────────────────────────────── dropProjectListings ────────────────────────

test("dropProjectListings drops only the named project's rows", () => {
  const a = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker()).listings;
  const both = createListing(a, "p2", buyNowInput(), meta(), "page", NOW, idMaker()).listings;
  const left = dropProjectListings(both, "p1");
  assert.equal(left.length, 1);
  assert.equal(left[0].projectId, "p2");
});

// ─────────────────────────────── listingViewOf ──────────────────────────────

function saleFor(listing, overrides = {}) {
  return {
    id: "sale_1",
    listingId: listing.id,
    projectId: listing.projectId,
    at: listing.listedAt + 100,
    buyerId: "buyer-mira",
    buyerAddress: "0xaaa",
    sellerAddress: "0xbbb",
    item: { nft: "main", sharePct: listing.percentSelling },
    via: "buyNow",
    token: listing.token,
    price: listing.price ?? "0.05",
    fees: { ideezaBps: 250, ideeza: "0.00125", network: { coin: listing.token, amount: "0" } },
    payout: "0.04875",
    royaltiesPct: listing.royaltiesPct,
    mint: "lazy",
    mintedAtSale: true,
    tokenId: 1,
    network: listing.network,
    collection: listing.collection,
    benefits: [],
    txHash: "0xdeadbeef",
    demo: true,
    ...overrides,
  };
}

test("listingViewOf: none with no listing", () => {
  const v = listingViewOf("p1", { listings: [], sales: [], bids: [], now: NOW, current: meta() });
  assert.deepEqual(v, { kind: "none" });
});

test("listingViewOf: sold when a Sale names the latest listing", () => {
  const created = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker());
  const listing = created.listings[0];
  const sale = saleFor(listing);
  const v = listingViewOf("p1", { listings: created.listings, sales: [sale], bids: [], now: NOW + 1000, current: meta() });
  assert.equal(v.kind, "sold");
  assert.equal(v.sale.id, sale.id);
});

test("listingViewOf: live when a newer listing exists after the sale", () => {
  const created = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker());
  const sold = created.listings[0];
  const sale = saleFor(sold);
  const relistedInput = buyNowInput({ price: "0.08" });
  const second = createListing(created.listings, "p1", relistedInput, meta(), "page", NOW + 5000, idMaker("lst_b"));
  const v = listingViewOf("p1", { listings: second.listings, sales: [sale], bids: [], now: NOW + 6000, current: meta() });
  assert.equal(v.kind, "live");
  assert.equal(v.listing.price, "0.08");
});

test("listingViewOf: ended, removed", () => {
  const created = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker());
  const removed = removeListing(created.listings, created.listings[0].id, NOW + 10);
  const v = listingViewOf("p1", { listings: removed.listings, sales: [], bids: [], now: NOW + 20, current: meta() });
  assert.deepEqual(v.kind, "ended");
  assert.equal(v.why, "removed");
});

test("listingViewOf: ended, no bids (a closed auction)", () => {
  const created = createListing([], "p1", auctionInput({ endsAt: "2026-09-28T21:14" }), meta(), "page", NOW, idMaker());
  const closed = closeListing(created.listings, created.listings[0].id, NOW + 5 * 60_000 + 1);
  const v = listingViewOf("p1", {
    listings: closed.listings,
    sales: [],
    bids: [],
    now: NOW + 5 * 60_000 + 2,
    current: meta(),
  });
  assert.equal(v.kind, "ended");
  assert.equal(v.why, "noBids");
});

test("listingViewOf: paused carries the metadata diff", () => {
  const created = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker());
  const paused = pauseForEdit(created.listings, created.listings[0].id, "rename", NOW + 1);
  const v = listingViewOf("p1", {
    listings: paused.listings,
    sales: [],
    bids: [],
    now: NOW + 2,
    current: meta({ name: "Racing Car" }),
  });
  assert.equal(v.kind, "paused");
  assert.deepEqual(v.changed, ["the name"]);
});

test("listingViewOf: auction phases are right under a fixed now", () => {
  const endsAt = NOW + 2 * HOUR;
  const created = createListing([], "p1", auctionInput({ endsAt: "2026-09-28T23:09", minBid: "0.02" }), meta(), "page", NOW, idMaker());
  const id = created.listings[0].id;
  const bids = [
    { id: "bid_1", listingId: id, bidderId: "buyer-mira", amount: "0.04", token: "MATIC", at: NOW + 100 },
    { id: "bid_2", listingId: id, bidderId: "buyer-leo", amount: "0.03", token: "MATIC", at: NOW + 200 },
  ];

  const running = listingViewOf("p1", { listings: created.listings, sales: [], bids, now: endsAt - 61 * 60_000, current: meta() });
  assert.equal(running.auction.phase, "running");
  assert.equal(running.auction.top.amount, "0.04");

  const endingSoon = listingViewOf("p1", { listings: created.listings, sales: [], bids, now: endsAt - 30 * 60_000, current: meta() });
  assert.equal(endingSoon.auction.phase, "endingSoon");

  const ended = listingViewOf("p1", { listings: created.listings, sales: [], bids, now: endsAt, current: meta() });
  assert.equal(ended.auction.phase, "ended");
  assert.equal(ended.auction.msLeft, 0);
});

// ─────────────────────────────── listingStatusLine ──────────────────────────

test("listingStatusLine: the Buy now, auction and paused lines", () => {
  const created = createListing([], "p1", buyNowInput({ price: "0.05" }), meta(), "page", NOW, idMaker());
  const live = listingViewOf("p1", { listings: created.listings, sales: [], bids: [], now: NOW, current: meta() });
  assert.equal(listingStatusLine(live, NOW), "Listed Sep 28, 2026 · Buy now · 0.05 MATIC");

  const paused = pauseForEdit(created.listings, created.listings[0].id, "rename", NOW + 1);
  const pausedView = listingViewOf("p1", { listings: paused.listings, sales: [], bids: [], now: NOW + 2, current: meta() });
  assert.equal(listingStatusLine(pausedView, NOW + 2), "Paused Sep 28, 2026 · relist it from the Marketplace block");

  assert.equal(listingStatusLine({ kind: "none" }, NOW), null);
});

// ─────────────────────────────── metadataDiff ───────────────────────────────

test("metadataDiff: the name plus one product added", () => {
  const was = meta();
  const now = meta({ name: "Racing Car", products: [...was.products, { id: "prd_b", name: "Wheels" }] });
  assert.deepEqual(metadataDiff(was, now), ["the name", "1 product added"]);
});

test("metadataDiff: nothing changed gives an empty list", () => {
  assert.deepEqual(metadataDiff(meta(), meta()), []);
});

// ─────────────────────────────── relistChecklist ────────────────────────────

test("relistChecklist has exactly 2 items", () => {
  const readiness = {
    purpose: "relist",
    ok: true,
    rules: [{ id: "videos", ok: true, fixedIn: "gate", reason: null }],
    products: [],
    counts: { total: 1, ready: 1, rendering: 0, missing: 0 },
    blocker: null,
    gateBlocker: null,
  };
  const items = relistChecklist(readiness, ["the name", "1 product added"]);
  assert.equal(items.length, 2);
  assert.equal(items[0].id, "videos");
  assert.equal(items[0].ok, true);
  assert.equal(items[1].id, "metadata");
});

test("relistChecklist: a missing video is not ok, and points at generating videos", () => {
  const readiness = {
    purpose: "relist",
    ok: false,
    rules: [{ id: "videos", ok: false, fixedIn: "gate", reason: "missing" }],
    products: [],
    counts: { total: 1, ready: 0, rendering: 0, missing: 1 },
    blocker: "videos",
    gateBlocker: "videos",
  };
  const items = relistChecklist(readiness, []);
  assert.equal(items[0].ok, false);
  assert.equal(typeof items[0].href, "string");
});

// ─────────────────────────────── listingLogOf ───────────────────────────────

test("listingLogOf: list, edit, pause, relist and remove, newest first", () => {
  const created = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker());
  const id = created.listings[0].id;
  const edited = editListing(created.listings, id, buyNowInput({ price: "0.06" }), NOW + 1000);
  const paused = pauseForEdit(edited.listings, id, "rename", NOW + 2000);
  const relisted = relistListing(paused.listings, id, meta(), true, NOW + 3000);
  const removed = removeListing(relisted.listings, id, NOW + 4000);

  const log = listingLogOf(removed.listings, "p1");
  assert.equal(log.length, 5);
  assert.deepEqual(
    log.map((e) => e.event.kind),
    ["removed", "relisted", "paused", "updated", "listed"],
  );
  // Newest first.
  for (let i = 1; i < log.length; i++) assert.ok(log[i - 1].at >= log[i].at);
});

// ─────────────────────────────── normalizeListings ──────────────────────────

test("normalizeListings drops a malformed row and keeps the rest", () => {
  const good = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker()).listings[0];
  const raw = [good, { id: "lst_bad", projectId: "p2" /* missing everything else */ }, "not even a row"];
  const out = normalizeListings(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, good.id);
});

test("normalizeListings: corrupt JSON gives []", () => {
  assert.deepEqual(normalizeListings("{not json"), []);
  assert.deepEqual(normalizeListings(null), []);
  assert.deepEqual(normalizeListings(undefined), []);
  assert.deepEqual(normalizeListings({ not: "an array" }), []);
});

test("normalizeListings round-trips a listing through JSON", () => {
  const good = createListing([], "p1", buyNowInput(), meta(), "page", NOW, idMaker()).listings[0];
  const out = normalizeListings(JSON.stringify([good]));
  assert.deepEqual(out, [good]);
});
