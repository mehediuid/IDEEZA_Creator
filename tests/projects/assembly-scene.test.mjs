// The assembly end to end, without a browser: a 3D Module case and lid, a
// PCB with four mounting holes and two nets, an off-board battery. Place
// inside, the lid, the checks, Snap, the wires the board asks for, patterns,
// explode, the stored document (src/lib/assembly/*).
import test from "node:test";
import assert from "node:assert/strict";
import { composeScene, describeIssue, explodeOffsets, summarize } from "../../.tmp-test/lib/assembly/scene.js";
import { applyPlan, lidPlan, placeInsidePlan, snapPlan } from "../../.tmp-test/lib/assembly/place.js";
import { pcbPart, pcbFacts } from "../../.tmp-test/lib/assembly/model-pcb.js";
import { threeParts, isPristineScene } from "../../.tmp-test/lib/assembly/model-three.js";
import { libraryKindOf, libraryPart, nextLabel } from "../../.tmp-test/lib/assembly/library.js";
import { parseAsmDoc, serializeAsmDoc, isAsmDocStarted } from "../../.tmp-test/lib/assembly/doc.js";
import { suggestWires, wireGeometry, netMatches } from "../../.tmp-test/lib/assembly/wiring.js";
import { enclosureGeometry, newEnclosurePair, normalizeEnclosure } from "../../.tmp-test/lib/three/enclosure.js";
import { apply } from "../../.tmp-test/lib/assembly/math.js";

const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`);

// A 96 × 66 × 28 case, bottom on the floor (3D Module units: 10 mm), bosses 76 × 46 apart.
function shapes(caseH = 28) {
  const { base, lid } = newEnclosurePair("g1", { w: 96, d: 66, h: caseH });
  base.openings = [{ id: "o1", side: "+x", u: 0, v: 11.9, w: 10, h: 4.5 }];
  return [
    { id: "case", type: "enclosure", position: [0, caseH / 20, 0], rotation: [0, 0, 0], scale: [1, 1, 1], hidden: false, locked: false, name: "Case", enclosure: base },
    { id: "lid", type: "enclosure", position: [0, (caseH + 1.5) / 10, 0], rotation: [0, 0, 0], scale: [1, 1, 1], hidden: false, locked: false, name: "Lid", enclosure: lid },
    { id: "hidden-board", type: "box", position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], hidden: true, locked: false },
  ];
}
const px = (mm) => 60 + mm * 10;
const hole = (id, x, z) => ({ id, kind: "mountingHole", x: px(x), y: px(z), scope: "pcb" });
// An 80 × 50 mm board (6 mm of room to each wall for wires): holes 2 mm in from each corner (76 × 46 apart), R1 on VBAT/GND, U1, an edge connector J1.
const pcbDoc = {
  pcbBoard: { width: 800, height: 500 },
  objects: [
    hole("h1", 2, 2), hole("h2", 78, 2), hole("h3", 2, 48), hole("h4", 78, 48),
    { id: "r1", kind: "fp0805", x: 300, y: 300, rotation: 0, text: "R1", footprint: "R_0805", side: "top", scope: "pcb" },
    { id: "u1", kind: "fpSOIC8", x: 500, y: 300, rotation: 0, text: "U1", footprint: "SOIC-8", side: "top", scope: "pcb" },
    { id: "j1", kind: "fp0805", x: px(76), y: px(25), rotation: 0, text: "J1", footprint: "R_0805", side: "top", scope: "pcb" },
    { id: "rat1", kind: "ratsnest", x: 290, y: 300, endX: 480, endY: 280, net: "VBAT", scope: "pcb" },
    { id: "rat2", kind: "ratsnest", x: 310, y: 300, endX: 520, endY: 320, net: "GND", scope: "pcb" },
    { id: "sch", kind: "resistor", x: 10, y: 10, text: "Rx" }, // a schematic symbol: never on the board
  ],
};
function sources(caseH) {
  return { pcb: pcbPart(pcbDoc), three: threeParts(shapes(caseH)) };
}
function startDoc() {
  return {
    v: 1, mode: "assembly", brought: true, clearanceMm: 0.5, mates: [], wires: [], patterns: [],
    instances: [
      { id: "three:case", source: "three", ref: "case", grounded: true },
      { id: "three:lid", source: "three", ref: "lid" },
      { id: "pcb", source: "pcb", ref: "board", pose: { p: [0, 60, 0], q: [0, 0, 0, 1] } },
      { id: "lib:1", source: "library", ref: "lipo-503450", label: "BT1", pose: { p: [0, 90, 0], q: [0, 0, 0, 1] } },
    ],
  };
}

test("the PCB part: true mm, holes as axes, nets from the ratsnest, a port at the edge, no schematic symbols", () => {
  const part = pcbPart(pcbDoc);
  assert.deepEqual(pcbFacts(pcbDoc), { w: 80, d: 50, parts: 3 });
  assert.equal(part.features.filter((f) => f.id.startsWith("hole:")).length, 4);
  const pads = part.pins.filter((p) => p.label.startsWith("R1."));
  assert.deepEqual(pads.map((p) => p.net), ["VBAT", "GND"]);
  assert.ok(!part.solids.some((s) => s.name === "Rx"));
  assert.equal(part.ports.length, 1);
  assert.deepEqual(part.ports[0].dir, [1, 0, 0]); // J1 faces the nearest (right) edge
  near(part.solids[0].slab.thickness, 1.6);
});

test("3D shapes: hidden ones aren't parts; the case is hollow with bosses and an opening", () => {
  const parts = threeParts(shapes());
  assert.deepEqual(parts.map((p) => p.name), ["Case", "Lid"]);
  const base = parts[0];
  assert.equal(base.enclosure.role, "base");
  assert.equal(base.features.filter((f) => f.id.startsWith("axis:boss:")).length, 4);
  assert.equal(base.enclosure.openings.length, 1);
  near(base.defaultPose.p[1], 14);
  assert.equal(isPristineScene([{ id: "default-cube", type: "box", position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], hidden: false, locked: false }]), true);
});

test("enclosure geometry: an opening cuts its wall into pieces; limits hold", () => {
  const { base } = newEnclosurePair("g", {});
  const plain = enclosureGeometry(base);
  base.openings = [{ id: "o", side: "+x", u: 0, v: 14, w: 10, h: 4 }];
  const cut = enclosureGeometry(base);
  const walls = (g) => g.boxes.filter((b) => b.id.startsWith("wall+x")).length;
  assert.equal(walls(plain), 1);
  assert.equal(walls(cut), 4);
  assert.equal(cut.bosses.length, 4);
  const n = normalizeEnclosure({ ...base, w: 2, wall: 50, openings: [{ id: "o", side: "+z", u: 999, v: -5, w: 500, h: 1 }] });
  assert.equal(n.w, 10);
  assert.ok(n.wall <= n.w / 4);
  assert.ok(n.openings[0].w <= n.w);
});

test("before placing: the case and the designed lid are placed; the lifted board and battery aren't checked", () => {
  const scene = composeScene(startDoc(), sources());
  const byId = Object.fromEntries(scene.items.map((i) => [i.rec.id, i]));
  assert.equal(byId["three:case"].placed, true);
  assert.equal(byId["three:lid"].placed, true);
  assert.equal(byId.pcb.placed, false);
  assert.equal(byId["lib:1"].placed, false);
  assert.equal(scene.fit.problems.length, 0);
  assert.equal(scene.holes, null);
});

test("Place inside: the board's four holes land on the four bosses, seated on their tops, fully placed", () => {
  let doc = startDoc();
  const plan = placeInsidePlan(composeScene(doc, sources()), "pcb");
  assert.equal(plan.ok, true, plan.error);
  assert.match(plan.message, /4 holes matched/);
  doc = applyPlan(doc, "pcb", plan);
  const scene = composeScene(doc, sources());
  assert.deepEqual([...scene.mates.values()], ["ok", "ok", "ok"]);
  assert.equal(scene.freedom.get("pcb"), 0);
  assert.deepEqual(scene.holes, { holes: 4, onBosses: 4, worst: 0 });
  const pcb = scene.items.find((i) => i.rec.id === "pcb");
  near(apply(pcb.pose, [0, 0, 0])[1], 10); // board bottom on the boss tops: floor 2 + boss 8
  assert.equal(scene.fit.problems.length, 0);
  // The edge connector faces the case's right-wall opening.
  assert.deepEqual(scene.openings.map((o) => [o.port, o.ok]), [["J1", true]]);
  // The lid over the tallest part (U1, 1.5 mm on a 1.6 mm board at 10): 28 − 13.1.
  near(scene.lid.gap, 14.9);
  assert.equal(scene.lid.part, "U1");
});

test("Place inside: the battery goes on the floor under the board without touching it", () => {
  let doc = startDoc();
  doc = applyPlan(doc, "pcb", placeInsidePlan(composeScene(doc, sources()), "pcb"));
  const plan = placeInsidePlan(composeScene(doc, sources()), "lib:1");
  assert.equal(plan.ok, true, plan.error);
  doc = applyPlan(doc, "lib:1", plan);
  const scene = composeScene(doc, sources());
  const bat = scene.items.find((i) => i.rec.id === "lib:1");
  near(apply(bat.pose, [0, 0, 0])[1], 2);
  assert.equal(scene.fit.problems.length, 0);
  assert.equal(summarize(doc, scene, 1).placed, 4);
});

test("a short case: the lid hits U1 and says by how much", () => {
  let doc = startDoc();
  doc = applyPlan(doc, "pcb", placeInsidePlan(composeScene(doc, sources(12.6)), "pcb"));
  const scene = composeScene(doc, sources(12.6));
  // floor 2, boss height clamps to the case, board on the bosses; the lid's underside at 12.6.
  const hit = scene.fit.problems.find((p) => p.kind === "overlap");
  assert.ok(hit, JSON.stringify(scene.fit.problems));
  assert.match(describeIssue(hit, 0.5), /^U1 hits the Lid by \d+\.\d mm$/);
  assert.ok(scene.lid.gap < 0);
});

test("Close the lid: a lid lifted off the case goes back on the rim, locked", () => {
  let doc = startDoc();
  doc.instances = doc.instances.map((i) => (i.id === "three:lid" ? { ...i, pose: { p: [20, 80, 0], q: [0, 0, 0, 1] }, placed: false } : i));
  const plan = lidPlan(composeScene(doc, sources()), "three:lid");
  assert.equal(plan.ok, true, plan.error);
  doc = applyPlan(doc, "three:lid", plan);
  const scene = composeScene(doc, sources());
  const lid = scene.items.find((i) => i.rec.id === "three:lid");
  near(lid.pose.p[0], 0);
  near(lid.pose.p[1], 29.5);
  assert.equal([...scene.mates.values()][0], "ok");
});

test("Snap: two faces become a Flush; a board hole on a boss also lines up a second hole", () => {
  const doc = startDoc();
  const scene = composeScene(doc, sources());
  const flush = snapPlan(scene, "lib:1", "face:bottom", "three:case", "face:floor");
  assert.equal(flush.ok, true);
  assert.deepEqual(flush.mates.map((m) => m.type), ["flush"]);
  const peg = snapPlan(scene, "pcb", "hole:h1", "three:case", "axis:boss:0");
  assert.equal(peg.ok, true, peg.error);
  assert.deepEqual(peg.mates.map((m) => m.type), ["concentric", "flush", "concentric"]);
  const after = composeScene(applyPlan(doc, "pcb", peg), sources());
  assert.equal(after.freedom.get("pcb"), 0);
  assert.equal(after.holes.onBosses, 4);
  assert.equal(snapPlan(scene, "three:case", "face:bottom", "pcb", "face:top").ok, false); // the case is fixed
});

test("wires: the board asks for the battery's two leads; the routed wire measures and passes no part", () => {
  let doc = startDoc();
  doc = applyPlan(doc, "pcb", placeInsidePlan(composeScene(doc, sources()), "pcb"));
  doc = applyPlan(doc, "lib:1", placeInsidePlan(composeScene(doc, sources()), "lib:1"));
  const scene = composeScene(doc, sources());
  const s = suggestWires(scene, doc);
  assert.deepEqual(s.map((x) => [x.label, x.net, x.color]), [["BT1 + → R1.1", "VBAT", "#dc2626"], ["BT1 − → R1.2", "GND", "#111827"]]);
  const w = { id: "w1", name: "Wiring1", from: s[0].from, to: s[0].to, gauge: 22, color: s[0].color, sleeveMm: 0.5, slackPct: 10, points: [] };
  const g = wireGeometry(scene, w);
  assert.equal(g.ok, true, g.reason);
  assert.ok(g.length > 10);
  near(g.cut, g.length * 1.1, 1e-6);
  assert.deepEqual(g.through, []);
  assert.equal(g.nets.same, true);
  assert.equal(netMatches("VBAT", "+5V"), true);
  assert.equal(netMatches("GND", "VBAT"), false);
});

test("a linear pattern copies the battery; explode lifts parts in stacking order", () => {
  let doc = startDoc();
  doc = applyPlan(doc, "lib:1", placeInsidePlan(composeScene(doc, sources()), "lib:1"));
  doc = { ...doc, patterns: [{ id: "pat1", kind: "linear", seed: "lib:1", count: 3, spacing: 6, axis: [0, 0, 1] }] };
  const scene = composeScene(doc, sources());
  const copies = scene.items.filter((i) => i.copyOf === "pat1");
  assert.deepEqual(copies.map((c) => c.rec.label), ["BT1-2", "BT1-3"]);
  const ex = explodeOffsets(scene, 1);
  assert.equal(ex.get("three:case")[1], 0);
  assert.ok(ex.get("three:lid")[1] > ex.get("lib:1")[1]);
});

test("the stored document: the old checklist reads as empty; v1 round-trips; bad rows are dropped", () => {
  assert.equal(parseAsmDoc('{"pcb-fp-R1-0":true}').instances.length, 0);
  assert.equal(isAsmDocStarted('{"pcb-fp-R1-0":true}'), false);
  const doc = startDoc();
  doc.mates = [{ id: "m1", name: "Flush1", type: "flush", a: { inst: "three:case", feature: "face:floor" }, b: { inst: "lib:1", feature: "face:bottom" } }, { id: "bad" }];
  const back = parseAsmDoc(serializeAsmDoc(doc));
  assert.equal(back.instances.length, 4);
  assert.equal(back.mates.length, 1);
  assert.equal(isAsmDocStarted(serializeAsmDoc(doc)), true);
});

test("the library: a built product's battery and speaker map to library parts; labels count up", () => {
  assert.equal(libraryKindOf("BT1", "LiPo 3.7V 1000mAh"), "lipo-503450");
  assert.equal(libraryKindOf("LS1", "Speaker 8 ohm"), "speaker-28");
  assert.equal(libraryKindOf("R1", "10k resistor"), null);
  assert.equal(nextLabel("lipo-503450", ["BT1"]), "BT2");
  assert.equal(libraryPart("x", "nope"), null);
});
