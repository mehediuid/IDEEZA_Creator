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

// A handful of the keyword table's trigger words are ordinary English words
// as often as they're a real signal — "ring" is as likely a ring light as a
// wearable, "drive" as likely a USB drive as wheels, "arm" as likely a
// forearm as a robot's. Firing on these alone over-fits the stand-in, so
// each needs a companion word from its own kind of prompt before it counts;
// the unambiguous words beside them (collar, motor, servo…) still fire
// alone. Match position for these is the ambiguous word's own site, or the
// companion's when the companion reads first — both land the rule at
// roughly where the maker's own words for the idea are.
const WEARABLE_CONTEXT = "wear\\w*|wrist\\w*|finger\\w*|smart";
const WEARABLE_AMBIGUOUS = "band|ring|watch";
const ROBOT_ARM_CONTEXT = "robot\\w*|claw|gripper|joint";
const STORAGE_DRIVE = "usb|flash|hard|thumb|disk|ssd|external";

// The wearable/battery rule below and matchedUseCases' "wearable" tag both
// read this same signal — one function, so a prompt can't be a wearable
// battery-wise but not use-case-wise or the other way round.
const WEARABLE_SIGNAL = new RegExp(
  `\\b(?:collar|wearable|portable)\\b` +
    `|\\b(?:${WEARABLE_AMBIGUOUS})\\b(?=[\\s\\S]*\\b(?:${WEARABLE_CONTEXT})\\b)` +
    `|\\b(?:${WEARABLE_CONTEXT})\\b(?=[\\s\\S]*\\b(?:${WEARABLE_AMBIGUOUS})\\b)`,
  "i",
);
// Same idea, narrower: the use-case tag doesn't read "portable" or a runtime
// word ("lasts", "battery", "a week") as "wearable" — those need a pack, not
// necessarily a body to be worn on.
const WEARABLE_USE_CASE = new RegExp(
  `\\b(?:collar|wearable)\\b` +
    `|\\b(?:${WEARABLE_AMBIGUOUS})\\b(?=[\\s\\S]*\\b(?:${WEARABLE_CONTEXT})\\b)` +
    `|\\b(?:${WEARABLE_CONTEXT})\\b(?=[\\s\\S]*\\b(?:${WEARABLE_AMBIGUOUS})\\b)`,
  "i",
);
const MOTOR_TRIGGER = new RegExp(
  `\\b(?:motor|car|wheels?)\\b|(?<!\\b(?:${STORAGE_DRIVE})[\\s-])\\bdrive\\b`,
  "i",
);
const ARM_TRIGGER = new RegExp(
  `\\bservo\\b|\\barm\\b(?=[\\s\\S]*\\b(?:${ROBOT_ARM_CONTEXT})\\b)|\\b(?:${ROBOT_ARM_CONTEXT})\\b(?=[\\s\\S]*\\barm\\b)`,
  "i",
);

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
    // metre of LED strip instead of the bulb a lamp or fixture means. The
    // single fixture is sized to a 1 W LED (I3): the stand-in's own USB
    // power budget is 500 mA, and a full 3 W "high-power" emitter alone
    // draws 811 mA of it — no plausible stand-in should already be over
    // budget before the maker changes anything.
    trigger: /\b(?:lamp|light|leds?|glow\w*)\b/i,
    parts: (p) =>
      /\bstrip\b/i.test(p)
        ? [{ name: "LED strip", role: "Lights the surface the product illuminates", category: "Actuator" }]
        : [{ name: "1W LED", role: "Gives the product its light output", category: "Actuator" }],
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
    // Minor 16: "drive" alone also names a USB/flash/hard drive, which gets
    // no motor at all — the trigger fires on "drive" only when it isn't
    // sitting right after one of those storage words.
    trigger: MOTOR_TRIGGER,
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
      // I3: four brushless motors draw well past what any 1S pack — or a
      // USB/adapter answer — can supply; naming the 2S pack directly here
      // (read by listedBattery, same as a maker's own words) is what keeps
      // the stand-in's own derived spec inside its battery's budget.
      {
        name: "2S LiPo battery",
        role: "Supplies the current four motors draw at once",
        category: "Power Management",
      },
    ],
  },
  {
    // Minor 16: "arm" alone also names a forearm ("worn on your arm"), which
    // gets no servo — a robotic arm needs a companion word (robot/claw/
    // gripper/joint) for the trigger to fire; "servo" on its own still does.
    trigger: ARM_TRIGGER,
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
    // that wins and the product stays USB/adapter powered. Minor 16: "band",
    // "ring" and "watch" only count as the wearable half of that with a
    // wearable word (wear/wrist/finger/smart) somewhere in the same prompt —
    // alone they as often mean a rubber band, a ring light or "watch the
    // door" as a wrist-worn product.
    trigger: new RegExp(
      String.raw`\b(?:lasts?|batter(?:y|ies)|weeks?|days?|hours?|hrs?)\b|${WEARABLE_SIGNAL.source}`,
      "i",
    ),
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
  // Minor 16: same tightened wearable signal as the battery-add rule above —
  // "band"/"ring"/"watch" need a wearable word nearby, "collar"/"wearable"
  // don't.
  [WEARABLE_USE_CASE, "wearable"],
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

// A companion's own prompt is "{companion.name} for {parent prompt}"
// (concept-chat.tsx) — a plate ordered alongside an RC car arrives as
// "Ground Standing Plate for rc car". Judging *that whole string* for what
// electronics to add would read the parent's own words as the product's:
// "car" alone trips the motor rule, and the plate would come back with a
// gear motor it never asked for. So the mechanical check below judges only
// the text before " for " — the product's own name — never the parent's.
function productNamePart(prompt: string): string {
  const idx = prompt.search(/\bfor\b/i);
  const head = idx === -1 ? prompt : prompt.slice(0, idx);
  return head.trim() || prompt.trim();
}

// A passive, mechanical companion — a plate, a stand, a bracket, a case —
// has nothing to power and nothing to run firmware on, so it must never
// inherit the ESP32/USB-C/LDO trio every other stand-in starts from. "dock"
// is the one word here that cuts both ways: a plain dock is a mechanical
// cradle, but a *charging* dock is the electronics that charge something
// else, so "charging dock" is excluded from this list on purpose.
const MECHANICAL_NAME = new RegExp(
  String.raw`\b(?:plate|stand|base|mount|bracket|holder|case|cover|lid|shell|bag|pouch|strap|tray|rack|frame|skin)\b` +
    String.raw`|(?<!\bcharging\s+)\bdock\b`,
  "i",
);

/** True only when the product's own name (never the parent's, for a
 *  companion prompt) both names a mechanical/passive product and matches
 *  none of the electronic keyword table — a "Sensor Mount" still gets its
 *  sensor; a "Ground Standing Plate" does not get a car's motor. */
function mechanicalName(prompt: string): string | null {
  const name = productNamePart(prompt);
  if (!MECHANICAL_NAME.test(name)) return null;
  if (fallbackPartsFromPrompt(name).length > 0) return null;
  return name;
}

// Which hardware a mechanical stand-in's body needs, read off the same name
// used to classify it — a stand or a plate sits on a surface and wants
// feet, a mount or a bracket fastens with screws, a case or a lid closes
// with magnets. A bag, pouch, strap or skin gets no added hardware: the
// body line alone already says what it is.
function mechanicalExtras(name: string): ConceptPart[] {
  if (/\b(?:plate|stand|base)\b/i.test(name)) {
    return [
      { name: "Rubber feet", role: "Grips the surface the product sits on", category: "Connector & mech" },
    ];
  }
  if (/\b(?:mount|bracket|holder|rack|frame)\b/i.test(name) || /(?<!\bcharging\s+)\bdock\b/i.test(name)) {
    return [
      { name: "M3 screws", role: "Fastens the product to what it mounts on", category: "Connector & mech" },
    ];
  }
  if (/\b(?:case|cover|lid|shell|tray)\b/i.test(name)) {
    return [{ name: "Magnets", role: "Holds the product closed", category: "Connector & mech" }];
  }
  return [];
}

/** The mechanical stand-in: a printed body plus whatever hardware its own
 *  name calls for, all "Connector & mech" — no MCU, no power, no radio.
 *  Hints carry only a use case (read off the product's own name too), never
 *  a runtime goal or a battery hint, because nothing here draws current. */
function mechanicalFallbackConcept(prompt: string, name: string): ConceptSummary {
  const parts: ConceptPart[] = [
    { name: `${name} body (printed)`, role: "The product's own printed structure", category: "Connector & mech" },
    ...mechanicalExtras(name),
  ];
  const useCase = matchedUseCases(name.toLowerCase());
  return {
    title: deriveTitle(prompt),
    summary: summaryFromParts(parts),
    description: describeFallback(prompt),
    parts,
    ...(useCase.length ? { hints: { useCase } } : {}),
    fallback: true,
  };
}

// What we return when the model is unreachable or answers with
// something we can't parse: a real, buildable concept built from what the
// prompt actually asked for, rather than an empty shell or a generic box
// with the same four parts every time. Every use of it stands in for a
// model answer, so it is marked as one here rather than at each caller.
export function fallbackConcept(prompt: string): ConceptSummary {
  const mechanical = mechanicalName(prompt);
  if (mechanical) return mechanicalFallbackConcept(prompt, mechanical);
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
