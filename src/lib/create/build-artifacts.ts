// Deliverable content, derived from the concept's parts list.
//
// Everything here is pure and deterministic: the same job always
// produces the same BOM, the same netlist, the same firmware. That's
// what lets the review tabs, the chat cards and the exported files all
// describe one build instead of three plausible-looking inventions.

import type { ConceptPart, ConceptPartCategory } from "./concept";
import { qtyOf } from "../spec/bodies";
import { deriveSpec } from "../spec/derive";
import type { ResolvedSpec } from "../spec/types";

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
// 2–4 by position so the count is stable across renders. Anything else is as
// many as its own name says — "N20 gear motor (x2)", the count the spec
// sheet writes and the spec's size and draw already multiply in.
function qtyFor(part: ConceptPart, index: number): number {
  return part.category === "Passive" ? 2 + (index % 3) : qtyOf(part.name);
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
      qty: qtyFor(part, i),
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

// A C identifier for the part. A name that starts with a digit ("74HC595",
// "2N2222") would slug to an illegal macro name, so it gets a prefix.
function symbolFor(name: string): string {
  const symbol = slug(name).toUpperCase() || "PART";
  return /^[0-9]/.test(symbol) ? `P_${symbol}` : symbol;
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
  // One bus, one Wire.begin() — however many sensors sit on it.
  if (addressed.some((p) => p.category === "Sensor")) {
    setup.push("  Wire.begin();");
  }
  for (const part of addressed) {
    const pin = `${symbolFor(part.name)}_PIN`;
    setup.push(
      part.category === "Sensor"
        ? `  pinMode(${pin}, INPUT);  // ${part.name} interrupt line`
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
