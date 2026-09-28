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

/** The panel's own frame round a box of its viewer's 522 px (model-panel.tsx),
 *  so the tab keeps its height when the chunk lands. */
function ViewerLoading() {
  return (
    <div className="rounded-2xl border border-solid border-card-border bg-bg-surface p-7">
      <div
        role="status"
        className="flex h-[522px] items-center justify-center gap-4 rounded-xl border border-solid border-border bg-bg-subtle text-md text-text-secondary"
      >
        <Spinner />
        Loading the 3D viewer…
      </div>
    </div>
  );
}
