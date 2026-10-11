// The gating ladder (Build and Earn P1-4): five levels from Engineering to
// Physical editions & payouts, the next missing steps, and the commit-point
// check every commerce call site shares. Engineering is never gated.
import { test } from "node:test";
import assert from "node:assert/strict";

const { EARN_LEVELS, COMMIT_LEVEL, earnLevelOf, requireLevel, commitCheck, earnFactsOf, LADDER_STEPS } = await import(
  "../../.tmp-test/lib/commerce/ladder.js"
);

const ALL = {
  built: true,
  walletConnected: true,
  ownershipConfirmed: true,
  videosReady: true,
  minted: true,
  licenseSet: true,
  payoutWalletSet: true,
  identityVerified: true,
};
const facts = (o = {}) => ({ ...ALL, ...o });
const ids = (steps) => steps.map((s) => s.id);

// ─────────────────────────── the table ───────────────────────────

test("five levels, L0 to L4, in order, with the spec's names", () => {
  assert.deepEqual(
    EARN_LEVELS.map((l) => [l.level, l.name]),
    [
      [0, "Engineering"],
      [1, "Drafts"],
      [2, "Mint"],
      [3, "Sell & editions"],
      [4, "Physical editions & payouts"],
    ],
  );
});

test("each level's steps are the spec's: L2 wallet/ownership/videos, L3 minted/license/payout, L4 identity", () => {
  const at = (n) => LADDER_STEPS.filter((s) => s.level === n).map((s) => s.id);
  assert.deepEqual(at(0), []);
  assert.deepEqual(at(1), ["built"]);
  assert.deepEqual(at(2), ["wallet", "ownership", "videos"]);
  assert.deepEqual(at(3), ["minted", "license", "payout"]);
  assert.deepEqual(at(4), ["identity"]);
});

test("L1 needs no wallet: nothing commerce-side, only something built", () => {
  const r = earnLevelOf(facts({ walletConnected: false, ownershipConfirmed: false, videosReady: false, minted: false, licenseSet: false, payoutWalletSet: false, identityVerified: false }));
  assert.equal(r.level, 1);
  assert.equal(EARN_LEVELS[1].gate, "No wallet");
});

test("every step has a label, a reason and a fix", () => {
  for (const s of LADDER_STEPS) {
    assert.ok(s.label.length > 0, s.id);
    assert.ok(s.reason.length > 0, s.id);
    assert.ok(s.fix.label.length > 0, s.id);
  }
});

// ─────────────────────────── earnLevelOf ───────────────────────────

test("everything in place: L4 and nothing next", () => {
  assert.deepEqual(earnLevelOf(facts()), { level: 4, next: null });
});

test("nothing built: L0, and the next step is to build a product", () => {
  const r = earnLevelOf(facts({ built: false }));
  assert.equal(r.level, 0);
  assert.equal(r.next.level, 1);
  assert.deepEqual(ids(r.next.missing), ["built"]);
});

test("the ladder is cumulative: verified identity on an unminted project is still L2's job", () => {
  const r = earnLevelOf(facts({ minted: false, licenseSet: false, payoutWalletSet: false }));
  assert.equal(r.level, 2);
  assert.equal(r.next.level, 3);
});

test("a missing L2 step caps the level at 1 whatever comes later", () => {
  const r = earnLevelOf(facts({ walletConnected: false }));
  assert.equal(r.level, 1);
  assert.deepEqual(ids(r.next.missing), ["wallet"]);
});

test("next lists every missing step of the next level, in table order", () => {
  const r = earnLevelOf(facts({ walletConnected: false, videosReady: false, ownershipConfirmed: false }));
  assert.deepEqual(ids(r.next.missing), ["wallet", "ownership", "videos"]);
});

test("payout wallet is set at mint: unminted, it isn't listed as its own step", () => {
  const r = earnLevelOf(facts({ minted: false, payoutWalletSet: false }));
  assert.deepEqual(ids(r.next.missing), ["minted"]);
});

test("minted with no payout wallet lists the payout step", () => {
  const r = earnLevelOf(facts({ payoutWalletSet: false }));
  assert.equal(r.level, 2);
  assert.deepEqual(ids(r.next.missing), ["payout"]);
});

test("only identity missing: L3, next is L4 with the identity step", () => {
  const r = earnLevelOf(facts({ identityVerified: false }));
  assert.equal(r.level, 3);
  assert.deepEqual(ids(r.next.missing), ["identity"]);
});

test("a reason override (the readiness rule's own words) replaces the default reason", () => {
  const r = earnLevelOf(facts({ videosReady: false, reasons: { videos: "2 products still need an AI video." } }));
  assert.equal(r.next.missing[0].reason, "2 products still need an AI video.");
});

// ─────────────────────────── requireLevel and the commit points ───────────

test("requireLevel: met → ok", () => {
  assert.deepEqual(requireLevel(3, facts({ identityVerified: false })), { ok: true });
  assert.deepEqual(requireLevel(0, facts({ built: false })), { ok: true });
});

test("requireLevel: not met → every missing step up to the level, lower levels first", () => {
  const r = requireLevel(3, facts({ walletConnected: false, licenseSet: false }));
  assert.equal(r.ok, false);
  assert.equal(r.level, 3);
  assert.equal(r.current, 1);
  assert.deepEqual(ids(r.missing), ["wallet", "license"]);
});

test("requireLevel never asks for a step above the level", () => {
  const r = requireLevel(2, facts({ walletConnected: false, identityVerified: false, minted: false }));
  assert.deepEqual(ids(r.missing), ["wallet"]);
});

test("COMMIT_LEVEL: mint L2, list and virtual editions L3, physical editions and payouts L4", () => {
  assert.deepEqual(COMMIT_LEVEL, { mint: 2, list: 3, editionVirtual: 3, editionPhysical: 4, payout: 4 });
});

test("commitCheck: identity is asked only for physical editions and payouts", () => {
  const f = facts({ identityVerified: false });
  assert.equal(commitCheck("mint", f).ok, true);
  assert.equal(commitCheck("list", f).ok, true);
  assert.equal(commitCheck("editionVirtual", f).ok, true);
  assert.deepEqual(ids(commitCheck("editionPhysical", f).missing), ["identity"]);
  assert.deepEqual(ids(commitCheck("payout", f).missing), ["identity"]);
});

test("commitCheck: mint skips L3's steps (minting is what sets them)", () => {
  const r = commitCheck("mint", facts({ minted: false, licenseSet: false, payoutWalletSet: false }));
  assert.deepEqual(r, { ok: true });
});

test("commitCheck: a step the caller already gates itself can be left out", () => {
  const f = facts({ walletConnected: false, ownershipConfirmed: false });
  assert.deepEqual(ids(commitCheck("mint", f).missing), ["wallet", "ownership"]);
  assert.deepEqual(ids(commitCheck("mint", f, { handled: ["ownership"] }).missing), ["wallet"]);
  assert.deepEqual(commitCheck("mint", facts({ ownershipConfirmed: false }), { handled: ["ownership"] }), { ok: true });
});

// ─────────────────────────── earnFactsOf ───────────────────────────

const product = (id, dropped = null) => ({ id, dropped });
const rule = (id, ok, reason = null) => ({ id, ok, reason });
const wallet = (connected, account = 1) => ({
  v: 2,
  account,
  identities: { [`maker-${account}`]: { connected, network: "baseSepolia" } },
  activity: [],
});
const input = (o = {}) => ({
  products: [product("a")],
  sell: { rules: [rule("videos", true), rule("ownership", true)] },
  commercial: "minted",
  license: "mit",
  wallet: wallet(true),
  kyc: { status: "verified", at: 1, demo: true },
  ...o,
});

test("earnFactsOf: a fully set project reads every fact true", () => {
  assert.deepEqual(earnFactsOf(input()), { ...ALL, reasons: {} });
});

test("earnFactsOf: built counts current products only; a dropped one doesn't", () => {
  assert.equal(earnFactsOf(input({ products: [product("a", { lastIn: 1, current: 2 })] })).built, false);
  assert.equal(earnFactsOf(input({ products: [] })).built, false);
});

test("earnFactsOf: videos never pass vacuously on a project with no current product", () => {
  assert.equal(earnFactsOf(input({ products: [] })).videosReady, false);
});

test("earnFactsOf: the Sell gate's rules decide videos and ownership, and pass their reasons on", () => {
  const f = earnFactsOf(input({ sell: { rules: [rule("videos", false, "1 product still needs an AI video."), rule("ownership", false, "Confirm.")] } }));
  assert.equal(f.videosReady, false);
  assert.equal(f.ownershipConfirmed, false);
  assert.deepEqual(f.reasons, { videos: "1 product still needs an AI video." });
});

test("earnFactsOf: the wallet is the maker's current account, connected; unread is not connected", () => {
  assert.equal(earnFactsOf(input({ wallet: wallet(false) })).walletConnected, false);
  assert.equal(earnFactsOf(input({ wallet: wallet(true, 2) })).walletConnected, true);
  assert.equal(earnFactsOf(input({ wallet: undefined })).walletConnected, false);
});

test("earnFactsOf: minted is the commercial axis past \"none\"; every mint pays a wallet, so its payout is set", () => {
  const none = earnFactsOf(input({ commercial: "none" }));
  assert.equal(none.minted, false);
  assert.equal(none.payoutWalletSet, false);
  for (const state of ["minted", "given", "listed", "paused", "soldPartial", "soldOut"]) {
    const f = earnFactsOf(input({ commercial: state }));
    assert.equal(f.minted, true, state);
    assert.equal(f.payoutWalletSet, true, state);
  }
});

test("earnFactsOf: no license, no KYC record", () => {
  const f = earnFactsOf(input({ license: null, kyc: null }));
  assert.equal(f.licenseSet, false);
  assert.equal(f.identityVerified, false);
});

// ─────────────────────────── levelStepsOf ───────────────────────────

test("levelStepsOf: a level's own steps with their state, done ones included", async () => {
  const { levelStepsOf } = await import("../../.tmp-test/lib/commerce/ladder.js");
  const rows = levelStepsOf(2, facts({ walletConnected: false, reasons: { videos: "x" } }));
  assert.deepEqual(rows.map((r) => [r.id, r.ok]), [["wallet", false], ["ownership", true], ["videos", true]]);
  assert.equal(rows[2].reason, "Every product needs a finished AI video.", "a done step keeps its default words");
});

test("levelStepsOf: payout waits for the mint, as `next` does", async () => {
  const { levelStepsOf } = await import("../../.tmp-test/lib/commerce/ladder.js");
  assert.deepEqual(levelStepsOf(3, facts({ minted: false, payoutWalletSet: false })).map((r) => r.id), ["minted", "license"]);
  assert.deepEqual(levelStepsOf(3, facts()).map((r) => r.id), ["minted", "license", "payout"]);
  assert.deepEqual(levelStepsOf(0, facts()), []);
});

// ─────────── one source: the ladder reads the Sell gate the readiness module computes ───────────
// (Earn › Overview's "Ready to earn" is the ladder; these were the P0 checklist's cases.)

const { readinessOf } = await import("../../.tmp-test/lib/manual/readiness.js");
const NOW = 1_000_000;
const CLIP = { mime: "video/webm", width: 640, height: 360, durationMs: 10_000, bytes: 1 };
const realProduct = (id, name, dropped = null) => ({ id, name, description: "", built: null, state: "hand", version: null, dropped });
const readyVideo = (id) => ({
  takes: [{ id, productId: "x", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 10_000, readyAt: NOW - 5_000, clip: CLIP }],
  inUseId: id,
});
const gateFacts = (o = {}) => ({
  products: [realProduct("p1", "Planter"), realProduct("p2", "Hub")],
  videos: { version: 1, projectId: "p", products: {} },
  jobs: [],
  now: NOW,
  status: "private",
  ownershipConfirmed: true,
  license: null,
  ...o,
});
const fromGate = (f, extra = {}) =>
  earnFactsOf({
    products: f.products,
    sell: readinessOf(f, "sell"),
    commercial: "minted",
    license: "mit",
    wallet: wallet(true),
    kyc: null,
    ...extra,
  });

test("ladder × Sell gate: two products without videos and no ownership fail both, with the gate's own video count", () => {
  const f = fromGate(gateFacts({ ownershipConfirmed: false }));
  assert.equal(f.videosReady, false);
  assert.equal(f.ownershipConfirmed, false);
  const r = earnLevelOf(f);
  assert.equal(r.level, 1);
  assert.deepEqual(ids(r.next.missing), ["ownership", "videos"]);
  assert.equal(r.next.missing.find((s) => s.id === "videos").reason, "2 products still need an AI video.");
});

test("ladder × Sell gate: every video ready and ownership confirmed passes L2", () => {
  const f = fromGate(gateFacts({ videos: { version: 1, projectId: "p", products: { p1: readyVideo("t1"), p2: readyVideo("t2") } } }));
  assert.equal(f.videosReady, true);
  assert.equal(f.ownershipConfirmed, true);
  assert.equal(earnLevelOf(f).level, 3);
});

test("ladder × Sell gate: a dropped product needs no video (COR-108)", () => {
  const products = [realProduct("p1", "Planter"), realProduct("p2", "Hub", { lastIn: 1, current: 2 })];
  const f = fromGate(gateFacts({ products, videos: { version: 1, projectId: "p", products: { p1: readyVideo("t1") } } }));
  assert.equal(f.videosReady, true);
});

test("ladder × commercial axis: a mint record or a minted draft reads minted; a plain draft doesn't", async () => {
  const { commercialFactsOf, commercialStateOf } = await import("../../.tmp-test/lib/commerce/state.js");
  const p = { id: "p", createdAt: 1, contributors: [] };
  const stateOf = (proj, draft) => commercialStateOf(commercialFactsOf(proj, draft, {}));
  const minted = (proj, draft) => earnFactsOf(input({ commercial: stateOf(proj, draft) })).minted;
  assert.equal(minted({ ...p, mint: { wallet: { account: 1, address: "0x1" } } }, null), true);
  assert.equal(minted(p, { state: { mintedAt: 5, intent: "give" }, step: "success" }), true);
  assert.equal(minted(p, { state: { mintedAt: null, intent: "sell" }, step: "form" }), false);
});
