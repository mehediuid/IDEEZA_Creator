"use client";

// 3D Module — toolbar row (Figma frames 33552:188795 et al). Dense row of
// quick-action icons for the most-used 3D ops. "Sketch" sits at the left as
// the gateway to Sketch Mode; the rest dispatch ThreeActions.

import { C } from "@/lib/pcb/colors";
import { dispatchThreeAction, type ThreeAction } from "./three-menu-bar";

type Tool = { id: ThreeAction | "sketch"; title: string; path: string; fill?: boolean };

// Sketch is a special toolbar entry — labelled, violet-tinted — that flips the
// app into Sketch Mode rather than dispatching a one-shot operation.
const SKETCH: Tool = { id: "sketch", title: "Sketch", path: "M3 17l6-6 4 4 8-8 M14 7h6v6", fill: false };

const TOOLS: Tool[] = [
  { id: "xform:move", title: "Pan (hand)", path: "M9 11V5a2 2 0 1 1 4 0v6 M13 11V4a2 2 0 1 1 4 0v8 M17 12V7a2 2 0 1 1 4 0v8a7 7 0 0 1-7 7h-3a7 7 0 0 1-6-4l-3-6c-.6-1.2-.2-2.7 1-3.3 1.1-.5 2.4-.1 3 1l2 4" },
  { id: "xform:rotate", title: "Pointer / select", path: "M3 3l8 16 2-7 7-2z" },
  { id: "shape:box", title: "Box", path: "M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7" },
  { id: "shape:sphere", title: "Sphere", path: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18" },
  { id: "shape:cylinder", title: "Cylinder", path: "M5 6a7 2 0 1 0 14 0 7 2 0 1 0-14 0z M5 6v12a7 2 0 0 0 14 0V6" },
  { id: "shape:cone", title: "Cone", path: "M12 3l8 16H4z M5 19a7 2 0 0 0 14 0" },
  { id: "shape:torus", title: "Torus", path: "M3 12c0-3 4-6 9-6s9 3 9 6-4 6-9 6-9-3-9-6z M6 12a6 3 0 0 0 12 0 6 3 0 0 0-12 0z" },
  { id: "shape:plane", title: "Plane", path: "M3 18l6-12h12L15 18z" },
  { id: "model:extrude", title: "Extrude", path: "M5 9h10v10H5z M5 9l4-4h10v10l-4 4 M15 9l4-4 M9 19l-4 4" },
  { id: "model:revolve", title: "Revolve", path: "M12 4v16 M4 12a8 4 0 0 0 16 0 8 4 0 0 0-16 0z" },
  { id: "model:sweep", title: "Sweep", path: "M3 18c0-6 6-14 18-6 M16 12l5 0 M21 12l-3 3 M21 12l-3-3" },
  { id: "model:loft", title: "Loft", path: "M4 5h6v3H4z M14 16h6v3h-6z M10 5l4 14 M10 8l4 11" },
  { id: "model:union", title: "Boolean union", path: "M4 8a4 4 0 0 1 8 0v8a4 4 0 0 1-8 0z M12 8a4 4 0 0 1 8 0v8a4 4 0 0 1-8 0z" },
  { id: "model:subtract", title: "Boolean subtract", path: "M4 8a4 4 0 0 1 8 0v8a4 4 0 0 1-8 0z M12 8a4 4 0 0 1 8 0v8a4 4 0 0 1-8 0z M14 8a4 4 0 0 0-2 0v8a4 4 0 0 0 2 0z" },
  { id: "model:intersect", title: "Boolean intersect", path: "M4 8a4 4 0 0 1 8 0v8a4 4 0 0 1-8 0z M12 8a4 4 0 0 1 8 0v8a4 4 0 0 1-8 0z" },
  { id: "model:fillet", title: "Fillet", path: "M4 20V8a4 4 0 0 1 4-4h12" },
  { id: "model:chamfer", title: "Chamfer", path: "M4 20V8l4-4h12" },
  { id: "model:shell", title: "Shell", path: "M5 7h14v12H5z M9 11h6v4H9z" },
  { id: "model:mirror", title: "Mirror", path: "M12 3v18 M5 8l5 4-5 4z M19 8l-5 4 5 4z" },
  { id: "xform:measure", title: "Measure", path: "M3 9l6 12 12-6L15 3z M9 11l1 2 M11 9l1 2 M13 7l1 2" },
  { id: "xform:section", title: "Section view", path: "M3 21L21 3 M3 3h6v6 M15 15h6v6" },
];

function ToolIcon({ tool, isLabel }: { tool: Tool; isLabel?: boolean }) {
  return (
    <button
      className="ix-tool"
      onClick={() => { if (tool.id !== "sketch") dispatchThreeAction(tool.id as ThreeAction); }}
      title={tool.title}
      style={{
        height: 30,
        minWidth: isLabel ? undefined : 30,
        padding: isLabel ? "0 var(--spacing-3)" : 0,
        borderRadius: "var(--radius-md)",
        background: isLabel ? "var(--color-bg-brand-subtle)" : "transparent",
        color: isLabel ? C.primary : "var(--color-text-secondary)",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--spacing-2)",
        cursor: "pointer",
        fontWeight: isLabel ? 600 : 500,
        fontSize: isLabel ? "var(--font-size-sm)" : undefined,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d={tool.path} />
      </svg>
      {isLabel && <span>{tool.title}</span>}
    </button>
  );
}

export function ThreeToolbar({ onSketchClick }: { onSketchClick?: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        // ThreeMenuBar removed (32px above us is now empty); toolbar moves
        // up to sit directly under the TopBar.
        top: 62,
        left: 0,
        right: 0,
        height: 38,
        background: "var(--color-bg-surface)",
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        display: "flex",
        alignItems: "center",
        padding: "0 var(--spacing-6)",
        gap: "var(--spacing-1)",
        zIndex: 15,
        overflowX: "auto",
      }}
    >
      <button
        onClick={() => dispatchThreeAction("ai:generate")}
        className="ix-tool"
        title="Generate a 3D model with AI"
        style={{
          height: 30,
          padding: "0 var(--spacing-4)",
          borderRadius: "var(--radius-md)",
          background: C.primary,
          color: "var(--color-text-on-brand)",
          border: "none",
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-2)",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "var(--font-size-sm)",
          flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.7 4.5L18 9.2l-4.3 1.7L12 15l-1.7-4.1L6 9.2l4.3-1.7z" />
          <path d="M18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
        </svg>
        AI Generate
      </button>
      <div style={{ width: 1, height: 18, background: "var(--color-border-subtle)", margin: "0 var(--spacing-3)" }} />
      <button
        onClick={onSketchClick}
        className="ix-tool"
        title="Enter sketch mode"
        style={{
          height: 30,
          padding: "0 var(--spacing-3)",
          borderRadius: "var(--radius-md)",
          background: "var(--color-bg-brand-subtle)",
          color: C.primary,
          border: "none",
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-2)",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "var(--font-size-sm)",
          flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d={SKETCH.path} />
        </svg>
        Sketch
      </button>
      <div style={{ width: 1, height: 18, background: "var(--color-border-subtle)", margin: "0 var(--spacing-3)" }} />
      {TOOLS.map((t) => <ToolIcon key={t.id} tool={t} />)}
    </div>
  );
}
