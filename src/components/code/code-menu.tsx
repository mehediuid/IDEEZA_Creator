"use client";

// CodeMenu — Code module menu bar, inline. Same MENUS + dispatchCodeAction
// from code-menu-strip.tsx so every existing Edit / Settings / Help item
// continues to fire the same window event that BlocklyImpl listens for.
// Pulled out of the original absolute-positioned strip so the TopBar can host
// it on /code (the in-page strip is gone — no duplicate menu rows).

import * as React from "react";
import { C } from "@/lib/pcb/colors";
import { dispatchCodeAction, type CodeAction } from "./code-menu-strip";

type MenuItem = {
  label: string;
  action?: CodeAction;
  shortcut?: string;
  divider?: boolean;
};

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
    {
      label: "Keyboard Shortcuts",
      action: "help:shortcuts",
      shortcut: "⌘K ⌘S",
    },
    { label: "About IDEEZA Code", action: "help:about" },
  ],
};

export function CodeMenu() {
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
                  if (it.action) dispatchCodeAction(it.action);
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
