"use client";

// Wiring — the real module (no longer a Product Preview clone). Its own
// workspace: TopBar with a Draw menu, the shared module rail, a Peripheral
// Parts library (left), the SVG wiring stage (center) and the wire parameter
// panel (right). Connect peripheral parts pin-to-pin with the wire-tool family.

import * as React from "react";
import { useStepNav } from "@/components/manual/use-step-nav";
import { EditorShell } from "@/components/pcb/editor-shell";
import { TopBar } from "@/components/pcb/top-bar";
import { LeftRail } from "@/components/pcb/left-rail";
import { WiringProvider, useWiring } from "./wiring-context";
import { WiringLibrary } from "./wiring-library";
import { WiringCanvas } from "./wiring-canvas";
import { WiringRightPanel } from "./wiring-right-panel";

const TOP = 62; // TopBar height (no extra toolbar strip for wiring)
const LEFT_RAIL = 74;
const LEFT_PANEL = 292;
const RIGHT_PANEL = 300;

export function WiringApp() {
  return (
    <WiringProvider>
      <WiringBody />
    </WiringProvider>
  );
}

function WiringBody() {
  const { go } = useStepNav();
  const { toast } = useWiring();

  return (
    <EditorShell>
      <TopBar />
      <LeftRail topOffset={TOP} bottomOffset={0} activeKey="wiring" />
      <WiringLibrary topOffset={TOP} />
      <WiringCanvas topOffset={TOP} leftOffset={LEFT_RAIL + LEFT_PANEL} rightOffset={RIGHT_PANEL} />
      <WiringRightPanel topOffset={TOP} />

      {/* flow pills */}
      <FlowPill kind="back" label="Back to Preview" onClick={() => go("preview")} style={{ left: LEFT_RAIL + LEFT_PANEL + 20, bottom: 20 }} />
      <FlowPill kind="forward" label="Continue to Brief" onClick={() => go("brief")} style={{ right: RIGHT_PANEL + 20, bottom: 20 }} />

      {/* bottom bar */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 36, background: "var(--color-bg-surface)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", zIndex: 12, display: "flex", alignItems: "center", padding: "0 var(--spacing-8)", fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
        Wiring · connect peripheral parts pin-to-pin
      </div>

      {toast && (
        <div role="status" style={{ position: "absolute", bottom: 56, left: "50%", transform: "translateX(-50%)", padding: "10px 20px", background: "var(--color-bg-inverse, #1E1E1E)", color: "#fff", borderRadius: "var(--radius-lg)", boxShadow: "var(--elevation-4)", fontSize: "var(--font-size-sm)", fontWeight: 500, zIndex: 90 }}>
          {toast}
        </div>
      )}
    </EditorShell>
  );
}

function FlowPill({ kind, label, onClick, style }: { kind: "back" | "forward"; label: string; onClick: () => void; style: React.CSSProperties }) {
  const fwd = kind === "forward";
  return (
    <button
      onClick={onClick}
      className="ix-btn"
      style={{
        position: "absolute", zIndex: 18, display: "inline-flex", alignItems: "center", gap: "var(--spacing-3)",
        padding: "var(--spacing-3) var(--spacing-8)", background: "var(--color-bg-surface)",
        border: "var(--border-width-1-5) solid var(--color-border-brand)", borderRadius: "var(--radius-3xl)",
        cursor: "pointer", color: "var(--color-violet-600)", fontWeight: 600, fontSize: "var(--font-size-md)",
        boxShadow: "var(--elevation-2)", ...style,
      }}
    >
      {!fwd && <Caret dir="left" />}
      {label}
      {fwd && <Caret dir="right" />}
    </button>
  );
}

function Caret({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "right" ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
    </svg>
  );
}
