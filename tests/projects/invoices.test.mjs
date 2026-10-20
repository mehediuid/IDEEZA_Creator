// Billing history and invoices (User Panel V2 › Billing History, Invoice),
// derived from payments; what a cancel or a smaller plan takes away; and
// what a plan's start records for its invoice.
import { test } from "node:test";
import assert from "node:assert/strict";

const I = await import("../../.tmp-test/lib/account/invoices.js");
const P = await import("../../.tmp-test/lib/create/plans.js");
const C = await import("../../.tmp-test/lib/create/credits.js");

const T0 = Date.UTC(2026, 9, 13, 12);
const DAY = 24 * 60 * 60 * 1000;

test("a credit purchase is an invoice: its pack, the plan discount taken off, the total paid", () => {
  const state = C.purchaseState(
    { balance: 0, ledger: [] },
    { orderId: "order_mv6abc12_x9y8z7", base: 500, bonus: 50, pack: "Pro", price: 8.5, listPrice: 10, paidWith: "IDZ · demo wallet", ts: T0, txHash: "0xabc", payer: "0x955d" },
  );
  const [inv] = I.invoicesOf(state.ledger, []);
  assert.equal(inv.number, "INV-2026-12X9Y8Z7", "the year, and the last 8 letters and digits of the order id");
  assert.equal(inv.kind, "credits");
  assert.equal(inv.item, "Pro pack · 550 credits");
  assert.deepEqual(inv.lines, [{ description: "Pro pack", detail: "500 AI credits + 50 bonus", qty: 1, unit: 10, total: 10 }]);
  assert.deepEqual(inv.adjustments, [{ label: "Plan discount", amount: 1.5 }]);
  assert.equal(inv.subtotal, 10);
  assert.equal(inv.tax, 0);
  assert.equal(inv.total, 8.5);
  assert.equal(inv.paid, 8.5);
  assert.equal(inv.status, "Paid");
  assert.equal(inv.txHash, "0xabc");
  assert.equal(inv.payer, "0x955d");
});

test("an older purchase without a list price reads as no discount", () => {
  const ledger = [{ id: "c1", reason: "purchase", delta: 100, ts: T0, orderId: "order_a", bonus: 0, pack: "Starter", price: 5, paidWith: "IDZ · demo wallet" }];
  const [inv] = I.invoicesOf(ledger, []);
  assert.equal(inv.subtotal, 5);
  assert.deepEqual(inv.adjustments, []);
  assert.equal(inv.txHash, null);
});

test("a plan's start records its price and the unused time; the invoice shows both and the period", () => {
  const free = P.freeSubscription(T0);
  const builder = P.startPlan(free, "builder", "monthly", T0, { orderId: "plan_1", amount: 10, paidWith: "IDZ · demo wallet", price: 10, credit: 0, txHash: "0x1" });
  const later = T0 + 15 * DAY;
  const q = P.quoteUpgrade(builder, "disruptor", "monthly", later);
  const disruptor = P.startPlan(builder, "disruptor", "monthly", later, { orderId: "plan_2", amount: q.due, paidWith: "IDZ · demo wallet", price: q.price, credit: q.unused });
  const order = disruptor.orders.at(-1);
  assert.equal(order.price, 20);
  assert.equal(order.credit, q.unused);
  assert.equal(order.creditFrom, "builder");
  assert.equal(builder.orders[0].creditFrom, undefined, "no credit, no 'from'");

  const invoices = I.invoicesOf([], disruptor.orders);
  assert.equal(invoices[0].id, "plan_2", "newest first");
  const inv = invoices[0];
  assert.equal(inv.item, "Disruptor plan · monthly");
  assert.deepEqual(inv.adjustments, [{ label: "Unused time on Builder", amount: q.unused }]);
  assert.equal(inv.subtotal, 20);
  assert.equal(inv.total, q.due);
  assert.equal(inv.paid, q.due);
  assert.equal(inv.period.from, later);
  assert.ok(inv.period.to > later);
});

test("a renewal is an invoice that wasn't charged", () => {
  const sub = P.startPlan(P.freeSubscription(T0), "builder", "monthly", T0, { orderId: "plan_1", amount: 10, paidWith: "IDZ · demo wallet" });
  const renewed = P.advance(sub, T0 + 40 * DAY);
  const inv = I.invoicesOf([], renewed.orders).find((i) => i.kind === "renewal");
  assert.equal(inv.status, "Not charged");
  assert.equal(inv.total, 10);
  assert.equal(inv.paid, 0);
  assert.equal(inv.item, "Builder plan · monthly renewal");
});

test("search by invoice or order number, and a year", () => {
  const ledger = [
    { id: "c1", reason: "purchase", delta: 100, ts: T0, orderId: "order_aaaa1111", price: 5, paidWith: "x" },
    { id: "c2", reason: "purchase", delta: 100, ts: Date.UTC(2025, 2, 1), orderId: "order_bbbb2222", price: 5, paidWith: "x" },
    { id: "c3", reason: "build", delta: -4, ts: T0 },
  ];
  const all = I.invoicesOf(ledger, []);
  assert.equal(all.length, 2, "only payments");
  assert.deepEqual(I.invoiceYears(all), [2026, 2025]);
  assert.equal(I.filterInvoices(all, "", 2025)[0].id, "order_bbbb2222");
  assert.equal(I.filterInvoices(all, "aaaa", null)[0].id, "order_aaaa1111");
  assert.equal(I.filterInvoices(all, `#${all[0].number.toLowerCase()}`, null).length, 1);
  assert.equal(I.filterInvoices(all, "zzz", null).length, 0);
});

test("what a cancel or a smaller plan takes away", () => {
  const free = P.planOf("free");
  const builder = P.planOf("builder");
  const disruptor = P.planOf("disruptor");
  assert.deepEqual(P.lossesOf(builder, free), [
    "AI credits: 300 → 10 a month",
    "AI queue: Priority → Basic",
    "Projects: 20 → 1",
    "Exports: 50 → 2 a month",
    "Contributors: 20 → none",
    "Credit discount: 15% → none",
  ]);
  assert.ok(P.lossesOf(disruptor, builder).includes("720p AI video: 480p only"));
  assert.deepEqual(P.lossesOf(free, builder), [], "a bigger plan takes nothing away");
  assert.ok(P.featuresOf(disruptor).includes("720p AI video"));
  assert.ok(!P.featuresOf(builder).includes("720p AI video"));
});
