"use client";

// IDEEZA PCB Software — right panel.
// Properties / Filter / Layer tabs; the body is mode-aware (buildRight) and the
// footer holds the Item / Caption rows.

import * as React from "react";
import { Icon } from "@/lib/pcb/icons";
import { Select, Checkbox } from "@/components/ideeza";
import { ColorPicker } from "@/components/pcb/color-picker";
import { SchematicProperties } from "@/components/pcb/schem-properties";
import { PlacedProperties } from "@/components/pcb/placed-properties";
import { buildRightTabs } from "@/lib/pcb/data";
import { buildRight } from "@/lib/pcb/content";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

export function RightPanel() {
  const state = usePcbState();
  const actions = usePcbActions();
  const rightTabs = buildRightTabs(state, actions);

  return (
    <div
      style={{
        position: "absolute",
        top: state.viewTog["Top Toolbar"] !== false ? 225 : 142,
        bottom: 36,
        right: 0,
        width: 292,
        background: "var(--color-bg-surface)",
        borderLeft: "var(--border-width-1) solid var(--color-border-default)",
        display: "flex",
        flexDirection: "column",
        zIndex: 15,
        userSelect: "text",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)", padding: "var(--spacing-7) var(--spacing-8) var(--spacing-0)" }}>
        {rightTabs.map((rt) => (
          <div
            key={rt.label}
            className="ix-tab"
            onClick={rt.onClick}
            style={{
              fontSize: "var(--font-size-md)",
              fontWeight: Number(rt.weight),
              color: rt.fg,
              cursor: "pointer",
              paddingBottom: "var(--spacing-4)",
              borderBottom: `var(--border-width-2) solid ${rt.bd}`,
            }}
          >
            {rt.label}
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: "var(--color-border-subtle)" }} />

      <div style={{ flex: 1, overflowY: "auto" }}>
        {state.rightTab === "filter" ? (
          <FilterTab />
        ) : state.rightTab === "layer" && state.mode !== "schematic" ? (
          <LayerTab />
        ) : state.selectedIds.length > 0 ? (
          <PlacedProperties />
        ) : state.selected === "comp" ? (
          <CompProps />
        ) : state.selected === "wire" ? (
          <WireProps />
        ) : state.selected === "pin" ? (
          <PinProps />
        ) : state.mode === "schematic" ? (
          <SchematicProperties />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: buildRight(state.mode, state.rightTab) }} />
        )}
      </div>

      <CoordReadout />
    </div>
  );
}

// ── Selected-object property editors (double-click / connection-line flows) ──

const DD_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2.2"><path d="M6 9l6 6 6-6"/></svg>';

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", padding: "var(--spacing-5) var(--spacing-8)" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-violet-600)" strokeWidth="2.6">
        <path d="M6 9l6 6 6-6" />
      </svg>
      <span style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>{title}</span>
    </div>
  );
}

function ValueCell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--spacing-3)",
        minWidth: 130,
        padding: "var(--spacing-3) var(--spacing-4)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-sm)",
        color: "var(--color-text-primary)",
        cursor: "pointer",
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</span>
      <Icon html={DD_SVG} size={11} />
    </div>
  );
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-4)", padding: "var(--spacing-3) var(--spacing-8)" }}>
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>{label}</span>
      {children}
    </div>
  );
}

const Swatch = ({ color }: { color: string }) => (
  <span style={{ width: 22, height: 22, borderRadius: "var(--radius-sm)", background: color, border: "var(--border-width-1) solid var(--color-border-default)" }} />
);

function CompProps() {
  const state = usePcbState();
  const actions = usePcbActions();
  const ts = state.textStyle;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--spacing-5) var(--spacing-8) var(--spacing-2)" }}>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>Multiple Objects</span>
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>Selected object</span>
      </div>
      <SectionHeader title="Basic Properties" />
      <PropRow label="Name"><ValueCell>U18</ValueCell></PropRow>
      <PropRow label="Parent"><ValueCell>$1N142</ValueCell></PropRow>
      <PropRow label="Relevance"><ValueCell>{state.editText}</ValueCell></PropRow>
      <PropRow label="Color"><Swatch color="var(--color-violet-600)" /></PropRow>
      <PropRow label="Pin Type"><ValueCell>Undefined</ValueCell></PropRow>
      <PropRow label="Font"><ValueCell>None</ValueCell></PropRow>
      <PropRow label="Font Size"><ValueCell>Undefined</ValueCell></PropRow>
      <PropRow label="Style">
        <div style={{ display: "flex", gap: "var(--spacing-2)" }}>
          {(["b", "i", "u"] as const).map((k) => {
            const on = ts[k];
            return (
              <span
                key={k}
                onClick={() => actions.toggleTextStyle(k)}
                style={{
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `var(--border-width-1) solid ${on ? "var(--color-violet-600)" : "var(--color-border-default)"}`,
                  background: on ? "var(--color-bg-brand-subtle)" : "transparent",
                  color: on ? "var(--color-text-brand)" : "var(--color-text-secondary)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: 700,
                  fontStyle: k === "i" ? "italic" : "normal",
                  textDecoration: k === "u" ? "underline" : "none",
                  cursor: "pointer",
                }}
              >
                {k.toUpperCase()}
              </span>
            );
          })}
        </div>
      </PropRow>
      <PropRow label="Origin"><Swatch color="var(--color-violet-600)" /></PropRow>
      <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-3) var(--spacing-8)" }} />
      <SectionHeader title="More Properties" />
    </div>
  );
}

function WireProps() {
  const state = usePcbState();
  const actions = usePcbActions();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--spacing-5) var(--spacing-8) var(--spacing-2)" }}>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>Wire</span>
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>Selected objects 1</span>
      </div>
      <SectionHeader title="Basic Properties" />
      <PropRow label="Name"><ValueCell>USB</ValueCell></PropRow>
      <PropRow label="ID"><ValueCell>$3894</ValueCell></PropRow>
      <PropRow label="Global Net Name"><ValueCell>$3894</ValueCell></PropRow>
      <PropRow label="Relevance"><ValueCell>{state.editText}</ValueCell></PropRow>
      <PropRow label="Color">
        <div style={{ position: "relative" }}>
          <div
            onClick={(e) => { e.stopPropagation(); actions.toggleColorPicker(); }}
            style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", padding: "var(--spacing-2) var(--spacing-3)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", cursor: "pointer", minWidth: 110, justifyContent: "space-between" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>
              <Swatch color={state.netColor} />
              <span style={{ fontSize: "var(--font-size-xs)", fontFamily: "var(--font-family-mono)", color: "var(--color-text-primary)" }}>{state.netColor.toUpperCase()}</span>
            </span>
          </div>
          {state.colorPickerOpen && (
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 90 }}>
              <ColorPicker value={state.netColor} onChange={actions.setNetColor} />
            </div>
          )}
        </div>
      </PropRow>
      <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-3) var(--spacing-8)" }} />
      <SectionHeader title="Only Wire and Bus" />
      <PropRow label="Line Width">
        <div style={{ minWidth: 130 }}>
          <Select
            value={state.wireLineWidth}
            onChange={actions.setWireLineWidth}
            options={["3", "5", "8", "10", "12"].map((v) => ({ label: v, value: v }))}
          />
        </div>
      </PropRow>
      <PropRow label="Line Style">
        <div style={{ minWidth: 130 }}>
          <Select
            value={state.wireLineStyle}
            onChange={actions.setWireLineStyle}
            options={["Solid (Default)", "Dashed", "Dotted", "Dash-Dot"].map((v) => ({ label: v, value: v }))}
          />
        </div>
      </PropRow>
    </div>
  );
}

function PinProps() {
  const state = usePcbState();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--spacing-5) var(--spacing-8) var(--spacing-2)" }}>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>Pin</span>
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>Selected object</span>
      </div>
      <SectionHeader title="Basic Properties" />
      <PropRow label="Pin Number"><ValueCell>1</ValueCell></PropRow>
      <PropRow label="Pin Name"><ValueCell>VCC</ValueCell></PropRow>
      <PropRow label="Designator"><ValueCell>{state.editText.slice(0, 12)}</ValueCell></PropRow>
      <PropRow label="Electrical Type"><ValueCell>Power</ValueCell></PropRow>
      <PropRow label="Net"><ValueCell>+5V</ValueCell></PropRow>
      <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-3) var(--spacing-8)" }} />
      <SectionHeader title="Geometry" />
      <PropRow label="Length"><ValueCell>200 mil</ValueCell></PropRow>
      <PropRow label="Rotation"><ValueCell>0°</ValueCell></PropRow>
      <PropRow label="Show Name"><ValueCell>Yes</ValueCell></PropRow>
      <PropRow label="Show Number"><ValueCell>Yes</ValueCell></PropRow>
    </div>
  );
}

// ── Filter tab (interactive: scope dropdown + expand + per-category checkboxes) ──
const FILTER_CATS: [string, boolean, string][] = [
  ["All Objects", true, "248"],
  ["Components", true, "42"],
  ["Pads", true, "168"],
  ["Vias", true, "31"],
  ["Tracks", true, "96"],
  ["Arcs", false, "12"],
  ["Fills", false, "4"],
  ["Text", true, "18"],
  ["Nets", true, "27"],
  ["Dimensions", false, "3"],
];

function FilterTab() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [checked, setChecked] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(FILTER_CATS.map(([n, on]) => [n, on])),
  );
  const [scope, setScope] = React.useState("All Objects");

  return (
    <div style={{ padding: "var(--spacing-6) var(--spacing-8)" }}>
      <div style={{ marginBottom: "var(--spacing-6)" }}>
        <Select
          value={scope}
          onChange={(v) => {
            setScope(v);
            actions.toggleFilterDropdown(false);
          }}
          options={["All Objects", "Selected Only", "Visible Only"].map((v) => ({ label: v, value: v }))}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--spacing-4)" }}>
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>Object Filter</span>
        <span onClick={actions.toggleFilterExpanded} style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-brand)", fontWeight: 600, cursor: "pointer" }}>
          {state.filterExpanded ? "Collapse" : "Expand"}
        </span>
      </div>
      {FILTER_CATS.map(([name, , count]) => (
        <div key={name}>
          <div
            onClick={() => setChecked((c) => ({ ...c, [name]: !c[name] }))}
            style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-4) var(--spacing-0)", cursor: "pointer" }}
          >
            <Checkbox checked={!!checked[name]} />
            <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{name}</span>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>{count}</span>
          </div>
          {state.filterExpanded && (
            <div style={{ paddingLeft: 35, paddingBottom: "var(--spacing-3)", fontSize: "var(--font-size-2xs)", color: "var(--color-text-tertiary)" }}>
              Layer: All · Net: Any
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Layer tab (interactive eye / lock toggles) ──────────────────────────────
const EYE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="2.6"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a13 13 0 0 1-2.2 3M6.6 6.6A13 13 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.3-1M3 3l18 18"/></svg>';
const LOCK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const LOCK_OPEN = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></svg>';

const LAYER_DEFS_2D: [string, string][] = [
  ["Top Layer", "#e34c4c"], ["Middle Layer 1", "#3bb56f"], ["Middle Layer 2", "#2f7ad6"],
  ["Bottom Layer", "#e3b23b"], ["Top Silkscreen", "var(--color-text-primary)"], ["Bottom Silkscreen", "var(--color-text-tertiary)"],
  ["Top Paste", "#c060c0"], ["Bottom Paste", "#3bb5b5"], ["Drill Layer", "#555"], ["Board Outline", "var(--color-violet-600)"],
];
const LAYER_DEFS_3D: [string, string][] = [
  ["Top Layer", "#e34c4c"], ["Middle Layer 1", "#3bb56f"], ["Middle Layer 2", "#2f7ad6"],
  ["Bottom Layer", "#e3b23b"], ["Top Silkscreen", "var(--color-text-primary)"], ["Bottom Silkscreen", "var(--color-violet-600)"],
];

function LayerTab() {
  const state = usePcbState();
  const actions = usePcbActions();
  const layers = state.mode === "3d" ? LAYER_DEFS_3D : LAYER_DEFS_2D;
  return (
    <div style={{ padding: "var(--spacing-3) 0" }}>
      {layers.map(([name, color]) => {
        const on = state.layerVis[name] !== false;
        const locked = !!state.layerLock[name];
        return (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-4) var(--spacing-8)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
            <span style={{ width: 16, height: 16, borderRadius: "var(--radius-sm)", background: color, flex: "0 0 auto", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.12)" }} />
            <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", opacity: on ? 1 : 0.45 }}>{name}</span>
            <span onClick={() => actions.toggleLayerVis(name)} style={{ color: on ? "var(--color-violet-600)" : "var(--color-border-strong)", display: "inline-flex", cursor: "pointer" }}>
              <Icon html={on ? EYE : EYE_OFF} />
            </span>
            <span onClick={() => actions.toggleLayerLock(name)} style={{ color: locked ? "var(--color-violet-600)" : "var(--color-border-strong)", display: "inline-flex", cursor: "pointer" }}>
              <Icon html={locked ? LOCK : LOCK_OPEN} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CoordReadout() {
  const cell = (a: string, b: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--spacing-2) 0" }}>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>{a}</span>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", fontWeight: 600 }}>{b}</span>
    </div>
  );
  return (
    <div
      style={{
        borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
        background: "var(--color-bg-subtle)",
        padding: "var(--spacing-4) var(--spacing-8)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        columnGap: "var(--spacing-8)",
      }}
    >
      {cell("S", "74%")}
      {cell("G", "0.005 inch")}
      {cell("X", "17.34 inch")}
      {cell("dx", "11.17 inch")}
      {cell("Y", "3 inch")}
      {cell("dY", "-0.12 inch")}
    </div>
  );
}
