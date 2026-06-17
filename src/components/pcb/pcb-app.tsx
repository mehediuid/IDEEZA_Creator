"use client";

// IDEEZA PCB Software — application composer.
// Wires the store and lays out the editor sections inside the fixed artboard.
// Phase 1: cover + top chrome (top bar, breadcrumb, menu bar, toolbar), left
// rail, and the canvas. Left/right panels and the bottom bar render as empty
// framed containers here and are populated in Phase 2.

import { BottomBar } from "@/components/pcb/bottom-bar";
import { Breadcrumb } from "@/components/pcb/breadcrumb";
import { CanvasArea } from "@/components/pcb/canvas-area";
import { ContextMenu } from "@/components/pcb/context-menu";
import { DeviceManager } from "@/components/pcb/device-manager";
import { EditorShell } from "@/components/pcb/editor-shell";
import { FootprintManager } from "@/components/pcb/footprint-manager";
import { LeftPanel } from "@/components/pcb/left-panel";
import { LeftRail } from "@/components/pcb/left-rail";
import { MenuBar } from "@/components/pcb/menu-bar";
import { Modals } from "@/components/pcb/modals";
import { RightPanel } from "@/components/pcb/right-panel";
import { SettingsOverlay } from "@/components/pcb/settings-overlay";
import { Toolbar } from "@/components/pcb/toolbar";
import { TopBar } from "@/components/pcb/top-bar";
import { PcbProvider, usePcbActions, usePcbState } from "@/lib/pcb/store";

function EditorBody() {
  const state = usePcbState();
  const actions = usePcbActions();
  const v = state.viewTog;
  const toolbarOn = v["Top Toolbar"] !== false;
  const leftOn = v["Left-Side panel"] !== false;
  const rightOn = v["Right-Side Panel"] !== false;

  return (
    <EditorShell>
      {/* TOP BAR */}
      <TopBar />

      {/* BREADCRUMB */}
      <Breadcrumb />

      {/* MENU BAR */}
      <MenuBar />

      {/* TOOLBAR (View ▸ Top Toolbar) */}
      {toolbarOn && <Toolbar />}

      {/* LEFT RAIL */}
      <LeftRail />

      {/* CANVAS */}
      <CanvasArea />

      {/* LEFT PANEL (View ▸ Left-Side panel) */}
      {leftOn && <LeftPanel />}

      {/* RIGHT PANEL (View ▸ Right-Side Panel) */}
      {rightOn && <RightPanel />}

      {/* BOTTOM BAR + collapsible panel */}
      <BottomBar />

      {/* click-catcher closes open menus / context menu */}
      {(state.openMenu || state.ctx) && (
        <div onClick={actions.closeAll} style={{ position: "absolute", inset: 0, zIndex: 40 }} />
      )}

      {/* CONTEXT MENU (canvas right-click) */}
      <ContextMenu />

      {/* SETTINGS overlay */}
      <SettingsOverlay />

      {/* TOOLS manager overlays (Device / Footprint Manager) */}
      <DeviceManager />
      <FootprintManager />

      {/* MODALS (delete / array / find-replace / table / design rules / annotate / import / export) */}
      <Modals />

      {/* TOAST (Phase 5 — quick feedback for toolbar Save / Open / etc.) */}
      <Toast />
    </EditorShell>
  );
}

function Toast() {
  const state = usePcbState();
  if (!state.toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        bottom: 36,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "var(--spacing-4) var(--spacing-8)",
        background: "var(--color-bg-inverse, #1E1E1E)",
        color: "var(--color-text-on-brand, #FFFFFF)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--elevation-4)",
        fontSize: "var(--font-size-sm)",
        fontWeight: 500,
        zIndex: 90,
        animation: "ideeza-rise .18s cubic-bezier(.2,.9,.3,1.1)",
      }}
    >
      {state.toast}
    </div>
  );
}

export function PcbApp() {
  return (
    <PcbProvider>
      <EditorBody />
    </PcbProvider>
  );
}
