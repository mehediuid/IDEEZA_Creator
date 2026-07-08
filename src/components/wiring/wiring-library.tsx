"use client";

// Wiring module — left panel. Two parts:
//   • Peripheral Parts library: tiles that drop a part on the canvas.
//   • Placed parts list: select / delete what's on the stage.

import * as React from "react";
import { PERIPHERAL_CATALOG } from "@/lib/wiring/types";
import { useWiring } from "./wiring-context";

export function WiringLibrary({ topOffset, bottomOffset = 36 }: { topOffset: number; bottomOffset?: number }) {
  const { parts, placePart, removePart, wires } = useWiring();

  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        bottom: bottomOffset,
        left: 74,
        width: 292,
        background: "var(--color-bg-surface)",
        borderRight: "var(--border-width-1) solid var(--color-border-default)",
        display: "flex",
        flexDirection: "column",
        zIndex: 15,
      }}
    >
      <div style={{ padding: "var(--spacing-7) var(--spacing-7) var(--spacing-4)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        <div style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>Peripheral Parts</div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>Click a part to drop it on the stage</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-5) var(--spacing-6)" }}>
        {/* catalog tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-4)" }}>
          {PERIPHERAL_CATALOG.map((p) => (
            <button
              key={p.kind}
              onClick={() => placePart(p.kind)}
              className="ix-tool"
              title={`Place ${p.label}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--spacing-3)",
                padding: "var(--spacing-5) var(--spacing-3)",
                background: "var(--color-bg-page)",
                border: "var(--border-width-1) solid var(--color-border-subtle)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                color: "var(--color-text-primary)",
                fontSize: "var(--font-size-xs)",
                fontWeight: 600,
              }}
            >
              <span style={{ width: 40, height: 26, borderRadius: 5, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, fontWeight: 700 }}>
                {p.pins.length}p
              </span>
              {p.label}
            </button>
          ))}
        </div>

        {/* placed parts */}
        <div style={{ marginTop: "var(--spacing-7)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", paddingTop: "var(--spacing-5)" }}>
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-3)" }}>
            On Stage <span style={{ color: "var(--color-text-tertiary)", fontWeight: 500 }}>({parts.length} parts · {wires.length} wires)</span>
          </div>
          {parts.length === 0 && (
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>
              No parts yet. Drop two parts above, pick a wire tool from the Draw menu, then click pin-to-pin.
            </div>
          )}
          {parts.map((p) => (
            <div key={p.id} className="ix-row" style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", padding: "var(--spacing-3) var(--spacing-2)", borderRadius: "var(--radius-sm)" }}>
              <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              <button
                onClick={() => removePart(p.id)}
                aria-label={`Delete ${p.name}`}
                title="Delete"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", padding: 2, display: "flex" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 6l1 14h12l1-14" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
