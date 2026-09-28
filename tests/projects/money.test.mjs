// Money in bigint micros (Phase 2 spec §3.1, §3.5.1): no float anywhere.
import { test } from "node:test";
import assert from "node:assert/strict";

const { MICROS_PER_UNIT, addAmounts, compareAmounts, formatAmount, fromMicros, normalizeAmount, subAmounts, toMicros } =
  await import("../../.tmp-test/lib/wallet/money.js");

test("1 unit is 1,000,000 micros", () => {
  assert.equal(MICROS_PER_UNIT, 1_000_000n);
  assert.equal(toMicros("1"), 1_000_000n);
  assert.equal(toMicros("0.05"), 50_000n);
  assert.equal(toMicros("0.000001"), 1n);
  assert.equal(toMicros("0"), 0n); // "> 0" is the caller's rule
});

test("0.05 + 0.021 is exactly 0.071 — the float sum would drift", () => {
  assert.notEqual(0.05 + 0.021, 0.071);
  assert.equal(fromMicros(toMicros("0.05") + toMicros("0.021")), "0.071");
  assert.equal(addAmounts("0.05", "0.021"), "0.071");
  assert.equal(formatAmount(fromMicros(toMicros("0.05") + toMicros("0.021")), "MATIC"), "0.071 MATIC");
});

test("toMicros: digits and one dot, at most 6 decimals", () => {
  assert.equal(toMicros("0.0000001"), null);
  assert.equal(toMicros("0.1000000"), null); // a 7th decimal, even a zero
  assert.equal(toMicros("12.345678"), 12_345_678n);
  assert.equal(toMicros(".5"), 500_000n);
  assert.equal(toMicros("5."), 5_000_000n);
  assert.equal(toMicros(" 0.05 "), 50_000n);
  for (const bad of ["", ".", "-1", "+1", "1e3", "1.2.3", "0,05", "abc", "1 000", "Infinity", "0x10"]) {
    assert.equal(toMicros(bad), null, JSON.stringify(bad));
  }
});

test("fromMicros writes units with no trailing zeros, and a sign when negative", () => {
  assert.equal(fromMicros(0n), "0");
  assert.equal(fromMicros(4_000_000n), "4");
  assert.equal(fromMicros(71_000n), "0.071");
  assert.equal(fromMicros(1_250n), "0.00125");
  assert.equal(fromMicros(1n), "0.000001");
  assert.equal(fromMicros(-500_000n), "-0.5");
  assert.equal(fromMicros(123_456_789_000_000n), "123456789");
});

test("formatAmount: the amount in its normal form, then the coin", () => {
  assert.equal(formatAmount("4", "IDZ"), "4 IDZ");
  assert.equal(formatAmount("0.05", "MATIC"), "0.05 MATIC");
  assert.equal(formatAmount("0.050", "ETH"), "0.05 ETH");
  assert.equal(formatAmount("-0.5", "ETH"), "-0.5 ETH");
  assert.equal(normalizeAmount("0.0500"), "0.05");
  assert.equal(normalizeAmount("nope"), null);
});

test("sums, differences and comparisons all run in bigint", () => {
  assert.equal(addAmounts(), "0");
  assert.equal(addAmounts("0.1", "0.2"), "0.3"); // 0.1 + 0.2 = 0.30000000000000004 in floats
  assert.equal(addAmounts("40", "-4"), "36");
  assert.equal(subAmounts("40", "4"), "36");
  assert.equal(subAmounts("0.05", "0.00125"), "0.04875");
  assert.equal(subAmounts("0.5", "1"), "-0.5");
  assert.equal(compareAmounts("0.05", "0.050"), 0);
  assert.equal(compareAmounts("0.04", "0.05"), -1);
  assert.equal(compareAmounts("1", "0.999999"), 1);
  assert.equal(compareAmounts("-0.5", "0"), -1);
  // An amount that doesn't parse reads as 0, so a render never throws.
  assert.equal(addAmounts("0.05", "junk"), "0.05");
});
