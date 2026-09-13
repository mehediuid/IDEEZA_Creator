// Deliverable content, derived from the concept's parts list.
//
// Everything here is pure and deterministic: the same job always
// produces the same BOM, the same netlist, the same firmware. That's
// what lets the review tabs, the chat cards and the exported files all
// describe one build instead of three plausible-looking inventions.

import type { ConceptPart, ConceptPartCategory } from "./concept";

// The fields these builders read. BuildJob satisfies it; a fixture
// doesn't have to carry the whole job to be summarised.
export type ArtifactSource = {
  title: string;
  parts: ConceptPart[];
};

// Reference designator per category, the way a schematic names them:
// ICs (MCU, regulators, radios) are U, sensors S, actuators and
// indicators D, displays DSP, connectors and mechanics J, passives R.
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
// 2–4 by position so the count is stable across renders.
function qtyFor(category: ConceptPartCategory, index: number): number {
  return category === "Passive" ? 2 + (index % 3) : 1;
}

export function bomFor(job: ArtifactSource): Bom {
  const seen: Record<string, number> = {};
  const rows: BomRow[] = job.parts.map((part, i) => {
    const prefix = REF_PREFIX[part.category] ?? "U";
    seen[prefix] = (seen[prefix] ?? 0) + 1;
    return {
      category: part.category,
      name: part.name,
      ref: `${prefix}${seen[prefix]}`,
      qty: qtyFor(part.category, i),
    };
  });
  const passives = rows.filter((r) => r.category === "Passive").length;
  const connectors = rows.filter(
    (r) => r.category === "Connector & mech",
  ).length;
  return {
    rows,
    unique: rows.length,
    units: rows.reduce((sum, r) => sum + r.qty, 0),
    active: rows.length - passives - connectors,
    passives,
    connectors,
  };
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

export function netsFor(job: ArtifactSource): Nets {
  const bom = bomFor(job);
  const nodes: NetNode[] = bom.rows.map((r) => ({ id: r.ref, label: r.name }));
  const at = (c: ConceptPartCategory) =>
    bom.rows.filter((r) => r.category === c);
  const mcu = at("Microcontroller")[0];
  const regulator = at("Power Management")[0];
  const connector = at("Connector & mech")[0];
  const sensors = at("Sensor");
  const actuators = [...at("Actuator"), ...at("Display & I/O")];

  const wires: NetWire[] = [];
  const power = (from: string, to: string, label: string) =>
    wires.push({ from, to, label, cls: "power" });
  const signal = (from: string, to: string, label: string) =>
    wires.push({ from, to, label, cls: "signal" });

  // Rail: USB-C brings VBUS in, the regulator drops it to 3V3, the MCU
  // and sensors run off 3V3, LED strips and the like off VBUS.
  if (connector && regulator) power(connector.ref, regulator.ref, "VBUS 5V");
  if (regulator && mcu) power(regulator.ref, mcu.ref, "3V3");
  for (const s of sensors) {
    if (regulator) power(regulator.ref, s.ref, "3V3");
  }
  for (const a of actuators) {
    if (connector) power(connector.ref, a.ref, "VBUS 5V");
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

function symbolFor(name: string): string {
  return slug(name).toUpperCase() || "PART";
}

// The library each part family needs, so the sketch compiles against
// the parts the BOM actually lists.
const INCLUDE_FOR: Partial<Record<ConceptPartCategory, string>> = {
  Sensor: "#include <Wire.h>",
  Actuator: "#include <Adafruit_NeoPixel.h>",
  "Display & I/O": "#include <U8g2lib.h>",
  Connectivity: "#include <WiFi.h>",
};

// Parts the firmware addresses: regulators, passives and connectors
// carry no pin, so they get no define.
const UNADDRESSED: ConceptPartCategory[] = [
  "Power Management",
  "Passive",
  "Connector & mech",
];

export function firmwareFor(job: ArtifactSource): Firmware {
  const base = slug(job.title).split("_").filter(Boolean).slice(0, 3).join("_");
  const filename = `${base || "firmware"}.ino`;

  const includes = ["#include <Arduino.h>"];
  for (const part of job.parts) {
    const inc = INCLUDE_FOR[part.category];
    if (inc && !includes.includes(inc)) includes.push(inc);
  }

  const addressed = job.parts.filter(
    (p) => !UNADDRESSED.includes(p.category),
  );
  const defines = addressed.map(
    (part, i) => `#define ${symbolFor(part.name)}_PIN ${i + 2}`,
  );

  const setup = ["void setup() {", "  Serial.begin(115200);"];
  for (const part of addressed) {
    const pin = `${symbolFor(part.name)}_PIN`;
    setup.push(
      part.category === "Sensor"
        ? `  Wire.begin();  // ${part.name} on ${pin}`
        : `  pinMode(${pin}, OUTPUT);  // ${part.name}`,
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

export type PcbMeta = {
  layers: 2;
  widthMm: number;
  heightMm: number;
  partCount: number;
};

export function pcbMetaFor(job: ArtifactSource): PcbMeta {
  const bom = bomFor(job);
  return {
    layers: 2,
    widthMm: 32 + 4 * bom.unique,
    heightMm: 24 + 2 * bom.unique,
    partCount: bom.unique,
  };
}
