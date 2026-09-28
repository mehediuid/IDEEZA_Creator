// Task C4b / T07 — the product page's tab strip (src/lib/manual/product-page.ts):
// the app's order, no tab for a piece the build never made (H-5), none for the
// firmware source in the buyer preview (PPL-7, COR-37, O12), and which one opens.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PRODUCT_TABS,
  deliverableTabs,
  pickProductTab,
  pickTab,
  productTabsOf,
} from "../../.tmp-test/lib/manual/product-page.js";

const ORDER = ["3d", "pcb", "code", "wiring", "parts"];
const item = (kind, status) => ({ kind, status, progress: status === "ready" ? 100 : 40 });

// ───────────────────── deprecated v1 readers (still live: product-deliverables.tsx) ─────────────────────

test("a skipped piece has no tab, and the rest keep the app's order", () => {
  const items = [item("parts", "ready"), item("3d", "ready"), item("code", "skipped"), item("pcb", "failed"), item("wiring", "ready")];
  assert.deepEqual(deliverableTabs(items, ORDER, { firmware: true }).map((i) => i.kind), ["3d", "pcb", "wiring", "parts"]);
});

test("the buyer preview has no Firmware code tab", () => {
  const items = ORDER.map((k) => item(k, "ready"));
  assert.deepEqual(deliverableTabs(items, ORDER, { firmware: false }).map((i) => i.kind), ["3d", "pcb", "wiring", "parts"]);
  assert.equal(deliverableTabs(items, ORDER, { firmware: true }).length, 5);
});

test("pickTab takes ?tab= when it is a tab, else the first finished piece", () => {
  const tabs = [item("3d", "failed"), item("pcb", "ready"), item("parts", "ready")];
  assert.equal(pickTab(tabs, "parts"), "parts");
  assert.equal(pickTab(tabs, "code"), "pcb");
  assert.equal(pickTab(tabs, null), "pcb");
  assert.equal(pickTab([item("3d", "failed")], null), "3d");
  assert.equal(pickTab([], "pcb"), null);
});

// ───────────────────── productTabsOf / pickProductTab (P2-EDITOR-16, 17) ─────────────────────

const built = (over = {}) => ({ id: "prd_a", name: "Car", description: "", built: {}, state: "built", version: { current: 1, count: 1 }, dropped: null, ...over });
const hand = { id: "p1", name: "Lamp", description: "", built: null, state: "hand", version: null, dropped: null };
const buildGone = { id: "prd_a", name: "Car", description: "", built: null, state: "build-gone", version: { current: 1, count: 1 }, dropped: null };

const ALL_GATES = { firmware: true, contributors: true, customers: true };

test("a built product for the owner gives the 8 tabs in spec §2.3's order, Media first", () => {
  const items = ORDER.map((k) => item(k, "ready"));
  const tabs = productTabsOf(built(), items, ALL_GATES);
  assert.deepEqual(tabs, ["media", "3d", "pcb", "code", "wiring", "parts", "contributors", "customers"]);
  assert.deepEqual(tabs, PRODUCT_TABS.slice());
  assert.equal(tabs[0], "media");
});

test("a hand-made product gives [media, contributors, customers] — no piece tabs, no build data needed", () => {
  assert.deepEqual(productTabsOf(hand, null, ALL_GATES), ["media", "contributors", "customers"]);
});

test("a build-gone or unmatched product gets no piece tabs either", () => {
  const items = ORDER.map((k) => item(k, "ready")); // even if items happen to be passed, state gates them out
  assert.deepEqual(productTabsOf(buildGone, items, ALL_GATES), ["media", "contributors", "customers"]);
});

test("the buyer preview has no code and no customers", () => {
  const items = ORDER.map((k) => item(k, "ready"));
  const gates = { firmware: false, contributors: true, customers: false };
  assert.deepEqual(productTabsOf(built(), items, gates), ["media", "3d", "pcb", "wiring", "parts", "contributors"]);
});

test("a dropped row (state stays built) keeps its piece tabs", () => {
  const items = ORDER.map((k) => item(k, "ready"));
  const dropped = built({ dropped: { lastIn: 1, current: 2 } });
  assert.deepEqual(productTabsOf(dropped, items, ALL_GATES).includes("pcb"), true);
});

test("a piece this build never made (skipped) has no tab — H-5", () => {
  const items = [item("3d", "ready"), item("pcb", "skipped"), item("code", "ready"), item("wiring", "ready"), item("parts", "ready")];
  assert.deepEqual(productTabsOf(built(), items, ALL_GATES), ["media", "3d", "code", "wiring", "parts", "contributors", "customers"]);
});

test("neither Contributors nor Customers show without their own gate", () => {
  assert.deepEqual(productTabsOf(hand, null, { firmware: true, contributors: false, customers: false }), ["media"]);
});

test("pickProductTab: an unknown or absent ?tab= reads as Media", () => {
  assert.equal(pickProductTab(PRODUCT_TABS, "bogus"), "media");
  assert.equal(pickProductTab(PRODUCT_TABS, null), "media");
});

test("pickProductTab: a tab the strip actually has is selected", () => {
  assert.equal(pickProductTab(PRODUCT_TABS, "pcb"), "pcb");
  assert.equal(pickProductTab(["media", "contributors", "customers"], "pcb"), "media");
});
