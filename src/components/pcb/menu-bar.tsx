"use client";

// IDEEZA Creator Panel — app menu bar.
// Renders inline (suitable for embedding in the TopBar middle slot) using the
// existing buildMenus / buildMenus2D / buildMenus3D definitions from the PCB
// data layer. ALL original items + handlers are preserved — Edit (Undo / Redo
// / Cut / Copy / Paste / Delete / Find / …), View (Zoom / Fit / Grid / panel
// toggles / Highlight Net), Place (Component / Track / Pad / Via / Polygon /
// Schematic primitives in 2D mode), Design (Schematic→PCB / JLCPCB / DRC /
// Annotate), Layout (Align / Distribute / Bring to Front / Send to Back),
// Tools (Layer / Net Class / Device / Footprint Manager / Auto Router / …),
// Export (PDF / Gerber / BOM / Altium / KiCad / Eagle), Import (DXF /
// Schematic / Netlist / Library / Altium / KiCad), Setting (System / Drawing
// / Hotkey / Property / Save), Help (Documentation / Shortcuts / Community /
// About). 2D mode uses buildMenus2D; 3D mode uses buildMenus3D.

import * as React from "react";
import { DsIcon } from "@/lib/pcb/icons";
import { buildMenus, buildMenus2D, buildMenus3D, buildMenusSchematic } from "@/lib/pcb/data";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

type MenuSub = {
  divider?: boolean;
  label?: string;
  k?: string;
  icon?: string;
  fg?: string;
  onClick?: () => void;
};
type MenuItem = {
  divider?: boolean;
  label?: string;
  k?: string;
  icon?: string;
  submenu?: boolean;
  hasSub?: boolean;
  sub?: MenuSub[];
  onClick?: () => void;
};

const chevron = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2.4">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export function MenuBar() {
  const state = usePcbState();
  const actions = usePcbActions();
  const menus =
    state.mode === "3d"
      ? buildMenus3D(state, actions)
      : state.mode === "2d"
      ? buildMenus2D(state, actions)
      : state.mode === "schematic"
      ? buildMenusSchematic(state, actions)
      : buildMenus(state, actions);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Click-outside + Esc → close any open menu. Previously pcb-app.tsx's full-
  // viewport click-catcher handled this, but that only renders on /pcb. Now
  // the menu bar is everywhere, so we colocate the dismiss behavior here.
  React.useEffect(() => {
    if (!state.openMenu) return;
    const onDoc = (e: MouseEvent) => {
      const el = containerRef.current;
      if (el && !el.contains(e.target as Node)) actions.closeAll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") actions.closeAll();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [state.openMenu, actions]);

  return (
    <div
      ref={containerRef}
      role="menubar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        marginLeft: "var(--spacing-12)",
      }}
    >
      {menus.map((m) => (
        <div key={m.label} style={{ position: "relative" }}>
          <button
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={!!m.open}
            className="ix-menu"
            onClick={m.toggle}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              background: m.open ? "var(--color-bg-brand-subtle)" : "transparent",
              border: "none",
              color: m.open
                ? "var(--color-violet-600)"
                : "var(--color-text-primary)",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "inherit",
              transition: "background .14s, color .14s",
            }}
            onMouseEnter={(e) => {
              if (m.open) return;
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--color-bg-surface-raised)";
            }}
            onMouseLeave={(e) => {
              if (m.open) return;
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
            }}
          >
            <span>{m.label}</span>
            <span style={{ color: "var(--color-text-tertiary)", fontSize: 11 }}>
              {m.key}
            </span>
          </button>

          {m.open && (
            <div
              role="menu"
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                minWidth: 262,
                background: "var(--color-bg-surface)",
                border: "var(--border-width-1) solid var(--color-border-default)",
                borderRadius: "var(--radius-xl)",
                boxShadow: "var(--elevation-6, 0 16px 40px -8px rgba(0,0,0,.22))",
                padding: "var(--spacing-3)",
                zIndex: 60,
                animation: "ideeza-pop .16s cubic-bezier(.2,.9,.3,1.2)",
              }}
            >
              {m.items.map((it: MenuItem, idx: number) =>
                it.divider ? (
                  <div
                    key={idx}
                    style={{
                      height: 1,
                      background: "var(--color-border-subtle)",
                      margin: "var(--spacing-2) var(--spacing-5)",
                    }}
                  />
                ) : (
                  <div
                    key={idx}
                    role="menuitem"
                    className="ix-mi"
                    onClick={it.onClick}
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--spacing-6)",
                      padding: "var(--spacing-4) var(--spacing-6)",
                      borderRadius: "var(--radius-lg)",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: 17,
                        height: 17,
                        flex: "0 0 auto",
                        color: "var(--color-text-secondary)",
                        display: "inline-flex",
                      }}
                    >
                      <DsIcon name={it.icon} size={16} />
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-primary)",
                        fontWeight: 500,
                      }}
                    >
                      {it.label}
                    </span>
                    {it.submenu && chevron}
                    <span
                      className="ix-mi-k"
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      {it.k}
                    </span>

                    {it.hasSub && (
                      <div
                        className="ix-submenu"
                        style={{
                          display: "none",
                          position: "absolute",
                          left: "100%",
                          top: -8,
                          marginLeft: "var(--spacing-2)",
                          minWidth: 232,
                          background: "var(--color-bg-surface)",
                          border:
                            "var(--border-width-1) solid var(--color-border-default)",
                          borderRadius: "var(--radius-xl)",
                          boxShadow:
                            "var(--elevation-6, 0 16px 40px -8px rgba(0,0,0,.22))",
                          padding: "var(--spacing-3)",
                          zIndex: 62,
                        }}
                      >
                        {it.sub?.map((su: MenuSub, j: number) =>
                          su.divider ? (
                            <div
                              key={j}
                              style={{
                                height: 1,
                                background: "var(--color-border-subtle)",
                                margin: "var(--spacing-2) var(--spacing-5)",
                              }}
                            />
                          ) : (
                            <div
                              key={j}
                              className="ix-mi"
                              onClick={su.onClick}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "var(--spacing-6)",
                                padding: "var(--spacing-4) var(--spacing-6)",
                                borderRadius: "var(--radius-lg)",
                                cursor: "pointer",
                              }}
                            >
                              <span
                                style={{
                                  width: 17,
                                  height: 17,
                                  flex: "0 0 auto",
                                  color: "var(--color-text-secondary)",
                                  display: "inline-flex",
                                }}
                              >
                                <DsIcon name={su.icon} size={16} />
                              </span>
                              <span
                                style={{
                                  flex: 1,
                                  fontSize: "var(--font-size-sm)",
                                  color: su.fg,
                                  fontWeight: 500,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {su.label}
                              </span>
                              <span
                                className="ix-mi-k"
                                style={{
                                  fontSize: "var(--font-size-xs)",
                                  color: "var(--color-text-tertiary)",
                                }}
                              >
                                {su.k}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
