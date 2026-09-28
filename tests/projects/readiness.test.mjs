// The readiness gate (Phase 2 spec §3.5.7 = VIDEO §2D, owner decision 6):
// one rule set shared by Showcase, Sell, Give, Relist and a single Edition.
import { test } from "node:test";
import assert from "node:assert/strict";

const { currentProductsOf, readinessOf } = await import("../../.tmp-test/lib/manual/readiness.js");

const NOW = 1_000_000;
const CLIP = { mime: "video/webm", width: 640, height: 360, durationMs: 10_000, bytes: 1 };

const product = (id, name, dropped = null) => ({ id, name, description: "", built: null, state: "hand", version: null, dropped });

const readyTake = (id, n = 1) => ({ id, productId: "x", n, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 10_000, readyAt: NOW - 5_000, clip: CLIP });
const pendingTake = (id, n = 1) => ({ id, productId: "x", n, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 5_000 });

const readyVideo = (takeId = `t_${Math.random()}`) => ({ takes: [readyTake(takeId)], inUseId: takeId });
const renderingVideo = (takeId) => ({ takes: [pendingTake(takeId)], inUseId: null });

/** A job in progress. `progressOf`'s formula (jobs.ts) is
 *  `etaSec = max(0, (1200 - elapsedSec) / 40)` with
 *  `elapsedSec = ((now - startedAt) / 1000) * 40` — solving for a chosen
 *  `etaSec` gives `startedAt = now + (etaSec - 30) * 1000`. That makes the
 *  "Waiting for…" text's eta reproducible to the second in a test, instead
 *  of depending on wall-clock drift. (For `etaSec` above 30 this puts
 *  `startedAt` after `now` — a synthetic fixture, not a real render's
 *  timeline, which this demo-speed model caps at 30 real seconds.) */
const renderingJob = (id, etaSec) => ({
  id,
  title: "t",
  prompt: "p",
  quality: "low",
  stage: "rendering",
  startedAt: NOW + (etaSec - 30) * 1000,
  stageStartedAt: NOW,
  emailReminder: null,
  browserNotify: false,
  minted: false,
});

function facts(o) {
  return {
    products: o.products ?? [],
    product: o.product,
    videos: { version: 1, projectId: "p-x", products: o.videos ?? {} },
    jobs: o.jobs ?? [],
    now: NOW,
    status: o.status ?? "draft",
    ownershipConfirmed: o.ownershipConfirmed ?? true,
    license: "license" in o ? o.license : "mit",
  };
}

// ─────────────────────────── currentProductsOf ───────────────────────

test("currentProductsOf: drops anything the newest version dropped", () => {
  const products = [product("a", "A"), product("b", "B", { lastIn: 1, current: 2 })];
  assert.deepEqual(currentProductsOf(products).map((p) => p.id), ["a"]);
});

// ─────────────────────────── P2-VIDEO-13's own acceptance list ───────────

test("two products, one ready and one rendering: videos fails with the exact waiting line", () => {
  const f = facts({
    products: [product("a", "A"), product("b", "B")],
    videos: { a: readyVideo("t_a"), b: renderingVideo("t_b") },
    jobs: [renderingJob("t_b", 45)], // 45 s < 60 s → "under a minute"
    status: "minted",
  });
  const r = readinessOf(f, "sell");
  const rule = r.rules.find((x) => x.id === "videos");
  assert.equal(rule.ok, false);
  assert.equal(rule.reason, "Waiting for 1 video to finish — under a minute left.");
  assert.equal(r.blocker, rule.reason);
});

test("the waiting line's eta is the LONGEST of the rendering products", () => {
  const f = facts({
    products: [product("a", "A"), product("b", "B")],
    videos: { a: renderingVideo("t_a"), b: renderingVideo("t_b") },
    jobs: [renderingJob("t_a", 45), renderingJob("t_b", 60)], // 60 s → "about 1 min"
  });
  const rule = readinessOf(f, "sell").rules.find((x) => x.id === "videos");
  assert.equal(rule.reason, "Waiting for 2 videos to finish — about 1 min left.");
});

test("missing beats rendering: any product with no video at all reports missing, not waiting", () => {
  const f = facts({
    products: [product("a", "A"), product("b", "B"), product("c", "C")],
    videos: { a: readyVideo("t_a"), b: renderingVideo("t_b") }, // c has no record — none
    jobs: [renderingJob("t_b", 45)],
  });
  const rule = readinessOf(f, "sell").rules.find((x) => x.id === "videos");
  assert.equal(rule.reason, "1 product still needs an AI video.");
});

test("missing pluralises", () => {
  const f = facts({ products: [product("a", "A"), product("b", "B")], videos: {} });
  const rule = readinessOf(f, "sell").rules.find((x) => x.id === "videos");
  assert.equal(rule.reason, "2 products still need an AI video.");
});

test("adding a dropped product without a video changes nothing", () => {
  const f = facts({
    products: [product("a", "A"), product("b", "B", { lastIn: 1, current: 2 })], // b is dropped, has no video
    videos: { a: readyVideo("t_a") },
  });
  const r = readinessOf(f, "sell");
  assert.equal(r.ok, true);
  assert.equal(r.counts.total, 1);
});

test("give with license: null fails on license — after videos and ownership pass", () => {
  const f = facts({
    products: [product("a", "A")],
    videos: { a: readyVideo("t_a") },
    ownershipConfirmed: true,
    license: null,
  });
  const r = readinessOf(f, "give");
  assert.equal(r.ok, false);
  assert.deepEqual(r.rules.map((x) => x.id), ["videos", "ownership", "license"]);
  assert.equal(r.rules[0].ok, true);
  assert.equal(r.rules[1].ok, true);
  assert.equal(r.rules[2].ok, false);
  assert.equal(r.blocker, "Choose the license it is given under.");
});

test("a showcase on a draft fails on minted, even with everything else ready", () => {
  const f = facts({
    products: [product("a", "A")],
    videos: { a: readyVideo("t_a") },
    ownershipConfirmed: true,
    status: "draft",
  });
  const r = readinessOf(f, "showcase");
  assert.equal(r.ok, false);
  assert.equal(r.blocker, "Mint it first — minting keeps your name on it before anyone sees it.");
  // The Draft control is hidden on the Brief, not the gate dialog — so the
  // dialog's own CTA isn't the one that fixes it.
  assert.equal(r.gateBlocker, null);
});

// ─────────────────────────── T06's own acceptance list ───────────────────

test("a rendering video fails `videos` for every purpose: showcase, sell, give, relist, edition", () => {
  const base = {
    products: [product("a", "A")],
    videos: { a: renderingVideo("t_a") },
    jobs: [renderingJob("t_a", 30)],
    status: "minted",
    ownershipConfirmed: true,
    license: "mit",
  };
  for (const purpose of ["showcase", "sell", "give", "relist"]) {
    const r = readinessOf(facts(base), purpose);
    assert.equal(r.ok, false, purpose);
    assert.equal(r.rules.find((x) => x.id === "videos").ok, false, purpose);
  }
  // Edition reads its own scoped product, not `products`.
  const editionFacts = facts({ ...base, product: product("a", "A") });
  const editionR = readinessOf(editionFacts, "edition");
  assert.equal(editionR.ok, false);
  assert.equal(editionR.rules.find((x) => x.id === "videos").ok, false);
});

test("relist has sell's exact rules", () => {
  const f = facts({
    products: [product("a", "A")],
    videos: { a: readyVideo("t_a") },
    ownershipConfirmed: false,
  });
  const sell = readinessOf(f, "sell");
  const relist = readinessOf(f, "relist");
  assert.deepEqual(relist.rules.map((r) => [r.id, r.ok]), sell.rules.map((r) => [r.id, r.ok]));
  assert.equal(relist.ok, sell.ok);
  assert.equal(relist.purpose, "relist");
});

test("edition reads only its own product — another product's missing video doesn't block it", () => {
  const f = facts({
    products: [product("a", "A"), product("b", "B")], // b has no video at all
    product: product("a", "A"), // the one being listed as an edition
    videos: { a: readyVideo("t_a") },
    ownershipConfirmed: true,
  });
  const r = readinessOf(f, "edition");
  assert.equal(r.ok, true);
  assert.equal(r.counts.total, 1);
  assert.deepEqual(r.products.map((p) => p.productId), ["a"]);
});

test("edition with no scoped product set reads as nothing to check (defensive default)", () => {
  const f = facts({ products: [product("a", "A")], videos: {} });
  const r = readinessOf(f, "edition");
  assert.equal(r.counts.total, 0);
  assert.equal(r.ok, true);
});

// ─────────────────────────── gateBlocker ───────────────────────

test("gateBlocker only surfaces a rule fixed in the gate dialog", () => {
  const f = facts({
    products: [product("a", "A")],
    videos: { a: readyVideo("t_a") },
    ownershipConfirmed: false, // showcase: ownership is fixed in the gate
    status: "minted",
  });
  const r = readinessOf(f, "showcase");
  assert.equal(r.blocker, "Confirm you are the rightful owner of this idea.");
  assert.equal(r.gateBlocker, r.blocker);
});

test("sell/give fix ownership on the form, not the gate dialog", () => {
  const f = facts({
    products: [product("a", "A")],
    videos: { a: readyVideo("t_a") },
    ownershipConfirmed: false,
  });
  const r = readinessOf(f, "sell");
  assert.equal(r.blocker, "Confirm you are the rightful owner of this idea.");
  assert.equal(r.gateBlocker, null);
});
