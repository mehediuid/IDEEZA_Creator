// The phone's readings of the money records (lib/account/money-phone.ts).
import { test } from "node:test";
import assert from "node:assert/strict";

const { allowanceOf, lotStateOf, planSummaryOf, withdrawalTotalsOf, filterWithdrawals, periodLabel } = await import("../../.tmp-test/lib/account/money-phone.js");
const { lotsOf } = await import("../../.tmp-test/lib/create/credit-lots.js");

test("this month's plan credits come from the period's grant lot", () => {
  const sub = { id: "sub_a", startedAt: Date.UTC(2026, 0, 10) };
  const now = Date.UTC(2026, 0, 20);
  const ledger = [
    { id: "s", delta: 8, reason: "seed", ts: Date.UTC(2025, 11, 1) },
    { id: "g", delta: 300, reason: "grant", orderId: "grant_sub_a_0", ts: Date.UTC(2026, 0, 10), expiresAt: Date.UTC(2026, 1, 10) },
    { id: "b", delta: -12, reason: "build", buildId: "x", ts: Date.UTC(2026, 0, 12) },
  ];
  const a = allowanceOf(ledger, lotsOf(ledger), sub, now);
  assert.deepEqual({ allowance: a.allowance, used: a.used, remaining: a.remaining }, { allowance: 300, used: 12, remaining: 288 });
  assert.equal(allowanceOf(ledger, lotsOf(ledger), { id: "sub_b", startedAt: sub.startedAt }, now), null);
});

test("a lot is active, used or expired", () => {
  assert.equal(lotStateOf({ remaining: 3, expiresAt: null }, 10), "active");
  assert.equal(lotStateOf({ remaining: 0, expiresAt: 100 }, 10), "used");
  assert.equal(lotStateOf({ remaining: 3, expiresAt: 5 }, 10), "expired");
});

test("an annual checkout shows the monthly-price year and the saving", () => {
  assert.deepEqual(planSummaryOf(10, "builder", "yearly"), { subtotal: 120, annualOff: 24, price: 96 });
  assert.deepEqual(planSummaryOf(10, "builder", "monthly"), { subtotal: 10, annualOff: 0, price: 10 });
});

test("withdrawals total by status, and filter by words, status and date", () => {
  const now = Date.UTC(2026, 5, 30);
  const day = 86400000;
  const list = [
    { id: "AAA111", amount: "12.5", status: "complete", at: now - day, to: { label: "Crypto wallet", address: "0xabc" } },
    { id: "BBB222", amount: "7", status: "complete", at: now - 40 * day, to: { label: "Savings", address: "0xdef" } },
    { id: "legacy-1", amount: "3", status: "pending", at: now - 400 * day, to: { label: "Requested in Earn", address: null } },
  ];
  assert.deepEqual(withdrawalTotalsOf(list), { complete: "19.5", "in-progress": "0", pending: "3" });
  assert.deepEqual(filterWithdrawals(list, { query: "", status: "all", range: "all", now }).map((w) => w.id), ["AAA111", "BBB222", "legacy-1"]);
  assert.deepEqual(filterWithdrawals(list, { query: "savings", status: "all", range: "all", now }).map((w) => w.id), ["BBB222"]);
  assert.deepEqual(filterWithdrawals(list, { query: "", status: "pending", range: "all", now }).map((w) => w.id), ["legacy-1"]);
  assert.deepEqual(filterWithdrawals(list, { query: "", status: "all", range: "30d", now }).map((w) => w.id), ["AAA111"]);
});

test("a statement period reads as a month or a year", () => {
  assert.equal(periodLabel(2026, null), "2026");
  assert.equal(periodLabel(2026, 1), "January 2026");
});
