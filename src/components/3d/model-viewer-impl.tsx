"use client";

// ModelViewerImpl — the WebGL half of <ModelViewer>. Loads a .glb and frames
// it automatically (Bounds + Center), with orbit controls and neutral studio
// lighting (no HDRI so it never needs a network fetch). Dynamic-imported by
// model-viewer.tsx so it stays out of SSR.

import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Center, OrbitControls, Html, useGLTF } from "@react-three/drei";

function Model({ url, onLoaded }: { url: string; onLoaded?: () => void }) {
  const { scene } = useGLTF(url);
  // Clone so the cached gltf scene isn't mutated by Bounds/Center and so the
  // same model can be remounted cleanly on a regenerate.
  const object = React.useMemo(() => scene.clone(true), [scene]);
  React.useEffect(() => {
    onLoaded?.();
  }, [onLoaded, object]);
  return <primitive object={object} />;
}

// Catches an actual load failure (bad URL, network) — Suspense only handles
// the loading promise, not a rejection.
class GLBErrorBoundary extends React.Component<
  { onError: () => void; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

export function ModelViewerImpl({
  url,
  onLoaded,
  onError,
}: {
  url: string;
  onLoaded?: () => void;
  onError?: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 4], fov: 40 }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 6, 5]} intensity={1.1} />
      <directionalLight position={[-5, -2, -4]} intensity={0.35} />
      <GLBErrorBoundary onError={() => onError?.()}>
        <React.Suspense
          fallback={
            <Html center>
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-tertiary)",
                  whiteSpace: "nowrap",
                }}
              >
                Loading model…
              </div>
            </Html>
          }
        >
          {/* key forces a clean remount + refit when the model URL changes. */}
          <Bounds key={url} fit clip observe margin={1.25}>
            <Center>
              <Model url={url} onLoaded={onLoaded} />
            </Center>
          </Bounds>
        </React.Suspense>
      </GLBErrorBoundary>
      <OrbitControls makeDefault enablePan={false} minDistance={1.5} maxDistance={20} />
    </Canvas>
  );
}
