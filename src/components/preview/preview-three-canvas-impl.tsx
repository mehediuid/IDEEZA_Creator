"use client";

// Preview Three.js scene — extracted into its own file so the parent shell
// can dynamic-import it and skip SSR.
//
// Two scene groups:
//   • PCB         — flat board (substrate) + per-component cuboids, generated
//                   from the PCB module's store (boards + objects). Always
//                   opaque, FR4 green so it reads as a printed circuit.
//   • Enclosure   — shapes from the 3D module's localStorage slot, rendered
//                   semi-transparent so the user can SEE the PCB through the
//                   cover and judge whether it fits.
//
// A reactive Box3 intersection check feeds the parent a "fit" verdict
// (fits / overflows / pcb-missing / enclosure-missing) every time the scene
// changes, which the page renders as a corner badge.

import * as React from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewcube,
  Environment,
  Outlines,
  TransformControls,
} from "@react-three/drei";
import * as THREE from "three";
import type { SceneShape } from "@/components/3d/three-canvas";
import type {
  PreviewPcbComponent,
  PreviewPcbBoard,
  FitVerdict,
  PreviewTransformMode,
} from "./preview-context";

type ShapeTransform = Partial<
  Pick<SceneShape, "position" | "rotation" | "scale">
>;

export type PreviewCanvasProps = {
  pcb: { board: PreviewPcbBoard; components: PreviewPcbComponent[] };
  enclosureShapes: SceneShape[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onContextMenu: (id: string, clientX: number, clientY: number) => void;
  showPcb: boolean;
  showEnclosure: boolean;
  enclosureOpacity: number;
  resetTick: number;
  fitTick: number;
  fitSelectedTick: number;
  onFitChange: (v: FitVerdict) => void;
  // Canvas controls
  transformMode: PreviewTransformMode;
  snap: { x: boolean; y: boolean; z: boolean };
  gridStep: number;
  segments: number;
  onTransform: (id: string, patch: ShapeTransform) => void;
};

const PCB_GREEN = "#0a6b3b";
const PCB_TRACE = "#22d3a6";
const COMPONENT_COLOR = "#1f2937";
const ENCLOSURE_COLOR = "#cfd5e0";
const HIGHLIGHT = "#a78bfa";

export function PreviewCanvasImpl(props: PreviewCanvasProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [6, 5, 7], fov: 40, near: 0.1, far: 200 }}
      dpr={1}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ position: "absolute", inset: 0, background: "transparent" }}
    >
      <SceneContents {...props} />
    </Canvas>
  );
}

function SceneContents({
  pcb,
  enclosureShapes,
  selectedId,
  onSelect,
  onContextMenu,
  showPcb,
  showEnclosure,
  enclosureOpacity,
  resetTick,
  fitTick,
  fitSelectedTick,
  onFitChange,
  transformMode,
  snap,
  gridStep,
  segments,
  onTransform,
}: PreviewCanvasProps) {
  const controls = React.useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera, scene } = useThree();

  // Reset camera to its default 3/4 view when resetTick bumps.
  React.useEffect(() => {
    if (resetTick === 0) return;
    camera.position.set(6, 5, 7);
    camera.lookAt(0, 0, 0);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTick]);

  // Fit-to-scene: compute the combined bounding box of PCB + Enclosure and
  // dolly the camera back so the whole thing fits the frame.
  React.useEffect(() => {
    if (fitTick === 0) return;
    const box = new THREE.Box3();
    const expand = (obj: THREE.Object3D | undefined | null) => {
      if (!obj) return;
      const b = new THREE.Box3().setFromObject(obj);
      if (b.isEmpty()) return;
      box.union(b);
    };
    expand(scene.getObjectByName("pcb-group"));
    expand(scene.getObjectByName("enclosure-group"));
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 2.2;
    camera.position.set(
      center.x + dist,
      center.y + dist * 0.8,
      center.z + dist,
    );
    camera.lookAt(center);
    controls.current?.target.copy(center);
    controls.current?.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitTick]);

  // Zoom to selection: locate the mesh tagged userData.previewId === selectedId
  // and dolly the camera so its bbox fills ~70% of the frame.
  React.useEffect(() => {
    if (fitSelectedTick === 0 || !selectedId) return;
    let target: THREE.Object3D | null = null;
    scene.traverse((o) => {
      if (target) return;
      if ((o as THREE.Mesh).userData?.previewId === selectedId) target = o;
    });
    if (!target) return;
    const box = new THREE.Box3().setFromObject(target);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.3);
    const dist = maxDim * 3;
    camera.position.set(
      center.x + dist,
      center.y + dist * 0.7,
      center.z + dist,
    );
    camera.lookAt(center);
    controls.current?.target.copy(center);
    controls.current?.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSelectedTick]);

  // Recompute the PCB-fits-inside-enclosure verdict whenever the scene
  // changes shape, visibility, or selection. We do it in a useFrame-style
  // effect synced to the props so the parent always has fresh status.
  const reportFit = React.useCallback(() => {
    const verdict = computeFit(scene, {
      hasPcb: showPcb && pcb.components.length >= 0,
      hasEnclosure: showEnclosure && enclosureShapes.length > 0,
    });
    onFitChange(verdict);
  }, [scene, showPcb, showEnclosure, pcb, enclosureShapes, onFitChange]);

  React.useEffect(() => {
    // Defer one frame so meshes have mounted before bbox math runs.
    const id = window.requestAnimationFrame(reportFit);
    return () => window.cancelAnimationFrame(id);
  }, [reportFit]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.05}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Environment preset="city" />

      <Grid
        args={[40, 40]}
        cellSize={gridStep}
        cellThickness={0.6}
        cellColor="#6b7280"
        sectionSize={gridStep * 5}
        sectionThickness={1.2}
        sectionColor="#7c2db9"
        fadeDistance={28}
        fadeStrength={1.5}
        followCamera={false}
        infiniteGrid
        position={[0, -0.001, 0]}
      />

      <MouseReporter />

      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={1.2}
        maxDistance={80}
      />

      <GizmoHelper alignment="top-right" margin={[64, 80]}>
        <GizmoViewcube
          color="#ffffff"
          textColor="#3f4754"
          strokeColor="#7c2db9"
        />
      </GizmoHelper>

      {showPcb && (
        <group name="pcb-group">
          <PcbBoardMesh
            board={pcb.board}
            selected={selectedId === "pcb-board"}
            onSelect={() => onSelect("pcb-board")}
            onContextMenu={(x, y) => onContextMenu("pcb-board", x, y)}
          />
          {pcb.components.map((c) => (
            <PcbComponentMesh
              key={c.id}
              component={c}
              board={pcb.board}
              selected={selectedId === c.id}
              onSelect={() => onSelect(c.id)}
              onContextMenu={(x, y) => onContextMenu(c.id, x, y)}
            />
          ))}
        </group>
      )}

      {showEnclosure && (
        <group name="enclosure-group">
          {enclosureShapes
            .filter((s) => !s.hidden)
            .map((s) => (
              <EnclosureShapeMesh
                key={s.id}
                shape={s}
                opacity={enclosureOpacity}
                selected={selectedId === s.id}
                segments={segments}
                transformMode={transformMode}
                snap={snap}
                gridStep={gridStep}
                onSelect={() => onSelect(s.id)}
                onTransform={onTransform}
                onContextMenu={(x, y) => onContextMenu(s.id, x, y)}
              />
            ))}
        </group>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Meshes
// ─────────────────────────────────────────────────────────────────────

function PcbBoardMesh({
  board,
  selected,
  onSelect,
  onContextMenu,
}: {
  board: PreviewPcbBoard;
  selected: boolean;
  onSelect: () => void;
  onContextMenu: (x: number, y: number) => void;
}) {
  // Board is a flat box: width × thickness × depth, centered at origin with
  // top surface at y = thickness/2. Slight bevel via Outlines if selected.
  return (
    <mesh
      castShadow
      receiveShadow
      position={[0, board.thickness / 2, 0]}
      userData={{ previewId: "pcb-board" }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        e.nativeEvent.preventDefault();
        onContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
      }}
    >
      <boxGeometry args={[board.width, board.thickness, board.depth]} />
      <meshStandardMaterial
        color={PCB_GREEN}
        roughness={0.55}
        metalness={0.15}
      />
      {selected && <Outlines thickness={3} color={HIGHLIGHT} />}
      {/* Faux silkscreen accent strip */}
      <mesh position={[0, board.thickness / 2 + 0.001, 0]}>
        <ringGeometry
          args={[
            Math.min(board.width, board.depth) * 0.35,
            Math.min(board.width, board.depth) * 0.36,
            64,
          ]}
        />
        <meshBasicMaterial color={PCB_TRACE} side={THREE.DoubleSide} />
      </mesh>
    </mesh>
  );
}

function PcbComponentMesh({
  component,
  board,
  selected,
  onSelect,
  onContextMenu,
}: {
  component: PreviewPcbComponent;
  board: PreviewPcbBoard;
  selected: boolean;
  onSelect: () => void;
  onContextMenu: (x: number, y: number) => void;
}) {
  const h = component.height ?? 0.18;
  // Component's local origin (PCB coords) → world: center the board on origin
  // and offset by component position, place ON TOP of board.
  const x = component.x - board.width / 2;
  const z = component.y - board.depth / 2;
  const y = board.thickness + h / 2;
  const w = component.w ?? 0.4;
  const d = component.d ?? 0.4;

  // Pick a geometry that suits the component kind. Most "components" are
  // boxes; capacitors / cylinders use cylinderGeometry.
  const geom = component.kind === "capacitor" ? "cylinder" : "box";

  return (
    <mesh
      castShadow
      receiveShadow
      position={[x, y, z]}
      userData={{ previewId: component.id }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        e.nativeEvent.preventDefault();
        onContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
      }}
    >
      {geom === "cylinder" ? (
        <cylinderGeometry args={[Math.min(w, d) / 2, Math.min(w, d) / 2, h, 24]} />
      ) : (
        <boxGeometry args={[w, h, d]} />
      )}
      <meshStandardMaterial
        color={selected ? HIGHLIGHT : component.color ?? COMPONENT_COLOR}
        roughness={0.45}
        metalness={0.35}
      />
      {selected && <Outlines thickness={3} color={HIGHLIGHT} />}
    </mesh>
  );
}

function EnclosureShapeMesh({
  shape,
  opacity,
  selected,
  segments,
  transformMode,
  snap,
  gridStep,
  onSelect,
  onTransform,
  onContextMenu,
}: {
  shape: SceneShape;
  opacity: number;
  selected: boolean;
  segments: number;
  transformMode: PreviewTransformMode;
  snap: { x: boolean; y: boolean; z: boolean };
  gridStep: number;
  onSelect: () => void;
  onTransform: (id: string, patch: ShapeTransform) => void;
  onContextMenu: (x: number, y: number) => void;
}) {
  // Callback-ref state (not a ref) so the gizmo mounts reactively once the
  // mesh exists — reading a ref during render is unreliable and a lint error.
  const [meshObj, setMeshObj] = React.useState<THREE.Mesh | null>(null);

  // On every gizmo change, write back ONLY what the active mode edits:
  // translating must not touch rotation, and rotating must never snap the
  // position (that would teleport off-grid shapes to the grid mid-rotate).
  const handleTransformChange = () => {
    if (!meshObj) return;
    if (transformMode === "translate") {
      const snapAxis = (v: number, on: boolean) =>
        on ? Math.round(v / gridStep) * gridStep : v;
      onTransform(shape.id, {
        position: [
          snapAxis(meshObj.position.x, snap.x),
          snapAxis(meshObj.position.y, snap.y),
          snapAxis(meshObj.position.z, snap.z),
        ],
      });
    } else if (transformMode === "rotate") {
      onTransform(shape.id, {
        rotation: [meshObj.rotation.x, meshObj.rotation.y, meshObj.rotation.z],
      });
    }
  };

  const showGizmo = selected && transformMode !== "none" && meshObj !== null;
  const ringSeg = Math.max(8, Math.round(segments / 2));

  return (
    <>
      <mesh
        ref={setMeshObj}
        castShadow
        receiveShadow
        position={shape.position}
        rotation={shape.rotation}
        scale={shape.scale}
        userData={{ previewId: shape.id }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
          e.nativeEvent.preventDefault();
          onContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
        }}
      >
        {shape.type === "box" && <boxGeometry args={[1, 1, 1]} />}
        {shape.type === "sphere" && <sphereGeometry args={[0.5, segments, ringSeg]} />}
        {shape.type === "cylinder" && <cylinderGeometry args={[0.5, 0.5, 1, segments]} />}
        {shape.type === "cone" && <coneGeometry args={[0.5, 1, segments]} />}
        {shape.type === "torus" && <torusGeometry args={[0.5, 0.2, ringSeg, segments]} />}
        {shape.type === "plane" && <planeGeometry args={[1, 1]} />}
        <meshStandardMaterial
          color={selected ? HIGHLIGHT : ENCLOSURE_COLOR}
          transparent={opacity < 0.99}
          opacity={Math.min(1, Math.max(0.05, opacity))}
          roughness={0.35}
          metalness={0.25}
          side={THREE.DoubleSide}
          depthWrite={opacity > 0.95}
        />
        {selected && <Outlines thickness={3} color={HIGHLIGHT} />}
      </mesh>
      {showGizmo && (
        <TransformControls
          object={meshObj as THREE.Object3D}
          mode={transformMode}
          // Gizmo-level snap is all-axes-only, so it's used only when every
          // axis is on; mixed X/Y/Z snapping happens per-axis in the
          // write-back (handleTransformChange) instead.
          translationSnap={snap.x && snap.y && snap.z ? gridStep : null}
          rotationSnap={Math.PI / 12}
          onObjectChange={handleTransformChange}
        />
      )}
    </>
  );
}

// Reports the cursor's ground-plane position + camera distance to the right
// panel via a lightweight window event (so only the panel re-renders, never
// this canvas).
function MouseReporter() {
  const { camera, gl } = useThree();
  React.useEffect(() => {
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    const ndc = new THREE.Vector2();
    // Coalesce raw mousemove to one dispatch per frame — the listening panel
    // re-renders on every event, so unthrottled dispatch burns CPU while the
    // canvas is busiest.
    let raf = 0;
    let pending: MouseEvent | null = null;
    const flush = () => {
      raf = 0;
      const e = pending;
      pending = null;
      if (!e) return;
      const rect = el.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      // A miss (camera looking above the horizon) clears the readout instead
      // of leaving stale coordinates frozen in the panel.
      const detail = raycaster.ray.intersectPlane(plane, point)
        ? {
            d: camera.position.distanceTo(point),
            x: point.x,
            y: point.y,
            z: point.z,
          }
        : null;
      window.dispatchEvent(new CustomEvent("ideeza:preview-mouse", { detail }));
    };
    const move = (e: MouseEvent) => {
      pending = e;
      if (!raf) raf = window.requestAnimationFrame(flush);
    };
    const leave = () => {
      pending = null;
      window.dispatchEvent(
        new CustomEvent("ideeza:preview-mouse", { detail: null }),
      );
    };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, [camera, gl]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────
// Fit analysis — does the PCB bbox fit inside the enclosure bbox?
// ─────────────────────────────────────────────────────────────────────

function computeFit(
  scene: THREE.Scene,
  ctx: { hasPcb: boolean; hasEnclosure: boolean },
): FitVerdict {
  if (!ctx.hasPcb) return { kind: "pcb-missing" };
  if (!ctx.hasEnclosure) return { kind: "enclosure-missing" };

  const pcbGroup = scene.getObjectByName("pcb-group");
  const encGroup = scene.getObjectByName("enclosure-group");
  if (!pcbGroup || !encGroup) return { kind: "pcb-missing" };

  const pcbBox = new THREE.Box3().setFromObject(pcbGroup);
  const encBox = new THREE.Box3().setFromObject(encGroup);
  if (pcbBox.isEmpty()) return { kind: "pcb-missing" };
  if (encBox.isEmpty()) return { kind: "enclosure-missing" };

  if (encBox.containsBox(pcbBox)) {
    const pcbSize = pcbBox.getSize(new THREE.Vector3());
    const encSize = encBox.getSize(new THREE.Vector3());
    const headroom: [number, number, number] = [
      encSize.x - pcbSize.x,
      encSize.y - pcbSize.y,
      encSize.z - pcbSize.z,
    ];
    return { kind: "fits", headroom };
  }

  // Compute per-axis overflow (positive = overflows by that much).
  const overflow: [number, number, number] = [
    Math.max(
      0,
      encBox.min.x - pcbBox.min.x,
      pcbBox.max.x - encBox.max.x,
    ),
    Math.max(
      0,
      encBox.min.y - pcbBox.min.y,
      pcbBox.max.y - encBox.max.y,
    ),
    Math.max(
      0,
      encBox.min.z - pcbBox.min.z,
      pcbBox.max.z - encBox.max.z,
    ),
  ];
  return { kind: "overflow", overflow };
}
