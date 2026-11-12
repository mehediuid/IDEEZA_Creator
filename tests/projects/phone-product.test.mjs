// The phone's product page (mobile Figma "Product Details · 2026 update"): its tabs for the owner
// and a buyer, the query a link keeps, the Build list's rows and lines, the buy bar's lowest
// price, an activity entry's product prices and the version sheet's rows.
import { test } from "node:test";
import assert from "node:assert/strict";

const p = await import("../../.tmp-test/lib/manual/phone-product.js");

test("the owner's tabs, a buyer's, and none for a product no build stands behind", () => {
  assert.deepEqual(p.productTabsOf({ buyer: false, built: true, contributors: true }).map((t) => t.label), ["Overview", "Build", "Media"]);
  assert.deepEqual(
    p.productTabsOf({ buyer: true, built: true, contributors: true }).map((t) => t.label),
    ["Media", "Overview", "Build", "Contributors"],
  );
  assert.deepEqual(p.productTabsOf({ buyer: true, built: true, contributors: false }).map((t) => t.id), ["media", "overview", "build"]);
  assert.deepEqual(p.productTabsOf({ buyer: false, built: false, contributors: false }), []);
  assert.deepEqual(p.productTabsOf({ buyer: true, built: false, contributors: false }).map((t) => t.id), ["media", "overview"]);
});

test("?tab= reads as the strip has it; the Feed's marketplace is the Overview", () => {
  const owner = p.productTabsOf({ buyer: false, built: true, contributors: false });
  const buyer = p.productTabsOf({ buyer: true, built: true, contributors: false });
  assert.equal(p.parseProductTab(null, owner), "overview");
  assert.equal(p.parseProductTab("build", owner), "build");
  assert.equal(p.parseProductTab("contributors", owner), "overview");
  assert.equal(p.parseProductTab(null, buyer), "media");
  assert.equal(p.parseProductTab("marketplace", buyer), "overview");
  assert.equal(p.parseProductTab("build", []), null);
});

test("a link keeps who is looking and the version, nothing else", () => {
  assert.equal(p.keptQuery("tab=build&view=market&v=2&x=1"), "?view=market&v=2");
  assert.equal(p.keptQuery("view=contributor&as=c1"), "?view=contributor&as=c1");
  assert.equal(p.keptQuery("", { v: "1" }), "?v=1");
  assert.equal(p.keptQuery("v=2", { v: null }), "");
  assert.equal(p.phoneProductPath("p 1", "prd_a", "build/pcb"), "/m/projects/p%201/products/prd_a/build/pcb");
  assert.equal(p.phoneProductPath("p1", "remote"), "/m/projects/p1/products/remote");
  assert.equal(p.parsePiece("3d"), "3d");
  assert.equal(p.parsePiece("firmware"), null);
});

const item = (kind, status, extra = {}) => ({ kind, status, progress: 0, ...extra });

test("the Build list: the build's order, every state, a never-built piece nowhere, Code behind a purchase", () => {
  const items = [
    item("parts", "ready", { progress: 100 }),
    item("pcb", "ready", { progress: 100 }),
    item("code", "failed"),
    item("3d", "skipped", { omitted: true }),
    item("assembly", "skipped"),
    item("wiring", "building", { progress: 63.6 }),
  ];
  const rows = p.pieceRowsOf(items, { firmware: true });
  assert.deepEqual(
    rows.map((r) => [r.kind, r.state]),
    [
      ["pcb", "ready"],
      ["code", "failed"],
      ["3d", "notBuilt"],
      ["wiring", "building"],
      ["parts", "ready"],
    ],
  );
  assert.equal(rows.find((r) => r.kind === "wiring").progress, 64);
  assert.deepEqual(p.pieceRowsOf(items, { firmware: false }).map((r) => r.kind), ["pcb", "3d", "wiring", "parts"]);
  assert.equal(p.pieceRowsOf([item("code", "pending")], { firmware: true })[0].state, "waiting");
  // Nobody but the owner who can still build reads the maker's left-out pieces.
  assert.deepEqual(p.pieceRowsOf(items, { firmware: true, leftOut: false }).map((r) => r.kind), ["pcb", "code", "wiring", "parts"]);
});

test("the line under each piece", () => {
  const facts = { board: "2-layer · 48 × 36 mm · 7 parts", mcu: "ESP32-C3", parts: 8 };
  const line = (kind, state, chat = true) => p.pieceLineOf({ kind, state, progress: 64 }, facts, { chat });
  assert.equal(line("pcb", "ready"), "2-layer · 48 × 36 mm · 7 parts");
  assert.equal(line("code", "ready"), "Firmware for the ESP32-C3");
  assert.equal(line("3d", "ready"), "Enclosure and parts in 3D");
  assert.equal(line("assembly", "ready"), "How the pieces fit together");
  assert.equal(line("wiring", "ready"), "Wires between the boards");
  assert.equal(line("parts", "ready"), "8 parts · bill of materials");
  assert.equal(line("code", "failed"), "This piece failed in this build. Retry it in the chat.");
  assert.equal(line("code", "failed", false), "This piece failed in this build.");
  assert.equal(line("wiring", "building"), "This piece is still being built — 64%.");
  assert.equal(line("code", "waiting"), "This piece is waiting to be built.");
  assert.equal(line("assembly", "notBuilt"), "Not built · 1 credit to add");
  assert.equal(line("3d", "notBuilt"), "Not built · 2 credits to add");
  assert.equal(p.notBuiltCostLine("3d"), "2 credits · about 30 s at Medium");
  assert.equal(p.aboutPieceTime(75), "about 1 min 15 s");
  assert.equal(p.aboutPieceTime(120), "about 2 min");
  assert.equal(p.notBuiltTitle("3d"), "3D Module isn’t built yet");
  assert.equal(p.piecesLine({ ready: 6, total: 6 }), "All 6 pieces ready");
  assert.equal(p.piecesLine({ ready: 2, total: 6 }), "2 of 6 pieces ready");
  assert.equal(p.PIECE_BADGE.notBuilt, "Not built");
});

const track = (id, kind, use, regular, extended, listed = true) => ({
  id,
  projectId: "p1",
  productId: "prd_a",
  kind,
  use,
  supply: { total: 10 },
  createdAt: 0,
  lazy: true,
  listing: listed ? { token: "ETH", regular, extended, royaltyPct: 5, listedAt: 1, updatedAt: 1 } : null,
  demo: true,
});

test("Copies from: the lowest price on sale now; none when nothing can be bought", () => {
  const tracks = [track("a", "physical", "private", "0.05", "0.07"), track("b", "virtual", "private", "0.01", "0.015"), track("c", "virtual", "commercial", "0.005", "0.006", false)];
  assert.deepEqual(p.copiesFromOf(tracks, () => false), { amount: "0.01", token: "ETH" });
  assert.deepEqual(p.copiesFromOf(tracks, (t) => t.id === "b"), { amount: "0.05", token: "ETH" });
  assert.equal(p.copiesFromOf(tracks, () => true), null);
  const sorted = [track("a", "physical", "private"), track("b", "virtual", "commercial"), track("c", "virtual", "private")].sort(p.copyOrder);
  assert.deepEqual(sorted.map((t) => t.id), ["c", "b", "a"]);
});

test("an entry's prices for one product, each kind from its lowest", () => {
  const pricing = {
    at: 1,
    token: "ETH",
    main: "0.25",
    editions: [
      { productId: "prd_a", kind: "physical", use: "commercial", regular: "0.12", extended: "0.15" },
      { productId: "prd_a", kind: "physical", use: "private", regular: "0.05", extended: "0.07" },
      { productId: "prd_b", kind: "virtual", use: "private", regular: "0.001", extended: "0.002" },
    ],
  };
  const out = p.productPricesOf(pricing, "prd_a");
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, "physical");
  assert.equal(out[0].from, "0.05");
  assert.deepEqual(out[0].rows.map((r) => r.use), ["private", "commercial"]);
  assert.deepEqual(p.productPricesOf(undefined, "prd_a"), []);
  assert.deepEqual(p.productPricesOf(pricing, "prd_b").map((x) => x.kind), ["virtual"]);
});

test("the version sheet: newest first, with the web's sub lines", () => {
  const rows = p.versionRowsOf(
    [
      { n: 1, at: 10, current: false, has: true, gone: false },
      { n: 2, at: null, current: true, has: false, gone: false },
      { n: 3, at: 30, current: false, has: true, gone: true },
    ],
    (at) => `day ${at}`,
  );
  assert.deepEqual(
    rows.map((r) => [r.label, r.sub]),
    [
      ["Version 3 of 3", "day 30 · build not in this browser"],
      ["Version 2 of 3", "current · not in this version"],
      ["Version 1 of 3", "day 10"],
    ],
  );
});

test("10p's sentence names the ready pieces only, in its own words", () => {
  const ready = (kind) => item(kind, "ready", { progress: 100 });
  assert.equal(p.hasPiecesLine([ready("pcb"), ready("code"), ready("wiring"), ready("parts")]), "It has a PCB, code, wiring and parts.");
  assert.equal(p.hasPiecesLine([item("pcb", "failed"), item("code", "building"), ready("parts")]), "It has parts.");
  assert.equal(p.hasPiecesLine([item("pcb", "failed")]), "");
});

test("a product typed by hand reads as made by hand, a legacy build row doesn't", () => {
  assert.equal(p.madeByHand("hand", null), true);
  assert.equal(p.madeByHand("unmatched", { id: "prd_ab12cd34" }), true);
  assert.equal(p.madeByHand("unmatched", { id: "p2" }), false);
  assert.equal(p.madeByHand("unmatched", { id: "prd_ab12cd34", source: { buildId: "b", productId: "primary" } }), false);
  assert.equal(p.madeByHand("build-gone", { id: "prd_ab12cd34" }), false);
});
