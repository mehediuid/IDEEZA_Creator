"use client";

// 3D Module — left panel.
// Project File tab is now data-driven: it lists Default Geometry + every real
// shape in the scene, with click-to-select sync, inline delete, and a hidden
// indicator. Library tab still dispatches shape:* actions to create new
// shapes.

import * as React from "react";
import { C } from "@/lib/pcb/colors";
import { dispatchThreeAction, type ThreeAction } from "./three-menu-bar";
import type { SceneShape } from "./three-canvas";

type LeftTab = "project" | "library";

function Chevron({ open }: { open?: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-text-tertiary)"
      strokeWidth="2.6"
      style={{ transform: open ? "rotate(90deg)" : undefined, transition: "transform .12s", flex: "0 0 auto" }}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function ShapeIcon({ type }: { type?: SceneShape["type"] }) {
  let path = "M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7"; // box
  if (type === "sphere") path = "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3 3 3 15 0 18";
  else if (type === "cylinder") path = "M5 6a7 2 0 1 0 14 0 7 2 0 1 0-14 0z M5 6v12a7 2 0 0 0 14 0V6";
  else if (type === "cone") path = "M12 3l8 16H4z";
  else if (type === "torus") path = "M3 12c0-3 4-6 9-6s9 3 9 6-4 6-9 6-9-3-9-6z";
  else if (type === "plane") path = "M3 18l6-12h12L15 18z";
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>
      <path d={path} />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={off ? "var(--color-text-tertiary)" : "currentColor"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M1 1l22 22" />}
    </svg>
  );
}

function ShapeRow({
  shape,
  selected,
  onSelect,
  onDelete,
}: {
  shape: SceneShape;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="ix-nav"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-2)",
        padding: "var(--spacing-2) var(--spacing-3) var(--spacing-2) 22px",
        cursor: "pointer",
        fontSize: "var(--font-size-sm)",
        fontWeight: selected ? 700 : 500,
        color: selected ? C.primary : shape.hidden ? "var(--color-text-tertiary)" : C.text,
        background: selected ? "var(--color-bg-brand-subtle)" : "transparent",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <ShapeIcon type={shape.type} />
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {shape.type} · {shape.id.split("-").pop()?.slice(0, 5)}
      </span>
      {shape.hidden && <EyeIcon off />}
      {shape.locked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.7" strokeLinecap="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete"
        style={{ background: "transparent", border: "none", color: "var(--color-text-tertiary)", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 14 }}
      >
        ×
      </button>
    </div>
  );
}

const LIBRARY_SHAPES: { id: ThreeAction; label: string; path: string }[] = [
  { id: "shape:box",      label: "Box",      path: "M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7" },
  { id: "shape:sphere",   label: "Sphere",   path: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3 3 3 15 0 18" },
  { id: "shape:cylinder", label: "Cylinder", path: "M5 6a7 2 0 1 0 14 0 7 2 0 1 0-14 0z M5 6v12a7 2 0 0 0 14 0V6" },
  { id: "shape:cone",     label: "Cone",     path: "M12 3l8 16H4z" },
  { id: "shape:torus",    label: "Torus",    path: "M3 12c0-3 4-6 9-6s9 3 9 6-4 6-9 6-9-3-9-6z" },
  { id: "shape:plane",    label: "Plane",    path: "M3 18l6-12h12L15 18z" },
  { id: "shape:spline",   label: "Spline",   path: "M3 17c4-8 14-2 18-10" },
];

export function ThreeLeftPanel({
  topOffset = 132,
  selectedId,
  onSelect,
  shapes,
  onDeleteShape,
  width = 250,
}: {
  topOffset?: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  shapes: SceneShape[];
  onDeleteShape: (id: string) => void;
  width?: number;
}) {
  const [tab, setTab] = React.useState<LeftTab>("project");
  const [defaultGeoOpen, setDefaultGeoOpen] = React.useState(true);
  const [partsOpen, setPartsOpen] = React.useState(true);
  const [search, setSearch] = React.useState("");

  const filtered = shapes.filter((s) => !search || s.type.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        bottom: 36,
        left: 74,
        width,
        background: "var(--color-bg-surface)",
        borderRight: "var(--border-width-1) solid var(--color-border-subtle)",
        display: "flex",
        flexDirection: "column",
        zIndex: 14,
      }}
    >
      <div style={{ display: "flex", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)", padding: "0 var(--spacing-4)" }}>
        {(["project", "library"] as LeftTab[]).map((t) => {
          const active = tab === t;
          const label = t === "project" ? "Project File" : "Library";
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "var(--spacing-3) var(--spacing-4)",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active ? C.primary : "transparent"}`,
                fontSize: "var(--font-size-sm)",
                fontWeight: active ? 700 : 500,
                color: active ? C.text : "var(--color-text-tertiary)",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-3) var(--spacing-2)" }}>
        {tab === "project" && (
          <>
            <div
              onClick={() => setDefaultGeoOpen((v) => !v)}
              className="ix-nav"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-2)",
                padding: "var(--spacing-2) var(--spacing-3)",
                fontSize: "var(--font-size-sm)",
                fontWeight: 600,
                color: C.text,
                cursor: "pointer",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <Chevron open={defaultGeoOpen} />
              <FolderIcon />
              <span>Default Geometry</span>
            </div>
            {defaultGeoOpen && (
              <div style={{ paddingLeft: 30, paddingTop: 4, paddingBottom: 4, fontSize: "var(--font-size-xs)", color: C.body }}>
                Origin · Front · Top · Right
              </div>
            )}

            <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-3) var(--spacing-3)" }} />

            <div
              onClick={() => setPartsOpen((v) => !v)}
              className="ix-nav"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-2)",
                padding: "var(--spacing-2) var(--spacing-3)",
                fontSize: "var(--font-size-sm)",
                fontWeight: 600,
                color: C.text,
                cursor: "pointer",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <Chevron open={partsOpen} />
              <FolderIcon />
              <span>Parts ({shapes.length})</span>
            </div>
            {partsOpen && (
              <>
                <div style={{ padding: "var(--spacing-2) var(--spacing-3)" }}>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search shapes…"
                    style={{
                      width: "100%",
                      padding: "var(--spacing-2)",
                      background: "var(--color-bg-page)",
                      border: "var(--border-width-1) solid var(--color-border-subtle)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "var(--font-size-xs)",
                      color: C.text,
                    }}
                  />
                </div>
                {filtered.map((s) => (
                  <ShapeRow
                    key={s.id}
                    shape={s}
                    selected={selectedId === s.id}
                    onSelect={() => onSelect(s.id)}
                    onDelete={() => onDeleteShape(s.id)}
                  />
                ))}
                {filtered.length === 0 && (
                  <div style={{ padding: "var(--spacing-3) var(--spacing-4)", fontSize: "var(--font-size-xs)", color: C.body }}>
                    No parts. Add one from the Library tab.
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === "library" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-2)", padding: "var(--spacing-2)" }}>
            {LIBRARY_SHAPES.map((s) => (
              <button
                key={s.id}
                onClick={() => dispatchThreeAction(s.id)}
                className="ix-tool"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--spacing-2)",
                  padding: "var(--spacing-4)",
                  background: "var(--color-bg-page)",
                  border: "var(--border-width-1) solid var(--color-border-subtle)",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  color: C.text,
                  fontSize: "var(--font-size-xs)",
                  fontWeight: 600,
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.5">
                  <path d={s.path} />
                </svg>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
