// Earn Coin › Refer & Earn (mobile Figma "Refer & Earn"): joining a campaign, the demo referrals
// it counts while its lock-up runs, approval, and claiming its points as IDZ through the wallet.
import { test } from "node:test";
import assert from "node:assert/strict";

const ref = await import("../../.tmp-test/lib/wallet/referral.js");
const idz = await import("../../.tmp-test/lib/wallet/idz.js");
const { balancesOf } = await import("../../.tmp-test/lib/wallet/balances.js");
const { defaultWallet, pushActivity } = await import("../../.tmp-test/lib/wallet/demo-wallet.js");
const { activityOf, proofOf } = await import("../../.tmp-test/lib/wallet/request-view.js");

const NOW = Date.UTC(2026, 10, 5, 9, 0, 0);
const MIN = 60_000;
const EMPTY_MARKET = { listings: [], sales: [], bids: [], support: [], unreadable: false };
const first = ref.CAMPAIGNS[0];

function join(d = ref.emptyReferralData(), w = defaultWallet(), at = NOW) {
  const r = ref.generateLink(d, w, "maker-1", at);
  assert.equal(r.ok, true);
  return r.value;
}

function claim(w, campaign, points, at) {
  const req = ref.claimReferralRequestOf("maker-1", campaign, points);
  return pushActivity(w, activityOf(req, proofOf(req, "maker-1", at, `0x${"c".repeat(64)}`), "act_ref_claim"));
}

test("a link is per account and campaign, the same in every browser", () => {
  assert.equal(ref.referralCodeOf("maker-1", first.id), ref.referralCodeOf("maker-1", first.id));
  assert.notEqual(ref.referralCodeOf("maker-1", first.id), ref.referralCodeOf("maker-2", first.id));
  assert.match(ref.referralUrlOf("https://x.test", "abc"), /^https:\/\/x\.test\/m\/earn\/presale\?ref=abc$/);
  assert.match(ref.REFERRAL_PUBLISHER, /^0x[0-9a-f]{40}$/);
});

test("Generate Link joins the first campaign; the next waits until this one is claimed", () => {
  const w = defaultWallet();
  const d = join();
  const link = ref.currentLinkOf(d, "maker-1");
  assert.equal(link.campaign, first.id);
  assert.equal(ref.nextCampaignOf(d, w, "maker-1"), null);
  assert.equal(ref.generateLink(d, w, "maker-1", NOW).ok, false);
  const claimed = claim(w, first, "1", NOW + 10 * MIN);
  assert.equal(ref.nextCampaignOf(d, claimed, "maker-1").id, ref.CAMPAIGNS[1].id);
  assert.equal(ref.currentLinkOf(d, "maker-2"), null);
});

test("the campaign runs, waits for approval, then can be claimed", () => {
  const w = defaultWallet();
  const link = ref.currentLinkOf(join(), "maker-1");
  assert.equal(ref.campaignStateOf(link, w, NOW).phase, "running");
  assert.equal(ref.campaignStateOf(link, w, NOW + first.lockMs).phase, "approval");
  assert.equal(ref.campaignStateOf(link, w, NOW + first.lockMs + first.approvalMs).phase, "claimable");
  assert.equal(ref.campaignStateOf(link, claim(w, first, "1", NOW), NOW).phase, "claimed");
});

test("demo referrals count only while the lock-up runs; each earns the campaign's share in points", () => {
  const w = defaultWallet();
  let d = join();
  assert.equal(ref.demoReferralCheckOf("").ok, false);
  assert.equal(ref.demoReferralCheckOf("0").ok, false);
  assert.equal(ref.demoReferralCheckOf("100001").ok, false);
  assert.equal(ref.demoReferralCheckOf("400").value, "400");
  const add = (who, bought, at, id) => ref.addReferral(d, w, { id, identity: "maker-1", who, bought, at });
  let r = add("buyer-mira", "400", NOW + MIN, "r1");
  d = r.value;
  d = add("buyer-leo", "1000", NOW + 2 * MIN, "r2").value;
  d = add("buyer-mira", "200", NOW + 3 * MIN, "r3").value;
  r = add("buyer-sam", "50", NOW + first.lockMs, "r4");
  assert.equal(r.ok, false);
  const rows = ref.referralRowsOf(d, w, "maker-1");
  assert.deepEqual(rows.map((x) => x.id), ["r3", "r2", "r1"]);
  assert.equal(rows[2].name, "Mira (demo creator)");
  assert.equal(rows[2].earned, "20"); // 5 % of 400
  assert.equal(rows[2].points, "20");
  assert.deepEqual(ref.campaignStatsOf(rows, first.id), { users: 2, earned: "0", points: "80" });
  const normalized = ref.normalizeReferralData(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(normalized, d);
  assert.deepEqual(ref.normalizeReferralData({ links: [{ identity: "x" }], referrals: "no" }), ref.emptyReferralData());
});

test("claiming the points: blocked until approved, then IDZ into the balance as a Reward row", () => {
  let w = defaultWallet();
  let d = join();
  d = ref.addReferral(d, w, { id: "r1", identity: "maker-1", who: "buyer-leo", bought: "1000", at: NOW + MIN }).value;
  const link = ref.currentLinkOf(d, "maker-1");
  const points = ref.campaignStatsOf(ref.referralRowsOf(d, w, "maker-1"), first.id).points;
  assert.equal(points, "50");
  assert.match(ref.referralClaimBlockOf(ref.campaignStateOf(link, w, NOW + MIN), points), /once the lock-up ends/);
  assert.match(ref.referralClaimBlockOf(ref.campaignStateOf(link, w, NOW + first.lockMs), points), /approve/);
  const at = NOW + first.lockMs + first.approvalMs;
  assert.equal(ref.referralClaimBlockOf(ref.campaignStateOf(link, w, at), points), null);
  w = claim(w, first, points, at);
  assert.equal(balancesOf("maker-1", { wallet: w, market: EMPTY_MARKET, now: at }).idz, "2050");
  const rows = ref.referralRowsOf(d, w, "maker-1");
  assert.equal(rows[0].claimed, true);
  assert.deepEqual(ref.campaignStatsOf(rows, first.id), { users: 1, earned: "50", points: "0" });
  const ledger = idz.idzLedgerOf(w, "maker-1")[0];
  assert.equal(ledger.type, "reward");
  assert.equal(ledger.title, "Claimed referral rewards · Sale For Promotion");
});

test("filters: by campaign, by name, by date range", () => {
  const w = defaultWallet();
  let d = join(ref.emptyReferralData(), w, NOW - 40 * 86_400_000);
  // Referrals are only counted while running, so add them at the link's own time.
  const at0 = NOW - 40 * 86_400_000;
  d = ref.addReferral(d, w, { id: "old", identity: "maker-1", who: "buyer-sam", bought: "10", at: at0 + MIN }).value;
  const rows = [...ref.referralRowsOf(d, w, "maker-1"), { ...ref.referralRowsOf(d, w, "maker-1")[0], id: "new", at: NOW - 86_400_000, who: "buyer-leo", name: "Leo (demo creator)" }];
  const f = (o) => ref.filterReferrals(rows, { campaign: "all", search: "", range: "all", ...o }, NOW).map((r) => r.id);
  assert.deepEqual(f({}), ["old", "new"]);
  assert.deepEqual(f({ search: "leo" }), ["new"]);
  assert.deepEqual(f({ range: "week" }), ["new"]);
  assert.deepEqual(f({ range: "month" }), ["new"]);
  assert.deepEqual(f({ campaign: "campaign-02" }), []);
  assert.deepEqual(ref.referralYearsOf(rows, NOW), [2026]);
});
