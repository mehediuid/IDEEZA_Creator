"use client";

// PcbThreeView — the PCB module's 3D tab. A real three.js viewer (replaces
// the old CSS-transform mockup): the actual board dimensions + physically
// placed components from the store, orbitable, lit, on a grid floor.
//
// Derivation is shared with the Product Preview (derivePcb3D + PcbBoardMesh /
// PcbComponentMesh) so this tab and /preview can never show different boards.
// Properties still drive it live: Board Color tints the board, Background
// Color paints the canvas, Board Thickness drives the slab depth, and the
// Material shows in the footer label.

import * as React from "react";
import dynamic from "next/dynamic";
import { usePcbState } from "@/lib/pcb/store";

const PcbThreeViewImpl = dynamic(
  () => import("./pcb-three-view-impl").then((m) => m.PcbThreeViewImpl),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-secondary)",
          fontSize: 13,
        }}
      >
        Loading 3D board…
      </div>
    ),
  },
);

export function PcbThreeView() {
  const state = usePcbState();
  const d = state.threeD;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <PcbThreeViewImpl />
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          color: "#cdbbe6",
          fontSize: "var(--font-size-sm)",
          fontWeight: 500,
          pointerEvents: "none",
        }}
      >
        3D Module Preview · {d.material} · {d.boardThickness} · drag to orbit
      </div>
    </div>
  );
}
