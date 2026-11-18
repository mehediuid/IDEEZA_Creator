// Cancel auction (listing.ts `cancelBlockOf`, `cancelAuction`): an auction nobody has bid on
// comes down before it ends, the Main NFT is not listed again and the mint stays; once someone
// bids it can't be. Whatever blocked on "in an auction" (delete, edits) lets go after a cancel.
import { test } from "node:test";
import assert from "node:assert/strict";

const { AUCTION_BIDS_LINE, cancelAuction, cancelBlockOf, listingViewOf } = await import("../../.tmp-test/lib/market/listing.js");
const { deleteFactsOf } = await import("../../.tmp-test/lib/manual/project-read.js");
const { deleteBlockOf } = await import("../../.tmp-test/lib/manual/permissions.js");
const { listingEditGate } = await import("../../.tmp-test/lib/commerce/edit-gate.js");

const NOW = new Date(2026, 10, 15, 12, 0, 0, 0).getTime();
const HOUR = 3_600_000;
const META = { name: "Car", description: "", products: [], cover: null, at: NOW };

const auction = (o = {}) => ({
  id: "lst_1",
  projectId: "p1",
  slot: "main",
  source: "page",
  listedAt: NOW - HOUR,
  updatedAt: NOW - HOUR,
  type: "auction",
  token: "MATIC",
  minBid: "0.02",
  endsAt: NOW + 3 * HOUR,
  percentSelling: 10,
  royaltiesPct: 10,
  mintingType: "lazy",
  network: "mumbai",
  collection: "Cars",
  benefits: [],
  metadata: META,
  status: "live",
  events: [{ kind: "listed", at: NOW - HOUR }],
  ...o,
});

const bid = (o = {}) => ({ id: "bid_1", listingId: "lst_1", bidderId: "buyer-mira", amount: "0.03", token: "MATIC", at: NOW - 60_000, ...o });

test("cancelBlockOf: a running auction with no bids may be cancelled", () => {
  assert.equal(cancelBlockOf(auction(), [], NOW), null);
  assert.equal(cancelBlockOf(auction(), [bid({ listingId: "lst_other" })], NOW), null, "another listing's bid doesn't count");
});

test("cancelBlockOf: not once someone bids, after it ends, when it isn't live, or for Buy now", () => {
  assert.equal(cancelBlockOf(auction(), [bid()], NOW), AUCTION_BIDS_LINE);
  assert.equal(AUCTION_BIDS_LINE, "An auction can't be cancelled once someone bids.");
  assert.equal(cancelBlockOf(auction({ endsAt: NOW }), [], NOW), "The auction has ended. Close it instead.");
  assert.equal(cancelBlockOf(auction({ status: "removed" }), [], NOW), "Only a live auction can be cancelled.");
  assert.equal(cancelBlockOf(auction({ type: "buyNow", price: "0.05" }), [], NOW), "Only an auction can be cancelled.");
});

test("cancelAuction takes it down as a removed listing, its terms kept, and touches nothing else", () => {
  const other = auction({ id: "lst_2", projectId: "p2" });
  const r = cancelAuction([auction(), other], "lst_1", [], NOW);
  assert.equal(r.ok, true);
  const [cancelled, untouched] = r.listings;
  assert.equal(cancelled.status, "removed");
  assert.equal(cancelled.endedAt, NOW);
  assert.deepEqual(cancelled.events.at(-1), { kind: "removed", at: NOW });
  assert.equal(cancelled.minBid, "0.02", "the terms stay for the next listing");
  assert.equal(untouched, other);
});

test("cancelAuction refuses with bids or a missing listing, writing nothing", () => {
  const ls = [auction()];
  assert.deepEqual(cancelAuction(ls, "lst_1", [bid()], NOW), { ok: false, reason: AUCTION_BIDS_LINE });
  assert.deepEqual(cancelAuction(ls, "lst_gone", [], NOW), { ok: false, reason: "This listing no longer exists." });
  assert.equal(ls[0].status, "live");
});

test("after a cancel the Main NFT reads not listed, and delete and edits are no longer blocked", () => {
  const ownership = { maker: 100, holdings: [] };
  const viewOf = (listings) => listingViewOf("p1", { listings, sales: [], bids: [], now: NOW, current: META });
  const facts = (listings) => deleteFactsOf({ listing: viewOf(listings), sales: [], ownership, marketUnreadable: false });

  const before = [auction()];
  assert.equal(deleteBlockOf(facts(before))?.id, "auction");
  assert.equal(listingEditGate(viewOf(before), "rename").kind, "blocked");

  const r = cancelAuction(before, "lst_1", [], NOW);
  assert.equal(r.ok, true);
  const after = viewOf(r.listings);
  assert.equal(after.kind, "ended");
  assert.equal(after.why, "removed");
  assert.equal(facts(r.listings).auction, null);
  assert.equal(deleteBlockOf(facts(r.listings)), null);
  assert.equal(listingEditGate(after, "rename").kind, "free");
});
