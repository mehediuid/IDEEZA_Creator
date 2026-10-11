// Build and Earn P1-1: the two status axes — engineeringStateOf
// (lib/manual/engineering-state.ts) and commercialStateOf
// (lib/commerce/state.ts) — and projectStatus, now derived from them, proven
// equal to the function it replaced on every fixture.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL, DAY, MIN, T, build, items } from "./fixtures/projects.mjs";

const { engineeringStateOf } = await import("../../.tmp-test/lib/manual/engineering-state.js");
const { commercialFactsOf, commercialStateOf } = await import("../../.tmp-test/lib/commerce/state.js");
const { projectStatus, projectSummary, EMPTY_MARKET } = await import("../../.tmp-test/lib/manual/project-summary.js");
const { listingViewOf } = await import("../../.tmp-test/lib/market/listing.js");
const { normalizeBrief, normalizeStep } = await import("../../.tmp-test/lib/brief/types.js");

/** projectStatus as it was before P1-1, verbatim (project-summary.ts at 95a115b). */
function oldProjectStatus(p, draft, facts = {}) {
  const listing = facts.listing ?? { kind: "none" };
  if (listing.kind === "live") return "listed";
  if (listing.kind === "paused") return "paused";
  if (listing.kind === "sold" || (facts.sales ?? []).some((s) => s.projectId === p.id && s.item.nft === "main")) return "sold";
  const minted = p.mint !== undefined || (draft?.state.mintedAt ?? null) !== null;
  if (minted) return draft?.state.intent === "give" ? "given" : "private";
  return p.status === "completed" ? "minted" : "draft";
}

// ── market fixtures for any project id ──
const NOW = T + 30 * DAY;
const LISTED = NOW - 6 * 60 * MIN;
const lazy = {
  v: 1, demo: true, type: "lazy", network: "mumbai", collection: "Cars", tokenId: 1,
  wallet: { account: 1, address: "0xmaker" }, at: LISTED - MIN,
};
const listing = (projectId, over = {}) => ({
  id: `lst_${projectId}`, projectId, slot: "main", source: "page", listedAt: LISTED, updatedAt: LISTED,
  type: "buyNow", token: "MATIC", price: "0.05", percentSelling: 10, royaltiesPct: 10, mintingType: "lazy",
  network: "mumbai", collection: "Cars", benefits: [],
  metadata: { name: "", description: "", products: [], cover: null, at: LISTED }, status: "live",
  events: [{ kind: "listed", at: LISTED }], ...over,
});
const sale = (projectId, sharePct, over = {}) => ({
  id: `sale_${projectId}_${sharePct}`, listingId: `lst_${projectId}`, projectId, at: LISTED + MIN, buyerId: "buyer-mira",
  buyerAddress: "0xmira", sellerAddress: "0xmaker", item: { nft: "main", sharePct }, via: "buyNow", token: "MATIC",
  price: "0.05", fees: { ideezaBps: 250, ideeza: "0.00125", network: { coin: "MATIC", amount: "0.021" } },
  payout: "0.04875", royaltiesPct: 10, mint: "lazy", mintedAtSale: true, tokenId: 1, network: "mumbai",
  collection: "Cars", benefits: [], txHash: "0xtx", demo: true, ...over,
});
const editionSale = (projectId) =>
  sale(projectId, 0, {
    id: `sale_${projectId}_ed`,
    listingId: "ed_a",
    item: { nft: "virtual", trackId: "ed_a", productId: "p1", productName: "X", use: "private", tier: "regular", serial: 1 },
  });

/** Every market shape the status reads, for project `id`. */
function marketsFor(id) {
  return {
    none: EMPTY_MARKET,
    live: { ...EMPTY_MARKET, listings: [listing(id)] },
    auction: { ...EMPTY_MARKET, listings: [listing(id, { type: "auction", price: undefined, minBid: "0.02", endsAt: NOW + 60 * MIN })] },
    paused: { ...EMPTY_MARKET, listings: [listing(id, { status: "paused", pause: { at: NOW - MIN, changes: ["rename"] } })] },
    removed: { ...EMPTY_MARKET, listings: [listing(id, { status: "removed", endedAt: NOW - MIN })] },
    soldPartly: { ...EMPTY_MARKET, listings: [listing(id)], sales: [sale(id, 10)] },
    soldInFull: { ...EMPTY_MARKET, listings: [listing(id, { percentSelling: 100 })], sales: [sale(id, 100)] },
    saleOnly: { ...EMPTY_MARKET, sales: [sale(id, 40)] },
    editionOnly: { ...EMPTY_MARKET, sales: [editionSale(id)] },
    otherProject: { ...EMPTY_MARKET, listings: [listing("someone-else")], sales: [sale("someone-else", 100)] },
  };
}

const draft = (state, step = "success") => ({ state: normalizeBrief(state), step: normalizeStep(step) });
const DRAFTS = {
  none: null,
  sellMinted: draft({ intent: "sell", mintedAt: LISTED - MIN }),
  giveMinted: draft({ intent: "give", mintedAt: LISTED - MIN, license: "mit" }),
  saveMinted: draft({ intent: "save", mintedAt: LISTED - MIN }),
  sellUnminted: draft({ intent: "sell" }, "form"),
  giveUnminted: draft({ intent: "give" }, "form"),
};

// ─────────────────────────── commercialStateOf ───────────────────────────

const facts = (o = {}) => ({ listing: "none", mainSale: false, soldOut: false, minted: false, intent: null, ...o });

test("commercialStateOf: §3.2's precedence, first match wins", () => {
  assert.equal(commercialStateOf(facts()), "none");
  assert.equal(commercialStateOf(facts({ intent: "give" })), "none", "an intent alone isn't a mint");
  assert.equal(commercialStateOf(facts({ minted: true })), "minted");
  assert.equal(commercialStateOf(facts({ minted: true, intent: "sell" })), "minted");
  assert.equal(commercialStateOf(facts({ minted: true, intent: "give" })), "given");
  assert.equal(commercialStateOf(facts({ minted: true, mainSale: true })), "soldPartial");
  assert.equal(commercialStateOf(facts({ minted: true, mainSale: true, soldOut: true })), "soldOut");
  assert.equal(commercialStateOf(facts({ listing: "sold", minted: true })), "soldPartial");
  assert.equal(commercialStateOf(facts({ listing: "ended", minted: true })), "minted");
  assert.equal(commercialStateOf(facts({ listing: "paused", mainSale: true, soldOut: true })), "paused", "paused beats sold");
  assert.equal(commercialStateOf(facts({ listing: "live", mainSale: true, intent: "give" })), "listed", "live beats all");
});

test("commercialFactsOf: the mint from the record or the draft; only this project's Main sales; the lock as soldOut", () => {
  const p = { id: "p", createdAt: 0, contributors: [], mint: lazy };
  assert.deepEqual(commercialFactsOf(p, null), facts({ minted: true }));
  assert.equal(commercialFactsOf({ ...p, mint: undefined }, DRAFTS.sellMinted).minted, true);
  assert.equal(commercialFactsOf({ ...p, mint: undefined }, DRAFTS.sellUnminted).minted, false);
  assert.equal(commercialFactsOf(p, DRAFTS.giveMinted).intent, "give");
  const m = marketsFor("p");
  assert.equal(commercialFactsOf(p, null, { sales: m.editionOnly.sales }).mainSale, false);
  assert.equal(commercialFactsOf(p, null, { sales: m.otherProject.sales }).mainSale, false);
  assert.deepEqual(commercialFactsOf(p, null, { sales: m.soldPartly.sales }), facts({ minted: true, mainSale: true }));
  assert.deepEqual(commercialFactsOf(p, null, { sales: m.soldInFull.sales }), facts({ minted: true, mainSale: true, soldOut: true }));
  const coOwned = { ...p, contributors: [{ id: "ctb_ana00001", name: "Ana", role: "coOwner", share: 60, addedAt: 0 }] };
  assert.equal(commercialFactsOf(coOwned, null, { sales: m.saleOnly.sales }).soldOut, true, "Ana's 60 % + 40 % sold");
});

// ─────────────────────────── projectStatus, against the old function ───────────────────────────

test("projectStatus matches the old function on every fixture, market, draft, mint and record status", () => {
  let n = 0;
  for (const fx of ALL) {
    for (const [mName, m] of Object.entries(marketsFor(fx.project.id))) {
      const view = listingViewOf(fx.project.id, { listings: m.listings, sales: m.sales, bids: m.bids, now: NOW, current: { name: "", description: "", products: [], cover: null, at: NOW } });
      const factSets = { both: { listing: view, sales: m.sales }, listingOnly: { listing: view }, salesOnly: { sales: m.sales }, neither: {} };
      for (const [dName, d] of Object.entries({ fixture: fx.draft, ...DRAFTS })) {
        for (const mint of [undefined, lazy]) {
          for (const status of ["draft", "completed"]) {
            const p = { ...fx.project, status, ...(mint ? { mint } : null) };
            if (!mint) delete p.mint;
            for (const [fName, f] of Object.entries(factSets)) {
              assert.equal(projectStatus(p, d, f), oldProjectStatus(p, d, f), `${fx.name} · ${mName} · ${dName} · ${mint ? "record" : "no record"} · ${status} · ${fName}`);
              n += 1;
            }
          }
        }
      }
    }
  }
  assert.ok(n > 3000, `${n} cases`);
});

test("projectStatus on the summary: My projects' card reads the same word as before, fixture by fixture", () => {
  for (const fx of ALL) {
    for (const m of Object.values(marketsFor(fx.project.id))) {
      const s = projectSummary(fx.project, { builds: fx.builds, brief: fx.draft, videoJobs: [], now: NOW, market: m });
      assert.equal(s.status, oldProjectStatus(fx.project, fx.draft, { listing: s.listing, sales: m.sales.filter((x) => x.projectId === fx.project.id) }), fx.name);
    }
  }
});

// ─────────────────────────── engineeringStateOf ───────────────────────────

const byName = (name) => ALL.find((f) => f.name === name);

test("engineeringStateOf: made by hand is empty; a saved build is built, at its newest version", () => {
  const hand = byName("a legacy hand-made project");
  assert.deepEqual(engineeringStateOf(hand.project, { builds: hand.builds }), { state: "empty", version: 0, headAhead: false });
  const bot = byName("a chat rebuilt twice");
  assert.deepEqual(engineeringStateOf(bot.project, { builds: bot.builds }), { state: "built", version: 3, headAhead: false });
  const four = byName("a 4-product build");
  assert.deepEqual(engineeringStateOf(four.project, { builds: four.builds }), { state: "built", version: 1, headAhead: false });
  const gone = byName("a project whose build was purged");
  assert.deepEqual(engineeringStateOf(gone.project, { builds: gone.builds }), { state: "built", version: 1, headAhead: false }, "the refs stay");
  const pot = byName("a project minted to sell and showcased");
  assert.deepEqual(engineeringStateOf(pot.project, { builds: pot.builds }), { state: "built", version: 1, headAhead: false }, "a legacy link counts");
});

test("engineeringStateOf: a newer build of its chat puts the head ahead; building while it's queued or running", () => {
  const four = byName("a 4-product build");
  const next = (status, over = {}) => build({ id: `b-drone-${status}`, chatId: "c-drone", title: "Survey Drone", createdAt: T + DAY, status, ...over });
  const running = next("running", { items: items("running") });
  const withNext = (b) => engineeringStateOf(four.project, { builds: [...four.builds, b] });
  assert.deepEqual(withNext(running), { state: "building", version: 1, headAhead: true });
  assert.deepEqual(withNext(next("queued")), { state: "building", version: 1, headAhead: true });
  const failed = next("failed");
  assert.deepEqual(withNext(failed), { state: "built", version: 1, headAhead: true }, "waiting for a retry");
  // Every piece ready: ready to save, not building.
  const ready = build({ id: "b-drone-ready", chatId: "c-drone", title: "Survey Drone", createdAt: T + DAY });
  assert.deepEqual(withNext(ready), { state: "built", version: 1, headAhead: true });
  // Saved into a project that's gone: pending only once the live list says so.
  const elsewhere = { ...ready, projectId: "p-deleted" };
  assert.equal(withNext(elsewhere).headAhead, false);
  assert.equal(engineeringStateOf(four.project, { builds: [...four.builds, elsewhere], projects: [four.project] }).headAhead, true);
});

test("engineeringStateOf agrees with the summary's own facts on every fixture (P0's stage line reads them)", () => {
  for (const fx of ALL) {
    const s = projectSummary(fx.project, { builds: fx.builds, brief: fx.draft, videoJobs: [], now: NOW });
    const e = engineeringStateOf(fx.project, { builds: fx.builds });
    assert.equal(e.state === "empty", s.source.kind === "hand", fx.name);
    assert.equal(e.state === "building", s.pendingVersion?.status === "running" || s.pendingVersion?.status === "queued", fx.name);
    assert.equal(e.headAhead, s.pendingVersion !== null, fx.name);
    if (s.version?.kind === "single") assert.equal(e.version, s.version.v, fx.name);
  }
});
