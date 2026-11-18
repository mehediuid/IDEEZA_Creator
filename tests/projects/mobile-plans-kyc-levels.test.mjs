// The phone's KYC levels 2 and 3 (lib/commerce/kyc-levels.ts): the outcome only, each level after the one before.
import { test } from "node:test";
import assert from "node:assert/strict";

const { EMPTY_LEVELS, normalizeLevels, parseLevels, levelStatusOf, startBlockOf, submitLevel, reviewLevel, levelDueOf, writeLevels, readLevelsRaw, KYC_LEVELS_KEY } =
  await import("../../.tmp-test/lib/commerce/kyc-levels.js");

test("nothing stored reads as not submitted", () => {
  assert.deepEqual(parseLevels(null), EMPTY_LEVELS);
  assert.deepEqual(parseLevels("{oops"), EMPTY_LEVELS);
  assert.equal(levelStatusOf(EMPTY_LEVELS, "intermediate"), "none");
});

test("a broken level drops alone, and Level 3 needs Level 2 approved", () => {
  const l = normalizeLevels({ v: 1, intermediate: { status: "review", at: 5 }, advanced: { status: "approved", at: 6 } });
  assert.deepEqual(l.intermediate, { status: "review", at: 5 });
  assert.equal(l.advanced, null);
  assert.equal(normalizeLevels({ v: 1, intermediate: { status: "maybe", at: 5 } }).intermediate, null);
});

test("Level 2 starts only after Level 1; Level 3 only after Level 2 is approved", () => {
  assert.match(startBlockOf(EMPTY_LEVELS, "intermediate", false), /Level 1/);
  assert.equal(startBlockOf(EMPTY_LEVELS, "intermediate", true), null);
  assert.match(startBlockOf(EMPTY_LEVELS, "advanced", true), /Level 2/);
  assert.equal(submitLevel(EMPTY_LEVELS, "advanced", true, 1), EMPTY_LEVELS);
  const sent = submitLevel(EMPTY_LEVELS, "intermediate", true, 10);
  assert.equal(levelStatusOf(sent, "intermediate"), "review");
  assert.match(startBlockOf(sent, "intermediate", true), /review/);
  const ok = reviewLevel(sent, "intermediate", "approved", 20);
  assert.equal(levelStatusOf(ok, "intermediate"), "approved");
  assert.equal(startBlockOf(ok, "advanced", true), null);
});

test("a rejected level can be sent again; rejecting Level 2 drops Level 3", () => {
  let l = submitLevel(EMPTY_LEVELS, "intermediate", true, 1);
  l = reviewLevel(l, "intermediate", "rejected", 2);
  assert.equal(levelStatusOf(l, "intermediate"), "rejected");
  assert.equal(startBlockOf(l, "intermediate", true), null);
  assert.equal(reviewLevel(l, "intermediate", "approved", 3), l, "only a level under review is answered");
});

test("the level due follows total sales", () => {
  assert.equal(levelDueOf(EMPTY_LEVELS, 999), null);
  assert.equal(levelDueOf(EMPTY_LEVELS, 1000), "intermediate");
  assert.equal(levelDueOf(EMPTY_LEVELS, 6000), "intermediate");
  const two = reviewLevel(submitLevel(EMPTY_LEVELS, "intermediate", true, 1), "intermediate", "approved", 2);
  assert.equal(levelDueOf(two, 1500), null);
  assert.equal(levelDueOf(two, 5000), "advanced");
});

test("an empty record removes the key; a refused write says so", () => {
  const map = new Map();
  globalThis.window = { localStorage: { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) } };
  assert.equal(writeLevels(submitLevel(EMPTY_LEVELS, "intermediate", true, 1)), true);
  assert.ok(map.has(KYC_LEVELS_KEY));
  assert.equal(levelStatusOf(parseLevels(readLevelsRaw()), "intermediate"), "review");
  assert.equal(writeLevels(EMPTY_LEVELS), true);
  assert.equal(map.has(KYC_LEVELS_KEY), false);
  globalThis.window = { localStorage: { getItem: () => null, setItem: () => { throw new Error("full"); }, removeItem: () => {} } };
  assert.equal(writeLevels(submitLevel(EMPTY_LEVELS, "intermediate", true, 1)), false);
  delete globalThis.window;
});
