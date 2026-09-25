// The spec's numbers, worked out from the parts every render.
//
// Nothing here is routed or modelled — it is arithmetic on datasheet bodies —
// so the card shows the minimum size as ±15%. What the arithmetic buys is
// that two products with five parts no longer get the same board, and that
// the power budget and the enclosure fit can actually be checked (§4.3.5).

import type { ConceptPart } from "../create/concept";
import { BATTERIES, USB_BUDGET_MA, batteryOf, isBatteryPart } from "./batteries";
import { bodyOf, type Body } from "./bodies";
import type {
  AiHints,
  BatteryKey,
  Material,
  Mm3,
  ResolvedSpec,
  SpecEdits,
  UseCase,
} from "./types";

export const WALL_MM = 2;
const CLEARANCE_MM = 1;
/** Copper, keep-outs and silkscreen take about as much room again as the
 *  bodies themselves — a little more. */
const ROUTING_FACTOR = 2.2;
const BOARD_ASPECT = 1.4;
const BOARD_EDGE_MM = 3;
const BOARD_MIN = { w: 20, h: 15 };
const PCB_MM = 1.6;
const STANDOFF_MM = 2;
const ROW_GAP_MM = 2;
/** A pack gives about 80% of its rating before the cut-off. */
const DERATE = 0.8;
const RUNTIME_GOAL_H = 1;
/** Something that moves — a motor, or a part that only exists to drive one.
 *  A product like that is not left on USB power alone by the rules. */
const MOVES = /motor|servo|stepper|brushless|bldc|pump|\bfan\b|vibration|haptic|propeller/i;

type Placed = { name: string; body: Body; estimated: boolean };

// Whole millimetres, rounded up — a size that rounds down no longer fits.
const up = (n: number) => Math.ceil(n - 1e-9);
const volume = (m: Mm3) => m.l * m.w * m.h;
const desc = (m: Mm3): [number, number, number] => {
  const [a, b, c] = [m.l, m.w, m.h].sort((x, y) => y - x);
  return [a, b, c];
};

/** Every part but a battery: the spec picks the pack, so a listed one is
 *  set aside rather than counted beside it. */
export function placedParts(parts: ConceptPart[]): Placed[] {
  return parts
    .filter((p) => !isBatteryPart(p))
    .map((p) => ({ name: p.name, ...bodyOf(p) }));
}

export function boardFor(list: Placed[]): { w: number; h: number; parts: number } | null {
  const on = list.filter((p) => p.body.at === "board");
  if (!on.length) return null;
  const area = on.reduce((s, p) => s + p.body.l * p.body.w, 0) * ROUTING_FACTOR;
  const w = Math.sqrt(area * BOARD_ASPECT);
  const h = area / w;
  const longest = Math.max(...on.map((p) => Math.max(p.body.l, p.body.w)));
  const widest = Math.max(...on.map((p) => Math.min(p.body.l, p.body.w)));
  const edge = 2 * BOARD_EDGE_MM;
  return {
    w: up(Math.max(w + edge, longest + edge, BOARD_MIN.w)),
    h: up(Math.max(h + edge, widest + edge, BOARD_MIN.h)),
    parts: on.length,
  };
}

function stackOf(list: Placed[]): number {
  const on = list.filter((p) => p.body.at === "board");
  return on.length ? Math.max(...on.map((p) => p.body.h)) + PCB_MM : 0;
}

function caseBodies(list: Placed[], battery: BatteryKey): Mm3[] {
  const loose = list
    .filter((p) => p.body.at === "case")
    .map(({ body }) => ({ l: body.l, w: body.w, h: body.h }));
  const pack = batteryOf(battery).body;
  return pack ? [...loose, pack] : loose;
}

/** The loose parts lie flat in a row along the length, either under the
 *  board or beside it — whichever box is smaller — inside a 2 mm wall with
 *  1 mm clearance all round. */
export function minSizeFor(
  board: { w: number; h: number } | null,
  stack: number,
  inCase: Mm3[],
): Mm3 {
  const bw = board?.w ?? 0;
  const bh = board?.h ?? 0;
  let inner: Mm3 = { l: bw, w: bh, h: stack };
  if (inCase.length) {
    const flat = inCase.map(desc);
    const row = {
      l: flat.reduce((s, f) => s + f[0], 0) + ROW_GAP_MM * (flat.length - 1),
      w: Math.max(...flat.map((f) => f[1])),
      h: Math.max(...flat.map((f) => f[2])),
    };
    const stacked: Mm3 = {
      l: Math.max(bw, row.l),
      w: Math.max(bh, row.w),
      h: stack + row.h + (board ? STANDOFF_MM : 0),
    };
    const side: Mm3 = {
      l: bw + (board ? ROW_GAP_MM : 0) + row.l,
      w: Math.max(bh, row.w),
      h: Math.max(stack, row.h),
    };
    inner = volume(stacked) <= volume(side) ? stacked : side;
  }
  const shell = 2 * (WALL_MM + CLEARANCE_MM);
  return { l: up(inner.l + shell), w: up(inner.w + shell), h: up(inner.h + shell) };
}

/** The maker types a box in any order; it fits when each of its sides, longest
 *  to shortest, is at least the matching side of the minimum. */
export function fitsIn(size: Mm3, min: Mm3): boolean {
  const a = desc(size);
  const m = desc(min);
  return a.every((v, i) => v >= m[i]);
}

export function drawOf(list: Placed[]): number {
  return Math.round(list.reduce((s, p) => s + p.body.mA, 0));
}

export function runtimeOf(battery: BatteryKey, drawMa: number): number | null {
  const pack = batteryOf(battery);
  return pack.mAh > 0 && drawMa > 0 ? (pack.mAh * DERATE) / drawMa : null;
}

export function budgetOf(battery: BatteryKey): number {
  return batteryOf(battery).maxMa;
}

const hasUsb = (parts: ConceptPart[]) => parts.some((p) => /usb/i.test(p.name));

/** The pack a concept already names, read as one of ours — so a spare
 *  battery, or a product that lists its own cell, keeps that cell. Null when
 *  it names none, or names one too vaguely to place. */
export function listedBattery(parts: ConceptPart[]): BatteryKey | null {
  const pack = parts.find(isBatteryPart);
  if (!pack) return null;
  const n = pack.name.toLowerCase();
  if (/\b2s\b|7\.4\s*v/.test(n)) return "li-2s-1500";
  if (/18650/.test(n)) return "li-1s-2000";
  if (/\baaa?\b/.test(n)) {
    return /\b(?:4|four)\s*[x×]?\s*aa|aa\s*[x×]\s*4/.test(n) ? "aa-4" : "aa-2";
  }
  const mah = Number(n.match(/(\d{3,5})\s*mah/)?.[1]);
  if (mah) return mah >= 1500 ? "li-1s-2000" : mah >= 700 ? "li-1s-1000" : "li-1s-400";
  return null;
}

/** Without a hint: the pack the concept lists, when it names one we can place;
 *  otherwise USB power for a product that has a USB port, no pack, nothing
 *  that moves and nothing the maker carries; otherwise the smallest Li pack
 *  that can supply it and lasts the goal (an hour when nobody said). */
export function ruleBattery(
  parts: ConceptPart[],
  goalH: number = RUNTIME_GOAL_H,
  useCase: UseCase[] = [],
): BatteryKey {
  const listed = listedBattery(parts);
  if (listed) return listed;
  const list = placedParts(parts);
  const moving = parts.some((p) => MOVES.test(p.name));
  // A cord to the wall is a fine answer for something that sits on a desk;
  // it is not an answer for something worn, carried or left outdoors.
  const carried = useCase.some((u) => u === "handheld" || u === "wearable" || u === "outdoor");
  if (hasUsb(parts) && !parts.some(isBatteryPart) && !moving && !carried) return "none";
  const draw = drawOf(list);
  const packs = BATTERIES.filter((b) => b.key.startsWith("li-")).sort((a, b) => a.mAh - b.mAh);
  const enough = packs.find(
    (b) => b.maxMa >= draw && (runtimeOf(b.key, draw) ?? Infinity) >= goalH,
  );
  return (enough ?? packs[packs.length - 1]).key;
}

export function ruleMaterial(useCase: UseCase[] = []): Material {
  if (useCase.includes("outdoor") || useCase.includes("waterproof")) return "ASA";
  if (useCase.includes("wearable")) return "TPU";
  return "PETG";
}

export function deriveSpec(
  parts: ConceptPart[],
  hints: AiHints = {},
  edits: SpecEdits = {},
): ResolvedSpec {
  const list = placedParts(parts);
  const board = boardFor(list);
  const stack = stackOf(list);
  // The pack the parts themselves name outranks the AI's hint — the maker
  // already told the model what battery is in the thing.
  const listed = listedBattery(parts);
  const battery =
    edits.battery ?? listed ?? hints.battery ?? ruleBattery(parts, hints.runtimeGoalH, hints.useCase);
  const minWith = (key: BatteryKey) => minSizeFor(board, stack, caseBodies(list, key));
  const minSize = minWith(battery);
  const size = edits.size ?? minSize;
  const fits = fitsIn(size, minSize);
  const drawMa = drawOf(list);

  // Largest capacity first, so the fix gives up as little runtime as it can.
  // USB power is offered only where there is a port and it can carry the
  // draw; every other pack is held to the same rule — a pack whose maxMa
  // can't supply the draw is not a fix, it is a new problem.
  let smallerBattery: ResolvedSpec["smallerBattery"] = null;
  if (!fits) {
    const usbOk = hasUsb(parts) && drawMa <= USB_BUDGET_MA;
    const tries = BATTERIES
      .filter((p) => p.key !== battery && p.maxMa >= drawMa && (p.key !== "none" || usbOk))
      .sort((a, b) => b.mAh - a.mAh);
    for (const pack of tries) {
      const need = minWith(pack.key);
      if (fitsIn(size, need)) {
        smallerBattery = { key: pack.key, runtimeH: runtimeOf(pack.key, drawMa), minSize: need };
        break;
      }
    }
  }

  return {
    size,
    sizeSource: edits.size ? "you" : "calc",
    minSize,
    fits,
    draftAtSize: !fits && edits.draftAtSize === true,
    board: board ? { ...board, layers: 2 as const } : null,
    battery,
    batterySource: edits.battery ? "you" : listed ? "concept" : hints.battery ? "ai" : "rule",
    drawMa,
    budgetMa: budgetOf(battery),
    runtimeH: runtimeOf(battery, drawMa),
    material: edits.material ?? hints.material ?? ruleMaterial(hints.useCase),
    materialSource: edits.material ? "you" : hints.material ? "ai" : "rule",
    wallMm: WALL_MM,
    estimated: list.filter((p) => p.estimated).map((p) => p.name),
    smallerBattery,
  };
}

/** The parts a build is made from: the concept's, with its pack swapped for
 *  the spec's — so the BOM, the wiring and the firmware carry the battery the
 *  maker chose, and a USB-powered product carries none. */
export function partsForBuild(parts: ConceptPart[], battery: BatteryKey): ConceptPart[] {
  const rest = parts.filter((p) => !isBatteryPart(p));
  if (battery === "none") return rest;
  return [
    ...rest,
    { name: batteryOf(battery).label, role: "Powers the product", category: "Power Management" },
  ];
}

/** What the maker decided, as one comparable string — a build is out of date
 *  when this differs from the snapshot it was booked with. A calculated size
 *  moves every time a part does, so it is compared only when the maker typed
 *  it themselves; otherwise the key just says "auto", and a part added or
 *  dropped shows up as a concept change, not a spec one. */
export function specKey(s: ResolvedSpec): string {
  const size = s.sizeSource === "you" ? `${s.size.l}x${s.size.w}x${s.size.h}` : "auto";
  return [size, s.battery, s.material, s.draftAtSize].join("|");
}

/** A product whose size its parts can't fit, and that the maker hasn't
 *  agreed to build as Draft, holds the build (spec S3). */
export function blocksBuild(spec: ResolvedSpec): boolean {
  return !spec.fits && !spec.draftAtSize;
}
