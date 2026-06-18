"use client";

// IDEEZA 3D Module — application composer.
// Phases A-D wired: chrome (TopBar + MenuBar + Toolbar + Rail), Left panel
// (Project File / Library tree), Right Settings panel (Canvas / Scene /
// Materials / Effects), and the live react-three-fiber viewport with the
// floating left-edge tools (home/fit/zoom/screenshot).
//
// Shape Creation menu items and Library tiles dispatch `ideeza:three-action`
// CustomEvents which we consume here to mutate `shapes` — that's what makes
// the viewport content-driven.

import * as React from "react";
import { useRouter } from "next/navigation";
import { EditorShell } from "@/components/pcb/editor-shell";
import { TopBar } from "@/components/pcb/top-bar";
import { ThreeRail } from "@/components/3d/three-rail";
import { ThreeMenuBar, THREE_EVENT, type ThreeAction } from "@/components/3d/three-menu-bar";
import { ThreeToolbar } from "@/components/3d/three-toolbar";
import { ThreeLeftPanel } from "@/components/3d/three-left-panel";
import { ThreeRightPanel, DEFAULT_RIGHT_STATE, type RightPanelState } from "@/components/3d/three-right-panel";
import { ThreeViewport, type SceneShape } from "@/components/3d/three-canvas";
import { ThreeFloatingTools } from "@/components/3d/three-floating-tools";
import { SketchMode } from "@/components/3d/sketch-mode";
import { C } from "@/lib/pcb/colors";

type ThreeMode = "demo" | "sketch" | "fullview" | "preview";

function Pill({
  children,
  onClick,
  leading,
  trailing,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      className="ix-btn"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--spacing-3)",
        padding: "var(--spacing-3) var(--spacing-8)",
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1-5) solid var(--color-border-brand)",
        borderRadius: "var(--radius-3xl)",
        cursor: "pointer",
        boxShadow: "var(--elevation-1)",
        color: C.primary,
        fontWeight: 600,
        fontSize: "var(--font-size-md)",
      }}
    >
      {leading}
      <span>{children}</span>
      {trailing}
    </div>
  );
}

function Caret({ dir }: { dir: "left" | "right" }) {
  const d = dir === "right" ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6";
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const SHAPE_FROM_ACTION: Partial<Record<ThreeAction, SceneShape["type"]>> = {
  "shape:box": "box",
  "shape:sphere": "sphere",
  "shape:cylinder": "cylinder",
  "shape:cone": "cone",
  "shape:torus": "torus",
  "shape:plane": "plane",
};

export function ThreeApp() {
  const router = useRouter();
  const [mode, setMode] = React.useState<ThreeMode>("demo");
  const [selectedPart, setSelectedPart] = React.useState<string | null>(null);
  const [shapes, setShapes] = React.useState<SceneShape[]>([
    { id: "default-cube", type: "box", position: [0, 0, 0] },
  ]);
  const [right, setRight] = React.useState<RightPanelState>(DEFAULT_RIGHT_STATE);
  const [resetTick, setResetTick] = React.useState(0);
  const updateRight = (next: Partial<RightPanelState>) => {
    setRight((s) => ({ ...s, ...next }));
    // Selecting "Full View Mode" from the View Option dropdown enters the
    // immersive viewport mode.
    if (next.viewOption === "Full View Mode") setMode("fullview");
  };

  const LEFT_PANEL_WIDTH = 250;
  const RIGHT_PANEL_WIDTH = 292;
  const RAIL_WIDTH = 74;
  const TOP = 132;

  // Full View Mode collapses the chrome to the minimum and lets the viewport
  // fill the screen; Preview hides editing affordances entirely.
  const fullView = mode === "fullview";
  const preview  = mode === "preview";
  const showChrome = mode === "demo" || mode === "sketch";
  const showPanels = mode === "demo";
  const viewportLeft  = mode === "fullview" || mode === "preview" ? RAIL_WIDTH : RAIL_WIDTH + LEFT_PANEL_WIDTH;
  const viewportRight = mode === "fullview" || mode === "preview" ? 0 : RIGHT_PANEL_WIDTH;
  const viewportTop   = mode === "fullview" || mode === "preview" ? 62 : TOP;

  const addShape = (type: SceneShape["type"]) => {
    const id = `${type}-${Date.now()}`;
    setShapes((arr) => {
      // Place the new shape slightly offset from existing ones so it's
      // immediately visible rather than buried inside the cube.
      const dx = arr.length * 0.6;
      return [...arr, { id, type, position: [dx, 0, dx] }];
    });
    setSelectedPart(id);
  };

  React.useEffect(() => {
    const handler = (e: Event) => {
      const action = (e as CustomEvent<{ action: ThreeAction }>).detail?.action;
      if (!action) return;
      const shape = SHAPE_FROM_ACTION[action];
      if (shape) {
        addShape(shape);
        return;
      }
      switch (action) {
        case "settings:resetView":
          setResetTick((t) => t + 1);
          return;
        case "shape:sketch":
          setMode("sketch");
          return;
        default:
          return;
      }
    };
    window.addEventListener(THREE_EVENT, handler as EventListener);
    return () => window.removeEventListener(THREE_EVENT, handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EditorShell>
      <TopBar />
      {showChrome && <ThreeMenuBar />}
      {showChrome && <ThreeToolbar onSketchClick={() => setMode("sketch")} />}
      <ThreeRail topOffset={fullView || preview ? 62 : TOP} />
      {showPanels && (
        <>
          <ThreeLeftPanel topOffset={TOP} selectedId={selectedPart} onSelect={setSelectedPart} width={LEFT_PANEL_WIDTH} />
          <ThreeRightPanel topOffset={TOP} width={RIGHT_PANEL_WIDTH} state={right} onChange={updateRight} />
        </>
      )}

      {mode === "sketch" && (
        <SketchMode
          topOffset={TOP}
          onExit={() => setMode("demo")}
          onSave={() => setMode("demo")}
        />
      )}

      {/* Live 3D viewport — Demo, Full View, and Preview modes share it */}
      {(mode === "demo" || mode === "fullview" || mode === "preview") && (
        <>
          <div
            style={{
              position: "absolute",
              top: viewportTop,
              bottom: 36,
              left: viewportLeft,
              right: viewportRight,
              background: "var(--color-bg-page)",
              overflow: "hidden",
            }}
          >
            <ThreeViewport
              key={resetTick /* re-mount on Reset View → camera resets to initial */}
              shapes={shapes}
              selectedId={selectedPart}
              onSelect={setSelectedPart}
              material={right.material}
              background={right.background}
              environment={right.environment}
              effects={right.effects}
              snap={right.snap}
            />
          </div>

          {/* Hide editing affordances in Preview */}
          {!preview && (
            <ThreeFloatingTools
              leftOffset={viewportLeft + 16}
              topOffset={viewportTop + 24}
              onHome={() => setResetTick((t) => t + 1)}
              onFit={() => setResetTick((t) => t + 1)}
              onZoomIn={() => {/* drei OrbitControls handles wheel zoom */}}
              onZoomOut={() => {/* drei OrbitControls handles wheel zoom */}}
              onScreenshot={() => {
                const canvas = document.querySelector<HTMLCanvasElement>(".pcb-app canvas");
                if (!canvas) return;
                const url = canvas.toDataURL("image/png");
                const a = document.createElement("a");
                a.href = url;
                a.download = "ideeza-3d.png";
                a.click();
              }}
            />
          )}

          {/* Bottom-left controls vary by mode */}
          {mode === "demo" && (
            <button
              onClick={() => setMode("preview")}
              className="ix-btn"
              style={{
                position: "absolute",
                left: viewportLeft + 16,
                bottom: 56,
                padding: "var(--spacing-2) var(--spacing-5)",
                background: "var(--color-bg-surface)",
                border: `var(--border-width-1-5) solid var(--color-border-brand)`,
                borderRadius: "var(--radius-3xl)",
                color: C.primary,
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                fontWeight: 700,
                zIndex: 18,
              }}
            >
              Preview
            </button>
          )}
          {fullView && (
            <button
              onClick={() => setMode("demo")}
              className="ix-btn"
              style={{
                position: "absolute",
                left: viewportLeft + 16,
                bottom: 56,
                padding: "var(--spacing-2) var(--spacing-5)",
                background: "var(--color-bg-surface)",
                border: `var(--border-width-1-5) solid var(--color-border-brand)`,
                borderRadius: "var(--radius-3xl)",
                color: C.primary,
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                fontWeight: 700,
                zIndex: 18,
              }}
            >
              Exit Full View
            </button>
          )}
          {preview && (
            <button
              onClick={() => setMode("demo")}
              className="ix-btn"
              title="Exit preview"
              style={{
                position: "absolute",
                left: viewportLeft + 16,
                bottom: 56,
                padding: "var(--spacing-2) var(--spacing-4)",
                background: "var(--color-bg-brand-subtle)",
                border: `var(--border-width-1-5) solid var(--color-border-brand)`,
                borderRadius: "var(--radius-3xl)",
                color: C.primary,
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                fontWeight: 700,
                zIndex: 18,
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--spacing-3)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7" />
              </svg>
              3D
            </button>
          )}

          {/* Previous / Next pills */}
          <div
            style={{
              position: "absolute",
              right: (viewportRight || 0) + 24,
              bottom: 56,
              display: "flex",
              gap: "var(--spacing-3)",
              zIndex: 18,
            }}
          >
            {mode === "demo" && (
              <Pill leading={<Caret dir="left" />} onClick={() => router.push("/code")}>
                Previous
              </Pill>
            )}
            <Pill trailing={<Caret dir="right" />} onClick={() => preview ? router.push("/preview") : setMode(preview ? "demo" : "preview")}>
              Next
            </Pill>
          </div>
        </>
      )}

      {/* Sketch-mode Next pill — bottom-right of sketch viewport */}
      {mode === "sketch" && (
        <div
          style={{
            position: "absolute",
            right: 24 + 250 + 32,
            bottom: 56,
            zIndex: 24,
          }}
        >
          <Pill trailing={<Caret dir="right" />}>Next</Pill>
        </div>
      )}

      {/* Bottom bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 36,
          background: "var(--color-bg-surface)",
          borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
          zIndex: 12,
        }}
      />
    </EditorShell>
  );
}
