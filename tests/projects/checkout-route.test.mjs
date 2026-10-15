// The checkout's address (/settings/plan/checkout): what a link or a refresh
// names — a plan and cycle, a pack, or a custom amount — and nothing else.
import { test } from "node:test";
import assert from "node:assert/strict";

const R = await import("../../.tmp-test/lib/create/checkout-route.js");
const q = (s) => {
  const p = new URLSearchParams(s);
  return (k) => p.get(k);
};

test("an order's address and back", () => {
  for (const order of [
    { kind: "plan", tier: "builder", cycle: "monthly" },
    { kind: "plan", tier: "disruptor", cycle: "yearly" },
    { kind: "pack", id: "pro" },
    { kind: "custom", credits: 80 },
  ]) {
    const href = R.checkoutHref(order);
    assert.ok(href.startsWith("/settings/plan/checkout?"));
    assert.deepEqual(R.checkoutOrderOf(q(href.split("?")[1])), order);
  }
});

test("a plan without a cycle is monthly; Free and unknown plans aren't bought", () => {
  assert.deepEqual(R.checkoutOrderOf(q("plan=tinkerer")), { kind: "plan", tier: "tinkerer", cycle: "monthly" });
  assert.equal(R.checkoutOrderOf(q("plan=free")), null);
  assert.equal(R.checkoutOrderOf(q("plan=gold")), null);
  assert.equal(R.checkoutOrderOf(q("plan=builder&cycle=weekly")), null);
});

test("a pack must exist; a custom amount must be a whole number of at least 50", () => {
  assert.equal(R.checkoutOrderOf(q("pack=mega")), null);
  assert.equal(R.checkoutOrderOf(q("credits=49")), null);
  assert.equal(R.checkoutOrderOf(q("credits=12.5")), null);
  assert.equal(R.checkoutOrderOf(q("credits=abc")), null);
  assert.deepEqual(R.checkoutOrderOf(q("credits=50")), { kind: "custom", credits: 50 });
  assert.equal(R.checkoutOrderOf(q("")), null);
});
