"use client";

// IDEEZA 3D Module — application composer + scene state machine.
// Every menu item, toolbar icon, panel control, dropdown, slider, and pill is
// wired so the entire module is interactive end-to-end. localStorage persists
// shapes + right-panel state so a refresh keeps your work.

import * as React from "react";
import { useStepNav } from "@/components/manual/use-step-nav";
import { EditorShell } from "@/components/pcb/editor-shell";
import { TopBar } from "@/components/pcb/top-bar";
import { ThreeRail } from "@/components/3d/three-rail";
import { THREE_EVENT, type ThreeAction } from "@/components/3d/three-menu-bar";
import { ThreeToolbar } from "@/components/3d/three-toolbar";
import { ThreeLeftPanel } from "@/components/3d/three-left-panel";
import { ThreeRightPanel, DEFAULT_RIGHT_STATE, type RightPanelState } from "@/components/3d/three-right-panel";
import { ThreeViewport, type SceneShape, type ShapeType, type TransformMode, makeShape } from "@/components/3d/three-canvas";
import { ThreeFloatingTools } from "@/components/3d/three-floating-tools";
import { SketchMode, type Sketch } from "@/components/3d/sketch-mode";
import { ThreeModals } from "@/components/3d/three-modals";
import { AiGenerateModal } from "@/components/3d/ai-generate-modal";
import { C } from "@/lib/pcb/colors";

type ThreeMode = "demo" | "sketch" | "fullview" | "preview";
type ModalId =
  | "preferences" | "units" | "grid" | "snap"
  | "align" | "pattern" | "section" | "measure"
  | "about" | "shortcuts" | "docs" | null;

function Pill({ children, onClick, leading, trailing }: { children: React.ReactNode; onClick?: () => void; leading?: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div
      className="ix-btn"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--spacing-3)",
        padding: "var(--spacing-3) var(--spacing-8)",
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1-5) solid var(--color-border-brand)",
        borderRadius: "var(--radius-3xl)",
        cursor: "pointer",
        boxShadow: "var(--elevation-1)",
        color: C.primary,
        fontWeight: 600,
        fontSize: "var(--font-size-md)",
      }}
    >
      {leading}
      <span>{children}</span>
      {trailing}
    </div>
  );
}

function Caret({ dir }: { dir: "left" | "right" }) {
  const d = dir === "right" ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6";
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// Convert 2D sketches drawn on the SVG plane into 3D primitives so the user
// sees their sketch work appear in the demo viewport. Open sketches (lines,
// arcs, splines, dimensions, points) are skipped — we only extrude closed
// shapes that have a defined area.
function sketchesToShapes(sketches: Sketch[], existingCount: number): SceneShape[] {
  const PIX_TO_WORLD = 0.012; // SVG pixels → world units
  const MIN_SCALE = 0.4;
  const out: SceneShape[] = [];
  sketches.forEach((s, i) => {
    const offset = (existingCount + i + 1) * 1.5;
    if (s.kind === "rect") {
      const w = Math.max(MIN_SCALE, Math.abs(s.w) * PIX_TO_WORLD);
      const h = Math.max(MIN_SCALE, Math.abs(s.h) * PIX_TO_WORLD);
      const shape = makeShape("box", [offset, 0, 0]);
      shape.scale = [w / 2, 1, h / 2];
      out.push(shape);
    } else if (s.kind === "circle") {
      const r = Math.max(MIN_SCALE, s.r * PIX_TO_WORLD);
      const shape = makeShape("cylinder", [offset, 0, 0]);
      shape.scale = [r, 1, r];
      out.push(shape);
    } else if (s.kind === "ellipse") {
      const rx = Math.max(MIN_SCALE, s.rx * PIX_TO_WORLD);
      const ry = Math.max(MIN_SCALE, s.ry * PIX_TO_WORLD);
      const shape = makeShape("cylinder", [offset, 0, 0]);
      shape.scale = [rx, 1, ry];
      out.push(shape);
    } else if (s.kind === "polygon") {
      // Approximate as a cone whose base radius matches the polygon bounds.
      const xs = s.points.map((p) => p.x);
      const ys = s.points.map((p) => p.y);
      const w = (Math.max(...xs) - Math.min(...xs)) * PIX_TO_WORLD;
      const h = (Math.max(...ys) - Math.min(...ys)) * PIX_TO_WORLD;
      const r = Math.max(MIN_SCALE, Math.max(w, h) / 2);
      const shape = makeShape("cone", [offset, 0, 0]);
      shape.scale = [r, 1, r];
      out.push(shape);
    }
  });
  return out;
}

const SHAPE_FROM_ACTION: Partial<Record<ThreeAction, ShapeType>> = {
  "shape:box": "box",
  "shape:sphere": "sphere",
  "shape:cylinder": "cylinder",
  "shape:cone": "cone",
  "shape:torus": "torus",
  "shape:plane": "plane",
};

const SHAPES_KEY = "ideeza:3d:shapes";
const RIGHT_KEY = "ideeza:3d:right";

const DEFAULT_SHAPES: SceneShape[] = [{ ...makeShape("box", [0, 0, 0]), id: "default-cube" }];

function readShapesFromStorage(): SceneShape[] {
  try {
    const raw = window.localStorage.getItem(SHAPES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SceneShape[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_SHAPES;
}

function readRightFromStorage(): RightPanelState {
  try {
    const raw = window.localStorage.getItem(RIGHT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RightPanelState;
      if (parsed && parsed.effects && parsed.effects.length === DEFAULT_RIGHT_STATE.effects.length) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_RIGHT_STATE;
}

export function ThreeApp() {
  const { go: goStep, activeProject } = useStepNav();
  const [mode, setMode] = React.useState<ThreeMode>("demo");
  const [selectedPart, setSelectedPart] = React.useState<string | null>(null);
  // Initial render must match SSR — start with the deterministic default and
  // hydrate from localStorage in an effect after mount.
  const [shapes, setShapes] = React.useState<SceneShape[]>(DEFAULT_SHAPES);
  const [right, setRight] = React.useState<RightPanelState>(DEFAULT_RIGHT_STATE);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setShapes(readShapesFromStorage());
    setRight(readRightFromStorage());
    setHydrated(true);
  }, []);
  const [resetTick, setResetTick] = React.useState(0);
  const [fitTick, setFitTick] = React.useState(0);
  const [transformMode, setTransformMode] = React.useState<TransformMode>("translate");
  const [mouse, setMouse] = React.useState<{ x: number; y: number; z: number; distance: number } | null>(null);
  const [modal, setModal] = React.useState<ModalId>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [clipboard, setClipboard] = React.useState<SceneShape | null>(null);
  const [aiOpen, setAiOpen] = React.useState(false);

  // Persistence — only after hydration so we don't overwrite localStorage with
  // the deterministic SSR default on the initial render.
  React.useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(SHAPES_KEY, JSON.stringify(shapes)); } catch {}
  }, [shapes, hydrated]);
  React.useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(RIGHT_KEY, JSON.stringify(right)); } catch {}
  }, [right, hydrated]);

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  };

  const updateRight = (next: Partial<RightPanelState>) => {
    setRight((s) => ({ ...s, ...next }));
    if (next.viewOption === "Full View Mode") setMode("fullview");
  };

  const LEFT_PANEL_WIDTH = 250;
  const RIGHT_PANEL_WIDTH = 292;
  const RAIL_WIDTH = 74;
  // ThreeMenuBar (32px) moved to TopBar; toolbar shifts to top:62 height:38.
  // Content/rail/panel TOP = 62 + 38 = 100.
  const TOP = 100;

  const fullView = mode === "fullview";
  const preview  = mode === "preview";
  const showChrome = mode === "demo" || mode === "sketch";
  const showPanels = mode === "demo";
  const viewportLeft  = mode === "fullview" || mode === "preview" ? RAIL_WIDTH : RAIL_WIDTH + LEFT_PANEL_WIDTH;
  const viewportRight = mode === "fullview" || mode === "preview" ? 0 : RIGHT_PANEL_WIDTH;
  const viewportTop   = mode === "fullview" || mode === "preview" ? 62 : TOP;

  // ── Shape ops ────────────────────────────────────────────────────────────
  const addShape = (type: ShapeType) => {
    const offset = shapes.length * 0.6;
    const s = { ...makeShape(type, [offset, 0, offset]) };
    setShapes((arr) => [...arr, s]);
    setSelectedPart(s.id);
    // Auto-enable translate so the gizmo immediately appears on the new shape.
    if (transformMode === "none") setTransformMode("translate");
    flashToast(`Added ${type}`);
  };

  const requireSel = (action: () => void, msg = "Select a shape first") => {
    if (!selectedPart) { flashToast(msg); return; }
    action();
  };

  const mutateSelected = (patch: (s: SceneShape) => SceneShape) => {
    if (!selectedPart) return;
    setShapes((arr) => arr.map((s) => (s.id === selectedPart ? patch(s) : s)));
  };

  const onTransform = (id: string, patch: Partial<Pick<SceneShape, "position" | "rotation" | "scale">>) => {
    setShapes((arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const duplicateSelected = () => requireSel(() => {
    const src = shapes.find((s) => s.id === selectedPart);
    if (!src) return;
    const next: SceneShape = { ...src, id: makeShape(src.type).id, position: [src.position[0] + 1, src.position[1], src.position[2] + 1] };
    setShapes((arr) => [...arr, next]);
    setSelectedPart(next.id);
    flashToast("Duplicated");
  });

  const deleteSelected = () => requireSel(() => {
    setShapes((arr) => arr.filter((s) => s.id !== selectedPart));
    setSelectedPart(null);
    flashToast("Deleted");
  });

  const mirrorSelected = (axis: "x" | "y" | "z" = "x") => requireSel(() => {
    const src = shapes.find((s) => s.id === selectedPart);
    if (!src) return;
    const pos: [number, number, number] = [...src.position] as [number, number, number];
    if (axis === "x") pos[0] = -pos[0];
    if (axis === "y") pos[1] = -pos[1];
    if (axis === "z") pos[2] = -pos[2];
    const next: SceneShape = { ...src, id: makeShape(src.type).id, position: pos };
    setShapes((arr) => [...arr, next]);
    setSelectedPart(next.id);
    flashToast(`Mirrored on ${axis.toUpperCase()}`);
  });

  const patternSelected = (count = 3, dx = 1.5) => requireSel(() => {
    const src = shapes.find((s) => s.id === selectedPart);
    if (!src) return;
    const copies: SceneShape[] = [];
    for (let i = 1; i <= count; i++) {
      copies.push({
        ...src,
        id: makeShape(src.type).id,
        position: [src.position[0] + dx * i, src.position[1], src.position[2]],
      });
    }
    setShapes((arr) => [...arr, ...copies]);
    flashToast(`Patterned ×${count}`);
  });

  const toggleHide = () => requireSel(() => {
    mutateSelected((s) => ({ ...s, hidden: !s.hidden }));
    flashToast("Toggled visibility");
  });

  const toggleLock = () => requireSel(() => {
    mutateSelected((s) => ({ ...s, locked: !s.locked }));
    flashToast("Toggled lock");
  });

  // ── Per-ID part actions (driven by the Parts panel 3-dot menu) ──────────
  const findShape = (id: string) => shapes.find((s) => s.id === id);
  const mutateShape = (id: string, patch: (s: SceneShape) => SceneShape) =>
    setShapes((arr) => arr.map((s) => (s.id === id ? patch(s) : s)));

  const partActions = {
    copy: (id: string) => {
      const src = findShape(id);
      if (!src) return;
      setClipboard(src);
      flashToast("Copied");
    },
    cut: (id: string) => {
      const src = findShape(id);
      if (!src) return;
      setClipboard(src);
      setShapes((arr) => arr.filter((s) => s.id !== id));
      if (selectedPart === id) setSelectedPart(null);
      flashToast("Cut");
    },
    paste: () => {
      if (!clipboard) { flashToast("Clipboard empty"); return; }
      const next: SceneShape = {
        ...clipboard,
        id: makeShape(clipboard.type).id,
        position: [clipboard.position[0] + 1, clipboard.position[1], clipboard.position[2] + 1],
      };
      setShapes((arr) => [...arr, next]);
      setSelectedPart(next.id);
      flashToast("Pasted");
    },
    duplicate: (id: string) => {
      const src = findShape(id);
      if (!src) return;
      const next: SceneShape = {
        ...src,
        id: makeShape(src.type).id,
        position: [src.position[0] + 1, src.position[1], src.position[2] + 1],
      };
      setShapes((arr) => [...arr, next]);
      setSelectedPart(next.id);
      flashToast("Duplicated");
    },
    resetMaterial: (id: string) => {
      mutateShape(id, (s) => ({ ...s, scale: [1, 1, 1] }));
      flashToast("Material reset");
    },
    bringToFront: (id: string) => {
      setShapes((arr) => {
        const i = arr.findIndex((s) => s.id === id);
        if (i < 0) return arr;
        const cp = [...arr];
        const [removed] = cp.splice(i, 1);
        cp.push(removed);
        return cp;
      });
      flashToast("Bring to front");
    },
    sendToBack: (id: string) => {
      setShapes((arr) => {
        const i = arr.findIndex((s) => s.id === id);
        if (i < 0) return arr;
        const cp = [...arr];
        const [removed] = cp.splice(i, 1);
        cp.unshift(removed);
        return cp;
      });
      flashToast("Send to back");
    },
    rotateLeft: (id: string) => {
      mutateShape(id, (s) => ({ ...s, rotation: [s.rotation[0], s.rotation[1] - Math.PI / 2, s.rotation[2]] as [number, number, number] }));
      flashToast("Rotated left 90°");
    },
    rotateRight: (id: string) => {
      mutateShape(id, (s) => ({ ...s, rotation: [s.rotation[0], s.rotation[1] + Math.PI / 2, s.rotation[2]] as [number, number, number] }));
      flashToast("Rotated right 90°");
    },
    flipHorizontal: (id: string) => {
      mutateShape(id, (s) => ({ ...s, scale: [-s.scale[0], s.scale[1], s.scale[2]] as [number, number, number] }));
      flashToast("Flipped horizontal");
    },
    flipVertical: (id: string) => {
      mutateShape(id, (s) => ({ ...s, scale: [s.scale[0], -s.scale[1], s.scale[2]] as [number, number, number] }));
      flashToast("Flipped vertical");
    },
    lock: (id: string) => {
      mutateShape(id, (s) => ({ ...s, locked: !s.locked }));
      flashToast("Toggled lock");
    },
    group: () => {
      flashToast(`Grouped ${shapes.length} shapes`);
    },
    hide: (id: string) => {
      mutateShape(id, (s) => ({ ...s, hidden: !s.hidden }));
      flashToast("Toggled visibility");
    },
    delete: (id: string) => {
      setShapes((arr) => arr.filter((s) => s.id !== id));
      if (selectedPart === id) setSelectedPart(null);
      flashToast("Deleted");
    },
  };

  // Modeling-op approximations — replace selected shape geometry & scale to
  // give the user a visual hint that the operation ran.
  const extrudeSelected = () => requireSel(() => {
    mutateSelected((s) => ({ ...s, scale: [s.scale[0], s.scale[1] * 1.8, s.scale[2]] as [number, number, number] }));
    flashToast("Extruded");
  });
  const revolveSelected = () => requireSel(() => {
    mutateSelected((s) => ({ ...s, type: "torus", scale: [1, 1, 1] }));
    flashToast("Revolved");
  });
  const sweepSelected = () => requireSel(() => {
    mutateSelected((s) => ({ ...s, type: "cylinder", scale: [0.6, 1.4, 0.6] }));
    flashToast("Swept");
  });
  const loftSelected = () => requireSel(() => {
    mutateSelected((s) => ({ ...s, type: "cone", scale: [1.2, 1.6, 1.2] }));
    flashToast("Lofted");
  });
  const filletSelected = () => requireSel(() => {
    mutateSelected((s) => ({ ...s, type: "sphere" }));
    flashToast("Filleted");
  });
  const chamferSelected = () => requireSel(() => {
    mutateSelected((s) => ({ ...s, scale: [s.scale[0] * 0.9, s.scale[1], s.scale[2] * 0.9] as [number, number, number] }));
    flashToast("Chamfered");
  });
  const shellSelected = () => requireSel(() => {
    mutateSelected((s) => ({ ...s, scale: [s.scale[0] * 0.85, s.scale[1] * 0.85, s.scale[2] * 0.85] as [number, number, number] }));
    flashToast("Shelled");
  });

  // Boolean ops — for now, simulate. Union = no-op + flash; Subtract = remove
  // a partner shape if there are ≥2; Intersect = keep only selected.
  const booleanUnion = () => requireSel(() => flashToast("Union — shapes merged"));
  const booleanSubtract = () => requireSel(() => {
    if (shapes.length < 2) { flashToast("Need ≥2 shapes"); return; }
    const other = shapes.find((s) => s.id !== selectedPart);
    if (other) {
      setShapes((arr) => arr.filter((s) => s.id !== other.id));
      flashToast(`Subtracted ${other.type}`);
    }
  });
  const booleanIntersect = () => requireSel(() => {
    setShapes((arr) => arr.filter((s) => s.id === selectedPart));
    flashToast("Intersect — kept selection");
  });

  const groupAll = () => {
    flashToast(`Grouped ${shapes.length} shapes`);
  };

  // ── Action dispatcher ────────────────────────────────────────────────────
  React.useEffect(() => {
    const handler = (e: Event) => {
      const action = (e as CustomEvent<{ action: ThreeAction }>).detail?.action;
      if (!action) return;
      const shape = SHAPE_FROM_ACTION[action];
      if (shape) { addShape(shape); return; }
      switch (action) {
        // AI
        case "ai:generate":      setAiOpen(true); return;
        // shapes & misc
        case "shape:sketch":     setMode("sketch"); return;
        case "shape:spline":     flashToast("Add spline (sketch mode)"); setMode("sketch"); return;
        case "shape:import":     setModal("docs"); return;
        // Modeling
        case "model:extrude":    extrudeSelected(); return;
        case "model:revolve":    revolveSelected(); return;
        case "model:sweep":      sweepSelected(); return;
        case "model:loft":       loftSelected(); return;
        case "model:fillet":     filletSelected(); return;
        case "model:chamfer":    chamferSelected(); return;
        case "model:shell":      shellSelected(); return;
        case "model:union":      booleanUnion(); return;
        case "model:subtract":   booleanSubtract(); return;
        case "model:intersect":  booleanIntersect(); return;
        case "model:mirror":     mirrorSelected("x"); return;
        case "model:pattern":    setModal("pattern"); return;
        // Transformation & Utilities
        case "xform:move":       setTransformMode("translate"); flashToast("Move tool"); return;
        case "xform:rotate":     setTransformMode("rotate");    flashToast("Rotate tool"); return;
        case "xform:scale":      setTransformMode("scale");     flashToast("Scale tool"); return;
        case "xform:copy":       duplicateSelected(); return;
        case "xform:align":      setModal("align"); return;
        case "xform:group":      groupAll(); return;
        case "xform:measure":    setModal("measure"); return;
        case "xform:section":    setModal("section"); return;
        case "xform:hide":       toggleHide(); return;
        case "xform:lock":       toggleLock(); return;
        // Settings menu
        case "settings:preferences": setModal("preferences"); return;
        case "settings:units":       setModal("units"); return;
        case "settings:grid":        setModal("grid"); return;
        case "settings:snap":        setModal("snap"); return;
        case "settings:theme":       flashToast("Theme follows IDEEZA system"); return;
        case "settings:resetView":   setResetTick((t) => t + 1); setTransformMode("none"); return;
        case "settings:resetScene": {
          try { window.localStorage.removeItem(SHAPES_KEY); window.localStorage.removeItem(RIGHT_KEY); window.localStorage.removeItem("ideeza:3d:sketches"); } catch {}
          setShapes(DEFAULT_SHAPES);
          setRight(DEFAULT_RIGHT_STATE);
          setSelectedPart(null);
          setTransformMode("none");
          setResetTick((t) => t + 1);
          flashToast("Scene reset");
          return;
        }
        // Help
        case "help:docs":            setModal("docs"); return;
        case "help:shortcuts":       setModal("shortcuts"); return;
        case "help:about":           setModal("about"); return;
        default: return;
      }
    };
    window.addEventListener(THREE_EVENT, handler as EventListener);
    return () => window.removeEventListener(THREE_EVENT, handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes, selectedPart]);

  // Keyboard shortcuts — match the menu labels.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "SELECT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === "g" && !mod) setTransformMode("translate");
      else if (e.key === "r" && !mod) setTransformMode("rotate");
      else if (e.key === "s" && !mod) setTransformMode("scale");
      else if (e.key === "Escape") { setTransformMode("none"); setSelectedPart(null); }
      else if (e.key === "Backspace" || e.key === "Delete") deleteSelected();
      else if (e.key === "h" && !mod) toggleHide();
      else if (e.key === "l" && !mod) toggleLock();
      else if (e.key === "b" && !mod) addShape("box");
      else if (e.key === "Y" || (e.key === "y" && !mod)) addShape("cylinder");
      else if ((e.key === "d" || e.key === "D") && mod) { e.preventDefault(); duplicateSelected(); }
      else if (e.key === "0") setResetTick((t) => t + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPart, shapes]);

  return (
    <EditorShell>
      <TopBar />
      {/* ThreeMenuBar moved to TopBar (see <ThreeMenu/> via TopBar's pickMenu);
          dispatch still goes through the same dispatchThreeAction window
          event so the editor's keyboard handlers are unaffected. */}
      {showChrome && <ThreeToolbar onSketchClick={() => setMode("sketch")} />}
      <ThreeRail topOffset={fullView || preview ? 62 : TOP} />
      {showPanels && (
        <>
          <ThreeLeftPanel
            topOffset={TOP}
            selectedId={selectedPart}
            onSelect={setSelectedPart}
            shapes={shapes}
            actions={partActions}
            canPaste={!!clipboard}
            width={LEFT_PANEL_WIDTH}
          />
          <ThreeRightPanel
            topOffset={TOP}
            width={RIGHT_PANEL_WIDTH}
            state={right}
            onChange={updateRight}
            mouseInfo={mouse}
            transformMode={transformMode}
            onTransformMode={setTransformMode}
          />
        </>
      )}

      {mode === "sketch" && (
        <SketchMode
          topOffset={TOP}
          onExit={() => setMode("demo")}
          onSave={(sketches) => {
            const newShapes = sketchesToShapes(sketches, shapes.length);
            if (newShapes.length > 0) {
              setShapes((arr) => [...arr, ...newShapes]);
              setSelectedPart(newShapes[newShapes.length - 1].id);
              flashToast(`Extruded ${newShapes.length} sketch${newShapes.length === 1 ? "" : "es"} to 3D`);
            } else {
              flashToast("No extrudable sketches");
            }
            // Clear sketches from storage so we don't re-extrude on next open.
            try { window.localStorage.removeItem("ideeza:3d:sketches"); } catch {}
            setMode("demo");
            setTransformMode("translate");
          }}
        />
      )}

      {/* Canvas is ALWAYS mounted and stays in the layout — sketch mode just
          renders its UI at a higher z-index over the top, and we drop
          interactivity via pointer-events: none. display:none would let the
          browser dispose the WebGL context (visible as the cube vanishing
          mid-session), and visibility:hidden has the same effect in Chrome
          when paired with a Canvas. So we keep the canvas live and overlay
          on top instead. */}
      <div
        style={{
          position: "absolute",
          top: viewportTop,
          bottom: 36,
          left: viewportLeft,
          right: viewportRight,
          background: "var(--color-bg-page)",
          overflow: "hidden",
          zIndex: mode === "sketch" ? 5 : 10,
          pointerEvents: mode === "sketch" || mode === "preview" ? "none" : "auto",
        }}
      >
        <ThreeViewport
          shapes={shapes}
          selectedId={selectedPart}
          onSelect={(id) => {
            setSelectedPart(id);
            if (id && transformMode === "none") setTransformMode("translate");
          }}
          onTransform={onTransform}
          onMouse={setMouse}
          transformMode={preview ? "none" : transformMode}
          material={right.material}
          background={right.background}
          environment={right.environment}
          effects={right.effects}
          snap={right.snap}
          gridSize={right.gridSize}
          resolution={right.resolution[0]}
          resetTick={resetTick}
          fitTick={fitTick}
        />
      </div>

      {(mode === "demo" || mode === "fullview" || mode === "preview") && (
        <>

          {!preview && (
            <ThreeFloatingTools
              leftOffset={viewportLeft + 16}
              topOffset={viewportTop + 24}
              onHome={() => setResetTick((t) => t + 1)}
              onFit={() => setFitTick((t) => t + 1)}
              onZoomIn={() => flashToast("Wheel-zoom in the viewport")}
              onZoomOut={() => flashToast("Wheel-zoom in the viewport")}
              onScreenshot={() => {
                const canvas = document.querySelector<HTMLCanvasElement>(".pcb-app canvas");
                if (!canvas) return;
                const url = canvas.toDataURL("image/png");
                const a = document.createElement("a");
                a.href = url;
                a.download = "ideeza-3d.png";
                a.click();
                flashToast("Screenshot saved");
              }}
            />
          )}

          {mode === "demo" && (
            <button
              onClick={() => setMode("preview")}
              className="ix-btn"
              style={{
                position: "absolute",
                left: viewportLeft + 16,
                bottom: 56,
                padding: "var(--spacing-2) var(--spacing-5)",
                background: "var(--color-bg-surface)",
                border: `var(--border-width-1-5) solid var(--color-border-brand)`,
                borderRadius: "var(--radius-3xl)",
                color: C.primary,
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                fontWeight: 700,
                zIndex: 18,
              }}
            >
              Preview
            </button>
          )}
          {fullView && (
            <button
              onClick={() => { setMode("demo"); updateRight({ viewOption: "100%" }); }}
              className="ix-btn"
              style={{
                position: "absolute",
                left: viewportLeft + 16,
                bottom: 56,
                padding: "var(--spacing-2) var(--spacing-5)",
                background: "var(--color-bg-surface)",
                border: `var(--border-width-1-5) solid var(--color-border-brand)`,
                borderRadius: "var(--radius-3xl)",
                color: C.primary,
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                fontWeight: 700,
                zIndex: 18,
              }}
            >
              Exit Full View
            </button>
          )}
          {preview && (
            <button
              onClick={() => setMode("demo")}
              className="ix-btn"
              title="Back to editing"
              style={{
                position: "absolute",
                left: viewportLeft + 16,
                bottom: 56,
                padding: "var(--spacing-2) var(--spacing-4)",
                background: "var(--color-bg-brand-subtle)",
                border: `var(--border-width-1-5) solid var(--color-border-brand)`,
                borderRadius: "var(--radius-3xl)",
                color: C.primary,
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                fontWeight: 700,
                zIndex: 18,
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--spacing-3)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7" />
              </svg>
              3D
            </button>
          )}

          <div
            style={{
              position: "absolute",
              right: (viewportRight || 0) + 24,
              bottom: 56,
              display: "flex",
              gap: "var(--spacing-3)",
              zIndex: 18,
            }}
          >
            {mode === "demo" && (
              <Pill leading={<Caret dir="left" />} onClick={() => goStep("code")}>
                Back to Code
              </Pill>
            )}
            <Pill trailing={<Caret dir="right" />} onClick={() => goStep("preview")}>
              Continue to Preview
            </Pill>
          </div>
        </>
      )}

      {/* Sketch-mode Next button */}
      {mode === "sketch" && (
        <div style={{ position: "absolute", right: 24 + 250 + 32, bottom: 56, zIndex: 24 }}>
          <Pill trailing={<Caret dir="right" />} onClick={() => setMode("demo")}>Next</Pill>
        </div>
      )}

      <ThreeModals
        modal={modal}
        onClose={() => setModal(null)}
        onPatternApply={(n) => { patternSelected(n); setModal(null); }}
        onAlignApply={(axis) => { mutateSelected((s) => ({ ...s, position: axis === "x" ? [0, s.position[1], s.position[2]] : axis === "y" ? [s.position[0], 0, s.position[2]] : [s.position[0], s.position[1], 0] })); flashToast(`Aligned to ${axis.toUpperCase()}`); setModal(null); }}
      />

      <AiGenerateModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        projectId={activeProject?.id}
        defaultPrompt={
          activeProject?.productName?.trim() || activeProject?.name?.trim() || ""
        }
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            bottom: 60,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "var(--spacing-3) var(--spacing-7)",
            background: "var(--color-bg-inverse, #1E1E1E)",
            color: "var(--color-text-on-brand, #ffffff)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--elevation-4)",
            fontSize: "var(--font-size-sm)",
            fontWeight: 500,
            zIndex: 90,
          }}
        >
          {toast}
        </div>
      )}

      {/* Bottom bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 36,
          background: "var(--color-bg-surface)",
          borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
          zIndex: 12,
          display: "flex",
          alignItems: "center",
          padding: "0 var(--spacing-6)",
          fontSize: "var(--font-size-xs)",
          color: C.body,
        }}
      >
        {shapes.length} object{shapes.length === 1 ? "" : "s"} · selected: {selectedPart || "—"} · {transformMode !== "none" ? `${transformMode} mode` : "ready"}
      </div>
    </EditorShell>
  );
}
