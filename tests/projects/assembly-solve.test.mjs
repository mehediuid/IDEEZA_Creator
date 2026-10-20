// The assembly's mate solver (src/lib/assembly/solve.ts): every mate type
// lands its part where the mate says, a part with two holes on two bosses is
// fully placed, conflicting mates say so, a lock follows its part.
import test from "node:test";
import assert from "node:assert/strict";
import { solveAssembly, relativePose } from "../../.tmp-test/lib/assembly/solve.js";
import { apply, applyDir, axisAngle, dot, Q0 } from "../../.tmp-test/lib/assembly/math.js";

const near = (a, b, tol = 1e-3) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`);
const nearVec = (a, b, tol = 1e-3) => a.forEach((v, i) => near(v, b[i], tol));

// A 10 mm cube's faces in its own frame (centre at the origin).
const cubeFaces = [
  { id: "top", kind: "face", label: "top", point: [0, 5, 0], dir: [0, 1, 0] },
  { id: "bottom", kind: "face", label: "bottom", point: [0, -5, 0], dir: [0, -1, 0] },
  { id: "right", kind: "face", label: "right", point: [5, 0, 0], dir: [1, 0, 0] },
];
// A plate (board) with two holes, its bottom face at y = 0.
const plate = [
  { id: "bottom", kind: "face", label: "bottom", point: [25, 0, 5], dir: [0, -1, 0] },
  { id: "h1", kind: "axis", label: "H1", point: [5, 0, 5], dir: [0, 1, 0], radius: 1.6, seat: "bottom" },
  { id: "h2", kind: "axis", label: "H2", point: [45, 0, 5], dir: [0, 1, 0], radius: 1.6, seat: "bottom" },
];
// A case with two bosses 40 mm apart, their tops at y = 10.
const caseFeatures = [
  { id: "b1top", kind: "face", label: "Boss 1 top", point: [25, 10, 25], dir: [0, 1, 0] },
  { id: "b1", kind: "axis", label: "Boss 1", point: [25, 10, 25], dir: [0, 1, 0], radius: 1.25 },
  { id: "b2", kind: "axis", label: "Boss 2", point: [65, 10, 25], dir: [0, 1, 0], radius: 1.25 },
  { id: "floor", kind: "face", label: "floor", point: [0, 2, 0], dir: [0, 1, 0] },
];
const inst = (id, pose, features, grounded = false) => ({ id, pose, features, grounded });
const mate = (id, type, a, fa, b, fb, extra = {}) => ({ id, name: id, type, a: { inst: a, feature: fa }, b: { inst: b, feature: fb }, ...extra });
const worldFeature = (r, id, features, fid) => {
  const f = features.find((x) => x.id === fid);
  const p = r.poses.get(id);
  return { p: apply(p, f.point), d: applyDir(p, f.dir) };
};

test("flush: a cube sits on another, keeping where it was over it", () => {
  const r = solveAssembly(
    [inst("A", { p: [0, 0, 0], q: Q0 }, cubeFaces, true), inst("B", { p: [3, 40, -2], q: axisAngle([1, 0, 0], 0.2) }, cubeFaces)],
    [mate("m1", "flush", "A", "top", "B", "bottom")],
  );
  assert.equal(r.status.get("m1"), "ok");
  const bottom = worldFeature(r, "B", cubeFaces, "bottom");
  near(bottom.p[1], 5);
  nearVec(bottom.d, [0, -1, 0]);
  near(r.poses.get("B").p[0], 3, 0.6); // slides only as far as the tilt needs
  assert.equal(r.freedom.get("B"), 3); // free to slide in x/z and spin about y
  assert.deepEqual(r.poses.get("A"), { p: [0, 0, 0], q: Q0 });
});

test("distance: the same faces held 3 mm apart", () => {
  const r = solveAssembly(
    [inst("A", { p: [0, 0, 0], q: Q0 }, cubeFaces, true), inst("B", { p: [0, 30, 0], q: Q0 }, cubeFaces)],
    [mate("m1", "distance", "A", "top", "B", "bottom", { offset: 3 })],
  );
  assert.equal(r.status.get("m1"), "ok");
  near(worldFeature(r, "B", cubeFaces, "bottom").p[1], 8);
});

test("peg in hole: concentric + flush puts the hole on the boss axis, seated on its top", () => {
  const r = solveAssembly(
    [inst("case", { p: [0, 0, 0], q: Q0 }, caseFeatures, true), inst("pcb", { p: [10, 40, 3], q: Q0 }, plate)],
    [mate("c1", "concentric", "case", "b1", "pcb", "h1"), mate("f1", "flush", "case", "b1top", "pcb", "bottom")],
  );
  assert.equal(r.status.get("c1"), "ok");
  assert.equal(r.status.get("f1"), "ok");
  const h1 = worldFeature(r, "pcb", plate, "h1");
  near(h1.p[0], 25);
  near(h1.p[2], 25);
  near(worldFeature(r, "pcb", plate, "bottom").p[1], 10);
  assert.equal(r.freedom.get("pcb"), 1); // it can still turn about the boss
});

test("two holes on two bosses: the board turns to fit and is fully placed", () => {
  const r = solveAssembly(
    [inst("case", { p: [0, 0, 0], q: Q0 }, caseFeatures, true), inst("pcb", { p: [12, 30, 20], q: axisAngle([0, 1, 0], 0.5) }, plate)],
    [
      mate("c1", "concentric", "case", "b1", "pcb", "h1"),
      mate("c2", "concentric", "case", "b2", "pcb", "h2"),
      mate("f1", "flush", "case", "b1top", "pcb", "bottom"),
    ],
  );
  for (const id of ["c1", "c2", "f1"]) assert.equal(r.status.get(id), "ok", id);
  nearVec(worldFeature(r, "pcb", plate, "h1").p, [25, 10, 25]);
  nearVec(worldFeature(r, "pcb", plate, "h2").p, [65, 10, 25]);
  assert.equal(r.freedom.get("pcb"), 0);
});

test("holes that don't match the bosses: the concentric that can't hold is a conflict", () => {
  const wide = caseFeatures.map((f) => (f.id === "b2" ? { ...f, point: [85, 10, 25] } : f));
  const r = solveAssembly(
    [inst("case", { p: [0, 0, 0], q: Q0 }, wide, true), inst("pcb", { p: [10, 30, 10], q: Q0 }, plate)],
    [
      mate("c1", "concentric", "case", "b1", "pcb", "h1"),
      mate("c2", "concentric", "case", "b2", "pcb", "h2"),
      mate("f1", "flush", "case", "b1top", "pcb", "bottom"),
    ],
  );
  const statuses = ["c1", "c2"].map((id) => r.status.get(id));
  assert.ok(statuses.includes("conflict"), statuses.join());
  assert.equal(r.status.get("f1"), "ok");
});

test("two flushes on the same faces with different gaps conflict", () => {
  const r = solveAssembly(
    [inst("A", { p: [0, 0, 0], q: Q0 }, cubeFaces, true), inst("B", { p: [0, 20, 0], q: Q0 }, cubeFaces)],
    [mate("f1", "flush", "A", "top", "B", "bottom"), mate("d1", "distance", "A", "top", "B", "bottom", { offset: 5 })],
  );
  assert.ok([r.status.get("f1"), r.status.get("d1")].includes("conflict"));
});

test("lock: the locked part follows its partner wherever it goes", () => {
  const a0 = { p: [0, 0, 0], q: Q0 };
  const b0 = { p: [0, 12, 4], q: axisAngle([0, 1, 0], 0.3) };
  const rel = relativePose(a0, b0);
  const moved = { p: [50, 0, -10], q: axisAngle([0, 1, 0], 1.2) };
  const r = solveAssembly([inst("A", moved, cubeFaces, true), inst("B", { p: [0, 0, 0], q: Q0 }, cubeFaces)], [mate("l1", "lock", "A", "top", "B", "bottom", { rel })]);
  assert.equal(r.status.get("l1"), "ok");
  const want = apply(moved, b0.p);
  nearVec(r.poses.get("B").p, want);
  assert.equal(r.freedom.get("B"), 0);
});

test("angle and perpendicular set the angle between two faces", () => {
  const r = solveAssembly(
    [inst("A", { p: [0, 0, 0], q: Q0 }, cubeFaces, true), inst("B", { p: [20, 0, 0], q: Q0 }, cubeFaces)],
    [mate("a1", "angle", "A", "top", "B", "top", { angle: 60 })],
  );
  assert.equal(r.status.get("a1"), "ok");
  const ta = worldFeature(r, "A", cubeFaces, "top").d, tb = worldFeature(r, "B", cubeFaces, "top").d;
  near(dot(ta, tb), Math.cos(Math.PI / 3));
  const p = solveAssembly(
    [inst("A", { p: [0, 0, 0], q: Q0 }, cubeFaces, true), inst("B", { p: [20, 0, 0], q: axisAngle([0, 0, 1], 0.2) }, cubeFaces)],
    [mate("p1", "perpendicular", "A", "top", "B", "top")],
  );
  near(dot(worldFeature(p, "A", cubeFaces, "top").d, worldFeature(p, "B", cubeFaces, "top").d), 0);
});

test("parallel keeps directions alike; flip makes a flush face the same way", () => {
  const r = solveAssembly(
    [inst("A", { p: [0, 0, 0], q: Q0 }, cubeFaces, true), inst("B", { p: [0, 30, 0], q: axisAngle([1, 0, 0], 0.4) }, cubeFaces)],
    [mate("f1", "flush", "A", "top", "B", "top", { flip: true })],
  );
  assert.equal(r.status.get("f1"), "ok");
  nearVec(worldFeature(r, "B", cubeFaces, "top").d, [0, 1, 0]);
  near(worldFeature(r, "B", cubeFaces, "top").p[1], 5);
});

test("a missing feature or part is 'missing'; a suppressed mate is ignored", () => {
  const r = solveAssembly(
    [inst("A", { p: [0, 0, 0], q: Q0 }, cubeFaces, true), inst("B", { p: [0, 30, 0], q: Q0 }, cubeFaces)],
    [
      mate("x1", "flush", "A", "nope", "B", "bottom"),
      mate("x2", "flush", "A", "top", "gone", "bottom"),
      mate("s1", "flush", "A", "top", "B", "bottom", { suppressed: true }),
    ],
  );
  assert.equal(r.status.get("x1"), "missing");
  assert.equal(r.status.get("x2"), "missing");
  assert.equal(r.status.get("s1"), "suppressed");
  assert.deepEqual(r.poses.get("B").p, [0, 30, 0]);
});

test("a chain solves outward from the ground: case → board → part on the board", () => {
  const r = solveAssembly(
    [
      inst("case", { p: [0, 0, 0], q: Q0 }, caseFeatures, true),
      inst("bat", { p: [5, 50, 5], q: Q0 }, cubeFaces),
      inst("top", { p: [5, 90, 5], q: Q0 }, cubeFaces),
    ],
    [mate("f1", "flush", "case", "floor", "bat", "bottom"), mate("f2", "flush", "bat", "top", "top", "bottom")],
  );
  near(worldFeature(r, "bat", cubeFaces, "bottom").p[1], 2);
  near(worldFeature(r, "top", cubeFaces, "bottom").p[1], 12);
});
