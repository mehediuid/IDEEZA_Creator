// Settings › Get paid: the one pooled balance (D3) — every project's sales, your share only (net of
// the 2.5 % fee, after co-owners and sold shares), valued in dollars at the fixed demo rates, less
// every withdrawal; the withdraw amount check, and the CSV statement for a month or a year.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  DEMO_USD_RATES,
  usdOf,
  formatUsd,
  centsFloor,
  shareOfSale,
  earningsOf,
  balanceOf,
  salesTotalUsdOf,
  withdrawAmountProblem,
  statementCsv,
  statementFileName,
  statementYears,
} = await import("../../.tmp-test/lib/account/payout.js");
const { payoutOf, ideezaFeeOf } = await import("../../.tmp-test/lib/market/fee.js");

const at = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();

function sale(id, projectId, price, token, when, item) {
  return {
    id,
    projectId,
    at: when,
    token,
    price,
    fees: { ideezaBps: 250, ideeza: ideezaFeeOf(price), network: { coin: "ETH", amount: "0" } },
    payout: payoutOf(price),
    item: item ?? { nft: "virtual", trackId: "t1", productId: "prd_1", productName: "Rover", use: "private", tier: "regular", serial: 1 },
  };
}
const main = (pct) => ({ nft: "main", sharePct: pct });
const project = (id, name, contributors = []) => ({ id, name, contributors });
const coOwner = (share, addedAt) => ({ id: `c${share}`, role: "coOwner", share, addedAt });

test("demo rates: dollar coins one for one, IDZ at the one IDZ price; test ETH and MATIC at fixed rates", () => {
  assert.equal(DEMO_USD_RATES.USDT, "1");
  assert.equal(DEMO_USD_RATES.USDC, "1");
  assert.equal(DEMO_USD_RATES.IDZ, "0.025065");
  assert.equal(DEMO_USD_RATES.ETH, DEMO_USD_RATES.WETH);
  assert.equal(usdOf("9.75", "USDC"), "9.75");
  assert.equal(usdOf("0.1", "ETH"), String(Number(DEMO_USD_RATES.ETH) / 10));
});

test("formatUsd floors to the cent and groups thousands; centsFloor drops what's under a cent", () => {
  assert.equal(formatUsd("1234.567"), "$1,234.56");
  assert.equal(formatUsd("0"), "$0.00");
  assert.equal(formatUsd("0.009"), "$0.00");
  assert.equal(formatUsd("-12.5"), "-$12.50");
  assert.equal(centsFloor("182.8125"), "182.81");
  assert.equal(centsFloor("3"), "3");
});

test("shareOfSale: a Main sale is all yours; a copy sale is your holding when it sold", () => {
  const p = project("p", "Rover", [coOwner(30, at(2026, 1, 10)), { id: "v", role: "editor", share: 0, addedAt: 0 }]);
  const early = sale("s1", "p", "10", "USDT", at(2026, 1, 5));
  const shareSale = sale("s2", "p", "100", "USDT", at(2026, 1, 20), main(10));
  const late = sale("s3", "p", "10", "USDT", at(2026, 2, 1));
  const all = [early, shareSale, late];
  assert.equal(shareOfSale(early, p, all), 100, "before the co-owner joined");
  assert.equal(shareOfSale(shareSale, p, all), 100, "a share you sold is paid to you");
  assert.equal(shareOfSale(late, p, all), 60, "100 − 30 co-owner − 10 sold");
  const over = project("q", "Q", [coOwner(80, 0), coOwner(40, 0)]);
  assert.equal(shareOfSale(sale("x", "q", "1", "USDT", 5), over, []), 0, "never below 0");
});

test("earningsOf: only your projects' sales, your share of the gross, fee and payout, oldest first", () => {
  const p = project("p", "Rover", [coOwner(50, 0)]);
  const sales = [
    sale("s2", "p", "20", "USDT", at(2026, 3, 2)),
    sale("s1", "p", "10", "USDC", at(2026, 3, 1), main(5)),
    sale("s9", "other", "999", "USDT", at(2026, 3, 3)),
  ];
  const e = earningsOf(sales, [p]);
  assert.deepEqual(e.map((x) => x.saleId), ["s1", "s2"]);
  const [first, second] = e;
  assert.deepEqual(
    [first.sharePct, first.gross, first.fee, first.net, first.netUsd, first.projectName],
    [100, "10", "0.25", "9.75", "9.75", "Rover"],
  );
  assert.match(first.what, /Main NFT · 5%/);
  // 50 % co-owner − 5 % sold = 45 % yours.
  assert.deepEqual([second.sharePct, second.gross, second.fee, second.net], [45, "9", "0.225", "8.775"]);
  assert.match(second.what, /Virtual copy #1 · Rover/);
});

test("balanceOf: earned less every withdrawal (pending ones are held too), never shown below zero", () => {
  const p = project("p", "Rover");
  const e = earningsOf([sale("s1", "p", "100", "USDT", 1), sale("s2", "p", "0.01", "ETH", 2)], [p]);
  const earned = e.reduce((sum, x) => sum + Number(x.netUsd), 0);
  const w = (id, amount, status) => ({ id, amount, token: "USDT", methodId: null, to: { label: "x", address: null }, at: 3, status });
  const b = balanceOf(e, [w("a", "10", "complete"), w("b", "5", "pending"), w("c", "1", "in-progress")]);
  assert.equal(Number(b.earned), earned);
  assert.equal(b.withdrawn, "16");
  assert.equal(Number(b.available), earned - 16);
  assert.equal(balanceOf([], [w("a", "10", "complete")]).available, "0");
});

test("salesTotalUsdOf: the full price of every sale of your projects, in dollars", () => {
  const sales = [sale("s1", "p", "600", "USDT", 1), sale("s2", "p", "500", "USDC", 2), sale("s3", "x", "999", "USDT", 3)];
  assert.equal(salesTotalUsdOf(sales, ["p"]), "1100");
  assert.equal(salesTotalUsdOf([], ["p"]), "0");
});

const W = [
  { id: "WD1", amount: "280", token: "USDT", methodId: "m1", to: { label: "Cold wallet", address: "0xabc" }, at: at(2026, 1, 12), status: "complete" },
  { id: "WD2", amount: "12", token: "IDZ", methodId: "m2", to: { label: "Demo account 1", address: "0xdef" }, at: at(2026, 2, 3), status: "in-progress" },
  { id: "legacy-pay_x", amount: "3.5", token: "USDT", methodId: null, to: { label: "Requested in Earn", address: null }, at: at(2026, 2, 20), status: "pending" },
];

test("withdrawAmountProblem: dollars and cents, more than nothing, no more than the balance", () => {
  assert.equal(withdrawAmountProblem("50", "100"), null);
  assert.equal(withdrawAmountProblem("100.00", "100"), null);
  assert.equal(withdrawAmountProblem("", "100"), "Enter an amount.");
  assert.equal(withdrawAmountProblem("0", "100"), "Enter more than $0.00.");
  assert.equal(withdrawAmountProblem("1.234", "100"), "Use dollars and cents, like 12.50.");
  assert.equal(withdrawAmountProblem("-3", "100"), "Use dollars and cents, like 12.50.");
  assert.equal(withdrawAmountProblem("100.01", "100"), "That's more than your balance of $100.00.");
});

test("statementCsv: the period's sales, fees and withdrawals, oldest first, escaped", () => {
  const p = project("p", 'Rover, "mini"');
  const e = earningsOf(
    [sale("s1", "p", "10", "USDT", at(2026, 1, 5, 9, 30)), sale("s2", "p", "20", "USDT", at(2026, 2, 1))],
    [p],
  );
  const jan = statementCsv({ year: 2026, month: 1 }, e, W).split("\r\n");
  assert.equal(jan[0], "\uFEFFDate,Type,Project,Details,Amount,Token,Amount (USD at demo rate),Status,Reference");
  assert.deepEqual(jan.slice(1), [
    '2026-01-05 09:30,Sale,"Rover, ""mini""",Virtual copy #1 · Rover · your share 100%,10,USDT,10,,s1',
    '2026-01-05 09:30,IDEEZA fee,"Rover, ""mini""",2.5% of the sale,-0.25,USDT,-0.25,,s1',
    "2026-01-12 12:00,Withdrawal,,To Cold wallet (0xabc),-280,USDT,-280,Complete,WD1",
  ]);
  const year = statementCsv({ year: 2026, month: null }, e, W).split("\r\n");
  assert.equal(year.length, 1 + 2 + 2 + 3);
  assert.equal(statementCsv({ year: 2025, month: null }, e, W).split("\r\n").length, 1, "an empty period is the header alone");
});

test("statementCsv neutralises a cell that a spreadsheet would run as a formula", () => {
  const e = earningsOf([sale("s1", "p", "1", "USDT", at(2026, 1, 1))], [project("p", "=HYPERLINK(1)")]);
  assert.match(statementCsv({ year: 2026, month: 1 }, e, []), /,'=HYPERLINK\(1\),/);
});

test("statementFileName and statementYears", () => {
  assert.equal(statementFileName({ year: 2026, month: 3 }), "ideeza-statement-2026-03.csv");
  assert.equal(statementFileName({ year: 2026, month: null }), "ideeza-statement-2026.csv");
  const e = earningsOf([sale("s1", "p", "1", "USDT", at(2024, 6, 1))], [project("p", "P")]);
  assert.deepEqual(statementYears(e, W, at(2026, 10, 19)), [2026, 2025, 2024]);
  assert.deepEqual(statementYears([], [], at(2026, 10, 19)), [2026]);
});
