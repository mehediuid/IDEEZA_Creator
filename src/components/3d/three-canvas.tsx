"use client";

// 3D Module — viewport (client-only, react-three-fiber).
// Renders the scene with a grid floor + axis labels, a pickable scene object
// list (props from ThreeApp), orbit camera controls, and a top-right gizmo
// cube that snaps the camera to canonical views. Material + Effects from the
// right panel feed the surface; the snap state feeds the grid step size.

import * as React from "react";
import dynamic from "next/dynamic";

const ThreeViewportImpl = dynamic(
  () => import("./three-canvas-impl").then((m) => m.ThreeViewportImpl),
  {
    ssr: false,
    loading: () => (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}>
        Loading 3D viewport…
      </div>
    ),
  }
);

export type SceneShape =
  | { id: string; type: "box"; position: [number, number, number] }
  | { id: string; type: "sphere"; position: [number, number, number] }
  | { id: string; type: "cylinder"; position: [number, number, number] }
  | { id: string; type: "cone"; position: [number, number, number] }
  | { id: string; type: "torus"; position: [number, number, number] }
  | { id: string; type: "plane"; position: [number, number, number] };

export type ViewportProps = {
  shapes: SceneShape[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  material: "antimony" | "tin" | "iron";
  background: string;
  environment: string;
  effects: { id: string; value: number }[];
  snap: { x: boolean; y: boolean; z: boolean };
};

export function ThreeViewport(props: ViewportProps) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ThreeViewportImpl {...props} />
    </div>
  );
}
