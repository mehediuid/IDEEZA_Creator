// The product ⋯ menu (owner, 2026-11-15): Edit name and description's record write, Delete
// product's blocks, its What goes / What stays plan and the typed-name rule, and the record and
// keys a delete removes. Compiled by tests/projects/tsconfig.json:
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  productDeleteBlockOf,
  productDeleteFactsOf,
  productDeletePlanOf,
} from "../../.tmp-test/lib/manual/delete-plan.js";
import { editorKeysOf } from "../../.tmp-test/lib/manual/editor-scope.js";
import { productDetailsPatch, productStorageKeys, withoutProduct } from "../../.tmp-test/lib/manual/product-edit.js";

const FLOW_STATE = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };
const project = (over = {}) => ({
  id: "proj_lamp",
  slug: "lamp",
  name: "Lamp",
  productName: "Lamp",
  description: "A desk lamp.",
  status: "draft",
  createdAt: 1_000,
  updatedAt: 2_000,
  flowState: FLOW_STATE,
  ...over,
});
const ROWS = [
  { id: "prd_lamp", name: "Lamp", description: "The lamp.", source: { buildId: "b1", productId: "primary" } },
  { id: "prd_remote", name: "Remote", description: "Its remote.", source: { buildId: "b1", productId: "c1" } },
];

// ─────────────────────────── Edit name and description ───────────────────────────

test("a stored row takes its new name and description, and the first row keeps the headline", () => {
  const p = project({ products: ROWS });
  const patch = productDetailsPatch(p, "prd_lamp", { name: "  Glow ", description: " Warm light. " }, 9_000);
  assert.equal(patch.productName, "Glow");
  assert.deepEqual(patch.products[0], { ...ROWS[0], name: "Glow", description: "Warm light.", updatedAt: 9_000 });
  assert.deepEqual(patch.products[1], ROWS[1]);
  const second = productDetailsPatch(p, "prd_remote", { name: "Remote", description: "" }, 9_000);
  assert.equal(second.productName, undefined);
  assert.equal(second.products[1].description, "");
});

test("an empty name, an unknown row or no change writes nothing", () => {
  const p = project({ products: ROWS });
  assert.deepEqual(productDetailsPatch(p, "prd_lamp", { name: "  ", description: "x" }, 9_000), {});
  assert.deepEqual(productDetailsPatch(p, "prd_gone", { name: "X", description: "" }, 9_000), {});
  assert.deepEqual(productDetailsPatch(p, "prd_lamp", { name: "Lamp", description: "The lamp." }, 9_000), {});
});

test("the virtual p1: a name alone writes productName, a description stores the row", () => {
  const p = project();
  assert.deepEqual(productDetailsPatch(p, "p1", { name: "Glow", description: "A desk lamp." }, 9_000), { productName: "Glow" });
  assert.deepEqual(productDetailsPatch(p, "p1", { name: "Lamp", description: "A desk lamp." }, 9_000), {});
  assert.deepEqual(productDetailsPatch(p, "p1", { name: "Lamp", description: "Its own words." }, 9_000), {
    productName: "Lamp",
    products: [{ id: "p1", name: "Lamp", description: "Its own words.", updatedAt: 9_000 }],
  });
  assert.deepEqual(productDetailsPatch(p, "prd_x", { name: "Lamp", description: "" }, 9_000), {});
});

// ─────────────────────────── the record and its keys ───────────────────────────

test("withoutProduct drops the row, its resume record and the cover it gave", () => {
  const p = project({
    products: ROWS,
    editorOpened: { prd_lamp: { step: "pcb", at: 1 }, prd_remote: { step: "code", at: 2 } },
    lastOpened: { step: "code", at: 2, productId: "prd_remote" },
    cover: { buildId: "b1", productId: "c1" },
  });
  const next = withoutProduct(p, "prd_remote", 9_000);
  assert.deepEqual(next.products, [ROWS[0]]);
  assert.deepEqual(next.editorOpened, { prd_lamp: { step: "pcb", at: 1 } });
  assert.equal("lastOpened" in next, false);
  assert.equal(next.cover, null);
  assert.equal(next.productName, "Lamp");
  assert.equal(next.updatedAt, 9_000);
});

test("deleting the first row moves the headline; another cover and resume stay", () => {
  const p = project({ products: ROWS, cover: { buildId: "b9", productId: "primary" }, lastOpened: { step: "pcb", at: 1, productId: "prd_remote" } });
  const next = withoutProduct(p, "prd_lamp", 9_000);
  assert.equal(next.productName, "Remote");
  assert.deepEqual(next.cover, { buildId: "b9", productId: "primary" });
  assert.deepEqual(next.lastOpened, { step: "pcb", at: 1, productId: "prd_remote" });
});

test("a project's only product, or a row it doesn't hold, can't go", () => {
  assert.equal(withoutProduct(project(), "p1", 9_000), null);
  assert.equal(withoutProduct(project({ products: [ROWS[0]] }), "prd_lamp", 9_000), null);
  assert.equal(withoutProduct(project({ products: ROWS }), "prd_gone", 9_000), null);
});

test("the keys: the row's editor documents, and the legacy keys only for the first row", () => {
  const own = editorKeysOf("proj_lamp", ["prd_remote"]);
  assert.deepEqual(productStorageKeys("proj_lamp", "prd_remote", false), own);
  const head = productStorageKeys("proj_lamp", "prd_lamp", true);
  assert.ok(head.includes("ideeza:pcb:doc:proj_lamp"));
  assert.ok(head.includes("ideeza:three:aimodel:proj_lamp"));
  assert.ok(!head.some((k) => k.includes("prd_remote")));
});

// ─────────────────────────── the blocks ───────────────────────────

const FREE = { marketUnreadable: false, sold: { sharePct: 0, editions: 0 }, auction: null, listed: false, otherOwners: [] };
const sale = (productId) => ({ item: { nft: "physical", trackId: "t", productId, productName: "x", use: "private", tier: "regular" } });
const track = (productId, listed) => ({ productId, listing: listed ? { listedAt: 1 } : null });
const facts = (over = {}) =>
  productDeleteFactsOf({ products: 2, deleteFacts: FREE, sales: [], editions: [], ...over }, "prd_remote");

test("nothing sold or listed and another product left: Delete is open", () => {
  assert.equal(productDeleteBlockOf(facts()), null);
  // Another product's unlisted copies and a sale of it don't block this one.
  assert.equal(productDeleteBlockOf(facts({ sales: [sale("prd_lamp")], editions: [track("prd_lamp", true)] })), null);
});

test("the project's only product is blocked first, with the way out", () => {
  assert.deepEqual(productDeleteBlockOf(facts({ products: 1, deleteFacts: { ...FREE, listed: true } })), {
    id: "onlyProduct",
    reason: "A project needs at least one product. Delete the project instead.",
  });
});

test("its copies sold or listed block it, and so do the whole project's", () => {
  assert.equal(productDeleteBlockOf(facts({ sales: [sale("prd_remote")] })).id, "copiesSold");
  assert.equal(productDeleteBlockOf(facts({ sales: [sale("project")] })).reason, "Copies of the whole project have sold, so its products can't be deleted.");
  assert.deepEqual(productDeleteBlockOf(facts({ editions: [track("prd_remote", true)] })), {
    id: "copiesListed",
    reason: "Its copies are on the marketplace. Remove the listing in Earn › Sell first.",
  });
  assert.equal(productDeleteBlockOf(facts({ editions: [track("project", true)] })).id, "copiesListed");
  // Copies set up but never listed don't block: the dialog lists them instead.
  assert.equal(productDeleteBlockOf(facts({ editions: [track("prd_remote", false)] })), null);
});

test("the Main NFT sold, in an auction or listed blocks it", () => {
  assert.equal(productDeleteBlockOf(facts({ deleteFacts: { ...FREE, sold: { sharePct: 10, editions: 0 } } })).id, "mainSold");
  assert.deepEqual(productDeleteBlockOf(facts({ deleteFacts: { ...FREE, auction: { endsAt: 5 } } })), {
    id: "mainAuction",
    reason: "The project's Main NFT is in an auction. Close it in Earn › Sell first.",
  });
  assert.deepEqual(productDeleteBlockOf(facts({ deleteFacts: { ...FREE, listed: true } })), {
    id: "mainListed",
    reason: "The project's Main NFT is listed. Remove the listing in Earn › Sell first.",
  });
});

test("unreadable marketplace records block it", () => {
  assert.equal(productDeleteBlockOf(facts({ deleteFacts: { ...FREE, marketUnreadable: true } })).id, "marketUnreadable");
});

// ─────────────────────────── the plan ───────────────────────────

const NOTHING = {
  pcb: { state: "not-opened" },
  code: { state: "none" },
  three: { state: "none" },
  assembly: { state: "none" },
  wiring: { state: "not-opened" },
  preview: { state: "none" },
};
const planInput = (over = {}) => ({
  products: 2,
  work: NOTHING,
  copies: [],
  shipping: false,
  activity: { entries: 0, files: 0 },
  takes: 0,
  snapshots: 0,
  cover: false,
  built: false,
  ...over,
});

test("a product with nothing in it gets the plain confirm", () => {
  assert.deepEqual(productDeletePlanOf(planInput()), {
    goes: ["The product — its name and description"],
    stays: ["The project and its other product"],
    typed: false,
  });
});

test("editor work asks for the typed name; the sample circuit doesn't", () => {
  const work = productDeletePlanOf(planInput({ work: { ...NOTHING, pcb: { state: "work", text: "12 objects · 4 on the board" } } }));
  assert.deepEqual(work.goes.slice(1), ["The PCB board — 12 objects · 4 on the board"]);
  assert.equal(work.typed, true);
  const sample = productDeletePlanOf(planInput({ work: { ...NOTHING, pcb: { state: "sample" } } }));
  assert.deepEqual(sample.goes.slice(1), ["The PCB board — the sample circuit only"]);
  assert.equal(sample.typed, false);
});

test("its NFT copies are a mint record: listed, and the typed name asked", () => {
  const plan = productDeletePlanOf(
    planInput({ copies: [{ kind: "physical", use: "private" }, { kind: "virtual", use: "commercial" }], shipping: true }),
  );
  assert.deepEqual(plan.goes.slice(1), [
    "Its NFT copies, never listed — Physical (private use), Virtual (commercial use)",
    "Its shipping plan for physical copies",
  ]);
  assert.equal(plan.typed, true);
});

test("activity, video, snapshots, the cover and the build each get their line", () => {
  const plan = productDeletePlanOf(
    planInput({ products: 3, activity: { entries: 2, files: 1 }, takes: 1, snapshots: 3, cover: true, built: true }),
  );
  assert.deepEqual(plan.goes.slice(1), [
    "Its activity history — 2 entries and 1 activity file",
    "Its video — 1 take",
    "Its snapshots on the Media tab — 3 pictures",
    "Its image as the project cover — the project goes back to its default cover",
  ]);
  assert.deepEqual(plan.stays, [
    "The project and its other 2 products",
    "The build it came from stays in History and in the project's versions.",
  ]);
  assert.equal(plan.typed, false);
});
