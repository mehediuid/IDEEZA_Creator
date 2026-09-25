// The parts a product is made of once the maker has changed them on the
// sheet: the concept's own list, with each kind the maker edited taken out
// and the catalog's part for it put in. The BOM, the wiring, the firmware
// and every number derive.ts works out all read this list, not the concept's.
//
// Pure, and idempotent — the edited list edited again with the same edits is
// the same list, so a caller that already holds edited parts can't double
// them. What keeps it so is a fixed order: the concept's parts (the MCU and
// a charger's IC swapped where they stood), then what each edit puts in —
// radio, motors, servos, port, mounting, gasket — then the parts added from
// the catalog.
// Every kind an edit owns is taken out before it is put back, so a second
// pass takes out exactly what the first put in, and puts it back in place.

import type { ConceptPart } from "../create/concept";
import {
  ADDABLE,
  CHARGERS,
  CHARGE_PORTS,
  GASKET,
  MCUS,
  MOTORS,
  MOUNTINGS,
  RADIOS,
  SERVOS,
  builtInRadioOf,
  builtInRadios,
  chargeCellsOf,
  chargePortOf,
  chargerOf,
  isChargePort,
  isDriveMotor,
  isGasket,
  isMcu,
  isMotorDriver,
  isMounting,
  isRadioPart,
  isServo,
  mcuKeyOf,
  mcuRole,
  partRole,
  type CatalogPart,
} from "./catalog";
import {
  ADDABLE_KEYS,
  CHARGE_PORT_KEYS,
  type AddableKey,
  type BatteryKey,
  type ChargeCellKey,
  type ChargePortKey,
  type McuKey,
  type PartChoices,
  type SpecEdits,
} from "./types";

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

/** A charger's IC swapped where it stood for the catalog's one of `key`'s
 *  cells — unless it fills those cells already, so the concept's own
 *  MCP73831 stays when the maker picks the 1S it already is, and a second
 *  pass leaves the first one's swap. */
function swapCharger(parts: ConceptPart[], key: ChargeCellKey): ConceptPart[] {
  const charger = chargerOf(parts);
  if (!charger || chargeCellsOf(parts) === key) return parts;
  const next = asPart(CHARGERS[key]);
  return parts.map((p) => (p === charger ? next : p));
}

/** The edits with every choice the parts can't honour taken out, or put
 *  right. Such a choice is no choice: applyEdits reads the edits through
 *  this, deriveSpec records these as its `choices`, and the sheet keeps
 *  these, so nothing a maker left behind comes back by itself.
 *  - A charger's cells on a product that is no charger are dropped — left
 *    from a concept that was one, they fill nothing.
 *  - ESP-NOW on a chip that isn't an ESP is dropped (every other radio
 *    comes on a module when the die lacks it), so swapping back to an ESP
 *    never turns ESP-NOW back on.
 *  - Given the supply (`battery`), a barrel jack on anything but a wall
 *    adapter — left from a switch to the wall and back — becomes the port
 *    that supply takes (defaultPort), unless the concept itself charges by
 *    one.
 *  - Given the supply, a port set to None on a plugged-in product — USB or
 *    the wall — becomes that supply's port too. None is a pack's choice:
 *    one set on a pack, then left when an edit moved the product onto USB,
 *    booked a USB product with no socket for its power.
 *  `conceptParts` is the concept's own list: its port is the one a barrel
 *  jack is checked against (an edited list reads the same chip, but not
 *  the same port). Idempotent; the same object when nothing changes. */
export function effectiveEdits<E extends PartChoices>(
  edits: E,
  conceptParts: ConceptPart[],
  battery?: BatteryKey,
): E {
  let out = edits;
  if (edits.charges && !chargerOf(conceptParts)) {
    out = { ...out };
    delete out.charges;
  }
  const radio = edits.radio;
  if (radio && radio !== "none" && !RADIOS[radio].module) {
    const removed = new Set(edits.removed ?? []);
    const chip = edits.mcu
      ? asPart(MCUS[edits.mcu])
      : conceptParts.find((p) => isMcu(p) && !removed.has(p.name));
    if (!builtInRadios(chip).includes(radio)) {
      out = { ...out };
      delete out.radio;
    }
  }
  if (battery !== undefined && edits.chargePort === "barrel") {
    const own = chargePortOf(conceptParts);
    if (!barrelFits(battery, own)) out = withPort(out, defaultPort(battery, own), own);
  }
  if (edits.chargePort === "none" && (battery === "none" || battery === "adapter")) {
    const own = chargePortOf(conceptParts);
    out = withPort(out, defaultPort(battery, own), own);
  }
  return out;
}

// ───────────────────── the supply and its port ─────────────────────

/** A port of a USB kind — null is one the catalog doesn't list by name. */
const isUsbPort = (k: ChargePortKey | null) => k !== "barrel" && k !== "none";

/** A barrel jack is a wall adapter's — or any supply's, on a concept that
 *  names one to charge by itself. */
const barrelFits = (battery: BatteryKey, own: ChargePortKey | null) =>
  battery === "adapter" || own === "barrel";

/** The port a supply takes when the one it had belongs to another: a wall
 *  adapter's barrel jack; USB's USB port — the concept's own, or USB-C; a
 *  pack's charging port — the concept's own, or USB-C. */
function defaultPort(battery: BatteryKey, own: ChargePortKey | null): ChargePortKey | null {
  if (battery === "adapter") return "barrel";
  if (battery === "none") return isUsbPort(own) ? own : "usb-c";
  return own === "none" ? "usb-c" : own;
}

/** Whether a port is one this supply comes in by. */
function portSuits(port: ChargePortKey | null, battery: BatteryKey, own: ChargePortKey | null) {
  if (battery === "adapter") return port === "barrel";
  if (battery === "none") return isUsbPort(port);
  return port !== "barrel" || own === "barrel";
}

/** The edits with the port set — or its edit taken out when the concept's
 *  own port is that one already. */
function withPort<E extends PartChoices>(edits: E, port: ChargePortKey | null, own: ChargePortKey | null): E {
  const next = { ...edits };
  if (port === null || port === own) delete next.chargePort;
  else next.chargePort = port;
  return next;
}

/** The edits with the product's supply set to `battery` — "adapter" for a
 *  wall adapter, "none" for USB, a pack's key — and the port it comes in
 *  by. A port that belongs to the old supply never stays: going to the
 *  wall puts in a barrel jack, and coming back takes it out again for the
 *  concept's own port, or USB-C. A port that suits the new supply is kept. */
export function withSupply(edits: SpecEdits, battery: BatteryKey, conceptParts: ConceptPart[]): SpecEdits {
  const own = chargePortOf(conceptParts);
  const next: SpecEdits = { ...edits, battery };
  if (portSuits(edits.chargePort ?? own, battery, own)) return next;
  return withPort(next, defaultPort(battery, own), own);
}

/** The edits with a charger set to fill `key`'s cells — or its edit taken
 *  out when the concept's own charger fills those already, so going back
 *  to them puts the concept's own part back, not the catalog's. */
export function withCharges(edits: SpecEdits, key: ChargeCellKey, conceptParts: ConceptPart[]): SpecEdits {
  const next = { ...edits };
  if (chargeCellsOf(conceptParts) === key) delete next.charges;
  else next.charges = key;
  return next;
}

/** The ports the sheet's port control offers for a supply: none for USB or
 *  the wall — each needs a way in — and a barrel jack only for the wall, or
 *  on a concept that charges through its own. */
export function chargePortChoices(battery: BatteryKey, conceptParts: ConceptPart[]): ChargePortKey[] {
  const barrel = barrelFits(battery, chargePortOf(conceptParts));
  const pack = battery !== "none" && battery !== "adapter";
  return CHARGE_PORT_KEYS.filter((k) => (k === "barrel" ? barrel : k !== "none" || pack));
}

export function applyEdits(parts: ConceptPart[], choices: PartChoices = {}): ConceptPart[] {
  const edits = effectiveEdits(choices, parts);
  const removed = new Set(edits.removed ?? []);
  const added = (edits.added ?? []).map((k) => asPart(ADDABLE[k]));
  // A concept part with an added part's own name is that part, listed once.
  const addedNames = new Set(added.map((p) => p.name));
  let out = parts.filter((p) => !removed.has(p.name) && !addedNames.has(p.name));
  const tail: ConceptPart[] = [];

  // A swapped chip would take the radio on its die with it. The product
  // keeps it instead — on the new chip's die, or on a module — unless the
  // maker picked a radio themselves. A chip that is already the one picked
  // is left as it stands, role and all: a second pass over the first's
  // output — or a chip given to a chipless product — then carries nothing.
  const swap = !!edits.mcu && mcuKeyOf(out) !== edits.mcu;
  const carried = swap && !edits.radio ? builtInRadioOf(out) : null;
  if (swap && edits.mcu) out = swapMcu(out, edits.mcu);
  if (edits.charges) out = swapCharger(out, edits.charges);
  const radio = edits.radio ?? carried;
  if (radio) {
    const mcu = out.find(isMcu);
    const onDie = builtInRadios(mcu);
    const onChip = onDie.includes(radio);
    const carrier = RADIOS[radio].module;
    // A carried ESP-NOW with no ESP to speak it is dropped, not bent into
    // another radio, and the parts stay as they were. (A picked one never
    // gets here: effectiveEdits has taken it out.)
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
      return edits.battery !== undefined || edits.chargePort !== undefined || edits.charges !== undefined;
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
      delete next.charges;
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

/** The chip a product given one gets: the smallest the catalog has that
 *  speaks a radio. */
const FIRST_CHIP: McuKey = "esp32-c3";

/** A product with no parts to power, given some: the smallest chip the
 *  catalog has that speaks a radio, and a USB-C port to power it by. */
export function withElectronics(edits: SpecEdits): SpecEdits {
  return { ...edits, mcu: FIRST_CHIP, chargePort: "usb-c" };
}

/** A product that has electronics but no chip — a charger, a spare pack —
 *  given one (canAddBrain, derive.ts, says which). The chip alone: it
 *  already has its power and its port, and the spec adds a USB-C port only
 *  if a USB supply turns out to have none. */
export function withBrain(edits: SpecEdits): SpecEdits {
  return { ...edits, mcu: FIRST_CHIP };
}

/** withBrain taken back out — and the radio picked for that chip with it,
 *  or its module would stay on a product with nothing to run it. */
export function withoutBrain(edits: SpecEdits): SpecEdits {
  const next = { ...edits };
  delete next.mcu;
  delete next.radio;
  return next;
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

// ───────────────────── edits made on an older concept ─────────────────────
//
// Part edits are kept per product, so a Refine or a Regenerate brings a new
// concept they still apply to. Each carries the turn it was made on
// (`basedOn`), so the sheet can say so — "Your part changes from Concept N
// still apply · Reset parts".
//
// And the parts of that concept, as a short stamp ("turn#stamp"): a Read
// again replaces a stand-in's parts with the reading on the same turn, and
// edits made on the stand-in — a sensor added, a chip swapped — landed on
// the reading with nothing said. The sheet stamps the turn (stampEdits);
// the store adds the parts, which it holds (withConceptStamp).

/** A concept's parts as a short stamp — the same parts, the same stamp. */
function partsStamp(parts: ConceptPart[]): string {
  let h = 0x811c9dc5;
  for (const c of parts.map((p) => p.name.trim()).join("\n")) {
    h ^= c.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** The turn a `basedOn` names, with or without its parts' stamp. */
export function stampTurnOf(basedOn: string): string {
  const at = basedOn.lastIndexOf("#");
  return at < 0 ? basedOn : basedOn.slice(0, at);
}

/** The edits with their `basedOn` stamped with the parts of the concept it
 *  names, once — `conceptParts` gives a turn's concept parts, undefined
 *  while it has none. A stamp already there, or no `basedOn`, is left. */
export function withConceptStamp(
  edits: SpecEdits,
  conceptParts: (turnId: string) => ConceptPart[] | undefined,
): SpecEdits {
  const on = edits.basedOn;
  if (on === undefined || on.includes("#")) return edits;
  const parts = conceptParts(on);
  return parts ? { ...edits, basedOn: `${on}#${partsStamp(parts)}` } : edits;
}

const PART_CHOICES = [
  "mcu",
  "radio",
  "motors",
  "servos",
  "removed",
  "added",
  "chargePort",
  "environment",
  "mounting",
  "charges",
] as const satisfies readonly (keyof PartChoices)[];

/** The edits as they stand on the concept of turn `turnId`, and whether they
 *  were made on an older one (`basedOn` set, and another turn — or this
 *  turn with other parts, read again since). A removed name this concept
 *  doesn't carry is dropped: it takes nothing out here, and would take out
 *  a part of that name a later concept brings. */
export function rebaseEdits(
  edits: SpecEdits,
  conceptParts: ConceptPart[],
  turnId: string,
): { edits: SpecEdits; olderConcept: boolean } {
  const on = edits.basedOn;
  const olderConcept =
    on !== undefined &&
    (stampTurnOf(on) !== turnId || (on.includes("#") && on !== `${turnId}#${partsStamp(conceptParts)}`));
  if (!edits.removed) return { edits, olderConcept };
  const carried = new Set(conceptParts.map((p) => p.name));
  const kept = edits.removed.filter((n) => carried.has(n));
  if (kept.length === edits.removed.length) return { edits, olderConcept };
  return { edits: withList(edits, "removed", kept), olderConcept };
}

/** The edits as the sheet stores them: stamped with `turnId` when this write
 *  changed a part (so they were made on the concept of that turn), left as
 *  stamped when it changed something else — a size, a pack — and unstamped
 *  once no part change is left, so there is nothing to say "still applies". */
export function stampEdits(next: SpecEdits, prev: SpecEdits, turnId: string): SpecEdits {
  const partsOf = (e: SpecEdits) => JSON.stringify(PART_CHOICES.map((k) => e[k] ?? null));
  const out = { ...next };
  if (PART_CHOICES.every((k) => next[k] === undefined)) delete out.basedOn;
  else if (partsOf(next) !== partsOf(prev)) out.basedOn = turnId;
  return out;
}

/** Reset parts: every part change taken out, and the turn they were made
 *  on. The size, the pack, the plastic and the wall are not parts, and stay. */
export function resetParts(edits: SpecEdits): SpecEdits {
  const next = { ...edits };
  for (const k of PART_CHOICES) delete next[k];
  delete next.basedOn;
  return next;
}
