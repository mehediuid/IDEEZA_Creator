// What a card — and its rail row — says a product will be, chosen by what the
// product is. The same four slots on every card (Size · Power · Radio ·
// Board) printed "Radio None" on a charger and "Power USB" on a base plate:
// true, and useless. So Size always leads, and the rest is what this product
// is for — what powers it, the radio it names, and the one part that says
// what it does — with nothing shown that would only read "None".
//
// Pure: the radio is passed in (format.ts reads it off the parts through
// confidence.ts), so this compiles and tests on its own. A radio the sheet
// can set is said in the sheet's own word for it (RADIOS), so the card, the
// rail and the sheet spell it one way.

import type { ConceptPart } from "../create/concept";
import { batteryOf, isBatteryPart } from "./batteries";
import { bodyOf, qtyOf } from "./bodies";
import {
  RADIOS,
  chargerCellOf,
  chargerOf,
  isChargePort,
  isChargerIc,
  isMcu,
  isMotorDriver,
  isServo,
  partRole,
  radioKeyOf,
} from "./catalog";
import type { BatteryKey, ResolvedSpec } from "./types";
import { mm3 } from "./units";

/** How a spec fact reads — the card and the rail's rows both use it. */
export type SpecFactTone = "plain" | "warn" | "error";

/** One fact: a word and a value ("Radio nRF24"), or a phrase that is its own
 *  fact ("USB powered", "No electronics"). */
export type CardFact = {
  key: "size" | "material" | "electronics" | "power" | "radio" | "part";
  label?: string;
  value: string;
  tone: SpecFactTone;
};

/** A product with no electronics — a plate, a case, a stand: nothing but
 *  hardware, so no pack, nothing on a board and nothing drawing current
 *  (the spec's `kind`, productKind in derive.ts). The one rule the card's
 *  "No electronics", the power line's "No power needed" and boardLabel's
 *  "None — no electronics" all say it by. A spare battery pack is not one:
 *  a pack is power, not hardware. */
export function needsNoPower(spec: ResolvedSpec): boolean {
  return spec.kind === "mechanical";
}

/** "~7 h", "~45 min" — the card's rounder runtime. The sheet keeps
 *  `runtimeLabel`'s decimal, beside the caveat that goes with it. */
export function runtimeShort(hours: number | null): string | null {
  if (hours === null || !Number.isFinite(hours)) return null;
  if (hours < 1) return `~${Math.max(5, Math.round((hours * 60) / 5) * 5)} min`;
  return `~${Math.round(hours)} h`;
}

/** A product this one talks to over its radio, and whether they share it —
 *  project-state.ts's linksOf works it out across the project. */
export type RadioPair = { otherName: string; ok: boolean };

/** Packs that are thrown away, not charged — AA cells and a 9 V: the sheet
 *  and the card say "per battery", and the port is a power port. */
export const replacedNotRecharged = (key: BatteryKey) => key === "aa-2" || key === "aa-4" || key === "9v";

/** Up to four: Size, then — for a thing with no circuit — its plastic and
 *  "No electronics"; otherwise its power, its radio when it names one, and
 *  one part that says what it does. A product that talks to another says
 *  that instead of its radio: "Pairs with Remote Controller", or in the warn
 *  tone "Can't pair with Remote Controller" once they no longer share one. */
export function cardFactsOf(
  spec: ResolvedSpec,
  parts: ConceptPart[],
  radio: string | null,
  pairs: RadioPair[] = [],
): CardFact[] {
  const size: CardFact = {
    key: "size",
    label: "Size",
    value: spec.fits
      ? mm3(spec.size)
      : `${mm3(spec.size)} — ${spec.draftAtSize ? "Draft" : "doesn't fit"}`,
    tone: spec.fits ? "plain" : spec.draftAtSize ? "warn" : "error",
  };
  if (needsNoPower(spec)) {
    return [
      size,
      { key: "material", label: "Material", value: spec.material, tone: "plain" },
      { key: "electronics", value: "No electronics", tone: "plain" },
    ];
  }
  const facts: CardFact[] = [size];
  const power = powerFact(spec);
  if (power) facts.push(power);
  // One that no longer pairs is the thing to say, ahead of one that does.
  const pair = pairs.find((p) => !p.ok) ?? pairs[0];
  const word = radioWord(parts, radio);
  if (pair) {
    facts.push({
      key: "radio",
      label: pair.ok ? "Pairs with" : "Can't pair with",
      value: pair.otherName,
      tone: pair.ok ? "plain" : "warn",
    });
  } else if (word) {
    facts.push({ key: "radio", label: "Radio", value: word, tone: "plain" });
  }
  const part = partFact(spec, parts);
  if (part) facts.push(part);
  return facts;
}

/** The sheet's word for the radio the parts use — "Bluetooth LE", not
 *  "BLE" — and the caller's reading for a module the catalog doesn't list. */
function radioWord(parts: ConceptPart[], radio: string | null): string | null {
  const key = radioKeyOf(parts);
  if (key === null) return radio;
  return key === "none" ? null : RADIOS[key].label;
}

function powerFact(spec: ResolvedSpec): CardFact | null {
  if (spec.battery === "none") {
    // A board that draws nothing is powered by nothing worth naming.
    return spec.drawMa > 0 ? { key: "power", value: "USB powered", tone: "plain" } : null;
  }
  if (spec.battery === "adapter") return { key: "power", value: "Wall adapter", tone: "plain" };
  // A pack with nothing drawing on it has no runtime to state; a spare pack
  // says what it is in its own fact instead.
  // Said the way the sheet says it: per charge, or per battery for a pack
  // that is replaced rather than charged.
  const runtime = runtimeShort(spec.runtimeH);
  const per = replacedNotRecharged(spec.battery) ? "per battery" : "per charge";
  return runtime ? { key: "power", label: "Battery", value: `${runtime} ${per}`, tone: "plain" } : null;
}

// Parts that drive an actuator rather than being one — the motor they drive
// is the one that says what the product does.
const DRIVER =
  /driver|controller|\besc\b|h-bridge|\bl29[38]|\bdrv\d|tb6612|a4988|tmc2\d{3}|uln2003|pca9685/i;
// partRole files every I/O part that isn't a display under Controls; the
// card names one only when its name says it is one.
const CONTROL = /joystick|button|keypad|encoder|potentiometer|\bknob|switch|touch|slider|trigger|d-?pad/i;
// A status or indicator LED is on nearly everything, so it says the least.
const INDICATOR = /\bleds?\b.*\b(?:status|indicator)\b|\b(?:status|indicator)\b.*\bleds?\b/i;
// What a sensor measures, from the names the models use for them.
const SENSES: [RegExp, string][] = [
  [/gps|gnss|neo-?\d?m/i, "GPS"],
  [/soil|moisture/i, "soil moisture"],
  [/dht|humid|sht\d|aht\d/i, "temperature and humidity"],
  [/ds18b20|thermistor|temperature|thermo|lm35|tmp\d{2,3}|mlx9061/i, "temperature"],
  [/bme\d{3}|bmp\d{3}|barometer|pressure/i, "pressure"],
  [/ultrasonic|hc-?sr04|tof\b|vl53|lidar|distance|range/i, "distance"],
  [/pir\b|motion|mpu-?\d{4}|imu|accel|gyro|bno\d{3}/i, "motion"],
  [/ldr|photo|bh1750|lux|light|tsl\d{4}|veml/i, "light"],
  [/max3010|heart|pulse|spo2/i, "heart rate"],
  [/\bmq-?\d|gas|co2|air quality|sgp\d{2}|ccs811|voc/i, "air quality"],
  [/mic\b|microphone|sound|inmp441/i, "sound"],
  [/ina219|ina226|acs712|current/i, "current"],
  [/load cell|hx711|weight|scale/i, "weight"],
  [/camera|ov\d{4}/i, "images"],
];

// A schematic's reference designator — U1, U1A, CP1A, R12, SW2, LED3 — that
// the model sometimes gives as a part's whole name. Only a designator's own
// letters with one or two digits: a part number shares the shape (DHT22,
// L298, TP4056) and is a name worth showing.
const DESIGNATOR = /^(?:U|IC|R|RV|VR|C|CP|L|D|LED|Q|J|P|CN|K|F|FB|Y|X|T|TP|SW|S|BT|M)\d{1,2}[A-Z]?$/;

const KIND_WORD: Record<ConceptPart["category"], string> = {
  Microcontroller: "Microcontroller",
  Sensor: "Sensor",
  Actuator: "Actuator",
  "Power Management": "Power part",
  "Display & I/O": "Display or control",
  Connectivity: "Radio module",
  Passive: "Passive part",
  "Connector & mech": "Connector",
};

/** A part's name for a person to read: its own, or — for a bare designator
 *  — what kind of part it is, with the designator after ("Microcontroller
 *  (U1A)"). The name itself is untouched: the BOM keeps its reference. */
export function readableName(p: ConceptPart): string {
  return isDesignator(p) ? `${KIND_WORD[p.category] ?? "Part"} (${p.name.trim()})` : p.name;
}

export const isDesignator = (p: ConceptPart) => DESIGNATOR.test(p.name.trim());

/** A part's name as it reads mid-sentence: no bracketed aside, and a plain
 *  noun lower-cased ("Joystick" → "joystick"; "TT gear motor" and "OLED
 *  display" keep their capitals). */
function short(name: string): string {
  const s = name.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
  return /^[A-Z][a-z]+\b/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

/** "2 × TT gear motor" — the count moved to the front, when the name has
 *  one ("TT gear motor (x2)", "2 x TT gear motor"); a "4x4 keypad" is a
 *  size, and qtyOf already knows to leave it be. */
function counted(part: ConceptPart): string {
  const n = qtyOf(part.name);
  if (n === 1) return short(part.name);
  const bare = part.name.replace(/^\s*\d+\s*[x×]\s+|\s*[x×]\s*\d+\s*$/i, "");
  return `${n} × ${short(bare)}`;
}

/** What a part can say a product does, in the order a card picks one: what
 *  it moves, shows, is controlled by, switches, sounds, then senses. The
 *  roles are the sheet's own sections — one classifier, partRole. */
export const DOES = ["moves", "shows", "controls", "switches", "sounds", "senses"] as const;
export type Does = (typeof DOES)[number];

/** The word a card says each in: the sheet's section titles, but for what
 *  moves — the product drives a motor, a servo, a pump. */
export const DOES_LABEL: Record<Does, string> = {
  moves: "Drives",
  shows: "Shows",
  controls: "Controls",
  switches: "Switches",
  sounds: "Sounds",
  senses: "Senses",
};

/** The one part that says what the product does, and what that is — read
 *  by partRole, the classifier the sheet files its sections by, so the card
 *  and the sheet never disagree. A motor driver is passed over for the
 *  motor it drives; a designator, or an I/O part whose name says nothing,
 *  says nothing; a status LED comes last. Null when no part says. */
export function whatItDoes(parts: ConceptPart[]): { does: Does; part: ConceptPart } | null {
  const said: { does: Does; part: ConceptPart; rank: number }[] = [];
  for (const part of parts) {
    if (isDesignator(part)) continue;
    const role = partRole(part);
    const does = DOES.find((d) => d === role);
    if (!does) continue;
    if (does === "moves" && DRIVER.test(part.name)) continue;
    if (does === "controls" && !CONTROL.test(part.name)) continue;
    const rank = does === "shows" && INDICATOR.test(part.name) ? DOES.length : DOES.indexOf(does);
    said.push({ does, part, rank });
  }
  // The first part in the list wins a tie.
  let best: (typeof said)[number] | null = null;
  for (const s of said) if (!best || s.rank < best.rank) best = s;
  return best && { does: best.does, part: best.part };
}

/** A product with no chip that is there for a pack: a charger, which fills
 *  one it doesn't carry, or a spare pack, which is one. Null for anything
 *  else — a product with a chip is what it runs, whatever it charges. Read
 *  it off the concept's own parts: a charger given a chip is still a
 *  charger. */
export function standaloneOf(parts: ConceptPart[]): "charger" | "pack" | null {
  if (parts.some(isMcu)) return null;
  if (chargerOf(parts)) return "charger";
  return parts.some(isBatteryPart) ? "pack" : null;
}

/** What a charger fills and what it plugs into — "1S Li-Po", "USB-C" — or
 *  null for a product that isn't one. Read off the parts as edited, so a
 *  charger set to 2S says 2S (chargerOf, catalog.ts). */
export function chargesOf(parts: ConceptPart[]): { cell: string; port: string | null } | null {
  const charger = chargerOf(parts);
  return charger ? chargeParts(charger, parts) : null;
}

/** The cells a pack is, in a charger's words — the two are compared when a
 *  charger in the project is meant to fill a product's pack. */
export function packCellOf(key: BatteryKey): string | null {
  if (key.startsWith("li-1s")) return "1S Li-Po";
  if (key.startsWith("li-2s")) return "2S Li-Po";
  if (key.startsWith("aa-")) return "AA cells";
  return key === "9v" ? "9 V battery" : null;
}

/** The one part that says what the product does — the first that applies of
 *  a charger, a pack, then whatItDoes. */
function partFact(spec: ResolvedSpec, parts: ConceptPart[]): CardFact | null {
  const charger = chargerOf(parts);
  if (charger) {
    return { key: "part", label: "Charges", value: chargeOf(charger, parts), tone: "plain" };
  }
  // A named pack with nothing to run it is a pack — a spare, a power bank.
  const pack = parts.find(isBatteryPart);
  if (pack && !parts.some((p) => p.category === "Microcontroller")) {
    const carried = spec.battery !== "none" && spec.battery !== "adapter";
    return {
      key: "part",
      label: "Pack",
      value: carried ? batteryOf(spec.battery).label : short(pack.name),
      tone: "plain",
    };
  }
  const found = whatItDoes(parts);
  if (!found) return null;
  const { does, part } = found;
  // A sensor is said by what it measures ("Senses temperature"), anything
  // else by its name, with its count.
  const sensed = () => SENSES.find(([re]) => re.test(part.name))?.[1] ?? short(part.name);
  const value = does === "senses" ? sensed() : counted(part);
  return { key: "part", label: DOES_LABEL[does], value, tone: "plain" };
}

/** "1S Li-Po over USB-C" — the cell the charger's own name says it fills,
 *  and the port it is fed from. */
function chargeOf(charger: ConceptPart, parts: ConceptPart[]): string {
  const { cell, port } = chargeParts(charger, parts);
  return port ? `${cell} over ${port}` : cell;
}

function chargeParts(charger: ConceptPart, parts: ConceptPart[]): { cell: string; port: string | null } {
  const cell = chargerCellOf(charger);
  const names = parts.map((p) => p.name).join(" ");
  const port = /usb-?c|type-?c/i.test(names)
    ? "USB-C"
    : /micro-?\s?usb/i.test(names)
      ? "micro-USB"
      : /usb/i.test(names)
        ? "USB"
        : /barrel|dc jack/i.test(names)
          ? "DC jack"
          : null;
  return { cell, port };
}

// ───────────────────────── what is inside it ─────────────────────────

/** A part's own words for what it does, as the rest of a sentence: its role
 *  when it has one ("runs the firmware"), else what the sheet files it
 *  under (partRole) — the same classifier the sections use. */
export function partDoes(p: ConceptPart): string {
  const role = p.role.trim();
  if (role) return /^[A-Z][a-z]/.test(role) ? role.charAt(0).toLowerCase() + role.slice(1) : role;
  const n = p.name.toLowerCase();
  switch (partRole(p)) {
    case "brain":
      return "runs it";
    case "connects":
      return "its wireless link";
    case "power":
      if (isChargePort(p)) return "where the power comes in";
      if (isBatteryPart(p)) return "powers it";
      if (isChargerIc(p)) return "charges the battery";
      if (/ldo|regulator|ams1117|lm1117|ap2112|3v3|3\.3\s*v/.test(n)) return "steady power for the chip";
      if (/buck|boost|mp1584|lm2596|mt3608/.test(n)) return "sets the voltage";
      return "handles the power";
    case "moves":
      if (isMotorDriver(p)) return "drives the motors";
      if (isServo(p)) return "moves to an angle";
      return "makes it move";
    case "senses":
      return `senses ${SENSES.find(([re]) => re.test(p.name))?.[1] ?? "what is around it"}`;
    case "controls":
      return "takes your input";
    case "shows":
      return /oled|lcd|tft|e-?ink|e-?paper|display|screen/.test(n) ? "shows text and pictures" : "lights up";
    case "sounds":
      return "makes sound";
    case "switches":
      return "switches a load on and off";
    case "case":
      return /jst|header|terminal|connector|socket|plug/.test(n) ? "where the wires plug in" : "part of the case";
    default:
      return KIND_WORD[p.category]?.toLowerCase() ?? "a part";
  }
}

/** A pack as a thing wired in: "2S Li-Po 1500 mAh battery", "2 × AA
 *  batteries", "9 V battery". */
export function packWords(key: BatteryKey): string {
  const label = batteryOf(key).label;
  if (/batter(?:y|ies)$/i.test(label)) return label;
  return key.startsWith("aa-") ? `${label} batteries` : `${label} battery`;
}

export type InsideRow = { name: string; does: string };

/** What the build will make, part by part: the board, what sits on it and
 *  what it does, and what is wired to it off the board — the motors, the
 *  pack. The sheet's read-only Inside lists this. */
export function insideOf(
  spec: ResolvedSpec,
  parts: ConceptPart[],
): { board: string; on: InsideRow[]; wired: string[] } {
  const on: InsideRow[] = [];
  const wired: string[] = [];
  for (const p of parts) {
    // The pack is the spec's, named once below, not the concept's listing.
    if (isBatteryPart(p)) continue;
    const at = bodyOf(p).body.at;
    if (at === "board") on.push({ name: readableCounted(p), does: partDoes(p) });
    else if (at === "case") wired.push(readableCounted(p));
  }
  if (spec.battery !== "none" && spec.battery !== "adapter") wired.push(packWords(spec.battery));
  return {
    board: spec.board ? `${spec.board.w} × ${spec.board.h} mm · 2 layers` : "None — nothing in it sits on a board",
    on,
    wired,
  };
}

/** "2 × TT gear motor", or a designator by what kind of part it is. */
function readableCounted(p: ConceptPart): string {
  const m = p.name.match(/^(.*?)\s*\(x(\d+)\)$/);
  return m ? `${m[2]} × ${m[1]}` : readableName(p);
}
