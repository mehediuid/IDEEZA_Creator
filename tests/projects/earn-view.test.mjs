// The Earn area's pure facts (docs/superpowers/specs/2026-10-11-build-earn-p0-design.md,
// "Earn area"): the owner-only gate, the document title, the Overview's "Ready to earn" rows
// and gate badges, the Project NFT section's pair and the Editions section's products.
// Compiled by tests/projects/tsconfig.json:
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EARN_OPTIONS,
  GATE_TEXT,
  canOpenEarn,
  earnDocTitle,
  earnPairOf,
  editionProductsOf,
  readyRowsOf,
} from "../../.tmp-test/lib/manual/earn-view.js";
import { EARN_GROUPS, EARN_SECTIONS, earnHref } from "../../.tmp-test/lib/manual/earn-route.js";
import { readinessOf } from "../../.tmp-test/lib/manual/readiness.js";
import { EMPTY_MARKET, NO_SHARE_TO_SELL, projectSummary } from "../../.tmp-test/lib/manual/project-summary.js";
import { normalizeBrief, normalizeStep } from "../../.tmp-test/lib/brief/types.js";
import { demoAddress } from "../../.tmp-test/lib/wallet/demo-wallet.js";

const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const MIN = 60_000;
const NOW = at(2026, 10, 11, 16, 0);
const MINTED = at(2026, 10, 2, 21, 9);
const LISTED = at(2026, 10, 9, 10, 0);

const OWNER = { kind: "local-owner" };
const BUYER_PREVIEW = { kind: "owner-preview" };
const CONTRIBUTOR = { kind: "contributor-preview", contributorId: "ctb_ana", name: "Ana Silva", role: "coOwner", share: 30 };

// ─────────────────────────── the gate and the title ───────────────────────────

test("only the owner opens the Earn area; every preview reads the gate state", () => {
  assert.equal(canOpenEarn(OWNER), true);
  assert.equal(canOpenEarn(BUYER_PREVIEW), false);
  assert.equal(canOpenEarn(CONTRIBUTOR), false);
  assert.equal(canOpenEarn({ kind: "demo-buyer", buyerId: "buyer-mira" }), false);
});

test("the document title names the section, then Earn, then the project", () => {
  assert.equal(earnDocTitle("overview", "Smart planter"), "Earn · Smart planter · IDEEZA");
  assert.equal(earnDocTitle("sell", "Smart planter"), "Project NFT · Earn · Smart planter · IDEEZA");
  assert.equal(earnDocTitle("plan", "Smart planter"), "Business plan · Earn · Smart planter · IDEEZA");
});

test("the sub-navigation's groups hold every section once, overview first", () => {
  const flat = EARN_GROUPS.flatMap((g) => g.sections);
  assert.deepEqual([...flat].sort(), [...EARN_SECTIONS].sort());
  assert.equal(flat[0], "overview");
  assert.equal(EARN_GROUPS[0].label, null);
});

test("the Earn links the area reads: ?list=1 on Project NFT and a sale on Customers", () => {
  assert.equal(earnHref("proj_car", "sell", { list: "1" }), "/projects/proj_car/earn/sell?list=1");
  assert.equal(earnHref("proj_car", "customers", { sale: "sale_a" }), "/projects/proj_car/earn/customers?sale=sale_a");
  assert.equal(earnHref("proj_car"), "/projects/proj_car/earn");
});

// ─────────────────────────── "Ready to earn" ───────────────────────────

const product = (id, name, dropped = null) => ({ id, name, description: "", built: null, state: "hand", version: null, dropped });
const CLIP = { mime: "video/webm", width: 640, height: 360, durationMs: 10_000, bytes: 1 };
const readyVideo = (id) => ({
  takes: [{ id, productId: "x", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 10_000, readyAt: NOW - 5_000, clip: CLIP }],
  inUseId: id,
});
const facts = (o = {}) => ({
  products: [product("p1", "Planter"), product("p2", "Hub")],
  videos: { products: {} },
  jobs: [],
  now: NOW,
  status: "private",
  ownershipConfirmed: true,
  license: null,
  ...o,
});
const readinessFor = (f) => ({ sell: readinessOf(f, "sell"), showcase: readinessOf(f, "showcase") });

test("the rows are the Sell gate's videos and ownership, in that order, then Minted", () => {
  const f = facts();
  const rows = readyRowsOf(readinessFor(f));
  assert.deepEqual(rows.map((r) => r.id), ["videos", "ownership", "minted"]);
  assert.deepEqual(rows.map((r) => r.label), ["Product videos", "Ownership", "Minted"]);
  // The Earn button's "N of M ready" counts the Sell rules, so they are the first M rows.
  const sell = readinessOf(f, "sell").rules;
  assert.deepEqual(rows.slice(0, sell.length).map((r) => [r.id, r.ok]), sell.map((r) => [r.id, r.ok]));
});

test("a draft with two products missing videos and no ownership confirmed fails every row, with each rule's reason", () => {
  const rows = readyRowsOf(readinessFor(facts({ status: "draft", ownershipConfirmed: false })));
  assert.deepEqual(rows.map((r) => r.ok), [false, false, false]);
  assert.equal(rows[0].reason, "2 products still need an AI video.");
  assert.equal(rows[1].reason, "Confirm you are the rightful owner of this idea.");
  assert.match(rows[2].reason, /^Mint it first/);
});

test("a minted project with every video ready and ownership confirmed passes every row, with no reasons", () => {
  const rows = readyRowsOf(readinessFor(facts({ videos: { products: { p1: readyVideo("t1"), p2: readyVideo("t2") } } })));
  assert.deepEqual(rows.map((r) => [r.ok, r.reason]), [[true, null], [true, null], [true, null]]);
});

test("a dropped product needs no video (COR-108), as the Sell gate says", () => {
  const rows = readyRowsOf(readinessFor(facts({ products: [product("p1", "Planter"), product("p2", "Hub", { lastIn: 1, current: 2 })], videos: { products: { p1: readyVideo("t1") } } })));
  assert.equal(rows.find((r) => r.id === "videos").ok, true);
});

// ─────────────────────────── the option cards ───────────────────────────

test("Sell and Editions carry the Wallet badge; the plan, splits and customers need no wallet", () => {
  const gates = Object.fromEntries(EARN_OPTIONS.map((o) => [o.section, o.gate]));
  assert.deepEqual(gates, { sell: "wallet", editions: "wallet", plan: "none", splits: "none", customers: "none" });
  assert.equal(GATE_TEXT.wallet.label, "Wallet");
  assert.equal(GATE_TEXT.none.label, "No wallet");
});

test("the cards follow the sub-navigation's order and copy is sentence case with no em-dash", () => {
  const order = EARN_GROUPS.flatMap((g) => g.sections).filter((s) => EARN_OPTIONS.some((o) => o.section === s));
  assert.deepEqual(EARN_OPTIONS.map((o) => o.section), order);
  for (const o of EARN_OPTIONS) {
    assert.match(o.title, /^[A-Z][a-z ]+$/, o.title);
    assert.doesNotMatch(o.body, /—/, o.body);
  }
});

// ─────────────────────────── the Project NFT pair ───────────────────────────

const FLOW = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };
const project = (over = {}) => ({
  id: "proj_car", slug: "car", name: "Car", productName: "RC Car", description: "A car.", status: "completed",
  createdAt: at(2026, 9, 20), updatedAt: at(2026, 9, 20), flowState: FLOW,
  products: [{ id: "p1", name: "RC Car", description: "A car." }], ...over,
});
const draft = (state, step = "success") => ({ state: normalizeBrief(state), step: normalizeStep(step) });
const lazy = {
  v: 1, demo: true, type: "lazy", network: "mumbai", collection: "Cars", tokenId: 1,
  wallet: { account: 1, address: demoAddress("maker-1") }, at: MINTED, signedAt: MINTED, signature: "0xsig",
};
const META = { name: "Car", description: "A car.", products: [{ id: "p1", name: "RC Car" }], cover: null, at: LISTED };
const listing = (over = {}) => ({
  id: "lst_a", projectId: "proj_car", slot: "main", source: "page", listedAt: LISTED, updatedAt: LISTED,
  type: "buyNow", token: "MATIC", price: "0.05", percentSelling: 10, royaltiesPct: 10, mintingType: "lazy",
  network: "mumbai", collection: "Cars", benefits: [], metadata: META, status: "live",
  events: [{ kind: "listed", at: LISTED }], ...over,
});
const sale = (over = {}) => ({
  id: "sale_a", listingId: "lst_a", projectId: "proj_car", at: LISTED + MIN, buyerId: "buyer-mira",
  buyerAddress: demoAddress("buyer-mira"), sellerAddress: demoAddress("maker-1"), item: { nft: "main", sharePct: 10 },
  via: "buyNow", token: "MATIC", price: "0.05",
  fees: { ideezaBps: 250, ideeza: "0.00125", network: { coin: "MATIC", amount: "0.021" } }, payout: "0.04875",
  royaltiesPct: 10, mint: "lazy", mintedAtSale: true, tokenId: 1, network: "mumbai", collection: "Cars",
  benefits: [], txHash: `0x${"b".repeat(64)}`, demo: true, ...over,
});
const SELL = draft({ intent: "sell", mintedAt: MINTED, network: "mumbai" });
const BRIEF = "/project/car/brief";
const build = (id, chatId, createdAt, over = {}) => ({
  id, chatId, conceptImageUrl: "", conceptPrompt: "", title: "RC Car", summary: "", parts: [], conceptNumber: "1",
  status: "running", estimateMin: 1, creditsCharged: true, creditsRefunded: false,
  items: ["3d", "pcb", "code", "wiring", "parts"].map((kind) => ({ kind, status: "ready", progress: 100 })),
  companions: [], createdAt, updatedAt: createdAt, ...over,
});

/** The pair for one project, with the CanContext the page would pass. */
function pairFor(p, brief, { market = EMPTY_MARKET, builds = [], viewer = OWNER } = {}) {
  const s = projectSummary(p, { builds, brief, videoJobs: [], now: NOW, market });
  const ctx = { status: s.status, listing: s.listing.kind, creatorPct: s.ownership.maker, locked: s.lock !== null };
  return { s, pair: earnPairOf(p, s, brief, viewer, ctx) };
}
const kinds = (pair) => [pair.first?.kind ?? null, pair.second?.kind ?? null, pair.violet];

test("a draft with a newer version waiting gets its Brief entry here: Review version stays on the project page", () => {
  const built = project({
    status: "draft", buildId: "b1", builds: [{ buildId: "b1", chatId: "c1", version: 1, savedAt: at(2026, 9, 20) }],
    products: [{ id: "p1", name: "RC Car", description: "A car.", source: { buildId: "b1", productId: "primary" } }],
  });
  const builds = [build("b1", "c1", at(2026, 9, 20) - MIN, { projectId: "proj_car" }), build("b2", "c1", at(2026, 9, 25))];
  const { s, pair } = pairFor(built, null, { builds });
  assert.equal(s.next.first.kind, "review-version", "the header still reviews the version");
  assert.deepEqual(pair, { first: { kind: "add-brief", label: "Add Brief", href: BRIEF }, second: null, violet: true });
});

test("a draft's Brief started → Continue Brief, violet", () => {
  assert.deepEqual(kinds(pairFor(project({ status: "draft" }), draft({ intent: "sell" }, "preview")).pair), ["continue-brief", null, true]);
});

test("private → Add to marketplace (violet) then View brief, as the header had it", () => {
  const { pair } = pairFor(project({ mint: lazy }), SELL);
  assert.deepEqual(kinds(pair), ["add-to-marketplace", "view-brief", true]);
  assert.equal(pair.first.label, "Add to marketplace");
});

test("private with every share held by co-owners → the blocked start still shows to the owner, quiet", () => {
  const { pair } = pairFor(project({ mint: lazy, contributors: [{ id: "ctb_ana", name: "Ana Silva", role: "coOwner", share: 100, addedAt: 1 }] }), SELL);
  assert.deepEqual(kinds(pair), ["add-to-marketplace", "view-brief", false]);
  assert.equal(pair.first.blocked, NO_SHARE_TO_SELL);
});

test("listed → View brief only; sold with a share left → List another share; sold in full → View brief", () => {
  assert.deepEqual(kinds(pairFor(project({ mint: lazy }), SELL, { market: { ...EMPTY_MARKET, listings: [listing()] } }).pair), ["view-brief", null, false]);
  const partial = pairFor(project({ mint: lazy }), SELL, { market: { ...EMPTY_MARKET, listings: [listing()], sales: [sale()] } }).pair;
  assert.deepEqual(kinds(partial), ["add-to-marketplace", "view-brief", false]);
  assert.equal(partial.first.label, "List another share");
  const full = { ...EMPTY_MARKET, listings: [listing({ percentSelling: 100 })], sales: [sale({ item: { nft: "main", sharePct: 100 } })] };
  assert.deepEqual(kinds(pairFor(project({ mint: lazy }), SELL, { market: full }).pair), ["view-brief", null, false]);
});

test("a preview gets no pair at all (PPL-6)", () => {
  assert.deepEqual(kinds(pairFor(project({ mint: lazy }), SELL, { viewer: BUYER_PREVIEW }).pair), [null, null, true]);
  assert.deepEqual(kinds(pairFor(project({ status: "draft" }), null, { viewer: CONTRIBUTOR }).pair), [null, null, true]);
});

// ─────────────────────────── Editions ───────────────────────────

test("Editions lists every current product, and a dropped one only while it has editions", () => {
  const dropped = { lastIn: 1, current: 2 };
  const products = [product("p1", "Planter"), product("p2", "Hub", dropped), product("p3", "Old lid", dropped)];
  const track = { id: "trk_1", projectId: "proj_car", productId: "p2", kind: "physical", use: "private" };
  assert.deepEqual(editionProductsOf(products, []).map((p) => p.id), ["p1"]);
  assert.deepEqual(editionProductsOf(products, [track]).map((p) => p.id), ["p1", "p2"]);
});
