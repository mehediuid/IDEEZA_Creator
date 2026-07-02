"use client";

// PreviewRightPanel — proper right-side panel matching the PCB / 3D module
// chrome pattern (292px wide). Vertical tab strip on the far-right inner
// edge with 6 Onshape-style icons; left of that is the active tab's body.
//
// Tabs: Properties · Parts list · Copies · Selection · Materials · Variables
// Properties is the rich one — it renders the real data for whichever item
// the user picked in the InstancesPanel (PCB board / PCB component /
// enclosure shape) plus visibility toggles. Other tabs are scoped lists
// today; they'll grow as the preview adds more dimensions.

import * as React from "react";
import { usePreview, type PreviewTransformMode } from "./preview-context";
import { GRID_OPTIONS, RES_OPTIONS } from "@/components/3d/grid-settings";
import type { SceneShape } from "@/components/3d/three-canvas";
import type {
  PreviewPcbBoard,
  PreviewPcbComponent,
} from "./preview-context";

const PANEL_WIDTH = 292;
const TAB_STRIP_WIDTH = 44;
const CONTENT_WIDTH = PANEL_WIDTH - TAB_STRIP_WIDTH;

// Canvas controls (Mouse Information, Transform, Snap, Grid Size, Resolution)
// live in PreviewContext so the viewport reacts to them; the panel just drives
// them. Option lists come from the shared grid-settings module (same lists the
// 3D module shows).
const TRANSFORM_MODES: PreviewTransformMode[] = ["none", "translate", "rotate"];

type TabId = "properties" | "parts";

type TabDef = {
  id: TabId;
  title: string;
  icon: React.ReactNode;
};

const TABS: TabDef[] = [
  {
    id: "properties",
    title: "Properties",
    icon: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
  },
  {
    id: "parts",
    title: "Parts list",
    icon: (
      <>
        <path d="M4 7l8-4 8 4-8 4z" />
        <path d="M4 7v10l8 4 8-4V7" />
        <path d="M12 11v10" />
      </>
    ),
  },
];

export function PreviewRightPanel({ topOffset }: { topOffset: number }) {
  const [tab, setTab] = React.useState<TabId>("properties");
  return (
    <aside
      style={{
        position: "absolute",
        top: topOffset,
        bottom: 0,
        right: 0,
        width: PANEL_WIDTH,
        background: "var(--color-bg-surface)",
        borderLeft: "var(--border-width-1) solid var(--color-border-default)",
        display: "flex",
        zIndex: 14,
      }}
    >
      {/* CONTENT (left of the vertical tab strip) */}
      <div
        style={{
          width: CONTENT_WIDTH,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <TabBody tab={tab} />
      </div>

      {/* VERTICAL TAB STRIP (right edge of the panel) */}
      <div
        style={{
          width: TAB_STRIP_WIDTH,
          background: "var(--color-bg-page)",
          borderLeft:
            "var(--border-width-1) solid var(--color-border-subtle)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "8px 0",
          gap: 4,
        }}
      >
        {TABS.map((t) => (
          <TabButton
            key={t.id}
            tab={t}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
          />
        ))}
      </div>
    </aside>
  );
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: TabDef;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={tab.title}
      aria-label={tab.title}
      aria-pressed={active}
      style={{
        width: 32,
        height: 32,
        borderRadius: "var(--radius-md)",
        background: active
          ? "var(--color-bg-brand-subtle)"
          : "transparent",
        border: active
          ? "var(--border-width-1) solid var(--color-border-brand)"
          : "var(--border-width-1) solid transparent",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: active
          ? "var(--color-violet-600)"
          : "var(--color-text-secondary)",
        transition: "background .12s, color .12s, border-color .12s",
        flex: "0 0 32px",
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
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {tab.icon}
      </svg>
    </button>
  );
}

// ── Tab bodies ───────────────────────────────────────────────────────

function TabBody({ tab }: { tab: TabId }) {
  if (tab === "parts") return <PartsBody />;
  return <PropertiesBody />;
}

function PropertiesBody() {
  const {
    pcb,
    enclosureShapes,
    canvas,
    patchCanvas,
    selectedId,
    showPcb,
    showEnclosure,
    togglePcb,
    toggleEnclosure,
  } = usePreview();

  const selection = React.useMemo(() => {
    if (!selectedId) return null;
    if (selectedId === "pcb-board") return { kind: "pcb-board" as const, board: pcb.board };
    const c = pcb.components.find((x) => x.id === selectedId);
    if (c) return { kind: "pcb-component" as const, component: c };
    const s = enclosureShapes.find((x) => x.id === selectedId);
    if (s) return { kind: "enclosure" as const, shape: s };
    return null;
  }, [selectedId, pcb, enclosureShapes]);

  // Live cursor readout — the viewport dispatches a lightweight window event on
  // pointer move (so only this panel re-renders, never the canvas). Read-only:
  // shows "—" when the pointer isn't over the scene.
  const [liveMouse, setLiveMouse] = React.useState<{
    d: number;
    x: number;
    y: number;
    z: number;
  } | null>(null);
  React.useEffect(() => {
    const h = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { d: number; x: number; y: number; z: number }
        | null;
      setLiveMouse(detail);
    };
    window.addEventListener("ideeza:preview-mouse", h);
    return () => window.removeEventListener("ideeza:preview-mouse", h);
  }, []);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* Title */}
      <div
        style={{
          padding: "12px 14px 8px",
          borderBottom:
            "var(--border-width-1) solid var(--color-border-subtle)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--color-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          Properties
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-primary)",
            marginTop: 2,
          }}
        >
          {selection
            ? selection.kind === "pcb-board"
              ? "PCB Board"
              : selection.kind === "pcb-component"
                ? selection.component.kind
                : `Enclosure · ${selection.shape.type}`
            : "Scene (nothing selected)"}
        </div>
      </div>

      {/* Visibility toggles */}
      <Section title="Visibility">
        <ToggleRow
          label="PCB"
          sub="Board + placed components"
          on={showPcb}
          onChange={togglePcb}
        />
        <ToggleRow
          label="Enclosure"
          sub="3D cover from the 3D module"
          on={showEnclosure}
          onChange={toggleEnclosure}
        />
      </Section>

      {/* Mouse Information */}
      <Section title="Mouse Information">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 4,
          }}
        >
          <ReadoutCell value={liveMouse ? liveMouse.d.toFixed(1) : "—"} />
          <ReadoutCell value={liveMouse ? liveMouse.x.toFixed(1) : "—"} />
          <ReadoutCell value={liveMouse ? liveMouse.y.toFixed(1) : "—"} />
          <ReadoutCell value={liveMouse ? liveMouse.z.toFixed(1) : "—"} />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 4,
            fontSize: 10,
            color: "var(--color-text-tertiary)",
            textAlign: "center",
          }}
        >
          <span>Distance</span>
          <span>X</span>
          <span>Y</span>
          <span>Z</span>
        </div>
      </Section>

      {/* Transform */}
      <Section title="Transform">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 4,
          }}
        >
          {TRANSFORM_MODES.map((m) => (
            <SegButton
              key={m}
              label={m === "none" ? "Off" : cap(m)}
              selected={canvas.transformMode === m}
              onClick={() => patchCanvas({ transformMode: m })}
            />
          ))}
        </div>
      </Section>

      {/* Snap */}
      <Section title="Snap">
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}
        >
          <SnapToggle
            label="X"
            on={canvas.snap.x}
            onChange={(v) => patchCanvas({ snap: { ...canvas.snap, x: v } })}
          />
          <SnapToggle
            label="Y"
            on={canvas.snap.y}
            onChange={(v) => patchCanvas({ snap: { ...canvas.snap, y: v } })}
          />
          <SnapToggle
            label="Z"
            on={canvas.snap.z}
            onChange={(v) => patchCanvas({ snap: { ...canvas.snap, z: v } })}
          />
        </div>
      </Section>

      {/* Grid Size */}
      <Section title="Grid Size">
        <MiniSelect
          value={canvas.gridSize}
          onChange={(v) => patchCanvas({ gridSize: v })}
          options={GRID_OPTIONS}
        />
      </Section>

      {/* Resolution */}
      <Section title="Resolution">
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}
        >
          {canvas.resolution.map((r, i) => (
            <MiniSelect
              key={i}
              value={r}
              onChange={(v) =>
                patchCanvas({
                  resolution: canvas.resolution.map((x, j) => (j === i ? v : x)),
                })
              }
              options={RES_OPTIONS}
            />
          ))}
        </div>
      </Section>

      {/* Selection-specific props */}
      {selection?.kind === "pcb-board" && <BoardProps board={selection.board} />}
      {selection?.kind === "pcb-component" && (
        <ComponentProps component={selection.component} />
      )}
      {selection?.kind === "enclosure" && (
        <ShapeProps shape={selection.shape} />
      )}
    </div>
  );
}

function BoardProps({ board }: { board: PreviewPcbBoard }) {
  return (
    <Section title="PCB Board">
      <Row label="Width" value={`${board.width.toFixed(2)} u`} />
      <Row label="Depth" value={`${board.depth.toFixed(2)} u`} />
      <Row label="Thickness" value={`${board.thickness.toFixed(3)} u`} />
      <Row
        label="Color"
        value={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: board.color,
                border: "var(--border-width-1) solid var(--color-border-subtle)",
              }}
            />
            {board.color}
          </span>
        }
      />
      <Note>
        The board comes from the PCB module — edit it there to change
        these values.
      </Note>
    </Section>
  );
}

function ComponentProps({
  component,
}: {
  component: PreviewPcbComponent;
}) {
  return (
    <Section title="Component">
      <Row label="Kind" value={component.kind} />
      <Row label="Position" value={`(${component.x.toFixed(2)}, ${component.y.toFixed(2)})`} />
      <Row
        label="Size"
        value={`${(component.w ?? 0.4).toFixed(2)} × ${(component.d ?? 0.4).toFixed(2)}`}
      />
      <Row label="Height" value={`${(component.height ?? 0.18).toFixed(2)} u`} />
      <Row
        label="Color"
        value={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: component.color ?? "#1f2937",
                border: "var(--border-width-1) solid var(--color-border-subtle)",
              }}
            />
            {component.color ?? "#1f2937"}
          </span>
        }
      />
    </Section>
  );
}

function ShapeProps({ shape }: { shape: SceneShape }) {
  return (
    <Section title="Enclosure part">
      <Row label="Type" value={shape.type} />
      <Row
        label="Position"
        value={`(${shape.position[0].toFixed(2)}, ${shape.position[1].toFixed(2)}, ${shape.position[2].toFixed(2)})`}
      />
      <Row
        label="Rotation"
        value={`(${shape.rotation[0].toFixed(2)}, ${shape.rotation[1].toFixed(2)}, ${shape.rotation[2].toFixed(2)})`}
      />
      <Row
        label="Scale"
        value={`(${shape.scale[0].toFixed(2)}, ${shape.scale[1].toFixed(2)}, ${shape.scale[2].toFixed(2)})`}
      />
      <Row label="Hidden" value={shape.hidden ? "Yes" : "No"} />
    </Section>
  );
}

function PartsBody() {
  const { pcb, enclosureShapes } = usePreview();
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <Section title={`PCB (${1 + pcb.components.length})`}>
        <SimpleRow label="Board" sub="1 board" />
        {pcb.components.map((c) => (
          <SimpleRow
            key={c.id}
            label={cap(c.kind)}
            sub={`(${c.x.toFixed(2)}, ${c.y.toFixed(2)})`}
          />
        ))}
      </Section>
      <Section title={`Enclosure (${enclosureShapes.length})`}>
        {enclosureShapes.length === 0 && (
          <Note>No enclosure parts yet.</Note>
        )}
        {enclosureShapes.map((s) => (
          <SimpleRow
            key={s.id}
            label={cap(s.type)}
            sub={s.hidden ? "Hidden" : "Visible"}
          />
        ))}
      </Section>
    </div>
  );
}

// ── shared primitives ─────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        fontSize: 12,
      }}
    >
      <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <span
        style={{
          color: "var(--color-text-primary)",
          fontWeight: 600,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
          maxWidth: "70%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SimpleRow({
  label,
  sub,
}: {
  label: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        padding: "6px 8px",
        background: "var(--color-bg-page)",
        border: "var(--border-width-1) solid var(--color-border-subtle)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--color-text-primary)",
        }}
      >
        {label}
      </span>
      {sub && (
        <span
          style={{
            fontSize: 10,
            color: "var(--color-text-tertiary)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  sub,
  on,
  onChange,
}: {
  label: string;
  sub?: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <label
      onClick={onChange}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        padding: "4px 0",
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-text-primary)",
          }}
        >
          {label}
        </span>
        {sub && (
          <span
            style={{
              display: "block",
              fontSize: 10,
              color: "var(--color-text-tertiary)",
              marginTop: 1,
            }}
          >
            {sub}
          </span>
        )}
      </span>
      <span
        role="switch"
        aria-checked={on}
        style={{
          width: 30,
          height: 18,
          borderRadius: 9,
          background: on
            ? "var(--color-violet-600)"
            : "var(--color-bg-surface-raised)",
          position: "relative",
          transition: "background .12s",
          flex: "0 0 30px",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 14 : 2,
            width: 14,
            height: 14,
            background: "var(--color-bg-surface)",
            borderRadius: "50%",
            boxShadow: "0 1px 2px rgba(0,0,0,.25)",
            transition: "left .14s",
          }}
        />
      </span>
    </label>
  );
}

// Read-only cursor readout cell — the values come from the viewport's pointer,
// so there is nothing meaningful for the user to type here.
function ReadoutCell({ value }: { value: string }) {
  return (
    <div
      style={{
        padding: "6px 4px",
        background: "var(--color-bg-page)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        fontSize: 12,
        color: "var(--color-text-primary)",
        textAlign: "center",
        width: "100%",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
    </div>
  );
}

function MiniSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: "none",
        width: "100%",
        padding: "7px 24px 7px 10px",
        background: "var(--color-bg-page)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        fontSize: 12,
        color: "var(--color-text-primary)",
        cursor: "pointer",
        fontFamily: "inherit",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.4'><path d='M6 9l6 6 6-6'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 7px center",
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function SegButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 0",
        background: selected
          ? "var(--color-bg-brand-subtle)"
          : "var(--color-bg-page)",
        border: `var(--border-width-1) solid ${selected ? "var(--color-border-brand)" : "var(--color-border-default)"}`,
        color: selected
          ? "var(--color-violet-600)"
          : "var(--color-text-primary)",
        fontSize: 12,
        fontWeight: 600,
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

function SnapToggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      aria-label={`Snap ${label}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 8px",
        background: "var(--color-bg-page)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--color-text-primary)",
        fontFamily: "inherit",
      }}
    >
      <span>{label}</span>
      <span
        style={{
          width: 26,
          height: 14,
          borderRadius: 7,
          background: on
            ? "var(--color-violet-600)"
            : "var(--color-bg-surface-raised)",
          position: "relative",
          flex: "0 0 26px",
          transition: "background .12s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 14 : 2,
            width: 10,
            height: 10,
            background: "var(--color-bg-surface)",
            borderRadius: "50%",
            transition: "left .12s",
            boxShadow: "0 1px 2px rgba(0,0,0,.2)",
          }}
        />
      </span>
    </button>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: "var(--color-text-tertiary)",
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
