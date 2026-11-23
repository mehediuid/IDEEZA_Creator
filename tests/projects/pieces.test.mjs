// What to build (src/lib/create/pieces.ts): which pieces a product's build
// makes, what they cost and take, and the pieces each one needs.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aboutTime,
  cleanPick,
  creditsLabel,
  defaultPick,
  isLeftOut,
  pickCost,
  pickSeconds,
  pickSummary,
  pickedKinds,
  presetOf,
  qualityOf,
  togglePiece,
  WHOLE_PRODUCT_COSTS,
  wholeProductCost,
  withPreset,
  withQuality,
} from "../../.tmp-test/lib/create/pieces.js";
import { readFileSync } from "node:fs";

test("the whole product: the editor's five pieces and the Parts list, at Medium", () => {
  const p = defaultPick();
  assert.deepEqual(pickedKinds(p), ["pcb", "code", "3d", "assembly", "wiring", "parts"]);
  // PCB, Code and 3D Module at 2 credits each at Medium, Assembly and
  // Wiring 1 each; Parts free.
  assert.equal(pickCost(p), 8);
  assert.equal(pickSummary(p), "Whole product");
  assert.equal(aboutTime(pickSeconds(p)), "about 1 min");
});

test("a stored pick that is missing or malformed reads as every piece", () => {
  assert.deepEqual(cleanPick(undefined), defaultPick());
  assert.deepEqual(cleanPick({ pcb: "yes" }), defaultPick());
  // Quality and Optimize only where the piece has them.
  const p = cleanPick({ wiring: { on: true, quality: "high", optimize: true }, pcb: { on: false } });
  assert.equal(p.wiring.quality, "medium");
  assert.equal(p.wiring.optimize, false);
  assert.equal(p.pcb.on, false);
});

test("unticking the PCB takes out what is made for it, and says so", () => {
  const r = togglePiece(defaultPick(), "pcb");
  assert.deepEqual(pickedKinds(r.pick), ["3d", "parts"]);
  assert.equal(r.note, "Took out Code, Assembly and Wiring too — they need the PCB.");
});

test("ticking Code adds the PCB it is made for", () => {
  const start = withPreset(defaultPick(), "enclosure");
  const r = togglePiece(start, "code");
  assert.deepEqual(pickedKinds(r.pick), ["pcb", "code", "3d", "parts"]);
  assert.equal(r.note, "Added PCB — Code is made from it.");
});

test("Assembly is made from the PCB and the 3D Module", () => {
  const r = togglePiece(withPreset(defaultPick(), "pcb"), "assembly");
  assert.deepEqual(pickedKinds(r.pick), ["pcb", "3d", "assembly", "parts"]);
  assert.equal(r.note, "Added 3D Module — Assembly is made from it.");
  // Taking the 3D Module out takes Assembly with it.
  const back = togglePiece(r.pick, "3d");
  assert.deepEqual(pickedKinds(back.pick), ["pcb", "parts"]);
  assert.equal(back.note, "Took out Assembly too — it needs the 3D Module.");
});

test("the Parts list comes with any picked piece, and never on its own", () => {
  // Not a choice: ticking it does nothing, and it follows the other pieces.
  assert.deepEqual(togglePiece(defaultPick(), "parts").pick, defaultPick());
  assert.deepEqual(pickedKinds(withPreset(defaultPick(), "pcb")), ["pcb", "parts"]);
  let p = withPreset(defaultPick(), "enclosure");
  p = togglePiece(p, "3d").pick;
  assert.deepEqual(pickedKinds(p), []);
  assert.equal(pickSummary(p), "Nothing picked");
  // A stored pick that had it off beside a piece, or on alone, is put right.
  assert.equal(cleanPick({ parts: { on: false } }).parts.on, true);
  const alone = cleanPick({
    pcb: { on: false },
    code: { on: false },
    "3d": { on: false },
    assembly: { on: false },
    wiring: { on: false },
    parts: { on: true },
  });
  assert.deepEqual(pickedKinds(alone), []);
});

test("a custom pick counts the five pieces a maker picks", () => {
  const p = togglePiece(withPreset(defaultPick(), "pcb"), "code").pick;
  assert.equal(pickSummary(p), "2 of 5 pieces");
  assert.equal(pickSummary(withPreset(defaultPick(), "enclosure")), "3D Module only");
});

test("presets, quality and optimize change the cost and the time", () => {
  const pcb = withPreset(defaultPick(), "pcb");
  assert.equal(presetOf(pcb), "pcb");
  assert.equal(pickCost(pcb), 2);
  assert.equal(aboutTime(pickSeconds(pcb)), "about 45 s");
  const high = { ...pcb, pcb: { ...pcb.pcb, quality: "high", optimize: true } };
  assert.equal(pickCost(high), 4);
  // 5 s of parts, then 90 s at High plus 30 s optimizing.
  assert.equal(pickSeconds(high), 125);
  const none = Object.fromEntries(Object.entries(defaultPick()).map(([k, c]) => [k, { ...c, on: false }]));
  assert.equal(pickSummary(none), "Nothing picked");
  assert.equal(pickSeconds(none), 0);
});

test("credits read as words", () => {
  assert.equal(creditsLabel(0), "Free");
  assert.equal(creditsLabel(1), "1 credit");
  assert.equal(creditsLabel(6), "6 credits");
});

test("only a piece the maker left out can be added later", () => {
  assert.equal(isLeftOut({ kind: "pcb", status: "skipped", progress: 0, omitted: true }), true);
  // An old build that never had the piece.
  assert.equal(isLeftOut({ kind: "pcb", status: "skipped", progress: 0 }), false);
  assert.equal(isLeftOut({ kind: "pcb", status: "ready", progress: 100 }), false);
});

test("Low, Medium and High each have their own price", () => {
  assert.equal(pickCost(withQuality(defaultPick(), "low")), 5);
  assert.equal(pickCost(withQuality(defaultPick(), "medium")), 8);
  assert.equal(pickCost(withQuality(defaultPick(), "high")), 11);
  // Low is quicker, High slower.
  const sec = (q) => pickSeconds(withQuality(defaultPick(), q));
  assert.ok(sec("low") < sec("medium") && sec("medium") < sec("high"));
});

test("a product starts at the Quality its chat was started with on Home", () => {
  const p = cleanPick(undefined, "high");
  assert.equal(qualityOf(p), "high");
  assert.equal(p.pcb.quality, "high");
  // Pieces without levels keep Medium, which their price ignores.
  assert.equal(p.wiring.quality, "medium");
  assert.equal(pickCost(p), 11);
  // A level chosen on the card wins over the chat's.
  const chosen = cleanPick({ pcb: { on: true, quality: "low" }, code: { on: true, quality: "low" }, "3d": { on: true, quality: "low" } }, "high");
  assert.equal(qualityOf(chosen), "low");
  assert.equal(pickCost(chosen), 5);
});

test("the card's Quality sets every piece that has one", () => {
  const p = withQuality(defaultPick(), "low");
  assert.deepEqual([p.pcb.quality, p.code.quality, p["3d"].quality], ["low", "low", "low"]);
  assert.equal(p.assembly.quality, "medium");
  assert.equal(qualityOf(p), "low");
  // The pieces picked stay picked.
  assert.deepEqual(pickedKinds(withQuality(withPreset(defaultPick(), "enclosure"), "high")), ["3d", "parts"]);
});

test("a whole product's build is 5, 8 or 11 credits by Quality, and the words say so", () => {
  assert.deepEqual([wholeProductCost("low"), wholeProductCost("medium"), wholeProductCost("high")], [5, 8, 11]);
  assert.equal(wholeProductCost(), 8);
  assert.equal(WHOLE_PRODUCT_COSTS, "5, 8 or 11");
  // The FAQs and tutorials (web and phone) no longer price a build at 4 a product.
  for (const path of ["lib/support/faq.ts", "lib/tutorials/content.ts", "components/credits/plans-panel.tsx"]) {
    const text = readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /\b4 (credits )?(for|per) each product|4 credits per product/, path);
  }
});

