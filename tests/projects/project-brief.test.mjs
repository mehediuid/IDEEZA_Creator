// Task A4a — the Brief read and the Outcome (spec §5.1.4, COM-1, COM-2).
import { test } from "node:test";
import assert from "node:assert/strict";

const { parseBriefDraft, readBriefDraft, commerceOf, showcaseBackfillOf } = await import(
  "../../.tmp-test/lib/brief/project-brief.js"
);
const { briefDraftKey } = await import("../../.tmp-test/lib/brief/types.js");

const NOW = Date.UTC(2026, 8, 26, 12, 0);
const MINTED = Date.UTC(2026, 8, 22, 21, 9);

const project = (over = {}) => ({
  id: "proj_a",
  slug: "garden-sensors",
  name: "Garden sensors",
  productName: "Soil probe",
  description: "",
  status: "draft",
  createdAt: 1,
  updatedAt: 1,
  flowState: { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false },
  ...over,
});
/** A draft as the Brief stores it, read back through the one parser. */
const draft = (state, step = "form") => parseBriefDraft(JSON.stringify({ state, step }));
const job = (over = {}) => ({
  id: "vj_1",
  title: "Soil probe",
  prompt: "",
  quality: "low",
  stage: "rendering",
  startedAt: NOW,
  stageStartedAt: NOW,
  emailReminder: null,
  browserNotify: false,
  acknowledged: false,
  minted: true,
  ...over,
});
const NONE = { state: "none" };

test("parseBriefDraft: no draft, and every corrupt draft, reads as null", () => {
  const corrupt = [
    null,
    "",
    "{not json",
    "null",
    "42",
    "[]",
    JSON.stringify({ step: "form" }),
    JSON.stringify({ state: "sell", step: "form" }),
    JSON.stringify({ state: [1, 2], step: "form" }),
  ];
  for (const raw of corrupt) assert.equal(parseBriefDraft(raw), null, String(raw));
});

test("parseBriefDraft runs normalizeBrief and normalizeStep, so an older draft reads on today's model", () => {
  const d = parseBriefDraft(
    JSON.stringify({
      state: { intent: "sell", network: "polygon", token: "ETH", royalties: 0, mintedAt: MINTED },
      step: 3,
    }),
  );
  assert.equal(d.step, "form"); // a draft from before the steps had names stored 1–4
  assert.equal(d.state.network, "mumbai"); // the testnet migration
  assert.equal(d.state.token, "MATIC"); // ETH isn't carried on Mumbai
  assert.equal(d.state.royalties, ""); // an old 0 meant "nothing typed"
  assert.equal(d.state.mintedAt, MINTED);
  assert.equal(d.state.shareToNewsfeed, false); // defaults fill what the draft never had
  assert.equal(parseBriefDraft(JSON.stringify({ state: {}, step: "nope" })).step, "idea");
});

test("readBriefDraft reads the project's own key; no browser, or a throwing storage, reads as null", () => {
  assert.equal(readBriefDraft("proj_a"), null); // node has no window
  assert.equal(briefDraftKey("proj_a"), "ideeza:brief:draft:proj_a");
  const store = new Map([
    ["ideeza:brief:draft:proj_a", JSON.stringify({ state: { intent: "give" }, step: "idea" })],
  ]);
  globalThis.window = { localStorage: { getItem: (k) => store.get(k) ?? null } };
  try {
    assert.equal(readBriefDraft("proj_a").state.intent, "give");
    assert.equal(readBriefDraft("proj_a").step, "idea");
    assert.equal(readBriefDraft("proj_b"), null);
    globalThis.window = {
      localStorage: {
        getItem: () => {
          throw new Error("SecurityError");
        },
      },
    };
    assert.equal(readBriefDraft("proj_a"), null);
  } finally {
    delete globalThis.window;
  }
});

test("commerceOf: no draft → none, no step (COM-4, first subline)", () => {
  assert.deepEqual(commerceOf(project(), null, [], NOW), {
    outcome: "none",
    intent: null,
    mint: "notMinted",
    clip: NONE,
  });
});

test("commerceOf: a Brief opened with no outcome chosen → none, with its step (COM-4, second subline)", () => {
  assert.deepEqual(commerceOf(project(), draft({}, "idea"), [], NOW), {
    outcome: "none",
    intent: null,
    step: "idea",
    mint: "notMinted",
    clip: NONE,
  });
});

test("commerceOf: an unminted intent → briefing, and typed terms are not returned (COM-5)", () => {
  const d = draft({ intent: "give", license: "mit", collection: "Garden Sensors", network: "mumbai", price: "0.05" });
  assert.deepEqual(commerceOf(project(), d, [], NOW), {
    outcome: "briefing",
    intent: "give",
    step: "form",
    mint: "notMinted",
    clip: NONE,
  });
});

test("commerceOf: minted save → private, with the minted facts and no sale or licence terms", () => {
  const d = draft(
    { intent: "save", mintedAt: MINTED, collection: "  Garden Sensors ", price: "0.05", license: "mit" },
    "success",
  );
  assert.deepEqual(commerceOf(project({ status: "completed" }), d, [], NOW), {
    outcome: "private",
    intent: "save",
    mint: "minted",
    mintedAt: MINTED,
    network: { id: "baseSepolia", label: "Base Sepolia (Testnet)" },
    collection: "Garden Sensors",
    clip: NONE,
  });
});

test("commerceOf: minted give → given, with the licence and its one-line terms (COM-10)", () => {
  const d = draft({ intent: "give", mintedAt: MINTED, network: "mumbai", license: "mit", price: "0.05" }, "success");
  assert.deepEqual(commerceOf(project({ status: "completed" }), d, [], NOW), {
    outcome: "given",
    intent: "give",
    mint: "minted",
    mintedAt: MINTED,
    network: { id: "mumbai", label: "Mumbai Testnet (Polygon)" },
    license: { id: "mit", label: "MIT License", info: "Permissive; keep the notice, no warranty." },
    clip: NONE,
  });
});

test("commerceOf: minted sell at a fixed price → listed, with its price, token and royalties (COM-9)", () => {
  const d = draft(
    { intent: "sell", mintedAt: MINTED, listingType: "buyNow", token: "USDC", price: " 0.05 ", royalties: "10", collection: "Garden Sensors" },
    "success",
  );
  assert.deepEqual(commerceOf(project({ status: "completed" }), d, [], NOW), {
    outcome: "listed",
    intent: "sell",
    mint: "minted",
    mintedAt: MINTED,
    network: { id: "baseSepolia", label: "Base Sepolia (Testnet)" },
    collection: "Garden Sensors",
    sale: { kind: "buyNow", token: "USDC", price: "0.05" },
    royaltiesPct: 10,
    clip: NONE,
  });
});

test("commerceOf: a listing's price is returned only when one is set", () => {
  for (const price of ["", "   ", "0", "abc"]) {
    const c = commerceOf(project(), draft({ intent: "sell", mintedAt: MINTED, price }), [], NOW);
    assert.equal(c.outcome, "listed");
    assert.equal("sale" in c, false, JSON.stringify(price));
  }
});

test("commerceOf: an auction carries its bids and end, and says when the end has passed (COM-9)", () => {
  const endsAt = new Date("2026-10-03T14:30").getTime(); // datetime-local: local wall-clock time
  const d = draft({
    intent: "sell",
    mintedAt: MINTED,
    listingType: "auction",
    minBid: "0.02",
    auctionBuyNow: "0.10",
    expiresAt: "2026-10-03T14:30",
    royalties: "2.5",
  });
  const before = commerceOf(project(), d, [], endsAt - 1);
  assert.deepEqual(before.sale, { kind: "auction", token: "ETH", minBid: "0.02", buyNow: "0.10", endsAt, ended: false });
  assert.equal(before.royaltiesPct, 2.5);
  assert.equal(commerceOf(project(), d, [], endsAt).sale.ended, true);

  const noBuyNow = draft({ intent: "sell", mintedAt: MINTED, listingType: "auction", minBid: "0.02", expiresAt: "2026-10-03T14:30" });
  assert.equal("buyNow" in commerceOf(project(), noBuyNow, [], NOW).sale, false);

  const noEnd = draft({ intent: "sell", mintedAt: MINTED, listingType: "auction", minBid: "0.02", expiresAt: "" });
  assert.equal("sale" in commerceOf(project(), noEnd, [], NOW), false);
});

test("commerceOf: royalties outside the form's range are not shown", () => {
  for (const royalties of ["15", "1", "", "ten"]) {
    const c = commerceOf(project(), draft({ intent: "sell", mintedAt: MINTED, price: "1", royalties }), [], NOW);
    assert.equal("royaltiesPct" in c, false, royalties);
  }
});

test("commerceOf: completed with no mint in the draft → mintedUnreadable, claiming nothing else (COM-15)", () => {
  const expected = { outcome: "mintedUnreadable", intent: null, mint: "minted", clip: NONE };
  assert.deepEqual(commerceOf(project({ status: "completed" }), null, [], NOW), expected);
  const reopened = draft({ intent: "sell", videoJobId: "vj_1" }, "preview");
  assert.deepEqual(commerceOf(project({ status: "completed" }), reopened, [job()], NOW), expected);
});

test("commerceOf: the preview clip, from the render store (COM-13)", () => {
  const minted = draft({ intent: "save", mintedAt: MINTED, videoJobId: "vj_1" }, "success");
  const clip = (jobs, now = NOW) => commerceOf(project(), minted, jobs, now).clip;
  assert.deepEqual(clip([job()]), { state: "rendering", progress: 0, eta: "under a minute" });
  // 15 s in at the demo speed (×40) is 600 of the 1,200 budgeted seconds.
  assert.deepEqual(clip([job({ startedAt: NOW - 15_000, stageStartedAt: NOW - 15_000 })]), {
    state: "rendering",
    progress: 50,
    eta: "under a minute",
  });
  assert.deepEqual(clip([job({ stage: "done" })]), { state: "ready" });
  assert.deepEqual(clip([job({ stage: "failed" })]), { state: "failed" });
  assert.deepEqual(clip([job({ id: "vj_other" })]), NONE); // a job the store no longer has
  assert.deepEqual(commerceOf(project(), draft({ intent: "save", mintedAt: MINTED }), [job()], NOW).clip, NONE);
});

test("showcaseBackfillOf: an older mint with Share to Innovations gets the mint time once; null is never overwritten", () => {
  const ticked = draft({ intent: "save", mintedAt: MINTED, shareToNewsfeed: true }, "success");
  assert.equal(showcaseBackfillOf(project({ status: "completed" }), ticked), MINTED);
  assert.equal(showcaseBackfillOf(project({ status: "completed", showcasedAt: null }), ticked), null);
  assert.equal(showcaseBackfillOf(project({ status: "completed", showcasedAt: NOW }), ticked), null);
  const unticked = draft({ intent: "save", mintedAt: MINTED, shareToNewsfeed: false }, "success");
  assert.equal(showcaseBackfillOf(project({ status: "completed" }), unticked), null);
  assert.equal(showcaseBackfillOf(project(), draft({ intent: "save", shareToNewsfeed: true })), null); // not minted
  assert.equal(showcaseBackfillOf(project({ status: "completed" }), null), null);
});
