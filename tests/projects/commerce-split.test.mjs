// Build and Earn P1-1: storage migration commerce-split@1 and the commerce
// record (lib/commerce/migrate.ts, lib/commerce/record.ts) — migrate, rerun,
// partial data, the dual read (the new key wins) and dual write, rollback
// reads, and delete — plus the projects store's record hooks
// (lib/manual/record-hooks.ts) that carry them.
import { test } from "node:test";
import assert from "node:assert/strict";

const { COMMERCE_SPLIT, MIGRATIONS_KEY, migrateCommerceSplit } = await import("../../.tmp-test/lib/commerce/migrate.js");
const R = await import("../../.tmp-test/lib/commerce/record.js");
const { readThroughHooks, registerProjectRecordHooks, wroteThroughHooks } = await import(
  "../../.tmp-test/lib/manual/record-hooks.js"
);
const { normalizeProjects, projectsFromStorage, PROJECTS_KEY } = await import("../../.tmp-test/lib/manual/projects.js");
const { dispatchProjectDeleted } = await import("../../.tmp-test/lib/manual/events.js");

/** localStorage over a Map; `refuse` keys throw on setItem (a full browser), `log` records writes. */
class FakeStorage {
  constructor(entries = {}, refuse = []) {
    this.map = new Map(Object.entries(entries));
    this.refuse = new Set(refuse);
    this.log = [];
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    if (this.refuse.has(k)) throw new Error("QuotaExceededError");
    this.log.push(["set", k]);
    this.map.set(k, String(v));
  }
  removeItem(k) {
    this.log.push(["remove", k]);
    this.map.delete(k);
  }
}

const NOW = Date.UTC(2026, 9, 11, 9, 0);
const FLOW = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };
const mint = (over = {}) => ({
  v: 1, demo: true, type: "lazy", network: "mumbai", collection: "Cars", tokenId: 1,
  wallet: { account: 1, address: "0xmaker" }, at: NOW - 3600_000, ...over,
});
const legal = {
  rights: [
    { id: "patent", kind: "patent", text: "US 1234" },
    { id: "copyright", kind: "copyright", text: "© 2026 Maker" },
  ],
  updatedAt: NOW - 1000,
};
const ana = { id: "ctb_ana00001", name: "Ana Silva", role: "coOwner", share: 30, addedAt: NOW - 5000 };
const leo = { id: "ctb_leo00001", name: "Leo Park", role: "editor", share: 0, addedAt: NOW - 4000 };
const project = (id, over = {}) => ({
  id, slug: id, name: id, productName: "", description: "", status: "draft",
  createdAt: NOW - 86_400_000, updatedAt: NOW - 86_400_000, flowState: FLOW, ...over,
});
const OLD = [
  project("p-full", { mint: mint(), contributors: [ana, leo], legal, ownerConfirmedAt: NOW - 2000, showcasedAt: NOW - 1500 }),
  project("p-legal", { legal }),
  project("p-none", { showcasedAt: NOW }),
  project("p-badmint", { mint: { v: 1, demo: true, type: "lazy", tokenId: "seven" }, ownerConfirmedAt: NOW - 10 }),
];
const seeded = (list = OLD, extra = {}) => new FakeStorage({ [PROJECTS_KEY]: JSON.stringify(list), ...extra });
const keyOf = (store, id) => JSON.parse(store.getItem(R.commerceKey(id)));

// ─────────────────────────── the record ───────────────────────────

test("commerceRecordOf: the four commerce fields, shares by contributor id; showcasedAt stays out", () => {
  const p = OLD[0];
  assert.deepEqual(R.commerceRecordOf(p), {
    v: 1,
    mint: p.mint,
    shares: { [ana.id]: 30, [leo.id]: 0 },
    legal,
    ownerConfirmedAt: NOW - 2000,
  });
  assert.deepEqual(R.commerceRecordOf(OLD[1]), { v: 1, legal });
  assert.equal(R.commerceRecordOf(OLD[2]), null);
  assert.equal(R.commerceRecordOf(project("p-empty", { contributors: [] })), null, "everyone removed: no shares to keep");
});

test("normalizeCommerceRecord: each field through its own check; not a record → null", () => {
  assert.equal(R.normalizeCommerceRecord(null), null);
  assert.equal(R.normalizeCommerceRecord({ v: 2, legal }), null);
  assert.deepEqual(
    R.normalizeCommerceRecord({ v: 1, mint: { bad: true }, shares: { a: 30, b: 101, c: 2.5, d: "x" }, legal, ownerConfirmedAt: "now" }),
    { v: 1, shares: { a: 30 }, legal },
  );
  assert.deepEqual(R.normalizeCommerceRecord({ v: 1 }), { v: 1 });
});

// ─────────────────────────── migrate ───────────────────────────

test("migrate: copies each project's commerce fields into its own key, records the flag, and leaves the projects key as it was", () => {
  const store = seeded();
  const before = store.getItem(PROJECTS_KEY);
  const result = migrateCommerceSplit(store, NOW);
  assert.deepEqual(result, { ran: true, copied: ["p-full", "p-legal", "p-badmint"], complete: true });
  assert.deepEqual(keyOf(store, "p-full"), R.commerceRecordOf(OLD[0]));
  assert.deepEqual(keyOf(store, "p-legal"), { v: 1, legal });
  assert.deepEqual(keyOf(store, "p-badmint"), { v: 1, ownerConfirmedAt: NOW - 10 }, "a mint that doesn't parse isn't copied");
  assert.equal(store.getItem(R.commerceKey("p-none")), null);
  assert.deepEqual(JSON.parse(store.getItem(MIGRATIONS_KEY)), { [COMMERCE_SPLIT]: NOW });
  assert.equal(store.getItem(PROJECTS_KEY), before, "copied, never moved");
});

test("rerun: with the flag it does nothing; without it, it writes nothing new", () => {
  const store = seeded();
  migrateCommerceSplit(store, NOW);
  const writes = store.log.length;
  assert.deepEqual(migrateCommerceSplit(store, NOW + 1), { ran: false, why: "done" });
  assert.equal(store.log.length, writes);
  store.removeItem(MIGRATIONS_KEY);
  const result = migrateCommerceSplit(store, NOW + 2);
  assert.deepEqual(result, { ran: true, copied: [], complete: true });
  assert.deepEqual(JSON.parse(store.getItem(MIGRATIONS_KEY)), { [COMMERCE_SPLIT]: NOW + 2 });
});

test("partial data: a copy already in the commerce key wins field by field; the record fills the rest", () => {
  const newer = mint({ tokenId: 9, at: NOW });
  const store = seeded(OLD, {
    [R.commerceKey("p-full")]: JSON.stringify({ v: 1, mint: newer, shares: { [ana.id]: 40 } }),
    [MIGRATIONS_KEY]: JSON.stringify({ "other@1": 5 }),
  });
  migrateCommerceSplit(store, NOW);
  assert.deepEqual(keyOf(store, "p-full"), {
    v: 1,
    mint: newer,
    shares: { [ana.id]: 40, [leo.id]: 0 },
    legal,
    ownerConfirmedAt: NOW - 2000,
  });
  assert.deepEqual(JSON.parse(store.getItem(MIGRATIONS_KEY)), { "other@1": 5, [COMMERCE_SPLIT]: NOW }, "other flags kept");
});

test("unreadable keys are left exactly as they are", () => {
  const corrupt = seeded(OLD, { [R.commerceKey("p-legal")]: "{not json" });
  assert.equal(migrateCommerceSplit(corrupt, NOW).complete, true);
  assert.equal(corrupt.getItem(R.commerceKey("p-legal")), "{not json");

  const noProjects = new FakeStorage({ [PROJECTS_KEY]: "{oops" });
  assert.deepEqual(migrateCommerceSplit(noProjects, NOW), { ran: false, why: "unreadable" });
  assert.equal(noProjects.getItem(MIGRATIONS_KEY), null, "tries again next load");

  const badFlags = seeded(OLD, { [MIGRATIONS_KEY]: "[1,2]" });
  const r = migrateCommerceSplit(badFlags, NOW);
  assert.equal(r.ran, true);
  assert.equal(r.complete, false);
  assert.equal(badFlags.getItem(MIGRATIONS_KEY), "[1,2]");
  assert.deepEqual(keyOf(badFlags, "p-legal"), { v: 1, legal }, "the copy still happens");

  const empty = new FakeStorage();
  assert.deepEqual(migrateCommerceSplit(empty, NOW), { ran: true, copied: [], complete: true }, "no projects yet");
});

test("a refused write leaves the flag unset, and the next load finishes the job", () => {
  const store = seeded(OLD, {});
  store.refuse.add(R.commerceKey("p-legal"));
  assert.deepEqual(migrateCommerceSplit(store, NOW), { ran: true, copied: ["p-full", "p-badmint"], complete: false });
  assert.equal(store.getItem(MIGRATIONS_KEY), null);
  store.refuse.clear();
  assert.deepEqual(migrateCommerceSplit(store, NOW), { ran: true, copied: ["p-legal"], complete: true });
});

// ─────────────────────────── the dual read and the dual write ───────────────────────────

test("dual read: the commerce key wins field by field; a field it lacks reads from the record", () => {
  const p = OLD[0];
  const newer = mint({ tokenId: 9 });
  const read = R.withCommerceRecord(p, { v: 1, mint: newer, shares: { [ana.id]: 45, [leo.id]: 20 } });
  assert.deepEqual(read.mint, newer);
  assert.deepEqual(read.legal, legal, "absent in the key: the record's");
  assert.equal(read.ownerConfirmedAt, NOW - 2000);
  assert.deepEqual(read.contributors, [{ ...ana, share: 45 }, leo], "a share lands on a co-owner only");
  assert.equal(R.withCommerceRecord(p, R.commerceRecordOf(p)), p, "nothing differs: the same record");
  assert.equal(R.withCommerceRecord(p, null), p);
  assert.equal(R.withCommerceRecord(p, { v: 1, shares: { [ana.id]: 0 } }), p, "never a co-owner's share of 0");
});

test("dual write: mirrorCommerce keeps each key in step with its record, and only writes what changed", () => {
  const store = seeded();
  migrateCommerceSplit(store, NOW);
  store.log = [];
  R.mirrorCommerce(store, normalizeProjects(OLD));
  assert.deepEqual(store.log, [], "nothing changed: nothing written");

  const edited = [{ ...OLD[0], legal: undefined, mint: mint({ tokenId: 2 }) }, OLD[1], { ...OLD[2], ownerConfirmedAt: NOW }];
  delete edited[0].legal;
  R.mirrorCommerce(store, edited);
  assert.deepEqual(keyOf(store, "p-full"), { v: 1, mint: mint({ tokenId: 2 }), shares: { [ana.id]: 30, [leo.id]: 0 }, ownerConfirmedAt: NOW - 2000 });
  assert.deepEqual(keyOf(store, "p-none"), { v: 1, ownerConfirmedAt: NOW });

  R.mirrorCommerce(store, [project("p-legal")]);
  assert.equal(store.getItem(R.commerceKey("p-legal")), null, "no commerce field left: the key goes");
});

test("dual write: a refused write removes the stale copy, so it never wins over the record; an unreadable key is left", () => {
  const store = seeded();
  migrateCommerceSplit(store, NOW);
  store.refuse.add(R.commerceKey("p-full"));
  R.mirrorCommerce(store, [{ ...OLD[0], mint: mint({ tokenId: 3 }) }]);
  assert.equal(store.getItem(R.commerceKey("p-full")), null);
  assert.equal(R.withCommerceRecord(OLD[0], R.readCommerceRecord(store, "p-full").record), OLD[0]);

  const corrupt = new FakeStorage({ [R.commerceKey("p-legal")]: "nope" });
  R.mirrorCommerce(corrupt, [OLD[1]]);
  assert.equal(corrupt.getItem(R.commerceKey("p-legal")), "nope");
});

test("rollback reads: the projects key keeps every commerce field, and without the commerce keys the records read the same", () => {
  const store = seeded();
  migrateCommerceSplit(store, NOW);
  // The store writes a newer mint: the projects key first, then the mirror (projects.tsx's save effect).
  const next = [{ ...OLD[0], mint: mint({ tokenId: 4 }) }, ...OLD.slice(1)];
  store.setItem(PROJECTS_KEY, JSON.stringify(next));
  R.mirrorCommerce(store, normalizeProjects(next));
  // A build from before P1-1 reads only the projects key: it has the newer mint, and every other field.
  const oldCodeReads = normalizeProjects(JSON.parse(store.getItem(PROJECTS_KEY)));
  assert.deepEqual(oldCodeReads[0].mint, mint({ tokenId: 4 }));
  assert.deepEqual(oldCodeReads[0].contributors, [ana, leo]);
  assert.deepEqual(oldCodeReads[0].legal, legal);
  assert.equal(oldCodeReads[0].ownerConfirmedAt, NOW - 2000);
  // With the commerce keys gone, the dual read falls back to the record, unchanged.
  for (const p of OLD) store.removeItem(R.commerceKey(p.id));
  const hooks = R.commerceRecordHooks(() => store);
  for (const p of oldCodeReads) assert.equal(hooks.read(p), p);
});

// ─────────────────────────── the projects store's record hooks ───────────────────────────

test("the record hooks: the store's reads go through the commerce read, its writes through the mirror", () => {
  const store = seeded();
  migrateCommerceSplit(store, NOW);
  const newer = mint({ tokenId: 7 });
  store.setItem(R.commerceKey("p-full"), JSON.stringify({ ...keyOf(store, "p-full"), mint: newer }));
  const list = normalizeProjects(OLD);
  assert.equal(readThroughHooks(list), list, "no hooks yet: the list itself");
  const off = registerProjectRecordHooks(R.commerceRecordHooks(() => store));
  try {
    const read = readThroughHooks(list);
    assert.deepEqual(read[0].mint, newer, "the new key wins");
    assert.equal(read[1], list[1], "an unchanged record is the same object");
    // Another tab's write is read the same way (projectsFromStorage).
    const adopted = projectsFromStorage([], JSON.stringify(OLD));
    assert.deepEqual(adopted[0].mint, newer);
    assert.equal(projectsFromStorage(read, JSON.stringify(OLD)), read, "the same records: nothing to adopt");
    // A write the store made is mirrored.
    wroteThroughHooks([{ ...read[0], ownerConfirmedAt: NOW }]);
    assert.equal(keyOf(store, "p-full").ownerConfirmedAt, NOW);
  } finally {
    off();
  }
  assert.equal(readThroughHooks(list), list);
});

test("delete: the commerce key goes on ideeza:project-deleted, and only that project's", () => {
  const prev = globalThis.window;
  globalThis.window = new EventTarget();
  try {
    const store = seeded();
    migrateCommerceSplit(store, NOW);
    const off = R.removeCommerceOnDelete(store);
    dispatchProjectDeleted("p-full");
    assert.equal(store.getItem(R.commerceKey("p-full")), null);
    assert.notEqual(store.getItem(R.commerceKey("p-legal")), null);
    off();
    dispatchProjectDeleted("p-legal");
    assert.notEqual(store.getItem(R.commerceKey("p-legal")), null, "unsubscribed");
  } finally {
    globalThis.window = prev;
  }
});
