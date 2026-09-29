// The "Add to marketplace" form's pure model (Phase 2 spec §3.5.4; LISTING
// §2.B, P2-LISTING-4, -5, -22, -24).
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  AUCTION_MAX_MS,
  AUCTION_MIN_MS,
  listingInputFromBrief,
  listingInputFromListing,
  listingProblems,
  listingSummaryRows,
  sellingSteps,
} = await import("../../.tmp-test/lib/market/listing-form.js");
const { DEFAULT_STATE } = await import("../../.tmp-test/lib/brief/types.js");

// A whole minute, in local time, so a `datetime-local` round trip loses no
// precision (the control never carries seconds).
const NOW = new Date(2026, 8, 28, 21, 9, 0, 0).getTime();

function localInput(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buyNow(overrides = {}) {
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

function auction(overrides = {}) {
  return buyNow({
    type: "auction",
    price: "",
    minBid: "0.02",
    endsAt: localInput(NOW + 6 * 60_000),
    ...overrides,
  });
}

function ctx(overrides = {}) {
  return { mode: "add", now: NOW, creatorPct: 100, ...overrides };
}

test("a fully valid Buy now input has no problem", () => {
  assert.deepEqual(listingProblems(buyNow(), ctx()), { first: null, fields: {} });
});

test("a fully valid auction input has no problem", () => {
  assert.deepEqual(listingProblems(auction(), ctx()), { first: null, fields: {} });
});

test("LISTING-5: Buy now with no token, or no price", () => {
  const a = listingProblems(buyNow({ price: "" }), ctx());
  assert.equal(a.first, "Choose a token and enter a price.");
  assert.equal(a.fields.price, "Choose a token and enter a price.");
  const b = listingProblems(buyNow({ token: null }), ctx());
  assert.equal(b.fields.price, "Choose a token and enter a price.");
});

test("LISTING-5: the price is 0", () => {
  const r = listingProblems(buyNow({ price: "0" }), ctx());
  assert.equal(r.first, "The price must be above 0.");
});

test("LISTING-5: more than 6 decimals", () => {
  const r = listingProblems(buyNow({ price: "0.1234567" }), ctx());
  assert.equal(r.fields.price, "Use at most 6 decimal places.");
});

test("LISTING-5: auction with no token, or no minimum bid", () => {
  const r = listingProblems(auction({ minBid: "" }), ctx());
  assert.equal(r.first, "Choose a token and enter the minimum bid.");
});

test("LISTING-5: the buy now price is typed but is 0", () => {
  const r = listingProblems(auction({ auctionBuyNow: "0" }), ctx());
  assert.equal(r.fields.auctionBuyNow, "The buy now price must be above 0.");
});

test("LISTING-5: the minimum bid can't be above the buy now price", () => {
  const r = listingProblems(auction({ minBid: "0.5", auctionBuyNow: "0.1" }), ctx());
  assert.equal(r.fields.minBid, "The minimum bid has to be below the buy now price.");
});

test("LISTING-5: no end date", () => {
  const r = listingProblems(auction({ endsAt: "" }), ctx());
  assert.equal(r.fields.endsAt, "Set the date the auction ends.");
});

test("LISTING-5: an end under 5 minutes away", () => {
  const r = listingProblems(auction({ endsAt: localInput(NOW + 4 * 60_000) }), ctx());
  assert.equal(r.fields.endsAt, "Set an end at least 5 minutes from now.");
  // Right at the boundary is fine.
  const ok = listingProblems(auction({ endsAt: localInput(NOW + AUCTION_MIN_MS) }), ctx());
  assert.equal(ok.fields.endsAt, undefined);
});

test("LISTING-5: an end over 30 days away", () => {
  const r = listingProblems(auction({ endsAt: localInput(NOW + AUCTION_MAX_MS + 60_000) }), ctx());
  assert.equal(r.fields.endsAt, "Keep the auction to 30 days or less.");
});

test("LISTING-5: selling percentage above creatorPct", () => {
  const r = listingProblems(buyNow({ percentSelling: 50 }), ctx({ creatorPct: 30 }));
  assert.equal(r.fields.percentSelling, "You can sell up to 30% — the rest belongs to contributors or buyers.");
});

test("LISTING-5: royalties empty or out of range", () => {
  assert.equal(listingProblems(buyNow({ royalties: "" }), ctx()).fields.royalties, "Set the royalties percentage.");
  assert.equal(
    listingProblems(buyNow({ royalties: "15" }), ctx()).fields.royalties,
    "Royalties must be between 2 and 10%.",
  );
  assert.equal(
    listingProblems(buyNow({ royalties: "1" }), ctx()).fields.royalties,
    "Royalties must be between 2 and 10%.",
  );
});

test("LISTING-5: a benefit with an empty name", () => {
  const r = listingProblems(buyNow({ benefits: [{ id: "b1", name: "  ", duration: { whileHeld: true } }] }), ctx());
  assert.equal(r.fields.benefits, "Name this benefit, or remove it.");
});

test("LISTING-5: the checkbox is unticked", () => {
  const r = listingProblems(buyNow({ confirmOwner: false }), ctx());
  assert.equal(r.fields.confirmOwner, "Confirm you're the rightful owner and take responsibility for it.");
});

test("LISTING-5: edit with nothing changed", () => {
  const original = {
    id: "lst_00000001",
    projectId: "p1",
    slot: "main",
    source: "page",
    listedAt: NOW - 1000,
    updatedAt: NOW - 1000,
    type: "buyNow",
    token: "MATIC",
    price: "0.05",
    percentSelling: 10,
    royaltiesPct: 10,
    mintingType: "lazy",
    network: "mumbai",
    collection: "col",
    benefits: [],
    metadata: { name: "Car", description: "", products: [], cover: null, at: NOW - 1000 },
    status: "live",
    events: [],
  };
  const same = listingProblems(buyNow(), ctx({ mode: "edit", original }));
  assert.equal(same.first, "Change the price, the selling percentage, the royalties or a benefit to update.");

  const changed = listingProblems(buyNow({ price: "0.06" }), ctx({ mode: "edit", original }));
  assert.equal(changed.first, null);
});

test("listingInputFromBrief reads the draft and writes nothing (C13)", () => {
  const draft = {
    ...DEFAULT_STATE,
    intent: "sell",
    network: "mumbai",
    collection: "Widgets",
    listingType: "buyNow",
    token: "MATIC",
    price: "0.05",
    mintType: "lazy",
    sellingPct: "10",
    royalties: "10",
    benefits: [],
    confirmOwnership: true,
  };
  const frozen = JSON.parse(JSON.stringify(draft));
  const input = listingInputFromBrief(draft);
  assert.deepEqual(input, {
    network: "mumbai",
    collection: "Widgets",
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
  });
  // No function writes: the draft object is untouched.
  assert.deepEqual(draft, frozen);
});

test("listingInputFromBrief: an empty selling percentage reads as null, not 0", () => {
  const input = listingInputFromBrief({ ...DEFAULT_STATE, sellingPct: "" });
  assert.equal(input.percentSelling, null);
});

test("listingInputFromListing prefills Edit, and 'Add again' after Remove", () => {
  const l = {
    id: "lst_1",
    projectId: "p1",
    slot: "main",
    source: "page",
    listedAt: NOW,
    updatedAt: NOW,
    type: "buyNow",
    token: "MATIC",
    price: "0.05",
    percentSelling: 10,
    royaltiesPct: 10,
    mintingType: "lazy",
    network: "mumbai",
    collection: "col",
    benefits: [],
    metadata: { name: "Car", description: "", products: [], cover: null, at: NOW },
    status: "removed",
    endedAt: NOW,
    events: [],
  };
  const input = listingInputFromListing(l);
  assert.equal(input.price, "0.05");
  assert.equal(input.confirmOwner, true);
  assert.equal(input.type, "buyNow");
});

test("sellingSteps: the fixed steps, plus 'All of your share' when creatorPct isn't one", () => {
  const at40 = sellingSteps(40);
  assert.deepEqual(
    at40.map((s) => s.value),
    [10, 25, 40, 50, 75, 100],
  );
  assert.equal(at40.find((s) => s.value === 40).label, "All of your share (40%)");
  assert.equal(at40.find((s) => s.value === 50).disabled, true);
  assert.equal(at40.find((s) => s.value === 25).disabled, false);

  // creatorPct already one of the fixed steps: no extra row.
  const at50 = sellingSteps(50);
  assert.deepEqual(
    at50.map((s) => s.value),
    [10, 25, 50, 75, 100],
  );
});

test("listingSummaryRows: Buy now shows the fee and the payout", () => {
  const rows = listingSummaryRows(buyNow({ price: "0.05", token: "MATIC" }), ctx());
  const lines = rows.map((r) => (r.label ? `${r.label} · ${r.value}` : r.value));
  assert.ok(lines.includes("IDEEZA fee (2.5%) · 0.00125 MATIC per sale"));
  assert.ok(lines.includes("You receive · 0.04875 MATIC"));
});

test("listingSummaryRows: the auction variant says the fee comes from the winning bid", () => {
  const rows = listingSummaryRows(auction(), ctx());
  const lines = rows.map((r) => (r.label ? `${r.label} · ${r.value}` : r.value));
  assert.ok(lines.includes("IDEEZA fee (2.5%) · taken from the winning bid"));
  assert.ok(lines.includes("You receive the winning bid minus 2.5%"));
});

// ── final fix wave: the auction's validation gaps (R1 minor) ──

test("LISTING-5: an auction's Buy now of \".\" is not a price", () => {
  const r = listingProblems(auction({ auctionBuyNow: "." }), ctx());
  assert.equal(r.fields.auctionBuyNow, "Enter the buy now price, or leave it empty.");
  assert.equal(listingProblems(auction({ auctionBuyNow: "abc" }), ctx()).fields.auctionBuyNow, "Enter the buy now price, or leave it empty.");
});

test("LISTING-5: a minimum bid equal to the Buy now price is refused — every bid would be", () => {
  const r = listingProblems(auction({ minBid: "0.05", auctionBuyNow: "0.050" }), ctx());
  assert.equal(r.fields.minBid, "The minimum bid has to be below the buy now price.");
  assert.equal(listingProblems(auction({ minBid: "0.049", auctionBuyNow: "0.05" }), ctx()).first, null);
});

test("LISTING-5: a minimum bid of 0 is refused", () => {
  assert.equal(listingProblems(auction({ minBid: "0" }), ctx()).fields.minBid, "The minimum bid must be above 0.");
  assert.equal(listingProblems(auction({ minBid: "0.000" }), ctx()).fields.minBid, "The minimum bid must be above 0.");
});

test("LISTING-5: an end date that doesn't parse is refused, not skipped", () => {
  assert.equal(listingProblems(auction({ endsAt: "soon" }), ctx()).fields.endsAt, "Set the date the auction ends.");
});

test("LISTING-5: an edit to the same price, written differently, is still nothing changed", () => {
  const original = { token: "MATIC", price: "0.05", percentSelling: 10, royaltiesPct: 10, benefits: [] };
  const r = listingProblems(buyNow({ price: "0.050" }), ctx({ mode: "edit", original }));
  assert.equal(r.first, "Change the price, the selling percentage, the royalties or a benefit to update.");
});
