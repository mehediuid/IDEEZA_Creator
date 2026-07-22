// Design-rule data — every rule list, pin type, and clearance default in this
// file is transcribed verbatim from "Ideeza_Menu_Popups_Schematic_and_2D_v4.pdf"
// (Part 3, Popups 1 & 4). The dialogs render from here so the spec and the UI
// can never drift.

export type Severity = "Ignore" | "Note" | "Warning" | "Error" | "Fatal Error";

export const SEVERITIES: Severity[] = [
  "Ignore",
  "Note",
  "Warning",
  "Error",
  "Fatal Error",
];

// Short display label for chips (the PDF prints "Fatal" on the chip).
export const SEVERITY_SHORT: Record<Severity, string> = {
  Ignore: "Ignore",
  Note: "Note",
  Warning: "Warning",
  Error: "Error",
  "Fatal Error": "Fatal",
};

// Chip colors — color + text together (never color alone).
export const SEVERITY_COLOR: Record<Severity, { fg: string; bg: string }> = {
  Ignore: { fg: "var(--color-text-secondary)", bg: "var(--color-bg-subtle)" },
  Note: { fg: "#60a5fa", bg: "rgba(96,165,250,.14)" },
  Warning: { fg: "#f59e0b", bg: "rgba(245,158,11,.14)" },
  Error: { fg: "#f87171", bg: "rgba(248,113,113,.14)" },
  "Fatal Error": { fg: "#ef4444", bg: "rgba(239,68,68,.22)" },
};

export type RuleDef = { text: string; severity: Severity };

// ── Popup 1 — Schematic Design Rules ────────────────────────────────────

export const SCH_NET_RULES: RuleDef[] = [
  { text: "Bus name must conform to naming rules (letters/number/ASCII + [start:end], e.g. BUS[0:5])", severity: "Error" },
  { text: "Net name must conform to naming rules (letters / number / ASCII)", severity: "Fatal Error" },
  { text: "Net name cannot exceed 255 characters", severity: "Error" },
  { text: "Bus-branch wires must be named per the bus's naming rules", severity: "Fatal Error" },
  { text: "The same Pin Number of parts must connect to the same network", severity: "Fatal Error" },
  { text: "Netflag / Netport needs a name", severity: "Error" },
  { text: "Global net should not be shorted", severity: "Warning" },
  { text: "Pin endpoints cannot overlap while unconnected", severity: "Fatal Error" },
  { text: "Wire must not be a free wire (no component pin attached)", severity: "Warning" },
  { text: "Wire must not be a single-net wire (only one component pin)", severity: "Warning" },
  { text: "Netport name must match the connected Wire name", severity: "Warning" },
  { text: "Netport name must match the connected Bus name", severity: "Warning" },
  { text: "Netflag name must match the connected Wire name", severity: "Warning" },
  { text: "Netflag name must match the connected Bus name", severity: "Warning" },
  { text: "Off-Page Connector name must match the connected Wire", severity: "Warning" },
  { text: "Off-Page Connector name must match the connected Bus", severity: "Warning" },
  { text: "Netlabel / flag / port / short / diff-pair flag must connect to a Wire or Bus", severity: "Note" },
  { text: "Unconnected wires/buses must show their name on the canvas", severity: "Note" },
  { text: "Only one net name is allowed per set of wires", severity: "Warning" },
  { text: "Differential pair must come in pairs", severity: "Error" },
];

export const SCH_COMPONENT_RULES: RuleDef[] = [
  { text: "Component must have “Device” and “Footprint” properties, non-empty", severity: "Fatal Error" },
  { text: "If a component has a “Value” property, it must not be empty", severity: "Note" },
  { text: "Component pins must have a “Number” property, non-empty", severity: "Fatal Error" },
  { text: "Pins and pads must match one-to-one", severity: "Error" },
  { text: "Multi-part: Device / Footprint / Designator must be consistent across parts", severity: "Fatal Error" },
  { text: "Multi-part: all other properties must be consistent across parts", severity: "Warning" },
  { text: "Component attributes must match the Supplier Part", severity: "Warning" },
  { text: "Multi-part: each part must appear", severity: "Note" },
  { text: "Check component floating pins", severity: "Warning" },
  { text: "Designator must conform to rules: letter + number (or “?”)", severity: "Note" },
  { text: "Components must be annotated (auto on netlist export / convert to PCB)", severity: "Note" },
  { text: "Designators must not be duplicated (auto-fixed on export / convert)", severity: "Note" },
];

export const SCH_REUSE_RULES: RuleDef[] = [
  { text: "If a page has a Block Symbol, the Reuse Block can't lack its underlying schematic", severity: "Fatal Error" },
  { text: "Netports of the page and pins of the Block Symbol must correspond one-to-one", severity: "Error" },
  { text: "Nets connected to different bottom-layer ports must not be shorted together", severity: "Error" },
];

// Connection tab — 11 pin types; the lower-triangular matrix holds a severity
// per pin-type pair. Cell colours in the PDF are illustrative defaults, so we
// seed the classic conflicts and leave the rest at Warning.
export const PIN_TYPES = [
  "IN",
  "OUT",
  "BI",
  "Passive",
  "Open Collector",
  "Open Emitter",
  "Power",
  "Ground",
  "HIZ",
  "Terminator",
  "Undefined",
] as const;

export function defaultPinMatrix(): Severity[][] {
  const n = PIN_TYPES.length;
  const m: Severity[][] = [];
  // Default is Ignore (most pairings are benign — the doc's grid is mostly
  // dark). Only genuine electrical faults get a severity, so a normal circuit
  // stays clean and only real conflicts fire. Every cell is still tunable.
  for (let r = 0; r < n; r++) m.push(Array(r + 1).fill("Ignore") as Severity[]);
  const idx = (name: (typeof PIN_TYPES)[number]) => PIN_TYPES.indexOf(name);
  const set = (a: (typeof PIN_TYPES)[number], b: (typeof PIN_TYPES)[number], s: Severity) => {
    const i = Math.max(idx(a), idx(b));
    const j = Math.min(idx(a), idx(b));
    m[i][j] = s;
  };
  // Genuine faults (doc Examples 1–3 + standard EDA conventions).
  set("OUT", "OUT", "Error");            // bus contention — two drivers
  set("OUT", "Power", "Fatal Error");    // driver into a power rail
  set("OUT", "Ground", "Fatal Error");   // driver into ground
  set("Power", "Ground", "Fatal Error"); // rail tied to ground — short
  set("Open Collector", "Power", "Error");
  set("Open Emitter", "Ground", "Error");
  // Intent-dependent (doc Examples 4–5).
  set("HIZ", "OUT", "Warning");          // tri-state pin on a driven net
  for (const t of PIN_TYPES) set("Undefined", t, "Warning"); // unspecified pin type
  return m;
}

// ── Schematic rules config ──────────────────────────────────────────────
// The Design Rules dialog's editable state (per-rule enable + severity, the
// pin-conflict matrix, and its master toggle). Shared by the dialog, the store
// (persisted per-project), and the ERC engine (which reads it so tuning is
// real — a disabled rule is skipped, a re-severitied rule reports at the new
// level, and the matrix/toggle drive pin-conflict detection).
export type SchRuleState = { enabled: boolean; severity: Severity };
export type SchRulesConfig = {
  Net: SchRuleState[];
  Component: SchRuleState[];
  "Reuse Block": SchRuleState[];
  pinMatrix: Severity[][];
  pinCheckEnabled: boolean;
};

export function defaultSchRulesConfig(): SchRulesConfig {
  const mk = (defs: RuleDef[]) => defs.map((d) => ({ enabled: true, severity: d.severity }));
  return {
    Net: mk(SCH_NET_RULES),
    Component: mk(SCH_COMPONENT_RULES),
    "Reuse Block": mk(SCH_REUSE_RULES),
    pinMatrix: defaultPinMatrix(),
    pinCheckEnabled: true,
  };
}

// ── Popup 4 — PCB Design Rules ──────────────────────────────────────────

// Rule tree (left column of Rule Management): category → leaf rule types.
export const PCB_RULE_TREE: { category: string; leaves: string[] }[] = [
  { category: "Spacing", leaves: ["Safe Spacing", "Other Spacing"] },
  {
    category: "Physics",
    leaves: [
      "Track",
      "Net Length Range",
      "Net Length Tolerance",
      "Differential Pair",
      "Blind/Buried Via",
      "Via Size",
    ],
  },
  { category: "Plane", leaves: ["Plane Zone", "Copper Zone"] },
  { category: "Expansion", leaves: ["Paste Mask", "Solder Mask"] },
];

// Clearance matrix object types (columns Track → Board Outline; Hole is a
// 13th row with no self-clearance, exactly as captured live).
export const CLEARANCE_COLS = [
  "Track",
  "SMD Pad",
  "TH Pad",
  "SMD Test Pt",
  "TH Test Pt",
  "Via",
  "Fill/Teardrop",
  "Cu/Plane Zone",
  "Slot Region",
  "Line",
  "Text/Image",
  "Board Outline",
] as const;

export type ClearanceRow = { name: string; values: number[] };

// Default values (mm) verbatim from the PDF's live capture.
export function defaultClearanceRows(): ClearanceRow[] {
  return [
    { name: "Track", values: [0.102] },
    { name: "SMD Pad", values: [0.152, 0.152] },
    { name: "TH Pad", values: [0.152, 0.152, 0.152] },
    { name: "SMD Test Pt", values: [0.152, 0.152, 0.152, 0.152] },
    { name: "TH Test Pt", values: [0.152, 0.152, 0.152, 0.152, 0.152] },
    { name: "Via", values: [0.152, 0.152, 0.152, 0.152, 0.152, 0.152] },
    { name: "Fill/Teardrop", values: [0.152, 0.152, 0.152, 0.152, 0.152, 0.152, 0.152] },
    { name: "Cu/Plane Zone", values: [0.254, 0.254, 0.254, 0.254, 0.254, 0.254, 0.254, 0.254] },
    { name: "Slot Region", values: [0.3, 0.152, 0.152, 0.152, 0.152, 0.152, 0.152, 0.254, 0.152] },
    { name: "Line", values: [0.152, 0.152, 0.152, 0.152, 0.152, 0.152, 0.152, 0.254, 0.3, 0.152] },
    { name: "Text/Image", values: [0.152, 0.152, 0.152, 0.152, 0.152, 0.152, 0.152, 0.254, 0.152, 0.152, 0.152] },
    { name: "Board Outline", values: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.254, 0.3, 0.3, 0.3, 0.3] },
    { name: "Hole", values: [0.176, 0.176, 0.176, 0.176, 0.176, 0.176, 0.176, 0.254, 0.176, 0.176, 0.176, 0.176] },
  ];
}

// Physics rules (Popup 4 → Track / Via Size / Net Length Range). Values (mm)
// verbatim from the parameter list, so the DRC engine and the dialog defaults
// stay in lock-step. The engine reads these to flag under/over-sized tracks and
// vias and out-of-range net lengths.
export interface PcbPhysicsRules {
  trackWidthMin: number; // mm — Track ▸ Stroke Width ▸ Min
  trackWidthMax: number; // mm — Track ▸ Stroke Width ▸ Max
  viaOuterMin: number;   // mm — Via Size ▸ Outer Diameter ▸ Min
  viaOuterMax: number;   // mm — Via Size ▸ Outer Diameter ▸ Max
  viaInnerMin: number;   // mm — Via Size ▸ Inner Diameter ▸ Min
  viaInnerMax: number;   // mm — Via Size ▸ Inner Diameter ▸ Max
  netLengthMin: number;  // mm — Net Length Range ▸ Minimum
  netLengthMax: number;  // mm — Net Length Range ▸ Maximum
}

export function defaultPcbPhysicsRules(): PcbPhysicsRules {
  return {
    trackWidthMin: 0.102, trackWidthMax: 10,
    viaOuterMin: 0.4, viaOuterMax: 6,
    viaInnerMin: 0.2, viaInnerMax: 3,
    netLengthMin: 0, netLengthMax: 100,
  };
}
