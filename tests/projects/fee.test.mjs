// IDEEZA's fee (Phase 2 spec §3.5.2, owner decision 11, C10): one constant, taken out of the
// price, floored to the micro in the creator's favour.
import { test } from "node:test";
import assert from "node:assert/strict";

const { FEE_LABEL, IDEEZA_FEE_BPS, feePercentText, ideezaFeeOf, payoutOf } = await import(
  "../../.tmp-test/lib/market/fee.js"
);
const { addAmounts } = await import("../../.tmp-test/lib/wallet/money.js");

test("the fee is 2.5 %, held in one constant", () => {
  assert.equal(IDEEZA_FEE_BPS, 250);
  assert.equal(feePercentText(), "2.5%");
  assert.equal(FEE_LABEL, "IDEEZA fee (2.5%)");
});

test("0.05 pays a 0.00125 fee and leaves 0.04875 to the seller", () => {
  assert.equal(ideezaFeeOf("0.05"), "0.00125");
  assert.equal(payoutOf("0.05"), "0.04875");
  // Fee + payout is the price: the buyer pays nothing on top.
  assert.equal(addAmounts(ideezaFeeOf("0.05"), payoutOf("0.05")), "0.05");
});

test("the fee floors to the micro, in the creator's favour", () => {
  assert.equal(ideezaFeeOf("0.000001"), "0");
  assert.equal(payoutOf("0.000001"), "0.000001");
  assert.equal(ideezaFeeOf("0.000039"), "0"); // 0.000000975 floors to 0
  assert.equal(ideezaFeeOf("0.00004"), "0.000001");
  assert.equal(ideezaFeeOf("1"), "0.025");
  assert.equal(payoutOf("1"), "0.975");
  for (const price of ["0.05", "0.123457", "3", "0.000123", "999.999999"]) {
    assert.equal(addAmounts(ideezaFeeOf(price), payoutOf(price)), addAmounts(price), price);
  }
});

test("another rate is one argument away: 500 bps is 5 %", () => {
  assert.equal(feePercentText(500), "5%");
  assert.equal(feePercentText(125), "1.25%");
  assert.equal(feePercentText(1000), "10%");
  assert.equal(feePercentText(0), "0%");
  assert.equal(ideezaFeeOf("0.05", 500), "0.0025");
  assert.equal(payoutOf("0.05", 500), "0.0475");
});

test("a price that doesn't parse has no fee and no payout", () => {
  assert.equal(ideezaFeeOf("abc"), "0");
  assert.equal(payoutOf(""), "0");
});
