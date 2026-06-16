"use client";

// IDEEZA PCB Software — full-viewport shell.
// The editor sections are all anchored (top/bottom/left/right), so instead of
// scaling a fixed artboard we let the root fill the whole viewport: fixed-size
// chrome (bars, side panels) with a fluid canvas in the middle — like a real
// desktop app. data-theme="light" keeps the editor light (still token-themeable).

import * as React from "react";

export function EditorShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="pcb-app"
      data-theme="light"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--color-bg-surface)",
        color: "var(--color-text-primary)",
        overflow: "hidden",
        userSelect: "none",
        fontFamily: "var(--font-family-body)",
      }}
    >
      {children}
    </div>
  );
}

/** Renders a verbatim HTML slice (static chrome) via dangerouslySetInnerHTML. */
export function Raw({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
