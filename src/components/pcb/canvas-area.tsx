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
import { buildModeTabs, buildPcbViewTabs } from "@/lib/pcb/data";
import { AXIS_SVG, NEXT_SVG } from "@/lib/pcb/markup";
import { SchematicCanvas } from "@/components/pcb/schem-canvas";
import { PcbCanvas } from "@/components/pcb/pcb-canvas";
import { PcbThreeView } from "@/components/pcb/pcb-three-view";
import { PlacedObjects } from "@/components/pcb/placed-objects";
import { BOARD_COLOR_HEX, PAD_COLOR_HEX } from "@/lib/pcb/pcb-3d";
import { PLACE_TOOLS, DRAFT_TOOLS, isSelectable } from "@/lib/pcb/types";
import { pinsOf } from "@/lib/pcb/nets";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

const DRAG_THRESHOLD = 4;

const GRID_MINOR = 24;
const GRID_MAJOR = 120;

function GridPattern() {
  // Faint neutral square-line grid (two scales), tiling infinitely. Lines are
  // a low-alpha mix of the primary ink, so they stay theme-adaptive (dark on a
  // light sheet, light on a dark sheet) and read as quiet engineering
  // scaffolding — never the brand violet, which is reserved for content + UI
  // accents so it can actually stand out against the grid.
  const minor = "color-mix(in srgb, var(--color-text-primary) 6%, transparent)";
  const major = "color-mix(in srgb, var(--color-text-primary) 11%, transparent)";
  return (
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <defs>
        <pattern id="ix-grid-minor" width={GRID_MINOR} height={GRID_MINOR} patternUnits="userSpaceOnUse">
          <path d={`M ${GRID_MINOR} 0 L 0 0 0 ${GRID_MINOR}`} fill="none" stroke={minor} strokeWidth="1" />
        </pattern>
        <pattern id="ix-grid-major" width={GRID_MAJOR} height={GRID_MAJOR} patternUnits="userSpaceOnUse">
          <path d={`M ${GRID_MAJOR} 0 L 0 0 0 ${GRID_MAJOR}`} fill="none" stroke={major} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ix-grid-minor)" />
      <rect width="100%" height="100%" fill="url(#ix-grid-major)" />
    </svg>
  );
}

// Schematic left tool palette — the full tool set (as before), with the
// variant dropdowns from the design spec layered on top. Grouped rows show a
// default icon + a caret that opens the variant list; standalone rows
// (No Connect · Junction · Eraser) are a single icon button. Hand lives inside
// Select. Every option arms a real tool, places a symbol, opens the device
// picker, or erases the selection.
type SchemOpt = { label: string; tool?: string; action?: "devicePicker"; svg: string };
type SchemTool = {
  key: string;
  label: string;
  // standalone row (no dropdown): a direct tool/action + its own glyph
  tool?: string;
  action?: "devicePicker" | "erase";
  svg?: string;
  // grouped row (dropdown of variants; the primary icon = options[0])
  options?: SchemOpt[];
};
const SCHEM_TOOLS: SchemTool[] = [
  { key: "select", label: "Select", options: [
    { label: "Pointer", tool: "select", svg: '<path d="M5 3l6 15 2-6 6-2z"/>' },
    { label: "Lasso", tool: "lasso", svg: '<path d="M4 11a6 4 0 1 1 11 3M7 15c-2 1-3 3 0 4"/>' },
    { label: "Area select", tool: "areaSelect", svg: '<path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/>' },
    { label: "Hand", tool: "hand", svg: '<path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6 6 6 0 0 1-5-2.7L4.5 15a1.5 1.5 0 0 1 2.6-1.5L8 15"/>' },
  ] },
  { key: "wire", label: "Wire", options: [
    { label: "Wire", tool: "wire", svg: '<path d="M5 19L19 5"/>' },
    { label: "Bus", tool: "bus", svg: '<path d="M5 18c4 0 3-12 7-12M12 6"/><path d="M6 18h12" opacity="0"/>' },
    { label: "Bus entry", tool: "busEntry", svg: '<path d="M6 18c5 0 7-2 7-7"/>' },
  ] },
  // Shapes — the drawing primitives a schematic needs to sketch symbols,
  // outlines and annotations. Rectangle/Circle/Ellipse/Arc/Bezier place a
  // shape; Line/Polyline draw click-to-click segments. Every option arms a
  // real place/draft tool (see PLACE_TOOLS / DRAFT_TOOLS).
  { key: "shapes", label: "Shapes", options: [
    { label: "Rectangle", tool: "rectangle", svg: '<rect x="4.5" y="6.5" width="15" height="11" rx="1"/>' },
    { label: "Line", tool: "line", svg: '<path d="M5 19L19 5"/>' },
    { label: "Polyline", tool: "polyline", svg: '<path d="M4 15l5-6 4 3 7-8"/>' },
    { label: "Circle", tool: "circle", svg: '<circle cx="12" cy="12" r="7.5"/>' },
    { label: "Ellipse", tool: "ellipse", svg: '<ellipse cx="12" cy="12" rx="9" ry="6"/>' },
    { label: "Arc", tool: "arc", svg: '<path d="M4 17a8 8 0 0 1 16 0"/>' },
    { label: "Bezier curve", tool: "bezier", svg: '<path d="M4 18C4 9 20 15 20 6"/>' },
  ] },
  { key: "netLabel", label: "Net Label", options: [
    { label: "Local label", tool: "netLabel", svg: '<path d="M4 8h9l4 4-4 4H4z"/>' },
    { label: "Global label", tool: "globalLabel", svg: '<rect x="3" y="9" width="18" height="6" rx="3"/>' },
    { label: "Hierarchical", tool: "hierLabel", svg: '<path d="M8 6h8l4 6-4 6H8l-4-6z"/>' },
  ] },
  { key: "power", label: "Power", options: [
    { label: "VCC", tool: "vcc5v", svg: '<path d="M12 20V8M8 8h8M10 5h4"/>' },
    { label: "GND", tool: "pgnd", svg: '<path d="M12 4v9M6 13h12M9 17h6M11 20h2"/>' },
    { label: "+5V", tool: "vcc5v", svg: '<path d="M12 20V9M6 9h12M9 5h6"/>' },
    { label: "Earth / AGND", tool: "agnd", svg: '<path d="M12 4v9M6 13h12M9 16l3 4 3-4"/>' },
  ] },
  { key: "noConnect", label: "No Connect", tool: "noConnect", svg: '<path d="M6 6l12 12M18 6L6 18"/>' },
  { key: "junction", label: "Junction", tool: "junction", svg: '<path d="M12 4v16M4 12h16"/><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/>' },
  { key: "text", label: "Text", options: [
    { label: "Text", tool: "text", svg: '<path d="M5 6h14M12 6v13M9 19h6"/>' },
    { label: "Note", tool: "note", svg: '<path d="M5 5h14v10H9l-4 4z"/>' },
    { label: "Field", tool: "field", svg: '<path d="M9 5c-2 0-2 3-3 4 1 1 1 6 3 6M15 5c2 0 2 3 3 4-1 1-1 6-3 6"/>' },
  ] },
  { key: "eraser", label: "Eraser (delete selection)", action: "erase", svg: '<path d="M4 15l7-7 6 6-4 4H8zM14 20h6"/>' },
];

function SchemToolPalette() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  // Per-group chosen variant index — the palette shows whatever was last
  // picked from that group's dropdown (split-button behaviour), not always
  // the first option.
  const [chosen, setChosen] = React.useState<Record<string, number>>({});
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!openKey) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpenKey(null); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openKey]);

  const run = (o: { tool?: string; action?: "devicePicker" | "erase" }) => {
    if (o.action === "devicePicker") actions.openModal("devicePicker");
    else if (o.action === "erase") actions.deleteSelected();
    else if (o.tool) actions.setTool(o.tool);
    setOpenKey(null);
  };

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        left: 40,
        top: "50%",
        transform: "translateY(-50%)",
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
        // Grouped row → primary icon/action is the last-chosen variant (falls
        // back to the first); standalone row → the row itself carries the
        // tool/action + glyph.
        const chosenIdx = t.options ? Math.min(chosen[t.key] ?? 0, t.options.length - 1) : 0;
        const primary = t.options ? t.options[chosenIdx] : t;
        const primarySvg = t.options ? t.options[chosenIdx].svg : (t.svg ?? "");
        const open = openKey === t.key;
        const active = t.options
          ? t.options.some((o) => o.tool && state.tool === o.tool)
          : !!t.tool && state.tool === t.tool;
        return (
          // One uniform 38px cell per tool — no second caret button, so the
          // column reads as a clean, evenly-aligned strip of icons.
          <div key={t.key} style={{ position: "relative", width: 38, height: 38 }}>
            {/* the icon itself — a single click arms the chosen tool (fast path) */}
            <button
              type="button"
              className="ix-tool"
              title={t.label}
              aria-label={t.label}
              onClick={() => run(primary)}
              style={{
                width: 38,
                height: 38,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "var(--radius-lg)",
                border: "none", cursor: "pointer",
                background: active ? "var(--color-bg-brand-subtle)" : "transparent",
                color: active ? "var(--color-violet-600)" : "var(--color-text-primary)",
                boxShadow: open ? "inset 0 0 0 1.5px var(--color-border-brand)" : "none",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: primarySvg }} />
            </button>

            {/* corner triangle — the recognised "this tool has variants" flyout
                cue (Figma / Illustrator). Clicking it opens the list only; it
                never arms the tool, so the icon click stays the fast path. */}
            {t.options && (
              <button
                type="button"
                className="ix-tool"
                aria-label={`${t.label} variants`}
                aria-expanded={open}
                title={`${t.label} — more`}
                onClick={(e) => { e.stopPropagation(); setOpenKey((k) => (k === t.key ? null : t.key)); }}
                style={{
                  position: "absolute", right: 1, bottom: 1, width: 14, height: 14,
                  display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
                  padding: 2, border: "none", background: "transparent", cursor: "pointer",
                  borderRadius: "var(--radius-sm)",
                  color: active || open ? "var(--color-violet-600)" : "var(--color-text-tertiary)",
                }}
              >
                <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden><path d="M6 0V6H0Z" fill="currentColor" /></svg>
              </button>
            )}

            {/* variant flyout — floats to the right, aligned to this tool */}
            {t.options && open && (
              <div
                role="menu"
                style={{ position: "absolute", left: "calc(100% + 10px)", top: -2, minWidth: 178, background: "var(--color-bg-surface)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-lg)", boxShadow: "0 12px 32px -10px rgba(0,0,0,.35)", padding: "var(--spacing-2)", zIndex: 40 }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary)", padding: "var(--spacing-2) var(--spacing-3) var(--spacing-3)" }}>{t.label}</div>
                {t.options.map((o, oi) => {
                  // Mark the variant currently shown on the palette button.
                  const optChosen = oi === chosenIdx;
                  return (
                    <div
                      key={o.label}
                      className="ix-row"
                      onClick={() => { setChosen((c) => ({ ...c, [t.key]: oi })); run(o); }}
                      style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-2) var(--spacing-3)", borderRadius: "var(--radius-md)", cursor: "pointer", background: optChosen ? "var(--color-bg-brand-subtle)" : "transparent" }}
                    >
                      <span style={{ width: 28, height: 28, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)", background: optChosen ? "var(--color-violet-600)" : "var(--color-bg-subtle)", color: optChosen ? "#fff" : "var(--color-text-secondary)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: o.svg }} />
                      </span>
                      <span style={{ flex: 1, fontSize: "var(--font-size-sm)", fontWeight: optChosen ? 700 : 500, color: optChosen ? "var(--color-text-brand)" : "var(--color-text-primary)", whiteSpace: "nowrap" }}>{o.label}</span>
                      {optChosen && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-violet-600)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6" /></svg>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
  const pcbViewTabs = buildPcbViewTabs(state, actions);
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

  // Grab-move (right-click ▸ Move): the picked-up selection follows the cursor;
  // the next mousedown drops it (committing one undo step), Escape cancels.
  React.useEffect(() => {
    if (!state.moveMode) return;
    let last: { x: number; y: number } | null = null;
    const onMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = (e.clientX - rect.left - state.pan.x) / state.zoom;
      const cy = (e.clientY - rect.top - state.pan.y) / state.zoom;
      if (last) actions.translateMove(cx - last.x, cy - last.y);
      last = { x: cx, y: cy };
    };
    const onDown = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); actions.commitMove(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") actions.cancelMove(); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown, true); // capture: beat canvas handlers
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [state.moveMode, state.pan, state.zoom, actions]);

  // Snap a wire point to the nearest symbol pin / wire endpoint (so wires land
  // exactly on pins → clean connectivity), else to the grid when Snap is on.
  const snapWire = (cx: number, cy: number) => {
    if (state.mode !== "schematic") return { x: cx, y: cy };
    const TOL = 12;
    let best: { x: number; y: number } | null = null;
    let bd = TOL * TOL;
    const first = state.schematicSheets[0]?.id;
    for (const o of state.objects) {
      if (o.scope && o.scope !== "schematic") continue;
      if ((o.sheetId ?? first) !== state.activeSheetId) continue;
      const cands: { x: number; y: number }[] = pinsOf(o);
      if (o.kind === "wire" || o.kind === "bus") cands.push({ x: o.x, y: o.y }, { x: o.endX ?? o.x, y: o.endY ?? o.y });
      for (const p of cands) { const d = (p.x - cx) ** 2 + (p.y - cy) ** 2; if (d < bd) { bd = d; best = p; } }
    }
    if (best) return best;
    if (state.snapEnabled) return { x: Math.round(cx / 10) * 10, y: Math.round(cy / 10) * 10 };
    return { x: cx, y: cy };
  };

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
    if (state.moveMode) return; // grab-move owns the pointer; its window listener drops it
    if (e.button !== 0 && e.button !== 1) return;
    const isLeft = e.button === 0;
    const downAdditive = e.shiftKey || e.metaKey || e.ctrlKey;
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
      // mousedown is the single selection authority (it always fires — unlike
      // the object's click, which also double-toggled shift+click). Additive =
      // toggle in/out of the selection; a fresh non-additive press selects so
      // an immediate drag moves it. A plain click that isn't a drag collapses
      // the selection to this object (handled in `up`).
      if (downAdditive) {
        actions.selectPlaced(clickedObjectId, true);
      } else if (!state.selectedIds.includes(clickedObjectId)) {
        actions.selectPlaced(clickedObjectId, false);
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
            const sp = snapWire(canvasStart.x, canvasStart.y);
            actions.startWire(state.tool, sp.x, sp.y);
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
        // Swallow the trailing click — otherwise the canvas onClick clears the
        // just-committed marquee selection.
        suppressClickRef.current = true;
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
        const sp = snapWire(cx, cy);
        actions.finishWire(sp.x, sp.y);
        suppressClickRef.current = true;
      } else if (mode === "idle" && intentMoveObject && clickedObjectId && !downAdditive) {
        // A plain click on an object (no drag, no shift) → sole selection.
        actions.selectPlaced(clickedObjectId, false);
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
          background: "var(--color-bg-page)",
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
          {(state.mode === "pcb" || state.mode === "3d") && (
            <>
              <span style={{ width: 1, alignSelf: "stretch", margin: "var(--spacing-1) var(--spacing-2)", background: "var(--color-border-subtle)" }} />
              {pcbViewTabs.map((vt) => (
                <div
                  key={vt.label}
                  className="ix-seg"
                  onClick={vt.onClick}
                  style={{
                    padding: "var(--spacing-3) var(--spacing-8)",
                    borderRadius: "var(--radius-lg)",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: vt.bg,
                    color: vt.fg,
                  }}
                >
                  {vt.label}
                </div>
              ))}
            </>
          )}
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
            const sp = snapWire(cx, cy);
            if (!state.draftWire) {
              actions.startWire(state.tool, sp.x, sp.y);
            } else {
              actions.finishWire(sp.x, sp.y);
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
          cursor: state.moveMode
            ? "grabbing"
            : isPanning
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
              // Flip Board: mirror the PCB content horizontally about the board
              // centre so the operator sees the bottom side (text reads mirrored,
              // as it should when viewed from below).
              transform:
                `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})` +
                (state.mode === "pcb" && state.boardFlipped
                  ? ` translate(${2 * (60 + state.pcbBoard.width / 2)}px, 0) scaleX(-1)`
                  : ""),
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
            {(state.mode === "schematic" || state.mode === "pcb" || state.mode === "2d") && <PlacedObjects />}
          </div>
        )}
      </div>

      {/* schematic tool palette — vertical, docked at the left of the canvas */}
      {state.mode === "schematic" && v["Floating Tool"] !== false && (
        <SchemToolPalette />
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
          background: "var(--color-violet-600)",
          border: "none",
          borderRadius: "var(--radius-3xl)",
          cursor: "pointer",
          boxShadow: "0 6px 16px color-mix(in srgb, var(--color-violet-600) 30%, transparent)",
        }}
      >
        <span style={{ fontSize: "var(--font-size-md)", fontWeight: 600, color: "var(--color-text-on-brand)" }}>Continue to Code</span>
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
        background: "var(--color-bg-page)",
        borderBottom: horizontal ? "var(--border-width-1) solid var(--color-border-subtle)" : undefined,
        borderRight: !horizontal ? "var(--border-width-1) solid var(--color-border-subtle)" : undefined,
        overflow: "hidden",
        fontFamily: "var(--font-family-mono), monospace",
        fontSize: 9,
        color: "color-mix(in srgb, var(--color-text-tertiary) 55%, transparent)",
        zIndex: 11,
      }}
    >
      {ticks.map((t, i) => (
        <React.Fragment key={i}>
          <div
            style={{
              position: "absolute",
              background: "var(--color-text-tertiary)",
              opacity: 0.3,
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

