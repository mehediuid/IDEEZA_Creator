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
  /** The part names joined by " · ". Useful, but it is an inventory, not a
   *  description — which is why `description` exists beside it. */
  summary: string;
  /** One plain line saying what the product IS. The maker typed a prompt,
   *  not a product description, and every surface that lists a product
   *  needs something to put under its name. */
  description: string;
  parts: ConceptPart[];
};

/** What to say about a product when no model did. It repeats the maker's own
 *  words rather than inventing a claim about the product — the one thing a
 *  description here must never do is assert something nobody checked. */
export function describeFallback(prompt: string): string {
  const one = prompt.trim().replace(/\s+/g, " ").replace(/[.\s]+$/, "");
  const short = one.length > 120 ? `${one.slice(0, 120).trimEnd()}…` : one;
  return short ? `${short.charAt(0).toUpperCase()}${short.slice(1)}.` : "";
}

// What a maker types is a sentence about a system; what every surface here
// needs is the name of one product. "A camera drone with a handheld remote
// controller and a charging dock" was being shown as a product name, cut
// mid-word at 56 characters, as the heading of a card, a tab and a rail
// group — which is how "A camera drone with a handheld remote controller
// and a c…" ended up naming a product three times on one screen.
//
// So the fallback reads the head of the phrase instead of its whole length:
// the leading request ("build me", "I want") and article come off, the
// phrase stops at the first word that starts a second clause, and the rest
// is title-cased. It invents nothing — every word is the maker's own — it
// just stops at the point where the sentence stops being a name.
const TITLE_LEAD =
  /^(?:(?:please|can you|could you)\s+)?(?:(?:i\s+(?:want|need|would like)(?:\s+to)?)\s+)?(?:(?:build|make|create|design|generate|draw)(?:\s+me)?\s+)?(?:a|an|the|my|our)\s+/i;
const TITLE_STOP = new Set([
  "with", "and", "that", "which", "who", "plus", "using", "for", "so",
  "to", "featuring", "including", "but", "where", "when", "having",
]);

export function deriveTitle(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Untitled concept";

  const head = trimmed.replace(TITLE_LEAD, "").split(/[,;:.!?()–—]/)[0] ?? "";
  const words: string[] = [];
  for (const word of head.split(" ")) {
    if (!word) continue;
    if (TITLE_STOP.has(word.toLowerCase())) break;
    words.push(word);
    if (words.join(" ").length >= 40) break;
  }

  const name = words
    // An acronym the maker typed stays as they typed it: NFC, USB, LED.
    .map((w) => (w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

  if (name.length >= 3) return name.length > 48 ? `${name.slice(0, 48)}…` : name;
  // Nothing usable at the head — a bare "smart" or a single article — so
  // fall back to the words themselves rather than to a made-up noun.
  return trimmed.length <= 56 ? trimmed : `${trimmed.slice(0, 56)}…`;
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
    description: describeFallback(prompt),
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
  const obj = raw as {
    title?: unknown;
    description?: unknown;
    parts?: unknown;
  };
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
    // A long model title is shortened the way a prompt is — at the end of the
    // name, before "with …" — rather than cut mid-word ("…Automatic Brighteni").
    title: title ? (title.length > 40 ? deriveTitle(title) : title) : deriveTitle(prompt),
    description: (() => {
      const d = String(obj.description ?? "").trim();
      return d ? d.slice(0, 160) : describeFallback(prompt);
    })(),
    summary: summaryFromParts(parts.slice(0, 6)),
    parts: parts.slice(0, 6),
  };
}
