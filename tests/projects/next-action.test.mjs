// T10 — nextAction() v2 (Phase 2 spec §2.2's table, §3.6.3): every row of the
// action pair, the card's one button, and the kinds that no longer exist.
// Compiled by tests/projects/tsconfig.json:
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_MARKET,
  NO_SHARE_TO_SELL,
  cardText,
  nextAction,
  projectSummary,
} from "../../.tmp-test/lib/manual/project-summary.js";
import { normalizeBrief, normalizeStep } from "../../.tmp-test/lib/brief/types.js";
import { demoAddress } from "../../.tmp-test/lib/wallet/demo-wallet.js";

const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const MIN = 60_000;
const NOW = at(2026, 9, 28, 16, 0);
const MINTED = at(2026, 9, 22, 21, 9);
const LISTED = at(2026, 9, 28, 10, 0);

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
const market = (o = {}) => ({ ...EMPTY_MARKET, ...o });
const SELL = draft({ intent: "sell", mintedAt: MINTED, network: "mumbai" });
const pairOf = (p, brief, m = EMPTY_MARKET, extra = {}) =>
  projectSummary(p, { builds: [], brief, videoJobs: [], now: NOW, market: m, ...extra }).next;

const BRIEF = "/project/car/brief";
const LIST = "/projects/proj_car?list=1";
const viewBrief = { kind: "view-brief", label: "View brief", href: BRIEF };
const add = { kind: "add-to-marketplace", label: "Add to marketplace", href: LIST };
const violet = (first, second = null) => ({ first, second, violet: true, card: first });
const quiet = (first, second = null) => ({ first, second, violet: false, card: null });
const NEVER = new Set(["open-editor", "relist", "view-listing"]);

/** §2.2, row by row. Each row: the facts, the pair, and the card's button. */
const build = (id, chatId, createdAt, over = {}) => ({
  id, chatId, conceptImageUrl: "", conceptPrompt: "", title: "RC Car", summary: "", parts: [], conceptNumber: "1",
  status: "running", estimateMin: 1, creditsCharged: true, creditsRefunded: false,
  items: ["3d", "pcb", "code", "wiring", "parts"].map((kind) => ({ kind, status: "ready", progress: 100 })),
  companions: [], createdAt, updatedAt: createdAt, ...over,
});
const built = project({
  status: "draft", buildId: "b1", builds: [{ buildId: "b1", chatId: "c1", version: 1, savedAt: at(2026, 9, 20) }],
  products: [{ id: "p1", name: "RC Car", description: "A car.", source: { buildId: "b1", productId: "primary" } }],
});
const BUILDS = [build("b1", "c1", at(2026, 9, 20) - MIN, { projectId: "proj_car" }), build("b2", "c1", at(2026, 9, 25))];
const coOwnerAll = { id: "ctb_ana", name: "Ana Silva", role: "coOwner", share: 100, addedAt: 1 };
const paused = listing({ status: "paused", pause: { at: NOW - MIN, changes: ["rename"] } });
const ROWS = [
  {
    name: "Draft, a newer version ready → ★ Review version n",
    pair: projectSummary(built, { builds: BUILDS, brief: null, videoJobs: [], now: NOW }).next,
    want: violet({ kind: "review-version", label: "Review version 2", href: "/build/b2" }),
  },
  {
    name: "Draft, Brief started → ★ Continue Brief",
    pair: pairOf(project({ status: "draft" }), draft({ intent: "sell" }, "preview")),
    want: violet({ kind: "continue-brief", label: "Continue Brief", href: BRIEF }),
  },
  {
    name: "Draft, no Brief, by hand → ★ Add Brief",
    pair: pairOf(project({ status: "draft" }), null),
    want: violet({ kind: "add-brief", label: "Add Brief", href: BRIEF }),
  },
  {
    name: "Draft, no Brief, from a build → ★ Add Brief",
    pair: projectSummary(built, { builds: [BUILDS[0]], brief: null, videoJobs: [], now: NOW }).next,
    want: violet({ kind: "add-brief", label: "Add Brief", href: BRIEF }),
  },
  { name: "Private, never listed → ★ Add to marketplace · View brief", pair: pairOf(project({ mint: lazy }), SELL), want: violet(add, viewBrief) },
  {
    name: "Private, the listing removed → ★ Add to marketplace · View brief",
    pair: pairOf(project({ mint: lazy }), SELL, market({ listings: [listing({ status: "removed", endedAt: NOW })] })),
    want: violet(add, viewBrief),
  },
  {
    name: "Private, an auction closed with no bids → ★ Add to marketplace · View brief",
    pair: pairOf(project({ mint: lazy }), SELL, market({ listings: [listing({ type: "auction", status: "closed", endsAt: NOW - 60 * MIN, endedAt: NOW })] })),
    want: violet(add, viewBrief),
  },
  {
    name: "Private, the maker holds 0 % → Add to marketplace, blocked, no violet",
    pair: pairOf(project({ mint: lazy, contributors: [coOwnerAll] }), SELL),
    want: quiet({ ...add, blocked: NO_SHARE_TO_SELL }, viewBrief),
  },
  { name: "Given → View brief (quiet)", pair: pairOf(project(), draft({ intent: "give", mintedAt: MINTED, license: "mit" })), want: quiet(viewBrief) },
  { name: "Listed · Buy now → View brief (quiet)", pair: pairOf(project({ mint: lazy }), SELL, market({ listings: [listing()] })), want: quiet(viewBrief) },
  {
    name: "Listed · auction running → View brief (quiet)",
    pair: pairOf(project({ mint: lazy }), SELL, market({ listings: [listing({ type: "auction", endsAt: NOW + 5 * 60 * MIN })] })),
    want: quiet(viewBrief),
  },
  {
    name: "Listed · auction ended, not closed → View brief (quiet; Close is the rail's)",
    pair: pairOf(project({ mint: lazy }), SELL, market({ listings: [listing({ type: "auction", endsAt: NOW - MIN })] })),
    want: quiet(viewBrief),
  },
  { name: "Paused → View brief (quiet; Relist is the rail's)", pair: pairOf(project({ mint: lazy }), SELL, market({ listings: [paused] })), want: quiet(viewBrief) },
  {
    name: "Sold, the maker still holds a share → List another share (quiet) · View brief",
    pair: pairOf(project({ mint: lazy }), SELL, market({ listings: [listing()], sales: [sale()] })),
    want: quiet({ kind: "add-to-marketplace", label: "List another share", href: LIST }, viewBrief),
  },
  {
    name: "Sold in full (locked) → View brief (quiet)",
    pair: pairOf(project({ mint: lazy }), SELL, market({ listings: [listing({ percentSelling: 100 })], sales: [sale({ item: { nft: "main", sharePct: 100 } })] })),
    want: quiet(viewBrief),
  },
  { name: "Minted, record unreadable → no pair", pair: pairOf(project(), null), want: quiet(null) },
];

for (const row of ROWS) {
  test(`§2.2 · ${row.name}`, () => {
    assert.deepEqual(row.pair, row.want);
    // `card` is `first` when violet, else null (§3.6.3) — a card never shows "View …".
    assert.deepEqual(row.pair.card, row.pair.violet ? row.pair.first : null);
    for (const a of [row.pair.first, row.pair.second]) if (a) assert.ok(!NEVER.has(a.kind), a.kind);
  });
}

test("§3.6.3 · the kinds open-editor, relist and view-listing never appear, in any state", () => {
  const kinds = ROWS.flatMap((r) => [r.pair.first?.kind, r.pair.second?.kind]).filter(Boolean);
  assert.ok(kinds.length > 0);
  for (const k of kinds) assert.ok(!NEVER.has(k), k);
  // Every §2.2 kind is reached.
  assert.deepEqual(
    [...new Set(kinds)].sort(),
    ["add-brief", "add-to-marketplace", "continue-brief", "review-version", "view-brief"],
  );
});

test("§2.5 · the card's button is the pair's violet step, with its accessible name; no button otherwise", () => {
  const s = projectSummary(project({ mint: lazy }), { builds: [], brief: SELL, videoJobs: [], now: NOW });
  assert.deepEqual(cardText(s, NOW).action, { ...add, ariaLabel: "Add to marketplace for Car" });
  const listed = projectSummary(project({ mint: lazy }), { builds: [], brief: SELL, videoJobs: [], now: NOW, market: market({ listings: [listing()] }) });
  assert.equal(cardText(listed, NOW).action, null);
});

test("§3.6.3 · the facts are optional: a v1 caller gets the maker holding everything, nothing locked", () => {
  const p = project({ mint: lazy });
  const base = { status: "private", brief: SELL, source: { kind: "hand" }, pending: null };
  assert.deepEqual(nextAction(p, base), violet(add, viewBrief));
  assert.deepEqual(nextAction(p, { ...base, creatorPct: 0 }), quiet({ ...add, blocked: NO_SHARE_TO_SELL }, viewBrief));
  assert.deepEqual(nextAction(p, { ...base, status: "sold", creatorPct: 40 }).first.label, "List another share");
  assert.deepEqual(nextAction(p, { ...base, status: "sold", creatorPct: 0, locked: true }), quiet(viewBrief));
});

test("R2-8 · View brief only for a brief that minted: a project minted from its page has none to open", () => {
  // Minted and listed from the page: no brief draft at all.
  assert.deepEqual(pairOf(project({ mint: lazy }), null), violet(add));
  assert.deepEqual(pairOf(project({ mint: lazy }), null, market({ listings: [listing()] })), quiet(null));
  const full = market({ listings: [listing({ percentSelling: 100 })], sales: [sale({ item: { nft: "main", sharePct: 100 } })] });
  assert.deepEqual(pairOf(project({ mint: lazy }), null, full), quiet(null), "locked, minted from the page");
  // A draft that never minted would open an editable Step 1 on a minted project.
  const started = draft({ intent: "sell" }, "form");
  assert.deepEqual(pairOf(project({ mint: lazy }), started), violet(add));
  assert.deepEqual(pairOf(project({ mint: lazy }), started, full), quiet(null));
  // A brief that minted keeps it, locked or not.
  assert.deepEqual(pairOf(project({ mint: lazy }), SELL, full), quiet(viewBrief));
});
