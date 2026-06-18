"use client";

// 3D Module — modal dispatcher for menu items that need a form or info dialog:
// Preferences, Units, Grid, Snap, Align, Pattern, Section, Measure, About,
// Shortcuts, Documentation. Each is a small dialog rendered above a scrim.

import * as React from "react";
import { C } from "@/lib/pcb/colors";

export type ModalId =
  | "preferences" | "units" | "grid" | "snap"
  | "align" | "pattern" | "section" | "measure"
  | "about" | "shortcuts" | "docs" | null;

function Frame({ title, children, onClose, footer, width = 460 }: { title: string; children: React.ReactNode; onClose: () => void; footer?: React.ReactNode; width?: number }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.32)", zIndex: 80 }} />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width,
          padding: "var(--spacing-7)",
          background: "var(--color-bg-surface)",
          color: C.text,
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--elevation-5)",
          zIndex: 81,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-5)" }}>
          <span style={{ fontSize: "var(--font-size-xl)", fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "var(--color-text-tertiary)" }}>×</button>
        </div>
        {children}
        {footer && <div style={{ display: "flex", gap: "var(--spacing-3)", justifyContent: "flex-end", marginTop: "var(--spacing-6)" }}>{footer}</div>}
      </div>
    </>
  );
}

function Btn({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "var(--spacing-3) var(--spacing-6)",
        border: primary ? "none" : "var(--border-width-1-5) solid var(--color-border-default)",
        background: primary ? C.primary : "var(--color-bg-surface)",
        color: primary ? "var(--color-text-on-brand)" : C.text,
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        fontSize: "var(--font-size-md)",
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--spacing-3) 0", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
      <span style={{ fontSize: "var(--font-size-sm)", color: C.text, fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}

const SHORTCUTS: { combo: string; what: string }[] = [
  { combo: "G", what: "Move tool" },
  { combo: "R", what: "Rotate tool" },
  { combo: "S", what: "Scale tool" },
  { combo: "Esc", what: "Deselect / cancel transform" },
  { combo: "Del / Backspace", what: "Delete selection" },
  { combo: "⌘D", what: "Duplicate selection" },
  { combo: "H", what: "Hide / show selection" },
  { combo: "L", what: "Lock / unlock selection" },
  { combo: "B", what: "Add box" },
  { combo: "Y", what: "Add cylinder" },
  { combo: "0", what: "Reset view" },
];

export function ThreeModals({
  modal,
  onClose,
  onPatternApply,
  onAlignApply,
}: {
  modal: ModalId;
  onClose: () => void;
  onPatternApply: (count: number) => void;
  onAlignApply: (axis: "x" | "y" | "z") => void;
}) {
  const [patternN, setPatternN] = React.useState(3);
  const [alignAxis, setAlignAxis] = React.useState<"x" | "y" | "z">("x");

  if (!modal) return null;

  switch (modal) {
    case "preferences":
      return (
        <Frame title="Preferences" onClose={onClose} footer={<Btn primary onClick={onClose}>Done</Btn>}>
          <Row label="Auto-save"><span style={{ color: C.primary, fontWeight: 700, fontSize: "var(--font-size-sm)" }}>On (localStorage)</span></Row>
          <Row label="Default camera"><span style={{ color: C.body, fontSize: "var(--font-size-sm)" }}>Perspective · 45°</span></Row>
          <Row label="Wheel zoom"><span style={{ color: C.body, fontSize: "var(--font-size-sm)" }}>Enabled</span></Row>
          <Row label="Sound effects"><span style={{ color: C.body, fontSize: "var(--font-size-sm)" }}>Off</span></Row>
        </Frame>
      );
    case "units":
      return (
        <Frame title="Units" onClose={onClose} footer={<Btn primary onClick={onClose}>Done</Btn>}>
          <Row label="Length"><span style={{ color: C.body, fontSize: "var(--font-size-sm)" }}>millimetres (mm)</span></Row>
          <Row label="Angle"><span style={{ color: C.body, fontSize: "var(--font-size-sm)" }}>degrees</span></Row>
          <Row label="Mass"><span style={{ color: C.body, fontSize: "var(--font-size-sm)" }}>grams (g)</span></Row>
        </Frame>
      );
    case "grid":
      return (
        <Frame title="Grid" onClose={onClose} footer={<Btn primary onClick={onClose}>Close</Btn>}>
          <p style={{ fontSize: "var(--font-size-sm)", color: C.body, marginBottom: "var(--spacing-3)" }}>
            Grid spacing is controlled by the Canvas Settings → Grid Size dropdown
            in the right panel (IDEEZA-100 / 50 / 25 / 10). Active grid cells
            are visualised in the viewport.
          </p>
        </Frame>
      );
    case "snap":
      return (
        <Frame title="Snap" onClose={onClose} footer={<Btn primary onClick={onClose}>Close</Btn>}>
          <p style={{ fontSize: "var(--font-size-sm)", color: C.body }}>
            Per-axis snap toggles live in Canvas Settings. When on, transform
            gizmos snap the moved shape to the active grid step on that axis.
          </p>
        </Frame>
      );
    case "align":
      return (
        <Frame title="Align selection" onClose={onClose} footer={<>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn primary onClick={() => onAlignApply(alignAxis)}>Align</Btn>
        </>}>
          <p style={{ fontSize: "var(--font-size-sm)", color: C.body, marginBottom: "var(--spacing-4)" }}>Move the selected shape so that the chosen axis is zero.</p>
          <div style={{ display: "flex", gap: "var(--spacing-3)" }}>
            {(["x", "y", "z"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAlignAxis(a)}
                style={{
                  flex: 1,
                  padding: "var(--spacing-3)",
                  border: `var(--border-width-1-5) solid ${alignAxis === a ? "var(--color-border-brand)" : "var(--color-border-default)"}`,
                  background: alignAxis === a ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
                  color: alignAxis === a ? C.primary : C.text,
                  borderRadius: "var(--radius-md)",
                  fontWeight: 700,
                  fontSize: "var(--font-size-md)",
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </Frame>
      );
    case "pattern":
      return (
        <Frame title="Linear pattern" onClose={onClose} footer={<>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn primary onClick={() => onPatternApply(patternN)}>Apply</Btn>
        </>}>
          <p style={{ fontSize: "var(--font-size-sm)", color: C.body, marginBottom: "var(--spacing-4)" }}>Duplicate the selected shape along the X axis.</p>
          <Row label={`Count: ${patternN}`}>
            <input type="range" min={1} max={10} value={patternN} onChange={(e) => setPatternN(Number(e.target.value))} style={{ accentColor: "var(--color-violet-600)", width: 180 }} />
          </Row>
        </Frame>
      );
    case "section":
      return (
        <Frame title="Section view" onClose={onClose} footer={<Btn primary onClick={onClose}>OK</Btn>}>
          <p style={{ fontSize: "var(--font-size-sm)", color: C.body }}>
            Section view will clip the model along a chosen plane — preview only
            in this build.
          </p>
        </Frame>
      );
    case "measure":
      return (
        <Frame title="Measure" onClose={onClose} footer={<Btn primary onClick={onClose}>OK</Btn>}>
          <p style={{ fontSize: "var(--font-size-sm)", color: C.body }}>
            Click two points in the viewport to measure their distance. Live
            distance to the cursor is shown in the right panel's Mouse Information
            row.
          </p>
        </Frame>
      );
    case "about":
      return (
        <Frame title="About IDEEZA 3D Module" onClose={onClose} footer={<Btn primary onClick={onClose}>Done</Btn>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-3)", fontSize: "var(--font-size-sm)", color: C.body }}>
            <p>Built on three.js + @react-three/fiber + @react-three/drei.</p>
            <p>All shape ops, transforms, selections, and panel state persist to your browser's localStorage.</p>
            <p style={{ color: C.text, fontWeight: 600 }}>© IDEEZA Labs · v0.2.</p>
          </div>
        </Frame>
      );
    case "shortcuts":
      return (
        <Frame title="Keyboard shortcuts" onClose={onClose} footer={<Btn primary onClick={onClose}>Got it</Btn>} width={520}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr key={s.combo} style={{ borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
                  <td style={{ padding: "var(--spacing-2) var(--spacing-3)", fontFamily: "ui-monospace, monospace", color: C.primary, fontWeight: 700, fontSize: "var(--font-size-sm)" }}>{s.combo}</td>
                  <td style={{ padding: "var(--spacing-2) var(--spacing-3)", color: C.text, fontSize: "var(--font-size-sm)" }}>{s.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Frame>
      );
    case "docs":
      return (
        <Frame title="Documentation" onClose={onClose} footer={<Btn primary onClick={onClose}>Got it</Btn>}>
          <p style={{ fontSize: "var(--font-size-sm)", color: C.body, marginBottom: "var(--spacing-3)" }}>
            Use the menus to create shapes, the toolbar for quick ops, and the
            right panel to tweak materials and effects. Sketch mode is opened from
            the Sketch button or `Shape Creation ▸ Sketch`.
          </p>
        </Frame>
      );
    default:
      return null;
  }
}
