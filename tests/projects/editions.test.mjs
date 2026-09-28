// The product page's Physical / Virtual NFT tracks (Phase 2 spec §3.5.5,
// P2-TABS-24…28).
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  canCreate,
  checkCreateTrack,
  checkEditionListing,
  editionGate,
  editionsHiddenWith,
  listGate,
  normalizeEditions,
  soldOf,
  tracksOf,
} = await import("../../.tmp-test/lib/market/editions.js");

function trackFixture(overrides = {}) {
  return {
    id: "ed_1",
    projectId: "proj_1",
    productId: "prd_1",
    kind: "physical",
    use: "private",
    supply: { total: 10 },
    createdAt: 1,
    lazy: true,
    listing: null,
    demo: true,
    ...overrides,
  };
}

test("editionGate: Draft (not minted) blocks with the mint-first copy", () => {
  assert.deepEqual(editionGate({ minted: false, intent: null, projectName: "Car" }), {
    kind: "blocked",
    reason: "Mint Car first — its NFTs use the project's collection and blockchain.",
  });
});

test("editionGate: Given blocks — licences for it aren't sold", () => {
  assert.deepEqual(editionGate({ minted: true, intent: "give", projectName: "Car" }), {
    kind: "blocked",
    reason: "Car was given to the community, so licences for it aren't sold.",
  });
});

test("editionGate: otherwise ok", () => {
  assert.deepEqual(editionGate({ minted: true, intent: "sell", projectName: "Car" }), { kind: "ok" });
  assert.deepEqual(editionGate({ minted: true, intent: "save", projectName: "Car" }), { kind: "ok" });
});

test("listGate: Main live or paused is ok; otherwise it's blocked with the list-first copy", () => {
  assert.deepEqual(listGate({ kind: "live" }, "Car"), { kind: "ok" });
  assert.deepEqual(listGate({ kind: "paused" }, "Car"), { kind: "ok" });
  const blocked = listGate({ kind: "none" }, "Car");
  assert.equal(blocked.kind, "blocked");
  assert.equal(blocked.reason, "List Car on the marketplace first — its NFTs are sold on the project's listing.");
  assert.equal(listGate({ kind: "sold" }, "Car").kind, "blocked");
  assert.equal(listGate({ kind: "ended" }, "Car").kind, "blocked");
});

test("canCreate: both uses free on a fresh product; the Create button retires once both exist", () => {
  const fresh = canCreate([], "prd_1", "physical");
  assert.deepEqual([...fresh.availableUses].sort(), ["commercial", "private"]);
  assert.equal(fresh.bothCreated, false);

  const afterPrivate = canCreate([trackFixture({ use: "private" })], "prd_1", "physical");
  assert.deepEqual(afterPrivate.availableUses, ["commercial"]);
  assert.equal(afterPrivate.bothCreated, false);

  const afterBoth = canCreate(
    [trackFixture({ use: "private" }), trackFixture({ id: "ed_2", use: "commercial" })],
    "prd_1",
    "physical",
  );
  assert.equal(afterBoth.bothCreated, true);

  // A different kind, or a different product, doesn't count against this one.
  const virtualStillFree = canCreate([trackFixture({ use: "private" })], "prd_1", "virtual");
  assert.equal(virtualStillFree.bothCreated, false);
  const otherProductStillFree = canCreate([trackFixture({ use: "private" })], "prd_2", "physical");
  assert.equal(otherProductStillFree.bothCreated, false);
});

test("checkCreateTrack: 'Choose a use.', the count range, and the lazy-mint checkbox", () => {
  assert.equal(checkCreateTrack({ use: null, count: 10, confirmed: true }), "Choose a use.");
  assert.equal(checkCreateTrack({ use: "private", count: 0, confirmed: true }), "Enter a whole number from 1 to 10,000.");
  assert.equal(checkCreateTrack({ use: "private", count: 10_001, confirmed: true }), "Enter a whole number from 1 to 10,000.");
  assert.equal(checkCreateTrack({ use: "private", count: 10, confirmed: false }), "Tick the box to confirm lazy minting.");
  assert.equal(checkCreateTrack({ use: "private", count: 10, confirmed: true }), null);
});

test("tracksOf and soldOf scope by product and track", () => {
  const tracks = [trackFixture({ id: "ed_1", productId: "prd_1" }), trackFixture({ id: "ed_2", productId: "prd_2" })];
  assert.deepEqual(tracksOf("prd_1", tracks).map((t) => t.id), ["ed_1"]);

  const editionSale = (trackId, n) => ({
    item: { nft: "physical", trackId, productId: "prd_1", productName: "Widget", use: "private", tier: "regular", serial: n },
  });
  const mainSale = { item: { nft: "main", sharePct: 10 } };
  assert.equal(soldOf("ed_1", [editionSale("ed_1", 1), editionSale("ed_1", 2), editionSale("ed_2", 1), mainSale]), 2);
});

test("checkEditionListing: the P2-TABS-26 copy table", () => {
  assert.equal(checkEditionListing({ regular: "0", extended: "0.02", royaltiesPct: 5, confirmed: true }), "Enter a price above 0.");
  assert.equal(
    checkEditionListing({ regular: "0.0000001", extended: "0.02", royaltiesPct: 5, confirmed: true }),
    "Use at most 6 decimal places.",
  );
  assert.equal(
    checkEditionListing({ regular: "0.01", extended: "0.005", royaltiesPct: 5, confirmed: true }),
    "Extended can't cost less than Regular.",
  );
  assert.equal(
    checkEditionListing({ regular: "0.01", extended: "0.02", royaltiesPct: 1, confirmed: true }),
    "Royalties are 2–10 %.",
  );
  assert.equal(
    checkEditionListing({ regular: "0.01", extended: "0.02", royaltiesPct: 11, confirmed: true }),
    "Royalties are 2–10 %.",
  );
  assert.equal(checkEditionListing({ regular: "0.01", extended: "0.02", royaltiesPct: 5, confirmed: false }) !== null, true);
  assert.equal(checkEditionListing({ regular: "0.01", extended: "0.02", royaltiesPct: 5, confirmed: true }), null);
});

test("editionsHiddenWith: pausing or removing Main hides editions; a lapsed auction or a sale doesn't", () => {
  assert.equal(editionsHiddenWith({ kind: "none" }), true);
  assert.equal(editionsHiddenWith({ kind: "paused" }), true);
  assert.equal(editionsHiddenWith({ kind: "ended", why: "removed" }), true);
  assert.equal(editionsHiddenWith({ kind: "ended", why: "noBids" }), false);
  assert.equal(editionsHiddenWith({ kind: "live" }), false);
  assert.equal(editionsHiddenWith({ kind: "sold" }), false);
});

test("normalizeEditions: drops malformed rows, keeps well-formed ones", () => {
  assert.deepEqual(normalizeEditions("nope"), []);
  assert.deepEqual(normalizeEditions([{ id: "ed_1" }]), []);
  const good = normalizeEditions([trackFixture()]);
  assert.equal(good.length, 1);
  assert.equal(good[0].id, "ed_1");

  const withListing = normalizeEditions([
    trackFixture({
      id: "ed_2",
      listing: { token: "MATIC", regular: "0.01", extended: "0.02", royaltyPct: 5, listedAt: 1, updatedAt: 2 },
    }),
  ]);
  assert.equal(withListing[0].listing.regular, "0.01");

  const badListing = normalizeEditions([trackFixture({ id: "ed_3", listing: { token: "MATIC" } })]);
  assert.deepEqual(badListing, []); // a present-but-broken listing drops the whole row
});
