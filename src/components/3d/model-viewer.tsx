"use client";

// ModelViewer — reusable .glb viewer. SSR-safe wrapper around the WebGL impl
// (dynamic-imported with ssr:false), so it can be dropped into any client
// surface (the AI-generate modal now; the build review page later).

import dynamic from "next/dynamic";

const ModelViewerImpl = dynamic(
  () => import("./model-viewer-impl").then((m) => m.ModelViewerImpl),
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
          color: "var(--color-text-tertiary)",
          fontSize: "var(--font-size-sm)",
        }}
      >
        Loading viewer…
      </div>
    ),
  },
);

export function ModelViewer({
  url,
  onLoaded,
  onError,
}: {
  url: string;
  onLoaded?: () => void;
  onError?: () => void;
}) {
  return <ModelViewerImpl url={url} onLoaded={onLoaded} onError={onError} />;
}
