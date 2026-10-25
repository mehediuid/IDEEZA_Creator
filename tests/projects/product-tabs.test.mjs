// Task C4b / T07 — the product page's tab strip (src/lib/manual/product-page.ts):
// the app's order, no tab for a piece the build never made (H-5), none for the
// firmware source in the buyer preview (PPL-7, COR-37, O12), and which one opens.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PRODUCT_TABS,
  pickProductTab,
  productTabsOf,
} from "../../.tmp-test/lib/manual/product-page.js";

const ORDER = ["3d", "pcb", "code", "wiring", "parts"];
const item = (kind, status) => ({ kind, status, progress: status === "ready" ? 100 : 40 });

// ───────────────────── productTabsOf / pickProductTab (P2-EDITOR-16, 17) ─────────────────────

const built = (over = {}) => ({ id: "prd_a", name: "Car", description: "", built: {}, state: "built", version: { current: 1, count: 1 }, dropped: null, ...over });
const hand = { id: "p1", name: "Lamp", description: "", built: null, state: "hand", version: null, dropped: null };
const buildGone = { id: "prd_a", name: "Car", description: "", built: null, state: "build-gone", version: { current: 1, count: 1 }, dropped: null };

const ALL_GATES = { firmware: true, contributors: true, customers: true };

test("a built product for the owner leads with its pieces, Media after them (owner, 2026-10-11)", () => {
  // The editor's order (owner, 2026-10-22): PCB, Code, 3D Module, Assembly,
  // Wiring, then the Parts list. A build from before Assembly has none.
  const items = ORDER.map((k) => item(k, "ready"));
  const tabs = productTabsOf(built(), items, ALL_GATES);
  assert.deepEqual(tabs, ["pcb", "code", "3d", "wiring", "parts", "media", "contributors", "customers"]);
  assert.equal(pickProductTab(tabs, null), "pcb", "the first piece is the default");
  // A buyer's side opens on the video: spec §2.3's order.
  const withAssembly = [...items, item("assembly", "ready")];
  assert.deepEqual(productTabsOf(built(), withAssembly, { ...ALL_GATES, mediaFirst: true }), PRODUCT_TABS.slice());
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
  assert.deepEqual(productTabsOf(built(), items, { ...gates, mediaFirst: true }), ["media", "pcb", "3d", "wiring", "parts", "contributors"]);
});

test("a dropped row (state stays built) keeps its piece tabs", () => {
  const items = ORDER.map((k) => item(k, "ready"));
  const dropped = built({ dropped: { lastIn: 1, current: 2 } });
  assert.deepEqual(productTabsOf(dropped, items, ALL_GATES).includes("pcb"), true);
});

test("a piece this build never made (skipped) has no tab — H-5", () => {
  const items = [item("3d", "ready"), item("pcb", "skipped"), item("code", "ready"), item("wiring", "ready"), item("parts", "ready")];
  assert.deepEqual(productTabsOf(built(), items, ALL_GATES), ["code", "3d", "wiring", "parts", "media", "contributors", "customers"]);
});

test("a build with an Assembly piece shows it after the 3D Module", () => {
  const items = [...ORDER.map((k) => item(k, "ready")), item("assembly", "ready")];
  assert.deepEqual(productTabsOf(built(), items, ALL_GATES).slice(0, 6), ["pcb", "code", "3d", "assembly", "wiring", "parts"]);
});

test("a piece the maker left out shows only to the owner — Not built, to add later", () => {
  const out = (kind) => ({ kind, status: "skipped", progress: 0, omitted: true });
  const items = [item("pcb", "ready"), out("code"), out("3d"), out("assembly"), out("wiring"), item("parts", "ready")];
  assert.deepEqual(productTabsOf(built(), items, { ...ALL_GATES, leftOut: true }).slice(0, 6), ["pcb", "code", "3d", "assembly", "wiring", "parts"]);
  assert.deepEqual(productTabsOf(built(), items, ALL_GATES).slice(0, 2), ["pcb", "parts"]);
});

test("neither Contributors nor Customers show without their own gate", () => {
  assert.deepEqual(productTabsOf(hand, null, { firmware: true, contributors: false, customers: false }), ["media"]);
});

test("pickProductTab: an unknown or absent ?tab= reads as the strip's first tab", () => {
  assert.equal(pickProductTab(PRODUCT_TABS, "bogus"), "media");
  assert.equal(pickProductTab(PRODUCT_TABS, null), "media");
});

test("pickProductTab: a tab the strip actually has is selected", () => {
  assert.equal(pickProductTab(PRODUCT_TABS, "pcb"), "pcb");
  assert.equal(pickProductTab(["media", "contributors", "customers"], "pcb"), "media");
});
