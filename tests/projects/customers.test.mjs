import { test } from "node:test";
import assert from "node:assert/strict";
import {
  customersOf,
  customerRowText,
  customersSummaryText,
  customersEmptyCopy,
  benefitStateOf,
  benefitDurationText,
  addMonths,
  pageOfSale,
  soldLineOf,
  joinSoldLine,
  CUSTOMERS_PAGE_SIZE,
  BENEFITS_NOTE,
} from "../../.tmp-test/lib/manual/customers.js";
import { payoutOf, ideezaFeeOf, feePercentText } from "../../.tmp-test/lib/market/fee.js";
import { formatAmount } from "../../.tmp-test/lib/wallet/money.js";

const PROJECT = { id: "p1", name: "Car" };

function fees(price) {
  return { ideezaBps: 250, ideeza: ideezaFeeOf(price), network: { coin: "ETH", amount: "0.0001" } };
}

// Fixture F, rewritten on `Sale` (main spec §4.8-3): Mira and Leo, two products.
const S1 = {
  id: "sale_a",
  projectId: "p1",
  listingId: "lst_main",
  at: Date.parse("2026-09-28T21:09:00"),
  buyerId: "buyer-mira",
  buyerAddress: "0xA1B2c3D4e5F60718293a4B5c6D7e8F90a1b2c3d4",
  sellerAddress: "0xseller",
  item: { nft: "main", sharePct: 10 },
  via: "buyNow",
  token: "ETH",
  price: "0.05",
  fees: fees("0.05"),
  payout: payoutOf("0.05"),
  royaltiesPct: 0,
  mint: "lazy",
  mintedAtSale: true,
  tokenId: 1,
  network: "baseSepolia",
  collection: "col",
  benefits: [
    { id: "b1", name: "Exclusive group", duration: { months: 12 } },
    { id: "b2", name: "Premium subscription", duration: { whileHeld: true } },
  ],
  txHash: "0x1",
  demo: true,
};
const S2 = {
  id: "sale_b",
  projectId: "p1",
  listingId: "ed_ctrl",
  at: Date.parse("2026-09-27T10:00:00"),
  buyerId: "buyer-leo",
  buyerAddress: "0x68f4a1b2c3d4e5f60718293a4b5c6d7e8f90c04e",
  sellerAddress: "0xseller",
  item: { nft: "physical", trackId: "ed_ctrl", productId: "prd_ctrl", productName: "RC Controller", use: "commercial", tier: "extended", serial: 1 },
  via: "buyNow",
  token: "ETH",
  price: "0.2",
  fees: fees("0.2"),
  payout: payoutOf("0.2"),
  royaltiesPct: 0,
  mint: "lazy",
  mintedAtSale: true,
  tokenId: 2,
  network: "baseSepolia",
  collection: "col",
  benefits: [],
  txHash: "0x2",
  demo: true,
};
const S3 = {
  id: "sale_c",
  projectId: "p1",
  listingId: "ed_car",
  at: Date.parse("2026-09-26T10:00:00"),
  buyerId: "buyer-mira",
  buyerAddress: "0xA1B2c3D4e5F60718293a4B5c6D7e8F90a1b2c3d4",
  sellerAddress: "0xseller",
  item: { nft: "virtual", trackId: "ed_car", productId: "prd_car", productName: "Car", use: "private", tier: "regular", serial: 1 },
  via: "auctionWin",
  token: "MATIC",
  price: "5",
  fees: fees("5"),
  payout: payoutOf("5"),
  royaltiesPct: 0,
  mint: "instant",
  mintedAtSale: false,
  tokenId: 3,
  network: "mumbai",
  collection: "col",
  benefits: [{ id: "b3", name: "Early access", duration: { months: 1 } }],
  txHash: "0x3",
  demo: true,
};
const S4 = { ...S1, id: "sale_d", projectId: "p2" };

const ALL = [S1, S2, S3, S4];

// ─────────────────────────── customersOf (CUSTOMERS-20) ───────────────────────────

test("customersOf: only this project's sales (#1)", () => {
  const c = customersOf(PROJECT, ALL);
  assert.equal(c.rows.length, 3);
  assert.ok(!c.rows.some((r) => r.saleId === "sale_d"));
});

test("customersOf: newest first, ties broken by id descending (#2)", () => {
  const c = customersOf(PROJECT, ALL);
  assert.deepEqual(c.rows.map((r) => r.saleId), ["sale_a", "sale_b", "sale_c"]);
  const tie = customersOf(PROJECT, [S2, { ...S3, id: "sale_z", at: S2.at }]);
  // same `at` as S2; "sale_z" > "sale_b" so it sorts first
  assert.deepEqual(tie.rows.map((r) => r.saleId), ["sale_z", "sale_b"]);
});

test("customersOf: a product scope drops Main sales and other products' sales (#3)", () => {
  const ctrl = customersOf(PROJECT, ALL, { scope: { kind: "product", productId: "prd_ctrl" } });
  assert.deepEqual(ctrl.rows.map((r) => r.saleId), ["sale_b"]);
  const car = customersOf(PROJECT, ALL, { scope: { kind: "product", productId: "prd_car" } });
  assert.deepEqual(car.rows.map((r) => r.saleId), ["sale_c"]);
});

test("customersOf: buyerCount counts distinct buyerId, within scope (#4)", () => {
  const c = customersOf(PROJECT, ALL);
  assert.equal(c.buyerCount, 2); // Mira (S1, S3) and Leo (S2)
  const ctrl = customersOf(PROJECT, ALL, { scope: { kind: "product", productId: "prd_ctrl" } });
  assert.equal(ctrl.buyerCount, 1);
});

test("customersOf: soldSharePct sums Main sharePct; mainSale is the latest Main sale, project-wide (#5)", () => {
  const c = customersOf(PROJECT, ALL);
  assert.equal(c.soldSharePct, 10);
  assert.equal(c.mainSale.saleId, "sale_a");
  assert.equal(c.mainSaleCount, 1);
  // still true even scoped to a product — the Sold facts stay project-wide
  const ctrl = customersOf(PROJECT, ALL, { scope: { kind: "product", productId: "prd_ctrl" } });
  assert.equal(ctrl.soldSharePct, 10);
  assert.equal(ctrl.mainSale.saleId, "sale_a");
});

// ─────────────────────────── customerRowText (#6, #7) ───────────────────────────

test("customerRowText: the buyer label, and a 'You' distinction never applies (buyers are always demo identities)", () => {
  const c = customersOf(PROJECT, ALL);
  const row = c.rows.find((r) => r.saleId === "sale_a");
  const text = customerRowText(row, { projectName: "Car", now: S1.at });
  assert.equal(text.buyer, "Mira (demo buyer)");
});

test("customerRowText: the product name comes off the sale's snapshot (#7)", () => {
  const c = customersOf(PROJECT, ALL);
  const row = c.rows.find((r) => r.saleId === "sale_b");
  const text = customerRowText(row, { projectName: "Car", now: S2.at });
  assert.equal(text.item, "RC Controller · Physical");
  assert.equal(text.itemSub, "Commercial use · Extended");
  assert.equal(text.share, null);
});

test("customerRowText: the Price sub-line is the payout, 'to you' (P2-CUSTOMERS-3 (C))", () => {
  const c = customersOf(PROJECT, ALL);
  const row = c.rows.find((r) => r.saleId === "sale_a");
  const text = customerRowText(row, { projectName: "Car", now: S1.at });
  assert.equal(text.price, "0.05 ETH");
  assert.equal(text.priceSub, "0.04875 ETH to you");
  assert.equal(text.share, "10%");
});

test("customerRowText: the disclosure gains the IDEEZA fee and payout rows (P2-CUSTOMERS-8 (C))", () => {
  const c = customersOf(PROJECT, ALL);
  const row = c.rows.find((r) => r.saleId === "sale_a");
  const text = customerRowText(row, { projectName: "Car", now: S1.at });
  assert.deepEqual(
    text.detail.find((d) => d.term === "IDEEZA fee"),
    { term: "IDEEZA fee", value: `${feePercentText()} · ${formatAmount(ideezaFeeOf("0.05"), "ETH")}` },
  );
  assert.deepEqual(
    text.detail.find((d) => d.term === "You received"),
    { term: "You received", value: formatAmount(payoutOf("0.05"), "ETH") },
  );
  assert.equal(
    text.detail.find((d) => d.term === "Wallet").value,
    S1.buyerAddress,
  );
});

test("customerRowText: benefit lines and the closing note, only when there are benefits", () => {
  const c = customersOf(PROJECT, ALL);
  const withBenefits = customerRowText(
    c.rows.find((r) => r.saleId === "sale_a"),
    { projectName: "Car", now: Date.parse("2026-09-28T21:09:00") },
  );
  const lines = withBenefits.detail.filter((d) => d.term === "Benefits").map((d) => d.value);
  assert.deepEqual(lines, [
    "Exclusive group, active until Sep 28, 2027",
    "Premium subscription, for as long as they hold it",
    BENEFITS_NOTE,
  ]);

  const noBenefits = customerRowText(
    c.rows.find((r) => r.saleId === "sale_b"),
    { projectName: "Car", now: S2.at },
  );
  assert.equal(noBenefits.detail.some((d) => d.term === "Benefits"), false);
  assert.equal(noBenefits.benefits, null);
});

// ─────────────────────────── benefits (#8, #9) ───────────────────────────

test("benefitStateOf: active vs. ended, and while-held has no end", () => {
  const monthly = { id: "b", name: "Early access", duration: { months: 1 } };
  const soldAt = Date.parse("2026-09-26T10:00:00");
  const active = benefitStateOf(monthly, soldAt, Date.parse("2026-09-27T00:00:00"));
  assert.equal(active.active, true);
  const ended = benefitStateOf(monthly, soldAt, Date.parse("2026-10-30T00:00:00"));
  assert.equal(ended.active, false);
  const held = benefitStateOf({ id: "b2", name: "X", duration: { whileHeld: true } }, soldAt, Date.now());
  assert.equal(held.kind, "whileHeld");
});

test("addMonths: calendar-safe at month ends and across a leap year", () => {
  const jan31 = Date.parse("2025-01-31T00:00:00");
  assert.equal(new Date(addMonths(jan31, 1)).getMonth(), 1); // Feb
  assert.equal(new Date(addMonths(jan31, 1)).getDate(), 28); // 2025 isn't a leap year
  const jan31Leap = Date.parse("2024-01-31T00:00:00");
  assert.equal(new Date(addMonths(jan31Leap, 1)).getDate(), 29); // 2024 is
});

test("benefitDurationText", () => {
  assert.equal(benefitDurationText({ months: 1 }), "1 month");
  assert.equal(benefitDurationText({ months: 12 }), "12 months");
  assert.equal(benefitDurationText({ whileHeld: true }), "For as long as they hold it");
});

// ─────────────────────────── summary and empty copy (#10, #11) ───────────────────────────

test("customersSummaryText: singular and plural", () => {
  assert.equal(customersSummaryText({ saleCount: 1, buyerCount: 1 }), "1 sale to 1 buyer.");
  assert.equal(customersSummaryText({ saleCount: 3, buyerCount: 2 }), "3 sales to 2 buyers.");
});

test("customersEmptyCopy: each status and the product scope", () => {
  assert.equal(customersEmptyCopy({ scope: { kind: "project" }, status: "listed", projectId: "p1" }).title, "No customers yet");
  assert.equal(
    customersEmptyCopy({ scope: { kind: "project" }, status: "private", projectId: "p1" }).body,
    "Customers come from marketplace sales. Once this project is listed and someone buys it, they show up here.",
  );
  assert.equal(customersEmptyCopy({ scope: { kind: "project" }, status: "given", projectId: "p1" }).title, "No customers");
  const product = customersEmptyCopy({ scope: { kind: "product", productId: "prd_ctrl" }, status: "listed", projectId: "p1", productName: "RC Controller" });
  assert.equal(product.title, "No customers for this product yet");
  assert.deepEqual(product.link, { label: "Project customers", href: "/projects/p1?tab=customers" });
});

// ─────────────────────────── pageOfSale (#12) ───────────────────────────

test("pageOfSale: 1-based page, unknown id gives page 1", () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ saleId: `s${i}` }));
  assert.equal(pageOfSale(rows, "s0"), 1);
  assert.equal(pageOfSale(rows, `s${CUSTOMERS_PAGE_SIZE}`), 2);
  assert.equal(pageOfSale(rows, "nope"), 1);
  assert.equal(pageOfSale(rows, null), 1);
});

// ─────────────────────────── soldLineOf / joinSoldLine (#13, §3.2) ───────────────────────────

const dateOf = (at) => new Date(at).toISOString().slice(0, 10);

test("soldLineOf: one partial sale — percent and buyer, owner audience", () => {
  const c = { mainSale: { at: 1, buyer: "Mira (demo buyer)", saleId: "sale_a", item: { nft: "main", sharePct: 10 } }, mainSaleCount: 1, soldSharePct: 10 };
  const line = soldLineOf(c, "owner", dateOf);
  assert.deepEqual(line, { before: "Sold 10% to ", buyer: { label: "Mira (demo buyer)", saleId: "sale_a" }, after: ` · ${dateOf(1)}` });
  assert.equal(joinSoldLine(line), `Sold 10% to Mira (demo buyer) · ${dateOf(1)}`);
});

test("soldLineOf: a 100% sale drops the percent", () => {
  const c = { mainSale: { at: 1, buyer: "Mira (demo buyer)", saleId: "sale_a", item: { nft: "main", sharePct: 100 } }, mainSaleCount: 1, soldSharePct: 100 };
  const line = soldLineOf(c, "owner", dateOf);
  assert.equal(line.before, "Sold to ");
});

test("soldLineOf: several sales roll up to a total and a count, with no buyer link", () => {
  const c = { mainSale: { at: 2, buyer: "Leo (demo buyer)", saleId: "sale_z", item: { nft: "main", sharePct: 20 } }, mainSaleCount: 3, soldSharePct: 30 };
  const line = soldLineOf(c, "owner", dateOf);
  assert.deepEqual(line, { before: "Sold 30% in 3 sales", buyer: null, after: ` · last ${dateOf(2)}` });
});

test("soldLineOf: a visitor never learns who or how much", () => {
  const c = { mainSale: { at: 1, buyer: "Mira (demo buyer)", saleId: "sale_a", item: { nft: "main", sharePct: 10 } }, mainSaleCount: 1, soldSharePct: 10 };
  const line = soldLineOf(c, "visitor", dateOf);
  assert.deepEqual(line, { before: "Sold", buyer: null, after: ` · ${dateOf(1)}` });
});

test("soldLineOf: null with no Main sale", () => {
  assert.equal(soldLineOf({ mainSale: null, mainSaleCount: 0, soldSharePct: 0 }, "owner", dateOf), null);
});
