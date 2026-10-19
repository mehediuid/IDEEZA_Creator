// Settings › KYC Verification (D6): Figma's three levels. Level 1 is the demo identity check
// (`ideeza:commerce:kyc`); Intermediate is needed from $1,000 of total sales and Advanced from
// $5,000, both "Not available yet" in the app, so their status stays Not Submitted.
import { test } from "node:test";
import assert from "node:assert/strict";

const { kycLevelsOf, KYC_INTERMEDIATE_AT, KYC_ADVANCED_AT, verifiedKyc, kycFormProblems } = await import(
  "../../.tmp-test/lib/commerce/kyc.js"
);

test("thresholds: $1,000 and $5,000 total transactions (Figma)", () => {
  assert.equal(KYC_INTERMEDIATE_AT, 1000);
  assert.equal(KYC_ADVANCED_AT, 5000);
});

test("not verified, no sales: Level 1 not submitted; the others not needed yet", () => {
  const levels = kycLevelsOf(null, 0);
  assert.deepEqual(
    levels.map((l) => [l.id, l.status, l.needed]),
    [
      ["level-1", "not-submitted", true],
      ["intermediate", "not-submitted", false],
      ["advanced", "not-submitted", false],
    ],
  );
  assert.equal(levels[1].threshold, 1000);
  assert.equal(levels[0].threshold, null);
});

test("verified: Level 1 approved, with the date it was done", () => {
  const [l1] = kycLevelsOf(verifiedKyc(42), 0);
  assert.equal(l1.status, "approved");
  assert.equal(l1.at, 42);
});

test("sales past a threshold make that level needed, never approved", () => {
  const at999 = kycLevelsOf(verifiedKyc(1), 999.99);
  assert.equal(at999[1].needed, false);
  const at1000 = kycLevelsOf(verifiedKyc(1), 1000);
  assert.deepEqual(at1000.map((l) => l.needed), [true, true, false]);
  assert.equal(at1000[1].status, "not-submitted");
  const at5000 = kycLevelsOf(verifiedKyc(1), 5000);
  assert.deepEqual(at5000.map((l) => l.needed), [true, true, true]);
});

test("the Level 1 form also needs the seller terms ticked", () => {
  assert.deepEqual(kycFormProblems({ name: "Ada", country: "GB", terms: false }), {
    terms: "Tick the box to agree to the Marketplace Seller Terms.",
  });
  assert.deepEqual(kycFormProblems({ name: "Ada", country: "GB", terms: true }), {});
  // Callers that don't ask for terms are unchanged.
  assert.deepEqual(kycFormProblems({ name: "Ada", country: "GB" }), {});
});
