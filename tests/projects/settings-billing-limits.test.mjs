// Settings › Plan & pricing › Credit alerts and limits: what was spent this
// calendar month (refunds put back), the monthly limit pausing a build and
// refusing a charge, running low at your number, the next lot to expire, the
// extra confirm above a purchase amount, and auto top-up's one try per pause.
import { test } from "node:test";
import assert from "node:assert/strict";

const L = await import("../../.tmp-test/lib/create/credit-limits.js");
const C = await import("../../.tmp-test/lib/create/credits.js");

const at = (y, m, d, h = 12, min = 0) => new Date(y, m, d, h, min).getTime();
const NOW = at(2026, 9, 19); // 19 Oct 2026, local time
const DAY = 24 * 60 * 60 * 1000;
let n = 0;
const line = (reason, delta, ts, extra = {}) => ({ id: `l${++n}`, reason, delta, ts, ...extra });

// ── the calendar month ───────────────────────────────────────────────────

test("a month runs from local midnight on the 1st to the next 1st", () => {
  assert.deepEqual(L.monthBounds(NOW), { start: new Date(2026, 9, 1).getTime(), end: new Date(2026, 10, 1).getTime() });
  assert.deepEqual(L.monthBounds(at(2026, 11, 31, 23, 59)), {
    start: new Date(2026, 11, 1).getTime(),
    end: new Date(2027, 0, 1).getTime(),
  });
});

test("spent this month counts build and concept charges made in it, nothing else", () => {
  const ledger = [
    line("seed", 8, at(2026, 8, 1)),
    line("purchase", 100, at(2026, 9, 2)),
    line("build", -4, at(2026, 8, 30, 23, 30), { buildId: "old" }), // last month
    line("build", -4, at(2026, 9, 1, 0, 30), { buildId: "b1" }),
    line("concept", -1, at(2026, 9, 5), { buildId: "t1" }),
    line("expiry", -3, at(2026, 9, 6), { lotId: "x" }), // a lot running out isn't spending
    line("grant", 50, at(2026, 9, 7)),
  ];
  assert.equal(L.monthSpent(ledger, NOW), 5);
  assert.equal(L.monthSpent(ledger, at(2026, 8, 15)), 4);
  assert.equal(L.monthSpent(ledger, at(2026, 10, 2)), 0);
});

test("a refund puts its charge back, in the month the charge was made", () => {
  const ledger = [
    line("build", -8, at(2026, 9, 3), { buildId: "b1" }),
    line("refund", 8, at(2026, 9, 3, 13), { buildId: "b1" }),
    // charged in September, refunded in October: September gets it back
    line("concept", -1, at(2026, 8, 29), { buildId: "t1" }),
    line("refund", 1, at(2026, 9, 2), { buildId: "t1" }),
    // charge, refund, charge again: one charge stands
    line("build", -4, at(2026, 9, 10), { buildId: "b2" }),
    line("refund", 4, at(2026, 9, 10, 13), { buildId: "b2" }),
    line("build", -4, at(2026, 9, 11), { buildId: "b2" }),
  ];
  assert.equal(L.monthSpent(ledger, NOW), 4);
  assert.equal(L.monthSpent(ledger, at(2026, 8, 30)), 0);
});

// ── the monthly limit ─────────────────────────────────────────────────────

const spentEight = [line("purchase", 100, at(2026, 9, 2)), line("build", -8, at(2026, 9, 4), { buildId: "b0" })];

test("what the limit leaves: none set is no limit; reaching it exactly is allowed", () => {
  assert.equal(L.capLeft(spentEight, null, NOW), null);
  assert.equal(L.withinCap(spentEight, null, 10_000, NOW), true);
  assert.equal(L.capLeft(spentEight, 10, NOW), 2);
  assert.equal(L.withinCap(spentEight, 10, 2, NOW), true);
  assert.equal(L.withinCap(spentEight, 10, 3, NOW), false);
  // A limit lowered under what is already spent leaves nothing, never less.
  assert.equal(L.capLeft(spentEight, 5, NOW), 0);
});

test("a build whose turn comes: the limit is asked first, then the balance", () => {
  const gate = (balance, cost, cap, now = NOW) => L.buildGate({ balance, cost, ledger: spentEight, cap, now });
  assert.equal(gate(100, 4, 10), "cap");
  assert.equal(gate(2, 4, null), "credits");
  // Over the limit AND short: buying credits wouldn't start it, so it's the limit.
  assert.equal(gate(2, 4, 10), "cap");
  assert.equal(gate(4, 4, 12), "go");
  assert.equal(gate(100, 4, null), "go");
  // A new calendar month starts the count again.
  assert.equal(gate(100, 4, 10, at(2026, 10, 1, 9)), "go");
});

test("a charge that would cross the limit is refused, and says why", () => {
  const state = { balance: 92, ledger: spentEight };
  const over = C.chargeState(state, "b1", 4, "build", { cap: 10, now: NOW });
  assert.equal(over.ok, false);
  assert.equal(over.why, "cap");
  assert.equal(over.state, state);
  const concept = C.chargeState(state, "t9", 1, "concept", { cap: 9, now: NOW });
  assert.equal(concept.ok, true);
  assert.equal(concept.state.balance, 91);
  assert.equal(C.chargeState(state, "b1", 4).ok, true);
  const short = C.chargeState({ balance: 2, ledger: [] }, "b1", 4, "build", { cap: null, now: NOW });
  assert.deepEqual([short.ok, short.why], [false, "balance"]);
  // Already charged: idempotent, whatever the limit says now.
  assert.equal(C.chargeState(state, "b0", 8, "build", { cap: 1, now: NOW }).ok, true);
});

// ── running low, expiring, asking before a purchase ──────────────────────

test("running low at your number, inclusive", () => {
  assert.equal(L.runningLow(10, 10), true);
  assert.equal(L.runningLow(11, 10), false);
  assert.equal(L.runningLow(0, 0), true);
  assert.equal(L.runningLow(1, 0), false);
});

test("the next lot to expire: the earliest live lot with credits left", () => {
  const NOV13 = at(2026, 10, 13);
  const ledger = [
    line("seed", 8, at(2026, 8, 1)),
    line("purchase", 100, at(2026, 9, 2), { expiresAt: at(2027, 9, 2) }),
    line("grant", 50, at(2026, 9, 13), { expiresAt: NOV13 }),
    line("build", -20, at(2026, 9, 14), { buildId: "b1" }),
    line("grant", 50, at(2026, 8, 13), { expiresAt: at(2026, 9, 13) }), // already expired
  ];
  assert.deepEqual(L.nextExpiring(ledger, NOW), { credits: 30, expiresAt: NOV13 });
  assert.equal(L.expiringWithin(ledger, 14, NOW), null);
  assert.deepEqual(L.expiringWithin(ledger, 30, NOW), { credits: 30, expiresAt: NOV13 });
  assert.equal(L.nextExpiring([line("seed", 8, NOW - DAY)], NOW), null);
});

test("ask before a purchase over $X: strictly above it, never when unset", () => {
  assert.equal(L.needsConfirm(500, null), false);
  assert.equal(L.needsConfirm(5, 5), false);
  assert.equal(L.needsConfirm(5.01, 5), true);
  assert.equal(L.needsConfirm(20, 10), true);
});

// ── auto top-up ───────────────────────────────────────────────────────────

test("auto top-up buys once per pause, only when on, and only within the limit", () => {
  const T = at(2026, 9, 19, 10);
  const base = {
    on: true,
    packCredits: 100,
    pause: { buildId: "b1", blockedAt: T, cost: 4 },
    balance: 1,
    ledger: spentEight,
    cap: null,
    now: NOW,
    tried: [],
  };
  const key = L.pauseKey("b1", T);
  assert.deepEqual(L.autoTopUpDecision(base), { buy: true, key });
  assert.deepEqual(L.autoTopUpDecision({ ...base, on: false }), { buy: false, why: "off" });
  assert.deepEqual(L.autoTopUpDecision({ ...base, pause: null }), { buy: false, why: "no-pause" });
  assert.deepEqual(L.autoTopUpDecision({ ...base, tried: [key] }), { buy: false, why: "tried" });
  // The same build paused again later is a new pause: one more try.
  assert.equal(L.autoTopUpDecision({ ...base, tried: [key], pause: { ...base.pause, blockedAt: T + 60_000 } }).buy, true);
  // The build would cross the monthly limit: credits wouldn't start it.
  assert.deepEqual(L.autoTopUpDecision({ ...base, cap: 10 }), { buy: false, why: "cap" });
  assert.equal(L.autoTopUpDecision({ ...base, cap: 12 }).buy, true);
  // The pack wouldn't cover it, or the balance already does.
  assert.deepEqual(L.autoTopUpDecision({ ...base, packCredits: 2 }), { buy: false, why: "too-small" });
  assert.deepEqual(L.autoTopUpDecision({ ...base, balance: 4 }), { buy: false, why: "covered" });
});

test("tried pauses are kept short and unique", () => {
  const many = Array.from({ length: 80 }, (_, i) => `b${i}@1`);
  const kept = L.rememberTried(many, "b99@2");
  assert.equal(kept.length, L.TRIED_MAX);
  assert.equal(kept[kept.length - 1], "b99@2");
  assert.deepEqual(L.rememberTried(["a@1"], "a@1"), ["a@1"]);
});

// ── the card's form ───────────────────────────────────────────────────────

test("the form reads whole credits and days, empty limits as none, dollars with cents", () => {
  const ok = L.readLimitsForm({ lowAt: " 25 ", remindDays: "7", cap: "", confirmAbove: "" });
  assert.deepEqual(ok, { ok: true, value: { lowAt: 25, expiryReminderDays: 7, monthlyCap: null, confirmAbove: null } });
  const set = L.readLimitsForm({ lowAt: "0", remindDays: "365", cap: "1,000", confirmAbove: "$12.50" });
  assert.deepEqual(set, { ok: true, value: { lowAt: 0, expiryReminderDays: 365, monthlyCap: 1000, confirmAbove: 12.5 } });
});

test("the form says what is wrong with each field and how to fix it", () => {
  const bad = L.readLimitsForm({ lowAt: "-1", remindDays: "0", cap: "2.5", confirmAbove: "ten" });
  assert.equal(bad.ok, false);
  assert.deepEqual(Object.keys(bad.errors).sort(), ["cap", "confirmAbove", "lowAt", "remindDays"]);
  assert.equal(bad.errors.lowAt, "Enter a whole number of credits, 0 or more");
  assert.equal(bad.errors.remindDays, "Enter a number of days from 1 to 365");
  assert.equal(bad.errors.cap, "Enter a whole number of credits, or leave it empty for no limit");
  assert.equal(bad.errors.confirmAbove, "Enter an amount in dollars, like 10, or leave it empty");
  assert.equal(L.readLimitsForm({ lowAt: "", remindDays: "14", cap: "0", confirmAbove: "0.001" }).ok, false);
});
