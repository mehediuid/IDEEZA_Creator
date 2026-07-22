// PCB → 3D SCENE derivation for the PCB module's 3D tab. Unlike derivePcb3D
// (a coarse board+boxes view shared with the Product Preview), this builds a
// faithful engineering 3D of the 2D PCB layout: the real board slab plus every
// physical object placed on the canvas — copper tracks, vias, footprint pads,
// component bodies and copper regions — all mapped from canvas pixels into a
// single, centered, normalized scene space so the 3D view is a true mirror of
// the 2D editor.
//
// Coordinate model (must track pcb-canvas.tsx): the board is drawn at canvas
// (60, 60) sized pcbBoard.width × pcbBoard.height (px). Every PCB object stores
// absolute canvas-px coords in that same space. We center the board on the
// origin and normalize so its longest side maps to TARGET scene units, then the
// camera framing is board-size-independent.

import type { CanvasObject, PcbState } from "./types";
import { BOARD_COLOR_HEX, PAD_COLOR_HEX } from "./pcb-3d";
import { PAD_OFFSETS } from "./schematic-to-pcb";

// Board canvas origin — matches pcb-canvas.tsx (top:60, left:60).
const BOARD_X0 = 60;
const BOARD_Y0 = 60;
// Longest board side → this many scene units (camera is tuned to it).
const TARGET = 8;

// Copper / material palette (EasyEDA-faithful: gold copper, dark component
// bodies). Board slab colour comes from the Properties (Board Color).
const COPPER_TOP = "#c9902f";
const COPPER_BOTTOM = "#a8722a";
const PAD_GOLD = "#e0b24a";
const VIA_COPPER = "#c9902f";
const VIA_HOLE = "#141414";

// Per-footprint 3D spec — body footprint (canvas px, scales with the board),
// physical body HEIGHT (scene units, a real chip is a fixed height) and pad
// size (canvas px). Pad CENTRES come from PAD_OFFSETS so 3D pads can never
// drift from the 2D land pattern / the converter's airwire attach points.
type FpSpec = { bodyW: number; bodyD: number; h: number; padW: number; padD: number };
const FP_3D: Record<string, FpSpec> = {
  fp0805: { bodyW: 15, bodyD: 9, h: 0.2, padW: 8, padD: 11 },
  fpSOD123: { bodyW: 17, bodyD: 8, h: 0.18, padW: 8, padD: 10 },
  fpSOT23: { bodyW: 15, bodyD: 15, h: 0.26, padW: 7, padD: 8 },
  fpSOIC8: { bodyW: 22, bodyD: 26, h: 0.42, padW: 7, padD: 9 },
};

// Component body colour by designator prefix — reads like the real part.
function bodyColor(desig: string | undefined): string {
  const c = (desig ?? "").trim().charAt(0).toUpperCase();
  if (c === "R") return "#23262d"; // black chip resistor
  if (c === "C") return "#c9a15a"; // tan MLCC
  if (c === "L") return "#33373f"; // inductor
  if (c === "D") return "#101216"; // glass/black diode
  return "#181b21"; // IC / default black body
}

// Parse a "1.6mm" style string → millimetres (number), 0 on failure.
function parseMm(raw: string | undefined | null): number {
  const m = (raw ?? "").match(/(-?[0-9.]+)/);
  const v = m ? Number(m[1]) : NaN;
  return isFinite(v) ? v : 0;
}
// millimetres → scene units (the board slab / stack scale).
const MM_TO_SCENE = 1 / 25;

// Board Material → slab surface finish (roughness / metalness). Metallic
// substrates (aluminium) read shiny; FR-4 / Rogers / flex read matte.
const MATERIAL_LOOK: Record<string, { roughness: number; metalness: number }> = {
  "FR-4": { roughness: 0.62, metalness: 0.08 },
  "FR-2": { roughness: 0.72, metalness: 0.05 },
  Aluminum: { roughness: 0.3, metalness: 0.85 },
  Rogers: { roughness: 0.5, metalness: 0.12 },
  Flex: { roughness: 0.58, metalness: 0.1 },
};

export type Pcb3DTrack = { id: string; x1: number; z1: number; x2: number; z2: number; width: number; top: boolean; color: string };
export type Pcb3DVia = { id: string; x: number; z: number; outer: number; hole: number };
export type Pcb3DPad = { id: string; x: number; z: number; w: number; d: number; rot: number };
export type Pcb3DBody = { id: string; x: number; z: number; w: number; d: number; h: number; rot: number; color: string; label: string };
export type Pcb3DRegion = { id: string; pts: Array<[number, number]>; top: boolean; color: string };
export type Pcb3DSilk = { id: string; x: number; z: number; w: number; d: number; rot: number };

export type Pcb3DScene = {
  board: {
    width: number;
    depth: number;
    thickness: number;
    color: string;
    material: string;
    roughness: number;
    metalness: number;
    yOffset: number; // PCB Height from Bottom
  };
  tracks: Pcb3DTrack[];
  vias: Pcb3DVia[];
  pads: Pcb3DPad[];
  bodies: Pcb3DBody[];
  regions: Pcb3DRegion[];
  silk: Pcb3DSilk[];
  padColor: string; // Pad Plating Color
  silkColor: string; // Silkscreen Technology → finish colour
  silkGlossy: boolean; // UV printing → glossier silk
  expose: number; // Layer Expose (mm → scene) — copper proudness above the mask
  scale: number; // px per scene unit
};

const TRACK_KINDS = new Set(["track"]);
const REGION_KINDS = new Set(["copper", "polygon", "fillRegion"]);

export function derivePcbScene(state: PcbState): Pcb3DScene {
  const raw = state.pcbBoard;
  const W = raw?.width && raw.width > 0 ? raw.width : 720;
  const H = raw?.height && raw.height > 0 ? raw.height : 480;
  const scale = Math.max(W, H) / TARGET; // px per scene unit
  const cx = BOARD_X0 + W / 2;
  const cy = BOARD_Y0 + H / 2;

  // canvas px → scene: position (centred on origin) and size.
  const px = (x: number) => (x - cx) / scale;
  const pz = (y: number) => (y - cy) / scale;
  const sz = (v: number) => v / scale;

  const t3 = state.threeD;
  // Board thickness = the live layer-stack sum (matches the read-only
  // "Board Thickness" the Properties shows), so editing any layer thickness
  // re-slabs the board. mm → scene, bounded so it stays a visible thin slab.
  const stackMm = (t3?.layers ?? []).reduce((a, l) => a + (parseFloat(l.thickness) || 0), 0);
  const thickness = Math.max(0.04, Math.min(0.5, (stackMm || 1.2) * MM_TO_SCENE));
  const color = BOARD_COLOR_HEX[t3?.boardColor ?? ""] ?? BOARD_COLOR_HEX.Green;
  const material = t3?.material ?? "FR-4";
  const look = MATERIAL_LOOK[material] ?? MATERIAL_LOOK["FR-4"];
  const yOffset = parseMm(t3?.pcbHeightFromTop) * MM_TO_SCENE;
  const board = {
    width: W / scale,
    depth: H / scale,
    thickness,
    color,
    material,
    roughness: look.roughness,
    metalness: look.metalness,
    yOffset,
  };

  const padColor = PAD_COLOR_HEX[t3?.padColor ?? ""] ?? PAD_GOLD;
  const silkGlossy = (t3?.silkTech ?? "").toLowerCase().includes("uv");
  const silkColor = silkGlossy ? "#ffffff" : "#e6e6e6";
  const expose = Math.max(0, parseMm(t3?.layerExpose) * MM_TO_SCENE);

  // Layer visibility (from the Layer tab / pcbLayers) drives what the 3D view
  // shows, so hiding a layer hides its copper / silk in 3D too.
  const vis = (id: string) => state.pcbLayers?.find((l) => l.id === id)?.visible !== false;
  const topVis = vis("top");
  const bottomVis = vis("bottom");
  const silkVis = vis("topSilk");

  const objs: CanvasObject[] = (state.objects ?? []).filter(
    (o) => (o.scope ?? "schematic") === "pcb",
  );

  const tracks: Pcb3DTrack[] = [];
  const vias: Pcb3DVia[] = [];
  const pads: Pcb3DPad[] = [];
  const bodies: Pcb3DBody[] = [];
  const regions: Pcb3DRegion[] = [];
  const silk: Pcb3DSilk[] = [];

  for (const o of objs) {
    // ── copper tracks ────────────────────────────────────────────────────
    if (TRACK_KINDS.has(o.kind)) {
      const top = (o.layer ?? "top") !== "bottom";
      if ((top && !topVis) || (!top && !bottomVis)) continue;
      tracks.push({
        id: o.id,
        x1: px(o.x ?? 0),
        z1: pz(o.y ?? 0),
        x2: px(o.endX ?? o.x ?? 0),
        z2: pz(o.endY ?? o.y ?? 0),
        width: Math.max(0.05, sz(o.width ?? 8)),
        top,
        color: top ? COPPER_TOP : COPPER_BOTTOM,
      });
      continue;
    }
    // ── vias ─────────────────────────────────────────────────────────────
    if (o.kind === "via") {
      const outer = Math.max(0.08, sz(o.width ?? 24));
      const hole = Math.max(0.03, Math.min(outer * 0.7, sz(o.drill ?? 12)));
      vias.push({ id: o.id, x: px(o.x ?? 0), z: pz(o.y ?? 0), outer, hole });
      continue;
    }
    // ── copper regions / pours ──────────────────────────────────────────
    if (REGION_KINDS.has(o.kind)) {
      const ring = o.points?.[0]; // outer ring
      if (ring && ring.length >= 3) {
        const top = (o.layer ?? "top") !== "bottom";
        if ((top && !topVis) || (!top && !bottomVis)) continue;
        regions.push({
          id: o.id,
          pts: ring.map((p) => [px(p.x), pz(p.y)] as [number, number]),
          top,
          color: top ? COPPER_TOP : COPPER_BOTTOM,
        });
      }
      continue;
    }
    // ── footprints → component body + copper pads + silkscreen outline ────
    const spec = FP_3D[o.kind];
    if (spec) {
      const rot = ((o.rotation ?? 0) * Math.PI) / 180;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      bodies.push({
        id: o.id,
        x: px(o.x ?? 0),
        z: pz(o.y ?? 0),
        w: sz(spec.bodyW),
        d: sz(spec.bodyD),
        h: spec.h,
        rot,
        color: bodyColor(o.text),
        label: (o.text ?? "").trim(),
      });
      // Silkscreen outline — a white plate slightly larger than the body, so a
      // thin printed border shows around each part (top-silk layer gated).
      if (silkVis) {
        silk.push({
          id: `${o.id}-silk`,
          x: px(o.x ?? 0),
          z: pz(o.y ?? 0),
          w: sz(spec.bodyW + 6),
          d: sz(spec.bodyD + 6),
          rot,
        });
      }
      if (topVis) {
        const offs = PAD_OFFSETS[o.kind] ?? [];
        offs.forEach((off, k) => {
          // rotate the pad offset (canvas px) about the footprint centre.
          const rx = off.x * cos - off.y * sin;
          const ry = off.x * sin + off.y * cos;
          pads.push({
            id: `${o.id}-pad${k}`,
            x: px((o.x ?? 0) + rx),
            z: pz((o.y ?? 0) + ry),
            w: sz(spec.padW),
            d: sz(spec.padD),
            rot,
          });
        });
      }
    }
  }

  return { board, tracks, vias, pads, bodies, regions, silk, padColor, silkColor, silkGlossy, expose, scale };
}

export { PAD_GOLD, VIA_COPPER, VIA_HOLE };
