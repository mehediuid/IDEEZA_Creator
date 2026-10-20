// Wire routing for the Assembly's Wiring mode: a polyline from one pin to
// another, through the maker's via points in order, that keeps clear of the
// parts. The wire leaves each pin straight along its direction (the lead-out);
// each leg between lead-outs and vias is an A* search over a 3D occupancy
// grid, and the resulting staircase of cell centres is string-pulled into a
// few straight runs. Millimetres, y up; pure and dependency-free, so it runs
// in node:test as in the browser.

import { type Aabb, type Vec3, aabbOf, aabbUnion, add, dist, lerp, norm, scale } from "./math";
import { segmentHitsAabb } from "./wires";

export const MAX_CELLS = 400_000;
const MARGIN = 15;
const NO_PATH = "No path around the parts";
const SAME = 1e-9;
// Weighting h a hair above 1 breaks f-ties toward the goal, which saves most
// of the expansions in open space; the path stays within 0.1% of optimal.
const H_WEIGHT = 1.001;

export type RoutePin = { point: Vec3; dir: Vec3 };
export type RouteInput = {
  from: RoutePin;
  to: RoutePin;
  via?: Vec3[];
  obstacles: Aabb[];
  /** The search volume; by default everything involved, grown by 15 mm. */
  bounds?: Aabb;
  /** Grid cell size, mm (default 2); grows when the grid would pass MAX_CELLS. */
  cell?: number;
  /** Wire radius + clearance kept from every obstacle, mm (default 1.25). */
  inflate?: number;
  /** How far the wire runs straight out of each pin, mm (default 3). */
  leadOut?: number;
  /** Skip the search: pins, lead-outs and vias joined by straight lines. */
  straight?: boolean;
};
export type RouteResult = { points: Vec3[]; ok: boolean; reason?: string };
export type RouteGrid = { origin: Vec3; cell: number; dims: [number, number, number]; count: number };

const cellsAlong = (span: number, cell: number): number =>
  Math.max(1, Math.ceil((Number.isFinite(span) && span > 0 ? span : 0) / cell - 1e-9));

/** The grid covering `bounds`: cubes of `cell` mm, grown until there are at most MAX_CELLS. */
export function fitGrid(bounds: Aabb, cell = 2): RouteGrid {
  const span = [0, 1, 2].map((k) => bounds.max[k] - bounds.min[k]);
  let c = cell > 0 && Number.isFinite(cell) ? cell : 2;
  for (;;) {
    const dims: [number, number, number] = [cellsAlong(span[0], c), cellsAlong(span[1], c), cellsAlong(span[2], c)];
    const count = dims[0] * dims[1] * dims[2];
    if (count <= MAX_CELLS) return { origin: [bounds.min[0], bounds.min[1], bounds.min[2]], cell: c, dims, count };
    c *= Math.max(1.01, Math.cbrt(count / MAX_CELLS));
  }
}

type Grid = RouteGrid & { blocked: Uint8Array };

function buildGrid(bounds: Aabb, cell: number, boxes: readonly Aabb[]): Grid {
  const g: Grid = { ...fitGrid(bounds, cell), blocked: new Uint8Array(0) };
  g.blocked = new Uint8Array(g.count);
  const [nx, ny] = g.dims;
  const lo = [0, 0, 0];
  const hi = [0, 0, 0];
  outer: for (const box of boxes) {
    for (let k = 0; k < 3; k++) {
      // Centre i sits at origin + (i + ½)·cell; these are the box faces in that index space.
      const a = (box.min[k] - g.origin[k]) / g.cell - 0.5;
      const b = (box.max[k] - g.origin[k]) / g.cell - 0.5;
      if (!(a <= b)) continue outer; // empty or NaN box
      let i0 = Math.ceil(a);
      let i1 = Math.floor(b);
      // A part thinner than a cell can fall between two rows of centres; it still blocks the row it crosses.
      if (i0 > i1) i0 = i1 = Math.round((a + b) / 2);
      lo[k] = Math.max(i0, 0);
      hi[k] = Math.min(i1, g.dims[k] - 1);
      if (lo[k] > hi[k]) continue outer;
    }
    for (let k = lo[2]; k <= hi[2]; k++)
      for (let j = lo[1]; j <= hi[1]; j++) g.blocked.fill(1, lo[0] + nx * (j + ny * k), hi[0] + 1 + nx * (j + ny * k));
  }
  return g;
}

/** The cell holding `p`; outside the grid: clamped, or -1 when `clamp` is false. */
function cellOf(g: Grid, p: Vec3, clamp: boolean): number {
  let idx = 0;
  let mul = 1;
  for (let k = 0; k < 3; k++) {
    const n = g.dims[k];
    let i = Math.floor((p[k] - g.origin[k]) / g.cell);
    if (!(i >= 0 && i < n)) {
      if (!clamp) return -1;
      i = i >= n ? n - 1 : 0;
    }
    idx += i * mul;
    mul *= n;
  }
  return idx;
}

function centreOf(g: Grid, idx: number): Vec3 {
  const [nx, ny] = g.dims;
  const i = idx % nx;
  const j = Math.floor(idx / nx) % ny;
  const k = Math.floor(idx / (nx * ny));
  return [g.origin[0] + (i + 0.5) * g.cell, g.origin[1] + (j + 0.5) * g.cell, g.origin[2] + (k + 0.5) * g.cell];
}

/** a→b is clear when every half-cell sample lands in a free cell and it misses every (inflated) box. */
function lineClear(g: Grid, a: Vec3, b: Vec3, boxes: readonly Aabb[]): boolean {
  const steps = Math.max(1, Math.ceil(dist(a, b) / (g.cell / 2)));
  for (let s = 0; s <= steps; s++) {
    const idx = cellOf(g, lerp(a, b, s / steps), false);
    if (idx < 0 || g.blocked[idx]) return false;
  }
  for (const box of boxes) if (segmentHitsAabb(a, b, box)) return false;
  return true;
}

/** Greedy string pulling: from each kept point, jump to the farthest point still in sight. */
function pull(pts: Vec3[], clear: (a: Vec3, b: Vec3) => boolean): Vec3[] {
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = i + 1;
    while (j + 1 < pts.length && clear(pts[i], pts[j + 1])) j++;
    out.push(pts[j]);
    i = j;
  }
  return out;
}

// ───────────────────────────── A* ─────────────────────────────

class MinHeap {
  ids = new Int32Array(1024);
  keys = new Float64Array(1024);
  size = 0;

  push(id: number, key: number): void {
    if (this.size === this.ids.length) {
      const ids = new Int32Array(this.size * 2);
      const keys = new Float64Array(this.size * 2);
      ids.set(this.ids);
      keys.set(this.keys);
      this.ids = ids;
      this.keys = keys;
    }
    let i = this.size++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= key) break;
      this.ids[i] = this.ids[p];
      this.keys[i] = this.keys[p];
      i = p;
    }
    this.ids[i] = id;
    this.keys[i] = key;
  }

  pop(): number {
    const top = this.ids[0];
    const n = --this.size;
    if (n > 0) {
      const id = this.ids[n];
      const key = this.keys[n];
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && this.keys[c + 1] < this.keys[c]) c++;
        if (this.keys[c] >= key) break;
        this.ids[i] = this.ids[c];
        this.keys[i] = this.keys[c];
        i = c;
      }
      this.ids[i] = id;
      this.keys[i] = key;
    }
    return top;
  }
}

type Search = { cost: Float64Array; parent: Int32Array; dirIn: Int8Array; closed: Uint8Array; heap: MinHeap };

const MOVES: Array<[number, number, number]> = [];
for (let dz = -1; dz <= 1; dz++)
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy || dz) MOVES.push([dx, dy, dz]);

/** The cells from s to t (both included), or null when t can't be reached. */
function astar(g: Grid, s: number, t: number, w: Search): number[] | null {
  const [nx, ny, nz] = g.dims;
  const nxy = nx * ny;
  const c = g.cell;
  const turn = 0.2 * c;
  const step = MOVES.map(([dx, dy, dz]) => dx + dy * nx + dz * nxy);
  const stepCost = MOVES.map(([dx, dy, dz]) => c * Math.sqrt(dx * dx + dy * dy + dz * dz));
  const ti = t % nx;
  const tj = Math.floor(t / nx) % ny;
  const tk = Math.floor(t / nxy);
  const { cost, parent, dirIn, closed, heap } = w;
  cost.fill(Infinity);
  closed.fill(0);
  heap.size = 0;

  const h = (i: number, j: number, k: number) =>
    c * H_WEIGHT * Math.sqrt((i - ti) * (i - ti) + (j - tj) * (j - tj) + (k - tk) * (k - tk));
  cost[s] = 0;
  parent[s] = -1;
  dirIn[s] = -1;
  heap.push(s, h(s % nx, Math.floor(s / nx) % ny, Math.floor(s / nxy)));

  while (heap.size) {
    const cur = heap.pop();
    if (closed[cur]) continue;
    if (cur === t) {
      const cells: number[] = [];
      for (let at = t; at !== -1; at = parent[at]) cells.push(at);
      return cells.reverse();
    }
    closed[cur] = 1;
    const i = cur % nx;
    const j = Math.floor(cur / nx) % ny;
    const k = Math.floor(cur / nxy);
    const base = cost[cur];
    const came = dirIn[cur];
    for (let m = 0; m < 26; m++) {
      const [dx, dy, dz] = MOVES[m];
      const ni = i + dx;
      const nj = j + dy;
      const nk = k + dz;
      if (ni < 0 || nj < 0 || nk < 0 || ni >= nx || nj >= ny || nk >= nz) continue;
      const nb = cur + step[m];
      if (closed[nb] || g.blocked[nb]) continue;
      const next = base + stepCost[m] + (came >= 0 && came !== m ? turn : 0);
      if (next < cost[nb]) {
        cost[nb] = next;
        parent[nb] = cur;
        dirIn[nb] = m;
        heap.push(nb, next + h(ni, nj, nk));
      }
    }
  }
  return null;
}

// ───────────────────────────── routing ─────────────────────────────

const inside = (p: Vec3, box: Aabb): boolean =>
  p[0] >= box.min[0] && p[0] <= box.max[0] && p[1] >= box.min[1] && p[1] <= box.max[1] && p[2] >= box.min[2] && p[2] <= box.max[2];

const grow = (box: Aabb, by: number): Aabb => ({
  min: [box.min[0] - by, box.min[1] - by, box.min[2] - by],
  max: [box.max[0] + by, box.max[1] + by, box.max[2] + by],
});

function routeLeg(g: Grid, start: Vec3, goal: Vec3, boxes: readonly Aabb[], w: Search): Vec3[] | null {
  const s = cellOf(g, start, true);
  const t = cellOf(g, goal, true);
  const keep = [g.blocked[s], g.blocked[t]];
  g.blocked[s] = 0;
  g.blocked[t] = 0;
  // A box the leg starts or ends inside can't be left without crossing it.
  const hard = boxes.filter((b) => !inside(start, b) && !inside(goal, b));
  const clear = (a: Vec3, b: Vec3) => lineClear(g, a, b, hard);
  try {
    if (clear(start, goal)) return [start, goal];
    const cells = astar(g, s, t, w);
    if (!cells) return null;
    const pts = [start, ...cells.slice(1, -1).map((idx) => centreOf(g, idx)), goal];
    return pull(pull(pts, clear), clear);
  } finally {
    g.blocked[s] = keep[0];
    g.blocked[t] = keep[1];
  }
}

function joined(parts: Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (const p of parts) if (!out.length || dist(out[out.length - 1], p) >= SAME) out.push([p[0], p[1], p[2]]);
  return out;
}

export function routeWire(input: RouteInput): RouteResult {
  const leadOut = input.leadOut ?? 3;
  const from = input.from.point;
  const to = input.to.point;
  const leadA = add(from, scale(norm(input.from.dir), leadOut));
  const leadB = add(to, scale(norm(input.to.dir), leadOut));
  const stops = [leadA, ...(input.via ?? []), leadB];
  const straight = joined([from, ...stops, to]);
  if (input.straight) return { points: straight, ok: true };

  const inflate = input.inflate ?? 1.25;
  const boxes = input.obstacles.map((b) => grow(b, inflate));
  const bounds =
    input.bounds ?? grow(input.obstacles.reduce(aabbUnion, aabbOf([from, to, ...stops])), MARGIN);
  const g = buildGrid(bounds, input.cell ?? 2, boxes);
  const w: Search = {
    cost: new Float64Array(g.count),
    parent: new Int32Array(g.count),
    dirIn: new Int8Array(g.count),
    closed: new Uint8Array(g.count),
    heap: new MinHeap(),
  };

  const path: Vec3[] = [from];
  for (let i = 0; i + 1 < stops.length; i++) {
    const leg = routeLeg(g, stops[i], stops[i + 1], boxes, w);
    if (!leg) return { points: straight, ok: false, reason: NO_PATH };
    path.push(...leg);
  }
  path.push(to);
  return { points: joined(path), ok: true };
}
