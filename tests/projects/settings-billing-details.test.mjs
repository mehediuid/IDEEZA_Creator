// Settings › Plan & pricing › Billing details: the record every invoice prints
// under "Billed to" — read, repaired, checked, and laid out for the invoice.
import { test } from "node:test";
import assert from "node:assert/strict";

const B = await import("../../.tmp-test/lib/account/billing-details.js");

const EMPTY = { v: 1, name: "", taxId: "", address: "", email: "" };

test("nothing stored, or something broken, reads as empty details", () => {
  for (const raw of [null, undefined, "x", 4, [], {}, { v: 9 }]) assert.deepEqual(B.normalizeBilling(raw), EMPTY);
  assert.equal(B.isEmptyBilling(B.normalizeBilling(null)), true);
  assert.equal(B.BILLING_KEY, "ideeza:account:billing");
});

test("fields are trimmed, spaces folded, and capped at their length", () => {
  const d = B.normalizeBilling({
    v: 1,
    name: "  Acme   Robotics Ltd ",
    taxId: " GB 123 456 789 ",
    address: "  12 Mill Lane \n\n  Leeds   LS1 4AB \n United Kingdom  ",
    email: " Billing@Acme.example ",
  });
  assert.deepEqual(d, {
    v: 1,
    name: "Acme Robotics Ltd",
    taxId: "GB 123 456 789",
    address: "12 Mill Lane\nLeeds LS1 4AB\nUnited Kingdom",
    email: "billing@acme.example",
  });
  const long = B.normalizeBilling({ name: "x".repeat(500), taxId: "1".repeat(99), address: "a".repeat(900) });
  assert.equal(long.name.length, B.LIMITS.name);
  assert.equal(long.taxId.length, B.LIMITS.taxId);
  assert.equal(long.address.length, B.LIMITS.address);
  // Not strings: dropped, the rest kept.
  assert.deepEqual(B.normalizeBilling({ name: 7, email: "a@b.co" }), { ...EMPTY, email: "a@b.co" });
});

test("a stored email that isn't one is dropped on read", () => {
  assert.equal(B.normalizeBilling({ email: "not an email" }).email, "");
  assert.equal(B.normalizeBilling({ email: "a@b" }).email, "");
  assert.equal(B.normalizeBilling({ email: "a@b.co" }).email, "a@b.co");
});

test("checking a form says what is wrong and how to fix it", () => {
  assert.deepEqual(B.billingErrors({ name: "", taxId: "", address: "", email: "" }), {});
  assert.deepEqual(B.billingErrors({ name: "Ann", taxId: "", address: "", email: "ann@" }), {
    email: "Enter an email address like name@company.com",
  });
  assert.deepEqual(B.billingErrors({ name: "x".repeat(130), taxId: "", address: "", email: "" }), {
    name: `Use ${B.LIMITS.name} characters or fewer`,
  });
});

test("Billed to: the billing name (or the profile name), the address lines, the tax ID, the email", () => {
  const d = B.normalizeBilling({ name: "Acme Robotics Ltd", taxId: "GB123", address: "12 Mill Lane\nLeeds", email: "b@acme.example" });
  assert.deepEqual(B.billedTo(d, "Nick Rough"), {
    name: "Acme Robotics Ltd",
    lines: ["12 Mill Lane", "Leeds", "Tax ID: GB123", "b@acme.example"],
  });
  assert.deepEqual(B.billedTo(B.normalizeBilling(null), "Nick Rough"), { name: "Nick Rough", lines: [] });
});
