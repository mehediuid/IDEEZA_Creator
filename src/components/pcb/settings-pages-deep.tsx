"use client";

// IDEEZA PCB Software — Settings overlay deep pages (Phase D).
// Three multi-tab settings pages: Schematic / Symbol, PCB / Footprint, and
// Panel / Panel Lib. Each shares the same TabBar pattern and renders one of
// several sub-pages (General / Theme / Layer / Grid / Track Width / Snap …)
// backed by store state.

import * as React from "react";
import { Checkbox, Select, Toggle } from "@/components/ideeza";
import { Icon } from "@/lib/pcb/icons";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { TOOLBAR_CATALOGS, type ThemeColor, type ToolbarScope } from "@/lib/pcb/types";

const SEARCH_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';

const PAD_X = "var(--spacing-12)";
const ROW_PAD = "var(--spacing-5) var(--spacing-0)";

// ── shared primitives ──────────────────────────────────────────────────────

function PageScroll({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: `var(--spacing-4) ${PAD_X} var(--spacing-12)` }}>
      {children}
    </div>
  );
}

function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--spacing-1)",
        padding: "var(--spacing-2) 0",
        borderBottom: "var(--border-width-1) solid var(--color-border-default)",
        marginBottom: "var(--spacing-5)",
        overflowX: "auto",
      }}
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              padding: "var(--spacing-3) var(--spacing-5)",
              border: "none",
              borderBottom: `2px solid ${on ? "var(--color-violet-600)" : "transparent"}`,
              background: "transparent",
              color: on ? "var(--color-text-brand)" : "var(--color-text-secondary)",
              fontSize: "var(--font-size-sm)",
              fontWeight: on ? 700 : 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: ROW_PAD,
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        gap: "var(--spacing-6)",
      }}
    >
      <div>
        <div style={{ fontSize: "var(--font-size-md)", fontWeight: 600, color: "var(--color-text-primary)" }}>
          {label}
        </div>
        {hint && (
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>
            {hint}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>{children}</div>
    </div>
  );
}

function GroupHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: "var(--font-size-xs)",
        fontWeight: 700,
        color: "var(--color-text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        padding: "var(--spacing-6) var(--spacing-0) var(--spacing-2)",
      }}
    >
      {title}
    </div>
  );
}

// Color picker — local-positioned native picker so the dialog opens from the
// swatch, matching the pattern used elsewhere in the editor.
function ColorPickerCell({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--spacing-2)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        padding: "var(--spacing-1) var(--spacing-3)",
        cursor: "pointer",
        minWidth: 130,
      }}
      title="Pick a color"
    >
      <span
        style={{
          position: "relative",
          width: 18,
          height: 18,
          borderRadius: "var(--radius-sm)",
          background: value,
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          overflow: "hidden",
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        />
      </span>
      <span
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-family-mono), monospace",
        }}
      >
        {value.toUpperCase()}
      </span>
    </label>
  );
}

// Reusable theme grid — 2-column color picker for an array of ThemeColor rows.
function ThemeGrid({
  items,
  onColorChange,
}: {
  items: ThemeColor[];
  onColorChange: (id: string, color: string) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "var(--spacing-3) var(--spacing-6)",
        padding: "var(--spacing-3) 0",
      }}
    >
      {items.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--spacing-3)",
            padding: "var(--spacing-3) var(--spacing-0)",
            borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
          }}
        >
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
            {t.label}
          </span>
          <ColorPickerCell value={t.color} onChange={(v) => onColorChange(t.id, v)} />
        </div>
      ))}
    </div>
  );
}

// ── Schematic / Symbol settings page ───────────────────────────────────────

const SCHEM_SYM_TABS: { id: "general" | "theme"; label: string }[] = [
  { id: "general", label: "General" },
  { id: "theme",   label: "Theme" },
];

export function SchematicSymbolSettingsPage() {
  const state = usePcbState();
  const actions = usePcbActions();
  const ss = state.schemSymbolSettings;
  const sub = ss.subPage;
  const T = (k: keyof typeof ss.general, label: string, hint?: string) => (
    <Row label={label} hint={hint}>
      <Toggle
        aria-label={label}
        checked={Boolean(ss.general[k])}
        onChange={() =>
          actions.setSchemSymGeneral({ [k]: !ss.general[k] } as Partial<typeof ss.general>)
        }
      />
    </Row>
  );

  return (
    <PageScroll>
      <TabBar tabs={SCHEM_SYM_TABS} active={sub} onChange={actions.setSchemSymSubPage} />
      {sub === "general" && (
        <>
          <GroupHeader title="Designators & Pins" />
          <Row label="Designator Size">
            <Select
              value={ss.general.designatorSize}
              options={["1.0mm", "1.5mm", "2.0mm", "2.5mm", "3.0mm"].map((v) => ({ label: v, value: v }))}
              onChange={(v) => actions.setSchemSymGeneral({ designatorSize: v })}
              minWidth={120}
            />
          </Row>
          <Row label="Pin Number Size">
            <Select
              value={ss.general.pinNumberSize}
              options={["0.8mm", "1.0mm", "1.25mm", "1.5mm", "2.0mm"].map((v) => ({ label: v, value: v }))}
              onChange={(v) => actions.setSchemSymGeneral({ pinNumberSize: v })}
              minWidth={120}
            />
          </Row>
          {T("autoIncrement",      "Auto-increment designators")}
          {T("showInvisiblePins",  "Show invisible pins")}
          {T("showPinNames",       "Show pin names")}

          <GroupHeader title="Editor Behavior" />
          {T("snapToGrid",   "Snap to grid")}
          {T("showGuideLines", "Show alignment guides")}
        </>
      )}
      {sub === "theme" && (
        <>
          <GroupHeader title="Schematic Element Colors" />
          <ThemeGrid items={ss.theme} onColorChange={actions.setSchemSymThemeColor} />
        </>
      )}
    </PageScroll>
  );
}

// ── PCB / Footprint settings page ──────────────────────────────────────────

const PCB_FP_TABS: { id: "general" | "theme" | "layer" | "gridCart" | "gridPolar" | "trackWidth" | "snap"; label: string }[] = [
  { id: "general",    label: "General" },
  { id: "theme",      label: "Theme" },
  { id: "layer",      label: "Layer" },
  { id: "gridCart",   label: "Grid · Cartesian" },
  { id: "gridPolar",  label: "Grid · Polar" },
  { id: "trackWidth", label: "Track Width" },
  { id: "snap",       label: "Snap" },
];

export function PcbFootprintSettingsPage() {
  const state = usePcbState();
  const actions = usePcbActions();
  const pf = state.pcbFootprintSettings;
  const sub = pf.subPage;
  const T = (k: keyof typeof pf.general, label: string, hint?: string) => (
    <Row label={label} hint={hint}>
      <Toggle
        aria-label={label}
        checked={Boolean(pf.general[k])}
        onChange={() =>
          actions.setPcbFpGeneral({ [k]: !pf.general[k] } as Partial<typeof pf.general>)
        }
      />
    </Row>
  );

  return (
    <PageScroll>
      <TabBar tabs={PCB_FP_TABS} active={sub} onChange={actions.setPcbFpSubPage} />

      {sub === "general" && (
        <>
          <GroupHeader title="Display" />
          {T("showPadNames",        "Show pad names")}
          {T("showPadNumbers",      "Show pad numbers")}
          {T("showVias",            "Show vias")}
          {T("showTrackClearance",  "Show track clearance halos")}
          {T("showNetNames",        "Show net names on tracks")}
          {T("showHidden",          "Show hidden objects")}
          {T("showRuler",           "Show ruler")}
          {T("showOrigin",          "Show board origin")}

          <GroupHeader title="Routing" />
          {T("autoRipUp",      "Auto rip-up while routing")}
          {T("snapToCopper",   "Snap to existing copper")}
          {T("fillerPolygons", "Auto-fill copper polygons")}
          {T("rats",           "Show ratlines")}
          {T("drcLive",        "Live DRC")}

          <GroupHeader title="Angular / Mode" />
          <Row label="Angular Resolution">
            <Select
              value={pf.general.angularResolution}
              options={["15°", "30°", "45°", "60°", "90°"].map((v) => ({ label: v, value: v }))}
              onChange={(v) => actions.setPcbFpGeneral({ angularResolution: v })}
              minWidth={120}
            />
          </Row>
          <Row label="Route Mode">
            <Select
              value={pf.general.routeMode}
              options={["Walk-around", "Push-out", "Shove", "Highlight collisions"].map((v) => ({ label: v, value: v }))}
              onChange={(v) => actions.setPcbFpGeneral({ routeMode: v })}
              minWidth={160}
            />
          </Row>
        </>
      )}

      {sub === "theme" && (
        <>
          <GroupHeader title="PCB Element Colors" />
          <ThemeGrid items={pf.theme} onColorChange={actions.setPcbFpThemeColor} />
        </>
      )}

      {sub === "layer" && (
        <>
          <GroupHeader title="Layer Stack" />
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginBottom: "var(--spacing-3)" }}>
            Layer visibility, color and lock controls are also available on the right-panel <strong>Layer</strong> tab.
          </div>
          {state.pcbLayers.map((l) => (
            <div
              key={l.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-4)",
                padding: "var(--spacing-3) 0",
                borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
              }}
            >
              <ColorPickerCell value={l.color} onChange={(c) => actions.setPcbLayerColor(l.id, c)} />
              <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
                {l.name}
              </span>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
                {l.type}
              </span>
              <Toggle
                aria-label={`Visible: ${l.name}`}
                checked={l.visible}
                onChange={() => actions.togglePcbLayerVis(l.id)}
              />
            </div>
          ))}
        </>
      )}

      {sub === "gridCart" && (
        <>
          <GroupHeader title="Cartesian Grid" />
          <Row label="Grid Size">
            <Select
              value={pf.gridCart.gridSize}
              options={["1 mil", "5 mil", "10 mil", "25 mil", "50 mil", "1 mm"].map((v) => ({ label: v, value: v }))}
              onChange={(v) => actions.setPcbFpGridCart({ gridSize: v })}
              minWidth={120}
            />
          </Row>
          <Row label="Snap Size">
            <Select
              value={pf.gridCart.snapSize}
              options={["1 mil", "5 mil", "10 mil", "25 mil", "50 mil", "1 mm"].map((v) => ({ label: v, value: v }))}
              onChange={(v) => actions.setPcbFpGridCart({ snapSize: v })}
              minWidth={120}
            />
          </Row>
          <Row label="Grid Style">
            <Select
              value={pf.gridCart.gridStyle}
              options={["Dotted", "Lined", "Crossed", "Off"].map((v) => ({ label: v, value: v }))}
              onChange={(v) => actions.setPcbFpGridCart({ gridStyle: v })}
              minWidth={120}
            />
          </Row>
          <Row label="Show Origin Marker">
            <Toggle
              aria-label="Show origin marker"
              checked={pf.gridCart.showOrigin}
              onChange={() => actions.setPcbFpGridCart({ showOrigin: !pf.gridCart.showOrigin })}
            />
          </Row>
        </>
      )}

      {sub === "gridPolar" && (
        <>
          <GroupHeader title="Polar Grid" />
          <Row label="Angle Step">
            <Select
              value={pf.gridPolar.angleStep}
              options={["5°", "10°", "15°", "30°", "45°", "60°", "90°"].map((v) => ({ label: v, value: v }))}
              onChange={(v) => actions.setPcbFpGridPolar({ angleStep: v })}
              minWidth={120}
            />
          </Row>
          <Row label="Radial Step">
            <Select
              value={pf.gridPolar.radialStep}
              options={["5 mil", "10 mil", "25 mil", "50 mil", "100 mil"].map((v) => ({ label: v, value: v }))}
              onChange={(v) => actions.setPcbFpGridPolar({ radialStep: v })}
              minWidth={120}
            />
          </Row>
          <Row label="Polar Origin">
            <Select
              value={pf.gridPolar.polarOrigin}
              options={["Selection center", "Board origin", "Cursor"].map((v) => ({ label: v, value: v }))}
              onChange={(v) => actions.setPcbFpGridPolar({ polarOrigin: v })}
              minWidth={170}
            />
          </Row>
        </>
      )}

      {sub === "trackWidth" && (
        <>
          <GroupHeader title="Common Track Widths" />
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginBottom: "var(--spacing-3)" }}>
            Track-width presets exposed when starting a new route. Edit each value or add custom widths.
          </div>
          {pf.trackWidths.map((w, i) => (
            <Row key={`tw_${i}`} label={`Width #${i + 1}`}>
              <input
                type="number"
                value={w}
                onChange={(e) => {
                  const next = [...pf.trackWidths];
                  next[i] = Number(e.target.value) || 0;
                  actions.setPcbFpTrackWidths(next);
                }}
                style={{
                  width: 90,
                  padding: "var(--spacing-2) var(--spacing-3)",
                  border: "var(--border-width-1) solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-bg-surface)",
                  color: "var(--color-text-primary)",
                  fontSize: "var(--font-size-sm)",
                  fontFamily: "var(--font-family-mono), monospace",
                  outline: "none",
                  textAlign: "right",
                }}
              />
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>mil</span>
              <button
                onClick={() =>
                  actions.setPcbFpTrackWidths(pf.trackWidths.filter((_, j) => j !== i))
                }
                style={{
                  width: 28,
                  height: 28,
                  border: "var(--border-width-1) solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-bg-surface)",
                  color: "var(--color-text-error)",
                  cursor: "pointer",
                  fontSize: "var(--font-size-md)",
                  fontWeight: 700,
                }}
                title="Remove"
              >
                −
              </button>
            </Row>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--spacing-4)" }}>
            <button
              onClick={() => actions.setPcbFpTrackWidths([...pf.trackWidths, 10])}
              style={{
                padding: "var(--spacing-3) var(--spacing-5)",
                border: "var(--border-width-1) solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-bg-brand-subtle)",
                color: "var(--color-text-brand)",
                fontSize: "var(--font-size-sm)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              + Add width
            </button>
          </div>
        </>
      )}

      {sub === "snap" && (
        <>
          <GroupHeader title="Snap" />
          <Row label="Snap to Grid">
            <Toggle
              aria-label="Snap to grid"
              checked={pf.snap.gridSnap}
              onChange={() => actions.setPcbFpSnap({ gridSnap: !pf.snap.gridSnap })}
            />
          </Row>
          <Row label="Snap to Objects">
            <Toggle
              aria-label="Snap to objects"
              checked={pf.snap.objectSnap}
              onChange={() => actions.setPcbFpSnap({ objectSnap: !pf.snap.objectSnap })}
            />
          </Row>
          <Row label="Axis Snap (lock X/Y)">
            <Toggle
              aria-label="Axis snap"
              checked={pf.snap.axisSnap}
              onChange={() => actions.setPcbFpSnap({ axisSnap: !pf.snap.axisSnap })}
            />
          </Row>
          <Row label="Angle Snap (45° / 90°)">
            <Toggle
              aria-label="Angle snap"
              checked={pf.snap.angleSnap}
              onChange={() => actions.setPcbFpSnap({ angleSnap: !pf.snap.angleSnap })}
            />
          </Row>
          <Row label="Snap Tolerance (px)">
            <input
              type="number"
              value={pf.snap.tolerance}
              onChange={(e) => actions.setPcbFpSnap({ tolerance: Number(e.target.value) || 0 })}
              style={{
                width: 80,
                padding: "var(--spacing-2) var(--spacing-3)",
                border: "var(--border-width-1) solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-bg-surface)",
                color: "var(--color-text-primary)",
                fontSize: "var(--font-size-sm)",
                fontFamily: "var(--font-family-mono), monospace",
                outline: "none",
                textAlign: "right",
              }}
            />
          </Row>
        </>
      )}
    </PageScroll>
  );
}

// ── Panel / Panel Lib settings page ────────────────────────────────────────

const PANEL_LIB_TABS: { id: "general" | "theme" | "themeLine" | "themeStroke"; label: string }[] = [
  { id: "general",     label: "General" },
  { id: "theme",       label: "Theme" },
  { id: "themeLine",   label: "Line Style" },
  { id: "themeStroke", label: "Stroke Width" },
];

const PANEL_LINE_STYLES = ["Solid", "Dashed", "Dotted", "Dash-Dot"] as const;

export function PanelLibSettingsPage() {
  const state = usePcbState();
  const actions = usePcbActions();
  const pl = state.panelLibSettings;
  const sub = pl.subPage;
  const T = (k: keyof typeof pl.general, label: string, hint?: string) => (
    <Row label={label} hint={hint}>
      <Toggle
        aria-label={label}
        checked={Boolean(pl.general[k])}
        onChange={() =>
          actions.setPanelLibGeneral({ [k]: !pl.general[k] } as Partial<typeof pl.general>)
        }
      />
    </Row>
  );

  return (
    <PageScroll>
      <TabBar tabs={PANEL_LIB_TABS} active={sub} onChange={actions.setPanelLibSubPage} />

      {sub === "general" && (
        <>
          <GroupHeader title="Panel Display" />
          {T("showPanelBoundary", "Show panel boundary")}
          {T("showFiducials",     "Show fiducials")}
          {T("showVCutLines",     "Show V-cut lines")}
          {T("showMouseBites",    "Show mouse bites")}

          <GroupHeader title="Layout" />
          {T("snapToBoundary",   "Snap to boundary")}
          {T("multiBoardLayout", "Allow multi-board layout")}
        </>
      )}

      {sub === "theme" && (
        <>
          <GroupHeader title="Panel Element Colors" />
          <ThemeGrid items={pl.theme} onColorChange={actions.setPanelLibThemeColor} />
        </>
      )}

      {sub === "themeLine" && (
        <>
          <GroupHeader title="Line Style per Element" />
          {pl.lineStyles.map((l) => (
            <Row key={l.id} label={l.label}>
              <Select
                value={l.style}
                options={PANEL_LINE_STYLES.map((v) => ({ label: v, value: v }))}
                onChange={(v) =>
                  actions.setPanelLibLineStyle(l.id, v as (typeof PANEL_LINE_STYLES)[number])
                }
                minWidth={140}
              />
            </Row>
          ))}
        </>
      )}

      {sub === "themeStroke" && (
        <>
          <GroupHeader title="Stroke Width per Element" />
          {pl.strokeWidths.map((w) => (
            <Row key={w.id} label={w.label}>
              <input
                type="number"
                value={w.width}
                onChange={(e) =>
                  actions.setPanelLibStrokeWidth(w.id, Number(e.target.value) || 0)
                }
                style={{
                  width: 90,
                  padding: "var(--spacing-2) var(--spacing-3)",
                  border: "var(--border-width-1) solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-bg-surface)",
                  color: "var(--color-text-primary)",
                  fontSize: "var(--font-size-sm)",
                  fontFamily: "var(--font-family-mono), monospace",
                  outline: "none",
                  textAlign: "right",
                }}
              />
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>mil</span>
            </Row>
          ))}
        </>
      )}
    </PageScroll>
  );
}

// ── Top Toolbar Setting (Phase E) ──────────────────────────────────────────
// Two-pane builder per scope. Left pane = items NOT yet selected (available);
// right pane = items currently selected (will be rendered in the toolbar).
// Checking on the left moves the item right; unchecking on the right moves it
// back to the left. Search filters both panes.

const TOOLBAR_TABS: { id: ToolbarScope; label: string }[] = [
  { id: "schematic", label: "Schematic" },
  { id: "symbol",    label: "Symbol" },
  { id: "pcb",       label: "PCB" },
  { id: "panel",     label: "Panel / Panel Lib" },
];

export function TopToolsBarSettingsPage() {
  const state = usePcbState();
  const actions = usePcbActions();
  const cust = state.toolbarCustomization;
  const scope = cust.scope;
  const [q, setQ] = React.useState("");

  const catalog = TOOLBAR_CATALOGS[scope];
  const selectedIds = new Set(cust[scope]);
  const norm = (s: string) => s.toLowerCase();
  const matches = (label: string) => !q || norm(label).includes(norm(q));

  const available = catalog.filter((it) => !selectedIds.has(it.id) && matches(it.label));
  const selected = catalog.filter((it) => selectedIds.has(it.id) && matches(it.label));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: `var(--spacing-4) ${PAD_X} var(--spacing-4)`, minHeight: 0 }}>
      {/* Scope tabs */}
      <TabBar tabs={TOOLBAR_TABS} active={scope} onChange={actions.setToolbarScope} />

      {/* Search + bulk actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-3)",
          marginBottom: "var(--spacing-4)",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-3)",
            padding: "var(--spacing-2) var(--spacing-4)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-bg-surface)",
          }}
        >
          <span style={{ width: 14, height: 14, color: "var(--color-text-tertiary)", display: "inline-flex" }}>
            <Icon html={SEARCH_SVG} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${scope} toolbar items…`}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--color-text-primary)",
              fontSize: "var(--font-size-sm)",
            }}
          />
        </div>
        <button onClick={() => actions.selectAllToolbarItems(scope)} style={bulkBtn()}>
          Select all
        </button>
        <button onClick={() => actions.clearAllToolbarItems(scope)} style={bulkBtn()}>
          Clear
        </button>
        <button onClick={() => actions.resetToolbarCustomization()} style={bulkBtn()}>
          Restore default
        </button>
      </div>

      {/* Two-pane checkbox lists */}
      <div
        style={{
          flex: 1,
          minHeight: 260,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--spacing-5)",
        }}
      >
        <Column
          title={`Available Item (${available.length})`}
          empty={`No items${q ? ` matching “${q}”` : ""}.`}
          items={available}
          checkedById={() => false}
          onToggle={(id) => actions.toggleToolbarItem(scope, id)}
        />
        <Column
          title={`Selected Item (${selected.length})`}
          empty={`Nothing selected${q ? ` matching “${q}”` : ""}.`}
          items={selected}
          checkedById={() => true}
          onToggle={(id) => actions.toggleToolbarItem(scope, id)}
        />
      </div>

      <div
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-tertiary)",
          marginTop: "var(--spacing-3)",
        }}
      >
        Check an item on the left to add it to the toolbar; uncheck on the right to remove. {cust[scope].length} of {catalog.length} selected for {scope}.
      </div>
    </div>
  );
}

function Column({
  title,
  empty,
  items,
  checkedById,
  onToggle,
}: {
  title: string;
  empty: string;
  items: { id: string; label: string }[];
  checkedById: (id: string) => boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        border: "var(--border-width-1) solid var(--color-border-subtle)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-bg-surface)",
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: "var(--spacing-3) var(--spacing-5)",
          background: "var(--color-bg-subtle)",
          borderBottom: "var(--border-width-1) solid var(--color-border-default)",
          fontSize: "var(--font-size-xs)",
          fontWeight: 700,
          color: "var(--color-text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </div>
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: "var(--spacing-8) var(--spacing-5)",
              textAlign: "center",
              color: "var(--color-text-tertiary)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {empty}
          </div>
        ) : (
          items.map((it) => (
            <div
              key={it.id}
              onClick={() => onToggle(it.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-4)",
                padding: "var(--spacing-3) var(--spacing-5)",
                borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
                cursor: "pointer",
              }}
            >
              <Checkbox checked={checkedById(it.id)} />
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
                {it.label}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function bulkBtn(): React.CSSProperties {
  return {
    padding: "var(--spacing-2) var(--spacing-4)",
    border: "var(--border-width-1) solid var(--color-border-default)",
    borderRadius: "var(--radius-md)",
    background: "var(--color-bg-surface)",
    color: "var(--color-text-secondary)",
    fontSize: "var(--font-size-xs)",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
