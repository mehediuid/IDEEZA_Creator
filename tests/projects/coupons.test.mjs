// Plan coupons (User Panel V2 › ✅ Pricing › Upgrade Package flow: Have a
// Coupon?, Coupon Invalid, Coupon Applied): the rules in one config, what a
// code takes off, one discount per order beside the welcome offer, the code
// kept on the plan order (once per account, idempotent) and on its invoice.
import { test } from "node:test";
import assert from "node:assert/strict";

const K = await import("../../.tmp-test/lib/create/coupons.js");
const P = await import("../../.tmp-test/lib/create/plans.js");
const I = await import("../../.tmp-test/lib/account/invoices.js");

const NOW = Date.UTC(2026, 10, 5, 12);
const LIST = [
  { code: "TEN", kind: "percent", value: 10, plans: "all", ends: "2027-12-31" },
  { code: "FIVE", kind: "amount", value: 5, plans: ["builder"], ends: "2027-06-30" },
  { code: "MAKER60", kind: "percent", value: 60, plans: ["tinkerer", "builder"], ends: "2027-12-31" },
  { code: "OLD", kind: "percent", value: 25, plans: "all", ends: "2026-10-31" },
];
const ctx = (over = {}) => ({ tier: "builder", due: 10, now: NOW, used: new Set(), ...over });

test("the demo config: every code has a rule, plans and a real last day", () => {
  assert.ok(K.COUPONS.length >= 4);
  for (const c of K.COUPONS) {
    assert.match(c.code, /^[A-Z0-9]+$/, `${c.code} is capitals and digits`);
    assert.ok(c.kind === "percent" ? c.value > 0 && c.value <= 100 : c.value > 0, `${c.code} has a sensible value`);
    assert.ok(c.plans === "all" || (c.plans.length > 0 && c.plans.every((t) => ["tinkerer", "builder", "disruptor"].includes(t))));
    assert.ok(Number.isFinite(K.couponEndsAt(c)), `${c.code} ends on a real day`);
  }
  assert.equal(new Set(K.COUPONS.map((c) => c.code)).size, K.COUPONS.length, "no code twice");
  assert.ok(K.COUPONS.some((c) => c.code === "IDEEZA30"), "the Figma's code works");
});

test("a typed code: spaces and case don't matter", () => {
  assert.equal(K.normalizeCode("  ten "), "TEN");
  assert.equal(K.normalizeCode("ide eza30"), "IDEEZA30");
  const r = K.checkCoupon(" ten ", ctx(), LIST);
  assert.equal(r.ok, true);
  assert.deepEqual(r.applied, { code: "TEN", amount: 1, rule: "10% off" });
});

test("a wrong, empty, ended or not-for-this-plan code says why", () => {
  assert.equal(K.checkCoupon("", ctx(), LIST).reason, "empty");
  const wrong = K.checkCoupon("NOPE", ctx(), LIST);
  assert.equal(wrong.reason, "unknown");
  assert.match(wrong.message, /not valid/);
  const ended = K.checkCoupon("old", ctx(), LIST);
  assert.equal(ended.reason, "ended");
  assert.equal(ended.message, "Sorry, this coupon ended on 31 Oct 2026.");
  const plan = K.checkCoupon("FIVE", ctx({ tier: "tinkerer" }), LIST);
  assert.equal(plan.reason, "plan");
  assert.equal(plan.message, "Sorry, this coupon is for Builder only.");
  assert.equal(K.checkCoupon("MAKER60", ctx({ tier: "disruptor" }), LIST).message, "Sorry, this coupon is for Tinkerer and Builder only.");
});

test("a code works to the end of its last day (UTC), not a second more", () => {
  const old = LIST[3];
  assert.equal(K.checkCoupon("OLD", ctx({ now: Date.UTC(2026, 9, 31, 23, 59, 59) }), LIST).ok, true);
  assert.equal(K.checkCoupon("OLD", ctx({ now: Date.UTC(2026, 10, 1) }), LIST).reason, "ended");
  assert.equal(K.couponEndsAt(old), Date.UTC(2026, 10, 1) - 1);
});

test("percent off what is due; dollars off capped at it; never below $0", () => {
  assert.equal(K.couponSaving(LIST[0], 96), 9.6);
  assert.equal(K.couponSaving(LIST[0], 8.33), 0.83);
  assert.equal(K.couponSaving(LIST[1], 10), 5);
  assert.equal(K.couponSaving(LIST[1], 3.2), 3.2, "never more than what is left to pay");
  assert.equal(K.couponSaving(LIST[1], 0), 0);
  assert.equal(K.checkCoupon("FIVE", ctx({ due: 0 }), LIST).reason, "nothing", "nothing to pay: the code isn't needed");
  assert.equal(K.couponRule(LIST[1]), "$5 off");
  assert.equal(K.couponRule({ ...LIST[1], value: 2.5 }), "$2.50 off");
});

test("each code once per account, read from the plan orders", () => {
  const used = K.couponsUsed([{ coupon: { code: "ten" } }, {}, { coupon: undefined }]);
  assert.deepEqual([...used], ["TEN"]);
  const again = K.checkCoupon("TEN", ctx({ used }), LIST);
  assert.equal(again.reason, "used");
  assert.match(again.message, /already used/);
});

test("one discount per order: the bigger of the welcome offer and the coupon", () => {
  assert.equal(K.pickDiscount(5, 3), "offer");
  assert.equal(K.pickDiscount(5, 6), "coupon");
  assert.equal(K.pickDiscount(5, 5), "offer", "a tie keeps the offer");
  assert.equal(K.pickDiscount(null, 3), "coupon");
  assert.equal(K.pickDiscount(5, null), "offer");
  assert.equal(K.pickDiscount(null, null), null);
});

test("a plan bought with a coupon keeps the code and what it took off; the same order twice records once", () => {
  const sub = P.freeSubscription(NOW - 1000);
  const pay = { orderId: "plan_cpn_1", amount: 7, paidWith: "IDZ · demo wallet", price: 10, coupon: { code: "IDEEZA30", amount: 3, rule: "30% off" } };
  const once = P.startPlan(sub, "builder", "monthly", NOW, pay);
  const twice = P.startPlan(once, "builder", "monthly", NOW + 5, pay);
  assert.equal(twice, once, "the second start of the same order changes nothing");
  assert.equal(twice.orders.length, 1);
  assert.deepEqual(twice.orders[0].coupon, { code: "IDEEZA30", amount: 3, rule: "30% off" });
  assert.equal(twice.orders[0].amount, 7);
  assert.deepEqual([...K.couponsUsed(twice.orders)], ["IDEEZA30"]);
  // A coupon that took nothing off isn't kept.
  const none = P.startPlan(sub, "builder", "monthly", NOW, { ...pay, orderId: "plan_cpn_2", coupon: { code: "X", amount: 0, rule: "10% off" } });
  assert.equal(none.orders[0].coupon, undefined);
});

test("the invoice lists the coupon as its own line; Billing history reads its code", () => {
  const sub = P.startPlan(P.freeSubscription(NOW - 1000), "builder", "yearly", NOW, {
    orderId: "plan_cpn_3",
    amount: 67.2,
    paidWith: "USDT · demo wallet",
    price: 96,
    coupon: { code: "IDEEZA30", amount: 28.8, rule: "30% off" },
  });
  const [inv] = I.invoicesOf([], sub.orders);
  assert.equal(inv.subtotal, 96);
  assert.deepEqual(inv.adjustments, [{ label: "Coupon IDEEZA30 (30% off)", amount: 28.8 }]);
  assert.equal(inv.total, 67.2);
  assert.equal(inv.paid, 67.2);
  assert.deepEqual(inv.coupon, { code: "IDEEZA30", amount: 28.8 });
  // An order without its price still adds the coupon back to find it.
  const [old] = I.invoicesOf([], [{ ...sub.orders[0], price: undefined }]);
  assert.equal(old.subtotal, 96);
  // An order without a coupon has none.
  const [plain] = I.invoicesOf([], [{ ...sub.orders[0], coupon: undefined, amount: 96 }]);
  assert.equal(plain.coupon, null);
  assert.deepEqual(plain.adjustments, []);
});

test("an upgrade from a paid plan: the coupon comes off what is left after the unused time", () => {
  const T0 = Date.UTC(2026, 10, 1);
  const tinkerer = P.startPlan(P.freeSubscription(T0 - 1000), "tinkerer", "monthly", T0, { orderId: "plan_t", amount: 8, paidWith: "IDZ · demo wallet", price: 8 });
  const q = P.quoteUpgrade(tinkerer, "builder", "monthly", NOW);
  assert.ok(q.unused > 0 && q.due < q.price);
  const r = K.checkCoupon("TEN", ctx({ due: q.due }), LIST);
  assert.equal(r.ok, true);
  assert.equal(r.saving, Math.round(q.due * 10) / 100);
});
