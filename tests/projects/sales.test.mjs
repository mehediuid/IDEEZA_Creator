// Sales, bids and support requests (Phase 2 spec §3.5.5, P2-MARKETPLACE-16).
import { test } from "node:test";
import assert from "node:assert/strict";

const { holdingOf, mainSalesOf, normalizeBids, normalizeSales, normalizeSupport, randomId, salesOfProject } =
  await import("../../.tmp-test/lib/market/sales.js");

function saleFixture(overrides = {}) {
  return {
    id: "sale_aaaaaaaa",
    listingId: "lst_1",
    projectId: "proj_1",
    at: 1000,
    buyerId: "buyer-mira",
    buyerAddress: "0xbuyer",
    sellerAddress: "0xseller",
    item: { nft: "main", sharePct: 10 },
    via: "buyNow",
    token: "MATIC",
    price: "0.05",
    fees: { ideezaBps: 250, ideeza: "0.00125", network: { coin: "MATIC", amount: "0.021" } },
    payout: "0.04875",
    royaltiesPct: 10,
    mint: "lazy",
    mintedAtSale: true,
    tokenId: 1,
    network: "mumbai",
    collection: "Test Collection",
    benefits: [],
    txHash: `0x${"a".repeat(64)}`,
    demo: true,
    ...overrides,
  };
}

test("randomId: the §3.1 shape, never the same id twice in a row", () => {
  const a = randomId("sale_");
  const b = randomId("sale_");
  assert.match(a, /^sale_[0-9a-z]{8}$/);
  assert.notEqual(a, b);
});

test("normalizeSales: not an array, or every row malformed, gives []", () => {
  assert.deepEqual(normalizeSales("nope"), []);
  assert.deepEqual(normalizeSales([{ id: "x" }, null, 42]), []);
  assert.equal(normalizeSales([saleFixture()]).length, 1);
});

test("normalizeSales: one sale per Main listingId, earliest wins", () => {
  const early = saleFixture({ id: "sale_early", at: 1000 });
  const late = saleFixture({ id: "sale_late", at: 2000 });
  const result = normalizeSales([late, early]); // stored in write order, not time order
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "sale_early");
});

test("normalizeSales: edition sales are kept per unit, up to the supply", () => {
  const editionSale = (n) =>
    saleFixture({
      id: `sale_ed_${n}`,
      listingId: "ed_1",
      item: { nft: "physical", trackId: "ed_1", productId: "prd_1", productName: "Widget", use: "private", tier: "regular", serial: n },
    });
  const result = normalizeSales([editionSale(1), editionSale(2), editionSale(3)]);
  assert.equal(result.length, 3); // no Main-style dedupe applied to edition sales
});

test("normalizeBids and normalizeSupport drop malformed rows", () => {
  assert.deepEqual(normalizeBids("nope"), []);
  assert.deepEqual(
    normalizeBids([
      { id: "bid_1", listingId: "lst_1", bidderId: "buyer-mira", amount: "0.05", token: "MATIC", at: 1 },
      { id: "bid_2", listingId: "lst_1", bidderId: "buyer-bogus", amount: "0.05", token: "MATIC", at: 1 },
    ]).length,
    1,
  );
  assert.deepEqual(
    normalizeSupport([
      { id: "sup_1", saleId: "sale_1", projectId: "proj_1", buyerId: "buyer-leo", message: "hi", at: 1 },
      { id: "sup_2" },
    ]).length,
    1,
  );
});

test("salesOfProject and mainSalesOf scope by project and item kind", () => {
  const main = saleFixture({ id: "sale_main", projectId: "proj_1" });
  const edition = saleFixture({
    id: "sale_ed",
    projectId: "proj_1",
    listingId: "ed_1",
    item: { nft: "physical", trackId: "ed_1", productId: "prd_1", productName: "Widget", use: "private", tier: "regular", serial: 1 },
  });
  const other = saleFixture({ id: "sale_other", projectId: "proj_2" });
  const sales = [main, edition, other];
  assert.deepEqual(salesOfProject("proj_1", sales).map((s) => s.id).sort(), ["sale_ed", "sale_main"]);
  assert.deepEqual(mainSalesOf("proj_1", sales).map((s) => s.id), ["sale_main"]);
});

test("holdingOf sums a buyer's Main sales of a project, and is null when they hold nothing", () => {
  const sales = [
    saleFixture({ id: "sale_1", projectId: "proj_1", buyerId: "buyer-mira", item: { nft: "main", sharePct: 10 } }),
    saleFixture({ id: "sale_2", listingId: "lst_2", projectId: "proj_1", buyerId: "buyer-mira", item: { nft: "main", sharePct: 20 } }),
    saleFixture({ id: "sale_3", listingId: "lst_3", projectId: "proj_1", buyerId: "buyer-leo", item: { nft: "main", sharePct: 5 } }),
  ];
  const mira = holdingOf("proj_1", "buyer-mira", sales);
  assert.equal(mira.sharePct, 30);
  assert.equal(mira.sales.length, 2);
  assert.equal(holdingOf("proj_1", "buyer-sam", sales), null);
});
