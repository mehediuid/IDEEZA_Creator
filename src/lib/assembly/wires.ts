// Wire maths for the Assembly's Wiring mode: hook-up wire sizes (AWG) and
// their bend radii, rounding a routed polyline's corners into arcs (and the
// real length that gives), cut length with slack, and segment-vs-box tests
// for "this wire passes through a part". Millimetres; pure and
// dependency-free, so it runs in node:test as in the browser.

import { type Aabb, type Vec3, add, cross, dist, dot, len, norm, scale, sub } from "./math";

export type AwgSpec = {
  awg: number;
  /** Insulated outer diameter, mm (typical PVC hook-up wire). */
  od: number;
  /** Conductor cross-section, mm². */
  csa: number;
};

export const AWG_TABLE: readonly AwgSpec[] = [
  { awg: 16, od: 2.4, csa: 1.31 },
  { awg: 18, od: 2.05, csa: 0.823 },
  { awg: 20, od: 1.75, csa: 0.519 },
  { awg: 22, od: 1.5, csa: 0.326 },
  { awg: 24, od: 1.35, csa: 0.205 },
  { awg: 26, od: 1.2, csa: 0.129 },
  { awg: 28, od: 1.0, csa: 0.081 },
  { awg: 30, od: 0.9, csa: 0.051 },
];
export const DEFAULT_AWG = 22;
const DEFAULT_OD = 1.5;

/** Insulated outer diameter (mm); an AWG outside the table reads as 22 AWG. */
export function odOf(awg: number): number {
  return AWG_TABLE.find((w) => w.awg === awg)?.od ?? DEFAULT_OD;
}

/** The tightest bend the wire takes without stressing the insulation: 4 × OD. */
export const minBendRadius = (awg: number): number => 4 * odOf(awg);

/** Length to cut, with `slackPct` percent extra for service loops and strain relief. */
export const cutLength = (length: number, slackPct: number): number => length + (length * slackPct) / 100;

// ───────────────────────────── fillets ─────────────────────────────

export type FilletCorner = {
  /** The corner's index in the input points. */
  index: number;
  /** The largest fillet radius that fits this corner. */
  allowed: number;
  /** The radius actually used: min(requested, allowed). */
  used: number;
};
export type FilletResult = {
  path: Vec3[];
  length: number;
  corners: FilletCorner[];
  /** The tightest corner's `allowed`; Infinity when there is no corner. */
  allowed: number;
};

const STRAIGHT = 1e-6; // radians: a smaller turn is a straight-through, not a corner
const ARC_STEP = Math.PI / 12; // 15°
const SAME = 1e-9;

const copy = (p: Vec3): Vec3 => [p[0], p[1], p[2]];

/** Rounds every interior corner of `points` with an arc of `radius` (or the
 *  most that fits), tangent to both segments. A segment between two corners is
 *  shared — each may use half of it, so neighbouring arcs never overlap — but a
 *  segment that ends at the wire's own end belongs to its one corner whole. */
export function filletPath(points: readonly Vec3[], radius: number): FilletResult {
  const pts: Vec3[] = [];
  const src: number[] = [];
  points.forEach((p, i) => {
    if (pts.length && dist(pts[pts.length - 1], p) < SAME) return;
    pts.push(p);
    src.push(i);
  });
  const n = pts.length;
  if (n < 2) return { path: pts.map(copy), length: 0, corners: [], allowed: Infinity };

  const r = radius > 0 ? radius : 0;
  const seg = pts.slice(1).map((p, i) => dist(pts[i], p));
  const trim = new Array<number>(n).fill(0); // tangent distance cut from each side of vertex i
  const arcs = new Array<Vec3[] | null>(n).fill(null);
  const corners: FilletCorner[] = [];
  let length = 0;
  let allowedMin = Infinity;

  for (let i = 1; i < n - 1; i++) {
    const u = norm(sub(pts[i], pts[i - 1]));
    const v = norm(sub(pts[i + 1], pts[i]));
    const cos = dot(u, v);
    const sin = len(cross(u, v));
    const theta = Math.atan2(sin, cos);
    if (theta < STRAIGHT) continue;
    // tan(θ/2) = sin θ / (1 + cos θ): exact at 90°, unlike Math.tan(π/4). A full
    // reversal has an infinite tangent distance, so nothing fits there.
    const tanHalf = sin / (1 + cos);
    const before = i - 1 === 0 ? seg[i - 1] : seg[i - 1] / 2;
    const after = i + 1 === n - 1 ? seg[i] : seg[i] / 2;
    const allowed = theta > Math.PI - STRAIGHT ? 0 : Math.min(before, after) / tanHalf;
    const used = Math.min(r, allowed);
    corners.push({ index: src[i], allowed, used });
    allowedMin = Math.min(allowedMin, allowed);
    if (used <= 0) continue;

    const d = used * tanHalf;
    trim[i] = d;
    const t1 = sub(pts[i], scale(u, d));
    const t2 = add(pts[i], scale(v, d));
    // The arc's centre sits `used` from t1, perpendicular to u, toward v.
    const w = norm(sub(v, scale(u, cos)));
    const centre = add(t1, scale(w, used));
    const steps = Math.max(1, Math.ceil(theta / ARC_STEP - 1e-9));
    const arc: Vec3[] = [t1];
    for (let s = 1; s < steps; s++) {
      const phi = (theta * s) / steps;
      arc.push(add(centre, add(scale(w, -used * Math.cos(phi)), scale(u, used * Math.sin(phi)))));
    }
    arc.push(t2);
    arcs[i] = arc;
    length += used * theta;
  }
  for (let i = 0; i < n - 1; i++) length += Math.max(0, seg[i] - trim[i] - trim[i + 1]);

  const path: Vec3[] = [];
  const push = (p: Vec3) => {
    if (!path.length || dist(path[path.length - 1], p) >= SAME) path.push(copy(p));
  };
  push(pts[0]);
  for (let i = 1; i < n - 1; i++) {
    const arc = arcs[i];
    if (arc) arc.forEach(push);
    else push(pts[i]);
  }
  push(pts[n - 1]);
  return { path, length, corners, allowed: allowedMin };
}

// ───────────────────────────── hit tests ─────────────────────────────

/** Does segment a→b touch `box` grown by `inflate` on every side? (slab test) */
export function segmentHitsAabb(a: Vec3, b: Vec3, box: Aabb, inflate = 0): boolean {
  let t0 = 0;
  let t1 = 1;
  for (let k = 0; k < 3; k++) {
    const lo = box.min[k] - inflate;
    const hi = box.max[k] + inflate;
    const d = b[k] - a[k];
    if (Math.abs(d) < 1e-12) {
      if (a[k] < lo || a[k] > hi) return false;
      continue;
    }
    let ta = (lo - a[k]) / d;
    let tb = (hi - a[k]) / d;
    if (ta > tb) {
      const swap = ta;
      ta = tb;
      tb = swap;
    }
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return false;
  }
  return true;
}

/** The ids of the boxes some segment of `path` passes through, in `boxes` order. */
export function pathHits(
  path: readonly Vec3[],
  boxes: ReadonlyArray<{ id: string; box: Aabb }>,
  inflate = 0,
  ignore?: ReadonlySet<string>,
): string[] {
  const hits: string[] = [];
  for (const { id, box } of boxes) {
    if (ignore?.has(id) || hits.includes(id)) continue;
    let hit = path.length === 1 && segmentHitsAabb(path[0], path[0], box, inflate);
    for (let i = 1; i < path.length && !hit; i++) hit = segmentHitsAabb(path[i - 1], path[i], box, inflate);
    if (hit) hits.push(id);
  }
  return hits;
}
