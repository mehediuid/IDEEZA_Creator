// The board slab as real solid geometry: the board's edge (its drawn outline,
// or the `pcbBoard` rectangle) with every cutout and mounting hole cut right
// through, extruded through the thickness. One builder for the 3D tab, the GLB
// export and the STL/OBJ export, so all three cut the same holes.

import * as THREE from "three";
import type { Pcb3DScene } from "./pcb-scene";
import type { ExportModel, MeshTri } from "./exporters";

/** The board plane, centred on the origin, in whatever units the caller uses. */
export type SlabBoard = Pick<Pcb3DScene["board"], "width" | "depth" | "thickness" | "outline" | "cutouts" | "holes">;
type Hole = SlabBoard["holes"][number];

function insideRing(x: number, z: number, pts: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function distanceToRing(x: number, z: number, pts: Array<[number, number]>): number {
  let best = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, az] = pts[j], [bx, bz] = pts[i];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return best;
}
// A hole cuts only when it lies wholly on the board: one off the board or
// across its edge would tear the triangulation rather than make a notch.
function holeFits(b: SlabBoard, h: Hole): boolean {
  const o = b.outline;
  if (o?.shape === "circle") return Math.hypot(h.x - o.x, h.z - o.z) + h.r < o.r;
  if (o?.shape === "poly") return insideRing(h.x, h.z, o.pts) && distanceToRing(h.x, h.z, o.pts) > h.r;
  const rect = o?.shape === "rect" ? o : { x: 0, z: 0, w: b.width, d: b.depth };
  return Math.abs(h.x - rect.x) + h.r < rect.w / 2 && Math.abs(h.z - rect.z) + h.r < rect.d / 2;
}
// Openings that overlap tear the triangulation too, so a hole that meets a
// cutout or a hole already cut is left out — a drill placed twice is one hole.
function holeClear(h: Hole, cut: Hole[], cutouts: SlabBoard["cutouts"]): boolean {
  if (cut.some((k) => Math.hypot(h.x - k.x, h.z - k.z) <= h.r + k.r)) return false;
  return !cutouts.some((c) => {
    const nx = Math.max(c.x - c.w / 2, Math.min(c.x + c.w / 2, h.x));
    const nz = Math.max(c.z - c.d / 2, Math.min(c.z + c.d / 2, h.z));
    return Math.hypot(h.x - nx, h.z - nz) <= h.r;
  });
}

/** The slab as an extruded shape — shape plane = the board's (x, z), extruded
 *  along +Z from 0 to `thickness` — or null when the board is a plain
 *  rectangle with nothing to cut, so the caller's cheap box is exact. */
export function boardSlabGeometry(b: SlabBoard): THREE.ExtrudeGeometry | null {
  const holes: Hole[] = [];
  for (const h of b.holes ?? []) if (h.r > 0 && holeFits(b, h) && holeClear(h, holes, b.cutouts ?? [])) holes.push(h);
  if (!b.cutouts?.length && !b.outline && !holes.length) return null;
  const outline = new THREE.Shape();
  const hw = b.width / 2, hd = b.depth / 2;
  const o = b.outline;
  if (o?.shape === "circle") {
    outline.absarc(o.x, o.z, o.r, 0, Math.PI * 2, false);
  } else if (o?.shape === "poly" && o.pts.length > 2) {
    outline.moveTo(o.pts[0][0], o.pts[0][1]);
    for (const [qx, qz] of o.pts.slice(1)) outline.lineTo(qx, qz);
    outline.closePath();
  } else if (o?.shape === "rect") {
    outline.moveTo(o.x - o.w / 2, o.z - o.d / 2);
    outline.lineTo(o.x + o.w / 2, o.z - o.d / 2);
    outline.lineTo(o.x + o.w / 2, o.z + o.d / 2);
    outline.lineTo(o.x - o.w / 2, o.z + o.d / 2);
    outline.closePath();
  } else {
    outline.moveTo(-hw, -hd);
    outline.lineTo(hw, -hd);
    outline.lineTo(hw, hd);
    outline.lineTo(-hw, hd);
    outline.closePath();
  }
  for (const c of b.cutouts) {
    const hole = new THREE.Path();
    const x1 = c.x - c.w / 2, x2 = c.x + c.w / 2;
    const y1 = c.z - c.d / 2, y2 = c.z + c.d / 2;
    hole.moveTo(x1, y1);
    hole.lineTo(x1, y2);
    hole.lineTo(x2, y2);
    hole.lineTo(x2, y1);
    hole.closePath();
    outline.holes.push(hole);
  }
  for (const h of holes) {
    const hole = new THREE.Path();
    hole.absarc(h.x, h.z, h.r, 0, Math.PI * 2, true);
    outline.holes.push(hole);
  }
  return new THREE.ExtrudeGeometry(outline, { depth: b.thickness, bevelEnabled: false });
}

/** The same slab for STL / OBJ, in the file's frame: mm, origin at the board's
 *  bottom-left corner, Y up, Z from 0 to the thickness. Null → the board is
 *  the plain box `buildStl` / `buildObj` already write. */
export function exportSlabTriangles(m: ExportModel): MeshTri[] | null {
  const W = m.boardWmm, H = m.boardHmm;
  // The model is Y-down from the top-left corner; the slab plane is centred, Y-up.
  const X = (x: number) => x - W / 2;
  const Y = (y: number) => H / 2 - y;
  const o = m.outline;
  const geo = boardSlabGeometry({
    width: W,
    depth: H,
    thickness: m.thicknessMm,
    outline: !o
      ? null
      : o.shape === "poly"
      ? { shape: "poly", x: 0, z: 0, w: 0, d: 0, r: 0, pts: o.pts.map((p) => [X(p.x), Y(p.y)] as [number, number]) }
      : o.shape === "circle"
      ? { shape: "circle", x: X(o.x), z: Y(o.y), w: o.w, d: o.h, r: o.r, pts: [] }
      : { shape: "rect", x: X(o.x + o.w / 2), z: Y(o.y + o.h / 2), w: o.w, d: o.h, r: 0, pts: [] },
    cutouts: m.cutouts.filter((c) => c.w > 0 && c.h > 0).map((c) => ({ x: X(c.x + c.w / 2), z: Y(c.y + c.h / 2), w: c.w, d: c.h })),
    holes: m.holes.map((h) => ({ x: X(h.x), z: Y(h.y), r: h.d / 2 })),
  });
  if (!geo) return null;
  geo.translate(W / 2, H / 2, 0);
  const pos = geo.getAttribute("position");
  const at = (k: number): [number, number, number] => [pos.getX(k), pos.getY(k), pos.getZ(k)];
  const tris: MeshTri[] = [];
  for (let i = 0; i + 2 < pos.count; i += 3) tris.push([at(i), at(i + 1), at(i + 2)]);
  geo.dispose();
  return tris;
}
