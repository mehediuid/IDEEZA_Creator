// IDEEZA PCB — real boolean/combine geometry for shapes & copper regions.
//
// Shapes in this editor are fixed glyphs (no stored vertices), so to combine
// them we (1) reduce each to a vertex polygon, (2) rasterise the selected
// polygons on a fine grid and apply the set operation per cell, then (3) trace
// the boundary with marching-squares into ring(s). This handles Union / Merge,
// Intersect (Preserve), Difference (Subtract) and XOR (Exclude) uniformly —
// including results with holes or multiple islands — without a clipping lib.

import type { CanvasObject } from "./types";

export type Pt = { x: number; y: number };
export type BoolOp = "union" | "intersect" | "difference" | "xor";

const TAU = Math.PI * 2;

// Glyph half-extents (must match placed-objects.tsx GLYPHS).
function rotatePt(px: number, py: number, cx: number, cy: number, deg: number): Pt {
  if (!deg) return { x: px, y: py };
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const dx = px - cx, dy = py - cy;
  return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
}

/** True if this object can take part in a combine (reducible to a polygon). */
export function isCombinable(o: CanvasObject): boolean {
  if (o.points && o.points.length) return true;
  return ["rectangle", "circle", "ellipse", "polygon", "fillRegion", "combineShape"].includes(o.kind);
}

/** Reduce a placed object to an absolute-coordinate vertex polygon. */
export function shapeToPolygon(o: CanvasObject): Pt[] {
  const rot = o.rotation ?? 0;
  // A combine result / real polygon carries its own outer ring (local coords).
  if (o.points && o.points.length) {
    return o.points[0].map((p) => rotatePt(o.x + p.x, o.y + p.y, o.x, o.y, rot));
  }
  // A drawn area carries its real size: `props.shape` says which, `width` /
  // `height` say how big (rect anchors top-left, circle centres on x/y — the
  // board-outline convention). Without this an area drawn 400 px wide poured,
  // cleared and exported as the 28×20 stamp (UIUX-86/92/97).
  const drawn = String((o.props as Record<string, unknown> | undefined)?.shape ?? "");
  if (drawn === "rect" && o.width && o.height) {
    const w = o.width, h = o.height;
    return [
      rotatePt(o.x, o.y, o.x, o.y, rot),
      rotatePt(o.x + w, o.y, o.x, o.y, rot),
      rotatePt(o.x + w, o.y + h, o.x, o.y, rot),
      rotatePt(o.x, o.y + h, o.x, o.y, rot),
    ];
  }
  if (drawn === "circle" && o.width) {
    const r = o.width / 2, out: Pt[] = [];
    for (let i = 0; i < 48; i++) out.push({ x: o.x + r * Math.cos((i / 48) * TAU), y: o.y + r * Math.sin((i / 48) * TAU) });
    return out;
  }
  if (o.kind === "circle") {
    const r = 12, out: Pt[] = [];
    for (let i = 0; i < 48; i++) out.push({ x: o.x + r * Math.cos((i / 48) * TAU), y: o.y + r * Math.sin((i / 48) * TAU) });
    return out;
  }
  if (o.kind === "ellipse") {
    const rx = 14, ry = 9, out: Pt[] = [];
    for (let i = 0; i < 48; i++) out.push(rotatePt(o.x + rx * Math.cos((i / 48) * TAU), o.y + ry * Math.sin((i / 48) * TAU), o.x, o.y, rot));
    return out;
  }
  // rectangle / copper region / fallback → the glyph's rectangle (±14 × ±10).
  const hw = 14, hh = 10;
  return [
    rotatePt(o.x - hw, o.y - hh, o.x, o.y, rot),
    rotatePt(o.x + hw, o.y - hh, o.x, o.y, rot),
    rotatePt(o.x + hw, o.y + hh, o.x, o.y, rot),
    rotatePt(o.x - hw, o.y + hh, o.x, o.y, rot),
  ];
}

function pointInPoly(px: number, py: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function applyOp(ins: boolean[], op: BoolOp): boolean {
  switch (op) {
    case "union": return ins.some(Boolean);
    case "intersect": return ins.every(Boolean);
    case "difference": return ins[0] && !ins.slice(1).some(Boolean);
    case "xor": return ins.filter(Boolean).length % 2 === 1;
  }
}

// Ramer–Douglas–Peucker simplification.
function rdp(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts;
  let maxD = 0, idx = 0;
  const a = pts[0], b = pts[pts.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i].x - a.x) * dy - (pts[i].y - a.y) * dx) / len;
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > eps) {
    const l = rdp(pts.slice(0, idx + 1), eps);
    const r = rdp(pts.slice(idx), eps);
    return l.slice(0, -1).concat(r);
  }
  return [a, b];
}

/**
 * Combine `polys` (absolute coords) with `op`. Returns closed rings (absolute
 * coords) tracing the result boundary; empty when the operation yields nothing.
 */
export function booleanRings(polys: Pt[][], op: BoolOp): Pt[][] {
  const all = polys.flat();
  if (!all.length) return [];
  const M = 3;
  const minX = Math.min(...all.map((p) => p.x)) - M;
  const minY = Math.min(...all.map((p) => p.y)) - M;
  const maxX = Math.max(...all.map((p) => p.x)) + M;
  const maxY = Math.max(...all.map((p) => p.y)) + M;
  const step = 1.4;
  const cols = Math.ceil((maxX - minX) / step) + 1;
  const rows = Math.ceil((maxY - minY) / step) + 1;
  const gx = (i: number) => minX + i * step;
  const gy = (j: number) => minY + j * step;
  // Grid of node-samples: inside/outside after the op.
  const grid: boolean[][] = [];
  for (let j = 0; j <= rows; j++) {
    const row: boolean[] = [];
    for (let i = 0; i <= cols; i++) {
      const px = gx(i), py = gy(j);
      row.push(applyOp(polys.map((p) => pointInPoly(px, py, p)), op));
    }
    grid.push(row);
  }
  // Marching squares → boundary segments (linear-interpolated at 0.5 crossings
  // ≈ cell midpoints, which is exact enough for a fine grid).
  type Seg = [Pt, Pt];
  const segs: Seg[] = [];
  const mid = (ax: number, ay: number, bx: number, by: number): Pt => ({ x: (ax + bx) / 2, y: (ay + by) / 2 });
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const tl = grid[j][i], tr = grid[j][i + 1], br = grid[j + 1][i + 1], bl = grid[j + 1][i];
      const code = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const x0 = gx(i), x1 = gx(i + 1), y0 = gy(j), y1 = gy(j + 1);
      const T = mid(x0, y0, x1, y0), R = mid(x1, y0, x1, y1), B = mid(x0, y1, x1, y1), L = mid(x0, y0, x0, y1);
      const push = (a: Pt, b: Pt) => segs.push([a, b]);
      switch (code) {
        case 1: case 14: push(L, B); break;
        case 2: case 13: push(B, R); break;
        case 3: case 12: push(L, R); break;
        case 4: case 11: push(T, R); break;
        case 6: case 9: push(T, B); break;
        case 7: case 8: push(L, T); break;
        case 5: push(L, T); push(B, R); break;   // saddle
        case 10: push(T, R); push(L, B); break;  // saddle
      }
    }
  }
  // Stitch segments into closed rings by matching endpoints (quantised).
  const key = (p: Pt) => `${Math.round(p.x * 2)},${Math.round(p.y * 2)}`;
  const startMap = new Map<string, Seg[]>();
  segs.forEach((s) => { const k = key(s[0]); (startMap.get(k) ?? startMap.set(k, []).get(k)!).push(s); });
  const used = new Set<Seg>();
  const rings: Pt[][] = [];
  for (const seg of segs) {
    if (used.has(seg)) continue;
    const ring: Pt[] = [seg[0]];
    let cur = seg; let guard = 0;
    while (cur && !used.has(cur) && guard++ < 100000) {
      used.add(cur);
      ring.push(cur[1]);
      const cand = startMap.get(key(cur[1])) ?? [];
      cur = cand.find((s) => !used.has(s)) as Seg;
    }
    if (ring.length > 3) {
      const simplified = rdp(ring, 0.8);
      if (simplified.length > 2) rings.push(simplified);
    }
  }
  return rings;
}

/** Signed area (screen coords: +ve = clockwise). Used to find the outer ring. */
export function ringArea(r: Pt[]): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j].x + r[i].x) * (r[j].y - r[i].y);
  return a / 2;
}

// ── Corner operations (Edit ▸ Add Chamfer / Add Fillet) ──────────────────────
// Both walk a closed ring and replace each corner with either a straight bevel
// (chamfer) or a true tangent arc (fillet). The trim distance is clamped to half
// of each adjacent edge, so a size larger than the shape can't fold it inside
// out — the caller reports how many corners were clamped.

export type CornerResult = { ring: Pt[]; clamped: number };

const EPS = 1e-6;

/** Trim distance at a corner, clamped by the two adjacent edge halves. */
function trimAt(want: number, lenPrev: number, lenNext: number): number {
  return Math.max(0, Math.min(want, lenPrev / 2, lenNext / 2));
}

/** Bevel every corner of a closed ring by `size` (same units as the ring). */
export function chamferRing(ring: Pt[], size: number): CornerResult {
  const n = ring.length;
  if (n < 3 || size <= 0) return { ring, clamped: 0 };
  const out: Pt[] = [];
  let clamped = 0;
  for (let i = 0; i < n; i++) {
    const v = ring[i], p = ring[(i - 1 + n) % n], q = ring[(i + 1) % n];
    const d1 = Math.hypot(p.x - v.x, p.y - v.y);
    const d2 = Math.hypot(q.x - v.x, q.y - v.y);
    if (d1 < EPS || d2 < EPS) { out.push(v); continue; }
    const u1 = { x: (p.x - v.x) / d1, y: (p.y - v.y) / d1 };
    const u2 = { x: (q.x - v.x) / d2, y: (q.y - v.y) / d2 };
    // Collinear vertex — nothing to cut.
    if (Math.abs(u1.x * u2.y - u1.y * u2.x) < 1e-4) { out.push(v); continue; }
    const d = trimAt(size, d1, d2);
    if (d < size - EPS) clamped++;
    if (d < EPS) { out.push(v); continue; }
    out.push({ x: v.x + u1.x * d, y: v.y + u1.y * d });
    out.push({ x: v.x + u2.x * d, y: v.y + u2.y * d });
  }
  return { ring: out, clamped };
}

/** Round every corner of a closed ring with a real arc of `radius`. */
export function filletRing(ring: Pt[], radius: number, segments = 8): CornerResult {
  const n = ring.length;
  if (n < 3 || radius <= 0) return { ring, clamped: 0 };
  const out: Pt[] = [];
  let clamped = 0;
  for (let i = 0; i < n; i++) {
    const v = ring[i], p = ring[(i - 1 + n) % n], q = ring[(i + 1) % n];
    const d1 = Math.hypot(p.x - v.x, p.y - v.y);
    const d2 = Math.hypot(q.x - v.x, q.y - v.y);
    if (d1 < EPS || d2 < EPS) { out.push(v); continue; }
    const u1 = { x: (p.x - v.x) / d1, y: (p.y - v.y) / d1 };
    const u2 = { x: (q.x - v.x) / d2, y: (q.y - v.y) / d2 };
    const cross = u1.x * u2.y - u1.y * u2.x;
    if (Math.abs(cross) < 1e-4) { out.push(v); continue; }
    // Half-angle between the two edges: tangent distance = r / tan(θ/2).
    const cosT = Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y));
    const half = Math.acos(cosT) / 2;
    if (half < 1e-4 || Math.abs(Math.tan(half)) < EPS) { out.push(v); continue; }
    let r = radius;
    let d = r / Math.tan(half);
    const dMax = trimAt(d, d1, d2);
    if (dMax < d - EPS) { clamped++; d = dMax; r = d * Math.tan(half); }
    if (d < EPS || r < EPS) { out.push(v); continue; }
    const t1 = { x: v.x + u1.x * d, y: v.y + u1.y * d };
    const t2 = { x: v.x + u2.x * d, y: v.y + u2.y * d };
    // Arc centre sits along the angle bisector, r / sin(θ/2) from the corner.
    const bis = { x: u1.x + u2.x, y: u1.y + u2.y };
    const bl = Math.hypot(bis.x, bis.y);
    if (bl < EPS) { out.push(v); continue; }
    const c = { x: v.x + (bis.x / bl) * (r / Math.sin(half)), y: v.y + (bis.y / bl) * (r / Math.sin(half)) };
    const a1 = Math.atan2(t1.y - c.y, t1.x - c.x);
    const a2 = Math.atan2(t2.y - c.y, t2.x - c.x);
    let sweep = a2 - a1;
    while (sweep > Math.PI) sweep -= Math.PI * 2;
    while (sweep < -Math.PI) sweep += Math.PI * 2;
    for (let k = 0; k <= segments; k++) {
      const a = a1 + (sweep * k) / segments;
      out.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
    }
  }
  return { ring: out, clamped };
}
