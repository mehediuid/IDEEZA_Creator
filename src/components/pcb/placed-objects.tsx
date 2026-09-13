"use client";

// IDEEZA PCB Software — placed canvas objects.
// Renders every object the user has placed via a toolbar tool. Each `kind`
// gets its own SVG glyph at the stored canvas coordinates; rotation is
// applied via CSS transform. Multi-select draws a violet halo around every
// member, plus the rubber-band rectangle when active.

import * as React from "react";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import type { CanvasObject } from "@/lib/pcb/types";
import { isSelectable, PLACE_TOOLS, isDraftTool, isPolyTool } from "@/lib/pcb/types";
import { planTrackPath } from "@/lib/pcb/route-path";


// #130 — standard colours for the drawing / documentation kinds (tokens, so
// both themes are covered and the Layer Manager can still override per layer).
// UIUX-17 — one standard colour per drawing primitive on the *sheet*: a plain
// rule, a closed shape, a curve, a note. Polyline reads as a line, bezier as a
// curve, and rectangle/circle/ellipse/polygon as shapes, so six primitives take
// four colours rather than six unrelated ones.
const SCHEM_DRAW_COLOR: Record<string, string> = {
  line: "var(--color-schem-draw-line)",
  polyline: "var(--color-schem-draw-line)",
  rectangle: "var(--color-schem-draw-shape)",
  circle: "var(--color-schem-draw-shape)",
  ellipse: "var(--color-schem-draw-shape)",
  polygon: "var(--color-schem-draw-shape)",
  arc: "var(--color-schem-draw-arc)",
  bezier: "var(--color-schem-draw-arc)",
  text: "var(--color-schem-draw-text)",
  note: "var(--color-schem-draw-text)",
  table: "var(--color-schem-draw-text)",
};

const DRAW_COLOR: Record<string, string> = {
  line: "var(--color-draw-line)",
  polyline: "var(--color-draw-line)",
  rectangle: "var(--color-draw-shape)",
  circle: "var(--color-draw-shape)",
  ellipse: "var(--color-draw-shape)",
  arc: "var(--color-draw-arc)",
  bezier: "var(--color-draw-arc)",
  dimension: "var(--color-draw-dimension)",
  text: "var(--color-draw-text)",
  note: "var(--color-draw-text)",
  table: "var(--color-draw-text)",
  maskRegion: "var(--color-draw-keepout)",
  componentMask: "var(--color-draw-keepout)",
  prohibitedRegion: "var(--color-draw-keepout)",
};

// Kinds that can be drawn as a real rectangle / circle / polygon rather than
// stamped at a fixed size: the board's own edge plus every board area
// (UIUX-86/87/92/97).
const DRAWN_AREA_KINDS = new Set([
  "boardOutline", "polygon", "fillRegion", "slot", "prohibitedRegion", "constraintRegion", "cutout",
]);
const AREA_LABEL: Record<string, string> = {
  polygon: "Copper Area", fillRegion: "Fill Area", slot: "Slot Region",
  prohibitedRegion: "Prohibited Region", constraintRegion: "Constraint Region", cutout: "Cutout",
};
const AREA_EDGE: Record<string, string> = {
  boardOutline: "var(--color-pcb-outline)",
  polygon: "var(--color-pcb-copper-region, var(--color-pcb-top-copper))",
  fillRegion: "var(--color-pcb-copper-region, var(--color-pcb-top-copper))",
  slot: "var(--color-pcb-outline)",
  cutout: "var(--color-pcb-outline)",
  prohibitedRegion: "var(--color-draw-keepout)",
  constraintRegion: "var(--color-draw-keepout)",
};

// The symbol geometry lives in lib/pcb/glyphs.tsx so non-editor surfaces can
// draw a real symbol without importing this module's store dependencies.
import { GLYPHS, supplyGlyph } from "@/lib/pcb/glyphs";
export { GLYPHS, glyphFor } from "@/lib/pcb/glyphs";

const WIRE_KINDS = new Set(["wire", "bus", "track", "dimension", "diffPair", "lengthTune", "polyline", "line", "ratsnest"]);

export function PlacedObjects() {
  // With a place/draft tool armed the canvas owns the click, so objects must
  // not swallow it — otherwise a net label can't be dropped on a wire or part.
  const state = usePcbState();
  const actions = usePcbActions();
  // A drawing tool owns the click, so placed objects must not swallow it —
  // area tools (area:<kind>:<shape>) count too, or a vertex dropped over an
  // existing region would be eaten by that region.
  const toolArmed = PLACE_TOOLS.includes(state.tool) || isDraftTool(state.tool) || isPolyTool(state.tool);
  // One state vocabulary, from tokens, for every kind (see tokens.css
  // "Canvas interaction states") — the colours used to be hardcoded rgba(), so
  // they could not differ per theme and drifted between object types.
  const SELECTED = "var(--color-canvas-select)";
  const HOVERED = "var(--color-canvas-hover)";
  const NORMAL = "var(--color-text-primary)";
  const selectedSet = React.useMemo(() => new Set(state.selectedIds), [state.selectedIds]);

  // Objects carry an optional editing scope. Schematic-scoped objects render
  // only in Schematic mode; everything else (pcb / unscoped) in PCB & 2D.
  const modeScope = state.mode === "schematic" ? "schematic" : "pcb";
  // Multi-sheet: in schematic mode only the active sheet's objects render
  // (undefined sheetId belongs to the first sheet, for back-compat).
  const firstSheetId = state.schematicSheets[0]?.id;
  const inScope = (o: CanvasObject) => {
    if (o.scope && o.scope !== modeScope) return false;
    // #110 — the toolbar's Ratsnest toggle really hides the airwires.
    if (o.kind === "ratsnest" && state.showRatsnest === false) return false;
    if (state.mode === "schematic" && (o.sheetId ?? firstSheetId) !== state.activeSheetId) return false;
    return true;
  };
  // Net highlight — objects on the highlighted net glow amber over everything.
  // Schematic nets are computed live (no stored `net`), so members come from the
  // id list the store resolved when the net was highlighted; PCB uses `o.net`.
  const HIGHLIGHT = "var(--color-canvas-highlight)";
  // Hover — "this is the object your click would take". Only while a selection
  // tool is active: with a place/draft tool armed the click belongs to the tool,
  // so highlighting what is underneath would be a lie.
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const probe = state.probe;
  const hoverOn = !toolArmed && !state.moveMode;
  const hoverProps = (id: string) =>
    hoverOn
      ? {
          onMouseEnter: () => setHoverId(id),
          onMouseLeave: () => setHoverId((h) => (h === id ? null : h)),
        }
      : {};
  const isHovered = (id: string) => hoverOn && hoverId === id;
  const hotSet = React.useMemo(() => new Set(state.highlightedMembers), [state.highlightedMembers]);
  const isHot = (o: CanvasObject) => hotSet.has(o.id) || (!!state.highlightedNet && o.net === state.highlightedNet);

  // PCB mode: look up layer color + visibility per object. Schematic mode
  // ignores `obj.layer` entirely.
  // #140 — draw in stack order (bottom copper first, documentation last) so a
  // bottom track can't sit on top of a top track, and the 2D view matches the
  // 3D stack. Objects with no layer keep their document order at the end.
  const layerOrder = React.useMemo(() => {
    const ids = (state.pcbLayers ?? []).map((l) => l.id);
    const rank = new Map<string, number>();
    const order = ["bottom", "bottomSilk", "bottomPaste", "bottomMask", "inner2", "inner1", "top", "topMask", "topPaste", "topSilk", "outline", "drill", "multi", "document"];
    order.forEach((idv, i) => rank.set(idv, i));
    ids.forEach((idv) => { if (!rank.has(idv)) rank.set(idv, order.length); });
    return rank;
  }, [state.pcbLayers]);
  const ordered = React.useMemo(() => {
    if (state.mode === "schematic") return state.objects;
    return [...state.objects].sort(
      (a, b) => (layerOrder.get(a.layer ?? "") ?? 99) - (layerOrder.get(b.layer ?? "") ?? 99),
    );
  }, [state.objects, layerOrder, state.mode]);

  // #140 — one predicate for "not the layer you're working on", used by every
  // renderer below (glyphs, wires/tracks, cutouts, outlines, poured copper).
  // It used to reach only PlacedGlyph, so the toast said "Other layers dimmed"
  // while every track stayed at full strength.
  const isDim = React.useCallback(
    (o: CanvasObject) =>
      state.focusActiveLayer && state.mode !== "schematic" && !!o.layer && o.layer !== state.activePcbLayer,
    [state.focusActiveLayer, state.mode, state.activePcbLayer],
  );
  const layerMap = React.useMemo(() => {
    const m = new Map<string, { color: string; visible: boolean; transparency: number }>();
    state.pcbLayers.forEach((l) => m.set(l.id, { color: l.color, visible: l.visible, transparency: l.transparency }));
    return m;
  }, [state.pcbLayers]);
  // Net → color map (Phase 2). Net color, when assigned, overrides layer color.
  const netMap = React.useMemo(() => {
    const m = new Map<string, string>();
    state.pcbNets.forEach((n) => m.set(n.name, n.color));
    return m;
  }, [state.pcbNets]);

  const isVisible = (obj: { layer?: string }) => {
    if (state.mode !== "pcb" || !obj.layer) return true;
    return layerMap.get(obj.layer)?.visible ?? true;
  };
  const colorFor = (obj: { kind?: string; layer?: string; color?: string; net?: string }) => {
    if (obj.color) return obj.color;
    if (state.mode === "pcb" && obj.net) {
      const nc = netMap.get(obj.net);
      if (nc) return nc;
    }
    if (state.mode === "pcb" && obj.layer) {
      const l = layerMap.get(obj.layer);
      if (l) return l.color;
    }
    // #130 — documentation strokes (line · polyline · dimension) take their
    // standard colour rather than plain ink, so they read as one family.
    // UIUX-17 — the sheet has its own set: the board's are picked to sit on
    // dark green substrate, and a gray-300 line all but vanished on a white
    // sheet. Same meanings, values chosen for the sheet's own ink.
    if (state.mode === "schematic" && obj.kind && SCHEM_DRAW_COLOR[obj.kind]) return SCHEM_DRAW_COLOR[obj.kind];
    if (obj.kind && DRAW_COLOR[obj.kind]) return DRAW_COLOR[obj.kind];
    return NORMAL;
  };

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const W = 5000;
  const OX = 2500;
  // UIUX-89 — Outline view: every filled thing is drawn as its own outline
  // instead of solid ink, so overlapping copper can be read apart. Filled
  // glyph geometry is handled by one CSS rule (the glyphs paint in
  // `currentColor`, so the outline keeps the object's real colour); tracks and
  // buses carry a width, so they get their true capsule outline below.
  const outline = state.renderStyle === "outline" && state.mode !== "schematic";

  return (
    <div className={outline ? "ix-render-outline" : undefined} style={{ display: "contents" }}>
      {/* Wires + buses + draft + rubber-band rect — single SVG overlay.
          zIndex lifts the wires above the sheet surface (which sits in its own
          positioned subtree); glyph divs below use a higher zIndex so component
          bodies still sit on top of the wire ends. */}
      <svg
        style={{
          position: "absolute",
          left: -OX,
          top: -OX,
          width: W,
          height: W,
          // reset.css applies `svg { max-width: 100% }`; the canvas layer is
          // auto-width (~0), which would collapse this overlay to zero width and
          // stop the wires painting. Opt out so the full-size overlay renders.
          maxWidth: "none",
          pointerEvents: "none",
          overflow: "visible",
          zIndex: 1,
        }}
      >
        <g transform={`translate(${OX} ${OX})`}>
          {state.objects.filter((o) => WIRE_KINDS.has(o.kind) && isVisible(o) && inScope(o)).map((o) => {
            const sel = selectedSet.has(o.id);
            // Ratsnest = unrouted airwire: thin, dashed, muted, non-interactive.
            if (o.kind === "ratsnest") {
              return (
                <line
                  key={o.id}
                  data-object-id={o.id}
                  x1={o.x}
                  y1={o.y}
                  x2={o.endX ?? o.x}
                  y2={o.endY ?? o.y}
                  stroke="var(--color-text-tertiary)"
                  strokeWidth={0.9}
                  strokeDasharray="2 3"
                  strokeLinecap="round"
                  opacity={0.75}
                  pointerEvents="none"
                />
              );
            }
            const isBus = o.kind === "bus";
            const isTrack = o.kind === "track";
            const hot = isHot(o);
            const hov = isHovered(o.id) && !sel;
            const stroke = sel ? SELECTED : hov ? HOVERED : hot ? HIGHLIGHT : colorFor(o);
            const dim = isDim(o) && !sel && !hot;
            // Drawing kinds carry their own stroke width (the Properties panel's
            // Line Width and the DXF importer's stroke width both write o.width —
            // it used to be ignored here, so both fields were dead writes).
            const drawW = (o.kind === "line" || o.kind === "polyline") && o.width && o.width > 0 ? o.width : null;
            const w = (isTrack ? (sel ? 6 : 5) : isBus ? (sel ? 4 : 3) : drawW ? (sel ? drawW + 0.9 : drawW) : sel ? 2.6 : 1.7) + (hot ? 1.2 : 0);
            const x2 = o.endX ?? o.x;
            const y2 = o.endY ?? o.y;
            // UIUX-89 — in Outline view a run that carries a width is drawn as
            // the shape it really occupies: the two edges of the run plus its
            // round caps, rather than a solid bar or a thinner solid bar.
            if (outline && (isTrack || isBus)) {
              const dx = x2 - o.x, dy = y2 - o.y;
              const len = Math.hypot(dx, dy);
              const r = w / 2;
              const ux = len > 1e-6 ? dx / len : 1, uy = len > 1e-6 ? dy / len : 0;
              const nx = -uy * r, ny = ux * r;
              const d = len > 1e-6
                ? `M${o.x + nx},${o.y + ny} L${x2 + nx},${y2 + ny} A${r},${r} 0 0 1 ${x2 - nx},${y2 - ny} L${o.x - nx},${o.y - ny} A${r},${r} 0 0 1 ${o.x + nx},${o.y + ny} Z`
                : `M${o.x - r},${o.y} a${r},${r} 0 1 0 ${r * 2},0 a${r},${r} 0 1 0 ${-r * 2},0`;
              return (
                <React.Fragment key={o.id}>
                  <line x1={o.x} y1={o.y} x2={x2} y2={y2} stroke="transparent" strokeWidth={Math.max(9, w)} strokeLinecap="round" pointerEvents="stroke" data-object-id={o.id} style={{ cursor: "pointer" }} />
                  <path d={d} fill="none" stroke={stroke} strokeWidth={1} opacity={dim ? 0.3 : 1} pointerEvents="none" />
                </React.Fragment>
              );
            }
            return (
              <React.Fragment key={o.id}>
                {/* Hit line — a 1.7px stroke is a pixel-hunt to point at, so the
                    pickable band is wider than the ink. It carries the object id
                    (the canvas mousedown reads it) and the hover handlers; the
                    visible line above it takes no pointer events. */}
                <line
                  data-object-id={o.id}
                  x1={o.x}
                  y1={o.y}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth={Math.max(9, w + 6)}
                  strokeLinecap="round"
                  style={{ pointerEvents: "stroke", cursor: "move" }}
                  {...hoverProps(o.id)}
                  onClick={toolArmed ? undefined : (e) => e.stopPropagation() /* selection handled by canvas mousedown */}
                />
                <line
                  x1={o.x}
                  y1={o.y}
                  x2={x2}
                  y2={y2}
                  stroke={stroke}
                  strokeWidth={w}
                  strokeLinecap="round"
                  pointerEvents="none"
                  style={{
                    // A CSS variable only resolves in `style`; as the SVG
                    // `opacity` attribute it is simply ignored, which is why
                    // dimming a track silently did nothing.
                    opacity: dim ? "var(--pcb-dim-opacity, 0.3)" : undefined,
                    filter: hot
                      ? "drop-shadow(0 0 3px var(--color-canvas-highlight))"
                      : sel
                      ? "drop-shadow(0 0 3px var(--color-canvas-select))"
                      : undefined,
                  }}
                />
              </React.Fragment>
            );
          })}
          {state.draftWire && <DraftLine />}
          {state.draftPoly && state.draftPoly.points.length > 0 && (
            <polyline
              points={state.draftPoly.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="var(--color-pcb-outline)"
              strokeWidth={1.6}
              strokeDasharray="5 3"
              pointerEvents="none"
            />
          )}
          {state.rubberBand && (
            <rect
              x={Math.min(state.rubberBand.x1, state.rubberBand.x2)}
              y={Math.min(state.rubberBand.y1, state.rubberBand.y2)}
              width={Math.abs(state.rubberBand.x2 - state.rubberBand.x1)}
              height={Math.abs(state.rubberBand.y2 - state.rubberBand.y1)}
              fill="var(--color-canvas-marquee-fill)"
              stroke="var(--color-canvas-select)"
              strokeWidth={1}
              strokeDasharray="3 3"
              pointerEvents="none"
            />
          )}
          {state.lasso && state.lasso.length > 1 && (
            <polygon
              points={state.lasso.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="var(--color-canvas-marquee-fill)"
              stroke="var(--color-canvas-select)"
              strokeWidth={1}
              strokeDasharray="4 3"
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

      {/* cross-probe arrival ring — keyed by nonce so a repeat probe restarts it */}
      {probe && (() => {
        const t = state.objects.find((o) => o.id === probe.id);
        if (!t || !inScope(t)) return null;
        const cx = WIRE_KINDS.has(t.kind) ? ((t.x + (t.endX ?? t.x)) / 2) : t.x;
        const cy = WIRE_KINDS.has(t.kind) ? ((t.y + (t.endY ?? t.y)) / 2) : t.y;
        return <div key={probe.nonce} className="ix-probe" style={{ left: cx - 34, top: cy - 34, width: 68, height: 68, zIndex: 7 }} />;
      })()}

      {ordered.filter((o) => !WIRE_KINDS.has(o.kind) && isVisible(o) && inScope(o)).map((o) =>
        (o.props as Record<string, unknown> | undefined)?.shape && DRAWN_AREA_KINDS.has(o.kind) ? (
          <BoardOutlineShape
            key={o.id}
            obj={o}
            dimmed={isDim(o)}
            selected={selectedSet.has(o.id)}
            toolArmed={toolArmed}
            hovered={isHovered(o.id) && !selectedSet.has(o.id)}
            hoverProps={hoverProps(o.id)}
          />
        ) : o.kind === "table" ? (
          <TableObject
            key={o.id}
            obj={o}
            selected={selectedSet.has(o.id)}
            toolArmed={toolArmed}
            hovered={isHovered(o.id) && !selectedSet.has(o.id)}
            hoverProps={hoverProps(o.id)}
            color={(state.mode === "schematic" ? SCHEM_DRAW_COLOR.table : DRAW_COLOR.table) as string}
          />
        ) : o.kind === "image" && (o.props as Record<string, unknown> | undefined)?.src ? (
          <ImageObject
            key={o.id}
            obj={o}
            selected={selectedSet.has(o.id)}
            toolArmed={toolArmed}
            hovered={isHovered(o.id) && !selectedSet.has(o.id)}
            hoverProps={hoverProps(o.id)}
          />
        ) : o.kind === "cutout" ? (
          <CutoutArea
            key={o.id}
            obj={o}
            dimmed={isDim(o)}
            selected={selectedSet.has(o.id)}
            toolArmed={toolArmed}
            hovered={isHovered(o.id) && !selectedSet.has(o.id)}
            hoverProps={hoverProps(o.id)}
          />
        ) : o.points && o.points.length ? (
          <CombineShape
            key={o.id}
            obj={o}
            dimmed={isDim(o)}
            selected={selectedSet.has(o.id)}
            highlighted={isHot(o)}
            toolArmed={toolArmed}
            hovered={isHovered(o.id) && !selectedSet.has(o.id)}
            hoverProps={hoverProps(o.id)}
          />
        ) : (
        <PlacedGlyph
          key={o.id}
          obj={o}
          dimmed={isDim(o)}
          selected={selectedSet.has(o.id)}
          highlighted={isHot(o)}
          editing={editingId === o.id}
          layerColor={
            state.mode === "pcb"
              ? (o.net ? netMap.get(o.net) : undefined) ?? (o.layer ? layerMap.get(o.layer)?.color : undefined)
              : undefined
          }
          standardColor={
            (state.mode === "schematic" ? SCHEM_DRAW_COLOR[o.kind] : undefined) ?? DRAW_COLOR[o.kind]
          }
          designatorActive={selectedSet.has(o.id) && state.selSub === "designator"}
          toolArmed={toolArmed}
          hovered={isHovered(o.id) && !selectedSet.has(o.id)}
          hoverProps={hoverProps(o.id)}
          onSelect={(additive) => {
            if (!isSelectable(o.kind, state.boardSettings ?? {}, state.mode)) return;
            actions.selectPlaced(o.id, additive);
          }}
          onSelectDesignator={() => actions.selectDesignator(o.id, "designator")}
          onEditStart={() => setEditingId(o.id)}
          onEditEnd={() => setEditingId(null)}
          onTextChange={(t) => actions.setObjectText(o.id, t)}
        />
        ),
      )}
    </div>
  );
}

// A placed table — a real grid, not a picture of one. Dimensions come from the
// Table dialog (props.rows/cols); a table with content (props.cells, e.g. the
// BOM table) draws its text in the draw-text colour. Cell metrics scale from
// the object's own width/height so Properties can resize it like any object.
function TableObject({
  obj, selected, toolArmed, hovered, hoverProps, color,
}: {
  obj: CanvasObject;
  selected: boolean;
  toolArmed?: boolean;
  hovered?: boolean;
  hoverProps?: { onMouseEnter?: () => void; onMouseLeave?: () => void };
  color: string;
}) {
  const p = (obj.props ?? {}) as Record<string, unknown>;
  const cells = Array.isArray(p.cells) ? (p.cells as string[][]) : null;
  const rows = Math.max(1, Math.min(60, cells ? cells.length : Number(p.rows) || 4));
  const cols = Math.max(1, Math.min(24, cells ? Math.max(...cells.map((r) => r.length), 1) : Number(p.cols) || 3));
  const w = Math.max(24, obj.width ?? cols * 64);
  const h = Math.max(16, obj.height ?? rows * 18);
  const cw = w / cols;
  const rh = h / rows;
  const stroke = selected
    ? "var(--color-canvas-select)"
    : hovered
    ? "var(--color-canvas-hover)"
    : color;
  const fontSize = Math.max(6, Math.min(11, rh - 7));
  return (
    <svg
      data-object-id={obj.id}
      onClick={toolArmed ? undefined : (e) => e.stopPropagation()}
      {...hoverProps}
      width={w + 2}
      height={h + 2}
      style={{
        position: "absolute",
        left: obj.x - w / 2,
        top: obj.y - h / 2,
        overflow: "visible",
        transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
        zIndex: 3,
        cursor: toolArmed ? "inherit" : "pointer",
      }}
    >
      <title>{`${String(p.name || "Table")} · ${rows} × ${cols}`}</title>
      <g stroke={stroke} strokeWidth={hovered || selected ? 1.8 : 1.2} fill="none" strokeDasharray={selected ? "4 3" : undefined}>
        <rect x={1} y={1} width={w} height={h} />
        {Array.from({ length: rows - 1 }, (_, i) => (
          <line key={`r${i}`} x1={1} y1={1 + (i + 1) * rh} x2={1 + w} y2={1 + (i + 1) * rh} />
        ))}
        {Array.from({ length: cols - 1 }, (_, i) => (
          <line key={`c${i}`} x1={1 + (i + 1) * cw} y1={1} x2={1 + (i + 1) * cw} y2={1 + h} />
        ))}
      </g>
      {cells && cells.slice(0, rows).map((row, ri) =>
        row.slice(0, cols).map((cell, ci) => (
          <text
            key={`${ri}.${ci}`}
            x={1 + ci * cw + 4}
            y={1 + ri * rh + rh / 2}
            dominantBaseline="central"
            fontSize={fontSize}
            fontWeight={ri === 0 ? 700 : 500}
            fill={color}
            style={{ userSelect: "none" }}
          >
            {String(cell).slice(0, Math.max(2, Math.floor(cw / (fontSize * 0.6))))}
          </text>
        )),
      )}
    </svg>
  );
}

// An imported image — the real bitmap, not the picture-frame placeholder the
// `image` glyph used to draw. Size comes from the object (set at import, and
// editable in Properties like any other width/height).
function ImageObject({
  obj, selected, toolArmed, hovered, hoverProps,
}: {
  obj: CanvasObject;
  selected: boolean;
  toolArmed?: boolean;
  hovered?: boolean;
  hoverProps?: { onMouseEnter?: () => void; onMouseLeave?: () => void };
}) {
  const p = (obj.props ?? {}) as Record<string, unknown>;
  const w = Math.max(4, obj.width ?? 120);
  const h = Math.max(4, obj.height ?? 90);
  const edge = selected
    ? "var(--color-canvas-select)"
    : hovered
    ? "var(--color-canvas-hover)"
    : "transparent";
  return (
    <div
      data-object-id={obj.id}
      onClick={toolArmed ? undefined : (e) => e.stopPropagation()}
      {...hoverProps}
      title={`${String(p.name || "Image")} · ${Math.round(w)} × ${Math.round(h)} px`}
      style={{
        position: "absolute",
        left: obj.x - w / 2,
        top: obj.y - h / 2,
        width: w,
        height: h,
        boxSizing: "border-box",
        // UIUX-25/26 — a bitmap has no strokes to embolden, so its own frame is
        // what hover brightens (solid accent); selection keeps the dashed
        // marker, so the two never read the same.
        border: selected
          ? `1.4px dashed var(--color-canvas-select)`
          : hovered
          ? `1.4px solid var(--color-canvas-hover)`
          : `1.4px solid ${edge}`,
        transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
        zIndex: 3,
        cursor: toolArmed ? "inherit" : "pointer",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI the user just imported; next/image can't optimise it */}
      <img
        src={String(p.src)}
        alt={String(p.name || "Imported image")}
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none", display: "block" }}
      />
    </div>
  );
}

// #122 — the board's edge in its real shape. Rect and circle carry their size
// in width/height (so Properties can edit them); the polygon carries its ring.
function BoardOutlineShape({
  obj, selected, toolArmed, hovered, hoverProps, dimmed,
}: {
  obj: CanvasObject;
  selected: boolean;
  dimmed?: boolean;
  toolArmed?: boolean;
  hovered?: boolean;
  hoverProps?: { onMouseEnter?: () => void; onMouseLeave?: () => void };
}) {
  const p = (obj.props ?? {}) as Record<string, unknown>;
  const shape = String(p.shape ?? "rect");
  const own = AREA_EDGE[obj.kind] ?? "var(--color-pcb-outline)";
  const edge = selected ? "var(--color-canvas-select)" : hovered ? "var(--color-canvas-hover)" : own;
  // Copper areas read as copper (a translucent fill); the rest are outlines.
  const fill = obj.kind === "polygon" || obj.kind === "fillRegion"
    ? `color-mix(in srgb, ${own} 22%, transparent)`
    : "none";
  const ring = obj.points?.[0] ?? [];
  const w = Math.max(2, obj.width ?? 0), h = Math.max(2, obj.height ?? 0);
  const box = shape === "polygon"
    ? (() => {
        const xs = ring.map((q) => q.x), ys = ring.map((q) => q.y);
        return { left: obj.x + Math.min(...xs, 0), top: obj.y + Math.min(...ys, 0), w: Math.max(...xs, 0) - Math.min(...xs, 0), h: Math.max(...ys, 0) - Math.min(...ys, 0) };
      })()
    : shape === "circle"
    ? { left: obj.x - w / 2, top: obj.y - w / 2, w, h: w }
    : { left: obj.x, top: obj.y, w, h };
  return (
    <div
      data-object-id={obj.id}
      onClick={toolArmed ? undefined : (e) => e.stopPropagation()}
      {...hoverProps}
      title={`${obj.kind === "boardOutline" ? "Board outline" : (AREA_LABEL[obj.kind] ?? obj.kind)} · ${shape}`}
      style={{ position: "absolute", left: box.left, top: box.top, width: Math.max(2, box.w), height: Math.max(2, box.h), zIndex: 2, opacity: dimmed ? "var(--pcb-dim-opacity, 0.3)" : undefined, cursor: toolArmed ? "inherit" : "pointer" }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(2, box.w)} ${Math.max(2, box.h)}`} style={{ display: "block", overflow: "visible" }}>
        {shape === "circle" ? (
          <circle cx={box.w / 2} cy={box.h / 2} r={Math.max(1, box.w / 2 - 1)} fill={fill} stroke={edge} strokeWidth={1.6} strokeDasharray={selected ? "5 3" : undefined} />
        ) : shape === "polygon" ? (
          <polygon
            points={ring.map((q) => `${q.x - Math.min(...ring.map((r) => r.x), 0)},${q.y - Math.min(...ring.map((r) => r.y), 0)}`).join(" ")}
            fill={fill} stroke={edge} strokeWidth={1.6} strokeDasharray={selected ? "5 3" : undefined}
          />
        ) : (
          <rect x={0.8} y={0.8} width={Math.max(1, box.w - 1.6)} height={Math.max(1, box.h - 1.6)} fill={fill} stroke={edge} strokeWidth={1.6} strokeDasharray={selected ? "5 3" : undefined} />
        )}
      </svg>
    </div>
  );
}

// A board cutout — the area is gone from the board, so it is drawn as removed
// material (hatched, on the Board Outline colour) rather than as an object
// sitting on top. Corner-normalised at commit, so w/h are always positive.
function CutoutArea({
  obj, selected, toolArmed, hovered, hoverProps, dimmed,
}: {
  obj: CanvasObject;
  selected: boolean;
  dimmed?: boolean;
  toolArmed?: boolean;
  hovered?: boolean;
  hoverProps?: { onMouseEnter?: () => void; onMouseLeave?: () => void };
}) {
  const w = Math.max(1, obj.width ?? 0);
  const h = Math.max(1, obj.height ?? 0);
  const edge = selected
    ? "var(--color-canvas-select)"
    : hovered
    ? "var(--color-canvas-hover)"
    : "var(--color-pcb-outline)";
  return (
    <div
      data-object-id={obj.id}
      onClick={toolArmed ? undefined : (e) => e.stopPropagation()}
      {...hoverProps}
      title={`Cutout · ${Math.round(w)} × ${Math.round(h)} px`}
      style={{
        position: "absolute",
        left: obj.x,
        top: obj.y,
        width: w,
        height: h,
        boxSizing: "border-box",
        opacity: dimmed ? "var(--pcb-dim-opacity, 0.3)" : undefined,
        border: `var(--border-width-1-5, 1.5px) dashed ${edge}`,
        borderRadius: 2,
        // Hatch = removed material; the canvas colour shows through between
        // the strokes, which is exactly what a hole looks like from above.
        background: `repeating-linear-gradient(45deg, color-mix(in srgb, var(--color-pcb-outline) 26%, transparent) 0 2px, transparent 2px 7px)`,
        cursor: toolArmed ? "inherit" : "pointer",
        zIndex: 3,
      }}
    />
  );
}

// A boolean/Combine result — a real filled polygon (rings in LOCAL coords,
// evenodd fill so holes show). Positioned like a glyph at its centroid (x,y).
function CombineShape({ obj, selected, highlighted, toolArmed, hovered, hoverProps, dimmed }: { obj: CanvasObject; selected: boolean; highlighted?: boolean; toolArmed?: boolean; hovered?: boolean; dimmed?: boolean; hoverProps?: { onMouseEnter?: () => void; onMouseLeave?: () => void } }) {
  const rings = obj.points ?? [];
  const all = rings.flat();
  if (!all.length) return null;
  const minX = Math.min(...all.map((p) => p.x)), maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y)), maxY = Math.max(...all.map((p) => p.y));
  const w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
  const d = rings
    .map((r) => (r.length ? `M ${r[0].x} ${r[0].y} ` + r.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ") + " Z" : ""))
    .join(" ");
  // Keep the shape's own colour when selected (selection shown by the dashed
  // outline + heavier fill below), so colour edits are visible immediately.
  const color = highlighted ? "var(--color-canvas-highlight)" : (obj.color || "var(--color-text-primary)");
  const rot = obj.rotation ?? 0;
  return (
    <div
      data-object-id={obj.id}
      onClick={toolArmed ? undefined : (e) => e.stopPropagation() /* selection handled by canvas mousedown */}
      {...hoverProps}
      title={`Combined shape (${String((obj.props as Record<string, unknown> | undefined)?.combineOp ?? "")})`}
      style={{
        position: "absolute",
        left: obj.x + minX,
        top: obj.y + minY,
        width: w,
        height: h,
        transform: rot ? `rotate(${rot}deg)` : undefined,
        transformOrigin: "center",
        color,
        cursor: "move",
        outline: selected
          ? "1px dashed var(--color-canvas-select)"
          : hovered
          ? "1px solid var(--color-canvas-hover)"
          : "none",
        outlineOffset: 2,
        opacity: dimmed && !selected && !highlighted ? "var(--pcb-dim-opacity, 0.3)" : undefined,
        zIndex: 2,
      }}
    >
      <svg width={w} height={h} viewBox={`${minX} ${minY} ${w} ${h}`} style={{ overflow: "visible", display: "block" }}>
        <path d={d} fill="currentColor" fillOpacity={selected ? 0.28 : hovered ? 0.22 : 0.16} stroke="currentColor" strokeWidth={1.6} fillRule="evenodd" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function DraftLine() {
  const state = usePcbState();
  const [mouse, setMouse] = React.useState<{ x: number; y: number } | null>(null);
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = document.querySelector(".pcb-app [data-canvas-wrapper]") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const sx = (e.clientX - r.left - state.pan.x) / state.zoom;
      const sy = (e.clientY - r.top - state.pan.y) / state.zoom;
      setMouse({ x: sx, y: sy });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [state.pan.x, state.pan.y, state.zoom]);
  if (!state.draftWire) return null;
  const tx = mouse?.x ?? state.draftWire.startX;
  const ty = mouse?.y ?? state.draftWire.startY;
  // A cutout is an area — previewing it as a line would promise the wrong
  // gesture, so it rubber-bands as the rectangle it will actually cut.
  // A track preview shows the path it will really take — corner style and the
  // obstacle policy included, from the same planner the commit uses.
  if (state.draftWire.kind === "track") {
    const plan = planTrackPath(state, { x: state.draftWire.startX, y: state.draftWire.startY }, { x: tx, y: ty });
    return (
      <polyline
        points={plan.points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="var(--color-pcb-routing)"
        strokeWidth={2}
        strokeDasharray="4 3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
        style={{ filter: "drop-shadow(0 0 5px var(--color-pcb-routing-glow))" }}
      />
    );
  }
  // UIUX-95 — the suture rectangle previews as the area it will stitch.
  if (state.draftWire.kind === "suture:rect") {
    const sx = state.draftWire.startX, sy = state.draftWire.startY;
    return (
      <rect
        x={Math.min(sx, tx)} y={Math.min(sy, ty)}
        width={Math.abs(tx - sx)} height={Math.abs(ty - sy)}
        fill="var(--color-canvas-marquee-fill)"
        stroke="var(--color-pcb-routing)"
        strokeWidth={1.6}
        strokeDasharray="5 3"
        pointerEvents="none"
      />
    );
  }
  // #122 — a dragged board outline previews as the shape it will become.
  if (state.draftWire.kind === "boardOutlineRect" || state.draftWire.kind === "boardOutlineCircle") {
    const sx = state.draftWire.startX, sy = state.draftWire.startY;
    const common = { fill: "none", stroke: "var(--color-pcb-outline)", strokeWidth: 1.6, strokeDasharray: "5 3", pointerEvents: "none" as const };
    return state.draftWire.kind === "boardOutlineRect" ? (
      <rect x={Math.min(sx, tx)} y={Math.min(sy, ty)} width={Math.abs(tx - sx)} height={Math.abs(ty - sy)} {...common} />
    ) : (
      <circle cx={sx} cy={sy} r={Math.hypot(tx - sx, ty - sy)} {...common} />
    );
  }
  if (state.draftWire.kind === "cutout") {
    return (
      <rect
        x={Math.min(state.draftWire.startX, tx)}
        y={Math.min(state.draftWire.startY, ty)}
        width={Math.abs(tx - state.draftWire.startX)}
        height={Math.abs(ty - state.draftWire.startY)}
        fill="var(--color-canvas-marquee-fill)"
        stroke="var(--color-pcb-outline)"
        strokeWidth={1.4}
        strokeDasharray="5 3"
        pointerEvents="none"
      />
    );
  }
  return (
    <line
      x1={state.draftWire.startX}
      y1={state.draftWire.startY}
      x2={tx}
      y2={ty}
      stroke="var(--color-violet-600)"
      strokeWidth={state.draftWire.kind === "bus" ? 3 : 1.7}
      strokeDasharray="4 3"
      strokeLinecap="round"
      pointerEvents="none"
    />
  );
}

// Component-family kinds whose floating label is the Designator child object.
const DESIGNATOR_KINDS = new Set([
  "component", "resistor", "capacitor", "inductor", "diode", "ic", "connector",
  "fp0805", "fpSOD123", "fpSOT23", "fpSOIC8",
]);

function PlacedGlyph({
  obj,
  selected,
  highlighted,
  editing,
  dimmed,
  layerColor,
  standardColor,
  designatorActive,
  toolArmed,
  hovered,
  hoverProps,
  onSelect,
  onSelectDesignator,
  onEditStart,
  onEditEnd,
  onTextChange,
}: {
  obj: CanvasObject;
  selected: boolean;
  highlighted?: boolean;
  editing: boolean;
  dimmed?: boolean;
  layerColor?: string;
  /** UIUX-17 — the standard colour for this kind in the *current* mode: the
   *  sheet and the board have their own sets, and only the parent knows which
   *  is in play. The glyph used to read the board's map in either view. */
  standardColor?: string;
  designatorActive?: boolean;
  toolArmed?: boolean;
  hovered?: boolean;
  hoverProps?: { onMouseEnter?: () => void; onMouseLeave?: () => void };
  onSelect: (additive: boolean) => void;
  onSelectDesignator?: () => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onTextChange: (t: string) => void;
}) {
  const rotation = obj.rotation ?? 0;
  // Per-object mirror flags (set by Flip H/V) → scale(-1) so a single symbol
  // visibly mirrors, not just its position within a multi-selection.
  const fx = (obj.props as Record<string, unknown> | undefined)?.flipX ? -1 : 1;
  const fy = (obj.props as Record<string, unknown> | undefined)?.flipY ? -1 : 1;
  // Priority: net-highlight → explicit color → PCB layer → theme. Selection is
  // shown by the dashed outline + background tint below (NOT by recolouring the
  // glyph) so an object keeps its own colour while selected — otherwise editing
  // its colour in the inspector shows no change until it's deselected.
  // #130 — a documentation object without its own colour takes the standard
  // colour for its meaning (line · shape · arc · dimension · text · keep-out),
  // so the board's non-copper marks read as one family. User colour still wins.
  const normalColor = obj.color || layerColor || standardColor || "var(--color-text-primary)";
  const glyphColor = highlighted ? "var(--color-canvas-highlight)" : normalColor;
  // Fillable shapes (rectangle/circle/ellipse) render their real outline colour
  // (obj.color via currentColor) + fill colour (props.fillColor), each with an
  // on/off toggle — so the inspector's colour + Fill/Outline controls do real
  // work instead of the static outline-only glyph.
  const sp = (obj.props ?? {}) as Record<string, unknown>;
  const fillable = obj.kind === "rectangle" || obj.kind === "circle" || obj.kind === "ellipse";
  const lineOn = sp.lineOn !== false;
  const fillOn = sp.fillOn === true;
  const fillCol = fillOn ? String(sp.fillColor ?? "#FFFFFF") : "none";
  const strokeCol = lineOn ? "currentColor" : "none";
  const rx = Math.max(0, Math.min(Number(sp.roundRadius) || 0, 10));
  if (obj.kind === "text") {
    return (
      <div
        data-object-id={obj.id}
        onClick={toolArmed ? undefined : (e) => e.stopPropagation() /* selection handled by canvas mousedown */}
        {...hoverProps}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEditStart();
        }}
        style={{
          position: "absolute",
          left: obj.x,
          top: obj.y,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "0 0",
          padding: "2px 6px",
          fontSize: 12,
          fontFamily: "var(--font-family-body)",
          color: hovered && !selected && !highlighted ? "var(--color-canvas-hover)" : glyphColor,
          textShadow: highlighted && !selected ? "0 0 6px var(--color-canvas-highlight)" : undefined,
          // UIUX-25 — a note's own linework is its letterforms, so hover sets
          // them bolder and takes the accent instead of boxing the text in.
          fontWeight: hovered && !selected ? 700 : 400,
          border: selected ? "1px dashed var(--color-canvas-select)" : "1px dashed transparent",
          background: "transparent",
          cursor: editing ? "text" : "move",
          userSelect: editing ? "text" : "none",
          zIndex: 2,
        }}
      >
        {editing ? (
          <input
            autoFocus
            value={obj.text ?? ""}
            onChange={(e) => onTextChange(e.target.value)}
            onBlur={onEditEnd}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") onEditEnd();
            }}
            style={{
              fontSize: 12,
              fontFamily: "var(--font-family-body)",
              border: "none",
              background: "transparent",
              outline: "none",
              color: "inherit",
              width: Math.max(60, (obj.text?.length ?? 4) * 8),
            }}
          />
        ) : (
          obj.text || "Text"
        )}
      </div>
    );
  }
  return (
    <div
      data-object-id={obj.id}
      className={hovered && !selected ? "ix-hot" : undefined}
      onClick={toolArmed ? undefined : (e) => e.stopPropagation() /* selection handled by canvas mousedown */}
      {...hoverProps}
      style={{
        position: "absolute",
        left: obj.x - 24,
        top: obj.y - 24,
        width: 48,
        height: 48,
        transform: `rotate(${rotation}deg) scale(${fx}, ${fy})`,
        transformOrigin: "50% 50%",
        // Hovering takes the accent into the glyph's own colour — every part of
        // it paints in `currentColor`, so the symbol itself brightens (UIUX-25).
        color: hovered && !selected && !highlighted ? "var(--color-canvas-hover)" : glyphColor,
        filter: highlighted && !selected ? "drop-shadow(0 0 4px var(--color-canvas-highlight))" : undefined,
        // #140 — Focus-active-layer dims what isn't on the layer you're working
        // on, without hiding it: the stack stays readable, the work stands out.
        opacity: dimmed && !selected && !highlighted ? "var(--pcb-dim-opacity, 0.3)" : 1,
        cursor: "move",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Same three states, same tokens, every kind: hover reads as a lighter
        // echo of selection so the two can never be confused.
        // UIUX-25 — hover emphasises the object itself, not a box around it:
        // the glyph paints in `currentColor`, so taking the hover accent and
        // thickening its strokes (the `.ix-hot` class) makes the part's own
        // linework, pin numbers and label read bolder — the thing you are
        // pointing at, rather than a rectangle near it. Selection keeps the
        // dashed marker and tint, so the two can never be confused (UIUX-26).
        background: selected
          ? "var(--color-canvas-select-fill)"
          : highlighted
          ? "var(--color-canvas-highlight-fill)"
          : "transparent",
        outline: selected ? "1px dashed var(--color-canvas-select)" : "none",
        borderRadius: 4,
        transition: "background .12s ease-out, outline-color .12s ease-out, color .12s ease-out",
        zIndex: 2,
      }}
      title={obj.text ? `${obj.text} · ${obj.kind}` : obj.kind}
    >
      <svg viewBox="-24 -24 48 48" width="48" height="48">
        {fillable ? (
          obj.kind === "rectangle" ? (
            <rect x={-14} y={-10} width={28} height={20} rx={rx} stroke={strokeCol} strokeWidth={1.7} fill={fillCol} />
          ) : obj.kind === "circle" ? (
            <circle cx={0} cy={0} r={12} stroke={strokeCol} strokeWidth={1.7} fill={fillCol} />
          ) : (
            <ellipse cx={0} cy={0} rx={14} ry={9} stroke={strokeCol} strokeWidth={1.7} fill={fillCol} />
          )
        ) : obj.kind === "vcc5v" ? (
          // Supply rail — the name sits above the arrow, so it is drawn inside
          // the symbol (not by the generic label below) and follows obj.text.
          supplyGlyph(obj.text || "+5V")
        ) : (
          GLYPHS[obj.kind] ?? <circle cx={0} cy={0} r={6} fill="currentColor" />
        )}
      </svg>
      {obj.text && obj.kind !== "vcc5v" && (() => {
        const isDesig = DESIGNATOR_KINDS.has(obj.kind);
        const p = obj.props ?? {};
        const dx = Number(p.desig_x ?? 0);
        const dy = Number(p.desig_y ?? 0);
        const drot = Number(p.desig_rot ?? 0);
        const silk = p.desig_silk ? String(p.desig_silk) : null;
        return (
          <span
            onClick={isDesig && onSelectDesignator ? (e) => { e.stopPropagation(); onSelectDesignator(); } : undefined}
            style={{
              position: "absolute",
              bottom: -4,
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 9,
              color: designatorActive ? "var(--color-violet-600)" : (silk ?? "currentColor"),
              pointerEvents: isDesig ? "auto" : "none",
              cursor: isDesig ? "pointer" : undefined,
              outline: designatorActive ? "1px dashed var(--color-violet-600)" : undefined,
              transform: `translate(${dx}px, ${dy}px) rotate(${-rotation + drot}deg)`,
            }}
          >
            {obj.text}
          </span>
        );
      })()}
    </div>
  );
}
