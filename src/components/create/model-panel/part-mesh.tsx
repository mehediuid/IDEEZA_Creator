"use client";

// One assembly part as geometry, centred on its own origin, in scene units.
// Plain primitives on purpose: every body is sized by the spec's table, so a
// box with the right proportions says more than a detailed model of a part
// nobody chose. The concept mesh is the one exception — it is the product's
// own shape — and is scaled to the size the spec gave the enclosure.

import * as React from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { AssemblyPart, Vec3 } from "@/lib/three/assembly";

export type PartColors = {
  shell: string;
  metal: string;
  can: string;
  box: string;
  chip: string;
  ic: string;
  board: string;
  mark: string;
};

const Mat = ({ color, metal = false }: { color: string; metal?: boolean }) => (
  <meshStandardMaterial color={color} roughness={metal ? 0.35 : 0.6} metalness={metal ? 0.45 : 0.05} />
);

function Box({ size, at = [0, 0, 0], color, metal }: { size: Vec3; at?: Vec3; color: string; metal?: boolean }) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <Mat color={color} metal={metal} />
    </mesh>
  );
}

function ConceptShell({ url, size }: { url: string; size: Vec3 }) {
  const { scene } = useGLTF(url);
  const object = React.useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const dims = box.getSize(new THREE.Vector3());
    const k = Math.min(size[0] / (dims.x || 1), size[1] / (dims.y || 1), size[2] / (dims.z || 1));
    const centre = box.getCenter(new THREE.Vector3());
    clone.position.set(-centre.x * k, -centre.y * k, -centre.z * k);
    clone.scale.setScalar(k);
    const holder = new THREE.Group();
    holder.add(clone);
    return holder;
  }, [scene, size]);
  return <primitive object={object} />;
}

export function PartMesh({
  part,
  scale,
  colors,
  wallMm,
  bosses,
}: {
  part: AssemblyPart;
  /** Scene units per millimetre. */
  scale: number;
  colors: PartColors;
  /** The spec's wall — the cup's floor and sides are that thick. */
  wallMm: number;
  /** Where the board's bosses stand, relative to the base's centre (mm). */
  bosses?: Vec3[];
}) {
  const l = part.body.l * scale;
  const h = part.body.h * scale;
  const w = part.body.w * scale;

  switch (part.shape) {
    case "mesh":
      return part.meshUrl ? <ConceptShell url={part.meshUrl} size={[l, h, w]} /> : null;
    case "shell-base": {
      // An open cup: the floor and four walls, each the spec's wall thick.
      const t = wallMm * scale;
      return (
        <group>
          <Box size={[l, t, w]} at={[0, -h / 2 + t / 2, 0]} color={colors.shell} />
          <Box size={[l, h, t]} at={[0, 0, w / 2 - t / 2]} color={colors.shell} />
          <Box size={[l, h, t]} at={[0, 0, -w / 2 + t / 2]} color={colors.shell} />
          <Box size={[t, h, w - 2 * t]} at={[l / 2 - t / 2, 0, 0]} color={colors.shell} />
          <Box size={[t, h, w - 2 * t]} at={[-l / 2 + t / 2, 0, 0]} color={colors.shell} />
          {bosses?.map((b, i) => (
            <mesh key={i} position={[b[0] * scale, b[1] * scale, b[2] * scale]}>
              <cylinderGeometry args={[1.6 * scale, 1.6 * scale, Math.max(0.1, 2 * scale), 16]} />
              <Mat color={colors.shell} />
            </mesh>
          ))}
        </group>
      );
    }
    case "shell-lid":
      return <Box size={[l, h, w]} color={colors.shell} />;
    case "board":
      return <Box size={[l, h, w]} color={colors.board} />;
    case "ic":
      return (
        <group>
          <Box size={[l, h, w]} color={colors.ic} />
          <mesh position={[-l / 2 + Math.min(l, w) * 0.15, h / 2 + 0.001, -w / 2 + Math.min(l, w) * 0.15]}>
            <cylinderGeometry args={[Math.min(l, w) * 0.06, Math.min(l, w) * 0.06, 0.002, 16]} />
            <Mat color={colors.mark} />
          </mesh>
        </group>
      );
    case "chip": {
      const cap = l * 0.18;
      return (
        <group>
          <Box size={[l - 2 * cap, h, w]} color={colors.chip} />
          <Box size={[cap, h, w]} at={[l / 2 - cap / 2, 0, 0]} color={colors.metal} metal />
          <Box size={[cap, h, w]} at={[-l / 2 + cap / 2, 0, 0]} color={colors.metal} metal />
        </group>
      );
    }
    case "can":
      return (
        <mesh>
          <cylinderGeometry args={[Math.min(l, w) / 2, Math.min(l, w) / 2, h, 24]} />
          <Mat color={colors.can} metal />
        </mesh>
      );
    case "connector":
      return (
        <group>
          <Box size={[l, h, w]} color={colors.metal} metal />
          <Box size={[l * 0.7, h * 0.5, 0.002]} at={[0, 0, w / 2 + 0.001]} color={colors.ic} />
        </group>
      );
    case "diode":
    case "box":
    default:
      return <Box size={[l, h, w]} color={colors.box} />;
  }
}
