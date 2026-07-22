"use client";

// IDEEZA PCB Software — editor store.
// Holds the editor state and every handler, ported 1:1 from the prototype's
// class methods. `merge` reproduces React class `setState` (shallow merge,
// partial or updater-function), so the ported handlers read identically.

import * as React from "react";
import { convertSchematicToPcb, routeRatsnest } from "./schematic-to-pcb";
import { booleanRings, shapeToPolygon, isCombinable, ringArea } from "./shape-boolean";
import { computeNets, runErc, buildNetlist, netlistText } from "./nets";
import { runDrc, defaultPcbDrcConfig, type PcbDrcConfig } from "./drc";
import { downloadDataUrl } from "./exporters";
import { defaultSchRulesConfig, type SchRulesConfig } from "./design-rules-data";
import {
  DEFAULT_SCHEM_OBJECTS,
  DEL_OBJ_NAMES,
  TOOLBAR_CATALOGS,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  initialState,
  type BottomTab,
  type FindMatch,
  type CanvasObject,
  type Copper,
  type DiffPair,
  type DrcRule,
  type EqualLengthGroup,
  type LeftMain,
  type LeftSub,
  type LibCommonTab,
  type LibFilter,
  type LibPrice,
  type LibView,
  type ManagerId,
  type MenuId,
  type ModalId,
  type Mode,
  type NetClass,
  type PadPairGroup,
  type PcbState,
  type RightTab,
  type SettingsPage,
  type TearDropSettings,
  isSelectable,
} from "./types";

const clampZoom = (z: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

type Merge = (
  patch: Partial<PcbState> | ((s: PcbState) => Partial<PcbState>),
) => void;

export interface PcbActions {
  merge: Merge;
  toggleMenu: (id: MenuId) => void;
  closeAll: () => void;
  setMode: (m: Mode) => void;
  openSettings: (page?: SettingsPage) => void;
  closeSettings: () => void;
  setSettingsPage: (page: SettingsPage) => void;
  /** Help ▸ Online Chat — the floating support widget (expanded vs bubble). */
  setChatOpen: (v: boolean) => void;
  toggleChat: () => void;
  // 3D-view controls — drive the three.js camera / render (real, no stubs).
  pcb3dFit: () => void;
  pcb3dPreset: (view: "iso" | "top" | "bottom") => void;
  pcb3dToggleProjection: () => void;
  pcb3dToggleExplode: () => void;
  export3dPng: () => void;
  openModal: (m: Exclude<ModalId, null>) => void;
  closeModal: () => void;
  toggleDelObj: (n: string) => void;
  toggleDelAll: () => void;
  setArr: (k: keyof PcbState["arr"], v: string) => void;
  setTbl: (k: keyof PcbState["tbl"], v: string) => void;
  startFloatDrag: (e: React.MouseEvent) => void;
  setLeftMain: (k: LeftMain) => void;
  setLeftSub: (k: LeftSub) => void;
  setNetSub: (k: PcbState["netSub"]) => void;
  setCompSub: (k: PcbState["compSub"]) => void;
  setRightTab: (k: RightTab) => void;
  clickBottomTab: (k: BottomTab) => void;
  /** Populate the Find Result tab and open it (from Ctrl+F → Find All). */
  runFind: (matches: FindMatch[]) => void;
  clearFind: () => void;
  closeBottom: () => void;
  toggleBottom: () => void;
  setTool: (t: string) => void;
  setSelectedTree: (label: string) => void;
  toggleExpanded: (label: string) => void;
  toggleExpandedKey: (key: string) => void;
  toggleView: (label: string) => void;
  openCanvasCtx: (e: React.MouseEvent) => void;
  setAnnot: (patch: Partial<PcbState["annot"]>) => void;
  setFr: (patch: Partial<Pick<PcbState, "frScope" | "frRegex" | "frMatch" | "frExt">>) => void;
  selectObject: (o: PcbState["selected"]) => void;
  startTextEdit: () => void;
  setEditText: (v: string) => void;
  stopTextEdit: () => void;
  setNetColor: (hex: string) => void;
  toggleColorPicker: (open?: boolean) => void;
  toggleTextStyle: (k: "b" | "i" | "u") => void;
  setWireLineStyle: (v: string) => void;
  setWireLineWidth: (v: string) => void;
  openManager: (id: Exclude<ManagerId, null>) => void;
  closeManager: () => void;
  setLibView: (v: LibView) => void;
  setLibCommonTab: (v: LibCommonTab) => void;
  setLibFilter: (v: LibFilter) => void;
  setLibPrice: (v: LibPrice) => void;
  setLibSelected: (id: string | null) => void;
  openLibCtx: (e: React.MouseEvent) => void;
  closeLibCtx: () => void;
  toggleFilterExpanded: () => void;
  toggleFilterDropdown: (open?: boolean) => void;
  toggleLayerVis: (name: string) => void;
  toggleLayerLock: (name: string) => void;
  // Canvas viewport
  zoomIn: (focus?: { x: number; y: number }) => void;
  zoomOut: (focus?: { x: number; y: number }) => void;
  zoomReset: () => void;
  /** Fit the view to all in-scope objects, or just the current selection. */
  zoomFit: (target?: "all" | "selection") => void;
  /** Force-write the current document to localStorage now (toolbar Save). */
  saveDoc: () => void;
  /** Mirror the PCB view to inspect the board from the bottom (Flip Board). */
  toggleBoardFlip: () => void;
  /** Net highlight — glow every object on `net` (null clears / Unhighlight All). */
  highlightNet: (net: string | null) => void;
  unhighlightAll: () => void;
  /** Electrical Rule Check (schematic) — compute issues + show in the ERC/DRC tab. */
  runErcCheck: () => void;
  /** Design Rule Check (PCB) — compute clearance violations + show in the DRC tab. */
  runDrcCheck: () => void;
  setDesignRules: (cfg: SchRulesConfig) => void;
  setPcbDrcConfig: (cfg: PcbDrcConfig) => void;
  /** Auto-number component designators (R1, C1, U1…) in reading order. */
  reannotate: () => void;
  /** Export a project netlist (.net) — nets → component pins, merged across sheets. */
  exportNetlist: () => void;
  /** Multi-sheet page navigation. */
  prevSheet: () => void;
  nextSheet: () => void;
  gotoSheet: (id: string) => void;
  addSheet: () => void;
  renameSheet: (id: string, name: string) => void;
  deleteSheet: (id: string) => void;
  /** Navigator (Nets/Parts/Objects tabs) helpers. */
  renameNet: (oldName: string, newName: string) => void;
  selectByNet: (net: string) => void;
  removeObjects: (ids: string[]) => void;
  /** Cross Probe — jump from a schematic symbol to its linked PCB footprint. */
  crossProbe: (id: string) => void;
  /** Boolean/Combine on 2+ selected shapes/regions → one real polygon result. */
  combineSelected: (op: "union" | "intersect" | "difference" | "xor") => void;
  /** Grab-move: pick up the selection so it follows the cursor (right-click Move). */
  startMoveSelected: () => void;
  translateMove: (dx: number, dy: number) => void;
  commitMove: () => void;
  cancelMove: () => void;
  setZoom: (z: number, focus?: { x: number; y: number }) => void;
  panBy: (dx: number, dy: number) => void;
  // Toolbar — grid / unit / visibility / transforms / z-order / undo-redo
  setGridSize: (s: string) => void;
  setUnit: (u: string) => void;
  toggleGridVisible: () => void;
  rotateSelBy: (deg: number) => void;
  flipSelV: () => void;
  flipSelH: () => void;
  bringFront: () => void;
  sendBack: () => void;
  undo: () => void;
  redo: () => void;
  // Canvas object placement (tools acting on canvas)
  placeObject: (kind: string, x: number, y: number) => void;
  startWire: (kind: string, x: number, y: number) => void;
  finishWire: (x: number, y: number) => void;
  cancelDraft: () => void;
  selectPlaced: (id: string | null, additive?: boolean) => void;
  selectDesignator: (compId: string, sub: "designator" | "name") => void;
  selectMany: (ids: string[]) => void;
  selectAll: () => void;
  deleteSelected: () => void;
  /** Replace the schematic sheet with the built-in current-sense-amp sample. */
  loadSampleSchematic: () => void;
  /** Derive footprints + ratsnest from the schematic and switch to PCB 2D. */
  convertSchematicToPcb: () => void;
  /** Turn the ratsnest airwires into copper tracks (simple L-route). */
  autoRoute: () => void;
  /** Assign the current selection to a new group (selects together after). */
  groupSelection: () => void;
  ungroupSelection: () => void;
  /** Clear style props on the selection back to defaults. */
  resetObjectStyle: () => void;
  /** Add an empty custom property row to the primary selected object. */
  addCustomProp: () => void;
  moveObject: (id: string, x: number, y: number) => void;
  setObjectField: (id: string, patch: Partial<CanvasObject>) => void;
  setObjectProp: (id: string, key: string, value: unknown) => void;
  setBoardSetting: (key: string, value: unknown) => void;
  setObjectText: (id: string, text: string) => void;
  rotateSelectedPlaced: (deg: number) => void;
  flipSelectedV: () => void;
  flipSelectedH: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: () => void;
  startRubberBand: (x: number, y: number) => void;
  updateRubberBand: (x: number, y: number) => void;
  commitRubberBand: (additive: boolean) => void;
  cancelRubberBand: () => void;
  startLasso: (x: number, y: number) => void;
  updateLasso: (x: number, y: number) => void;
  commitLasso: (additive: boolean) => void;
  cancelLasso: () => void;
  // PCB layer stack management
  setActivePcbLayer: (id: string) => void;
  togglePcbLayerVis: (id: string) => void;
  togglePcbLayerLock: (id: string) => void;
  setPcbLayerColor: (id: string, color: string) => void;
  setPcbLayerTransparency: (id: string, transparency: number) => void;
  setPcbLayerName: (id: string, name: string) => void;
  setPcbBoard: (patch: Partial<PcbState["pcbBoard"]>) => void;
  // PCB nets (Phase 2)
  addPcbNet: (name: string, color?: string, cls?: string) => void;
  setPcbNetColor: (name: string, color: string) => void;
  setPcbNetClass: (name: string, cls: string) => void;
  removePcbNet: (name: string) => void;
  setPcbDefaults: (patch: Partial<PcbState["pcbDefaults"]>) => void;
  // 2D editor board properties (drive the 2D canvas render)
  setTwoD: (patch: Partial<PcbState["twoD"]>) => void;
  // 3D editor board properties (drive the 3D canvas render)
  setThreeD: (patch: Partial<PcbState["threeD"]>) => void;
  // Schematic right-panel properties
  setSchemBasic: (patch: Partial<PcbState["schemBasic"]>) => void;
  setSchemBorder: (patch: Partial<PcbState["schemBorder"]>) => void;
  toggleSchemTitleShow: () => void;
  toggleSchemTitleField: (key: string, which: "on" | "valueOn") => void;
  setSchemTitleFieldValue: (key: string, value: string) => void;
  toggleSchemSection: (key: keyof PcbState["schemSectionOpen"]) => void;
  // Settings — Phase B
  setHotkey: (id: number, key: string) => void;
  resetHotkeys: () => void;
  toggleDrawingSelected: (id: string) => void;
  setSelectedFont: (font: string) => void;
  setSaveSettings: (patch: Partial<PcbState["saveSettings"]>) => void;
  // System Settings — Phase C
  setSystemSubPage: (sub: PcbState["systemSettings"]["subPage"]) => void;
  setSystemSettings: (patch: Partial<PcbState["systemSettings"]>) => void;
  toggleSystemCategory: (id: string) => void;
  // Property Settings — Phase C
  addPropertyRow: () => void;
  removePropertyRow: (id: string) => void;
  setPropertyRow: (id: string, patch: Partial<PcbState["propertySettings"]["rows"][number]>) => void;
  selectPropertyRow: (id: string | null) => void;
  movePropertyRow: (id: string, dir: -1 | 1) => void;
  // Phase D — deep settings pages
  setSchemSymSubPage: (sub: PcbState["schemSymbolSettings"]["subPage"]) => void;
  setSchemSymGeneral: (patch: Partial<PcbState["schemSymbolSettings"]["general"]>) => void;
  setSchemSymThemeColor: (id: string, color: string) => void;
  setPcbFpSubPage: (sub: PcbState["pcbFootprintSettings"]["subPage"]) => void;
  setPcbFpGeneral: (patch: Partial<PcbState["pcbFootprintSettings"]["general"]>) => void;
  setPcbFpThemeColor: (id: string, color: string) => void;
  setPcbFpGridCart: (patch: Partial<PcbState["pcbFootprintSettings"]["gridCart"]>) => void;
  setPcbFpGridPolar: (patch: Partial<PcbState["pcbFootprintSettings"]["gridPolar"]>) => void;
  setPcbFpTrackWidths: (widths: number[]) => void;
  setPcbFpSnap: (patch: Partial<PcbState["pcbFootprintSettings"]["snap"]>) => void;
  setPanelLibSubPage: (sub: PcbState["panelLibSettings"]["subPage"]) => void;
  setPanelLibGeneral: (patch: Partial<PcbState["panelLibSettings"]["general"]>) => void;
  setPanelLibThemeColor: (id: string, color: string) => void;
  setPanelLibLineStyle: (id: string, style: "Solid" | "Dashed" | "Dotted" | "Dash-Dot") => void;
  setPanelLibStrokeWidth: (id: string, width: number) => void;
  // Phase E — Top toolbar customization
  setToolbarScope: (scope: PcbState["toolbarCustomization"]["scope"]) => void;
  toggleToolbarItem: (scope: PcbState["toolbarCustomization"]["scope"], id: string) => void;
  selectAllToolbarItems: (scope: PcbState["toolbarCustomization"]["scope"]) => void;
  clearAllToolbarItems: (scope: PcbState["toolbarCustomization"]["scope"]) => void;
  resetToolbarCustomization: () => void;
  // Phase F — settings export / import + per-page reset
  exportSettingsJson: () => string;
  importSettingsJson: (json: string) => boolean;
  resetSettingsPage: (page: SettingsPage) => void;
  // Phase 3 — PCB Tools manager actions
  addNetClass: () => void;
  removeNetClass: (id: string) => void;
  setNetClassField: (id: string, patch: Partial<NetClass>) => void;
  addDiffPair: () => void;
  removeDiffPair: (id: string) => void;
  setDiffPairField: (id: string, patch: Partial<DiffPair>) => void;
  addEqualLengthGroup: () => void;
  removeEqualLengthGroup: (id: string) => void;
  setEqualLengthField: (id: string, patch: Partial<EqualLengthGroup>) => void;
  addPadPair: () => void;
  removePadPair: (id: string) => void;
  setPadPairField: (id: string, patch: Partial<PadPairGroup>) => void;
  addCopper: () => void;
  removeCopper: (id: string) => void;
  setCopperField: (id: string, patch: Partial<Copper>) => void;
  setTearDrop: (patch: Partial<TearDropSettings>) => void;
  setDrcRuleSeverity: (id: string, severity: DrcRule["severity"]) => void;
  setRemoveUnusedPadOpts: (patch: Partial<PcbState["removeUnusedPadOpts"]>) => void;
  addPcbLayer: () => void;
  removePcbLayer: (id: string) => void;
  movePcbLayer: (id: string, dir: -1 | 1) => void;
  // Phase 5 — IT-692 / IT-569 toolbar additions
  flashToast: (msg: string) => void;
  alignSelectedToGrid: () => void;
  /** Align / distribute the current multi-selection (left/right/top/bottom/hcenter/vcenter/distH/distV). */
  alignSelected: (mode: string) => void;
  /** Move the selection so its bounding-box min on the axis equals `value`. */
  setSelectionPos: (axis: "x" | "y", value: number) => void;
  /** Set every selected object's rotation to an absolute degree. */
  setSelectionRotation: (deg: number) => void;
  // Phase 6 — 2D File / Edit / Export menu helpers
  toggleSnap: () => void;
  setCornerOp: (patch: Partial<PcbState["cornerOp"]>) => void;
  // Phase 7 — Route options
  setRoutingMode: (m: PcbState["routingMode"]) => void;
  setRoutingCorner: (c: PcbState["routingCorner"]) => void;
  setRoutingWidth: (w: number) => void;
}

const StateCtx = React.createContext<PcbState | null>(null);
const ActionsCtx = React.createContext<PcbActions | null>(null);

// Bounding-box centre of a set of placed objects (including wire endpoints).
// This is the pivot for group rotate / flip — so a multi-selection turns and
// mirrors as one unit, not each object spinning in place.
function selCenter(objs: CanvasObject[]): { cx: number; cy: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const o of objs) {
    const pts: Array<[number, number]> = [[o.x, o.y]];
    if (o.endX != null && o.endY != null) pts.push([o.endX, o.endY]);
    for (const [x, y] of pts) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

// Fields captured by Undo/Redo (the "model" — not transient UI like menu open).
type Snapshot = Pick<
  PcbState,
  | "editText"
  | "netColor"
  | "wireLineStyle"
  | "wireLineWidth"
  | "textStyle"
  | "compRot"
  | "compFlipV"
  | "compFlipH"
  | "compZ"
  | "gridSize"
  | "unit"
  | "schemBasic"
  | "schemBorder"
  | "schemTitleShow"
  | "schemTitleFields"
  | "objects"
  | "selectedIds"
>;

const SNAP_KEYS: (keyof Snapshot)[] = [
  "editText",
  "netColor",
  "wireLineStyle",
  "wireLineWidth",
  "textStyle",
  "compRot",
  "compFlipV",
  "compFlipH",
  "compZ",
  "gridSize",
  "unit",
  "schemBasic",
  "schemBorder",
  "schemTitleShow",
  "schemTitleFields",
  "objects",
  "selectedIds",
];

function snap(s: PcbState): Snapshot {
  const out = {} as Snapshot;
  for (const k of SNAP_KEYS) {
    // @ts-expect-error — TS can't narrow heterogeneous key writes here, runtime is correct.
    out[k] = s[k];
  }
  return out;
}

// ── Document persistence ────────────────────────────────────────────────
// The user's actual work (placed objects, board dims, 2D/3D settings) is a
// "document" persisted to localStorage, scoped per active manual project so
// each project keeps its own board. UI flags (menus, panels, zoom) are not
// part of the document and reset per session.
const PCB_DOC_PREFIX = "ideeza:pcb:doc:";
const ACTIVE_PROJECT_KEY = "ideeza:manual:active";

function pcbDocKey(): string {
  let pid = "default";
  try {
    pid = window.localStorage.getItem(ACTIVE_PROJECT_KEY) || "default";
  } catch {}
  return PCB_DOC_PREFIX + pid;
}

type PcbDoc = Pick<
  PcbState,
  | "objects"
  | "pcbBoard"
  | "twoD"
  | "threeD"
  | "gridSize"
  | "unit"
  | "snapEnabled"
  | "designRules"
  | "pcbDrcConfig"
  | "pcbLayers"
  | "pcbNets"
  | "pcbDefaults"
  | "boardSettings"
>;

// Rebuild a safe document from persisted storage — stale or hand-edited data
// must never crash the editor.
function sanitizePcbDoc(raw: unknown): Partial<PcbDoc> | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const out: Partial<PcbDoc> = {};
  if (Array.isArray(r.objects)) {
    out.objects = r.objects.filter(
      (o): o is PcbState["objects"][number] =>
        typeof o === "object" &&
        o !== null &&
        typeof (o as { id?: unknown }).id === "string" &&
        typeof (o as { kind?: unknown }).kind === "string" &&
        typeof (o as { x?: unknown }).x === "number" &&
        typeof (o as { y?: unknown }).y === "number",
    );
  }
  const b = r.pcbBoard as { width?: unknown; height?: unknown } | undefined;
  if (
    typeof b === "object" &&
    b !== null &&
    typeof b.width === "number" &&
    b.width > 0 &&
    typeof b.height === "number" &&
    b.height > 0
  ) {
    out.pcbBoard = { width: b.width, height: b.height };
  }
  // Settings objects: shallow-merge over defaults so missing/new fields keep
  // their default values instead of becoming undefined.
  if (typeof r.twoD === "object" && r.twoD !== null) {
    out.twoD = { ...initialState.twoD, ...(r.twoD as Partial<PcbState["twoD"]>) };
  }
  if (typeof r.threeD === "object" && r.threeD !== null) {
    out.threeD = { ...initialState.threeD, ...(r.threeD as Partial<PcbState["threeD"]>) };
  }
  if (typeof r.gridSize === "string") out.gridSize = r.gridSize;
  if (typeof r.unit === "string") out.unit = r.unit;
  if (typeof r.snapEnabled === "boolean") out.snapEnabled = r.snapEnabled;
  // Design rules: accept a well-formed config, else fall back to defaults so a
  // stale/partial blob can't break ERC.
  const dr = r.designRules as Partial<SchRulesConfig> | undefined;
  if (dr && typeof dr === "object" && Array.isArray(dr.Net) && Array.isArray(dr.pinMatrix) && typeof dr.pinCheckEnabled === "boolean") {
    out.designRules = { ...defaultSchRulesConfig(), ...(dr as SchRulesConfig) };
  }
  // Tuned PCB DRC config — a well-formed config (clearance array) or null.
  if (r.pcbDrcConfig === null) out.pcbDrcConfig = null;
  else if (typeof r.pcbDrcConfig === "object" && Array.isArray((r.pcbDrcConfig as { clearance?: unknown }).clearance)) {
    out.pcbDrcConfig = r.pcbDrcConfig as PcbState["pcbDrcConfig"];
  }
  // Layer stack, net colors, place defaults, board settings — keep in-session
  // edits (colors / visibility / lock / track width …) across reloads.
  if (Array.isArray(r.pcbLayers)) {
    const ls = r.pcbLayers.filter(
      (l): l is PcbState["pcbLayers"][number] =>
        typeof l === "object" && l !== null && typeof (l as { id?: unknown }).id === "string" && typeof (l as { name?: unknown }).name === "string",
    );
    if (ls.length) out.pcbLayers = ls;
  }
  if (Array.isArray(r.pcbNets)) {
    out.pcbNets = r.pcbNets.filter(
      (n): n is PcbState["pcbNets"][number] => typeof n === "object" && n !== null && typeof (n as { name?: unknown }).name === "string",
    );
  }
  if (typeof r.pcbDefaults === "object" && r.pcbDefaults !== null) {
    out.pcbDefaults = { ...initialState.pcbDefaults, ...(r.pcbDefaults as Partial<PcbState["pcbDefaults"]>) };
  }
  if (typeof r.boardSettings === "object" && r.boardSettings !== null) {
    out.boardSettings = { ...(initialState.boardSettings ?? {}), ...(r.boardSettings as Record<string, unknown>) };
  }
  return out;
}

export function PcbProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PcbState>(initialState);
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Undo/redo stacks of "model" snapshots. Kept outside React state to avoid
  // re-renders when history mutates.
  const historyRef = React.useRef<{ past: Snapshot[]; future: Snapshot[] }>({
    past: [],
    future: [],
  });
  const MAX_HISTORY = 50;
  // Monotonic ID generator for placed canvas objects.
  const objIdCounter = React.useRef(1);
  // Snapshot captured when a grab-move starts, so the whole move commits/undoes
  // as ONE history step (live translation uses plain merge, no per-frame history).
  const moveOrigRef = React.useRef<Snapshot | null>(null);

  // Hydrate the persisted document once on mount (client only), then bump the
  // id counter past any restored ids so new placements never collide.
  const [docHydrated, setDocHydrated] = React.useState(false);
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(pcbDocKey());
      if (raw) {
        const doc = sanitizePcbDoc(JSON.parse(raw));
        if (doc) {
          setState((s) => ({ ...s, ...doc }));
          let maxId = 0;
          for (const o of doc.objects ?? []) {
            const m = /^obj_(\d+)$/.exec(o.id);
            if (m) maxId = Math.max(maxId, Number(m[1]));
          }
          objIdCounter.current = Math.max(objIdCounter.current, maxId + 1);
        }
      }
    } catch {}
    setDocHydrated(true);
  }, []);

  // Debounced save — placing/dragging mutates objects frequently; one write
  // per pause keeps localStorage churn (and JSON serialization) off the
  // interaction path.
  React.useEffect(() => {
    if (!docHydrated) return;
    const t = window.setTimeout(() => {
      try {
        const doc: PcbDoc = {
          objects: state.objects,
          pcbBoard: state.pcbBoard,
          twoD: state.twoD,
          threeD: state.threeD,
          gridSize: state.gridSize,
          unit: state.unit,
          snapEnabled: state.snapEnabled,
          designRules: state.designRules,
          pcbDrcConfig: state.pcbDrcConfig,
          pcbLayers: state.pcbLayers,
          pcbNets: state.pcbNets,
          pcbDefaults: state.pcbDefaults,
          boardSettings: state.boardSettings,
        };
        window.localStorage.setItem(pcbDocKey(), JSON.stringify(doc));
      } catch {}
    }, 300);
    return () => window.clearTimeout(t);
  }, [
    docHydrated,
    state.objects,
    state.pcbBoard,
    state.twoD,
    state.threeD,
    state.gridSize,
    state.unit,
    state.snapEnabled,
    state.designRules,
    state.pcbDrcConfig,
    state.pcbLayers,
    state.pcbNets,
    state.pcbDefaults,
    state.boardSettings,
  ]);

  const merge = React.useCallback<Merge>((patch) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  // Capture the *current* state into history.past before applying a model-changing
  // patch. Clears future (standard undo behavior).
  const mergeWithHistory = React.useCallback<Merge>(
    (patch) => {
      const before = stateRef.current;
      const beforeSnap = snap(before);
      setState((s) => {
        const next = { ...s, ...(typeof patch === "function" ? patch(s) : patch) };
        const changed = SNAP_KEYS.some((k) => beforeSnap[k] !== snap(next)[k]);
        if (changed) {
          historyRef.current.past.push(beforeSnap);
          if (historyRef.current.past.length > MAX_HISTORY) {
            historyRef.current.past.shift();
          }
          historyRef.current.future = [];
        }
        return next;
      });
    },
    [],
  );

  const actions = React.useMemo<PcbActions>(() => {
    return {
      merge,
      toggleMenu: (id) =>
        merge((s) => ({ openMenu: s.openMenu === id ? null : id, ctx: null })),
      closeAll: () => merge({ openMenu: null, ctx: null }),
      setMode: (m) => {
        const s = stateRef.current;
        // Auto-convert on the first Schematic → PCB entry: if the board has no
        // converted/routed layout yet, build footprints + ratsnest from the
        // schematic automatically so the parts are there without a manual step.
        // Once a layout exists (or the user has routed), leave it untouched —
        // use Design ▸ Convert Schematic to PCB to re-sync deliberately.
        if ((m === "pcb" || m === "2d") && s.mode === "schematic") {
          const hasLayout = s.objects.some(
            (o) => o.props?.gen === "convert" || o.props?.gen === "route",
          );
          if (!hasLayout) {
            const { objects: generated, parts, nets, airwires } = convertSchematicToPcb(s.objects);
            if (generated.length > 0) {
              mergeWithHistory((st) => ({
                objects: [
                  ...st.objects.filter((o) => o.props?.gen !== "convert" && o.props?.gen !== "route"),
                  ...generated,
                ],
                mode: m,
                openMenu: null,
                ctx: null,
                selectedIds: [],
                selSub: "none",
                draftWire: null,
              }));
              actions.flashToast(
                `Auto-converted — ${parts} footprints · ${nets} nets · ${airwires} airwires`,
              );
              return;
            }
          }
        }
        merge({ mode: m, openMenu: null, ctx: null });
      },
      openSettings: (page) =>
        merge({ settingsOpen: true, settingsPage: page ?? "system", openMenu: null }),
      closeSettings: () => merge({ settingsOpen: false }),
      setSettingsPage: (page) => merge({ settingsPage: page }),
      setChatOpen: (v) => merge({ chatOpen: v, openMenu: null }),
      toggleChat: () => merge((s) => ({ chatOpen: !s.chatOpen, openMenu: null })),
      pcb3dFit: () => merge((s) => ({ pcb3d: { ...s.pcb3d, fitNonce: s.pcb3d.fitNonce + 1 } })),
      pcb3dPreset: (view) =>
        merge((s) => ({ pcb3d: { ...s.pcb3d, preset: view, presetNonce: s.pcb3d.presetNonce + 1 } })),
      pcb3dToggleProjection: () =>
        merge((s) => ({
          pcb3d: {
            ...s.pcb3d,
            projection: s.pcb3d.projection === "perspective" ? "orthographic" : "perspective",
          },
        })),
      pcb3dToggleExplode: () => merge((s) => ({ pcb3d: { ...s.pcb3d, explode: !s.pcb3d.explode } })),
      export3dPng: () => {
        // Capture the WebGL 3D canvas (preserveDrawingBuffer is on) → PNG.
        const cvs = Array.from(document.querySelectorAll("canvas")) as HTMLCanvasElement[];
        const c = cvs.sort((a, b) => b.width * b.height - a.width * a.height)[0];
        if (!c) { actions.flashToast("3D view not ready"); return; }
        try {
          downloadDataUrl("pcb-3d.png", c.toDataURL("image/png"));
          actions.flashToast("Exported pcb-3d.png");
        } catch {
          actions.flashToast("PNG capture blocked by the browser");
        }
      },
      openModal: (m) => merge({ modal: m, openMenu: null, ctx: null }),
      closeModal: () => merge({ modal: null }),
      toggleDelObj: (n) =>
        merge((s) => ({ delObj: { ...s.delObj, [n]: !s.delObj[n as keyof typeof s.delObj] } })),
      toggleDelAll: () =>
        merge((s) => {
          const on = DEL_OBJ_NAMES.every((n) => s.delObj[n]);
          const next = {} as PcbState["delObj"];
          DEL_OBJ_NAMES.forEach((n) => (next[n] = !on));
          return { delObj: next };
        }),
      setArr: (k, v) => merge((s) => ({ arr: { ...s.arr, [k]: v } })),
      setTbl: (k, v) => merge((s) => ({ tbl: { ...s.tbl, [k]: v } })),
      startFloatDrag: (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const sx = e.clientX;
        const sy = e.clientY;
        const ox = stateRef.current.floatPos.x;
        const oy = stateRef.current.floatPos.y;
        const move = (ev: MouseEvent) =>
          merge({
            floatPos: {
              x: Math.max(0, ox + ev.clientX - sx),
              y: Math.max(0, oy + ev.clientY - sy),
            },
          });
        const up = () => {
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
      },
      setLeftMain: (k) => merge({ leftMain: k }),
      setLeftSub: (k) => merge({ leftSub: k }),
      setNetSub: (k) => merge({ netSub: k }),
      setCompSub: (k) => merge({ compSub: k }),
      setRightTab: (k) => merge({ rightTab: k }),
      clickBottomTab: (k) =>
        merge((s) => ({
          bottomTab: k,
          bottomOpen: s.bottomTab === k ? !s.bottomOpen : true,
        })),
      runFind: (matches) => merge({ findResults: matches, bottomTab: "find", bottomOpen: true }),
      clearFind: () => merge({ findResults: [] }),
      closeBottom: () => merge({ bottomOpen: false }),
      toggleBottom: () => merge((s) => ({ bottomOpen: !s.bottomOpen })),
      setTool: (t) => merge({ tool: t }),
      setSelectedTree: (label) => merge({ selectedTree: label }),
      toggleExpanded: (label) =>
        merge((s) => ({ expanded: { ...s.expanded, [label]: !s.expanded[label] } })),
      toggleExpandedKey: (key) =>
        merge((s) => ({ expanded: { ...s.expanded, [key]: s.expanded[key] === false ? true : false } })),
      toggleView: (label) =>
        merge((s) => ({ viewTog: { ...s.viewTog, [label]: !s.viewTog[label] } })),
      openCanvasCtx: (e) => {
        e.preventDefault();
        // The menu lives inside `.pcb-app` (position:fixed, inset:0), so its
        // absolute top/left ARE viewport coordinates — anchor it right at the
        // cursor. (The old +366/+225 constants assumed a fixed panel/toolbar
        // layout and dropped the menu ~117px below the pointer.) The
        // ContextMenu's own layout effect then clamps it inside the viewport.
        const x = e.clientX, y = e.clientY;
        merge({ ctx: true, openMenu: null, ctxX: `${x}px`, ctxY: `${y}px` });
      },
      setAnnot: (patch) => merge((s) => ({ annot: { ...s.annot, ...patch } })),
      setFr: (patch) => merge(patch),
      selectObject: (o) => merge({ selected: o, editingText: false, colorPickerOpen: false }),
      startTextEdit: () => merge({ selected: "comp", editingText: true }),
      setEditText: (v) => merge({ editText: v }),
      stopTextEdit: () => merge({ editingText: false }),
      setNetColor: (hex) => merge({ netColor: hex }),
      toggleColorPicker: (open) => merge((s) => ({ colorPickerOpen: open ?? !s.colorPickerOpen })),
      toggleTextStyle: (k) => merge((s) => ({ textStyle: { ...s.textStyle, [k]: !s.textStyle[k] } })),
      setWireLineStyle: (v) => merge({ wireLineStyle: v }),
      setWireLineWidth: (v) => merge({ wireLineWidth: v }),
      openManager: (id) => merge({ manager: id, openMenu: null, ctx: null }),
      closeManager: () => merge({ manager: null }),
      setLibView: (v) => merge({ libView: v, libSelected: null, libCtx: null }),
      setLibCommonTab: (v) => merge({ libCommonTab: v }),
      setLibFilter: (v) => merge({ libFilter: v }),
      setLibPrice: (v) => merge({ libPrice: v }),
      setLibSelected: (id) => merge({ libSelected: id }),
      openLibCtx: (e) => {
        e.preventDefault();
        merge({ libCtx: { x: `${e.clientX}px`, y: `${e.clientY}px` } });
      },
      closeLibCtx: () => merge({ libCtx: null }),
      toggleFilterExpanded: () => merge((s) => ({ filterExpanded: !s.filterExpanded })),
      toggleFilterDropdown: (open) => merge((s) => ({ filterDropdownOpen: open ?? !s.filterDropdownOpen })),
      toggleLayerVis: (name) =>
        merge((s) => ({ layerVis: { ...s.layerVis, [name]: s.layerVis[name] === false ? true : false } })),
      toggleLayerLock: (name) =>
        merge((s) => ({ layerLock: { ...s.layerLock, [name]: !s.layerLock[name] } })),
      setZoom: (z, focus) =>
        merge((s) => {
          const next = clampZoom(z);
          if (next === s.zoom) return {};
          if (!focus) return { zoom: next };
          // keep the focus point fixed while scaling: (focus - pan) / oldZoom == (focus - newPan) / newZoom
          const k = next / s.zoom;
          return {
            zoom: next,
            pan: {
              x: focus.x - (focus.x - s.pan.x) * k,
              y: focus.y - (focus.y - s.pan.y) * k,
            },
          };
        }),
      zoomIn: (focus) =>
        merge((s) => {
          const next = clampZoom(s.zoom * ZOOM_STEP);
          if (next === s.zoom) return {};
          if (!focus) return { zoom: next };
          const k = next / s.zoom;
          return {
            zoom: next,
            pan: {
              x: focus.x - (focus.x - s.pan.x) * k,
              y: focus.y - (focus.y - s.pan.y) * k,
            },
          };
        }),
      zoomOut: (focus) =>
        merge((s) => {
          const next = clampZoom(s.zoom / ZOOM_STEP);
          if (next === s.zoom) return {};
          if (!focus) return { zoom: next };
          const k = next / s.zoom;
          return {
            zoom: next,
            pan: {
              x: focus.x - (focus.x - s.pan.x) * k,
              y: focus.y - (focus.y - s.pan.y) * k,
            },
          };
        }),
      zoomReset: () => merge({ zoom: 1, pan: { x: 0, y: 0 } }),
      // Real fit: measure the canvas viewport, compute the bounding box of the
      // in-scope objects (or the selection), then set zoom + pan so the box is
      // centred with padding. Falls back to a reset when there's nothing to fit.
      zoomFit: (target = "all") =>
        merge((s) => {
          const el = typeof document !== "undefined" ? (document.querySelector("[data-canvas-wrapper]") as HTMLElement | null) : null;
          const W = el?.clientWidth ?? 900;
          const H = el?.clientHeight ?? 600;
          const modeScope = s.mode === "schematic" ? "schematic" : "pcb";
          let objs = s.objects.filter((o) => !o.scope || o.scope === modeScope);
          if (target === "selection" && s.selectedIds.length > 0) {
            objs = objs.filter((o) => s.selectedIds.includes(o.id));
          }
          if (objs.length === 0) return { zoom: 1, pan: { x: 0, y: 0 } };
          const M = 20; // glyph half-extent so symbols aren't clipped at the edge
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const o of objs) {
            const xs = [o.x, o.endX ?? o.x];
            const ys = [o.y, o.endY ?? o.y];
            minX = Math.min(minX, ...xs); maxX = Math.max(maxX, ...xs);
            minY = Math.min(minY, ...ys); maxY = Math.max(maxY, ...ys);
          }
          minX -= M; minY -= M; maxX += M; maxY += M;
          const cw = Math.max(1, maxX - minX);
          const ch = Math.max(1, maxY - minY);
          const pad = 80;
          const zoom = Math.max(0.1, Math.min(4, Math.min((W - pad) / cw, (H - pad) / ch)));
          const bcx = (minX + maxX) / 2, bcy = (minY + maxY) / 2;
          return { zoom, pan: { x: W / 2 - bcx * zoom, y: H / 2 - bcy * zoom } };
        }),
      saveDoc: () => {
        try {
          const s = stateRef.current;
          const doc: PcbDoc = {
            objects: s.objects, pcbBoard: s.pcbBoard, twoD: s.twoD, threeD: s.threeD,
            gridSize: s.gridSize, unit: s.unit, snapEnabled: s.snapEnabled, designRules: s.designRules,
            pcbDrcConfig: s.pcbDrcConfig, pcbLayers: s.pcbLayers, pcbNets: s.pcbNets,
            pcbDefaults: s.pcbDefaults, boardSettings: s.boardSettings,
          };
          window.localStorage.setItem(pcbDocKey(), JSON.stringify(doc));
          actions.flashToast("Saved");
        } catch {
          actions.flashToast("Save failed");
        }
      },
      toggleBoardFlip: () =>
        merge((s) => {
          actions.flashToast(s.boardFlipped ? "Viewing top of board" : "Viewing bottom of board");
          return { boardFlipped: !s.boardFlipped };
        }),
      highlightNet: (net) => {
        const s = stateRef.current;
        if (!net) { merge({ highlightedNet: null, highlightedMembers: [] }); return; }
        let members: string[];
        if (s.mode === "schematic") {
          const first = s.schematicSheets[0]?.id;
          const objs = s.objects.filter((o) => (!o.scope || o.scope === "schematic") && (o.sheetId ?? first) === s.activeSheetId);
          members = computeNets(objs).membersOf(net);
        } else {
          members = s.objects.filter((o) => o.net === net).map((o) => o.id);
        }
        merge({ highlightedNet: net, highlightedMembers: members });
        actions.flashToast(`Highlighting net ${net}`);
      },
      unhighlightAll: () =>
        merge((s) => {
          if (s.highlightedNet) actions.flashToast("Cleared net highlight");
          return { highlightedNet: null, highlightedMembers: [] };
        }),
      exportNetlist: () => {
        const s = stateRef.current;
        const nl = buildNetlist(s.objects, s.schematicSheets);
        if (!nl.length) { actions.flashToast("No connected pins — nothing to export"); return; }
        try {
          const blob = new Blob([netlistText(nl)], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = "netlist.net";
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          actions.flashToast(`Netlist exported — ${nl.length} nets`);
        } catch { actions.flashToast("Netlist export failed"); }
      },
      runErcCheck: () => {
        const s = stateRef.current;
        const first = s.schematicSheets[0]?.id;
        const objs = s.objects.filter((o) => (!o.scope || o.scope === "schematic") && (o.sheetId ?? first) === s.activeSheetId);
        const issues = runErc(objs, s.designRules);
        merge({ ercResults: issues, bottomTab: "drc", bottomOpen: true });
        actions.flashToast(issues.length ? `ERC: ${issues.length} issue(s) found` : "ERC passed — no issues");
      },
      runDrcCheck: () => {
        const s = stateRef.current;
        const objs = s.objects.filter((o) => o.scope === "pcb");
        // Diff-pair rules run against the live pcbDiffPairs. Netlist-mismatch is
        // gated off: the Schematic→PCB convert renames nets to N1…, so a name
        // comparison against the schematic would flood every net as "missing"
        // until the convert preserves net names.
        // Base config = the tuned PCB Design Rules dialog config (state.pcbDrcConfig)
        // when the user has applied it; else the engine defaults. Diff-pairs are
        // always the live pairs; netlist-mismatch stays gated off (see above).
        const base = s.pcbDrcConfig ?? defaultPcbDrcConfig();
        const cfg = { ...base, diffPairs: s.pcbDiffPairs, netlistEnabled: false };
        const issues = runDrc(objs, cfg);
        merge({ pcbDrcResults: issues, bottomTab: "drc", bottomOpen: true });
        actions.flashToast(issues.length ? `DRC: ${issues.length} violation(s) found` : "DRC passed — no violations");
      },
      setDesignRules: (cfg) => merge({ designRules: cfg }),
      setPcbDrcConfig: (cfg) => merge({ pcbDrcConfig: cfg }),
      reannotate: () =>
        mergeWithHistory((s) => {
          const prefix: Record<string, string> = { resistor: "R", resistorBox: "R", capacitor: "C", inductor: "L", diode: "D", crystal: "Y", opamp: "U", ic: "U", component: "U", currentSource: "I", transistor: "Q" };
          const counters: Record<string, number> = {};
          const idToText = new Map<string, string>();
          [...s.objects]
            .filter((o) => prefix[o.kind])
            .sort((a, b) => a.y - b.y || a.x - b.x) // reading order: top-left → bottom-right
            .forEach((o) => { const p = prefix[o.kind]; counters[p] = (counters[p] ?? 0) + 1; idToText.set(o.id, `${p}${counters[p]}`); });
          if (idToText.size) actions.flashToast(`Reannotated ${idToText.size} components`);
          return { objects: s.objects.map((o) => (idToText.has(o.id) ? { ...o, text: idToText.get(o.id) } : o)) };
        }),
      // Page navigation cycles the sheet list (clamped at the ends).
      prevSheet: () =>
        merge((s) => {
          const i = s.schematicSheets.findIndex((sh) => sh.id === s.activeSheetId);
          const ni = Math.max(0, i - 1);
          return { activeSheetId: s.schematicSheets[ni].id, selectedIds: [] };
        }),
      nextSheet: () =>
        merge((s) => {
          const i = s.schematicSheets.findIndex((sh) => sh.id === s.activeSheetId);
          const ni = Math.min(s.schematicSheets.length - 1, i + 1);
          return { activeSheetId: s.schematicSheets[ni].id, selectedIds: [] };
        }),
      gotoSheet: (id) => merge({ activeSheetId: id, selectedIds: [] }),
      addSheet: () =>
        merge((s) => {
          const id = `sheet-${Date.now()}`;
          return {
            schematicSheets: [...s.schematicSheets, { id, name: `Sheet ${s.schematicSheets.length + 1}` }],
            activeSheetId: id,
            selectedIds: [],
          };
        }),
      renameSheet: (id, name) =>
        merge((s) => ({ schematicSheets: s.schematicSheets.map((sh) => (sh.id === id ? { ...sh, name: name.trim() || sh.name } : sh)) })),
      deleteSheet: (id) => {
        const s = stateRef.current;
        if (s.schematicSheets.length <= 1) { actions.flashToast("Can't delete the last sheet"); return; }
        mergeWithHistory((st) => {
          const sheets = st.schematicSheets.filter((sh) => sh.id !== id);
          const first = st.schematicSheets[0]?.id;
          return {
            schematicSheets: sheets,
            activeSheetId: st.activeSheetId === id ? sheets[0].id : st.activeSheetId,
            objects: st.objects.filter((o) => !(o.scope === "schematic" && (o.sheetId ?? first) === id)),
            selectedIds: [],
          };
        });
      },
      renameNet: (oldName, newName) => {
        const nn = newName.trim();
        if (!nn || nn === oldName) return;
        mergeWithHistory((s) => ({
          objects: s.objects.map((o) => (o.net === oldName ? { ...o, net: nn } : o)),
          highlightedNet: s.highlightedNet === oldName ? nn : s.highlightedNet,
        }));
      },
      selectByNet: (net) => {
        const s = stateRef.current;
        let ids: string[];
        if (s.mode === "schematic") {
          const first = s.schematicSheets[0]?.id;
          const objs = s.objects.filter((o) => (!o.scope || o.scope === "schematic") && (o.sheetId ?? first) === s.activeSheetId);
          ids = computeNets(objs).membersOf(net);
        } else {
          ids = s.objects.filter((o) => o.net === net).map((o) => o.id);
        }
        merge({ selectedIds: ids, selSub: "none" });
      },
      removeObjects: (ids) => {
        const set = new Set(ids);
        mergeWithHistory((s) => ({ objects: s.objects.filter((o) => !set.has(o.id)), selectedIds: s.selectedIds.filter((x) => !set.has(x)) }));
      },
      // Cross Probe — from a schematic symbol, find the PCB footprint that
      // Convert linked to it (sourceId) and jump to it: switch to PCB, select
      // it, fit the view. Falls back to a toast when there's no link yet.
      crossProbe: (id) => {
        const s = stateRef.current;
        const target = s.objects.find((o) => o.sourceId === id || (o.scope === "pcb" && o.sourceId === id));
        actions.closeAll();
        if (!target) { actions.flashToast("No linked PCB object — run Convert to PCB first"); return; }
        actions.setMode("pcb");
        setTimeout(() => { actions.selectPlaced(target.id, false); actions.zoomFit("selection"); }, 60);
      },
      combineSelected: (op) => {
        const s = stateRef.current;
        const sel = s.objects.filter((o) => s.selectedIds.includes(o.id) && isCombinable(o));
        if (sel.length < 2) { actions.flashToast("Select 2 or more shapes to combine"); return; }
        const rings = booleanRings(sel.map(shapeToPolygon), op);
        if (!rings.length) { actions.flashToast("Combine produced an empty shape"); return; }
        const pts = rings.flat();
        const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
        const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
        rings.sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a))); // outer ring first
        const local = rings.map((r) => r.map((p) => ({ x: p.x - cx, y: p.y - cy })));
        const first = sel[0];
        const id = `obj_${objIdCounter.current++}`;
        const result: CanvasObject = {
          id, kind: "combineShape", x: cx, y: cy, rotation: 0,
          color: first.color, layer: first.layer, scope: first.scope, sheetId: first.sheetId,
          points: local, props: { combineOp: op },
        };
        const gone = new Set(sel.map((o) => o.id));
        mergeWithHistory((st) => ({ objects: [...st.objects.filter((o) => !gone.has(o.id)), result], selectedIds: [id] }));
        actions.flashToast(`Combined ${sel.length} shapes (${op})`);
      },
      startMoveSelected: () => {
        const s = stateRef.current;
        if (!s.selectedIds.length) { actions.closeAll(); return; }
        moveOrigRef.current = snap(s);            // for one-step undo / cancel
        merge({ moveMode: { ids: [...s.selectedIds] }, ctx: null, openMenu: null });
        actions.flashToast("Moving — click to drop, Esc to cancel");
      },
      translateMove: (dx, dy) =>
        merge((s) => {
          if (!s.moveMode) return {};
          const ids = new Set(s.moveMode.ids);
          return {
            objects: s.objects.map((o) =>
              ids.has(o.id)
                ? { ...o, x: o.x + dx, y: o.y + dy, endX: o.endX != null ? o.endX + dx : undefined, endY: o.endY != null ? o.endY + dy : undefined }
                : o,
            ),
          };
        }),
      commitMove: () => {
        const orig = moveOrigRef.current;
        moveOrigRef.current = null;
        // Record the whole move as a single undo step (guard against a no-op drop).
        if (orig && SNAP_KEYS.some((k) => orig[k] !== snap(stateRef.current)[k])) {
          historyRef.current.past.push(orig);
          if (historyRef.current.past.length > MAX_HISTORY) historyRef.current.past.shift();
          historyRef.current.future = [];
        }
        merge({ moveMode: null });
      },
      cancelMove: () => {
        const orig = moveOrigRef.current;
        moveOrigRef.current = null;
        if (orig) merge({ objects: orig.objects, moveMode: null });
        else merge({ moveMode: null });
      },
      panBy: (dx, dy) => merge((s) => ({ pan: { x: s.pan.x + dx, y: s.pan.y + dy } })),
      setSchemBasic: (patch) =>
        merge((s) => ({ schemBasic: { ...s.schemBasic, ...patch } })),
      setSchemBorder: (patch) =>
        merge((s) => ({ schemBorder: { ...s.schemBorder, ...patch } })),
      toggleSchemTitleShow: () =>
        merge((s) => ({ schemTitleShow: !s.schemTitleShow })),
      toggleSchemTitleField: (key, which) =>
        merge((s) => ({
          schemTitleFields: s.schemTitleFields.map((f) =>
            f.key === key ? { ...f, [which]: !f[which] } : f,
          ),
        })),
      setSchemTitleFieldValue: (key, value) =>
        merge((s) => ({
          schemTitleFields: s.schemTitleFields.map((f) =>
            f.key === key ? { ...f, value } : f,
          ),
        })),
      toggleSchemSection: (key) =>
        merge((s) => ({
          schemSectionOpen: { ...s.schemSectionOpen, [key]: !s.schemSectionOpen[key] },
        })),
      setHotkey: (id, key) =>
        mergeWithHistory((s) => ({
          hotkeys: s.hotkeys.map((h) => (h.id === id ? { ...h, key } : h)),
        })),
      resetHotkeys: () =>
        // Defensive: import the default snapshot via initialState so the source
        // of truth remains DEFAULT_HOTKEYS in types.ts.
        mergeWithHistory(() => ({ hotkeys: initialState.hotkeys.map((h) => ({ ...h })) })),
      toggleDrawingSelected: (id) =>
        mergeWithHistory((s) => ({
          drawings: s.drawings.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d)),
        })),
      setSelectedFont: (font) =>
        mergeWithHistory((s) => ({ fonts: { ...s.fonts, selected: font } })),
      setSaveSettings: (patch) =>
        mergeWithHistory((s) => ({ saveSettings: { ...s.saveSettings, ...patch } })),
      setSystemSubPage: (sub) =>
        merge((s) => ({ systemSettings: { ...s.systemSettings, subPage: sub } })),
      setSystemSettings: (patch) =>
        mergeWithHistory((s) => ({ systemSettings: { ...s.systemSettings, ...patch } })),
      toggleSystemCategory: (id) =>
        mergeWithHistory((s) => ({
          systemSettings: {
            ...s.systemSettings,
            categories: s.systemSettings.categories.map((c) =>
              c.id === id ? { ...c, on: !c.on } : c,
            ),
          },
        })),
      addPropertyRow: () =>
        mergeWithHistory((s) => {
          const id = `p_${Date.now().toString(36)}`;
          const row = { id, property: "New property", object: "Schematic Default", displayInCanvas: "Show" };
          return {
            propertySettings: {
              rows: [...s.propertySettings.rows, row],
              selectedId: id,
            },
          };
        }),
      removePropertyRow: (id) =>
        mergeWithHistory((s) => ({
          propertySettings: {
            rows: s.propertySettings.rows.filter((r) => r.id !== id),
            selectedId: null,
          },
        })),
      setPropertyRow: (id, patch) =>
        mergeWithHistory((s) => ({
          propertySettings: {
            ...s.propertySettings,
            rows: s.propertySettings.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
          },
        })),
      selectPropertyRow: (id) =>
        merge((s) => ({ propertySettings: { ...s.propertySettings, selectedId: id } })),
      movePropertyRow: (id, dir) =>
        mergeWithHistory((s) => {
          const rows = [...s.propertySettings.rows];
          const i = rows.findIndex((r) => r.id === id);
          if (i < 0) return {};
          const j = i + dir;
          if (j < 0 || j >= rows.length) return {};
          [rows[i], rows[j]] = [rows[j], rows[i]];
          return { propertySettings: { ...s.propertySettings, rows } };
        }),
      // ── Phase D — Schematic / Symbol settings ────────────────────────────────
      setSchemSymSubPage: (sub) =>
        merge((s) => ({ schemSymbolSettings: { ...s.schemSymbolSettings, subPage: sub } })),
      setSchemSymGeneral: (patch) =>
        mergeWithHistory((s) => ({
          schemSymbolSettings: {
            ...s.schemSymbolSettings,
            general: { ...s.schemSymbolSettings.general, ...patch },
          },
        })),
      setSchemSymThemeColor: (id, color) =>
        mergeWithHistory((s) => ({
          schemSymbolSettings: {
            ...s.schemSymbolSettings,
            theme: s.schemSymbolSettings.theme.map((t) =>
              t.id === id ? { ...t, color } : t,
            ),
          },
        })),
      // ── Phase D — PCB / Footprint settings ───────────────────────────────────
      setPcbFpSubPage: (sub) =>
        merge((s) => ({ pcbFootprintSettings: { ...s.pcbFootprintSettings, subPage: sub } })),
      setPcbFpGeneral: (patch) =>
        mergeWithHistory((s) => ({
          pcbFootprintSettings: {
            ...s.pcbFootprintSettings,
            general: { ...s.pcbFootprintSettings.general, ...patch },
          },
        })),
      setPcbFpThemeColor: (id, color) =>
        mergeWithHistory((s) => ({
          pcbFootprintSettings: {
            ...s.pcbFootprintSettings,
            theme: s.pcbFootprintSettings.theme.map((t) =>
              t.id === id ? { ...t, color } : t,
            ),
          },
        })),
      setPcbFpGridCart: (patch) =>
        mergeWithHistory((s) => ({
          pcbFootprintSettings: {
            ...s.pcbFootprintSettings,
            gridCart: { ...s.pcbFootprintSettings.gridCart, ...patch },
          },
        })),
      setPcbFpGridPolar: (patch) =>
        mergeWithHistory((s) => ({
          pcbFootprintSettings: {
            ...s.pcbFootprintSettings,
            gridPolar: { ...s.pcbFootprintSettings.gridPolar, ...patch },
          },
        })),
      setPcbFpTrackWidths: (widths) =>
        mergeWithHistory((s) => ({
          pcbFootprintSettings: { ...s.pcbFootprintSettings, trackWidths: widths },
        })),
      setPcbFpSnap: (patch) =>
        mergeWithHistory((s) => ({
          pcbFootprintSettings: {
            ...s.pcbFootprintSettings,
            snap: { ...s.pcbFootprintSettings.snap, ...patch },
          },
        })),
      // ── Phase D — Panel / Panel Lib settings ─────────────────────────────────
      setPanelLibSubPage: (sub) =>
        merge((s) => ({ panelLibSettings: { ...s.panelLibSettings, subPage: sub } })),
      setPanelLibGeneral: (patch) =>
        mergeWithHistory((s) => ({
          panelLibSettings: {
            ...s.panelLibSettings,
            general: { ...s.panelLibSettings.general, ...patch },
          },
        })),
      setPanelLibThemeColor: (id, color) =>
        mergeWithHistory((s) => ({
          panelLibSettings: {
            ...s.panelLibSettings,
            theme: s.panelLibSettings.theme.map((t) => (t.id === id ? { ...t, color } : t)),
          },
        })),
      setPanelLibLineStyle: (id, style) =>
        mergeWithHistory((s) => ({
          panelLibSettings: {
            ...s.panelLibSettings,
            lineStyles: s.panelLibSettings.lineStyles.map((l) =>
              l.id === id ? { ...l, style } : l,
            ),
          },
        })),
      setPanelLibStrokeWidth: (id, width) =>
        mergeWithHistory((s) => ({
          panelLibSettings: {
            ...s.panelLibSettings,
            strokeWidths: s.panelLibSettings.strokeWidths.map((w) =>
              w.id === id ? { ...w, width } : w,
            ),
          },
        })),
      // ── Phase E — Top toolbar customization ──────────────────────────────────
      setToolbarScope: (scope) =>
        merge((s) => ({ toolbarCustomization: { ...s.toolbarCustomization, scope } })),
      toggleToolbarItem: (scope, id) =>
        mergeWithHistory((s) => {
          const current = s.toolbarCustomization[scope];
          const next = current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id];
          return {
            toolbarCustomization: { ...s.toolbarCustomization, [scope]: next },
          };
        }),
      selectAllToolbarItems: (scope) =>
        mergeWithHistory((s) => ({
          toolbarCustomization: {
            ...s.toolbarCustomization,
            [scope]: TOOLBAR_CATALOGS[scope].map((it) => it.id),
          },
        })),
      clearAllToolbarItems: (scope) =>
        mergeWithHistory((s) => ({
          toolbarCustomization: { ...s.toolbarCustomization, [scope]: [] },
        })),
      resetToolbarCustomization: () =>
        mergeWithHistory(() => ({ toolbarCustomization: initialState.toolbarCustomization })),
      // ── Phase F — Export / Import / per-page reset ───────────────────────────
      exportSettingsJson: () => {
        const s = stateRef.current;
        const payload = {
          version: 1,
          exportedAt: "snapshot",
          systemSettings: s.systemSettings,
          propertySettings: s.propertySettings,
          schemSymbolSettings: s.schemSymbolSettings,
          pcbFootprintSettings: s.pcbFootprintSettings,
          panelLibSettings: s.panelLibSettings,
          toolbarCustomization: s.toolbarCustomization,
          hotkeys: s.hotkeys,
          drawings: s.drawings,
          fonts: s.fonts,
          saveSettings: s.saveSettings,
          pcbLayers: s.pcbLayers,
          pcbNets: s.pcbNets,
        };
        return JSON.stringify(payload, null, 2);
      },
      importSettingsJson: (json) => {
        try {
          const parsed = JSON.parse(json);
          if (typeof parsed !== "object" || parsed === null) return false;
          // Allow-list of fields we accept from an imported config — guards
          // against unrelated state being clobbered if the file is malformed.
          const patch: Partial<PcbState> = {};
          const keys: (keyof PcbState)[] = [
            "systemSettings",
            "propertySettings",
            "schemSymbolSettings",
            "pcbFootprintSettings",
            "panelLibSettings",
            "toolbarCustomization",
            "hotkeys",
            "drawings",
            "fonts",
            "saveSettings",
            "pcbLayers",
            "pcbNets",
          ];
          for (const k of keys) {
            if (k in parsed) {
              (patch as Record<keyof PcbState, unknown>)[k] = parsed[k];
            }
          }
          mergeWithHistory(patch);
          return true;
        } catch {
          return false;
        }
      },
      resetSettingsPage: (page) =>
        mergeWithHistory(() => {
          const init = initialState;
          switch (page) {
            case "system":    return { systemSettings: init.systemSettings };
            case "property":  return { propertySettings: init.propertySettings };
            case "save":      return { saveSettings: init.saveSettings };
            case "font":      return { fonts: init.fonts };
            case "hotkey":    return { hotkeys: init.hotkeys };
            case "drawing":   return { drawings: init.drawings };
            case "symbol":    return { schemSymbolSettings: init.schemSymbolSettings };
            case "footprint": return { pcbFootprintSettings: init.pcbFootprintSettings };
            case "panel":     return { panelLibSettings: init.panelLibSettings };
            case "toptools":  return { toolbarCustomization: init.toolbarCustomization };
            default:          return {};
          }
        }),
      setGridSize: (v) => mergeWithHistory({ gridSize: v }),
      setUnit: (v) => mergeWithHistory({ unit: v }),
      toggleGridVisible: () => merge((s) => ({ gridVisible: !s.gridVisible })),
      rotateSelBy: (deg) =>
        mergeWithHistory((s) => ({ compRot: (s.compRot + deg) % 360 })),
      flipSelV: () => mergeWithHistory((s) => ({ compFlipV: !s.compFlipV })),
      flipSelH: () => mergeWithHistory((s) => ({ compFlipH: !s.compFlipH })),
      bringFront: () =>
        mergeWithHistory((s) => {
          if (s.selectedIds.length === 0) return {};
          const ids = new Set(s.selectedIds);
          // Paint order = array order (later = on top). Move selection to end.
          return { objects: [...s.objects.filter((o) => !ids.has(o.id)), ...s.objects.filter((o) => ids.has(o.id))], compZ: "front" };
        }),
      sendBack: () =>
        mergeWithHistory((s) => {
          if (s.selectedIds.length === 0) return {};
          const ids = new Set(s.selectedIds);
          return { objects: [...s.objects.filter((o) => ids.has(o.id)), ...s.objects.filter((o) => !ids.has(o.id))], compZ: "back" };
        }),
      undo: () => {
        const past = historyRef.current.past;
        if (past.length === 0) return;
        const prev = past.pop()!;
        const curSnap = snap(stateRef.current);
        historyRef.current.future.push(curSnap);
        merge(prev as Partial<PcbState>);
      },
      redo: () => {
        const future = historyRef.current.future;
        if (future.length === 0) return;
        const next = future.pop()!;
        const curSnap = snap(stateRef.current);
        historyRef.current.past.push(curSnap);
        merge(next as Partial<PcbState>);
      },
      placeObject: (kind, x, y) => {
        const id = `obj_${objIdCounter.current++}`;
        const defaultText: Record<string, string> = {
          netLabel: "NET",
          netFlag: "F1",
          vcc5v: "+5V",
          shortFlag: "S",
          port: "PORT",
          text: "Text",
          resistor: "R?",
          capacitor: "C?",
          diode: "D?",
          inductor: "L?",
          testPoint: "TP",
          stackTable: "Stack Table",
          drillTable: "Drill Table",
          offPageConnector: "PORT",
          diffPairFlag: "DP",
          reuseBlock: "REUSE",
          netBusLabel: "NET",
        };
        mergeWithHistory((s) => {
          // 2D is the same board surface as PCB — pad/via/component defaults
          // and the active-layer stamp apply in both.
          const inPcb = s.mode === "pcb" || s.mode === "2d";
          const d = s.pcbDefaults;
          // Stamp PCB defaults onto pad / via so the property panel reads them.
          const pcbExtras: Partial<CanvasObject> =
            inPcb && kind === "pad"
              ? { width: d.padWidth, height: d.padHeight, drill: d.padDrill, padShape: d.padShape, padType: "tht" }
              : inPcb && kind === "via"
              ? { width: d.viaSize, drill: d.viaDrill, startLayer: "top", endLayer: "bottom" }
              : inPcb && kind === "component"
              ? { footprint: "Generic-SO8", comment: "Component", side: "top" }
              : inPcb && (kind === "boardOutline" || kind === "slot")
              ? { layer: "outline" } // doc §07: outline objects live on the Board Outline layer
              : inPcb && kind === "polygon"
              // doc §08: copper regions get an auto name (POUR1, POUR2, …)
              ? { props: { name: `POUR${s.objects.filter((o) => o.kind === "polygon").length + 1}` } }
              // Shapes: outline on, fill off by default — so the inspector's
              // Outline/Fill toggles reflect real state from the start.
              : kind === "rectangle" || kind === "circle" || kind === "ellipse"
              ? { props: { lineOn: true, fillOn: false, fillColor: "#FFFFFF" } }
              : {};
          const obj: CanvasObject = {
            id,
            kind,
            x,
            y,
            text: defaultText[kind],
            rotation: 0,
            layer: inPcb ? s.activePcbLayer : undefined,
            // Schematic placements belong to the active sheet (multi-sheet).
            sheetId: inPcb ? undefined : s.activeSheetId,
            ...pcbExtras,
          };
          return { objects: [...s.objects, obj], selectedIds: [id] };
        });
      },
      startWire: (kind, x, y) =>
        merge({ draftWire: { startX: x, startY: y, kind } }),
      finishWire: (x, y) =>
        mergeWithHistory((s) => {
          if (!s.draftWire) return {};
          const id = `obj_${objIdCounter.current++}`;
          const isTrack = s.draftWire.kind === "track";
          const obj: CanvasObject = {
            id,
            kind: s.draftWire.kind,
            x: s.draftWire.startX,
            y: s.draftWire.startY,
            endX: x,
            endY: y,
            // Tracks always live on the active PCB layer; wires/buses
            // (schematic) leave layer undefined.
            layer: isTrack ? s.activePcbLayer : undefined,
            // Track width from PCB defaults; nets attach via the property panel.
            width: isTrack ? s.pcbDefaults.trackWidth : undefined,
            sheetId: isTrack ? undefined : s.activeSheetId,
          };
          // Schematic auto-junction: drop a junction dot where an endpoint of the
          // new wire lands on the INTERIOR of an existing wire (a T-connection).
          const extra: CanvasObject[] = [];
          if (!isTrack) {
            const first = s.schematicSheets[0]?.id;
            const others = s.objects.filter((o) => (o.kind === "wire" || o.kind === "bus") && (!o.scope || o.scope === "schematic") && (o.sheetId ?? first) === s.activeSheetId);
            const already = (px: number, py: number) => s.objects.some((o) => o.kind === "junction" && Math.hypot(o.x - px, o.y - py) < 8);
            for (const pt of [{ x: s.draftWire.startX, y: s.draftWire.startY }, { x, y }]) {
              if (already(pt.x, pt.y)) continue;
              const hit = others.some((w) => {
                const abx = (w.endX ?? w.x) - w.x, aby = (w.endY ?? w.y) - w.y, L2 = abx * abx + aby * aby;
                if (L2 < 1) return false;
                const t = ((pt.x - w.x) * abx + (pt.y - w.y) * aby) / L2;
                if (t < 0.08 || t > 0.92) return false;
                const cx = w.x + t * abx, cy = w.y + t * aby;
                return Math.hypot(pt.x - cx, pt.y - cy) < 6;
              });
              if (hit) extra.push({ id: `obj_${objIdCounter.current++}`, kind: "junction", x: pt.x, y: pt.y, rotation: 0, scope: "schematic", sheetId: s.activeSheetId });
            }
          }
          return { objects: [...s.objects, obj, ...extra], draftWire: null, selectedIds: [id] };
        }),
      cancelDraft: () => merge({ draftWire: null }),
      selectPlaced: (id, additive) =>
        merge((s) => {
          // Any normal object selection clears the designator sub-selection.
          if (id == null) return { selectedIds: [], selSub: "none" };
          if (additive) {
            const present = s.selectedIds.includes(id);
            return {
              selectedIds: present
                ? s.selectedIds.filter((x) => x !== id)
                : [...s.selectedIds, id],
              selSub: "none",
            };
          }
          // Grouped object → select the whole group (moves/deletes together).
          const gid = (s.objects.find((o) => o.id === id)?.props as Record<string, unknown> | undefined)?.groupId;
          if (gid) {
            const members = s.objects.filter((o) => (o.props as Record<string, unknown> | undefined)?.groupId === gid).map((o) => o.id);
            return { selectedIds: members, selSub: "none" };
          }
          return { selectedIds: [id], selSub: "none" };
        }),
      selectDesignator: (compId, sub) =>
        merge({ selectedIds: [compId], selSub: sub, selected: "comp" }),
      selectMany: (ids) => merge({ selectedIds: ids, selSub: "none" }),
      selectAll: () => merge((s) => ({ selectedIds: s.objects.map((o) => o.id) })),
      deleteSelected: () =>
        mergeWithHistory((s) => {
          if (s.selectedIds.length === 0) return {};
          const drop = new Set(s.selectedIds);
          return {
            objects: s.objects.filter((o) => !drop.has(o.id)),
            selectedIds: [],
          };
        }),
      groupSelection: () => {
        const s = stateRef.current;
        if (s.selectedIds.length < 2) { actions.flashToast("Select 2 or more objects to group"); return; }
        const ids = new Set(s.selectedIds);
        const gid = `grp_${Math.random().toString(36).slice(2, 8)}`;
        const existing = new Set(s.objects.map((o) => (o.props as Record<string, unknown> | undefined)?.groupId).filter(Boolean));
        const gname = `Group ${existing.size + 1}`;
        mergeWithHistory((st) => ({
          objects: st.objects.map((o) => (ids.has(o.id) ? { ...o, props: { ...(o.props ?? {}), groupId: gid, groupName: gname } } : o)),
        }));
        actions.flashToast(`Grouped ${s.selectedIds.length} objects → ${gname}`);
      },
      ungroupSelection: () => {
        const ids = new Set(stateRef.current.selectedIds);
        mergeWithHistory((st) => ({
          objects: st.objects.map((o) => {
            if (!ids.has(o.id)) return o;
            const p = { ...(o.props ?? {}) } as Record<string, unknown>;
            delete p.groupId; delete p.groupName;
            return { ...o, props: p };
          }),
        }));
        actions.flashToast("Ungrouped");
      },
      resetObjectStyle: () => {
        const ids = new Set(stateRef.current.selectedIds);
        const STYLE_KEYS = ["lineStyle", "fillColor", "fillColor2", "fontSize", "style", "roundRadius", "font", "strokeColor"];
        mergeWithHistory((st) => ({
          objects: st.objects.map((o) => {
            if (!ids.has(o.id)) return o;
            const p = { ...(o.props ?? {}) } as Record<string, unknown>;
            STYLE_KEYS.forEach((k) => delete p[k]);
            return { ...o, props: p, color: undefined };
          }),
        }));
        actions.flashToast("Style reset to default");
      },
      addCustomProp: () => {
        const s = stateRef.current;
        const id = s.selectedIds[0];
        if (!id) { actions.flashToast("Select an object first"); return; }
        const obj = s.objects.find((o) => o.id === id);
        const n = Object.keys(obj?.props ?? {}).filter((k) => k.startsWith("custom:")).length + 1;
        const key = `custom:Property ${n}`;
        mergeWithHistory((st) => ({
          objects: st.objects.map((o) => (o.id === id ? { ...o, props: { ...(o.props ?? {}), [key]: "" } } : o)),
        }));
        actions.flashToast("Added custom property");
      },
      loadSampleSchematic: () =>
        // Replace the whole sheet with the built-in sample (undoable via Ctrl+Z).
        // Deep-copy so the shared module constant is never mutated by later edits.
        mergeWithHistory(() => ({
          objects: DEFAULT_SCHEM_OBJECTS.map((o) => ({ ...o })),
          selectedIds: [],
          selSub: "none",
          draftWire: null,
        })),
      convertSchematicToPcb: () => {
        const src = stateRef.current.objects;
        const { objects: generated, parts, nets, airwires } = convertSchematicToPcb(src);
        mergeWithHistory((s) => ({
          // Keep the schematic sheet + any hand-placed PCB objects; drop only the
          // previous auto-convert output so re-running is idempotent.
          objects: [
            ...s.objects.filter((o) => o.props?.gen !== "convert" && o.props?.gen !== "route"),
            ...generated,
          ],
          mode: "pcb",
          openMenu: null,
          ctx: null,
          selectedIds: [],
          selSub: "none",
          draftWire: null,
        }));
        actions.flashToast(
          `Converted to PCB — ${parts} footprints · ${nets} nets · ${airwires} airwires`,
        );
      },
      autoRoute: () => {
        const s = stateRef.current;
        const { objects: routedObjs, routed } = routeRatsnest(s.objects, s.pcbDefaults.trackWidth);
        if (routed === 0) {
          actions.flashToast("No ratsnest to route — run Convert Schematic to PCB first");
          return;
        }
        mergeWithHistory(() => ({
          objects: routedObjs,
          openMenu: null,
          ctx: null,
          selectedIds: [],
          selSub: "none",
          draftWire: null,
        }));
        actions.flashToast(`Auto-routed ${routed} connections → copper tracks`);
      },
      moveObject: (id, x, y) =>
        mergeWithHistory((s) => ({
          objects: s.objects.map((o) => (o.id === id ? { ...o, x, y } : o)),
        })),
      setObjectField: (id, patch) =>
        mergeWithHistory((s) => ({
          objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),
      setObjectProp: (id, key, value) =>
        mergeWithHistory((s) => ({
          objects: s.objects.map((o) =>
            o.id === id ? { ...o, props: { ...(o.props ?? {}), [key]: value } } : o,
          ),
        })),
      setBoardSetting: (key, value) =>
        merge((s) => ({ boardSettings: { ...s.boardSettings, [key]: value } })),
      setObjectText: (id, text) =>
        mergeWithHistory((s) => ({
          objects: s.objects.map((o) => (o.id === id ? { ...o, text } : o)),
        })),
      rotateSelectedPlaced: (deg) =>
        mergeWithHistory((s) => {
          const picked = s.objects.filter((o) => s.selectedIds.includes(o.id));
          if (picked.length === 0) return {};
          const { cx, cy } = selCenter(picked);
          const rad = (deg * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
          // Rotate a point around the selection centre.
          const rot = (px: number, py: number): [number, number] => [
            Math.round(cx + (px - cx) * cos - (py - cy) * sin),
            Math.round(cy + (px - cx) * sin + (py - cy) * cos),
          ];
          const ids = new Set(s.selectedIds);
          return {
            objects: s.objects.map((o) => {
              if (!ids.has(o.id)) return o;
              const [nx, ny] = rot(o.x, o.y);
              const patch: Partial<CanvasObject> = {
                x: nx, y: ny,
                rotation: ((((o.rotation ?? 0) + deg) % 360) + 360) % 360,
              };
              if (o.endX != null && o.endY != null) {
                const [ex, ey] = rot(o.endX, o.endY);
                patch.endX = ex; patch.endY = ey;
              }
              return { ...o, ...patch };
            }),
          };
        }),
      flipSelectedV: () =>
        mergeWithHistory((s) => {
          const picked = s.objects.filter((o) => s.selectedIds.includes(o.id));
          if (picked.length === 0) return {};
          const { cy } = selCenter(picked);           // mirror across horizontal axis
          const ids = new Set(s.selectedIds);
          return {
            objects: s.objects.map((o) => {
              if (!ids.has(o.id)) return o;
              const p = { ...(o.props ?? {}) } as Record<string, unknown>;
              p.flipY = !p.flipY;                       // mirror the symbol itself too
              return {
                ...o,
                y: Math.round(2 * cy - o.y),
                endY: o.endY != null ? Math.round(2 * cy - o.endY) : undefined,
                props: p,
              };
            }),
          };
        }),
      flipSelectedH: () =>
        mergeWithHistory((s) => {
          const picked = s.objects.filter((o) => s.selectedIds.includes(o.id));
          if (picked.length === 0) return {};
          const { cx } = selCenter(picked);           // mirror across vertical axis
          const ids = new Set(s.selectedIds);
          return {
            objects: s.objects.map((o) => {
              if (!ids.has(o.id)) return o;
              const p = { ...(o.props ?? {}) } as Record<string, unknown>;
              p.flipX = !p.flipX;
              return {
                ...o,
                x: Math.round(2 * cx - o.x),
                endX: o.endX != null ? Math.round(2 * cx - o.endX) : undefined,
                props: p,
              };
            }),
          };
        }),
      copySelection: () =>
        merge((s) => {
          if (s.selectedIds.length === 0) return {};
          const sel = new Set(s.selectedIds);
          return { clipboardObjects: s.objects.filter((o) => sel.has(o.id)) };
        }),
      cutSelection: () =>
        mergeWithHistory((s) => {
          if (s.selectedIds.length === 0) return {};
          const sel = new Set(s.selectedIds);
          return {
            clipboardObjects: s.objects.filter((o) => sel.has(o.id)),
            objects: s.objects.filter((o) => !sel.has(o.id)),
            selectedIds: [],
          };
        }),
      pasteClipboard: () =>
        mergeWithHistory((s) => {
          if (s.clipboardObjects.length === 0) return {};
          const newIds: string[] = [];
          const cloned = s.clipboardObjects.map((o) => {
            const id = `obj_${objIdCounter.current++}`;
            newIds.push(id);
            return {
              ...o,
              id,
              x: o.x + 20,
              y: o.y + 20,
              endX: o.endX != null ? o.endX + 20 : undefined,
              endY: o.endY != null ? o.endY + 20 : undefined,
            } as CanvasObject;
          });
          return { objects: [...s.objects, ...cloned], selectedIds: newIds };
        }),
      startRubberBand: (x, y) =>
        merge({ rubberBand: { x1: x, y1: y, x2: x, y2: y } }),
      updateRubberBand: (x, y) =>
        merge((s) => (s.rubberBand ? { rubberBand: { ...s.rubberBand, x2: x, y2: y } } : {})),
      commitRubberBand: (additive) =>
        merge((s) => {
          if (!s.rubberBand) return {};
          const { x1, y1, x2, y2 } = s.rubberBand;
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          const hits = s.objects.filter((o) => {
            const ox = o.endX != null ? (o.x + o.endX) / 2 : o.x;
            const oy = o.endY != null ? (o.y + o.endY) / 2 : o.y;
            return ox >= minX && ox <= maxX && oy >= minY && oy <= maxY;
          });
          const ids = hits
            .filter((o) => isSelectable(o.kind, s.boardSettings ?? {}, s.mode))
            .map((o) => o.id);
          return {
            rubberBand: null,
            selectedIds: additive ? Array.from(new Set([...s.selectedIds, ...ids])) : ids,
          };
        }),
      cancelRubberBand: () => merge({ rubberBand: null }),
      startLasso: (x, y) => merge({ lasso: [{ x, y }] }),
      updateLasso: (x, y) => merge((s) => (s.lasso ? { lasso: [...s.lasso, { x, y }] } : {})),
      commitLasso: (additive) =>
        merge((s) => {
          const poly = s.lasso;
          if (!poly || poly.length < 3) return { lasso: null };
          // Ray-casting point-in-polygon on each object's centre.
          const inside = (px: number, py: number) => {
            let c = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
              const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
              if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
            }
            return c;
          };
          const ids = s.objects
            .filter((o) => {
              const ox = o.endX != null ? (o.x + o.endX) / 2 : o.x;
              const oy = o.endY != null ? (o.y + o.endY) / 2 : o.y;
              return inside(ox, oy) && isSelectable(o.kind, s.boardSettings ?? {}, s.mode);
            })
            .map((o) => o.id);
          return {
            lasso: null,
            selectedIds: additive ? Array.from(new Set([...s.selectedIds, ...ids])) : ids,
          };
        }),
      cancelLasso: () => merge({ lasso: null }),
      setActivePcbLayer: (id) => merge({ activePcbLayer: id }),
      togglePcbLayerVis: (id) =>
        merge((s) => ({
          pcbLayers: s.pcbLayers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
        })),
      togglePcbLayerLock: (id) =>
        merge((s) => ({
          pcbLayers: s.pcbLayers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
        })),
      setPcbLayerColor: (id, color) =>
        mergeWithHistory((s) => ({
          pcbLayers: s.pcbLayers.map((l) => (l.id === id ? { ...l, color } : l)),
        })),
      setPcbLayerTransparency: (id, transparency) =>
        mergeWithHistory((s) => ({
          pcbLayers: s.pcbLayers.map((l) =>
            l.id === id ? { ...l, transparency: Math.max(0, Math.min(100, transparency)) } : l,
          ),
        })),
      setPcbLayerName: (id, name) =>
        mergeWithHistory((s) => ({
          pcbLayers: s.pcbLayers.map((l) => (l.id === id ? { ...l, name } : l)),
        })),
      setPcbBoard: (patch) =>
        mergeWithHistory((s) => ({ pcbBoard: { ...s.pcbBoard, ...patch } })),
      addPcbNet: (name, color, cls) =>
        mergeWithHistory((s) => {
          if (s.pcbNets.some((n) => n.name === name)) return {};
          return {
            pcbNets: [...s.pcbNets, { name, color: color ?? "#7C2DB9", cls }],
          };
        }),
      setPcbNetColor: (name, color) =>
        mergeWithHistory((s) => ({
          pcbNets: s.pcbNets.map((n) => (n.name === name ? { ...n, color } : n)),
        })),
      setPcbNetClass: (name, cls) =>
        mergeWithHistory((s) => ({
          pcbNets: s.pcbNets.map((n) => (n.name === name ? { ...n, cls } : n)),
        })),
      removePcbNet: (name) =>
        mergeWithHistory((s) => ({ pcbNets: s.pcbNets.filter((n) => n.name !== name) })),
      setPcbDefaults: (patch) =>
        mergeWithHistory((s) => ({ pcbDefaults: { ...s.pcbDefaults, ...patch } })),
      setTwoD: (patch) => merge((s) => ({ twoD: { ...s.twoD, ...patch } })),
      setThreeD: (patch) => merge((s) => ({ threeD: { ...s.threeD, ...patch } })),
      // ── Phase 3 — PCB Tools manager actions ─────────────────────────────
      addNetClass: () =>
        mergeWithHistory((s) => ({
          pcbNetClasses: [
            ...s.pcbNetClasses,
            { id: `nc${s.pcbNetClasses.length + 1}_${objIdCounter.current++}`, name: `Class ${s.pcbNetClasses.length + 1}`, trackWidth: 8, clearance: 6, viaSize: 24, viaDrill: 12, color: "#7C2DB9" },
          ],
        })),
      removeNetClass: (id) =>
        mergeWithHistory((s) => ({ pcbNetClasses: s.pcbNetClasses.filter((c) => c.id !== id) })),
      setNetClassField: (id, patch) =>
        mergeWithHistory((s) => ({
          pcbNetClasses: s.pcbNetClasses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      addDiffPair: () =>
        mergeWithHistory((s) => ({
          pcbDiffPairs: [
            ...s.pcbDiffPairs,
            { id: `dp_${objIdCounter.current++}`, name: `Pair ${s.pcbDiffPairs.length + 1}`, netA: "", netB: "", gap: 6, width: 6 },
          ],
        })),
      removeDiffPair: (id) =>
        mergeWithHistory((s) => ({ pcbDiffPairs: s.pcbDiffPairs.filter((p) => p.id !== id) })),
      setDiffPairField: (id, patch) =>
        mergeWithHistory((s) => ({
          pcbDiffPairs: s.pcbDiffPairs.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      addEqualLengthGroup: () =>
        mergeWithHistory((s) => ({
          pcbEqualLength: [
            ...s.pcbEqualLength,
            { id: `el_${objIdCounter.current++}`, name: `Group ${s.pcbEqualLength.length + 1}`, nets: [], target: 1000, tolerance: 50 },
          ],
        })),
      removeEqualLengthGroup: (id) =>
        mergeWithHistory((s) => ({ pcbEqualLength: s.pcbEqualLength.filter((g) => g.id !== id) })),
      setEqualLengthField: (id, patch) =>
        mergeWithHistory((s) => ({
          pcbEqualLength: s.pcbEqualLength.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      addPadPair: () =>
        mergeWithHistory((s) => ({
          pcbPadPairs: [
            ...s.pcbPadPairs,
            { id: `pp_${objIdCounter.current++}`, name: `Pair ${s.pcbPadPairs.length + 1}`, pads: "", spacing: 100 },
          ],
        })),
      removePadPair: (id) =>
        mergeWithHistory((s) => ({ pcbPadPairs: s.pcbPadPairs.filter((p) => p.id !== id) })),
      setPadPairField: (id, patch) =>
        mergeWithHistory((s) => ({
          pcbPadPairs: s.pcbPadPairs.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      addCopper: () =>
        mergeWithHistory((s) => ({
          pcbCoppers: [
            ...s.pcbCoppers,
            { id: `cu_${objIdCounter.current++}`, name: `Copper ${s.pcbCoppers.length + 1}`, layer: s.activePcbLayer, net: "GND", clearance: 8, thermal: true, hatched: false },
          ],
        })),
      removeCopper: (id) =>
        mergeWithHistory((s) => ({ pcbCoppers: s.pcbCoppers.filter((c) => c.id !== id) })),
      setCopperField: (id, patch) =>
        mergeWithHistory((s) => ({
          pcbCoppers: s.pcbCoppers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      setTearDrop: (patch) =>
        mergeWithHistory((s) => ({ pcbTearDrop: { ...s.pcbTearDrop, ...patch } })),
      setDrcRuleSeverity: (id, severity) =>
        mergeWithHistory((s) => ({
          pcbDrcRules: s.pcbDrcRules.map((r) => (r.id === id ? { ...r, severity } : r)),
        })),
      setRemoveUnusedPadOpts: (patch) =>
        merge((s) => ({ removeUnusedPadOpts: { ...s.removeUnusedPadOpts, ...patch } })),
      addPcbLayer: () =>
        mergeWithHistory((s) => {
          const id = `layer_${objIdCounter.current++}`;
          return {
            pcbLayers: [
              ...s.pcbLayers,
              { id, name: `Layer ${s.pcbLayers.length + 1}`, color: "#7C2DB9", type: "signal", visible: true, locked: false, transparency: 0 },
            ],
          };
        }),
      removePcbLayer: (id) =>
        mergeWithHistory((s) => ({
          pcbLayers: s.pcbLayers.filter((l) => l.id !== id),
          activePcbLayer: s.activePcbLayer === id && s.pcbLayers.length > 1 ? s.pcbLayers[0].id : s.activePcbLayer,
        })),
      movePcbLayer: (id, dir) =>
        mergeWithHistory((s) => {
          const idx = s.pcbLayers.findIndex((l) => l.id === id);
          if (idx < 0) return {};
          const ni = idx + dir;
          if (ni < 0 || ni >= s.pcbLayers.length) return {};
          const next = s.pcbLayers.slice();
          [next[idx], next[ni]] = [next[ni], next[idx]];
          return { pcbLayers: next };
        }),
      // ── Phase 5 — IT-692 / IT-569 toolbar additions ────────────────────
      flashToast: (msg) => {
        merge({ toast: msg });
        setTimeout(() => {
          if (stateRef.current.toast === msg) merge({ toast: null });
        }, 2200);
      },
      toggleSnap: () => merge((s) => ({ snapEnabled: !s.snapEnabled })),
      setCornerOp: (patch) =>
        mergeWithHistory((s) => ({ cornerOp: { ...s.cornerOp, ...patch } })),
      setRoutingMode: (m) => merge({ routingMode: m }),
      setRoutingCorner: (c) => merge({ routingCorner: c }),
      setRoutingWidth: (w) => mergeWithHistory({ routingWidth: w }),
      alignSelectedToGrid: () =>
        mergeWithHistory((s) => {
          if (s.selectedIds.length === 0) return {};
          const sel = new Set(s.selectedIds);
          // Treat gridSize as a unit-aware step; round x/y to nearest 10px so
          // placement is visually quantized. (Real-unit conversion is owned
          // by the canvas mapper — this is a coarse, undo-able snap.)
          const step = 10;
          return {
            objects: s.objects.map((o) =>
              sel.has(o.id)
                ? {
                    ...o,
                    x: Math.round(o.x / step) * step,
                    y: Math.round(o.y / step) * step,
                    endX: o.endX != null ? Math.round(o.endX / step) * step : undefined,
                    endY: o.endY != null ? Math.round(o.endY / step) * step : undefined,
                  }
                : o,
            ),
          };
        }),
      alignSelected: (mode) =>
        mergeWithHistory((s) => {
          const sel = s.objects.filter((o) => s.selectedIds.includes(o.id));
          if (sel.length < 2) return {};
          const xs = sel.map((o) => o.x), ys = sel.map((o) => o.y);
          const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
          const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
          const target = new Map<string, { x?: number; y?: number }>();
          sel.forEach((o) => {
            if (mode === "left") target.set(o.id, { x: minX });
            else if (mode === "right") target.set(o.id, { x: maxX });
            else if (mode === "hcenter") target.set(o.id, { x: cx });
            else if (mode === "top") target.set(o.id, { y: minY });
            else if (mode === "bottom") target.set(o.id, { y: maxY });
            else if (mode === "vcenter") target.set(o.id, { y: cy });
          });
          if (mode === "distH") {
            const byX = [...sel].sort((a, b) => a.x - b.x);
            const step = (maxX - minX) / (byX.length - 1);
            byX.forEach((o, i) => target.set(o.id, { x: minX + step * i }));
          }
          if (mode === "distV") {
            const byY = [...sel].sort((a, b) => a.y - b.y);
            const step = (maxY - minY) / (byY.length - 1);
            byY.forEach((o, i) => target.set(o.id, { y: minY + step * i }));
          }
          return {
            objects: s.objects.map((o) => {
              const t = target.get(o.id);
              if (!t) return o;
              const dx = t.x != null ? t.x - o.x : 0;
              const dy = t.y != null ? t.y - o.y : 0;
              return { ...o, x: o.x + dx, y: o.y + dy, endX: o.endX != null ? o.endX + dx : undefined, endY: o.endY != null ? o.endY + dy : undefined };
            }),
          };
        }),
      setSelectionPos: (axis, value) =>
        mergeWithHistory((s) => {
          const picked = s.objects.filter((o) => s.selectedIds.includes(o.id));
          if (picked.length === 0 || !Number.isFinite(value)) return {};
          // Move by the delta from the selection's current bbox-min → so a
          // multi-selection shifts as a unit rather than stacking.
          const ref = Math.min(...picked.map((o) => (axis === "x" ? o.x : o.y)));
          const d = value - ref;
          if (d === 0) return {};
          const ids = new Set(s.selectedIds);
          return {
            objects: s.objects.map((o) => {
              if (!ids.has(o.id)) return o;
              return axis === "x"
                ? { ...o, x: o.x + d, endX: o.endX != null ? o.endX + d : undefined }
                : { ...o, y: o.y + d, endY: o.endY != null ? o.endY + d : undefined };
            }),
          };
        }),
      setSelectionRotation: (deg) =>
        mergeWithHistory((s) => {
          if (s.selectedIds.length === 0 || !Number.isFinite(deg)) return {};
          const r = (((deg % 360) + 360) % 360);
          const ids = new Set(s.selectedIds);
          return { objects: s.objects.map((o) => (ids.has(o.id) ? { ...o, rotation: r } : o)) };
        }),
    };
  }, [merge, mergeWithHistory]);

  return (
    <StateCtx.Provider value={state}>
      <ActionsCtx.Provider value={actions}>{children}</ActionsCtx.Provider>
    </StateCtx.Provider>
  );
}

export function usePcbState(): PcbState {
  const ctx = React.useContext(StateCtx);
  if (!ctx) throw new Error("usePcbState must be used within PcbProvider");
  return ctx;
}

export function usePcbActions(): PcbActions {
  const ctx = React.useContext(ActionsCtx);
  if (!ctx) throw new Error("usePcbActions must be used within PcbProvider");
  return ctx;
}
