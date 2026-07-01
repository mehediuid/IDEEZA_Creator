"use client";

// 3D Module — top menu bar (Figma frames 33552:188795 and friends).
// Five labels: Shape Creation / Modeling Operation / Transformation & Utilities
// / Settings / Help. Each opens a dropdown with related operations. A Price
// strip on the right mirrors the chrome we use on /code and /pcb.

import * as React from "react";
import { C } from "@/lib/pcb/colors";

export const THREE_EVENT = "ideeza:three-action";

export type ThreeAction =
  // AI
  | "ai:generate"
  // Shape Creation
  | "shape:box" | "shape:sphere" | "shape:cylinder" | "shape:cone" | "shape:torus" | "shape:plane" | "shape:spline" | "shape:sketch" | "shape:import"
  // Modeling Operation
  | "model:extrude" | "model:revolve" | "model:sweep" | "model:loft" | "model:fillet" | "model:chamfer" | "model:shell" | "model:union" | "model:subtract" | "model:intersect" | "model:mirror" | "model:pattern"
  // Transformation & Utilities
  | "xform:move" | "xform:rotate" | "xform:scale" | "xform:copy" | "xform:align" | "xform:group" | "xform:measure" | "xform:section" | "xform:hide" | "xform:lock"
  // Settings
  | "settings:preferences" | "settings:units" | "settings:grid" | "settings:snap" | "settings:theme" | "settings:resetView" | "settings:resetScene"
  // Help
  | "help:docs" | "help:shortcuts" | "help:about";

export function dispatchThreeAction(action: ThreeAction) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(THREE_EVENT, { detail: { action } }));
  }
}

type MenuItem = { label: string; action?: ThreeAction; shortcut?: string; divider?: boolean };

const MENUS: Record<string, MenuItem[]> = {
  "Shape Creation": [
    { label: "Box", action: "shape:box", shortcut: "B" },
    { label: "Sphere", action: "shape:sphere", shortcut: "S" },
    { label: "Cylinder", action: "shape:cylinder", shortcut: "Y" },
    { label: "Cone", action: "shape:cone" },
    { label: "Torus", action: "shape:torus" },
    { label: "Plane", action: "shape:plane", shortcut: "P" },
    { label: "Spline", action: "shape:spline" },
    { label: "", divider: true },
    { label: "Sketch…", action: "shape:sketch", shortcut: "⌘K" },
    { label: "Import 3D File…", action: "shape:import", shortcut: "⌘O" },
  ],
  "Modeling Operation": [
    { label: "Extrude", action: "model:extrude", shortcut: "E" },
    { label: "Revolve", action: "model:revolve", shortcut: "R" },
    { label: "Sweep", action: "model:sweep" },
    { label: "Loft", action: "model:loft" },
    { label: "", divider: true },
    { label: "Fillet", action: "model:fillet", shortcut: "F" },
    { label: "Chamfer", action: "model:chamfer", shortcut: "C" },
    { label: "Shell", action: "model:shell" },
    { label: "", divider: true },
    { label: "Boolean Union", action: "model:union", shortcut: "⌘U" },
    { label: "Boolean Subtract", action: "model:subtract", shortcut: "⌘-" },
    { label: "Boolean Intersect", action: "model:intersect" },
    { label: "", divider: true },
    { label: "Mirror", action: "model:mirror", shortcut: "M" },
    { label: "Pattern…", action: "model:pattern" },
  ],
  "Transformation & Utilities": [
    { label: "Move", action: "xform:move", shortcut: "G" },
    { label: "Rotate", action: "xform:rotate", shortcut: "R" },
    { label: "Scale", action: "xform:scale", shortcut: "S" },
    { label: "Copy", action: "xform:copy", shortcut: "⌘C" },
    { label: "Align…", action: "xform:align" },
    { label: "Group", action: "xform:group", shortcut: "⌘G" },
    { label: "", divider: true },
    { label: "Measure", action: "xform:measure" },
    { label: "Section View", action: "xform:section" },
    { label: "", divider: true },
    { label: "Hide", action: "xform:hide", shortcut: "H" },
    { label: "Lock", action: "xform:lock", shortcut: "L" },
  ],
  Settings: [
    { label: "Preferences…", action: "settings:preferences", shortcut: "⌘," },
    { label: "Units…", action: "settings:units" },
    { label: "", divider: true },
    { label: "Grid…", action: "settings:grid" },
    { label: "Snap…", action: "settings:snap" },
    { label: "", divider: true },
    { label: "Theme: Light / Dark", action: "settings:theme" },
    { label: "Reset View", action: "settings:resetView", shortcut: "0" },
    { label: "Reset Scene", action: "settings:resetScene" },
  ],
  Help: [
    { label: "Documentation", action: "help:docs" },
    { label: "Keyboard Shortcuts", action: "help:shortcuts", shortcut: "⌘K ⌘S" },
    { label: "About 3D Module", action: "help:about" },
  ],
};

function MenuLabel({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <div style={{ position: "relative" }}>
      <span
        className="ix-menu"
        onClick={onToggle}
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: 500,
          color: open ? C.primary : C.text,
          cursor: "pointer",
          padding: "var(--spacing-1) var(--spacing-3)",
          borderRadius: "var(--radius-sm)",
          background: open ? "var(--color-bg-brand-subtle)" : "transparent",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            minWidth: 240,
            background: "var(--color-bg-surface)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--elevation-3)",
            zIndex: 40,
            padding: "var(--spacing-2) 0",
          }}
        >
          {MENUS[label].map((it, i) =>
            it.divider ? (
              <div key={`d-${i}`} style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-2) var(--spacing-3)" }} />
            ) : (
              <div
                key={it.label}
                className="ix-menu"
                onClick={() => { if (it.action) dispatchThreeAction(it.action); }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "var(--spacing-2) var(--spacing-4)",
                  fontSize: "var(--font-size-sm)",
                  cursor: "pointer",
                  color: C.text,
                }}
              >
                <span>{it.label}</span>
                {it.shortcut && <span style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-xs)" }}>{it.shortcut}</span>}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function ThreeMenuBar() {
  const [open, setOpen] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: 62,
        left: 0,
        right: 0,
        height: 32,
        background: "var(--color-bg-surface)",
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        display: "flex",
        alignItems: "center",
        padding: "0 var(--spacing-10)",
        gap: "var(--spacing-7)",
        // Above the toolbar (z=15), the rail (z=16), and the side panels (z=14)
        // so dropdowns float on top of every chrome layer.
        zIndex: 25,
      }}
    >
      {Object.keys(MENUS).map((l) => (
        <MenuLabel
          key={l}
          label={l}
          open={open === l}
          onToggle={() => setOpen(open === l ? null : l)}
        />
      ))}
    </div>
  );
}
