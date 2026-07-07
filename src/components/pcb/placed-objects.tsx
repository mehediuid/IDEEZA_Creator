"use client";

// IDEEZA PCB Software — placed canvas objects.
// Renders every object the user has placed via a toolbar tool. Each `kind`
// gets its own SVG glyph at the stored canvas coordinates; rotation is
// applied via CSS transform. Multi-select draws a violet halo around every
// member, plus the rubber-band rectangle when active.

import * as React from "react";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import type { CanvasObject } from "@/lib/pcb/types";

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
  boardOutline: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none" strokeDasharray="3 3">
      <rect x={-18} y={-14} width={36} height={28} rx={2} />
    </g>
  ),
};

const WIRE_KINDS = new Set(["wire", "bus", "track", "dimension", "diffPair", "lengthTune", "polyline", "line"]);

export function PlacedObjects() {
  const state = usePcbState();
  const actions = usePcbActions();
  const SELECTED = "var(--color-violet-600)";
  const NORMAL = "var(--color-text-primary)";
  const selectedSet = React.useMemo(() => new Set(state.selectedIds), [state.selectedIds]);

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
      {/* Wires + buses + draft + rubber-band rect — single SVG overlay. */}
      <svg
        style={{
          position: "absolute",
          left: -OX,
          top: -OX,
          width: W,
          height: W,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        <g transform={`translate(${OX} ${OX})`}>
          {state.objects.filter((o) => WIRE_KINDS.has(o.kind) && isVisible(o)).map((o) => {
            const sel = selectedSet.has(o.id);
            const isBus = o.kind === "bus";
            const isTrack = o.kind === "track";
            const stroke = sel ? SELECTED : colorFor(o);
            const w = isTrack ? (sel ? 6 : 5) : isBus ? (sel ? 4 : 3) : sel ? 2.6 : 1.7;
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
                style={{ pointerEvents: "stroke", cursor: "move" }}
                onClick={(e) => {
                  e.stopPropagation();
                  actions.selectPlaced(o.id, e.shiftKey || e.metaKey || e.ctrlKey);
                }}
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
        </g>
      </svg>

      {state.objects.filter((o) => !WIRE_KINDS.has(o.kind) && isVisible(o)).map((o) => (
        <PlacedGlyph
          key={o.id}
          obj={o}
          selected={selectedSet.has(o.id)}
          editing={editingId === o.id}
          layerColor={
            state.mode === "pcb"
              ? (o.net ? netMap.get(o.net) : undefined) ?? (o.layer ? layerMap.get(o.layer)?.color : undefined)
              : undefined
          }
          onSelect={(additive) => actions.selectPlaced(o.id, additive)}
          onEditStart={() => setEditingId(o.id)}
          onEditEnd={() => setEditingId(null)}
          onTextChange={(t) => actions.setObjectText(o.id, t)}
        />
      ))}
    </>
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

function PlacedGlyph({
  obj,
  selected,
  editing,
  layerColor,
  onSelect,
  onEditStart,
  onEditEnd,
  onTextChange,
}: {
  obj: CanvasObject;
  selected: boolean;
  editing: boolean;
  layerColor?: string;
  onSelect: (additive: boolean) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onTextChange: (t: string) => void;
}) {
  const rotation = obj.rotation ?? 0;
  // Priority: explicit per-object color → PCB layer color (when on a layer) → theme.
  const normalColor = obj.color || layerColor || "var(--color-text-primary)";
  if (obj.kind === "text") {
    return (
      <div
        data-object-id={obj.id}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(e.shiftKey || e.metaKey || e.ctrlKey);
        }}
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
          color: selected ? "var(--color-violet-600)" : normalColor,
          border: selected ? "1px dashed var(--color-violet-600)" : "1px dashed transparent",
          background: "transparent",
          cursor: editing ? "text" : "move",
          userSelect: editing ? "text" : "none",
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
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey || e.metaKey || e.ctrlKey);
      }}
      style={{
        position: "absolute",
        left: obj.x - 24,
        top: obj.y - 24,
        width: 48,
        height: 48,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "50% 50%",
        color: selected ? "var(--color-violet-600)" : normalColor,
        cursor: "move",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: selected ? "rgba(124,45,185,.10)" : "transparent",
        outline: selected ? "1px dashed var(--color-violet-600)" : "none",
        borderRadius: 4,
      }}
      title={obj.kind}
    >
      <svg viewBox="-24 -24 48 48" width="48" height="48">
        {GLYPHS[obj.kind] ?? <circle cx={0} cy={0} r={6} fill="currentColor" />}
      </svg>
      {obj.text && obj.kind !== "vcc5v" && (
        <span
          style={{
            position: "absolute",
            bottom: -4,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 9,
            color: "currentColor",
            pointerEvents: "none",
            transform: `rotate(${-rotation}deg)`,
          }}
        >
          {obj.text}
        </span>
      )}
    </div>
  );
}
