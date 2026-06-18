"use client";

// IDEEZA Code section — top menu strip + tool icons that appear in every
// Blockly state (Figma 41579:736835 and friends). The Edit/Settings/Help
// labels sit on the left below the breadcrumb; the icon row (copy/paste/cut/
// delete + zoom in/out/100/fit) sits beneath them. The Price-For-Premium-Parts
// label hangs on the right of the labels row.

import { C } from "@/lib/pcb/colors";

const LABELS = ["Edit", "Settings", "Help"];

function ToolIcon({ path }: { path: string }) {
  return (
    <button
      className="ix-tool"
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
        <path d={path} />
      </svg>
    </button>
  );
}

const ICONS: { id: string; path: string }[] = [
  { id: "copy", path: "M8 7V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2 M5 21h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2z" },
  { id: "paste", path: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 4h6v3H9z" },
  { id: "cut", path: "M6 4l8 8-3 3a2.83 2.83 0 1 1-1.41-1.42L12 12 4 4 M14 14l3 3a2.83 2.83 0 1 0 1.41-1.42L17 14z" },
  { id: "trash", path: "M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" },
];

const ZOOM: { id: string; path: string }[] = [
  { id: "fit", path: "M3 3h6 M3 3v6 M21 3h-6 M21 3v6 M3 21h6 M3 21v-6 M21 21h-6 M21 21v-6" },
  { id: "in", path: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M11 8v6 M8 11h6 M20 20l-3.5-3.5" },
  { id: "out", path: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M8 11h6 M20 20l-3.5-3.5" },
  { id: "fullscreen", path: "M3 9V5a2 2 0 0 1 2-2h4 M21 9V5a2 2 0 0 0-2-2h-4 M3 15v4a2 2 0 0 0 2 2h4 M21 15v4a2 2 0 0 0-2 2h-4" },
];

export function CodeMenuStrip() {
  return (
    <>
      {/* Row 1 — Edit / Settings / Help labels + Price */}
      <div
        style={{
          position: "absolute",
          top: 104,
          left: 0,
          right: 0,
          height: 32,
          background: "var(--color-bg-surface)",
          borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
          display: "flex",
          alignItems: "center",
          padding: "0 var(--spacing-10)",
          gap: "var(--spacing-7)",
          zIndex: 15,
        }}
      >
        {LABELS.map((l, i) => (
          <span
            key={l}
            className="ix-menu"
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: 500,
              color: i === 0 ? "var(--color-text-tertiary)" : C.text,
              cursor: "pointer",
              padding: "var(--spacing-1) var(--spacing-3)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {l}
          </span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "var(--font-size-sm)", color: C.body }}>
          Price For Premium Parts:{" "}
          <span style={{ color: C.primary, fontWeight: 700 }}>$0.00</span>
        </span>
      </div>

      {/* Row 2 — tool icons (copy/paste/cut/del + zoom-fit/in/out/full) */}
      <div
        style={{
          position: "absolute",
          top: 136,
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
        {ICONS.map((i) => <ToolIcon key={i.id} path={i.path} />)}
        <div style={{ width: 1, height: 18, background: "var(--color-border-subtle)", margin: "0 var(--spacing-4)" }} />
        {ZOOM.map((z) => <ToolIcon key={z.id} path={z.path} />)}
      </div>
    </>
  );
}
