"use client";

// Shared three.js meshes for the PCB board + its components. Rendered by BOTH
// the PCB module's 3D tab (read-only orbit viewer) and the Product Preview
// (selectable instances), so the board looks identical in the two places.

import * as React from "react";
import { Outlines } from "@react-three/drei";
import * as THREE from "three";
import type { Pcb3DBoard, Pcb3DComponent } from "@/lib/pcb/pcb-3d";

const PCB_TRACE = "#22d3a6";
const COMPONENT_COLOR = "#1f2937";
const HIGHLIGHT = "#a78bfa";

export function PcbBoardMesh({
  board,
  selected = false,
  onSelect,
  onContextMenu,
}: {
  board: Pcb3DBoard;
  selected?: boolean;
  onSelect?: () => void;
  onContextMenu?: (x: number, y: number) => void;
}) {
  // Board is a flat box: width × thickness × depth, centered at origin with
  // top surface at y = thickness/2. Slight bevel via Outlines if selected.
  return (
    <mesh
      castShadow
      receiveShadow
      position={[0, board.thickness / 2, 0]}
      userData={{ previewId: "pcb-board" }}
      onClick={
        onSelect
          ? (e) => {
              e.stopPropagation();
              onSelect();
            }
          : undefined
      }
      onContextMenu={
        onContextMenu
          ? (e) => {
              e.stopPropagation();
              e.nativeEvent.preventDefault();
              onContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
            }
          : undefined
      }
    >
      <boxGeometry args={[board.width, board.thickness, board.depth]} />
      <meshStandardMaterial
        color={board.color}
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

export function PcbComponentMesh({
  component,
  board,
  selected = false,
  onSelect,
  onContextMenu,
}: {
  component: Pcb3DComponent;
  board: Pcb3DBoard;
  selected?: boolean;
  onSelect?: () => void;
  onContextMenu?: (x: number, y: number) => void;
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
      onClick={
        onSelect
          ? (e) => {
              e.stopPropagation();
              onSelect();
            }
          : undefined
      }
      onContextMenu={
        onContextMenu
          ? (e) => {
              e.stopPropagation();
              e.nativeEvent.preventDefault();
              onContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
            }
          : undefined
      }
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
