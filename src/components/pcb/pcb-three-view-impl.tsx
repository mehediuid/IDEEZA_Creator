"use client";

// Heavy three.js implementation of the PCB 3D tab — dynamic-imported by
// PcbThreeView so it never runs under SSR. Read-only inspection viewer driven
// by the 3D top-toolbar cluster: camera presets (top/bottom/iso), fit, a
// perspective↔orthographic toggle, and an explode view. No 2D editing here.

import * as React from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, PerspectiveCamera, OrthographicCamera } from "@react-three/drei";
import { usePcbState } from "@/lib/pcb/store";
import { derivePcbScene } from "@/lib/pcb/pcb-scene";
import { PcbSceneMeshes } from "./pcb-meshes";

type Preset = "iso" | "top" | "bottom";

// Ref to the drei OrbitControls instance (we drive its .target / .update()).
type OrbitRef = React.ComponentRef<typeof OrbitControls>;

// Camera position for a view preset, scaled to the board size. The tiny Z on
// top/bottom avoids OrbitControls gimbal lock when looking straight down/up.
function presetPos(preset: Preset, m: number): [number, number, number] {
  if (preset === "top") return [0, m * 1.5, 0.0001];
  if (preset === "bottom") return [0, -m * 1.5, 0.0001];
  return [m * 0.8, m * 0.75, m * 0.95];
}

// CameraRig lives INSIDE the Canvas so it can reach the active camera +
// OrbitControls and imperatively apply preset snaps / fit on nonce bumps.
function CameraRig({
  preset,
  presetNonce,
  fitNonce,
  boardMax,
  controls,
}: {
  preset: Preset;
  presetNonce: number;
  fitNonce: number;
  boardMax: number;
  controls: React.RefObject<OrbitRef | null>;
}) {
  const { camera, size } = useThree();

  const applyPreset = React.useCallback(() => {
    const [x, y, z] = presetPos(preset, boardMax);
    camera.position.set(x, y, z);
    if (controls.current) {
      controls.current.target.set(0, 0, 0);
      controls.current.update();
    }
  }, [preset, boardMax, camera, controls]);

  const fit = React.useCallback(() => {
    const ortho = (camera as { isOrthographicCamera?: boolean }).isOrthographicCamera;
    if (ortho) {
      // Mutating the three.js camera is the R3F idiom (OrbitControls does the
      // same on scroll); the immutability rule doesn't apply to scene objects.
      // eslint-disable-next-line react-hooks/immutability
      (camera as unknown as { zoom: number }).zoom = Math.max(20, size.height / (boardMax * 1.7));
      camera.updateProjectionMatrix();
    } else {
      const [x, y, z] = presetPos(preset, boardMax);
      camera.position.set(x, y, z);
    }
    if (controls.current) {
      controls.current.target.set(0, 0, 0);
      controls.current.update();
    }
  }, [camera, size.height, boardMax, preset, controls]);

  // Apply preset on mount + each preset click.
  React.useEffect(() => {
    applyPreset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetNonce]);
  // Fit on each fit click.
  React.useEffect(() => {
    if (fitNonce > 0) fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitNonce]);

  return null;
}

export function PcbThreeViewImpl() {
  const state = usePcbState();
  const scene = React.useMemo(
    () => derivePcbScene(state),
    // Only these slices feed the derivation — keep the memo tight so canvas
    // pans/zooms in state don't rebuild the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.pcbBoard, state.threeD, state.objects, state.pcbLayers],
  );
  const bg = state.threeD.bgColor || "#1E1E1E";
  const p3d = state.pcb3d;
  const boardMax = Math.max(scene.board.width, scene.board.depth) || 8;
  const controls = React.useRef<OrbitRef | null>(null);
  const initial = presetPos(p3d.preset, boardMax);

  return (
    <Canvas
      shadows
      dpr={1}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ position: "absolute", inset: 0, background: bg }}
    >
      {/* Active camera — swaps between perspective and orthographic. Keyed so a
          projection toggle cleanly remounts the camera + rebinds OrbitControls. */}
      {p3d.projection === "orthographic" ? (
        <OrthographicCamera makeDefault position={initial} zoom={boardMax > 0 ? 640 / boardMax : 80} near={0.1} far={400} />
      ) : (
        <PerspectiveCamera makeDefault position={initial} fov={42} near={0.1} far={400} />
      )}

      {/* Plain lights only — no HDR environment, so the tab renders even with
          no network access (drei Environment presets fetch from a CDN). */}
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-6, 8, -6]} intensity={0.3} />

      <Grid
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#6b7280"
        sectionSize={2.5}
        sectionThickness={1.2}
        sectionColor="#7c2db9"
        fadeDistance={28}
        fadeStrength={1.5}
        followCamera={false}
        infiniteGrid
        position={[0, -0.001, 0]}
      />

      <OrbitControls
        key={p3d.projection}
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={1.2}
        maxDistance={80}
      />

      <CameraRig
        preset={p3d.preset}
        presetNonce={p3d.presetNonce}
        fitNonce={p3d.fitNonce}
        boardMax={boardMax}
        controls={controls}
      />

      <PcbSceneMeshes scene={scene} explode={p3d.explode} />
    </Canvas>
  );
}
