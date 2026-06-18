"use client";

// Live three.js scene — extracted into its own file so the parent shell can
// dynamic-import it and skip SSR. Everything user-facing in the right panel
// (material chip, effects, snap, grid size, resolution, environment,
// background) wires into the scene here.

import * as React from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Grid,
  OrbitControls,
  GizmoHelper,
  GizmoViewcube,
  Text,
  Environment,
  Outlines,
  TransformControls,
} from "@react-three/drei";
import * as THREE from "three";
import type { ViewportProps, SceneShape, TransformMode } from "./three-canvas";

const MAT_PARAMS: Record<"antimony" | "tin" | "iron", {
  color: string; metalness: number; roughness: number;
}> = {
  antimony: { color: "#a78bfa", metalness: 0.4, roughness: 0.45 },
  tin:      { color: "#e2e8f0", metalness: 0.7, roughness: 0.25 },
  iron:     { color: "#475569", metalness: 0.85, roughness: 0.3 },
};

function getResolutionSegments(res: string): number {
  switch (res) {
    case "Low":    return 8;
    case "Medium": return 16;
    case "High":   return 48;
    case "Ultra":  return 96;
    case "Auto":
    default:       return 32;
  }
}

function getGridStep(label: string): number {
  if (label === "IDEEZA-50") return 0.5;
  if (label === "IDEEZA-25") return 0.25;
  if (label === "IDEEZA-10") return 0.1;
  return 1.0;
}

function ShapeMesh({
  shape,
  selected,
  onSelect,
  material,
  effects,
  segments,
  registerMesh,
}: {
  shape: SceneShape;
  selected: boolean;
  onSelect: (id: string) => void;
  material: "antimony" | "tin" | "iron";
  effects: { id: string; value: number }[];
  segments: number;
  registerMesh: (id: string, mesh: THREE.Mesh | null) => void;
}) {
  const params = MAT_PARAMS[material];

  const get = (id: string) => effects.find((e) => e.id === id)?.value ?? 40;
  // All 8 effects map to material params so every slider has a payoff.
  const color = get("color") / 100;
  const vivid = get("vivid") / 100;
  const fitting = get("fitting") / 100;
  const striking = get("striking") / 100;
  const glamorous = get("glamorous") / 100;
  const balance = get("colorBalance") / 100;
  const add = get("add") / 100;
  const mineral = get("mineral") / 100;

  // Derive an HSL shift from the colour-balance and add sliders so the cube
  // visibly changes hue while the user drags them.
  const baseColor = new THREE.Color(params.color);
  const tinted = baseColor.clone();
  tinted.offsetHSL((balance - 0.5) * 0.6, color * 0.4, (add - 0.5) * 0.4);

  const onPointer = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(shape.id);
  };

  let geometry: React.ReactNode = null;
  switch (shape.type) {
    case "box":      geometry = <boxGeometry args={[2, 2, 2]} />; break;
    case "sphere":   geometry = <sphereGeometry args={[1.2, segments, segments]} />; break;
    case "cylinder": geometry = <cylinderGeometry args={[1, 1, 2, segments]} />; break;
    case "cone":     geometry = <coneGeometry args={[1.2, 2.4, segments]} />; break;
    case "torus":    geometry = <torusGeometry args={[1, 0.4, Math.max(8, segments / 2), segments * 2]} />; break;
    case "plane":    geometry = <planeGeometry args={[3, 3, 1, 1]} />; break;
  }

  if (shape.hidden) return null;

  return (
    <mesh
      ref={(el: THREE.Mesh | null) => registerMesh(shape.id, el)}
      position={shape.position}
      rotation={shape.rotation}
      scale={shape.scale}
      onClick={onPointer}
    >
      {geometry}
      <meshStandardMaterial
        color={tinted}
        metalness={Math.min(1, params.metalness + glamorous * 0.4 + mineral * 0.2)}
        roughness={Math.max(0.02, params.roughness * (1 - fitting * 0.6))}
        emissive={tinted}
        emissiveIntensity={vivid * 0.35 + striking * 0.15}
        opacity={shape.locked ? 0.85 : 1}
        transparent={shape.locked}
      />
      {selected && <Outlines thickness={3} color="#7c2db9" />}
    </mesh>
  );
}

function AxisLabel({ pos, text }: { pos: [number, number, number]; text: string }) {
  return (
    <Text position={pos} fontSize={0.45} color="#94a3b8" anchorX="center" anchorY="middle">
      {text}
    </Text>
  );
}

// Reports the mouse position projected onto the ground plane back up to ThreeApp
// so the right-side "Mouse Information" row reflects the real cursor location.
function MouseReporter({ onMouse }: { onMouse: ViewportProps["onMouse"] }) {
  const { camera, gl, scene } = useThree();
  const raycaster = React.useMemo(() => new THREE.Raycaster(), []);
  const plane = React.useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.5), []);
  React.useEffect(() => {
    const el = gl.domElement;
    const point = new THREE.Vector3();
    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera({ x, y } as THREE.Vector2, camera);
      raycaster.ray.intersectPlane(plane, point);
      onMouse({
        x: point.x,
        y: point.y,
        z: point.z,
        distance: camera.position.distanceTo(point),
      });
    };
    const leave = () => onMouse(null);
    el.addEventListener("mousemove", handler);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", handler);
      el.removeEventListener("mouseleave", leave);
    };
  }, [camera, gl, scene, plane, raycaster, onMouse]);
  return null;
}

function FitCamera({ shapes, tick }: { shapes: SceneShape[]; tick: number }) {
  const { camera } = useThree();
  React.useEffect(() => {
    if (tick === 0) return;
    // Fit the camera so all visible shapes are framed.
    if (!shapes.length) return;
    const box = new THREE.Box3();
    shapes.forEach((s) => {
      if (s.hidden) return;
      const v = new THREE.Vector3(s.position[0], s.position[1], s.position[2]);
      box.expandByPoint(v.clone().addScalar(-1.5));
      box.expandByPoint(v.clone().addScalar(1.5));
    });
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    camera.position.set(center.x + size, center.y + size * 0.6, center.z + size);
    camera.lookAt(center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
  return null;
}

function SceneContents(props: ViewportProps) {
  const { shapes, selectedId, onSelect, material, effects, snap, gridSize, resolution, transformMode, onTransform, onMouse, fitTick } = props;
  const segments = getResolutionSegments(resolution);
  const gridStep = getGridStep(gridSize);
  const meshRefs = React.useRef<Record<string, THREE.Mesh | null>>({});

  // Snap-during-drag: when a transform completes we round the position to the
  // grid step on whichever axes have snap enabled.
  const onTcChange = () => {
    const id = selectedId;
    if (!id) return;
    const mesh = meshRefs.current[id];
    if (!mesh) return;
    const snapAxis = (v: number, enabled: boolean) => enabled ? Math.round(v / gridStep) * gridStep : v;
    const pos: [number, number, number] = [
      snapAxis(mesh.position.x, snap.x),
      snapAxis(mesh.position.y, snap.y),
      snapAxis(mesh.position.z, snap.z),
    ];
    const rot: [number, number, number] = [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z];
    const scl: [number, number, number] = [mesh.scale.x, mesh.scale.y, mesh.scale.z];
    onTransform(id, { position: pos, rotation: rot, scale: scl });
  };

  // Resolve a background colour for non-Texture choices.
  const bg =
    props.background === "Solid"       ? "#ffffff" :
    props.background === "Transparent" ? "#000000" :
    "#f1f5f9";

  const envPreset =
    props.environment === "Sunset"    ? "sunset" :
    props.environment === "Park"      ? "park" :
    props.environment === "Warehouse" ? "warehouse" :
    props.environment === "Plain"     ? null :
    "studio";

  return (
    <>
      {props.background !== "Transparent" && <color attach="background" args={[bg]} />}
      <ambientLight intensity={0.7} />
      <directionalLight position={[8, 12, 6]} intensity={1.2} />
      <directionalLight position={[-6, 4, -4]} intensity={0.5} />
      <directionalLight position={[0, -5, -6]} intensity={0.25} />

      <Grid
        args={[40, 40]}
        position={[0, -1.5, 0]}
        cellSize={gridStep}
        cellThickness={snap.x || snap.z ? 0.6 : 0}
        cellColor="#cbd5e1"
        sectionSize={gridStep * 5}
        sectionThickness={1.2}
        sectionColor="#94a3b8"
        fadeDistance={30}
        fadeStrength={1.2}
        infiniteGrid
      />

      <AxisLabel pos={[0, -1.45, -8]} text="BACK" />
      <AxisLabel pos={[0, -1.45,  8]} text="FRONT" />
      <AxisLabel pos={[-8, -1.45, 0]} text="LEFT" />
      <AxisLabel pos={[ 8, -1.45, 0]} text="RIGHT" />

      <axesHelper args={[1.2]} />

      {shapes.map((s) => (
        <ShapeMesh
          key={s.id}
          shape={s}
          selected={selectedId === s.id}
          onSelect={onSelect}
          material={material}
          effects={effects}
          segments={segments}
          registerMesh={(id, mesh) => { meshRefs.current[id] = mesh; }}
        />
      ))}

      {/* Transform gizmo — only when a shape is selected, unlocked, and the
          user picked Move/Rotate/Scale from the toolbar/menu. */}
      {selectedId && transformMode !== "none" && meshRefs.current[selectedId] && !shapes.find(s => s.id === selectedId)?.locked && (
        <TransformControls
          object={meshRefs.current[selectedId] as THREE.Object3D}
          mode={transformMode}
          translationSnap={snap.x || snap.z ? gridStep : null}
          rotationSnap={Math.PI / 12}
          onObjectChange={onTcChange}
        />
      )}

      {envPreset && (
        <React.Suspense fallback={null}>
          <Environment preset={envPreset} />
        </React.Suspense>
      )}

      <OrbitControls makeDefault dampingFactor={0.12} minDistance={3} maxDistance={50} enableDamping />

      <GizmoHelper alignment="top-right" margin={[80, 80]}>
        <GizmoViewcube
          color="#ffffff"
          textColor="#1e293b"
          strokeColor="#cbd5e1"
          hoverColor="#a78bfa"
        />
      </GizmoHelper>

      <MouseReporter onMouse={onMouse} />
      <FitCamera shapes={shapes} tick={fitTick} />
    </>
  );
}

function DeselectOverlay({ onSelect }: { onSelect: (id: string | null) => void }) {
  const { gl } = useThree();
  React.useEffect(() => {
    const el = gl.domElement;
    const fn = (e: MouseEvent) => {
      // Empty-canvas click — react-three's onClick on meshes already swallows
      // hits, so a bubble up here means nothing was hit.
      if (e.button === 0 && (e.target as HTMLElement) === el) onSelect(null);
    };
    el.addEventListener("dblclick", fn);
    return () => el.removeEventListener("dblclick", fn);
  }, [gl, onSelect]);
  return null;
}

export function ThreeViewportImpl(props: ViewportProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [6, 5, 7], fov: 45 }}
      gl={{ alpha: props.background === "Transparent", antialias: true }}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <SceneContents {...props} />
      <DeselectOverlay onSelect={props.onSelect} />
    </Canvas>
  );
}
