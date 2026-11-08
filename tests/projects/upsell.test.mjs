// Upgrade nudges (the upgrade plan, owner 2026-11-08 "সব সুপারিশ ঠিক"): which
// plan a nudge names, the maker's own numbers it says, and how often a card
// may show (one a day, ✕ = 7 days, once-only, every 30 days).
import { test } from "node:test";
import assert from "node:assert/strict";

const U = await import("../../.tmp-test/lib/create/upsell.js");
const N = await import("../../.tmp-test/lib/account/nudges.js");

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 8, 12).getTime();

test("a nudge names Builder from Free or Tinkerer, Disruptor from Builder, nothing on Disruptor", () => {
  assert.equal(U.pitchPlan("free").tier, "builder");
  assert.equal(U.pitchPlan("tinkerer").tier, "builder");
  assert.equal(U.pitchPlan("builder").tier, "disruptor");
  assert.equal(U.pitchPlan("disruptor"), null);
  assert.equal(U.pitchCycle({ tier: "free", cycle: "yearly" }), "monthly");
  assert.equal(U.pitchCycle({ tier: "builder", cycle: "yearly" }), "yearly");
});

test("the month's credit spend counts purchases in this calendar month only", () => {
  const ledger = [
    { reason: "purchase", delta: 100, ts: NOW - 2 * DAY, price: 5 },
    { reason: "purchase", delta: 200, ts: NOW - DAY, price: 10 },
    { reason: "purchase", delta: 100, ts: new Date(2026, 9, 30).getTime(), price: 5 },
    { reason: "grant", delta: 10, ts: NOW, price: undefined },
  ];
  assert.deepEqual(U.creditSpendThisMonth(ledger, NOW), { spent: 15, purchases: 2 });
});

test("D2 says the plan is the better buy only when it is true, and only on Free or Tinkerer", () => {
  const two = [
    { reason: "purchase", delta: 100, ts: NOW - DAY, price: 5 },
    { reason: "purchase", delta: 200, ts: NOW, price: 10 },
  ];
  const n = U.savingsNudge(two, { tier: "free" }, NOW);
  assert.equal(n.spent, 15);
  assert.equal(n.plan.tier, "builder");
  assert.equal(n.monthly, 10);
  assert.equal(U.savingsNudge(two.slice(0, 1), { tier: "free" }, NOW), null, "one purchase: nothing");
  assert.equal(U.savingsNudge([two[0], { ...two[0], ts: NOW }], { tier: "free" }, NOW).spent, 10, "spending the plan's price is enough");
  assert.equal(U.savingsNudge([two[0], { ...two[0], ts: NOW, price: 4 }], { tier: "free" }, NOW), null, "$9 is under Builder's $10: nothing");
  assert.equal(U.savingsNudge(two, { tier: "builder" }, NOW), null, "paid plans: nothing");
});

test("E1: use over the last 30 days, refunds taken back; the smallest plan that covers it", () => {
  const ledger = [
    { reason: "concept", delta: -1, ts: NOW - DAY },
    { reason: "build", delta: -8, ts: NOW - 3 * DAY },
    { reason: "refund", delta: 8, ts: NOW - 3 * DAY },
    { reason: "build", delta: -11, ts: NOW - 5 * DAY },
    { reason: "build", delta: -40, ts: NOW - 40 * DAY },
  ];
  assert.deepEqual(U.usageOf(ledger, 2, NOW), { credits: 12, projects: 2 });
  assert.equal(U.fitsYou({ credits: 8, projects: 1 }), "free");
  assert.equal(U.fitsYou({ credits: 12, projects: 2 }), "tinkerer");
  assert.equal(U.fitsYou({ credits: 120, projects: 3 }), "builder");
  assert.equal(U.fitsYou({ credits: 5000, projects: 3 }), "disruptor", "past every plan: the top one");
});

test("C5: a project fits until the plan's allowance is used", () => {
  const free = U.projectRoom("free", 2);
  assert.equal(free.full, free.held >= free.allowed);
  assert.equal(U.projectRoom("free", U.projectRoom("free", 0).allowed).full, true);
});

test("one capped card a day across the app; the same card keeps showing that day", () => {
  let e = N.EMPTY_NUDGES;
  assert.equal(N.mayShow(e, "first-build", NOW), true);
  e = N.withShown(e, "first-build", NOW);
  assert.equal(N.mayShow(e, "first-build", NOW + 1000), true, "the same card, the same day");
  assert.equal(N.mayShow(e, "return-coupon", NOW + 1000), false, "another card waits for tomorrow");
  assert.equal(N.mayShow(e, "return-coupon", NOW + DAY), true);
});

test("✕ hides a card for 7 days; once-only never returns; every-30-days waits 30 days", () => {
  let e = N.withDismissed(N.EMPTY_NUDGES, "return-coupon", NOW);
  assert.equal(N.mayShow(e, "return-coupon", NOW + 6 * DAY), false);
  assert.equal(N.mayShow(e, "return-coupon", NOW + 7 * DAY), true);
  e = N.withShown(N.EMPTY_NUDGES, "first-build", NOW);
  assert.equal(N.mayShow(e, "first-build", NOW + 2 * DAY, { once: true }), false);
  e = N.withShown(N.EMPTY_NUDGES, "return-coupon", NOW);
  assert.equal(N.mayShow(e, "return-coupon", NOW + 10 * DAY, { everyDays: 30 }), false);
  assert.equal(N.mayShow(e, "return-coupon", NOW + 30 * DAY, { everyDays: 30 }), true);
});

test("F2: the return coupon is a real code that works on every plan", async () => {
  const K = await import("../../.tmp-test/lib/create/coupons.js");
  const c = K.COUPONS.find((x) => x.code === U.RETURN_COUPON);
  assert.ok(c, "MAKER20 is in the coupon list");
  assert.equal(K.checkCoupon(U.RETURN_COUPON, { tier: "builder", due: 10, now: NOW, used: new Set() }).ok, true);
});

test("the stored record survives junk and keeps accounts apart", () => {
  assert.deepEqual(N.normalizeNudges("nope"), { v: 1, byEmail: {} });
  const rec = N.normalizeNudges({ byEmail: { "A@x.com": { shownDay: "2026-11-08", shownId: "x", shown: { x: 5, bad: "y" }, dismissed: null } } });
  assert.deepEqual(rec.byEmail["a@x.com"], { shownDay: "2026-11-08", shownId: "x", shown: { x: 5 }, dismissed: {} });
});

test("what a pitched plan gives, in the maker's terms", () => {
  assert.deepEqual(U.pitchPerks(U.pitchPlan("free")), ["300 credits every month", "packs 15% off", "your builds go first"]);
  assert.deepEqual(U.pitchPerks(U.pitchPlan("builder")), ["1,200 credits every month", "packs 25% off", "720p video"]);
});

// ── the bell (upgrade plan C4, D3, F1) ──────────────────────────────────
const S = await import("../../.tmp-test/lib/notifications/sources.js");
const coinIn = (over = {}) => ({ balance: 20, ledger: [], lowAt: 8, expiryReminderDays: 0, plan: null, now: NOW, ...over });

test("C4: the low-credits notice says when they refill and names the next plan up", () => {
  const ledger = [{ id: "s", delta: 8, reason: "seed", ts: NOW - 5 * DAY }, { id: "b", delta: -6, reason: "build", ts: NOW - DAY }];
  const [low] = S.coinNotices(coinIn({ balance: 2, ledger, refillAt: new Date(2026, 11, 6).getTime(), pitch: { name: "Builder", credits: 300 } }));
  assert.equal(low.title, "You have 2 credits left");
  assert.match(low.body, /They refill on Dec 6\. Need more now\? Buy credits, or get Builder for 300 a month\.$/);
  const [plain] = S.coinNotices(coinIn({ balance: 2, ledger }));
  assert.equal(plain.body, "Your low mark is 8. Buy credits to keep building.", "without the new inputs, the old words");
});

test("D3: each month's credits get a notice, never the account's first grant, and only for a week", () => {
  const ledger = [
    { id: "g0", delta: 10, reason: "grant", ts: NOW - 40 * DAY },
    { id: "g1", delta: 10, reason: "grant", ts: NOW - 10 * DAY },
    { id: "g2", delta: 10, reason: "grant", ts: NOW - DAY },
  ];
  const notes = S.coinNotices(coinIn({ ledger, onFree: true, pitch: { name: "Builder", credits: 300 } })).filter((n) => n.id.startsWith("coin:grant:"));
  assert.deepEqual(notes.map((n) => n.id), ["coin:grant:g2"]);
  assert.equal(notes[0].title, "Your 10 free credits are back");
  assert.equal(notes[0].body, "Want 300 a month? See Builder.");
  const first = S.coinNotices(coinIn({ ledger: [{ id: "only", delta: 10, reason: "grant", ts: NOW - DAY }], onFree: true }));
  assert.equal(first.filter((n) => n.id.startsWith("coin:grant:")).length, 0, "the sign-up grant is no news");
  const paid = S.coinNotices(coinIn({ ledger: [ledger[1], { ...ledger[2], delta: 300 }], onFree: false, pitch: { name: "Disruptor", credits: 1200 } }));
  const g = paid.find((n) => n.id === "coin:grant:g2");
  assert.equal(g.title, "Your 300 credits for this month are here");
  assert.equal(g.body, undefined, "paid makers hear of a bigger plan only at a limit");
});

test("F1: the welcome offer's last hour gets one notice, and only then", () => {
  const H = 60 * 60 * 1000;
  const offer = { startedAt: NOW - 11.5 * H, endsAt: NOW + 0.5 * H };
  const n = S.coinNotices(coinIn({ offer })).find((x) => x.id.startsWith("coin:offer-ending:"));
  assert.equal(n.title, "Your 50% off ends in less than an hour");
  assert.equal(n.id, `coin:offer-ending:${offer.startedAt}`);
  assert.equal(S.coinNotices(coinIn({ offer: { startedAt: NOW, endsAt: NOW + 12 * H } })).some((x) => x.id.startsWith("coin:offer-ending:")), false);
  assert.equal(S.coinNotices(coinIn({ offer: { startedAt: NOW - 13 * H, endsAt: NOW - H } })).some((x) => x.id.startsWith("coin:offer-ending:")), false);
});

// ── exports this month (upgrade plan C6) ────────────────────────────────
const E = await import("../../.tmp-test/lib/create/export-count.js");

test("C6: the files one export writes together count once; the month is the plan's period", () => {
  let at = [];
  at = E.withExport(at, NOW);
  at = E.withExport(at, NOW + 1000); // the same Design files export
  at = E.withExport(at, NOW + 2500);
  assert.equal(at.length, 1);
  at = E.withExport(at, NOW + 10_000);
  assert.equal(at.length, 2);
  assert.equal(E.exportsIn(at, NOW - DAY, NOW + DAY), 2);
  assert.equal(E.exportsIn(at, NOW + 5000, NOW + DAY), 1);
  assert.deepEqual(E.normalizeExports({ at: [3, "x", 1, -2] }), [1, 3]);
  assert.deepEqual(E.normalizeExports(null), []);
});

test("C6: what the toast says — left, or used with when they come back and the next plan", () => {
  assert.equal(E.exportLine(1, 2, "6 Dec", { name: "Builder", exports: 50 }), "Exported. 1 of 2 exports left this month.");
  assert.equal(
    E.exportLine(2, 2, "6 Dec", { name: "Builder", exports: 50 }),
    "Exported. You've used this month's 2 exports; they come back on 6 Dec. Builder gives 50 a month.",
  );
  assert.equal(E.exportLine(5, 2, "6 Dec", null), "Exported. You've used this month's 2 exports; they come back on 6 Dec.", "soft: past the amount still exports");
});

test("the return coupon inside a limit moment doesn't take the day's card from the first build", () => {
  let e = N.EMPTY_NUDGES;
  assert.equal(N.mayShow(e, "return-coupon", NOW, { everyDays: 30, capped: false }), true);
  e = N.withShown(e, "return-coupon", NOW, false);
  assert.equal(e.shownDay, null, "no day's card used");
  assert.equal(N.mayShow(e, "first-build", NOW + 1000, { once: true }), true, "the first build still gets its card today");
  assert.equal(N.mayShow(e, "return-coupon", NOW + 1000, { everyDays: 30, capped: false }), true, "the coupon stays for the rest of the day");
  assert.equal(N.mayShow(e, "return-coupon", NOW + 2 * DAY, { everyDays: 30, capped: false }), false, "then waits 30 days");
  assert.equal(N.mayShow(e, "return-coupon", NOW + 30 * DAY, { everyDays: 30, capped: false }), true);
});
