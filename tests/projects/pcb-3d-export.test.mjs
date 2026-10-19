import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// The compiled modules load three's CommonJS build; use the same instance.
const THREE = createRequire(import.meta.url)("three");

const { derivePcbScene } = await import("../../.tmp-test/lib/pcb/pcb-scene.js");
const { buildBoardScene } = await import("../../.tmp-test/lib/pcb/glb-export.js");
const { collectPcbModel, buildStl } = await import("../../.tmp-test/lib/pcb/exporters.js");
const { exportSlabTriangles } = await import("../../.tmp-test/lib/pcb/board-slab.js");

// The board is drawn at canvas (60, 60); 10 canvas px = 1 mm. A 720 × 480 px
// board is 72 × 48 mm, and 90 px per scene unit in the 3D tab (longest side → 8).
const X0 = 60, Y0 = 60;
const board = (objects, extra = {}) => ({ pcbBoard: { width: 720, height: 480 }, objects, selectedIds: [], ...extra });
const hole = (id, x, y, more = {}) => ({ id, kind: "mountingHole", x: X0 + x, y: Y0 + y, scope: "pcb", ...more });
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} ≠ ${b}`);

test("GLB export turns a rotated part and its pads by the part's angle, once", () => {
  const state = board([{ id: "r1", kind: "fp0805", x: X0 + 200, y: Y0 + 100, rotation: 90, text: "R1", scope: "pcb" }]);
  const scene = buildBoardScene(derivePcbScene(state));
  near(scene.getObjectByName("Part_R1").rotation.y, -Math.PI / 2, "part");
  near(scene.getObjectByName("Pad_r1-pad0").rotation.y, -Math.PI / 2, "pad 1");
  near(scene.getObjectByName("Pad_r1-pad1").rotation.y, -Math.PI / 2, "pad 2");
});

test("collectPcbModel lists every board mounting hole in mm, sized by its drill", () => {
  const m = collectPcbModel(board([
    hole("h1", 50, 40),
    hole("h2", 650, 420, { drill: 32 }),
    { id: "s1", kind: "mountingHole", x: 100, y: 100 },
  ]));
  // No drill → the 3.0 mm the Tooling Hole card names; a schematic object is not a board hole.
  assert.deepEqual(m.holes, [{ x: 5, y: 4, d: 3 }, { x: 65, y: 42, d: 3.2 }]);
});

test("a selection-only export keeps only the selected holes", () => {
  const m = collectPcbModel(board([hole("h1", 50, 40), hole("h2", 100, 40)], { selectedIds: ["h2"] }), { onlySelected: true });
  assert.deepEqual(m.holes, [{ x: 10, y: 4, d: 3 }]);
});

test("the 3D scene carries each hole as a circle in scene units", () => {
  const s = derivePcbScene(board([hole("h1", 90, 60, { drill: 36 })]));
  assert.equal(s.board.holes.length, 1);
  near(s.board.holes[0].x, -3, "x");
  near(s.board.holes[0].z, -2, "z");
  near(s.board.holes[0].r, 0.2, "r");
});

// STL facets → [[x,y,z] ×3] triangles.
function stlTriangles(stl) {
  const v = [...stl.matchAll(/vertex (\S+) (\S+) (\S+)/g)].map((r) => [+r[1], +r[2], +r[3]]);
  const out = [];
  for (let i = 0; i < v.length; i += 3) out.push([v[i], v[i + 1], v[i + 2]]);
  return out;
}
function inTriangle(x, y, [a, b, c]) {
  const s = (p, q) => (x - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y - q[1]);
  const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
const topCovers = (tris, z, x, y) => tris.some((t) => t.every((p) => Math.abs(p[2] - z) < 1e-3) && inTriangle(x, y, t));

test("the STL board is open right through at a mounting hole", () => {
  // 4 mm hole at (10, 10) mm from the top-left → (10, 38) in the Y-up file.
  const m = collectPcbModel(board([hole("h1", 100, 100, { drill: 40 })]));
  const slab = exportSlabTriangles(m);
  assert.ok(slab, "a holed board is not a box");
  const tris = stlTriangles(buildStl(m, { board: true, comps: false }, slab));
  assert.equal(topCovers(tris, m.thicknessMm, 10, 38), false, "top open at the hole centre");
  assert.equal(topCovers(tris, 0, 10, 38), false, "bottom open at the hole centre");
  assert.equal(topCovers(tris, m.thicknessMm, 10, 40.5), true, "solid just outside the hole");
  assert.equal(topCovers(tris, m.thicknessMm, 50, 20), true, "solid elsewhere");
  // The bore wall: vertices on the 2 mm circle at both faces.
  const wall = tris.flat().filter((p) => Math.abs(Math.hypot(p[0] - 10, p[1] - 38) - 2) < 1e-3);
  assert.ok(wall.some((p) => Math.abs(p[2]) < 1e-3) && wall.some((p) => Math.abs(p[2] - m.thicknessMm) < 1e-3), "bore runs through");
});

test("a board with nothing to cut stays the plain box, and an off-board hole cuts nothing", () => {
  assert.equal(exportSlabTriangles(collectPcbModel(board([]))), null);
  assert.equal(exportSlabTriangles(collectPcbModel(board([hole("off", -200, 100)]))), null);
  assert.equal(stlTriangles(buildStl(collectPcbModel(board([])), { board: true, comps: false })).length, 12);
});

const triArea = ([a, b, c]) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
const topArea = (m) => stlTriangles(buildStl(m, { board: true, comps: false }, exportSlabTriangles(m)))
  .filter((t) => t.every((p) => Math.abs(p[2] - m.thicknessMm) < 1e-3))
  .reduce((a, t) => a + triArea(t), 0);

test("two holes on one spot, or a hole over a cutout, still leave a whole board with one opening", () => {
  // The set placed in the browser when this broke: two clicks on one spot.
  const one = topArea(collectPcbModel(board([hole("a", 71, 412), hole("b", 76, 235), hole("c", 59, 79)])));
  const twice = topArea(collectPcbModel(board([hole("a", 71, 412), hole("b", 76, 235), hole("a2", 71, 412), hole("c", 59, 79)])));
  near(twice, one, "same top area");
  // A hole drilled inside a cutout removes nothing more than the cutout did.
  const cut = { id: "c", kind: "cutout", x: X0 + 300, y: Y0 + 200, width: 100, height: 80, scope: "pcb" };
  const plainCut = topArea(collectPcbModel(board([cut])));
  near(topArea(collectPcbModel(board([cut, hole("in", 350, 240, { drill: 30 })]))), plainCut, "hole in cutout");
});

test("the GLB board slab carries the hole and sits where the box did", () => {
  const scene = derivePcbScene(board([hole("h1", 100, 100, { drill: 40 })]));
  const slab = buildBoardScene(scene).getObjectByName("Board");
  assert.equal(slab.geometry.parameters.shapes.holes.length, 1);
  slab.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(slab);
  const b = scene.board;
  near(box.min.y, b.yOffset - b.thickness / 2, "bottom");
  near(box.max.y, b.yOffset + b.thickness / 2, "top");
  assert.ok(Math.abs(box.max.x - b.width / 2) < 1e-6 && Math.abs(box.max.z - b.depth / 2) < 1e-6, "same footprint");
});
