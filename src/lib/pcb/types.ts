// IDEEZA PCB Software — editor state types.
// Mirrors the prototype's class `state` shape exactly.

export type Mode = "schematic" | "pcb" | "2d" | "3d";
export type LeftMain = "project" | "library";
export type LeftSub = "page" | "net" | "component" | "object";
export type RightTab = "properties" | "filter" | "layer";
export type BottomTab = "logs" | "device" | "drc" | "result";
export type MenuId =
  | "edit"
  | "view"
  | "place"
  | "design"
  | "layout"
  | "tools"
  | "export"
  | "import"
  | "setting"
  | "help";
export type ModalId =
  | "deleteObjects"
  | "array"
  | "findReplace"
  | "tableProps"
  | "designRules"
  | "annotate"
  | "importDfx"
  | "importAltium"
  | "importKicad"
  | "exportAltium"
  | "exportKicad"
  | "exportEagle"
  | "export3dFile"
  | "export3dShell"
  | "textEdit"
  | "jlcpcb"
  | "genBlock"
  | "boolOp"
  | "distribute"
  | "convertConfirm"
  // Phase 3 — PCB Tools menu modals
  | "layerManager"
  | "netClass"
  | "diffPair"
  | "equalLength"
  | "padPair"
  | "copper"
  | "tearDrop"
  | "removeUnusedPad"
  | "pcbDrc"
  // Phase 5 — IT-569 Reannotate
  | "reannotate"
  // Phase 6 — 2D File / Edit / Export menus
  | "exportDxf2D"
  | "exportPdf2D"
  | "exportGerber2D"
  | "exportPickPlace"
  | "exportBom"
  | "chamferFillet"
  | "editOutline"
  | "cutout"
  // Phase 7 — Route + Design extras
  | "autoRoute"
  | "routingWidth"
  // All-Popups spec — File / Place dialogs
  | "openProject"
  | "devicePicker"
  | null;

// Tools-menu manager overlays.
export type ManagerId = "device" | "footprint" | null;

// Left-panel library: which library + common-library sub-tab + all-library filter.
export type LibView = "common" | "all";
export type LibCommonTab = "schematic" | "pcb" | "panel";
export type LibFilter = "all" | "verified" | "public" | "private";
export type LibPrice = "all" | "free" | "premium";

export type SettingsPage =
  | "system"
  | "drawing"
  | "hotkey"
  | "property"
  | "save"
  | "font"
  | "footprint"
  | "panel"
  | "symbol"
  | "toptools";

export type DelObjName =
  | "Symbol"
  | "Wire and Bus"
  | "Text"
  | "Arc"
  | "Rectangle"
  | "Circle"
  | "Polyline"
  | "Image";

export interface Annot {
  existing: boolean;
  op: string;
  range: string;
  hierarchical: boolean;
  order: string;
  desRule: string;
  customStart: string;
}

// Object placed on the canvas via a toolbar tool. `kind` matches the toolbar
// tool key (resistor, capacitor, wire, text, track, pad, via, component, …).
// All PCB-specific fields are optional so the same shape works for both modes.
export interface CanvasObject {
  id: string;
  kind: string;
  x: number;
  y: number;
  endX?: number;
  endY?: number;
  text?: string;
  rotation?: number;
  color?: string;
  layer?: string;
  // ── PCB-specific ─────────────────────────────────────────────────────
  net?: string;                       // net name (tracks, pads, vias)
  width?: number;                     // track width / pad width / via diameter (mil)
  height?: number;                    // pad height (mil) — round = ignored
  drill?: number;                     // pad / via drill hole (mil), 0 = none
  padShape?: "round" | "rect" | "oval"; // pad geometry
  padType?: "smd" | "tht" | "test";   // pad mount type
  startLayer?: string;                // via start layer id
  endLayer?: string;                  // via end layer id
  // ── PCB component (footprint) ────────────────────────────────────────
  footprint?: string;                 // footprint library reference
  comment?: string;                   // value / part number / annotation
  side?: "top" | "bottom";            // which side of the board
  locked?: boolean;                   // movement lock
  // ── Generic property bag ─────────────────────────────────────────────
  // Holds every inspector field that has no dedicated typed column above
  // (Manufacturer, Pin Type, mask/thermal, font, etc.). Bound in the
  // inspector via `prop:<key>` and edited through actions.setObjectProp.
  props?: Record<string, unknown>;
}

// PCB net — minimal model for Phase 2 (coloring + assignment).
export interface PcbNet {
  name: string;
  color: string;
  cls?: string; // net class reference
}

export const DEFAULT_PCB_NETS: PcbNet[] = [
  { name: "GND",  color: "#34d399", cls: "Power" },
  { name: "VCC",  color: "#f87171", cls: "Power" },
  { name: "+3V3", color: "#facc15", cls: "Power" },
  { name: "+5V",  color: "#fb923c", cls: "Power" },
];

// One layer in the PCB stack. Order in the array = physical stack order
// (top → bottom). Color drives the visible tint; transparency 0..100 (%)
// adds extra alpha on top of theme alpha; visible/locked are toggles.
export type PcbLayerType =
  | "signal"
  | "plane"
  | "silkscreen"
  | "paste"
  | "soldermask"
  | "drill"
  | "mechanical";

export interface PcbLayer {
  id: string;
  name: string;
  color: string;
  type: PcbLayerType;
  visible: boolean;
  locked: boolean;
  transparency: number; // 0..100
}

export const DEFAULT_PCB_LAYERS: PcbLayer[] = [
  { id: "top",        name: "Top Layer",        color: "#E34C4C", type: "signal",     visible: true, locked: false, transparency: 0 },
  { id: "inner1",     name: "Inner 1",          color: "#3BB56F", type: "signal",     visible: true, locked: false, transparency: 0 },
  { id: "inner2",     name: "Inner 2",          color: "#2F7AD6", type: "signal",     visible: true, locked: false, transparency: 0 },
  { id: "bottom",     name: "Bottom Layer",     color: "#E3B23B", type: "signal",     visible: true, locked: false, transparency: 0 },
  { id: "topSilk",    name: "Top Silkscreen",   color: "#F5F5F5", type: "silkscreen", visible: true, locked: false, transparency: 0 },
  { id: "bottomSilk", name: "Bottom Silkscreen",color: "#BFBFBF", type: "silkscreen", visible: true, locked: false, transparency: 0 },
  { id: "topPaste",   name: "Top Paste Mask",   color: "#C060C0", type: "paste",      visible: true, locked: false, transparency: 30 },
  { id: "bottomPaste",name: "Bottom Paste Mask",color: "#3BB5B5", type: "paste",      visible: true, locked: false, transparency: 30 },
  { id: "topMask",    name: "Top Solder Mask",  color: "#1B6B43", type: "soldermask", visible: false, locked: false, transparency: 60 },
  { id: "bottomMask", name: "Bottom Solder Mask", color: "#1B6B43", type: "soldermask", visible: false, locked: false, transparency: 60 },
  { id: "drill",      name: "Drill Layer",      color: "#555555", type: "drill",      visible: true, locked: false, transparency: 0 },
  { id: "outline",    name: "Board Outline",    color: "#7C2DB9", type: "mechanical", visible: true, locked: false, transparency: 0 },
];

// Tool keys that place a one-shot object on click (no draft).
export const PLACE_TOOLS: ReadonlyArray<string> = [
  "resistor",
  "capacitor",
  "diode",
  "inductor",
  "vcc5v",
  "agnd",
  "pgnd",
  "pin",
  "netLabel",
  "netFlag",
  "shortFlag",
  "port",
  "noConnect",
  "text",
  "pad",
  "via",
  "sutureVias",
  // PCB place tools (Phase 1) — placeholder glyphs from icons.tsx are reused.
  "polygon",
  "fillRegion",
  "slot",
  "component",
  "boardOutline",
  // Main Toolbar Comparison parity — every toolbar/menu tool must actually
  // place. Unknown kinds render the generic dot glyph until they get one.
  "net",
  "gnd",
  "junction",
  "image",
  "circle",
  "rectangle",
  "ellipse",
  "arc",
  "bezier",
  "mountingHole",
  "prohibitedRegion",
  "constraintRegion",
];

// Tool keys that need two clicks (start + end) — wire-like.
export const DRAFT_TOOLS: ReadonlyArray<string> = [
  "wire",
  "bus",
  "track",
  "dimension",
  "diffPair",
  "lengthTune",
  "polyline",
  "line",
];

// Right-panel "Selection Filter" — maps a placed-object `kind` to the
// boardSettings toggle key that governs whether it can be selected on the
// canvas. Shared by the click-select path (canvas-area.tsx) and the
// rubber-band path (store.tsx commitRubberBand) so both honour the same
// filter. Keys match the EasyEDA PCB(2D) "Selection Filter" panel (PDF §01b).
export const FILTER_KEY_FOR_KIND: Record<string, string> = {
  component: "fComponent", resistor: "fComponent", capacitor: "fComponent",
  inductor: "fComponent", diode: "fComponent", ic: "fComponent",
  pad: "fPad", via: "fVia", sutureVias: "fSutureHole",
  track: "fTrack", diffPair: "fTrack",
  text: "fText", image: "fImage", dimension: "fDimension",
  net: "fNet", netLabel: "fNet", netFlag: "fNet",
  boardOutline: "fOutline",
};

// Filter keys whose default state is OFF (must be explicitly enabled via
// `bag[key] === true`); everything else defaults ON (`bag[key] !== false`).
export const DEFAULT_OFF_FILTERS = new Set<string>([
  "fNet", "fPadPair", "fDrcMarking", "fGroup", "fComponentSilk",
]);

// `mode` gates whether the PCB Selection Filter applies. The filter is a
// PCB(2D)-only feature; in schematic mode nothing is filtered (every object
// stays selectable) so the schematic editor is untouched by it.
export function isSelectable(kind: string, bag: Record<string, unknown>, mode?: string): boolean {
  if (mode === "schematic") return true;        // schematic has no PCB selection filter
  const key = FILTER_KEY_FOR_KIND[kind];
  if (!key) return true;                        // unmapped kinds always selectable
  const on = DEFAULT_OFF_FILTERS.has(key) ? bag[key] === true : bag[key] !== false;
  return on;
}

export interface PcbState {
  mode: Mode;
  leftMain: LeftMain;
  leftSub: LeftSub;
  netSub: "net" | "component";
  compSub: "designator" | "name" | "device" | "footprint";
  // Which per-component floating text sub-object is selected on the canvas
  // ("none" = the component body itself). Drives the Designator inspector.
  selSub: "none" | "designator" | "name";
  rightTab: RightTab;
  openMenu: MenuId | null;
  ctx: boolean | null;
  ctxX: string;
  ctxY: string;
  settingsOpen: boolean;
  settingsPage: SettingsPage;
  notif: number;
  tool: string;
  bottomTab: BottomTab;
  bottomOpen: boolean;
  modal: ModalId;
  delObj: Record<DelObjName, boolean>;
  arr: { row: string; col: string; rowSp: string; colSp: string };
  tbl: { row: string; col: string };
  annot: Annot;
  frScope: "page" | "object";
  frRegex: boolean;
  frMatch: boolean;
  frExt: boolean;
  floatPos: { x: number; y: number };
  viewTog: Record<string, boolean>;
  expanded: Record<string, boolean>;
  selectedTree?: string;
  // canvas object selection / editing (double-click + connection-line editing)
  selected: "none" | "comp" | "wire" | "pin";
  editingText: boolean;
  editText: string;
  netColor: string;
  colorPickerOpen: boolean;
  textStyle: { b: boolean; i: boolean; u: boolean };
  wireLineStyle: string;
  wireLineWidth: string;
  // Tools-menu manager overlays (Device Manager / Footprint Manager)
  manager: ManagerId;
  // Left-panel library browser
  libView: LibView;
  libCommonTab: LibCommonTab;
  libFilter: LibFilter;
  libPrice: LibPrice;
  libSelected: string | null;
  libCtx: { x: string; y: string } | null;
  // Right-panel Filter tab interactions
  filterExpanded: boolean;
  filterDropdownOpen: boolean;
  // Layer tab visibility / lock toggles
  layerVis: Record<string, boolean>;
  layerLock: Record<string, boolean>;
  // Canvas viewport (Zoom In/Out, Fit, mouse wheel)
  zoom: number;
  pan: { x: number; y: number };
  // Toolbar — grid, unit, visibility
  gridSize: string;
  unit: string;
  gridVisible: boolean;
  // Selected canvas object transform (U12 in CanvasObjects)
  compRot: number;
  compFlipV: boolean;
  compFlipH: boolean;
  compZ: "front" | "back";
  // Placed objects on the canvas (from clicking with a tool active)
  objects: CanvasObject[];
  selectedIds: string[];
  clipboardObjects: CanvasObject[];
  draftWire: { startX: number; startY: number; kind: string } | null;
  rubberBand: { x1: number; y1: number; x2: number; y2: number } | null;
  // PCB layer stack — Phase 1 foundation
  pcbLayers: PcbLayer[];
  activePcbLayer: string;
  pcbBoard: { width: number; height: number };
  // PCB nets (Phase 2) — coloring + class assignment
  pcbNets: PcbNet[];
  // Default values for newly placed PCB objects (Phase 2)
  pcbDefaults: {
    trackWidth: number;
    viaSize: number;
    viaDrill: number;
    padWidth: number;
    padHeight: number;
    padDrill: number;
    padShape: "round" | "rect" | "oval";
  };
  // 2D editor — board fabrication properties (drive the 2D canvas board render)
  twoD: {
    material: string;
    side: string;
    silkTech: string;
    bgColor: string;
    boardColor: string;
    padColor: string;
    silkscreen: string;
  };
  // 3D editor — board properties + layer stacking (drive the 3D canvas render)
  threeD: {
    material: string;
    silkTech: string;
    bgColor: string;
    boardColor: string;
    padColor: string;
    stackMaterial: string;
    pcbHeightFromTop: string;
    boardThickness: string;
    layers: Array<{ name: string; thickness: string }>;
  };
  // Right panel — Schematic Properties (default-no-selection view)
  schemBasic: { name: string };
  schemBorder: {
    showTitleBlock: boolean;
    drawing: string;
    size: string;
    drawingHeight: string;
    drawingHeightAlt: string;
    regionStart: string;
    xRegion: string;
    yRegion: string;
    color: string;
  };
  schemTitleShow: boolean;
  schemTitleFields: Array<{ key: string; label: string; on: boolean; valueOn: boolean; value: string }>;
  schemSectionOpen: { basic: boolean; border: boolean; title: boolean };
  // Settings — Phase B
  hotkeys: Hotkey[];
  drawings: Drawing[];
  fonts: { common: string[]; selected: string };
  saveSettings: { interval: number; backups: number; location: string; compress: boolean; onExit: boolean };
  // System Settings (Phase C)
  systemSettings: SystemSettingsState;
  // Property Settings (Phase C)
  propertySettings: { rows: PropertyRow[]; selectedId: string | null };
  // Phase D — deep settings pages
  schemSymbolSettings: SchemSymbolSettings;
  pcbFootprintSettings: PcbFootprintSettings;
  panelLibSettings: PanelLibSettings;
  // Phase E — Top toolbar customization
  toolbarCustomization: ToolbarCustomization;
  // Phase 3 — PCB Tools manager modals
  pcbNetClasses: NetClass[];
  pcbDiffPairs: DiffPair[];
  pcbEqualLength: EqualLengthGroup[];
  pcbPadPairs: PadPairGroup[];
  pcbCoppers: Copper[];
  pcbTearDrop: TearDropSettings;
  pcbDrcRules: DrcRule[];
  removeUnusedPadOpts: { topLayer: boolean; bottomLayer: boolean; innerLayer: boolean; keepConnected: boolean };
  // Phase 5 — toolbar toast
  toast: string | null;
  // Phase 6 — 2D snap + chamfer/fillet
  snapEnabled: boolean;
  cornerOp: { mode: "chamfer" | "fillet"; radius: number };
  // Phase 7 — Route options
  routingMode: "45deg" | "90deg" | "curved";
  routingCorner: "miter" | "round" | "chamfer";
  routingWidth: number;
  // Task 4 — board-wide settings bag (2D Canvas Document / Common Setting / Selection Filter fields)
  boardSettings: Record<string, unknown>;
}

// Hotkey row — `id` is a stable sort handle, `key` is the displayed combo.
export interface Hotkey {
  id: number;
  function: string;
  key: string;
  comment?: string;
}

// Drawing template (referenced from "Drawing Setting" page).
export interface Drawing {
  id: string;
  name: string;
  selected: boolean;
}

export const DEFAULT_HOTKEYS: Hotkey[] = [
  { id: 1,  function: "Save",                 key: "Ctrl+S" },
  { id: 2,  function: "Open Project",          key: "Ctrl+O" },
  { id: 3,  function: "New File",              key: "Ctrl+N" },
  { id: 4,  function: "Undo",                  key: "Ctrl+Z" },
  { id: 5,  function: "Redo",                  key: "Ctrl+Y" },
  { id: 6,  function: "Cut",                   key: "Ctrl+X" },
  { id: 7,  function: "Copy",                  key: "Ctrl+C" },
  { id: 8,  function: "Paste",                 key: "Ctrl+V" },
  { id: 9,  function: "Delete",                key: "Del" },
  { id: 10, function: "Select All",            key: "Ctrl+A" },
  { id: 11, function: "Find / Replace",        key: "Ctrl+F" },
  { id: 12, function: "Zoom In",               key: "Ctrl++" },
  { id: 13, function: "Zoom Out",              key: "Ctrl+-" },
  { id: 14, function: "Fit to Window",         key: "Ctrl+0" },
  { id: 15, function: "Rotate Right",          key: "R" },
  { id: 16, function: "Rotate Left",           key: "Shift+R" },
  { id: 17, function: "Flip Vertical",         key: "F" },
  { id: 18, function: "Flip Horizontal",       key: "Shift+F" },
  { id: 19, function: "Pan (Hand tool)",       key: "H" },
  { id: 20, function: "Select Tool",           key: "V" },
  { id: 21, function: "Place Wire",            key: "W" },
  { id: 22, function: "Place Bus",             key: "B" },
  { id: 23, function: "Place Resistor",        key: "R" },
  { id: 24, function: "Place Capacitor",       key: "C" },
  { id: 25, function: "Place Inductor",        key: "L" },
  { id: 26, function: "Place Diode",           key: "D" },
  { id: 27, function: "Place Net Label",       key: "N" },
  { id: 28, function: "Place Track (PCB)",     key: "T" },
  { id: 29, function: "Place Via",             key: "Shift+V" },
  { id: 30, function: "Place Pad",             key: "P" },
  { id: 31, function: "Toggle Grid",           key: "G" },
  { id: 32, function: "Toggle Bottom Panel",   key: "Ctrl+`" },
  { id: 33, function: "Open Settings",         key: "Ctrl+," },
  { id: 34, function: "Convert Schematic → PCB", key: "Ctrl+Shift+P" },
];

export const DEFAULT_DRAWINGS: Drawing[] = [
  { id: "schematic", name: "Schematic Drawing",  selected: true  },
  { id: "pcb",       name: "PCB Drawing",        selected: true  },
  { id: "mech",      name: "Mechanical Drawing", selected: false },
  { id: "border",    name: "Border Drawing",     selected: true  },
  { id: "title",     name: "Title Block",        selected: true  },
];

export const DEFAULT_FONTS: string[] = [
  "Inter",
  "Roboto",
  "SF Pro Display",
  "Helvetica Neue",
  "Arial",
  "Segoe UI",
  "Source Code Pro",
  "JetBrains Mono",
  "Times New Roman",
  "Georgia",
];

// ── System Settings (Phase C) ────────────────────────────────────────────────
export type SystemSubPage = "general" | "category" | "libDevice" | "libPanel";

export interface SystemSettingsState {
  subPage: SystemSubPage;
  // General — System Document Management
  docMode: "easy" | "professional";
  showWelcomeScreen: boolean;
  enableExtension: boolean;
  // General — Project
  openProjectsInNewWindow: boolean;
  duplicateOnOpen: boolean;
  rememberLastOpen: boolean;
  // General — Make Page Duplication
  copyTabSwitch: boolean;
  copyComponentColor: boolean;
  resetCanvasZoom: boolean;
  // General — Place
  showMouseButton: boolean;
  rightClickAsAlt: boolean;
  alignSnap: boolean;
  // General — Coordinate
  showCoordinateRuler: boolean;
  yAxisUpward: boolean;
  // General — Object Move
  moveDeviceForce: boolean;
  showMoveGhost: boolean;
  showGuideLines: boolean;
  alignWhileMoving: boolean;
  // General — Pasting Update Module
  promptOnPaste: boolean;
  syncOnPaste: boolean;
  // Category — checkbox list of category groups (drives left panel filter)
  categories: Array<{ id: string; label: string; on: boolean }>;
  // Common Library — Device
  libDeviceShow: boolean;
  libDeviceAutoLoad: boolean;
  // Common Library — Panel Lib
  libPanelShow: boolean;
  libPanelAutoLoad: boolean;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsState = {
  subPage: "general",
  docMode: "easy",
  showWelcomeScreen: false,
  enableExtension: true,
  openProjectsInNewWindow: true,
  duplicateOnOpen: false,
  rememberLastOpen: true,
  copyTabSwitch: true,
  copyComponentColor: false,
  resetCanvasZoom: true,
  showMouseButton: true,
  rightClickAsAlt: false,
  alignSnap: true,
  showCoordinateRuler: true,
  yAxisUpward: false,
  moveDeviceForce: false,
  showMoveGhost: true,
  showGuideLines: true,
  alignWhileMoving: true,
  promptOnPaste: true,
  syncOnPaste: false,
  categories: [
    { id: "resistor",  label: "Resistors",  on: true },
    { id: "capacitor", label: "Capacitors", on: true },
    { id: "diode",     label: "Diodes",     on: true },
    { id: "inductor",  label: "Inductors",  on: true },
    { id: "ic",        label: "ICs",        on: true },
    { id: "connector", label: "Connectors", on: true },
    { id: "switch",    label: "Switches",   on: false },
    { id: "led",       label: "LEDs",       on: true },
    { id: "crystal",   label: "Crystals",   on: false },
    { id: "transformer", label: "Transformers", on: false },
  ],
  libDeviceShow: true,
  libDeviceAutoLoad: true,
  libPanelShow: true,
  libPanelAutoLoad: false,
};

// ── Property Settings (Phase C) ──────────────────────────────────────────────
export interface PropertyRow {
  id: string;
  property: string;
  object: string;          // e.g. "Schematic Default" / "PCB Default"
  displayInCanvas: string; // e.g. "Show" / "Hide" / "Auto"
}

export const DEFAULT_PROPERTY_ROWS: PropertyRow[] = [
  { id: "p_1", property: "Name",        object: "Schematic Default", displayInCanvas: "Show" },
  { id: "p_2", property: "Designator",  object: "Schematic Default", displayInCanvas: "Show" },
  { id: "p_3", property: "Comment",     object: "Schematic Default", displayInCanvas: "Hide" },
  { id: "p_4", property: "Footprint",   object: "PCB Default",       displayInCanvas: "Show" },
  { id: "p_5", property: "Value",       object: "PCB Default",       displayInCanvas: "Show" },
  { id: "p_6", property: "Net",         object: "PCB Default",       displayInCanvas: "Auto" },
];

// ── Schematic / Symbol Settings (Phase D) ────────────────────────────────────
export type SchemSymbolSubPage = "general" | "theme";
export interface ThemeColor { id: string; label: string; color: string }

export interface SchemSymbolSettings {
  subPage: SchemSymbolSubPage;
  general: {
    designatorSize: string;
    pinNumberSize: string;
    autoIncrement: boolean;
    showInvisiblePins: boolean;
    snapToGrid: boolean;
    showPinNames: boolean;
    showGuideLines: boolean;
  };
  theme: ThemeColor[];
}

export const DEFAULT_SCHEM_SYMBOL_SETTINGS: SchemSymbolSettings = {
  subPage: "general",
  general: {
    designatorSize: "1.5mm",
    pinNumberSize: "1.0mm",
    autoIncrement: true,
    showInvisiblePins: false,
    snapToGrid: true,
    showPinNames: true,
    showGuideLines: true,
  },
  theme: [
    { id: "wire",       label: "Wire",            color: "#1890FF" },
    { id: "bus",        label: "Bus",             color: "#52C41A" },
    { id: "component",  label: "Component body",  color: "#7C2DB9" },
    { id: "pin",        label: "Pin",             color: "#F5222D" },
    { id: "pinName",    label: "Pin name",        color: "#262626" },
    { id: "pinNumber",  label: "Pin number",      color: "#595959" },
    { id: "netLabel",   label: "Net label",       color: "#FA8C16" },
    { id: "netFlag",    label: "Net flag",        color: "#FAAD14" },
    { id: "power",      label: "Power",           color: "#F5222D" },
    { id: "gnd",        label: "Ground",          color: "#000000" },
    { id: "noConnect",  label: "No-connect",      color: "#FF4D4F" },
    { id: "junction",   label: "Junction",        color: "#1890FF" },
    { id: "designator", label: "Designator",      color: "#F5222D" },
    { id: "value",      label: "Value",           color: "#52C41A" },
    { id: "text",       label: "Text",            color: "#262626" },
    { id: "selection",  label: "Selection",       color: "#722ED1" },
    { id: "background", label: "Background",      color: "#FFFFFF" },
    { id: "grid",       label: "Grid",            color: "#D9D9D9" },
    { id: "ruler",      label: "Ruler",           color: "#BFBFBF" },
    { id: "guide",      label: "Guide line",      color: "#13C2C2" },
  ],
};

// ── PCB / Footprint Settings (Phase D) ───────────────────────────────────────
export type PcbFpSubPage =
  | "general"
  | "theme"
  | "layer"
  | "gridCart"
  | "gridPolar"
  | "trackWidth"
  | "snap";

export interface PcbFootprintSettings {
  subPage: PcbFpSubPage;
  general: {
    showPadNames: boolean;
    showPadNumbers: boolean;
    showVias: boolean;
    showTrackClearance: boolean;
    showNetNames: boolean;
    showHidden: boolean;
    autoRipUp: boolean;
    snapToCopper: boolean;
    fillerPolygons: boolean;
    rats: boolean;
    showRuler: boolean;
    drcLive: boolean;
    showOrigin: boolean;
    angularResolution: string;
    routeMode: string;
  };
  theme: ThemeColor[];
  gridCart: { gridSize: string; snapSize: string; gridStyle: string; showOrigin: boolean };
  gridPolar: { angleStep: string; radialStep: string; polarOrigin: string };
  trackWidths: number[];
  snap: { gridSnap: boolean; objectSnap: boolean; axisSnap: boolean; angleSnap: boolean; tolerance: number };
}

export const DEFAULT_PCB_FOOTPRINT_SETTINGS: PcbFootprintSettings = {
  subPage: "general",
  general: {
    showPadNames: true,
    showPadNumbers: true,
    showVias: true,
    showTrackClearance: false,
    showNetNames: true,
    showHidden: false,
    autoRipUp: true,
    snapToCopper: true,
    fillerPolygons: true,
    rats: true,
    showRuler: true,
    drcLive: false,
    showOrigin: true,
    angularResolution: "45°",
    routeMode: "Walk-around",
  },
  theme: [
    { id: "top",        label: "Top Copper",     color: "#E34C4C" },
    { id: "bottom",     label: "Bottom Copper",  color: "#E3B23B" },
    { id: "innerLayer", label: "Inner Layer",    color: "#3BB56F" },
    { id: "topSilk",    label: "Top Silkscreen", color: "#F5F5F5" },
    { id: "bottomSilk", label: "Bottom Silk",    color: "#BFBFBF" },
    { id: "topMask",    label: "Top Mask",       color: "#1B6B43" },
    { id: "bottomMask", label: "Bottom Mask",    color: "#1B6B43" },
    { id: "topPaste",   label: "Top Paste",      color: "#C060C0" },
    { id: "bottomPaste",label: "Bottom Paste",   color: "#3BB5B5" },
    { id: "drill",      label: "Drill Holes",    color: "#555555" },
    { id: "outline",    label: "Board Outline",  color: "#7C2DB9" },
    { id: "via",        label: "Via",            color: "#FAAD14" },
    { id: "pad",        label: "Pad",            color: "#F5222D" },
    { id: "track",      label: "Track",          color: "#1890FF" },
    { id: "ratLine",    label: "Rat Line",       color: "#FA541C" },
    { id: "background", label: "Background",     color: "#0d3b24" },
    { id: "selection",  label: "Selection",      color: "#722ED1" },
    { id: "drc",        label: "DRC Violation",  color: "#FF4D4F" },
  ],
  gridCart: { gridSize: "5 mil", snapSize: "5 mil", gridStyle: "Dotted", showOrigin: true },
  gridPolar: { angleStep: "15°", radialStep: "10 mil", polarOrigin: "Selection center" },
  trackWidths: [4, 6, 8, 10, 12, 15, 20, 25, 30],
  snap: { gridSnap: true, objectSnap: true, axisSnap: false, angleSnap: true, tolerance: 5 },
};

// ── Panel / Panel Lib Settings (Phase D) ─────────────────────────────────────
export type PanelLibSubPage = "general" | "theme" | "themeLine" | "themeStroke";

export interface LineStyleEntry { id: string; label: string; style: "Solid" | "Dashed" | "Dotted" | "Dash-Dot" }
export interface StrokeWidthEntry { id: string; label: string; width: number }

export interface PanelLibSettings {
  subPage: PanelLibSubPage;
  general: {
    showPanelBoundary: boolean;
    showFiducials: boolean;
    showVCutLines: boolean;
    showMouseBites: boolean;
    snapToBoundary: boolean;
    multiBoardLayout: boolean;
  };
  theme: ThemeColor[];
  lineStyles: LineStyleEntry[];
  strokeWidths: StrokeWidthEntry[];
}

// ── Top Toolbar Customization (Phase E) ──────────────────────────────────────
export type ToolbarScope = "schematic" | "symbol" | "pcb" | "panel";

export interface ToolbarCatalogItem {
  id: string;
  label: string;
}

// Master catalog per scope — mirrors the Figma "Top Toolbar Setting" frame.
// Selected subsets in state drive which icons render in the actual toolbar.
export const TOOLBAR_CATALOGS: Record<ToolbarScope, ToolbarCatalogItem[]> = {
  schematic: [
    // Shared nav/select tools (present on every mode's strip).
    { id: "select",         label: "Select" },
    { id: "hand",           label: "Hand / Pan" },
    { id: "selectVisible",  label: "Select Visible Parts" },
    { id: "snap",           label: "Snap" },
    { id: "component",      label: "Component" },
    // Main Toolbar Comparison parity — distinct placement tools.
    { id: "bus",            label: "Bus" },
    { id: "net",            label: "Net" },
    { id: "junction",       label: "Junction" },
    { id: "port",           label: "Port Out" },
    { id: "rectangle",      label: "Rectangle" },
    { id: "shortcutDevice", label: "Shortcut Device" },
    { id: "resistor",       label: "Resistor" },
    { id: "capacitor",      label: "Capacitor" },
    { id: "inductor",       label: "Inductor" },
    { id: "diode",          label: "Diode" },
    { id: "wire",           label: "Wire" },
    { id: "netLabel",       label: "Net Label" },
    { id: "pin",            label: "Pin" },
    { id: "shortFlag",      label: "Short Flag" },
    { id: "netFlag",        label: "Net flag" },
    { id: "netPort",        label: "Net Port" },
    { id: "vcc",            label: "VCC" },
    { id: "agnd",           label: "AGND" },
    { id: "gnd",            label: "GND" },
    { id: "vcc5v",          label: "+5V" },
    { id: "pgnd",           label: "PGND" },
    { id: "in",             label: "IN" },
    { id: "out",            label: "OUT" },
    { id: "si",             label: "SI" },
    { id: "noConnect",      label: "No connect Flag" },
    { id: "testPoint",      label: "Test Point" },
    { id: "reuseBlock",     label: "Reuse Block" },
    { id: "drawingTools",   label: "Drawing Tools" },
    { id: "polyline",       label: "Polyline" },
    { id: "arc",            label: "Arc" },
    { id: "bezier",         label: "Bezier" },
    { id: "circle",         label: "Circle" },
    { id: "ellipse",        label: "Ellipse" },
    { id: "rect",           label: "Rect" },
    { id: "text",           label: "Text" },
    { id: "image",          label: "Image" },
    { id: "table",          label: "Table" },
    { id: "backToUpper",    label: "Back to the upper" },
    { id: "openTemplate",   label: "Open Template page" },
    { id: "convertPcb",     label: "Update / Convert Schematic to PCB" },
    { id: "annotate",       label: "Ref Designator Annotate" },
    { id: "align",          label: "Align" },
    { id: "alignLeft",      label: "Align Left" },
    { id: "alignRight",     label: "Align Right" },
    { id: "alignTop",       label: "Align Top" },
    { id: "alignBottom",    label: "Align Bottom" },
    { id: "alignHorz",      label: "Align Horizontal centers" },
    { id: "alignVert",      label: "Align Vertical Center" },
    { id: "alignGrid",      label: "Align Grid" },
    { id: "distribute",     label: "Distribute" },
    { id: "distH",          label: "Distribute Horizontally" },
    { id: "distV",          label: "Distribute Vertically" },
    { id: "rotateLeft",     label: "Rotate Left" },
    { id: "rotateRight",    label: "Rotate Right" },
    { id: "flipH",          label: "Flip Horizontal" },
    { id: "flipV",          label: "Flip Vertical" },
    { id: "bringFront",     label: "Bring to Front" },
    { id: "sendBack",       label: "Send to Back" },
    { id: "bom",            label: "Bill of Materials (BOM)" },
    { id: "netlist",        label: "Netlist" },
    { id: "setting",        label: "Setting" },
  ],
  symbol: [
    { id: "wire",        label: "Wire" },
    { id: "polyline",    label: "Polyline" },
    { id: "arc",         label: "Arc" },
    { id: "circle",      label: "Circle" },
    { id: "rect",        label: "Rectangle" },
    { id: "text",        label: "Text" },
    { id: "pin",         label: "Pin" },
    { id: "pinCluster",  label: "Pin Cluster" },
    { id: "image",       label: "Image" },
    { id: "rotate",      label: "Rotate" },
    { id: "flipH",       label: "Flip Horizontal" },
    { id: "flipV",       label: "Flip Vertical" },
    { id: "alignLeft",   label: "Align Left" },
    { id: "alignRight",  label: "Align Right" },
    { id: "alignTop",    label: "Align Top" },
    { id: "alignBottom", label: "Align Bottom" },
    { id: "distH",       label: "Distribute Horizontally" },
    { id: "distV",       label: "Distribute Vertically" },
    { id: "bringFront",  label: "Bring to Front" },
    { id: "sendBack",    label: "Send to Back" },
    { id: "settings",    label: "Settings" },
  ],
  pcb: [
    // Shared nav/select tools (present on every mode's strip).
    { id: "select",         label: "Select" },
    { id: "hand",           label: "Hand / Pan" },
    { id: "selectVisible",  label: "Select Visible Parts" },
    // Main Toolbar Comparison parity — placement / routing tools.
    { id: "prohibitedRegion", label: "Prohibited Region" },
    { id: "stretchTrack",   label: "Stretch Track" },
    { id: "routingCorner",  label: "Routing Corner" },
    { id: "mountingHole",   label: "Mounting Hole" },
    { id: "polyline",       label: "Polyline" },
    { id: "track",          label: "Track" },
    { id: "diffPair",       label: "Differential Pair" },
    { id: "via",            label: "Via" },
    { id: "sutureVias",     label: "Suture Vias" },
    { id: "pad",            label: "Pad" },
    { id: "component",      label: "Component / Footprint" },
    { id: "polygon",        label: "Copper Pour Polygon" },
    { id: "fillRegion",     label: "Filled Region" },
    { id: "boardOutline",   label: "Board Outline" },
    { id: "slot",           label: "Slot" },
    { id: "cutout",         label: "Cut-out" },
    { id: "dimension",      label: "Dimension" },
    { id: "ruler",          label: "Ruler" },
    { id: "text",           label: "Text" },
    { id: "image",          label: "Image" },
    { id: "table",          label: "Table" },
    { id: "lengthTune",     label: "Length Tune" },
    { id: "autoRoute",      label: "Auto Route" },
    { id: "interactiveRoute", label: "Interactive Route" },
    { id: "tearDrop",       label: "Tear Drop" },
    { id: "rotateLeft",     label: "Rotate Left" },
    { id: "rotateRight",    label: "Rotate Right" },
    { id: "flipH",          label: "Flip Horizontal" },
    { id: "flipV",          label: "Flip Vertical" },
    { id: "alignLeft",      label: "Align Left" },
    { id: "alignRight",     label: "Align Right" },
    { id: "alignTop",       label: "Align Top" },
    { id: "alignBottom",    label: "Align Bottom" },
    { id: "alignHorz",      label: "Align Horizontal centers" },
    { id: "alignVert",      label: "Align Vertical Center" },
    { id: "distH",          label: "Distribute Horizontally" },
    { id: "distV",          label: "Distribute Vertically" },
    { id: "bringFront",     label: "Bring to Front" },
    { id: "sendBack",       label: "Send to Back" },
    { id: "drc",            label: "Design Rule Check" },
    { id: "drillTable",     label: "Drill Table" },
    { id: "layerStack",     label: "Layer Stack" },
    { id: "netClass",       label: "Net Class" },
    { id: "settings",       label: "Settings" },
  ],
  panel: [
    { id: "panelOutline",  label: "Panel Outline" },
    { id: "boardSlot",     label: "Board Slot" },
    { id: "vCut",          label: "V-cut" },
    { id: "mouseBite",     label: "Mouse Bite" },
    { id: "fiducial",      label: "Fiducial" },
    { id: "toolingHole",   label: "Tooling Hole" },
    { id: "label",         label: "Panel Label" },
    { id: "text",          label: "Text" },
    { id: "ruler",         label: "Ruler" },
    { id: "image",         label: "Image" },
    { id: "table",         label: "Table" },
    { id: "rotateLeft",    label: "Rotate Left" },
    { id: "rotateRight",   label: "Rotate Right" },
    { id: "flipH",         label: "Flip Horizontal" },
    { id: "flipV",         label: "Flip Vertical" },
    { id: "alignLeft",     label: "Align Left" },
    { id: "alignRight",    label: "Align Right" },
    { id: "distH",         label: "Distribute Horizontally" },
    { id: "distV",         label: "Distribute Vertically" },
    { id: "settings",      label: "Settings" },
  ],
};

export interface ToolbarCustomization {
  scope: ToolbarScope;
  // Initial sensible defaults: select ~half of items per scope so the page
  // shows both columns populated on first open.
  schematic: string[];
  symbol: string[];
  pcb: string[];
  panel: string[];
}

// Phase 5 (IT-692) — widened schematic default to expose the newly added
// drawing tools (bezier / image / table / component). The toolbar itself
// drops items whose tool id isn't in this set.
// Main Toolbar Comparison — the "Final, Sub-Grouped" spec expects every tool
// row visible by default, so schematic/pcb whitelist the FULL catalog (the
// Top Tools Bar Settings page can still trim them per user). symbol/panel are
// untouched by that audit and keep their partial defaults.
export const DEFAULT_TOOLBAR_CUSTOMIZATION: ToolbarCustomization = {
  scope: "schematic",
  schematic: TOOLBAR_CATALOGS.schematic.map((t) => t.id),
  symbol: TOOLBAR_CATALOGS.symbol.slice(0, 14).map((t) => t.id),
  pcb: TOOLBAR_CATALOGS.pcb.map((t) => t.id),
  panel: TOOLBAR_CATALOGS.panel.slice(0, 12).map((t) => t.id),
};

export const DEFAULT_PANEL_LIB_SETTINGS: PanelLibSettings = {
  subPage: "general",
  general: {
    showPanelBoundary: true,
    showFiducials: true,
    showVCutLines: true,
    showMouseBites: true,
    snapToBoundary: true,
    multiBoardLayout: false,
  },
  theme: [
    { id: "panelBoundary", label: "Panel boundary", color: "#7C2DB9" },
    { id: "boardOutline",  label: "Board outline",  color: "#1890FF" },
    { id: "fiducial",      label: "Fiducial",       color: "#52C41A" },
    { id: "vCut",          label: "V-cut",          color: "#FAAD14" },
    { id: "mouseBite",     label: "Mouse bite",     color: "#FA8C16" },
    { id: "tooling",       label: "Tooling hole",   color: "#722ED1" },
    { id: "label",         label: "Panel label",    color: "#262626" },
    { id: "selection",     label: "Selection",      color: "#722ED1" },
  ],
  lineStyles: [
    { id: "boardOutline",  label: "Board outline",  style: "Solid"    },
    { id: "panelBoundary", label: "Panel boundary", style: "Solid"    },
    { id: "vCut",          label: "V-cut line",     style: "Dashed"   },
    { id: "guide",         label: "Guide line",     style: "Dotted"   },
    { id: "constraint",    label: "Constraint",     style: "Dash-Dot" },
  ],
  strokeWidths: [
    { id: "outline",     label: "Outline",      width: 6 },
    { id: "vCut",        label: "V-cut",        width: 4 },
    { id: "guide",       label: "Guide",        width: 2 },
    { id: "fiducial",    label: "Fiducial dot", width: 3 },
    { id: "mouseBite",   label: "Mouse bite",   width: 3 },
  ],
};

export const DEFAULT_SCHEM_TITLE_FIELDS: Array<{ key: string; label: string; on: boolean; valueOn: boolean; value: string }> = [
  { key: "createDate", label: "@Create date", on: true, valueOn: true, value: "14-11-2025" },
  { key: "pageCount", label: "@page Count", on: true, valueOn: true, value: "01" },
  { key: "pageName", label: "@Page Name", on: true, valueOn: true, value: "P1" },
  { key: "pageNo", label: "@Page No", on: true, valueOn: true, value: "03" },
  { key: "projectName", label: "@Project Name", on: true, valueOn: true, value: "01" },
  { key: "boardName", label: "@Board Name", on: true, valueOn: true, value: "Board-1" },
  { key: "schematic", label: "@Schematic", on: true, valueOn: true, value: "Schematic 1" },
  { key: "updateDate", label: "@Update date", on: true, valueOn: true, value: "14-11-2025" },
  { key: "company", label: "@Company", on: true, valueOn: true, value: "IDEEZA" },
  { key: "pageSize", label: "@Page size", on: true, valueOn: true, value: "A4" },
  { key: "reviewed", label: "@Reviewed", on: true, valueOn: true, value: "-" },
  { key: "version", label: "@Version", on: true, valueOn: true, value: "V-1" },
  { key: "drawn", label: "@Drawn", on: true, valueOn: true, value: "-" },
  { key: "description", label: "@Description", on: true, valueOn: true, value: "-" },
];

// ── Phase 3 — PCB manager modals ─────────────────────────────────────────────

export interface NetClass {
  id: string;
  name: string;
  trackWidth: number;      // mil
  clearance: number;       // mil
  viaSize: number;         // mil
  viaDrill: number;        // mil
  color: string;
  // Nets assigned to this class (Popup 6 transfer list).
  nets?: string[];
}

export interface DiffPair {
  id: string;
  name: string;
  netA: string;
  netB: string;
  gap: number;             // mil
  width: number;           // mil
}

export interface EqualLengthGroup {
  id: string;
  name: string;
  nets: string[];          // free-form net list (space- or comma-separated entered)
  target: number;          // mil
  tolerance: number;       // mil
}

export interface PadPairGroup {
  id: string;
  name: string;
  pads: string;            // free-form: "U1:1 - U2:3"
  spacing: number;         // mil
}

export interface Copper {
  id: string;
  name: string;
  layer: string;           // layer id
  net: string;
  clearance: number;
  thermal: boolean;
  hatched: boolean;
}

export interface TearDropSettings {
  enabled: boolean;
  shape: "Curve" | "Line";
  ratio: number;           // %
  applyToVia: boolean;
  applyToPad: boolean;
  applyToTrack: boolean;
}

export interface DrcRule {
  id: string;
  name: string;
  severity: "Error" | "Warning" | "Off";
  scope: string;
}

export const DEFAULT_NET_CLASSES: NetClass[] = [
  { id: "nc1", name: "Default",  trackWidth: 8,  clearance: 6,  viaSize: 24, viaDrill: 12, color: "#7C2DB9" },
  { id: "nc2", name: "Power",    trackWidth: 20, clearance: 10, viaSize: 32, viaDrill: 16, color: "#E34C4C" },
  { id: "nc3", name: "Signal",   trackWidth: 6,  clearance: 6,  viaSize: 20, viaDrill: 10, color: "#3BB56F" },
  { id: "nc4", name: "Clock",    trackWidth: 8,  clearance: 8,  viaSize: 24, viaDrill: 12, color: "#F59E0B" },
];

export const DEFAULT_DIFF_PAIRS: DiffPair[] = [
  { id: "dp1", name: "USB_D",  netA: "USB_DP", netB: "USB_DN", gap: 6,  width: 6 },
  { id: "dp2", name: "HDMI_0", netA: "HDMI_0P", netB: "HDMI_0N", gap: 5, width: 5 },
];

export const DEFAULT_EQUAL_LENGTH_GROUPS: EqualLengthGroup[] = [
  { id: "el1", name: "DDR_DQ", nets: ["DQ0", "DQ1", "DQ2", "DQ3"], target: 1500, tolerance: 50 },
];

export const DEFAULT_PAD_PAIRS: PadPairGroup[] = [
  { id: "pp1", name: "Decoupling_U1", pads: "U1:1 - C1:1", spacing: 100 },
];

export const DEFAULT_COPPERS: Copper[] = [
  { id: "cu1", name: "GND_Plane_Top",    layer: "top",    net: "GND", clearance: 8, thermal: true, hatched: false },
  { id: "cu2", name: "GND_Plane_Bottom", layer: "bottom", net: "GND", clearance: 8, thermal: true, hatched: false },
];

export const DEFAULT_TEAR_DROP: TearDropSettings = {
  enabled: true,
  shape: "Curve",
  ratio: 100,
  applyToVia: true,
  applyToPad: true,
  applyToTrack: false,
};

export const DEFAULT_DRC_RULES: DrcRule[] = [
  { id: "dr1", name: "Clearance: Track to Track",     severity: "Error",   scope: "All" },
  { id: "dr2", name: "Clearance: Track to Pad",       severity: "Error",   scope: "All" },
  { id: "dr3", name: "Clearance: Via to Via",         severity: "Error",   scope: "All" },
  { id: "dr4", name: "Minimum Track Width (4 mil)",   severity: "Warning", scope: "All" },
  { id: "dr5", name: "Minimum Annular Ring",          severity: "Warning", scope: "All" },
  { id: "dr6", name: "IPC-A-610: Pad placement",      severity: "Warning", scope: "All" },
  { id: "dr7", name: "IPC-2552 / DAC-2552 compliance", severity: "Warning", scope: "All" },
  { id: "dr8", name: "Unused Pad detection",          severity: "Off",     scope: "All" },
];

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 1.2;

export const DEL_OBJ_NAMES: DelObjName[] = [
  "Symbol",
  "Wire and Bus",
  "Text",
  "Arc",
  "Rectangle",
  "Circle",
  "Polyline",
  "Image",
];

export const initialState: PcbState = {
  mode: "schematic",
  leftMain: "project",
  leftSub: "page",
  netSub: "net",
  compSub: "designator",
  selSub: "none",
  rightTab: "properties",
  openMenu: null,
  ctx: null,
  ctxX: "0px",
  ctxY: "0px",
  settingsOpen: false,
  settingsPage: "system",
  notif: 3,
  tool: "select",
  bottomTab: "logs",
  bottomOpen: false,
  modal: null,
  delObj: {
    Symbol: true,
    "Wire and Bus": true,
    Text: true,
    Arc: false,
    Rectangle: true,
    Circle: false,
    Polyline: false,
    Image: false,
  },
  arr: { row: "1", col: "1", rowSp: "1", colSp: "1" },
  tbl: { row: "2", col: "2" },
  annot: {
    existing: true,
    op: "Annotate Designator",
    range: "Annotate Designator",
    hierarchical: true,
    order: "Across Then Down",
    desRule: "",
    customStart: "0",
  },
  frScope: "page",
  frRegex: true,
  frMatch: true,
  frExt: true,
  floatPos: { x: 230, y: 74 },
  selected: "none",
  editingText: false,
  editText: "HB-PH3-25414PB2GOP",
  netColor: "#1890FF",
  colorPickerOpen: false,
  textStyle: { b: false, i: false, u: false },
  wireLineStyle: "Solid (Default)",
  wireLineWidth: "5",
  manager: null,
  libView: "common",
  libCommonTab: "schematic",
  libFilter: "verified",
  libPrice: "all",
  libSelected: null,
  libCtx: null,
  filterExpanded: false,
  filterDropdownOpen: false,
  layerVis: {},
  layerLock: {},
  viewTog: {
    "Top Toolbar": true,
    "Left-Side panel": true,
    "Right-Side Panel": true,
    "Bottom-Side Panel": false,
    "Floating Tool": true,
  },
  expanded: { Testing: true, "Board-1": true, "Board-2": true },
  zoom: 1,
  pan: { x: 0, y: 0 },
  gridSize: "0.05",
  unit: "Inch",
  gridVisible: true,
  compRot: 0,
  compFlipV: false,
  compFlipH: false,
  compZ: "front",
  objects: [],
  selectedIds: [],
  clipboardObjects: [],
  draftWire: null,
  rubberBand: null,
  pcbLayers: DEFAULT_PCB_LAYERS,
  activePcbLayer: "top",
  pcbBoard: { width: 720, height: 480 },
  pcbNets: DEFAULT_PCB_NETS,
  pcbDefaults: {
    trackWidth: 8,
    viaSize: 24,
    viaDrill: 12,
    padWidth: 60,
    padHeight: 60,
    padDrill: 30,
    padShape: "round",
  },
  twoD: {
    material: "FR-4",
    side: "Top Side",
    silkTech: "Standard silkscreen",
    bgColor: "#1E1E1E",
    boardColor: "Blue",
    padColor: "Goldsmith",
    silkscreen: "Visible",
  },
  threeD: {
    material: "FR-4",
    silkTech: "Standard silkscreen",
    bgColor: "#1E1E1E",
    boardColor: "Blue",
    padColor: "Goldsmith",
    stackMaterial: "0mm",
    pcbHeightFromTop: "0mm",
    boardThickness: "1.2mm",
    layers: [
      { name: "Top solder mask layer", thickness: "0.0010" },
      { name: "Dielectric 1", thickness: "0.0010" },
      { name: "Bottom Layer", thickness: "0.0010" },
      { name: "Bottom solder mask", thickness: "0.0010" },
    ],
  },
  schemBasic: { name: "P1" },
  schemBorder: {
    showTitleBlock: true,
    drawing: "Right Bottom",
    size: "A4",
    drawingHeight: "11.7in",
    drawingHeightAlt: "11.7in",
    regionStart: "Left Top",
    xRegion: "7",
    yRegion: "6",
    color: "#1E1E1E",
  },
  schemTitleShow: true,
  schemTitleFields: DEFAULT_SCHEM_TITLE_FIELDS,
  schemSectionOpen: { basic: true, border: true, title: true },
  hotkeys: DEFAULT_HOTKEYS,
  drawings: DEFAULT_DRAWINGS,
  fonts: { common: DEFAULT_FONTS, selected: "Inter" },
  saveSettings: {
    interval: 5,
    backups: 3,
    location: "Cloud + Local",
    compress: true,
    onExit: true,
  },
  systemSettings: DEFAULT_SYSTEM_SETTINGS,
  propertySettings: { rows: DEFAULT_PROPERTY_ROWS, selectedId: null },
  schemSymbolSettings: DEFAULT_SCHEM_SYMBOL_SETTINGS,
  pcbFootprintSettings: DEFAULT_PCB_FOOTPRINT_SETTINGS,
  panelLibSettings: DEFAULT_PANEL_LIB_SETTINGS,
  toolbarCustomization: DEFAULT_TOOLBAR_CUSTOMIZATION,
  pcbNetClasses: DEFAULT_NET_CLASSES,
  pcbDiffPairs: DEFAULT_DIFF_PAIRS,
  pcbEqualLength: DEFAULT_EQUAL_LENGTH_GROUPS,
  pcbPadPairs: DEFAULT_PAD_PAIRS,
  pcbCoppers: DEFAULT_COPPERS,
  pcbTearDrop: DEFAULT_TEAR_DROP,
  pcbDrcRules: DEFAULT_DRC_RULES,
  removeUnusedPadOpts: { topLayer: true, bottomLayer: true, innerLayer: false, keepConnected: true },
  toast: null,
  snapEnabled: true,
  cornerOp: { mode: "fillet", radius: 5 },
  routingMode: "45deg",
  routingCorner: "miter",
  routingWidth: 10,
  boardSettings: {},
};
