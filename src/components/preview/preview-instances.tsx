"use client";

// InstancesPanel — left tree on /preview. Two top-level groups:
//   • PCB        — board + every component placed in the PCB module (read-
//                  only here; selecting a row highlights the matching mesh
//                  in the viewport).
//   • Enclosure  — shapes from the 3D module (editable: add via the toolbar
//                  / Insert dropdown, hide via the eye icon, delete from
//                  the footer). Selection round-trips with the viewport.

import * as React from "react";
import { usePreview } from "./preview-context";
import type { SceneShape, ShapeType } from "@/components/3d/three-canvas";
import type { PreviewPcbComponent } from "./preview-context";

export function InstancesPanel({ topOffset }: { topOffset: number }) {
  const {
    pcb,
    enclosureShapes,
    selectedId,
    selectShape,
    addShape,
    deleteSelected,
    toggleHidden,
    togglePcb,
    toggleEnclosure,
    showPcb,
    showEnclosure,
    flashToast,
    flashInstanceId,
  } = usePreview();

  // Scroll the flashed row into view when "Find in instance list" fires from
  // the context menu. The row itself paints a temporary halo via the same id.
  const treeRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!flashInstanceId) return;
    const node = treeRef.current?.querySelector<HTMLElement>(
      `[data-instance-id="${cssEscape(flashInstanceId)}"]`,
    );
    node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [flashInstanceId]);

  const [filter, setFilter] = React.useState("");
  const [openPcb, setOpenPcb] = React.useState(true);
  const [openEnc, setOpenEnc] = React.useState(true);
  const q = filter.trim().toLowerCase();

  // Enclosure shapes labelled "Box 1 / Box 2 / Sphere 1 / …" for friendly
  // tree display.
  const labeledEnc = React.useMemo(() => {
    const counters: Record<string, number> = {};
    return enclosureShapes.map((s) => {
      counters[s.type] = (counters[s.type] ?? 0) + 1;
      return { shape: s, label: `${cap(s.type)} ${counters[s.type]}` };
    });
  }, [enclosureShapes]);

  const pcbRows: { id: string; label: string }[] = React.useMemo(() => {
    const rows: { id: string; label: string }[] = [
      { id: "pcb-board", label: "Board" },
    ];
    const counters: Record<string, number> = {};
    for (const c of pcb.components) {
      const niceKind = niceComponentKind(c.kind);
      counters[niceKind] = (counters[niceKind] ?? 0) + 1;
      rows.push({ id: c.id, label: `${niceKind} ${counters[niceKind]}` });
    }
    return rows;
  }, [pcb.components]);

  const matchesFilter = (label: string) =>
    !q || label.toLowerCase().includes(q);

  const pcbVisible = pcbRows.filter((r) => matchesFilter(r.label));
  const encVisible = labeledEnc.filter((l) => matchesFilter(l.label));
  const totalCount = pcbRows.length + labeledEnc.length;

  return (
    <aside
      style={{
        position: "absolute",
        top: topOffset,
        bottom: 0,
        left: 74,
        width: 256,
        background: "var(--color-bg-surface)",
        borderRight: "var(--border-width-1) solid var(--color-border-subtle)",
        display: "flex",
        flexDirection: "column",
        zIndex: 14,
      }}
    >
      {/* Filter row */}
      <div
        style={{
          padding: "10px 10px 6px",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          aria-hidden="true"
          style={iconStub}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 5h18l-7 9v6l-4-2v-4z" />
          </svg>
        </span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name"
          aria-label="Filter instances by name"
          style={{
            flex: 1,
            minWidth: 0,
            height: 26,
            padding: "0 10px",
            background: "var(--color-bg-page)",
            border: "var(--border-width-1) solid var(--color-border-subtle)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
            color: "var(--color-text-primary)",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <AddInstanceButton onAdd={(t) => addShape(t)} />
      </div>

      {/* Header */}
      <div
        style={{
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--color-text-primary)",
        }}
      >
        Instances ({totalCount})
      </div>

      {/* Tree */}
      <div
        ref={treeRef}
        style={{
          flex: 1,
          overflowY: "auto",
          paddingBottom: 12,
        }}
      >
        {/* PCB group */}
        <GroupHeader
          label="PCB"
          count={pcbRows.length}
          open={openPcb && pcbVisible.length > 0}
          onToggleOpen={() => setOpenPcb((v) => !v)}
          visible={showPcb}
          onToggleVisible={togglePcb}
        />
        {openPcb && pcbVisible.length > 0 && (
          <>
            {pcbVisible.map((r) => (
              <PcbRow
                key={r.id}
                id={r.id}
                label={r.label}
                selected={selectedId === r.id}
                flashing={flashInstanceId === r.id}
                onSelect={() => selectShape(r.id)}
              />
            ))}
          </>
        )}
        {openPcb && pcbVisible.length === 0 && q && (
          <EmptyRow text={`No PCB items match "${filter}"`} />
        )}

        {/* Enclosure group */}
        <GroupHeader
          label="Enclosure"
          count={labeledEnc.length}
          open={openEnc && encVisible.length > 0}
          onToggleOpen={() => setOpenEnc((v) => !v)}
          visible={showEnclosure}
          onToggleVisible={toggleEnclosure}
        />
        {openEnc && encVisible.length === 0 && !q && (
          <div
            style={{
              padding: "12px 14px 6px 30px",
              fontSize: 11,
              color: "var(--color-text-tertiary)",
              lineHeight: 1.5,
            }}
          >
            No enclosure parts yet. Add one from the toolbar or the +
            button at the top.
          </div>
        )}
        {openEnc && encVisible.length === 0 && q && (
          <EmptyRow text={`No enclosure parts match "${filter}"`} />
        )}
        {openEnc &&
          encVisible.map(({ shape, label }) => (
            <EnclosureRow
              key={shape.id}
              shape={shape}
              label={label}
              selected={selectedId === shape.id}
              flashing={flashInstanceId === shape.id}
              onSelect={() => selectShape(shape.id)}
              onToggleHidden={() => toggleHidden(shape.id)}
            />
          ))}
      </div>

      <style>{`
        @keyframes ix-preview-row-flash {
          0%   { box-shadow: inset 0 0 0 0 var(--color-violet-600); background: var(--color-bg-brand-subtle); }
          30%  { box-shadow: inset 0 0 0 2px var(--color-violet-600); background: var(--color-bg-brand-subtle); }
          100% { box-shadow: inset 0 0 0 0 var(--color-violet-600); }
        }
      `}</style>

      {/* Footer — delete selected (only enclosure items are deletable) */}
      <div
        style={{
          borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
          padding: "8px 10px",
        }}
      >
        <button
          onClick={() => {
            if (!selectedId) flashToast("Nothing selected");
            else deleteSelected();
          }}
          disabled={!selectedId}
          aria-label="Delete selected instance"
          style={{
            width: "100%",
            padding: "8px 10px",
            background: selectedId
              ? "var(--color-bg-page)"
              : "var(--color-bg-surface-raised)",
            border: "var(--border-width-1) solid var(--color-border-subtle)",
            borderRadius: "var(--radius-md)",
            cursor: selectedId ? "pointer" : "default",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: selectedId
              ? "var(--color-text-error)"
              : "var(--color-text-tertiary)",
            fontFamily: "inherit",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 6l1 14h12l1-14" />
          </svg>
          Delete selection
        </button>
      </div>
    </aside>
  );
}

function GroupHeader({
  label,
  count,
  open,
  onToggleOpen,
  visible,
  onToggleVisible,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggleOpen: () => void;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "8px 8px 8px 6px",
        background: "transparent",
        borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
        marginTop: 2,
      }}
    >
      <button
        onClick={onToggleOpen}
        aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
        style={chevronBtn}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          style={{
            transform: open ? "rotate(90deg)" : undefined,
            transition: "transform .12s",
          }}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      <span
        style={{
          flex: 1,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: "var(--color-text-secondary)",
        }}
      >
        {label}{" "}
        <span style={{ color: "var(--color-text-tertiary)", fontWeight: 500 }}>
          ({count})
        </span>
      </span>
      <button
        onClick={onToggleVisible}
        aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        title={visible ? `Hide ${label}` : `Show ${label}`}
        style={{
          ...chevronBtn,
          color: visible
            ? "var(--color-text-secondary)"
            : "var(--color-text-tertiary)",
        }}
      >
        {visible ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18M10.5 6.7a8 8 0 0 1 9.5 5.3 8 8 0 0 1-3 4.3M6.6 6.6A8 8 0 0 0 4 12s3 7 8 7c1.6 0 3-.4 4.3-1.1" />
          </svg>
        )}
      </button>
    </div>
  );
}

function PcbRow({
  id,
  label,
  selected,
  flashing,
  onSelect,
}: {
  id: string;
  label: string;
  selected: boolean;
  flashing: boolean;
  onSelect: () => void;
}) {
  const isBoard = id === "pcb-board";
  return (
    <div
      role="treeitem"
      aria-selected={selected}
      data-instance-id={id}
      onClick={onSelect}
      style={rowStyle(selected, flashing)}
      onMouseEnter={(e) => rowHover(e, selected, true)}
      onMouseLeave={(e) => rowHover(e, selected, false)}
    >
      <PcbIcon kind={isBoard ? "board" : "component"} selected={selected} />
      <span style={rowLabelStyle}>{label}</span>
    </div>
  );
}

function EnclosureRow({
  shape,
  label,
  selected,
  flashing,
  onSelect,
  onToggleHidden,
}: {
  shape: SceneShape;
  label: string;
  selected: boolean;
  flashing: boolean;
  onSelect: () => void;
  onToggleHidden: () => void;
}) {
  return (
    <div
      role="treeitem"
      aria-selected={selected}
      data-instance-id={shape.id}
      onClick={onSelect}
      style={{
        ...rowStyle(selected, flashing),
        color: shape.hidden && !selected
          ? "var(--color-text-tertiary)"
          : selected
            ? "var(--color-violet-600)"
            : "var(--color-text-primary)",
      }}
      onMouseEnter={(e) => rowHover(e, selected, true)}
      onMouseLeave={(e) => rowHover(e, selected, false)}
    >
      <ShapeIcon kind={shape.type} selected={selected} />
      <span style={rowLabelStyle}>{label}</span>
      <button
        aria-label={shape.hidden ? "Show" : "Hide"}
        title={shape.hidden ? "Show" : "Hide"}
        onClick={(e) => {
          e.stopPropagation();
          onToggleHidden();
        }}
        style={{
          width: 22,
          height: 22,
          borderRadius: "var(--radius-md)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: shape.hidden
            ? "var(--color-text-tertiary)"
            : "var(--color-text-secondary)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 22px",
        }}
      >
        {shape.hidden ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18M10.5 6.7a8 8 0 0 1 9.5 5.3 8 8 0 0 1-3 4.3M6.6 6.6A8 8 0 0 0 4 12s3 7 8 7c1.6 0 3-.4 4.3-1.1" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

function AddInstanceButton({ onAdd }: { onAdd: (type: ShapeType) => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const options: { type: ShapeType; label: string }[] = [
    { type: "box", label: "Box" },
    { type: "sphere", label: "Sphere" },
    { type: "cylinder", label: "Cylinder" },
    { type: "cone", label: "Cone" },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        aria-label="Add enclosure part"
        title="Add enclosure part"
        onClick={() => setOpen((v) => !v)}
        style={iconBtn}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 150,
            background: "var(--color-bg-surface)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 12px 32px -8px rgba(0,0,0,.22)",
            padding: 4,
            zIndex: 30,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--color-text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              padding: "6px 10px 2px",
            }}
          >
            Add to enclosure
          </div>
          {options.map((o) => (
            <button
              key={o.type}
              onClick={() => {
                onAdd(o.type);
                setOpen(false);
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "transparent",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-text-primary)",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--color-bg-surface-raised)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
              }}
            >
              <ShapeIcon kind={o.type} selected={false} />
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: "12px 14px 6px 30px",
        fontSize: 11,
        color: "var(--color-text-tertiary)",
      }}
    >
      {text}
    </div>
  );
}

function PcbIcon({
  kind,
  selected,
}: {
  kind: "board" | "component";
  selected: boolean;
}) {
  const color = selected
    ? "var(--color-violet-600)"
    : "var(--color-green-700, var(--color-text-success))";
  return (
    <span
      aria-hidden="true"
      style={{
        width: 14,
        height: 14,
        flex: "0 0 14px",
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {kind === "board" ? (
          <>
            <rect x="3" y="6" width="18" height="12" rx="1" />
            <path d="M7 6v12M17 6v12M3 12h18" />
          </>
        ) : (
          <>
            <rect x="6" y="6" width="12" height="12" rx="1" />
            <path d="M3 9h3M3 15h3M18 9h3M18 15h3M9 3v3M15 3v3M9 18v3M15 18v3" />
          </>
        )}
      </svg>
    </span>
  );
}

function ShapeIcon({
  kind,
  selected,
}: {
  kind: ShapeType;
  selected: boolean;
}) {
  const color = selected
    ? "var(--color-violet-600)"
    : "var(--color-text-secondary)";
  return (
    <span
      aria-hidden="true"
      style={{
        width: 14,
        height: 14,
        flex: "0 0 14px",
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {kind === "box" && (
          <>
            <path d="M4 7l8-4 8 4-8 4z" />
            <path d="M4 7v10l8 4 8-4V7" />
            <path d="M12 11v10" />
          </>
        )}
        {kind === "sphere" && (
          <>
            <circle cx="12" cy="12" r="9" />
            <ellipse cx="12" cy="12" rx="9" ry="3.5" />
          </>
        )}
        {kind === "cylinder" && (
          <>
            <ellipse cx="12" cy="6" rx="7" ry="2.5" />
            <path d="M5 6v12a7 2.5 0 0 0 14 0V6" />
          </>
        )}
        {kind === "cone" && (
          <>
            <path d="M12 3l8 16" />
            <path d="M4 19l8-16" />
            <ellipse cx="12" cy="19" rx="8" ry="2.5" />
          </>
        )}
        {kind === "torus" && (
          <>
            <ellipse cx="12" cy="12" rx="9" ry="5" />
            <ellipse cx="12" cy="12" rx="4" ry="2" />
          </>
        )}
        {kind === "plane" && <path d="M3 8l9 4 9-4-9-4z" />}
      </svg>
    </span>
  );
}

function niceComponentKind(kind: string): string {
  if (!kind || kind === "component") return "Component";
  return cap(kind);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function rowStyle(selected: boolean, flashing = false): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px 6px 30px",
    fontSize: 12,
    background: selected ? "var(--color-bg-brand-subtle)" : "transparent",
    cursor: "pointer",
    fontWeight: selected ? 600 : 500,
    color: selected
      ? "var(--color-violet-600)"
      : "var(--color-text-primary)",
    transition: "background .12s, box-shadow .12s",
    // "Find in instance list" halo — fades via inline animation.
    boxShadow: flashing
      ? "inset 0 0 0 2px var(--color-violet-600)"
      : undefined,
    animation: flashing ? "ix-preview-row-flash 1.4s ease-out" : undefined,
  };
}

// Minimal CSS.escape polyfill — guards the data-instance-id attr selector
// from ids containing characters CSS treats as special.
function cssEscape(s: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

function rowHover(
  e: React.MouseEvent<HTMLDivElement>,
  selected: boolean,
  enter: boolean,
) {
  if (selected) return;
  (e.currentTarget as HTMLDivElement).style.background = enter
    ? "var(--color-bg-surface-raised)"
    : "transparent";
}

const rowLabelStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const iconBtn: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: "var(--radius-md)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--color-text-secondary)",
  flex: "0 0 24px",
};

const chevronBtn: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: "var(--radius-md)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--color-text-tertiary)",
  flex: "0 0 18px",
  padding: 0,
};

const iconStub: React.CSSProperties = {
  width: 26,
  height: 26,
  flex: "0 0 26px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--color-text-secondary)",
};
