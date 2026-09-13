"use client";

// Symbol Creator — the canvas.
//
// A direct-manipulation SVG editor in abstract symbol units: one-click tools
// (pin, text), press-drag tools (rect, circle, ellipse) and click-click tools
// (line, arc, polyline, bezier). Selection is exclusive, and the selected
// object gets move-by-body plus per-kind handles.
//
// Two things it borrows from the schematic editor on purpose, so the two read
// alike: the canvas state vocabulary comes from the shared `--color-canvas-*`
// tokens (selected = dashed marker + tint, hover = the object emphasises
// itself), and thin geometry carries a transparent fat hit band under
// pointer-events-none ink, so a line is pickable without a pixel hunt.

import * as React from "react";
import {
  type PackageDraft,
  type Pt,
  type SymObj,
  type SymTool,
  newId,
  nextPinNumber,
  snapUnits,
  textContent,
} from "@/lib/package/types";

export const CANVAS_W = 820;
export const CANVAS_H = 470;

const dirOf = (angle: number): Pt => (angle === 0 ? { x: 1, y: 0 } : angle === 90 ? { x: 0, y: 1 } : angle === 180 ? { x: -1, y: 0 } : { x: 0, y: -1 });

/** A pin's lead runs from its terminal (x,y) toward the body. */
export function pinLead(p: Extract<SymObj, { kind: "pin" }>): { a: Pt; b: Pt } {
  const d = dirOf(p.angle);
  return { a: { x: p.x, y: p.y }, b: { x: p.x + d.x * p.length, y: p.y + d.y * p.length } };
}

const arcPath = (o: Extract<SymObj, { kind: "arc" }>) => {
  const mx = (o.x1 + o.x2) / 2;
  const my = (o.y1 + o.y2) / 2;
  const dx = o.x2 - o.x1;
  const dy = o.y2 - o.y1;
  const len = Math.hypot(dx, dy) || 1;
  // Control point pushed along the segment's normal by twice the bulge, so the
  // curve actually passes through the handle the user is dragging.
  const cx = mx + (-dy / len) * o.bulge * 2;
  const cy = my + (dx / len) * o.bulge * 2;
  return `M ${o.x1} ${o.y1} Q ${cx} ${cy} ${o.x2} ${o.y2}`;
};

export const arcHandle = (o: Extract<SymObj, { kind: "arc" }>): Pt => {
  const mx = (o.x1 + o.x2) / 2;
  const my = (o.y1 + o.y2) / 2;
  const dx = o.x2 - o.x1;
  const dy = o.y2 - o.y1;
  const len = Math.hypot(dx, dy) || 1;
  return { x: mx + (-dy / len) * o.bulge, y: my + (dx / len) * o.bulge };
};

/** A smooth curve through the given points (Catmull-Rom converted to cubics),
 *  so Bezier draws a curve through the same points Polyline would connect with
 *  straight segments — which is exactly how the spec describes the pair. */
function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6} ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Handles for the selected object, in the order the drag code expects. */
export function handlesOf(o: SymObj): Pt[] {
  switch (o.kind) {
    case "pin":
      return [pinLead(o).b];
    case "rect":
      return [
        { x: o.x, y: o.y },
        { x: o.x + o.w, y: o.y },
        { x: o.x + o.w, y: o.y + o.h },
        { x: o.x, y: o.y + o.h },
      ];
    case "circle":
      return [{ x: o.x + o.r, y: o.y }];
    case "ellipse":
      return [
        { x: o.x + o.rx, y: o.y },
        { x: o.x, y: o.y + o.ry },
      ];
    case "line":
      return [
        { x: o.x1, y: o.y1 },
        { x: o.x2, y: o.y2 },
      ];
    case "arc":
      return [{ x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }, arcHandle(o)];
    case "polyline":
    case "bezier":
      return o.points;
    default:
      return [];
  }
}

/** Apply a handle drag to the object. */
function moveHandle(o: SymObj, i: number, p: Pt): Partial<SymObj> {
  switch (o.kind) {
    case "pin": {
      const d = dirOf(o.angle);
      // Project the pointer onto the lead's own axis — a pin's handle changes
      // its length, it doesn't drag the terminal sideways.
      const len = Math.max(6, Math.round((p.x - o.x) * d.x + (p.y - o.y) * d.y));
      return { length: len };
    }
    case "rect": {
      const x2 = i === 1 || i === 2 ? p.x : o.x + o.w;
      const y2 = i === 2 || i === 3 ? p.y : o.y + o.h;
      const x1 = i === 0 || i === 3 ? p.x : o.x;
      const y1 = i === 0 || i === 1 ? p.y : o.y;
      return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
    }
    case "circle":
      return { r: Math.max(2, Math.round(Math.hypot(p.x - o.x, p.y - o.y))) };
    case "ellipse":
      return i === 0 ? { rx: Math.max(2, Math.abs(p.x - o.x)) } : { ry: Math.max(2, Math.abs(p.y - o.y)) };
    case "line":
      return i === 0 ? { x1: p.x, y1: p.y } : { x2: p.x, y2: p.y };
    case "arc": {
      if (i === 0) return { x1: p.x, y1: p.y };
      if (i === 1) return { x2: p.x, y2: p.y };
      const dx = o.x2 - o.x1;
      const dy = o.y2 - o.y1;
      const len = Math.hypot(dx, dy) || 1;
      const mx = (o.x1 + o.x2) / 2;
      const my = (o.y1 + o.y2) / 2;
      // Signed distance from the chord, along its normal.
      return { bulge: Math.round(((p.x - mx) * -dy + (p.y - my) * dx) / len) };
    }
    case "polyline":
    case "bezier":
      return { points: o.points.map((q, k) => (k === i ? p : q)) };
    default:
      return {};
  }
}

/** Translate the whole object by (dx, dy) from its pre-drag copy. */
function translated(o: SymObj, dx: number, dy: number): Partial<SymObj> {
  switch (o.kind) {
    case "pin":
    case "text":
    case "rect":
    case "circle":
    case "ellipse":
      return { x: o.x + dx, y: o.y + dy };
    case "line":
    case "arc":
      return { x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy };
    case "polyline":
    case "bezier":
      return { points: o.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
    default:
      return {};
  }
}

const PRESS_TOOLS = new Set<SymTool>(["rect", "circle", "ellipse"]);
const CLICK2_TOOLS = new Set<SymTool>(["line", "arc"]);
const MULTI_TOOLS = new Set<SymTool>(["polyline", "bezier"]);

type Interaction =
  | { mode: "idle" }
  | { mode: "move"; id: string; orig: SymObj; from: Pt }
  | { mode: "handle"; id: string; orig: SymObj; index: number }
  | { mode: "press"; a: Pt; b: Pt }
  | { mode: "multi"; pts: Pt[]; hover: Pt };

export function SymbolCanvas({
  draft,
  tool,
  selected,
  onSelect,
  onAdd,
  onUpdate,
  onToolDone,
  onDeleteSelected,
}: {
  draft: PackageDraft;
  tool: SymTool;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (o: SymObj) => void;
  onUpdate: (id: string, p: Partial<SymObj>) => void;
  onToolDone: () => void;
  onDeleteSelected: () => void;
}) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  // The interaction carries the tool it was started with. Arming a different
  // tool therefore invalidates a half-drawn run by derivation — no effect has to
  // reach in and reset it.
  const [rawAct, setRawAct] = React.useState<Interaction & { tool?: SymTool }>({ mode: "idle" });
  const act: Interaction = rawAct.tool && rawAct.tool !== tool ? { mode: "idle" } : rawAct;
  const setAct = (next: Interaction) => setRawAct(next.mode === "idle" ? { mode: "idle" } : { ...next, tool });
  const [hoverId, setHoverId] = React.useState<string | null>(null);

  const snap = (p: Pt): Pt => ({ x: snapUnits(p.x, draft.symGrid, draft.symSnap), y: snapUnits(p.y, draft.symGrid, draft.symSnap) });

  const at = (e: React.PointerEvent | React.MouseEvent): Pt => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    const k = CANVAS_W / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  };

  const byId = (id: string) => draft.symbol.find((o) => o.id === id);

  // ── Placement ─────────────────────────────────────────────────────────────
  const placeAt = (p: Pt) => {
    const q = snap(p);
    if (tool === "pin") {
      const n = nextPinNumber(draft);
      onAdd({ id: newId("pin"), kind: "pin", num: n, name: `Pin${n}`, etype: "Passive", length: 30, angle: 0, x: q.x, y: q.y });
      return;
    }
    if (tool === "text") {
      onAdd({ id: newId("txt"), kind: "text", x: q.x, y: q.y, textKind: "Free Text", content: "Text", size: 12 });
    }
  };

  const commitPress = (a: Pt, b: Pt) => {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x);
    const h = Math.abs(b.y - a.y);
    if (tool === "rect") {
      if (w < 4 || h < 4) return;
      onAdd({ id: newId("rect"), kind: "rect", x, y, w, h });
    } else if (tool === "circle") {
      const r = Math.round(Math.hypot(b.x - a.x, b.y - a.y));
      if (r < 3) return;
      onAdd({ id: newId("cir"), kind: "circle", x: a.x, y: a.y, r });
    } else if (tool === "ellipse") {
      const rx = Math.abs(b.x - a.x);
      const ry = Math.abs(b.y - a.y);
      if (rx < 3 || ry < 3) return;
      onAdd({ id: newId("ell"), kind: "ellipse", x: a.x, y: a.y, rx, ry });
    }
  };

  const commitMulti = (pts: Pt[]) => {
    if (tool === "line" || tool === "arc") {
      if (pts.length < 2) return;
      const [p1, p2] = pts;
      if (tool === "line") onAdd({ id: newId("ln"), kind: "line", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
      else onAdd({ id: newId("arc"), kind: "arc", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, bulge: 24 });
      return;
    }
    if (pts.length < 2) return;
    if (tool === "polyline") onAdd({ id: newId("pl"), kind: "polyline", points: pts });
    else if (tool === "bezier") onAdd({ id: newId("bz"), kind: "bezier", points: pts });
  };

  // ── Pointer ───────────────────────────────────────────────────────────────
  const onDownCanvas = (e: React.PointerEvent) => {
    const p = at(e);
    if (tool === "select") {
      onSelect(null);
      return;
    }
    if (tool === "pin" || tool === "text") {
      placeAt(p);
      return;
    }
    if (PRESS_TOOLS.has(tool)) {
      const a = snap(p);
      setAct({ mode: "press", a, b: a });
      (e.target as Element).setPointerCapture?.(e.pointerId);
      return;
    }
    if (CLICK2_TOOLS.has(tool) || MULTI_TOOLS.has(tool)) {
      const q = snap(p);
      if (act.mode !== "multi") {
        setAct({ mode: "multi", pts: [q], hover: q });
        return;
      }
      const pts = [...act.pts, q];
      if (CLICK2_TOOLS.has(tool) && pts.length === 2) {
        commitMulti(pts);
        setAct({ mode: "idle" });
        return;
      }
      // Clicking the first vertex again closes a multi-point run.
      if (MULTI_TOOLS.has(tool) && pts.length > 2 && Math.hypot(q.x - act.pts[0].x, q.y - act.pts[0].y) < draft.symGrid) {
        commitMulti(act.pts);
        setAct({ mode: "idle" });
        return;
      }
      setAct({ mode: "multi", pts, hover: q });
    }
  };

  const onDownObject = (e: React.PointerEvent, o: SymObj) => {
    if (tool !== "select") return; // with a tool armed the click belongs to the tool
    e.stopPropagation();
    onSelect(o.id);
    setAct({ mode: "move", id: o.id, orig: o, from: at(e) });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onDownHandle = (e: React.PointerEvent, o: SymObj, index: number) => {
    e.stopPropagation();
    setAct({ mode: "handle", id: o.id, orig: o, index });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (act.mode === "idle") return;
    const p = at(e);
    if (act.mode === "press") setAct({ ...act, b: snap(p) });
    else if (act.mode === "multi") setAct({ ...act, hover: snap(p) });
    else if (act.mode === "move") {
      const q = snap(p);
      const from = snap(act.from);
      onUpdate(act.id, translated(act.orig, q.x - from.x, q.y - from.y));
    } else if (act.mode === "handle") {
      onUpdate(act.id, moveHandle(act.orig, act.index, snap(p)));
    }
  };

  const onUp = () => {
    if (act.mode === "press") {
      commitPress(act.a, act.b);
      setAct({ mode: "idle" });
      return;
    }
    if (act.mode === "move" || act.mode === "handle") setAct({ mode: "idle" });
  };

  const onDouble = () => {
    if (act.mode === "multi" && MULTI_TOOLS.has(tool)) {
      commitMulti(act.pts);
      setAct({ mode: "idle" });
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (act.mode === "multi" || act.mode === "press") setAct({ mode: "idle" });
      else onSelect(null);
      onToolDone();
      return;
    }
    if (e.key === "Enter" && act.mode === "multi" && MULTI_TOOLS.has(tool)) {
      commitMulti(act.pts);
      setAct({ mode: "idle" });
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && selected) {
      e.preventDefault();
      onDeleteSelected();
    }
  };

  // Arming a tool cancels whatever was mid-draft, so a half-drawn run can't
  // survive into a different tool.
    const sel = selected ? byId(selected) : undefined;
  const ink = "var(--color-text-primary)";
  const selColor = "var(--color-canvas-select)";
  const hoverColor = "var(--color-canvas-hover)";

  const paint = (o: SymObj) => (o.id === selected ? selColor : o.id === hoverId && tool === "select" ? hoverColor : ink);
  const weight = (o: SymObj) => (o.id === selected || (o.id === hoverId && tool === "select") ? 2.4 : 1.6);

  const objectNode = (o: SymObj) => {
    const stroke = paint(o);
    const sw = weight(o);
    const hit = {
      onPointerDown: (e: React.PointerEvent) => onDownObject(e, o),
      onPointerEnter: () => setHoverId(o.id),
      onPointerLeave: () => setHoverId((h) => (h === o.id ? null : h)),
      style: { cursor: tool === "select" ? "move" : "crosshair" } as React.CSSProperties,
    };
    const band = { stroke: "transparent", strokeWidth: 12, fill: "none" as const, ...hit };

    switch (o.kind) {
      case "pin": {
        const { a, b } = pinLead(o);
        const d = dirOf(o.angle);
        const nameAt = { x: a.x - d.x * 8, y: a.y - d.y * 8 };
        const anchor = d.x > 0 ? "end" : d.x < 0 ? "start" : "middle";
        return (
          <g key={o.id}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={sw} pointerEvents="none" />
            <circle cx={a.x} cy={a.y} r={3.2} fill="none" stroke={stroke} strokeWidth={sw} pointerEvents="none" />
            <text
              x={nameAt.x}
              y={d.x === 0 ? nameAt.y : nameAt.y - 2}
              textAnchor={anchor}
              fontSize={11}
              fill="var(--color-text-secondary)"
              fontFamily="var(--font-family-body)"
              pointerEvents="none"
            >
              {o.name}
            </text>
            <text
              x={nameAt.x}
              y={d.x === 0 ? nameAt.y + 13 : nameAt.y + 11}
              textAnchor={anchor}
              fontSize={9}
              fill="var(--color-text-tertiary)"
              fontFamily="var(--font-family-mono)"
              pointerEvents="none"
            >
              #{o.num}
            </text>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...band} />
          </g>
        );
      }
      case "rect":
        return (
          <rect
            key={o.id}
            x={o.x}
            y={o.y}
            width={o.w}
            height={o.h}
            fill={o.id === selected ? "var(--color-canvas-select-fill)" : "var(--color-bg-brand-subtle)"}
            stroke={stroke}
            strokeWidth={sw}
            {...hit}
          />
        );
      case "circle":
        return <circle key={o.id} cx={o.x} cy={o.y} r={o.r} fill="none" stroke={stroke} strokeWidth={sw} {...hit} />;
      case "ellipse":
        return <ellipse key={o.id} cx={o.x} cy={o.y} rx={o.rx} ry={o.ry} fill="none" stroke={stroke} strokeWidth={sw} {...hit} />;
      case "line":
        return (
          <g key={o.id}>
            <line x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} stroke={stroke} strokeWidth={sw} pointerEvents="none" />
            <line x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} {...band} />
          </g>
        );
      case "arc":
        return (
          <g key={o.id}>
            <path d={arcPath(o)} fill="none" stroke={stroke} strokeWidth={sw} pointerEvents="none" />
            <path d={arcPath(o)} {...band} />
          </g>
        );
      case "polyline":
        return (
          <g key={o.id}>
            <polyline points={o.points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={stroke} strokeWidth={sw} pointerEvents="none" />
            <polyline points={o.points.map((p) => `${p.x},${p.y}`).join(" ")} {...band} />
          </g>
        );
      case "bezier":
        return (
          <g key={o.id}>
            <path d={smoothPath(o.points)} fill="none" stroke={stroke} strokeWidth={sw} pointerEvents="none" />
            <path d={smoothPath(o.points)} {...band} />
          </g>
        );
      case "text": {
        const brand = o.textKind !== "Free Text";
        return (
          <text
            key={o.id}
            x={o.x}
            y={o.y}
            fontSize={o.size}
            fill={o.id === selected ? selColor : brand ? "var(--color-text-brand)" : "var(--color-text-primary)"}
            fontFamily="var(--font-family-body)"
            fontWeight={brand ? 600 : 400}
            {...hit}
          >
            {textContent(o, draft) || "—"}
          </text>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border bg-bg-surface"
      style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        role="application"
        aria-label="Symbol canvas"
        tabIndex={0}
        onPointerDown={onDownCanvas}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onDoubleClick={onDouble}
        onKeyDown={onKey}
        className="block h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
        style={{ cursor: tool === "select" ? "default" : "crosshair", touchAction: "none" }}
      >
        <defs>
          <pattern id="pkg-sym-grid" width={draft.symGrid} height={draft.symGrid} patternUnits="userSpaceOnUse">
            <circle cx={0.5} cy={0.5} r={0.8} fill="var(--color-canvas-grid)" />
          </pattern>
        </defs>
        <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="url(#pkg-sym-grid)" />

        {draft.symbol.map(objectNode)}

        {/* In-progress preview — the same geometry the commit will write */}
        {act.mode === "press" ? (
          tool === "rect" ? (
            <rect
              x={Math.min(act.a.x, act.b.x)}
              y={Math.min(act.a.y, act.b.y)}
              width={Math.abs(act.b.x - act.a.x)}
              height={Math.abs(act.b.y - act.a.y)}
              fill="var(--color-canvas-marquee-fill)"
              stroke={selColor}
              strokeWidth={1.4}
              strokeDasharray="4 3"
            />
          ) : tool === "circle" ? (
            <circle cx={act.a.x} cy={act.a.y} r={Math.hypot(act.b.x - act.a.x, act.b.y - act.a.y)} fill="none" stroke={selColor} strokeWidth={1.4} strokeDasharray="4 3" />
          ) : (
            <ellipse cx={act.a.x} cy={act.a.y} rx={Math.abs(act.b.x - act.a.x)} ry={Math.abs(act.b.y - act.a.y)} fill="none" stroke={selColor} strokeWidth={1.4} strokeDasharray="4 3" />
          )
        ) : null}

        {act.mode === "multi" ? (
          <>
            <polyline
              points={[...act.pts, act.hover].map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={selColor}
              strokeWidth={1.4}
              strokeDasharray="4 3"
            />
            {act.pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2.6} fill={selColor} />
            ))}
          </>
        ) : null}

        {/* Selection marker + handles */}
        {sel
          ? handlesOf(sel).map((h, i) => (
              <rect
                key={i}
                x={h.x - 4}
                y={h.y - 4}
                width={8}
                height={8}
                rx={1.5}
                fill="var(--color-bg-surface)"
                stroke={selColor}
                strokeWidth={1.6}
                style={{ cursor: "pointer" }}
                onPointerDown={(e) => onDownHandle(e, sel, i)}
              />
            ))
          : null}
      </svg>
    </div>
  );
}
