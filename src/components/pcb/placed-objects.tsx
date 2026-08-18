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

// Supply rail (VCC / +5V / -5V / any named rail). The arrow is drawn 20 units
// wide — the same span as the GND bar below — so a rail no longer reads as the
// smallest thing on the sheet, and the name it carries is part of the symbol.
// One source: the placed object renders this with its own text, and GLYPHS
// holds the default, so the two can't drift apart.
function supplyGlyph(label: string) {
  return (
    <g stroke="currentColor" strokeWidth={1.9} fill="currentColor" strokeLinejoin="round" strokeLinecap="round">
      <path d="M0 -15l-10 8h20z" />
      <path d="M0 -7v16" fill="none" />
      <text x="0" y="-17.5" textAnchor="middle" fontSize={9} stroke="none" fontWeight={700}>{label}</text>
    </g>
  );
}

// #130 — standard colours for the drawing / documentation kinds (tokens, so
// both themes are covered and the Layer Manager can still override per layer).
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

/** The symbol a place tool will drop, drawn from the same geometry the placed
 *  object uses — the ghost preview must never be a second copy. */
export function glyphFor(kind: string): React.ReactNode {
  return GLYPHS[kind] ?? <circle cx={0} cy={0} r={6} fill="currentColor" />;
}

// Each glyph is centered on (0, 0) in its own local coords. The wrapper
// translates and rotates it.
export const GLYPHS: Record<string, React.ReactNode> = {
  resistor: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-26 0h6l3-8 6 16 6-16 3 8h6" />
    </g>
  ),
  capacitor: (
    <g stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
      <path d="M-18 0h8M10 0h8M-10 -10v20M10 -10v20" />
    </g>
  ),
  diode: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M-18 0h6M8 0h10" />
      <path d="M-12 -7v14l16 -7z" fill="currentColor" />
      <path d="M8 -7v14" />
    </g>
  ),
  inductor: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none" strokeLinecap="round">
      <path d="M-20 0h4" />
      <path d="M-16 0a4 4 0 1 1 8 0M-8 0a4 4 0 1 1 8 0M0 0a4 4 0 1 1 8 0M8 0a4 4 0 1 1 8 0" />
      <path d="M16 0h4" />
    </g>
  ),
  crystal: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none" strokeLinecap="round">
      <path d="M-18 0h9M9 0h9" />
      <path d="M-6 -9v18M6 -9v18" />
      <rect x={-3} y={-11} width={6} height={22} />
    </g>
  ),
  // Op-amp / in-amp triangle: two inputs left (+ top, − bottom), output right.
  opamp: (
    <g stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinejoin="round" strokeLinecap="round">
      <path d="M-13 -16 L-13 16 L17 0 Z" />
      <path d="M-20 -8 H-13 M-20 8 H-13 M17 0 H23" />
      <path d="M-10 -8 h4 M-8 -10 v4" />
      <path d="M-10 8 h4" />
    </g>
  ),
  // Rectangular (IEC) resistor — matches the reference sheet's resistor style.
  resistorBox: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none" strokeLinecap="round">
      <path d="M-24 0h6M18 0h6" />
      <rect x={-18} y={-7} width={36} height={14} />
    </g>
  ),
  // Current source: circle with an internal arrow, vertical leads.
  currentSource: (
    <g stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx={0} cy={0} r={11} />
      <path d="M0 -11 V-20 M0 11 V20" />
      <path d="M0 6 V-5 M-4 -1 L0 -6 L4 -1" />
    </g>
  ),
  vcc5v: supplyGlyph("+5V"),
  pgnd: (
    <g stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" fill="none">
      <path d="M0 -8v8" />
      <path d="M-10 0h20M-7 4h14M-4 8h8" />
    </g>
  ),
  agnd: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round">
      <path d="M0 -8v6" />
      <path d="M-10 -2l10 10 10 -10z" fill="currentColor" />
    </g>
  ),
  pin: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" fill="none">
      <path d="M-16 0h20" /><circle cx={6} cy={0} r={3} fill="currentColor" />
    </g>
  ),
  netFlag: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M-12 12V-12h18l-4 6 4 6h-18" />
    </g>
  ),
  shortFlag: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" fill="none">
      <circle cx={-14} cy={0} r={2} fill="currentColor" />
      <path d="M-14 0h26" />
      <path d="M12 -6v12" />
    </g>
  ),
  port: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M-16 -8h22l6 8-6 8h-22z" />
    </g>
  ),
  noConnect: (
    <g stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M-8 -8l16 16M8 -8l-16 16" />
    </g>
  ),
  pad: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none">
      <rect x={-10} y={-10} width={20} height={20} />
      <circle cx={0} cy={0} r={4} fill="currentColor" />
    </g>
  ),
  via: (
    <g stroke="currentColor" strokeWidth={1.8} fill="none">
      <circle cx={0} cy={0} r={10} />
      <circle cx={0} cy={0} r={3.5} fill="currentColor" />
    </g>
  ),
  sutureVias: (
    <g stroke="currentColor" strokeWidth={1.5} fill="none">
      {[[-12, -8], [12, -8], [-12, 8], [12, 8], [0, 0]].map(([cx, cy], i) => (
        <React.Fragment key={i}>
          <circle cx={cx} cy={cy} r={4} />
          <circle cx={cx} cy={cy} r={1.4} fill="currentColor" />
        </React.Fragment>
      ))}
    </g>
  ),
  netLabel: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M-16 0h6" />
      <path d="M-10 -6h18l4 6-4 6h-18z" />
    </g>
  ),
  // ── Schematic objects with dedicated property panels (placeable) ────────
  offPageConnector: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" fill="none">
      <path d="M-16 0h6" />
      <path d="M-10 -7h10l8 7-8 7h-10z" />
    </g>
  ),
  maskRegion: (
    <g stroke="currentColor" strokeWidth={1.5} strokeDasharray="4 3" fill="currentColor" fillOpacity={0.12}>
      <rect x={-16} y={-12} width={32} height={24} rx={2} />
    </g>
  ),
  componentMask: (
    <g stroke="currentColor" strokeWidth={1.5} fill="none">
      <rect x={-16} y={-12} width={32} height={24} rx={2} strokeDasharray="4 3" />
      <rect x={-7} y={-5} width={14} height={10} rx={1} />
    </g>
  ),
  // UIUX-36 — the tag is fused to the wire it marks: the object's origin sits
  // ON the conductor, a filled junction dot lands there, and a stem carries the
  // tag body above it. It used to be a free-floating ")=(" that gave no clue
  // which line it belonged to. The body is our own shape, not a copy: a tag
  // with the two rails of a pair drawn inside it.
  diffPairFlag: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx={0} cy={0} r={2.6} fill="currentColor" stroke="none" />
      <path d="M0 0v-9" />
      <path d="M-13 -23h26a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H2l-2 2-2-2h-11a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" />
      <path d="M-8 -19.5h16M-8 -15.5h16" strokeWidth={1.4} opacity={0.75} />
    </g>
  ),
  reuseBlock: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none">
      <rect x={-15} y={-12} width={30} height={24} rx={2} strokeDasharray="5 3" />
      <rect x={-5} y={-4} width={10} height={8} rx={1} fill="currentColor" fillOpacity={0.2} />
    </g>
  ),
  netBusLabel: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M-16 0h5" />
      <path d="M-11 -6h16l4 6-4 6h-16z" />
      <path d="M-6 0h9" strokeDasharray="2 2" opacity={0.55} />
    </g>
  ),
  polygon: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" fill="none">
      <path d="M-14 -2l8-12 16 4 4 14-12 10-16-4z" />
    </g>
  ),
  fillRegion: (
    <g stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" fill="currentColor" fillOpacity={0.35}>
      <path d="M-14 -2l8-12 16 4 4 14-12 10-16-4z" />
    </g>
  ),
  slot: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none">
      <rect x={-16} y={-6} width={32} height={12} rx={6} />
      <circle cx={-8} cy={0} r={2} fill="currentColor" stroke="none" />
      <circle cx={8} cy={0} r={2} fill="currentColor" stroke="none" />
    </g>
  ),
  component: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none">
      <rect x={-14} y={-10} width={28} height={20} rx={1.5} />
      <path d="M-14 -5h-4M-14 0h-4M-14 5h-4M14 -5h4M14 0h4M14 5h4" strokeLinecap="round" />
      <text x={0} y={2} textAnchor="middle" fontSize={8} stroke="none" fill="currentColor">U?</text>
    </g>
  ),
  // ── Real land patterns (Schematic → PCB convert output) ────────────────
  // Filled copper pads in the layer color + faint silkscreen body outline.
  // 0805 chip (R / C / L): two pads flanking a body.
  fp0805: (
    <g>
      <rect x={-9} y={-9} width={18} height={18} rx={1.5} fill="none" stroke="currentColor" strokeWidth={0.8} strokeOpacity={0.4} />
      <rect x={-15} y={-8} width={10} height={16} rx={1.5} fill="currentColor" />
      <rect x={5} y={-8} width={10} height={16} rx={1.5} fill="currentColor" />
    </g>
  ),
  // SOD-123 diode: two pads, cathode end marked with a band.
  fpSOD123: (
    <g>
      <rect x={-6} y={-8} width={12} height={16} rx={1} fill="none" stroke="currentColor" strokeWidth={0.8} strokeOpacity={0.45} />
      <rect x={2} y={-8} width={4} height={16} fill="currentColor" fillOpacity={0.55} />
      <rect x={-15} y={-7} width={9} height={14} rx={1.5} fill="currentColor" />
      <rect x={6} y={-7} width={9} height={14} rx={1.5} fill="currentColor" />
    </g>
  ),
  // SOT-23: three pads (two bottom, one top) + body.
  fpSOT23: (
    <g>
      <rect x={-10} y={-5} width={20} height={10} rx={1.5} fill="none" stroke="currentColor" strokeWidth={0.8} strokeOpacity={0.45} />
      <rect x={-13} y={5} width={9} height={7} rx={1.2} fill="currentColor" />
      <rect x={4} y={5} width={9} height={7} rx={1.2} fill="currentColor" />
      <rect x={-4.5} y={-12} width={9} height={7} rx={1.2} fill="currentColor" />
    </g>
  ),
  // SOIC-8: 4 pads per side, body outline + pin-1 dot.
  fpSOIC8: (
    <g>
      <rect x={-9} y={-18} width={18} height={36} rx={1.5} fill="none" stroke="currentColor" strokeWidth={0.9} strokeOpacity={0.55} />
      {[-13.5, -4.5, 4.5, 13.5].map((cy) => (
        <React.Fragment key={cy}>
          <rect x={-18} y={cy - 3} width={8} height={6} rx={1} fill="currentColor" />
          <rect x={10} y={cy - 3} width={8} height={6} rx={1} fill="currentColor" />
        </React.Fragment>
      ))}
      <circle cx={-5} cy={-14} r={1.6} fill="currentColor" />
    </g>
  ),
  boardOutline: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none" strokeDasharray="3 3">
      <rect x={-18} y={-14} width={36} height={28} rx={2} />
    </g>
  ),
  gnd: (
    <g stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" fill="none">
      <path d="M0 -8v8" /><path d="M-10 0h20M-6 4h12M-2 8h4" />
    </g>
  ),
  net: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" fill="none">
      <path d="M-14 0h28" /><circle cx={0} cy={0} r={3} fill="currentColor" />
    </g>
  ),
  junction: (
    <g stroke="none" fill="currentColor"><circle cx={0} cy={0} r={4} /></g>
  ),
  circle: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><circle cx={0} cy={0} r={12} /></g>
  ),
  rectangle: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><rect x={-14} y={-10} width={28} height={20} /></g>
  ),
  ellipse: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><ellipse cx={0} cy={0} rx={14} ry={9} /></g>
  ),
  arc: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><path d="M-12 8a12 12 0 0 1 24 0" /></g>
  ),
  bezier: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><path d="M-14 8C-6 -12 6 -12 14 8" /></g>
  ),
  image: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none">
      <rect x={-13} y={-10} width={26} height={20} rx={2} /><circle cx={-5} cy={-3} r={2.5} /><path d="M-13 8l8-7 6 5 4-3 8 5" />
    </g>
  ),
  mountingHole: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><circle cx={0} cy={0} r={11} /><circle cx={0} cy={0} r={5} /></g>
  ),
  prohibitedRegion: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none" strokeDasharray="4 3">
      <rect x={-14} y={-12} width={28} height={24} rx={2} /><path d="M-14 12L14 -12" />
    </g>
  ),
  constraintRegion: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none" strokeDasharray="4 3">
      <rect x={-14} y={-12} width={28} height={24} rx={2} />
    </g>
  ),
  // ── PDF §10 place-menu inventory ──────────────────────────────────────
  testPoint: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none">
      <circle cx={0} cy={0} r={9} />
      <circle cx={0} cy={0} r={2.5} fill="currentColor" stroke="none" />
      <path d="M0 -13v-3M0 13v3M-13 0h-3M13 0h3" strokeLinecap="round" />
    </g>
  ),
  shapedPad: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="currentColor" fillOpacity={0.25}>
      <path d="M-14 -6q4 -8 12 -6l10 3q6 2 4 9l-3 8q-2 6 -9 4l-11 -3q-7 -2 -5 -9z" />
      <circle cx={0} cy={0} r={2.5} fillOpacity={1} stroke="none" />
    </g>
  ),
  canvasOrigin: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none" strokeLinecap="round">
      <circle cx={0} cy={0} r={7} />
      <path d="M0 -14v28M-14 0h28" />
    </g>
  ),
};

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
    if (obj.kind && DRAW_COLOR[obj.kind]) return DRAW_COLOR[obj.kind];
    return NORMAL;
  };

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const W = 5000;
  const OX = 2500;

  return (
    <>
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
    </>
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
        border: `1.4px ${selected || hovered ? "dashed" : "solid"} ${edge}`,
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
  const normalColor = obj.color || layerColor || DRAW_COLOR[obj.kind] || "var(--color-text-primary)";
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
          color: glyphColor,
          textShadow: highlighted && !selected ? "0 0 6px var(--color-canvas-highlight)" : undefined,
          border: selected
            ? "1px dashed var(--color-canvas-select)"
            : hovered
            ? "1px solid var(--color-canvas-hover)"
            : "1px dashed transparent",
          background: hovered && !selected ? "var(--color-canvas-hover-fill)" : "transparent",
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
        color: glyphColor,
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
        background: selected
          ? "var(--color-canvas-select-fill)"
          : highlighted
          ? "var(--color-canvas-highlight-fill)"
          : hovered
          ? "var(--color-canvas-hover-fill)"
          : "transparent",
        outline: selected
          ? "1px dashed var(--color-canvas-select)"
          : hovered
          ? "1px solid var(--color-canvas-hover)"
          : "none",
        borderRadius: 4,
        transition: "background .12s ease-out, outline-color .12s ease-out",
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
