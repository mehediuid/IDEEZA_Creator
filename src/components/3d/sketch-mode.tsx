"use client";

// 3D Module — Sketch Mode with interactive drawing.
//
// The sketch plane is an SVG that accepts pointer input. Each tool from the
// palette has its own draft / commit handler, and the drawn primitives are
// rendered as SVG elements above the dotted grid. A small undo/clear strip
// and per-element click-to-select round out the interactivity.

import * as React from "react";
import { C } from "@/lib/pcb/colors";

type SketchTool =
  | "select" | "point" | "line" | "polyline" | "circle" | "arc" | "ellipse"
  | "spline" | "rect" | "polygon" | "slot" | "fillet2d" | "chamfer2d"
  | "trim" | "extend" | "mirror2d" | "offset" | "dim";

type Sketch =
  | { kind: "point"; x: number; y: number; id: string }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; id: string }
  | { kind: "polyline"; points: { x: number; y: number }[]; id: string }
  | { kind: "circle"; cx: number; cy: number; r: number; id: string }
  | { kind: "rect"; x: number; y: number; w: number; h: number; id: string }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; id: string }
  | { kind: "polygon"; points: { x: number; y: number }[]; id: string }
  | { kind: "arc"; cx: number; cy: number; r: number; id: string }
  | { kind: "dim"; x1: number; y1: number; x2: number; y2: number; id: string };

const TOOLS: { id: SketchTool; title: string; path: string }[] = [
  { id: "point",    title: "Point",       path: "M12 11.5a.5 .5 0 1 1 0 1 .5 .5 0 0 1 0-1z" },
  { id: "line",     title: "Line",        path: "M4 20L20 4" },
  { id: "polyline", title: "Polyline",    path: "M4 18l5-7 4 5 7-9" },
  { id: "circle",   title: "Circle",      path: "M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16z" },
  { id: "arc",      title: "Arc",         path: "M4 16a8 8 0 0 1 16 0" },
  { id: "ellipse",  title: "Ellipse",     path: "M12 7a8 4 0 1 1 0 8 8 4 0 1 1 0-8z" },
  { id: "spline",   title: "Spline",      path: "M3 17c4-8 14-2 18-10" },
  { id: "rect",     title: "Rectangle",   path: "M4 6h16v12H4z" },
  { id: "polygon",  title: "Polygon",     path: "M12 3l8 6-3 10H7L4 9z" },
  { id: "slot",     title: "Slot",        path: "M5 9h10a3 3 0 0 1 0 6H5a3 3 0 0 1 0-6z" },
  { id: "select",   title: "Select",      path: "M4 4l5 16 3-7 7-3z" },
  { id: "fillet2d", title: "Fillet",      path: "M4 20V8a4 4 0 0 1 4-4h12" },
  { id: "chamfer2d",title: "Chamfer",     path: "M4 20V8l4-4h12" },
  { id: "trim",     title: "Trim",        path: "M4 18L18 4 M9 11L20 18" },
  { id: "extend",   title: "Extend",      path: "M4 12h12 M14 8l4 4-4 4 M20 5v14" },
  { id: "mirror2d", title: "Mirror",      path: "M12 3v18 M5 8l5 4-5 4z M19 8l-5 4 5 4z" },
  { id: "offset",   title: "Offset",      path: "M6 8h10v8H6z M3 5h16v12H3z" },
  { id: "dim",      title: "Dimension",   path: "M3 12h18 M5 8v8 M19 8v8" },
];

const SKETCH_KEY = "ideeza:3d:sketches";

function readSketchesFromStorage(): Sketch[] {
  try {
    const raw = window.localStorage.getItem(SKETCH_KEY);
    if (raw) return JSON.parse(raw) as Sketch[];
  } catch {}
  return [];
}

function randomId() {
  return Math.floor(Math.random() * 1e9).toString(36);
}

function ToolPalette({ selected, onSelect, onUndo, onClear }: { selected: SketchTool; onSelect: (id: SketchTool) => void; onUndo: () => void; onClear: () => void }) {
  const [collapsed, setCollapsed] = React.useState(false);
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 16,
        transform: "translateX(-50%)",
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--elevation-3)",
        padding: collapsed ? "var(--spacing-2)" : "var(--spacing-3)",
        zIndex: 22,
        minWidth: collapsed ? undefined : 260,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 var(--spacing-2) var(--spacing-2)", gap: 8 }}>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: C.text }}>Sketch Tools</span>
        <span style={{ flex: 1 }} />
        <button onClick={onUndo} style={{ background: "transparent", border: "none", color: C.body, cursor: "pointer", fontSize: 11 }} title="Undo">⟲</button>
        <button onClick={onClear} style={{ background: "transparent", border: "none", color: C.body, cursor: "pointer", fontSize: 11 }} title="Clear all">🗑</button>
        <button onClick={() => setCollapsed((v) => !v)} style={{ background: "transparent", border: "none", color: C.body, cursor: "pointer", fontSize: 14 }} title={collapsed ? "Expand" : "Collapse"}>
          {collapsed ? "+" : "—"}
        </button>
      </div>
      {!collapsed && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 28px)", gap: 4 }}>
          {TOOLS.map((t) => {
            const isSel = selected === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                title={t.title}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "var(--radius-md)",
                  border: isSel ? `var(--border-width-1) dashed ${C.primary}` : "none",
                  background: isSel ? "var(--color-bg-brand-subtle)" : "transparent",
                  color: isSel ? C.primary : "var(--color-text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={t.path} />
                </svg>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SketchPlane({
  selectedTool,
  sketches,
  setSketches,
  selectedSketch,
  onSelectSketch,
}: {
  selectedTool: SketchTool;
  sketches: Sketch[];
  setSketches: React.Dispatch<React.SetStateAction<Sketch[]>>;
  selectedSketch: string | null;
  onSelectSketch: (id: string | null) => void;
}) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [draft, setDraft] = React.useState<Sketch | null>(null);
  const [polyPoints, setPolyPoints] = React.useState<{ x: number; y: number }[]>([]);

  const toLocal = (e: React.MouseEvent | MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.MouseEvent) => {
    const p = toLocal(e);
    const id = randomId();

    if (selectedTool === "select") {
      onSelectSketch(null);
      return;
    }
    if (selectedTool === "point") {
      setSketches((arr) => [...arr, { kind: "point", x: p.x, y: p.y, id }]);
      return;
    }
    if (selectedTool === "polyline" || selectedTool === "polygon") {
      // double-click on the same point finishes; otherwise append.
      setPolyPoints((arr) => [...arr, p]);
      return;
    }
    if (selectedTool === "spline") {
      setPolyPoints((arr) => [...arr, p]);
      return;
    }
    // drag-to-draw shapes
    setDraft({ kind: shapeKindFor(selectedTool), id, ...startSketch(selectedTool, p) } as Sketch);
  };

  const onMove = (e: React.MouseEvent) => {
    if (!draft) return;
    const p = toLocal(e);
    setDraft((d) => (d ? updateDraft(d, p) : d));
  };

  const onUp = () => {
    if (draft) {
      setSketches((arr) => [...arr, draft]);
      setDraft(null);
    }
  };

  const onDouble = () => {
    if (selectedTool === "polyline" && polyPoints.length >= 2) {
      setSketches((arr) => [...arr, { kind: "polyline", points: polyPoints, id: randomId() }]);
      setPolyPoints([]);
    } else if (selectedTool === "polygon" && polyPoints.length >= 3) {
      setSketches((arr) => [...arr, { kind: "polygon", points: polyPoints, id: randomId() }]);
      setPolyPoints([]);
    } else if (selectedTool === "spline" && polyPoints.length >= 2) {
      setSketches((arr) => [...arr, { kind: "polyline", points: polyPoints, id: randomId() }]);
      setPolyPoints([]);
    }
  };

  return (
    <div style={{ position: "absolute", top: 14, left: 14, right: 0, bottom: 0, background: "var(--color-bg-page)" }}>
      <svg
        ref={svgRef}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onDoubleClick={onDouble}
        width="100%"
        height="100%"
        style={{ display: "block", cursor: selectedTool === "select" ? "default" : "crosshair" }}
      >
        <defs>
          <pattern id="sketch-grid-int" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="0.5" cy="0.5" r="0.7" fill="var(--color-text-tertiary)" opacity="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sketch-grid-int)" />

        {sketches.map((s) => (
          <SketchView key={s.id} sketch={s} selected={selectedSketch === s.id} onClick={(e) => { e.stopPropagation(); onSelectSketch(s.id); }} />
        ))}
        {draft && <SketchView sketch={draft} selected ghost />}

        {polyPoints.length > 0 && (
          <>
            <polyline
              points={polyPoints.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={C.primary}
              strokeWidth="1.4"
              strokeDasharray="3 3"
            />
            {polyPoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3} fill={C.primary} />
            ))}
          </>
        )}
      </svg>
    </div>
  );
}

function shapeKindFor(t: SketchTool): Sketch["kind"] {
  if (t === "line") return "line";
  if (t === "circle") return "circle";
  if (t === "rect" || t === "slot") return "rect";
  if (t === "arc") return "arc";
  if (t === "ellipse") return "ellipse";
  if (t === "dim") return "dim";
  return "line";
}

function startSketch(t: SketchTool, p: { x: number; y: number }): Partial<Sketch> {
  if (t === "line") return { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
  if (t === "rect" || t === "slot") return { x: p.x, y: p.y, w: 0, h: 0 };
  if (t === "circle" || t === "arc") return { cx: p.x, cy: p.y, r: 0 };
  if (t === "ellipse") return { cx: p.x, cy: p.y, rx: 0, ry: 0 };
  if (t === "dim") return { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
  return { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
}

function updateDraft(d: Sketch, p: { x: number; y: number }): Sketch {
  if (d.kind === "line" || d.kind === "dim") return { ...d, x2: p.x, y2: p.y };
  if (d.kind === "rect") return { ...d, w: p.x - d.x, h: p.y - d.y };
  if (d.kind === "circle" || d.kind === "arc") {
    const r = Math.hypot(p.x - d.cx, p.y - d.cy);
    return { ...d, r };
  }
  if (d.kind === "ellipse") return { ...d, rx: Math.abs(p.x - d.cx), ry: Math.abs(p.y - d.cy) };
  return d;
}

function SketchView({ sketch, selected, ghost, onClick }: { sketch: Sketch; selected?: boolean; ghost?: boolean; onClick?: (e: React.MouseEvent) => void }) {
  const stroke = selected ? C.primary : "#475569";
  const fill = ghost ? "rgba(124,45,185,.08)" : "rgba(124,45,185,.06)";
  const sw = selected ? 2 : 1.4;
  switch (sketch.kind) {
    case "point":
      return <circle cx={sketch.x} cy={sketch.y} r={3.5} fill={stroke} onClick={onClick} />;
    case "line":
      return <line x1={sketch.x1} y1={sketch.y1} x2={sketch.x2} y2={sketch.y2} stroke={stroke} strokeWidth={sw} onClick={onClick} />;
    case "polyline":
      return <polyline points={sketch.points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={stroke} strokeWidth={sw} onClick={onClick} />;
    case "polygon":
      return <polygon points={sketch.points.map((p) => `${p.x},${p.y}`).join(" ")} fill={fill} stroke={stroke} strokeWidth={sw} onClick={onClick} />;
    case "circle":
      return <circle cx={sketch.cx} cy={sketch.cy} r={sketch.r} fill={fill} stroke={stroke} strokeWidth={sw} onClick={onClick} />;
    case "rect":
      return <rect x={Math.min(sketch.x, sketch.x + sketch.w)} y={Math.min(sketch.y, sketch.y + sketch.h)} width={Math.abs(sketch.w)} height={Math.abs(sketch.h)} fill={fill} stroke={stroke} strokeWidth={sw} onClick={onClick} />;
    case "ellipse":
      return <ellipse cx={sketch.cx} cy={sketch.cy} rx={sketch.rx} ry={sketch.ry} fill={fill} stroke={stroke} strokeWidth={sw} onClick={onClick} />;
    case "arc": {
      const r = sketch.r;
      const cx = sketch.cx;
      const cy = sketch.cy;
      const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
      return <path d={d} fill="none" stroke={stroke} strokeWidth={sw} onClick={onClick} />;
    }
    case "dim": {
      const mx = (sketch.x1 + sketch.x2) / 2;
      const my = (sketch.y1 + sketch.y2) / 2;
      const dist = Math.hypot(sketch.x2 - sketch.x1, sketch.y2 - sketch.y1).toFixed(0);
      return (
        <g onClick={onClick}>
          <line x1={sketch.x1} y1={sketch.y1} x2={sketch.x2} y2={sketch.y2} stroke={stroke} strokeWidth={sw} markerEnd="" />
          <text x={mx} y={my - 6} fontSize="10" fill={stroke} fontWeight="600" textAnchor="middle">{dist}</text>
        </g>
      );
    }
  }
}

function ConstraintsPanel({ width, topOffset, stages, setStages, selectedConstraint, setSelectedConstraint }: { width: number; topOffset: number; stages: number; setStages: (n: number) => void; selectedConstraint: string | null; setSelectedConstraint: (s: string | null) => void }) {
  const constraints = ["Object ID / Name", "Sub Assembly", "Top Sub Assembly", "Bottom Sub Assembly", "Motors", "Propellors"];
  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        bottom: 36,
        left: 74,
        width,
        margin: "var(--spacing-4)",
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-subtle)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--elevation-1)",
        padding: "var(--spacing-5)",
        overflowY: "auto",
        zIndex: 14,
      }}
    >
      <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: C.text, marginBottom: "var(--spacing-4)" }}>Constraints</div>
      <div style={{ marginBottom: "var(--spacing-3)" }}>
        <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, color: C.body, marginBottom: 4 }}>Stages</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "var(--spacing-1) var(--spacing-2)", background: "var(--color-bg-brand-subtle)", borderRadius: 12 }}>
          {Array.from({ length: stages + 1 }).map((_, i) => (
            <span
              key={i}
              onClick={() => { /* could set active stage */ }}
              style={{ padding: "2px 6px", fontSize: "var(--font-size-xs)", fontWeight: 700, color: C.primary, cursor: "pointer" }}
            >
              {i}
            </span>
          ))}
          <button onClick={() => setStages(stages + 1)} title="Add stage" style={{ background: C.primary, color: "var(--color-text-on-brand)", border: "none", borderRadius: 10, width: 18, height: 18, fontSize: 12, fontWeight: 700, cursor: "pointer", marginLeft: 2 }}>+</button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {constraints.map((c) => {
          const sel = selectedConstraint === c;
          return (
            <div
              key={c}
              onClick={() => setSelectedConstraint(sel ? null : c)}
              className="ix-nav"
              style={{
                padding: "var(--spacing-2) var(--spacing-3)",
                fontSize: "var(--font-size-sm)",
                color: sel ? C.primary : C.text,
                background: sel ? "var(--color-bg-brand-subtle)" : "transparent",
                fontWeight: sel ? 700 : 500,
                cursor: "pointer",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {c}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsStrip({ topOffset, width, snap, setSnap }: { topOffset: number; width: number; snap: boolean; setSnap: (b: boolean) => void }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        bottom: 36,
        right: 0,
        width,
        margin: "var(--spacing-4)",
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-subtle)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--elevation-1)",
        padding: "var(--spacing-4)",
        zIndex: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--spacing-2) 0", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)", marginBottom: "var(--spacing-3)" }}>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: C.text }}>Settings</span>
      </div>
      <div
        onClick={() => setOpen((v) => !v)}
        className="ix-nav"
        style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)", padding: "var(--spacing-2) 0", cursor: "pointer", fontSize: "var(--font-size-sm)", fontWeight: 600, color: C.text }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2.6" style={{ transform: open ? "rotate(90deg)" : undefined }}><path d="M9 6l6 6-6 6" /></svg>
        <span>Canvas Settings</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--spacing-3) 0", fontSize: "var(--font-size-sm)", fontWeight: 600, color: C.text }}>
        <span>Snap</span>
        <span
          onClick={() => setSnap(!snap)}
          style={{ width: 32, height: 18, borderRadius: 9, background: snap ? C.primary : "var(--color-bg-surface-raised)", position: "relative", cursor: "pointer" }}
        >
          <span style={{ position: "absolute", top: 2, left: snap ? 16 : 2, width: 14, height: 14, background: "var(--color-bg-surface)", borderRadius: "50%", boxShadow: "0 1px 2px rgba(0,0,0,.25)" }} />
        </span>
      </div>
    </div>
  );
}

export function SketchMode({ topOffset = 132, onExit, onSave, leftWidth = 230, rightWidth = 250 }: { topOffset?: number; onExit: () => void; onSave: () => void; leftWidth?: number; rightWidth?: number }) {
  const [tool, setTool] = React.useState<SketchTool>("line");
  const [sketches, setSketches] = React.useState<Sketch[]>([]);
  const [selectedSketch, setSelectedSketch] = React.useState<string | null>(null);
  const [stages, setStages] = React.useState(1);
  const [selectedConstraint, setSelectedConstraint] = React.useState<string | null>(null);
  const [snap, setSnap] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate from localStorage after mount to keep SSR/CSR in sync.
  React.useEffect(() => { setSketches(readSketchesFromStorage()); setHydrated(true); }, []);
  React.useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(SKETCH_KEY, JSON.stringify(sketches)); } catch {}
  }, [sketches, hydrated]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedSketch) setSketches((arr) => arr.filter((s) => s.id !== selectedSketch));
        else setSketches((arr) => arr.slice(0, -1));
      } else if (e.key === "Escape") setSelectedSketch(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedSketch]);

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: topOffset,
          left: 74 + leftWidth + 32,
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-3)",
          zIndex: 24,
          padding: "var(--spacing-3) 0",
        }}
      >
        <button
          onClick={onSave}
          style={{
            padding: "var(--spacing-2) var(--spacing-5)",
            background: "var(--color-bg-surface)",
            border: `var(--border-width-1-5) solid var(--color-border-brand)`,
            borderRadius: "var(--radius-3xl)",
            color: C.primary,
            cursor: "pointer",
            fontSize: "var(--font-size-sm)",
            fontWeight: 700,
          }}
        >
          Save Changes
        </button>
        <span style={{ color: C.body, fontSize: "var(--font-size-sm)" }}>|</span>
        <button
          onClick={onExit}
          style={{ padding: "var(--spacing-2) var(--spacing-5)", background: "transparent", border: "none", color: C.text, cursor: "pointer", fontSize: "var(--font-size-sm)", fontWeight: 600 }}
        >
          Exit
        </button>
      </div>

      <ConstraintsPanel
        width={leftWidth}
        topOffset={topOffset + 50}
        stages={stages}
        setStages={setStages}
        selectedConstraint={selectedConstraint}
        setSelectedConstraint={setSelectedConstraint}
      />

      <div
        style={{
          position: "absolute",
          top: topOffset + 50,
          bottom: 36 + 16,
          left: 74 + leftWidth + 32,
          right: rightWidth + 32,
          margin: "var(--spacing-4) 0",
          background: "var(--color-bg-surface)",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--elevation-1)",
          zIndex: 13,
        }}
      >
        <SketchPlane
          selectedTool={tool}
          sketches={sketches}
          setSketches={setSketches}
          selectedSketch={selectedSketch}
          onSelectSketch={setSelectedSketch}
        />
        <ToolPalette
          selected={tool}
          onSelect={setTool}
          onUndo={() => setSketches((arr) => arr.slice(0, -1))}
          onClear={() => { setSketches([]); setSelectedSketch(null); }}
        />
      </div>

      <SettingsStrip topOffset={topOffset + 50} width={rightWidth} snap={snap} setSnap={setSnap} />

      <div
        style={{
          position: "absolute",
          left: 84,
          bottom: 56,
          padding: "var(--spacing-2) var(--spacing-5)",
          background: C.primary,
          color: "var(--color-text-on-brand)",
          fontSize: "var(--font-size-xs)",
          fontWeight: 700,
          borderRadius: "var(--radius-3xl)",
          boxShadow: "var(--elevation-2)",
          zIndex: 18,
        }}
      >
        Sketch Mode: On
      </div>
    </>
  );
}
