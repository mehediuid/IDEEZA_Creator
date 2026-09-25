// Concept vocabulary shared by the client store (history.tsx) and the
// server route that produces it (/api/concept/summarize). It lives in
// its own module because history.tsx is a "use client" module — a route
// handler importing from it would get a client reference, not the
// function.

import { parseHints } from "../spec/hints";
import type { AiHints, UseCase } from "../spec/types";

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
  /** What the model suggested for the spec sheet — battery, material, where
   *  it is used. Checked on arrival; absent when the model gave nothing
   *  usable, and then the spec's rules decide. */
  hints?: AiHints;
  /** The model didn't answer, so these are `fallbackConcept`'s generic parts
   *  standing in. Kept on the turn so the card can say so, but never taken
   *  as the reading: the next caller asks again. */
  fallback?: true;
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

// The base every stand-in concept starts from — a real, buildable
// microcontroller-plus-power trio, unchanged since before the keyword table
// below existed. Kept as its own constant so `fallbackConcept` reads as
// "base, then what the prompt asked for" rather than a wall of literals.
const FALLBACK_BASE: ConceptPart[] = [
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
];

const FALLBACK_PART_CAP = 6;

// A word the maker typed, matched to a real part with a real name, role and
// category. This exists because the fallback concept is what most makers
// actually see — the text model often doesn't answer in time, and until
// this table, every prompt got the same USB-powered box with a "<first
// noun> sensor" bolted on, whatever the maker actually asked for.
//
// Each rule's `trigger` is tested against the whole prompt; a rule that
// matches contributes its part(s) at the position of its first match, so
// the parts a prompt gets back come out in the order the maker mentioned
// them (checked with `String.prototype.search`, which reports the leftmost
// match regardless of the rule's own word order).
//
// Bluetooth/BLE/"phone app" words are deliberately not a rule here: the
// ESP32 already in FALLBACK_BASE has BLE on chip, so matching those words
// would add a second, redundant radio rather than a real part.
type FallbackRule = {
  trigger: RegExp;
  parts: (promptLower: string) => ConceptPart[];
};

const FALLBACK_RULES: FallbackRule[] = [
  {
    trigger: /\b(?:gps|tracker|location)\b/i,
    parts: () => [
      { name: "NEO-6M GPS module", role: "Gets the fix the firmware reports", category: "Connectivity" },
    ],
  },
  {
    // "strip" picked out over the single-fixture default only when the
    // maker's own word is there — otherwise every "light" would read as a
    // metre of LED strip instead of the bulb a lamp or fixture means.
    trigger: /\b(?:lamp|light|leds?|glow\w*)\b/i,
    parts: (p) =>
      /\bstrip\b/i.test(p)
        ? [{ name: "LED strip", role: "Lights the surface the product illuminates", category: "Actuator" }]
        : [{ name: "High-power LED", role: "Gives the product its light output", category: "Actuator" }],
  },
  {
    trigger: /\b(?:dimm\w*|brightness)\b/i,
    parts: () => [
      { name: "MOSFET PWM driver", role: "Dims the LED by switching its current", category: "Power Management" },
    ],
  },
  {
    trigger: /\btouch\w*\b/i,
    parts: () => [
      { name: "TTP223 touch sensor", role: "Reads the maker's touch as an on/off signal", category: "Sensor" },
    ],
  },
  {
    trigger: /\bbuttons?\b/i,
    parts: () => [
      { name: "Tactile button", role: "Gives the maker a physical control", category: "Display & I/O" },
    ],
  },
  {
    trigger: /\b(?:screen|display)\b/i,
    parts: () => [
      { name: '0.96" OLED display', role: "Shows status and readings to the maker", category: "Display & I/O" },
    ],
  },
  {
    trigger: /\bcamera\b/i,
    parts: () => [{ name: "OV2640 camera", role: "Captures the image the product uses", category: "Sensor" }],
  },
  {
    trigger: /\bspeaker\b|\bsound\b|\balarm\b|\bbuzz\w*|\bbeep\w*/i,
    parts: (p) =>
      /\bspeaker\b/i.test(p)
        ? [{ name: "Speaker", role: "Plays audio back to the maker", category: "Actuator" }]
        : [{ name: "Buzzer", role: "Sounds the alert the product raises", category: "Actuator" }],
  },
  {
    trigger: /\b(?:temperature|thermo\w*)\b/i,
    parts: () => [
      {
        name: "DHT22 temperature and humidity sensor",
        role: "Reads the temperature and humidity around it",
        category: "Sensor",
      },
    ],
  },
  {
    trigger: /\b(?:soil|plant)\b/i,
    parts: () => [
      { name: "Capacitive soil moisture sensor", role: "Reads how wet the soil is", category: "Sensor" },
    ],
  },
  {
    trigger: /\b(?:motion|presence)\b/i,
    parts: () => [{ name: "PIR motion sensor", role: "Detects movement nearby", category: "Sensor" }],
  },
  {
    trigger: /\b(?:motor|car|wheels?|drive)\b/i,
    parts: () => [
      { name: "TT gear motor", role: "Turns the wheels the product drives on", category: "Actuator" },
      {
        name: "TB6612FNG motor driver",
        role: "Switches motor current the microcontroller can't supply directly",
        category: "Power Management",
      },
    ],
  },
  {
    trigger: /\b(?:drone|propellers?)\b/i,
    parts: () => [
      { name: "Brushless motors (x4)", role: "Spins the propellers that lift the drone", category: "Actuator" },
      { name: "4-in-1 ESC", role: "Drives all four motors from one board", category: "Power Management" },
    ],
  },
  {
    trigger: /\b(?:servo|arm)\b/i,
    parts: () => [{ name: "SG90 servo", role: "Moves the arm to the commanded angle", category: "Actuator" }],
  },
  {
    trigger: /\block\w*\b/i,
    parts: () => [
      {
        name: "Solenoid lock",
        role: "Locks and unlocks under the microcontroller's command",
        category: "Actuator",
      },
      { name: "Relay module", role: "Switches the lock's higher current safely", category: "Actuator" },
    ],
  },
  {
    // A product worn, carried, or stated to keep running untethered for a
    // stretch of time gets its own pack — unless the same prompt also names
    // a fixture that's plugged in (a desk lamp, a wall unit), in which case
    // that wins and the product stays USB/adapter powered.
    trigger: /\b(?:collar|wearable|band|ring|watch|portable|lasts?|batter(?:y|ies)|weeks?|days?|hours?|hrs?)\b/i,
    parts: (p) =>
      /\b(?:lamp|desk|wall|plug)\b/i.test(p)
        ? []
        : [
            { name: "1S Li-Po battery", role: "Powers the product without a cord", category: "Power Management" },
            { name: "TP4056 charger", role: "Recharges the battery over USB", category: "Power Management" },
          ],
  },
  {
    trigger: /\bcellular\b|\bsim\b/i,
    parts: () => [
      {
        name: "SIM800L GSM module",
        role: "Connects to the cellular network for data or SMS",
        category: "Connectivity",
      },
    ],
  },
  {
    trigger: /\blora\b|long[\s-]?range/i,
    parts: () => [
      { name: "SX1276 LoRa module", role: "Sends data over a long-range radio link", category: "Connectivity" },
    ],
  },
];

/** The keyword table's parts for a prompt: one entry per rule that matched,
 *  in the order the maker's words appear, with duplicate part names dropped
 *  (a base part, or two rules naming the same thing, wins only once). */
function fallbackPartsFromPrompt(prompt: string): ConceptPart[] {
  const promptLower = prompt.toLowerCase();
  const hits: { index: number; parts: ConceptPart[] }[] = [];
  for (const rule of FALLBACK_RULES) {
    const index = promptLower.search(rule.trigger);
    if (index === -1) continue;
    const parts = rule.parts(promptLower);
    if (parts.length) hits.push({ index, parts });
  }
  hits.sort((a, b) => a.index - b.index);
  const seen = new Set(FALLBACK_BASE.map((p) => p.name.toLowerCase()));
  const out: ConceptPart[] = [];
  for (const hit of hits) {
    for (const part of hit.parts) {
      const key = part.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(part);
    }
  }
  return out;
}

// Runtime words a maker uses instead of a number of hours — read the same
// way the keyword table reads parts, so "lasts a week" becomes a battery
// big enough to actually last one, not the rule's silent 1 h default.
function runtimeGoalFromPrompt(promptLower: string): number | undefined {
  const hours = promptLower.match(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/);
  if (hours) {
    const n = Number(hours[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (/\ba\s+week\b/.test(promptLower)) return 168;
  if (/\ba\s+day\b/.test(promptLower)) return 24;
  return undefined;
}

const FALLBACK_USE_CASE_RULES: [RegExp, UseCase][] = [
  [/\b(?:collar|wearable|band|ring|watch)\b/i, "wearable"],
  [/\b(?:outdoor|garden|weather|bike)\b/i, "outdoor"],
  [/\b(?:waterproof|aquarium)\b/i, "waterproof"],
  [/\b(?:handheld|remote)\b/i, "handheld"],
  [/\b(?:desk|lamp)\b/i, "desk"],
];

function matchedUseCases(promptLower: string): UseCase[] {
  const found: UseCase[] = [];
  for (const [trigger, useCase] of FALLBACK_USE_CASE_RULES) {
    if (trigger.test(promptLower)) found.push(useCase);
  }
  return [...new Set(found)];
}

/** What the fallback concept can tell the spec without a model: a runtime
 *  goal and a use case, read off the same words the parts table reads.
 *  Shaped exactly as `parseHints` accepts, but built directly rather than
 *  routed through it — these values are already known-good, not untrusted
 *  input to re-check. */
function fallbackHints(prompt: string): AiHints | undefined {
  const promptLower = prompt.toLowerCase();
  const out: AiHints = {};
  const goal = runtimeGoalFromPrompt(promptLower);
  if (goal !== undefined) out.runtimeGoalH = goal;
  const useCase = matchedUseCases(promptLower);
  if (useCase.length) out.useCase = useCase;
  return Object.keys(out).length ? out : undefined;
}

// What we return when the model is unreachable or answers with
// something we can't parse: a real, buildable concept built from what the
// prompt actually asked for, rather than an empty shell or a generic box
// with the same four parts every time. Every use of it stands in for a
// model answer, so it is marked as one here rather than at each caller.
export function fallbackConcept(prompt: string): ConceptSummary {
  const matched = fallbackPartsFromPrompt(prompt);
  let parts: ConceptPart[];
  if (matched.length) {
    parts = [...FALLBACK_BASE, ...matched.slice(0, FALLBACK_PART_CAP - FALLBACK_BASE.length)];
  } else {
    // Nothing in the prompt matched a real part — the same generic sensor
    // line the fallback has always used, named after the maker's own words
    // rather than inventing a part nobody asked for.
    const noun = firstNoun(prompt);
    parts = [
      ...FALLBACK_BASE,
      {
        name: `${noun.charAt(0).toUpperCase()}${noun.slice(1)} sensor`,
        role: `Reads the ${noun} the project reacts to`,
        category: "Sensor",
      },
    ];
  }
  const hints = fallbackHints(prompt);
  return {
    title: deriveTitle(prompt),
    summary: summaryFromParts(parts),
    description: describeFallback(prompt),
    parts,
    ...(hints ? { hints } : {}),
    fallback: true,
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
    spec?: unknown;
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
    ...(() => {
      const hints = parseHints(obj.spec);
      return hints ? { hints } : null;
    })(),
  };
}
