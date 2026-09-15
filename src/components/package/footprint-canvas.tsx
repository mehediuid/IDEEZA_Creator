"use client";

// Footprint Creator — the canvas.
//
// Real-world millimetres with the part's own centre at the origin. The model is
// always mm; the mm/mil toggle is display only, so switching units can never
// round the geometry. Screen mapping is a single scale (PX_PER_MM) with the
// origin at the canvas centre, which keeps stroke weights and label sizes in
// px — the same visual weights the Symbol canvas uses.
//
// Layer ink is token-driven and picked to read on a *sheet*, not on green
// substrate: the board's own --color-pcb-silk-* are chosen for a dark board and
// would be invisible here, the way the schematic carries its own
// --color-schem-draw-* set for the same reason.

import * as React from "react";
import {
  type FpLayer,
  type FpObj,
  type FpTool,
  type PackageDraft,
  type PadKind,
  type Pt,
  electricalPads,
  fpPads,
  newId,
  snapMm,
  symPins,
  textContent,
} from "@/lib/package/types";

export const PX_PER_MM = 40;
export const CANVAS_W = 820;
export const CANVAS_H = 470;
const OX = CANVAS_W / 2;
const OY = CANVAS_H / 2;

export const toPx = (mm: number) => mm * PX_PER_MM;
const sx = (mm: number) => OX + mm * PX_PER_MM;
const sy = (mm: number) => OY + mm * PX_PER_MM;

const LAYER_INK: Record<FpLayer, string> = {
  "Top Silkscreen": "var(--color-text-primary)",
  "Bottom Silkscreen": "var(--color-text-tertiary)",
  "Top Paste Mask": "var(--color-pcb-paste-top)",
  "Bottom Paste Mask": "var(--color-pcb-paste-bottom)",
};

const COPPER = "var(--color-pad-copper)";
const MECH = "var(--color-pad-mechanical)";

/** The label a pad carries: its pin number, or M-prefixed when mechanical. */
export function padLabel(d: PackageDraft, id: string): string {
  const pads = fpPads(d);
  const pad = pads.find((p) => p.id === id);
  if (!pad) return "";
  if (pad.padKind === "Mounting") {
    const mech = pads.filter((p) => p.padKind === "Mounting");
    return `M${mech.findIndex((p) => p.id === id) + 1}`;
  }
  return pad.pin === null ? "—" : String(pad.pin);
}

/** The lowest symbol pin that has no pad yet — what a new pad answers to. */
export function nextFreePin(d: PackageDraft): number | null {
  const covered = new Set(electricalPads(d).map((p) => p.pin));
  const free = symPins(d).find((p) => !covered.has(p.num));
  return free ? free.num : null;
}

export function handlesOfFp(o: FpObj): Pt[] {
  switch (o.kind) {
    case "pad":
      return [
        { x: o.x + o.w / 2, y: o.y },
        { x: o.x, y: o.y + o.h / 2 },
      ];
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
    case "arc":
    case "dimension":
      return [
        { x: o.x1, y: o.y1 },
        { x: o.x2, y: o.y2 },
      ];
    case "polyline":
      return o.points;
    default:
      return [];
  }
}

function moveHandleFp(o: FpObj, i: number, p: Pt): Partial<FpObj> {
  switch (o.kind) {
    case "pad":
      return i === 0 ? { w: Math.max(0.1, Math.abs(p.x - o.x) * 2) } : { h: Math.max(0.1, Math.abs(p.y - o.y) * 2) };
    case "rect": {
      const x2 = i === 1 || i === 2 ? p.x : o.x + o.w;
      const y2 = i === 2 || i === 3 ? p.y : o.y + o.h;
      const x1 = i === 0 || i === 3 ? p.x : o.x;
      const y1 = i === 0 || i === 1 ? p.y : o.y;
      return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
    }
    case "circle":
      return { r: Math.max(0.05, Math.hypot(p.x - o.x, p.y - o.y)) };
    case "ellipse":
      return i === 0 ? { rx: Math.max(0.05, Math.abs(p.x - o.x)) } : { ry: Math.max(0.05, Math.abs(p.y - o.y)) };
    case "line":
    case "arc":
    case "dimension":
      return i === 0 ? { x1: p.x, y1: p.y } : { x2: p.x, y2: p.y };
    case "polyline":
      return { points: o.points.map((q, k) => (k === i ? p : q)) };
    default:
      return {};
  }
}

function translatedFp(o: FpObj, dx: number, dy: number): Partial<FpObj> {
  switch (o.kind) {
    case "pad":
    case "text":
    case "rect":
    case "circle":
    case "ellipse":
      return { x: o.x + dx, y: o.y + dy };
    case "line":
    case "arc":
    case "dimension":
      return { x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy };
    case "polyline":
      return { points: o.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
    default:
      return {};
  }
}

const PRESS = new Set<FpTool>(["rect", "circle", "ellipse"]);
const CLICK2 = new Set<FpTool>(["line", "arc", "dimension"]);
const MULTI = new Set<FpTool>(["polyline"]);

type Act =
  | { mode: "idle" }
  | { mode: "move"; id: string; orig: FpObj; from: Pt }
  | { mode: "handle"; id: string; orig: FpObj; index: number }
  | { mode: "press"; a: Pt; b: Pt }
  | { mode: "multi"; pts: Pt[]; hover: Pt };

export function FootprintCanvas({
  draft,
  tool,
  padKind,
  selected,
  onSelect,
  onAdd,
  onUpdate,
  onToolDone,
  onDeleteSelected,
}: {
  draft: PackageDraft;
  tool: FpTool;
  padKind: PadKind;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (o: FpObj) => void;
  onUpdate: (id: string, p: Partial<FpObj>) => void;
  onToolDone: () => void;
  onDeleteSelected: () => void;
}) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  // The interaction carries the tool it was started with. Arming a different
  // tool therefore invalidates a half-drawn run by derivation — no effect has to
  // reach in and reset it.
  const [rawAct, setRawAct] = React.useState<Act & { tool?: FpTool }>({ mode: "idle" });
  const act: Act = rawAct.tool && rawAct.tool !== tool ? { mode: "idle" } : rawAct;
  const setAct = (next: Act) => setRawAct(next.mode === "idle" ? { mode: "idle" } : { ...next, tool });
  const [hoverId, setHoverId] = React.useState<string | null>(null);

  const snap = (p: Pt): Pt => ({ x: snapMm(p.x, draft.fpSnap), y: snapMm(p.y, draft.fpSnap) });

  /** Pointer → millimetres, origin-centred. */
  const at = (e: React.PointerEvent | React.MouseEvent): Pt => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    const k = CANVAS_W / r.width;
    return { x: ((e.clientX - r.left) * k - OX) / PX_PER_MM, y: ((e.clientY - r.top) * k - OY) / PX_PER_MM };
  };

  const placePad = (p: Pt) => {
    const q = snap(p);
    const mech = padKind === "Mounting";
    const tht = draft.mounting === "THT";
    onAdd({
      id: newId("pad"),
      kind: "pad",
      padKind,
      shape: tht || mech ? "THT round" : "SMD rect",
      w: mech ? 1.6 : tht ? 1.6 : 0.6,
      h: mech ? 1.6 : tht ? 1.6 : 1.5,
      drill: tht || mech ? 0.9 : undefined,
      x: q.x,
      y: q.y,
      pin: mech ? null : nextFreePin(draft),
    });
  };

  const placeText = (p: Pt) => {
    const q = snap(p);
    onAdd({ id: newId("ftxt"), kind: "text", layer: draft.drawLayer, x: q.x, y: q.y, textKind: "Free Text", content: "Text", size: 0.8 });
  };

  const commitPress = (a: Pt, b: Pt) => {
    const L = draft.drawLayer;
    if (tool === "rect") {
      const w = Math.abs(b.x - a.x);
      const h = Math.abs(b.y - a.y);
      if (w < 0.1 || h < 0.1) return;
      onAdd({ id: newId("frect"), kind: "rect", layer: L, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w, h });
    } else if (tool === "circle") {
      const r = Math.hypot(b.x - a.x, b.y - a.y);
      if (r < 0.05) return;
      onAdd({ id: newId("fcir"), kind: "circle", layer: L, x: a.x, y: a.y, r });
    } else if (tool === "ellipse") {
      const rx = Math.abs(b.x - a.x);
      const ry = Math.abs(b.y - a.y);
      if (rx < 0.05 || ry < 0.05) return;
      onAdd({ id: newId("fell"), kind: "ellipse", layer: L, x: a.x, y: a.y, rx, ry });
    }
  };

  const commitMulti = (pts: Pt[]) => {
    const L = draft.drawLayer;
    if (pts.length < 2) return;
    const [p1, p2] = pts;
    if (tool === "line") onAdd({ id: newId("fln"), kind: "line", layer: L, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    else if (tool === "arc") onAdd({ id: newId("farc"), kind: "arc", layer: L, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, bulge: 0.6 });
    else if (tool === "dimension") onAdd({ id: newId("fdim"), kind: "dimension", layer: L, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    else if (tool === "polyline") onAdd({ id: newId("fpl"), kind: "polyline", layer: L, points: pts });
  };

  const onDownCanvas = (e: React.PointerEvent) => {
    const p = at(e);
    if (tool === "select") {
      onSelect(null);
      return;
    }
    if (tool === "pad") {
      placePad(p);
      return;
    }
    if (tool === "text") {
      placeText(p);
      return;
    }
    if (PRESS.has(tool)) {
      const a = snap(p);
      setAct({ mode: "press", a, b: a });
      (e.target as Element).setPointerCapture?.(e.pointerId);
      return;
    }
    if (CLICK2.has(tool) || MULTI.has(tool)) {
      const q = snap(p);
      if (act.mode !== "multi") {
        setAct({ mode: "multi", pts: [q], hover: q });
        return;
      }
      const pts = [...act.pts, q];
      if (CLICK2.has(tool) && pts.length === 2) {
        commitMulti(pts);
        setAct({ mode: "idle" });
        return;
      }
      if (MULTI.has(tool) && pts.length > 2 && Math.hypot(q.x - act.pts[0].x, q.y - act.pts[0].y) < 0.4) {
        commitMulti(act.pts);
        setAct({ mode: "idle" });
        return;
      }
      setAct({ mode: "multi", pts, hover: q });
    }
  };

  const onDownObject = (e: React.PointerEvent, o: FpObj) => {
    if (tool !== "select") return;
    e.stopPropagation();
    onSelect(o.id);
    setAct({ mode: "move", id: o.id, orig: o, from: at(e) });
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
      onUpdate(act.id, translatedFp(act.orig, q.x - from.x, q.y - from.y));
    } else if (act.mode === "handle") onUpdate(act.id, moveHandleFp(act.orig, act.index, snap(p)));
  };

  const onUp = () => {
    if (act.mode === "press") {
      commitPress(act.a, act.b);
      setAct({ mode: "idle" });
      return;
    }
    if (act.mode === "move" || act.mode === "handle") setAct({ mode: "idle" });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (act.mode !== "idle") setAct({ mode: "idle" });
      else onSelect(null);
      onToolDone();
      return;
    }
    if (e.key === "Enter" && act.mode === "multi" && MULTI.has(tool)) {
      commitMulti(act.pts);
      setAct({ mode: "idle" });
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && selected) {
      e.preventDefault();
      onDeleteSelected();
    }
  };

    const sel = selected ? draft.footprint.find((o) => o.id === selected) : undefined;
  const selColor = "var(--color-canvas-select)";
  const hoverColor = "var(--color-canvas-hover)";
  const emph = (o: FpObj) => o.id === selected || (o.id === hoverId && tool === "select");

  const node = (o: FpObj) => {
    const hit = {
      onPointerDown: (e: React.PointerEvent) => onDownObject(e, o),
      onPointerEnter: () => setHoverId(o.id),
      onPointerLeave: () => setHoverId((h) => (h === o.id ? null : h)),
      style: { cursor: tool === "select" ? "move" : "crosshair" } as React.CSSProperties,
    };
    const band = { stroke: "transparent", strokeWidth: 12, fill: "none" as const, ...hit };
    const ink = o.kind === "pad" ? COPPER : LAYER_INK[o.layer];
    const stroke = emph(o) ? (o.id === selected ? selColor : hoverColor) : ink;
    const sw = emph(o) ? 2.2 : 1.5;

    switch (o.kind) {
      case "pad": {
        const fill = o.padKind === "Mounting" ? MECH : COPPER;
        const w = toPx(o.w);
        const h = toPx(o.h);
        const cx = sx(o.x);
        const cy = sy(o.y);
        const round = o.shape === "SMD round" || o.shape === "THT round";
        const oval = o.shape === "THT oval";
        const drill = o.drill ? toPx(o.drill) / 2 : 0;
        return (
          <g key={o.id}>
            {round ? (
              <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill={fill} stroke={emph(o) ? stroke : "none"} strokeWidth={2} {...hit} />
            ) : (
              <rect
                x={cx - w / 2}
                y={cy - h / 2}
                width={w}
                height={h}
                rx={oval ? Math.min(w, h) / 2 : 0}
                fill={fill}
                stroke={emph(o) ? stroke : "none"}
                strokeWidth={2}
                {...hit}
              />
            )}
            {drill > 0 ? <circle cx={cx} cy={cy} r={drill} fill="var(--color-bg-surface)" pointerEvents="none" /> : null}
            <text
              x={cx}
              y={cy + h / 2 + 11}
              textAnchor="middle"
              fontSize={10}
              fill="var(--color-text-secondary)"
              fontFamily="var(--font-family-mono)"
              pointerEvents="none"
            >
              {padLabel(draft, o.id)}
            </text>
          </g>
        );
      }
      case "rect":
        return (
          <rect key={o.id} x={sx(o.x)} y={sy(o.y)} width={toPx(o.w)} height={toPx(o.h)} fill="none" stroke={stroke} strokeWidth={sw} {...hit} />
        );
      case "circle":
        return <circle key={o.id} cx={sx(o.x)} cy={sy(o.y)} r={toPx(o.r)} fill="none" stroke={stroke} strokeWidth={sw} {...hit} />;
      case "ellipse":
        return <ellipse key={o.id} cx={sx(o.x)} cy={sy(o.y)} rx={toPx(o.rx)} ry={toPx(o.ry)} fill="none" stroke={stroke} strokeWidth={sw} {...hit} />;
      case "line":
        return (
          <g key={o.id}>
            <line x1={sx(o.x1)} y1={sy(o.y1)} x2={sx(o.x2)} y2={sy(o.y2)} stroke={stroke} strokeWidth={sw} pointerEvents="none" />
            <line x1={sx(o.x1)} y1={sy(o.y1)} x2={sx(o.x2)} y2={sy(o.y2)} {...band} />
          </g>
        );
      case "arc": {
        const mx = (sx(o.x1) + sx(o.x2)) / 2;
        const my = (sy(o.y1) + sy(o.y2)) / 2;
        const dx = sx(o.x2) - sx(o.x1);
        const dy = sy(o.y2) - sy(o.y1);
        const len = Math.hypot(dx, dy) || 1;
        const d = `M ${sx(o.x1)} ${sy(o.y1)} Q ${mx + (-dy / len) * toPx(o.bulge) * 2} ${my + (dx / len) * toPx(o.bulge) * 2} ${sx(o.x2)} ${sy(o.y2)}`;
        return (
          <g key={o.id}>
            <path d={d} fill="none" stroke={stroke} strokeWidth={sw} pointerEvents="none" />
            <path d={d} {...band} />
          </g>
        );
      }
      case "polyline": {
        const pts = o.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
        return (
          <g key={o.id}>
            <polyline points={pts} fill="none" stroke={stroke} strokeWidth={sw} pointerEvents="none" />
            <polyline points={pts} {...band} />
          </g>
        );
      }
      case "dimension": {
        // A measured span: the rule, its two end ticks, and the distance it
        // states — read in the draft's display unit, so it can't disagree with
        // the tables.
        const x1 = sx(o.x1);
        const y1 = sy(o.y1);
        const x2 = sx(o.x2);
        const y2 = sy(o.y2);
        const mm = Math.hypot(o.x2 - o.x1, o.y2 - o.y1);
        const label = draft.units === "mm" ? `${mm.toFixed(2)} mm` : `${(mm / 0.0254).toFixed(0)} mil`;
        return (
          <g key={o.id}>
            <g pointerEvents="none" stroke={stroke} strokeWidth={sw} fill="none">
              <line x1={x1} y1={y1} x2={x2} y2={y2} />
              <line x1={x1} y1={y1 - 5} x2={x1} y2={y1 + 5} />
              <line x1={x2} y1={y2 - 5} x2={x2} y2={y2 + 5} />
            </g>
            <text
              x={(x1 + x2) / 2}
              y={(y1 + y2) / 2 - 6}
              textAnchor="middle"
              fontSize={10}
              fill={stroke}
              fontFamily="var(--font-family-mono)"
              pointerEvents="none"
            >
              {label}
            </text>
            <line x1={x1} y1={y1} x2={x2} y2={y2} {...band} />
          </g>
        );
      }
      case "text": {
        const brand = o.textKind !== "Free Text";
        return (
          <text
            key={o.id}
            x={sx(o.x)}
            y={sy(o.y)}
            fontSize={Math.max(9, toPx(o.size))}
            fill={emph(o) ? stroke : brand ? "var(--color-text-brand)" : LAYER_INK[o.layer]}
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

  const gridPx = toPx(0.5);

  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border bg-bg-surface"
      style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        role="application"
        aria-label="Footprint canvas"
        tabIndex={0}
        onPointerDown={onDownCanvas}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onDoubleClick={() => {
          if (act.mode === "multi" && MULTI.has(tool)) {
            commitMulti(act.pts);
            setAct({ mode: "idle" });
          }
        }}
        onKeyDown={onKey}
        className="block h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
        style={{ cursor: tool === "select" ? "default" : "crosshair", touchAction: "none" }}
      >
        <defs>
          <pattern id="pkg-fp-grid" width={gridPx} height={gridPx} patternUnits="userSpaceOnUse" x={OX} y={OY}>
            <circle cx={0.5} cy={0.5} r={0.8} fill="var(--color-canvas-grid)" />
          </pattern>
        </defs>
        <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="url(#pkg-fp-grid)" />
        {/* Origin — the part's own centre, which every X/Y in the tables is from */}
        <g pointerEvents="none" stroke="var(--color-canvas-crosshair)" strokeWidth={1}>
          <line x1={OX - 14} y1={OY} x2={OX + 14} y2={OY} />
          <line x1={OX} y1={OY - 14} x2={OX} y2={OY + 14} />
        </g>

        {draft.footprint.map(node)}

        {act.mode === "press" ? (
          tool === "rect" ? (
            <rect
              x={sx(Math.min(act.a.x, act.b.x))}
              y={sy(Math.min(act.a.y, act.b.y))}
              width={toPx(Math.abs(act.b.x - act.a.x))}
              height={toPx(Math.abs(act.b.y - act.a.y))}
              fill="var(--color-canvas-marquee-fill)"
              stroke={selColor}
              strokeWidth={1.4}
              strokeDasharray="4 3"
            />
          ) : tool === "circle" ? (
            <circle cx={sx(act.a.x)} cy={sy(act.a.y)} r={toPx(Math.hypot(act.b.x - act.a.x, act.b.y - act.a.y))} fill="none" stroke={selColor} strokeWidth={1.4} strokeDasharray="4 3" />
          ) : (
            <ellipse cx={sx(act.a.x)} cy={sy(act.a.y)} rx={toPx(Math.abs(act.b.x - act.a.x))} ry={toPx(Math.abs(act.b.y - act.a.y))} fill="none" stroke={selColor} strokeWidth={1.4} strokeDasharray="4 3" />
          )
        ) : null}

        {act.mode === "multi" ? (
          <>
            <polyline
              points={[...act.pts, act.hover].map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")}
              fill="none"
              stroke={selColor}
              strokeWidth={1.4}
              strokeDasharray="4 3"
            />
            {act.pts.map((p, i) => (
              <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={2.6} fill={selColor} />
            ))}
          </>
        ) : null}

        {sel
          ? handlesOfFp(sel).map((h, i) => (
              <rect
                key={i}
                x={sx(h.x) - 4}
                y={sy(h.y) - 4}
                width={8}
                height={8}
                rx={1.5}
                fill="var(--color-bg-surface)"
                stroke={selColor}
                strokeWidth={1.6}
                style={{ cursor: "pointer" }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setAct({ mode: "handle", id: sel.id, orig: sel, index: i });
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                }}
              />
            ))
          : null}
      </svg>
    </div>
  );
}
