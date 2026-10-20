"use client";

// Assembly's canvas, loaded without SSR (three.js), with the same recovery
// the other 3D views have: a permanently lost WebGL context gets a fresh canvas.

import * as React from "react";
import dynamic from "next/dynamic";
import type { AssemblyCanvasProps } from "./assembly-canvas-impl";

const Impl = dynamic(() => import("./assembly-canvas-impl").then((m) => m.AssemblyCanvasImpl), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center text-sm leading-xs text-text-secondary">Loading the assembly…</div>,
});

export function AssemblyCanvas(props: AssemblyCanvasProps) {
  const [remount, setRemount] = React.useState(0);
  React.useEffect(() => {
    const onLost = () => {
      const t = window.setTimeout(() => setRemount((k) => k + 1), 1200);
      window.addEventListener("webglcontextrestored", () => window.clearTimeout(t), { once: true, capture: true });
    };
    window.addEventListener("webglcontextlost", onLost, true);
    return () => window.removeEventListener("webglcontextlost", onLost, true);
  }, []);
  return (
    <div className="absolute inset-0">
      <Impl key={remount} {...props} />
    </div>
  );
}
