// Settings v2 › Get paid, one page (V7, V10): no tax data and no SSN/EIN digits kept; each
// withdrawal method has its network and every add, default change and removal is logged for the
// bell; the balance split by project; "Set up when you sell" until something is listed or sold;
// the first withdrawal's steps; the statement's BOM; the old sub-routes' targets; the higher
// identity checks as one line near the limit; the Level 1 form without the seller terms; the Earn
// ladder selling without a withdrawal method.
import { test } from "node:test";
import assert from "node:assert/strict";

const P = await import("../../.tmp-test/lib/account/payout.js");
const { getPaidHref, GET_PAID_HREF } = await import("../../.tmp-test/lib/account/get-paid-href.js");
const K = await import("../../.tmp-test/lib/commerce/kyc.js");
const L = await import("../../.tmp-test/lib/commerce/ladder.js");
const { payoutNotices } = await import("../../.tmp-test/lib/notifications/sources.js");

const A1 = "0x955de749945de5b6935de423925de290995ded95";
const A2 = "0x1111111111111111111111111111111111111111";

test("tax data is no longer kept: a stored record's tax residence and SSN/EIN digits are dropped", () => {
  const raw = {
    v: 1,
    methods: [],
    defaultMethodId: null,
    getPaidIn: "IDZ",
    taxResidence: { country: "BD", city: "Dhaka", address: "Road 1", postalCode: "1205" },
    taxIdentification: { usPerson: true, legalName: "Ada", classification: "individual", tinType: "ssn", tinLast4: "6789", savedAt: 9 },
    withdrawals: [],
  };
  const out = P.normalizePayout(raw);
  assert.equal("taxResidence" in out, false);
  assert.equal("taxIdentification" in out, false);
  assert.equal(JSON.stringify(out).includes("6789"), false);
  assert.equal(JSON.stringify(out).includes("Dhaka"), false);
  assert.equal(out.getPaidIn, "IDZ");
  assert.equal("taxIdentificationOf" in P, false, "nothing builds a TIN record any more");
  assert.equal("tinProblem" in P, false);
});

test("payoutNeedsScrub: true only for a stored record that still holds tax data", () => {
  assert.equal(P.payoutNeedsScrub(null), false);
  assert.equal(P.payoutNeedsScrub("{oops"), false);
  assert.equal(P.payoutNeedsScrub(JSON.stringify(P.EMPTY_PAYOUT)), false);
  assert.equal(P.payoutNeedsScrub(JSON.stringify({ ...P.EMPTY_PAYOUT, taxIdentification: null })), true);
  assert.equal(P.payoutNeedsScrub(JSON.stringify({ ...P.EMPTY_PAYOUT, taxResidence: { country: "BD" } })), true);
});

test("a method has its network: an old one without it reads as Base Sepolia; a bad one is dropped", () => {
  const out = P.normalizePayout({
    v: 1,
    methods: [
      { id: "m1", kind: "crypto", address: A1, label: "Old", addedAt: 5 },
      { id: "m2", kind: "crypto", address: A2, label: "Poly", network: "mumbai", addedAt: 6 },
      { id: "m3", kind: "crypto", address: A2.replace("1", "2"), label: "Bad", network: "solana", addedAt: 7 },
    ],
    defaultMethodId: "m2",
    getPaidIn: "USDT",
    withdrawals: [],
  });
  assert.deepEqual(out.methods.map((m) => [m.id, m.network]), [["m1", "baseSepolia"], ["m2", "mumbai"], ["m3", "baseSepolia"]]);
  assert.equal(out.defaultMethodId, "m2");
});

test("adding a method, making one the default and removing one each leave a logged event", () => {
  let r = P.addMethod(P.EMPTY_PAYOUT, { address: A1, label: "Cold", network: "mumbai" }, 100, "m1", "0xsig1");
  assert.equal(r.ok, true);
  assert.equal(r.method.network, "mumbai");
  let s = r.store;
  assert.deepEqual(s.methodLog, [
    { id: "added:m1:100", kind: "added", methodId: "m1", label: "Cold", address: A1, network: "mumbai", at: 100, signature: "0xsig1" },
  ]);
  s = P.addMethod(s, { address: A2, label: "", network: "baseSepolia" }, 200, "m2").store;
  s = P.makeDefault(s, "m2", 300, "0xsig2");
  assert.equal(s.defaultMethodId, "m2");
  assert.deepEqual(s.methodLog.at(-1), { id: "default:m2:300", kind: "default", methodId: "m2", label: "Crypto wallet", address: A2, network: "baseSepolia", at: 300, signature: "0xsig2" });
  assert.equal(P.makeDefault(s, "m2", 400), s, "already the default: nothing changes, nothing logged");
  s = P.removeMethod(s, "m1", 500);
  assert.deepEqual(s.methodLog.map((e) => e.kind), ["added", "added", "default", "removed"]);
  assert.equal(s.methodLog.at(-1).label, "Cold");
  // The log survives a round trip, and keeps only the newest events.
  assert.deepEqual(P.parsePayout(JSON.stringify(s)).methodLog, s.methodLog);
  let many = P.EMPTY_PAYOUT;
  for (let i = 0; i < P.METHOD_LOG_MAX + 5; i++) {
    many = P.addMethod(many, { address: `0x${String(i).padStart(40, "0")}`, label: "", network: "baseSepolia" }, i + 1, `m${i}`).store;
    many = P.removeMethod(many, `m${i}`, i + 1);
  }
  assert.equal(many.methodLog.length, P.METHOD_LOG_MAX);
  assert.equal(many.methodLog.at(-1).id, `removed:m${P.METHOD_LOG_MAX + 4}:${P.METHOD_LOG_MAX + 5}`);
});

test("payoutNotices: each method event is an urgent Coin notice that leads to the methods", () => {
  const events = [
    { id: "added:m1:100", kind: "added", methodId: "m1", label: "Cold", address: A1, network: "mumbai", at: 100 },
    { id: "default:m2:300", kind: "default", methodId: "m2", label: "Hot", address: A2, network: "baseSepolia", at: 300 },
    { id: "removed:m1:500", kind: "removed", methodId: "m1", label: "Cold", address: A1, network: "mumbai", at: 500 },
  ];
  const out = payoutNotices(events);
  assert.deepEqual(out.map((n) => [n.id, n.kind, n.urgent, n.href, n.at]), [
    ["payout:added:m1:100", "coin", true, "/settings/get-paid#methods", 100],
    ["payout:default:m2:300", "coin", true, "/settings/get-paid#methods", 300],
    ["payout:removed:m1:500", "coin", true, "/settings/get-paid#methods", 500],
  ]);
  assert.equal(out[0].title, "You added a withdrawal method");
  assert.match(out[0].body, /0x955d…ed95 on Amoy Testnet \(Polygon\)/);
  assert.match(out[0].body, /Not you\?/);
  assert.equal(out[1].title, "Withdrawals now go to Hot");
  assert.equal(out[2].title, "You removed Cold");
});

test("earnedByProject: each project's net dollars and sales, largest first", () => {
  const e = (projectId, projectName, netUsd) => ({ projectId, projectName, netUsd });
  assert.deepEqual(P.earnedByProject([e("a", "Rover", "9.75"), e("b", "Lamp", "20"), e("a", "Rover", "0.25")]), [
    { projectId: "b", projectName: "Lamp", sales: 1, netUsd: "20" },
    { projectId: "a", projectName: "Rover", sales: 2, netUsd: "10" },
  ]);
  assert.deepEqual(P.earnedByProject([]), []);
});

test("getPaidStageOf: set up when you sell, until one of your projects is listed or sold", () => {
  const base = { projectIds: ["p1"], listings: [], tracks: [], sales: [], store: P.EMPTY_PAYOUT };
  assert.equal(P.getPaidStageOf(base), "setup");
  assert.equal(P.getPaidStageOf({ ...base, listings: [{ projectId: "other" }] }), "setup", "someone else's listing");
  assert.equal(P.getPaidStageOf({ ...base, tracks: [{ projectId: "p1", listing: null }] }), "setup", "copies made, not on sale");
  assert.equal(P.getPaidStageOf({ ...base, listings: [{ projectId: "p1" }] }), "live");
  assert.equal(P.getPaidStageOf({ ...base, tracks: [{ projectId: "p1", listing: { token: "USDT" } }] }), "live");
  assert.equal(P.getPaidStageOf({ ...base, sales: [{ projectId: "p1" }] }), "live");
  // Anything already in the record is never hidden.
  const withdrawn = P.recordWithdrawal(P.EMPTY_PAYOUT, { id: "w", amount: "1", token: "USDT", methodId: null, to: { label: "x", address: null }, at: 1, status: "pending" });
  assert.equal(P.getPaidStageOf({ ...base, store: withdrawn }), "live");
});

test("withdrawStepsOf: the first withdrawal asks identity, then where the money goes, then the amount", () => {
  assert.deepEqual(P.withdrawStepsOf({ verified: false, methods: 0 }), ["identity", "method", "amount"]);
  assert.deepEqual(P.withdrawStepsOf({ verified: true, methods: 0 }), ["method", "amount"]);
  assert.deepEqual(P.withdrawStepsOf({ verified: false, methods: 2 }), ["identity", "amount"]);
  assert.deepEqual(P.withdrawStepsOf({ verified: true, methods: 1 }), ["amount"]);
});

test("the statement CSV starts with a UTF-8 BOM, so a spreadsheet reads Bangla names", () => {
  const e = [{ saleId: "s1", projectId: "p", projectName: "সেচ সেন্সর", at: new Date(2026, 0, 5).getTime(), what: "Main NFT · 10% of the project", token: "USDT", sharePct: 100, gross: "10", fee: "0.25", net: "9.75", grossUsd: "10", feeUsd: "0.25", netUsd: "9.75" }];
  const csv = P.statementCsv({ year: 2026, month: 1 }, e, []);
  assert.equal(P.CSV_BOM, "﻿");
  assert.equal(csv.startsWith("﻿Date,Type,"), true);
  assert.match(csv, /সেচ সেন্সর/);
});

test("getPaidHref: the one page, at a row, keeping the query (the Earn ladder's ?from=)", () => {
  assert.equal(GET_PAID_HREF, "/settings/get-paid");
  assert.equal(getPaidHref(), "/settings/get-paid");
  assert.equal(getPaidHref("history"), "/settings/get-paid#history");
  assert.equal(getPaidHref("balance", { from: "/projects/p/earn" }), "/settings/get-paid?from=%2Fprojects%2Fp%2Fearn#balance");
  assert.equal(getPaidHref(null, { a: ["1", "2"], b: undefined }), "/settings/get-paid?a=1&a=2");
});

test("the Level 1 form asks a name and a country, and no terms", () => {
  assert.deepEqual(K.kycFormProblems({ name: "Ada", country: "GB" }), {});
  assert.deepEqual(K.kycFormProblems({ name: " ", country: "" }), { name: "Enter your full legal name.", country: "Choose your country of residence." });
  assert.equal("kycLevelsOf" in K, false, "the three-level panel is gone");
});

test("higherCheckOf: one line, only from 75% of a threshold; $1,000 then $5,000", () => {
  assert.equal(K.higherCheckOf(0), null);
  assert.equal(K.higherCheckOf(749.99), null);
  assert.deepEqual(K.higherCheckOf(750), { at: 1000, passed: false });
  assert.deepEqual(K.higherCheckOf(1000), { at: 1000, passed: true });
  assert.deepEqual(K.higherCheckOf(3749), { at: 1000, passed: true });
  assert.deepEqual(K.higherCheckOf(3750), { at: 5000, passed: false });
  assert.deepEqual(K.higherCheckOf(5000), { at: 5000, passed: true });
});

test("the Earn ladder sells without a withdrawal method: the method is asked at the first withdrawal", () => {
  assert.equal(L.LADDER_STEPS.some((s) => s.id === "payout"), false);
  const facts = { built: true, walletConnected: true, ownershipConfirmed: true, videosReady: true, minted: true, licenseSet: true, identityVerified: false };
  assert.equal(L.earnLevelOf(facts).level, 3);
  assert.deepEqual(L.commitCheck("list", facts), { ok: true });
  const input = { products: [{ dropped: null }], sell: { rules: [] }, commercial: "none", license: null, wallet: undefined, kyc: null };
  assert.equal("withdrawalMethodSet" in L.earnFactsOf(input), false);
});
