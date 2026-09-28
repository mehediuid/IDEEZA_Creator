// A built product's schematic, drawn from its own parts and nets
// (P2-BUILDLOAD-1). The build names parts (bomFor) and part-level wires
// (netsFor) — no pins, no positions, no packages — so the sheet draws one
// symbol per on-board unit and every connection the build names as a short
// stub from a pin to a net label, a supply or a ground. The board is then
// the editor's own Convert of that sheet (lib/manual/build-load.ts), so the
// PCB tab opens on a real board and Generate PCB reproduces it.
//
// Why the geometry is what it is:
// - Convert (schematic-to-pcb.ts) takes a part's pins as the wire ends
//   within 30 px of its centre, and a supply within 30 px of a wire end as
//   that net's power. ERC (nets.ts computeNets) joins any two nodes within
//   13 px.
// - The `ic` glyph's leads are 5 px apart and it has no SCHEM_PINS, so an
//   IC's nets start from `pin` objects at six slots 16 px apart (over 13),
//   each within Convert's 30 px (24² + 16² ≤ 30²).
// - The slot beside a supply or ground stays empty, so no supply sits within
//   30 px of another net's end.
//
// Pure and deterministic, relative imports only (node:test).

import {
  bomFor,
  bookedSpec,
  netsFor,
  offBoard,
  type ArtifactSource,
  type BomRow,
  type NetWire,
} from "../create/build-artifacts";
import type { ConceptPart, ConceptPartCategory } from "../create/concept";
import type { PcbReport } from "../manual/build-load";
import { pinsOf } from "./nets";
import type { CanvasObject } from "./types";

// ───────────────────────────── layout order ─────────────────────────────

/** Left to right, the way current travels: what plugs in, what conditions
 *  it, what decides, what it drives. The review's Wiring map
 *  (deliverable-previews.tsx) and the seeded schematic both lay out by it. */
export const WIRING_ROLES: ConceptPartCategory[][] = [
  ["Connector & mech"],
  ["Power Management"],
  ["Microcontroller"],
  ["Sensor", "Actuator", "Display & I/O", "Connectivity", "Passive"],
];

// ───────────────────────────── units ─────────────────────────────

/** "M1" → "M", "SW2" → "SW", "FB1" → "FB". */
export function refPrefixOf(ref: string): string {
  return /^[A-Z]+/.exec(ref)?.[0] ?? "";
}

export type BomUnit = {
  /** The unit's own designator — M1 and M2 of the row M1–M2. */
  ref: string;
  row: BomRow;
  part: ConceptPart;
  rowIndex: number;
  /** Hardware or an adapter — on no board, wired to nothing. */
  offBoard: boolean;
};

/** One entry per unit, in BOM order. A counted row (`M1–M2`) is one unit per
 *  designator; a passive keeps its one designator whatever its quantity. */
export function bomUnitsOf(src: ArtifactSource): BomUnit[] {
  const out: BomUnit[] = [];
  bomFor(src).rows.forEach((row, rowIndex) => {
    const part = src.parts[rowIndex];
    const range = /^([A-Z]+)(\d+)–[A-Z]+(\d+)$/.exec(row.ref);
    const refs: string[] = [];
    if (range) for (let n = Number(range[2]); n <= Number(range[3]); n++) refs.push(`${range[1]}${n}`);
    else refs.push(row.ref);
    for (const ref of refs) out.push({ ref, row, part, rowIndex, offBoard: offBoard(row.ref) });
  });
  return out;
}

// ───────────────────────────── nets ─────────────────────────────

/** A build net's name on the schematic. Every result passes ERC's net-name
 *  rule (letters, digits, `_ . + -`). */
export function netNameOf(label: string): string {
  const t = label.trim();
  if (t === "VBUS 5V") return "VBUS";
  if (t === "3V3") return "+3V3";
  return t.replace(/[^A-Za-z0-9_.+-]+/g, "_") || "NET";
}

type UnitNet = { name: string; cls: NetWire["cls"]; fed: boolean };

/** The distinct nets on one BOM row's node, in netsFor order. A supply
 *  records whether the unit is fed by it (the wire's `to`) or feeds it. */
function netsOfNode(wires: NetWire[], nodeId: string): UnitNet[] {
  const out: UnitNet[] = [];
  for (const w of wires) {
    if (w.from !== nodeId && w.to !== nodeId) continue;
    const name = netNameOf(w.label);
    if (out.some((n) => n.name === name)) continue;
    out.push({ name, cls: w.cls, fed: w.to === nodeId });
  }
  return out;
}

// ───────────────────────────── symbols ─────────────────────────────

export type SymbolKind = "resistorBox" | "capacitor" | "inductor" | "diode" | "crystal" | "ic";

const TWO_PIN: Record<string, SymbolKind> = {
  R: "resistorBox",
  C: "capacitor",
  L: "inductor",
  FB: "inductor",
  D: "diode",
  Y: "crystal",
};

/** A two-terminal part with at most two nets keeps its own symbol and its two
 *  pins; anything else — or any part with more than two nets — is an `ic`
 *  whose nets start from pin slots. */
export function symbolKindOf(ref: string, netCount: number): SymbolKind {
  const two = TWO_PIN[refPrefixOf(ref)];
  return two && netCount <= 2 ? two : "ic";
}

export type IcSlotId = "L1" | "L2" | "L3" | "R1" | "R2" | "R3";

/** An IC's six pin slots, relative to its centre. L2 is always empty. */
export const IC_SLOTS: ReadonlyArray<{ id: IcSlotId; dx: number; dy: number }> = [
  { id: "L1", dx: -24, dy: -16 },
  { id: "L2", dx: -24, dy: 0 },
  { id: "L3", dx: -24, dy: 16 },
  { id: "R1", dx: 24, dy: -16 },
  { id: "R2", dx: 24, dy: 0 },
  { id: "R3", dx: 24, dy: 16 },
];

/** Which net each IC slot takes, and what doesn't fit:
 *  L1 the first supply the unit is fed by · L3 ground · R1 a supply it
 *  feeds, else the first signal · R2 the second signal (empty beside a
 *  supply on R1) · R3 the next signal. */
function icSlotsOf(nets: UnitNet[]): { slots: Partial<Record<IcSlotId, UnitNet>>; overflow: UnitNet[] } {
  const fed = nets.filter((n) => n.cls === "power" && n.fed);
  const feeds = nets.filter((n) => n.cls === "power" && !n.fed);
  const grounds = nets.filter((n) => n.cls === "ground");
  const signals = nets.filter((n) => n.cls === "signal");
  const slots: Partial<Record<IcSlotId, UnitNet>> = {};
  const overflow: UnitNet[] = [];
  if (fed[0]) slots.L1 = fed[0];
  overflow.push(...fed.slice(1));
  if (grounds[0]) slots.L3 = grounds[0];
  overflow.push(...grounds.slice(1));
  let s = 0;
  if (feeds[0]) {
    slots.R1 = feeds[0];
    overflow.push(...feeds.slice(1));
  } else if (signals[s]) {
    slots.R1 = signals[s++];
  }
  if (!feeds[0] && signals[s]) slots.R2 = signals[s++];
  if (signals[s]) slots.R3 = signals[s++];
  overflow.push(...signals.slice(s));
  return { slots, overflow };
}

// ───────────────────────────── the sheet ─────────────────────────────

/** What the schematic pass reports: PcbReport minus Convert's airwires. */
export type SchematicReport = Omit<PcbReport, "airwires">;

const ORIGIN = { x: 110, y: 110 };
const PITCH = { x: 200, y: 110 };
const PER_COLUMN = 4;
const STUB = 24;
/** The A4 sheet's inner frame ends here (schem-canvas.tsx: 920 − 26). */
const FRAME_RIGHT = 894;
const SHEET = "sheet-1";

/** The build's schematic on Sheet 1, and what it holds. Ids run obj_1…obj_N
 *  in drawing order, so the PCB store's id counter re-seeds past them. */
export function schematicFromBuild(src: ArtifactSource): { objects: CanvasObject[]; report: SchematicReport } {
  const nets = netsFor(src);
  const units = bomUnitsOf(src);
  const onBoard = units.filter((u) => !u.offBoard);

  // Columns: one per role group, in BOM order, 4 to a column.
  const columns: BomUnit[][] = [];
  for (const roles of WIRING_ROLES) {
    const group = onBoard.filter((u) => roles.includes(u.row.category));
    for (let i = 0; i < group.length; i += PER_COLUMN) columns.push(group.slice(i, i + PER_COLUMN));
  }

  const objects: CanvasObject[] = [];
  let n = 0;
  const nextId = () => `obj_${++n}`;
  const drawn = new Set<string>();
  const overflow: SchematicReport["overflow"] = [];
  let genericIcs = 0;
  let outsideFrame = 0;
  const schematicOnly: string[] = [];

  /** A stub from (px, py) `side` px outward, ending in the net's namer. */
  const stub = (px: number, py: number, side: -1 | 1, net: UnitNet) => {
    const ex = px + side * STUB;
    objects.push({ id: nextId(), kind: "wire", x: px, y: py, endX: ex, endY: py, scope: "schematic", sheetId: SHEET });
    const namer: CanvasObject =
      net.cls === "ground"
        ? { id: nextId(), kind: "gnd", x: ex, y: py, scope: "schematic", sheetId: SHEET }
        : net.cls === "power"
          ? { id: nextId(), kind: "vcc5v", x: ex, y: py, text: net.name, scope: "schematic", sheetId: SHEET }
          : { id: nextId(), kind: "net", x: ex, y: py, text: net.name, scope: "schematic", sheetId: SHEET };
    objects.push(namer);
    drawn.add(net.name);
  };

  columns.forEach((col, ci) => {
    col.forEach((u, ri) => {
      const x = ORIGIN.x + ci * PITCH.x;
      const y = ORIGIN.y + ri * PITCH.y;
      if (x > FRAME_RIGHT) outsideFrame++;
      const unitNets = netsOfNode(nets.wires, u.row.ref);
      const kind = symbolKindOf(u.ref, unitNets.length);
      const passive = u.row.category === "Passive";
      const symbol: CanvasObject = {
        id: nextId(),
        kind,
        x,
        y,
        text: u.ref,
        comment: u.row.name,
        scope: "schematic",
        sheetId: SHEET,
        props: {
          source: "build",
          category: u.row.category,
          value: u.row.name,
          ...(passive ? { qty: u.row.qty } : {}),
        },
      };
      objects.push(symbol);

      if (kind === "ic") {
        genericIcs++;
        const { slots, overflow: extra } = icSlotsOf(unitNets);
        for (const slot of IC_SLOTS) {
          const net = slots[slot.id];
          if (!net) continue;
          const px = x + slot.dx;
          const py = y + slot.dy;
          objects.push({
            id: nextId(),
            kind: "pin",
            x: px,
            y: py,
            scope: "schematic",
            sheetId: SHEET,
            props: { source: "build", owner: symbol.id, slot: slot.id },
          });
          stub(px, py, slot.dx < 0 ? -1 : 1, net);
        }
        if (extra.length) overflow.push({ ref: u.ref, nets: extra.map((e) => e.name) });
      } else {
        if (kind === "crystal") schematicOnly.push(`${u.ref} ${u.row.name}`);
        const pins = pinsOf({ id: symbol.id, kind, x, y });
        unitNets.slice(0, 2).forEach((net, i) => {
          const p = pins[i];
          stub(p.x, p.y, i === 0 ? -1 : 1, net);
        });
      }
    });
  });

  const offRows = bomFor(src).rows.filter((r) => offBoard(r.ref));
  const board = bookedSpec(src)?.board ?? null;
  const netOrder: string[] = [];
  for (const w of nets.wires) {
    const name = netNameOf(w.label);
    if (drawn.has(name) && !netOrder.includes(name)) netOrder.push(name);
  }
  return {
    objects,
    report: {
      units: onBoard.length,
      nets: netOrder,
      genericIcs,
      schematicOnly,
      offBoard: offRows.map((r) => `${r.ref} ${r.name}`),
      estimated: [...new Set(onBoard.filter((u) => u.row.category === "Passive").map((u) => u.row.ref))],
      overflow,
      outsideFrame,
      boardMm: board ? { w: board.w, h: board.h } : null,
    },
  };
}
