// Task A4a — the Brief read and the Outcome (spec §5.1.4, COM-1, COM-2).
import { test } from "node:test";
import assert from "node:assert/strict";

const { parseBriefDraft, readBriefDraft, commerceOf, showcaseBackfillOf } = await import(
  "../../.tmp-test/lib/brief/project-brief.js"
);
const { DEFAULT_STATE, briefDraftKey, normalizeBrief, stepsFor } = await import("../../.tmp-test/lib/brief/types.js");

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

test("Phase 2 draft fields: normalizeBrief({}) gives a lazy mint, 10 % selling and no benefits (§3.3.5)", () => {
  const s = normalizeBrief({});
  assert.equal(s.mintType, "lazy");
  assert.equal(s.sellingPct, "10");
  assert.deepEqual(s.benefits, []);
  assert.deepEqual(
    [DEFAULT_STATE.mintType, DEFAULT_STATE.sellingPct, DEFAULT_STATE.benefits],
    ["lazy", "10", []],
  );
  // What was stored is kept; an unknown mint type reads as lazy (P2-MINT-4).
  assert.equal(normalizeBrief({ mintType: "instant" }).mintType, "instant");
  assert.equal(normalizeBrief({ mintType: "onChain" }).mintType, "lazy");
  assert.equal(normalizeBrief({ sellingPct: "25" }).sellingPct, "25");
  assert.equal(normalizeBrief({ sellingPct: 25 }).sellingPct, "10");
  // Benefits keep a valid duration; a half-typed name survives, a broken row is dropped.
  assert.deepEqual(
    normalizeBrief({
      benefits: [
        { id: "ben_a", name: "Exclusive group", duration: { months: 12 } },
        { id: "ben_b", name: "", duration: { whileHeld: true } },
        { id: "ben_c", name: "Bad", duration: { months: 2 } },
        { id: "", name: "No id", duration: { months: 1 } },
        "junk",
      ],
    }).benefits,
    [
      { id: "ben_a", name: "Exclusive group", duration: { months: 12 } },
      { id: "ben_b", name: "", duration: { whileHeld: true } },
    ],
  );
  // `understandGas` stays parseable and is ignored.
  assert.equal(normalizeBrief({ understandGas: true }).understandGas, true);
});

test("stepsFor: Give runs the preview before the form, like Sell; Save keeps it after (§2.6, P2-VIDEO-17)", () => {
  assert.deepEqual(stepsFor("give"), ["idea", "preview", "form", "success"]);
  assert.deepEqual(stepsFor("sell"), ["idea", "preview", "form", "success"]);
  assert.deepEqual(stepsFor("save"), ["idea", "form", "preview", "success"]);
  assert.deepEqual(stepsFor(null), ["idea"]);
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
  assert.deepEqual(commerceOf(project(), null), {
    outcome: "none",
    intent: null,
    mint: "notMinted",
    record: null,
  });
});

test("commerceOf: a Brief opened with no outcome chosen → none, with its step (COM-4, second subline)", () => {
  assert.deepEqual(commerceOf(project(), draft({}, "idea")), {
    outcome: "none",
    intent: null,
    step: "idea",
    mint: "notMinted",
    record: null,
  });
});

test("commerceOf: an unminted intent → briefing, and typed terms are not returned (COM-5)", () => {
  const d = draft({ intent: "give", license: "mit", collection: "Garden Sensors", network: "mumbai", price: "0.05" });
  assert.deepEqual(commerceOf(project(), d), {
    outcome: "briefing",
    intent: "give",
    step: "form",
    mint: "notMinted",
    record: null,
  });
});

test("commerceOf: minted save → private, with the minted facts and no sale or licence terms", () => {
  const d = draft(
    { intent: "save", mintedAt: MINTED, collection: "  Garden Sensors ", price: "0.05", license: "mit" },
    "success",
  );
  assert.deepEqual(commerceOf(project({ status: "completed" }), d), {
    outcome: "private",
    intent: "save",
    mint: "legacy",
    record: null,
    mintedAt: MINTED,
    network: { id: "baseSepolia", label: "Base Sepolia (Testnet)" },
    collection: "Garden Sensors",
  });
});

test("commerceOf: minted give → given, with the licence and its one-line terms (COM-10)", () => {
  const d = draft({ intent: "give", mintedAt: MINTED, network: "mumbai", license: "mit", price: "0.05" }, "success");
  assert.deepEqual(commerceOf(project({ status: "completed" }), d), {
    outcome: "given",
    intent: "give",
    mint: "legacy",
    record: null,
    mintedAt: MINTED,
    network: { id: "mumbai", label: "Mumbai Testnet (Polygon)" },
    license: { id: "mit", label: "MIT License", info: "Permissive; keep the notice, no warranty." },
  });
});

test("commerceOf: a minted sell keeps no sale terms — the price is the Marketplace block's (P2-LISTING-23)", () => {
  const d = draft(
    { intent: "sell", mintedAt: MINTED, listingType: "buyNow", token: "USDC", price: " 0.05 ", royalties: "10", collection: "Garden Sensors" },
    "success",
  );
  const c = commerceOf(project({ status: "completed" }), d);
  assert.deepEqual(c, {
    outcome: "listed",
    intent: "sell",
    mint: "legacy",
    record: null,
    mintedAt: MINTED,
    network: { id: "baseSepolia", label: "Base Sepolia (Testnet)" },
    collection: "Garden Sensors",
  });
  for (const gone of ["sale", "royaltiesPct", "clip"]) assert.equal(gone in c, false, gone);
  const auction = draft({ intent: "sell", mintedAt: MINTED, listingType: "auction", minBid: "0.02", expiresAt: "2026-10-03T14:30" });
  assert.equal("sale" in commerceOf(project(), auction), false);
});

test("commerceOf: a MintRecord wins over the draft — its axis, record, network and collection (P2-MINT-10)", () => {
  const lazy = {
    v: 1, demo: true, type: "lazy", network: "mumbai", collection: "Garden Lab", tokenId: 3,
    wallet: { account: 1, address: "0x955d0000000000000000000000000000000ed95" },
    at: MINTED, signedAt: MINTED, signature: "0xsig",
  };
  const d = draft({ intent: "sell", mintedAt: null, network: "baseSepolia", collection: "Typed only" }, "success");
  assert.deepEqual(commerceOf(project({ mint: lazy }), d), {
    outcome: "listed",
    intent: "sell",
    mint: "lazyMinted",
    record: lazy,
    mintedAt: MINTED,
    network: { id: "mumbai", label: "Mumbai Testnet (Polygon)" },
    collection: "Garden Lab",
  });
  // With no draft at all, a record still reads minted (Private, intent unknown).
  assert.equal(commerceOf(project({ mint: lazy }), null).outcome, "private");
  // Its first Main sale settles it on chain — derived, never written (C12).
  const sale = { id: "sale_a", projectId: "proj_a", at: MINTED + 1000, item: { nft: "main", sharePct: 10 }, txHash: "0xtx" };
  const settled = commerceOf(project({ mint: lazy }), d, [sale]);
  assert.equal(settled.mint, "onChain");
  assert.deepEqual(settled.settled, { at: MINTED + 1000, txHash: "0xtx", via: "sale" });
  assert.equal(commerceOf(project({ mint: lazy }), d, [{ ...sale, projectId: "proj_b" }]).mint, "lazyMinted");
});

test("commerceOf: completed with no mint in the draft → mintedUnreadable, claiming nothing else (COM-15)", () => {
  const expected = { outcome: "mintedUnreadable", intent: null, mint: "legacy", record: null };
  assert.deepEqual(commerceOf(project({ status: "completed" }), null), expected);
  const reopened = draft({ intent: "sell", videoJobId: "vj_1" }, "preview");
  assert.deepEqual(commerceOf(project({ status: "completed" }), reopened), expected);
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
