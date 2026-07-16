"use client";

// IDEEZA PCB Software — canvas area.
// Rulers, the Schematic⇄PCB(⇄2D⇄3D) mode segmented control, the mode-specific
// drawing (via buildCanvas), the draggable Floating Tools, and the Plane / Next
// pills. Right-clicking the canvas opens the context menu. Ctrl/Cmd + wheel
// zooms in/out at the cursor; middle-mouse or space-drag pans the viewport.

import * as React from "react";
import { useStepNav } from "@/components/manual/use-step-nav";
import { Icon } from "@/lib/pcb/icons";
import { buildCanvas } from "@/lib/pcb/content";
import { buildModeTabs } from "@/lib/pcb/data";
import { AXIS_SVG, NEXT_SVG, PLANE_SVG } from "@/lib/pcb/markup";
import { SchematicCanvas } from "@/components/pcb/schem-canvas";
import { PcbCanvas } from "@/components/pcb/pcb-canvas";
import { PcbThreeView } from "@/components/pcb/pcb-three-view";
import { PlacedObjects } from "@/components/pcb/placed-objects";
import { BOARD_COLOR_HEX, PAD_COLOR_HEX } from "@/lib/pcb/pcb-3d";
import { PLACE_TOOLS, DRAFT_TOOLS, isSelectable } from "@/lib/pcb/types";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

const DRAG_THRESHOLD = 4;

const GRID_MINOR = 24;
const GRID_MAJOR = 120;

function GridPattern() {
  // Faint violet square-line grid (two scales), tiling infinitely — matches
  // the schematic design-area reference. Lines are violet-tinted so the whole
  // canvas reads as a light lavender engineering sheet.
  const minor = "color-mix(in srgb, var(--color-violet-600) 14%, transparent)";
  const major = "color-mix(in srgb, var(--color-violet-600) 26%, transparent)";
  return (
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <defs>
        <pattern id="ix-grid-minor" width={GRID_MINOR} height={GRID_MINOR} patternUnits="userSpaceOnUse">
          <path d={`M ${GRID_MINOR} 0 L 0 0 0 ${GRID_MINOR}`} fill="none" stroke={minor} strokeWidth="1" />
        </pattern>
        <pattern id="ix-grid-major" width={GRID_MAJOR} height={GRID_MAJOR} patternUnits="userSpaceOnUse">
          <path d={`M ${GRID_MAJOR} 0 L 0 0 0 ${GRID_MAJOR}`} fill="none" stroke={major} strokeWidth="1.2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ix-grid-minor)" />
      <rect width="100%" height="100%" fill="url(#ix-grid-major)" />
    </svg>
  );
}

// Schematic left tool palette — vertical, docked at the left edge of the
// canvas. Icons + a dropdown caret on tools that carry variants. Clicking an
// icon arms the tool (or opens the parts picker for Component).
type SchemTool = { key: string; label: string; tool?: string; action?: "devicePicker"; caret?: boolean; svg: string };
const SCHEM_TOOLS: SchemTool[] = [
  { key: "select", label: "Select", tool: "select", caret: true, svg: '<path d="M5 3l6 15 2-6 6-2z"/>' },
  { key: "wire", label: "Wire", tool: "wire", caret: true, svg: '<path d="M4 20L20 4M14 4h6v6"/>' },
  { key: "component", label: "Component", action: "devicePicker", caret: true, svg: '<rect x="7" y="8" width="10" height="8" rx="1"/><path d="M3 10h4M3 14h4M17 10h4M17 14h4"/>' },
  { key: "netPort", label: "Net Port", tool: "port", caret: true, svg: '<path d="M4 8h9l4 4-4 4H4z"/>' },
  { key: "power", label: "Power / Net Flag", tool: "vcc5v", caret: true, svg: '<path d="M12 21V9M6 9h12M9 5h6"/>' },
  { key: "noConnect", label: "No Connect", tool: "noConnect", svg: '<path d="M6 6l12 12M18 6L6 18"/>' },
  { key: "junction", label: "Junction", tool: "junction", svg: '<path d="M12 5v14M5 12h14"/>' },
  { key: "text", label: "Text", tool: "text", caret: true, svg: '<path d="M5 6h14M12 6v13M9 19h6"/>' },
  { key: "eraser", label: "Eraser", tool: "eraser", svg: '<path d="M4 15l7-7 6 6-4 4H8zM14 20h6"/>' },
];

function SchemToolPalette({ leftInset, top }: { leftInset: number; top: number }) {
  const state = usePcbState();
  const actions = usePcbActions();
  return (
    <div
      style={{
        position: "absolute",
        left: leftInset + 20,
        top: top + 92,
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-1)",
        padding: "var(--spacing-2)",
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--elevation-4)",
        zIndex: 13,
      }}
    >
      {SCHEM_TOOLS.map((t) => {
        const active = !!t.tool && state.tool === t.tool;
        return (
          <button
            key={t.key}
            type="button"
            title={t.label}
            aria-label={t.label}
            onClick={() => (t.action === "devicePicker" ? actions.openModal("devicePicker") : t.tool && actions.setTool(t.tool))}
            style={{
              display: "flex", alignItems: "center", gap: 3,
              height: 34, padding: t.caret ? "0 4px 0 7px" : "0 7px",
              borderRadius: "var(--radius-lg)", border: "none", cursor: "pointer",
              background: active ? "var(--color-bg-brand-subtle)" : "transparent",
              color: active ? "var(--color-violet-600)" : "var(--color-text-primary)",
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: t.svg }} />
            {t.caret && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2.4"><path d="M6 9l6 6 6-6" /></svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function CanvasArea() {
  const state = usePcbState();
  const actions = usePcbActions();
  const { go: goStep } = useStepNav();
  const modeTabs = buildModeTabs(state, actions);
  const v = state.viewTog;
  // Breadcrumb + old MenuBar strips removed; everything that used to sit at
  // 225/142 now starts at 145/62 (just below the TopBar, optionally below the
  // toolbar). Same 80px delta as left-panel / left-rail / right-panel.
  const top = v["Top Toolbar"] !== false ? 108 : 62;
  const left = v["Left-Side panel"] !== false ? 366 : 74;
  const right = v["Right-Side Panel"] !== false ? 292 : 0;

  const canvasRef = React.useRef<HTMLDivElement>(null);
  const panRef = React.useRef<{ x: number; y: number } | null>(null);
  // Set when a drag gesture already completed a draft segment on mouseup —
  // the browser's trailing click must not start a new draft.
  const suppressClickRef = React.useRef(false);
  const [isPanning, setIsPanning] = React.useState(false);
  const [spaceHeld, setSpaceHeld] = React.useState(false);
  const handMode = state.tool === "hand" || spaceHeld;

  // Global key handlers — Delete / Escape / Ctrl+C/X/V / Ctrl+A / R / Ctrl+Z/Y,
  // plus Hand-tool toggle (H) and temporary hand-mode while Space is held.
  // Skips when focus is inside an editable text field so typing works normally.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setSpaceHeld(true);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selectedIds.length > 0) {
          e.preventDefault();
          actions.deleteSelected();
        }
      } else if (e.key === "Escape") {
        if (state.draftWire) actions.cancelDraft();
        else if (state.rubberBand) actions.cancelRubberBand();
        else if (state.selectedIds.length > 0) actions.selectPlaced(null);
        else actions.setTool("select");
      } else if (mod && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        actions.copySelection();
      } else if (mod && (e.key === "x" || e.key === "X")) {
        e.preventDefault();
        actions.cutSelection();
      } else if (mod && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        actions.pasteClipboard();
      } else if (mod && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        actions.selectAll();
      } else if (mod && (e.key === "z" || e.key === "Z") && !e.shiftKey) {
        e.preventDefault();
        actions.undo();
      } else if (mod && ((e.key === "y" || e.key === "Y") || ((e.key === "z" || e.key === "Z") && e.shiftKey))) {
        e.preventDefault();
        actions.redo();
      } else if (!mod && (e.key === "h" || e.key === "H")) {
        actions.setTool(state.tool === "hand" ? "select" : "hand");
      } else if (!mod && (e.key === "v" || e.key === "V")) {
        actions.setTool("select");
      } else if (!mod && (e.key === "r" || e.key === "R")) {
        if (state.selectedIds.length > 0) {
          e.preventDefault();
          actions.rotateSelectedPlaced(e.shiftKey ? -90 : 90);
        }
      }
    };
    const release = (e: KeyboardEvent) => {
      if (e.key === " " || e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", release);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", release);
    };
  }, [state.selectedIds, state.draftWire, state.rubberBand, state.tool, actions]);

  // Ctrl/Cmd + wheel zooms at the cursor; plain wheel scrolls inside flow (no-op here).
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const focus = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (e.deltaY < 0) actions.zoomIn(focus);
    else actions.zoomOut(focus);
  };

  // Unified mouse-down dispatcher:
  //  - middle button: immediate pan
  //  - hand tool active OR Space held: pan on left drag
  //  - left + select tool + clicked on an object: drag-to-move (all selected
  //    objects move together; pure click → select)
  //  - left + select tool + clicked on empty canvas: rubber-band selection
  //  - everything else: place/draft handled by onClick on mouseup
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    const isLeft = e.button === 0;
    const target = e.target as HTMLElement;
    const objNode = target.closest("[data-object-id]") as HTMLElement | null;
    const clickedObjectId = objNode?.getAttribute("data-object-id") ?? null;
    const rect = canvasRef.current?.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY };
    const canvasStart = rect
      ? { x: (e.clientX - rect.left - state.pan.x) / state.zoom, y: (e.clientY - rect.top - state.pan.y) / state.zoom }
      : null;

    // Decide intent.
    const intentPan =
      e.button === 1 || (isLeft && handMode);
    const interactiveMode = state.mode === "schematic" || state.mode === "pcb" || state.mode === "2d";
    const clickedObj = clickedObjectId ? state.objects.find((o) => o.id === clickedObjectId) : undefined;
    const clickedIsSelectable =
      !clickedObjectId || (clickedObj != null && isSelectable(clickedObj.kind, state.boardSettings ?? {}, state.mode));
    const intentMoveObject =
      isLeft &&
      !handMode &&
      state.tool === "select" &&
      clickedObjectId != null &&
      interactiveMode &&
      clickedIsSelectable;
    const intentRubber =
      isLeft && !handMode && state.tool === "select" && !clickedObjectId && interactiveMode && canvasStart != null;
    // A drawing tool is armed: dragging must never pan the board out from
    // under the cursor (the #1 "tool doesn't work" trap). Draft tools also
    // support press-drag-release as a single gesture.
    const intentTool =
      isLeft && !handMode && interactiveMode &&
      (DRAFT_TOOLS.includes(state.tool) || PLACE_TOOLS.includes(state.tool));

    let mode: "idle" | "pan" | "rubber" | "moveObj" | "tool" = "idle";
    let draftStartedInDrag = false;
    let movePivot = { ...start };
    let movedObjects: { id: string; origX: number; origY: number; origEndX?: number; origEndY?: number }[] = [];

    if (intentPan) {
      e.preventDefault();
      panRef.current = { ...start };
      setIsPanning(true);
      mode = "pan";
    } else if (intentMoveObject && clickedObjectId) {
      // Select first (or add to selection if shift), then prepare to move all selected.
      // intentMoveObject already guarantees clickedObj is selectable.
      if (!state.selectedIds.includes(clickedObjectId)) {
        actions.selectPlaced(clickedObjectId, e.shiftKey || e.metaKey || e.ctrlKey);
      }
      // Snapshot of objects that may end up dragged. We finalize the actual
      // set once the user crosses the drag threshold (in case the click was
      // additive and we need the freshest selectedIds).
      const initialIds = state.selectedIds.includes(clickedObjectId)
        ? state.selectedIds
        : [clickedObjectId];
      movedObjects = state.objects
        .filter((o) => initialIds.includes(o.id))
        .map((o) => ({ id: o.id, origX: o.x, origY: o.y, origEndX: o.endX, origEndY: o.endY }));
    }

    const move = (ev: MouseEvent) => {
      const dist = Math.hypot(ev.clientX - start.x, ev.clientY - start.y);
      if (mode === "idle") {
        if (dist < DRAG_THRESHOLD) return;
        if (intentMoveObject && movedObjects.length > 0) {
          mode = "moveObj";
          movePivot = { ...start };
        } else if (intentRubber && canvasStart) {
          mode = "rubber";
          actions.startRubberBand(canvasStart.x, canvasStart.y);
        } else if (intentTool) {
          // Drawing tool armed: never hijack the drag into a pan. For draft
          // tools the press point starts the segment so press-drag-release
          // draws it in one gesture (DraftLine previews live).
          mode = "tool";
          if (DRAFT_TOOLS.includes(state.tool) && !state.draftWire && canvasStart) {
            actions.startWire(state.tool, canvasStart.x, canvasStart.y);
            draftStartedInDrag = true;
          }
        } else {
          mode = "pan";
          panRef.current = { x: ev.clientX, y: ev.clientY };
          setIsPanning(true);
        }
        return;
      }
      if (mode === "pan") {
        if (!panRef.current) return;
        const dx = ev.clientX - panRef.current.x;
        const dy = ev.clientY - panRef.current.y;
        panRef.current = { x: ev.clientX, y: ev.clientY };
        actions.panBy(dx, dy);
      } else if (mode === "rubber" && rect) {
        const cx = (ev.clientX - rect.left - state.pan.x) / state.zoom;
        const cy = (ev.clientY - rect.top - state.pan.y) / state.zoom;
        actions.updateRubberBand(cx, cy);
      } else if (mode === "moveObj") {
        // delta in canvas space (account for zoom)
        const dx = (ev.clientX - movePivot.x) / state.zoom;
        const dy = (ev.clientY - movePivot.y) / state.zoom;
        movedObjects.forEach((m) => {
          actions.setObjectField(m.id, {
            x: m.origX + dx,
            y: m.origY + dy,
            endX: m.origEndX != null ? m.origEndX + dx : undefined,
            endY: m.origEndY != null ? m.origEndY + dy : undefined,
          });
        });
      }
    };
    const up = (ev: MouseEvent) => {
      if (mode === "rubber") {
        actions.commitRubberBand(ev.shiftKey);
      } else if (
        mode === "tool" &&
        DRAFT_TOOLS.includes(state.tool) &&
        rect &&
        (draftStartedInDrag || state.draftWire)
      ) {
        // Press-drag-release with a draft tool: complete the segment at the
        // release point and swallow the browser's trailing click so it does
        // not immediately start a new dangling draft.
        const cx = (ev.clientX - rect.left - state.pan.x) / state.zoom;
        const cy = (ev.clientY - rect.top - state.pan.y) / state.zoom;
        actions.finishWire(cx, cy);
        suppressClickRef.current = true;
      }
      panRef.current = null;
      setIsPanning(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      onContextMenu={actions.openCanvasCtx}
      style={{
        position: "absolute",
        top,
        bottom: 36,
        left,
        right,
        background: "var(--color-bg-page)",
        overflow: "hidden",
        zIndex: 10,
      }}
    >
      {/* corner cap (top-left ruler intersection) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 30,
          height: 22,
          background: "var(--color-bg-surface)",
          borderRight: "var(--border-width-1) solid var(--color-border-subtle)",
          borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
          zIndex: 11,
        }}
      />

      {/* top ruler */}
      <Ruler axis="x" zoom={state.zoom} offset={state.pan.x} />
      {/* left ruler */}
      <Ruler axis="y" zoom={state.zoom} offset={state.pan.y} />

      {/* mode segmented control — the Schematic|PCB toggle now lives in the
          top toolbar; only fall back to this centered control when the top
          toolbar is hidden, so the toggle is never duplicated. */}
      {state.viewTog["Top Toolbar"] === false && (
        <div
          style={{
            position: "absolute",
            top: 30,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            background: "var(--color-bg-surface)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-xl)",
            padding: "var(--spacing-2)",
            boxShadow: "var(--elevation-3)",
            zIndex: 12,
          }}
        >
          {modeTabs.map((mt) => (
            <div
              key={mt.label}
              className="ix-seg"
              onClick={mt.onClick}
              style={{
                padding: "var(--spacing-3) var(--spacing-10)",
                borderRadius: "var(--radius-lg)",
                fontSize: "var(--font-size-md)",
                fontWeight: 600,
                cursor: "pointer",
                background: mt.bg,
                color: mt.fg,
              }}
            >
              {mt.label}
            </div>
          ))}
        </div>
      )}

      {/* 3D axis glyph */}
      <div style={{ position: "absolute", top: 34, right: 24, color: "var(--color-text-tertiary)", width: 26, height: 26 }}>
        <Icon html={AXIS_SVG} />
      </div>

      {/* zoomable viewport */}
      <div
        ref={canvasRef}
        data-canvas-wrapper
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onClick={(e) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          const cx = (e.clientX - rect.left - state.pan.x) / state.zoom;
          const cy = (e.clientY - rect.top - state.pan.y) / state.zoom;
          if (handMode) return; // hand tool never places or selects
          const interactiveMode = state.mode === "schematic" || state.mode === "pcb" || state.mode === "2d";
          if (interactiveMode && PLACE_TOOLS.includes(state.tool)) {
            actions.placeObject(state.tool, cx, cy);
            return;
          }
          if (interactiveMode && DRAFT_TOOLS.includes(state.tool)) {
            if (!state.draftWire) {
              actions.startWire(state.tool, cx, cy);
            } else {
              actions.finishWire(cx, cy);
            }
            return;
          }
          // empty-canvas click in select mode: clear selection (unless shift/cmd)
          const target = e.target as HTMLElement;
          if (target.closest("[data-object-id]")) return;
          actions.selectObject("none");
          if (!e.shiftKey && !e.metaKey && !e.ctrlKey) actions.selectPlaced(null);
        }}
        style={{
          position: "absolute",
          top: 22,
          left: 30,
          right: 0,
          bottom: 0,
          overflow: "hidden",
          // 2D/3D editor: the Background Color property paints the whole canvas.
          background:
            state.mode === "2d"
              ? state.twoD.bgColor
              : state.mode === "3d"
              ? state.threeD.bgColor
              : undefined,
          cursor: isPanning
            ? "grabbing"
            : handMode
            ? "grab"
            : PLACE_TOOLS.includes(state.tool) || DRAFT_TOOLS.includes(state.tool)
            ? "crosshair"
            : "default",
        }}
      >
        {state.gridVisible && state.mode !== "3d" && <GridPattern />}
        {state.mode === "3d" ? (
          // Real three.js viewer — lives OUTSIDE the pan/zoom transform (its
          // OrbitControls own the camera; CSS pan/zoom must not double-apply).
          <PcbThreeView />
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transform: `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`,
              transformOrigin: "0 0",
              willChange: "transform",
            }}
          >
            {state.mode === "schematic" ? (
              <SchematicCanvas />
            ) : state.mode === "pcb" ? (
              <PcbCanvas />
            ) : state.mode === "2d" ? (
              <TwoDBoard />
            ) : (
              <div dangerouslySetInnerHTML={{ __html: buildCanvas(state.mode) }} />
            )}
            {state.mode === "schematic" && <CanvasObjects />}
            {(state.mode === "schematic" || state.mode === "pcb" || state.mode === "2d") && <PlacedObjects />}
          </div>
        )}
      </div>

      {/* schematic tool palette — vertical, docked at the left of the canvas */}
      {state.mode === "schematic" && v["Floating Tool"] !== false && (
        <SchemToolPalette leftInset={0} top={0} />
      )}

      {/* floating tools (2D editor · View ▸ Floating Tool) — Drawing / Wiring / Preview */}
      {state.mode === "2d" && v["Floating Tool"] !== false && (
        <>
          <Tool2DPanel title="Drawing Tools" initial={{ x: 70, y: 60 }} />
          <Tool2DPanel title="Drawing Tools" startCollapsed initial={{ x: 268, y: 60 }} />
          <Tool2DPanel title="Wiring Tools" initial={{ x: 120, y: 248 }} />
          <Preview2DPanel initial={{ x: 660, y: 70 }} />
        </>
      )}

      {/* floating tools (3D editor · View ▸ Floating Tool) */}
      {state.mode === "3d" && v["Floating Tool"] !== false && (
        <>
          <Tool2DPanel title="Floating Tools" initial={{ x: 70, y: 60 }} />
          <Tool2DPanel title="Floating Tools" initial={{ x: 268, y: 60 }} />
        </>
      )}

      {/* Zoom indicator */}
      <ZoomBadge zoom={state.zoom} />

      {/* Plane pill */}
      <div
        className="ix-btn"
        style={{
          position: "absolute",
          bottom: 24,
          left: 50,
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-4)",
          padding: "var(--spacing-4) var(--spacing-8)",
          background: "var(--color-bg-surface)",
          border: "var(--border-width-1-5) solid #fbd5f3",
          borderRadius: "var(--radius-3xl)",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(254,42,212,.12)",
        }}
      >
        <Icon html={PLANE_SVG} size={16} />
        <span style={{ fontSize: "var(--font-size-md)", fontWeight: 600, color: "#fe2ad4" }}>XY Plane</span>
      </div>

      {/* Continue pill — explicit destination label so the user always knows
          which step comes next (we no longer rely on a separate stepper CTA). */}
      <div
        className="ix-btn"
        onClick={() => goStep("code")}
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-4)",
          padding: "var(--spacing-4) var(--spacing-10)",
          background: "var(--color-bg-surface)",
          border: "var(--border-width-1-5) solid #fbd5f3",
          borderRadius: "var(--radius-3xl)",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(254,42,212,.12)",
        }}
      >
        <span style={{ fontSize: "var(--font-size-md)", fontWeight: 600, color: "#fe2ad4" }}>Continue to Code</span>
        <Icon html={NEXT_SVG} size={16} />
      </div>
    </div>
  );
}

// Placeholder tool glyph (gear + slider) — the Figma 2D tool panels use an
// identical stand-in icon in every cell, so we mirror that rather than inventing
// per-tool meanings.
const TOOL2D_PLACEHOLDER =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="12" r="2.6"/><path d="M8 3.5v2M8 18.5v2M11 12h9" stroke-linecap="round"/></svg>';

// Drag a floating panel by its header. Position is screen-space (the panels live
// outside the zoom transform), so the pointer delta maps 1:1.
function usePanelDrag(initial: { x: number; y: number }) {
  const [pos, setPos] = React.useState(initial);
  const onDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = pos.x;
    const oy = pos.y;
    const move = (ev: MouseEvent) =>
      setPos({ x: Math.max(0, ox + ev.clientX - sx), y: Math.max(0, oy + ev.clientY - sy) });
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };
  return { pos, onDragStart };
}

// Shared draggable title bar: the bar is the drag handle; the "—" dash is a
// collapse toggle (when onToggle is given) and stops the drag from starting.
function PanelHeader({
  title,
  open,
  onDragStart,
  onToggle,
}: {
  title: string;
  open: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onToggle?: () => void;
}) {
  return (
    <div
      onMouseDown={onDragStart}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--spacing-3) var(--spacing-5)",
        borderBottom: open ? "var(--border-width-1) solid var(--color-border-subtle)" : "none",
        cursor: "move",
        userSelect: "none",
      }}
    >
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", fontWeight: 600 }}>{title}</span>
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onToggle}
        aria-label={open ? "Collapse" : "Expand"}
        style={{ display: "inline-flex", border: "none", background: "transparent", padding: 0, cursor: "pointer", color: "var(--color-text-tertiary)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path d={open ? "M6 12h12" : "M12 6v12M6 12h12"} />
        </svg>
      </button>
    </div>
  );
}

// One floating 2D tool panel: a draggable title bar with a collapse dash and
// (when open) a 2×7 grid of placeholder tool cells.
function Tool2DPanel({
  title,
  startCollapsed = false,
  initial,
}: {
  title: string;
  startCollapsed?: boolean;
  initial: { x: number; y: number };
}) {
  const [open, setOpen] = React.useState(!startCollapsed);
  const { pos, onDragStart } = usePanelDrag(initial);
  return (
    <div
      style={{
        position: "absolute",
        top: pos.y,
        left: pos.x,
        zIndex: 13,
        width: 180,
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--elevation-4)",
      }}
    >
      <PanelHeader title={title} open={open} onDragStart={onDragStart} onToggle={() => setOpen((o) => !o)} />
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "var(--spacing-1)", padding: "var(--spacing-3)" }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="ix-tool"
              style={{
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-tertiary)",
                cursor: "pointer",
              }}
            >
              <Icon html={TOOL2D_PLACEHOLDER} size={14} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Floating "Preview" panel — draggable title bar + empty thumbnail box.
function Preview2DPanel({ initial }: { initial: { x: number; y: number } }) {
  const { pos, onDragStart } = usePanelDrag(initial);
  return (
    <div
      style={{
        position: "absolute",
        top: pos.y,
        left: pos.x,
        zIndex: 13,
        width: 196,
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--elevation-4)",
      }}
    >
      <PanelHeader title="Preview" open onDragStart={onDragStart} />
      <div style={{ padding: "var(--spacing-4)" }}>
        <div style={{ width: "100%", height: 150, background: "var(--color-bg-subtle)", borderRadius: "var(--radius-md)" }} />
      </div>
    </div>
  );
}

// Named board / pad colors → hex now live in the shared pcb-3d lib (the 3D
// tab and the Product Preview resolve the same names).

// State-driven 2D board — every control in the right Properties panel
// (board color, pad plating color, silkscreen visibility, board side, material)
// drives this render live.
function TwoDBoard() {
  const state = usePcbState();
  const d = state.twoD;
  const boardHex = BOARD_COLOR_HEX[d.boardColor] ?? "#1c4e80";
  const padHex = PAD_COLOR_HEX[d.padColor] ?? "#d9a441";
  const silk = d.silkscreen === "Visible";
  const silkColor = d.boardColor === "White" ? "#1a1a1a" : "#f4f4f5";
  const isBottom = d.side === "Bottom Side";

  const pads: Array<[number, number]> = [
    [140, 120],
    [520, 140],
    [300, 300],
    [560, 360],
  ];

  return (
    <div
      style={{
        position: "relative",
        width: 760,
        height: 520,
        margin: "160px auto",
        background: boardHex,
        border: `var(--border-width-2) solid rgba(0,0,0,.35)`,
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--elevation-3)",
        overflow: "hidden",
        // Bottom side mirrors the board horizontally.
        transform: isBottom ? "scaleX(-1)" : undefined,
      }}
    >
      {/* copper grid texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      {/* board outline (silkscreen) */}
      {silk && (
        <div style={{ position: "absolute", inset: 40, border: `var(--border-width-1-5) solid ${silkColor}`, borderRadius: "var(--radius-sm)" }} />
      )}
      {/* pads */}
      {pads.map(([x, y], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: 80,
            height: 50,
            background: "transparent",
            border: `var(--border-width-2) solid ${padHex}`,
            borderRadius: "var(--radius-xs)",
            boxShadow: `inset 0 0 0 2px ${padHex}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* corner pads */}
          {[0, 1, 2, 3].map((j) => (
            <span
              key={j}
              style={{
                position: "absolute",
                left: j % 2 ? "auto" : -5,
                right: j % 2 ? -5 : "auto",
                top: j < 2 ? -5 : "auto",
                bottom: j < 2 ? "auto" : -5,
                width: 10,
                height: 10,
                borderRadius: "var(--radius-full)",
                background: padHex,
              }}
            />
          ))}
          {silk && (
            <span style={{ fontSize: "var(--font-size-xs)", color: silkColor, fontFamily: "var(--font-family-mono), monospace" }}>
              U{i + 1}
            </span>
          )}
        </div>
      ))}
      {/* footer label — reflects material + side */}
      {silk && (
        <div
          style={{
            position: "absolute",
            left: 40,
            bottom: 14,
            fontSize: "var(--font-size-sm)",
            color: silkColor,
            fontWeight: 600,
            transform: isBottom ? "scaleX(-1)" : undefined,
          }}
        >
          Board Outline · {d.material} · 80mm × 60mm · {d.side}
        </div>
      )}
    </div>
  );
}

// The 3D tab is a real three.js viewer now — see pcb-three-view.tsx. The old
// CSS-transform ThreeDBoard mockup (fixed 420×300 slab, four hardcoded chips)
// was removed in its favor.

function Ruler({ axis, zoom, offset }: { axis: "x" | "y"; zoom: number; offset: number }) {
  // Tick spacing adapts to zoom: pick a "nice" interval in canvas units so that
  // the screen spacing stays in ~50-100px band.
  const screenSpacingTarget = 80;
  const rawUnits = screenSpacingTarget / zoom;
  const niceUnits = pickNice(rawUnits);
  const screenStep = niceUnits * zoom;
  const ticks: { pos: number; label: string }[] = [];
  // start tick so it falls on a "nice" value relative to the pan offset
  const startCanvas = Math.ceil(-offset / zoom / niceUnits) * niceUnits;
  for (let n = 0; n < 80; n++) {
    const canvasVal = startCanvas + n * niceUnits;
    const screenPos = canvasVal * zoom + offset;
    if (screenPos < -screenStep) continue;
    if (screenPos > 3000) break;
    ticks.push({ pos: screenPos, label: String(Math.round(canvasVal)) });
  }
  const horizontal = axis === "x";
  return (
    <div
      style={{
        position: "absolute",
        ...(horizontal
          ? { top: 0, left: 30, right: 0, height: 22 }
          : { top: 22, bottom: 0, left: 0, width: 30 }),
        background: "var(--color-bg-surface)",
        borderBottom: horizontal ? "var(--border-width-1) solid var(--color-border-subtle)" : undefined,
        borderRight: !horizontal ? "var(--border-width-1) solid var(--color-border-subtle)" : undefined,
        overflow: "hidden",
        fontFamily: "var(--font-family-mono), monospace",
        fontSize: 9,
        color: "var(--color-text-tertiary)",
        zIndex: 11,
      }}
    >
      {ticks.map((t, i) => (
        <React.Fragment key={i}>
          <div
            style={{
              position: "absolute",
              background: "var(--color-text-tertiary)",
              opacity: 0.65,
              ...(horizontal
                ? { left: t.pos, top: 14, width: 1, height: 8 }
                : { top: t.pos, left: 14, height: 1, width: 8 }),
            }}
          />
          <div
            style={{
              position: "absolute",
              ...(horizontal
                ? { left: t.pos + 3, top: 2 }
                : { top: t.pos + 2, left: 2, writingMode: "vertical-rl", transform: "rotate(180deg)" }),
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function pickNice(units: number): number {
  // round up to the nearest 1, 2, 5, 10, 20, 50, 100, …
  const pow = Math.pow(10, Math.floor(Math.log10(units)));
  const mantissa = units / pow;
  if (mantissa <= 1) return pow;
  if (mantissa <= 2) return 2 * pow;
  if (mantissa <= 5) return 5 * pow;
  return 10 * pow;
}

function ZoomBadge({ zoom }: { zoom: number }) {
  const actions = usePcbActions();
  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-1)",
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-full)",
        boxShadow: "var(--elevation-2)",
        padding: "var(--spacing-1) var(--spacing-2)",
        zIndex: 14,
      }}
    >
      <ZoomBtn label="−" onClick={() => actions.zoomOut()} aria="Zoom out" />
      <button
        className="ix-tool"
        onClick={() => actions.zoomReset()}
        title="Reset zoom"
        style={{
          minWidth: 56,
          padding: "var(--spacing-2) var(--spacing-4)",
          fontSize: "var(--font-size-sm)",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          color: "var(--color-text-primary)",
          background: "transparent",
          border: "none",
          borderRadius: "var(--radius-md)",
          cursor: "pointer",
        }}
      >
        {Math.round(zoom * 100)}%
      </button>
      <ZoomBtn label="+" onClick={() => actions.zoomIn()} aria="Zoom in" />
    </div>
  );
}

function ZoomBtn({ label, onClick, aria }: { label: string; onClick: () => void; aria: string }) {
  return (
    <button
      className="ix-tool"
      onClick={onClick}
      title={aria}
      aria-label={aria}
      style={{
        width: 26,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        color: "var(--color-text-primary)",
        border: "none",
        borderRadius: "var(--radius-md)",
        fontSize: 16,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

// Sample on-canvas objects (schematic): a component (U12) + a wire.
// Click selects → right panel shows object/wire properties. Double-click the
// designator → inline text editor. Mirrors the Figma double-click + connection-
// line editing flows.
function CanvasObjects() {
  const state = usePcbState();
  const actions = usePcbActions();
  const selComp = state.selected === "comp";
  const selWire = state.selected === "wire";

  return (
    <div style={{ position: "absolute", top: 150, left: 250, width: 360, height: 220 }}>
      {/* wire (elbow) */}
      <svg
        width="360"
        height="220"
        style={{ position: "absolute", inset: 0, overflow: "visible", cursor: "pointer" }}
        onClick={(e) => {
          e.stopPropagation();
          actions.selectObject("wire");
        }}
      >
        <path
          d="M0 120 H70 V60 H120"
          fill="none"
          stroke={selWire ? "var(--color-violet-600)" : "var(--color-text-secondary)"}
          strokeWidth={selWire ? 2.5 : 1.6}
        />
        {selWire && (
          <>
            <circle cx="0" cy="120" r="3.5" fill="var(--color-violet-600)" />
            <circle cx="70" cy="60" r="3.5" fill="var(--color-violet-600)" />
            <circle cx="120" cy="60" r="3.5" fill="var(--color-violet-600)" />
          </>
        )}
      </svg>

      {/* component U12 (rotation/flip/z-order driven by toolbar) */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 30,
          zIndex: state.compZ === "front" ? 2 : 0,
          transform: `rotate(${state.compRot}deg) scale(${state.compFlipH ? -1 : 1}, ${state.compFlipV ? -1 : 1})`,
          transformOrigin: "35px 32px",
          transition: "transform .2s ease",
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            actions.selectObject("comp");
          }}
          style={{
            width: 70,
            height: 64,
            background: "var(--color-bg-surface)",
            border: `${selComp ? "var(--border-width-2)" : "var(--border-width-1)"} solid ${selComp ? "var(--color-violet-600)" : "var(--color-text-primary)"}`,
            borderRadius: "var(--radius-xs)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-primary)",
            position: "relative",
            cursor: "pointer",
            boxShadow: selComp ? "0 0 0 3px rgba(124,45,185,.15)" : "none",
          }}
        >
          U12
          {/* pins (clickable → select 'pin') */}
          {[14, 28, 42, 56].map((y, i) => {
            const selPin = state.selected === "pin";
            return (
              <span
                key={i}
                title={`Pin ${i + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  actions.selectObject("pin");
                }}
                style={{
                  position: "absolute",
                  right: -28,
                  top: y - 7,
                  width: 28,
                  height: 15,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  cursor: "pointer",
                }}
              >
                <span style={{ width: 10, height: 1.5, background: selPin ? "var(--color-violet-600)" : "var(--color-text-primary)" }} />
                <span style={{ fontSize: "var(--font-size-2xs)", color: selPin ? "var(--color-violet-600)" : "var(--color-text-tertiary)" }}>{i + 1}</span>
              </span>
            );
          })}
        </div>

        {/* designator (double-click → Text modal + right-panel props, per Figma) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            actions.selectObject("comp");
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            actions.selectObject("comp");
            actions.openModal("textEdit");
          }}
          style={{
            position: "absolute",
            top: 70,
            left: -10,
            fontSize: "var(--font-size-2xs)",
            color: "var(--color-text-error)",
            whiteSpace: "nowrap",
            cursor: "text",
            fontWeight: state.textStyle.b ? 800 : 600,
            fontStyle: state.textStyle.i ? "italic" : "normal",
            textDecoration: state.textStyle.u ? "underline" : "none",
          }}
        >
          {state.editText}
        </div>
      </div>
    </div>
  );
}
