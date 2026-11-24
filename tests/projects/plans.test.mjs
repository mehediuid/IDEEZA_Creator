// Plans and the subscription (User Panel V2 › Pricing): prices, how a plan
// stands to the current one, upgrades now, switches at the period's end,
// renewals, and each period's credits.
import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../../.tmp-test/lib/create/plans.js");
const { addMonths } = await import("../../.tmp-test/lib/create/credit-pricing.js");
const C = await import("../../.tmp-test/lib/create/credits.js");
const L = await import("../../.tmp-test/lib/create/credit-lots.js");

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 13, 12);
const pay = (orderId, amount = 10) => ({ orderId, amount, paidWith: "IDZ · demo wallet" });

test("the plans, as the Monthly cards price them; annual is 20% off", () => {
  assert.deepEqual(P.PLANS.map((p) => [p.name, p.monthly, p.credits]), [
    ["Free", 0, 10], ["Tinkerer", 8, 50], ["Builder", 10, 300], ["Disruptor", 20, 1200],
  ]);
  assert.equal(P.PLANS.find((p) => p.popular).tier, "builder");
  assert.deepEqual(P.priceOf("builder", "monthly"), { perMonth: 10, period: 10 });
  assert.deepEqual(P.priceOf("tinkerer", "yearly"), { perMonth: 6.4, period: 76.8 });
  assert.deepEqual(P.priceOf("disruptor", "yearly"), { perMonth: 16, period: 192 });
});

test("how each plan stands to the current one", () => {
  const free = P.freeSubscription(T0);
  assert.equal(P.relationOf(free, "free", "monthly"), "current");
  assert.equal(P.relationOf(free, "free", "yearly"), "current");
  assert.equal(P.relationOf(free, "builder", "monthly"), "upgrade");
  const builder = P.startPlan(free, "builder", "monthly", T0, pay("o1"));
  assert.equal(P.relationOf(builder, "builder", "monthly"), "current");
  assert.equal(P.relationOf(builder, "builder", "yearly"), "upgrade");
  assert.equal(P.relationOf(builder, "tinkerer", "monthly"), "downgrade");
  assert.equal(P.relationOf(builder, "disruptor", "monthly"), "upgrade");
  assert.equal(P.relationOf(P.scheduleSwitch(builder, "tinkerer", "monthly"), "tinkerer", "monthly"), "scheduled");
});

test("an upgrade from Free costs the whole period and starts now", () => {
  const free = P.freeSubscription(T0);
  const q = P.quoteUpgrade(free, "builder", "monthly", T0);
  assert.deepEqual({ price: q.price, unused: q.unused, due: q.due }, { price: 10, unused: 0, due: 10 });
  const s = P.startPlan(free, "builder", "monthly", T0, pay("o1"));
  assert.equal(s.tier, "builder");
  assert.equal(s.renewsAt, addMonths(T0, 1));
  assert.equal(s.orders.length, 1);
  assert.equal(P.startPlan(s, "builder", "monthly", T0, pay("o1")), s); // same order: once
});

test("an upgrade mid-period pays the difference for the unused time", () => {
  const builder = P.startPlan(P.freeSubscription(T0), "builder", "monthly", T0, pay("o1"));
  const half = T0 + (builder.renewsAt - T0) / 2;
  const q = P.quoteUpgrade(builder, "disruptor", "monthly", half);
  assert.equal(q.unused, 5);
  assert.equal(q.due, 15);
});

test("a smaller plan or a cancel waits for the period's end; keep undoes it", () => {
  const builder = P.startPlan(P.freeSubscription(T0), "builder", "monthly", T0, pay("o1"));
  const later = P.scheduleSwitch(builder, "tinkerer", "monthly");
  assert.equal(later.tier, "builder");
  assert.deepEqual(later.pending, { tier: "tinkerer", cycle: "monthly" });
  const moved = P.advance(later, builder.renewsAt + DAY);
  assert.equal(moved.tier, "tinkerer");
  assert.equal(moved.pending, null);
  assert.notEqual(moved.id, builder.id);
  const cancelled = P.cancelPlan(builder);
  assert.equal(cancelled.autoRenew, false);
  assert.equal(P.advance(cancelled, builder.renewsAt + DAY).tier, "free");
  assert.deepEqual(P.keepPlan(cancelled), { ...builder });
});

test("a renewal keeps the plan and is recorded as not charged", () => {
  const builder = P.startPlan(P.freeSubscription(T0), "builder", "monthly", T0, pay("o1"));
  const s = P.advance(builder, addMonths(T0, 2) + DAY); // two period ends
  assert.equal(s.tier, "builder");
  assert.equal(s.id, builder.id);
  assert.equal(s.renewsAt, addMonths(T0, 3));
  const renewals = s.orders.filter((o) => o.kind === "renewal");
  assert.equal(renewals.length, 2);
  assert.equal(renewals[0].paidWith, "Not charged (testnet demo)");
  assert.equal(P.advance(P.freeSubscription(T0), T0 + 400 * DAY).orders.length, 0); // Free never renews
});

test("a paid plan owes one grant each monthly period, ending with the period", () => {
  const builder = P.startPlan(P.freeSubscription(T0, "sub_a"), "builder", "monthly", T0, pay("o"));
  const g = P.grantDue(builder, new Set(), T0 + DAY);
  assert.deepEqual({ id: g.orderId, credits: g.credits, plan: g.plan }, { id: `grant_${builder.id}_0`, credits: 300, plan: "Builder" });
  assert.equal(g.expiresAt, addMonths(T0, 1));
  assert.equal(P.grantDue(builder, new Set([`grant_${builder.id}_0`]), T0 + DAY), null);
  assert.equal(P.grantDue(builder, new Set([`grant_${builder.id}_0`]), addMonths(T0, 1) + DAY).orderId, `grant_${builder.id}_1`);
});

test("Free's credits come once, ever, and never run out of time — no refill (owner 2026-11-24)", () => {
  const free = P.freeSubscription(T0, "sub_a");
  const g = P.grantDue(free, new Set(), T0 + DAY);
  assert.deepEqual({ id: g.orderId, credits: g.credits, plan: g.plan, expiresAt: g.expiresAt }, { id: P.FREE_GRANT_ID, credits: 10, plan: "Free", expiresAt: null });
  // Had once: nothing more, next month or a year on, nor on a fresh Free subscription after a paid plan.
  const had = new Set([P.FREE_GRANT_ID]);
  assert.equal(P.grantDue(free, had, addMonths(T0, 1) + DAY), null);
  assert.equal(P.grantDue(P.freeSubscription(addMonths(T0, 6), "sub_b"), had, addMonths(T0, 13)), null);
  // An older ledger's monthly Free grants count as the one grant.
  const legacy = P.grantedIdsOf([
    { reason: "seed" },
    { reason: "grant", orderId: "grant_sub_a_0", pack: "Free" },
    { reason: "grant", orderId: "grant_sub_c_0", pack: "Builder" },
  ]);
  assert.ok(legacy.has(P.FREE_GRANT_ID) && legacy.has("grant_sub_c_0"));
  assert.equal(P.grantDue(free, legacy, addMonths(T0, 2)), null);
  assert.equal(P.grantedIdsOf([{ reason: "grant", orderId: "grant_sub_c_0", pack: "Builder" }]).has(P.FREE_GRANT_ID), false);
  // On the ledger: a lot with no end date, spent after credits that do end.
  let s = { balance: 0, ledger: [] };
  s = C.grantState(s, g);
  assert.equal(s.ledger.at(-1).expiresAt, undefined);
  assert.equal(L.lotsOf(s.ledger)[0].expiresAt, null);
  assert.equal(L.expiryOf({ id: "x", delta: 10, reason: "grant", pack: "Free", ts: T0, expiresAt: addMonths(T0, 1) }), null); // older Free grants too
  assert.equal(L.expiryOf({ id: "y", delta: 300, reason: "grant", pack: "Builder", ts: T0, expiresAt: addMonths(T0, 1) }), addMonths(T0, 1));
});

test("the next plan credits: a paid plan's period end, none on Free or when the plan turns Free there", () => {
  const free = P.freeSubscription(T0, "sub_a");
  assert.equal(P.nextCreditsAt(free, T0 + DAY), null);
  const builder = P.startPlan(free, "builder", "monthly", T0, pay("o"));
  assert.equal(P.nextCreditsAt(builder, T0 + DAY), addMonths(T0, 1));
  assert.equal(P.nextCreditsAt(P.cancelPlan(builder), T0 + DAY), null);
  const yearly = P.startPlan(free, "builder", "yearly", T0, pay("y"));
  assert.equal(P.nextCreditsAt(P.cancelPlan(yearly), T0 + DAY), addMonths(T0, 1)); // the year still runs
});

test("a plan's credits in words: Free once, the others a month", () => {
  assert.equal(P.creditsWordsOf(P.planOf("free")), "10 AI credits, once");
  assert.equal(P.creditsWordsOf(P.planOf("builder")), "300 AI credits a month");
  assert.equal(P.featuresOf(P.planOf("free"))[0], "10 AI credits, once");
  assert.ok(P.lossesOf(P.planOf("builder"), P.planOf("free")).includes("Monthly AI credits: 300 → none"));
  assert.ok(P.lossesOf(P.planOf("builder"), P.planOf("tinkerer")).includes("AI credits: 300 → 50 a month"));
});

test("a grant on the ledger: a lot that expires with its period, spent before bought credits", () => {
  let s = { balance: 0, ledger: [] };
  s = C.purchaseState(s, { orderId: "buy", base: 100, bonus: 0, price: 5, paidWith: "IDZ · demo wallet", ts: T0 });
  const g = P.grantDue(P.startPlan(P.freeSubscription(T0), "builder", "monthly", T0, pay("o")), new Set(), T0);
  s = C.grantState(s, g);
  assert.equal(s.balance, 400);
  assert.equal(C.grantState(s, g), s); // once
  assert.equal(C.describeEntry(s.ledger.at(-1)), "+300 Builder plan credits");
  // chargeState stamps the charge with the clock: hold it inside the grant's period, so the test
  // doesn't start failing once the real date passes it (it did on 2026-11-14).
  const realNow = Date.now;
  Date.now = () => T0 + DAY;
  try {
    s = C.chargeState(s, "b1", 4).state;
  } finally {
    Date.now = realNow;
  }
  assert.deepEqual(L.lotsOf(s.ledger).map((l) => l.remaining), [100, 296]); // the grant expires first
  assert.equal(C.expireState(s, addMonths(T0, 1) + DAY).balance, 100);
});
