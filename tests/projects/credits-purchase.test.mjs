// Buying AI credits: packs, prices, plan discounts, lots and expiry
// (User Panel V2 › AI Credit Purchase, Figma 41549:170243).
import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../../.tmp-test/lib/create/credit-pricing.js");
const L = await import("../../.tmp-test/lib/create/credit-lots.js");
const C = await import("../../.tmp-test/lib/create/credits.js");

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 3, 15, 12); // 15 Apr 2026, as the design's history

// ── pricing ──────────────────────────────────────────────────────────────

test("the three packs, as the design prices them", () => {
  assert.deepEqual(
    P.CREDIT_PACKS.map((p) => [p.name, p.price, p.base + p.bonus]),
    [["Starter", 5, 100], ["Pro", 10, 550], ["Power", 20, 1150]],
  );
  assert.equal(P.CREDIT_PACKS.find((p) => p.popular).id, "pro");
});

test("plan discounts follow the comparison table, and prices are computed from them", () => {
  assert.equal(P.discountFor("free", "monthly"), 0);
  assert.equal(P.discountFor("explorer", "yearly"), 0);
  assert.equal(P.discountFor("builder", "monthly"), 0.15);
  assert.equal(P.discountFor("builder", "yearly"), 0.25);
  assert.equal(P.discountFor("disruptor", "monthly"), 0.25);
  assert.equal(P.discountFor("disruptor", "yearly"), 0.35);
  assert.equal(P.MAX_DISCOUNT, 0.35);
  const pro = P.CREDIT_PACKS[1];
  assert.deepEqual(P.packPrice(pro, 0.15), { base: 10, final: 8.5, saved: 1.5 });
  assert.deepEqual(P.packPrice(P.CREDIT_PACKS[2], 0.35), { base: 20, final: 13, saved: 7 });
  assert.equal(P.discountRows().length, 4);
});

test("a custom amount: $0.10 a credit, at least 50", () => {
  assert.deepEqual(P.customPrice(60), { base: 6, final: 6, saved: 0 });
  assert.equal(P.customAmountError(40), "Enter at least 50 credits");
  assert.equal(P.customAmountError(50), null);
  assert.equal(P.customAmountError(12.5), "Enter a whole number of credits");
  assert.equal(P.customAmountError(NaN), "Enter at least 50 credits");
});

test("a better deal: 60 custom credits ($6) → Starter, 100 for $5", () => {
  assert.equal(P.betterDeal(60).id, "starter");
  assert.equal(P.betterDeal(500).id, "pro"); // $50 custom vs 550 for $10
  assert.equal(P.betterDeal(5000), null); // more than any pack holds
  assert.equal(P.betterDeal(40), null); // not a valid amount
});

test("the pack that covers a shortfall", () => {
  assert.equal(P.packCovering(3).id, "starter");
  assert.equal(P.packCovering(101).id, "pro");
  assert.equal(P.packCovering(5000).id, "power");
});

test("money and dates", () => {
  assert.equal(P.usd(6), "$6.00");
  assert.equal(P.usd(8.5), "$8.50");
  assert.equal(P.coinAmount(10, "USDT"), 10);
  assert.equal(P.coinAmount(10, "IDZ"), 10 * P.IDZ_PER_USD);
  assert.equal(new Date(P.addMonths(T0, 12)).toISOString().slice(0, 10), "2027-04-15");
  assert.equal(new Date(P.addMonths(Date.UTC(2026, 0, 31, 12), 1)).getUTCDate(), 28);
});

// ── purchases on the ledger ─────────────────────────────────────────────

const seed = () => ({ balance: 8, ledger: [{ id: "s", delta: 8, reason: "seed", ts: T0 - DAY }] });
const pro = (orderId, ts = T0) => ({ orderId, base: 500, bonus: 50, pack: "Pro", price: 10, paidWith: "IDZ · demo wallet", ts });

test("a purchase adds base and bonus, expiring in 12 months", () => {
  const s = C.purchaseState(seed(), pro("o1"));
  assert.equal(s.balance, 558);
  const e = s.ledger.at(-1);
  assert.equal(e.reason, "purchase");
  assert.equal(e.delta, 550);
  assert.equal(e.bonus, 50);
  assert.equal(new Date(e.expiresAt).toISOString().slice(0, 10), "2027-04-15");
  assert.equal(C.describeEntry(e), "+550 Pro pack");
});

test("the same order twice adds once (double click, replay)", () => {
  const once = C.purchaseState(seed(), pro("o1"));
  assert.equal(C.purchaseState(once, pro("o1")), once);
});

test("a build charged right after a purchase sees the bought credits", () => {
  const short = { balance: 2, ledger: [{ id: "s", delta: 2, reason: "seed", ts: T0 }] };
  assert.equal(C.chargeState(short, "b1", 4).ok, false);
  const r = C.chargeState(C.purchaseState(short, pro("o")), "b1", 4);
  assert.equal(r.ok, true);
  assert.equal(r.state.balance, 548);
});

// ── lots and expiry ─────────────────────────────────────────────────────

test("spending takes from the lot that expires first, and a refund puts it back", () => {
  let s = C.purchaseState(seed(), pro("old", T0));
  s = C.purchaseState(s, pro("new", T0 + 30 * DAY));
  s = C.chargeState(s, "b1", 4).state;
  let lots = L.lotsOf(s.ledger);
  assert.deepEqual(lots.map((l) => l.remaining), [8, 546, 550]); // the seed never expires: last
  s = C.refundState(s, "b1").state;
  lots = L.lotsOf(s.ledger);
  assert.deepEqual(lots.map((l) => l.remaining), [8, 550, 550]);
});

test("a lot past its date expires: an expiry line, and the balance follows", () => {
  let s = C.purchaseState(seed(), pro("o", T0));
  s = C.chargeState(s, "b1", 4).state; // takes from the purchase (expires first)
  const later = P.addMonths(T0, 12) + DAY;
  const expired = C.expireState(s, later);
  const line = expired.ledger.at(-1);
  assert.equal(line.reason, "expiry");
  assert.equal(line.delta, -546);
  assert.equal(expired.balance, 8);
  assert.equal(C.describeEntry(line), "−546 Expired");
  assert.equal(C.expireState(expired, later + DAY), expired); // nothing left to expire
  assert.equal(C.expireState(s, T0 + DAY), s); // not due yet
});

test("an old free top-up line expires 12 months after it came in", () => {
  const s = { balance: 18, ledger: [...seed().ledger, { id: "t", delta: 10, reason: "topup", ts: T0 }] };
  assert.equal(C.expireState(s, P.addMonths(T0, 12) - DAY), s);
  assert.equal(C.expireState(s, P.addMonths(T0, 12) + DAY).balance, 8);
});

test("a ledger line with a reason this code doesn't know still reads", () => {
  assert.equal(C.describeEntry({ id: "x", delta: 30, reason: "grant", ts: 0 }), "+30 Credits");
});
