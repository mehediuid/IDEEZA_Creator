// Concept vocabulary shared by the client store (history.tsx) and the
// server route that produces it (/api/concept/summarize). It lives in
// its own module because history.tsx is a "use client" module — a route
// handler importing from it would get a client reference, not the
// function.

export type ConceptPartCategory =
  | "Microcontroller"
  | "Sensor"
  | "Actuator"
  | "Power Management"
  | "Display & I/O"
  | "Connectivity"
  | "Passive"
  | "Connector & mech";

export const CONCEPT_CATEGORIES: ConceptPartCategory[] = [
  "Microcontroller",
  "Sensor",
  "Actuator",
  "Power Management",
  "Display & I/O",
  "Connectivity",
  "Passive",
  "Connector & mech",
];

export type ConceptPart = {
  name: string;
  role: string;
  category: ConceptPartCategory;
};

export type ConceptSummary = {
  title: string;
  summary: string;
  parts: ConceptPart[];
};

export function deriveTitle(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 56) return trimmed || "Untitled concept";
  return `${trimmed.slice(0, 56)}…`;
}

// The summary line every surface shows under the title: the parts, in
// order, separated by a middle dot.
export function summaryFromParts(parts: ConceptPart[]): string {
  return parts.map((p) => p.name).join(" · ");
}

// Words that carry no signal when guessing what the project senses.
const STOP_WORDS = new Set([
  "a", "an", "the", "my", "our", "this", "that", "with", "and", "for",
  "build", "make", "create", "design", "want", "need", "please", "using",
  "use", "small", "simple", "smart", "little", "project", "device",
  "system", "gadget", "prototype", "i", "it", "to", "of", "on", "in",
]);

// First meaningful word of the prompt — used to name the fallback
// sensor so the offline concept still reads like the user's idea.
export function firstNoun(prompt: string): string {
  for (const raw of prompt.toLowerCase().split(/[^a-z0-9-]+/)) {
    const word = raw.trim();
    if (word.length < 3) continue;
    if (STOP_WORDS.has(word)) continue;
    return word;
  }
  return "ambient";
}

// What we return when the model is unreachable or answers with
// something we can't parse: a real, buildable four-part concept rather
// than an empty shell.
export function fallbackConcept(prompt: string): ConceptSummary {
  const noun = firstNoun(prompt);
  const parts: ConceptPart[] = [
    {
      name: "ESP32",
      role: "Runs the firmware and talks to the sensor",
      category: "Microcontroller",
    },
    {
      name: "USB-C connector",
      role: "Power and programming",
      category: "Connector & mech",
    },
    {
      name: "3V3 LDO",
      role: "Regulates 5V from USB down to 3.3V",
      category: "Power Management",
    },
    {
      name: `${noun.charAt(0).toUpperCase()}${noun.slice(1)} sensor`,
      role: `Reads the ${noun} the project reacts to`,
      category: "Sensor",
    },
  ];
  return {
    title: deriveTitle(prompt),
    summary: summaryFromParts(parts),
    parts,
  };
}

// Words a model reaches for instead of our category names. Everything
// here is a synonym we are confident about — the point is to recognise
// what the model meant, never to guess. An unrecognised word means the
// payload isn't understood, and the caller falls back rather than
// filing an MCU under "Passive".
const CATEGORY_SYNONYMS: Record<string, ConceptPartCategory> = {
  mcu: "Microcontroller",
  microcontroller: "Microcontroller",
  soc: "Microcontroller",
  sensor: "Sensor",
  led: "Actuator",
  motor: "Actuator",
  relay: "Actuator",
  actuator: "Actuator",
  strip: "Actuator",
  power: "Power Management",
  regulator: "Power Management",
  ldo: "Power Management",
  battery: "Power Management",
  charger: "Power Management",
  display: "Display & I/O",
  screen: "Display & I/O",
  button: "Display & I/O",
  switch: "Display & I/O",
  io: "Display & I/O",
  wifi: "Connectivity",
  ble: "Connectivity",
  radio: "Connectivity",
  connectivity: "Connectivity",
  resistor: "Passive",
  capacitor: "Passive",
  passive: "Passive",
  connector: "Connector & mech",
  enclosure: "Connector & mech",
  mech: "Connector & mech",
  mounting: "Connector & mech",
};

// Maps whatever the model wrote in `category` onto one of ours, or null
// when we don't recognise it.
export function normalizeCategory(raw: unknown): ConceptPartCategory | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text) return null;
  const exact = CONCEPT_CATEGORIES.find(
    (c) => c.toLowerCase() === text.toLowerCase(),
  );
  if (exact) return exact;
  return CATEGORY_SYNONYMS[text.toLowerCase()] ?? null;
}

// Shape-checks whatever the model returned. Returns null when the
// payload isn't a usable concept, so the caller can fall back.
export function parseConcept(
  raw: unknown,
  prompt: string,
): ConceptSummary | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as { title?: unknown; parts?: unknown };
  if (!Array.isArray(obj.parts)) return null;
  const parts: ConceptPart[] = [];
  for (const entry of obj.parts) {
    if (typeof entry !== "object" || entry === null) continue;
    const p = entry as { name?: unknown; role?: unknown; category?: unknown };
    const name = String(p.name ?? "").trim();
    if (!name) continue;
    const category = normalizeCategory(p.category);
    // A category we can't place means we don't actually know what this
    // part is — and every deliverable downstream (ref designator, rail,
    // include, pin) is derived from it. Treat the whole payload as
    // unparseable so the caller uses the deterministic fallback.
    if (!category) return null;
    parts.push({
      name: name.slice(0, 48),
      role: String(p.role ?? "").trim().slice(0, 120),
      category,
    });
  }
  if (parts.length < 2) return null;
  const title = String(obj.title ?? "").trim();
  return {
    title: title ? title.slice(0, 40) : deriveTitle(prompt),
    summary: summaryFromParts(parts.slice(0, 6)),
    parts: parts.slice(0, 6),
  };
}
