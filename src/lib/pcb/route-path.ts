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

/** Corner styles the Route menu offers. */
export type CornerStyle = "any" | "45" | "90";

/** The corner-style shape of a start→end run (no obstacle handling yet). */
export function cornerPath(from: Pt, to: Pt, style: CornerStyle, flip = false): Pt[] {
  const dx = to.x - from.x, dy = to.y - from.y;
  if (style === "any" || Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5) return [from, to];
  if (style === "90") {
    const bend = flip ? { x: from.x, y: to.y } : { x: to.x, y: from.y };
    return [from, bend, to];
  }
  // 45°: one diagonal leg + one orthogonal leg, diagonal on the shorter axis.
  const ax = Math.abs(dx), ay = Math.abs(dy);
  const sx = Math.sign(dx), sy = Math.sign(dy);
  const d = Math.min(ax, ay);
  const bend = flip
    ? (ax > ay ? { x: from.x + sx * d, y: to.y } : { x: to.x, y: from.y + sy * d })
    : (ax > ay ? { x: to.x - sx * d, y: from.y } : { x: from.x, y: to.y - sy * d });
  return [from, bend, to];
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
  const style: CornerStyle =
    state.routingCorner === "90" ? "90" : state.routingCorner === "45" ? "45" : "any";
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
  const alt = cornerPath(from, to, style === "any" ? "90" : style, true);
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
