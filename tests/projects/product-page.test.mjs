// Task C4 — the product page's pure readers (src/lib/manual/product-page.ts):
// which version a product opens at, its select, its notices (COR-41,
// COR-108), its pieces (COR-31) and its URL.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseVersionParam,
  productPiecesOf,
  productVersionView,
  withQuery,
} from "../../.tmp-test/lib/manual/product-page.js";

// ── fixtures: "Car", one chat built twice. Version 2 dropped Battery Charger
// and added Spare Battery Pack (spec §3.3).
const SEP22 = Date.UTC(2026, 8, 22, 9, 2);
const SEP26 = Date.UTC(2026, 8, 26, 16, 12);
const job = (id, endedAt) => ({ id, chatId: "chat_car", createdAt: endedAt - 60_000, endedAt, conceptNumber: "1" });
const J1 = job("bld_v1", SEP22);
const J2 = job("bld_v2", SEP26);

const version = (n, j, savedAt, products) => ({
  chatId: "chat_car", lineage: "Car", version: n, current: n === 2,
  buildId: j ? j.id : `bld_v${n}`, job: j, savedAt,
  pieces: null, products: j ? products : [], diff: null,
});
const V1 = version(1, J1, SEP22, [
  { rowId: "prd_ctrl", productId: "primary", name: "RC Car Controller" },
  { rowId: "prd_remote", productId: "remote", name: "Remote Controller" },
  { rowId: "prd_charger", productId: "charger", name: "Battery Charger" },
]);
const V2 = version(2, J2, SEP26, [
  { rowId: "prd_ctrl", productId: "primary", name: "RC Car Controller" },
  { rowId: "prd_remote", productId: "remote", name: "Remote Controller" },
  { rowId: "prd_spare", productId: "spare", name: "Spare Battery Pack" },
]);
const VERSIONS = [[V2, V1]]; // versionsOf(): per lineage, newest first

const ref = (j, n) => ({ buildId: j.id, chatId: "chat_car", version: n, savedAt: null, job: j });
const REMOTE = {
  id: "prd_remote", name: "Remote Controller", description: "",
  built: { ref: ref(J2, 2), product: { id: "remote" } },
  state: "built", version: { current: 2, count: 2 }, dropped: null,
};
const CHARGER = {
  id: "prd_charger", name: "Battery Charger", description: "",
  built: { ref: ref(J1, 1), product: { id: "charger" } },
  state: "built", version: { current: 1, count: 2 }, dropped: { lastIn: 1, current: 2 },
};
const HAND = { id: "p1", name: "Desk Lamp", description: "", built: null, state: "hand", version: null, dropped: null };

// ── versions

test("a built product opens at its current version, with no notice", () => {
  const view = productVersionView(REMOTE, VERSIONS, null);
  assert.equal(view.shown, 2);
  assert.equal(view.home, 2);
  assert.equal(view.latest, 2);
  assert.equal(view.productId, "remote");
  assert.equal(view.build.buildId, "bld_v2");
  assert.equal(view.notice, null);
  assert.deepEqual(view.options, [
    { n: 1, at: SEP22, current: false, has: true, gone: false },
    { n: 2, at: SEP26, current: true, has: true, gone: false },
  ]);
});

test("?v=1 shows version 1 under the older-version notice", () => {
  const view = productVersionView(REMOTE, VERSIONS, "1");
  assert.equal(view.shown, 1);
  assert.equal(view.productId, "remote");
  assert.equal(view.build.buildId, "bld_v1");
  assert.deepEqual(view.notice, { kind: "older", n: 1, at: SEP22, latest: 2 });
});

test("?v naming the version the page opens at is the plain page", () => {
  assert.equal(productVersionView(REMOTE, VERSIONS, "2").notice, null);
});

test("?v that names no saved version is ignored", () => {
  for (const v of ["7", "0", "abc", "1.5", "", "-1"]) {
    const view = productVersionView(REMOTE, VERSIONS, v);
    assert.equal(view.shown, 2, `?v=${v}`);
    assert.equal(view.notice, null, `?v=${v}`);
  }
});

test("a dropped product opens at the last version that had it, with no Back to latest", () => {
  const view = productVersionView(CHARGER, VERSIONS, null);
  assert.equal(view.home, 1);
  assert.equal(view.shown, 1);
  assert.equal(view.productId, "charger");
  assert.deepEqual(view.notice, { kind: "dropped", n: 1, latest: 2 });
  assert.equal(view.options[1].has, false);
  assert.equal(view.options[1].current, true);
});

test("a version without the product says so and points at the nearest one that has it", () => {
  const view = productVersionView(CHARGER, VERSIONS, "2");
  assert.equal(view.shown, 2);
  assert.equal(view.productId, null);
  assert.deepEqual(view.notice, { kind: "absent", n: 2, nearest: 1 });
});

test("a version whose build is gone shows nothing of it and points at one that is here", () => {
  const gone = [[V2, version(1, null, SEP22, [])]];
  const view = productVersionView(REMOTE, gone, "1");
  assert.equal(view.productId, null);
  assert.equal(view.build.job, null);
  assert.deepEqual(view.notice, { kind: "gone", n: 1, nearest: 2 });
  assert.deepEqual(view.options[0], { n: 1, at: SEP22, current: false, has: false, gone: true });
});

test("a version saved before savedAt was recorded is dated by its build", () => {
  const legacy = [[V2, { ...V1, savedAt: null }]];
  assert.equal(productVersionView(REMOTE, legacy, null).options[0].at, SEP22);
});

test("the product's own build stands in when versionsOf() has no row for it", () => {
  const view = productVersionView(REMOTE, [], null);
  assert.equal(view.options.length, 1);
  assert.equal(view.shown, 2);
  assert.equal(view.productId, "remote");
  assert.equal(view.options[0].at, SEP26);
});

test("a product no build stands behind has no version view", () => {
  assert.equal(productVersionView(HAND, VERSIONS, null), null);
});

test("parseVersionParam reads whole numbers from 1 only", () => {
  assert.equal(parseVersionParam("3"), 3);
  assert.equal(parseVersionParam(null), null);
  assert.equal(parseVersionParam("03"), null);
  assert.equal(parseVersionParam("2x"), null);
});

// ── pieces

const item = (kind, status) => ({ kind, status, progress: status === "ready" ? 100 : 40 });

test("productPiecesOf counts what the build made for this product", () => {
  const items = [item("3d", "ready"), item("pcb", "ready"), item("code", "skipped"), item("wiring", "failed"), item("parts", "ready")];
  assert.deepEqual(productPiecesOf(items), { ready: 3, total: 4 });
});

// ── URL

test("withQuery sets and removes keys and keeps the rest", () => {
  assert.equal(withQuery("tab=pcb&view=buyer", { v: "1" }), "?tab=pcb&view=buyer&v=1");
  assert.equal(withQuery("v=1&view=buyer", { v: null }), "?view=buyer");
  assert.equal(withQuery("tab=pcb", { tab: "3d" }), "?tab=3d");
  assert.equal(withQuery("", { tab: null }), "");
});
