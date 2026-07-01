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
import { usePreview } from "./preview-context";
import type { SceneShape } from "@/components/3d/three-canvas";
import type {
  PreviewPcbBoard,
  PreviewPcbComponent,
} from "./preview-context";

const PANEL_WIDTH = 292;
const TAB_STRIP_WIDTH = 44;
const CONTENT_WIDTH = PANEL_WIDTH - TAB_STRIP_WIDTH;

type TabId =
  | "properties"
  | "parts"
  | "copies"
  | "selection"
  | "materials"
  | "variables";

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
  {
    id: "copies",
    title: "Copies",
    icon: (
      <>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
      </>
    ),
  },
  {
    id: "selection",
    title: "Selection",
    icon: (
      <>
        <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M4 16v3a1 1 0 0 0 1 1h3M16 20h3a1 1 0 0 0 1-1v-3" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
  },
  {
    id: "materials",
    title: "Materials",
    icon: (
      <>
        <path d="M4 7l8-4 8 4-8 4z" />
        <path d="M4 7v10l8 4 8-4V7" />
        <circle cx="17" cy="17" r="3" />
        <path d="M15.5 17a1.5 1.5 0 0 1 3 0v1.5a1.5 1.5 0 0 1-3 0z" />
      </>
    ),
  },
  {
    id: "variables",
    title: "Variables",
    icon: (
      <>
        <path d="M9 6c-3 0-3 12 0 12" />
        <path d="M15 6c3 0 3 12 0 12" />
        <path d="M11 9l2 6M13 9l-2 6" />
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
  if (tab === "properties") return <PropertiesBody />;
  if (tab === "parts") return <PartsBody />;
  if (tab === "copies") return <PlaceholderBody title="Copies" sub="Linked copies and pattern instances will appear here." />;
  if (tab === "selection") return <SelectionBody />;
  if (tab === "materials") return <MaterialsBody />;
  if (tab === "variables") return <VariablesBody />;
  return null;
}

function PropertiesBody() {
  const {
    pcb,
    enclosureShapes,
    selectedId,
    showPcb,
    showEnclosure,
    xray,
    isolate,
    togglePcb,
    toggleEnclosure,
    toggleXray,
    toggleIsolate,
    fitVerdict,
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
        <ToggleRow
          label="X-ray"
          sub="See through the enclosure"
          on={xray}
          onChange={toggleXray}
        />
        <ToggleRow
          label="Isolate selected"
          sub="Hide other enclosure parts"
          on={isolate}
          onChange={toggleIsolate}
        />
      </Section>

      {/* Selection-specific props */}
      {selection?.kind === "pcb-board" && <BoardProps board={selection.board} />}
      {selection?.kind === "pcb-component" && (
        <ComponentProps component={selection.component} />
      )}
      {selection?.kind === "enclosure" && (
        <ShapeProps shape={selection.shape} />
      )}
      {!selection && <FitSummary verdict={fitVerdict} />}
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

function FitSummary({
  verdict,
}: {
  verdict: ReturnType<typeof usePreview>["fitVerdict"];
}) {
  return (
    <Section title="Fit summary">
      {verdict.kind === "fits" && (
        <>
          <Row label="Status" value="✓ PCB fits inside enclosure" />
          <Row
            label="Headroom"
            value={`X ${verdict.headroom[0].toFixed(2)} · Y ${verdict.headroom[1].toFixed(2)} · Z ${verdict.headroom[2].toFixed(2)}`}
          />
        </>
      )}
      {verdict.kind === "overflow" && (
        <>
          <Row label="Status" value="⚠ PCB exceeds enclosure" />
          <Row
            label="Overflow"
            value={`X ${verdict.overflow[0].toFixed(2)} · Y ${verdict.overflow[1].toFixed(2)} · Z ${verdict.overflow[2].toFixed(2)}`}
          />
        </>
      )}
      {verdict.kind === "pcb-missing" && (
        <Note>
          No PCB in the scene yet. Open the PCB module to place a board.
        </Note>
      )}
      {verdict.kind === "enclosure-missing" && (
        <Note>
          No enclosure parts yet. Add one from the toolbar or from the +
          button in the Instances panel.
        </Note>
      )}
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

function SelectionBody() {
  const { selectedId, pcb, enclosureShapes, selectShape, flashToast } =
    usePreview();
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <Section title="Current selection">
        {selectedId ? (
          <>
            <SimpleRow label="ID" sub={selectedId} />
            <button
              onClick={() => selectShape(null)}
              style={smallBtn}
            >
              Clear selection
            </button>
          </>
        ) : (
          <Note>Nothing selected. Click a part in the viewport or tree.</Note>
        )}
      </Section>
      <Section title="Quick select">
        <button
          onClick={() => selectShape("pcb-board")}
          style={smallBtn}
        >
          Select PCB board
        </button>
        {pcb.components[0] && (
          <button
            onClick={() => selectShape(pcb.components[0].id)}
            style={smallBtn}
          >
            Select first component
          </button>
        )}
        {enclosureShapes[0] && (
          <button
            onClick={() => selectShape(enclosureShapes[0].id)}
            style={smallBtn}
          >
            Select first enclosure part
          </button>
        )}
        {!pcb.components[0] && !enclosureShapes[0] && (
          <Note>Nothing to quick-select yet.</Note>
        )}
      </Section>
      {selectedId && (
        <Section title="Actions">
          <button
            onClick={() => flashToast("Frame action — coming soon")}
            style={smallBtn}
          >
            Frame selection
          </button>
        </Section>
      )}
    </div>
  );
}

function MaterialsBody() {
  const { pcb } = usePreview();
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <Section title="Board material">
        <Row label="Substrate" value="FR4" />
        <Row label="Color" value={pcb.board.color} />
        <Row label="Finish" value="HASL · lead-free" />
      </Section>
      <Section title="Enclosure material">
        <Row label="Type" value="ABS plastic" />
        <Row label="Opacity" value="Translucent (X-ray ready)" />
      </Section>
      <Note>Material editing lands when manufacturing options ship.</Note>
    </div>
  );
}

function VariablesBody() {
  const { pcb, enclosureShapes } = usePreview();
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <Section title="Computed">
        <Row
          label="PCB area"
          value={`${(pcb.board.width * pcb.board.depth).toFixed(2)} u²`}
        />
        <Row label="Component count" value={String(pcb.components.length)} />
        <Row label="Enclosure parts" value={String(enclosureShapes.length)} />
      </Section>
      <Note>
        Expression variables (#width, #depth, …) for parametric design will
        live here.
      </Note>
    </div>
  );
}

function PlaceholderBody({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <Section title={title}>
        <Note>{sub}</Note>
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

const smallBtn: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 600,
  background: "var(--color-bg-page)",
  border: "var(--border-width-1) solid var(--color-border-subtle)",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text-primary)",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "inherit",
  width: "100%",
};

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
