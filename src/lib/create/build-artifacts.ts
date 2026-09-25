// Deliverable content, derived from the concept's parts list.
//
// Everything here is pure and deterministic: the same job always
// produces the same BOM, the same netlist, the same firmware. That's
// what lets the review tabs, the chat cards and the exported files all
// describe one build instead of three plausible-looking inventions.

import type { ConceptPart, ConceptPartCategory } from "./concept";
import { isBatteryPart } from "../spec/batteries";
import { qtyOf, unitName } from "../spec/bodies";
import {
  isChargePort,
  isDriveMotor,
  isMcu,
  isMotorDriver,
  isMounting,
  isRadioPart,
  isServo,
  radioKeyOf,
} from "../spec/catalog";
import { deriveSpec, partsForBuild } from "../spec/derive";
import { readableName } from "../spec/facts";
import { radioOf } from "../spec/format";
import type { AiHints, ResolvedSpec } from "../spec/types";

// The fields these builders read. BuildJob satisfies it; a fixture
// doesn't have to carry the whole job to be summarised.
export type ArtifactSource = {
  title: string;
  parts: ConceptPart[];
  /** The spec the build was booked with; an older build has none and has its
   *  spec worked out from its parts instead. */
  spec?: ResolvedSpec;
};

export function specOfSource(job: ArtifactSource): ResolvedSpec {
  return job.spec ?? deriveSpec(job.parts);
}

/** The snapshot this build was actually booked with, or null for a build
 *  that predates spec booking. Callers that need to know "is this number a
 *  real decision or something worked out from the parts just now" read this
 *  instead of repeating `job.spec` themselves. */
export function bookedSpec(job: ArtifactSource): ResolvedSpec | null {
  return job.spec ?? null;
}

// Reference designators, the way a schematic names them (IEEE 315): the
// letters say what a part IS, so they're read off the part first and its
// category after. Filed by category alone, a battery was U2 beside the MCU's
// U1, and a motor, a buzzer and a relay were all D — a diode's letter.
//
// The category's letter, for a part nothing below recognises: ICs (MCU,
// regulators, radios) are U, sensors S, displays and controls DSP,
// connectors J, passives R, and an actuator keeps the D it always had.
const REF_PREFIX: Record<ConceptPartCategory, string> = {
  Microcontroller: "U",
  "Power Management": "U",
  Connectivity: "U",
  Sensor: "S",
  Actuator: "D",
  "Display & I/O": "DSP",
  Passive: "R",
  "Connector & mech": "J",
};

// What a part's own name says it is, tried in order: a driver or controller
// before the motor or LED it drives, a relay before the switch it is, and a
// "switching regulator" is no switch.
const BY_NAME: [RegExp, string][] = [
  [/crystal|xtal|resonator|oscillator/, "Y"],
  [/buzzer|piezo/, "BZ"],
  [/speaker/, "LS"],
  [/relay/, "K"],
  [/fuse/, "F"],
  [/mosfet|transistor|\bbjt\b/, "Q"],
  [/driver|controller|\besc\b|h-?bridge|pca9685/, "U"],
  [/diode|schottky|zener|\btvs\b/, "D"],
  [/\bleds?\b|ws2812|sk6812|neopixel/, "D"],
  [/\bswitch(?:es)?\b|button|\btact\b/, "SW"],
  [/potentiometer|trimmer|\bpot\b/, "RV"],
  [/motor|stepper|servo|brushless|bldc|pump|\bfan\b/, "M"],
];

// A passive by what it is, before the names above: an "LED resistor" is a
// resistor.
const PASSIVE: [RegExp, string][] = [
  [/resistor/, "R"],
  [/capacitor|\bcaps?\b|\d\s*[nuµp]f\b/, "C"],
  [/ferrite|\bbead/, "FB"],
  [/inductor|choke|\d\s*[uµm]h\b/, "L"],
];

// What holds, seals or houses a product is hardware (H), not a connector —
// the screws, feet and magnets it sits on, a gasket, standoffs, its case,
// and a printed body of any kind: a plate, a stand, a tray. A card or a
// fuse holder is a socket, and stays J.
const HARDWARE =
  /screw|bolt|\bnuts?\b|washer|standoff|spacer|feet|\bfoot\b|magnet|gasket|o-?ring|enclosure|housing|\bcase\b|\blid\b|bracket|sleeve|strap|hinge|\bclips?\b|\bbody\b|\bprinted\b|\bplate\b|\bstand\b|\bbase\b|\btray\b|(?<!card\s|fuse\s)\bholder\b/;
const CONNECTOR = /connector|jack|socket|port|plug|header|terminal/;
const SWITCH = /\bswitch(?:es)?\b|button/;

// A wall adapter ships with the product and plugs into it: a power supply
// (PS), not an IC on its board. A mains module soldered to the board (an
// HLK-PM01) is one, and stays U.
const ADAPTER = /\b(?:wall|power|dc|ac|mains|plug)[\s-]+adapter\b|\d\s*v\b[\w\s.]*\badapter\b/;

const byName = (table: [RegExp, string][], name: string) =>
  table.find(([re]) => re.test(name))?.[1];

function refPrefixOf(part: ConceptPart): string {
  if (isBatteryPart(part)) return "BT";
  const n = part.name.toLowerCase();
  if (ADAPTER.test(n) && (part.category === "Power Management" || part.category === "Connector & mech")) {
    return "PS";
  }
  switch (part.category) {
    // An MCU and a radio module are ICs or modules whatever their names
    // say, and a sensor is one too — a "piezo" sensor is no buzzer — unless
    // it is a button or a switch filed as one.
    case "Microcontroller":
    case "Connectivity":
      return REF_PREFIX[part.category];
    case "Sensor":
      return SWITCH.test(n) ? "SW" : REF_PREFIX.Sensor;
    case "Connector & mech":
      if (SWITCH.test(n)) return "SW";
      return HARDWARE.test(n) && !CONNECTOR.test(n) ? "H" : "J";
    case "Passive":
      return byName(PASSIVE, n) ?? byName(BY_NAME, n) ?? "R";
    case "Power Management":
      if (isChargePort(part)) return "J";
      return byName(BY_NAME, n) ?? "U";
    default:
      return byName(BY_NAME, n) ?? REF_PREFIX[part.category] ?? "U";
  }
}

export type BomRow = {
  category: ConceptPartCategory;
  name: string;
  ref: string;
  qty: number;
};

export type Bom = {
  rows: BomRow[];
  unique: number;
  units: number;
  active: number;
  passives: number;
  connectors: number;
};

// A passive is never alone on a board — decoupling, dividers, pull-ups.
// 2–4 by position so the count is stable across renders. Anything else is as
// many as its own name says — "N20 gear motor (x2)", the count the spec
// sheet writes and the spec's size and draw already multiply in.
function qtyFor(part: ConceptPart, index: number): number {
  return part.category === "Passive" ? 2 + (index % 3) : qtyOf(part.name);
}

export function bomFor(job: ArtifactSource): Bom {
  const seen: Record<string, number> = {};
  const rows: BomRow[] = job.parts.map((part, i) => {
    const prefix = refPrefixOf(part);
    const qty = qtyFor(part, i);
    // Each unit a name counts is a part of its own on the schematic: four
    // motors are M1–M4, with the count in its own column, not "(x4)" left in
    // the name beside it. A passive's quantity is the board's estimate, not
    // a count the concept named, so it keeps one designator.
    const counted = part.category !== "Passive" && qty > 1;
    const first = (seen[prefix] ?? 0) + 1;
    seen[prefix] = first + (counted ? qty - 1 : 0);
    return {
      category: part.category,
      name: counted ? unitName(part.name) : part.name,
      ref: counted ? `${prefix}${first}–${prefix}${first + qty - 1}` : `${prefix}${first}`,
      qty,
    };
  });
  const passives = rows.filter((r) => r.category === "Passive").length;
  // Connectors and the mech hardware, by what each part is — its letter, J
  // or H — not the category it was filed under: a USB port filed under power
  // is a connector, and a switch filed with the connectors is not one.
  const connectors = rows.filter((r) => /^[JH]\d/.test(r.ref)).length;
  return {
    rows,
    unique: rows.length,
    units: rows.reduce((sum, r) => sum + r.qty, 0),
    active: rows.length - passives - connectors,
    passives,
    connectors,
  };
}

// ───────────────────────── what the maker changed ─────────────────────────

/** The parts a booked build carries that its concept didn't, by name. */
export type PartChanges = {
  removed: string[];
  added: string[];
  swapped: { from: string; to: string }[];
};

/** "TT gear motor (x2)" → "2 × TT gear motor"; a bare designator says what
 *  kind of part it is (readableName). */
function plainName(part: ConceptPart): string {
  const name = readableName(part);
  const n = qtyOf(part.name);
  return n === 1 ? name : `${n} × ${unitName(name)}`;
}

// A removed part and an added one in the same place are one part swapped:
// the chip, the pack, the port, the motors, their driver, the servos, what
// holds the product where it sits.
function slotOf(p: ConceptPart): string | null {
  if (isMcu(p)) return "mcu";
  if (isBatteryPart(p)) return "pack";
  if (isChargePort(p)) return "port";
  if (isMotorDriver(p)) return "driver";
  if (isDriveMotor(p)) return "motor";
  if (isServo(p)) return "servo";
  if (isMounting(p)) return "mounting";
  return null;
}

/** What a booked build changed from its concept's parts — what the maker
 *  took out, put in and swapped on the sheet, read off the BOM that was
 *  built. Null for a build older than spec booking (nothing to compare), and
 *  for one with no part edit: the parts it carries differ from the
 *  concept's only by the pack and port the rules picked, which are not the
 *  maker's changes. The pack counts when the maker picked it.
 *
 *  `concept` is the concept the build was drawn from — its own parts, before
 *  any edit, and its hints for the pack it would have had. */
export function partChangesOf(
  job: ArtifactSource,
  concept: { parts: ConceptPart[]; hints?: AiHints },
): PartChanges | null {
  const spec = bookedSpec(job);
  if (!spec) return null;
  const pickedPack = spec.batterySource === "you";
  if (!Object.keys(spec.choices ?? {}).length && !pickedPack) return null;

  // The concept as it would have been built with no edit — the same pack
  // unless the maker picked this one — so the difference is theirs.
  const pack = pickedPack ? deriveSpec(concept.parts, concept.hints).battery : spec.battery;
  const before = partsForBuild(concept.parts, pack);
  const after = job.parts;

  // A new radio is said as the radio, in the sheet's word for it, not as
  // the module that came and went with it — and an ESP32 set to ESP-NOW
  // changed no part's name at all.
  const radioFrom = radioOf(before);
  const radioTo = radioOf(after);
  const radioMoved = radioFrom !== radioTo;
  const listed = (p: ConceptPart) => !(radioMoved && isRadioPart(p));

  const key = (p: ConceptPart) => p.name.trim().toLowerCase();
  const left = before.filter(listed);
  const added: ConceptPart[] = [];
  for (const part of after.filter(listed)) {
    const i = left.findIndex((p) => key(p) === key(part));
    if (i >= 0) left.splice(i, 1);
    else added.push(part);
  }

  const changes: PartChanges = { removed: [], added: [], swapped: [] };
  for (const part of left) {
    const slot = slotOf(part);
    const j = slot ? added.findIndex((p) => slotOf(p) === slot) : -1;
    if (j >= 0) {
      changes.swapped.push({ from: plainName(part), to: plainName(added[j]) });
      added.splice(j, 1);
    } else {
      changes.removed.push(plainName(part));
    }
  }
  changes.added = added.map(plainName);
  if (radioMoved) {
    if (radioFrom && radioTo) changes.swapped.push({ from: radioFrom, to: radioTo });
    else if (radioFrom) changes.removed.push(radioFrom);
    else if (radioTo) changes.added.push(radioTo);
  }
  const any = changes.removed.length + changes.added.length + changes.swapped.length > 0;
  return any ? changes : null;
}

/** "removed Piezo buzzer · added Status LED · swapped ESP32 → ESP32-C3". */
export function partChangesText(c: PartChanges): string {
  return [
    c.removed.length ? `removed ${c.removed.join(", ")}` : "",
    c.added.length ? `added ${c.added.join(", ")}` : "",
    c.swapped.length ? `swapped ${c.swapped.map((s) => `${s.from} → ${s.to}`).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export type NetNode = { id: string; label: string };
export type NetWire = {
  from: string;
  to: string;
  label: string;
  cls: "power" | "ground" | "signal";
};
export type Nets = {
  nodes: NetNode[];
  wires: NetWire[];
  nets: number;
  connections: number;
  classes: number;
};

const GND_NODE: NetNode = { id: "GND", label: "Ground" };

/** Wired to nothing: the hardware that holds or seals the product (H) —
 *  its feet, screws, gasket, printed body — and the adapter it ships with
 *  (PS), which plugs into its jack. */
const offBoard = (ref: string) => /^(?:H|PS)\d/.test(ref);

export function netsFor(job: ArtifactSource): Nets {
  const bom = bomFor(job);
  const placed = bom.rows
    .map((row, i) => ({ row, part: job.parts[i] }))
    .filter(({ row }) => !offBoard(row.ref));
  const rows = placed.map(({ row }) => row);
  const nodes: NetNode[] = rows.map((r) => ({ id: r.ref, label: r.name }));
  const at = (c: ConceptPartCategory) => rows.filter((r) => r.category === c);
  const mcu = at("Microcontroller")[0];
  // A port filed under power is where the power comes in, not what drops it.
  const regulator = at("Power Management").find((r) => !/^J\d/.test(r.ref));
  // The power comes in by the product's charge port — a USB socket, a
  // barrel jack — else by its first connector, else from its pack. The
  // first "Connector & mech" row used to be taken, and that was as often a
  // rubber foot or a printed plate, drawn feeding VBUS.
  const connector =
    placed.find(({ part }) => isChargePort(part))?.row ?? rows.find((r) => /^J\d/.test(r.ref));
  const pack = rows.find((r) => /^BT\d/.test(r.ref));
  const inlet = connector
    ? { ref: connector.ref, label: "VBUS 5V" }
    : pack
      ? { ref: pack.ref, label: "VBAT" }
      : null;
  const sensors = at("Sensor");
  const actuators = [...at("Actuator"), ...at("Display & I/O")];

  const wires: NetWire[] = [];
  const power = (from: string, to: string, label: string) =>
    wires.push({ from, to, label, cls: "power" });
  const signal = (from: string, to: string, label: string) =>
    wires.push({ from, to, label, cls: "signal" });

  // Rail: USB-C brings VBUS in (or the pack VBAT), the regulator drops it
  // to 3V3, the MCU and sensors run off 3V3, LED strips and the like off
  // the rail that comes in.
  if (inlet && regulator && inlet.ref !== regulator.ref) power(inlet.ref, regulator.ref, inlet.label);
  if (regulator && mcu) power(regulator.ref, mcu.ref, "3V3");
  for (const s of sensors) {
    if (regulator) power(regulator.ref, s.ref, "3V3");
  }
  for (const a of actuators) {
    if (inlet) power(inlet.ref, a.ref, inlet.label);
  }

  // Ground is the one net every part sits on.
  for (const node of nodes) {
    wires.push({ from: node.id, to: GND_NODE.id, label: "GND", cls: "ground" });
  }

  // Signals: I²C out to the sensors, a data line out to each actuator.
  if (mcu && sensors.length) {
    for (const s of sensors) {
      signal(mcu.ref, s.ref, "SDA");
      signal(mcu.ref, s.ref, "SCL");
    }
  }
  if (mcu) {
    for (const a of actuators) signal(mcu.ref, a.ref, "DIN");
  }

  const labels = new Set(wires.map((w) => w.label));
  const classes = new Set(wires.map((w) => w.cls));
  return {
    nodes: [...nodes, GND_NODE],
    wires,
    nets: labels.size,
    connections: wires.length,
    classes: classes.size,
  };
}

export type Firmware = { filename: string; lines: string[] };

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// A C identifier for the part. A name that starts with a digit ("74HC595",
// "2N2222") would slug to an illegal macro name, so it gets a prefix.
function symbolFor(name: string): string {
  const symbol = slug(name).toUpperCase() || "PART";
  return /^[0-9]/.test(symbol) ? `P_${symbol}` : symbol;
}

// The library each part family needs, so the sketch compiles against
// the parts the BOM actually lists. The radio is not a family: its library
// comes from what the product talks over (`radioIncludes`).
const INCLUDE_FOR: Partial<Record<ConceptPartCategory, string>> = {
  Sensor: "#include <Wire.h>",
  Actuator: "#include <Adafruit_NeoPixel.h>",
  "Display & I/O": "#include <U8g2lib.h>",
};

// The libraries for the radio the product uses, read off the parts as built
// (catalog.ts `radioKeyOf`): the radio the maker set on the MCU's die, or
// the module that carries it. Any Connectivity part — or just an ESP32,
// which has Wi-Fi on its die — used to bring in WiFi.h, so an ESP32 set to
// LoRa or BLE compiled against the Wi-Fi stack it doesn't use. Zigbee and
// cellular modules talk AT over a serial port, and a chip with its radio
// off talks over nothing: no library for either.
function radioIncludes(parts: ConceptPart[]): string[] {
  const mcu = parts.find((p) => p.category === "Microcontroller");
  const chip = (mcu?.name ?? "").toLowerCase();
  // The ESP8266 core names its Wi-Fi and ESP-NOW headers after itself.
  const esp8266 = /esp8266|esp-?12|esp-?01/.test(chip);
  switch (radioKeyOf(parts)) {
    case "wifi":
      return [esp8266 ? "#include <ESP8266WiFi.h>" : "#include <WiFi.h>"];
    case "esp-now":
      return esp8266
        ? ["#include <ESP8266WiFi.h>", "#include <espnow.h>"]
        : ["#include <WiFi.h>", "#include <esp_now.h>"];
    case "ble":
      if (/esp32/.test(chip)) {
        return ["#include <BLEDevice.h>", "#include <BLEServer.h>", "#include <BLEUtils.h>"];
      }
      return [/nrf52/.test(chip) ? "#include <bluefruit.h>" : "#include <ArduinoBLE.h>"];
    case "lora":
      return ["#include <SPI.h>", "#include <LoRa.h>"];
    case "nrf24":
      return ["#include <SPI.h>", "#include <RF24.h>"];
    default:
      return [];
  }
}

// Parts the firmware addresses: regulators, passives and connectors
// carry no pin, so they get no define. Neither does the microcontroller
// — it is the thing running this sketch, not something wired to a pin
// on it.
const UNADDRESSED: ConceptPartCategory[] = [
  "Microcontroller",
  "Power Management",
  "Passive",
  "Connector & mech",
];

export function firmwareFor(job: ArtifactSource): Firmware {
  const base = slug(job.title).split("_").filter(Boolean).slice(0, 3).join("_");
  const filename = `${base || "firmware"}.ino`;

  const includes = ["#include <Arduino.h>"];
  for (const inc of [
    ...job.parts.map((part) => INCLUDE_FOR[part.category]),
    ...radioIncludes(job.parts),
  ]) {
    if (inc && !includes.includes(inc)) includes.push(inc);
  }

  const addressed = job.parts.filter(
    (p) => !UNADDRESSED.includes(p.category),
  );
  // A pin for each unit: four motors are four pins, not one
  // TT_GEAR_MOTOR_X4_PIN for all of them.
  const units = addressed.flatMap((part) => {
    const n = qtyOf(part.name);
    if (n === 1) return [{ part, symbol: symbolFor(part.name), label: part.name }];
    const name = unitName(part.name);
    return Array.from({ length: n }, (_, k) => ({
      part,
      symbol: `${symbolFor(name)}_${k + 1}`,
      label: `${name} ${k + 1} of ${n}`,
    }));
  });
  const defines = units.map(
    (unit, i) => `#define ${unit.symbol}_PIN ${i + 2}`,
  );

  const setup = ["void setup() {", "  Serial.begin(115200);"];
  // One bus, one Wire.begin() — however many sensors sit on it.
  if (addressed.some((p) => p.category === "Sensor")) {
    setup.push("  Wire.begin();");
  }
  for (const { part, symbol, label } of units) {
    const pin = `${symbol}_PIN`;
    setup.push(
      part.category === "Sensor"
        ? `  pinMode(${pin}, INPUT);  // ${label} interrupt line`
        : `  pinMode(${pin}, OUTPUT);  // ${label}`,
    );
  }
  setup.push("}");

  const loop = ["void loop() {"];
  for (const part of addressed) {
    loop.push(`  // TODO: ${part.role || part.name}`);
  }
  loop.push("  delay(20);", "}");

  return {
    filename,
    lines: [
      ...includes,
      "",
      "// pins match the PCB layout in the previous tab",
      ...defines,
      "",
      ...setup,
      "",
      ...loop,
    ],
  };
}

// widthMm/heightMm/partCount used to live here too — the board's size worked
// out from the spec's own footprints (lib/spec/derive.ts). PcbPreview's
// caption switched to boardLabel(specOfSource(job)) and stopped reading them,
// so they were dropped rather than kept write-only (code audit #3). Every
// board is drawn against the one fab profile (FAB_PROFILE, lib/spec/format.ts),
// so the layer count PcbPreview's aria-label reads is the literal 2, not a
// value worked out per build.

// ─────────────────────────── sample 3D model ───────────────────────────
//
// The bundled placeholder mesh lib/three/providers.ts's "demo" provider hands
// back when no image-to-3D key is configured (its exported SAMPLE_GLB). Every
// build lands on this exact URL in demo mode, so a preview or caption showing
// it is not a shape generated for this concept, and the review says so
// (e2e #3). The literal is duplicated rather than imported: providers.ts
// pulls in image-store.ts's `next/headers`, which this file — read by every
// client component that reviews a build — cannot carry into the browser.
export const SAMPLE_MODEL_URL = "/models/sample.glb";

export function isSampleModel(url: string | null | undefined): boolean {
  return url === SAMPLE_MODEL_URL;
}
