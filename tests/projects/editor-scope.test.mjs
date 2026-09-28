// T07 — the product-scoped editor's pure scope layer (spec §3.5.8, EDITOR
// §3.4): URLs, the legacy-route resolver, the resume record, renaming a
// product row, and every document key the delete sweep and the editors
// themselves read. Compiled by tests/projects/tsconfig.json (A1):
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EDITOR_STEPS,
  docReadKeys,
  editorDocKey,
  editorHref,
  editorKeysOf,
  legacyDocKey,
  openInEditorOf,
  parseEditorPath,
  prevKey,
  productResumeOf,
  renameProduct,
  resumeProductOf,
  rowOfBuildProduct,
  seedRecordKey,
  stampEditorOpened,
} from "../../.tmp-test/lib/manual/editor-scope.js";
import { OPENED_EVERY_MS } from "../../.tmp-test/lib/manual/project-storage.js";

const FLOW_STATE = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };

const project = (over = {}) => ({
  id: "proj_car",
  slug: "car",
  name: "Car",
  productName: "Car",
  description: "",
  status: "draft",
  createdAt: 1_000,
  updatedAt: 2_000,
  flowState: FLOW_STATE,
  ...over,
});

const row = (id, name, source) => ({ id, name, description: "", ...(source ? { source } : {}) });

// ───────────────────────────── EDITOR_STEPS ─────────────────────────────

test("EDITOR_STEPS is every ProjectStep but Brief, in the module order", () => {
  assert.deepEqual(EDITOR_STEPS, ["pcb", "code", "three", "assembly", "wiring", "preview"]);
});

// ───────────────────────────── editorHref ─────────────────────────────

test("editorHref builds the product-scoped URL, from a project or a bare slug", () => {
  assert.equal(editorHref(project(), "prd_b", "pcb"), "/project/car/products/prd_b/pcb");
  assert.equal(editorHref(project(), "prd_b", "three"), "/project/car/products/prd_b/3d");
  assert.equal(editorHref("car", "p1", "wiring"), "/project/car/products/p1/wiring");
});

// ───────────────────────────── parseEditorPath ─────────────────────────────

test("parseEditorPath reads the new product-scoped route", () => {
  assert.deepEqual(parseEditorPath("/project/car/products/prd_b/pcb"), { slug: "car", productId: "prd_b", step: "pcb" });
  assert.deepEqual(parseEditorPath("/project/car/products/p1/3d"), { slug: "car", productId: "p1", step: "three" });
});

test("parseEditorPath reads the legacy project-only route, with productId null", () => {
  assert.deepEqual(parseEditorPath("/project/car/pcb"), { slug: "car", productId: null, step: "pcb" });
  assert.deepEqual(parseEditorPath("/project/car/brief"), { slug: "car", productId: null, step: "brief" });
});

test("parseEditorPath rejects a product-scoped brief (project-level only) and anything malformed", () => {
  assert.equal(parseEditorPath("/project/car/products/prd_b/brief"), null);
  assert.equal(parseEditorPath("/project/car/products/prd_b"), null);
  assert.equal(parseEditorPath("/project/car/products"), null);
  assert.equal(parseEditorPath("/project/car/bogus"), null);
  assert.equal(parseEditorPath("/project"), null);
  assert.equal(parseEditorPath("/marketplace/car"), null);
  assert.equal(parseEditorPath("/project/car/products/prd_b/pcb/extra"), null);
});

// ───────────────────────────── resumeProductOf ─────────────────────────────

test("resumeProductOf: a hand-made project with no products list resumes the virtual p1", () => {
  assert.equal(resumeProductOf(project()), "p1");
});

test("resumeProductOf: lastOpened.productId wins when that row still exists", () => {
  const p = project({
    products: [row("prd_a", "Car"), row("prd_b", "Remote")],
    lastOpened: { step: "code", at: 500, productId: "prd_b" },
  });
  assert.equal(resumeProductOf(p), "prd_b");
});

test("resumeProductOf: a stale lastOpened naming a row that's gone is ignored", () => {
  const p = project({
    products: [row("prd_a", "Car"), row("prd_b", "Remote")],
    lastOpened: { step: "code", at: 500, productId: "nope" },
  });
  assert.equal(resumeProductOf(p), "prd_a");
});

test("resumeProductOf: with no lastOpened, a dropped row is skipped for the one the current version still has", () => {
  const p = project({
    products: [row("prd_a", "Car", { buildId: "b1", productId: "primary" }), row("prd_b", "Remote", { buildId: "b2", productId: "remote" })],
    builds: [
      { buildId: "b1", chatId: "c1", version: 1, savedAt: 100 },
      { buildId: "b2", chatId: "c1", version: 2, savedAt: 200 },
    ],
  });
  // prd_a's build (v1) is behind c1's newest attached build (v2) — dropped.
  assert.equal(resumeProductOf(p), "prd_b");
});

test("resumeProductOf: a hand row is never dropped, and wins over a superseded build row before it", () => {
  const p = project({
    products: [row("prd_a", "Car", { buildId: "b1", productId: "primary" }), row("p_hand", "Lamp")],
    builds: [
      { buildId: "b1", chatId: "c1", version: 1, savedAt: 100 },
      { buildId: "b2", chatId: "c1", version: 2, savedAt: 200 },
    ],
  });
  assert.equal(resumeProductOf(p), "p_hand");
});

test("resumeProductOf: every row superseded falls back to the first row", () => {
  const p = project({
    products: [row("prd_a", "Car", { buildId: "b1", productId: "primary" }), row("prd_b", "Old remote", { buildId: "b0", productId: "remote" })],
    builds: [
      { buildId: "b1", chatId: "c1", version: 1, savedAt: 100 },
      { buildId: "b2", chatId: "c1", version: 2, savedAt: 200 }, // a build neither row was sourced from
      { buildId: "b0", chatId: "c1", version: 0, savedAt: 50 },
    ],
  });
  // both rows are behind version 2 — falls to rows[0]
  assert.equal(resumeProductOf(p), "prd_a");
});

// ───────────────────────────── productResumeOf / openInEditorOf ─────────────────────────────

test("productResumeOf: an unopened row resumes at PCB, unstamped", () => {
  assert.deepEqual(productResumeOf(project(), "prd_a"), { step: "pcb", stamped: false });
});

test("productResumeOf: an opened row resumes at its own recorded step, stamped", () => {
  const p = project({ editorOpened: { prd_a: { step: "wiring", at: 900 } } });
  assert.deepEqual(productResumeOf(p, "prd_a"), { step: "wiring", stamped: true });
});

test("openInEditorOf: unstamped reads the bare label; stamped names the step", () => {
  const p = project({ editorOpened: { prd_b: { step: "wiring", at: 900 } } });
  assert.deepEqual(openInEditorOf(project(), "prd_a"), { label: "Open in editor", href: "/project/car/products/prd_a/pcb" });
  assert.deepEqual(openInEditorOf(p, "prd_b"), {
    label: "Open in editor · Peripheral Wiring",
    href: "/project/car/products/prd_b/wiring",
  });
});

// ───────────────────────────── stampEditorOpened ─────────────────────────────

test("stampEditorOpened records the step per product and leaves updatedAt alone", () => {
  const p = project();
  const q = stampEditorOpened(p, "prd_b", "wiring", 50_000);
  assert.deepEqual(q.editorOpened, { prd_b: { step: "wiring", at: 50_000 } });
  assert.deepEqual(q.lastOpened, { step: "wiring", at: 50_000, productId: "prd_b" });
  assert.equal(q.updatedAt, 2_000);
  assert.equal(p.editorOpened, undefined, "the input is not mutated");
});

test("stampEditorOpened: the same (product, step) under a minute later isn't written again", () => {
  const p = project({ editorOpened: { prd_a: { step: "pcb", at: 10_000 } } });
  assert.equal(stampEditorOpened(p, "prd_a", "pcb", 10_000 + OPENED_EVERY_MS - 1), p);
});

test("stampEditorOpened: a minute later, or another step, or another product, is stamped and merges", () => {
  const p = project({ editorOpened: { prd_a: { step: "pcb", at: 10_000 } } });
  const q = stampEditorOpened(p, "prd_a", "pcb", 10_000 + OPENED_EVERY_MS);
  assert.deepEqual(q.editorOpened.prd_a, { step: "pcb", at: 70_000 });

  const r = stampEditorOpened(p, "prd_b", "code", 10_001);
  assert.deepEqual(r.editorOpened, { prd_a: { step: "pcb", at: 10_000 }, prd_b: { step: "code", at: 10_001 } });
  assert.equal(r.updatedAt, 2_000);
});

// ───────────────────────────── renameProduct ─────────────────────────────

test("renameProduct: the virtual p1 (no stored rows) writes productName", () => {
  assert.deepEqual(renameProduct(project(), "p1", "  Boat  ", 9_000), { productName: "Boat" });
});

test("renameProduct: the virtual project ignores a row id that isn't p1", () => {
  assert.deepEqual(renameProduct(project(), "prd_x", "Boat", 9_000), {});
});

test("renameProduct: renaming the first row also moves the headline while they still agree (COR-95)", () => {
  const p = project({ products: [row("prd_a", "Car"), row("prd_b", "Remote")] });
  const patch = renameProduct(p, "prd_a", "Rover", 9_000);
  assert.equal(patch.productName, "Rover");
  assert.deepEqual(patch.products, [{ id: "prd_a", name: "Rover", description: "", updatedAt: 9_000 }, row("prd_b", "Remote")]);
});

test("renameProduct: the first row no longer carries the headline — only the row changes", () => {
  const p = project({ productName: "Custom headline", products: [row("prd_a", "Car"), row("prd_b", "Remote")] });
  const patch = renameProduct(p, "prd_a", "Rover", 9_000);
  assert.equal(patch.productName, undefined);
  assert.equal(patch.products[0].name, "Rover");
});

test("renameProduct: a non-first row renames without touching the headline", () => {
  const p = project({ products: [row("prd_a", "Car"), row("prd_b", "Remote")] });
  const patch = renameProduct(p, "prd_b", "Handset", 9_000);
  assert.equal(patch.productName, undefined);
  assert.deepEqual(patch.products, [row("prd_a", "Car"), { id: "prd_b", name: "Handset", description: "", updatedAt: 9_000 }]);
});

test("renameProduct: an empty name is refused — no patch, the row keeps its name", () => {
  const p = project({ products: [row("prd_a", "Car")] });
  assert.deepEqual(renameProduct(p, "prd_a", "   ", 9_000), {});
});

test("renameProduct: an unknown row id is refused", () => {
  const p = project({ products: [row("prd_a", "Car")] });
  assert.deepEqual(renameProduct(p, "nope", "Rover", 9_000), {});
});

// ───────────────────────────── rowOfBuildProduct ─────────────────────────────

test("rowOfBuildProduct finds the row a build product was saved into, or null", () => {
  const p = project({ products: [row("prd_a", "Car", { buildId: "b1", productId: "primary" }), row("prd_b", "Remote", { buildId: "b1", productId: "remote" })] });
  assert.equal(rowOfBuildProduct(p, "b1", "remote"), "prd_b");
  assert.equal(rowOfBuildProduct(p, "b1", "nope"), null);
  assert.equal(rowOfBuildProduct(p, "b2", "primary"), null);
});

// ───────────────────────────── document keys ─────────────────────────────

test("editorDocKey builds <base>:<projectId>:<productId> for every doc", () => {
  const s = { projectId: "proj_a", productId: "p1" };
  assert.equal(editorDocKey("pcb", s), "ideeza:pcb:doc:proj_a:p1");
  assert.equal(editorDocKey("wiring", s), "ideeza:wiring:doc:proj_a:p1");
  assert.equal(editorDocKey("assembly", s), "ideeza:assembly:proj_a:p1");
  assert.equal(editorDocKey("three.ai", s), "ideeza:three:aimodel:proj_a:p1");
  assert.equal(editorDocKey("three.shapes", s), "ideeza:3d:shapes:proj_a:p1");
  assert.equal(editorDocKey("three.right", s), "ideeza:3d:right:proj_a:p1");
  assert.equal(editorDocKey("three.sketches", s), "ideeza:3d:sketches:proj_a:p1");
  assert.equal(editorDocKey("code.files", s), "ideeza:code:files:proj_a:p1");
  assert.equal(editorDocKey("code.blockly", s), "ideeza:code:blockly-workspace:proj_a:p1");
  assert.equal(editorDocKey("preview.canvas", s), "ideeza:preview:canvas:proj_a:p1");
  assert.equal(editorDocKey("preview.mates", s), "ideeza:preview:mates:proj_a:p1");
});

test("legacyDocKey exists only for the 4 docs that had a per-project key before P2", () => {
  assert.equal(legacyDocKey("pcb", "proj_a"), "ideeza:pcb:doc:proj_a");
  assert.equal(legacyDocKey("wiring", "proj_a"), "ideeza:wiring:doc:proj_a");
  assert.equal(legacyDocKey("assembly", "proj_a"), "ideeza:assembly:proj_a");
  assert.equal(legacyDocKey("three.ai", "proj_a"), "ideeza:three:aimodel:proj_a");
  for (const doc of ["three.shapes", "three.right", "three.sketches", "code.files", "code.blockly", "preview.canvas", "preview.mates"]) {
    assert.equal(legacyDocKey(doc, "proj_a"), null, doc);
  }
});

test("a scoped key never equals a legacy key or another project's key", () => {
  const a = editorDocKey("pcb", { projectId: "proj_a", productId: "p1" });
  assert.notEqual(a, legacyDocKey("pcb", "proj_a"));
  assert.notEqual(a, editorDocKey("pcb", { projectId: "proj_ab", productId: "p1" }));
  assert.notEqual(a, editorDocKey("pcb", { projectId: "proj_a", productId: "prd_a" }));
});

test("docReadKeys gives the legacy adoption to the first row only", () => {
  const scopeHead = { projectId: "proj_a", productId: "p1" };
  const scopeOther = { projectId: "proj_a", productId: "prd_a" };
  assert.deepEqual(docReadKeys("pcb", scopeHead, "p1"), { key: "ideeza:pcb:doc:proj_a:p1", adoptFrom: "ideeza:pcb:doc:proj_a" });
  assert.deepEqual(docReadKeys("pcb", scopeOther, "p1"), { key: "ideeza:pcb:doc:proj_a:prd_a", adoptFrom: null });
});

test("docReadKeys never adopts a global doc, even on the first row", () => {
  const scopeHead = { projectId: "proj_a", productId: "p1" };
  assert.equal(docReadKeys("code.files", scopeHead, "p1").adoptFrom, null);
  assert.equal(docReadKeys("three.shapes", scopeHead, "p1").adoptFrom, null);
});

test("seedRecordKey and prevKey", () => {
  assert.equal(seedRecordKey({ projectId: "proj_a", productId: "prd_a" }), "ideeza:editor:seed:proj_a:prd_a");
  assert.equal(prevKey("ideeza:pcb:doc:proj_a:prd_a"), "ideeza:pcb:doc:proj_a:prd_a:prev");
});

test("editorKeysOf: every scoped doc per row, :prev only for the 5 seeded docs, and each row's seed record (BUILDLOAD C6)", () => {
  const keys = editorKeysOf("proj_a", ["p1", "prd_a"]);
  // 11 docs + 5 :prev backups + 1 seed record, per row
  assert.equal(keys.length, 2 * (11 + 5 + 1));

  for (const rowId of ["p1", "prd_a"]) {
    const scope = { projectId: "proj_a", productId: rowId };
    assert.ok(keys.includes(seedRecordKey(scope)), `seed record for ${rowId}`);
    for (const doc of ["pcb", "three.shapes", "three.ai", "code.files", "wiring"]) {
      assert.ok(keys.includes(prevKey(editorDocKey(doc, scope))), `${doc}:prev for ${rowId}`);
    }
    // a non-seeded doc has no :prev entry
    assert.ok(!keys.includes(prevKey(editorDocKey("assembly", scope))));
  }

  // the 4 legacy per-project keys are NOT here — projectStorageKeys adds those once
  assert.ok(!keys.includes("ideeza:pcb:doc:proj_a"));
});
