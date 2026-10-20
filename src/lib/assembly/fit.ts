// The assembly's fit check: does anything placed hit, or come too close to,
// anything else? Every solid is treated as a convex polyhedron in world space
// (a cylinder is a 16-sided prism, a sphere a 58-vertex ball, a hull its
// oriented bounds) and each pair is tested with the separating axis theorem:
// overlap depth when they intersect, a lower bound of the gap when they don't.
// Problems are reported per pair of PARTS, so a board on four bosses reads as
// one row, never four. Pure — runs in node:test as in the browser.

import { aabbOf, aabbUnion, add, apply, cross, dot, len, norm, qmul, rotate, scale, sub, Q0 } from "./math";
import type { Aabb, Pose, Quat, Vec3 } from "./math";
import type { Solid, SolidShape } from "./types";

/** A convex solid in world space: its corners, the face normals and the edge
 *  directions SAT tests (unit length, near-parallel ones merged). */
export type Convex = { verts: Vec3[]; normals: Vec3[]; edges: Vec3[]; aabb: Aabb };

const SIDES = 16;
const SPHERE_LONGS = 8;
const SPHERE_RINGS = 7; // includes the equator, so the ball's extremes on its axes are exact
const PARALLEL = 0.9999;

/** Adds unit `v` to `list` unless an (anti)parallel axis is already there. */
function pushAxis(list: Vec3[], v: Vec3): void {
  const n = norm(v);
  if (len(n) < 0.5) return;
  for (const a of list) if (Math.abs(dot(a, n)) > PARALLEL) return;
  list.push(n);
}

/** A planar polygon's normal (Newell's method — robust to near-degenerate quads). */
function faceNormal(verts: Vec3[], face: number[]): Vec3 {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < face.length; i++) {
    const a = verts[face[i]];
    const b = verts[face[(i + 1) % face.length]];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return [x, y, z];
}

/** A solid as local corner offsets (about its centre, before its own rotation),
 *  plus its faces for the shapes whose axes come from faces (a box's axes are
 *  just its three local axes). */
type Mesh = { center: Vec3; q: Quat; offsets: Vec3[]; faces: number[][] | null };

function ring(r: number, y: number): Vec3[] {
  // Corners sit half a step off the local x and z axes and at r / cos(π/n), so
  // the side faces are tangent to the true circle and face ±x / ±z exactly.
  const R = r / Math.cos(Math.PI / SIDES);
  const out: Vec3[] = [];
  for (let k = 0; k < SIDES; k++) {
    const t = ((k + 0.5) * 2 * Math.PI) / SIDES;
    out.push([R * Math.cos(t), y, R * Math.sin(t)]);
  }
  return out;
}

function boxOffsets(size: Vec3): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < 8; i++) {
    out.push([(i & 1 ? 0.5 : -0.5) * size[0], (i & 2 ? 0.5 : -0.5) * size[1], (i & 4 ? 0.5 : -0.5) * size[2]]);
  }
  return out;
}

function meshOf(shape: SolidShape): Mesh {
  switch (shape.kind) {
    case "box":
      return { center: shape.center, q: shape.q ?? Q0, offsets: boxOffsets(shape.size), faces: null };
    case "cyl": {
      const offsets = [...ring(shape.r, -shape.h / 2), ...ring(shape.r, shape.h / 2)];
      const faces: number[][] = [];
      for (let k = 0; k < SIDES; k++) {
        const k1 = (k + 1) % SIDES;
        faces.push([k, k1, SIDES + k1, SIDES + k]);
      }
      faces.push(Array.from({ length: SIDES }, (_, k) => k));
      return { center: shape.center, q: shape.q ?? Q0, offsets, faces };
    }
    case "cone": {
      const offsets = [...ring(shape.r, -shape.h / 2), [0, shape.h / 2, 0] as Vec3];
      const faces: number[][] = [];
      for (let k = 0; k < SIDES; k++) faces.push([k, (k + 1) % SIDES, SIDES]);
      faces.push(Array.from({ length: SIDES }, (_, k) => k));
      return { center: shape.center, q: shape.q ?? Q0, offsets, faces };
    }
    case "sphere": {
      const r = shape.r;
      const offsets: Vec3[] = [[0, r, 0]];
      for (let i = 1; i <= SPHERE_RINGS; i++) {
        const phi = (i * Math.PI) / (SPHERE_RINGS + 1);
        for (let j = 0; j < SPHERE_LONGS; j++) {
          const th = (j * 2 * Math.PI) / SPHERE_LONGS;
          offsets.push([r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)]);
        }
      }
      offsets.push([0, -r, 0]);
      const south = offsets.length - 1;
      const at = (i: number, j: number) => 1 + (i - 1) * SPHERE_LONGS + (j % SPHERE_LONGS);
      const faces: number[][] = [];
      for (let j = 0; j < SPHERE_LONGS; j++) {
        faces.push([0, at(1, j), at(1, j + 1)]);
        for (let i = 1; i < SPHERE_RINGS; i++) faces.push([at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
        faces.push([at(SPHERE_RINGS, j), south, at(SPHERE_RINGS, j + 1)]);
      }
      return { center: shape.center, q: Q0, offsets, faces };
    }
    case "hull": {
      if (shape.points.length === 0) return { center: [0, 0, 0], q: Q0, offsets: boxOffsets([0, 0, 0]), faces: null };
      const b = aabbOf(shape.points);
      return { center: scale(add(b.min, b.max), 0.5), q: Q0, offsets: boxOffsets(sub(b.max, b.min)), faces: null };
    }
  }
}

function worldVerts(mesh: Mesh, pose: Pose): { verts: Vec3[]; q: Quat } {
  const q = qmul(pose.q, mesh.q);
  const c = apply(pose, mesh.center);
  return { verts: mesh.offsets.map((o) => add(c, rotate(q, o))), q };
}

/** The shape in world space: `pose ∘ (shape.q about shape.center)`. */
export function convexOf(shape: SolidShape, pose: Pose): Convex {
  const mesh = meshOf(shape);
  const { verts, q } = worldVerts(mesh, pose);
  const normals: Vec3[] = [];
  const edges: Vec3[] = [];
  if (!mesh.faces) {
    for (const axis of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as Vec3[]) {
      const w = rotate(q, axis);
      pushAxis(normals, w);
      pushAxis(edges, w);
    }
  } else {
    for (const face of mesh.faces) {
      pushAxis(normals, faceNormal(verts, face));
      for (let i = 0; i < face.length; i++) pushAxis(edges, sub(verts[face[(i + 1) % face.length]], verts[face[i]]));
    }
  }
  return { verts, normals, edges, aabb: aabbOf(verts) };
}

/** The world bounds of these solids at `pose`; null when there are none. */
export function worldAabbOf(solids: Solid[], pose: Pose): Aabb | null {
  let box: Aabb | null = null;
  for (const s of solids) {
    const b = aabbOf(worldVerts(meshOf(s.shape), pose).verts);
    box = box ? aabbUnion(box, b) : b;
  }
  return box;
}

// ───────────────────────────── separating axes ─────────────────────────────

function project(verts: Vec3[], axis: Vec3): [number, number] {
  let lo = Infinity, hi = -Infinity;
  for (const v of verts) {
    const d = dot(v, axis);
    if (d < lo) lo = d;
    if (d > hi) hi = d;
  }
  return [lo, hi];
}

export type SatResult = { overlap: true; depth: number; axis: Vec3 } | { overlap: false; gap: number; axis: Vec3 };

/** The separating axis test. Overlapping: `depth` is the smallest push that
 *  separates them and `axis` the way to push b. Apart: `gap` is the largest
 *  separation over the tested axes (a lower bound of the true distance) and
 *  `axis` points from a toward b. */
export function sat(a: Convex, b: Convex): SatResult {
  let gap = -Infinity;
  let gapAxis: Vec3 = [1, 0, 0];
  let depth = Infinity;
  let depthAxis: Vec3 = [1, 0, 0];

  const test = (axis: Vec3) => {
    const [aLo, aHi] = project(a.verts, axis);
    const [bLo, bHi] = project(b.verts, axis);
    const ahead = bLo - aHi; // b beyond a along +axis
    const behind = aLo - bHi; // b before a
    const sep = Math.max(ahead, behind);
    if (sep > 0) {
      if (sep > gap) {
        gap = sep;
        gapAxis = ahead >= behind ? axis : scale(axis, -1);
      }
    } else if (-sep < depth) {
      depth = -sep;
      // -ahead is the push of b along +axis, -behind along -axis.
      depthAxis = -ahead <= -behind ? axis : scale(axis, -1);
    }
  };

  for (const n of a.normals) test(n);
  for (const n of b.normals) test(n);
  for (const ea of a.edges) {
    for (const eb of b.edges) {
      const c = cross(ea, eb);
      if (len(c) < 1e-6) continue;
      test(norm(c));
    }
  }
  if (gap === -Infinity && depth === Infinity) {
    // Degenerate solids with no axes: fall back to the world axes.
    for (const axis of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as Vec3[]) test(axis);
  }
  if (gap > 0) return { overlap: false, gap, axis: gapAxis };
  return { overlap: true, depth, axis: depthAxis };
}

// ───────────────────────────── the fit check ─────────────────────────────

export type FitPartInput = {
  id: string;
  name: string;
  pose: Pose;
  placed: boolean;
  hidden?: boolean;
  solids: Solid[];
  enclosure?: { role: "base" | "lid" };
};

export type FitRef = { inst: string; solid: string; name: string; partName: string };

export type FitIssue =
  | { kind: "overlap"; a: FitRef; b: FitRef; depth: number }
  | { kind: "close"; a: FitRef; b: FitRef; gap: number }
  | { kind: "outside"; a: FitRef };

export type FitResult = {
  /** Overlaps (deepest first), then too-close pairs (closest first). */
  problems: FitIssue[];
  /** Parts outside the enclosure. */
  warnings: FitIssue[];
  /** The nearest two solids that aren't touching, for "closest: 1.2 mm". */
  closest: { a: FitRef; b: FitRef; gap: number } | null;
  /** Solid pairs that reached the exact test. */
  pairs: number;
};

type Body = { solid: Solid; cx: Convex };

const refOf = (part: FitPartInput, solid: Solid): FitRef => ({ inst: part.id, solid: solid.id, name: solid.name, partName: part.name });

function aabbsMeet(a: Aabb, b: Aabb, margin: number): boolean {
  for (let k = 0; k < 3; k++) {
    if (a.min[k] > b.max[k] + margin || b.min[k] > a.max[k] + margin) return false;
  }
  return true;
}

function contains(outer: Aabb, inner: Aabb, tol: number): boolean {
  for (let k = 0; k < 3; k++) {
    if (inner.min[k] < outer.min[k] - tol || inner.max[k] > outer.max[k] + tol) return false;
  }
  return true;
}

export function fitCheck(input: {
  parts: FitPartInput[];
  clearanceMm: number;
  touchTol?: number;
  /** "instA|instB", either order. */
  skipPairs?: ReadonlySet<string>;
}): FitResult {
  const clearance = Math.max(0, input.clearanceMm);
  const tol = input.touchTol ?? 0.05;
  const parts = input.parts.filter((p) => p.placed === true && !p.hidden);

  const bodies: Body[][] = parts.map((p) => p.solids.filter((s) => s.collide !== false).map((s) => ({ solid: s, cx: convexOf(s.shape, p.pose) })));
  const bounds: Array<Aabb | null> = bodies.map((list) => list.reduce<Aabb | null>((acc, b) => (acc ? aabbUnion(acc, b.cx.aabb) : b.cx.aabb), null));

  const overlaps: Array<Extract<FitIssue, { kind: "overlap" }>> = [];
  const closes: Array<Extract<FitIssue, { kind: "close" }>> = [];
  let closest: FitResult["closest"] = null;
  let pairs = 0;

  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const pa = parts[i];
      const pb = parts[j];
      const ba = bounds[i];
      const bb = bounds[j];
      if (!ba || !bb || !aabbsMeet(ba, bb, clearance)) continue;
      if (input.skipPairs && (input.skipPairs.has(`${pa.id}|${pb.id}`) || input.skipPairs.has(`${pb.id}|${pa.id}`))) continue;

      // Messages read "C3 hits the Lid": the non-enclosure part goes first.
      const swap = !!pa.enclosure && !pb.enclosure;
      const refs = (sa: Solid, sb: Solid): [FitRef, FitRef] =>
        swap ? [refOf(pb, sb), refOf(pa, sa)] : [refOf(pa, sa), refOf(pb, sb)];

      let worstDepth: { depth: number; sa: Solid; sb: Solid } | null = null;
      let worstGap: { gap: number; sa: Solid; sb: Solid } | null = null;
      for (const a of bodies[i]) {
        for (const b of bodies[j]) {
          if (!aabbsMeet(a.cx.aabb, b.cx.aabb, clearance)) continue;
          pairs++;
          const r = sat(a.cx, b.cx);
          if (r.overlap) {
            if (r.depth > tol && (!worstDepth || r.depth > worstDepth.depth)) worstDepth = { depth: r.depth, sa: a.solid, sb: b.solid };
            continue;
          }
          if (r.gap <= tol) continue; // touching: a board on its bosses
          if (r.gap < clearance && (!worstGap || r.gap < worstGap.gap)) worstGap = { gap: r.gap, sa: a.solid, sb: b.solid };
          if (!closest || r.gap < closest.gap) {
            const [ra, rb] = refs(a.solid, b.solid);
            closest = { a: ra, b: rb, gap: r.gap };
          }
        }
      }
      if (worstDepth) {
        const [ra, rb] = refs(worstDepth.sa, worstDepth.sb);
        overlaps.push({ kind: "overlap", a: ra, b: rb, depth: worstDepth.depth });
      }
      if (worstGap) {
        const [ra, rb] = refs(worstGap.sa, worstGap.sb);
        closes.push({ kind: "close", a: ra, b: rb, gap: worstGap.gap });
      }
    }
  }
  overlaps.sort((x, y) => y.depth - x.depth);
  closes.sort((x, y) => x.gap - y.gap);

  return { problems: [...overlaps, ...closes], warnings: outsideWarnings(parts, tol), closest, pairs };
}

/** With a base in the scene, every other part should sit inside it: the
 *  base's bounds, raised to the top of any lid. */
function outsideWarnings(parts: FitPartInput[], tol: number): FitIssue[] {
  let shell: Aabb | null = null;
  for (const p of parts) {
    if (p.enclosure?.role !== "base") continue;
    const b = worldAabbOf(p.solids, p.pose);
    if (b) shell = shell ? aabbUnion(shell, b) : b;
  }
  if (!shell) return [];
  let top = shell.max[1];
  for (const p of parts) {
    if (p.enclosure?.role !== "lid") continue;
    const b = worldAabbOf(p.solids, p.pose);
    if (b) top = Math.max(top, b.max[1]);
  }
  const room: Aabb = { min: shell.min, max: [shell.max[0], top, shell.max[2]] };

  const out: FitIssue[] = [];
  for (const p of parts) {
    if (p.enclosure || p.solids.length === 0) continue;
    const b = worldAabbOf(p.solids, p.pose);
    if (b && !contains(room, b, tol)) out.push({ kind: "outside", a: refOf(p, p.solids[0]) });
  }
  return out;
}
