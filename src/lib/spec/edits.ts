// The parts a product is made of once the maker has changed them on the
// sheet: the concept's own list, with each kind the maker edited taken out
// and the catalog's part for it put in. The BOM, the wiring, the firmware
// and every number derive.ts works out all read this list, not the concept's.
//
// Pure, and idempotent — the edited list edited again with the same edits is
// the same list, so a caller that already holds edited parts can't double
// them. What keeps it so is a fixed order: the concept's parts (the MCU
// swapped where it stood), then what each edit puts in — radio, motors,
// servos, port, mounting, gasket — then the parts added from the catalog.
// Every kind an edit owns is taken out before it is put back, so a second
// pass takes out exactly what the first put in, and puts it back in place.

import type { ConceptPart } from "../create/concept";
import {
  ADDABLE,
  CHARGE_PORTS,
  GASKET,
  MCUS,
  MOTORS,
  MOUNTINGS,
  RADIOS,
  SERVOS,
  builtInRadioOf,
  builtInRadios,
  isChargePort,
  isDriveMotor,
  isGasket,
  isMcu,
  isMotorDriver,
  isMounting,
  isRadioPart,
  isServo,
  mcuRole,
  partRole,
  type CatalogPart,
} from "./catalog";
import { ADDABLE_KEYS, type AddableKey, type McuKey, type PartChoices, type SpecEdits } from "./types";

/** A catalog part as the parts list carries it — "TT gear motor (x2)" for
 *  more than one, the count qtyOf reads back. */
export function asPart(c: CatalogPart, qty = 1): ConceptPart {
  return { name: qty > 1 ? `${c.name} (x${qty})` : c.name, role: c.role, category: c.category };
}

function swapMcu(parts: ConceptPart[], key: McuKey): ConceptPart[] {
  const chip = asPart(MCUS[key]);
  const at = parts.findIndex(isMcu);
  return at < 0 ? [chip, ...parts] : parts.map((p, i) => (i === at ? chip : p));
}

export function applyEdits(parts: ConceptPart[], edits: PartChoices = {}): ConceptPart[] {
  const removed = new Set(edits.removed ?? []);
  const added = (edits.added ?? []).map((k) => asPart(ADDABLE[k]));
  // A concept part with an added part's own name is that part, listed once.
  const addedNames = new Set(added.map((p) => p.name));
  let out = parts.filter((p) => !removed.has(p.name) && !addedNames.has(p.name));
  const tail: ConceptPart[] = [];

  // A swapped chip would take the radio on its die with it. The product
  // keeps it instead — on the new chip's die, or on a module — unless the
  // maker picked a radio themselves.
  const carried = edits.mcu && !edits.radio ? builtInRadioOf(out) : null;
  if (edits.mcu) out = swapMcu(out, edits.mcu);
  const radio = edits.radio ?? carried;
  if (radio) {
    const mcu = out.find(isMcu);
    const onDie = builtInRadios(mcu);
    const onChip = onDie.includes(radio);
    const carrier = RADIOS[radio].module;
    // ESP-NOW with no ESP to speak it: the choice is dropped, not bent into
    // another radio, and the parts stay as they were.
    if (radio === "none" || onChip || carrier) {
      // A radio on the die makes the separate module redundant.
      if (edits.radio) out = out.filter((p) => !isRadioPart(p));
      if (mcu) out = out.map((p) => (p === mcu ? { ...p, role: mcuRole(radio, onDie) } : p));
      // A carried radio's module the maker already took out stays out.
      if (carrier && !onChip && !(carried && removed.has(carrier.name))) tail.push(asPart(carrier));
    }
  }

  if (edits.motors) {
    out = out.filter((p) => !isDriveMotor(p) && !isMotorDriver(p));
    const { kind, count } = edits.motors;
    if (count > 0) {
      const { driver } = MOTORS[kind];
      tail.push(asPart(MOTORS[kind], count), asPart(driver.part, Math.ceil(count / driver.per)));
    }
  }
  if (edits.servos) {
    out = out.filter((p) => !isServo(p));
    const { kind, count } = edits.servos;
    if (count > 0) tail.push(asPart(SERVOS[kind], count));
  }
  if (edits.chargePort) {
    out = out.filter((p) => !isChargePort(p));
    const port = CHARGE_PORTS[edits.chargePort].part;
    if (port) tail.push(asPart(port));
  }
  if (edits.mounting) {
    out = out.filter((p) => !isMounting(p));
    tail.push(asPart(MOUNTINGS[edits.mounting]));
  }
  if (edits.environment) {
    out = out.filter((p) => !isGasket(p));
    if (edits.environment === "waterproof") tail.push(asPart(GASKET));
  }
  return [...out, ...tail, ...added];
}

// ───────────────────────── the sheet's sections ─────────────────────────
//
// Which edits each section of the spec sheet owns — so its tag can say "You
// set" and its Reset takes out exactly those, and nothing another section
// set.

/** The sections whose parts show as chips, each a group of the catalog's
 *  "+ Add a part" menu. */
export const CHIP_ROLES = ["senses", "controls", "shows", "sounds", "switches"] as const;
export type ChipRole = (typeof CHIP_ROLES)[number];

export type PartSection = "power" | "brain" | "connects" | "moves" | "case" | "mounting" | ChipRole;

const addedRole = (k: AddableKey) => ADDABLE[k].group.toLowerCase() as ChipRole;

/** A removed name's role, by the concept part it named. */
function removedRole(name: string, concept: ConceptPart[]) {
  const p = concept.find((x) => x.name === name);
  return p ? partRole(p) : null;
}

export function sectionEdited(edits: SpecEdits, section: PartSection, concept: ConceptPart[]): boolean {
  switch (section) {
    case "power":
      return edits.battery !== undefined || edits.chargePort !== undefined;
    case "brain":
      return edits.mcu !== undefined;
    case "connects":
      return edits.radio !== undefined;
    case "moves":
      return !!edits.motors || !!edits.servos;
    case "case":
      return edits.material !== undefined || edits.wallMm !== undefined || edits.environment !== undefined;
    case "mounting":
      return edits.mounting !== undefined;
    default:
      return (
        (edits.added ?? []).some((k) => addedRole(k) === section) ||
        (edits.removed ?? []).some((n) => removedRole(n, concept) === section)
      );
  }
}

/** A list edit with nothing left in it is no edit — cleanChoices drops an
 *  empty one, so the edits stay as the same key a fresh product has. */
function withList<K extends "added" | "removed">(
  edits: SpecEdits,
  key: K,
  list: NonNullable<SpecEdits[K]>,
): SpecEdits {
  const next = { ...edits };
  if (list.length) next[key] = list;
  else delete next[key];
  return next;
}

/** The edits with one section's own taken out — back to the concept. */
export function resetSection(edits: SpecEdits, section: PartSection, concept: ConceptPart[]): SpecEdits {
  const next = { ...edits };
  switch (section) {
    case "power":
      delete next.battery;
      delete next.chargePort;
      return next;
    case "brain":
      delete next.mcu;
      return next;
    case "connects":
      delete next.radio;
      return next;
    case "moves":
      delete next.motors;
      delete next.servos;
      return next;
    case "case":
      delete next.material;
      delete next.wallMm;
      delete next.environment;
      return next;
    case "mounting":
      delete next.mounting;
      return next;
    default: {
      const kept = withList(next, "added", (next.added ?? []).filter((k) => addedRole(k) !== section));
      return withList(
        kept,
        "removed",
        (kept.removed ?? []).filter((n) => removedRole(n, concept) !== section),
      );
    }
  }
}

/** The ✕ on a chip. A part the maker added comes out of `added`; a
 *  concept part goes into `removed` — both, for a concept part that an added
 *  one of the same name stood in for, or it would come straight back. */
export function removePart(edits: SpecEdits, part: ConceptPart, concept: ConceptPart[]): SpecEdits {
  const added = edits.added ?? [];
  const key = added.find((k) => ADDABLE[k].name === part.name);
  let next = key ? withList(edits, "added", added.filter((k) => k !== key)) : edits;
  if (concept.some((p) => p.name === part.name)) {
    next = withList(next, "removed", [...new Set([...(next.removed ?? []), part.name])]);
  }
  return next;
}

/** What the "+ Add a part" menu offers: every catalog part not already in
 *  the list by name, so none is put in twice. */
export function addableFor(parts: ConceptPart[]): AddableKey[] {
  const names = new Set(parts.map((p) => p.name.toLowerCase()));
  return ADDABLE_KEYS.filter((k) => !names.has(ADDABLE[k].name.toLowerCase()));
}

/** A product with no parts to power, given some: the smallest chip the
 *  catalog has that speaks a radio, and a USB-C port to power it by. */
export function withElectronics(edits: SpecEdits): SpecEdits {
  return { ...edits, mcu: "esp32-c3", chargePort: "usb-c" };
}

/** Everything withElectronics — and every section it opened — put in,
 *  taken out again: the product is back to the thing its concept drew. */
export function withoutElectronics(edits: SpecEdits): SpecEdits {
  const next = { ...edits };
  for (const k of ["mcu", "radio", "motors", "servos", "added", "chargePort", "battery"] as const) {
    delete next[k];
  }
  return next;
}
