// IDEEZA PCB Software — Schematic → PCB 2D converter (v2, native).
//
// A real (if simplified) netlist-driven convert: reads the schematic sheet,
// derives a PIN-LEVEL netlist from wire connectivity, drops a footprint for
// every physical part, auto-places them (connected parts + their decoupling
// caps grouped), and draws a pad-to-pad ratsnest. A separate Auto-Route step
// (routeRatsnest) turns those airwires into copper tracks. This is NOT the
// KiCad pipeline — it runs entirely in-app.
//
// Pipeline:
//   1. nets      — union-find over wire vertices.
//   2. power     — nets touched by GND / +5V symbols (excluded from ratsnest).
//   3. pins      — each part's schematic pins = wire vertices at its terminals,
//                  each carrying the net (union-find root) it sits on.
//   4. place     — BFS-ordered compact grid; decoupling caps pulled beside the
//                  part they decouple.
//   5. footprints— real land patterns; each pad mapped to a net (pin→pad by
//                  angle) so airwires/tracks land on actual pads.
//   6. ratsnest  — per signal net, an MST of pad-to-pad airwires.

import type { CanvasObject } from "./types";

// Physical part kind → footprint reference + land-pattern glyph.
const FOOTPRINT: Record<string, { fp: string; glyph: string }> = {
  resistorBox: { fp: "R_0805", glyph: "fp0805" },
  resistor: { fp: "R_0805", glyph: "fp0805" },
  capacitor: { fp: "C_0805", glyph: "fp0805" },
  inductor: { fp: "L_0805", glyph: "fp0805" },
  diode: { fp: "D_SOD-123", glyph: "fpSOD123" },
  currentSource: { fp: "SOT-23", glyph: "fpSOT23" },
  opamp: { fp: "SOIC-8", glyph: "fpSOIC8" },
  ic: { fp: "SOIC-8", glyph: "fpSOIC8" },
  component: { fp: "SOIC-8", glyph: "fpSOIC8" },
};
// Symbols that name a power net (not physical footprints).
const POWER: Record<string, string> = {
  gnd: "GND",
  vcc5v: "+5V",
  vcc3v3: "+3V3",
  vcc: "VCC",
};
// Pad centre offsets (canvas px, relative to footprint centre) — must match the
// land-pattern glyphs drawn in placed-objects.tsx so airwires land on pads.
export const PAD_OFFSETS: Record<string, Pt[]> = {
  fp0805: [{ x: -10, y: 0 }, { x: 10, y: 0 }],
  fpSOD123: [{ x: -10, y: 0 }, { x: 10, y: 0 }],
  fpSOT23: [{ x: -8.5, y: 8.5 }, { x: 8.5, y: 8.5 }, { x: 0, y: -8.5 }],
  fpSOIC8: [
    { x: -14, y: -13.5 }, { x: -14, y: -4.5 }, { x: -14, y: 4.5 }, { x: -14, y: 13.5 },
    { x: 14, y: 13.5 }, { x: 14, y: 4.5 }, { x: 14, y: -4.5 }, { x: 14, y: -13.5 },
  ],
};

const ATTACH_R = 30; // px — how close a wire vertex must be to a part terminal
const key = (x: number, y: number) => `${Math.round(x)},${Math.round(y)}`;

// Placement region (canvas coords). The editor board sits at (60,60) sized
// 720×480 (pcb-canvas.tsx) with a 24px inner safe area; keep part centres well
// inside so pads never spill over the board edge.
const REGION = { x0: 110, y0: 110, W: 600, H: 360 };
const PITCH_X = 92; // grid column pitch (px)
const PITCH_Y = 90; // grid row pitch (px)

interface Pt { x: number; y: number }

// ── tiny union-find keyed by string ──────────────────────────────────────────
class UF {
  private p = new Map<string, string>();
  find(a: string): string {
    let r = this.p.get(a);
    if (r === undefined) { this.p.set(a, a); return a; }
    while (r !== a) { a = r; r = this.p.get(a) ?? a; }
    return a;
  }
  union(a: string, b: string) {
    const ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.p.set(ra, rb);
  }
}

// Minimum spanning tree (Prim) over points → list of index pairs.
function mst(pts: Pt[]): Array<[number, number]> {
  const n = pts.length;
  if (n < 2) return [];
  const inTree = new Array(n).fill(false);
  const edges: Array<[number, number]> = [];
  inTree[0] = true;
  const d2 = (a: Pt, b: Pt) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  for (let e = 0; e < n - 1; e++) {
    let best = Infinity, bi = -1, bj = -1;
    for (let i = 0; i < n; i++) {
      if (!inTree[i]) continue;
      for (let j = 0; j < n; j++) {
        if (inTree[j]) continue;
        const dd = d2(pts[i], pts[j]);
        if (dd < best) { best = dd; bi = i; bj = j; }
      }
    }
    if (bj === -1) break;
    inTree[bj] = true;
    edges.push([bi, bj]);
  }
  return edges;
}

// Assign each schematic pin to a footprint pad by matching angle around the
// centre; returns the net (root) sitting on each pad index (or undefined).
function matchPinsToPads(pins: Array<{ off: Pt; root: string }>, pads: Pt[]): Array<string | undefined> {
  const padNet: Array<string | undefined> = new Array(pads.length).fill(undefined);
  const used = new Array(pads.length).fill(false);
  const ang = (p: Pt) => Math.atan2(p.y, p.x);
  for (const pin of pins) {
    const pa = ang(pin.off);
    let best = -1, bd = Infinity;
    for (let k = 0; k < pads.length; k++) {
      if (used[k]) continue;
      let d = Math.abs(pa - ang(pads[k]));
      if (d > Math.PI) d = 2 * Math.PI - d;
      if (d < bd) { bd = d; best = k; }
    }
    if (best >= 0) { used[best] = true; padNet[best] = pin.root; }
  }
  return padNet;
}

// BFS-ordered compact grid placement (connected parts adjacent). Deterministic.
function autoPlace(n: number, edges: Array<[number, number]>): Pt[] {
  const { x0, y0, W, H } = REGION;
  const cx = x0 + W / 2, cy = y0 + H / 2;
  const pos: Pt[] = new Array(n);
  if (n === 0) return pos;

  const adj: Array<Set<number>> = Array.from({ length: n }, () => new Set<number>());
  for (const [a, b] of edges) { adj[a].add(b); adj[b].add(a); }
  const deg = adj.map((s) => s.size);

  const seen = new Array(n).fill(false);
  const order: number[] = [];
  for (const start of [...Array(n).keys()].sort((a, b) => deg[b] - deg[a])) {
    if (seen[start]) continue;
    const q = [start];
    seen[start] = true;
    while (q.length) {
      const u = q.shift()!;
      order.push(u);
      for (const v of [...adj[u]].sort((a, b) => deg[b] - deg[a])) {
        if (!seen[v]) { seen[v] = true; q.push(v); }
      }
    }
  }

  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const gw = (cols - 1) * PITCH_X, gh = (Math.ceil(n / cols) - 1) * PITCH_Y;
  const sx = cx - gw / 2, sy = cy - gh / 2;
  order.forEach((partIdx, seq) => {
    const c = seq % cols, r = Math.floor(seq / cols);
    pos[partIdx] = {
      x: Math.round((sx + c * PITCH_X) / 10) * 10,
      y: Math.round((sy + r * PITCH_Y) / 10) * 10,
    };
  });
  return pos;
}

export interface ConvertResult {
  objects: CanvasObject[]; // footprints + ratsnest (scope: "pcb")
  parts: number;
  nets: number;
  airwires: number;
}

/**
 * Build PCB 2D objects (footprints + pad-to-pad ratsnest) from the schematic.
 * Only schematic-scoped objects are read; the result is scope:"pcb" tagged
 * props.gen="convert" so a re-convert replaces the previous output.
 */
export function convertSchematicToPcb(src: CanvasObject[]): ConvertResult {
  const sch = src.filter((o) => (o.scope ?? "schematic") === "schematic");
  const wires = sch.filter((o) => o.kind === "wire" || o.kind === "bus");
  const parts = sch.filter((o) => FOOTPRINT[o.kind]);
  const powerSyms = sch.filter((o) => POWER[o.kind]);

  // 1. nets — union-find over wire vertices.
  const uf = new UF();
  for (const w of wires) uf.union(key(w.x, w.y), key(w.endX ?? w.x, w.endY ?? w.y));
  const verts: Pt[] = [];
  for (const w of wires) {
    verts.push({ x: w.x, y: w.y });
    verts.push({ x: w.endX ?? w.x, y: w.endY ?? w.y });
  }

  // 2. power nets — a root is power if a power symbol sits on one of its verts.
  const rootPower = new Map<string, string>();
  for (const ps of powerSyms) {
    for (const v of verts) {
      if ((v.x - ps.x) ** 2 + (v.y - ps.y) ** 2 <= ATTACH_R * ATTACH_R) {
        rootPower.set(uf.find(key(v.x, v.y)), POWER[ps.kind]);
      }
    }
  }

  // 3. pins — for each part, the nearest wire vertex per net-root at its
  //    terminals becomes a pin carrying that net.
  const partPins: Array<Array<{ off: Pt; root: string }>> = parts.map((p) => {
    const best = new Map<string, { d: number; v: Pt }>(); // root → closest vertex
    for (const v of verts) {
      const d = (v.x - p.x) ** 2 + (v.y - p.y) ** 2;
      if (d > ATTACH_R * ATTACH_R) continue;
      const root = uf.find(key(v.x, v.y));
      const prev = best.get(root);
      if (!prev || d < prev.d) best.set(root, { d, v });
    }
    return [...best.entries()].map(([root, { v }]) => ({ off: { x: v.x - p.x, y: v.y - p.y }, root }));
  });
  const partRoots = partPins.map((pins) => new Set(pins.map((p) => p.root)));

  // 4. placement graph — signal cliques + decoupling-cap→nearest-IC edges.
  const partsByRoot = new Map<string, number[]>();
  partRoots.forEach((roots, pi) => {
    for (const root of roots) (partsByRoot.get(root) ?? partsByRoot.set(root, []).get(root)!).push(pi);
  });
  const edges: Array<[number, number]> = [];
  for (const [, idxs] of partsByRoot) {
    for (let a = 0; a < idxs.length; a++) {
      for (let b = a + 1; b < idxs.length; b++) edges.push([idxs[a], idxs[b]]);
    }
  }
  // Power-only parts (decoupling caps): tie each to its nearest non-power part
  // so placement keeps it beside the IC/part it decouples.
  const powerOnly = partRoots.map((r) => r.size > 0 && [...r].every((x) => rootPower.has(x)));
  parts.forEach((p, i) => {
    if (!powerOnly[i]) return;
    let best = -1, bd = Infinity;
    parts.forEach((q, j) => {
      if (i === j || powerOnly[j] || partRoots[j].size === 0) return;
      const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
      if (d < bd) { bd = d; best = j; }
    });
    if (best >= 0) edges.push([i, best]);
  });

  const pos = autoPlace(parts.length, edges);

  // 5. footprints + pad→net table.
  const out: CanvasObject[] = [];
  const padAbs: Pt[][] = [];      // per part → absolute pad positions
  const padNet: Array<Array<string | undefined>> = []; // per part → net per pad
  parts.forEach((p, i) => {
    const info = FOOTPRINT[p.kind];
    const desig = (p.text && p.text.trim()) || `${p.kind[0].toUpperCase()}${i + 1}`;
    const pads = PAD_OFFSETS[info.glyph] ?? [];
    padNet.push(matchPinsToPads(partPins[i], pads));
    padAbs.push(pads.map((o) => ({ x: pos[i].x + o.x, y: pos[i].y + o.y })));
    out.push({
      id: `pcb-fp-${desig}-${i}`,
      kind: info.glyph,
      x: pos[i].x,
      y: pos[i].y,
      rotation: 0,
      text: desig,
      footprint: info.fp,
      comment: desig,
      side: "top",
      layer: "top",
      scope: "pcb",
      // Cross-probe link back to the schematic symbol this footprint came from.
      sourceId: p.id,
      props: { gen: "convert", value: desig, footprint: info.fp },
    });
  });

  // 6. ratsnest — group pads by net (skip power), MST of pad-to-pad airwires.
  const netPads = new Map<string, Pt[]>();
  padNet.forEach((nets, i) => {
    nets.forEach((root, k) => {
      if (!root || rootPower.has(root)) return;
      (netPads.get(root) ?? netPads.set(root, []).get(root)!).push(padAbs[i][k]);
    });
  });
  let airwires = 0, netNo = 0;
  for (const [root, pts] of netPads) {
    if (pts.length < 2) continue;
    netNo++;
    const netName = `N${netNo}`;
    for (const [a, b] of mst(pts)) {
      out.push({
        id: `pcb-rats-${root}-${airwires}`,
        kind: "ratsnest",
        x: pts[a].x, y: pts[a].y, endX: pts[b].x, endY: pts[b].y,
        net: netName,
        scope: "pcb",
        props: { gen: "convert" },
      });
      airwires++;
    }
  }

  return { objects: out, parts: parts.length, nets: netNo, airwires };
}

export interface RouteResult {
  objects: CanvasObject[]; // footprints kept + ratsnest replaced by tracks
  routed: number;
}

/**
 * Auto-route: turn every ratsnest airwire into an orthogonal (L-shaped) copper
 * track on the top layer, and drop the airwires. Simplified direct routing (no
 * collision avoidance) — the grid placement keeps most routes clean.
 */
export function routeRatsnest(objects: CanvasObject[], trackWidth: number): RouteResult {
  const kept = objects.filter((o) => o.kind !== "ratsnest");
  const rats = objects.filter((o) => o.kind === "ratsnest");
  let routed = 0;
  const tracks: CanvasObject[] = [];
  for (const r of rats) {
    const x1 = r.x, y1 = r.y, x2 = r.endX ?? r.x, y2 = r.endY ?? r.y;
    const seg = (ax: number, ay: number, bx: number, by: number) => {
      if (ax === bx && ay === by) return;
      tracks.push({
        id: `pcb-trk-${routed}-${tracks.length}`,
        kind: "track",
        x: ax, y: ay, endX: bx, endY: by,
        net: r.net,
        width: trackWidth,
        layer: "top",
        scope: "pcb",
        props: { gen: "route" },
      });
    };
    // L-route: horizontal then vertical (a straight line when aligned).
    seg(x1, y1, x2, y1);
    seg(x2, y1, x2, y2);
    routed++;
  }
  return { objects: [...kept, ...tracks], routed };
}
