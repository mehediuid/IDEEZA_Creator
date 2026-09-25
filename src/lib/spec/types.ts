// The product spec sheet — what a build of a product will make, stated on its
// concept card before any credit moves (docs/superpowers/specs/2026-09-25-
// product-spec-sheet-design.md).
//
// Only decisions are stored: the model's hints ride the concept on its turn,
// the maker's edits ride the setup answer. Every number is derived from the
// parts on each render (derive.ts), so a size can never disagree with the
// parts it was worked out from.

export type Mm3 = { l: number; w: number; h: number };

export const MATERIALS = ["PLA", "PETG", "ASA", "TPU"] as const;
export type Material = (typeof MATERIALS)[number];

export const BATTERY_KEYS = [
  "none",
  "adapter",
  "li-1s-100",
  "li-1s-400",
  "li-1s-1000",
  "li-1s-2000",
  "li-2s-1500",
  "aa-2",
  "aa-4",
  "9v",
] as const;
export type BatteryKey = (typeof BATTERY_KEYS)[number];

export const USE_CASES = ["handheld", "outdoor", "waterproof", "wearable", "desk"] as const;
export type UseCase = (typeof USE_CASES)[number];

// The parts the sheet can put in — keys only; catalog.ts holds the part each
// key stands for. An edit stores the key, never the part's name, so renaming
// a part in the catalog can't strand an edit a maker already made.
export const MCU_KEYS = ["esp32", "esp32-c3", "rp2040", "atmega328p"] as const;
export type McuKey = (typeof MCU_KEYS)[number];

export const RADIO_KEYS = [
  "none",
  "wifi",
  "ble",
  "esp-now",
  "nrf24",
  "lora",
  "zigbee",
  "cellular",
] as const;
export type RadioKey = (typeof RADIO_KEYS)[number];

/** Motors that drive the product along — a servo is counted apart. */
export const MOTOR_KEYS = ["tt", "n20", "brushless", "28byj"] as const;
export type MotorKey = (typeof MOTOR_KEYS)[number];

export const SERVO_KEYS = ["sg90", "mg996r"] as const;
export type ServoKey = (typeof SERVO_KEYS)[number];

export const ADDABLE_KEYS = [
  "dht22",
  "pir",
  "gps",
  "imu",
  "ultrasonic",
  "light",
  "soil",
  "button",
  "joystick",
  "encoder",
  "touch",
  "oled",
  "tft",
  "eink",
  "led",
  "led-strip",
  "buzzer",
  "speaker",
  "relay",
] as const;
export type AddableKey = (typeof ADDABLE_KEYS)[number];

export const CHARGE_PORT_KEYS = ["usb-c", "micro-usb", "barrel", "none"] as const;
export type ChargePortKey = (typeof CHARGE_PORT_KEYS)[number];

export const MOUNTING_KEYS = ["rubber-feet", "screws", "magnets"] as const;
export type MountingKey = (typeof MOUNTING_KEYS)[number];

export const ENVIRONMENT_KEYS = ["indoor", "splash-proof", "waterproof"] as const;
export type EnvironmentKey = (typeof ENVIRONMENT_KEYS)[number];

/** How many of one kind — 0 takes them all out. */
export type Drive<K extends string> = { kind: K; count: number };

/** What the model suggested, every value already checked against the sets
 *  above. A value that failed the check is absent — never repaired into a
 *  guess — and the rules fill that field instead. */
export type AiHints = {
  battery?: BatteryKey;
  material?: Material;
  useCase?: UseCase[];
  runtimeGoalH?: number;
};

/** The maker's changes to what is in the product. Each field replaces the
 *  concept's own parts of that kind (edits.ts); an absent one leaves them. */
export type PartChoices = {
  mcu?: McuKey;
  radio?: RadioKey;
  motors?: Drive<MotorKey>;
  servos?: Drive<ServoKey>;
  /** Concept part names taken out. */
  removed?: string[];
  added?: AddableKey[];
  chargePort?: ChargePortKey;
  environment?: EnvironmentKey;
  mounting?: MountingKey;
};

/** The maker's own changes. An absent field follows the hints and the math. */
export type SpecEdits = PartChoices & {
  size?: Mm3;
  battery?: BatteryKey;
  material?: Material;
  /** Chose to build at a size the parts don't fit — the product ships Draft. */
  draftAtSize?: boolean;
  /** 1.2–4 mm in 0.4 mm steps (hints.ts). */
  wallMm?: number;
  /** The turn whose concept the part changes were made on — so a newer
   *  concept can say they still apply (rebaseEdits, edits.ts). It decides
   *  nothing that is built, so specKey never sees it. */
  basedOn?: string;
};

export type ResolvedSpec = {
  /** "mechanical" when the parts it was worked out from are nothing but
   *  hardware — no pack, nothing on a board, nothing drawing current
   *  (productKind, derive.ts). The one rule every surface says "No
   *  electronics" by (needsNoPower, facts.ts). */
  kind: "electronic" | "mechanical";
  size: Mm3;
  sizeSource: "you" | "calc";
  /** Nothing is routed yet, so this is the parts' own footprint — ±15%. */
  minSize: Mm3;
  fits: boolean;
  /** Building as Draft at a size its parts don't fit: the maker's choice,
   *  and a size that doesn't fit. */
  draftAtSize: boolean;
  /** The maker chose Draft at this size (SpecEdits.draftAtSize) — kept
   *  whether the size fits now or not. specKey keys the choice, not
   *  `draftAtSize`: a change to the fit rules moves that, and an old Draft
   *  build read "Changed" with nothing changed. */
  draftChosen: boolean;
  /** Null when no part sits on a board — a case, a strap. */
  board: { w: number; h: number; parts: number; layers: 2 } | null;
  battery: BatteryKey;
  /** "concept" is the pack the parts themselves name — ranked above the AI's
   *  hint, since the maker already told the model what battery it has. */
  batterySource: "you" | "concept" | "ai" | "rule";
  /** USB powered and drawing current, with no port to take the power in —
   *  the maker set the port to None. It stays on USB rather than being
   *  quietly given a pack, and the sheet says what is missing. */
  noUsbPort: boolean;
  /** Meant to talk over a radio: its concept's parts name one — so one the
   *  maker set to None or took off is a pairing broken, not a product that
   *  never had one — or the maker picked one. A chip given to a charger has
   *  Wi-Fi on its die, and that alone doesn't make the charger something the
   *  car should talk to. The rail's pairing and the build review both read
   *  this (project-state.ts, confidence.ts), so they pair the same products. */
  speaks: boolean;
  drawMa: number;
  budgetMa: number;
  runtimeH: number | null;
  material: Material;
  materialSource: "you" | "ai" | "rule";
  wallMm: number;
  wallSource: "you" | "rule";
  /** The part changes this spec was worked out with, as checked — so a
   *  booked snapshot says what was swapped, not only what it came to. */
  choices: PartChoices;
  /** Parts no body entry matched, sized by their category instead. */
  estimated: string[];
  /** The largest pack that makes the maker's size fit, when one does. */
  smallerBattery: { key: BatteryKey; runtimeH: number | null; minSize: Mm3 } | null;
};
