"use client";

// Wiring module — right panel. When a wire is selected it shows the Peripheral
// Wire Parameters (General Section) + a Wiring Customization tab; every field
// live-applies to the selected wire. Otherwise an empty state.

import * as React from "react";
import { WIRE_TOOL_LABEL, buildWirePoints, type WireObj } from "@/lib/wiring/types";
import { useWiring } from "./wiring-context";

const PANEL_W = 300;

export function WiringRightPanel({ topOffset, bottomOffset = 36 }: { topOffset: number; bottomOffset?: number }) {
  const { wires, selectedWireId, updateWire, deleteWire } = useWiring();
  const wire = wires.find((w) => w.id === selectedWireId) ?? null;
  const [tab, setTab] = React.useState<"general" | "custom">("general");

  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        bottom: bottomOffset,
        right: 0,
        width: PANEL_W,
        background: "var(--color-bg-surface)",
        borderLeft: "var(--border-width-1) solid var(--color-border-default)",
        display: "flex",
        flexDirection: "column",
        zIndex: 15,
      }}
    >
      <div style={{ padding: "var(--spacing-6) var(--spacing-8) 0" }}>
        <div style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>
          {wire ? "Wire" : "Properties"}
        </div>
        {wire && <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>{WIRE_TOOL_LABEL[wire.tool]}</div>}
      </div>

      {!wire ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--spacing-10)", textAlign: "center" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", lineHeight: 1.6 }}>
            Select a wire on the stage to edit its color, width, fillet, lead-in and heat-shrink.
          </div>
        </div>
      ) : (
        <>
          {/* tabs */}
          <div style={{ display: "flex", gap: "var(--spacing-6)", padding: "var(--spacing-5) var(--spacing-8) 0" }}>
            {([["general", "General Section"], ["custom", "Wiring Customization"]] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: "var(--spacing-2) 0", fontSize: "var(--font-size-sm)",
                  fontWeight: tab === id ? 700 : 500,
                  color: tab === id ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                  borderBottom: `2px solid ${tab === id ? "var(--color-violet-600)" : "transparent"}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-6) var(--spacing-8)" }}>
            {tab === "general" ? (
              <GeneralSection wire={wire} onChange={(patch) => updateWire(wire.id, patch)} />
            ) : (
              <CustomizationSection wire={wire} onChange={(patch) => updateWire(wire.id, patch)} />
            )}
          </div>

          {/* footer actions */}
          <div style={{ display: "flex", gap: "var(--spacing-4)", padding: "var(--spacing-5) var(--spacing-8)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
            <button
              onClick={() => updateWire(wire.id, {})}
              style={{ flex: 1, padding: "var(--spacing-4)", borderRadius: "var(--radius-md)", border: "none", background: "var(--color-violet-600)", color: "#fff", fontWeight: 600, fontSize: "var(--font-size-sm)", cursor: "pointer" }}
            >
              Update
            </button>
            <button
              onClick={() => deleteWire(wire.id)}
              style={{ padding: "var(--spacing-4) var(--spacing-8)", borderRadius: "var(--radius-md)", border: "var(--border-width-1) solid var(--color-border-default)", background: "transparent", color: "var(--color-text-error)", fontWeight: 600, fontSize: "var(--font-size-sm)", cursor: "pointer" }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-4)", marginBottom: "var(--spacing-5)" }}>
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>{label}</span>
      {children}
    </div>
  );
}

function NumField({ value, unit, onChange, min = 0, max = 999 }: { value: number; unit?: string; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div style={{ position: "relative", width: 120 }}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => { const n = parseFloat(e.target.value); if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n))); }}
        style={{ width: "100%", boxSizing: "border-box", padding: "var(--spacing-3) var(--spacing-4)", paddingRight: unit ? 30 : undefined, border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }}
      />
      {unit && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: "var(--font-size-2xs)", color: "var(--color-text-tertiary)", pointerEvents: "none" }}>{unit}</span>}
    </div>
  );
}

function GeneralSection({ wire, onChange }: { wire: WireObj; onChange: (patch: Partial<WireObj>) => void }) {
  return (
    <>
      <Row label="Wire Color">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>
          <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "var(--font-size-xs)", color: "var(--color-text-primary)" }}>{wire.color.toUpperCase()}</span>
          <input type="color" value={wire.color} onChange={(e) => onChange({ color: e.target.value })} style={{ width: 30, height: 24, border: "none", background: "transparent", cursor: "pointer", padding: 0 }} />
        </div>
      </Row>
      <Row label="Route Width"><NumField value={wire.routeWidth} unit="px" min={1} max={20} onChange={(v) => onChange({ routeWidth: v })} /></Row>
      <Row label="Fillet Radius"><NumField value={wire.filletRadius} unit="px" min={0} max={60} onChange={(v) => onChange({ filletRadius: v })} /></Row>
      <Row label="Lead In (Start)"><NumField value={wire.leadInStart} unit="px" min={0} max={60} onChange={(v) => onChange({ leadInStart: v })} /></Row>
      <Row label="Lead In (End)"><NumField value={wire.leadInEnd} unit="px" min={0} max={60} onChange={(v) => onChange({ leadInEnd: v })} /></Row>
      <Row label="Heat Shrink Length"><NumField value={wire.heatShrink} unit="px" min={0} max={80} onChange={(v) => onChange({ heatShrink: v })} /></Row>
    </>
  );
}

function CustomizationSection({ wire, onChange }: { wire: WireObj; onChange: (patch: Partial<WireObj>) => void }) {
  return (
    <>
      <Row label="Height (Start)"><NumField value={wire.height1} unit="px" min={0} max={400} onChange={(v) => onChange({ height1: v, points: reRoute(wire, { height1: v }) })} /></Row>
      <Row label="Height (End)"><NumField value={wire.height2} unit="px" min={0} max={400} onChange={(v) => onChange({ height2: v, points: reRoute(wire, { height2: v }) })} /></Row>
      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", lineHeight: 1.5, marginTop: "var(--spacing-4)" }}>
        Adjusting a height re-routes the wire between the same two pins. More customization (bundling, labels, clips) lands here next.
      </div>
    </>
  );
}

// Recompute the corner path when a height changes (endpoints unchanged).
function reRoute(wire: WireObj, patch: Partial<WireObj>) {
  const h1 = patch.height1 ?? wire.height1;
  const h2 = patch.height2 ?? wire.height2;
  const from = wire.points[0];
  const to = wire.points[wire.points.length - 1];
  return buildWirePoints(wire.tool, from, to, h1, h2);
}
