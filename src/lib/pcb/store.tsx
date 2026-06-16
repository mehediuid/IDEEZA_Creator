"use client";

// IDEEZA PCB Software — editor store.
// Holds the editor state and every handler, ported 1:1 from the prototype's
// class methods. `merge` reproduces React class `setState` (shallow merge,
// partial or updater-function), so the ported handlers read identically.

import * as React from "react";
import {
  DEL_OBJ_NAMES,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  initialState,
  type BottomTab,
  type CanvasObject,
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
  type PcbState,
  type RightTab,
  type SettingsPage,
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
  zoomFit: () => void;
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
  startWire: (kind: "wire" | "bus", x: number, y: number) => void;
  finishWire: (x: number, y: number) => void;
  cancelDraft: () => void;
  selectPlaced: (id: string | null, additive?: boolean) => void;
  selectMany: (ids: string[]) => void;
  selectAll: () => void;
  deleteSelected: () => void;
  moveObject: (id: string, x: number, y: number) => void;
  setObjectField: (id: string, patch: Partial<CanvasObject>) => void;
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
  // Schematic right-panel properties
  setSchemBasic: (patch: Partial<PcbState["schemBasic"]>) => void;
  setSchemBorder: (patch: Partial<PcbState["schemBorder"]>) => void;
  toggleSchemTitleShow: () => void;
  toggleSchemTitleField: (key: string, which: "on" | "valueOn") => void;
  setSchemTitleFieldValue: (key: string, value: string) => void;
  toggleSchemSection: (key: keyof PcbState["schemSectionOpen"]) => void;
}

const StateCtx = React.createContext<PcbState | null>(null);
const ActionsCtx = React.createContext<PcbActions | null>(null);

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
      setMode: (m) => merge({ mode: m, openMenu: null, ctx: null }),
      openSettings: (page) =>
        merge({ settingsOpen: true, settingsPage: page ?? "system", openMenu: null }),
      closeSettings: () => merge({ settingsOpen: false }),
      setSettingsPage: (page) => merge({ settingsPage: page }),
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
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        merge({
          ctx: true,
          openMenu: null,
          ctxX: `${e.clientX - r.left + 366}px`,
          ctxY: `${e.clientY - r.top + 225}px`,
        });
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
      zoomFit: () => merge({ zoom: 1, pan: { x: 0, y: 0 } }),
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
      setGridSize: (v) => mergeWithHistory({ gridSize: v }),
      setUnit: (v) => mergeWithHistory({ unit: v }),
      toggleGridVisible: () => merge((s) => ({ gridVisible: !s.gridVisible })),
      rotateSelBy: (deg) =>
        mergeWithHistory((s) => ({ compRot: (s.compRot + deg) % 360 })),
      flipSelV: () => mergeWithHistory((s) => ({ compFlipV: !s.compFlipV })),
      flipSelH: () => mergeWithHistory((s) => ({ compFlipH: !s.compFlipH })),
      bringFront: () => mergeWithHistory({ compZ: "front" }),
      sendBack: () => mergeWithHistory({ compZ: "back" }),
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
        };
        const obj: CanvasObject = {
          id,
          kind,
          x,
          y,
          text: defaultText[kind],
          rotation: 0,
        };
        mergeWithHistory((s) => ({ objects: [...s.objects, obj], selectedIds: [id] }));
      },
      startWire: (kind, x, y) =>
        merge({ draftWire: { startX: x, startY: y, kind } }),
      finishWire: (x, y) =>
        mergeWithHistory((s) => {
          if (!s.draftWire) return {};
          const id = `obj_${objIdCounter.current++}`;
          const obj: CanvasObject = {
            id,
            kind: s.draftWire.kind,
            x: s.draftWire.startX,
            y: s.draftWire.startY,
            endX: x,
            endY: y,
          };
          return { objects: [...s.objects, obj], draftWire: null, selectedIds: [id] };
        }),
      cancelDraft: () => merge({ draftWire: null }),
      selectPlaced: (id, additive) =>
        merge((s) => {
          if (id == null) return { selectedIds: [] };
          if (additive) {
            const present = s.selectedIds.includes(id);
            return {
              selectedIds: present
                ? s.selectedIds.filter((x) => x !== id)
                : [...s.selectedIds, id],
            };
          }
          return { selectedIds: [id] };
        }),
      selectMany: (ids) => merge({ selectedIds: ids }),
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
      moveObject: (id, x, y) =>
        mergeWithHistory((s) => ({
          objects: s.objects.map((o) => (o.id === id ? { ...o, x, y } : o)),
        })),
      setObjectField: (id, patch) =>
        mergeWithHistory((s) => ({
          objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),
      setObjectText: (id, text) =>
        mergeWithHistory((s) => ({
          objects: s.objects.map((o) => (o.id === id ? { ...o, text } : o)),
        })),
      rotateSelectedPlaced: (deg) =>
        mergeWithHistory((s) => {
          if (s.selectedIds.length === 0) return {};
          const sel = new Set(s.selectedIds);
          return {
            objects: s.objects.map((o) =>
              sel.has(o.id) ? { ...o, rotation: (((o.rotation ?? 0) + deg) % 360 + 360) % 360 } : o,
            ),
          };
        }),
      flipSelectedV: () =>
        mergeWithHistory((s) => {
          if (s.selectedIds.length === 0) return { compFlipV: !s.compFlipV };
          const sel = new Set(s.selectedIds);
          return {
            objects: s.objects.map((o) =>
              sel.has(o.id) ? { ...o, rotation: (((360 - (o.rotation ?? 0)) % 360) + 360) % 360 } : o,
            ),
          };
        }),
      flipSelectedH: () =>
        mergeWithHistory((s) => {
          if (s.selectedIds.length === 0) return { compFlipH: !s.compFlipH };
          const sel = new Set(s.selectedIds);
          return {
            objects: s.objects.map((o) =>
              sel.has(o.id) ? { ...o, rotation: (((180 - (o.rotation ?? 0)) % 360) + 360) % 360 } : o,
            ),
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
          const ids = hits.map((o) => o.id);
          return {
            rubberBand: null,
            selectedIds: additive ? Array.from(new Set([...s.selectedIds, ...ids])) : ids,
          };
        }),
      cancelRubberBand: () => merge({ rubberBand: null }),
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
