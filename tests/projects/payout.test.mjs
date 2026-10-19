// What a project's sales paid its seller, per chain and token (Build and Earn P1-4), and the
// per-project payout requests stored before Get Paid, read back (Settings › Get Paid folds them in).
import { test } from "node:test";
import assert from "node:assert/strict";

const { PAYOUTS_KEY, earnedOf, payoutLinesText, normalizePayouts, parsePayouts } = await import("../../.tmp-test/lib/commerce/payout.js");

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

test("payoutLinesText", () => {
  assert.equal(
    payoutLinesText([
      { network: "baseSepolia", token: "ETH", amount: "0.975" },
      { network: "baseSepolia", token: "USDC", amount: "9.75" },
    ]),
    "0.975 ETH · 9.75 USDC",
  );
});

test("normalizePayouts: malformed rows go, the rest stay", () => {
  const good = { id: "a", projectId: "p", at: 5, lines: [{ network: "baseSepolia", token: "ETH", amount: "1" }], demo: true };
  assert.deepEqual(normalizePayouts({ requests: [good, { id: "x" }, { ...good, demo: false }, { ...good, lines: [] }] }), [good]);
  assert.deepEqual(normalizePayouts(null), []);
  assert.deepEqual(parsePayouts("{bad"), []);
  assert.deepEqual(parsePayouts(null), []);
  assert.deepEqual(parsePayouts(JSON.stringify({ v: 1, requests: [good] })), [good]);
});
