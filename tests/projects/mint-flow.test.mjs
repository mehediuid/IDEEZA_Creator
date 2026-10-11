// Build and Earn P1-2 — the Brief as Earn's mint flow: its state, its steps, the draft
// migration (commerce fields kept; video and description fields dropped from the flow but
// left stored), the build-draft hand-off, the two gates, and the route.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  DEFAULT_MINT_STATE,
  MINT_STATE_KEYS,
  MINT_STEPS,
  MINT_STEP_LABEL,
  COLLECTION_REASON,
  OWNERSHIP_REASON,
  SELL_LICENSE_REASON,
  adoptBuildIntent,
  briefStateOf,
  detailsMissing,
  gatePurposeOf,
  mintDraftJson,
  mintStateOf,
  mintStepBefore,
  mintStepFromStored,
  readMintDraft,
  reviewMissing,
  statusAfterCommit,
  storedStepOf,
} = await import("../../.tmp-test/lib/brief/mint-flow.js");
const { DEFAULT_STATE, normalizeBrief } = await import("../../.tmp-test/lib/brief/types.js");
const { parseBriefDraft } = await import("../../.tmp-test/lib/brief/project-brief.js");
const { earnHref, earnMintHref } = await import("../../.tmp-test/lib/manual/earn-route.js");
const { readinessOf } = await import("../../.tmp-test/lib/manual/readiness.js");

const MINTED = Date.UTC(2026, 9, 2, 9, 30);
const NOW = Date.UTC(2026, 9, 11, 12, 0);
/** Fields the flow no longer edits: the old Step 1 words and the old preview step. */
const DROPPED = [
  "projectChoice",
  "newProjectName",
  "newProjectDescription",
  "productName",
  "productDescription",
  "otherProducts",
  "mediaType",
  "videoPrompt",
  "audioPrompt",
  "audioAutoGenerate",
  "quality",
  "scenes",
  "storyboardGenerated",
  "arClip",
  "videoJobId",
];
/** A draft as the old Brief wrote it: Step 1 words, a video step, and the sale's terms. */
const OLD_SELL = {
  projectId: "proj_a",
  projectChoice: "proj_a",
  productName: "Soil probe",
  productDescription: "Waters a plant when its soil runs dry.",
  otherProducts: [{ name: "Hub", description: "Relays readings." }],
  intent: "sell",
  mediaType: "ai",
  videoPrompt: "Slow orbit of the probe",
  quality: "high",
  scenes: [{ id: "s1", label: "Scene 1" }],
  storyboardGenerated: true,
  videoJobId: "job_1",
  network: "polygon",
  collection: "Garden",
  listingType: "auction",
  token: "ETH",
  price: "0.05",
  minBid: "0.01",
  auctionBuyNow: "0.2",
  expiresAt: "2026-12-01T10:00",
  mintType: "instant",
  sellingPct: "25",
  royalties: 0,
  benefits: [{ id: "ben_a", name: "Group", duration: { months: 3 } }],
  confirmOwnership: true,
  shareToNewsfeed: true,
  story: "Built for my balcony.",
};
const raw = (state, step = "form", extra = {}) => JSON.stringify({ state, step, ...extra });

const products = [
  { id: "p1", name: "Probe", description: "", built: null, state: "hand", version: null, dropped: null },
  { id: "p2", name: "Hub", description: "", built: null, state: "hand", version: null, dropped: null },
];
const take = (productId) => ({ id: `t_${productId}`, productId, n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: 1, readyAt: 2 });
const videosFor = (ids) => ({
  version: 1,
  projectId: "proj_a",
  products: Object.fromEntries(ids.map((id) => [id, { takes: [take(id)], inUseId: `t_${id}` }])),
});
const readiness = (s, videoIds, purpose = gatePurposeOf(s.intent, s.shareToNewsfeed)) =>
  purpose
    ? readinessOf(
        {
          products,
          videos: videosFor(videoIds),
          jobs: [],
          now: NOW,
          status: statusAfterCommit(s.intent),
          ownershipConfirmed: s.confirmOwnership,
          license: s.license,
        },
        purpose,
      )
    : null;

test("the flow's state is the commerce half of the draft: no video, no product words", () => {
  for (const k of DROPPED) assert.ok(!MINT_STATE_KEYS.includes(k), `${k} is not the flow's`);
  for (const k of ["intent", "network", "collection", "license", "price", "sellingPct", "royalties", "benefits", "mintType", "confirmOwnership", "shareToNewsfeed", "mintedAt"]) {
    assert.ok(MINT_STATE_KEYS.includes(k), `${k} is the flow's`);
  }
  assert.deepEqual(Object.keys(DEFAULT_MINT_STATE).sort(), [...MINT_STATE_KEYS].sort());
  assert.equal(DEFAULT_MINT_STATE.intent, null);
  assert.equal(DEFAULT_MINT_STATE.mintType, "lazy");
  assert.equal(DEFAULT_MINT_STATE.sellingPct, "10");
  // The whole model around it reads the other fields as their defaults.
  const full = briefStateOf({ ...DEFAULT_MINT_STATE, intent: "give" });
  assert.equal(full.intent, "give");
  assert.equal(full.productName, DEFAULT_STATE.productName);
  assert.deepEqual(mintStateOf(full), { ...DEFAULT_MINT_STATE, intent: "give" });
});

test("the steps: Choose, Details, Review and sign, Done; Back walks one step, never out of Success", () => {
  assert.deepEqual([...MINT_STEPS], ["choose", "details", "review", "success"]);
  assert.deepEqual(MINT_STEPS.map((s) => MINT_STEP_LABEL[s]), ["Choose", "Details", "Review and sign", "Done"]);
  assert.equal(mintStepBefore("choose"), null);
  assert.equal(mintStepBefore("details"), "choose");
  assert.equal(mintStepBefore("review"), "details");
  assert.equal(mintStepBefore("success"), null);
});

test("an old draft's step maps onto the flow's (preview sat before a Sell's form, after a Save's)", () => {
  assert.equal(mintStepFromStored("idea", "sell", null), "choose");
  assert.equal(mintStepFromStored("form", "give", null), "details");
  assert.equal(mintStepFromStored("preview", "sell", null), "details");
  assert.equal(mintStepFromStored("preview", "give", null), "details");
  assert.equal(mintStepFromStored("preview", "save", null), "review");
  // No intent: nothing past Choose. A mint: its success step, whatever the step says.
  assert.equal(mintStepFromStored("form", null, null), "choose");
  assert.equal(mintStepFromStored("idea", "save", MINTED), "success");
  assert.equal(mintStepFromStored("success", "sell", MINTED), "success");
  // "success" with no mint is a broken draft: it reopens on the review, not on a record.
  assert.equal(mintStepFromStored("success", "sell", null), "review");
  // Written back in the old vocabulary for the status line's readers.
  assert.deepEqual(MINT_STEPS.map(storedStepOf), ["idea", "form", "form", "success"]);
});

test("readMintDraft migrates an old draft: commerce fields kept and normalized, video and description fields dropped", () => {
  const d = readMintDraft(raw(OLD_SELL, 3));
  assert.equal(d.step, "details"); // step 3 of the numbered drafts was the form
  for (const k of DROPPED) assert.ok(!(k in d.state), `${k} left the flow's state`);
  assert.equal(d.state.intent, "sell");
  assert.equal(d.state.network, "mumbai"); // the testnet migration
  assert.equal(d.state.token, "MATIC"); // ETH isn't carried on Mumbai
  assert.equal(d.state.collection, "Garden");
  assert.equal(d.state.listingType, "auction");
  assert.equal(d.state.minBid, "0.01");
  assert.equal(d.state.auctionBuyNow, "0.2");
  assert.equal(d.state.expiresAt, "2026-12-01T10:00");
  assert.equal(d.state.mintType, "instant");
  assert.equal(d.state.sellingPct, "25");
  assert.equal(d.state.royalties, ""); // an old 0 meant "nothing typed"
  assert.deepEqual(d.state.benefits, [{ id: "ben_a", name: "Group", duration: { months: 3 } }]);
  assert.equal(d.state.confirmOwnership, true);
  assert.equal(d.state.shareToNewsfeed, true);
  assert.equal(d.state.story, "Built for my balcony.");
  assert.equal(d.state.mintedAt, null);
});

test("readMintDraft: no draft or a corrupt one starts fresh; the flow's own step wins when it is usable", () => {
  for (const r of [null, "", "{nope", "null", "[]", JSON.stringify({ step: "form" }), JSON.stringify({ state: "x" })]) {
    assert.equal(readMintDraft(r), null, String(r));
  }
  assert.equal(readMintDraft(raw({ intent: "give" }, "form", { mintStep: "review" })).step, "review");
  assert.equal(readMintDraft(raw({ intent: "give" }, "form", { mintStep: "bogus" })).step, "details");
  // A flow step past Choose needs an intent; Success needs a mint.
  assert.equal(readMintDraft(raw({}, "form", { mintStep: "review" })).step, "choose");
  assert.equal(readMintDraft(raw({ intent: "sell" }, "success", { mintStep: "success" })).step, "review");
  assert.equal(readMintDraft(raw({ intent: "sell", mintedAt: MINTED }, "form", { mintStep: "details" })).step, "success");
});

test("mintDraftJson writes the flow's state over the stored draft, leaving the dropped fields exactly as stored", () => {
  const prev = raw(OLD_SELL, "preview");
  const d = readMintDraft(prev);
  const next = { ...d.state, price: "0.07", license: "mit" };
  const written = JSON.parse(mintDraftJson(prev, next, "review"));
  assert.equal(written.step, "form");
  assert.equal(written.mintStep, "review");
  for (const k of DROPPED) {
    if (k in OLD_SELL) assert.deepEqual(written.state[k], OLD_SELL[k], `${k} is still stored`);
  }
  assert.equal(written.state.price, "0.07");
  assert.equal(written.state.license, "mit");
  assert.equal(written.state.network, "mumbai", "the flow's normalized value replaces the old one");
  // Every reader still parses it: the project's Brief read, the legacy clip migration's fields.
  const parsed = parseBriefDraft(JSON.stringify(written));
  assert.equal(parsed.step, "form");
  assert.equal(parsed.state.videoJobId, "job_1");
  assert.equal(parsed.state.storyboardGenerated, true);
  assert.equal(parsed.state.videoPrompt, "Slow orbit of the probe");
  assert.equal(parsed.state.productDescription, OLD_SELL.productDescription);
  // Read back by the flow, it reopens on the same step with the same state.
  assert.deepEqual(readMintDraft(JSON.stringify(written)), { state: next, step: "review" });
});

test("mintDraftJson with nothing stored writes the flow's state alone; normalizeBrief fills the rest on read", () => {
  const s = { ...DEFAULT_MINT_STATE, projectId: "proj_a", intent: "save" };
  const written = JSON.parse(mintDraftJson(null, s, "choose"));
  assert.deepEqual(written, { state: s, step: "idea", mintStep: "choose" });
  assert.deepEqual(normalizeBrief(written.state), { ...DEFAULT_STATE, projectId: "proj_a", intent: "save" });
  // A corrupt previous record keeps nothing.
  assert.deepEqual(JSON.parse(mintDraftJson("{bad", s, "details")).state, s);
});

test("a minted draft reopens on its success step, and stays minted through a write", () => {
  const prev = raw({ ...OLD_SELL, mintedAt: MINTED }, "success");
  const d = readMintDraft(prev);
  assert.equal(d.step, "success");
  assert.equal(d.state.mintedAt, MINTED);
  const again = readMintDraft(mintDraftJson(prev, d.state, d.step));
  assert.equal(again.step, "success");
  assert.equal(again.state.mintedAt, MINTED);
});

test("adoptBuildIntent: a build's old draft carries its intent once, into a project draft with none", () => {
  const build = raw({ intent: "give", productName: "Probe", productDescription: "Old words" }, "idea");
  // No project draft: a fresh one with the intent, nothing else.
  const fresh = JSON.parse(adoptBuildIntent(null, build));
  assert.equal(fresh.state.intent, "give");
  assert.equal(fresh.mintStep, "choose");
  assert.ok(!("productDescription" in fresh.state), "the build's product words don't travel");
  // A project draft with no intent keeps everything it has and gains the intent.
  const own = raw({ collection: "Garden", videoPrompt: "kept" }, "idea");
  const merged = JSON.parse(adoptBuildIntent(own, build));
  assert.equal(merged.state.intent, "give");
  assert.equal(merged.state.collection, "Garden");
  assert.equal(merged.state.videoPrompt, "kept");
  // Nothing changes when the project chose already, minted, or the build chose nothing.
  assert.equal(adoptBuildIntent(raw({ intent: "sell" }), build), null);
  assert.equal(adoptBuildIntent(raw({ mintedAt: MINTED }), build), null);
  assert.equal(adoptBuildIntent(own, raw({ productName: "Probe" })), null);
  assert.equal(adoptBuildIntent(own, null), null);
});

test("gatePurposeOf and statusAfterCommit keep the Brief's rules (P2-VIDEO-17)", () => {
  assert.equal(gatePurposeOf("sell", false), "sell");
  assert.equal(gatePurposeOf("give", true), "give");
  assert.equal(gatePurposeOf("save", false), null);
  // A private mint is never held for videos, shared to Innovations or not (owner, 2026-10-12).
  assert.equal(gatePurposeOf("save", true), null);
  assert.equal(gatePurposeOf(null, true), null);
  assert.equal(statusAfterCommit("sell"), "listed");
  assert.equal(statusAfterCommit("give"), "given");
  assert.equal(statusAfterCommit("save"), "private");
});

test("detailsMissing: collection first, then a Sell's terms, a Save's confirm, then the gate's form rules", () => {
  const give = { ...DEFAULT_MINT_STATE, intent: "give" };
  assert.equal(detailsMissing(give, { now: NOW, creatorPct: 100, readiness: readiness(give, []) }), COLLECTION_REASON);
  const withCollection = { ...give, collection: "Garden" };
  // A Give's license and ownership are its gate's form rules — answered here, whatever the videos.
  assert.equal(
    detailsMissing(withCollection, { now: NOW, creatorPct: 100, readiness: readiness(withCollection, []) }),
    OWNERSHIP_REASON,
  );
  const owned = { ...withCollection, confirmOwnership: true };
  assert.equal(
    detailsMissing(owned, { now: NOW, creatorPct: 100, readiness: readiness(owned, []) }),
    "Choose the license it is given under.",
  );
  const licensed = { ...owned, license: "mit" };
  assert.equal(detailsMissing(licensed, { now: NOW, creatorPct: 100, readiness: readiness(licensed, []) }), null, "videos are the review's");

  const save = { ...DEFAULT_MINT_STATE, intent: "save", collection: "Garden" };
  assert.equal(detailsMissing(save, { now: NOW, creatorPct: 100, readiness: null }), OWNERSHIP_REASON);
  assert.equal(detailsMissing({ ...save, confirmOwnership: true }, { now: NOW, creatorPct: 100, readiness: null }), null);

  const sell = { ...DEFAULT_MINT_STATE, intent: "sell", collection: "Garden", confirmOwnership: true };
  assert.match(detailsMissing(sell, { now: NOW, creatorPct: 100, readiness: readiness(sell, []) }) ?? "", /price/i);
  const unlicensed = { ...sell, price: "0.05" };
  // A Sell lists at once, and a listing needs a license (the ladder's L3): asked after the listing's own terms.
  assert.equal(detailsMissing(unlicensed, { now: NOW, creatorPct: 100, readiness: readiness(unlicensed, []) }), SELL_LICENSE_REASON);
  assert.equal(SELL_LICENSE_REASON, "Choose the license buyers get it under.");
  const priced = { ...unlicensed, license: "mit" };
  assert.equal(detailsMissing(priced, { now: NOW, creatorPct: 100, readiness: readiness(priced, []) }), null);
  // Keep private never asks one.
  assert.equal(detailsMissing({ ...save, confirmOwnership: true, license: null }, { now: NOW, creatorPct: 100, readiness: null }), null);
  // Selling more than the maker holds is the listing's own rule.
  assert.notEqual(detailsMissing({ ...priced, sellingPct: "50" }, { now: NOW, creatorPct: 40, readiness: null }), null);
});

test("reviewMissing: details first, then the wallet (never for a Save), then the gate — a rendering video never counts", () => {
  const sell = { ...DEFAULT_MINT_STATE, intent: "sell", collection: "Garden", confirmOwnership: true, price: "0.05" };
  assert.equal(reviewMissing({ intent: "sell", details: "x", shortfall: "y", readiness: null }), "x");
  assert.equal(reviewMissing({ intent: "sell", details: null, shortfall: "Not enough MATIC", readiness: null }), "Not enough MATIC");
  assert.equal(reviewMissing({ intent: "save", details: null, shortfall: "Not enough MATIC", readiness: null }), null);
  assert.equal(
    reviewMissing({ intent: "sell", details: null, shortfall: null, readiness: readiness(sell, ["p1"]) }),
    "1 product still needs an AI video.",
  );
  assert.equal(reviewMissing({ intent: "sell", details: null, shortfall: null, readiness: readiness(sell, ["p1", "p2"]) }), null);
  // A Save runs no gate, posted to Innovations or not: the mint never waits for videos (owner, 2026-10-12).
  const save = { ...DEFAULT_MINT_STATE, intent: "save", collection: "Garden", confirmOwnership: true };
  assert.equal(reviewMissing({ intent: "save", details: null, shortfall: null, readiness: readiness(save, []) }), null);
  const posted = { ...save, shareToNewsfeed: true };
  assert.equal(reviewMissing({ intent: "save", details: null, shortfall: null, readiness: readiness(posted, []) }), null);
});

test("earnMintHref: the static mint route under Earn", () => {
  assert.equal(earnMintHref("proj_a"), "/projects/proj_a/earn/mint");
  assert.equal(earnMintHref("a b"), "/projects/a%20b/earn/mint");
  assert.ok(earnMintHref("proj_a").startsWith(earnHref("proj_a")));
});
