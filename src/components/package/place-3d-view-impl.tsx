"use client";

// 3D Placement — the real viewer (dynamic-imported, never runs under SSR).
//
// The spec's prototype used a CSS-transform box and its own design notes say
// production needs an actual 3D viewer with the same controls, so this is
// three.js: the board, the real pad layout as flat reference patches, and the
// body placed against them. Misalignment between the body and the pads is the
// whole point of this step, so the pads are drawn from the footprint model
// itself rather than a picture of it.
//
// Millimetres map 1:1 into scene units (x → x, footprint y → z, up → y), and
// the camera frames from the footprint's own extent, so a 2 mm part and a
// 20 mm part both arrive framed.

import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { type PackageDraft, fpPads } from "@/lib/package/types";

const BOARD_T = 1.6;

/** Read design tokens as concrete colours — three.js needs a value, not a
 *  var(). Re-read when the theme flips so the scene follows the DS. */
function useTokens(names: string[]): string[] {
  const key = names.join("|");
  const [vals, setVals] = React.useState<string[]>(() => names.map(() => "#888888"));
  React.useEffect(() => {
    const list = key.split("|");
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      setVals(list.map((n) => cs.getPropertyValue(n).trim() || "#888888"));
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [key]);
  return vals;
}

export type Extent = { minX: number; maxX: number; minY: number; maxY: number };

export function padExtent(draft: PackageDraft): Extent {
  const pads = fpPads(draft);
  if (!pads.length) return { minX: -2, maxX: 2, minY: -2, maxY: 2 };
  return pads.reduce<Extent>(
    (a, p) => ({
      minX: Math.min(a.minX, p.x - p.w / 2),
      maxX: Math.max(a.maxX, p.x + p.w / 2),
      minY: Math.min(a.minY, p.y - p.h / 2),
      maxY: Math.max(a.maxY, p.y + p.h / 2),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
}

/** The body's own width and depth. A real footprint states them with a
 *  silkscreen outline, so that rectangle is used when the user drew one;
 *  otherwise a nominal 72% of the pad extent, which reads correctly for the
 *  common case where the body sits inside its lands. Nominal, not IPC-7351 —
 *  the same honest limit the wizard's geometry carries. */
export function bodySize(draft: PackageDraft): { w: number; d: number } {
  const silk = draft.footprint.find((o) => o.kind === "rect" && o.layer.endsWith("Silkscreen"));
  if (silk && silk.kind === "rect") return { w: Math.max(0.4, silk.w), d: Math.max(0.4, silk.h) };
  const e = padExtent(draft);
  return { w: Math.max(0.4, (e.maxX - e.minX) * 0.72), d: Math.max(0.4, (e.maxY - e.minY) * 0.72) };
}

function Scene({ draft }: { draft: PackageDraft }) {
  const [boardCol, copperCol, mechCol] = useTokens(["--color-bg-surface", "--color-pad-copper", "--color-pad-mechanical"]);
  const pads = fpPads(draft);
  const e = padExtent(draft);
  const cx = (e.minX + e.maxX) / 2;
  const cy = (e.minY + e.maxY) / 2;
  const boardW = Math.max(6, e.maxX - e.minX + 4);
  const boardD = Math.max(6, e.maxY - e.minY + 4);
  const body = bodySize(draft);
  const b = draft.body;

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[8, 14, 8]} intensity={1.1} />
      <directionalLight position={[-6, 6, -8]} intensity={0.35} />

      {/* Board — centred on the footprint's own extent */}
      <mesh position={[0, -BOARD_T / 2, 0]}>
        <boxGeometry args={[boardW, BOARD_T, boardD]} />
        <meshStandardMaterial color={boardCol} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Pads — flat reference patches on the board surface */}
      {pads.map((p) => (
        <mesh key={p.id} position={[p.x - cx, 0.03, p.y - cy]}>
          <boxGeometry args={[p.w, 0.06, p.h]} />
          <meshStandardMaterial color={p.padKind === "Mounting" ? mechCol : copperCol} roughness={0.35} metalness={0.7} />
        </mesh>
      ))}

      {/* The body being placed — offsets, standoff, rotation and height are the
          step's controls, applied exactly as the model states them. */}
      <group position={[b.x, b.z, b.y]} rotation={[0, (b.rot * Math.PI) / 180, 0]}>
        <mesh position={[0, b.height / 2, 0]}>
          <boxGeometry args={[body.w, b.height, body.d]} />
          <meshStandardMaterial color={b.color} roughness={0.55} metalness={0.15} />
        </mesh>
      </group>

      <OrbitControls enablePan={false} minDistance={4} maxDistance={90} target={[0, 0, 0]} />
    </>
  );
}

export function Place3DViewImpl({ draft }: { draft: PackageDraft }) {
  const [bg] = useTokens(["--color-bg-subtle"]);
  const e = padExtent(draft);
  const span = Math.max(6, e.maxX - e.minX, e.maxY - e.minY);
  const dist = span * 2.2 + 6;

  return (
    <Canvas
      camera={{ position: [dist * 0.55, dist * 0.6, dist * 0.75], fov: 40, near: 0.1, far: 500 }}
      style={{ background: bg }}
      dpr={[1, 2]}
    >
      <Scene draft={draft} />
    </Canvas>
  );
}
