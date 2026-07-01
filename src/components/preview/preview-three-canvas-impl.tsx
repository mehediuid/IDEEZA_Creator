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
} from "@react-three/drei";
import * as THREE from "three";
import type { SceneShape } from "@/components/3d/three-canvas";
import type {
  PreviewPcbComponent,
  PreviewPcbBoard,
  FitVerdict,
} from "./preview-context";

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
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#6b7280"
        sectionSize={2}
        sectionThickness={1.2}
        sectionColor="#7c2db9"
        fadeDistance={28}
        fadeStrength={1.5}
        followCamera={false}
        infiniteGrid
        position={[0, -0.001, 0]}
      />

      <OrbitControls
        ref={controls}
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
                onSelect={() => onSelect(s.id)}
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
  onSelect,
  onContextMenu,
}: {
  shape: SceneShape;
  opacity: number;
  selected: boolean;
  onSelect: () => void;
  onContextMenu: (x: number, y: number) => void;
}) {
  return (
    <mesh
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
      {shape.type === "sphere" && <sphereGeometry args={[0.5, 32, 16]} />}
      {shape.type === "cylinder" && <cylinderGeometry args={[0.5, 0.5, 1, 32]} />}
      {shape.type === "cone" && <coneGeometry args={[0.5, 1, 32]} />}
      {shape.type === "torus" && <torusGeometry args={[0.5, 0.2, 16, 32]} />}
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
  );
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
