"use client";

// IDEEZA PCB Software — placed canvas objects.
// Renders every object the user has placed via a toolbar tool. Each `kind`
// gets its own SVG glyph at the stored canvas coordinates; rotation is
// applied via CSS transform. Multi-select draws a violet halo around every
// member, plus the rubber-band rectangle when active.

import * as React from "react";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import type { CanvasObject } from "@/lib/pcb/types";
import { isSelectable } from "@/lib/pcb/types";

// Each glyph is centered on (0, 0) in its own local coords. The wrapper
// translates and rotates it.
const GLYPHS: Record<string, React.ReactNode> = {
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
  vcc5v: (
    <g stroke="currentColor" strokeWidth={1.8} fill="currentColor">
      <path d="M0 -14l-6 6h12z" />
      <path d="M0 -8v14" fill="none" />
      <text x="0" y="-18" textAnchor="middle" fontSize={9} stroke="none" fontWeight={700}>+5V</text>
    </g>
  ),
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
  diffPairFlag: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" fill="none">
      <path d="M-13 -7a11 11 0 0 1 0 14" />
      <path d="M13 -7a11 11 0 0 0 0 14" />
      <path d="M-7 -3h14M-7 3h14" strokeWidth={1.3} opacity={0.7} />
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
  viaFence: (
    <g stroke="currentColor" strokeWidth={1.4} fill="none">
      {[-14, -7, 0, 7, 14].map((cx) => (
        <React.Fragment key={cx}>
          <circle cx={cx} cy={0} r={3} />
          <circle cx={cx} cy={0} r={1} fill="currentColor" stroke="none" />
        </React.Fragment>
      ))}
    </g>
  ),
  shapedPad: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="currentColor" fillOpacity={0.25}>
      <path d="M-14 -6q4 -8 12 -6l10 3q6 2 4 9l-3 8q-2 6 -9 4l-11 -3q-7 -2 -5 -9z" />
      <circle cx={0} cy={0} r={2.5} fillOpacity={1} stroke="none" />
    </g>
  ),
  fpcStiffener: (
    <g stroke="currentColor" strokeWidth={1.5} fill="none">
      <rect x={-15} y={-10} width={30} height={20} rx={2} />
      <path d="M-9 -10v20M-3 -10v20M3 -10v20M9 -10v20" opacity={0.6} />
    </g>
  ),
  stackTable: (
    <g stroke="currentColor" strokeWidth={1.4} fill="none">
      <rect x={-15} y={-11} width={30} height={22} />
      <path d="M-15 -4h30M-15 3h30M-3 -11v22" />
    </g>
  ),
  drillTable: (
    <g stroke="currentColor" strokeWidth={1.4} fill="none">
      <rect x={-15} y={-11} width={30} height={22} />
      <path d="M-15 -3h30M-3 -11v22" />
      <circle cx={-9} cy={3.5} r={2.2} />
      <circle cx={5} cy={3.5} r={1.4} />
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
  const state = usePcbState();
  const actions = usePcbActions();
  const SELECTED = "var(--color-violet-600)";
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
    if (state.mode === "schematic" && (o.sheetId ?? firstSheetId) !== state.activeSheetId) return false;
    return true;
  };
  // Net highlight — objects on the highlighted net glow amber over everything.
  // Schematic nets are computed live (no stored `net`), so members come from the
  // id list the store resolved when the net was highlighted; PCB uses `o.net`.
  const HIGHLIGHT = "var(--color-canvas-highlight)";
  const hotSet = React.useMemo(() => new Set(state.highlightedMembers), [state.highlightedMembers]);
  const isHot = (o: CanvasObject) => hotSet.has(o.id) || (!!state.highlightedNet && o.net === state.highlightedNet);

  // PCB mode: look up layer color + visibility per object. Schematic mode
  // ignores `obj.layer` entirely.
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
  const colorFor = (obj: { layer?: string; color?: string; net?: string }) => {
    if (obj.color) return obj.color;
    if (state.mode === "pcb" && obj.net) {
      const nc = netMap.get(obj.net);
      if (nc) return nc;
    }
    if (state.mode === "pcb" && obj.layer) {
      const l = layerMap.get(obj.layer);
      if (l) return l.color;
    }
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
            const stroke = sel ? SELECTED : hot ? HIGHLIGHT : colorFor(o);
            const w = (isTrack ? (sel ? 6 : 5) : isBus ? (sel ? 4 : 3) : sel ? 2.6 : 1.7) + (hot ? 1.2 : 0);
            return (
              <line
                key={o.id}
                data-object-id={o.id}
                x1={o.x}
                y1={o.y}
                x2={o.endX ?? o.x}
                y2={o.endY ?? o.y}
                stroke={stroke}
                strokeWidth={w}
                strokeLinecap="round"
                style={{ pointerEvents: "stroke", cursor: "move", filter: hot ? "drop-shadow(0 0 3px var(--color-canvas-highlight))" : undefined }}
                onClick={(e) => e.stopPropagation() /* selection handled by canvas mousedown */}
              />
            );
          })}
          {state.draftWire && <DraftLine />}
          {state.rubberBand && (
            <rect
              x={Math.min(state.rubberBand.x1, state.rubberBand.x2)}
              y={Math.min(state.rubberBand.y1, state.rubberBand.y2)}
              width={Math.abs(state.rubberBand.x2 - state.rubberBand.x1)}
              height={Math.abs(state.rubberBand.y2 - state.rubberBand.y1)}
              fill="rgba(124,45,185,.08)"
              stroke="var(--color-violet-600)"
              strokeWidth={1}
              strokeDasharray="3 3"
              pointerEvents="none"
            />
          )}
          {state.lasso && state.lasso.length > 1 && (
            <polygon
              points={state.lasso.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="rgba(124,45,185,.08)"
              stroke="var(--color-violet-600)"
              strokeWidth={1}
              strokeDasharray="4 3"
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

      {state.objects.filter((o) => !WIRE_KINDS.has(o.kind) && isVisible(o) && inScope(o)).map((o) =>
        o.points && o.points.length ? (
          <CombineShape key={o.id} obj={o} selected={selectedSet.has(o.id)} highlighted={isHot(o)} />
        ) : (
        <PlacedGlyph
          key={o.id}
          obj={o}
          selected={selectedSet.has(o.id)}
          highlighted={isHot(o)}
          editing={editingId === o.id}
          layerColor={
            state.mode === "pcb"
              ? (o.net ? netMap.get(o.net) : undefined) ?? (o.layer ? layerMap.get(o.layer)?.color : undefined)
              : undefined
          }
          designatorActive={selectedSet.has(o.id) && state.selSub === "designator"}
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

// A boolean/Combine result — a real filled polygon (rings in LOCAL coords,
// evenodd fill so holes show). Positioned like a glyph at its centroid (x,y).
function CombineShape({ obj, selected, highlighted }: { obj: CanvasObject; selected: boolean; highlighted?: boolean }) {
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
      onClick={(e) => e.stopPropagation() /* selection handled by canvas mousedown */}
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
        outline: selected ? "1px dashed var(--color-violet-600)" : "none",
        outlineOffset: 2,
        zIndex: 2,
      }}
    >
      <svg width={w} height={h} viewBox={`${minX} ${minY} ${w} ${h}`} style={{ overflow: "visible", display: "block" }}>
        <path d={d} fill="currentColor" fillOpacity={selected ? 0.24 : 0.16} stroke="currentColor" strokeWidth={1.6} fillRule="evenodd" strokeLinejoin="round" />
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
  layerColor,
  designatorActive,
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
  layerColor?: string;
  designatorActive?: boolean;
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
  const normalColor = obj.color || layerColor || "var(--color-text-primary)";
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
        onClick={(e) => e.stopPropagation() /* selection handled by canvas mousedown */}
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
          border: selected ? "1px dashed var(--color-violet-600)" : "1px dashed transparent",
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
      onClick={(e) => e.stopPropagation() /* selection handled by canvas mousedown */}
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
        cursor: "move",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: selected ? "rgba(124,45,185,.10)" : highlighted ? "rgba(245,166,35,.12)" : "transparent",
        outline: selected ? "1px dashed var(--color-violet-600)" : "none",
        borderRadius: 4,
        zIndex: 2,
      }}
      title={obj.kind}
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
