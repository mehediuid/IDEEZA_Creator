"use client";

// ModelPanel, loaded on demand. The panel's code — and three.js behind it —
// arrives in its own chunk the first time this renders, never with the page
// that holds it (COR-33, COR-102). A page mounts it only once the maker asks
// for the model (the product page's View in 3D). Props are ModelPanel's own.

import * as React from "react";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ideeza";

export const ModelPanelLazy = dynamic(
  () => import("./model-panel").then((m) => m.ModelPanel),
  { ssr: false, loading: () => <ViewerLoading /> },
);

function ViewerLoading() {
  return (
    <div
      role="status"
      className="flex h-[420px] items-center justify-center gap-4 rounded-xl border border-border bg-bg-subtle text-md text-text-secondary"
    >
      <Spinner />
      Loading the 3D viewer…
    </div>
  );
}
