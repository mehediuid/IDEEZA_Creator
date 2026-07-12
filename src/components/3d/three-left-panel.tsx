"use client";

// 3D Module — parts section for the shared project panel.
// Default Geometry icon bar + Parts (Group Name [N]) tree with per-row eye +
// 3-dot context menu (Copy / Cut / Duplicate / Reset material / Paste /
// Bring to front / Send to back / Rotate Left / Rotate Right / Flip
// Horizontal / Flip Vertical / Lock / Group / Delete). Rendered inside
// LeftPanel's moduleSlot.

import * as React from "react";
import { C } from "@/lib/pcb/colors";
import type { SceneShape } from "./three-canvas";

export type PartActions = {
  copy: (id: string) => void;
  cut: (id: string) => void;
  paste: () => void;
  duplicate: (id: string) => void;
  resetMaterial: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  rotateLeft: (id: string) => void;
  rotateRight: (id: string) => void;
  flipHorizontal: (id: string) => void;
  flipVertical: (id: string) => void;
  lock: (id: string) => void;
  group: () => void;
  hide: (id: string) => void;
  delete: (id: string) => void;
};

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

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M1 1l22 22" />}
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

// ── Default Geometry — 4 icon buttons (Origin / Front / Top / Right) ─────
function DefaultGeometryBar() {
  const [active, setActive] = React.useState("front");
  const items: { id: string; title: string; icon: React.ReactNode }[] = [
    {
      id: "origin", title: "Origin",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="12" cy="12" r="2" />
          <path d="M12 2v6 M12 16v6 M2 12h6 M16 12h6" />
        </svg>
      ),
    },
    {
      id: "front", title: "Front plane",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 5h16v14H3z" opacity=".95" />
        </svg>
      ),
    },
    {
      id: "top", title: "Top plane",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 9l9-6 9 6-9 6z" />
        </svg>
      ),
    },
    {
      id: "right", title: "Right plane",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M5 6l9-3v18l-9-3z" />
        </svg>
      ),
    },
  ];
  return (
    <div style={{ display: "flex", gap: "var(--spacing-2)", padding: "var(--spacing-2) var(--spacing-1)" }}>
      {items.map((it) => {
        const sel = active === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setActive(it.id)}
            title={it.title}
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--radius-md)",
              border: `var(--border-width-1-5) solid ${sel ? "var(--color-border-brand)" : "var(--color-border-subtle)"}`,
              background: sel ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
              color: sel ? C.primary : "var(--color-text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {it.icon}
          </button>
        );
      })}
    </div>
  );
}

// ── Part 3-dot context menu ──────────────────────────────────────────────
function PartContextMenu({
  shapeId,
  actions,
  canPaste,
  onClose,
}: {
  shapeId: string;
  actions: PartActions;
  canPaste: boolean;
  onClose: () => void;
}) {
  type Item =
    | { divider?: never; label: string; shortcut?: string; danger?: boolean; disabled?: boolean; run: () => void }
    | { divider: true };
  const items: Item[] = [
    { label: "Copy",            shortcut: "⌘C", run: () => actions.copy(shapeId) },
    { label: "Cut",             shortcut: "⌘X", run: () => actions.cut(shapeId) },
    { label: "Duplicate",       shortcut: "⌘D", run: () => actions.duplicate(shapeId) },
    { label: "Reset material",                  run: () => actions.resetMaterial(shapeId) },
    { label: "Paste",           shortcut: "⌘V", disabled: !canPaste, run: () => actions.paste() },
    { divider: true },
    { label: "Bring to front",  shortcut: "]",  run: () => actions.bringToFront(shapeId) },
    { label: "Send to back",    shortcut: "[",  run: () => actions.sendToBack(shapeId) },
    { divider: true },
    { label: "Rotate Left",                     run: () => actions.rotateLeft(shapeId) },
    { label: "Rotate Right",                    run: () => actions.rotateRight(shapeId) },
    { label: "Flip Horizontal", shortcut: "X",  run: () => actions.flipHorizontal(shapeId) },
    { label: "Flip Vertical",   shortcut: "Y",  run: () => actions.flipVertical(shapeId) },
    { divider: true },
    { label: "Lock",            shortcut: "L",  run: () => actions.lock(shapeId) },
    { label: "Group",           shortcut: "⌘G", run: () => actions.group() },
    { label: "Delete", danger: true,            run: () => actions.delete(shapeId) },
  ];
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: "100%",
        right: 8,
        marginTop: 2,
        minWidth: 240,
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--elevation-4)",
        zIndex: 50,
        padding: "var(--spacing-2) 0",
      }}
    >
      {items.map((it, i) => {
        if ("divider" in it && it.divider) {
          return <div key={`d-${i}`} style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-2) var(--spacing-3)" }} />;
        }
        const item = it as Exclude<Item, { divider: true }>;
        const disabled = !!item.disabled;
        return (
          <div
            key={item.label}
            onClick={() => {
              if (disabled) return;
              item.run();
              onClose();
            }}
            className="ix-menu"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "var(--spacing-2) var(--spacing-4)",
              fontSize: "var(--font-size-sm)",
              cursor: disabled ? "default" : "pointer",
              color: disabled ? "var(--color-text-tertiary)" : item.danger ? "var(--color-text-error)" : C.text,
              fontWeight: 500,
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && <span style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-xs)" }}>{item.shortcut}</span>}
          </div>
        );
      })}
    </div>
  );
}

function ShapeIcon({ type }: { type?: SceneShape["type"] }) {
  let path = "M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7";
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

// ── Single part row with eye + 3-dot menu ────────────────────────────────
function ShapeRow({
  shape,
  selected,
  onSelect,
  actions,
  canPaste,
  openMenuFor,
  setOpenMenuFor,
}: {
  shape: SceneShape;
  selected: boolean;
  onSelect: () => void;
  actions: PartActions;
  canPaste: boolean;
  openMenuFor: string | null;
  setOpenMenuFor: (id: string | null) => void;
}) {
  const menuOpen = openMenuFor === shape.id;
  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={onSelect}
        className="ix-nav"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-2)",
          padding: "var(--spacing-2) var(--spacing-3) var(--spacing-2) 32px",
          cursor: "pointer",
          fontSize: "var(--font-size-sm)",
          fontWeight: selected ? 700 : 500,
          color: selected || menuOpen ? C.primary : shape.hidden ? "var(--color-text-tertiary)" : C.text,
          background: selected || menuOpen ? "var(--color-bg-brand-subtle)" : "transparent",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <ShapeIcon type={shape.type} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {shape.type} · {shape.id.split("-").pop()?.slice(0, 5)}
        </span>
        {shape.locked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.7" strokeLinecap="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); actions.hide(shape.id); }}
          title={shape.hidden ? "Show" : "Hide"}
          style={{ background: "transparent", border: "none", color: "var(--color-text-tertiary)", cursor: "pointer", padding: 2, display: "flex" }}
        >
          <EyeIcon off={shape.hidden} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setOpenMenuFor(menuOpen ? null : shape.id); }}
          title="More"
          style={{ background: "transparent", border: "none", color: "var(--color-text-tertiary)", cursor: "pointer", padding: 2, display: "flex" }}
        >
          <DotsIcon />
        </button>
      </div>
      {menuOpen && (
        <PartContextMenu
          shapeId={shape.id}
          actions={actions}
          canPaste={canPaste}
          onClose={() => setOpenMenuFor(null)}
        />
      )}
    </div>
  );
}

// ThreePartsSection — the 3D module's tree content, embeddable inside the
// shared project panel (LeftPanel moduleSlot). Same Default Geometry bar,
// Parts group (rows with eye + 3-dot context menu) and shape library tiles
// the old standalone ThreeLeftPanel had — now merged into the ONE navigator
// that every module tab shares.
export function ThreePartsSection({
  selectedId,
  onSelect,
  shapes,
  actions,
  canPaste,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  shapes: SceneShape[];
  actions: PartActions;
  canPaste: boolean;
}) {
  const [partsOpen, setPartsOpen] = React.useState(true);
  const [groupOpen, setGroupOpen] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [openMenuFor, setOpenMenuFor] = React.useState<string | null>(null);

  // Close part-menu on click outside.
  React.useEffect(() => {
    if (!openMenuFor) return;
    const close = () => setOpenMenuFor(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [openMenuFor]);

  const filtered = shapes.filter((s) => !search || s.type.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: "var(--spacing-3) var(--spacing-1) 0" }}>
      <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-2) var(--spacing-2) var(--spacing-4)" }} />

      <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: C.text, padding: "var(--spacing-1) var(--spacing-2)" }}>
        Default Geometry
      </div>
      <DefaultGeometryBar />

      <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-3) var(--spacing-2)" }} />

      <div
        onClick={() => setPartsOpen((v) => !v)}
        className="ix-nav"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-2)",
          padding: "var(--spacing-2)",
          fontSize: "var(--font-size-sm)",
          fontWeight: 700,
          color: C.text,
          cursor: "pointer",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <Chevron open={partsOpen} />
        <span>Parts</span>
      </div>
      {partsOpen && (
        <>
          <div style={{ padding: "var(--spacing-2)" }}>
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
          <div
            onClick={() => setGroupOpen((v) => !v)}
            className="ix-nav"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-2)",
              padding: "var(--spacing-2)",
              fontSize: "var(--font-size-sm)",
              fontWeight: 500,
              color: C.text,
              cursor: "pointer",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <Chevron open={groupOpen} />
            <span>Group Name</span>
            <span style={{ color: "var(--color-text-tertiary)", fontWeight: 600, fontSize: "var(--font-size-xs)" }}>
              [{String(filtered.length).padStart(2, "0")}]
            </span>
          </div>
          {groupOpen && filtered.map((s) => (
            <ShapeRow
              key={s.id}
              shape={s}
              selected={selectedId === s.id}
              onSelect={() => onSelect(s.id)}
              actions={actions}
              canPaste={canPaste}
              openMenuFor={openMenuFor}
              setOpenMenuFor={setOpenMenuFor}
            />
          ))}
          {groupOpen && filtered.length === 0 && (
            <div style={{ padding: "var(--spacing-3) var(--spacing-4)", fontSize: "var(--font-size-xs)", color: C.body }}>
              No parts yet — add one from the 3D toolbar.
            </div>
          )}
        </>
      )}

    </div>
  );
}
