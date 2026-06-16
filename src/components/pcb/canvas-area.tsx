"use client";

// IDEEZA PCB Software — canvas area.
// Rulers, the Schematic⇄PCB(⇄2D⇄3D) mode segmented control, the mode-specific
// drawing (via buildCanvas), the draggable Floating Tools, and the Plane / Next
// pills. Right-clicking the canvas opens the context menu. Ctrl/Cmd + wheel
// zooms in/out at the cursor; middle-mouse or space-drag pans the viewport.

import * as React from "react";
import { Icon } from "@/lib/pcb/icons";
import { buildCanvas } from "@/lib/pcb/content";
import { buildModeTabs } from "@/lib/pcb/data";
import { AXIS_SVG, FLOAT_SVGS, NEXT_SVG, PLANE_SVG } from "@/lib/pcb/markup";
import { SchematicCanvas } from "@/components/pcb/schem-canvas";
import { PlacedObjects } from "@/components/pcb/placed-objects";
import { PLACE_TOOLS, DRAFT_TOOLS } from "@/lib/pcb/types";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

const DRAG_THRESHOLD = 4;

const GRID_MINOR = 20;
const GRID_MAJOR = 100;

function GridPattern() {
  // SVG-based dotted grid that tiles infinitely with two scales of dots.
  return (
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <defs>
        <pattern id="ix-grid-minor" width={GRID_MINOR} height={GRID_MINOR} patternUnits="userSpaceOnUse">
          <circle cx="0.5" cy="0.5" r="0.75" fill="var(--color-text-tertiary)" opacity="0.35" />
        </pattern>
        <pattern id="ix-grid-major" width={GRID_MAJOR} height={GRID_MAJOR} patternUnits="userSpaceOnUse">
          <circle cx="0.5" cy="0.5" r="1.2" fill="var(--color-text-secondary)" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ix-grid-minor)" />
      <rect width="100%" height="100%" fill="url(#ix-grid-major)" />
    </svg>
  );
}

export function CanvasArea() {
  const state = usePcbState();
  const actions = usePcbActions();
  const modeTabs = buildModeTabs(state, actions);
  const v = state.viewTog;
  const top = v["Top Toolbar"] !== false ? 225 : 142;
  const left = v["Left-Side panel"] !== false ? 366 : 74;
  const right = v["Right-Side Panel"] !== false ? 292 : 0;

  const canvasRef = React.useRef<HTMLDivElement>(null);
  const panRef = React.useRef<{ x: number; y: number } | null>(null);
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
    const intentMoveObject =
      isLeft && !handMode && state.tool === "select" && clickedObjectId != null && state.mode === "schematic";
    const intentRubber =
      isLeft && !handMode && state.tool === "select" && !clickedObjectId && state.mode === "schematic" && canvasStart != null;

    let mode: "idle" | "pan" | "rubber" | "moveObj" = "idle";
    let movePivot = { ...start };
    let movedObjects: { id: string; origX: number; origY: number; origEndX?: number; origEndY?: number }[] = [];

    if (intentPan) {
      e.preventDefault();
      panRef.current = { ...start };
      setIsPanning(true);
      mode = "pan";
    } else if (intentMoveObject && clickedObjectId) {
      // Select first (or add to selection if shift), then prepare to move all selected.
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

      {/* mode segmented control */}
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
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          const cx = (e.clientX - rect.left - state.pan.x) / state.zoom;
          const cy = (e.clientY - rect.top - state.pan.y) / state.zoom;
          if (handMode) return; // hand tool never places or selects
          if (state.mode === "schematic" && PLACE_TOOLS.includes(state.tool)) {
            actions.placeObject(state.tool, cx, cy);
            return;
          }
          if (state.mode === "schematic" && DRAFT_TOOLS.includes(state.tool)) {
            if (!state.draftWire) {
              actions.startWire(state.tool as "wire" | "bus", cx, cy);
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
          cursor: isPanning
            ? "grabbing"
            : handMode
            ? "grab"
            : PLACE_TOOLS.includes(state.tool) || DRAFT_TOOLS.includes(state.tool)
            ? "crosshair"
            : "default",
        }}
      >
        {state.gridVisible && <GridPattern />}
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
          ) : (
            <div dangerouslySetInnerHTML={{ __html: buildCanvas(state.mode) }} />
          )}
          {state.mode === "schematic" && <CanvasObjects />}
          {state.mode === "schematic" && <PlacedObjects />}
        </div>
      </div>

      {/* floating tools (schematic only · View ▸ Floating Tool) */}
      {state.mode === "schematic" && v["Floating Tool"] !== false && (
        <div
          style={{
            position: "absolute",
            top: state.floatPos.y,
            left: state.floatPos.x,
            display: "flex",
            gap: "var(--spacing-7)",
            zIndex: 13,
          }}
        >
          <div
            style={{
              background: "var(--color-bg-surface)",
              border: "var(--border-width-1) solid var(--color-border-default)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--elevation-4)",
              width: 166,
            }}
          >
            <div
              onMouseDown={actions.startFloatDrag}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--spacing-3) var(--spacing-5)",
                borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
                cursor: "move",
                userSelect: "none",
              }}
            >
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", fontWeight: 600 }}>Floating Tools</span>
              <svg width="14" height="14" viewBox="0 0 24 24" stroke="var(--color-text-tertiary)" strokeWidth="2.5">
                <path d="M6 12h12" />
              </svg>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "var(--spacing-1)", padding: "var(--spacing-3)" }}>
              {FLOAT_SVGS.map((svg, i) => (
                <div
                  key={i}
                  className="ix-tool"
                  style={{
                    height: 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--radius-md)",
                    color: "var(--color-text-primary)",
                    cursor: "pointer",
                  }}
                >
                  <Icon html={svg} size={16} />
                </div>
              ))}
            </div>
          </div>
        </div>
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

      {/* Next pill */}
      <div
        className="ix-btn"
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
        <span style={{ fontSize: "var(--font-size-md)", fontWeight: 600, color: "#fe2ad4" }}>Next</span>
        <Icon html={NEXT_SVG} size={16} />
      </div>
    </div>
  );
}

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
