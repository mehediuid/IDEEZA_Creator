"use client";

// IDEEZA PCB Software — application composer.
// Wires the store and lays out the editor sections inside the fixed artboard.
// Phase 1: cover + top chrome (top bar, breadcrumb, menu bar, toolbar), left
// rail, and the canvas. Left/right panels and the bottom bar render as empty
// framed containers here and are populated in Phase 2.

import { BottomBar } from "@/components/pcb/bottom-bar";
import { CanvasArea } from "@/components/pcb/canvas-area";
import { ContextMenu } from "@/components/pcb/context-menu";
import { DeviceManager } from "@/components/pcb/device-manager";
import { EditorShell } from "@/components/pcb/editor-shell";
import { FootprintManager } from "@/components/pcb/footprint-manager";
import { LeftPanel } from "@/components/pcb/left-panel";
import { LeftRail } from "@/components/pcb/left-rail";
import { Modals } from "@/components/pcb/modals";
import { OnlineChat } from "@/components/pcb/settings-dialogs";
import { RightPanel } from "@/components/pcb/right-panel";
import { SettingsOverlay } from "@/components/pcb/settings-overlay";
import { Toolbar } from "@/components/pcb/toolbar";
import { TopBar } from "@/components/pcb/top-bar";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

function EditorBody() {
  const state = usePcbState();
  const actions = usePcbActions();
  const v = state.viewTog;
  const toolbarOn = v["Top Toolbar"] !== false;
  const leftOn = v["Left-Side panel"] !== false;
  const rightOn = v["Right-Side Panel"] !== false;

  return (
    <EditorShell>
      {/* TOP BAR — hosts the unified AppMenuBar (Edit/View/…/Help) for every
          flow page, and the relocated Earn IDZ + Connect Wallet actions live
          inside the profile dropdown. The separate Breadcrumb + MenuBar
          strips that used to sit beneath the TopBar are gone — the same info
          now appears as the LeftPanel header (product/project names). */}
      <TopBar />

      {/* TOOLBAR (View ▸ Top Toolbar) */}
      {toolbarOn && <Toolbar />}

      {/* LEFT RAIL */}
      <LeftRail />

      {/* CANVAS */}
      <CanvasArea />

      {/* LEFT PANEL (View ▸ Left-Side panel) */}
      {leftOn ? (
        <LeftPanel />
      ) : (
        <ExpandTab
          side="left"
          onClick={() => actions.toggleView("Left-Side panel")}
        />
      )}

      {/* RIGHT PANEL (View ▸ Right-Side Panel) */}
      {rightOn ? (
        <RightPanel />
      ) : (
        <ExpandTab
          side="right"
          onClick={() => actions.toggleView("Right-Side Panel")}
        />
      )}

      {/* BOTTOM BAR + collapsible panel */}
      <BottomBar />

      {/* click-catcher closes the right-click context menu. The app menu
          bar (Edit / View / …) is no longer dismissed here — MenuBar lives
          inside TopBar (zIndex 30) now, but this catcher was at zIndex 40,
          which would sit OVER TopBar and swallow every dropdown-item click.
          MenuBar self-handles its dismiss via a document mousedown listener,
          so we only render the catcher for ctx menus here. */}
      {state.ctx && (
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

      {/* Online Chat — floating support widget in the 3D view (spec §13) */}
      {state.mode === "3d" && <OnlineChat />}
    </EditorShell>
  );
}

// ExpandTab — small chevron tab that sticks out from the canvas edge when a
// side panel is collapsed. Clicking it toggles the same view flag the panel's
// own collapse chevron and the View menu both drive, so panel state stays a
// single source of truth.
function ExpandTab({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const isLeft = side === "left";
  return (
    <button
      onClick={onClick}
      aria-label={`Expand ${side} panel`}
      title={`Expand ${side} panel`}
      style={{
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        // Sit flush against the canvas edge the panel used to occupy.
        ...(isLeft ? { left: 74 } : { right: 0 }),
        width: 18,
        height: 56,
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-subtle)",
        ...(isLeft
          ? { borderLeft: "none", borderRadius: "0 8px 8px 0" }
          : { borderRight: "none", borderRadius: "8px 0 0 8px" }),
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-text-secondary)",
        zIndex: 17,
        boxShadow: "0 2px 8px -2px rgba(0,0,0,.15)",
        padding: 0,
        transition: "background .14s, color .14s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "var(--color-bg-surface-raised)";
        (e.currentTarget as HTMLButtonElement).style.color =
          "var(--color-violet-600)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "var(--color-bg-surface)";
        (e.currentTarget as HTMLButtonElement).style.color =
          "var(--color-text-secondary)";
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isLeft ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
      </svg>
    </button>
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
        color: "var(--color-text-inverse, #FFFFFF)",
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
  // PcbProvider lives at the root layout — see src/app/layout.tsx.
  return <EditorBody />;
}
