"use client";

// PreviewToolbar — top strip on /preview. Modeled on the Onshape part-studio
// toolbar. Wired into the PreviewContext: shape primitives (Box / Sphere /
// Cylinder / Cone) add real meshes to the live viewport, Insert mirrors a
// Box add, Reset view recenters the camera, search highlights matching
// tools. Buttons without a wired action emit a toast so the user gets
// feedback that the click registered.

import * as React from "react";
import { usePreview } from "./preview-context";

type IconBtnProps = {
  title: string;
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
};

function IconBtn({ title, children, active, onClick }: IconBtnProps) {
  return (
    <button
      title={title}
      aria-label={title}
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
        (e.currentTarget as HTMLButtonElement).style.background =
          "transparent";
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 18,
        background: "var(--color-border-subtle)",
        margin: "0 var(--spacing-2)",
        flex: "0 0 1px",
      }}
    />
  );
}

function Stroke({
  path,
  size = 17,
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

export function PreviewToolbar() {
  const [search, setSearch] = React.useState("");
  const {
    addShape,
    deleteSelected,
    resetCamera,
    fitCamera,
    selectedId,
    flashToast,
  } = usePreview();

  const stub = (label: string) => flashToast(label);

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
      {/* Undo / Redo — history isn't tracked in the preview yet, so these
          flash a toast to confirm the click registered. */}
      <IconBtn title="Undo" onClick={() => stub("Undo (history coming soon)")}>
        <Stroke path={<><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" /></>} />
      </IconBtn>
      <IconBtn title="Redo" onClick={() => stub("Redo (history coming soon)")}>
        <Stroke path={<><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 15-6.7L21 13" /></>} />
      </IconBtn>

      <Divider />

      {/* Insert pill — quick-add a box to the scene (most common starter
          primitive in Onshape's Insert flow). */}
      <button
        title="Insert"
        onClick={() => addShape("box")}
        style={{
          height: 28,
          padding: "0 12px",
          borderRadius: "var(--radius-md)",
          background: "var(--color-bg-surface-raised)",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          color: "var(--color-text-primary)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "inherit",
        }}
      >
        <Stroke
          size={14}
          path={<><path d="M12 5v14M5 12h14" /></>}
        />
        Insert
      </button>

      <Divider />

      {/* History / time-travel — stub. */}
      <IconBtn title="Feature history" onClick={() => stub("Feature history")}>
        <Stroke
          path={
            <>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </>
          }
        />
      </IconBtn>

      <Divider />

      {/* Shape primitives — Box / Sphere / Cylinder / Cone */}
      <IconBtn title="Box" onClick={() => addShape("box")}>
        <Stroke path={<><path d="M4 7l8-4 8 4-8 4z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" /></>} />
      </IconBtn>
      <IconBtn title="Sphere" onClick={() => addShape("sphere")}>
        <Stroke path={<><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="9" ry="3.5" /></>} />
      </IconBtn>
      <IconBtn title="Cylinder" onClick={() => addShape("cylinder")}>
        <Stroke path={<><ellipse cx="12" cy="6" rx="7" ry="2.5" /><path d="M5 6v12a7 2.5 0 0 0 14 0V6" /></>} />
      </IconBtn>
      <IconBtn title="Cone" onClick={() => addShape("cone")}>
        <Stroke path={<><path d="M12 3l8 16" /><path d="M4 19l8-16" /><ellipse cx="12" cy="19" rx="8" ry="2.5" /></>} />
      </IconBtn>

      <Divider />

      {/* Planes / axes — reset / refit shortcuts (stand-ins until per-face
          camera snap lands). */}
      <IconBtn title="Reset view" onClick={resetCamera}>
        <Stroke path={<><path d="M3 8l9 4 9-4-9-4z" /></>} />
      </IconBtn>
      <IconBtn title="Fit to scene" onClick={fitCamera}>
        <Stroke path={<><path d="M3 12l9 4 9-4" /><path d="M12 3v13" /></>} />
      </IconBtn>
      <IconBtn title="Front plane" onClick={() => stub("Front plane (coming soon)")}>
        <Stroke path={<><rect x="6" y="4" width="12" height="16" rx="1" /><path d="M9 9h6M9 12h6M9 15h6" /></>} />
      </IconBtn>
      <IconBtn title="Right plane" onClick={() => stub("Right plane (coming soon)")}>
        <Stroke path={<><rect x="4" y="6" width="16" height="12" rx="1" /><path d="M4 12h16" /></>} />
      </IconBtn>

      <Divider />

      {/* Operations — stubs */}
      <IconBtn title="Extrude" onClick={() => stub("Extrude")}>
        <Stroke path={<><path d="M4 14l4-4h12v8H8z" /><path d="M8 14v-4" /><path d="M20 18v-8" /></>} />
      </IconBtn>
      <IconBtn title="Revolve" onClick={() => stub("Revolve")}>
        <Stroke path={<><circle cx="12" cy="12" r="9" /><path d="M3 12a9 4 0 0 0 18 0" /></>} />
      </IconBtn>
      <IconBtn title="Fillet" onClick={() => stub("Fillet")}>
        <Stroke path={<><path d="M4 20V8a4 4 0 0 1 4-4h12" /></>} />
      </IconBtn>
      <IconBtn
        title="Delete selected"
        onClick={() => (selectedId ? deleteSelected() : stub("Nothing selected"))}
      >
        <Stroke path={<><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 6l1 14h12l1-14" /></>} />
      </IconBtn>

      <Divider />

      {/* Mates — stubs */}
      <IconBtn title="Fastened mate" onClick={() => stub("Fastened mate")}>
        <Stroke path={<><circle cx="8" cy="12" r="3" /><circle cx="16" cy="12" r="3" /><path d="M8 12h8" /></>} />
      </IconBtn>
      <IconBtn title="Revolute mate" onClick={() => stub("Revolute mate")}>
        <Stroke path={<><circle cx="12" cy="12" r="3" /><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /></>} />
      </IconBtn>
      <IconBtn title="Planar mate" onClick={() => stub("Planar mate")}>
        <Stroke path={<><rect x="3" y="6" width="8" height="12" /><rect x="13" y="6" width="8" height="12" /></>} />
      </IconBtn>

      <Divider />

      {/* Display */}
      <IconBtn title="Visibility" onClick={() => stub("Visibility toggle")}>
        <Stroke path={<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>} />
      </IconBtn>
      <IconBtn title="Section view" onClick={() => stub("Section view (visual stub)")}>
        <Stroke path={<><path d="M4 20h16" /><path d="M4 4l16 16" /><path d="M9 4h11v11" /></>} />
      </IconBtn>
      <IconBtn title="Render settings" onClick={() => stub("Render settings")}>
        <Stroke path={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>} />
      </IconBtn>

      {/* Search tools — right side */}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 4px 0 12px",
          height: 28,
          background: "var(--color-bg-page)",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <Stroke
          size={13}
          strokeWidth={2}
          path={<><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></>}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tools..."
          aria-label="Search tools"
          style={{
            width: 140,
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: 12,
            color: "var(--color-text-primary)",
            fontFamily: "inherit",
          }}
        />
        <kbd
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--color-text-tertiary)",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            background: "var(--color-bg-surface-raised)",
            padding: "2px 6px",
            borderRadius: 4,
            border: "var(--border-width-1) solid var(--color-border-subtle)",
          }}
        >
          alt/⌥ c
        </kbd>
      </div>
    </div>
  );
}
