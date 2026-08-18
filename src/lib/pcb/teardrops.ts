// IDEEZA PCB — teardrops (UIUX-88).
//
// A teardrop is the copper fillet where a track meets a pad or via: it widens
// the joint so the annular ring doesn't crack under drill or thermal stress,
// and it is what fab houses ask for on dense boards.
//
// The geometry is real, not decorative. For every track end that lands on a
// pad or via of the same net, we build the tangent hull between the pad circle
// and the track's half-width at a distance down the track — the classic
// teardrop outline — and store it as a `points` polygon, the same shape a
// poured region uses, so the canvas, the 3D scene and the exporters all read
// it without another special case.
import type { CanvasObject } from "./types";

type Pt = { x: number; y: number };

/** How far down the track the fillet runs, as a multiple of the pad radius. */
const REACH = 1.6;
/** A joint closer than this counts as touching the pad. */
const TOUCH_TOL = 4;
/** Marks the objects this module owns, so they can be found and removed. */
export const TEARDROP_PROP = "teardropFor";

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Radius of the copper a track can land on; null when it isn't one. */
function padRadius(o: CanvasObject): number | null {
  if (o.kind === "via") return Math.max(3, (o.width ?? 8) / 2);
  if (o.kind === "pad" || o.kind === "shapedPad" || o.kind === "testPoint" || o.kind === "mountingHole")
    return Math.max(3, Math.max(o.width ?? 12, o.height ?? 12) / 2);
  return null;
}

/**
 * One teardrop outline: the two tangent lines from the track's half-width back
 * onto the pad circle, closed over the pad's near arc.
 * `anchor` is the pad centre, `toward` a point down the track.
 */
function teardropRing(anchor: Pt, toward: Pt, r: number, halfWidth: number): Pt[] | null {
  const len = dist(anchor, toward);
  if (len < 1) return null;
  const ux = (toward.x - anchor.x) / len;
  const uy = (toward.y - anchor.y) / len;
  const nx = -uy;
  const ny = ux;
  // Where the fillet meets the track, and how wide it is there.
  const reach = Math.min(r * REACH, len);
  const tipX = anchor.x + ux * reach;
  const tipY = anchor.y + uy * reach;
  const w = Math.max(halfWidth, r * 0.35);

  const ring: Pt[] = [];
  // Sweep the pad's far arc so the shape includes the pad's own edge, then run
  // out to the track on both sides — a closed drop, not a bowtie.
  const base = Math.atan2(uy, ux);
  const STEPS = 10;
  for (let i = 0; i <= STEPS; i++) {
    const a = base + Math.PI / 2 + (Math.PI * i) / STEPS;   // the half away from the track
    ring.push({ x: anchor.x + Math.cos(a) * r, y: anchor.y + Math.sin(a) * r });
  }
  ring.push({ x: tipX + nx * w, y: tipY + ny * w });
  ring.push({ x: tipX - nx * w, y: tipY - ny * w });
  return ring;
}

export interface TeardropPlan {
  /** New objects to add. */
  drops: CanvasObject[];
  /** Joints that already had one, so a second run is a no-op. */
  skipped: number;
}

/**
 * Plan teardrops for the board. `ids` limits it to a selection; otherwise every
 * pad/via joint on the board is considered.
 */
export function planTeardrops(objects: readonly CanvasObject[], ids?: string[]): TeardropPlan {
  const scope = ids && ids.length ? new Set(ids) : null;
  const board = objects.filter((o) => o.scope === "pcb");
  const pads = board.filter((o) => padRadius(o) != null);
  const existing = new Set(
    board
      .filter((o) => (o.props as Record<string, unknown> | undefined)?.[TEARDROP_PROP])
      .map((o) => String((o.props as Record<string, unknown>)[TEARDROP_PROP])),
  );

  const drops: CanvasObject[] = [];
  let skipped = 0;
  let n = 0;
  for (const t of board) {
    if (t.kind !== "track" || t.endX == null || t.endY == null) continue;
    if (scope && !scope.has(t.id)) continue;
    const halfWidth = Math.max(1, (t.width ?? 4) / 2);
    const ends: Array<[Pt, Pt]> = [
      [{ x: t.x, y: t.y }, { x: t.endX, y: t.endY }],
      [{ x: t.endX, y: t.endY }, { x: t.x, y: t.y }],
    ];
    for (const [end, other] of ends) {
      for (const p of pads) {
        const r = padRadius(p);
        if (r == null) continue;
        // Same net only — a teardrop joins copper that is already joined.
        if (t.net && p.net && t.net !== p.net) continue;
        const c = { x: p.x, y: p.y };
        if (dist(end, c) > r + TOUCH_TOL) continue;
        const key = `${t.id}:${p.id}:${Math.round(end.x)},${Math.round(end.y)}`;
        if (existing.has(key)) { skipped++; continue; }
        const ring = teardropRing(c, other, r, halfWidth);
        if (!ring) continue;
        drops.push({
          id: `td_${Date.now().toString(36)}_${n++}`,
          kind: "polygon",
          x: c.x,
          y: c.y,
          scope: "pcb",
          layer: t.layer,
          net: t.net ?? p.net,
          points: [ring.map((q) => ({ x: q.x - c.x, y: q.y - c.y }))],
          props: { [TEARDROP_PROP]: key, poured: true },
        } as CanvasObject);
      }
    }
  }
  return { drops, skipped };
}

/** The teardrops already on the board. */
export function teardropIds(objects: readonly CanvasObject[]): string[] {
  return objects
    .filter((o) => (o.props as Record<string, unknown> | undefined)?.[TEARDROP_PROP])
    .map((o) => o.id);
}
