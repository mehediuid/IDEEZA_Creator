"use client";

// 3D Module — Sketch Mode overlay (Figma frames 22106:133683, 22106:134375,
// 22117:184927, 22106:135791).
//
// Replaces the demo canvas with a 2D sketch plane: a Constraints panel on
// the left, a Settings strip on the right (Canvas Settings + Snap toggle), a
// floating "Sketch Tools" palette in the centre, the "Save Changes | Exit"
// pink pills at the top, and a "Sketch Mode: On" pink badge bottom-left.

import * as React from "react";
import { C } from "@/lib/pcb/colors";

type SketchTool = { id: string; title: string; path: string };

const SKETCH_TOOLS: SketchTool[] = [
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

export type SketchModeState = {
  active: boolean;
  stage: number; // 0, 1, 2, ...
};

function ToolPalette({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 100,
        transform: "translateX(-50%)",
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--elevation-3)",
        padding: collapsed ? "var(--spacing-2)" : "var(--spacing-3)",
        zIndex: 22,
        minWidth: collapsed ? undefined : 240,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 var(--spacing-2) var(--spacing-2)" }}>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: C.text }}>Sketch Tools</span>
        <button
          onClick={() => setCollapsed((v) => !v)}
          style={{ background: "transparent", border: "none", color: C.body, cursor: "pointer", fontSize: 14 }}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "+" : "—"}
        </button>
      </div>
      {!collapsed && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 28px)", gap: 4 }}>
          {SKETCH_TOOLS.map((t) => {
            const isSel = selected === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className="ix-tool"
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

function SketchPlane() {
  // 2D plane background with both ruler bands and a subtle dotted grid.
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Top ruler */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, background: "var(--color-bg-surface)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        <svg width="100%" height="14" preserveAspectRatio="none" style={{ display: "block" }}>
          <pattern id="rt" width="20" height="14" patternUnits="userSpaceOnUse">
            <line x1="0" y1="7" x2="0" y2="14" stroke="var(--color-text-tertiary)" strokeWidth="0.6" />
            <line x1="10" y1="11" x2="10" y2="14" stroke="var(--color-text-tertiary)" strokeWidth="0.4" />
          </pattern>
          <rect width="100%" height="14" fill="url(#rt)" />
        </svg>
      </div>
      {/* Left ruler */}
      <div style={{ position: "absolute", top: 14, left: 0, bottom: 0, width: 14, background: "var(--color-bg-surface)", borderRight: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        <svg width="14" height="100%" preserveAspectRatio="none" style={{ display: "block" }}>
          <pattern id="rl" width="14" height="20" patternUnits="userSpaceOnUse">
            <line x1="7" y1="0" x2="14" y2="0" stroke="var(--color-text-tertiary)" strokeWidth="0.6" />
            <line x1="11" y1="10" x2="14" y2="10" stroke="var(--color-text-tertiary)" strokeWidth="0.4" />
          </pattern>
          <rect width="14" height="100%" fill="url(#rl)" />
        </svg>
      </div>
      {/* Drawing surface (dotted grid) */}
      <div style={{ position: "absolute", top: 14, left: 14, right: 0, bottom: 0, background: "var(--color-bg-page)" }}>
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <pattern id="sketch-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="0.5" cy="0.5" r="0.7" fill="var(--color-text-tertiary)" opacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sketch-grid)" />
        </svg>
      </div>
    </div>
  );
}

function ConstraintsPanel({
  width,
  topOffset,
}: {
  width: number;
  topOffset: number;
}) {
  const constraints = [
    "Object ID / Name",
    "Sub Assembly",
    "Top Sub Assembly",
    "Bottom Sub Assembly",
    "Motors",
    "Propellors",
  ];
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
        <div style={{ display: "inline-flex", padding: "var(--spacing-2) var(--spacing-3)", background: "var(--color-bg-brand-subtle)", color: C.primary, fontSize: "var(--font-size-xs)", fontWeight: 700, borderRadius: 12 }}>
          0 · 1 · +
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {constraints.map((c) => (
          <div
            key={c}
            className="ix-nav"
            style={{
              padding: "var(--spacing-2) var(--spacing-3)",
              fontSize: "var(--font-size-sm)",
              color: C.text,
              cursor: "pointer",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsStrip({ topOffset, width }: { topOffset: number; width: number }) {
  const [snap, setSnap] = React.useState(false);
  const [open, setOpen] = React.useState(false);
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.7">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
      <div
        onClick={() => setOpen((v) => !v)}
        className="ix-nav"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-2)",
          padding: "var(--spacing-2) 0",
          cursor: "pointer",
          fontSize: "var(--font-size-sm)",
          fontWeight: 600,
          color: C.text,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2.6" style={{ transform: open ? "rotate(90deg)" : undefined }}>
          <path d="M9 6l6 6-6 6" />
        </svg>
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

export function SketchMode({
  topOffset = 132,
  onExit,
  onSave,
  leftWidth = 230,
  rightWidth = 250,
}: {
  topOffset?: number;
  onExit: () => void;
  onSave: () => void;
  leftWidth?: number;
  rightWidth?: number;
}) {
  const [selectedTool, setSelectedTool] = React.useState<string | null>("line");

  return (
    <>
      {/* Save / Exit pills */}
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
          className="ix-btn"
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
          className="ix-btn"
          style={{
            padding: "var(--spacing-2) var(--spacing-5)",
            background: "transparent",
            border: "none",
            color: C.text,
            cursor: "pointer",
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
          }}
        >
          Exit
        </button>
      </div>

      <ConstraintsPanel width={leftWidth} topOffset={topOffset + 50} />

      {/* Sketch viewport */}
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
        <SketchPlane />
        <ToolPalette selected={selectedTool} onSelect={setSelectedTool} />
      </div>

      <SettingsStrip topOffset={topOffset + 50} width={rightWidth} />

      {/* Sketch Mode: On badge */}
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
