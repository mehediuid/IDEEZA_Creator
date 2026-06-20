"use client";

// IDEEZA Code section — top menu strip + tool icons that appear in every
// Blockly state (Figma 41579:736835 et al). Edit/Settings/Help open real
// dropdowns; tool icons fire window events that BlocklyImpl listens for.

import * as React from "react";
import { C } from "@/lib/pcb/colors";

export type CodeAction =
  | "edit:undo"
  | "edit:redo"
  | "edit:cut"
  | "edit:copy"
  | "edit:paste"
  | "edit:delete"
  | "edit:duplicate"
  | "edit:selectAll"
  | "edit:find"
  | "settings:toggleGrid"
  | "settings:toggleTrashcan"
  | "settings:clearWorkspace"
  | "settings:exportXml"
  | "settings:importXml"
  | "settings:theme:light"
  | "settings:theme:dark"
  | "help:docs"
  | "help:shortcuts"
  | "help:about"
  | "tool:copy"
  | "tool:paste"
  | "tool:cut"
  | "tool:delete"
  | "tool:zoomFit"
  | "tool:zoomIn"
  | "tool:zoomOut"
  | "tool:fullscreen";

export const CODE_EVENT = "ideeza:code-action";

export function dispatchCodeAction(action: CodeAction) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CODE_EVENT, { detail: { action } }));
  }
}

type MenuItem = { label: string; action?: CodeAction; shortcut?: string; divider?: boolean };

const MENUS: Record<string, MenuItem[]> = {
  Edit: [
    { label: "Undo", action: "edit:undo", shortcut: "⌘Z" },
    { label: "Redo", action: "edit:redo", shortcut: "⇧⌘Z" },
    { label: "", divider: true },
    { label: "Cut", action: "edit:cut", shortcut: "⌘X" },
    { label: "Copy", action: "edit:copy", shortcut: "⌘C" },
    { label: "Paste", action: "edit:paste", shortcut: "⌘V" },
    { label: "Duplicate", action: "edit:duplicate", shortcut: "⌘D" },
    { label: "Delete", action: "edit:delete", shortcut: "⌫" },
    { label: "", divider: true },
    { label: "Find", action: "edit:find", shortcut: "⌘F" },
    { label: "Select All", action: "edit:selectAll", shortcut: "⌘A" },
  ],
  Settings: [
    { label: "Toggle Grid", action: "settings:toggleGrid" },
    { label: "Toggle Trashcan", action: "settings:toggleTrashcan" },
    { label: "", divider: true },
    { label: "Theme: Light", action: "settings:theme:light" },
    { label: "Theme: Dark", action: "settings:theme:dark" },
    { label: "", divider: true },
    { label: "Export Workspace…", action: "settings:exportXml" },
    { label: "Import Workspace…", action: "settings:importXml" },
    { label: "", divider: true },
    { label: "Clear Workspace", action: "settings:clearWorkspace" },
  ],
  Help: [
    { label: "Documentation", action: "help:docs" },
    { label: "Keyboard Shortcuts", action: "help:shortcuts", shortcut: "⌘K ⌘S" },
    { label: "About IDEEZA Code", action: "help:about" },
  ],
};

const ICONS: { id: CodeAction; path: string; title: string }[] = [
  { id: "tool:copy", title: "Copy", path: "M8 7V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2 M5 21h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2z" },
  { id: "tool:paste", title: "Paste", path: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 4h6v3H9z" },
  { id: "tool:cut", title: "Cut", path: "M6 4l8 8-3 3a2.83 2.83 0 1 1-1.41-1.42L12 12 4 4 M14 14l3 3a2.83 2.83 0 1 0 1.41-1.42L17 14z" },
  { id: "tool:delete", title: "Delete", path: "M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" },
];

const ZOOMS: { id: CodeAction; path: string; title: string }[] = [
  { id: "tool:zoomFit", title: "Zoom to fit", path: "M3 3h6 M3 3v6 M21 3h-6 M21 3v6 M3 21h6 M3 21v-6 M21 21h-6 M21 21v-6" },
  { id: "tool:zoomIn", title: "Zoom in", path: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M11 8v6 M8 11h6 M20 20l-3.5-3.5" },
  { id: "tool:zoomOut", title: "Zoom out", path: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M8 11h6 M20 20l-3.5-3.5" },
  { id: "tool:fullscreen", title: "Fullscreen", path: "M3 9V5a2 2 0 0 1 2-2h4 M21 9V5a2 2 0 0 0-2-2h-4 M3 15v4a2 2 0 0 0 2 2h4 M21 15v4a2 2 0 0 0-2 2h-4" },
];

function ToolIcon({ icon }: { icon: { id: CodeAction; path: string; title: string } }) {
  return (
    <button
      className="ix-tool"
      onClick={() => dispatchCodeAction(icon.id)}
      title={icon.title}
      style={{
        width: 28,
        height: 28,
        borderRadius: "var(--radius-md)",
        background: "transparent",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--color-text-secondary)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon.path} />
      </svg>
    </button>
  );
}

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
                onClick={() => { if (it.action) dispatchCodeAction(it.action); }}
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

export function CodeMenuStrip() {
  // Menus moved into the TopBar (see CodeMenu). This component now only
  // renders the tool-icons row (Copy / Paste / Cut / Delete / Zoom Fit /
  // Zoom In / Zoom Out / Fullscreen) — same icons, same dispatch behavior.
  // The labels row is gone since duplicating menus would be confusing.
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: 104,
        left: 0,
        right: 0,
        height: 36,
        background: "var(--color-bg-surface)",
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        display: "flex",
        alignItems: "center",
        padding: "0 var(--spacing-8)",
        gap: "var(--spacing-1)",
        zIndex: 15,
      }}
    >
      {ICONS.map((i) => (
        <ToolIcon key={i.id} icon={i} />
      ))}
      <div
        style={{
          width: 1,
          height: 18,
          background: "var(--color-border-subtle)",
          margin: "0 var(--spacing-4)",
        }}
      />
      {ZOOMS.map((z) => (
        <ToolIcon key={z.id} icon={z} />
      ))}
    </div>
  );
}
