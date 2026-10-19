// The PCB as one assembly part (F1, D7): the board slab and every part on it,
// in true millimetres, moving as one rigid unit. Read from the product's live
// PCB document, so a change in PCB Design is here the next time Assembly
// draws (D9). Replaces Preview's old derivePcb3D, which read the schematic's
// symbols at canvas-pixel scale.
//
// Frame: the board's top-left canvas corner (60, 60) is the origin; canvas x
// is +x, canvas y is +z (the board seen from above, y up), 10 canvas px = 1 mm
// (D8, the rule DRC and the exporters use). The board's bottom face is y = 0.
//
// Pure. Relative imports only (node:test).

import { PAD_OFFSETS } from "../pcb/schematic-to-pcb";
import { BOARD_COLOR_HEX, PAD_COLOR_HEX, componentBodyColor } from "../pcb/pcb-3d";
import type { CanvasObject } from "../pcb/types";
import { axisAngle, Q0, type Vec3 } from "./math";
import type { AsmPart, Feature, Pin, Port, SlabRender, Solid } from "./types";

export const PX_PER_MM = 10;
const BOARD_X0 = 60;
const BOARD_Y0 = 60;
const DEFAULT_THICKNESS_MM = 1.6;
const DEFAULT_HOLE_MM = 3.2; // an M3 clearance hole

/** What this reads of the PCB document (PcbDoc's own fields). */
export type PcbDocLike = {
  objects?: CanvasObject[];
  pcbBoard?: { width: number; height: number };
  threeD?: { layers?: Array<{ thickness: string }>; boardColor?: string; padColor?: string };
};

/** The schematic's netlist (lib/pcb/nets.ts buildNetlist), the pins' nets. */
export type NetlistLike = ReadonlyArray<{ name: string; pins: ReadonlyArray<{ ref: string; pin: number }> }>;

/** A footprint's body, sized to the land pattern the board draws (the 2D
 *  glyph, so a body never overhangs its own pads) and a real part's height. */
type BodySpec = { w: number; d: number; h: number };
const BODY: Record<string, BodySpec> = {
  fp0805: { w: 1.5, d: 0.9, h: 0.6 },
  fpSOD123: { w: 1.7, d: 0.8, h: 1.1 },
  fpSOT23: { w: 1.5, d: 1.5, h: 1.0 },
  fpSOIC8: { w: 2.2, d: 2.6, h: 1.5 },
};
const CHIP_HEIGHT: Record<string, number> = { R: 0.55, C: 0.9, L: 1.0 };
/** A part with no 3D shape of its own yet comes in as this box (F4). */
const PLACEHOLDER: BodySpec = { w: 3, d: 3, h: 1.5 };

const isPcb = (o: CanvasObject) => (o.scope ?? "schematic") === "pcb";
const mm = (px: number) => px / PX_PER_MM;
const localX = (px: number) => mm(px - BOARD_X0);
const localZ = (py: number) => mm(py - BOARD_Y0);
const pxKey = (x: number, y: number) => `${Math.round(x * 2)},${Math.round(y * 2)}`;

function thicknessOf(doc: PcbDocLike): number {
  const stack = (doc.threeD?.layers ?? []).reduce((a, l) => a + (parseFloat(l.thickness) || 0), 0);
  return stack > 0.2 ? Math.round(stack * 1000) / 1000 : DEFAULT_THICKNESS_MM;
}

/** A canvas rotation (degrees, clockwise on screen with y down) about the board's up axis. */
const yaw = (deg: number) => (deg ? axisAngle([0, 1, 0], (-deg * Math.PI) / 180) : Q0);

function rotatePx(off: { x: number; y: number }, deg: number): { x: number; y: number } {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  return { x: off.x * c - off.y * s, y: off.x * s + off.y * c };
}

/** Each pad's net: a ratsnest or track end on the pad says it exactly; else the
 *  schematic netlist's pin (pad k is pin k + 1 of the same designator). */
function padNetResolver(objects: CanvasObject[], netlist: NetlistLike | undefined) {
  const atPoint = new Map<string, string>();
  for (const o of objects) {
    if (!isPcb(o) || !o.net) continue;
    if (o.kind === "ratsnest" || o.kind === "track") {
      atPoint.set(pxKey(o.x, o.y), o.net);
      if (o.endX !== undefined && o.endY !== undefined) atPoint.set(pxKey(o.endX, o.endY), o.net);
    }
  }
  const byPin = new Map<string, string>();
  for (const n of netlist ?? []) for (const p of n.pins) byPin.set(`${p.ref}.${p.pin}`, n.name);
  return (ref: string, pinNo: number, x: number, y: number): string | undefined =>
    atPoint.get(pxKey(x, y)) ?? byPin.get(`${ref}.${pinNo}`);
}

type Outline = { kind: "rect"; x0: number; z0: number; w: number; d: number } | { kind: "circle"; x: number; z: number; r: number } | { kind: "poly"; pts: Array<[number, number]> };

function outlineOf(objects: CanvasObject[], W: number, D: number): Outline {
  const o = objects.find((x) => isPcb(x) && x.kind === "boardOutline" && (x.props as Record<string, unknown> | undefined)?.shape);
  if (o) {
    const shape = String((o.props as Record<string, unknown>).shape);
    if (shape === "polygon") {
      const ring = o.points?.[0] ?? [];
      if (ring.length >= 3) return { kind: "poly", pts: ring.map((p) => [localX(o.x + p.x), localZ(o.y + p.y)]) };
    } else {
      const w = o.width ?? 0, h = o.height ?? 0;
      if (w >= 1 && h >= 1) {
        if (shape === "circle") return { kind: "circle", x: localX(o.x), z: localZ(o.y), r: mm(w / 2) };
        return { kind: "rect", x0: localX(o.x), z0: localZ(o.y), w: mm(w), d: mm(h) };
      }
    }
  }
  return { kind: "rect", x0: 0, z0: 0, w: W, d: D };
}

function outlinePoints(o: Outline): Array<[number, number]> {
  if (o.kind === "poly") return o.pts;
  if (o.kind === "circle") {
    return Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      return [o.x + Math.cos(a) * o.r, o.z + Math.sin(a) * o.r] as [number, number];
    });
  }
  return [[o.x0, o.z0], [o.x0 + o.w, o.z0], [o.x0 + o.w, o.z0 + o.d], [o.x0, o.z0 + o.d]];
}

function boundsOf(pts: Array<[number, number]>) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of pts) {
    x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z);
  }
  return { x0, z0, x1, z1 };
}

const designatorLetter = (text: string | undefined) => (text ?? "").trim().replace(/[^A-Za-z]/g, "").toUpperCase();

/** The PCB, as one part. `netlist` (optional) fills the nets of pads no
 *  ratsnest or track reaches — power nets, mostly. */
export function pcbPart(doc: PcbDocLike, netlist?: NetlistLike): AsmPart {
  const objects = (doc.objects ?? []).filter(isPcb);
  const W = mm(doc.pcbBoard?.width && doc.pcbBoard.width > 0 ? doc.pcbBoard.width : 720);
  const D = mm(doc.pcbBoard?.height && doc.pcbBoard.height > 0 ? doc.pcbBoard.height : 480);
  const t = thicknessOf(doc);
  const outline = outlineOf(objects, W, D);
  const ring = outlinePoints(outline);
  const b = boundsOf(ring);
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const boardColor = BOARD_COLOR_HEX[doc.threeD?.boardColor ?? ""] ?? BOARD_COLOR_HEX.Green;
  const padColor = PAD_COLOR_HEX[doc.threeD?.padColor ?? ""] ?? PAD_COLOR_HEX.Gold;

  const holes: SlabRender["holes"] = [];
  const features: Feature[] = [
    { id: "face:top", kind: "face", label: "Board top", point: [cx, t, cz], dir: [0, 1, 0], size: [b.x1 - b.x0, b.z1 - b.z0] },
    { id: "face:bottom", kind: "face", label: "Board bottom", point: [cx, 0, cz], dir: [0, -1, 0], size: [b.x1 - b.x0, b.z1 - b.z0] },
    { id: "face:+x", kind: "face", label: "Board edge (right)", point: [b.x1, t / 2, cz], dir: [1, 0, 0], size: [b.z1 - b.z0, t] },
    { id: "face:-x", kind: "face", label: "Board edge (left)", point: [b.x0, t / 2, cz], dir: [-1, 0, 0], size: [b.z1 - b.z0, t] },
    { id: "face:+z", kind: "face", label: "Board edge (front)", point: [cx, t / 2, b.z1], dir: [0, 0, 1], size: [b.x1 - b.x0, t] },
    { id: "face:-z", kind: "face", label: "Board edge (back)", point: [cx, t / 2, b.z0], dir: [0, 0, -1], size: [b.x1 - b.x0, t] },
  ];

  let holeNo = 0;
  for (const o of objects) {
    if (o.kind === "mountingHole") {
      const d = o.drill && o.drill > 0 ? mm(o.drill) : o.width && o.width > 0 ? mm(o.width) : DEFAULT_HOLE_MM;
      const x = localX(o.x), z = localZ(o.y);
      holes.push({ x, z, r: d / 2 });
      holeNo++;
      features.push({ id: `hole:${o.id}`, kind: "axis", label: `Mounting hole ${o.text?.trim() || holeNo}`, point: [x, 0, z], dir: [0, 1, 0], radius: d / 2, seat: "face:bottom" });
    } else if (o.kind === "cutout") {
      const w = o.width ?? 0, h = o.height ?? 0;
      if (w > 0 && h > 0) holes.push({ x: localX(o.x + w / 2), z: localZ(o.y + h / 2), w: mm(w), d: mm(h) });
    }
  }

  const boardShape: Solid["shape"] =
    outline.kind === "circle"
      ? { kind: "cyl", center: [outline.x, t / 2, outline.z], r: outline.r, h: t }
      : outline.kind === "poly"
        ? { kind: "hull", points: ring.flatMap(([x, z]) => [[x, 0, z], [x, t, z]] as Vec3[]) }
        : { kind: "box", center: [cx, t / 2, cz], size: [b.x1 - b.x0, t, b.z1 - b.z0] };
  const solids: Solid[] = [
    { id: "board", name: "PCB", shape: boardShape, color: boardColor, slab: { outline: ring, holes, y0: 0, thickness: t } },
  ];

  const pins: Pin[] = [];
  const ports: Port[] = [];
  const boxOnly: string[] = [];
  const netOf = padNetResolver(objects, netlist);

  for (const o of objects) {
    const desig = (o.text ?? "").trim();
    const isFootprint = !!BODY[o.kind] || (o.kind === "component" && !!o.footprint);
    if (isFootprint && desig) {
      const spec = BODY[o.kind] ?? PLACEHOLDER;
      if (!BODY[o.kind]) boxOnly.push(desig);
      const letter = designatorLetter(desig);
      const h = o.kind === "fp0805" ? (CHIP_HEIGHT[letter.charAt(0)] ?? spec.h) : spec.h;
      const bottom = o.side === "bottom";
      const x = localX(o.x), z = localZ(o.y);
      const y = bottom ? -h / 2 : t + h / 2;
      solids.push({
        id: `part:${o.id}`,
        name: desig,
        shape: { kind: "box", center: [x, y, z], size: [spec.w, h, spec.d], q: yaw(o.rotation ?? 0) },
        color: componentBodyColor(desig),
      });
      const offs = PAD_OFFSETS[o.kind] ?? [];
      offs.forEach((off, k) => {
        const r = rotatePx(off, o.rotation ?? 0);
        const net = netOf(desig, k + 1, o.x + r.x, o.y + r.y);
        pins.push({
          id: `pad:${o.id}:${k}`,
          label: `${desig}.${k + 1}`,
          point: [localX(o.x + r.x), bottom ? 0 : t, localZ(o.y + r.y)],
          dir: [0, bottom ? -1 : 1, 0],
          ...(net ? { net } : {}),
        });
        solids.push({
          id: `pad:${o.id}:${k}`,
          name: `${desig}.${k + 1}`,
          shape: { kind: "box", center: [localX(o.x + r.x), bottom ? -0.02 : t + 0.02, localZ(o.y + r.y)], size: [0.7, 0.04, 0.9], q: yaw(o.rotation ?? 0) },
          color: padColor,
          collide: false,
        });
      });
      if (letter.startsWith("J") || letter.startsWith("CN") || letter.startsWith("USB") || letter === "P") {
        // A connector faces the nearest board edge: that is the way a plug comes in.
        const edges: Array<[number, Vec3, Vec3]> = [
          [x - b.x0, [-1, 0, 0], [x - spec.w / 2, t + h / 2, z]],
          [b.x1 - x, [1, 0, 0], [x + spec.w / 2, t + h / 2, z]],
          [z - b.z0, [0, 0, -1], [x, t + h / 2, z - spec.d / 2]],
          [b.z1 - z, [0, 0, 1], [x, t + h / 2, z + spec.d / 2]],
        ];
        edges.sort((p, q) => p[0] - q[0]);
        const [, dir, center] = edges[0];
        ports.push({ id: `port:${o.id}`, label: desig, center, dir, size: [dir[0] !== 0 ? spec.d : spec.w, h] });
      }
    } else if ((o.kind === "pad" || o.kind === "testPoint") && isPcb(o)) {
      pins.push({
        id: `pad:${o.id}`,
        label: desig || (o.kind === "testPoint" ? "Test point" : "Pad"),
        point: [localX(o.x), t, localZ(o.y)],
        dir: [0, 1, 0],
        ...(o.net ? { net: o.net } : {}),
      });
    }
  }

  return {
    id: "pcb",
    source: "pcb",
    ref: "board",
    name: "PCB · Main board",
    origin: "From PCB Design · live",
    solids,
    features,
    pins,
    defaultPose: { p: [0, 0, 0], q: Q0 },
    ...(ports.length ? { ports } : {}),
    ...(boxOnly.length ? { boxOnly } : {}),
    ...(outline.kind === "poly" ? { approximate: true } : {}),
  };
}

/** The board's own numbers for the Bring-in card: "84 × 50 mm · 12 parts". */
export function pcbFacts(doc: PcbDocLike): { w: number; d: number; parts: number } {
  const part = pcbPart(doc);
  const board = part.solids[0].slab!;
  const b = boundsOf(board.outline);
  const parts = part.solids.filter((s) => s.id.startsWith("part:")).length;
  return { w: Math.round((b.x1 - b.x0) * 10) / 10, d: Math.round((b.z1 - b.z0) * 10) / 10, parts };
}
