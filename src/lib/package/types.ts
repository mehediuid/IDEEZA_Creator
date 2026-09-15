// New Package flow — the authoring model.
//
// One draft object carries the whole flow: where the part's data came from, the
// symbol's objects, the footprint's pads and graphics, the 3D body placement
// and the library metadata. Every step reads and writes this one shape, so the
// pin/pad match, the previews and the Save can never disagree about what the
// part is.
//
// Coordinate spaces are deliberately different, because the two editors model
// different things: the symbol is abstract sheet units (a schematic symbol has
// no millimetres), the footprint is real millimetres with the part's own centre
// at the origin. The mm/mil toggle is a display unit only — the model always
// stores mm, so switching units can never round the geometry away.

import { componentBodyColor } from "@/lib/pcb/pcb-3d";

export type Pt = { x: number; y: number };

// ── Entry ───────────────────────────────────────────────────────────────────
export const PATHS = ["import", "wizard", "custom"] as const;
export type PathId = (typeof PATHS)[number];

export const STEPS = ["package", "symbol", "footprint", "place3d", "finalize"] as const;
export type StepId = (typeof STEPS)[number];

export const STEP_LABEL: Record<StepId, string> = {
  package: "Package",
  symbol: "Symbol",
  footprint: "Footprint",
  place3d: "3D Place",
  finalize: "Finalize",
};

// ── Symbol ──────────────────────────────────────────────────────────────────
export const PIN_TYPES = [
  "Passive",
  "Input",
  "Output",
  "Bidirectional",
  "Power In",
  "Power Out",
  "Open Collector",
  "Tri-State",
  "Unspecified",
] as const;
export type PinType = (typeof PIN_TYPES)[number];

export const PIN_ANGLES = [0, 90, 180, 270] as const;
export type PinAngle = (typeof PIN_ANGLES)[number];

/** Text objects can echo the header fields instead of carrying their own copy. */
export const TEXT_KINDS = ["Free Text", "Designator", "Value"] as const;
export type TextKind = (typeof TEXT_KINDS)[number];

export const SYM_GRIDS = [5, 10, 20, 40] as const;
export type SymGrid = (typeof SYM_GRIDS)[number];

export type SymObj =
  | { id: string; kind: "pin"; num: number; name: string; etype: PinType; length: number; angle: PinAngle; x: number; y: number }
  | { id: string; kind: "rect"; x: number; y: number; w: number; h: number }
  | { id: string; kind: "circle"; x: number; y: number; r: number }
  | { id: string; kind: "ellipse"; x: number; y: number; rx: number; ry: number }
  | { id: string; kind: "line"; x1: number; y1: number; x2: number; y2: number }
  | { id: string; kind: "arc"; x1: number; y1: number; x2: number; y2: number; bulge: number }
  | { id: string; kind: "polyline"; points: Pt[] }
  | { id: string; kind: "bezier"; points: Pt[] }
  | { id: string; kind: "text"; x: number; y: number; textKind: TextKind; content: string; size: number };

export type SymPin = Extract<SymObj, { kind: "pin" }>;

/** The symbol tools, in toolbar order. Pin is ours; the sheet's Power is not
 *  here on purpose — rail wiring belongs to sheet design, not to one part. */
export const SYM_TOOLS = ["select", "pin", "line", "polyline", "rect", "circle", "ellipse", "arc", "bezier", "text"] as const;
export type SymTool = (typeof SYM_TOOLS)[number];

// ── Footprint ───────────────────────────────────────────────────────────────
export const MOUNTINGS = ["SMD", "THT"] as const;
export type Mounting = (typeof MOUNTINGS)[number];

export const UNITS = ["mm", "mil"] as const;
export type Unit = (typeof UNITS)[number];

export const PAD_KINDS = ["Pad", "Shaped Pad", "Mounting"] as const;
export type PadKind = (typeof PAD_KINDS)[number];

export const PAD_SHAPES = ["SMD rect", "SMD round", "THT round", "THT oval"] as const;
export type PadShape = (typeof PAD_SHAPES)[number];

/** Layer names match the live product exactly — not "Overlay" or "Courtyard". */
export const FP_LAYERS = ["Top Silkscreen", "Bottom Silkscreen", "Top Paste Mask", "Bottom Paste Mask"] as const;
export type FpLayer = (typeof FP_LAYERS)[number];

export type FpObj =
  | {
      id: string;
      kind: "pad";
      padKind: PadKind;
      shape: PadShape;
      /** mm */ w: number;
      /** mm */ h: number;
      /** mm — THT shapes only */ drill?: number;
      x: number;
      y: number;
      /** Symbol pin this pad answers to. Mounting pads carry null. */
      pin: number | null;
    }
  | { id: string; kind: "rect"; layer: FpLayer; x: number; y: number; w: number; h: number }
  | { id: string; kind: "circle"; layer: FpLayer; x: number; y: number; r: number }
  | { id: string; kind: "ellipse"; layer: FpLayer; x: number; y: number; rx: number; ry: number }
  | { id: string; kind: "line"; layer: FpLayer; x1: number; y1: number; x2: number; y2: number }
  | { id: string; kind: "arc"; layer: FpLayer; x1: number; y1: number; x2: number; y2: number; bulge: number }
  | { id: string; kind: "polyline"; layer: FpLayer; points: Pt[] }
  | { id: string; kind: "dimension"; layer: FpLayer; x1: number; y1: number; x2: number; y2: number }
  | { id: string; kind: "text"; layer: FpLayer; x: number; y: number; textKind: TextKind; content: string; size: number };

export type FpPad = Extract<FpObj, { kind: "pad" }>;

export const FP_TOOLS = ["select", "pad", "line", "polyline", "rect", "circle", "ellipse", "arc", "dimension", "text"] as const;
export type FpTool = (typeof FP_TOOLS)[number];

/** The footprint canvas grid is a real 0.5 mm lattice — a toggle, not a size. */
export const FP_GRID_MM = 0.5;

// ── 3D body ─────────────────────────────────────────────────────────────────
export type Body3D = { x: number; y: number; z: number; rot: number; height: number; color: string };

export const BODY_LIMITS = {
  x: { min: -6, max: 6, step: 0.1 },
  y: { min: -6, max: 6, step: 0.1 },
  z: { min: 0, max: 6, step: 0.1 },
  rot: { min: 0, max: 359, step: 1 },
  height: { min: 0.3, max: 20, step: 0.1 },
} as const;

// ── Library metadata ────────────────────────────────────────────────────────
/** One functional taxonomy, not a vendor one — this is what search filters on. */
export const CATEGORIES = [
  "Passive",
  "Connector",
  "IC / Logic",
  "Relay & Electromechanical",
  "Crystal & Oscillator",
  "Sensor",
  "Power & Regulation",
  "Mechanical / Hardware",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const VISIBILITIES = ["private", "community"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

// ── The draft ───────────────────────────────────────────────────────────────
export type PackageDraft = {
  path: PathId | null;
  /** Reference prefix — feeds the Designator text kind and the `U?` placeholder. */
  prefix: string;
  /** Default value — feeds the Value text kind in both editors. */
  value: string;

  symbol: SymObj[];
  symGrid: SymGrid;
  symSnap: boolean;

  mounting: Mounting;
  units: Unit;
  drawLayer: FpLayer;
  footprint: FpObj[];
  fpSnap: boolean;

  body: Body3D;

  name: string;
  category: Category | "";
  description: string;
  visibility: Visibility;

  /** Set when the part arrived through the wizard, so Finalize can report it. */
  wizard: { family: string; params: Record<string, number> } | null;
  /** Set when the part arrived through Import: the files that were attached and
   *  what the parse actually produced, so the result screen survives a reload
   *  and Finalize can report the path. */
  imported: {
    symbol: string | null;
    footprint: string | null;
    step: string | null;
    pins: number;
    pads: number;
    /** Constructs the files carried that this flow does not model. */
    notes: string[];
  } | null;
};

export const initialDraft = (): PackageDraft => ({
  path: null,
  prefix: "U",
  value: "",
  symbol: [],
  symGrid: 10,
  symSnap: true,
  mounting: "SMD",
  units: "mm",
  drawLayer: "Top Silkscreen",
  footprint: [],
  fpSnap: true,
  // The body colour follows the reference prefix, using the same map the PCB
  // 3D scene paints real component bodies with.
  body: { x: 0, y: 0, z: 1, rot: 0, height: 1.8, color: componentBodyColor("U") },
  name: "",
  category: "",
  description: "",
  visibility: "private",
  wizard: null,
  imported: null,
});

// ── Derived facts every step agrees on ──────────────────────────────────────
export const symPins = (d: PackageDraft): SymPin[] =>
  d.symbol.filter((o): o is SymPin => o.kind === "pin").sort((a, b) => a.num - b.num);

export const fpPads = (d: PackageDraft): FpPad[] => d.footprint.filter((o): o is FpPad => o.kind === "pad");

/** A Mounting pad is a mechanical hole — non-electrical, so it is deliberately
 *  excluded from the pin/pad match. A footprint may hold more pads than the
 *  symbol has pins without that being an error. */
export const electricalPads = (d: PackageDraft): FpPad[] => fpPads(d).filter((p) => p.padKind !== "Mounting");

export type PinPadMatch = {
  ok: boolean;
  pins: number;
  pads: number;
  /** Symbol pins no electrical pad answers to. */
  unmapped: number[];
  /** Numbers used by more than one symbol pin. */
  duplicatePins: number[];
  /** Numbers claimed by more than one electrical pad. */
  duplicatePads: number[];
  /** Why the match fails, in the gate's own voice — null when it holds. */
  reason: string | null;
};

const dupes = (nums: number[]): number[] => {
  const seen = new Set<number>();
  const twice = new Set<number>();
  for (const n of nums) (seen.has(n) ? twice : seen).add(n);
  return [...twice].sort((a, b) => a - b);
};

const list = (nums: number[]) => nums.join(", ");

/** Counts and coverage are not enough: a pad answers to exactly one pin and a
 *  pin is answered by exactly one pad, so the numbers have to be unique on both
 *  sides. Four pins numbered 1,1,2,2 against four pads numbered 1,2,1,2 cover
 *  each other perfectly and are still not a part anyone can build. */
export function pinPadMatch(d: PackageDraft): PinPadMatch {
  const pins = symPins(d);
  const pads = electricalPads(d);
  const padNums = pads.map((p) => p.pin).filter((n): n is number => typeof n === "number");
  const covered = new Set(padNums);
  const unmapped = pins.filter((p) => !covered.has(p.num)).map((p) => p.num);
  const duplicatePins = dupes(pins.map((p) => p.num));
  const duplicatePads = dupes(padNums);

  // Each reason says what it is and that it stops the flow — the gate really
  // does block, so "review before continuing" would be under-stating it.
  const n = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
  const reason = !pins.length
    ? "No symbol pins yet — add pins on the Symbol step before continuing"
    : duplicatePins.length
      ? `Pin number${duplicatePins.length === 1 ? "" : "s"} ${list(duplicatePins)} ${duplicatePins.length === 1 ? "is" : "are each"} used by more than one pin — give every pin its own number before you can continue`
      : duplicatePads.length
        ? `More than one pad answers to pin${duplicatePads.length === 1 ? "" : "s"} ${list(duplicatePads)} — give every electrical pad its own pin number before you can continue`
        : unmapped.length
          ? `Pin${unmapped.length === 1 ? "" : "s"} ${list(unmapped)} ${unmapped.length === 1 ? "has" : "have"} no pad — every pin needs one before you can continue`
          : pads.length !== pins.length
            ? `${n(pads.length, "electrical pad")} against ${n(pins.length, "pin")} — the two have to match before you can continue`
            : null;

  return { ok: reason === null, pins: pins.length, pads: pads.length, unmapped, duplicatePins, duplicatePads, reason };
}

/** The Mounting field is the author's statement about how the part meets the
 *  board; the pads are the physical fact. Nothing reconciled them, so a record
 *  could say SMD over through-hole pads. A part with *both* kinds is real (a
 *  through-hole connector with surface-mount tabs), so only a total
 *  contradiction blocks — the mixed case is said out loud and left alone. */
export function mountingCheck(d: PackageDraft): { blocking: boolean; text: string } | null {
  const pads = electricalPads(d);
  if (!pads.length) return null;
  const tht = pads.filter((p) => p.shape.startsWith("THT")).length;
  const smd = pads.length - tht;
  if (d.mounting === "SMD" && tht > 0) {
    return smd === 0
      ? { blocking: true, text: `Mounting says SMD, but every electrical pad is through-hole — set Mounting to THT, or change the pads` }
      : { blocking: false, text: `Mounting says SMD, but ${tht} of ${pads.length} electrical pads are through-hole` };
  }
  if (d.mounting === "THT" && tht === 0) {
    return { blocking: true, text: `Mounting says THT, but every electrical pad is surface-mount — set Mounting to SMD, or change the pads` };
  }
  return null;
}

/** The next free pin number, so placing a pin never collides or leaves a gap. */
export function nextPinNumber(d: PackageDraft): number {
  const used = new Set(symPins(d).map((p) => p.num));
  let n = 1;
  while (used.has(n)) n += 1;
  return n;
}

/** What a Designator / Value text object actually shows. The real instance
 *  number (U1, R14) only exists once the part is placed on a board, so the
 *  designator is the prefix plus `?` everywhere inside this flow. */
export function textContent(o: Extract<SymObj | FpObj, { kind: "text" }>, d: PackageDraft): string {
  if (o.textKind === "Designator") return `${d.prefix || "U"}?`;
  if (o.textKind === "Value") return d.value;
  return o.content;
}

// ── Units ───────────────────────────────────────────────────────────────────
export const MM_PER_MIL = 0.0254;
export const mmToMil = (mm: number) => mm / MM_PER_MIL;
export const milToMm = (mil: number) => mil * MM_PER_MIL;

/** Format a stored mm value for display in the draft's current unit. */
export const toDisplay = (mm: number, unit: Unit) => (unit === "mm" ? mm : mmToMil(mm));
/** Read a displayed value in the draft's current unit back to stored mm. */
export const fromDisplay = (v: number, unit: Unit) => (unit === "mm" ? v : milToMm(v));

/** Trailing zeros read as false precision on a dimension, so they are trimmed.
 *  mm keeps 3 decimals (a 0.001 mm step is meaningful), mil keeps 1. */
export function fmt(mm: number, unit: Unit): string {
  const v = toDisplay(mm, unit);
  const s = v.toFixed(unit === "mm" ? 3 : 1);
  return s.replace(/\.?0+$/, "");
}

export const snapMm = (v: number, on: boolean) => (on ? Math.round(v / FP_GRID_MM) * FP_GRID_MM : v);
export const snapUnits = (v: number, grid: SymGrid, on: boolean) => (on ? Math.round(v / grid) * grid : v);

// ── Step 1 sub-screens ──────────────────────────────────────────────────────
/** Step 1 is three screens deep for two of its paths. The screen is *derived*
 *  from the draft rather than held as extra state, so a reload lands the user
 *  back where they were and Back can walk out of it by clearing what got them
 *  in. */
export type EntrySub = "paths" | "wizard-families" | "wizard-params" | "import" | "import-result";

export function entrySub(d: PackageDraft): EntrySub {
  if (d.path === "wizard") return d.wizard ? "wizard-params" : "wizard-families";
  if (d.path === "import") return d.imported ? "import-result" : "import";
  return "paths";
}

// ── Step gating ─────────────────────────────────────────────────────────────
/** Why the flow can't advance from a step, or null when it can. One function,
 *  so the Next button, the left rail's reachability and the banners agree. */
export function blockedReason(step: StepId, d: PackageDraft): string | null {
  if (step === "package") {
    if (!d.path) return "Choose how you want to start";
    if (d.path === "wizard" && !d.wizard) return "Pick a package family";
    if (d.path === "import" && !d.imported) return "Attach a symbol or a footprint file";
    return null;
  }
  if (step === "symbol") return symPins(d).length > 0 ? null : "Place at least one pin — the footprint's pads are matched to them";
  if (step === "footprint") {
    const m = pinPadMatch(d);
    if (m.reason) return m.reason;
    const mount = mountingCheck(d);
    return mount?.blocking ? mount.text : null;
  }
  if (step === "place3d") return null;
  if (step === "finalize") {
    if (!d.name.trim()) return "Name the package";
    if (!d.category) return "Pick a category";
    return null;
  }
  return null;
}

export const stepIndex = (s: StepId) => STEPS.indexOf(s);

/** A step is reachable once every step before it is clear — so a user can jump
 *  back freely, but can't skip a gate by clicking the rail. */
export function stepReachable(target: StepId, d: PackageDraft): boolean {
  const t = stepIndex(target);
  for (let i = 0; i < t; i += 1) {
    if (blockedReason(STEPS[i], d)) return false;
  }
  return true;
}

// ── Persistence ─────────────────────────────────────────────────────────────
const DRAFT_KEY = "ideeza:package:draft";

const num = (v: unknown, fb: number) => (typeof v === "number" && Number.isFinite(v) ? v : fb);
const str = (v: unknown, fb = "") => (typeof v === "string" ? v : fb);
const oneOf = <T extends readonly string[]>(v: unknown, list: T, fb: T[number]): T[number] =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T[number]) : fb;

/** Shape-check every key on load — a hand-edited or stale localStorage entry
 *  must not be able to crash a canvas that trusts the model. */
export function sanitizeDraft(raw: unknown): PackageDraft {
  const base = initialDraft();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const b = (r.body ?? {}) as Record<string, unknown>;
  return {
    ...base,
    path: typeof r.path === "string" && (PATHS as readonly string[]).includes(r.path) ? (r.path as PathId) : null,
    prefix: str(r.prefix, base.prefix),
    value: str(r.value, base.value),
    symbol: Array.isArray(r.symbol) ? (r.symbol.filter((o) => o && typeof (o as SymObj).kind === "string") as SymObj[]) : [],
    symGrid: (SYM_GRIDS as readonly number[]).includes(num(r.symGrid, 10)) ? (num(r.symGrid, 10) as SymGrid) : 10,
    symSnap: typeof r.symSnap === "boolean" ? r.symSnap : true,
    mounting: oneOf(r.mounting, MOUNTINGS, base.mounting),
    units: oneOf(r.units, UNITS, base.units),
    drawLayer: oneOf(r.drawLayer, FP_LAYERS, base.drawLayer),
    footprint: Array.isArray(r.footprint) ? (r.footprint.filter((o) => o && typeof (o as FpObj).kind === "string") as FpObj[]) : [],
    fpSnap: typeof r.fpSnap === "boolean" ? r.fpSnap : true,
    body: {
      x: num(b.x, base.body.x),
      y: num(b.y, base.body.y),
      z: num(b.z, base.body.z),
      rot: num(b.rot, base.body.rot),
      height: num(b.height, base.body.height),
      color: str(b.color, base.body.color),
    },
    name: str(r.name, ""),
    category: oneOf(r.category, [...CATEGORIES, ""] as const, ""),
    description: str(r.description, ""),
    visibility: oneOf(r.visibility, VISIBILITIES, "private"),
    wizard:
      r.wizard && typeof r.wizard === "object"
        ? {
            family: str((r.wizard as Record<string, unknown>).family),
            params: ((r.wizard as Record<string, unknown>).params ?? {}) as Record<string, number>,
          }
        : null,
    imported:
      r.imported && typeof r.imported === "object"
        ? {
            symbol: str((r.imported as Record<string, unknown>).symbol) || null,
            footprint: str((r.imported as Record<string, unknown>).footprint) || null,
            step: str((r.imported as Record<string, unknown>).step) || null,
            pins: num((r.imported as Record<string, unknown>).pins, 0),
            pads: num((r.imported as Record<string, unknown>).pads, 0),
            notes: Array.isArray((r.imported as Record<string, unknown>).notes)
              ? ((r.imported as Record<string, unknown>).notes as unknown[]).filter((x): x is string => typeof x === "string")
              : [],
          }
        : null,
  };
}

export function loadDraft(): PackageDraft {
  if (typeof window === "undefined") return initialDraft();
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return sanitizeDraft(raw ? JSON.parse(raw) : null);
  } catch {
    return initialDraft();
  }
}

export function saveDraft(d: PackageDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {}
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

let seq = 0;
export const newId = (p: string) => `${p}_${Date.now().toString(36)}_${(seq += 1).toString(36)}`;
