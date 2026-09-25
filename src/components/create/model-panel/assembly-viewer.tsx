"use client";

// SSR-safe wrapper round the WebGL viewer. The impl is dynamic-imported with
// ssr:false (the PCB 3D tab's pattern), and a canvas that cannot be created
// at all — no WebGL, a blocked context — is caught here and reported, so the
// panel shows its error state instead of a blank box.

import * as React from "react";
import dynamic from "next/dynamic";
import type { AssemblyViewerProps } from "./viewer-types";

const Impl = dynamic(() => import("./assembly-viewer-impl").then((m) => m.AssemblyViewerImpl), {
  ssr: false,
  loading: () => null,
});

class ViewerBoundary extends React.Component<
  { onError: () => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function AssemblyViewer(props: AssemblyViewerProps) {
  return (
    <ViewerBoundary onError={props.onError}>
      <Impl {...props} />
    </ViewerBoundary>
  );
}
