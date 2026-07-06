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
import {
  derivePcb3D,
  type Pcb3DBoard,
  type Pcb3DComponent,
} from "@/lib/pcb/pcb-3d";

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
const MATES_KEY = "ideeza:preview:mates";

// ── Mate settings (SolidWorks-style, per selected instance) ────────────
// Pure UI state for now: the panel records the designer's intent; actual
// 3D constraint solving is a separate canvas-side feature.
export type MateType =
  | "coincident"
  | "parallel"
  | "perpendicular"
  | "tangent"
  | "concentric"
  | "lock";

export type MateAlignment = "aligned" | "anti-aligned";

export type MateSettings = {
  type: MateType;
  distance: number; // mm
  angle: number; // deg
  alignment: MateAlignment;
};

export const DEFAULT_MATE: MateSettings = {
  type: "coincident",
  distance: 1,
  angle: 30,
  alignment: "aligned",
};

const MATE_TYPES: MateType[] = [
  "coincident",
  "parallel",
  "perpendicular",
  "tangent",
  "concentric",
  "lock",
];

// Rebuild a safe mate map from persisted storage — hand-edited or stale
// values must never crash the panel.
function sanitizeMates(raw: unknown): Record<string, MateSettings> {
  if (typeof raw !== "object" || raw === null) return {};
  const out: Record<string, MateSettings> = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== "object" || v === null) continue;
    const m = v as Record<string, unknown>;
    out[id] = {
      type: MATE_TYPES.includes(m.type as MateType)
        ? (m.type as MateType)
        : DEFAULT_MATE.type,
      distance:
        typeof m.distance === "number" && isFinite(m.distance)
          ? Math.max(0, m.distance)
          : DEFAULT_MATE.distance,
      angle:
        typeof m.angle === "number" && isFinite(m.angle)
          ? Math.min(360, Math.max(0, m.angle))
          : DEFAULT_MATE.angle,
      alignment:
        m.alignment === "aligned" || m.alignment === "anti-aligned"
          ? m.alignment
          : DEFAULT_MATE.alignment,
    };
  }
  return out;
}

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

// Board/component derivation (incl. the demo-component fallback used before
// the user places anything) lives in the shared pcb-3d lib — the PCB module's
// 3D tab uses the exact same function, so the two views can't drift.
export type PreviewPcbBoard = Pcb3DBoard;
export type PreviewPcbComponent = Pcb3DComponent;

export type FitVerdict =
  | { kind: "fits"; headroom: [number, number, number] }
  | { kind: "overflow"; overflow: [number, number, number] }
  | { kind: "pcb-missing" }
  | { kind: "enclosure-missing" };

type State = {
  pcb: { board: PreviewPcbBoard; components: PreviewPcbComponent[] };
  enclosureShapes: SceneShape[];
  canvas: PreviewCanvasState;
  mates: Record<string, MateSettings>;
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
  setMate: (id: string, patch: Partial<MateSettings>) => void;
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
  // Mates (per-instance, persisted) — declared before the hydration effect
  // that restores them.
  const [mates, setMates] = React.useState<Record<string, MateSettings>>({});
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
    try {
      const rawM = window.localStorage.getItem(MATES_KEY);
      if (rawM) setMates(sanitizeMates(JSON.parse(rawM)));
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

  // ── Mates persistence ────────────────────────────────────────────────
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(MATES_KEY, JSON.stringify(mates));
    } catch {}
  }, [mates, hydrated]);

  const setMate = React.useCallback(
    (id: string, patch: Partial<MateSettings>) => {
      setMates((m) => ({ ...m, [id]: { ...DEFAULT_MATE, ...m[id], ...patch } }));
    },
    [],
  );

  // ── PCB (read-only from the PCB store) ───────────────────────────────
  const pcbState = usePcbState();
  const pcb = React.useMemo(
    () => derivePcb3D(pcbState),
    // Only these slices feed the derivation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pcbState.pcbBoard, pcbState.threeD, pcbState.objects],
  );

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
    mates,
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
    setMate,
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
