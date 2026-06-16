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
  | "textEdit"
  | "jlcpcb"
  | "genBlock"
  | "boolOp"
  | "distribute"
  | "convertConfirm"
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
// tool key (resistor, capacitor, wire, text, etc.). Wire-like objects use
// endX/endY to define the second endpoint; others render at (x, y). `color`
// optionally overrides the default theme color.
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
}

// Tool keys that place a one-shot object on click (no draft).
export const PLACE_TOOLS: ReadonlyArray<string> = [
  "resistor",
  "capacitor",
  "diode",
  "inductor",
  "vcc5v",
  "agnd",
  "pgnd",
  "netLabel",
  "netFlag",
  "shortFlag",
  "port",
  "noConnect",
  "text",
  "pad",
  "via",
  "sutureVias",
];

// Tool keys that need two clicks (start + end) — wire-like.
export const DRAFT_TOOLS: ReadonlyArray<string> = ["wire", "bus"];

export interface PcbState {
  mode: Mode;
  leftMain: LeftMain;
  leftSub: LeftSub;
  netSub: "net" | "component";
  compSub: "designator" | "name" | "device" | "footprint";
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
  draftWire: { startX: number; startY: number; kind: "wire" | "bus" } | null;
  rubberBand: { x1: number; y1: number; x2: number; y2: number } | null;
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
}

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
};
