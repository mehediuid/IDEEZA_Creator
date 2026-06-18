"use client";

// 3D Module — left panel (Figma 33552:188795).
// Tabs: Project File (active) / Library. Below the tabs:
//   - "Default Geometry" — a single expandable folder.
//   - "Parts" — section header followed by a nested tree of part groups.
// The Library tab renders a flat catalogue of base shapes that can be dragged
// or clicked into the viewport (analogous to the Blockly library on /code).

import * as React from "react";
import { C } from "@/lib/pcb/colors";
import { dispatchThreeAction, type ThreeAction } from "./three-menu-bar";

export type Part = {
  id: string;
  name: string;
  children?: Part[];
};

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

function PartIcon({ leaf }: { leaf?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>
      {leaf ? (
        <>
          <path d="M3 7l9-4 9 4-9 4-9-4z" />
          <path d="M3 7v10l9 4 9-4V7" />
        </>
      ) : (
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      )}
    </svg>
  );
}

function PartRow({
  part,
  depth,
  selectedId,
  openIds,
  onToggle,
  onSelect,
}: {
  part: Part;
  depth: number;
  selectedId: string | null;
  openIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const open = openIds.has(part.id);
  const selected = selectedId === part.id;
  const hasChildren = !!part.children?.length;
  return (
    <>
      <div
        onClick={() => { onSelect(part.id); if (hasChildren) onToggle(part.id); }}
        className="ix-nav"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-2)",
          padding: `var(--spacing-2) var(--spacing-3) var(--spacing-2) ${8 + depth * 14}px`,
          cursor: "pointer",
          fontSize: "var(--font-size-sm)",
          fontWeight: selected ? 700 : 500,
          color: selected ? C.primary : C.text,
          background: selected ? "var(--color-bg-brand-subtle)" : "transparent",
          borderRadius: "var(--radius-sm)",
        }}
      >
        {hasChildren ? <Chevron open={open} /> : <span style={{ width: 10 }} />}
        <PartIcon leaf={!hasChildren} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{part.name}</span>
      </div>
      {open && part.children?.map((c) => (
        <PartRow
          key={c.id}
          part={c}
          depth={depth + 1}
          selectedId={selectedId}
          openIds={openIds}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

const DEFAULT_PARTS: Part[] = [
  {
    id: "parts-root", name: "Parts",
    children: [
      { id: "g1", name: "Group Name", children: [
        { id: "g1-a", name: "Group element" },
        { id: "g1-b", name: "Group element" },
        { id: "g1-c", name: "Group element" },
      ]},
      { id: "g2", name: "Group Name", children: [
        { id: "g2-a", name: "Group element" },
        { id: "g2-b", name: "Group element" },
      ]},
      { id: "g3", name: "Group Name", children: [
        { id: "g3-a", name: "Group element" },
        { id: "g3-b", name: "Group element" },
        { id: "g3-c", name: "Group element" },
      ]},
      { id: "g4", name: "Group Name" },
      { id: "g5", name: "Group Name" },
    ],
  },
];

const LIBRARY_SHAPES: { id: ThreeAction; label: string }[] = [
  { id: "shape:box", label: "Box" },
  { id: "shape:sphere", label: "Sphere" },
  { id: "shape:cylinder", label: "Cylinder" },
  { id: "shape:cone", label: "Cone" },
  { id: "shape:torus", label: "Torus" },
  { id: "shape:plane", label: "Plane" },
  { id: "shape:spline", label: "Spline" },
];

export function ThreeLeftPanel({
  topOffset = 132,
  selectedId,
  onSelect,
  width = 250,
}: {
  topOffset?: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  width?: number;
}) {
  const [tab, setTab] = React.useState<LeftTab>("project");
  const [openIds, setOpenIds] = React.useState<Set<string>>(() => new Set(["parts-root", "g1"]));
  const [defaultGeoOpen, setDefaultGeoOpen] = React.useState(true);

  const toggle = (id: string) =>
    setOpenIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
      {/* Tabs */}
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

      {/* Body */}
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
              <PartIcon />
              <span>Default Geometry</span>
            </div>
            {defaultGeoOpen && (
              <div style={{ paddingLeft: 24, paddingTop: 4, paddingBottom: 4, fontSize: "var(--font-size-xs)", color: C.body }}>
                Origin · Front · Top · Right
              </div>
            )}

            <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-3) var(--spacing-3)" }} />

            {DEFAULT_PARTS.map((p) => (
              <PartRow
                key={p.id}
                part={p}
                depth={0}
                selectedId={selectedId}
                openIds={openIds}
                onToggle={toggle}
                onSelect={onSelect}
              />
            ))}
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
                  <path d="M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7" />
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
