// The Auction bid card's pure logic (Phase 2 spec §3.5.5, P2-MARKETPLACE-11,
// -12, -17).
import { test } from "node:test";
import assert from "node:assert/strict";

const { auctionStateOf, bidsOf, makeBid, settleAuction, timeLeftLabel, validateBid } = await import(
  "../../.tmp-test/lib/market/auction.js"
);
const { toMicros } = await import("../../.tmp-test/lib/wallet/money.js");

function listingFixture(overrides = {}) {
  return {
    id: "lst_1",
    projectId: "proj_1",
    slot: "main",
    source: "page",
    listedAt: 1000,
    updatedAt: 1000,
    type: "auction",
    token: "MATIC",
    minBid: "0.02",
    auctionBuyNow: "0.10",
    endsAt: 100_000,
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

function bid(overrides = {}) {
  return { id: "bid_x", listingId: "lst_1", bidderId: "buyer-mira", amount: "0.02", token: "MATIC", at: 1, ...overrides };
}

test("bidsOf: highest first, a tie goes to the earlier bid", () => {
  const bids = [
    bid({ id: "bid_low", amount: "0.02", at: 1 }),
    bid({ id: "bid_high", amount: "0.05", at: 3 }),
    bid({ id: "bid_tie_late", amount: "0.04", at: 5 }),
    bid({ id: "bid_tie_early", amount: "0.04", at: 2 }),
  ];
  const sorted = bidsOf("lst_1", bids);
  assert.deepEqual(
    sorted.map((b) => b.id),
    ["bid_high", "bid_tie_early", "bid_tie_late", "bid_low"],
  );
});

test("timeLeftLabel", () => {
  assert.equal(timeLeftLabel(59_000), "Under a minute left");
  assert.equal(timeLeftLabel(42 * 60_000), "42m left");
  assert.equal(timeLeftLabel(2 * 3_600_000 + 14 * 60_000), "2h 14m left");
});

test("auctionStateOf: phase and minNext", () => {
  const listing = listingFixture({ endsAt: 10_000_000 });
  const noBids = auctionStateOf(listing, [], 1_000_000);
  assert.equal(noBids.phase, "running");
  assert.equal(noBids.top, null);
  assert.equal(noBids.minNext, "0.02");

  const endingSoon = auctionStateOf(listing, [], 10_000_000 - 3_600_000 + 1);
  assert.equal(endingSoon.phase, "endingSoon");

  const withTop = auctionStateOf(listing, [bid({ amount: "0.04" })], 1_000_000);
  assert.equal(withTop.top.amount, "0.04");
  assert.equal(withTop.minNext, "0.040001");

  const ended = auctionStateOf(listing, [], 10_000_000);
  assert.equal(ended.phase, "ended");
  assert.equal(ended.msLeft, 0);
});

test("validateBid: the P2-MARKETPLACE-11 copy table", () => {
  const listing = listingFixture();
  const state0 = auctionStateOf(listing, [], 0);
  assert.equal(validateBid("", state0, listing, toMicros("10")).message, "Enter a bid.");
  assert.equal(validateBid("abc", state0, listing, toMicros("10")).message, "Enter an amount like 0.05, up to 6 decimal places.");
  assert.equal(validateBid("0.0000001", state0, listing, toMicros("10")).message, "Enter an amount like 0.05, up to 6 decimal places.");
  assert.equal(validateBid("0.01", state0, listing, toMicros("10")).message, "Bid at least 0.02 MATIC — the starting bid.");

  const withTop = auctionStateOf(listing, [bid({ amount: "0.04" })], 0);
  assert.equal(validateBid("0.04", withTop, listing, toMicros("10")).message, "Bid more than the current bid, 0.04 MATIC.");
  // formatAmount normalizes "0.10" to "0.1" (money.ts strips trailing zeros — see money.test.mjs).
  assert.equal(validateBid("0.10", withTop, listing, toMicros("10")).message, "That's the buy-now price or more — use Buy now with 0.1 MATIC instead.");
  assert.equal(
    validateBid("0.05", withTop, listing, toMicros("0.03")).message,
    "Your demo wallet has 0.03 MATIC free. Bid less, or top up the demo wallet.",
  );

  const ok = validateBid("0.05", withTop, listing, toMicros("10"));
  assert.equal(ok.ok, true);
  assert.equal(ok.micros, toMicros("0.05"));
});

test("validateBid: after Leo bids 0.04, Sam submitting 0.04 is refused", () => {
  const listing = listingFixture();
  const state = auctionStateOf(listing, [bid({ bidderId: "buyer-leo", amount: "0.04" })], 0);
  const result = validateBid("0.04", state, listing, toMicros("10"));
  assert.equal(result.ok, false);
  assert.equal(result.message, "Bid more than the current bid, 0.04 MATIC.");
});

test("makeBid appends the bid as given", () => {
  const b = makeBid({ listingId: "lst_1", bidderId: "buyer-sam", amount: "0.05", token: "MATIC", now: 42 });
  assert.match(b.id, /^bid_[0-9a-z]{8}$/);
  assert.equal(b.listingId, "lst_1");
  assert.equal(b.bidderId, "buyer-sam");
  assert.equal(b.amount, "0.05");
  assert.equal(b.at, 42);
});

test("settleAuction: running before endsAt, the top bid at endsAt, noBids with none, a tie goes to the earlier bid", () => {
  const listing = listingFixture({ endsAt: 100_000 });
  assert.deepEqual(settleAuction(listing, [bid({ amount: "0.04" })], 99_999), { kind: "running" });

  const atEnd = settleAuction(listing, [bid({ id: "bid_a", amount: "0.02", at: 1 }), bid({ id: "bid_b", amount: "0.04", at: 2 })], 100_000);
  assert.equal(atEnd.kind, "sale");
  assert.equal(atEnd.bid.amount, "0.04");

  assert.deepEqual(settleAuction(listing, [], 100_000), { kind: "noBids" });

  const tie = settleAuction(
    listing,
    [bid({ id: "bid_late", amount: "0.05", at: 5 }), bid({ id: "bid_early", amount: "0.05", at: 2 })],
    100_000,
  );
  assert.equal(tie.bid.id, "bid_early");
});

test("settleAuction: a bid availableOf refuses is skipped, not disqualifying the auction", () => {
  const listing = listingFixture({ endsAt: 100_000 });
  const bids = [bid({ id: "bid_top", amount: "0.05", at: 1 }), bid({ id: "bid_next", amount: "0.04", at: 2 })];
  const result = settleAuction(listing, bids, 100_000, (b) => b.id !== "bid_top");
  assert.equal(result.kind, "sale");
  assert.equal(result.bid.id, "bid_next");
});
