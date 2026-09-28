import test from "node:test";
import assert from "node:assert/strict";
import {
  piecesOfItems,
  productFacts,
  displayProductName,
  droppedNoteOf,
  productsHeadingOf,
  headlineConfidenceOf,
} from "../../.tmp-test/lib/manual/products-tab-view.js";
import { radioOf } from "../../.tmp-test/lib/spec/format.js";
import { batteryOf } from "../../.tmp-test/lib/spec/batteries.js";
import { runtimeLabel } from "../../.tmp-test/lib/spec/units.js";

function baseSpec(overrides = {}) {
  return {
    kind: "electronic",
    size: { l: 120, w: 60, h: 25 },
    sizeSource: "calc",
    minSize: { l: 100, w: 50, h: 20 },
    fits: true,
    draftAtSize: false,
    draftChosen: false,
    board: { w: 50, h: 40, parts: 6, layers: 2 },
    battery: "li-1s-1000",
    batterySource: "rule",
    noUsbPort: false,
    speaks: true,
    drawMa: 200,
    budgetMa: 1000,
    runtimeH: 4.8,
    material: "PLA",
    materialSource: "rule",
    wallMm: 2,
    wallSource: "rule",
    choices: {},
    estimated: [],
    smallerBattery: null,
    ...overrides,
  };
}

test("piecesOfItems counts ready and total, skipping skipped items", () => {
  const items = [
    { kind: "3d", status: "ready", progress: 100 },
    { kind: "pcb", status: "ready", progress: 100 },
    { kind: "code", status: "building", progress: 40 },
    { kind: "wiring", status: "failed", progress: 0 },
    { kind: "parts", status: "skipped", progress: 0 },
  ];
  assert.deepEqual(piecesOfItems(items), { ready: 2, total: 4 });
});

test("productFacts: a mechanical product shows only Size", () => {
  const spec = baseSpec({ kind: "mechanical", board: null, battery: "none", drawMa: 0 });
  assert.deepEqual(productFacts(spec, []), [{ label: "Size", value: "120 × 60 × 25 mm" }]);
});

test("productFacts: USB powered with nothing drawing current omits Power", () => {
  const spec = baseSpec({ battery: "none", drawMa: 0 });
  assert.equal(productFacts(spec, []).some((f) => f.label === "Power"), false);
});

test("productFacts: USB powered and drawing current shows Power", () => {
  const spec = baseSpec({ battery: "none", drawMa: 150 });
  assert.deepEqual(productFacts(spec, []).find((f) => f.label === "Power"), {
    label: "Power",
    value: "USB powered",
  });
});

test("productFacts: a wall adapter", () => {
  const spec = baseSpec({ battery: "adapter" });
  assert.deepEqual(productFacts(spec, []).find((f) => f.label === "Power"), {
    label: "Power",
    value: "Wall adapter",
  });
});

test("productFacts: a rechargeable pack names the battery, the runtime and 'per charge'", () => {
  const spec = baseSpec({ battery: "li-1s-1000", runtimeH: 4.8 });
  const expected = `${batteryOf("li-1s-1000").label} · ${runtimeLabel(4.8)} per charge`;
  assert.deepEqual(productFacts(spec, []).find((f) => f.label === "Power"), {
    label: "Power",
    value: expected,
  });
});

test("productFacts: a replaced-not-recharged pack reads 'per battery'", () => {
  const spec = baseSpec({ battery: "aa-2", runtimeH: 5 });
  const expected = `${batteryOf("aa-2").label} · ${runtimeLabel(5)} per battery`;
  assert.deepEqual(productFacts(spec, []).find((f) => f.label === "Power"), {
    label: "Power",
    value: expected,
  });
});

test("productFacts: Board is omitted when nothing sits on one", () => {
  const spec = baseSpec({ board: null });
  assert.equal(productFacts(spec, []).some((f) => f.label === "Board"), false);
});

test("productFacts: Size, Board, Power, Radio, in that order", () => {
  const parts = [{ name: "nRF24L01", role: "2.4 GHz radio module", category: "Connectivity" }];
  const spec = baseSpec();
  const radio = radioOf(parts);
  assert.ok(radio, "the fixture part should be recognised as a radio");
  assert.deepEqual(productFacts(spec, parts), [
    { label: "Size", value: "120 × 60 × 25 mm" },
    { label: "Board", value: "2-layer 50 × 40 mm" },
    { label: "Power", value: `${batteryOf("li-1s-1000").label} · ${runtimeLabel(4.8)} per charge` },
    { label: "Radio", value: radio },
  ]);
});

test("displayProductName: an empty or blank name reads 'Not named yet'", () => {
  assert.equal(displayProductName(""), "Not named yet");
  assert.equal(displayProductName("   "), "Not named yet");
  assert.equal(displayProductName("Remote Controller"), "Remote Controller");
});

test("droppedNoteOf: COR-108's exact wording", () => {
  assert.equal(droppedNoteOf(2, 1), "Not in version 2 · from version 1");
});

test("productsHeadingOf: counts every row, tallies pieces from the current version only", () => {
  const rows = [
    { dropped: false, version: 2, pieces: { ready: 5, total: 5 } },
    { dropped: false, version: 2, pieces: { ready: 10, total: 10 } },
    { dropped: true, version: 1, pieces: { ready: 3, total: 3 } },
  ];
  assert.deepEqual(productsHeadingOf(rows), {
    count: 3,
    pieces: { ready: 15, total: 15 },
    version: 2,
  });
});

test("productsHeadingOf: no 'in version' suffix without a dropped row", () => {
  const rows = [
    { dropped: false, version: 2, pieces: { ready: 5, total: 5 } },
    { dropped: false, version: 2, pieces: { ready: 10, total: 10 } },
  ];
  assert.equal(productsHeadingOf(rows).version, null);
});

test("productsHeadingOf: disagreeing current versions omit the suffix rather than guess", () => {
  const rows = [
    { dropped: false, version: 2, pieces: { ready: 5, total: 5 } },
    { dropped: false, version: 3, pieces: { ready: 10, total: 10 } },
    { dropped: true, version: 1, pieces: { ready: 3, total: 3 } },
  ];
  assert.equal(productsHeadingOf(rows).version, null);
});

test("productsHeadingOf: a row with nothing built adds to the count but not the pieces", () => {
  const rows = [
    { dropped: false, version: null, pieces: null },
    { dropped: false, version: 1, pieces: { ready: 2, total: 2 } },
  ];
  assert.deepEqual(productsHeadingOf(rows), {
    count: 2,
    pieces: { ready: 2, total: 2 },
    version: null,
  });
});

test("headlineConfidenceOf: null when nothing is built", () => {
  assert.equal(headlineConfidenceOf([]), null);
});

test("headlineConfidenceOf: checked only when every product is checked", () => {
  const a = { productId: "a", productName: "A", tier: "checked", issues: [], passed: ["Power budget — A draws about 200 mA of the 1000 mA it gives."] };
  const b = { productId: "b", productName: "B", tier: "checked", issues: [], passed: ["Enclosure fit — B's parts fit."] };
  const out = headlineConfidenceOf([a, b]);
  assert.equal(out.tier, "checked");
  assert.deepEqual(out.passed, [...a.passed, ...b.passed]);
});

test("headlineConfidenceOf: draft as soon as one product is draft, with every issue folded in", () => {
  const a = { productId: "a", productName: "A", tier: "checked", issues: [], passed: ["ok"] };
  const b = {
    productId: "b",
    productName: "B",
    tier: "draft",
    issues: [{ group: "design-rule", notRun: true, text: "not run" }],
    passed: [],
  };
  const out = headlineConfidenceOf([a, b]);
  assert.equal(out.tier, "draft");
  assert.deepEqual(out.issues, b.issues);
  assert.deepEqual(out.passed, ["ok"]);
});
