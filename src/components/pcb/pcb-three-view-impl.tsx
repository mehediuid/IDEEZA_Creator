"use client";

// Heavy three.js implementation of the PCB 3D tab — dynamic-imported by
// PcbThreeView so it never runs under SSR. Read-only orbit viewer: no
// selection or gizmos here (editing happens in schematic/PCB modes; the
// Product Preview owns instance selection).

import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { usePcbState } from "@/lib/pcb/store";
import { derivePcb3D } from "@/lib/pcb/pcb-3d";
import { PcbBoardMesh, PcbComponentMesh } from "./pcb-meshes";

export function PcbThreeViewImpl() {
  const state = usePcbState();
  const { board, components } = React.useMemo(
    () => derivePcb3D(state),
    // Only these slices feed the derivation — keep the memo tight so canvas
    // pans/zooms in state don't rebuild the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.pcbBoard, state.threeD, state.objects],
  );
  const bg = state.threeD.bgColor || "#1E1E1E";

  return (
    <Canvas
      shadows
      camera={{ position: [5, 4.5, 6], fov: 40, near: 0.1, far: 200 }}
      dpr={1}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ position: "absolute", inset: 0, background: bg }}
    >
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
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={1.2}
        maxDistance={80}
      />

      <group name="pcb-group">
        <PcbBoardMesh board={board} />
        {components.map((c) => (
          <PcbComponentMesh key={c.id} component={c} board={board} />
        ))}
      </group>
    </Canvas>
  );
}
