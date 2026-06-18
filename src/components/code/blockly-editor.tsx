"use client";

// IDEEZA Code — Blockly mode. Outer chrome stays static while the actual
// workspace is dynamic-imported (Blockly needs window/document at module
// init), so SSR doesn't blow up.

import * as React from "react";
import dynamic from "next/dynamic";

const BlocklyImpl = dynamic(() => import("./blockly-impl").then((m) => m.BlocklyImpl), {
  ssr: false,
  loading: () => (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}>
      Loading Blockly…
    </div>
  ),
});

export function BlocklyEditor({ topOffset = 172, leftOffset = 74 }: { topOffset?: number; leftOffset?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        bottom: 36,
        left: leftOffset,
        right: 0,
        background: "var(--color-bg-page)",
      }}
    >
      <BlocklyImpl />
    </div>
  );
}
