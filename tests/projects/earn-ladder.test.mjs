// The gating ladder (Build and Earn P1-4): five levels from Engineering to
// Physical editions & payouts, the next missing steps, and the commit-point
// check every commerce call site shares. Engineering is never gated.
import { test } from "node:test";
import assert from "node:assert/strict";

const { EARN_LEVELS, COMMIT_LEVEL, earnLevelOf, requireLevel, commitCheck, commitStepsOf, earnFactsOf, LADDER_STEPS } = await import(
  "../../.tmp-test/lib/commerce/ladder.js"
);

const ALL = {
  built: true,
  walletConnected: true,
  ownershipConfirmed: true,
  videosReady: true,
  minted: true,
  licenseSet: true,
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

test("each level's steps (owner, 2026-10-12): nothing between a build and its mint; L3 minted/ownership/videos/license, L4 identity", () => {
  const at = (n) => LADDER_STEPS.filter((s) => s.level === n).map((s) => s.id);
  assert.deepEqual(at(0), []);
  assert.deepEqual(at(1), ["built"]);
  assert.deepEqual(at(2), [], "no wallet, ownership or videos before the mint: the mint asks them in place");
  assert.deepEqual(at(3), ["minted", "ownership", "videos", "license"], "no withdrawal method: the first withdrawal asks it (V7)");
  assert.deepEqual(at(4), ["identity"]);
  assert.ok(!LADDER_STEPS.some((s) => s.id === "wallet"), "a signing request connects the wallet itself");
});

test("a built project reaches the mint with no wallet, no ownership tick and no videos", () => {
  const r = earnLevelOf(facts({ walletConnected: false, ownershipConfirmed: false, videosReady: false, minted: false, licenseSet: false, identityVerified: false }));
  assert.equal(r.level, 2);
  assert.equal(EARN_LEVELS[1].gate, "No wallet");
  assert.equal(commitCheck("mint", facts({ walletConnected: false, ownershipConfirmed: false, videosReady: false, minted: false })).ok, true);
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
  const r = earnLevelOf(facts({ minted: false, licenseSet: false }));
  assert.equal(r.level, 2);
  assert.equal(r.next.level, 3);
});

test("a missing L3 step caps the level at 2 whatever comes later", () => {
  const r = earnLevelOf(facts({ videosReady: false }));
  assert.equal(r.level, 2);
  assert.deepEqual(ids(r.next.missing), ["videos"]);
});

test("next lists every missing step of the next level, in table order", () => {
  const r = earnLevelOf(facts({ walletConnected: false, videosReady: false, ownershipConfirmed: false, licenseSet: false }));
  assert.deepEqual(ids(r.next.missing), ["ownership", "videos", "license"]);
});

test("unminted, the mint is the one step L3 still needs", () => {
  const r = earnLevelOf(facts({ minted: false }));
  assert.deepEqual(ids(r.next.missing), ["minted"]);
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
  const r = requireLevel(3, facts({ built: false, licenseSet: false }));
  assert.equal(r.ok, false);
  assert.equal(r.level, 3);
  assert.equal(r.current, 0);
  assert.deepEqual(ids(r.missing), ["built", "license"]);
});

test("requireLevel never asks for a step above the level", () => {
  const r = requireLevel(2, facts({ built: false, identityVerified: false, minted: false, videosReady: false }));
  assert.deepEqual(ids(r.missing), ["built"]);
});

test("COMMIT_LEVEL: mint L2, list and virtual editions L3, physical editions L4 (withdrawing is Get paid's)", () => {
  assert.deepEqual(COMMIT_LEVEL, { mint: 2, list: 3, editionVirtual: 3, editionPhysical: 4 });
});

test("commitCheck: identity is asked only for physical editions", () => {
  const f = facts({ identityVerified: false });
  assert.equal(commitCheck("mint", f).ok, true);
  assert.equal(commitCheck("list", f).ok, true);
  assert.equal(commitCheck("editionVirtual", f).ok, true);
  assert.deepEqual(ids(commitCheck("editionPhysical", f).missing), ["identity"]);
});

test("commitCheck: mint skips L3's steps (minting is what sets them)", () => {
  const r = commitCheck("mint", facts({ minted: false, licenseSet: false }));
  assert.deepEqual(r, { ok: true });
});

test("commitCheck: a step the caller already gates itself can be left out", () => {
  const f = facts({ ownershipConfirmed: false, licenseSet: false });
  assert.deepEqual(ids(commitCheck("list", f).missing), ["ownership", "license"]);
  assert.deepEqual(ids(commitCheck("list", f, { handled: ["ownership"] }).missing), ["license"]);
  assert.deepEqual(commitCheck("list", facts({ ownershipConfirmed: false }), { handled: ["ownership"] }), { ok: true });
});

test("commitCheck: the mint flow's Sell, at the list level, leaves only what it doesn't gate itself", () => {
  // Nothing is minted until the commit; the flow's gate, its Details' license and its commit answer the rest.
  const handled = ["ownership", "videos", "license", "minted"];
  const draft = facts({ walletConnected: false, ownershipConfirmed: false, videosReady: false, minted: false, licenseSet: false });
  assert.deepEqual(ids(commitCheck("list", draft).missing), ["minted", "ownership", "videos", "license"]);
  assert.deepEqual(commitCheck("list", draft, { handled }), { ok: true }, "the wallet is the signing request's own first step");
  assert.deepEqual(commitCheck("list", facts({ minted: false, licenseSet: false }), { handled }), { ok: true });
});

test("commitStepsOf: every step up to the point's level, done or not; none missing is commitCheck's ok", () => {
  assert.deepEqual(ids(commitStepsOf("mint", facts())), ["built"]);
  assert.deepEqual(ids(commitStepsOf("list", facts())), ["built", "minted", "ownership", "videos", "license"]);
  assert.deepEqual(ids(commitStepsOf("editionPhysical", facts())).at(-1), "identity");
  const unminted = commitStepsOf("list", facts({ minted: false }));
  assert.deepEqual(ids(unminted), ["built", "minted", "ownership", "videos", "license"]);
  assert.deepEqual(unminted.filter((s) => !s.ok).map((s) => s.id), ["minted"]);
  const keys = Object.keys(ALL);
  for (const point of Object.keys(COMMIT_LEVEL)) {
    for (let mask = 0; mask < 1 << keys.length; mask++) {
      const f = Object.fromEntries(keys.map((k, i) => [k, (mask & (1 << i)) !== 0]));
      assert.equal(commitStepsOf(point, f).every((st) => st.ok), commitCheck(point, f).ok, `${point} ${mask}`);
    }
  }
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

test("earnFactsOf: minted is the commercial axis past \"none\"", () => {
  assert.equal(earnFactsOf(input({ commercial: "none" })).minted, false);
  for (const state of ["minted", "given", "listed", "paused", "soldPartial", "soldOut"]) {
    assert.equal(earnFactsOf(input({ commercial: state })).minted, true, state);
  }
});

test("the identity step's fix is Verify identity (Settings › Get paid)", () => {
  const step = LADDER_STEPS.find((s) => s.id === "identity");
  assert.deepEqual(step.fix, { kind: "identity", label: "Verify identity" });
});

test("earnFactsOf: no license, no KYC record", () => {
  const f = earnFactsOf(input({ license: null, kyc: null }));
  assert.equal(f.licenseSet, false);
  assert.equal(f.identityVerified, false);
});

// ─────────────────────────── levelStepsOf ───────────────────────────

test("levelStepsOf: a level's own steps with their state, done ones included", async () => {
  const { levelStepsOf } = await import("../../.tmp-test/lib/commerce/ladder.js");
  const rows = levelStepsOf(3, facts({ licenseSet: false, reasons: { videos: "x" } }));
  assert.deepEqual(rows.map((r) => [r.id, r.ok]), [["minted", true], ["ownership", true], ["videos", true], ["license", false]]);
  assert.equal(rows[2].reason, "Every product needs a finished AI video.", "a done step keeps its default words");
  assert.deepEqual(levelStepsOf(2, facts()), [], "the mint's level asks nothing of its own");
});

test("levelStepsOf: an unminted project still lists the whole level", async () => {
  const { levelStepsOf } = await import("../../.tmp-test/lib/commerce/ladder.js");
  assert.deepEqual(levelStepsOf(3, facts({ minted: false })).map((r) => [r.id, r.ok]), [["minted", false], ["ownership", true], ["videos", true], ["license", true]]);
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
  assert.equal(r.level, 2, "neither keeps the project from its mint");
  assert.deepEqual(ids(r.next.missing), ["ownership", "videos"]);
  assert.equal(r.next.missing.find((s) => s.id === "videos").reason, "2 products still need an AI video.");
});

test("ladder × Sell gate: every video ready and ownership confirmed passes L3", () => {
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
