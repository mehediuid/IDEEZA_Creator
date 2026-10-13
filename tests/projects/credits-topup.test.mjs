// Top ups on the credits ledger: one order adds once, nothing else moves.
import { test } from "node:test";
import assert from "node:assert/strict";

const { topUpState, chargeState, describeEntry } = await import("../../.tmp-test/lib/create/credits.js");

const fresh = () => ({ balance: 8, ledger: [{ id: "s", delta: 8, reason: "seed", ts: 0 }] });

test("a top up adds its credits and one ledger line", () => {
  const next = topUpState(fresh(), 50, "order-1");
  assert.equal(next.balance, 58);
  assert.equal(next.ledger.length, 2);
  assert.deepEqual(
    { delta: next.ledger[1].delta, reason: next.ledger[1].reason, orderId: next.ledger[1].orderId },
    { delta: 50, reason: "topup", orderId: "order-1" },
  );
});

test("the same order twice adds once (double click, replay)", () => {
  const once = topUpState(fresh(), 50, "order-1");
  const twice = topUpState(once, 50, "order-1");
  assert.equal(twice, once);
  assert.equal(twice.balance, 58);
});

test("two different orders both add", () => {
  const s = topUpState(topUpState(fresh(), 20, "a"), 20, "b");
  assert.equal(s.balance, 48);
});

test("zero, negative and fractional amounts", () => {
  const s = fresh();
  assert.equal(topUpState(s, 0, "z"), s);
  assert.equal(topUpState(s, -5, "n"), s);
  assert.equal(topUpState(s, 20.7, "f").balance, 28);
});

test("a charge right after a top up sees the topped-up balance", () => {
  const short = { balance: 2, ledger: [{ id: "s", delta: 2, reason: "seed", ts: 0 }] };
  assert.equal(chargeState(short, "b1", 4).ok, false);
  const topped = topUpState(short, 20, "o");
  const charged = chargeState(topped, "b1", 4);
  assert.equal(charged.ok, true);
  assert.equal(charged.state.balance, 18);
});

test("a ledger line with a reason this code doesn't know still reads", () => {
  assert.equal(describeEntry({ id: "x", delta: 30, reason: "grant", ts: 0 }), "+30 Credits");
  assert.equal(describeEntry({ id: "t", delta: 20, reason: "topup", ts: 0 }), "+20 Top up");
});
