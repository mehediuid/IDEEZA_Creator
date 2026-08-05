"use client";

// IDEEZA PCB Software — PCB layout canvas (Phase 1).
// Replaces the prior `dangerouslySetInnerHTML(buildCanvas("pcb"))` with a
// real React component. Renders the board outline + a layer-aware backdrop;
// individual placed objects (tracks, pads, vias, …) are drawn by
// <PlacedObjects/> on top of this surface.

"use client";

import * as React from "react";
import { usePcbState } from "@/lib/pcb/store";

// #127 — the board's substrate and its edge come from tokens, so the 2D board
// is themed like everything else (and the 3D solder-mask colour has one home).
const BOARD_FILL = "var(--color-pcb-substrate)";
const BOARD_BORDER_FALLBACK = "var(--color-pcb-substrate-edge)";

export function PcbCanvas() {
  const state = usePcbState();
  const board = state.pcbBoard;
  const outline = state.pcbLayers.find((l) => l.id === "outline");
  const stroke = outline?.visible ? outline.color : BOARD_BORDER_FALLBACK;

  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 60,
        width: board.width,
        height: board.height,
        background: BOARD_FILL,
        border: `2px solid ${stroke}`,
        borderRadius: 4,
        boxShadow: "var(--elevation-4, 0 8px 30px rgba(0,0,0,.25))",
        overflow: "hidden",
      }}
      data-pcb-board
    >
      {/* Board grid — same three styles as the schematic sheet (View ▸ Grid),
          in the copper green that reads on the FR-4 base. */}
      {state.gridType !== "none" && (
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <defs>
            <pattern id="ix-pcb-grid" width={24} height={24} patternUnits="userSpaceOnUse">
              {state.gridType === "dots" ? (
                <circle cx="0.5" cy="0.5" r="0.8" fill="var(--color-pcb-grid)" opacity="0.18" />
              ) : (
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--color-pcb-grid)" strokeOpacity="0.16" strokeWidth="1" />
              )}
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ix-pcb-grid)" />
        </svg>
      )}

      {/* Inner safe-area dashed outline so the board edge reads clearly */}
      <div
        style={{
          position: "absolute",
          inset: 24,
          border: "1.5px dashed rgba(75,212,134,.55)",
          borderRadius: 2,
          pointerEvents: "none",
        }}
      />

      {/* Layer indicator badge — top-left corner */}
      <LayerBadge />
    </div>
  );
}

function LayerBadge() {
  const state = usePcbState();
  const active = state.pcbLayers.find((l) => l.id === state.activePcbLayer);
  if (!active) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        background: "rgba(0,0,0,.55)",
        border: `1px solid ${active.color}`,
        borderRadius: 4,
        fontSize: 11,
        color: "#FFFFFF",
        fontFamily: "var(--font-family-mono), monospace",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: active.color,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,.3)",
        }}
      />
      Active: {active.name}
    </div>
  );
}
