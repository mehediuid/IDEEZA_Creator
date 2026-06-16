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
  | null;

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

export interface PcbState {
  showCover: boolean;
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
  selected: "none" | "comp" | "wire";
  editingText: boolean;
  editText: string;
  netColor: string;
  colorPickerOpen: boolean;
}

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
  showCover: true,
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
  editText: "HB-PH3-25414P82GOP",
  netColor: "#1890FF",
  colorPickerOpen: false,
  viewTog: {
    "Top Toolbar": true,
    "Left-Side panel": true,
    "Right-Side Panel": true,
    "Bottom-Side Panel": false,
    "Floating Tool": true,
  },
  expanded: { Testing: true, "Board-1": true, "Board-2": true },
};
