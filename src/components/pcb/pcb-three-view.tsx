"use client";

// PcbThreeView — the PCB module's 3D tab. A real three.js viewer that mirrors
// the 2D PCB layout 1:1: the board slab plus every physical object placed on
// the canvas (copper tracks, vias, footprint pads, component bodies, copper
// regions) mapped into a single centred, normalized scene (derivePcbScene +
// PcbSceneMeshes). This is a faithful engineering 3D of the PCB, distinct from
// the coarser Product Preview board (derivePcb3D), which stays as-is.
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
