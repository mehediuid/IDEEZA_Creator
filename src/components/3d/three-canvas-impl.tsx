"use client";

// Live three.js scene — extracted into its own file so the parent shell can
// dynamic-import it and skip SSR.

import * as React from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import {
  Grid,
  OrbitControls,
  GizmoHelper,
  GizmoViewcube,
  Text,
  Environment,
  Outlines,
} from "@react-three/drei";
import * as THREE from "three";
import type { ViewportProps, SceneShape } from "./three-canvas";

const MAT_PARAMS: Record<"antimony" | "tin" | "iron", {
  color: string; metalness: number; roughness: number;
}> = {
  antimony: { color: "#a78bfa", metalness: 0.4, roughness: 0.45 },
  tin:      { color: "#e2e8f0", metalness: 0.7, roughness: 0.25 },
  iron:     { color: "#475569", metalness: 0.85, roughness: 0.3 },
};

function ShapeMesh({
  shape,
  selected,
  onSelect,
  material,
  effects,
}: {
  shape: SceneShape;
  selected: boolean;
  onSelect: (id: string) => void;
  material: "antimony" | "tin" | "iron";
  effects: { id: string; value: number }[];
}) {
  const ref = React.useRef<THREE.Mesh>(null);
  const params = MAT_PARAMS[material];

  // Map a couple of effect sliders onto material properties so the right-side
  // sliders have a visible payoff in the viewport.
  const get = (id: string) => effects.find((e) => e.id === id)?.value ?? 40;
  const vivid = get("vivid") / 100;            // 0..1 — emissive intensity
  const glamorous = get("glamorous") / 100;    // 0..1 — metalness multiplier
  const fitting = get("fitting") / 100;        // 0..1 — inverse roughness

  const onPointer = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(shape.id);
  };

  let geometry: React.ReactNode = null;
  switch (shape.type) {
    case "box":      geometry = <boxGeometry args={[2, 2, 2]} />; break;
    case "sphere":   geometry = <sphereGeometry args={[1.2, 32, 32]} />; break;
    case "cylinder": geometry = <cylinderGeometry args={[1, 1, 2, 32]} />; break;
    case "cone":     geometry = <coneGeometry args={[1.2, 2.4, 32]} />; break;
    case "torus":    geometry = <torusGeometry args={[1, 0.4, 16, 64]} />; break;
    case "plane":    geometry = <planeGeometry args={[3, 3, 1, 1]} />; break;
  }

  return (
    <mesh ref={ref} position={shape.position} onClick={onPointer}>
      {geometry}
      <meshStandardMaterial
        color={params.color}
        metalness={Math.min(1, params.metalness + glamorous * 0.3)}
        roughness={Math.max(0, params.roughness * (1 - fitting * 0.5))}
        emissive={params.color}
        emissiveIntensity={vivid * 0.2}
      />
      {selected && <Outlines thickness={3} color="#7c2db9" />}
    </mesh>
  );
}

function AxisLabel({ pos, text, color = "#94a3b8" }: { pos: [number, number, number]; text: string; color?: string }) {
  return (
    <Text position={pos} fontSize={0.45} color={color} anchorX="center" anchorY="middle">
      {text}
    </Text>
  );
}

function SceneContents(props: ViewportProps) {
  const { shapes, selectedId, onSelect, material, effects, snap } = props;

  // Grid step honours the X/Y snap toggles — turning them off makes the
  // sub-grid pattern disappear so the user gets a visual hint that snap is off.
  const fadeDistance = 30;
  return (
    <>
      <color attach="background" args={[props.background === "Solid" ? "#ffffff" : "#f1f5f9"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 12, 6]} intensity={1.1} castShadow />
      <directionalLight position={[-6, 4, -4]} intensity={0.4} />

      <Grid
        args={[40, 40]}
        position={[0, -1.5, 0]}
        cellSize={1}
        cellThickness={snap.x || snap.y ? 0.6 : 0}
        cellColor="#cbd5e1"
        sectionSize={5}
        sectionThickness={1.2}
        sectionColor="#94a3b8"
        fadeDistance={fadeDistance}
        fadeStrength={1.2}
        infiniteGrid
      />

      <AxisLabel pos={[0, -1.45, -8]} text="BACK" />
      <AxisLabel pos={[0, -1.45,  8]} text="FRONT" />
      <AxisLabel pos={[-8, -1.45, 0]} text="LEFT" />
      <AxisLabel pos={[ 8, -1.45, 0]} text="RIGHT" />

      {/* World origin axes */}
      <axesHelper args={[1.2]} />

      {shapes.map((s) => (
        <ShapeMesh
          key={s.id}
          shape={s}
          selected={selectedId === s.id}
          onSelect={onSelect}
          material={material}
          effects={effects}
        />
      ))}

      {/* Click empty space to deselect */}
      <mesh
        position={[0, 0, 0]}
        onPointerMissed={() => onSelect(null)}
        visible={false}
      >
        <boxGeometry args={[0, 0, 0]} />
      </mesh>

      {/* Environment preset (Studio etc.) */}
      <Environment preset={
        props.environment === "Sunset"    ? "sunset" :
        props.environment === "Park"      ? "park" :
        props.environment === "Warehouse" ? "warehouse" :
        "studio"
      } />

      <OrbitControls makeDefault dampingFactor={0.12} minDistance={3} maxDistance={50} />

      <GizmoHelper alignment="top-right" margin={[80, 80]}>
        <GizmoViewcube
          color="#ffffff"
          textColor="#1e293b"
          strokeColor="#cbd5e1"
          hoverColor="#a78bfa"
        />
      </GizmoHelper>
    </>
  );
}

export function ThreeViewportImpl(props: ViewportProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [6, 5, 7], fov: 45 }}
      shadows
      style={{ position: "absolute", inset: 0 }}
    >
      <SceneContents {...props} />
    </Canvas>
  );
}
