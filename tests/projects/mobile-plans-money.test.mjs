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

test("Free's credits: its one grant, with no end date (owner 2026-11-24)", () => {
  const now = Date.UTC(2026, 3, 20);
  const sub = { id: "sub_f", startedAt: Date.UTC(2026, 0, 10), tier: "free" };
  const ledger = [
    { id: "s", delta: 8, reason: "seed", ts: Date.UTC(2026, 0, 9) },
    { id: "g", delta: 10, reason: "grant", orderId: "grant_free", pack: "Free", ts: Date.UTC(2026, 0, 10) },
    { id: "b", delta: -5, reason: "build", buildId: "x", ts: Date.UTC(2026, 0, 12) },
  ];
  const a = allowanceOf(ledger, lotsOf(ledger), sub, now);
  assert.deepEqual(a, { allowance: 10, used: 0, remaining: 10, endsAt: null }); // the seed never ends either, and came first
  assert.equal(allowanceOf(ledger.slice(0, 1), lotsOf(ledger.slice(0, 1)), sub, now), null);
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

test("the phone says when credits refill only on a paid plan: the day comes from nextCreditsAt (null on Free)", async () => {
  const { readFile } = await import("node:fs/promises");
  const upsell = await readFile(new URL("../../src/components/mobile/plans/upsell.tsx", import.meta.url), "utf8");
  assert.match(upsell, /nextCreditsAt\(sub, now\)/);
  assert.doesNotMatch(upsell, /creditPeriod\(sub, now\)\.end/);
  const screens = await readFile(new URL("../../src/components/mobile/plans/credit-screens.tsx", import.meta.url), "utf8");
  assert.match(screens, /once \? "Free credits" : "This month"/);
});

test("several products start a new project; one product picks New project or A project I have (owner 2026-11-24)", async () => {
  const { readFile } = await import("node:fs/promises");
  const setup = await readFile(new URL("../../src/components/mobile/ai/setup.tsx", import.meta.url), "utf8");
  assert.match(setup, /const choosing = \(!multi && projects\.length > 0\) \|\| addTo !== null;/);
  assert.match(setup, />New project</);
  assert.match(setup, />A project I have</);
  assert.doesNotMatch(setup, /go in one project: one you have, or a new one/);
  const flow = await readFile(new URL("../../src/components/mobile/ai/use-concept-flow.ts", import.meta.url), "utf8");
  assert.match(flow, /projects: gateMulti \? \[\] : setupProjects/);
});
