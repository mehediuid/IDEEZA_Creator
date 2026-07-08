"use client";

// Wiring module — the stage. A top-view SVG canvas (DOM/SVG, so it renders
// and is testable everywhere) showing placed peripheral parts with numbered
// pins, the finished wires (rounded path + anchor dots + heat-shrink sleeve),
// and the live draft preview while a wire is being drawn. Handles pin picking,
// height setting (cursor height during a height stage), sketch points, wire
// selection and Esc-to-cancel.

import * as React from "react";
import {
  PERIPHERAL_BY_KIND,
  buildWirePoints,
  pinPos,
  roundedPathD,
  WIRE_TOOL_LABEL,
  type WireObj,
  type WirePart,
  type WirePoint,
} from "@/lib/wiring/types";
import { useWiring } from "./wiring-context";

const STAGE_HINT: Record<string, string> = {
  pin1: "Step 1 — click the first pin",
  height1: "Set lamination height, then click to confirm",
  pin2: "Step 2 — click the second pin",
  height2: "Set the second lamination height, then click to confirm",
  sketch: "Click points to draw the path, then click the second pin",
};

export function WiringCanvas({
  topOffset,
  leftOffset,
  rightOffset,
  bottomOffset = 36,
}: {
  topOffset: number;
  leftOffset: number;
  rightOffset: number;
  bottomOffset?: number;
}) {
  const {
    parts, wires, tool, draft, selectedWireId,
    pickPin, setCursor, setDraftHeight, confirmHeight, addSketchPoint,
    cancelDraft, selectWire,
  } = useWiring();
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [hoverPin, setHoverPin] = React.useState<string | null>(null);
  const drawing = tool !== null && draft.stage !== "idle";

  // Esc cancels the current draft.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cancelDraft(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelDraft]);

  const toCanvas = (e: React.MouseEvent): WirePoint => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const pinAbs = (partId?: string, pinId?: string): WirePoint | null => {
    const p = parts.find((x) => x.id === partId);
    const def = p && PERIPHERAL_BY_KIND[p.kind]?.pins.find((pp) => pp.id === pinId);
    return p && def ? pinPos(p, def) : null;
  };

  const onMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const c = toCanvas(e);
    if (draft.stage === "height1" || draft.stage === "height2") {
      const anchor = draft.stage === "height1"
        ? pinAbs(draft.fromPart, draft.fromPin)
        : pinAbs(draft.toPart, draft.toPin);
      if (anchor) setDraftHeight(anchor.y - c.y); // how far above the pin
    } else {
      setCursor(c);
    }
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    if (!drawing) { selectWire(null); return; }
    if (draft.stage === "height1" || draft.stage === "height2") { confirmHeight(); return; }
    if (draft.stage === "sketch") { addSketchPoint(toCanvas(e)); return; }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        bottom: bottomOffset,
        left: leftOffset,
        right: rightOffset,
        background: "var(--color-bg-page)",
        overflow: "hidden",
        zIndex: 10,
      }}
    >
      {/* step HUD */}
      {drawing && (
        <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 5, display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", background: "var(--color-bg-inverse, #1E1E1E)", color: "#fff", borderRadius: 999, fontSize: 13, fontWeight: 500, boxShadow: "var(--elevation-4)" }}>
          <span style={{ fontWeight: 700 }}>{WIRE_TOOL_LABEL[draft.tool].replace("Peripheral ", "")}</span>
          <span style={{ opacity: 0.85 }}>{STAGE_HINT[draft.stage]}</span>
          <span style={{ opacity: 0.6, fontSize: 11 }}>· Esc to cancel</span>
        </div>
      )}
      {parts.length === 0 && !drawing && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--color-text-tertiary)", pointerEvents: "none" }}>
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="8" width="7" height="8" rx="1"/><rect x="14" y="8" width="7" height="8" rx="1"/><path d="M10 12h4"/></svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-secondary)" }}>Start wiring</div>
          <div style={{ fontSize: 13 }}>Drop two peripheral parts from the left, then pick a wire tool from Draw.</div>
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onMouseMove={onMove}
        onClick={onCanvasClick}
        style={{ display: "block", cursor: drawing ? "crosshair" : "default" }}
      >
        <GridPattern />
        {/* finished wires (under parts so pins stay clickable) */}
        {wires.map((w) => (
          <WireGraphic key={w.id} wire={w} selected={w.id === selectedWireId} onSelect={() => selectWire(w.id)} />
        ))}
        {/* draft preview */}
        {drawing && <DraftPreview />}
        {/* parts + pins on top */}
        {parts.map((p) => (
          <PartGraphic
            key={p.id}
            part={p}
            drawing={drawing}
            hoverPin={hoverPin}
            onHoverPin={setHoverPin}
            onPickPin={pickPin}
          />
        ))}
      </svg>
    </div>
  );

  // ── inner components (closure over draft/parts) ──────────────────────────
  function DraftPreview() {
    const from = pinAbs(draft.fromPart, draft.fromPin);
    if (!from) return null;
    const cursor = draft.cursor;

    // height stages: show the vertical lamination + a draggable-looking tip.
    if (draft.stage === "height1" || draft.stage === "height2") {
      const anchor = draft.stage === "height1" ? from : pinAbs(draft.toPart, draft.toPin);
      const h = draft.stage === "height1" ? draft.height1 : draft.height2;
      if (!anchor) return null;
      const tip = { x: anchor.x, y: anchor.y - h };
      return (
        <g pointerEvents="none">
          <line x1={anchor.x} y1={anchor.y} x2={tip.x} y2={tip.y} stroke="var(--color-violet-600)" strokeWidth={3} strokeDasharray="5 4" />
          <circle cx={tip.x} cy={tip.y} r={7} fill="var(--color-violet-600)" stroke="#fff" strokeWidth={2} />
          <text x={tip.x + 12} y={tip.y + 4} fontSize={12} fill="var(--color-violet-600)" fontWeight={700}>{Math.round(h)}px</text>
        </g>
      );
    }

    // pin2 / sketch: preview the route from the raised start toward the cursor.
    const to = cursor ?? from;
    const pts = buildWirePoints(draft.tool, from, to, draft.height1, draft.height2 || draft.height1, draft.sketchPoints);
    return (
      <g pointerEvents="none">
        <path d={roundedPathD(pts, 8)} fill="none" stroke="var(--color-violet-600)" strokeWidth={3} strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
        {draft.sketchPoints.map((sp, i) => (
          <circle key={i} cx={sp.x} cy={sp.y} r={4} fill="var(--color-violet-600)" />
        ))}
      </g>
    );
  }
}

function GridPattern() {
  return (
    <>
      <defs>
        <pattern id="wiring-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="var(--color-border-subtle)" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#wiring-grid)" />
    </>
  );
}

function PartGraphic({
  part, drawing, hoverPin, onHoverPin, onPickPin,
}: {
  part: WirePart;
  drawing: boolean;
  hoverPin: string | null;
  onHoverPin: (id: string | null) => void;
  onPickPin: (partId: string, pinId: string) => void;
}) {
  const def = PERIPHERAL_BY_KIND[part.kind];
  if (!def) return null;
  return (
    <g data-part-id={part.id} transform={`translate(${part.x} ${part.y})`}>
      <rect x={-def.w / 2} y={-def.h / 2} width={def.w} height={def.h} rx={6} fill={def.color} opacity={0.9} stroke="#00000022" />
      <text x={0} y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">{part.name}</text>
      {def.pins.map((pin) => {
        const key = `${part.id}:${pin.id}`;
        const hot = hoverPin === key;
        return (
          <g
            key={pin.id}
            data-pin={key}
            transform={`translate(${pin.dx} ${pin.dy})`}
            style={{ cursor: drawing ? "pointer" : "default" }}
            onMouseEnter={() => onHoverPin(key)}
            onMouseLeave={() => onHoverPin(null)}
            onClick={(e) => { e.stopPropagation(); onPickPin(part.id, pin.id); }}
          >
            {/* big invisible hit area */}
            <circle cx={0} cy={0} r={12} fill="transparent" />
            <circle cx={0} cy={0} r={hot ? 7 : 5} fill={hot ? "var(--color-violet-600)" : "#1E1E1E"} stroke="#fff" strokeWidth={1.6} />
            <text x={0} y={pin.dy < 0 ? -12 : 18} textAnchor="middle" fontSize={9} fontWeight={600} fill={hot ? "var(--color-violet-600)" : "var(--color-text-secondary)"}>{pin.label}</text>
          </g>
        );
      })}
    </g>
  );
}

function WireGraphic({ wire, selected, onSelect }: { wire: WireObj; selected: boolean; onSelect: () => void }) {
  const pts = wire.points;
  if (pts.length < 2) return null;
  const d = roundedPathD(pts, wire.filletRadius);
  const a = pts[0];
  const b = pts[pts.length - 1];
  // heat-shrink sleeves: a fatter capsule from each end along the first/last segment.
  const sleeve = (end: WirePoint, toward: WirePoint) => {
    const len = Math.hypot(toward.x - end.x, toward.y - end.y) || 1;
    const t = Math.min(wire.heatShrink, len) / len;
    return { x2: end.x + (toward.x - end.x) * t, y2: end.y + (toward.y - end.y) * t };
  };
  const s1 = sleeve(a, pts[1]);
  const s2 = sleeve(b, pts[pts.length - 2]);
  return (
    <g onClick={(e) => { e.stopPropagation(); onSelect(); }} style={{ cursor: "pointer" }}>
      {/* wide invisible hit line */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={Math.max(14, wire.routeWidth + 10)} />
      {selected && <path d={d} fill="none" stroke="var(--color-violet-600)" strokeWidth={wire.routeWidth + 6} opacity={0.28} strokeLinecap="round" strokeLinejoin="round" />}
      <path d={d} fill="none" stroke={wire.color} strokeWidth={wire.routeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {/* heat-shrink sleeves */}
      {wire.heatShrink > 0 && (
        <>
          <line x1={a.x} y1={a.y} x2={s1.x2} y2={s1.y2} stroke="#000" opacity={0.35} strokeWidth={wire.routeWidth + 5} strokeLinecap="round" />
          <line x1={b.x} y1={b.y} x2={s2.x2} y2={s2.y2} stroke="#000" opacity={0.35} strokeWidth={wire.routeWidth + 5} strokeLinecap="round" />
        </>
      )}
      {/* anchor dots */}
      <circle cx={a.x} cy={a.y} r={4.5} fill="#000" stroke="#fff" strokeWidth={1.4} />
      <circle cx={b.x} cy={b.y} r={4.5} fill="#000" stroke="#fff" strokeWidth={1.4} />
    </g>
  );
}
