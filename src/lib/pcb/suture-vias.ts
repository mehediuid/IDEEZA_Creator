// Suture / stitching vias — the real lattice generator behind Insert ▸ Suture Vias.
//
// One source of truth: the dialog calls `planSutureVias` to show how many vias
// it will drop, and the store action calls the SAME function to place them, so
// the preview can never disagree with the result.

import { shapeToPolygon, type Pt } from "./shape-boolean";
import { PX_PER_MM } from "./drc";
import type { CanvasObject, PcbState } from "./types";

/** Region kinds a stitching lattice can be poured into. */
const REGION_KINDS = new Set(["polygon", "fillRegion", "combineShape", "constraintRegion"]);

export type SutureConfig = {
  target: "region" | "board" | "drawn";
  net: string;
  /** All four lengths are **mil** — the unit the dialog labels and the unit the
   *  placed via stores. The planner converts to canvas px for its geometry;
   *  measuring these as px made the reserved space 4× the real via. */
  pitch: number;
  size: number;
  drill: number;
  clearance: number;
  pattern: "grid" | "staggered";
};

const MM_PER_MIL = 0.0254;
const MIL_TO_PX = MM_PER_MIL * PX_PER_MM;

export const defaultSutureConfig = (): SutureConfig => ({
  target: "region",
  net: "GND",
  pitch: 200,     // 5.08 mm — a realistic stitch pitch
  size: 24,
  drill: 12,
  clearance: 20,
  pattern: "staggered",
});

/** Region objects in the current selection that can be stitched. */
export function sutureRegions(state: PcbState): CanvasObject[] {
  return state.objects.filter(
    (o) => state.selectedIds.includes(o.id) && (REGION_KINDS.has(o.kind) || (o.points?.length ?? 0) > 0),
  );
}

function pointInRing(p: Pt, ring: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Shortest distance from a point to a ring's edges. */
function distToRing(p: Pt, ring: Pt[]): number {
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    const dx = b.x - a.x, dy = b.y - a.y;
    const L2 = dx * dx + dy * dy;
    const t = L2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2));
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}

export type SuturePlan = {
  points: Pt[];
  /** The region the lattice belongs to (for grouping + removal), or "board". */
  groupId: string;
  /** Why the plan is empty, when it is — the dialog shows this instead of "0". */
  reason: string | null;
};

/** Where the vias would go, given the live board and this config. */
export function planSutureVias(state: PcbState, cfg: SutureConfig): SuturePlan {
  // mil → px for every geometric decision below.
  const pitch = Math.max(4, cfg.pitch * MIL_TO_PX);
  const clear = (Math.max(0, cfg.clearance) + Math.max(0, cfg.size) / 2) * MIL_TO_PX;

  let ring: Pt[];
  let groupId: string;
  if (cfg.target === "drawn") {
    // UIUX-95 — the shape drawn from Insert ▸ Suture Vias ▸ Rectangle/Polygon/Line.
    const drawn = state.sutureShape;
    if (!drawn || drawn.points.length < 2) {
      return { points: [], groupId: "", reason: "Draw a rectangle, polygon or path first." };
    }
    if (drawn.shape === "line") {
      // A via fence: vias walked along the path at the stitch pitch, not a
      // lattice poured into an area.
      const pts: Pt[] = [];
      let carry = 0;
      for (let i = 0; i + 1 < drawn.points.length; i++) {
        const a = drawn.points[i], b = drawn.points[i + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (len < 1e-6) continue;
        const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
        for (let d = carry; d <= len; d += pitch) {
          pts.push({ x: a.x + ux * d, y: a.y + uy * d });
          if (pts.length > 4000) break;
        }
        const walked = Math.ceil((len - carry) / pitch) * pitch + carry;
        carry = Math.max(0, walked - len);
      }
      const last = drawn.points[drawn.points.length - 1];
      if (pts.length && Math.hypot(pts[pts.length - 1].x - last.x, pts[pts.length - 1].y - last.y) > pitch / 2) pts.push(last);
      return {
        points: pts,
        groupId: "drawn",
        reason: pts.length ? null : "That path is shorter than one stitch — draw further or reduce the spacing.",
      };
    }
    ring = drawn.points;
    groupId = "drawn";
  } else if (cfg.target === "region") {
    const regions = sutureRegions(state);
    if (!regions.length) {
      return { points: [], groupId: "", reason: "Select a copper region, fill or combined shape to stitch." };
    }
    ring = shapeToPolygon(regions[0]);
    groupId = regions[0].id;
  } else {
    // Whole board: the slab rectangle in canvas coords (pcb-canvas draws the
    // board at 60,60 — the same origin the exporters use).
    const w = state.pcbBoard?.width && state.pcbBoard.width > 0 ? state.pcbBoard.width : 720;
    const h = state.pcbBoard?.height && state.pcbBoard.height > 0 ? state.pcbBoard.height : 480;
    ring = [
      { x: 60, y: 60 },
      { x: 60 + w, y: 60 },
      { x: 60 + w, y: 60 + h },
      { x: 60, y: 60 + h },
    ];
    groupId = "board";
  }
  if (ring.length < 3) return { points: [], groupId, reason: "That shape has no area to stitch." };

  const xs = ring.map((p) => p.x), ys = ring.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  const points: Pt[] = [];
  let row = 0;
  for (let y = minY + pitch / 2; y <= maxY; y += pitch, row++) {
    const offset = cfg.pattern === "staggered" && row % 2 ? pitch / 2 : 0;
    for (let x = minX + pitch / 2 + offset; x <= maxX; x += pitch) {
      const p = { x, y };
      if (!pointInRing(p, ring)) continue;
      if (distToRing(p, ring) < clear) continue;
      points.push(p);
      if (points.length > 4000) break; // sanity guard for a silly pitch
    }
  }
  const reason = points.length
    ? null
    : cfg.target === "board"
    ? "No room on the board — try a smaller pitch or edge clearance."
    : cfg.target === "drawn"
    ? "No room inside that shape — try a smaller pitch, via size or edge clearance."
    : "No room inside that region — try a smaller pitch, via size or edge clearance.";
  return { points, groupId, reason };
}
