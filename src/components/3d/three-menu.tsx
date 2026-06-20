"use client";

// ThreeMenu — 3D Module menu bar, inline. Same MENUS + dispatchThreeAction
// from three-menu-bar.tsx so every existing Shape Creation / Modeling
// Operation / Transformation & Utilities / Settings / Help item continues to
// fire the same window event that ThreeApp listens for.

import * as React from "react";
import { C } from "@/lib/pcb/colors";
import { dispatchThreeAction, type ThreeAction } from "./three-menu-bar";

type MenuItem = {
  label: string;
  action?: ThreeAction;
  shortcut?: string;
  divider?: boolean;
};

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
    {
      label: "Keyboard Shortcuts",
      action: "help:shortcuts",
      shortcut: "⌘K ⌘S",
    },
    { label: "About 3D Module", action: "help:about" },
  ],
};

export function ThreeMenu() {
  const [open, setOpen] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      role="menubar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-7)",
        marginLeft: "var(--spacing-12)",
      }}
    >
      {Object.keys(MENUS).map((label) => (
        <MenuLabel
          key={label}
          label={label}
          items={MENUS[label]}
          open={open === label}
          onToggle={() => setOpen(open === label ? null : label)}
          onSelect={() => setOpen(null)}
        />
      ))}
    </div>
  );
}

function MenuLabel({
  label,
  items,
  open,
  onToggle,
  onSelect,
}: {
  label: string;
  items: MenuItem[];
  open: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <button
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        className="ix-menu"
        onClick={onToggle}
        onMouseEnter={(e) => {
          if (open) return;
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--color-bg-surface-raised)";
        }}
        onMouseLeave={(e) => {
          if (open) return;
          (e.currentTarget as HTMLButtonElement).style.background =
            "transparent";
        }}
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: open ? C.primary : C.text,
          cursor: "pointer",
          padding: "8px 12px",
          borderRadius: "var(--radius-md)",
          background: open ? "var(--color-bg-brand-subtle)" : "transparent",
          border: "none",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
          transition: "background .14s, color .14s",
        }}
      >
        {label}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: 240,
            background: "var(--color-bg-surface)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--elevation-3, 0 16px 40px -8px rgba(0,0,0,.22))",
            zIndex: 60,
            padding: "var(--spacing-2) 0",
          }}
        >
          {items.map((it, i) =>
            it.divider ? (
              <div
                key={`d-${i}`}
                style={{
                  height: 1,
                  background: "var(--color-border-subtle)",
                  margin: "var(--spacing-2) var(--spacing-3)",
                }}
              />
            ) : (
              <div
                key={it.label}
                role="menuitem"
                className="ix-menu"
                onClick={() => {
                  if (it.action) dispatchThreeAction(it.action);
                  onSelect();
                }}
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
                {it.shortcut && (
                  <span
                    style={{
                      color: "var(--color-text-tertiary)",
                      fontSize: "var(--font-size-xs)",
                    }}
                  >
                    {it.shortcut}
                  </span>
                )}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
