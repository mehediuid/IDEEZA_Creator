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

// ───────────────────────── T27: transitions and views ─────────────────────────

const {
  addToSupply,
  checkAddNfts,
  editionChainOf,
  editionOffersOf,
  editionSummaryOf,
  editTrackListing,
  listTrack,
  nextSerialOf,
  trackCardOf,
  unlistProjectTracks,
  unlistTrack,
  wholeNumberOf,
} = await import("../../.tmp-test/lib/market/editions.js");

const TERMS = { token: "ETH", regular: "0.01", extended: "0.02", royaltyPct: 5 };
const unitSale = (trackId, at, serial = 1) => ({
  id: `sale_${trackId}${serial}`,
  listingId: trackId,
  at,
  item: { nft: "physical", trackId, productId: "prd_1", productName: "Widget", use: "private", tier: "regular", serial },
});

test("listTrack / editTrackListing / unlistTrack: one track changes, the rest stay; the wrong state refuses", () => {
  const tracks = [trackFixture(), trackFixture({ id: "ed_2", use: "commercial" })];
  const listed = listTrack(tracks, "ed_1", TERMS, 50);
  assert.deepEqual(listed[0].listing, { ...TERMS, listedAt: 50, updatedAt: 50 });
  assert.equal(listed[1], tracks[1]);
  assert.equal(listTrack(listed, "ed_1", TERMS, 60), null); // already listed
  assert.equal(listTrack(tracks, "ed_x", TERMS, 60), null); // gone

  const edited = editTrackListing(listed, "ed_1", { ...TERMS, regular: "0.015" }, 70);
  assert.equal(edited[0].listing.regular, "0.015");
  assert.equal(edited[0].listing.listedAt, 50);
  assert.equal(edited[0].listing.updatedAt, 70);
  assert.equal(editTrackListing(tracks, "ed_1", TERMS, 70), null); // not listed

  const removed = unlistTrack(edited, "ed_1");
  assert.equal(removed[0].listing, null);
  assert.equal(removed[0].supply.total, 10); // P2-TABS-27 AC3: the supply is kept
  assert.equal(unlistTrack(removed, "ed_1"), null);
});

test("addToSupply: 10 + 20 reads 'NFTs sold 0/30' and '+20 new'; a later sale retires the badge (P2-TABS-27 AC1, AC2)", () => {
  const [t] = addToSupply([trackFixture({ listing: { ...TERMS, listedAt: 1, updatedAt: 1 } })], "ed_1", 20, 100);
  assert.deepEqual(t.supply, { total: 30, lastAdded: { n: 20, at: 100 } });
  const fresh = trackCardOf(t, []);
  assert.equal(fresh.soldLine, "NFTs sold 0/30");
  assert.equal(fresh.newBadge, "+20 new");
  // A sale from before the addition doesn't retire it; one after does.
  assert.equal(trackCardOf(t, [unitSale("ed_1", 50)]).newBadge, "+20 new");
  const after = trackCardOf(t, [unitSale("ed_1", 150)]);
  assert.equal(after.soldLine, "NFTs sold 1/30");
  assert.equal(after.newBadge, null);
});

test("trackCardOf: sold out at s = t; a sale of another track doesn't count", () => {
  const t = trackFixture({ supply: { total: 2 } });
  assert.equal(trackCardOf(t, [unitSale("ed_1", 1, 1), unitSale("ed_2", 1, 1)]).soldLine, "NFTs sold 1/2");
  const out = trackCardOf(t, [unitSale("ed_1", 1, 1), unitSale("ed_1", 2, 2)]);
  assert.equal(out.soldOut, true);
  assert.equal(out.soldLine, "Sold out");
  assert.equal(nextSerialOf("ed_1", [unitSale("ed_1", 1, 1)]), 2);
});

test("unlistProjectTracks: removing Main takes every listed track of that project off, supply kept", () => {
  const tracks = [
    trackFixture({ listing: { ...TERMS, listedAt: 1, updatedAt: 1 } }),
    trackFixture({ id: "ed_2", use: "commercial" }),
    trackFixture({ id: "ed_3", projectId: "proj_2", listing: { ...TERMS, listedAt: 1, updatedAt: 1 } }),
  ];
  const { tracks: next, removed } = unlistProjectTracks(tracks, "proj_1");
  assert.equal(removed, 1);
  assert.equal(next[0].listing, null);
  assert.equal(next[0].supply.total, 10);
  assert.notEqual(next[2].listing, null);
});

test("checkAddNfts and wholeNumberOf", () => {
  assert.equal(checkAddNfts({ count: 0, confirmed: true }), "Enter a whole number from 1 to 10,000.");
  assert.equal(checkAddNfts({ count: null, confirmed: true }), "Enter a whole number from 1 to 10,000.");
  assert.equal(checkAddNfts({ count: 20, confirmed: false }), "Tick the box to add them at the listing's current prices.");
  assert.equal(checkAddNfts({ count: 20, confirmed: true }), null);
  assert.equal(wholeNumberOf("20"), 20);
  assert.equal(wholeNumberOf("1.5"), null);
  assert.equal(wholeNumberOf(""), null);
});

test("editionSummaryOf: empty until a track exists; then a row per product and a line per use (P2-TABS-28)", () => {
  const products = [
    { id: "prd_1", name: "Controller" },
    { id: "prd_2", name: "Remote" },
  ];
  assert.deepEqual(editionSummaryOf(products, [], [], "physical", { listedOnly: false }), []);
  const tracks = [trackFixture({ supply: { total: 30 }, listing: { ...TERMS, listedAt: 1, updatedAt: 1 } })];
  const rows = editionSummaryOf(products, tracks, [], "physical", { listedOnly: false });
  assert.deepEqual(rows, [
    { productId: "prd_1", name: "Controller", lines: ["Private use · Listed · 0/30 sold", "Commercial use · Not created"] },
    { productId: "prd_2", name: "Remote", lines: ["Private use · Not created", "Commercial use · Not created"] },
  ]);
  // The preview reads listed lines only.
  assert.deepEqual(editionSummaryOf(products, tracks, [], "physical", { listedOnly: true }), [
    { productId: "prd_1", name: "Controller", lines: ["Private use · Listed · 0/30 sold"] },
  ]);
  assert.deepEqual(editionSummaryOf(products, tracks, [], "virtual", { listedOnly: false }), []);
});

test("editionOffersOf: listed tracks only, hidden while Main is paused or removed", () => {
  const products = [{ id: "prd_1", name: "Controller" }];
  const tracks = [
    trackFixture({ id: "ed_c", use: "commercial", listing: { ...TERMS, listedAt: 1, updatedAt: 1 } }),
    trackFixture({ id: "ed_p", listing: { ...TERMS, listedAt: 1, updatedAt: 1 } }),
    trackFixture({ id: "ed_v", kind: "virtual" }),
  ];
  const live = editionOffersOf(products, tracks, { kind: "live" });
  assert.deepEqual(live[0].tracks.map((t) => t.id), ["ed_p", "ed_c"]);
  assert.deepEqual(editionOffersOf(products, tracks, { kind: "paused" }), []);
  assert.deepEqual(editionOffersOf(products, tracks, { kind: "ended", why: "removed" }), []);
});

test("editionChainOf: the mint record, else the Main listing, else a v1 draft; null without a collection", () => {
  const rec = { network: "baseSepolia", collection: "Cars" };
  assert.deepEqual(editionChainOf(rec, { network: "mumbai", collection: "X" }, null), rec);
  assert.deepEqual(editionChainOf(null, { network: "mumbai", collection: "X" }, null), { network: "mumbai", collection: "X" });
  assert.deepEqual(editionChainOf(null, null, { network: "mumbai", collection: " Y " }), { network: "mumbai", collection: "Y" });
  assert.equal(editionChainOf(null, null, { network: "mumbai", collection: "" }), null);
  assert.equal(editionChainOf(null, null, null), null);
});

test("editionsHiddenWith / editionOffersOf: a project sold in full hides every offer (R1-2)", async () => {
  assert.equal(editionsHiddenWith({ kind: "live" }, true), true);
  assert.equal(editionsHiddenWith({ kind: "sold" }, true), true);
  assert.equal(editionsHiddenWith({ kind: "sold" }, false), false);
  const { createTrack } = await import("../../.tmp-test/lib/market/editions.js");
  const products = [{ id: "prd_a", name: "A" }];
  const listed = { ...createTrack({ projectId: "proj_1", productId: "prd_a", kind: "physical", use: "private", count: 3, now: 1 }) };
  const tracks = listTrack([listed], listed.id, { token: "MATIC", regular: "0.01", extended: "0.02", royaltyPct: 5 }, 2);
  assert.equal(editionOffersOf(products, tracks, { kind: "sold" }).length, 1);
  assert.deepEqual(editionOffersOf(products, tracks, { kind: "sold" }, true), []);
});

test("listTrack and editTrackListing store prices in their one written form (§3.1)", () => {
  const t = trackFixture({ listing: null });
  const listed = listTrack([t], t.id, { token: "MATIC", regular: "0.010", extended: ".5", royaltyPct: 5 }, 2);
  assert.deepEqual([listed[0].listing.regular, listed[0].listing.extended], ["0.01", "0.5"]);
  const edited = editTrackListing(listed, t.id, { token: "MATIC", regular: "1.", extended: "2.000", royaltyPct: 5 }, 3);
  assert.deepEqual([edited[0].listing.regular, edited[0].listing.extended], ["1", "2"]);
});
