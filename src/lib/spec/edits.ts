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
  type CatalogPart,
} from "./catalog";
import type { McuKey, PartChoices } from "./types";

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
