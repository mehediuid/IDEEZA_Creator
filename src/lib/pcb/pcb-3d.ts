// Shared PCB → 3D-scene derivation. Single source of truth used by BOTH the
// PCB module's 3D tab and the Product Preview, so the two views can never
// drift: same board dimensions, same component boxes, same colors.

import type { PcbState } from "./types";

// Named board / pad colors → hex (the Properties selects store names).
export const BOARD_COLOR_HEX: Record<string, string> = {
  Green: "#1f7a47",
  Blue: "#1c4e80",
  Red: "#9b2b2b",
  Black: "#1a1a1a",
  White: "#e8e8e8",
  Yellow: "#c8a93a",
  Purple: "#5a2d82",
};
export const PAD_COLOR_HEX: Record<string, string> = {
  Gold: "#e0b24a",
  Goldsmith: "#d9a441",
  HASL: "#c7ccd1",
  ENIG: "#e8c66a",
  OSP: "#b06b3a",
};

export type Pcb3DBoard = {
  width: number;
  depth: number;
  thickness: number;
  color: string; // resolved hex
};

export type Pcb3DComponent = {
  id: string;
  kind: string;
  x: number;
  y: number;
  w?: number;
  d?: number;
  height?: number;
  color?: string;
};

// Canvas object kinds that exist physically on the board (get a 3D body).
// Wire/bus/net-label/flag kinds are schematic notation — no 3D presence.
const PHYSICAL_KINDS = new Set([
  "component",
  "resistor",
  "capacitor",
  "inductor",
  "diode",
  "ic",
  "connector",
]);

// Per-kind body heights (scene units) + fallback colors so schematic parts
// read distinctly in 3D even without explicit colors.
const KIND_HEIGHT: Record<string, number> = {
  ic: 0.18,
  component: 0.18,
  resistor: 0.12,
  inductor: 0.14,
  diode: 0.12,
  capacitor: 0.4,
  connector: 0.22,
};
const KIND_COLOR: Record<string, string> = {
  ic: "#1f2937",
  component: "#1f2937",
  resistor: "#8b5cf6",
  inductor: "#b06b3a",
  diode: "#374151",
  capacitor: "#0ea5e9",
  connector: "#f59e0b",
};

// Default board when the PCB store has no real dimensions yet — keeps the
// 3D views useful before the user has done any PCB work.
const DEFAULT_BOARD: Pcb3DBoard = {
  width: 4,
  depth: 3,
  thickness: 0.08,
  color: BOARD_COLOR_HEX.Green,
};

// Placeholder components arranged in a grid — used when the store has no
// physical placements yet so the 3D views still have something to show.
function defaultComponents(board: Pcb3DBoard): Pcb3DComponent[] {
  const out: Pcb3DComponent[] = [];
  const grid = [
    { x: 0.4, y: 0.4, w: 0.6, d: 0.5, h: 0.18, kind: "ic", color: "#1f2937", id: "demo-mcu" },
    { x: 1.2, y: 0.4, w: 0.35, d: 0.2, h: 0.12, kind: "resistor", color: "#8b5cf6", id: "demo-r1" },
    { x: 1.7, y: 0.4, w: 0.35, d: 0.2, h: 0.12, kind: "resistor", color: "#8b5cf6", id: "demo-r2" },
    { x: 0.4, y: 1.2, w: 0.3, d: 0.3, h: 0.4, kind: "capacitor", color: "#0ea5e9", id: "demo-c1" },
    { x: 1.0, y: 1.2, w: 0.3, d: 0.3, h: 0.4, kind: "capacitor", color: "#0ea5e9", id: "demo-c2" },
    { x: 2.6, y: 1.6, w: 0.7, d: 0.7, h: 0.22, kind: "ic", color: "#374151", id: "demo-flash" },
    { x: 1.6, y: 2.2, w: 0.5, d: 0.18, h: 0.12, kind: "connector", color: "#f59e0b", id: "demo-conn" },
  ];
  grid.forEach((c) => {
    if (c.x + c.w > board.width || c.y + c.d > board.depth) return;
    out.push({ ...c, height: c.h });
  });
  return out;
}

function parseThickness(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const m = raw.match(/([0-9.]+)/);
  if (!m) return null;
  const v = Number(m[1]);
  if (!isFinite(v) || v <= 0) return null;
  // PCB store stores thickness in mm-ish strings ("1.6 mm"). Scale to scene
  // units (assume 1 scene unit ≈ 25 mm so 1.6 mm ≈ 0.064). Bound to sensible
  // visible thickness so the board doesn't disappear.
  const scaled = v / 25;
  return Math.max(0.04, Math.min(0.4, scaled));
}

// Derive the 3D board + component list from the live PCB store state.
export function derivePcb3D(pcbState: PcbState): {
  board: Pcb3DBoard;
  components: Pcb3DComponent[];
} {
  const raw = pcbState.pcbBoard;
  const w = raw?.width && raw.width > 0 ? raw.width : DEFAULT_BOARD.width;
  const d = raw?.height && raw.height > 0 ? raw.height : DEFAULT_BOARD.depth;
  const thickness =
    parseThickness(pcbState.threeD?.boardThickness) ?? DEFAULT_BOARD.thickness;
  const color =
    BOARD_COLOR_HEX[pcbState.threeD?.boardColor ?? ""] ?? DEFAULT_BOARD.color;
  const board: Pcb3DBoard = { width: w, depth: d, thickness, color };

  // Any physically-placed object becomes a body on the board. Coordinates
  // assume PCB-canvas units roughly match scene units after the /100 scale
  // (mil-ish → scene). Close enough to convey "fits / doesn't fit" intent.
  const realComponents = (pcbState.objects ?? [])
    .filter((o) => PHYSICAL_KINDS.has(o.kind))
    .map<Pcb3DComponent>((o) => ({
      id: o.id,
      kind: o.kind,
      x: (o.x ?? 0) / 100,
      y: (o.y ?? 0) / 100,
      w: (o.width ?? 40) / 100,
      d: (o.height ?? o.width ?? 40) / 100,
      height: KIND_HEIGHT[o.kind] ?? 0.18,
      color: o.color ?? KIND_COLOR[o.kind] ?? "#1f2937",
    }));

  const components = realComponents.length
    ? realComponents
    : defaultComponents(board);
  return { board, components };
}
