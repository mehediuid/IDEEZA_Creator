// Redeem a code for AI credits (owner, 2026-11-16: "AI credit-er khane code redeem korar jayga lagbe, jekhane code
// dile credit pabe"; not in Figma). The codes in one list, why one doesn't work, the credits added once per code as a
// lot valid like bought ones, read back from the ledger, and the card on the credits page between the packs and
// Custom amount.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const R = await import("../../.tmp-test/lib/create/redeem-codes.js");
const C = await import("../../.tmp-test/lib/create/credits.js");
const L = await import("../../.tmp-test/lib/create/credit-lots.js");
const S = await import("../../.tmp-test/lib/account/summary.js");

const NOW = Date.UTC(2026, 10, 16, 12);
const LIST = [
  { code: "HUNDRED", credits: 100, ends: "2027-12-31" },
  { code: "OLD", credits: 20, ends: "2026-10-31" },
];
const COUPONS = [{ code: "IDEEZA30", kind: "percent", value: 30, plans: "all", ends: "2027-12-31" }];
const check = (raw, used = new Set()) => R.checkRedeemCode(raw, { now: NOW, used }, LIST, COUPONS);

test("a listed code works, typed in any case and with spaces", () => {
  assert.deepEqual(check(" hun dred "), { ok: true, code: "HUNDRED", credits: 100 });
});

test("each reason a code doesn't work says so", () => {
  assert.equal(check("").reason, "empty");
  assert.equal(check("NOPE").reason, "unknown");
  assert.match(check("NOPE").message, /not valid/);
  const coupon = check("ideeza30");
  assert.equal(coupon.reason, "coupon");
  assert.match(coupon.message, /IDEEZA30 is a plan coupon/);
  const ended = check("old");
  assert.equal(ended.reason, "ended");
  assert.match(ended.message, /ended on 31 Oct 2026/);
  assert.equal(check("HUNDRED", new Set(["HUNDRED"])).reason, "used");
});

test("a code works to the end of its last day, UTC", () => {
  const c = LIST[0];
  assert.equal(R.redeemEndsAt(c), Date.UTC(2028, 0, 1) - 1);
  assert.equal(R.checkRedeemCode("HUNDRED", { now: Date.UTC(2028, 0, 1), used: new Set() }, LIST, COUPONS).reason, "ended");
});

test("the shipped list: three that work today, one already over, none clashing with a plan coupon", () => {
  const live = R.REDEEM_CODES.filter((c) => NOW <= R.redeemEndsAt(c)).map((c) => c.code);
  assert.deepEqual(live, ["IDEEZA100", "WELCOME50", "EVENT250"]);
  assert.equal(R.checkRedeemCode("BETA20", { now: NOW, used: new Set() }).reason, "ended");
  assert.equal(R.checkRedeemCode("IDEEZA30", { now: NOW, used: new Set() }).reason, "coupon");
});

test("redeeming adds the credits once per code, as a lot valid for the bought-credit months", () => {
  const start = { balance: 8, ledger: [{ id: "s", delta: 8, reason: "seed", ts: NOW - 1000 }] };
  const one = C.redeemState(start, { code: "hundred", credits: 100, ts: NOW });
  assert.equal(one.balance, 108);
  const line = one.ledger.at(-1);
  assert.equal(line.reason, "redeem");
  assert.equal(line.orderId, "redeem:HUNDRED");
  assert.equal(line.code, "HUNDRED");
  assert.ok(line.expiresAt > NOW + 360 * 24 * 3600 * 1000, "about a year");
  assert.equal(C.redeemState(one, { code: "HUNDRED", credits: 100, ts: NOW + 5 }), one, "the same code adds once");
  assert.equal(C.redeemState(start, { code: "ZERO", credits: 0 }), start);
  assert.deepEqual([...R.codesRedeemed(one.ledger)], ["HUNDRED"], "used codes come from the ledger");
  assert.equal(C.describeEntry(line), "+100 Code HUNDRED");
  const lots = L.lotsOf(one.ledger);
  assert.equal(lots.length, 2, "a lot of its own");
  assert.equal(lots[1].remaining, 100);
  assert.equal(S.creditTotals(one.ledger).total, 108, "counted as credits received");
});

test("the card sits between the packs and Custom amount, and goes through the store", () => {
  const panel = readFileSync(new URL("../../src/components/credits/credits-panel.tsx", import.meta.url), "utf8");
  assert.match(panel, /<\/ul>\s*<RedeemCodeCard \/>\s*<CustomAmount /);
  assert.match(panel, /e\.reason === "redeem"\) return `Code \$\{e\.code/, "Credit history names the code");
  const card = readFileSync(new URL("../../src/components/credits/redeem-code.tsx", import.meta.url), "utf8");
  assert.match(card, /checkRedeemCode\(draft, \{ now: wallClock\(\), used: codesRedeemed\(ledger\) \}\)/);
  assert.match(card, /redeem\(\{ code: check\.code, credits: check\.credits \}\)/);
  assert.match(card, /Redeem a code/);
});
