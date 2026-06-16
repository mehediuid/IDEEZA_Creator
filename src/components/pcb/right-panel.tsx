"use client";

// IDEEZA PCB Software — right panel.
// Properties / Filter / Layer tabs; the body is mode-aware (buildRight) and the
// footer holds the Item / Caption rows.

import * as React from "react";
import { Icon } from "@/lib/pcb/icons";
import { ButtonGroup } from "@/components/ideeza";
import { ColorPicker } from "@/components/pcb/color-picker";
import { buildRightTabs } from "@/lib/pcb/data";
import { buildRight } from "@/lib/pcb/content";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

export function RightPanel() {
  const state = usePcbState();
  const actions = usePcbActions();
  const rightTabs = buildRightTabs(state, actions);
  const captionRows = [1, 2, 3];

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
        {state.rightTab === "properties" && state.selected === "comp" ? (
          <CompProps />
        ) : state.rightTab === "properties" && state.selected === "wire" ? (
          <WireProps />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: buildRight(state.mode, state.rightTab) }} />
        )}
      </div>

      <CoordReadout />

      <div style={{ borderTop: "var(--border-width-1) solid var(--color-border-subtle)", padding: "var(--spacing-5)" }}>
        {captionRows.map((c) => (
          <div
            key={c}
            className="ix-row"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--spacing-4) var(--spacing-5)",
              borderRadius: "var(--radius-lg)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)" }}>
              <span style={{ width: 18, height: 18, border: "1.5px dashed var(--color-border-strong)", borderRadius: "var(--radius-sm)" }} />
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Item 1</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)" }}>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>Caption</span>
              <span style={{ width: 18, height: 18, border: "1.5px dashed var(--color-border-strong)", borderRadius: "var(--radius-sm)" }} />
            </div>
          </div>
        ))}
      </div>
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
  const [style, setStyle] = React.useState("B");
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
        <ButtonGroup
          size="md"
          value={style}
          onChange={setStyle}
          items={[
            { label: "B", value: "B" },
            { label: "I", value: "I" },
            { label: "U", value: "U" },
          ]}
        />
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
      <PropRow label="Line Width"><ValueCell>5</ValueCell></PropRow>
      <PropRow label="Line Style"><ValueCell>Solid (Default)</ValueCell></PropRow>
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
