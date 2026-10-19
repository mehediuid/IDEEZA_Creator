// Settings › Get paid: the account's payout record `ideeza:account:payout` (v1) — withdrawal
// methods (each on a network) with one default, the "Get paid in" token, withdrawals, the log of
// method changes, and the old per-project payout requests folded in so nothing a maker did
// disappears. No tax data (V7): settings-paid-page.test.mjs checks that it is dropped.
import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../../.tmp-test/lib/account/payout.js");
const {
  PAYOUT_KEY,
  EMPTY_PAYOUT,
  normalizePayout,
  parsePayout,
  isWalletAddress,
  addMethod,
  removeMethod,
  makeDefault,
  defaultMethodOf,
  METHODS_MAX,
  mergeLegacy,
  legacyWithdrawalsOf,
  recordWithdrawal,
} = P;

const A1 = "0x955de749945de5b6935de423925de290995ded95";
const A2 = "0x1111111111111111111111111111111111111111";
const A3 = "0xABCDEFabcdef0123456789abcdef0123456789AB";

test("the key and the empty record: USDT by default, nothing else", () => {
  assert.equal(PAYOUT_KEY, "ideeza:account:payout");
  assert.deepEqual(EMPTY_PAYOUT, {
    v: 1,
    methods: [],
    defaultMethodId: null,
    getPaidIn: "USDT",
    withdrawals: [],
    methodLog: [],
  });
});

test("normalizePayout: junk reads as empty; each bad row is dropped, never the whole record", () => {
  for (const raw of [null, 3, "x", [], { v: 2 }]) assert.deepEqual(normalizePayout(raw), EMPTY_PAYOUT);
  const out = normalizePayout({
    v: 1,
    methods: [
      { id: "m1", kind: "crypto", address: A1, label: "Cold wallet", addedAt: 5 },
      { id: "m2", kind: "bank", address: A2, label: "x", addedAt: 6 },
      { id: "m3", kind: "crypto", address: "0x12", label: "bad", addedAt: 7 },
      "nope",
    ],
    defaultMethodId: "m9",
    getPaidIn: "ETH",
    withdrawals: [
      { id: "w1", amount: "50", token: "USDT", methodId: "m1", to: { label: "Cold wallet", address: A1 }, at: 10, status: "complete" },
      { id: "w2", amount: "-5", token: "USDT", methodId: "m1", to: { label: "x", address: A1 }, at: 11, status: "complete" },
      { id: "w3", amount: "5", token: "USDT", methodId: null, to: { label: "x", address: null }, at: 12, status: "lost" },
    ],
  });
  assert.deepEqual(out.methods.map((m) => m.id), ["m1"]);
  // The default must name a method that exists; otherwise the first one is it.
  assert.equal(out.defaultMethodId, "m1");
  assert.equal(out.getPaidIn, "USDT");
  assert.deepEqual(out.withdrawals.map((w) => w.id), ["w1"]);
});

test("parsePayout: a corrupt string reads as empty", () => {
  assert.deepEqual(parsePayout(null), EMPTY_PAYOUT);
  assert.deepEqual(parsePayout("{oops"), EMPTY_PAYOUT);
  assert.equal(parsePayout(JSON.stringify({ ...EMPTY_PAYOUT, getPaidIn: "IDZ" })).getPaidIn, "IDZ");
});

test("isWalletAddress: 0x and 40 hex digits, either case", () => {
  assert.equal(isWalletAddress(A1), true);
  assert.equal(isWalletAddress(A3), true);
  assert.equal(isWalletAddress(` ${A1} `), false);
  assert.equal(isWalletAddress("0x123"), false);
  assert.equal(isWalletAddress(A1.slice(2)), false);
  assert.equal(isWalletAddress("0xg55de749945de5b6935de423925de290995ded95"), false);
});

const BASE = "baseSepolia";

test("addMethod: the first method is the default; a trimmed address and label; empty label named", () => {
  let r = addMethod(EMPTY_PAYOUT, { address: ` ${A1} `, label: "  My cold wallet ", network: BASE }, 100, "m1");
  assert.equal(r.ok, true);
  assert.deepEqual(r.store.methods, [{ id: "m1", kind: "crypto", address: A1, label: "My cold wallet", network: BASE, addedAt: 100 }]);
  assert.equal(r.store.defaultMethodId, "m1");
  r = addMethod(r.store, { address: A2, label: "", network: BASE }, 200, "m2");
  assert.equal(r.store.methods[1].label, "Crypto wallet");
  assert.equal(r.store.defaultMethodId, "m1", "a later method doesn't take the default");
});

test("addMethod: refuses a bad address, a duplicate (any case) and more than the limit", () => {
  assert.deepEqual(addMethod(EMPTY_PAYOUT, { address: "0x12", label: "", network: BASE }, 1, "m"), { ok: false, problem: "address" });
  const one = addMethod(EMPTY_PAYOUT, { address: A3, label: "", network: BASE }, 1, "m1").store;
  assert.deepEqual(addMethod(one, { address: A3.toLowerCase(), label: "", network: "mumbai" }, 2, "m2"), { ok: false, problem: "duplicate" });
  let s = EMPTY_PAYOUT;
  for (let i = 0; i < METHODS_MAX; i++) s = addMethod(s, { address: `0x${String(i).padStart(40, "0")}`, label: "", network: BASE }, i, `m${i}`).store;
  assert.deepEqual(addMethod(s, { address: A1, label: "", network: BASE }, 99, "mx"), { ok: false, problem: "full" });
});

test("removeMethod moves the default to the next method; makeDefault sets it; defaultMethodOf reads it", () => {
  let s = addMethod(EMPTY_PAYOUT, { address: A1, label: "One", network: BASE }, 1, "m1").store;
  s = addMethod(s, { address: A2, label: "Two", network: BASE }, 2, "m2").store;
  s = addMethod(s, { address: A3, label: "Three", network: BASE }, 3, "m3").store;
  s = makeDefault(s, "m3", 4);
  assert.equal(defaultMethodOf(s).id, "m3");
  assert.equal(makeDefault(s, "nope", 5), s, "an unknown id changes nothing");
  assert.equal(removeMethod(s, "nope", 5), s);
  s = removeMethod(s, "m3", 6);
  assert.equal(s.defaultMethodId, "m1");
  s = removeMethod(s, "m2", 7);
  assert.equal(s.defaultMethodId, "m1");
  s = removeMethod(s, "m1", 8);
  assert.equal(s.defaultMethodId, null);
  assert.equal(defaultMethodOf(s), null);
});

test("legacy payout requests become pending withdrawals, valued in dollars at the demo rates", () => {
  const legacy = [
    { id: "pay_a", projectId: "p1", at: 50, demo: true, lines: [{ network: "baseSepolia", token: "USDC", amount: "9.75" }] },
    { id: "pay_b", projectId: "p1", at: 60, demo: true, lines: [{ network: "baseSepolia", token: "USDT", amount: "1" }, { network: "baseSepolia", token: "USDC", amount: "2.5" }] },
  ];
  const out = legacyWithdrawalsOf(legacy);
  assert.deepEqual(out.map((w) => [w.id, w.amount, w.status, w.methodId, w.at, w.legacy]), [
    ["legacy-pay_a", "9.75", "pending", null, 50, true],
    ["legacy-pay_b", "3.5", "pending", null, 60, true],
  ]);
  assert.equal(out[0].to.label, "Requested in Earn");
});

test("mergeLegacy adds each old request once, whatever is read again later", () => {
  const legacy = [{ id: "pay_a", projectId: "p1", at: 50, demo: true, lines: [{ network: "baseSepolia", token: "USDT", amount: "4" }] }];
  const once = mergeLegacy(EMPTY_PAYOUT, legacy);
  assert.equal(once.withdrawals.length, 1);
  const twice = mergeLegacy(once, legacy);
  assert.equal(twice, once, "nothing new: the same record");
});

test("recordWithdrawal appends; newest last", () => {
  const w = { id: "w1", amount: "10", token: "IDZ", methodId: "m1", to: { label: "One", address: A1 }, at: 5, status: "complete" };
  const s = recordWithdrawal(EMPTY_PAYOUT, w);
  assert.deepEqual(s.withdrawals, [w]);
  assert.deepEqual(EMPTY_PAYOUT.withdrawals, [], "the input isn't changed");
});

test("return-to: only a project page is a way back; it rides as ?from= before any hash", async () => {
  const { returnPathOf, returnProjectIdOf, withReturn } = await import("../../.tmp-test/lib/account/return-to.js");
  assert.equal(returnPathOf("/projects/proj_1/earn/money"), "/projects/proj_1/earn/money");
  assert.equal(returnPathOf("/projects/proj_1"), "/projects/proj_1");
  for (const bad of ["https://evil.example", "//evil.example", "/settings", "/projects/../x", "/projects/a b", null, 4]) {
    assert.equal(returnPathOf(bad), null, String(bad));
  }
  assert.equal(returnProjectIdOf("/projects/proj_1/earn"), "proj_1");
  assert.equal(withReturn("/settings/get-paid#identity", "/projects/p/earn"), "/settings/get-paid?from=%2Fprojects%2Fp%2Fearn#identity");
  assert.equal(withReturn("/settings/get-paid#withdraw", "/projects/p"), "/settings/get-paid?from=%2Fprojects%2Fp#withdraw");
  assert.equal(withReturn("/settings/get-paid#identity", "/elsewhere"), "/settings/get-paid#identity");
});
