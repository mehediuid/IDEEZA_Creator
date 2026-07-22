"use client";

// Shared three.js meshes for the PCB board + its components. Rendered by BOTH
// the PCB module's 3D tab (read-only orbit viewer) and the Product Preview
// (selectable instances), so the board looks identical in the two places.

import * as React from "react";
import { Outlines } from "@react-three/drei";
import * as THREE from "three";
import type { Pcb3DBoard, Pcb3DComponent } from "@/lib/pcb/pcb-3d";
import type {
  Pcb3DScene,
  Pcb3DTrack,
  Pcb3DVia,
  Pcb3DPad,
  Pcb3DBody,
  Pcb3DRegion,
  Pcb3DSilk,
} from "@/lib/pcb/pcb-scene";
import { PAD_GOLD, VIA_HOLE } from "@/lib/pcb/pcb-scene";

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

// ─────────────────────────────────────────────────────────────────────────────
// REAL PCB-2D SCENE MESHES — used by the PCB module's 3D tab (PcbSceneView) to
// render the actual placed objects (board slab + copper tracks + vias + pads +
// component bodies + copper regions) mapped 1:1 from the 2D layout.
// ─────────────────────────────────────────────────────────────────────────────

const EPS = 0.012; // copper offset above/below the board surface

// Board substrate — a plain slab (no faux silkscreen ring), top surface at
// y = thickness, centred on the origin. Finish (roughness/metalness) comes from
// the Board Material selection.
export function PcbSlabMesh({ board }: { board: Pcb3DScene["board"] }) {
  return (
    <mesh receiveShadow position={[0, board.thickness / 2, 0]}>
      <boxGeometry args={[board.width, board.thickness, board.depth]} />
      <meshStandardMaterial color={board.color} roughness={board.roughness} metalness={board.metalness} />
    </mesh>
  );
}

// Silkscreen outline — a thin white plate a touch larger than the part, so a
// printed border shows around it. Standard silkscreen = matte; UV = glossier.
export function PcbSilkMesh({
  s,
  thickness,
  color,
  glossy,
  lift = 0,
}: {
  s: Pcb3DSilk;
  thickness: number;
  color: string;
  glossy: boolean;
  lift?: number;
}) {
  return (
    <mesh position={[s.x, thickness + 0.004 + lift, s.z]} rotation={[0, -s.rot, 0]} receiveShadow>
      <boxGeometry args={[s.w, 0.008, s.d]} />
      <meshStandardMaterial color={color} roughness={glossy ? 0.35 : 0.92} metalness={0} />
    </mesh>
  );
}

// Copper track — a thin ribbon laid along its segment on the top/bottom surface.
export function PcbTrackMesh({ t, thickness, lift = 0 }: { t: Pcb3DTrack; thickness: number; lift?: number }) {
  const dx = t.x2 - t.x1;
  const dz = t.z2 - t.z1;
  const len = Math.hypot(dx, dz);
  if (len < 1e-4) return null;
  const angle = Math.atan2(dz, dx);
  const y = (t.top ? thickness + EPS : -EPS) + lift;
  return (
    <mesh
      position={[(t.x1 + t.x2) / 2, y, (t.z1 + t.z2) / 2]}
      rotation={[0, -angle, 0]}
      castShadow
    >
      <boxGeometry args={[len, 0.022, t.width]} />
      <meshStandardMaterial color={t.color} roughness={0.34} metalness={0.85} />
    </mesh>
  );
}

// Via — a plated barrel through the board with a dark plated hole. Barrel
// plating colour follows the Pad Plating Color selection.
export function PcbViaMesh({ v, thickness, color = PAD_GOLD }: { v: Pcb3DVia; thickness: number; color?: string }) {
  return (
    <group position={[v.x, thickness / 2, v.z]}>
      <mesh castShadow>
        <cylinderGeometry args={[v.outer / 2, v.outer / 2, thickness + 0.06, 20]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[v.hole / 2, v.hole / 2, thickness + 0.12, 20]} />
        <meshStandardMaterial color={VIA_HOLE} roughness={0.7} metalness={0.2} />
      </mesh>
    </group>
  );
}

// Copper pad — a flat plated rectangle flush on the top surface. Plating
// colour follows the Pad Plating Color selection.
export function PcbPadMesh({ p, thickness, color = PAD_GOLD, lift = 0 }: { p: Pcb3DPad; thickness: number; color?: string; lift?: number }) {
  return (
    <mesh position={[p.x, thickness + EPS - 0.003 + lift, p.z]} rotation={[0, -p.rot, 0]} castShadow>
      <boxGeometry args={[p.w, 0.02, p.d]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.9} />
    </mesh>
  );
}

// Component body — the physical part sitting on top of the board.
export function PcbBodyMesh({ b, thickness, lift = 0 }: { b: Pcb3DBody; thickness: number; lift?: number }) {
  return (
    <mesh
      position={[b.x, thickness + b.h / 2 + EPS + lift, b.z]}
      rotation={[0, -b.rot, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[b.w, b.h, b.d]} />
      <meshStandardMaterial color={b.color} roughness={0.5} metalness={0.25} />
    </mesh>
  );
}

// Copper region / pour — a filled polygon on the top/bottom surface.
export function PcbRegionMesh({ r, thickness, lift = 0 }: { r: Pcb3DRegion; thickness: number; lift?: number }) {
  const geom = React.useMemo(() => {
    const shape = new THREE.Shape();
    r.pts.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, z) : shape.lineTo(x, z)));
    shape.closePath();
    const g = new THREE.ShapeGeometry(shape);
    // ShapeGeometry lives in XY; rotate into the XZ ground plane.
    g.rotateX(Math.PI / 2);
    return g;
  }, [r.pts]);
  const y = (r.top ? thickness + EPS - 0.004 : -EPS + 0.004) + lift;
  return (
    <mesh geometry={geom} position={[0, y, 0]} receiveShadow>
      <meshStandardMaterial
        color={r.color}
        roughness={0.4}
        metalness={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Whole scene group — convenience wrapper the 3D tab renders. `explode` lifts
// the layer stack apart vertically (top copper up, bottom copper down, bodies
// highest). The group is offset by the board's PCB-Height-from-Bottom, and
// `expose` (Layer Expose) raises the exposed copper proud of the mask.
export function PcbSceneMeshes({ scene, explode = false }: { scene: Pcb3DScene; explode?: boolean }) {
  const th = scene.board.thickness;
  const gap = explode ? 0.7 : 0; // vertical separation between stack levels
  const exp = scene.expose; // extra copper proudness above/below the mask
  return (
    <group name="pcb-scene" position={[0, scene.board.yOffset, 0]}>
      <PcbSlabMesh board={scene.board} />
      {scene.silk.map((s) => (
        <PcbSilkMesh key={s.id} s={s} thickness={th} color={scene.silkColor} glossy={scene.silkGlossy} lift={gap} />
      ))}
      {scene.regions.map((r) => (
        <PcbRegionMesh key={r.id} r={r} thickness={th} lift={(r.top ? gap : -gap) + (r.top ? exp : -exp)} />
      ))}
      {scene.tracks.map((t) => (
        <PcbTrackMesh key={t.id} t={t} thickness={th} lift={(t.top ? gap : -gap) + (t.top ? exp : -exp)} />
      ))}
      {scene.pads.map((p) => (
        <PcbPadMesh key={p.id} p={p} thickness={th} color={scene.padColor} lift={gap + exp} />
      ))}
      {scene.vias.map((v) => (
        <PcbViaMesh key={v.id} v={v} thickness={th} color={scene.padColor} />
      ))}
      {scene.bodies.map((b) => (
        <PcbBodyMesh key={b.id} b={b} thickness={th} lift={gap * 2.2} />
      ))}
    </group>
  );
}
