"use client";

// Wiring module — TopBar menu. A single "Draw" dropdown holding the wire-tool
// family. Picking a tool arms the canvas draw flow. The active tool is
// highlighted so the user always knows what's selected.

import * as React from "react";
import { WIRE_TOOLS } from "@/lib/wiring/types";
import { useWiring } from "./wiring-context";

export function WiringMenu() {
  const { tool, setTool } = useWiring();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", marginLeft: "var(--spacing-12)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
          borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
          background: open ? "var(--color-bg-brand-subtle)" : "transparent",
          color: open ? "var(--color-violet-600)" : "var(--color-text-primary)",
          fontSize: 13, fontWeight: 500, fontFamily: "inherit",
        }}
      >
        Draw
        <span style={{ color: "var(--color-text-tertiary)", fontSize: 11 }}>D</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {tool && (
        <span style={{ marginLeft: 8, fontSize: 12, color: "var(--color-violet-600)", fontWeight: 600 }}>
          {WIRE_TOOLS.find((t) => t.id === tool)?.label.replace("Peripheral ", "")}
        </span>
      )}

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", top: "100%", left: 0, marginTop: 4, minWidth: 320,
            background: "var(--color-bg-surface)", border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-xl)", boxShadow: "var(--elevation-6, 0 16px 40px -8px rgba(0,0,0,.22))",
            padding: "var(--spacing-3)", zIndex: 62,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--color-text-tertiary)", padding: "6px 10px 4px" }}>
            Peripheral Wire Tools
          </div>
          {WIRE_TOOLS.map((t) => {
            const active = tool === t.id;
            return (
              <button
                key={t.id}
                role="menuitem"
                onClick={() => { setTool(active ? null : t.id); setOpen(false); }}
                className="ix-menu"
                style={{
                  display: "flex", flexDirection: "column", gap: 2, width: "100%", textAlign: "left",
                  padding: "var(--spacing-4) var(--spacing-5)", borderRadius: "var(--radius-md)",
                  border: "none", cursor: "pointer",
                  background: active ? "var(--color-bg-brand-subtle)" : "transparent",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--font-size-sm)", fontWeight: 600, color: active ? "var(--color-text-brand)" : "var(--color-text-primary)" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 18c6-10 10 4 16-6" /></svg>
                  {t.label}
                  {active && <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--color-violet-600)" }}>● active</span>}
                </span>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", paddingLeft: 23 }}>{t.hint}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
