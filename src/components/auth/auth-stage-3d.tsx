"use client";

// The sign-in stage's 3D scene — dynamic-imported by auth-stage.tsx (no SSR).
// What IDEEZA makes, drawn live: a board on the brand's deep violet solder
// mask, its traces lit, the parts the prompt asked for (MCU, LoRa radio in its
// shield can, solar input, antenna), and the printed enclosure opening and
// closing around it. Drag turns it; it turns slowly by itself. Under reduced
// motion it holds still, opened, and draws only when dragged.
//
// Colours are the DS tokens (useTokens), read once and on a theme flip; the
// stage itself is dark in both themes. Plain primitives, as the assembly
// viewer draws, but dense enough to read as a real board.

import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Edges, Environment, Float, Grid, Html, Lightformer, OrbitControls, RoundedBox } from "@react-three/drei";
import { useTokens } from "@/lib/three/use-tokens";

type Vec3 = [number, number, number];

const TOKENS = [
  "--color-violet-950",
  "--color-violet-900",
  "--color-violet-700",
  "--color-violet-400",
  "--color-violet-300",
  "--color-blue-400",
  "--color-gray-950",
  "--color-gray-800",
  "--color-gray-300",
  "--color-yellow-400",
  "--color-green-400",
  "--color-white",
];

type Palette = {
  mask: string;
  floor: string;
  section: string;
  trace: string;
  traceSoft: string;
  power: string;
  chip: string;
  dark: string;
  metal: string;
  gold: string;
  led: string;
  white: string;
};

const BOARD: Vec3 = [6.4, 0.14, 4.2];
const TOP = BOARD[1] / 2;

// A seeded walk, so the traces are the same on every visit.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Manhattan traces fanning out of the MCU's four sides to the board's edges. */
function useTraces(): { a: Vec3; b: Vec3; power: boolean }[][] {
  return React.useMemo(() => {
    const rnd = seeded(7);
    const nets: { a: Vec3; b: Vec3; power: boolean }[][] = [];
    const mcu: [number, number] = [-0.6, 0];
    for (let side = 0; side < 4; side += 1) {
      for (let i = 0; i < 6; i += 1) {
        const off = -0.5 + i * 0.2;
        const start: [number, number] =
          side === 0 ? [mcu[0] + 0.72, mcu[1] + off] : side === 1 ? [mcu[0] - 0.72, mcu[1] + off] : side === 2 ? [mcu[0] + off, mcu[1] + 0.72] : [mcu[0] + off, mcu[1] - 0.72];
        const run = 0.4 + rnd() * 1.4;
        const turn = (rnd() - 0.5) * 1.6;
        const mid: [number, number] =
          side === 0 ? [start[0] + run, start[1]] : side === 1 ? [start[0] - run, start[1]] : side === 2 ? [start[0], start[1] + run * 0.7] : [start[0], start[1] - run * 0.7];
        const end: [number, number] = side < 2 ? [mid[0], Math.max(-1.9, Math.min(1.9, mid[1] + turn))] : [Math.max(-3, Math.min(3, mid[0] + turn)), mid[1]];
        const y = TOP + 0.006;
        nets.push([
          { a: [start[0], y, start[1]], b: [mid[0], y, mid[1]], power: i === 0 },
          { a: [mid[0], y, mid[1]], b: [end[0], y, end[1]], power: i === 0 },
        ]);
      }
    }
    return nets;
  }, []);
}

function Trace({ a, b, color }: { a: Vec3; b: Vec3; color: string }) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dz);
  if (len < 0.01) return null;
  const horizontal = Math.abs(dx) > Math.abs(dz);
  return (
    <mesh position={[(a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2]}>
      <boxGeometry args={horizontal ? [len + 0.035, 0.012, 0.035] : [0.035, 0.012, len + 0.035]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} toneMapped={false} />
    </mesh>
  );
}

function Via({ at, color }: { at: Vec3; color: string }) {
  return (
    <mesh position={[at[0], at[1] + 0.004, at[2]]}>
      <cylinderGeometry args={[0.055, 0.055, 0.02, 16]} />
      <meshStandardMaterial color={color} metalness={0.9} roughness={0.25} />
    </mesh>
  );
}

/** A QFN-style chip: a body, its pins on four sides, a pin-1 dot. */
function Chip({ at, size, p }: { at: Vec3; size: number; p: Palette }) {
  const pins = 9;
  const h = 0.16;
  return (
    <group position={at}>
      <RoundedBox args={[size, h, size]} radius={0.03} smoothness={3} position={[0, h / 2, 0]}>
        <meshStandardMaterial color={p.chip} roughness={0.35} metalness={0.2} />
      </RoundedBox>
      {Array.from({ length: pins * 4 }, (_, k) => {
        const side = Math.floor(k / pins);
        const t = -size / 2 + 0.12 + ((size - 0.24) * (k % pins)) / (pins - 1);
        const edge = size / 2 + 0.04;
        const pos: Vec3 = side === 0 ? [edge, 0.02, t] : side === 1 ? [-edge, 0.02, t] : side === 2 ? [t, 0.02, edge] : [t, 0.02, -edge];
        const rot = side < 2;
        return (
          <mesh key={k} position={pos}>
            <boxGeometry args={rot ? [0.12, 0.03, 0.05] : [0.05, 0.03, 0.12]} />
            <meshStandardMaterial color={p.metal} metalness={0.9} roughness={0.3} />
          </mesh>
        );
      })}
      <mesh position={[-size / 2 + 0.16, h + 0.002, -size / 2 + 0.16]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.05, 16]} />
        <meshStandardMaterial color={p.dark} />
      </mesh>
    </group>
  );
}

function Board({ p, explodeRef }: { p: Palette; explodeRef: React.MutableRefObject<number> }) {
  const nets = useTraces();
  const lid = React.useRef<THREE.Group>(null);
  const base = React.useRef<THREE.Group>(null);

  useFrame(() => {
    const e = explodeRef.current;
    if (lid.current) lid.current.position.y = 0.55 + e * 1.15;
    if (base.current) base.current.position.y = -0.42 - e * 0.85;
  });

  return (
    <group>
      {/* The board: the brand's deep violet solder mask. */}
      <RoundedBox args={BOARD} radius={0.06} smoothness={4}>
        <meshStandardMaterial color={p.mask} roughness={0.42} metalness={0.25} />
      </RoundedBox>

      {nets.map((net, n) =>
        net.map((seg, s) => <Trace key={`${n}-${s}`} a={seg.a} b={seg.b} color={seg.power ? p.power : n % 3 ? p.traceSoft : p.trace} />),
      )}
      {nets.map((net, n) => (
        <Via key={`v${n}`} at={net[1].b} color={p.gold} />
      ))}

      {/* MCU and two support chips. */}
      <Chip at={[-0.6, TOP, 0]} size={1.3} p={p} />
      <Chip at={[0.95, TOP, 1.15]} size={0.55} p={p} />
      <Chip at={[-2.2, TOP, -1.2]} size={0.5} p={p} />

      {/* LoRa radio in its shield can. */}
      <RoundedBox args={[1.45, 0.26, 1.05]} radius={0.04} smoothness={3} position={[1.85, TOP + 0.13, -0.95]}>
        <meshStandardMaterial color={p.metal} metalness={0.95} roughness={0.22} />
      </RoundedBox>

      {/* The antenna: a meander trace on the board's edge. */}
      {Array.from({ length: 7 }, (_, i) => (
        <Trace key={`ant${i}`} a={[2.55 + (i % 2) * 0.35, TOP + 0.006, 0.2 + i * 0.22]} b={[2.55 + (i % 2) * 0.35, TOP + 0.006, 0.42 + i * 0.22]} color={p.trace} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <Trace key={`antx${i}`} a={[2.55, TOP + 0.006, 0.42 + i * 0.22]} b={[2.9, TOP + 0.006, 0.42 + i * 0.22]} color={p.trace} />
      ))}

      {/* Solar input: a connector on the left edge. */}
      <RoundedBox args={[0.55, 0.32, 0.8]} radius={0.05} smoothness={3} position={[-2.95, TOP + 0.16, 1.2]}>
        <meshStandardMaterial color={p.white} roughness={0.5} />
      </RoundedBox>

      {/* Capacitors, a crystal, two status LEDs. */}
      {([[-1.6, 1.4], [-1.25, 1.4], [0.2, -1.5], [0.55, -1.5], [2.3, 1.55]] as [number, number][]).map(([x, z], i) => (
        <group key={`c${i}`} position={[x, TOP, z]}>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.32, 20]} />
            <meshStandardMaterial color={p.dark} roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.325, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.01, 20]} />
            <meshStandardMaterial color={p.metal} metalness={0.9} roughness={0.25} />
          </mesh>
        </group>
      ))}
      <RoundedBox args={[0.45, 0.12, 0.2]} radius={0.04} position={[0.4, TOP + 0.06, 0.2]}>
        <meshStandardMaterial color={p.metal} metalness={0.95} roughness={0.2} />
      </RoundedBox>
      {([[-2.6, -1.75, p.led], [-2.35, -1.75, p.power]] as [number, number, string][]).map(([x, z, c], i) => (
        <mesh key={`led${i}`} position={[x, TOP + 0.04, z]}>
          <boxGeometry args={[0.14, 0.08, 0.1]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      ))}

      {/* The printed enclosure: lid and base, drawn as glass with lit edges. */}
      <group ref={lid}>
        <RoundedBox args={[6.9, 0.5, 4.7]} radius={0.18} smoothness={4}>
          <meshStandardMaterial color={p.white} transparent opacity={0.06} roughness={0.1} depthWrite={false} />
          <Edges color={p.trace} threshold={20} />
        </RoundedBox>
      </group>
      <group ref={base}>
        <RoundedBox args={[6.9, 0.45, 4.7]} radius={0.18} smoothness={4}>
          <meshStandardMaterial color={p.white} transparent opacity={0.05} roughness={0.1} depthWrite={false} />
          <Edges color={p.traceSoft} threshold={20} />
        </RoundedBox>
      </group>
    </group>
  );
}

/** Opens and closes the enclosure, slowly; held open under reduced motion. */
function Explode({ explodeRef, still }: { explodeRef: React.MutableRefObject<number>; still: boolean }) {
  useFrame(({ clock }) => {
    if (still) {
      explodeRef.current = 1;
      return;
    }
    const t = (Math.sin(clock.getElapsedTime() * 0.55) + 1) / 2;
    explodeRef.current = t * t * (3 - 2 * t);
  });
  return null;
}

function Label({ at, children }: { at: Vec3; children: React.ReactNode }) {
  return (
    <Html position={at} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div className="flex items-center gap-[6px] whitespace-nowrap rounded-full border border-solid border-[color:color-mix(in_srgb,var(--color-white)_18%,transparent)] bg-[color:color-mix(in_srgb,var(--color-violet-950)_72%,transparent)] px-[10px] py-[4px] text-sm font-medium leading-sm text-[color:var(--color-white)] shadow-3">
        <span className="size-[6px] rounded-full bg-[var(--color-violet-300)]" />
        {children}
      </div>
    </Html>
  );
}

export function AuthStage3D({ still, labels }: { still: boolean; labels: boolean }) {
  const [mask, floor, section, traceSoft, trace, power, chip, dark, metal, gold, led, white] = useTokens(TOKENS);
  const p: Palette = { mask, floor, section, trace, traceSoft, power, chip, dark, metal, gold, led, white };
  const explodeRef = React.useRef(still ? 1 : 0);
  // The scene fades in once its first frame is drawn, instead of popping in.
  const [ready, setReady] = React.useState(false);

  return (
    <Canvas
      onCreated={() => requestAnimationFrame(() => setReady(true))}
      className={ready ? "opacity-100 transition-opacity duration-[var(--motion-duration-normal)] ease-out" : "opacity-0"}
      dpr={[1, 1.75]}
      frameloop={still ? "demand" : "always"}
      camera={{ position: [10.5, 7.8, 11], fov: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      aria-hidden
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 9, 6]} intensity={1.6} />
      <pointLight position={[-6, 2.5, -4]} intensity={60} color={trace} distance={18} />
      <pointLight position={[6, 1.5, 5]} intensity={40} color={power} distance={18} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, -4]} scale={[10, 3, 1]} color={white} />
        <Lightformer form="rect" intensity={1.2} position={[-6, 2, 2]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} color={trace} />
        <Lightformer form="rect" intensity={1.2} position={[6, 2, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 2, 1]} color={power} />
      </Environment>

      <Explode explodeRef={explodeRef} still={still} />
      <Float enabled={!still} speed={1.1} rotationIntensity={0.12} floatIntensity={0.35}>
        <group rotation={[0, -0.35, 0]} scale={0.82} position={[0, 0.4, 0]}>
          <Board p={p} explodeRef={explodeRef} />
          {labels ? (
            <>
              <Label at={[-0.6, 0.7, 0]}>ESP32-S3 · MCU</Label>
              <Label at={[1.85, 0.75, -0.95]}>SX1262 · LoRa radio</Label>
              <Label at={[-2.95, 0.75, 1.2]}>Solar in · 6 V</Label>
              <Label at={[2.75, 0.45, 1.6]}>Antenna · 868 MHz</Label>
            </>
          ) : null}
        </group>
      </Float>

      <ContactShadows position={[0, -1.9, 0]} opacity={0.55} scale={16} blur={2.6} far={5} color={mask} />
      <Grid
        position={[0, -1.92, 0]}
        args={[40, 40]}
        cellSize={0.6}
        cellThickness={0.6}
        cellColor={floor}
        sectionSize={3}
        sectionThickness={1}
        sectionColor={section}
        fadeDistance={26}
        fadeStrength={1.4}
        infiniteGrid
      />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={!still}
        autoRotateSpeed={0.55}
        enableDamping
        target={[0, -1.6, 0]}
        minPolarAngle={0.55}
        maxPolarAngle={1.35}
      />
    </Canvas>
  );
}
