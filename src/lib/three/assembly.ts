// The build's 3D model as an assembly of its own parts — docs/superpowers/
// specs/2026-09-25-3d-model-review-design.md. The image-to-3D pipeline makes
// one mesh, which can't be exploded, filtered or inspected; the parts, their
// bodies and the board are data the build already has, so the model is
// composed from them. Nothing here is guessed: a row with no source (a
// component's material, its mass) is left off, never filled in.

import type { ConceptPart, ConceptPartCategory } from "../create/concept";
import { batteryOf, isBatteryPart } from "../spec/batteries";
import { bodyOf, qtyOf } from "../spec/bodies";
import { deriveSpec } from "../spec/derive";
import type { ResolvedSpec } from "../spec/types";

export type SystemId =
  | "enclosure"
  | "board"
  | "compute"
  | "sensing"
  | "motion"
  | "power"
  | "interface"
  | "passives";
export type PartShape =
  | "chip"
  | "ic"
  | "can"
  | "diode"
  | "connector"
  | "box"
  | "board"
  | "shell-base"
  | "shell-lid"
  | "mesh";
export type Vec3 = [number, number, number];

export type AssemblyPart = {
  id: string;
  name: string;
  ref: string;
  system: SystemId;
  instance: { n: number; of: number };
  description: string;
  material?: string;
  massG?: number;
  body: { l: number; w: number; h: number };
  shape: PartShape;
  /** Millimetres, y up, the enclosure centred on the origin at rest. */
  at: Vec3;
  explodeDir: Vec3;
  inventoryAt: Vec3;
  source: "spec" | "estimate" | "concept-mesh";
  meshUrl?: string;
};
export type AssemblySystem = { id: SystemId; label: string; count: number };
export type Assembly = {
  title: string;
  parts: AssemblyPart[];
  systems: AssemblySystem[];
  size: { l: number; w: number; h: number };
};

export const SYSTEM_ORDER: SystemId[] = [
  "enclosure",
  "board",
  "compute",
  "sensing",
  "motion",
  "power",
  "interface",
  "passives",
];
export const SYSTEM_LABEL: Record<SystemId, string> = {
  enclosure: "Enclosure",
  board: "Board",
  compute: "Compute & radio",
  sensing: "Sensing",
  motion: "Motion",
  power: "Power",
  interface: "Interface",
  passives: "Passives",
};
const SYSTEM_OF: Record<ConceptPartCategory, SystemId> = {
  Microcontroller: "compute",
  Connectivity: "compute",
  Sensor: "sensing",
  Actuator: "motion",
  "Power Management": "power",
  "Display & I/O": "interface",
  "Connector & mech": "interface",
  Passive: "passives",
};
const SHAPE_OF: Record<ConceptPartCategory, PartShape> = {
  Microcontroller: "ic",
  Connectivity: "ic",
  Sensor: "chip",
  Actuator: "box",
  "Power Management": "can",
  "Display & I/O": "box",
  "Connector & mech": "connector",
  Passive: "chip",
};
const REF_PREFIX: Record<SystemId, string> = {
  enclosure: "MECH-",
  board: "PCB-",
  compute: "U",
  sensing: "U",
  motion: "M",
  power: "BT",
  interface: "J",
  passives: "R",
};

/** The bundled demo model the no-key provider returns. It is a sample, not a
 *  shape made from this concept, so it never stands in for the shell. */
export const DEMO_MESH = "/models/sample.glb";

// g/cm³ — printed-plastic and laminate densities, for the two parts whose
// volume is known exactly: the shell walls and the board.
const DENSITY: Record<string, number> = {
  PLA: 1.24,
  PETG: 1.27,
  ASA: 1.07,
  TPU: 1.21,
  "FR-4": 1.85,
};
const PCB_MM = 1.6;
const GAP_MM = 2;
const EDGE_MM = 3;

const round1 = (n: number) => Math.round(n * 10) / 10;
const norm = (v: Vec3): Vec3 => {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
};
const pad2 = (n: number) => String(n).padStart(2, "0");

type Draft = Omit<AssemblyPart, "explodeDir" | "inventoryAt" | "id" | "instance"> & {
  key: string;
};

export function deriveAssembly(input: {
  title: string;
  /** The product's build parts — BuildProduct.parts. */
  parts: ConceptPart[];
  /** The spec booked with the build. A build older than the spec sheet has
   *  none; its sizes are then worked out from its parts the same way. */
  spec?: ResolvedSpec;
  /** The primary's generated mesh. Ignored when it is the demo sample. */
  meshUrl?: string;
}): Assembly {
  const { title, parts } = input;
  const booked = Boolean(input.spec);
  const spec = input.spec ?? deriveSpec(parts);
  const size = spec.size;
  const wall = spec.wallMm;
  const material = spec.material;
  const drafts: Draft[] = [];
  const floorY = -size.h / 2;
  const innerLeft = -size.l / 2 + wall + GAP_MM;

  // ── Enclosure: the concept mesh when Meshy made one, else base and lid
  // sized to the spec. The lid is the top wall; the base is the rest.
  const mesh = input.meshUrl && input.meshUrl !== DEMO_MESH ? input.meshUrl : undefined;
  if (mesh) {
    drafts.push({
      key: "shell",
      name: "Enclosure",
      ref: "MECH-01",
      system: "enclosure",
      description: "Shaped from the concept image, sized to the spec.",
      material,
      body: { ...size },
      shape: "mesh",
      at: [0, 0, 0],
      source: "concept-mesh",
      meshUrl: mesh,
    });
  } else {
    const baseH = size.h - wall;
    const cupCm3 = (l: number, w: number, h: number, t: number) =>
      (l * w * h - Math.max(0, l - 2 * t) * Math.max(0, w - 2 * t) * Math.max(0, h - t)) / 1000;
    drafts.push({
      key: "base",
      name: "Enclosure base",
      ref: "MECH-01",
      system: "enclosure",
      description: spec.board
        ? `Holds the board on four bosses. ${wall} mm wall.`
        : `The body everything sits in. ${wall} mm wall.`,
      material,
      massG: round1(cupCm3(size.l, size.w, baseH, wall) * DENSITY[material]),
      body: { l: size.l, w: size.w, h: baseH },
      shape: "shell-base",
      at: [0, floorY + baseH / 2, 0],
      source: "spec",
    });
    drafts.push({
      key: "lid",
      name: "Enclosure lid",
      ref: "MECH-02",
      system: "enclosure",
      description: `Closes the enclosure. ${wall} mm wall.`,
      material,
      massG: round1(((size.l * size.w * wall) / 1000) * DENSITY[material]),
      body: { l: size.l, w: size.w, h: wall },
      shape: "shell-lid",
      at: [0, size.h / 2 - wall / 2, 0],
      source: "spec",
    });
  }

  // ── Board: on its bosses, a gap above the floor, against the left wall.
  // A product with no board (a plate, a stand) has none drawn.
  const board = spec.board;
  const boardY = floorY + wall + GAP_MM + PCB_MM / 2;
  const boardX = board ? innerLeft + board.w / 2 : 0;
  if (board) {
    drafts.push({
      key: "board",
      name: "Main board",
      ref: "PCB-01",
      system: "board",
      description: `${board.w} × ${board.h} mm, ${board.layers}-layer.`,
      material: "FR-4 · 1.6 mm",
      massG: round1(((board.w * board.h * PCB_MM) / 1000) * DENSITY["FR-4"]),
      body: { l: board.w, w: board.h, h: PCB_MM },
      shape: "board",
      at: [boardX, boardY, 0],
      source: "spec",
    });
  }

  // ── Parts: one draft per unit. Board parts row-pack on the board top; case
  // parts lie in a row on the floor beside the board; outside parts stand
  // next to the enclosure.
  const boardTop = boardY + PCB_MM / 2;
  const boardLeft = board ? boardX - board.w / 2 + EDGE_MM : innerLeft;
  const boardRight = board ? boardX + board.w / 2 - EDGE_MM : size.l / 2 - wall;
  let bx = boardLeft;
  let bz = board ? -board.h / 2 + EDGE_MM : -size.w / 2 + wall;
  let rowDepth = 0;
  let cx = board ? boardX + board.w / 2 + GAP_MM : innerLeft;
  let ox = size.l / 2 + GAP_MM * 4;
  const counter: Record<string, number> = {};
  const nextRef = (system: SystemId) => {
    const prefix = REF_PREFIX[system];
    counter[prefix] = (counter[prefix] ?? 0) + 1;
    return prefix.endsWith("-") ? `${prefix}${pad2(counter[prefix])}` : `${prefix}${counter[prefix]}`;
  };
  // A booked spec chose the pack, so a battery the concept listed is set
  // aside for it; an old build keeps the one it named.
  const buildParts = booked ? parts.filter((p) => !isBatteryPart(p)) : parts;
  for (const part of buildParts) {
    const system = SYSTEM_OF[part.category];
    const { body, estimated } = bodyOf(part);
    const qty = qtyOf(part.name);
    for (let i = 0; i < qty; i += 1) {
      let at: Vec3;
      if (body.at === "board" && board) {
        if (bx + body.l > boardRight && bx > boardLeft) {
          bx = boardLeft;
          bz += rowDepth + 1;
          rowDepth = 0;
        }
        at = [bx + body.l / 2, boardTop + body.h / 2, bz + body.w / 2];
        bx += body.l + 1;
        rowDepth = Math.max(rowDepth, body.w);
      } else if (body.at === "outside") {
        at = [ox + body.l / 2, floorY + body.h / 2, 0];
        ox += body.l + GAP_MM;
      } else {
        at = [cx + body.l / 2, floorY + wall + body.h / 2, 0];
        cx += body.l + GAP_MM;
      }
      drafts.push({
        key: `${part.name}#${i}`,
        name: part.name,
        ref: nextRef(system),
        system,
        description: estimated ? `${part.role} Size is an estimate from its category.` : part.role,
        body: { l: body.l, w: body.w, h: body.h },
        shape: SHAPE_OF[part.category],
        at,
        source: estimated ? "estimate" : "spec",
      });
    }
  }

  // ── The booked spec's pack, which it picked in place of a listed one.
  if (booked) {
    const info = batteryOf(spec.battery);
    if (info.body) {
      drafts.push({
        key: "battery",
        name: info.label,
        ref: nextRef("power"),
        system: "power",
        description: "Powers the product.",
        body: { l: info.body.l, w: info.body.w, h: info.body.h },
        shape: "box",
        at: [cx + info.body.l / 2, floorY + wall + info.body.h / 2, 0],
        source: "spec",
      });
    }
  }

  // ── Instances, ids, explode directions and the inventory grid.
  const sameName = new Map<string, number>();
  for (const d of drafts) {
    const k = `${d.system}|${d.name}`;
    sameName.set(k, (sameName.get(k) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  const ordered = SYSTEM_ORDER.flatMap((s) => drafts.filter((d) => d.system === s));
  const cols = Math.max(1, Math.ceil(Math.sqrt(ordered.length)));
  const rows = Math.ceil(ordered.length / cols);
  const cell = Math.max(...ordered.map((d) => Math.max(d.body.l, d.body.w))) + 8;
  const out: AssemblyPart[] = ordered.map((d, i) => {
    const k = `${d.system}|${d.name}`;
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    const { key, ...rest } = d;
    // The lid lifts, the base sinks, everything else moves out from the
    // middle with a bias upward, so the parts leave the shell through its
    // open top rather than through its walls.
    const explodeDir: Vec3 =
      d.shape === "shell-lid"
        ? [0, 1, 0]
        : d.shape === "shell-base"
          ? [0, -1, 0]
          : norm([d.at[0], Math.abs(d.at[1] - floorY) + size.h, d.at[2]]);
    return {
      ...rest,
      id: `${d.system}:${key}`,
      instance: { n, of: sameName.get(k) ?? 1 },
      explodeDir,
      inventoryAt: [
        ((i % cols) - (cols - 1) / 2) * cell,
        floorY + d.body.h / 2,
        (Math.floor(i / cols) - (rows - 1) / 2) * cell,
      ],
    };
  });

  return {
    title,
    parts: out,
    systems: SYSTEM_ORDER.map((id) => ({
      id,
      label: SYSTEM_LABEL[id],
      count: out.filter((p) => p.system === id).length,
    })).filter((s) => s.count > 0),
    size: { l: size.l, w: size.w, h: size.h },
  };
}

/** Where a part stands at an explode of 0–100: outward along its own
 *  direction to 80, then blended onto its inventory cell, reached at 100. */
export function partPosition(p: AssemblyPart, explode: number, assemblySize: number): Vec3 {
  const e = Math.min(100, Math.max(0, explode));
  if (e === 0) return p.at;
  if (e === 100) return p.inventoryAt;
  const reach = assemblySize * 0.9;
  const outward = (t: number): Vec3 => [
    p.at[0] + p.explodeDir[0] * reach * t,
    p.at[1] + p.explodeDir[1] * reach * t,
    p.at[2] + p.explodeDir[2] * reach * t,
  ];
  if (e <= 80) return outward(e / 80);
  const from = outward(1);
  const t = (e - 80) / 20;
  return [
    from[0] + (p.inventoryAt[0] - from[0]) * t,
    from[1] + (p.inventoryAt[1] - from[1]) * t,
    from[2] + (p.inventoryAt[2] - from[2]) * t,
  ];
}
