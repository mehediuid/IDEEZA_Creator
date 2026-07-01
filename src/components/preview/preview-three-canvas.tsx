"use client";

// Preview canvas — public shape lives here so the heavy implementation
// (three.js + drei) can be dynamic-imported and skipped under SSR. Same
// pattern the /3d module uses for its own canvas.

import * as React from "react";
import dynamic from "next/dynamic";
import type { PreviewCanvasProps } from "./preview-three-canvas-impl";

const PreviewCanvasImpl = dynamic(
  () =>
    import("./preview-three-canvas-impl").then((m) => m.PreviewCanvasImpl),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-secondary)",
          fontSize: 13,
        }}
      >
        Loading product preview…
      </div>
    ),
  },
);

export function PreviewCanvas(props: PreviewCanvasProps) {
  // Auto-remount on permanent WebGL context loss — mirror the /3d module's
  // resilience pattern. Some drivers permanently kill the context after a
  // tab throttle / GPU stall and the only recovery is a fresh canvas.
  const [remountKey, setRemountKey] = React.useState(0);
  React.useEffect(() => {
    const onLost = () => {
      const t = window.setTimeout(() => setRemountKey((k) => k + 1), 1200);
      window.addEventListener(
        "webglcontextrestored",
        () => window.clearTimeout(t),
        { once: true, capture: true },
      );
    };
    window.addEventListener("webglcontextlost", onLost, true);
    return () => window.removeEventListener("webglcontextlost", onLost, true);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <PreviewCanvasImpl key={remountKey} {...props} />
    </div>
  );
}
