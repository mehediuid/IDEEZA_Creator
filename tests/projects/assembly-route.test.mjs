// Assembly › Wiring: the wire router (route.ts) and the wire maths (wires.ts) —
// lead-outs, vias, routing around parts, the grid cap, fillets, AWG sizes,
// cut length and the "wire passes through a part" test.
import test from "node:test";
import assert from "node:assert/strict";

const { routeWire, fitGrid, MAX_CELLS } = await import("../../.tmp-test/lib/assembly/route.js");
const { AWG_TABLE, DEFAULT_AWG, odOf, minBendRadius, filletPath, cutLength, segmentHitsAabb, pathHits } = await import(
  "../../.tmp-test/lib/assembly/wires.js"
);

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const polyLength = (pts) => pts.slice(1).reduce((sum, p, i) => sum + dist(pts[i], p), 0);
const near = (a, b, eps = 1e-9) => dist(a, b) <= eps;
const box = (min, max) => ({ min, max });

// Two pins on the floor 40 mm apart, both pointing up: lead-outs at y = 3.
const FROM = { point: [-20, 0, 0], dir: [0, 1, 0] };
const TO = { point: [20, 0, 0], dir: [0, 1, 0] };
const STRAIGHT_LEN = 40 + 3 + 3;

test("no obstacles: the route is near-straight", () => {
  const r = routeWire({ from: FROM, to: TO, obstacles: [] });
  assert.equal(r.ok, true);
  assert.ok(polyLength(r.points) <= STRAIGHT_LEN * 1.1, `length ${polyLength(r.points)}`);
});

test("a wall between the pins forces a longer path that never enters the inflated wall", () => {
  const wall = box([-1, -5, -15], [1, 15, 15]);
  const r = routeWire({ from: FROM, to: TO, obstacles: [wall] });
  assert.equal(r.ok, true);
  // The shortest way round (under the wall, clear by 1.25 mm) is ≈ 50.5 mm.
  assert.ok(polyLength(r.points) > 50, `length ${polyLength(r.points)}`);
  for (let i = 1; i < r.points.length; i++) {
    assert.equal(segmentHitsAabb(r.points[i - 1], r.points[i], wall, 1.25), false, `segment ${i} enters the wall`);
  }
});

test("the path starts and ends exactly at the pins, with the lead-outs along the pin directions next", () => {
  const from = { point: [-20, 0, 0], dir: [0, 2, 0] }; // not unit: the lead-out is still 3 mm
  const to = { point: [20, 0, 5], dir: [0, 0, 1] };
  const r = routeWire({ from, to, obstacles: [box([-3, -5, -10], [3, 10, 10])] });
  assert.equal(r.ok, true);
  const n = r.points.length;
  assert.deepEqual(r.points[0], from.point);
  assert.deepEqual(r.points[n - 1], to.point);
  assert.ok(near(r.points[1], [-20, 3, 0]), `second point ${r.points[1]}`);
  assert.ok(near(r.points[n - 2], [20, 0, 8]), `second-last point ${r.points[n - 2]}`);
});

test("a via is visited", () => {
  const via = [0, 20, 10];
  const r = routeWire({ from: FROM, to: TO, via: [via], obstacles: [box([-5, -5, -2], [5, 5, 2])] });
  assert.equal(r.ok, true);
  assert.ok(r.points.some((p) => near(p, via)), "the via is on the path");
});

test("vias are visited in order", () => {
  const v1 = [-5, 10, 10];
  const v2 = [5, 10, -10];
  const r = routeWire({ from: FROM, to: TO, via: [v1, v2], obstacles: [] });
  const i1 = r.points.findIndex((p) => near(p, v1));
  const i2 = r.points.findIndex((p) => near(p, v2));
  assert.ok(i1 > 0 && i2 > i1, `via indices ${i1}, ${i2}`);
});

test("straight: true returns exactly from, lead-out, vias, lead-out, to", () => {
  const via = [[0, 10, 0], [5, 10, 5]];
  const r = routeWire({ from: FROM, to: TO, via, obstacles: [box([-1, -1, -1], [1, 1, 1])], straight: true });
  assert.equal(r.ok, true);
  assert.deepEqual(r.points, [[-20, 0, 0], [-20, 3, 0], [0, 10, 0], [5, 10, 5], [20, 3, 0], [20, 0, 0]]);
});

test("an enclosed goal returns ok = false with the straight polyline", () => {
  const to = { point: [10, 10, 10], dir: [0, 1, 0] };
  const r = routeWire({ from: FROM, to, obstacles: [box([5, 5, 5], [15, 15, 15])] });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "No path around the parts");
  assert.deepEqual(r.points, [[-20, 0, 0], [-20, 3, 0], [10, 13, 10], [10, 10, 10]]);
});

test("the 400 000 cell cap holds for a huge bounds", () => {
  const huge = box([-1000, -1000, -1000], [1000, 1000, 1000]);
  const g = fitGrid(huge, 2);
  assert.equal(MAX_CELLS, 400000);
  assert.ok(g.count <= MAX_CELLS, `count ${g.count}`);
  assert.equal(g.count, g.dims[0] * g.dims[1] * g.dims[2]);
  assert.ok(g.cell > 2);
  for (let k = 0; k < 3; k++) assert.ok(g.dims[k] * g.cell >= 2000 - 1e-6);
  const t0 = performance.now();
  const r = routeWire({ from: FROM, to: TO, bounds: huge, obstacles: [box([-1, -5, -15], [1, 15, 15])] });
  assert.equal(r.ok, true);
  assert.ok(performance.now() - t0 < 3000);
});

test("filletPath on an L of two 10 mm legs, r = 2", () => {
  const f = filletPath([[0, 0, 0], [10, 0, 0], [10, 10, 0]], 2);
  assert.ok(Math.abs(f.length - (20 - 2 * 2 + (Math.PI * 2) / 2)) < 1e-6, `length ${f.length}`);
  assert.equal(f.allowed, 5);
  assert.deepEqual(f.corners, [{ index: 1, allowed: 5, used: 2 }]);
  assert.deepEqual(f.path[0], [0, 0, 0]);
  assert.deepEqual(f.path[f.path.length - 1], [10, 10, 0]);
  // Every arc point lies on the circle about (8, 2, 0), and no arc step is wider than 15°.
  const arc = f.path.slice(1, -1);
  for (const p of arc) assert.ok(Math.abs(dist(p, [8, 2, 0]) - 2) < 1e-9);
  assert.ok(arc.length - 1 >= 6);
  assert.ok(Math.abs(polyLength(f.path) - f.length) < 0.05);
});

test("filletPath clamps the radius to what fits", () => {
  const f = filletPath([[0, 0, 0], [10, 0, 0], [10, 10, 0]], 50);
  assert.equal(f.corners[0].used, 5);
  assert.ok(Math.abs(f.length - (10 + (Math.PI * 5) / 2)) < 1e-6);
});

test("filletPath on a U-turn: the two arcs meet in a half circle", () => {
  const f = filletPath([[0, 0, 0], [10, 0, 0], [10, 0, 10], [0, 0, 10]], 8);
  assert.deepEqual(
    f.corners.map((c) => [c.index, c.allowed, c.used]),
    [[1, 5, 5], [2, 5, 5]],
  );
  assert.ok(Math.abs(f.length - (10 + 5 * Math.PI)) < 1e-6, `length ${f.length}`);
  for (let i = 1; i < f.path.length; i++) assert.ok(dist(f.path[i - 1], f.path[i]) > 1e-9, "no repeated points");
});

test("filletPath on a hairpin reversal fits no arc", () => {
  const f = filletPath([[0, 0, 0], [10, 0, 0], [0, 0, 0]], 2);
  assert.equal(f.allowed, 0);
  assert.equal(f.corners[0].used, 0);
  assert.equal(f.length, 20);
});

test("filletPath: straight-through points are not corners; no corner → allowed = Infinity", () => {
  const f = filletPath([[0, 0, 0], [5, 0, 0], [10, 0, 0]], 2);
  assert.deepEqual(f.corners, []);
  assert.equal(f.allowed, Infinity);
  assert.equal(f.length, 10);
});

test("AWG table is monotonic: thinner gauge, smaller OD and cross-section", () => {
  assert.deepEqual(AWG_TABLE.map((w) => w.awg), [16, 18, 20, 22, 24, 26, 28, 30]);
  for (let i = 1; i < AWG_TABLE.length; i++) {
    assert.ok(AWG_TABLE[i].od < AWG_TABLE[i - 1].od);
    assert.ok(AWG_TABLE[i].csa < AWG_TABLE[i - 1].csa);
  }
  assert.equal(DEFAULT_AWG, 22);
  assert.equal(odOf(22), 1.5);
  assert.equal(odOf(99), 1.5);
});

test("minBendRadius(22) = 6 and cutLength(100, 10) = 110", () => {
  assert.equal(minBendRadius(22), 6);
  assert.equal(cutLength(100, 10), 110);
});

test("pathHits finds the box a path crosses and honours ignore", () => {
  const path = [[-10, 0, 0], [0, 0, 0], [10, 0, 0]];
  const boxes = [
    { id: "battery", box: box([-1, -1, -1], [1, 1, 1]) },
    { id: "far", box: box([20, 20, 20], [30, 30, 30]) },
    { id: "close", box: box([-1, 1.5, -1], [1, 3, 1]) },
  ];
  assert.deepEqual(pathHits(path, boxes), ["battery"]);
  assert.deepEqual(pathHits(path, boxes, 2), ["battery", "close"]);
  assert.deepEqual(pathHits(path, boxes, 2, new Set(["battery"])), ["close"]);
});

test("timing: a 100 × 60 × 40 mm enclosure with 20 parts", (t) => {
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const enclosure = box([0, 0, 0], [100, 40, 60]);
  const parts = [box([5, 4, 5], [95, 5.6, 55])]; // the board
  while (parts.length < 20) {
    const x = 10 + rand() * 75;
    const z = 8 + rand() * 40;
    const s = [3 + rand() * 9, 2 + rand() * 18, 3 + rand() * 9];
    parts.push(box([x, 5.6, z], [x + s[0], 5.6 + s[1], z + s[2]]));
  }
  const from = { point: [8, 5.6, 8], dir: [0, 1, 0] };
  const to = { point: [92, 5.6, 52], dir: [0, 1, 0] };
  const t0 = performance.now();
  const r = routeWire({ from, to, obstacles: parts, bounds: enclosure });
  const ms = performance.now() - t0;
  t.diagnostic(`route: ${ms.toFixed(1)} ms, ${r.points.length} points, ${polyLength(r.points).toFixed(1)} mm`);
  assert.equal(r.ok, true);
  // Away from the pins (whose own board they sit on), the wire clears every part by its radius.
  const inner = r.points.slice(1, -1);
  assert.deepEqual(pathHits(inner, parts.map((b, i) => ({ id: String(i), box: b })), 0.75), []);
  assert.ok(ms < 1000);
});
