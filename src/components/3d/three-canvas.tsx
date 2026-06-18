"use client";

// 3D Module — viewport (client-only, react-three-fiber).
// Defines the public shape model + props contract; the actual scene + WebGL
// renderer is dynamic-imported so /3d works under SSR.

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

export type ShapeType = "box" | "sphere" | "cylinder" | "cone" | "torus" | "plane";

export type SceneShape = {
  id: string;
  type: ShapeType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  hidden: boolean;
  locked: boolean;
};

export type TransformMode = "none" | "translate" | "rotate" | "scale";

export type ViewportProps = {
  shapes: SceneShape[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onTransform: (id: string, patch: Partial<Pick<SceneShape, "position" | "rotation" | "scale">>) => void;
  onMouse: (info: { x: number; y: number; z: number; distance: number } | null) => void;
  transformMode: TransformMode;
  material: "antimony" | "tin" | "iron";
  background: string;
  environment: string;
  effects: { id: string; value: number }[];
  snap: { x: boolean; y: boolean; z: boolean };
  gridSize: string;            // IDEEZA-100/50/25/10 → 1.0/0.5/0.25/0.1 spacing
  resolution: string;          // first resolution dropdown — controls mesh segments
  fitTick: number;             // bumping triggers fit-to-shapes
};

export function ThreeViewport(props: ViewportProps) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ThreeViewportImpl {...props} />
    </div>
  );
}

export function makeShape(type: ShapeType, position: [number, number, number] = [0, 0, 0]): SceneShape {
  return {
    id: `${type}-${Math.floor(Math.random() * 1e9).toString(36)}`,
    type,
    position,
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    hidden: false,
    locked: false,
  };
}
