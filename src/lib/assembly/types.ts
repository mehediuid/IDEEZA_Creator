// The assembly's shared shapes (spec: the Assembly + Wiring plan, owner-approved
// 2026-10-19 with every D1–D16 default). Two halves:
//
//  - the PARTS, derived on every read from the documents they come from (the
//    PCB board, the 3D Module's shapes, the off-board library) — never stored,
//    so the assembly is always live (D9);
//  - the DOCUMENT, what the maker did in Assembly: which parts came in, where
//    they sit, the snaps (mates), the wires and the patterns. Stored per
//    product under editor-scope's "assembly" key.
//
// Millimetres, y up. Pure types only.

import type { Pose, Quat, Vec3 } from "./math";

// ───────────────────────────── geometry ─────────────────────────────

/** A convex solid in its part's own frame. Collision treats every solid as a
 *  convex polyhedron (fit.ts); the canvas draws the same list. */
export type SolidShape =
  | { kind: "box"; center: Vec3; size: Vec3; q?: Quat }
  /** A cylinder whose axis is the local y of `q` (y when absent). */
  | { kind: "cyl"; center: Vec3; r: number; h: number; q?: Quat }
  | { kind: "cone"; center: Vec3; r: number; h: number; q?: Quat }
  | { kind: "sphere"; center: Vec3; r: number }
  /** The convex hull of these points — a board outline that isn't a rect or
   *  circle, a torus's bounds. */
  | { kind: "hull"; points: Vec3[] };

/** How the canvas draws a slab with holes (a board): an extruded outline. */
export type SlabRender = {
  outline: Array<[number, number]>; // x, z
  holes: Array<{ x: number; z: number; r: number } | { x: number; z: number; w: number; d: number }>;
  y0: number;
  thickness: number;
};

export type Solid = {
  id: string;
  /** What a person reads in a fit problem: "C3", "Lid", "Boss 2". */
  name: string;
  shape: SolidShape;
  color: string;
  /** Drawn see-through (an enclosure wall). */
  translucent?: boolean;
  /** Drawn as an extruded outline instead of `shape` (collision still uses `shape`). */
  slab?: SlabRender;
  /** Small parts can't collide with anything that matters (pads, copper). */
  collide?: boolean;
};

/** Something a snap can grab: a flat face (point + outward normal) or an axis
 *  (a hole, a boss, a cylinder: point + direction + radius). */
export type Feature = {
  id: string;
  kind: "face" | "axis";
  label: string;
  point: Vec3;
  /** Face: outward normal. Axis: direction. Unit length. */
  dir: Vec3;
  radius?: number;
  /** A face's extent along two in-plane axes, for the highlight. */
  size?: [number, number];
  /** An axis's seating face (a board hole sits on the board's bottom face), so
   *  a peg-in-hole snap can add the flush that seats it. */
  seat?: string;
};

/** A place a wire can end: a PCB pad, a part's lead. */
export type Pin = {
  id: string;
  label: string;
  point: Vec3;
  /** The way the wire leaves it. Unit length. */
  dir: Vec3;
  /** The net the pin is on (a PCB pad), when known. */
  net?: string;
  /** What net the pin wants (a battery's + wants VBAT/VIN/…): library parts. */
  netHint?: string;
};

export type PartSource = "pcb" | "three" | "library" | "ai";

/** One part of the product, ready to place: what it is, its solids, what can
 *  be grabbed, where wires can end. Derived, never stored. */
export type AsmPart = {
  /** The instance id this part is for. */
  id: string;
  source: PartSource;
  ref: string;
  name: string;
  /** "From PCB Design · live", "Off-board library", … */
  origin: string;
  solids: Solid[];
  features: Feature[];
  pins: Pin[];
  /** Where it sits before the maker moves it: a 3D Module shape at its
   *  designed place; everything else at the origin (bring-in lifts it). */
  defaultPose: Pose;
  /** An enclosure base: the inside of the cup and the wall openings, local mm. */
  enclosure?: {
    role: "base" | "lid";
    cavity: { min: Vec3; max: Vec3 };
    openings: Opening[];
  };
  /** Parts drawn as a plain box because they have no 3D shape yet (I5, F4). */
  boxOnly?: string[];
  /** Collision is the bounds, not the real shape (a mesh, a torus, a polygon board). */
  approximate?: boolean;
  /** The source is gone (deleted in its editor): kept so its snaps can say so. */
  missing?: boolean;
  /** A connector's mating face, for the opening check (F16), local mm. */
  ports?: Port[];
};

export type Opening = {
  id: string;
  /** Which wall: the outward normal of that wall. */
  side: "+x" | "-x" | "+z" | "-z";
  /** The rectangle on the wall's outer face: centre and size, local mm. */
  center: Vec3;
  size: [number, number]; // along the wall, up
};

export type Port = { id: string; label: string; center: Vec3; dir: Vec3; size: [number, number] };

// ───────────────────────────── the stored document ─────────────────────────────

export type AsmMode = "assembly" | "wiring";

export type InstanceRec = {
  id: string;
  source: PartSource;
  ref: string;
  /** A library part's designator ("BT1"). */
  label?: string;
  /** Absent: the part's default pose (a 3D shape follows its 3D Module place). */
  pose?: Pose;
  grounded?: boolean;
  hidden?: boolean;
  /** The maker placed it (moved, snapped, or grounded). Fit checks only placed parts. */
  placed?: boolean;
  /** A pattern copy: the pattern it belongs to. Copies are derived, never stored. */
  pattern?: string;
};

export type MateType =
  | "flush"
  | "concentric"
  | "distance"
  | "lock"
  | "parallel"
  | "perpendicular"
  | "angle"
  | "tangent";

export type MateEnd = { inst: string; feature: string };

export type MateRec = {
  id: string;
  name: string;
  type: MateType;
  /** `a` stays, `b` moves (a is grounded or placed earlier). */
  a: MateEnd;
  b: MateEnd;
  /** Distance (mm) — flush's and distance's gap. */
  offset?: number;
  /** Angle (degrees). */
  angle?: number;
  /** Aligned instead of anti-aligned. */
  flip?: boolean;
  suppressed?: boolean;
  /** Lock: b's pose in a's frame, captured when made. */
  rel?: Pose;
};

export type WireEnd = { inst: string; pin: string };
/** A point the maker fixed on a wire's path, riding on the part it was made over. */
export type WirePoint = { inst: string | null; local: Vec3 };

export type WireRec = {
  id: string;
  name: string;
  from: WireEnd;
  to: WireEnd;
  gauge: number;
  color: string;
  sleeveMm: number;
  slackPct: number;
  points: WirePoint[];
  /** Straight segments through the points instead of routing around parts. */
  straight?: boolean;
};

export type PatternRec =
  | { id: string; kind: "linear"; seed: string; count: number; spacing: number; axis: Vec3 }
  | { id: string; kind: "circular"; seed: string; count: number; angle: number; axis: Vec3; center: Vec3 }
  | { id: string; kind: "mirror"; seed: string; normal: Vec3; point: Vec3 };

/** A pattern as the maker asks for it, before it has an id. */
export type NewPattern = { [K in PatternRec["kind"]]: Omit<Extract<PatternRec, { kind: K }>, "id"> }[PatternRec["kind"]];

/** What the product page's Editor block shows without opening the editor. */
export type AsmSummary = { parts: number; placed: number; problems: number; warnings: number; wires: number; at: number };

export type AsmDoc = {
  v: 1;
  mode: AsmMode;
  /** True once the maker brought the parts in (the empty state is gone). */
  brought: boolean;
  instances: InstanceRec[];
  mates: MateRec[];
  wires: WireRec[];
  patterns: PatternRec[];
  clearanceMm: number;
  /** The one-time notice about an older 2D wiring was read (D14). */
  oldWiringSeen?: boolean;
  summary?: AsmSummary;
};

export const DEFAULT_CLEARANCE_MM = 0.5;

export function emptyAsmDoc(): AsmDoc {
  return { v: 1, mode: "assembly", brought: false, instances: [], mates: [], wires: [], patterns: [], clearanceMm: DEFAULT_CLEARANCE_MM };
}
