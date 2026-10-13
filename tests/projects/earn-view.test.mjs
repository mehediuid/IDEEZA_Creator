// The Earn area's pure facts (docs/superpowers/specs/2026-10-11-build-earn-p0-design.md,
// "Earn area", and the owner's 2026-10-11 redesign): the four tabs and their addresses, the old
// section addresses' redirects, the owner-only gate, the document title, the header's status
// pill, the Overview's path, card and facts, and Sell's "Your project" card, pair and copies.
// Compiled by tests/projects/tsconfig.json:
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canOpenEarn,
  EARN_STATUS_WORD,
  EARN_STEPS,
  earnDocTitle,
  earnLiveFactsOf,
  earnNextOf,
  earnPairOf,
  earnPathOf,
  earnStatusOf,
  editionProductsOf,
  mainRowStateOf,
} from "../../.tmp-test/lib/manual/earn-view.js";
import {
  EARN_PARTS,
  EARN_SECTION_LABEL,
  EARN_SECTIONS,
  earnHref,
  earnMintHref,
  earnSectionRedirectOf,
  isEarnSection,
} from "../../.tmp-test/lib/manual/earn-route.js";
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
const STATES = ["none", "minted", "given", "listed", "paused", "soldPartial", "soldOut"];

// ─────────────────────────── the tabs and their addresses ───────────────────────────

test("four tabs, in order: Overview · Sell · Business plan · Money", () => {
  assert.deepEqual([...EARN_SECTIONS], ["overview", "sell", "plan", "money"]);
  assert.deepEqual(EARN_SECTIONS.map((s) => EARN_SECTION_LABEL[s]), ["Overview", "Sell", "Business plan", "Money"]);
  for (const old of ["editions", "splits", "customers", "rights"]) assert.equal(isEarnSection(old), false, old);
});

test("a tab's address is its path; a part of a tab adds its id as the hash, after any query", () => {
  assert.equal(earnHref("proj_car"), "/projects/proj_car/earn");
  assert.equal(earnHref("proj_car", "overview"), "/projects/proj_car/earn");
  assert.equal(earnHref("proj_car", "sell", { list: "1" }), "/projects/proj_car/earn/sell?list=1");
  assert.equal(earnHref("proj_car", "plan"), "/projects/proj_car/earn/plan");
  assert.equal(earnHref("proj_car", "money"), "/projects/proj_car/earn/money");
  assert.equal(earnHref("proj_car", "copies"), "/projects/proj_car/earn/sell#copies");
  assert.equal(earnHref("proj_car", "splits"), "/projects/proj_car/earn/money#splits");
  assert.equal(earnHref("proj_car", "rights"), "/projects/proj_car/earn/money#rights");
  assert.equal(earnHref("proj_car", "customers", { sale: "sale_a" }), "/projects/proj_car/earn/money?sale=sale_a#customers");
  assert.equal(earnHref("a b", "customers"), "/projects/a%20b/earn/money#customers");
  assert.deepEqual(EARN_PARTS, { copies: "sell", splits: "money", customers: "money", rights: "money" });
  assert.ok(earnMintHref("proj_car").startsWith(earnHref("proj_car")), "the mint flow is under Earn");
});

test("the old section addresses redirect to their part of a tab; customers keeps sale= and nothing else", () => {
  assert.equal(earnSectionRedirectOf("proj_car", "editions"), "/projects/proj_car/earn/sell#copies");
  assert.equal(earnSectionRedirectOf("proj_car", "splits"), "/projects/proj_car/earn/money#splits");
  assert.equal(earnSectionRedirectOf("proj_car", "rights"), "/projects/proj_car/earn/money#rights");
  assert.equal(earnSectionRedirectOf("proj_car", "customers"), "/projects/proj_car/earn/money#customers");
  assert.equal(earnSectionRedirectOf("proj_car", "customers", { sale: "sale_a" }), "/projects/proj_car/earn/money?sale=sale_a#customers");
  assert.equal(earnSectionRedirectOf("proj_car", "customers", { sale: ["sale_b", "sale_c"] }), "/projects/proj_car/earn/money?sale=sale_b#customers");
  assert.equal(earnSectionRedirectOf("proj_car", "customers", { sale: "sale_a", view: "buyer" }), "/projects/proj_car/earn/money?sale=sale_a#customers");
  assert.equal(earnSectionRedirectOf("proj_car", "splits", { sale: "sale_a" }), "/projects/proj_car/earn/money#splits", "sale= is only Customers'");
  // The tabs themselves, an unknown segment and an inherited key are not moved.
  for (const seg of ["overview", "sell", "plan", "money", "mint", "nope", "constructor", "toString"]) {
    assert.equal(earnSectionRedirectOf("proj_car", seg, { sale: "sale_a" }), null, seg);
  }
});

// ─────────────────────────── the gate, the title and the status pill ───────────────────────────

test("only the owner opens the Earn area; every preview reads the gate state", () => {
  assert.equal(canOpenEarn(OWNER), true);
  assert.equal(canOpenEarn(BUYER_PREVIEW), false);
  assert.equal(canOpenEarn(CONTRIBUTOR), false);
  assert.equal(canOpenEarn({ kind: "demo-buyer", buyerId: "buyer-mira" }), false);
});

test("the document title names the tab, then Earn, then the project", () => {
  assert.equal(earnDocTitle("overview", "Smart planter"), "Earn · Smart planter · IDEEZA");
  assert.equal(earnDocTitle("sell", "Smart planter"), "Sell · Earn · Smart planter · IDEEZA");
  assert.equal(earnDocTitle("plan", "Smart planter"), "Business plan · Earn · Smart planter · IDEEZA");
  assert.equal(earnDocTitle("money", "Smart planter"), "Money · Earn · Smart planter · IDEEZA");
});

test("the header's one status pill says the commercial state in a maker's words", () => {
  assert.deepEqual(EARN_STATUS_WORD, {
    none: "Not for sale yet",
    minted: "Minted",
    listed: "On the marketplace",
    paused: "Listing paused",
    soldPartial: "Part sold",
    soldOut: "Sold out",
    given: "Given away",
  });
  assert.deepEqual(earnStatusOf("none"), { word: "Not for sale yet", tone: "neutral" });
  assert.deepEqual(earnStatusOf("minted"), { word: "Minted", tone: "neutral" });
  assert.deepEqual(earnStatusOf("paused"), { word: "Listing paused", tone: "neutral" });
  for (const s of ["listed", "soldPartial", "soldOut", "given"]) assert.equal(earnStatusOf(s).tone, "success", s);
  for (const s of STATES) assert.doesNotMatch(earnStatusOf(s).word, /brief|nft|outcome/i, s);
});

// ─────────────────────────── the Overview ───────────────────────────

test("the steps are Mint → Sell; minted is at Sell, and anything live has both done", () => {
  assert.deepEqual(EARN_STEPS.map((s) => s.label), ["Mint", "Sell"]);
  const states = (c) => earnPathOf(c).map((s) => s.state);
  assert.deepEqual(states("none"), ["current", "todo"]);
  assert.deepEqual(states("minted"), ["done", "current"]);
  for (const c of ["listed", "paused", "given", "soldPartial", "soldOut"]) assert.deepEqual(states(c), ["done", "done"], c);
  assert.deepEqual(earnPathOf("none").map((s) => s.n), [1, 2]);
  // Copies on sale without the Main NFT: something is live, so both are done.
  assert.deepEqual(earnPathOf("minted", true).map((s) => s.state), ["done", "done"]);
  assert.deepEqual(earnPathOf("none", true).map((s) => s.state), ["current", "todo"]);
});

test("the Overview's card: mint, then sell, each with its why; later states say where they're managed", () => {
  assert.deepEqual(earnNextOf("proj_car", "none"), {
    step: "mint",
    title: "Mint your project",
    why: "Minting creates a record that you own this design. It's free here and signed in the demo wallet.",
    point: "mint",
    verb: "mint",
    action: { label: "Start mint", href: "/projects/proj_car/earn/mint?intent=save" },
  });
  assert.deepEqual(earnNextOf("proj_car", "minted"), {
    step: "sell",
    title: "Sell your project",
    why: "Sell the whole project as its Main NFT, or Physical and Virtual copies of it or of each product.",
    point: "list",
    verb: "sell",
    action: { label: "Choose what to sell", href: "/projects/proj_car/earn/sell" },
  });
  // Copies on sale with no Main listing: the live card, managed in Sell.
  const copies = earnNextOf("proj_car", "minted", true);
  assert.equal(copies.point, null);
  assert.equal(copies.title, "Your copies are on the marketplace");
  assert.deepEqual(copies.action, { label: "Manage in Sell", href: "/projects/proj_car/earn/sell" });
  for (const state of ["given", "listed", "paused", "soldPartial", "soldOut"]) {
    const n = earnNextOf("proj_car", state);
    assert.equal(n.point, null, state);
    assert.equal(n.verb, null, state);
    assert.equal(n.step, "sell", state);
    assert.ok(earnPathOf(state).every((s) => s.state === "done"), `${state}: live, so both steps are done`);
    assert.match(n.action.href, /^\/projects\/proj_car\/earn\/(sell|money#customers)$/, state);
    assert.match(n.title, /^[A-Z][^—]*$/, n.title);
    assert.match(n.why, /^[A-Z][^—]*\.$/, n.why);
  }
  assert.equal(earnNextOf("proj_car", "soldOut").action.label, "See sales and payouts");
  assert.equal(earnNextOf("proj_car", "paused").action.label, "Relist in Sell");
  for (const s of STATES) {
    const n = earnNextOf("proj_car", s);
    assert.doesNotMatch(`${n.title} ${n.why} ${n.action.label}`, /brief|outcome|project nft/i, s);
  }
});

// ─────────────────────────── Sell › Whole project's Main row ───────────────────────────

test("the Main NFT row: its state in words and one button — Sell (mint or listing), Manage, or greyed", () => {
  const row = (o = {}) => mainRowStateOf({ status: "private", listing: { kind: "none" }, locked: false, canList: true, manage: true, ...o });
  assert.deepEqual(row({ status: "draft" }), { line: "Not minted yet", live: false, action: "mint", label: "Sell" });
  assert.deepEqual(row(), { line: "Not selling", live: false, action: "list", label: "Sell" });
  assert.equal(row({ canList: false }).action, "none");
  assert.equal(row({ listing: { kind: "ended", why: "removed" } }).line, "Not selling · the last listing ended");
  const live = row({ status: "listed", listing: { kind: "live", listing: listing(), auction: null } });
  assert.deepEqual(live, { line: "Listed · 0.05 MATIC · 10%", live: true, action: "manage", label: "Manage" });
  assert.equal(row({ status: "paused", listing: { kind: "paused", listing: listing(), changed: [] } }).action, "manage");
  assert.deepEqual(row({ status: "sold", locked: true, listing: { kind: "sold", listing: listing(), sale: sale() } }), {
    line: "Sold in full · it has a new owner",
    live: false,
    action: "disabled",
    label: "Sold",
  });
  assert.equal(row({ status: "given" }).action, "disabled");
});

// ─────────────────────────── Sell › Your project's pair ───────────────────────────

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
const BRIEF = "/projects/proj_car/earn/mint";
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

// ─────────────────────────── Sell › One product at a time ───────────────────────────

const product = (id, name, dropped = null) => ({ id, name, description: "", built: null, state: "hand", version: null, dropped });

test("Copies lists every current product, and a dropped one only while it has editions", () => {
  const dropped = { lastIn: 1, current: 2 };
  const products = [product("p1", "Planter"), product("p2", "Hub", dropped), product("p3", "Old lid", dropped)];
  const track = { id: "trk_1", projectId: "proj_car", productId: "p2", kind: "physical", use: "private" };
  assert.deepEqual(editionProductsOf(products, []).map((p) => p.id), ["p1"]);
  assert.deepEqual(editionProductsOf(products, [track]).map((p) => p.id), ["p1", "p2"]);
});

// ─────────────────────────── the Overview's live facts ───────────────────────────

test("the live card's facts: price, copies sold of the copies made (project and products), customers, and what the sales earned", () => {
  const live = { kind: "live", listing: listing(), auction: null };
  const track = (id, total) => ({ id, projectId: "proj_car", productId: "p1", kind: "virtual", use: "private", supply: { total } });
  const copy = (id, trackId, payout) => sale({ id, item: { nft: "virtual", trackId }, price: "0.02", payout });
  const facts = earnLiveFactsOf({
    projectId: "proj_car",
    commercial: "listed",
    listing: live,
    sales: [copy("s1", "t1", "0.0195"), copy("s2", "tw", "0.0195"), sale({ id: "s3", projectId: "proj_other" })],
    editions: [track("t1", 5), track("t2", 3), { ...track("tw", 2), productId: "project" }, { ...track("t9", 50), projectId: "proj_other" }],
    buyers: 1,
  });
  assert.deepEqual(facts, [
    { label: "Price", value: "0.05 MATIC" },
    { label: "Copies sold", value: "2 of 10" },
    { label: "Bought by", value: "1 person" },
    { label: "Earned", value: "0.039 MATIC" },
  ]);
  const given = earnLiveFactsOf({ projectId: "proj_car", commercial: "given", listing: { kind: "none" }, sales: [], editions: [], buyers: 0 });
  assert.deepEqual(given.map((f) => f.value), ["Free", "0", "Nobody yet", "Nothing yet"]);
  const auction = earnLiveFactsOf({
    projectId: "proj_car",
    commercial: "listed",
    listing: { kind: "live", listing: listing({ type: "auction", price: undefined, minBid: "0.1" }), auction: null },
    sales: [],
    editions: [],
    buyers: 0,
  });
  assert.equal(auction[0].value, "Auction from 0.1 MATIC");
  const sold = earnLiveFactsOf({
    projectId: "proj_car",
    commercial: "soldPartial",
    listing: { kind: "sold", listing: listing(), sale: sale() },
    sales: [sale()],
    editions: [],
    buyers: 1,
  });
  assert.deepEqual(sold.map((f) => f.value), ["0.05 MATIC", "0", "1 person", "0.04875 MATIC"]);
});
