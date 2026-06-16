"use client";

// IDEEZA PCB Software — properties panel for placed canvas objects.
// When one or more placed objects are selected, the right panel renders
// this view: a header summarizing the selection, then editable Basic /
// Geometry / Wire sections. Edits propagate to the canvas immediately
// via `setObjectField` and are undo-able through the history stack.

import * as React from "react";
import { Select } from "@/components/ideeza";
import { Icon } from "@/lib/pcb/icons";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import type { CanvasObject } from "@/lib/pcb/types";

const KIND_LABELS: Record<string, string> = {
  resistor: "Resistor",
  capacitor: "Capacitor",
  diode: "Diode",
  inductor: "Inductor",
  vcc5v: "+5V Power",
  agnd: "Analog Ground",
  pgnd: "Power Ground",
  netLabel: "Net Label",
  netFlag: "Net Flag",
  shortFlag: "Short Flag",
  port: "Port",
  noConnect: "No Connect",
  text: "Text",
  pad: "Pad",
  via: "Via",
  sutureVias: "Suture Vias",
  wire: "Wire",
  bus: "Bus",
};

const CHEV_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg>';

const PAD_X = "var(--spacing-8)";

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-3)",
        padding: `var(--spacing-5) ${PAD_X}`,
      }}
    >
      <span style={{ display: "inline-flex", width: 13, height: 13, color: "var(--color-violet-600)" }}>
        <Icon html={CHEV_SVG} />
      </span>
      <span style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>
        {title}
      </span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--spacing-4)",
        padding: `var(--spacing-4) ${PAD_X}`,
      }}
    >
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)" }}>{children}</div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  width = 140,
  mono = false,
  disabled = false,
}: {
  value: string | number;
  onChange: (v: string) => void;
  width?: number;
  mono?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width,
        padding: "var(--spacing-2) var(--spacing-4)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        background: disabled ? "var(--color-bg-subtle)" : "var(--color-bg-surface)",
        color: disabled ? "var(--color-text-disabled)" : "var(--color-text-primary)",
        fontSize: "var(--font-size-sm)",
        fontFamily: mono ? "var(--font-family-mono), monospace" : "inherit",
        outline: "none",
      }}
    />
  );
}

function ColorPickerCell({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-2)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        padding: "var(--spacing-1) var(--spacing-3)",
        minWidth: 120,
      }}
    >
      <label
        style={{
          position: "relative",
          width: 18,
          height: 18,
          borderRadius: "var(--radius-sm)",
          background: value,
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          cursor: "pointer",
          overflow: "hidden",
        }}
        title="Pick a color"
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", border: "none", padding: 0 }}
        />
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          background: "transparent",
          color: "var(--color-text-primary)",
          fontSize: "var(--font-size-xs)",
          fontFamily: "var(--font-family-mono), monospace",
          outline: "none",
          width: 60,
        }}
      />
    </div>
  );
}

function NumberCell({
  value,
  onChange,
  width = 70,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  width?: number;
}) {
  return (
    <input
      type="number"
      value={value ?? 0}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      style={{
        width,
        padding: "var(--spacing-2) var(--spacing-4)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-bg-surface)",
        color: "var(--color-text-primary)",
        fontSize: "var(--font-size-sm)",
        fontFamily: "var(--font-family-mono), monospace",
        outline: "none",
      }}
    />
  );
}

export function PlacedProperties() {
  const state = usePcbState();
  const actions = usePcbActions();

  // Multi-select header
  if (state.selectedIds.length > 1) {
    const kinds = new Set(
      state.objects.filter((o) => state.selectedIds.includes(o.id)).map((o) => KIND_LABELS[o.kind] ?? o.kind),
    );
    const setBulkColor = (c: string) => {
      state.selectedIds.forEach((id) => actions.setObjectField(id, { color: c }));
    };
    return (
      <div>
        <div style={{ padding: `var(--spacing-6) ${PAD_X}`, borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <div style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>
            {state.selectedIds.length} objects selected
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 4 }}>
            {Array.from(kinds).join(", ")}
          </div>
        </div>
        <SectionHeader title="Bulk actions" />
        <Row label="Rotate">
          <button onClick={() => actions.rotateSelectedPlaced(-90)} style={miniBtnStyle}>↺ -90°</button>
          <button onClick={() => actions.rotateSelectedPlaced(90)} style={miniBtnStyle}>↻ 90°</button>
        </Row>
        <Row label="Flip">
          <button onClick={() => actions.flipSelectedV()} style={miniBtnStyle}>Vert</button>
          <button onClick={() => actions.flipSelectedH()} style={miniBtnStyle}>Horiz</button>
        </Row>
        <Row label="Color">
          <ColorPickerCell value="#7C2DB9" onChange={setBulkColor} />
          <button onClick={() => state.selectedIds.forEach((id) => actions.setObjectField(id, { color: undefined }))} style={miniBtnStyle}>Reset</button>
        </Row>
        <Row label="Z-order">
          <button onClick={() => actions.bringFront()} style={miniBtnStyle}>Front</button>
          <button onClick={() => actions.sendBack()} style={miniBtnStyle}>Back</button>
        </Row>
        <Row label="Clipboard">
          <button onClick={() => actions.copySelection()} style={miniBtnStyle}>Copy</button>
          <button onClick={() => actions.cutSelection()} style={miniBtnStyle}>Cut</button>
          <button onClick={() => actions.deleteSelected()} style={{ ...miniBtnStyle, color: "var(--color-text-error)" }}>Delete</button>
        </Row>
      </div>
    );
  }

  if (state.selectedIds.length === 1) {
    const obj = state.objects.find((o) => o.id === state.selectedIds[0]);
    if (!obj) return null;
    return <SingleObjectProps obj={obj} />;
  }

  return null;
}

const miniBtnStyle: React.CSSProperties = {
  padding: "var(--spacing-2) var(--spacing-3)",
  border: "var(--border-width-1) solid var(--color-border-default)",
  borderRadius: "var(--radius-md)",
  background: "var(--color-bg-surface)",
  color: "var(--color-text-primary)",
  fontSize: "var(--font-size-xs)",
  cursor: "pointer",
  fontWeight: 500,
};

function SingleObjectProps({ obj }: { obj: CanvasObject }) {
  const actions = usePcbActions();
  const isWire = obj.kind === "wire" || obj.kind === "bus";
  const kindLabel = KIND_LABELS[obj.kind] ?? obj.kind;

  return (
    <div>
      <div style={{ padding: `var(--spacing-6) ${PAD_X}`, borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>{kindLabel}</div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", fontFamily: "var(--font-family-mono), monospace" }}>{obj.id}</div>
        </div>
      </div>

      <SectionHeader title="Basic Properties" />
      <Row label="Kind">
        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", fontWeight: 500 }}>{kindLabel}</span>
      </Row>
      {obj.text !== undefined && !isWire && (
        <Row label={obj.kind === "text" ? "Text" : "Designator"}>
          <TextInput value={obj.text ?? ""} onChange={(v) => actions.setObjectField(obj.id, { text: v })} />
        </Row>
      )}
      {isWire && (
        <Row label="Net name">
          <TextInput value={obj.text ?? ""} onChange={(v) => actions.setObjectField(obj.id, { text: v })} />
        </Row>
      )}
      <Row label="Color">
        <ColorPickerCell
          value={obj.color || "#7C2DB9"}
          onChange={(v) => actions.setObjectField(obj.id, { color: v })}
        />
        {obj.color && (
          <button
            onClick={() => actions.setObjectField(obj.id, { color: undefined })}
            style={miniBtnStyle}
            title="Reset to theme default"
          >
            Reset
          </button>
        )}
      </Row>

      <SectionHeader title="Geometry" />
      <Row label="X">
        <NumberCell value={obj.x} onChange={(v) => actions.setObjectField(obj.id, { x: v })} />
      </Row>
      <Row label="Y">
        <NumberCell value={obj.y} onChange={(v) => actions.setObjectField(obj.id, { y: v })} />
      </Row>
      {isWire && (
        <>
          <Row label="End X">
            <NumberCell value={obj.endX} onChange={(v) => actions.setObjectField(obj.id, { endX: v })} />
          </Row>
          <Row label="End Y">
            <NumberCell value={obj.endY} onChange={(v) => actions.setObjectField(obj.id, { endY: v })} />
          </Row>
        </>
      )}
      {!isWire && (
        <Row label="Rotation">
          <Select
            value={String(obj.rotation ?? 0)}
            options={["0", "90", "180", "270"].map((v) => ({ label: `${v}°`, value: v }))}
            onChange={(v) => actions.setObjectField(obj.id, { rotation: Number(v) })}
            minWidth={90}
          />
          <button onClick={() => actions.rotateSelectedPlaced(-90)} style={miniBtnStyle}>↺</button>
          <button onClick={() => actions.rotateSelectedPlaced(90)} style={miniBtnStyle}>↻</button>
        </Row>
      )}

      <SectionHeader title="Actions" />
      <Row label="Clipboard">
        <button onClick={() => actions.copySelection()} style={miniBtnStyle}>Copy</button>
        <button onClick={() => actions.cutSelection()} style={miniBtnStyle}>Cut</button>
      </Row>
      <Row label="Z-order">
        <button onClick={() => actions.bringFront()} style={miniBtnStyle}>Front</button>
        <button onClick={() => actions.sendBack()} style={miniBtnStyle}>Back</button>
      </Row>
      <Row label="Delete">
        <button
          onClick={() => actions.deleteSelected()}
          style={{ ...miniBtnStyle, color: "var(--color-text-error)", borderColor: "var(--color-border-error)" }}
        >
          Delete object
        </button>
      </Row>
    </div>
  );
}
