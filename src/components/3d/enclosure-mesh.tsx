"use client";

// The 3D Module's Enclosure shape (Assembly plan D6): the hollow case — floor,
// walls with their openings, bosses — or its lid, drawn from the same
// geometry Assembly checks fit against (lib/three/enclosure.ts). Its size is
// set in the Enclosure panel, in millimetres, so the gizmo only moves and
// turns it; scaling would size it twice.

import * as React from "react";
import { type ThreeEvent } from "@react-three/fiber";
import { Edges, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { enclosureGeometry } from "@/lib/three/enclosure";
import { SCENE_UNIT_MM, type SceneShape } from "@/lib/three/scene";

const U = SCENE_UNIT_MM;

export function EnclosureMesh({
  shape,
  selected,
  color,
  onSelect,
  onTransform,
  transformMode,
  snap,
  gridStep,
}: {
  shape: SceneShape;
  selected: boolean;
  color: THREE.ColorRepresentation;
  onSelect: (id: string) => void;
  onTransform: (id: string, patch: Partial<Pick<SceneShape, "position" | "rotation">>) => void;
  transformMode: "none" | "translate" | "rotate" | "scale";
  snap: { x: boolean; y: boolean; z: boolean };
  gridStep: number;
}) {
  const [group, setGroup] = React.useState<THREE.Group | null>(null);
  const geo = React.useMemo(() => (shape.enclosure ? enclosureGeometry(shape.enclosure, shape.scale) : null), [shape.enclosure, shape.scale]);
  if (shape.hidden || !geo) return null;

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(shape.id);
  };
  const mode = transformMode === "rotate" ? "rotate" : "translate";
  const showGizmo = selected && transformMode !== "none" && transformMode !== "scale" && !shape.locked && group !== null;
  const onChange = () => {
    if (!group) return;
    if (mode === "translate") {
      const s = (v: number, on: boolean) => (on ? Math.round(v / gridStep) * gridStep : v);
      onTransform(shape.id, { position: [s(group.position.x, snap.x), s(group.position.y, snap.y), s(group.position.z, snap.z)] });
    } else {
      onTransform(shape.id, { rotation: [group.rotation.x, group.rotation.y, group.rotation.z] });
    }
  };
  const lid = shape.enclosure?.part === "lid";

  return (
    <>
      <group ref={setGroup} position={shape.position} rotation={shape.rotation} onClick={onClick}>
        {geo.boxes.map((b) => (
          <mesh key={b.id} position={[b.center[0] / U, b.center[1] / U, b.center[2] / U]}>
            <boxGeometry args={[b.size[0] / U, b.size[1] / U, b.size[2] / U]} />
            <meshStandardMaterial color={color} metalness={0.15} roughness={0.55} transparent={lid} opacity={lid ? 0.55 : 1} side={THREE.DoubleSide} />
            {selected && <Edges color="#7c2db9" />}
          </mesh>
        ))}
        {geo.bosses.map((b) => (
          <group key={b.id} position={[b.x / U, (b.y0 + b.h / 2) / U, b.z / U]}>
            <mesh>
              <cylinderGeometry args={[b.r / U, b.r / U, b.h / U, 24]} />
              <meshStandardMaterial color={color} metalness={0.15} roughness={0.55} />
            </mesh>
            {b.hole > 0 && (
              <mesh position={[0, b.h / 2 / U + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[b.hole / 2 / U, 20]} />
                <meshBasicMaterial color="#0b0d10" />
              </mesh>
            )}
          </group>
        ))}
      </group>
      {showGizmo && (
        <TransformControls
          object={group as THREE.Object3D}
          mode={mode}
          translationSnap={snap.x && snap.y && snap.z ? gridStep : null}
          rotationSnap={Math.PI / 12}
          onObjectChange={onChange}
        />
      )}
    </>
  );
}
