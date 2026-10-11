// Build and Earn P1-1: the write and delete guards. Engineering's registry
// (lib/manual/guards.ts) and commerce's three guards (lib/commerce/guards.ts),
// proven equal to the rules they replace — editGateOf, projectLockOf, and
// deleteBlockOf over the page's own delete facts.
import { test } from "node:test";
import assert from "node:assert/strict";

const G = await import("../../.tmp-test/lib/manual/guards.js");
const { commerceDeleteGuard, listingGuard, registerCommerceGuards, soldInFullGuard } = await import(
  "../../.tmp-test/lib/commerce/guards.js"
);
const { editGateOf, projectLockOf } = await import("../../.tmp-test/lib/manual/edit-gate.js");
const { listingViewOf } = await import("../../.tmp-test/lib/market/listing.js");
const { projectView } = await import("../../.tmp-test/lib/manual/project-read.js");
const { deleteBlockOf } = await import("../../.tmp-test/lib/manual/permissions.js");
const { EMPTY_MARKET } = await import("../../.tmp-test/lib/manual/project-summary.js");
const { WRITE_ERROR_MESSAGE } = await import("../../.tmp-test/lib/storage-status.js");

// ── fixtures, in the stored shapes ──
const MIN = 60_000;
const NOW = Date.UTC(2026, 9, 28, 16, 0);
const LISTED = NOW - 6 * 60 * MIN;
const SOLD = NOW - 5 * 60 * MIN;
const FLOW = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };
const lazy = {
  v: 1, demo: true, type: "lazy", network: "mumbai", collection: "Cars", tokenId: 1,
  wallet: { account: 1, address: "0xmaker" }, at: LISTED - MIN, signedAt: LISTED - MIN, signature: "0xsig",
};
const project = (over = {}) => ({
  id: "proj_car", slug: "car", name: "Car", productName: "RC Car", description: "A car.", status: "completed",
  createdAt: LISTED - 60 * MIN, updatedAt: LISTED - 60 * MIN, flowState: FLOW, mint: lazy,
  products: [{ id: "p1", name: "RC Car", description: "A car." }], ...over,
});
const META = { name: "Car", description: "A car.", products: [{ id: "p1", name: "RC Car" }], cover: null, at: LISTED };
const listing = (over = {}) => ({
  id: "lst_a", projectId: "proj_car", slot: "main", source: "page", listedAt: LISTED, updatedAt: LISTED,
  type: "buyNow", token: "MATIC", price: "0.05", percentSelling: 10, royaltiesPct: 10, mintingType: "lazy",
  network: "mumbai", collection: "Cars", benefits: [], metadata: META, status: "live",
  events: [{ kind: "listed", at: LISTED }], ...over,
});
const auction = (over = {}) => listing({ type: "auction", price: undefined, minBid: "0.02", endsAt: NOW + 134 * MIN, ...over });
const sale = (sharePct, over = {}) => ({
  id: `sale_${sharePct}`, listingId: "lst_a", projectId: "proj_car", at: SOLD, buyerId: "buyer-mira",
  buyerAddress: "0xmira", sellerAddress: "0xmaker", item: { nft: "main", sharePct }, via: "buyNow", token: "MATIC",
  price: "0.05", fees: { ideezaBps: 250, ideeza: "0.00125", network: { coin: "MATIC", amount: "0.021" } },
  payout: "0.04875", royaltiesPct: 10, mint: "lazy", mintedAtSale: true, tokenId: 1, network: "mumbai",
  collection: "Cars", benefits: [], txHash: `0x${"b".repeat(64)}`, demo: true, ...over,
});
const ana = { id: "ctb_ana00001", name: "Ana Silva", role: "coOwner", share: 30, addedAt: LISTED - 30 * MIN };
const track = (listed) => ({
  id: "ed_a", projectId: "proj_car", productId: "p1", kind: "physical", use: "private", supply: { total: 5 },
  createdAt: LISTED, lazy: true, demo: true,
  listing: listed ? { token: "MATIC", regular: "0.01", extended: "0.02", royaltyPct: 5, listedAt: LISTED, updatedAt: LISTED } : null,
});
const market = (o = {}) => ({ ...EMPTY_MARKET, ...o });

/** A CommerceSource over plain data; `writes` records every listings write. */
function source(m, opts = {}) {
  const state = { market: m, writes: [], editions: opts.editions ?? [] };
  return {
    state,
    market: () => state.market,
    writeListings: (next) => {
      if (opts.refuse) return { ok: false };
      state.writes.push(next);
      state.market = { ...state.market, listings: next };
      return { ok: true };
    },
    editions: () => state.editions,
    subscribe: () => () => {},
  };
}

const NO_METADATA = { name: "", description: "", products: [], cover: null, at: 0 };
/** What useProjectEditGate's gateFor answered before P1-1. */
function oldGate(p, m, now, change) {
  const view = listingViewOf(p.id, { listings: m.listings, sales: m.sales, bids: m.bids, now, current: NO_METADATA });
  return editGateOf({ listing: view, lock: projectLockOf(p, m.sales) }, change);
}

const MARKETS = {
  none: market(),
  live: market({ listings: [listing()] }),
  paused: market({ listings: [listing({ status: "paused", pause: { at: NOW - MIN, changes: ["rename"] } })] }),
  removed: market({ listings: [listing({ status: "removed", endedAt: NOW - MIN })] }),
  auction: market({ listings: [auction()] }),
  auctionEnded: market({ listings: [auction({ endsAt: NOW - MIN })] }),
  soldPartly: market({ listings: [listing()], sales: [sale(10)] }),
  soldInFull: market({ listings: [listing({ percentSelling: 100 })], sales: [sale(100)] }),
  soldInFullRelisted: market({
    listings: [listing({ percentSelling: 100 }), listing({ id: "lst_b", listedAt: SOLD + MIN, events: [{ kind: "listed", at: SOLD + MIN }] })],
    sales: [sale(100)],
  }),
  coOwnerAndSale: market({ listings: [listing({ percentSelling: 70 })], sales: [sale(70)] }),
  unreadable: market({ unreadable: true }),
};
const PROJECTS = { alone: project(), withAna: project({ contributors: [ana] }) };
const CHANGES = ["rename", "description", "cover", "addProduct", "editProduct", "dropProduct"];

// ─────────────────────────── the registry ───────────────────────────

const guard = (id, verdict, extra = {}) => ({ id, check: () => verdict, ...extra });

test("decideWrite: the strongest verdict wins, whatever the order — locked, blocked, confirm, free", () => {
  const p = { id: "x", createdAt: 0, contributors: [] };
  const free = guard("free", { kind: "free" });
  const confirm = guard("confirm", { kind: "confirm", listingId: "l" });
  const blocked = guard("blocked", { kind: "blocked", reason: "b" });
  const locked = guard("locked", { kind: "locked", reason: "l" });
  assert.deepEqual(G.decideWrite(p, "rename", 0, []), { verdict: { kind: "free" }, guard: null });
  assert.deepEqual(G.decideWrite(p, "rename", 0, [free, confirm]).verdict, { kind: "confirm", listingId: "l" });
  assert.equal(G.decideWrite(p, "rename", 0, [confirm, free]).guard, confirm);
  assert.equal(G.writeVerdictOf(p, "rename", 0, [blocked, confirm]).kind, "blocked");
  assert.equal(G.writeVerdictOf(p, "rename", 0, [confirm, locked, blocked]).kind, "locked");
  assert.equal(G.decideWrite(p, "rename", 0, [locked, guard("locked2", { kind: "locked", reason: "2" })]).guard, locked);
});

test("lockOf asks only the guards that can lock; deleteBlockOfGuards takes the first block", () => {
  const p = { id: "x", createdAt: 0, contributors: [] };
  const gate = guard("gate", { kind: "blocked", reason: "auction" });
  const lock = guard("lock", { kind: "locked", reason: "sold" }, { lockOf: () => ({ kind: "locked", reason: "sold" }) });
  assert.equal(G.lockOf(p, [gate]), null);
  assert.deepEqual(G.lockOf(p, [gate, lock]), { kind: "locked", reason: "sold" });
  const block = { id: "sold", reason: "r", detail: "d" };
  assert.equal(G.deleteBlockOfGuards(p, 0, [{ id: "a", check: () => null }]), null);
  assert.equal(G.deleteBlockOfGuards(p, 0, [{ id: "a", check: () => null }, { id: "b", check: () => block }]), block);
});

test("register: one guard per id, a replacement keeps its place, and a stale unregister does nothing", () => {
  const a = guard("t.a", { kind: "free" });
  const b = guard("t.b", { kind: "free" });
  const a2 = guard("t.a", { kind: "free" });
  const offA = G.registerWriteGuard(a);
  const offB = G.registerWriteGuard(b);
  const offA2 = G.registerWriteGuard(a2);
  assert.deepEqual(G.writeGuardsNow().map((g) => g), [a2, b]);
  offA();
  assert.deepEqual(G.writeGuardsNow(), [a2, b]);
  offA2();
  offB();
  assert.deepEqual(G.writeGuardsNow(), []);
  const d = { id: "t.d", check: () => null };
  const offD = G.registerDeleteGuard(d);
  assert.deepEqual(G.deleteGuardsNow(), [d]);
  offD();
  assert.deepEqual(G.deleteGuardsNow(), []);
});

test("the snapshot stays the same object until a guard's snapshot changes or the registry does", () => {
  let data = { n: 1 };
  const listeners = new Set();
  const g = {
    ...guard("t.snap", { kind: "free" }),
    snapshot: () => data,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    unreadable: () => data.n === 3,
  };
  const calls = [];
  const unsubscribe = G.subscribeGuards(() => calls.push("change"));
  const off = G.registerWriteGuard(g);
  assert.deepEqual(calls, ["change"], "a registration is a change");
  assert.equal(listeners.size, 1, "and the new guard's records are subscribed");
  const s1 = G.guardsSnapshot();
  assert.equal(G.guardsSnapshot(), s1);
  data = { n: 2 };
  for (const l of listeners) l();
  assert.deepEqual(calls, ["change", "change"]);
  assert.notEqual(G.guardsSnapshot(), s1);
  assert.notEqual(G.guardsSnapshot(), G.SERVER_GUARDS);
  assert.equal(G.guardsUnreadable(), false);
  data = { n: 3 };
  assert.equal(G.guardsUnreadable(), true);
  unsubscribe();
  assert.equal(listeners.size, 0);
  off();
});

// ─────────────────────────── commerce's guards, against the old rules ───────────────────────────

test("sold in full + listing = editGateOf, for every project, market and change", () => {
  for (const [pName, p] of Object.entries(PROJECTS)) {
    for (const [mName, m] of Object.entries(MARKETS)) {
      const src = source(m);
      const guards = [soldInFullGuard(src), listingGuard(src)];
      for (const change of CHANGES) {
        assert.deepEqual(G.writeVerdictOf(p, change, NOW, guards), oldGate(p, m, NOW, change), `${pName} · ${mName} · ${change}`);
      }
    }
  }
});

test("the lock: lockOf is projectLockOf's line, and only for a 100 % sale", () => {
  for (const [pName, p] of Object.entries(PROJECTS)) {
    for (const [mName, m] of Object.entries(MARKETS)) {
      const lock = projectLockOf(p, m.sales);
      const g = soldInFullGuard(source(m));
      assert.deepEqual(g.lockOf(p), lock ? { kind: "locked", reason: lock.line } : null, `${pName} · ${mName}`);
    }
  }
  assert.equal(soldInFullGuard(source(MARKETS.soldInFull)).lockOf(PROJECTS.alone).kind, "locked");
  assert.equal(soldInFullGuard(source(MARKETS.soldPartly)).lockOf(PROJECTS.alone), null);
  assert.equal(soldInFullGuard(source(MARKETS.coOwnerAndSale)).lockOf(PROJECTS.withAna).kind, "locked", "Ana's 30 % + 70 % sold");
});

test("a guard asked before the projects store hydrates still answers the listing gate", () => {
  const stub = { id: "proj_car", createdAt: 0, contributors: [] };
  const src = source(MARKETS.live);
  assert.deepEqual(G.writeVerdictOf(stub, "rename", NOW, [soldInFullGuard(src), listingGuard(src)]), {
    kind: "confirm",
    listingId: "lst_a",
  });
});

test("unreadable: both write guards say so when the market can't be read", () => {
  const src = source(MARKETS.unreadable);
  assert.equal(G.guardsUnreadable([soldInFullGuard(src), listingGuard(src)]), true);
  assert.equal(G.guardsUnreadable([soldInFullGuard(source(MARKETS.none))]), false);
});

test("the listing guard's confirm pauses the live Buy now, and its undo puts it back", () => {
  const src = source(MARKETS.live);
  const g = listingGuard(src);
  const step = g.confirm(PROJECTS.alone, "addProduct", NOW);
  assert.equal(step.ok, true);
  assert.equal(src.state.writes.length, 1);
  const paused = src.state.market.listings[0];
  assert.equal(paused.status, "paused");
  assert.deepEqual(paused.pause, { at: NOW, changes: ["addProduct"] });
  assert.equal(step.undo(), true);
  assert.deepEqual(src.state.market.listings, MARKETS.live.listings, "back exactly as it was");
  assert.equal(step.undo(), true, "nothing paused any more: nothing to write");
  assert.equal(src.state.writes.length, 2);
});

test("the listing guard's confirm: a refused write says why and pauses nothing; no live Buy now is a no-op", () => {
  const refused = source(MARKETS.live, { refuse: true });
  assert.deepEqual(listingGuard(refused).confirm(PROJECTS.alone, "rename", NOW), { ok: false, reason: WRITE_ERROR_MESSAGE });
  assert.equal(refused.state.market.listings[0].status, "live");
  const none = source(MARKETS.none);
  const step = listingGuard(none).confirm(PROJECTS.alone, "rename", NOW);
  assert.equal(step.ok, true);
  assert.equal(step.undo(), true);
  assert.equal(none.state.writes.length, 0);
});

test("the delete guard = deleteBlockOf over the page's own delete facts", () => {
  const cases = {
    ...MARKETS,
    editionListed: market({ listings: [listing({ status: "removed", endedAt: NOW - MIN })] }),
  };
  for (const [pName, p] of Object.entries(PROJECTS)) {
    for (const [mName, m] of Object.entries(cases)) {
      const editions = mName === "editionListed" ? [track(true)] : [track(false)];
      const page = projectView(p, { builds: [], chats: [], brief: null, videoJobs: [], now: NOW, market: m, editions });
      const expected = deleteBlockOf(page.deleteFacts);
      assert.deepEqual(commerceDeleteGuard(source(m, { editions })).check(p, NOW), expected, `${pName} · ${mName}`);
    }
  }
  assert.equal(commerceDeleteGuard(source(MARKETS.none)).check(PROJECTS.withAna, NOW).id, "otherOwners");
  assert.equal(commerceDeleteGuard(source(MARKETS.none)).check(PROJECTS.alone, NOW), null);
});

test("registerCommerceGuards: the lock before the listing gate, and the delete gate; all go on unregister", () => {
  const src = source(MARKETS.soldInFullRelisted);
  const Confirm = () => null;
  const off = registerCommerceGuards(src, Confirm);
  assert.deepEqual(G.writeGuardsNow().map((g) => g.id), ["commerce.soldInFull", "commerce.listing"]);
  assert.deepEqual(G.deleteGuardsNow().map((g) => g.id), ["commerce.delete"]);
  assert.equal(G.writeGuardsNow()[1].Confirm, Confirm);
  // Sold in full and relisted: the lock wins over the live listing's confirm.
  assert.equal(G.writeVerdictOf(PROJECTS.alone, "rename", NOW).kind, "locked");
  assert.equal(G.lockOf(PROJECTS.alone).kind, "locked");
  assert.equal(G.deleteBlockOfGuards(PROJECTS.alone, NOW).id, "sold");
  off();
  assert.deepEqual(G.writeGuardsNow(), []);
  assert.deepEqual(G.deleteGuardsNow(), []);
});
