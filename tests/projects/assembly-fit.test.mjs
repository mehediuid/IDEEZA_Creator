import test from "node:test";
import assert from "node:assert/strict";

const { convexOf, sat, fitCheck, worldAabbOf } = await import("../../.tmp-test/lib/assembly/fit.js");
const { axisAngle, IDENTITY, Q0 } = await import("../../.tmp-test/lib/assembly/math.js");

const near = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${expected}, got ${actual}`);
const box = (center, size = [1, 1, 1], q) => ({ kind: "box", center, size, ...(q ? { q } : {}) });
const solid = (id, name, shape, extra = {}) => ({ id, name, shape, color: "#888", ...extra });
const part = (id, name, solids, extra = {}) => ({ id, name, pose: IDENTITY, placed: true, solids, ...extra });
const at = (p) => ({ p, q: Q0 });
const cx = (shape, pose = IDENTITY) => convexOf(shape, pose);

// A base cup (floor, 4 walls up to y=20, 4 bosses topping out at y=6), a lid
// plate whose underside is at lidY-1, and a board resting at pcbY with a tall
// capacitor C3 whose top is at pcbY + 14.6.
function enclosure({ pcbY = 6, lidY = 21 } = {}) {
  const bosses = [[-22, -12], [22, -12], [-22, 12], [22, 12]].map(([x, z], i) =>
    solid(`boss-${i + 1}`, `Boss ${i + 1}`, { kind: "cyl", center: [x, 4, z], r: 2.5, h: 4 }),
  );
  const base = part(
    "base",
    "Base",
    [
      solid("floor", "Floor", box([0, 1, 0], [60, 2, 40])),
      solid("wall-x0", "Wall", box([-29, 11, 0], [2, 18, 40])),
      solid("wall-x1", "Wall", box([29, 11, 0], [2, 18, 40])),
      solid("wall-z0", "Wall", box([0, 11, -19], [56, 18, 2])),
      solid("wall-z1", "Wall", box([0, 11, 19], [56, 18, 2])),
      ...bosses,
    ],
    { enclosure: { role: "base" } },
  );
  const lid = part("lid", "Lid", [solid("lid-plate", "Lid", box([0, 0, 0], [60, 2, 40]))], {
    enclosure: { role: "lid" },
    pose: at([0, lidY, 0]),
  });
  const pcb = part(
    "pcb",
    "Main board",
    [
      solid("board", "Board", box([0, 0.8, 0], [50, 1.6, 30])),
      solid("c3", "C3", { kind: "cyl", center: [10, 8.1, 0], r: 4, h: 13 }),
      solid("u1", "U1", box([-10, 2.1, 0], [8, 1, 8])),
    ],
    { pose: at([0, pcbY, 0]) },
  );
  return { base, lid, pcb };
}

test("convexOf builds the expected polyhedra", () => {
  const b = cx(box([0, 0, 0], [2, 4, 6]), at([10, 0, 0]));
  assert.equal(b.verts.length, 8);
  assert.equal(b.normals.length, 3);
  assert.equal(b.edges.length, 3);
  assert.deepEqual(b.aabb, { min: [9, -2, -3], max: [11, 2, 3] });

  const cyl = cx({ kind: "cyl", center: [0, 0, 0], r: 1, h: 2 });
  assert.equal(cyl.verts.length, 32);
  assert.equal(cyl.normals.length, 9); // 8 distinct side normals + the axis
  assert.equal(cyl.edges.length, 9);
  near(cyl.aabb.max[0], 1); // side faces are tangent to the true circle on ±x
  near(cyl.aabb.max[1], 1);

  const cone = cx({ kind: "cone", center: [0, 0, 0], r: 1, h: 2 });
  assert.equal(cone.verts.length, 17);
  assert.equal(cone.normals.length, 17);
  assert.equal(cone.edges.length, 24);
  near(cone.aabb.max[1], 1);
  near(cone.aabb.min[1], -1);

  const ball = cx({ kind: "sphere", center: [0, 0, 0], r: 2 });
  assert.equal(ball.verts.length, 58);
  near(ball.aabb.max[0], 2);
  near(ball.aabb.min[1], -2);

  for (const c of [b, cyl, cone, ball]) for (const n of [...c.normals, ...c.edges]) near(Math.hypot(...n), 1);

  const hull = cx({ kind: "hull", points: [[0, 0, 0], [4, 1, 0], [2, 3, 5]] }, at([1, 1, 1]));
  assert.equal(hull.verts.length, 8);
  assert.deepEqual(hull.aabb, { min: [1, 1, 1], max: [5, 4, 6] });
});

test("two unit boxes overlapping by 0.6 report depth 0.6", () => {
  const r = sat(cx(box([0, 0, 0])), cx(box([0.4, 0, 0])));
  assert.equal(r.overlap, true);
  near(r.depth, 0.6);
  near(r.axis[0], 1); // push b along +x
});

test("two unit boxes 1.0 apart report a gap of 1.0", () => {
  const r = sat(cx(box([0, 0, 0])), cx(box([2, 0, 0])));
  assert.equal(r.overlap, false);
  near(r.gap, 1);
  near(r.axis[0], 1);
});

test("face-touching boxes are not a problem", () => {
  const r = sat(cx(box([0, 0, 0])), cx(box([1, 0, 0])));
  assert.ok(r.overlap ? r.depth < 1e-9 : r.gap < 1e-9);
  const out = fitCheck({
    parts: [part("a", "A", [solid("a1", "A1", box([0, 0, 0]))]), part("b", "B", [solid("b1", "B1", box([1, 0, 0]))])],
    clearanceMm: 0.5,
  });
  assert.deepEqual(out.problems, []);
  assert.equal(out.closest, null);
  assert.equal(out.pairs, 1);
});

test("a 45°-rotated box: SAT gets right what its bounds get wrong", () => {
  const diamond = cx(box([0, 0, 0], [1, 1, 1], axisAngle([0, 1, 0], Math.PI / 4)));

  // Bounds overlap, but the diamond's face is 0.066 mm from the box's corner.
  const apart = cx(box([0.9, 0, 0.9]));
  assert.ok(diamond.aabb.max[0] > apart.aabb.min[0] && diamond.aabb.max[2] > apart.aabb.min[2]);
  const r1 = sat(diamond, apart);
  assert.equal(r1.overlap, false);
  near(r1.gap, 0.8 / Math.SQRT2 - 0.5);
  near(Math.abs(r1.axis[0]), Math.SQRT1_2);
  near(Math.abs(r1.axis[2]), Math.SQRT1_2);

  // The corner pokes 0.076 mm into the diamond; bounds would say 0.407.
  const into = cx(box([0.8, 0, 0.8]));
  const r2 = sat(diamond, into);
  assert.equal(r2.overlap, true);
  near(r2.depth, 0.5 - 0.6 / Math.SQRT2);
  near(r2.axis[0], Math.SQRT1_2);
  near(r2.axis[2], Math.SQRT1_2);
});

test("cylinder vs box: side, diagonal, top, and a cylinder lying on its side", () => {
  const cyl = cx({ kind: "cyl", center: [0, 0, 0], r: 1, h: 2 });

  const side = sat(cyl, cx(box([1.8, 0, 0])));
  assert.equal(side.overlap, false);
  near(side.gap, 0.3);

  const hit = sat(cyl, cx(box([1.3, 0, 0])));
  assert.equal(hit.overlap, true);
  near(hit.depth, 0.2);

  const diag = sat(cyl, cx(box([1.3, 0, 1.3])));
  assert.equal(diag.overlap, false); // bounds overlap; the round side doesn't
  near(diag.gap, 1.6 / Math.SQRT2 - 1);

  const top = sat(cyl, cx(box([0, 1.5, 0])));
  assert.ok(top.overlap ? top.depth < 1e-9 : top.gap < 1e-9);

  // q turns the axis from y onto x: 10 mm long, so its end is at x = 5.
  const lying = cx({ kind: "cyl", center: [0, 0, 0], r: 1, h: 10, q: axisAngle([0, 0, 1], Math.PI / 2) });
  near(lying.aabb.max[0], 5);
  const end = sat(lying, cx(box([5.75, 0, 0])));
  assert.equal(end.overlap, false);
  near(end.gap, 0.25);
});

test("sphere and cone against a box", () => {
  const ball = cx({ kind: "sphere", center: [0, 0, 0], r: 2 });
  const resting = sat(ball, cx(box([0, 2.5, 0])));
  assert.ok(resting.overlap ? resting.depth < 1e-9 : resting.gap < 1e-9);
  const beside = sat(ball, cx(box([3, 0, 0])));
  assert.equal(beside.overlap, false);
  near(beside.gap, 0.5);

  const cone = cx({ kind: "cone", center: [0, 0, 0], r: 1, h: 2 }); // apex at y = 1
  const above = sat(cone, cx(box([0, 1.8, 0])));
  assert.equal(above.overlap, false);
  near(above.gap, 0.3);
  assert.equal(sat(cone, cx(box([0, 1.2, 0]))).overlap, true);
});

test("a board resting on four bosses is not a problem", () => {
  const { base, pcb } = enclosure();
  const out = fitCheck({ parts: [base, pcb], clearanceMm: 0.5 });
  assert.deepEqual(out.problems, []);
  assert.ok(out.pairs >= 4); // the four boss contacts reached SAT
});

test("a lid 0.6 mm into a tall capacitor is one overlap, C3 first", () => {
  const { base, lid, pcb } = enclosure();
  const out = fitCheck({ parts: [base, lid, pcb], clearanceMm: 0.5 });
  assert.equal(out.problems.length, 1);
  const [p] = out.problems;
  assert.equal(p.kind, "overlap");
  near(p.depth, 0.6);
  assert.deepEqual(p.a, { inst: "pcb", solid: "c3", name: "C3", partName: "Main board" });
  assert.deepEqual(p.b, { inst: "lid", solid: "lid-plate", name: "Lid", partName: "Lid" });
  assert.deepEqual(out.warnings, []);
});

test("a board sunk into all four bosses is one row for that pair of parts", () => {
  const { base, pcb } = enclosure({ pcbY: 5.7 });
  const out = fitCheck({ parts: [base, pcb], clearanceMm: 0.5 });
  assert.equal(out.problems.length, 1);
  assert.equal(out.problems[0].kind, "overlap");
  near(out.problems[0].depth, 0.3);
  assert.equal(out.problems[0].a.inst, "pcb");
  assert.match(out.problems[0].b.name, /^Boss \d$/);
});

test("different part pairs stay separate, deepest first", () => {
  const out = fitCheck({
    parts: [
      part("x", "X", [solid("x1", "X1", box([0, 0, 0]))]),
      part("y", "Y", [solid("y1", "Y1", box([0.7, 0, 0]))]),
      part("z", "Z", [solid("z1", "Z1", box([-0.2, 0, 0]))]),
    ],
    clearanceMm: 0,
  });
  assert.deepEqual(
    out.problems.map((p) => [p.a.inst, p.b.inst]),
    [["x", "z"], ["x", "y"], ["y", "z"]],
  );
  near(out.problems[0].depth, 0.8);
  near(out.problems[1].depth, 0.3);
  near(out.problems[2].depth, 0.1);
});

test("clearance 1.5 turns a 1.0 mm gap into one close problem", () => {
  const parts = [
    part("a", "A", [solid("s1", "S1", box([0, 0, 0])), solid("s2", "S2", box([-0.2, 0, 2]))]),
    part("b", "B", [solid("wall", "Wall", box([2, 0, 0], [1, 1, 4]))]),
  ];
  const loose = fitCheck({ parts, clearanceMm: 0.5 });
  assert.deepEqual(loose.problems, []);

  const tight = fitCheck({ parts, clearanceMm: 1.5 });
  assert.equal(tight.problems.length, 1);
  const [p] = tight.problems;
  assert.equal(p.kind, "close");
  near(p.gap, 1);
  assert.equal(p.a.solid, "s1");
  assert.equal(p.b.solid, "wall");
  near(tight.closest.gap, 1);
  assert.equal(tight.closest.a.solid, "s1");
});

test("skipPairs suppresses a pair in either order", () => {
  const parts = [part("a", "A", [solid("a1", "A1", box([0, 0, 0]))]), part("b", "B", [solid("b1", "B1", box([0.5, 0, 0]))])];
  assert.equal(fitCheck({ parts, clearanceMm: 0.5 }).problems.length, 1);
  assert.deepEqual(fitCheck({ parts, clearanceMm: 0.5, skipPairs: new Set(["b|a"]) }).problems, []);
  assert.deepEqual(fitCheck({ parts, clearanceMm: 0.5, skipPairs: new Set(["a|b"]) }).problems, []);
});

test("unplaced, hidden, non-colliding and same-part solids are ignored", () => {
  const a = part("a", "A", [solid("a1", "A1", box([0, 0, 0])), solid("a2", "A2", box([0.3, 0, 0]))]);
  const b = part("b", "B", [solid("b1", "B1", box([0.5, 0, 0]))]);
  for (const other of [{ ...b, placed: false }, { ...b, hidden: true }]) {
    const out = fitCheck({ parts: [a, other], clearanceMm: 0.5 });
    assert.deepEqual(out.problems, []);
    assert.equal(out.pairs, 0);
  }
  const pads = { ...b, solids: [solid("pad", "Pad", box([0.5, 0, 0]), { collide: false })] };
  assert.deepEqual(fitCheck({ parts: [a, pads], clearanceMm: 0.5 }).problems, []);
  assert.deepEqual(fitCheck({ parts: [a], clearanceMm: 0.5 }).problems, []); // a1 and a2 overlap, same part
});

test("a part outside the base gets an outside warning; one inside doesn't", () => {
  const { base, lid, pcb } = enclosure({ lidY: 23 }); // lid clear of C3
  const battery = part("bat", "Battery", [solid("bat-body", "Battery", box([0, 4, 0], [10, 2, 10]))]);
  const antenna = part("ant", "Antenna", [solid("ant-body", "Antenna", box([40, 10, 0], [4, 4, 4]))]);

  const out = fitCheck({ parts: [base, lid, pcb, battery, antenna], clearanceMm: 0.5 });
  assert.deepEqual(out.warnings, [
    { kind: "outside", a: { inst: "ant", solid: "ant-body", name: "Antenna", partName: "Antenna" } },
  ]);

  // Without the lid, C3 standing 0.6 mm above the walls is outside too.
  const open = fitCheck({ parts: [base, pcb, battery], clearanceMm: 0.5 });
  assert.deepEqual(open.warnings.map((w) => w.a.inst), ["pcb"]);

  // No base, no outside check.
  assert.deepEqual(fitCheck({ parts: [pcb, antenna], clearanceMm: 0.5 }).warnings, []);
});

test("worldAabbOf unions the solids at the pose", () => {
  const solids = [solid("a", "A", box([0, 0, 0], [2, 2, 2])), solid("b", "B", { kind: "sphere", center: [5, 0, 0], r: 1 })];
  const b = worldAabbOf(solids, at([0, 10, 0]));
  assert.deepEqual(b.min.map((v) => Math.round(v * 1e9) / 1e9), [-1, 9, -1]);
  assert.deepEqual(b.max.map((v) => Math.round(v * 1e9) / 1e9), [6, 11, 1]);
  assert.equal(worldAabbOf([], IDENTITY), null);
});
