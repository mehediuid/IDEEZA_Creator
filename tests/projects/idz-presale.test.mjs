// Balance › Buy IDZ Token (spec 2026-10-19-balance-buy-idz-design.md): the demo presale's
// config, its two-way quote and checks, and the purchase → claim records the balance reads.
import { test } from "node:test";
import assert from "node:assert/strict";

const presale = await import("../../.tmp-test/lib/wallet/presale.js");
const records = await import("../../.tmp-test/lib/wallet/presale-records.js");
const idz = await import("../../.tmp-test/lib/wallet/idz.js");
const { balancesOf } = await import("../../.tmp-test/lib/wallet/balances.js");
const { defaultWallet, pushActivity, demoAddress, normalizeWallet, walletConnect } = await import("../../.tmp-test/lib/wallet/demo-wallet.js");
const { activityOf, chargeRowsOf, proofOf } = await import("../../.tmp-test/lib/wallet/request-view.js");
const { requestCopy } = await import("../../.tmp-test/lib/wallet/request.js");
const { DEMO_USD_RATES } = await import("../../.tmp-test/lib/account/payout.js");

const NOW = Date.UTC(2026, 9, 19, 9, 30, 0);
const EMPTY_MARKET = { listings: [], sales: [], bids: [], support: [], unreadable: false };
const ctx = (wallet, now = NOW) => ({ wallet, market: EMPTY_MARKET, now });

/** A confirmed purchase, written the way the wallet provider writes it. */
function buy(w, { id = "maker-1", at = NOW, idzAmount = "34", coin = "ETH", nonce = "a" } = {}) {
  const { price, whitelisted } = presale.presalePriceOf(demoAddress(id));
  const pay = presale.quotePayOf(idzAmount, coin, price);
  const req = presale.buyRequestOf({ idz: idzAmount, pay, coin, price, whitelisted });
  const proof = proofOf(req, id, at, `0x${nonce.repeat(64).slice(0, 64)}`);
  return { w: pushActivity(w, activityOf(req, proof, `act_buy_${nonce}`)), id: `act_buy_${nonce}`, pay };
}

function claim(w, purchase, at, nonce = "c") {
  const req = presale.claimRequestOf(purchase);
  const proof = proofOf(req, purchase.identity, at, `0x${nonce.repeat(64).slice(0, 64)}`);
  return pushActivity(w, activityOf(req, proof, `act_claim_${nonce}`));
}

// ── the config ─────────────────────────────────────────────────────────

test("one price: the presale sells at the one IDZ price, on Base Sepolia, for ETH, USDT and USDC", () => {
  assert.equal(presale.coinRateOf("ETH"), DEMO_USD_RATES.ETH); // the app's one demo dollar table
  assert.equal(presale.coinRateOf("USDT"), "1");
  assert.equal(presale.PRESALE.price, idz.IDZ_USD_PRICE);
  assert.equal(presale.PRESALE.network, "baseSepolia");
  assert.deepEqual(presale.PAY_COINS, ["ETH", "USDT", "USDC"]);
  assert.equal(presale.PRESALE.endsAt, Date.UTC(2026, 11, 31, 17, 59, 59)); // 11:59:59 PM in Bangladesh
  assert.ok(Number(presale.PRESALE.nextPrice) > Number(presale.PRESALE.price));
});

test("whitelist: Demo account 2 pays 10% less, rounded down to the micro-dollar; the others pay the price", () => {
  assert.deepEqual(presale.presalePriceOf(demoAddress("maker-1")), { price: "0.025065", whitelisted: false });
  assert.deepEqual(presale.presalePriceOf(demoAddress("maker-2")), { price: "0.022558", whitelisted: true });
  assert.deepEqual(presale.presalePriceOf(demoAddress("maker-3")), { price: "0.025065", whitelisted: false });
});

test("the round: open until its end, closed from that second on; the countdown never goes below zero", () => {
  const end = presale.PRESALE.endsAt;
  assert.equal(presale.presaleOpenAt(end - 1), true);
  assert.equal(presale.presaleOpenAt(end), false);
  assert.deepEqual(presale.countdownOf(((1 * 24 + 9) * 60 + 36) * 60_000 + 11_000), { days: 1, hours: 9, minutes: 36, seconds: 11 });
  assert.deepEqual(presale.countdownOf(-5000), { days: 0, hours: 0, minutes: 0, seconds: 0 });
});

// ── the quote ──────────────────────────────────────────────────────────

test("two-way quote: 34 IDZ costs 0.85221 USDT, or 0.000228 test ETH at the app's demo rate (rounded up)", () => {
  assert.equal(presale.quotePayOf("34", "USDT", "0.025065"), "0.85221");
  assert.equal(presale.quotePayOf("34", "USDC", "0.025065"), "0.85221");
  assert.equal(presale.quotePayOf("34", "ETH", "0.025065"), "0.000228");
  // The other way rounds down, so the presale never gives more than was paid for.
  assert.equal(presale.quoteIdzOf("1", "USDT", "0.025065"), "39.896269");
  assert.equal(presale.quoteIdzOf("0.000341", "ETH", "0.025065"), "51.017354");
  assert.equal(presale.quotePayOf("abc", "ETH", "0.025065"), null);
  assert.equal(presale.quoteIdzOf("", "ETH", "0.025065"), null);
});

test("worth in dollars: what was paid at its coin's rate", () => {
  assert.equal(presale.worthUsdOf("0.85221", "USDT"), "0.85221");
  assert.equal(presale.worthUsdOf("0.000228", "ETH"), "0.855");
  assert.equal(presale.formatUsd("0.8525"), "$0.85");
  assert.equal(presale.formatUsd("12553103.33"), "$12,553,103.33");
  assert.equal(presale.formatPrice("0.025065"), "$0.025065");
  assert.equal(presale.formatPrice("3750"), "$3,750");
});

test("gas: the reserve is the network fee twice (the purchase and its claim), in test ETH", () => {
  assert.deepEqual(presale.gasReserveOf("baseSepolia"), { coin: "ETH", amount: "0.00208" });
  assert.equal(presale.maxPayOf("ETH", { coin: "0.05", gas: "0.05" }), "0.04792");
  assert.equal(presale.maxPayOf("ETH", { coin: "0.001", gas: "0.001" }), "0");
  assert.equal(presale.maxPayOf("USDT", { coin: "12.5", gas: "0.05" }), "12.5");
});

// ── the checks ─────────────────────────────────────────────────────────

const have = { coin: "0.05", gas: "0.05" };
const check = (draft, h = have, now = NOW) => presale.buyCheckOf(draft, { price: "0.025065", have: h, now });

test("checks: an empty, garbled or zero amount says so under the field it was typed in", () => {
  assert.equal(check({ driver: "get", text: "", coin: "ETH" }).error?.text, "Enter how many IDZ you want.");
  assert.equal(check({ driver: "pay", text: "  ", coin: "ETH" }).error?.text, "Enter how much ETH you want to pay.");
  assert.equal(check({ driver: "get", text: "1e3", coin: "ETH" }).error?.text, "Use digits only, with up to 6 decimals.");
  assert.equal(check({ driver: "get", text: "-2", coin: "ETH" }).error?.field, "get");
  assert.equal(check({ driver: "get", text: "0", coin: "ETH" }).error?.text, "Enter more than 0.");
  assert.equal(check({ driver: "pay", text: "0.0000001", coin: "ETH" }).error?.field, "pay");
});

test("checks: more than the balance, or too little left for gas, is an error under You pay", () => {
  const over = check({ driver: "pay", text: "0.06", coin: "ETH" });
  assert.deepEqual(over.error, { field: "pay", text: "Not enough test ETH — you have 0.05 ETH." });
  const gas = check({ driver: "pay", text: "0.049", coin: "ETH" });
  assert.deepEqual(gas.error, { field: "pay", text: "Keep 0.00208 ETH for gas — you can pay at most 0.04792 ETH." });
  const usdt = check({ driver: "get", text: "34", coin: "USDT" }, { coin: "0", gas: "0.05" });
  assert.deepEqual(usdt.error, { field: "pay", text: "Not enough test USDT — you have 0 USDT." });
  const noGas = check({ driver: "get", text: "34", coin: "USDC" }, { coin: "500", gas: "0.001" });
  assert.deepEqual(noGas.error, { field: "pay", text: "Not enough test ETH for gas — you have 0.001 ETH, this needs 0.00208 ETH." });
});

test("checks: a valid amount quotes the other field and has no error; after the round, nothing can be bought", () => {
  const ok = check({ driver: "get", text: "34", coin: "ETH" });
  assert.equal(ok.error, null);
  assert.equal(ok.idz, "34");
  assert.equal(ok.pay, "0.000228");
  const byPay = check({ driver: "pay", text: "0.04792", coin: "ETH" });
  assert.equal(byPay.error, null);
  assert.equal(byPay.pay, "0.04792");
  assert.equal(byPay.idz, presale.quoteIdzOf("0.04792", "ETH", "0.025065"));
  const closed = check({ driver: "get", text: "34", coin: "ETH" }, have, presale.PRESALE.endsAt);
  assert.equal(closed.error?.field, "form");
});

// ── the requests ───────────────────────────────────────────────────────

test("the buy request: a transaction on the presale network whose review shows N5 — IDZ, price, worth, claim time", () => {
  const req = presale.buyRequestOf({ idz: "34", pay: "0.000228", coin: "ETH", price: "0.025065", whitelisted: false });
  assert.equal(req.kind, "transaction");
  assert.equal(req.purpose, "buyIdz");
  assert.equal(req.network, "baseSepolia");
  assert.deepEqual(req.summary.map((r) => r.label), ["You get", "Price", "Worth", "Claim"]);
  assert.equal(req.summary[0].value, "34 IDZ");
  assert.match(req.summary[3].value, /2 minutes after it confirms/);
  assert.deepEqual(req.charge, { network: "baseSepolia", lines: [{ coin: "ETH", amount: "0.00104" }, { coin: "ETH", amount: "0.000228" }] });
  const rows = chargeRowsOf(req).rows.map((r) => r.label);
  assert.deepEqual(rows, ["Network fee (Base Sepolia)", "You pay"]);
  assert.equal(requestCopy("confirmed", req, defaultWallet()).title, "Purchase successful");
  assert.match(requestCopy("wrongNetwork", req, { ...defaultWallet(), identities: { ...defaultWallet().identities, "maker-1": { connected: true, network: "mumbai" } } }).title, /This purchase is on Base Sepolia/);
});

test("a whitelisted buy names its discount in the review", () => {
  const req = presale.buyRequestOf({ idz: "34", pay: "0.000205", coin: "ETH", price: "0.022558", whitelisted: true });
  assert.equal(req.summary[1].value, "1 IDZ = $0.022558 · whitelist −10%");
});

// ── the records ────────────────────────────────────────────────────────

test("a purchase is locked, then ready to claim at its unlock time, then claimed", () => {
  let { w } = buy(walletConnect(defaultWallet(), "maker-1"));
  const [p] = records.purchasesOf(w, "maker-1");
  assert.equal(p.buy.idz, "34");
  assert.deepEqual(p.buy.paid, { coin: "ETH", amount: "0.000228" });
  assert.equal(p.buy.usd, "0.855");
  assert.equal(p.buy.unlocksAt, NOW + presale.PRESALE.lockMs);
  assert.equal(records.purchaseStatusOf(p, NOW), "locked");
  assert.equal(records.purchaseStatusOf(p, p.buy.unlocksAt), "claimable");
  w = claim(w, p, p.buy.unlocksAt + 1000);
  const [after] = records.purchasesOf(w, "maker-1");
  assert.equal(records.purchaseStatusOf(after, NOW), "claimed");
  assert.equal(after.claim.at, p.buy.unlocksAt + 1000);
});

test("balances: the coin and gas leave at purchase, the IDZ arrives at claim — once, however many claims", () => {
  let { w } = buy(defaultWallet());
  let bal = balancesOf("maker-1", ctx(w));
  assert.equal(bal.idz, "2000");
  assert.equal(bal.native.baseSepolia.ETH, "0.048732"); // 0.05 − 0.000228 − 0.00104
  const [p] = records.purchasesOf(w, "maker-1");
  w = claim(w, p, p.buy.unlocksAt);
  w = claim(w, p, p.buy.unlocksAt + 5, "d"); // a second tab's claim of the same purchase
  bal = balancesOf("maker-1", ctx(w));
  assert.equal(bal.idz, "2034");
  assert.equal(bal.native.baseSepolia.ETH, "0.046652"); // both claims' gas was spent
  assert.equal(records.claimedIdzOf(w, "maker-1"), "34");
});

test("a claim of someone else's purchase, or of no purchase, credits nothing", () => {
  let { w } = buy(defaultWallet(), { id: "maker-1" });
  const [p] = records.purchasesOf(w, "maker-1");
  w = claim(w, { ...p, identity: "maker-2" }, p.buy.unlocksAt);
  w = claim(w, { ...p, id: "nope" }, p.buy.unlocksAt, "e");
  assert.equal(balancesOf("maker-1", ctx(w)).idz, "2000");
  assert.equal(balancesOf("maker-2", ctx(w)).idz, "2000");
});

test("holdings: Pending while locked, Ready to claim once unlocked, Available once claimed", () => {
  let { w } = buy(defaultWallet(), { idzAmount: "34" });
  ({ w } = buy(w, { idzAmount: "10", at: NOW + 60_000, nonce: "b" }));
  const later = NOW + presale.PRESALE.lockMs; // the first unlocks, the second not yet
  assert.deepEqual(idz.idzHoldingsOf(w, "maker-1", ctx(w, NOW)), { available: "2000", staked: "0", claimable: "0", pending: "44" });
  assert.deepEqual(idz.idzHoldingsOf(w, "maker-1", ctx(w, later)), { available: "2000", staked: "0", claimable: "34", pending: "10" });
  const first = records.purchasesOf(w, "maker-1").find((p) => p.buy.idz === "34");
  w = claim(w, first, later);
  assert.deepEqual(idz.idzHoldingsOf(w, "maker-1", ctx(w, later)), { available: "2034", staked: "0", claimable: "0", pending: "10" });
});

test("ledger: a held Buy row, then a Claim row; it still reconciles with the derived balance", () => {
  let { w } = buy(defaultWallet());
  const [p] = records.purchasesOf(w, "maker-1");
  w = claim(w, p, p.buy.unlocksAt + 1000);
  const rows = idz.idzLedgerOf(w, "maker-1");
  assert.deepEqual(rows.map((r) => [r.type, r.direction, r.amount, !!r.held]), [
    ["claim", "in", "34", false],
    ["buy", "in", "34", true],
    ["reward", "in", "2000", false],
  ]);
  assert.match(rows[1].title, /Presale Round 1 · paid 0\.000228 ETH/);
  const net = rows.reduce((sum, r) => sum + (r.held ? 0 : (r.direction === "in" ? 1 : -1) * Number(r.amount)), 0);
  assert.equal(String(net), balancesOf("maker-1", ctx(w)).idz);
  assert.deepEqual(idz.TRANSFER_TYPES.map((t) => t.label), ["Reward", "Project Create", "Credits", "Buy", "Claim"]);
  assert.deepEqual(idz.filterIdzLedger(rows, { network: "all", type: "buy" }).map((r) => r.id), [p.id]);
});

test("total USD raised: the sum of every demo purchase in this wallet, any account", () => {
  assert.equal(records.totalRaisedOf(defaultWallet()), "0");
  let { w } = buy(defaultWallet(), { id: "maker-1", coin: "USDT", nonce: "a" });
  ({ w } = buy(w, { id: "maker-2", coin: "ETH", nonce: "b" }));
  // 0.85221 USDT + the whitelisted account's 0.000205 ETH (34 × 0.022558 ÷ 3750, rounded up) × 3750.
  assert.equal(records.totalRaisedOf(w), "1.62096");
});

test("a stored purchase and claim survive a reload; a malformed one loses only its presale fields", () => {
  let { w } = buy(defaultWallet());
  const [p] = records.purchasesOf(w, "maker-1");
  w = claim(w, p, p.buy.unlocksAt);
  const back = normalizeWallet(JSON.parse(JSON.stringify(w)));
  assert.deepEqual(back.activity, w.activity);
  const broken = normalizeWallet({ ...w, activity: [{ ...w.activity[1], presale: { idz: 5 } }, { ...w.activity[0], claims: 7 }] });
  assert.equal(broken.activity[0].presale, undefined);
  assert.equal(broken.activity[1].claims, undefined);
  assert.equal(broken.activity[0].purpose, "buyIdz");
});

// ── the purchase table ─────────────────────────────────────────────────

test("purchases filter by chain, status, month and year; the years offered are the ones with purchases", () => {
  let { w } = buy(defaultWallet(), { at: Date.UTC(2026, 9, 3, 12), nonce: "a" });
  ({ w } = buy(w, { at: Date.UTC(2026, 8, 20, 12), nonce: "b" }));
  const rows = records.purchasesOf(w, "maker-1");
  const all = { network: "all", status: "all", month: "all", year: "all" };
  const now = Date.UTC(2026, 9, 3, 12, 1); // the October one is still locked
  assert.equal(records.filterPurchases(rows, all, now).length, 2);
  assert.equal(records.filterPurchases(rows, { ...all, network: "mumbai" }, now).length, 0);
  assert.equal(records.filterPurchases(rows, { ...all, status: "locked" }, now).length, 1);
  assert.equal(records.filterPurchases(rows, { ...all, status: "claimable" }, now).length, 1);
  assert.equal(records.filterPurchases(rows, { ...all, month: 8 }, now).length, 1);
  assert.equal(records.filterPurchases(rows, { ...all, year: 2025 }, now).length, 0);
  assert.deepEqual(records.purchaseYearsOf(rows, now), [2026]);
  assert.deepEqual(records.purchaseYearsOf([], Date.UTC(2027, 0, 15)), [2027]);
});

test("the status pill reads the time left in two units", () => {
  assert.equal(presale.claimInOf(118_000), "Claim in 1 m 58 s");
  assert.equal(presale.claimInOf((2 * 60 + 10) * 60_000), "Claim in 2 h 10 m");
  assert.equal(presale.claimInOf((28 * 60) * 60_000), "Claim in 1 d 4 h");
  assert.equal(presale.claimInOf(400), "Claim in 1 s");
});
