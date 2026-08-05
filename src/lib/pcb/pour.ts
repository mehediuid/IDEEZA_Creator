// Copper pour — the real filled geometry of a copper region.
//
// Design ▸ Copper Region / Fill Region place the outline; pouring is what makes
// it copper: the region minus every other-net copper object inflated by the
// clearance rule. Uses the app's own boolean engine (shape-boolean) so the
// result is a genuine `points` polygon the canvas, the 3D view and the DXF/SVG
// exports all read.

import { booleanRings, type Pt } from "./shape-boolean";
import { PX_PER_MM } from "./drc";
import type { CanvasObject, PcbState } from "./types";

const MM_PER_MIL = 0.0254;
const MIL_TO_PX = MM_PER_MIL * PX_PER_MM;

export const POURABLE = new Set(["polygon", "fillRegion"]);

function clearancePx(state: PcbState): number {
  const rows = state.pcbDrcConfig?.clearance;
  const mm = rows?.find((r) => r.name === "Cu/Plane Zone")?.values?.[0];
  return (typeof mm === "number" ? mm : 0.254) * PX_PER_MM;
}

function circle(cx: number, cy: number, r: number, seg = 16): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}

/** An obstacle as a polygon, already grown by the clearance. */
function obstaclePoly(o: CanvasObject, grow: number): Pt[] | null {
  const halfMil = (o.width ?? (o.kind === "pad" ? 60 : o.kind === "via" ? 24 : 8)) / 2;
  const r = halfMil * MIL_TO_PX + grow;
  if (o.kind === "track" || o.kind === "line") {
    const x1 = o.x, y1 = o.y, x2 = o.endX ?? o.x, y2 = o.endY ?? o.y;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * r, ny = (dx / len) * r;
    const ex = (dx / len) * r, ey = (dy / len) * r; // extend the ends too
    return [
      { x: x1 + nx - ex, y: y1 + ny - ey },
      { x: x2 + nx + ex, y: y2 + ny + ey },
      { x: x2 - nx + ex, y: y2 - ny + ey },
      { x: x1 - nx - ex, y: y1 - ny - ey },
    ];
  }
  if (o.kind === "pad") {
    const hw = ((o.width ?? 60) / 2) * MIL_TO_PX + grow;
    const hh = ((o.height ?? o.width ?? 60) / 2) * MIL_TO_PX + grow;
    return [
      { x: o.x - hw, y: o.y - hh }, { x: o.x + hw, y: o.y - hh },
      { x: o.x + hw, y: o.y + hh }, { x: o.x - hw, y: o.y + hh },
    ];
  }
  if (o.kind === "via" || o.kind === "sutureVias") return circle(o.x, o.y, r);
  return null;
}

/** A region's own rectangle when it has no ring: honour width/height if the
 *  user set them, else the glyph's nominal size (shapeToPolygon's fallback
 *  ignores width/height, which made a resized region pour at 28×20px). */
function regionRect(o: CanvasObject): Pt[] {
  const hw = (o.width ?? 28) / 2, hh = (o.height ?? 20) / 2;
  return [
    { x: o.x - hw, y: o.y - hh }, { x: o.x + hw, y: o.y - hh },
    { x: o.x + hw, y: o.y + hh }, { x: o.x - hw, y: o.y + hh },
  ];
}

export type PourResult = {
  /** Region id → local rings (relative to the region's new centre). */
  regions: { id: string; cx: number; cy: number; rings: Pt[][] }[];
  cleared: number;
  note: string | null;
};

/** Pour every region (or just `ids`), keeping clearance from other nets. */
export function pourCopper(state: PcbState, ids?: string[]): PourResult {
  const grow = clearancePx(state);
  const regions = state.objects.filter(
    (o) => POURABLE.has(o.kind) && (o.scope ?? "schematic") === "pcb" && (!ids || ids.includes(o.id)),
  );
  if (!regions.length) return { regions: [], cleared: 0, note: "No copper regions on the board to pour." };

  const out: PourResult["regions"] = [];
  let cleared = 0;
  for (const reg of regions) {
    // The region's own outline: its poured `points` would shrink on every pass,
    // so pour from the ORIGINAL outline kept in props.
    const saved = (reg.props as Record<string, unknown> | undefined)?.pourOutline as Pt[] | undefined;
    const outline = saved?.length
      ? saved.map((p) => ({ x: reg.x + p.x, y: reg.y + p.y }))
      : reg.points?.length
      ? reg.points[0].map((p) => ({ x: reg.x + p.x, y: reg.y + p.y }))
      : regionRect(reg);
    if (outline.length < 3) continue;

    const layer = reg.layer ?? "top";
    const obstacles = state.objects.filter((o) => {
      if (o.id === reg.id) return false;
      if ((o.scope ?? "schematic") === "schematic") return false;
      if (!["track", "pad", "via", "sutureVias", "line"].includes(o.kind)) return false;
      if (reg.net && o.net && o.net === reg.net) return false; // same net joins the pour
      const through = o.kind === "via" || o.kind === "sutureVias" || o.kind === "pad";
      if (!through && (o.layer ?? "top") !== layer) return false;
      return true;
    });

    // One difference against every obstacle at once. Doing it obstacle-by-
    // obstacle and feeding back `rings[0]` threw away each pass's hole rings
    // and any island the cut produced — the pour then covered vias it had
    // already cleared. `applyOp` handles "first minus the rest" natively, and
    // a single rasterisation is also N× cheaper than N of them.
    const obPolys: Pt[][] = [];
    let cutHere = 0;
    // Only obstacles whose bbox meets the region's can cut it — this also keeps
    // the raster grid the size of the region instead of the whole board.
    const ox = outline.map((q) => q.x), oy = outline.map((q) => q.y);
    const rminX = Math.min(...ox) - grow, rmaxX = Math.max(...ox) + grow;
    const rminY = Math.min(...oy) - grow, rmaxY = Math.max(...oy) + grow;
    for (const ob of obstacles) {
      const poly = obstaclePoly(ob, grow);
      if (!poly) continue;
      const px2 = poly.map((q) => q.x), py2 = poly.map((q) => q.y);
      if (Math.max(...px2) < rminX || Math.min(...px2) > rmaxX) continue;
      if (Math.max(...py2) < rminY || Math.min(...py2) > rmaxY) continue;
      obPolys.push(poly);
      cutHere++;
    }
    let rings: Pt[][] = [outline];
    if (obPolys.length) {
      const next = booleanRings([outline, ...obPolys], "difference");
      if (next.length) { rings = next; cleared += cutHere; }
    }
    const pts = rings.flat();
    if (!pts.length) continue;
    const cx = (Math.min(...pts.map((p) => p.x)) + Math.max(...pts.map((p) => p.x))) / 2;
    const cy = (Math.min(...pts.map((p) => p.y)) + Math.max(...pts.map((p) => p.y))) / 2;
    out.push({
      id: reg.id,
      cx,
      cy,
      rings: rings.map((r) => r.map((p) => ({ x: p.x - cx, y: p.y - cy }))),
    });
  }
  return {
    regions: out,
    cleared,
    note: out.length ? null : "Nothing left to pour — the regions are fully covered by other nets.",
  };
}
