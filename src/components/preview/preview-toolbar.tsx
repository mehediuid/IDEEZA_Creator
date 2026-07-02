"use client";

// PreviewToolbar — top strip on /preview. Assembly-style toolbar limited to the
// component-level tools that belong on a product preview: Insert Components,
// New Part, Move / Rotate Component, reference Plane / Axis, and Edit Component.
//
// Wired into PreviewContext where the store genuinely backs the action:
//   • Insert Components / New Part → add real geometry to the live viewport.
//   • Move / Rotate / Plane / Axis / Edit → flash a toast (same stub pattern the
//     toolbar already used for not-yet-implemented ops) so the click registers.
// Styling follows the existing IDEEZA design tokens — same container, radii,
// colors, and hover behavior as before; only the tool set changed.

import * as React from "react";
import { usePreview } from "./preview-context";

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 18,
        background: "var(--color-border-subtle)",
        margin: "0 var(--spacing-3)",
        flex: "0 0 1px",
      }}
    />
  );
}

function Stroke({
  path,
  size = 16,
  strokeWidth = 1.7,
}: {
  path: React.ReactNode;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path}
    </svg>
  );
}

// Icon-only tool button — the label lives in the tooltip (title) and
// aria-label so hover and screen readers still name the tool.
function ToolButton({
  label,
  icon,
  onClick,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        borderRadius: "var(--radius-md)",
        background: active ? "var(--color-bg-brand-subtle)" : "transparent",
        border: "none",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: active
          ? "var(--color-violet-600)"
          : "var(--color-text-secondary)",
        transition: "background .14s, color .14s",
        flex: "0 0 30px",
      }}
      onMouseEnter={(e) => {
        if (active) return;
        (e.currentTarget as HTMLButtonElement).style.background =
          "var(--color-bg-surface-raised)";
      }}
      onMouseLeave={(e) => {
        if (active) return;
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {icon}
    </button>
  );
}

export function PreviewToolbar() {
  const { addShape, selectedId, flashToast, canvas, patchCanvas } = usePreview();

  // Toggle the shared transform mode (same state the right panel's Transform
  // section drives) — clicking the active mode switches the gizmo off.
  const setMode = (mode: "translate" | "rotate", verb: string) => {
    const next = canvas.transformMode === mode ? "none" : mode;
    patchCanvas({ transformMode: next });
    if (next === "none") flashToast(`${verb} mode off`);
    else if (selectedId) flashToast(`${verb} mode — drag the component`);
    else flashToast(`${verb} mode on — select a component first`);
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 62,
        left: 0,
        right: 0,
        height: 40,
        background: "var(--color-bg-surface)",
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        display: "flex",
        alignItems: "center",
        padding: "0 var(--spacing-5)",
        gap: 0,
        zIndex: 18,
      }}
    >
      {/* Components — insert / create geometry (real). */}
      <ToolButton
        label="Insert Components"
        icon={
          <Stroke
            path={
              <>
                <path d="M4 13v4l8 4 8-4v-4" />
                <path d="M12 3v10" />
                <path d="M8.5 9.5 12 13l3.5-3.5" />
              </>
            }
          />
        }
        onClick={() => {
          addShape("box");
          flashToast("Inserted component");
        }}
      />
      <ToolButton
        label="New Part"
        icon={
          <Stroke
            path={
              <>
                <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
                <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
              </>
            }
          />
        }
        onClick={() => {
          addShape("box");
          flashToast("New part created");
        }}
      />

      <Divider />

      {/* Transform */}
      <ToolButton
        label="Move Component"
        icon={
          <Stroke
            path={
              <>
                <path d="M12 3v18M3 12h18" />
                <path d="M12 3 9.5 5.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5" />
              </>
            }
          />
        }
        active={canvas.transformMode === "translate"}
        onClick={() => setMode("translate", "Move")}
      />
      <ToolButton
        label="Rotate Component"
        icon={
          <Stroke
            path={
              <>
                <path d="M20 12a8 8 0 1 1-2.3-5.6" />
                <path d="M20 4v4h-4" />
              </>
            }
          />
        }
        active={canvas.transformMode === "rotate"}
        onClick={() => setMode("rotate", "Rotate")}
      />

      <Divider />

      {/* Reference geometry */}
      <ToolButton
        label="Plane"
        icon={<Stroke path={<path d="M9 5h10l-4 14H5z" />} />}
        onClick={() => flashToast("Reference plane (coming soon)")}
      />
      <ToolButton
        label="Axis"
        icon={
          <Stroke
            path={
              <>
                <path d="M5 19 19 5" />
                <circle cx="5" cy="19" r="1.4" />
                <circle cx="19" cy="5" r="1.4" />
              </>
            }
          />
        }
        onClick={() => flashToast("Reference axis (coming soon)")}
      />

      <Divider />

      {/* Edit */}
      <ToolButton
        label="Edit Component"
        icon={
          <Stroke
            path={
              <>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
              </>
            }
          />
        }
        onClick={() =>
          flashToast(
            selectedId
              ? "Editing component"
              : "Select a component to edit",
          )
        }
      />
    </div>
  );
}
