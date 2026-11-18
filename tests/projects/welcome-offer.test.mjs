// The welcome offer (owner 2026-11-04): half off the first payment on any plan,
// 12 hours from when it is first shown, kept per account through reloads, its
// pop-up never back once closed, spent by a purchase, and on the invoice.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.dispatchEvent = () => true;
globalThis.Event = class {};

const o = await import("../../.tmp-test/lib/account/welcome-offer.js");
const { invoicesOf } = await import("../../.tmp-test/lib/account/invoices.js");

const T = Date.UTC(2026, 10, 4, 12);
const H = 60 * 60 * 1000;

beforeEach(() => store.clear());

test("12 hours, half off", () => {
  assert.equal(o.OFFER_HOURS, 12);
  assert.equal(o.OFFER_MS, 12 * H);
  assert.equal(o.OFFER_OFF, 0.5);
  assert.deepEqual(o.offerPrice(10), { saving: 5, final: 5 });
  assert.deepEqual(o.offerPrice(76.8), { saving: 38.4, final: 38.4 });
});

test("the clock: open for 12 hours from its start, then ended; a purchase spends it", () => {
  const e = { startedAt: T, closedAt: null, usedAt: null };
  assert.equal(o.offerPhase(null, T), "unstarted");
  assert.equal(o.offerPhase(e, T + 11.9 * H), "open");
  assert.equal(o.offerPhase(e, T + 12 * H), "ended");
  assert.equal(o.offerPhase({ ...e, usedAt: T + H }, T + 2 * H), "used");
  assert.equal(o.msLeft(e, T + 2 * H), 10 * H);
  assert.equal(o.msLeft(e, T + 13 * H), 0);
  assert.equal(o.msLeft(e, T - 5000), 12 * H);
  assert.equal(o.countdown(10 * H + 5 * 60 * 1000 + 7000), "10:05:07");
  assert.deepEqual(o.countdownParts(59 * 1000), { hours: "00", minutes: "00", seconds: "59" });
});

test("it starts once per account and never restarts, whatever reloads or comes later", () => {
  assert.equal(o.startOffer("Rafiq@Example.com", T).ok, true);
  o.startOffer("rafiq@example.com", T + 5 * H);
  assert.equal(o.readOffer("rafiq@example.com").startedAt, T);
  assert.equal(o.readOffer("nila@example.com"), null);
});

test("closing is remembered once; spending closes it too", () => {
  o.startOffer("rafiq@example.com", T);
  o.closeOffer("rafiq@example.com", T + 60_000);
  o.closeOffer("rafiq@example.com", T + 120_000);
  assert.equal(o.readOffer("rafiq@example.com").closedAt, T + 60_000);
  o.startOffer("nila@example.com", T);
  o.spendOffer("nila@example.com", T + H);
  const n = o.readOffer("nila@example.com");
  assert.equal(n.usedAt, T + H);
  assert.equal(n.closedAt, T + H);
  assert.equal(o.offerPhase(n, T + 2 * H), "used");
});

test("junk in storage reads as no offers", () => {
  for (const raw of [null, 3, "x", [], { byEmail: 4 }, { byEmail: { "a@b.co": { startedAt: "x" } } }]) {
    assert.deepEqual(o.normalizeOffers(raw).byEmail, {});
  }
});

test("the invoice shows the offer as its own line and takes it off the total", () => {
  const [inv] = invoicesOf([], [{ orderId: "plan_1", ts: T, tier: "builder", cycle: "monthly", amount: 5, paidWith: "IDZ · demo wallet", kind: "start", price: 10, credit: 0, offer: 5 }]);
  assert.deepEqual(inv.adjustments, [{ label: "Welcome offer (50% off)", amount: 5 }]);
  assert.equal(inv.subtotal, 10);
  assert.equal(inv.total, 5);
  assert.equal(inv.paid, 5);
});
