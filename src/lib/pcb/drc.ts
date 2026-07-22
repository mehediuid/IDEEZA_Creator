// IDEEZA PCB — native Design-Rule Check engine (DRC).
//
// The PCB counterpart of the schematic ERC engine (nets.ts). Phase 1 implements
// the Safe-Spacing clearance matrix: for every pair of copper objects that can
// physically conflict (share a layer, on different nets) it computes the real
// edge-to-edge clearance and reports a violation when it is closer than the
// rule for that object-type pair. Config-driven — reads the clearance matrix
// (mm) from the Design-Rule dialog data so tuning is real.
//
// Geometry lives in canvas px; linear dimensions (width/drill) are mil. Both
// convert into the px space through the two scale factors below, and the
// clearance matrix (authored in mm) converts through PX_PER_MM.

import type { CanvasObject, DiffPair, ErcIssue, ErcSeverity } from "./types";
import {
  defaultClearanceRows,
  defaultPcbPhysicsRules,
  type ClearanceRow,
  type PcbPhysicsRules,
} from "./design-rules-data";

// Working scale. The editor lays PCB geometry out in canvas px (an 0805 land
// pattern spans ~20px, i.e. ~2.0mm), so ~10px ≈ 1mm.
export const PX_PER_MM = 10;
const MM_PER_MIL = 0.0254;
const MIL_TO_PX = MM_PER_MIL * PX_PER_MM; // 1 mil → px
const EPS = 1e-3;

export interface PcbDrcConfig {
  clearance: ClearanceRow[]; // mm, lower-triangular (CLEARANCE_COLS order + Hole)
  clearanceSeverity: ErcSeverity;
  clearanceEnabled: boolean;
  physics: PcbPhysicsRules;   // mm — track width / via size / net length range
  physicsSeverity: ErcSeverity;
  physicsEnabled: boolean;
  connectivitySeverity: ErcSeverity; // free copper + disconnected net
  connectivityEnabled: boolean;
  diffPairs: DiffPair[];             // from state.pcbDiffPairs (netA/netB/gap/width)
  diffPairSkewMax: number;           // mm — intra-pair length-match tolerance
  diffPairSeverity: ErcSeverity;
  diffPairEnabled: boolean;
  schematicNets: string[];           // expected net names from the schematic netlist
  netlistMissingSeverity: ErcSeverity; // schematic net absent on PCB
  netlistExtraSeverity: ErcSeverity;   // PCB net absent in schematic
  netlistEnabled: boolean;
}

export function defaultPcbDrcConfig(): PcbDrcConfig {
  return {
    clearance: defaultClearanceRows(),
    clearanceSeverity: "error",
    clearanceEnabled: true,
    physics: defaultPcbPhysicsRules(),
    physicsSeverity: "warning",
    physicsEnabled: true,
    connectivitySeverity: "warning",
    connectivityEnabled: true,
    diffPairs: [],
    diffPairSkewMax: 0.5,
    diffPairSeverity: "warning",
    diffPairEnabled: true,
    schematicNets: [],
    netlistMissingSeverity: "fatal",
    netlistExtraSeverity: "warning",
    netlistEnabled: true,
  };
}

// ── Clearance-matrix object types ─────────────────────────────────────────────
// Index into CLEARANCE_COLS. Board Outline (11) and the Hole row (12) are not
// participants in Phase 1 (board-outline uses keep-inside semantics, holes are
// a follow-up), so copper objects map onto 0..10.
const TYPE_LABEL = [
  "Track", "SMD Pad", "TH Pad", "SMD Test Pt", "TH Test Pt", "Via",
  "Fill/Teardrop", "Cu/Plane Zone", "Slot Region", "Line", "Text/Image",
] as const;

function clearanceType(o: CanvasObject): number {
  switch (o.kind) {
    case "track": return 0;
    case "pad":
      return o.padType === "tht" ? 2 : o.padType === "test" ? 3 : 1;
    case "via":
    case "sutureVias": return 5;
    case "fillRegion":
    case "teardrop": return 6;
    case "polygon":
    case "copper":
    case "copperRegion":
    case "plane": return 7;
    case "slot": return 8;
    case "line": return 9;
    default: return -1;
  }
}

// Required clearance (px) for a type pair — the matrix is symmetric and stored
// lower-triangular, so index by (max, min).
function requiredPx(rows: ClearanceRow[], i: number, j: number): number {
  const hi = Math.max(i, j), lo = Math.min(i, j);
  const mm = rows[hi]?.values[lo];
  return (typeof mm === "number" ? mm : 0.152) * PX_PER_MM;
}

// ── Geometry ──────────────────────────────────────────────────────────────────
interface Pt { x: number; y: number }
type Seg = [Pt, Pt];
interface Geom {
  edges: Seg[];     // boundary (polygon) or centre (capsule) segments
  r: number;        // inflation radius (px) — capsule half-width; 0 for polygons
  poly: Pt[] | null; // closed ring for containment tests (null for capsules)
  pts: Pt[];        // representative points tested against the other shape's poly
}

const DEFAULT_WIDTH_MIL: Record<string, number> = {
  track: 8, line: 8, pad: 60, via: 24, sutureVias: 24,
};
function halfWidthPx(o: CanvasObject): number {
  const w = o.width ?? DEFAULT_WIDTH_MIL[o.kind] ?? 8;
  return (w * MIL_TO_PX) / 2;
}

function rectPoly(o: CanvasObject): Pt[] {
  const hw = ((o.width ?? 60) * MIL_TO_PX) / 2;
  const hh = ((o.height ?? o.width ?? 60) * MIL_TO_PX) / 2;
  const rot = ((o.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  return [
    { x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }, { x: -hw, y: hh },
  ].map((p) => ({ x: o.x + p.x * cos - p.y * sin, y: o.y + p.x * sin + p.y * cos }));
}

function regionPoly(o: CanvasObject): Pt[] | null {
  const ring = o.points?.[0];
  if (!ring || ring.length < 3) return null;
  return ring.map((p) => ({ x: o.x + p.x, y: o.y + p.y }));
}

function polyEdges(poly: Pt[]): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i < poly.length; i++) out.push([poly[i], poly[(i + 1) % poly.length]]);
  return out;
}

function geomOf(o: CanvasObject): Geom | null {
  const p1 = { x: o.x, y: o.y };
  switch (o.kind) {
    case "track":
    case "line": {
      const p2 = { x: o.endX ?? o.x, y: o.endY ?? o.y };
      return { edges: [[p1, p2]], r: halfWidthPx(o), poly: null, pts: [p1, p2] };
    }
    case "pad": {
      if (o.padShape === "rect" || o.padShape === "oval") {
        const poly = rectPoly(o);
        return { edges: polyEdges(poly), r: 0, poly, pts: poly };
      }
      return { edges: [[p1, p1]], r: halfWidthPx(o), poly: null, pts: [p1] };
    }
    case "via":
    case "sutureVias":
      return { edges: [[p1, p1]], r: halfWidthPx(o), poly: null, pts: [p1] };
    case "polygon":
    case "copper":
    case "copperRegion":
    case "plane":
    case "fillRegion":
    case "teardrop":
    case "slot": {
      const poly = regionPoly(o);
      if (!poly) return null;
      return { edges: polyEdges(poly), r: 0, poly, pts: poly };
    }
    default:
      return null;
  }
}

function clamp01(t: number) { return t < 0 ? 0 : t > 1 ? 1 : t; }

function pointSegDist(p: Pt, a: Pt, b: Pt): number {
  const abx = b.x - a.x, aby = b.y - a.y;
  const l2 = abx * abx + aby * aby;
  const t = l2 === 0 ? 0 : clamp01(((p.x - a.x) * abx + (p.y - a.y) * aby) / l2);
  const dx = p.x - (a.x + abx * t), dy = p.y - (a.y + aby * t);
  return Math.hypot(dx, dy);
}

function orient(a: Pt, b: Pt, c: Pt): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
function segsCross(a1: Pt, a2: Pt, b1: Pt, b2: Pt): boolean {
  const d1 = orient(b1, b2, a1), d2 = orient(b1, b2, a2);
  const d3 = orient(a1, a2, b1), d4 = orient(a1, a2, b2);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
function segSegDist(a1: Pt, a2: Pt, b1: Pt, b2: Pt): number {
  const aDeg = a1.x === a2.x && a1.y === a2.y;
  const bDeg = b1.x === b2.x && b1.y === b2.y;
  if (!aDeg && !bDeg && segsCross(a1, a2, b1, b2)) return 0;
  return Math.min(
    pointSegDist(a1, b1, b2),
    pointSegDist(a2, b1, b2),
    pointSegDist(b1, a1, a2),
    pointSegDist(b2, a1, a2),
  );
}

function pointInPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (((yi > p.y) !== (yj > p.y)) &&
        (p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// Edge-to-edge clearance (px). Negative when the shapes overlap / one contains
// the other.
function clearanceBetween(A: Geom, B: Geom): number {
  let d = Infinity;
  for (const ea of A.edges) for (const eb of B.edges) {
    d = Math.min(d, segSegDist(ea[0], ea[1], eb[0], eb[1]));
    if (d <= 0) break;
  }
  d -= A.r + B.r;
  // Containment (one shape fully inside the other → the edge distance misses it).
  if (B.poly && A.pts.some((p) => pointInPoly(p, B.poly!))) return Math.min(d, -(A.r + B.r) - 1);
  if (A.poly && B.pts.some((p) => pointInPoly(p, A.poly!))) return Math.min(d, -(A.r + B.r) - 1);
  return d;
}

// ── Engine ──────────────────────────────────────────────────────────────────
const THROUGH = new Set(["via", "sutureVias"]);
function isThrough(o: CanvasObject): boolean {
  return THROUGH.has(o.kind) || (o.kind === "pad" && (o.padType === "tht" || (o.drill ?? 0) > 0));
}
function layerConflict(a: CanvasObject, b: CanvasObject): boolean {
  if (isThrough(a) || isThrough(b)) return true;
  return (a.layer ?? "top") === (b.layer ?? "top");
}
function sameNet(a: CanvasObject, b: CanvasObject): boolean {
  return !!a.net && !!b.net && a.net === b.net;
}
function label(o: CanvasObject): string {
  return o.net ? `${o.kind} (${o.net})` : o.kind;
}

export function runDrc(
  objects: CanvasObject[],
  cfg: PcbDrcConfig = defaultPcbDrcConfig(),
): ErcIssue[] {
  const issues: ErcIssue[] = [];

  // Clearance is one phase among several — gating it must NOT skip the rest
  // (physics / connectivity / diff-pair / netlist), so wrap it, don't return.
  if (cfg.clearanceEnabled) {
  const items = objects
    .filter((o) => o.scope !== "schematic")
    .map((o) => ({ o, type: clearanceType(o), geom: geomOf(o) }))
    .filter((it): it is { o: CanvasObject; type: number; geom: Geom } => it.type >= 0 && it.geom !== null);

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const A = items[i], B = items[j];
      if (sameNet(A.o, B.o)) continue;
      if (!layerConflict(A.o, B.o)) continue;
      const need = requiredPx(cfg.clearance, A.type, B.type);
      const gap = clearanceBetween(A.geom, B.geom);
      if (gap < need - EPS) {
        const gapMm = Math.max(gap, 0) / PX_PER_MM;
        const needMm = need / PX_PER_MM;
        issues.push({
          severity: cfg.clearanceSeverity,
          title: `Clearance: ${TYPE_LABEL[A.type]} to ${TYPE_LABEL[B.type]}`,
          detail: `${label(A.o)} and ${label(B.o)} — ${gapMm.toFixed(3)}mm < required ${needMm.toFixed(3)}mm`,
          rule: "clearance",
          x: (A.o.x + B.o.x) / 2,
          y: (A.o.y + B.o.y) / 2,
        });
      }
    }
  }
  }

  if (cfg.physicsEnabled) runPhysics(objects, cfg, issues);
  if (cfg.connectivityEnabled) runConnectivity(objects, cfg, issues);
  if (cfg.diffPairEnabled) runDiffPairs(objects, cfg, issues);
  if (cfg.netlistEnabled) runNetlist(objects, cfg, issues);
  return issues;
}

// ── Phase 3 — connectivity + free copper ──────────────────────────────────────
// Copper that carries a net when routed; unnetted = "free copper".
const NETTED_COPPER = new Set([
  "track", "pad", "via", "sutureVias", "fillRegion", "teardrop",
  "polygon", "copper", "copperRegion", "plane",
]);
const TOUCH_TOL = 2; // px — same-net copper closer than this is electrically joined

function runConnectivity(objects: CanvasObject[], cfg: PcbDrcConfig, issues: ErcIssue[]) {
  const sev = cfg.connectivitySeverity;
  const items = objects.filter((o) => o.scope !== "schematic" && NETTED_COPPER.has(o.kind));

  // Free copper — no net assigned.
  for (const o of items) {
    if (!o.net) issues.push({ severity: sev, title: "Free copper", detail: `${o.kind} not assigned to a net`, rule: "free-copper", x: o.x, y: o.y });
  }

  // Disconnected net — same-net copper that does not all connect geometrically.
  const byNet = new Map<string, CanvasObject[]>();
  for (const o of items) {
    if (!o.net) continue;
    const list = byNet.get(o.net) ?? [];
    list.push(o);
    byNet.set(o.net, list);
  }
  for (const [net, objs] of byNet) {
    if (objs.length < 2) continue;
    const geoms = objs.map(geomOf);
    const parent = objs.map((_, i) => i);
    const find = (a: number): number => { while (parent[a] !== a) a = parent[a] = parent[parent[a]]; return a; };
    for (let i = 0; i < objs.length; i++) {
      for (let j = i + 1; j < objs.length; j++) {
        const gi = geoms[i], gj = geoms[j];
        if (gi && gj && clearanceBetween(gi, gj) <= TOUCH_TOL) parent[find(i)] = find(j);
      }
    }
    const roots = new Set(objs.map((_, i) => find(i)));
    if (roots.size > 1) {
      issues.push({ severity: sev, title: "Disconnected net", detail: `net ${net} has ${roots.size} isolated sections`, rule: "disconnect", x: objs[0].x, y: objs[0].y });
    }
  }
}

// ── Phase 2 — physics (track width / via size / net-length range) ─────────────
function runPhysics(objects: CanvasObject[], cfg: PcbDrcConfig, issues: ErcIssue[]) {
  const p = cfg.physics;
  const sev = cfg.physicsSeverity;
  const push = (title: string, detail: string, x: number, y: number) =>
    issues.push({ severity: sev, title, detail, rule: "physics", x, y });
  const pcb = objects.filter((o) => o.scope !== "schematic");

  for (const o of pcb) {
    if (o.kind === "track") {
      const w = (o.width ?? DEFAULT_WIDTH_MIL.track) * MM_PER_MIL;
      const who = o.net ? `${o.net} track` : "track";
      if (w < p.trackWidthMin - EPS) push("Track width", `${who} ${w.toFixed(3)}mm < min ${p.trackWidthMin}mm`, o.x, o.y);
      else if (w > p.trackWidthMax + EPS) push("Track width", `${who} ${w.toFixed(3)}mm > max ${p.trackWidthMax}mm`, o.x, o.y);
    } else if (o.kind === "via" || o.kind === "sutureVias") {
      const outer = (o.width ?? DEFAULT_WIDTH_MIL.via) * MM_PER_MIL;
      const inner = (o.drill ?? 0) * MM_PER_MIL;
      if (outer < p.viaOuterMin - EPS) push("Via size", `via outer ${outer.toFixed(3)}mm < min ${p.viaOuterMin}mm`, o.x, o.y);
      else if (outer > p.viaOuterMax + EPS) push("Via size", `via outer ${outer.toFixed(3)}mm > max ${p.viaOuterMax}mm`, o.x, o.y);
      if (inner > EPS) {
        if (inner < p.viaInnerMin - EPS) push("Via size", `via hole ${inner.toFixed(3)}mm < min ${p.viaInnerMin}mm`, o.x, o.y);
        else if (inner > p.viaInnerMax + EPS) push("Via size", `via hole ${inner.toFixed(3)}mm > max ${p.viaInnerMax}mm`, o.x, o.y);
      }
    }
  }

  // Net length = total track length per net (px → mm).
  const netLen = new Map<string, number>();
  const netAt = new Map<string, { x: number; y: number }>();
  for (const o of pcb) {
    if (o.kind !== "track" || !o.net) continue;
    const dx = (o.endX ?? o.x) - o.x, dy = (o.endY ?? o.y) - o.y;
    netLen.set(o.net, (netLen.get(o.net) ?? 0) + Math.hypot(dx, dy) / PX_PER_MM);
    if (!netAt.has(o.net)) netAt.set(o.net, { x: o.x, y: o.y });
  }
  for (const [net, len] of netLen) {
    const at = netAt.get(net)!;
    if (len < p.netLengthMin - EPS) push("Net length", `net ${net} ${len.toFixed(2)}mm < min ${p.netLengthMin}mm`, at.x, at.y);
    else if (len > p.netLengthMax + EPS) push("Net length", `net ${net} ${len.toFixed(2)}mm > max ${p.netLengthMax}mm`, at.x, at.y);
  }
}

// ── Phase 4 — differential pairs + schematic-netlist mismatch ─────────────────
function trackLenMm(tracks: CanvasObject[]): number {
  let px = 0;
  for (const t of tracks) px += Math.hypot((t.endX ?? t.x) - t.x, (t.endY ?? t.y) - t.y);
  return px / PX_PER_MM;
}

function runDiffPairs(objects: CanvasObject[], cfg: PcbDrcConfig, issues: ErcIssue[]) {
  const sev = cfg.diffPairSeverity;
  const tracks = objects.filter((o) => o.scope !== "schematic" && o.kind === "track");
  const push = (d: string, x: number, y: number) =>
    issues.push({ severity: sev, title: "Diff-pair", detail: d, rule: "diff-pair", x, y });
  for (const dp of cfg.diffPairs) {
    if (!dp.netA || !dp.netB) continue;
    const a = tracks.filter((o) => o.net === dp.netA);
    const b = tracks.filter((o) => o.net === dp.netB);
    if (a.length === 0 && b.length === 0) continue; // unrouted pair — nothing to check yet
    if (a.length === 0 || b.length === 0) {
      const missing = a.length === 0 ? dp.netA : dp.netB;
      const seed = a[0] ?? b[0];
      push(`${dp.name}: ${missing} has no routing`, seed.x, seed.y);
      continue;
    }
    const off = [...a, ...b].find((t) => Math.abs((t.width ?? 0) - dp.width) > 0.5);
    if (off) push(`${dp.name}: track width ${off.width}mil ≠ target ${dp.width}mil`, off.x, off.y);
    const la = trackLenMm(a), lb = trackLenMm(b), skew = Math.abs(la - lb);
    if (skew > cfg.diffPairSkewMax + EPS)
      push(`${dp.name}: length skew ${skew.toFixed(2)}mm > tol ${cfg.diffPairSkewMax}mm (${dp.netA}=${la.toFixed(2)}, ${dp.netB}=${lb.toFixed(2)})`, a[0].x, a[0].y);
  }
}

function runNetlist(objects: CanvasObject[], cfg: PcbDrcConfig, issues: ErcIssue[]) {
  if (cfg.schematicNets.length === 0) return; // no schematic to compare against
  const pcbNets = new Set(
    objects
      .filter((o) => o.scope !== "schematic" && NETTED_COPPER.has(o.kind) && o.net)
      .map((o) => o.net as string),
  );
  const schem = new Set(cfg.schematicNets);
  for (const n of schem) {
    if (!pcbNets.has(n))
      issues.push({ severity: cfg.netlistMissingSeverity, title: "Netlist mismatch", detail: `net ${n} in schematic but not on PCB`, rule: "netlist", x: 0, y: 0 });
  }
  for (const n of pcbNets) {
    if (!schem.has(n))
      issues.push({ severity: cfg.netlistExtraSeverity, title: "Netlist mismatch", detail: `net ${n} on PCB not in schematic`, rule: "netlist", x: 0, y: 0 });
  }
}
