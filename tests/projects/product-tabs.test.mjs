// Task C4b — the product page's deliverable tabs (src/lib/manual/product-page.ts):
// the app's order, no tab for a piece the build never made (H-5), none for the
// firmware source in the buyer preview (PPL-7, COR-37), and which one opens.
import { test } from "node:test";
import assert from "node:assert/strict";
import { deliverableTabs, pickTab } from "../../.tmp-test/lib/manual/product-page.js";

const ORDER = ["3d", "pcb", "code", "wiring", "parts"];
const item = (kind, status) => ({ kind, status, progress: status === "ready" ? 100 : 40 });

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
