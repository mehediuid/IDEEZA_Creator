"use client";

// PreviewContext — single store for the /preview chrome.
//
// Two scene groups:
//   • PCB        — derived from the PCB module's store (board dimensions +
//                  placed components). Read-only: the PCB stays the canonical
//                  source, /preview is a viewer.
//   • Enclosure  — shapes from the 3D module (shared via the same
//                  localStorage slot the /3d page reads/writes). Editable
//                  from the preview toolbar/Insert dropdown.
//
// Plus UI flags (showInstancesPanel / showPcb / showEnclosure),
// camera ticks (resetTick / fitTick), a toast channel, and the
// computed fit verdict (PCB inside enclosure?).

import * as React from "react";
import {
  makeShape,
  type SceneShape,
  type ShapeType,
} from "@/components/3d/three-canvas";
import { usePcbState } from "@/lib/pcb/store";

export type ContextMenuTarget = {
  x: number;
  y: number;
  targetId: string;
};

// Identity of any selectable instance in the preview scene, used by the
// right-click menu to derive labels ("Copy «Box 1»") and per-group actions
// ("Switch to PCB", "Hide other instances").
export type InstanceInfo = {
  id: string;
  name: string;
  instanceIndex: number;
  group: "pcb" | "enclosure";
  groupLabel: string;
  rootLabel: string;
};

const SHAPES_KEY = "ideeza:3d:shapes";
const CANVAS_KEY = "ideeza:preview:canvas";

// Canvas controls shared by the right panel and the viewport.
export type PreviewTransformMode = "none" | "translate" | "rotate" | "scale";

export type PreviewCanvasState = {
  transformMode: PreviewTransformMode;
  snap: { x: boolean; y: boolean; z: boolean };
  gridSize: string;
  resolution: string[]; // length 9 (3×3)
};

export const DEFAULT_PREVIEW_CANVAS: PreviewCanvasState = {
  transformMode: "translate",
  snap: { x: true, y: true, z: false },
  gridSize: "IDEEZA-100",
  resolution: Array(9).fill("Auto"),
};

// Label → value mappings live in the 3D module's shared grid-settings so the
// two editors can't drift; re-exported under the preview names for callers.
export {
  getGridStep as previewGridStep,
  getResolutionSegments as previewResolutionSegments,
} from "@/components/3d/grid-settings";

// Rebuild a safe canvas state from whatever was persisted — stale or hand-
// edited storage must never be able to crash the panel (e.g. a non-array
// `resolution` would blow up `.map` in render).
function sanitizeCanvasState(raw: unknown): PreviewCanvasState {
  const d = DEFAULT_PREVIEW_CANVAS;
  if (typeof raw !== "object" || raw === null) return d;
  const r = raw as Record<string, unknown>;
  const mode = r.transformMode;
  const snap = (typeof r.snap === "object" && r.snap !== null ? r.snap : {}) as Record<string, unknown>;
  const rawRes = r.resolution;
  const resolution = Array.isArray(rawRes)
    ? d.resolution.map((def, i) => (typeof rawRes[i] === "string" ? (rawRes[i] as string) : def))
    : d.resolution;
  return {
    // Scale was removed from the Transform controls — don't restore it.
    transformMode:
      mode === "none" || mode === "translate" || mode === "rotate"
        ? mode
        : d.transformMode,
    snap: {
      x: typeof snap.x === "boolean" ? snap.x : d.snap.x,
      y: typeof snap.y === "boolean" ? snap.y : d.snap.y,
      z: typeof snap.z === "boolean" ? snap.z : d.snap.z,
    },
    gridSize: typeof r.gridSize === "string" ? r.gridSize : d.gridSize,
    resolution,
  };
}

// Default board when the PCB store has no real dimensions yet — keeps the
// preview useful before the user has done any PCB work.
const DEFAULT_BOARD: PreviewPcbBoard = {
  width: 4,
  depth: 3,
  thickness: 0.08,
  color: "#0a6b3b",
};

// A handful of placeholder components arranged in a grid — used when the
// PCB store has no real placements yet so the preview still has something
// to merge against the enclosure.
function defaultComponents(board: PreviewPcbBoard): PreviewPcbComponent[] {
  const out: PreviewPcbComponent[] = [];
  const grid = [
    { x: 0.4, y: 0.4, w: 0.6, d: 0.5, h: 0.18, kind: "ic", color: "#1f2937", id: "demo-mcu" },
    { x: 1.2, y: 0.4, w: 0.35, d: 0.2, h: 0.12, kind: "resistor", color: "#8b5cf6", id: "demo-r1" },
    { x: 1.7, y: 0.4, w: 0.35, d: 0.2, h: 0.12, kind: "resistor", color: "#8b5cf6", id: "demo-r2" },
    { x: 0.4, y: 1.2, w: 0.3, d: 0.3, h: 0.4, kind: "capacitor", color: "#0ea5e9", id: "demo-c1" },
    { x: 1.0, y: 1.2, w: 0.3, d: 0.3, h: 0.4, kind: "capacitor", color: "#0ea5e9", id: "demo-c2" },
    { x: 2.6, y: 1.6, w: 0.7, d: 0.7, h: 0.22, kind: "ic", color: "#374151", id: "demo-flash" },
    { x: 1.6, y: 2.2, w: 0.5, d: 0.18, h: 0.12, kind: "connector", color: "#f59e0b", id: "demo-conn" },
  ];
  grid.forEach((c) => {
    if (c.x + c.w > board.width || c.y + c.d > board.depth) return;
    out.push(c);
  });
  return out;
}

export type PreviewPcbBoard = {
  width: number;
  depth: number;
  thickness: number;
  color: string;
};

export type PreviewPcbComponent = {
  id: string;
  kind: string;
  x: number;
  y: number;
  w?: number;
  d?: number;
  height?: number;
  color?: string;
};

export type FitVerdict =
  | { kind: "fits"; headroom: [number, number, number] }
  | { kind: "overflow"; overflow: [number, number, number] }
  | { kind: "pcb-missing" }
  | { kind: "enclosure-missing" };

type State = {
  pcb: { board: PreviewPcbBoard; components: PreviewPcbComponent[] };
  enclosureShapes: SceneShape[];
  canvas: PreviewCanvasState;
  selectedId: string | null;
  hydrated: boolean;
  showInstancesPanel: boolean;
  showPcb: boolean;
  showEnclosure: boolean;
  sectionView: boolean;
  enclosureOpacity: number;
  resetTick: number;
  fitTick: number;
  fitSelectedTick: number;
  toast: string | null;
  fitVerdict: FitVerdict;
  contextMenu: ContextMenuTarget | null;
  flashInstanceId: string | null;
};

type Ctx = State & {
  addShape: (type: ShapeType) => void;
  deleteSelected: () => void;
  deleteInstance: (id: string) => void;
  toggleHidden: (id: string) => void;
  updateShape: (
    id: string,
    patch: Partial<Pick<SceneShape, "position" | "rotation" | "scale">>,
  ) => void;
  patchCanvas: (p: Partial<PreviewCanvasState>) => void;
  selectShape: (id: string | null) => void;
  togglePcb: () => void;
  toggleEnclosure: () => void;
  toggleInstancesPanel: () => void;
  toggleSectionView: () => void;
  resetCamera: () => void;
  fitCamera: () => void;
  fitToSelection: () => void;
  setFitVerdict: (v: FitVerdict) => void;
  flashToast: (msg: string) => void;
  // Context menu
  openContextMenu: (t: ContextMenuTarget) => void;
  closeContextMenu: () => void;
  // Per-instance actions invoked from the right-click menu
  describeInstance: (id: string | null) => InstanceInfo | null;
  hideInstance: (id: string) => void;
  hideOtherInstances: (id: string) => void;
  hideAllInGroup: (group: "pcb" | "enclosure") => void;
  duplicateInstance: (id: string) => void;
  switchToGroup: (group: "pcb" | "enclosure") => void;
  flashInstance: (id: string) => void;
};

const PreviewContext = React.createContext<Ctx | null>(null);

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  // ── Enclosure (3D module's shapes) ──────────────────────────────────
  const [enclosureShapes, setEnclosureShapes] = React.useState<SceneShape[]>([]);
  const [canvas, setCanvas] = React.useState<PreviewCanvasState>(
    DEFAULT_PREVIEW_CANVAS,
  );
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SHAPES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setEnclosureShapes(parsed);
      }
    } catch {}
    try {
      const rawC = window.localStorage.getItem(CANVAS_KEY);
      if (rawC) setCanvas(sanitizeCanvasState(JSON.parse(rawC)));
    } catch {}
    setHydrated(true);
  }, []);
  React.useEffect(() => {
    if (!hydrated) return;
    // Debounced: the transform gizmo updates shapes on every drag frame, and
    // serializing the whole list to localStorage at 60Hz stutters the drag.
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(SHAPES_KEY, JSON.stringify(enclosureShapes));
      } catch {}
    }, 200);
    return () => window.clearTimeout(t);
  }, [enclosureShapes, hydrated]);
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CANVAS_KEY, JSON.stringify(canvas));
    } catch {}
  }, [canvas, hydrated]);

  const patchCanvas = React.useCallback(
    (p: Partial<PreviewCanvasState>) => setCanvas((c) => ({ ...c, ...p })),
    [],
  );

  // ── PCB (read-only from the PCB store) ───────────────────────────────
  const pcbState = usePcbState();
  const pcb = React.useMemo(() => {
    // Read board dims from the store; fall back to default if missing.
    const raw = pcbState.pcbBoard;
    const w = raw?.width && raw.width > 0 ? raw.width : DEFAULT_BOARD.width;
    const d = raw?.height && raw.height > 0 ? raw.height : DEFAULT_BOARD.depth;
    const thickness = parseThickness(pcbState.threeD?.boardThickness)
      ?? DEFAULT_BOARD.thickness;
    const color = pcbState.threeD?.boardColor || DEFAULT_BOARD.color;
    const board: PreviewPcbBoard = { width: w, depth: d, thickness, color };

    // Components: anything placed with kind === 'component' becomes a small
    // box on top of the board. Coordinates assume PCB-canvas units roughly
    // match scene units (a real implementation would normalize via mil →
    // inch → scene units, but for the demo it's close enough to convey
    // "PCB fits / doesn't fit" intent).
    const realComponents = (pcbState.objects ?? [])
      .filter((o) => o.kind === "component")
      .map<PreviewPcbComponent>((o) => ({
        id: o.id,
        kind: o.kind,
        // Scale PCB canvas coords (mil-ish) down to the same unit space the
        // board uses. Heuristic: divide by 100. Looks reasonable for demo.
        x: (o.x ?? 0) / 100,
        y: (o.y ?? 0) / 100,
        w: ((o.width ?? 40)) / 100,
        d: ((o.height ?? o.width ?? 40)) / 100,
        height: 0.18,
        color: o.color ?? "#1f2937",
      }));

    const components = realComponents.length
      ? realComponents
      : defaultComponents(board);
    return { board, components };
  }, [pcbState.pcbBoard, pcbState.threeD, pcbState.objects]);

  // ── Selection + UI flags ─────────────────────────────────────────────
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [showInstancesPanel, setShowInstancesPanel] = React.useState(true);
  const [showPcb, setShowPcb] = React.useState(true);
  const [showEnclosure, setShowEnclosure] = React.useState(true);
  const [sectionView, setSectionView] = React.useState(false);
  const [resetTick, setResetTick] = React.useState(0);
  const [fitTick, setFitTick] = React.useState(0);
  const [fitSelectedTick, setFitSelectedTick] = React.useState(0);
  const [toast, setToast] = React.useState<string | null>(null);
  const [fitVerdict, setFitVerdict] = React.useState<FitVerdict>({
    kind: "pcb-missing",
  });
  const [contextMenu, setContextMenu] = React.useState<ContextMenuTarget | null>(
    null,
  );
  const [flashInstanceId, setFlashInstanceId] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (!flashInstanceId) return;
    const id = window.setTimeout(() => setFlashInstanceId(null), 1400);
    return () => window.clearTimeout(id);
  }, [flashInstanceId]);

  // ── Auto-dismiss toast ───────────────────────────────────────────────
  React.useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const flashToast = React.useCallback((msg: string) => setToast(msg), []);

  // ── Shape mutations (enclosure side) ─────────────────────────────────
  const addShape = React.useCallback((type: ShapeType) => {
    const offset = (Math.random() - 0.5) * 1.5;
    const s = makeShape(type, [offset, 0.5, offset]);
    setEnclosureShapes((arr) => [...arr, s]);
    setSelectedId(s.id);
    flashToast(`Added ${type} to enclosure`);
  }, [flashToast]);

  // Delete by id — used by the context menu (works whether or not the item is
  // the current selection). Only enclosure shapes are editable; PCB items
  // can't be deleted from here (they live in the PCB module).
  const deleteInstance = React.useCallback(
    (id: string) => {
      if (id === "pcb-board" || id.startsWith("demo-")) {
        flashToast("PCB items are edited in the PCB module");
        return;
      }
      setEnclosureShapes((arr) => {
        const target = arr.find((s) => s.id === id);
        if (target) flashToast(`Deleted ${target.type}`);
        return arr.filter((s) => s.id !== id);
      });
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [flashToast],
  );

  const deleteSelected = React.useCallback(() => {
    if (!selectedId) {
      flashToast("Nothing selected");
      return;
    }
    deleteInstance(selectedId);
  }, [selectedId, deleteInstance, flashToast]);

  const toggleHidden = React.useCallback((id: string) => {
    setEnclosureShapes((arr) =>
      arr.map((s) => (s.id === id ? { ...s, hidden: !s.hidden } : s)),
    );
  }, []);

  // Write a transform back to an enclosure shape (from the viewport gizmo).
  // Only enclosure shapes are editable — PCB items are read-only here.
  const updateShape = React.useCallback(
    (
      id: string,
      patch: Partial<Pick<SceneShape, "position" | "rotation" | "scale">>,
    ) => {
      setEnclosureShapes((arr) =>
        arr.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
    },
    [],
  );

  const selectShape = React.useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  // ── UI flag toggles ─────────────────────────────────────────────────
  const togglePcb = React.useCallback(() => {
    setShowPcb((v) => {
      const next = !v;
      flashToast(next ? "PCB shown" : "PCB hidden");
      return next;
    });
  }, [flashToast]);
  const toggleEnclosure = React.useCallback(() => {
    setShowEnclosure((v) => {
      const next = !v;
      flashToast(next ? "Enclosure shown" : "Enclosure hidden");
      return next;
    });
  }, [flashToast]);
  const toggleInstancesPanel = React.useCallback(() => {
    setShowInstancesPanel((v) => !v);
  }, []);
  const toggleSectionView = React.useCallback(() => {
    setSectionView((v) => {
      const next = !v;
      flashToast(next ? "Section view on (visual stub)" : "Section view off");
      return next;
    });
  }, [flashToast]);

  const resetCamera = React.useCallback(() => {
    setResetTick((t) => t + 1);
    flashToast("Camera reset");
  }, [flashToast]);
  const fitCamera = React.useCallback(() => {
    setFitTick((t) => t + 1);
    flashToast("Fit to scene");
  }, [flashToast]);
  const fitToSelection = React.useCallback(() => {
    if (!selectedId) {
      flashToast("Nothing selected");
      return;
    }
    setFitSelectedTick((t) => t + 1);
    flashToast("Zoomed to selection");
  }, [selectedId, flashToast]);

  // ── Context-menu plumbing ────────────────────────────────────────────
  const openContextMenu = React.useCallback((t: ContextMenuTarget) => {
    setContextMenu(t);
    setSelectedId(t.targetId);
  }, []);
  const closeContextMenu = React.useCallback(() => setContextMenu(null), []);

  // Build labels keyed by id so the menu can show "Copy «Box 1»" etc.
  const instanceTable = React.useMemo(() => {
    const map = new Map<string, InstanceInfo>();
    // PCB rows
    map.set("pcb-board", {
      id: "pcb-board",
      name: "Board",
      instanceIndex: 1,
      group: "pcb",
      groupLabel: "PCB",
      rootLabel: "PCB Assembly",
    });
    const pcbCounters: Record<string, number> = {};
    for (const c of pcb.components) {
      const niceKind = c.kind === "component" || !c.kind
        ? "Component"
        : capWord(c.kind);
      pcbCounters[niceKind] = (pcbCounters[niceKind] ?? 0) + 1;
      map.set(c.id, {
        id: c.id,
        name: niceKind,
        instanceIndex: pcbCounters[niceKind],
        group: "pcb",
        groupLabel: "PCB",
        rootLabel: "PCB Assembly",
      });
    }
    // Enclosure rows
    const encCounters: Record<string, number> = {};
    for (const s of enclosureShapes) {
      encCounters[s.type] = (encCounters[s.type] ?? 0) + 1;
      map.set(s.id, {
        id: s.id,
        name: capWord(s.type),
        instanceIndex: encCounters[s.type],
        group: "enclosure",
        groupLabel: "Enclosure",
        rootLabel: "Product Assembly",
      });
    }
    return map;
  }, [pcb.components, enclosureShapes]);

  const describeInstance = React.useCallback(
    (id: string | null): InstanceInfo | null => {
      if (!id) return null;
      return instanceTable.get(id) ?? null;
    },
    [instanceTable],
  );

  const hideInstance = React.useCallback(
    (id: string) => {
      const info = instanceTable.get(id);
      if (!info) return;
      if (info.group === "pcb") {
        // PCB items don't have per-row visibility yet — hide the whole group.
        setShowPcb(false);
        flashToast("PCB hidden");
        return;
      }
      setEnclosureShapes((arr) =>
        arr.map((s) => (s.id === id ? { ...s, hidden: true } : s)),
      );
      flashToast(`${info.name} ${info.instanceIndex} hidden`);
    },
    [instanceTable, flashToast],
  );

  const hideOtherInstances = React.useCallback(
    (id: string) => {
      const info = instanceTable.get(id);
      if (!info) return;
      if (info.group === "pcb") {
        // Hide enclosure side; keep PCB visible.
        setShowEnclosure(false);
        flashToast("Other instances hidden");
        return;
      }
      // Enclosure: hide every other enclosure shape AND the PCB group.
      setShowPcb(false);
      setEnclosureShapes((arr) =>
        arr.map((s) => (s.id === id ? { ...s, hidden: false } : { ...s, hidden: true })),
      );
      flashToast("Other instances hidden");
    },
    [instanceTable, flashToast],
  );

  const hideAllInGroup = React.useCallback(
    (group: "pcb" | "enclosure") => {
      if (group === "pcb") {
        setShowPcb(false);
        flashToast("PCB hidden");
      } else {
        setShowEnclosure(false);
        flashToast("Enclosure hidden");
      }
    },
    [flashToast],
  );

  const duplicateInstance = React.useCallback(
    (id: string) => {
      const info = instanceTable.get(id);
      if (!info) return;
      if (info.group === "pcb") {
        flashToast("PCB items are edited in the PCB module");
        return;
      }
      const original = enclosureShapes.find((s) => s.id === id);
      if (!original) return;
      const offset = 0.6;
      const clone: SceneShape = {
        ...original,
        id: `${original.type}-${Math.random().toString(36).slice(2, 9)}`,
        position: [
          original.position[0] + offset,
          original.position[1],
          original.position[2] + offset,
        ],
        hidden: false,
      };
      setEnclosureShapes((arr) => [...arr, clone]);
      setSelectedId(clone.id);
      flashToast(`Copied ${info.name} ${info.instanceIndex}`);
    },
    [enclosureShapes, instanceTable, flashToast],
  );

  const switchToGroup = React.useCallback(
    (group: "pcb" | "enclosure") => {
      if (group === "pcb") {
        setShowPcb(true);
        setShowEnclosure(false);
        flashToast("Switched to PCB");
      } else {
        setShowEnclosure(true);
        setShowPcb(false);
        flashToast("Switched to Enclosure");
      }
    },
    [flashToast],
  );

  const flashInstance = React.useCallback(
    (id: string) => {
      setSelectedId(id);
      setShowInstancesPanel(true);
      setFlashInstanceId(id);
      flashToast("Located in instance list");
    },
    [flashToast],
  );

  // Enclosure material opacity — translucent so the PCB inside stays visible.
  const enclosureOpacity = 0.42;

  const value: Ctx = {
    pcb,
    enclosureShapes,
    canvas,
    selectedId,
    hydrated,
    showInstancesPanel,
    showPcb,
    showEnclosure,
    sectionView,
    enclosureOpacity,
    resetTick,
    fitTick,
    fitSelectedTick,
    toast,
    fitVerdict,
    contextMenu,
    flashInstanceId,
    addShape,
    deleteSelected,
    deleteInstance,
    toggleHidden,
    updateShape,
    patchCanvas,
    selectShape,
    togglePcb,
    toggleEnclosure,
    toggleInstancesPanel,
    toggleSectionView,
    resetCamera,
    fitCamera,
    fitToSelection,
    setFitVerdict,
    flashToast,
    openContextMenu,
    closeContextMenu,
    describeInstance,
    hideInstance,
    hideOtherInstances,
    hideAllInGroup,
    duplicateInstance,
    switchToGroup,
    flashInstance,
  };

  return (
    <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>
  );
}

export function usePreview() {
  const ctx = React.useContext(PreviewContext);
  if (!ctx) throw new Error("usePreview must be used inside <PreviewProvider>");
  return ctx;
}


function capWord(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseThickness(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const m = raw.match(/([0-9.]+)/);
  if (!m) return null;
  const v = Number(m[1]);
  if (!isFinite(v) || v <= 0) return null;
  // PCB store stores thickness in mm-ish strings ("1.6 mm"). Scale to scene
  // units (assume 1 scene unit ≈ 25 mm so 1.6 mm ≈ 0.064). Bound to sensible
  // visible thickness so the board doesn't disappear.
  const scaled = v / 25;
  return Math.max(0.04, Math.min(0.4, scaled));
}
