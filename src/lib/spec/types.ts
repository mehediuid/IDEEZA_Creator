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
  "li-1s-400",
  "li-1s-1000",
  "li-1s-2000",
  "li-2s-1500",
  "aa-2",
  "aa-4",
] as const;
export type BatteryKey = (typeof BATTERY_KEYS)[number];

export const USE_CASES = ["handheld", "outdoor", "waterproof", "wearable", "desk"] as const;
export type UseCase = (typeof USE_CASES)[number];

/** What the model suggested, every value already checked against the sets
 *  above. A value that failed the check is absent — never repaired into a
 *  guess — and the rules fill that field instead. */
export type AiHints = {
  battery?: BatteryKey;
  material?: Material;
  useCase?: UseCase[];
  runtimeGoalH?: number;
};

/** The maker's own changes. An absent field follows the hints and the math. */
export type SpecEdits = {
  size?: Mm3;
  battery?: BatteryKey;
  material?: Material;
  /** Chose to build at a size the parts don't fit — the product ships Draft. */
  draftAtSize?: boolean;
};

export type ResolvedSpec = {
  size: Mm3;
  sizeSource: "you" | "calc";
  /** Nothing is routed yet, so this is the parts' own footprint — ±15%. */
  minSize: Mm3;
  fits: boolean;
  draftAtSize: boolean;
  /** Null when no part sits on a board — a case, a strap. */
  board: { w: number; h: number; parts: number; layers: 2 } | null;
  battery: BatteryKey;
  batterySource: "you" | "ai" | "rule";
  drawMa: number;
  budgetMa: number;
  runtimeH: number | null;
  material: Material;
  materialSource: "you" | "ai" | "rule";
  wallMm: number;
  /** Parts no body entry matched, sized by their category instead. */
  estimated: string[];
  /** The largest pack that makes the maker's size fit, when one does. */
  smallerBattery: { key: BatteryKey; runtimeH: number | null; minSize: Mm3 } | null;
};
