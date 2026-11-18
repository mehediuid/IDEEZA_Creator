// A purchase's checkout hold (checkout-hold.ts): while a buyer pays, other views of the item
// wait, and the owner's Main NFT row says so. Holds lapse on their own after 10 minutes.
import { test } from "node:test";
import assert from "node:assert/strict";

const hold = await import("../../.tmp-test/lib/market/checkout-hold.js");
const { mainRowStateOf } = await import("../../.tmp-test/lib/manual/earn-view.js");

const NOW = new Date(2026, 10, 15, 12, 0, 0, 0).getTime();
const MIN = 60_000;

const h = (o = {}) => ({ id: "hold_a", itemId: "lst_1", tab: "tab_a", expiresAt: NOW + 5 * MIN, ...o });

test("newHold lapses 10 minutes after it's written", () => {
  const made = hold.newHold({ id: "hold_a", itemId: "lst_1", tab: "tab_a", now: NOW });
  assert.deepEqual(made, { id: "hold_a", itemId: "lst_1", tab: "tab_a", expiresAt: NOW + 10 * MIN });
  assert.equal(hold.CHECKOUT_HOLD_MS, 10 * MIN);
});

test("liveHolds drops lapsed, malformed and far-future holds, and reads a non-list as none", () => {
  const raw = [
    h(),
    h({ id: "hold_lapsed", expiresAt: NOW }),
    h({ id: "hold_far", expiresAt: NOW + 11 * MIN }),
    { id: "hold_bad", itemId: "lst_1", tab: "tab_a" },
    { id: "", itemId: "lst_1", tab: "tab_a", expiresAt: NOW + MIN },
    "junk",
    null,
  ];
  assert.deepEqual(hold.liveHolds(raw, NOW).map((x) => x.id), ["hold_a"]);
  assert.deepEqual(hold.liveHolds({ id: "hold_a" }, NOW), []);
  assert.deepEqual(hold.liveHolds(undefined, NOW), []);
});

test("addHold keeps one copy of a hold; releaseHold takes only its own and leaves another tab's", () => {
  const mine = h({ id: "hold_mine", tab: "tab_a" });
  const theirs = h({ id: "hold_theirs", tab: "tab_b" });
  const added = hold.addHold([theirs, h({ id: "hold_old", expiresAt: NOW - 1 })], mine, NOW);
  assert.deepEqual(added.map((x) => x.id), ["hold_theirs", "hold_mine"], "the lapsed one goes on the way");
  assert.equal(hold.addHold(added, mine, NOW).length, 2, "adding it again doesn't double it");
  assert.deepEqual(hold.releaseHold(added, "hold_mine", NOW).map((x) => x.id), ["hold_theirs"]);
  assert.deepEqual(hold.releaseHold(added, "hold_gone", NOW).map((x) => x.id), ["hold_theirs", "hold_mine"]);
});

test("heldCount counts an item's holds, leaving out the asking tab's own", () => {
  const holds = [h({ id: "1", tab: "tab_a" }), h({ id: "2", tab: "tab_b" }), h({ id: "3", itemId: "trk_1", tab: "tab_b" })];
  assert.equal(hold.heldCount(holds, "lst_1"), 2);
  assert.equal(hold.heldCount(holds, "lst_1", "tab_a"), 1);
  assert.equal(hold.heldCount(holds, "lst_1", "tab_b"), 1);
  assert.equal(hold.heldCount(holds, "lst_2"), 0);
});

test("nextLapse is the earliest hold's end", () => {
  assert.equal(hold.nextLapse([]), null);
  assert.equal(hold.nextLapse([h({ expiresAt: NOW + 4 * MIN }), h({ expiresAt: NOW + 2 * MIN })]), NOW + 2 * MIN);
});

test("checkoutBlocks: a Main NFT waits on one checkout; copies only once every unit left is held", () => {
  assert.equal(hold.checkoutBlocks(0, 1), false);
  assert.equal(hold.checkoutBlocks(1, 1), true);
  assert.equal(hold.checkoutBlocks(2, 3), false, "a unit is still free");
  assert.equal(hold.checkoutBlocks(3, 3), true);
  assert.equal(hold.checkoutBlocks(1, 0), false, "sold out says so itself");
});

test("the words", () => {
  assert.equal(hold.IN_CHECKOUT_BUYER_LINE, "Someone is buying this now. Try again in a few minutes.");
  assert.equal(hold.IN_CHECKOUT_OWNER_LINE, "In checkout · a buyer is paying now");
});

test("the owner's Main NFT row reads In checkout while a buyer pays a live listing", () => {
  const listing = {
    id: "lst_1", projectId: "p1", slot: "main", source: "page", listedAt: NOW, updatedAt: NOW, type: "buyNow",
    token: "MATIC", price: "0.05", percentSelling: 10, royaltiesPct: 10, mintingType: "lazy", network: "mumbai",
    collection: "Cars", benefits: [], metadata: { name: "Car", description: "", products: [], cover: null, at: NOW },
    status: "live", events: [],
  };
  const row = (o = {}) =>
    mainRowStateOf({ status: "listed", listing: { kind: "live", listing, auction: null }, locked: false, canList: true, manage: true, ...o });
  assert.deepEqual(row({ inCheckout: true }), { line: "In checkout · a buyer is paying now", live: true, action: "manage", label: "Manage" });
  assert.equal(row().line, "Listed · 0.05 MATIC · 10%");
  const paused = row({ inCheckout: true, status: "paused", listing: { kind: "paused", listing, changed: [] } });
  assert.equal(paused.line, "Paused · nobody can see or buy it", "only a live listing can be in checkout");
});
