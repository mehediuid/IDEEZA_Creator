// The account popover's balance and level, derived from the credits ledger.
import { test } from "node:test";
import assert from "node:assert/strict";

const { creditTotals, xpOf, levelOf, XP_PER } = await import("../../.tmp-test/lib/account/summary.js");

const seed = { delta: 8, reason: "seed" };

test("a fresh account: 8 given, 8 left, no XP, Explorer at 0 / 499", () => {
  assert.deepEqual(creditTotals([seed]), { total: 8, remaining: 8 });
  assert.equal(xpOf([seed]), 0);
  assert.deepEqual(levelOf(0), { name: "Explorer", xp: 0, cap: 499, progress: 0 });
});

test("top-ups count in total, charges only in remaining", () => {
  const ledger = [
    seed,
    { delta: 10, reason: "topup" },
    { delta: -1, reason: "concept", buildId: "t1" },
    { delta: -4, reason: "build", buildId: "b1" },
  ];
  assert.deepEqual(creditTotals(ledger), { total: 18, remaining: 13 });
});

test("a refund gives the credits back but not to the total", () => {
  const ledger = [seed, { delta: -4, reason: "build", buildId: "b1" }, { delta: 4, reason: "refund", buildId: "b1" }];
  assert.deepEqual(creditTotals(ledger), { total: 8, remaining: 8 });
});

test("XP: concepts and builds that stuck; a refunded build earns nothing", () => {
  const ledger = [
    seed,
    { delta: -1, reason: "concept", buildId: "t1" },
    { delta: -1, reason: "concept", buildId: "t2" },
    { delta: -4, reason: "build", buildId: "b1" },
    { delta: -4, reason: "build", buildId: "b2" },
    { delta: 4, reason: "refund", buildId: "b2" },
  ];
  assert.equal(xpOf(ledger), 2 * XP_PER.concept + XP_PER.build);
});

test("charge, refund, charge again on one id counts once", () => {
  const ledger = [
    { delta: -4, reason: "build", buildId: "b1" },
    { delta: 4, reason: "refund", buildId: "b1" },
    { delta: -4, reason: "build", buildId: "b1" },
  ];
  assert.equal(xpOf(ledger), XP_PER.build);
});

test("levels: thresholds, caps and progress", () => {
  assert.deepEqual(levelOf(270), { name: "Explorer", xp: 270, cap: 499, progress: 270 / 500 });
  assert.equal(levelOf(499).name, "Explorer");
  assert.deepEqual(levelOf(500), { name: "Maker", xp: 500, cap: 1499, progress: 0 });
  assert.equal(levelOf(1500).name, "Inventor");
  assert.deepEqual(levelOf(5000), { name: "Pioneer", xp: 5000, cap: null, progress: 1 });
  assert.equal(levelOf(-3).xp, 0);
});
