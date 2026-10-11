// "Request payout" (Build and Earn P1-4): what a project's sales paid its seller, less what
// earlier requests asked for, per chain and token; one stored request per tap, labelled demo.
import { test } from "node:test";
import assert from "node:assert/strict";

const { PAYOUTS_KEY, earnedOf, requestedOf, availableOf, payoutLinesText, payoutRequestOf, normalizePayouts, parsePayouts, appendPayoutRequest } =
  await import("../../.tmp-test/lib/commerce/payout.js");

const sale = (projectId, payout, token = "ETH", network = "baseSepolia") => ({ projectId, payout, token, network });

test("the key is ideeza:commerce:payouts", () => {
  assert.equal(PAYOUTS_KEY, "ideeza:commerce:payouts");
});

test("earnedOf: this project's payouts summed per chain and token, exactly", () => {
  const sales = [sale("p", "0.05"), sale("p", "0.021"), sale("q", "9"), sale("p", "10", "USDC"), sale("p", "1", "ETH", "mumbai")];
  assert.deepEqual(earnedOf(sales, "p"), [
    { network: "baseSepolia", token: "ETH", amount: "0.071" },
    { network: "baseSepolia", token: "USDC", amount: "10" },
    { network: "mumbai", token: "ETH", amount: "1" },
  ]);
});

test("earnedOf: no sales, nothing earned", () => {
  assert.deepEqual(earnedOf([], "p"), []);
  assert.deepEqual(earnedOf([sale("q", "1")], "p"), []);
});

test("requestedOf + availableOf: what's left after earlier requests; fully requested lines drop", () => {
  const earned = earnedOf([sale("p", "1"), sale("p", "10", "USDC")], "p");
  const requests = [
    payoutRequestOf("p", [{ network: "baseSepolia", token: "ETH", amount: "0.4" }], 1, "a"),
    payoutRequestOf("p", [{ network: "baseSepolia", token: "USDC", amount: "10" }], 2, "b"),
    payoutRequestOf("q", [{ network: "baseSepolia", token: "ETH", amount: "1" }], 3, "c"),
  ];
  assert.deepEqual(requestedOf(requests, "p"), [
    { network: "baseSepolia", token: "ETH", amount: "0.4" },
    { network: "baseSepolia", token: "USDC", amount: "10" },
  ]);
  assert.deepEqual(availableOf(earned, requestedOf(requests, "p")), [{ network: "baseSepolia", token: "ETH", amount: "0.6" }]);
});

test("payoutLinesText", () => {
  assert.equal(
    payoutLinesText([
      { network: "baseSepolia", token: "ETH", amount: "0.975" },
      { network: "baseSepolia", token: "USDC", amount: "9.75" },
    ]),
    "0.975 ETH · 9.75 USDC",
  );
});

test("payoutRequestOf: labelled demo, lines copied", () => {
  const lines = [{ network: "baseSepolia", token: "ETH", amount: "1" }];
  const r = payoutRequestOf("p", lines, 5, "id1");
  assert.deepEqual(r, { id: "id1", projectId: "p", at: 5, lines, demo: true });
  assert.notEqual(r.lines[0], lines[0]);
});

test("normalizePayouts: malformed rows go, the rest stay", () => {
  const good = payoutRequestOf("p", [{ network: "baseSepolia", token: "ETH", amount: "1" }], 5, "a");
  assert.deepEqual(normalizePayouts({ requests: [good, { id: "x" }, { ...good, demo: false }, { ...good, lines: [] }] }), [good]);
  assert.deepEqual(normalizePayouts(null), []);
  assert.deepEqual(parsePayouts("{bad"), []);
  assert.deepEqual(parsePayouts(null), []);
});

test("appendPayoutRequest: re-reads what's stored and appends; a refused write says false", () => {
  const map = new Map();
  const prev = globalThis.window;
  globalThis.window = { localStorage: { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) } };
  try {
    const a = payoutRequestOf("p", [{ network: "baseSepolia", token: "ETH", amount: "1" }], 1, "a");
    const b = payoutRequestOf("p", [{ network: "baseSepolia", token: "ETH", amount: "2" }], 2, "b");
    assert.equal(appendPayoutRequest(a), true);
    assert.equal(appendPayoutRequest(b), true);
    assert.deepEqual(parsePayouts(map.get(PAYOUTS_KEY)), [a, b]);
    globalThis.window = { localStorage: { getItem: () => null, setItem: () => { throw new Error("full"); } } };
    assert.equal(appendPayoutRequest(a), false);
  } finally {
    globalThis.window = prev;
  }
});
