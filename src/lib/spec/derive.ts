// The spec's numbers, worked out from the parts every render.
//
// Nothing here is routed or modelled — it is arithmetic on datasheet bodies —
// so the card shows the minimum size as ±15%. What the arithmetic buys is
// that two products with five parts no longer get the same board, and that
// the power budget and the enclosure fit can actually be checked (§4.3.5).

import type { ConceptPart } from "../create/concept";
import { BATTERIES, USB_BUDGET_MA, batteryOf, isBatteryPart } from "./batteries";
import { bodyOf, mainBodyOf, qtyOf, type Body, type MainBody } from "./bodies";
import { CHARGE_PORTS, isChargePort, isMcu, namesRadio } from "./catalog";
import { applyEdits, asPart, effectiveEdits } from "./edits";
import { MM_MIN, asWallMm, cleanChoices } from "./hints";
import {
  BATTERY_KEYS,
  type AiHints,
  type BatteryKey,
  type Material,
  type Mm3,
  type PartChoices,
  type ResolvedSpec,
  type SpecEdits,
  type UseCase,
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

type Placed = { name: string; body: Body; estimated: boolean; qty: number };

// Whole millimetres, rounded up — a size that rounds down no longer fits.
const up = (n: number) => Math.ceil(n - 1e-9);
const volume = (m: Mm3) => m.l * m.w * m.h;
const desc = (m: Mm3): [number, number, number] => {
  const [a, b, c] = [m.l, m.w, m.h].sort((x, y) => y - x);
  return [a, b, c];
};

/** Every part but a battery: the spec picks the pack, so a listed one is
 *  set aside rather than counted beside it. A count in the name itself
 *  ("(x4)", "4 x") rides along as `qty` — the body stays one unit's own
 *  size, and the callers below are the ones who multiply it in. */
export function placedParts(parts: ConceptPart[]): Placed[] {
  return parts
    .filter((p) => !isBatteryPart(p))
    .map((p) => ({ name: p.name, qty: qtyOf(p.name), ...bodyOf(p) }));
}

export function boardFor(list: Placed[]): { w: number; h: number; parts: number } | null {
  const on = list.filter((p) => p.body.at === "board");
  if (!on.length) return null;
  const area = on.reduce((s, p) => s + p.body.l * p.body.w * p.qty, 0) * ROUTING_FACTOR;
  const w = Math.sqrt(area * BOARD_ASPECT);
  const h = area / w;
  const longest = Math.max(...on.map((p) => Math.max(p.body.l, p.body.w)));
  const widest = Math.max(...on.map((p) => Math.min(p.body.l, p.body.w)));
  const edge = 2 * BOARD_EDGE_MM;
  return {
    w: up(Math.max(w + edge, longest + edge, BOARD_MIN.w)),
    h: up(Math.max(h + edge, widest + edge, BOARD_MIN.h)),
    // Once per unit, not once per row — "SG90 servos (x4)" reads as 4 parts.
    parts: on.reduce((s, p) => s + p.qty, 0),
  };
}

function stackOf(list: Placed[]): number {
  const on = list.filter((p) => p.body.at === "board");
  return on.length ? Math.max(...on.map((p) => p.body.h)) + PCB_MM : 0;
}

function caseBodies(list: Placed[], battery: BatteryKey): Mm3[] {
  const loose = list
    .filter((p) => p.body.at === "case")
    // "(x4)" lays four case bodies in the row, not one — the enclosure has
    // to hold four motors, not the footprint of a single one.
    .flatMap(({ body, qty }) => Array(qty).fill({ l: body.l, w: body.w, h: body.h }));
  const pack = batteryOf(battery).body;
  return pack ? [...loose, pack] : loose;
}

/** The loose parts lie flat in a row along the length, either under the
 *  board or beside it — whichever box is smaller — inside the wall (2 mm
 *  unless the maker set it) with 1 mm clearance all round. */
export function minSizeFor(
  board: { w: number; h: number } | null,
  stack: number,
  inCase: Mm3[],
  wallMm: number = WALL_MM,
): Mm3 {
  const inner = innerOf(board, stack, inCase);
  const shell = 2 * (wallMm + CLEARANCE_MM);
  return { l: up(inner.l + shell), w: up(inner.w + shell), h: up(inner.h + shell) };
}

/** A product with nothing to power has no case to fit its parts inside, so
 *  no shell: its smallest size is the loose parts it holds, side by side —
 *  and never under the smallest box a size can be typed as. A plate's feet
 *  and screws take no room, so any plate the maker types fits. */
export function looseSizeFor(inCase: Mm3[]): Mm3 {
  const inner = innerOf(null, 0, inCase);
  const side = (n: number) => Math.max(MM_MIN, up(n));
  return { l: side(inner.l), w: side(inner.w), h: side(inner.h) };
}

function innerOf(board: { w: number; h: number } | null, stack: number, inCase: Mm3[]): Mm3 {
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
  return inner;
}

/** The maker types a box in any order; it fits when each of its sides, longest
 *  to shortest, is at least the matching side of the minimum. */
export function fitsIn(size: Mm3, min: Mm3): boolean {
  const a = desc(size);
  const m = desc(min);
  return a.every((v, i) => v >= m[i]);
}

/** `size`, each side grown — longest to shortest, as fitsIn compares them —
 *  to at least the matching side of `min`, keeping `size`'s own axes. */
export function growTo(size: Mm3, min: Mm3): Mm3 {
  const axes = (["l", "w", "h"] as const).slice().sort((a, b) => size[b] - size[a]);
  const m = desc(min);
  const out = { ...size };
  axes.forEach((axis, i) => {
    out[axis] = Math.max(size[axis], m[i]);
  });
  return out;
}

export function drawOf(list: Placed[]): number {
  return Math.round(list.reduce((s, p) => s + p.body.mA * p.qty, 0));
}

export function runtimeOf(battery: BatteryKey, drawMa: number): number | null {
  const pack = batteryOf(battery);
  return pack.mAh > 0 && drawMa > 0 ? (pack.mAh * DERATE) / drawMa : null;
}

export function budgetOf(battery: BatteryKey): number {
  return batteryOf(battery).maxMa;
}

const hasUsb = (parts: ConceptPart[]) => parts.some((p) => /usb/i.test(p.name));

// A barrel/DC jack, a wall or DC adapter, mains, an AC-DC brick (an
// HLK-PM01 and friends) or a stated dual-rail mains supply — a product that
// names one of these is wired to the wall, not carrying a cell.
const WALL_POWER =
  /barrel|dc jack|wall adapter|dc adapter|\bmains\b|hlk-pm\d+|ac[\s-]?\/?[\s-]?dc|\d+\s*v\s*\/\s*\d+\s*v\s*supply/i;

export const hasWallPower = (parts: ConceptPart[]) => parts.some((p) => WALL_POWER.test(p.name));

/** The pack a concept already names, read as one of ours — so a spare
 *  battery, or a product that lists its own cell, keeps that cell. Null when
 *  it names none, or names one too vaguely to place. */
export function listedBattery(parts: ConceptPart[]): BatteryKey | null {
  const pack = parts.find(isBatteryPart);
  if (!pack) return null;
  const n = pack.name.toLowerCase();
  // A model that names the pack by one of our own keys ("Li-1s-400") means
  // exactly that pack. Only the keys with a dash — "9v" as a word is the
  // rule below's, which knows "3.9V" is a cell voltage and not a 9 V battery.
  const words = n.split(/[^a-z0-9.-]+/);
  const key = BATTERY_KEYS.find((k) => k.includes("-") && words.includes(k));
  if (key) return key;
  if (/\b2s\b|7\.4\s*v/.test(n)) return "li-2s-1500";
  if (/18650/.test(n)) return "li-1s-2000";
  if (/\baaa?\b/.test(n)) {
    return /\b(?:4|four)\s*[x×]?\s*aa|aa\s*[x×]\s*4/.test(n) ? "aa-4" : "aa-2";
  }
  // Not preceded by a digit or a decimal point — otherwise "3.9V" reads its
  // trailing "9V" as the 9 V battery, when it is a LiPo cell's own voltage.
  if (/(?<![\d.])9\s*v\b/.test(n)) return "9v";
  const mah = Number(n.match(/(\d{2,5})\s*mah/)?.[1]);
  if (mah) {
    if (mah <= 150) return "li-1s-100";
    return mah >= 1500 ? "li-1s-2000" : mah >= 700 ? "li-1s-1000" : "li-1s-400";
  }
  // A LiPo/cell named "coin" or "tiny" with no stated capacity — sized for
  // a ring or a wearable, not the 1S 400 mAh default a bare "LiPo" takes.
  if (/coin|tiny/.test(n) && /li-?po|li-?ion|\bcells?\b/.test(n)) return "li-1s-100";
  return null;
}

/** Without a hint: the pack the concept lists, when it names one we can place;
 *  wall power for a product wired to a barrel/DC jack or mains with no pack
 *  named; otherwise USB power for a product that has a USB port, no pack,
 *  nothing that moves and nothing the maker carries; otherwise the smallest
 *  Li pack that can supply it and lasts the goal (an hour when nobody said). */
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
  const draw = drawOf(list);
  // Checked before the USB rule: a barrel jack or a mains brick answers "how
  // is this powered" on its own, whether or not the concept also carries a
  // USB port for firmware.
  if (hasWallPower(parts) && !parts.some(isBatteryPart)) return "adapter";
  if (hasUsb(parts) && !parts.some(isBatteryPart) && !moving && !carried) {
    // USB is only an answer within its own 500 mA budget — a "USB-powered"
    // product that actually draws more than that (a high-power LED lamp, a
    // touch-dimmer that pushes past 500 mA) is not fixed by naming a rule
    // that can't supply it. A desk product still has a cord answer, the
    // wall adapter; anything else falls to the pack search below instead of
    // stopping here.
    if (draw <= USB_BUDGET_MA) return "none";
    if (useCase.includes("desk")) return "adapter";
  }
  // Nothing draws current and nothing sits on a board — a plate, a stand, a
  // bracket, a case — so there is nothing here for a pack to supply. Without
  // this, a passive mechanical concept fell through to the smallest Li pack
  // below (li-1s-400) purely because 0 mA clears every pack's floor and
  // every runtime goal at once.
  if (draw === 0 && !boardFor(list)) return "none";
  return smallestPack(draw, goalH, useCase);
}

/** The smallest Li pack that supplies `draw` for the goal (an hour when
 *  nobody said), else the biggest — the rule's own pick, and the pack the
 *  sheet puts in when the maker switches a plugged-in product to Battery. */
export function smallestPack(
  draw: number,
  goalH: number = RUNTIME_GOAL_H,
  useCase: UseCase[] = [],
): BatteryKey {
  // li-1s-100 is sized for a wearable or a named tiny/coin cell (see
  // listedBattery) — offered here to any low-draw product, it undercuts the
  // 400 mAh floor every other handheld or outdoor concept has always had.
  const packs = BATTERIES.filter((b) => b.key.startsWith("li-"))
    .filter((b) => b.key !== "li-1s-100" || useCase.includes("wearable"))
    .sort((a, b) => a.mAh - b.mAh);
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

/** A product with nothing in it to power — every part hardware (a plate, a
 *  case, feet), no pack, nothing on a board and nothing drawing current.
 *  Read off the edited parts, so adding an MCU or an LED to a plate makes
 *  it electronic. */
export function productKind(parts: ConceptPart[]): "electronic" | "mechanical" {
  const list = placedParts(parts);
  const hardware = parts.every((p) => p.category === "Connector & mech" && !isBatteryPart(p));
  return hardware && drawOf(list) === 0 && !boardFor(list) ? "mechanical" : "electronic";
}

/** Electronics with no chip to run them — a charger, a spare pack — so the
 *  sheet has no Brain to change and offers one instead (withBrain,
 *  edits.ts). A plate gains electronics its own way (withElectronics). Pass
 *  the product's effective parts. */
export function canAddBrain(parts: ConceptPart[]): boolean {
  return productKind(parts) === "electronic" && !parts.some(isMcu);
}

/** The body a plate, a stand or a case starts from — nothing inside it sets
 *  a smallest size, so it takes the size typical for the thing it is. A
 *  maker who adds electronics to one still has that plate, grown to hold
 *  them, which is why the concept's own parts are asked as well as the
 *  edited ones. An electronic product's "enclosure" part is never a body:
 *  it is the box around the board, and the board decides it. */
export function typicalBodyOf(conceptParts: ConceptPart[], parts: ConceptPart[]): MainBody | null {
  const mechanical =
    productKind(conceptParts) === "mechanical" || productKind(parts) === "mechanical";
  return mechanical ? mainBodyOf(parts) : null;
}

/** The spec of a product, worked out from `conceptParts` — the concept's
 *  own parts, as the model gave them, never a list already edited — with
 *  the maker's `edits` applied here (edits.ts). A swapped radio, a motor
 *  count, an added sensor all move the size, the draw and the pack the same
 *  way a part the concept named would.
 *
 *  The raw list is the contract, not a formality: it is the only list that
 *  still says a plate given electronics is a plate (typicalBodyOf), which
 *  port is the concept's own (a USB product's before the maker set it to
 *  None; a barrel jack the concept charges by, as against one left from a
 *  switch to the wall), and that a radio set to None was the concept's, so
 *  the product is still meant to talk (`speaks`). Handed the edited list,
 *  every other product gets the same spec — applyEdits is idempotent — but
 *  those do not. */
export function deriveSpec(
  conceptParts: ConceptPart[],
  hints: AiHints = {},
  edits: SpecEdits = {},
): ResolvedSpec {
  const picked = effectiveEdits(cleanChoices(edits), conceptParts);
  const first = applyEdits(conceptParts, picked);
  const wallEdit = asWallMm(edits.wallMm);
  const wallMm = wallEdit ?? WALL_MM;
  // Nothing in it to power — a plate, a case, a stand. No pack is put in one
  // unless the maker picks it: a pack the model hinted would have nothing to
  // supply, and would land in the build's parts all the same.
  const mechanical = productKind(first) === "mechanical";
  // The pack the parts themselves name outranks the AI's hint — the maker
  // already told the model what battery is in the thing. A hint whose pack
  // can't supply this concept's own draw is dropped rather than kept and
  // shown against an impossible budget — same "dropped, never repaired"
  // rule as a hint outside the allowed set, just checked against the parts
  // instead of a fixed list.
  const listed = listedBattery(first);
  const needs = drawOf(placedParts(first));
  const hinted =
    !mechanical && hints.battery && batteryOf(hints.battery).maxMa >= needs
      ? hints.battery
      : undefined;
  // A port set to None doesn't make a USB product a battery one: the rule is
  // asked about the parts with the concept's own port, so a product that was
  // on USB stays on it — and says nothing takes the power in (noUsbPort) —
  // rather than being quietly given a pack.
  const supplyFrom =
    picked.chargePort === "none" ? applyEdits(conceptParts, withoutPort(picked)) : first;
  const battery =
    edits.battery ??
    listed ??
    hinted ??
    (mechanical ? "none" : ruleBattery(supplyFrom, hints.runtimeGoalH, hints.useCase));
  // Then the port that supply comes in by: a barrel jack left from a switch
  // to the wall and back is not a pack's or USB's (effectiveEdits), and
  // USB power gets a USB-C port where it has none — so the size holds it too.
  const choices = effectiveEdits(picked, conceptParts, battery);
  const edited = choices === picked ? first : applyEdits(conceptParts, choices);
  const parts = portFor(edited, battery, choices);
  const list = placedParts(parts);
  const board = boardFor(list);
  const stack = stackOf(list);
  const drawMa = drawOf(list);
  // Nothing is in a case that has to fit round it: no shell (looseSizeFor).
  const minWith = (key: BatteryKey) =>
    mechanical
      ? looseSizeFor(caseBodies(list, key))
      : minSizeFor(board, stack, caseBodies(list, key), wallMm);
  const minSize = minWith(battery);
  const typical = typicalBodyOf(conceptParts, parts);
  const size = edits.size ?? (typical ? growTo(typical.size, minSize) : minSize);
  const fits = fitsIn(size, minSize);

  // Largest capacity first, so the fix gives up as little runtime as it can.
  // USB power is offered only where there is a port and it can carry the
  // draw; wall power only where the parts themselves name a wall/DC input;
  // every other pack is held to the same rule — a pack whose maxMa can't
  // supply the draw is not a fix, it is a new problem. A thing with nothing
  // to power is never fixed by a pack.
  let smallerBattery: ResolvedSpec["smallerBattery"] = null;
  if (!fits && !mechanical) {
    const usbOk = hasUsb(parts) && drawMa <= USB_BUDGET_MA;
    const wallOk = hasWallPower(parts);
    const tries = BATTERIES
      .filter(
        (p) =>
          p.key !== battery &&
          p.maxMa >= drawMa &&
          (p.key !== "none" || usbOk) &&
          (p.key !== "adapter" || wallOk),
      )
      .sort((a, b) => b.mAh - a.mAh);
    for (const pack of tries) {
      const need = minWith(pack.key);
      if (fitsIn(size, need)) {
        smallerBattery = { key: pack.key, runtimeH: runtimeOf(pack.key, drawMa), minSize: need };
        break;
      }
    }
  }

  // A sealed case wants the UV- and water-safe plastic whatever the model
  // guessed, and a maker who says Indoor has overruled an outdoor use case;
  // only the plastic the maker picked outranks either.
  const sealed = choices.environment === "waterproof" || choices.environment === "splash-proof";
  const useCase =
    choices.environment === "indoor"
      ? hints.useCase?.filter((u) => u !== "outdoor" && u !== "waterproof")
      : hints.useCase;

  return {
    kind: mechanical ? "mechanical" : "electronic",
    size,
    sizeSource: edits.size ? "you" : "calc",
    minSize,
    fits,
    draftAtSize: !fits && edits.draftAtSize === true,
    draftChosen: edits.draftAtSize === true,
    board: board ? { ...board, layers: 2 as const } : null,
    battery,
    batterySource: edits.battery ? "you" : listed ? "concept" : hinted ? "ai" : "rule",
    noUsbPort: battery === "none" && drawMa > 0 && !parts.some(isChargePort),
    speaks: namesRadio(conceptParts) || (!!choices.radio && choices.radio !== "none"),
    drawMa,
    budgetMa: budgetOf(battery),
    runtimeH: runtimeOf(battery, drawMa),
    material: edits.material ?? (sealed ? "ASA" : (hints.material ?? ruleMaterial(useCase))),
    materialSource: edits.material ? "you" : !sealed && hints.material ? "ai" : "rule",
    wallMm,
    wallSource: wallEdit === undefined ? "rule" : "you",
    choices,
    estimated: list.filter((p) => p.estimated).map((p) => p.name),
    smallerBattery,
  };
}

/** A product powered over USB takes it through a USB socket. One whose
 *  concept named none — the model's hint, or the maker's own pick, said USB —
 *  gets a USB-C port, so the sheet, the size and the build all have the
 *  socket the power comes in by. A product that draws nothing needs none. */
export function withSupplyPort(parts: ConceptPart[], battery: BatteryKey): ConceptPart[] {
  if (battery !== "none" || parts.some(isChargePort)) return parts;
  if (drawOf(placedParts(parts)) === 0) return parts;
  return [...parts, asPart(CHARGE_PORTS["usb-c"].part!)];
}

/** withSupplyPort — but a port the maker set to None stays out. */
function portFor(edited: ConceptPart[], battery: BatteryKey, choices: PartChoices): ConceptPart[] {
  return choices.chargePort === "none" ? edited : withSupplyPort(edited, battery);
}

function withoutPort(choices: PartChoices): PartChoices {
  const next = { ...choices };
  delete next.chargePort;
  return next;
}

/** The parts the spec was worked out from: the concept's own (`conceptParts`,
 *  as deriveSpec takes them) with the maker's edits applied, and the socket
 *  the supply comes in by — the list the card, the rail and the sheet show,
 *  one list with the spec's numbers. `battery` is the spec's. */
export function effectiveParts(
  conceptParts: ConceptPart[],
  battery: BatteryKey,
  edits: SpecEdits = {},
): ConceptPart[] {
  const choices = effectiveEdits(cleanChoices(edits), conceptParts, battery);
  return portFor(applyEdits(conceptParts, choices), battery, choices);
}

// A supply the parts already carry — an adapter of their own, a mains
// module (an HLK-PM01) or an AC-DC brick — so a wall-powered product needs
// no adapter beside it. A barrel jack is only where one plugs in, and a
// mains relay or an AC current sensor is no supply: only a power part or a
// connector is read.
const OWN_SUPPLY =
  /\b(?:wall|power|dc|ac|mains|plug)[\s-]+adapter\b|\d\s*v\b[\w\s.]*\badapter\b|\bmains\b|hlk-pm\d+|ac[\s-]?\/?[\s-]?dc|\d+\s*v\s*\/\s*\d+\s*v\s*supply/i;
const carriesSupply = (p: ConceptPart) =>
  (p.category === "Power Management" || p.category === "Connector & mech") && OWN_SUPPLY.test(p.name);

/** The parts a build is made from: the concept's with the maker's edits
 *  applied, and its pack swapped for the spec's — so the BOM, the wiring and
 *  the firmware carry the parts and the battery the maker chose, and a
 *  USB-powered product carries none, but a USB port to take the power. A
 *  wall-powered one ships with an adapter, unless its parts already carry
 *  the supply: its own adapter is not listed twice, and a mains module
 *  needs none. */
export function partsForBuild(
  conceptParts: ConceptPart[],
  battery: BatteryKey,
  edits: SpecEdits = {},
): ConceptPart[] {
  const rest = effectiveParts(conceptParts, battery, edits).filter((p) => !isBatteryPart(p));
  if (battery === "none") return rest;
  if (battery === "adapter") {
    if (rest.some(carriesSupply)) return rest;
    return [
      ...rest,
      { name: batteryOf(battery).label, role: "Ships with the product · powers it from the wall", category: "Power Management" },
    ];
  }
  return [
    ...rest,
    { name: batteryOf(battery).label, role: "Powers the product", category: "Power Management" },
  ];
}

/** What the maker decided, as one comparable string — a build is out of date
 *  when this differs from the snapshot it was booked with. A calculated size
 *  moves every time a part does, so it is compared only when the maker typed
 *  it themselves; otherwise the key just says "auto", and a part added or
 *  dropped shows up as a concept change, not a spec one. The battery and the
 *  material follow the same rule: a "rule"/"concept"/"ai" pack or material
 *  moves whenever the parts or the rule that picks it does — reordering the
 *  battery rule, say — with nothing the maker chose, so only a "you"-sourced
 *  pick is compared; anything else reads as "auto" too. The wall and the
 *  part choices are the maker's by definition; the lists are compared as
 *  sets, since the order chips were added in decides nothing. */
export function specKey(s: ResolvedSpec): string {
  const size = s.sizeSource === "you" ? `${s.size.l}x${s.size.w}x${s.size.h}` : "auto";
  const battery = s.batterySource === "you" ? s.battery : "auto";
  const material = s.materialSource === "you" ? s.material : "auto";
  const wall = s.wallSource === "you" ? String(s.wallMm) : "auto";
  // asResolvedSpec gives every stored snapshot its choices; a spec built by
  // hand, field by field, may not carry them.
  const c = s.choices ?? {};
  const parts = JSON.stringify([
    c.mcu ?? null,
    c.radio ?? null,
    c.motors ? `${c.motors.kind}x${c.motors.count}` : null,
    c.servos ? `${c.servos.kind}x${c.servos.count}` : null,
    [...(c.removed ?? [])].sort(),
    [...(c.added ?? [])].sort(),
    c.chargePort ?? null,
    c.environment ?? null,
    c.mounting ?? null,
  ]);
  // The Draft choice, not whether it applies: the size fitting under a
  // newer fit rule is no change the maker made.
  return [size, battery, material, s.draftChosen, wall, parts].join("|");
}

/** A product whose size its parts can't fit, and that the maker hasn't
 *  agreed to build as Draft, holds the build (spec S3). */
export function blocksBuild(spec: ResolvedSpec): boolean {
  return !spec.fits && !spec.draftAtSize;
}
