// Interactive routing — corner style + obstacle handling for a drafted track.
//
// Both Route ▸ Routing Corner and Route ▸ Routing Mode used to be cosmetic:
// `state.routingCorner` / `state.routingMode` were written and never read. This
// module turns a start/end pair into the polyline the track will really take,
// and (for Push) the moves it needs from the copper in the way. The draft
// preview and the commit call the SAME planner, so what you see is what lands.

import type { CanvasObject, PcbState } from "./types";
import { PX_PER_MM } from "./drc";

export type Pt = { x: number; y: number };

const MM_PER_MIL = 0.0254;
const MIL_TO_PX = MM_PER_MIL * PX_PER_MM;

/** Track↔track clearance in px, from the tuned rules when they exist. */
function trackClearancePx(state: PcbState): number {
  const rows = state.pcbDrcConfig?.clearance;
  const mm = rows?.find((r) => r.name === "Track")?.values?.[0];
  return (typeof mm === "number" ? mm : 0.102) * PX_PER_MM;
}

function halfWidth(o: CanvasObject): number {
  const mil = o.width ?? (o.kind === "pad" ? 60 : o.kind === "via" ? 24 : 8);
  return (mil * MIL_TO_PX) / 2;
}

function segDist(a1: Pt, a2: Pt, b1: Pt, b2: Pt): number {
  const d = (p: Pt, q1: Pt, q2: Pt) => {
    const dx = q2.x - q1.x, dy = q2.y - q1.y;
    const L2 = dx * dx + dy * dy;
    const t = L2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p.x - q1.x) * dx + (p.y - q1.y) * dy) / L2));
    return Math.hypot(p.x - (q1.x + t * dx), p.y - (q1.y + t * dy));
  };
  // Segment-segment distance: if they cross it is 0, else the smallest
  // point-to-segment distance among the four endpoints.
  const o = (p: Pt, q: Pt, r: Pt) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  if (o(a1, a2, b1) !== o(a1, a2, b2) && o(b1, b2, a1) !== o(b1, b2, a2)) return 0;
  return Math.min(d(a1, b1, b2), d(a2, b1, b2), d(b1, a1, a2), d(b2, a1, a2));
}

/** The net of the copper a draft starts (or ends) on — that copper is what you
 *  are routing FROM, so it must not count as an obstacle. */
function netAt(state: PcbState, p: Pt, layer: string | undefined): string | undefined {
  let best: { d: number; net?: string } | null = null;
  for (const o of state.objects) {
    if ((o.scope ?? "schematic") === "schematic") continue;
    if (!["track", "pad", "via", "sutureVias"].includes(o.kind)) continue;
    const through = o.kind !== "track";
    if (!through && (o.layer ?? "top") !== (layer ?? "top")) continue;
    const b1 = { x: o.x, y: o.y };
    const b2 = o.kind === "track" ? { x: o.endX ?? o.x, y: o.endY ?? o.y } : b1;
    const d = segDist(p, p, b1, b2) - halfWidth(o);
    if (d <= 2 && (!best || d < best.d)) best = { d, net: o.net };
  }
  return best?.net;
}

/** Copper that can block a track being drawn on `layer` for `net`. Anything the
 *  draft physically starts or ends on is exempt regardless of net — otherwise
 *  the pad you are routing from blocks you. */
function blockers(
  state: PcbState,
  layer: string | undefined,
  net: string | undefined,
  anchors: Pt[] = [],
): CanvasObject[] {
  const through = new Set(["via", "sutureVias", "pad"]);
  return state.objects.filter((o) => {
    if ((o.scope ?? "schematic") === "schematic") return false;
    if (!["track", "pad", "via", "sutureVias"].includes(o.kind)) return false;
    if (net && o.net && o.net === net) return false; // same net can touch
    if (!through.has(o.kind) && (o.layer ?? "top") !== (layer ?? "top")) return false;
    const b1 = { x: o.x, y: o.y };
    const b2 = o.kind === "track" ? { x: o.endX ?? o.x, y: o.endY ?? o.y } : b1;
    for (const a of anchors) {
      if (segDist(a, a, b1, b2) - halfWidth(o) <= 2) return false; // we start/end here
    }
    return true;
  });
}

/** Does this polyline keep its distance from everything in the way? */
function pathClear(pts: Pt[], obs: CanvasObject[], need: number, halfTrack: number): CanvasObject | null {
  for (let i = 0; i + 1 < pts.length; i++) {
    for (const o of obs) {
      const b1 = { x: o.x, y: o.y };
      const b2 = o.kind === "track" ? { x: o.endX ?? o.x, y: o.endY ?? o.y } : b1;
      const gap = segDist(pts[i], pts[i + 1], b1, b2) - halfTrack - halfWidth(o);
      if (gap < need) return o;
    }
  }
  return null;
}

// UIUX-91 — a corner has two independent choices: the **shape** of the bend
// (a straight miter, or a rounded arc) and the **angle** its legs are held to
// (45°, 90°, or free). The Route menu offers the six combinations; the id
// carries both so the planner can read them apart.
export type CornerShape = "line" | "arc";
export type CornerAngle = "45" | "90" | "free";
export type CornerStyle = "line45" | "line90" | "lineFree" | "arc45" | "arc90" | "arcFree";
export const CORNER_STYLES: ReadonlyArray<{ id: CornerStyle; shape: CornerShape; angle: CornerAngle; label: string }> = [
  { id: "line45", shape: "line", angle: "45", label: "Line 45°" },
  { id: "line90", shape: "line", angle: "90", label: "Line 90°" },
  { id: "lineFree", shape: "line", angle: "free", label: "Line Free Angle" },
  { id: "arc45", shape: "arc", angle: "45", label: "Arc 45°" },
  { id: "arc90", shape: "arc", angle: "90", label: "Arc 90°" },
  { id: "arcFree", shape: "arc", angle: "free", label: "Arc Free Angle" },
];
export const cornerShapeOf = (s: CornerStyle): CornerShape => (s.startsWith("arc") ? "arc" : "line");
export const cornerAngleOf = (s: CornerStyle): CornerAngle =>
  s.endsWith("45") ? "45" : s.endsWith("90") ? "90" : "free";

/** How many segments an arc is sampled into — smooth on screen, cheap to store. */
const ARC_STEPS = 10;

/**
 * Replace each interior vertex of an open polyline with a tangent arc. The
 * trim is clamped to half of each adjacent leg, so an oversized radius can't
 * fold the run back on itself.
 */
function roundCorners(pts: Pt[], radius: number): Pt[] {
  if (pts.length < 3 || radius <= 0.5) return pts;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i + 1 < pts.length; i++) {
    const p = pts[i], a = pts[i - 1], b = pts[i + 1];
    const v1 = { x: a.x - p.x, y: a.y - p.y }, v2 = { x: b.x - p.x, y: b.y - p.y };
    const l1 = Math.hypot(v1.x, v1.y), l2 = Math.hypot(v2.x, v2.y);
    if (l1 < 1e-6 || l2 < 1e-6) continue;
    const u1 = { x: v1.x / l1, y: v1.y / l1 }, u2 = { x: v2.x / l2, y: v2.y / l2 };
    const cos = Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y));
    const theta = Math.acos(cos);
    if (theta < 0.05 || Math.PI - theta < 0.05) { out.push(p); continue; }
    // A leg shared with the next corner may only give up half of itself; a leg
    // that ends at the run's own endpoint can be consumed whole, which is what
    // lets Arc Free Angle open the bend until no straight leg is left.
    const cap1 = i - 1 === 0 ? l1 : l1 / 2;
    const cap2 = i + 1 === pts.length - 1 ? l2 : l2 / 2;
    const tan = Math.min(radius / Math.tan(theta / 2), cap1, cap2);
    const r = tan * Math.tan(theta / 2);
    const t1 = { x: p.x + u1.x * tan, y: p.y + u1.y * tan };
    const t2 = { x: p.x + u2.x * tan, y: p.y + u2.y * tan };
    // Centre sits on the bisector, at r / sin(θ/2) from the vertex.
    const bis = { x: u1.x + u2.x, y: u1.y + u2.y };
    const bl = Math.hypot(bis.x, bis.y);
    if (bl < 1e-6) { out.push(p); continue; }
    const c = { x: p.x + (bis.x / bl) * (r / Math.sin(theta / 2)), y: p.y + (bis.y / bl) * (r / Math.sin(theta / 2)) };
    let a1 = Math.atan2(t1.y - c.y, t1.x - c.x);
    const a2 = Math.atan2(t2.y - c.y, t2.x - c.x);
    let sweep = a2 - a1;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;
    out.push(t1);
    for (let k = 1; k < ARC_STEPS; k++) {
      const ang = a1 + (sweep * k) / ARC_STEPS;
      out.push({ x: c.x + r * Math.cos(ang), y: c.y + r * Math.sin(ang) });
    }
    out.push(t2);
    void a1;
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** The corner-style shape of a start→end run (no obstacle handling yet). */
export function cornerPath(from: Pt, to: Pt, style: CornerStyle, flip = false): Pt[] {
  const dx = to.x - from.x, dy = to.y - from.y;
  const shape = cornerShapeOf(style);
  const angle = cornerAngleOf(style);
  const straight = Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5;
  // A free-angle line is the direct run; a free-angle arc is that run's bend
  // opened all the way out, so the whole corner becomes one curve.
  if (angle === "free" && (shape === "line" || straight)) return [from, to];
  if (straight) return [from, to];

  const ax = Math.abs(dx), ay = Math.abs(dy);
  const sx = Math.sign(dx), sy = Math.sign(dy);
  let pts: Pt[];
  if (angle === "90" || angle === "free") {
    const bend = flip ? { x: from.x, y: to.y } : { x: to.x, y: from.y };
    pts = [from, bend, to];
  } else {
    // 45°: one diagonal leg + one orthogonal leg, diagonal on the shorter axis.
    const d = Math.min(ax, ay);
    const bend = flip
      ? (ax > ay ? { x: from.x + sx * d, y: to.y } : { x: to.x, y: from.y + sy * d })
      : (ax > ay ? { x: to.x - sx * d, y: from.y } : { x: from.x, y: to.y - sy * d });
    pts = [from, bend, to];
  }
  if (shape === "line") return pts;
  // Arc 45°/90° round the bend at a modest radius, leaving straight legs;
  // Arc Free Angle opens the radius as far as the legs allow, so the run
  // reads as one curve rather than two legs and a fillet.
  const reach = Math.min(ax, ay);
  const radius = angle === "free" ? reach : Math.max(4, reach / 3);
  return roundCorners(pts, radius);
}

export type TrackPlan = {
  points: Pt[];
  /** Tracks the Push mode wants to shift, and by how much. */
  pushes: { id: string; dx: number; dy: number }[];
  /** What happened, for the status line — never a silent failure. */
  note: string | null;
};

/**
 * The path a track will really take: corner style first, then the obstacle
 * policy (`ignore` · `walkaround` · `push`).
 */
export function planTrackPath(state: PcbState, from: Pt, to: Pt): TrackPlan {
  const style = state.routingCorner;
  const mode = state.routingMode ?? "ignore";
  const base = cornerPath(from, to, style);
  if (mode === "ignore") return { points: base, pushes: [], note: null };

  const layer = state.activePcbLayer;
  const need = trackClearancePx(state);
  const halfTrack = ((state.pcbDefaults?.trackWidth ?? 8) * MIL_TO_PX) / 2;
  // The net under the pointer's start (or end) is the net being routed — pass
  // it so its own copper isn't treated as an obstacle, and exempt the exact
  // anchors as well. With `net` left undefined the exemption never fired and
  // every route reported "no clear way around".
  const net = netAt(state, from, layer) ?? netAt(state, to, layer);
  const obs = blockers(state, layer, net, [from, to]);
  const hitBase = pathClear(base, obs, need, halfTrack);
  if (!hitBase) return { points: base, pushes: [], note: null };

  const pushTrack = (): TrackPlan | null => {
    if (mode !== "push" || hitBase.kind !== "track") return null;
    // Shove the blocking track sideways, but only if its new position is clear
    // of everything else — otherwise say so and fall back.
    const tdx = (hitBase.endX ?? hitBase.x) - hitBase.x;
    const tdy = (hitBase.endY ?? hitBase.y) - hitBase.y;
    const len = Math.hypot(tdx, tdy) || 1;
    const nx = -tdy / len, ny = tdx / len; // unit normal
    const step = need + halfTrack + halfWidth(hitBase) + 1;
    for (const dir of [1, -1]) {
      const moved: CanvasObject = {
        ...hitBase,
        x: hitBase.x + nx * step * dir,
        y: hitBase.y + ny * step * dir,
        endX: (hitBase.endX ?? hitBase.x) + nx * step * dir,
        endY: (hitBase.endY ?? hitBase.y) + ny * step * dir,
      };
      const others = obs.filter((o) => o.id !== hitBase.id);
      const movedClear =
        !pathClear([{ x: moved.x, y: moved.y }, { x: moved.endX ?? moved.x, y: moved.endY ?? moved.y }], others, need, halfWidth(hitBase)) &&
        !pathClear(base, [...others, moved], need, halfTrack);
      if (movedClear) {
        return {
          points: base,
          pushes: [{ id: hitBase.id, dx: nx * step * dir, dy: ny * step * dir }],
          note: "Pushed 1 track aside",
        };
      }
    }
    return null;
  };
  // Push obstacles means push: shove first, and only detour if it can't move.
  const shoved = pushTrack();
  if (shoved) return shoved;

  // Walk around: the mirrored corner, then a detour that bends clear of the
  // blocker's bounding box — the two moves a person makes by hand.
  const alt = cornerPath(from, to, cornerAngleOf(style) === "free" ? (cornerShapeOf(style) === "arc" ? "arc90" : "line90") : style, true);
  if (!pathClear(alt, obs, need, halfTrack)) {
    return { points: alt, pushes: [], note: "Routed around the obstacle" };
  }
  const bx = hitBase.x, by = hitBase.y;
  const bex = hitBase.endX ?? bx, bey = hitBase.endY ?? by;
  const pad = need + halfTrack + halfWidth(hitBase) + 2;
  for (const dir of [1, -1]) {
    for (const axis of ["y", "x"] as const) {
      const detour: Pt[] =
        axis === "y"
          ? [from, { x: from.x, y: Math.max(by, bey) + dir * pad }, { x: to.x, y: Math.max(by, bey) + dir * pad }, to]
          : [from, { x: Math.max(bx, bex) + dir * pad, y: from.y }, { x: Math.max(bx, bex) + dir * pad, y: to.y }, to];
      if (!pathClear(detour, obs, need, halfTrack)) {
        return { points: detour, pushes: [], note: "Routed around the obstacle" };
      }
    }
  }

  if (mode === "push") {
    return { points: base, pushes: [], note: "Couldn't push that copper — routed straight through" };
  }
  return { points: base, pushes: [], note: "No clear way around — routed straight through" };
}
