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
  togglePiece,
  withPreset,
} from "../../.tmp-test/lib/create/pieces.js";

test("the whole product at Medium costs what a build always did", () => {
  const p = defaultPick();
  assert.deepEqual(pickedKinds(p), ["3d", "pcb", "code", "wiring", "parts"]);
  assert.equal(pickCost(p), 4);
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
  assert.equal(r.note, "Took out Firmware code and Wiring too — they need the PCB.");
});

test("ticking Firmware code adds the PCB it is made for", () => {
  const start = withPreset(defaultPick(), "enclosure");
  const r = togglePiece(start, "code");
  assert.deepEqual(pickedKinds(r.pick), ["3d", "pcb", "code", "parts"]);
  assert.equal(r.note, "Added PCB — Firmware code is made from it.");
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
  const alone = cleanPick({ "3d": { on: false }, pcb: { on: false }, code: { on: false }, wiring: { on: false }, parts: { on: true } });
  assert.deepEqual(pickedKinds(alone), []);
});

test("a custom pick counts the four pieces a maker picks", () => {
  const p = togglePiece(withPreset(defaultPick(), "pcb"), "code").pick;
  assert.equal(pickSummary(p), "2 of 4 pieces");
});

test("presets, quality and optimize change the cost and the time", () => {
  const pcb = withPreset(defaultPick(), "pcb");
  assert.equal(presetOf(pcb), "pcb");
  assert.equal(pickCost(pcb), 1);
  assert.equal(aboutTime(pickSeconds(pcb)), "about 45 s");
  const high = { ...pcb, pcb: { ...pcb.pcb, quality: "high", optimize: true } };
  assert.equal(pickCost(high), 3);
  // 5 s of parts, then 90 s at High plus 30 s optimizing.
  assert.equal(pickSeconds(high), 125);
  assert.equal(pickSummary(withPreset(defaultPick(), "enclosure")), "Enclosure only");
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
