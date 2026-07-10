"use client";

// IDEEZA PCB Software — right panel.
// Properties / Filter / Layer tabs; the body is mode-aware (buildRight) and the
// footer holds the Item / Caption rows.

import * as React from "react";
import { Icon, DsIcon } from "@/lib/pcb/icons"; // inspector + panel icons
import { Select, Checkbox } from "@/components/ideeza";
import { ColorPicker } from "@/components/pcb/color-picker";
import { PcbDefaultProperties, TwoDProperties, ThreeDProperties } from "@/components/pcb/pcb-properties";
import { SchematicProperties } from "@/components/pcb/schem-properties";
import { buildRightTabs } from "@/lib/pcb/data";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import {
  INSPECTOR_SCHEMA,
  resolveInspectorType,
  type InspectorField,
} from "@/lib/pcb/inspector-schema";

export function RightPanel() {
  const state = usePcbState();
  const actions = usePcbActions();
  const rightTabs = buildRightTabs(state, actions);

  return (
    <div
      style={{
        position: "absolute",
        top: state.viewTog["Top Toolbar"] !== false ? 145 : 62,
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
        <button
          className="ix-tool"
          aria-label="Collapse right panel"
          onClick={() => actions.toggleView("Right-Side Panel")}
          style={{
            width: 24,
            height: 24,
            borderRadius: "var(--radius-md)",
            background: "transparent",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
            flex: "0 0 24px",
            marginBottom: "var(--spacing-4)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
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
        ) : state.mode === "pcb" && state.selectedIds.length === 0 ? (
          <PcbDefaultProperties />
        ) : state.mode === "3d" ? (
          <ThreeDProperties />
        ) : state.selectedIds.length === 0 && state.selected === "none" ? (
          // Canvas (nothing selected) — the original fully-WIRED panels, so
          // every canvas field stays editable exactly as before. The schema
          // inspector below handles actual selections.
          state.mode === "schematic" ? (
            <SchematicProperties />
          ) : (
            <TwoDProperties />
          )
        ) : (
          // Schema-driven Property Inspector (Sidebar Properties.xlsx) for
          // every selected-object type in schematic and 2D modes.
          <InspectorPanel />
        )}
      </div>

      <CoordReadout />
    </div>
  );
}

// ── Selected-object property editors (double-click / connection-line flows) ──

const DD_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2.2"><path d="M6 9l6 6 6-6"/></svg>';

// Collapsible section for the schema-driven inspector.
function InspSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", padding: "var(--spacing-5) var(--spacing-8)", cursor: "pointer", userSelect: "none" }}
      >
        <span style={{ display: "inline-flex", width: 13, height: 13, color: "var(--color-violet-600)", transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .15s ease" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M6 9l6 6 6-6" /></svg>
        </span>
        <span style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>{title}</span>
      </div>
      {open && <div style={{ paddingBottom: "var(--spacing-2)" }}>{children}</div>}
    </div>
  );
}

const CTL_STYLE: React.CSSProperties = {
  minWidth: 130,
  width: 130,
  boxSizing: "border-box",
  padding: "var(--spacing-3) var(--spacing-4)",
  border: "var(--border-width-1) solid var(--color-border-default)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--font-size-sm)",
  color: "var(--color-text-primary)",
  background: "var(--color-bg-surface)",
  outline: "none",
  fontFamily: "inherit",
};

// Uncontrolled inputs: `key` resets the field when the bound value changes
// (e.g. a new object is selected) without a setState-in-effect sync loop.
function TextCtl({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  return (
    <input
      key={value}
      defaultValue={value}
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      style={CTL_STYLE}
    />
  );
}

function NumberCtl({ value, unit, onCommit }: { value: number | string; unit?: string; onCommit: (v: number) => void }) {
  const initial = String(value ?? "");
  return (
    <div style={{ position: "relative", width: 130 }}>
      <input
        key={initial}
        defaultValue={initial}
        inputMode="decimal"
        onBlur={(e) => { const n = parseFloat(e.target.value); if (!Number.isNaN(n)) onCommit(n); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        style={{ ...CTL_STYLE, paddingRight: unit ? 30 : undefined }}
      />
      {unit && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: "var(--font-size-2xs)", color: "var(--color-text-tertiary)", pointerEvents: "none" }}>{unit}</span>}
    </div>
  );
}

function ToggleCtl({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{ width: 38, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: on ? "var(--color-violet-600)" : "var(--color-border-default)", position: "relative", transition: "background .15s", flex: "0 0 auto" }}
    >
      <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
    </button>
  );
}

function ColorCtl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", padding: "var(--spacing-2) var(--spacing-3)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", cursor: "pointer", minWidth: 130, boxSizing: "border-box", justifyContent: "space-between" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>
          <Swatch color={value} />
          <span style={{ fontSize: "var(--font-size-xs)", fontFamily: "var(--font-family-mono)", color: "var(--color-text-primary)" }}>{(value || "").toUpperCase()}</span>
        </span>
      </div>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 90 }} onClick={(e) => e.stopPropagation()}>
          <ColorPicker value={value} onChange={(c) => { onChange(c); }} />
        </div>
      )}
    </div>
  );
}

function ActionCtl({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ minWidth: 130, padding: "var(--spacing-3) var(--spacing-4)", border: "var(--border-width-1) solid var(--color-border-brand)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-brand)", background: "var(--color-bg-brand-subtle)", cursor: "pointer", fontFamily: "inherit" }}
    >
      {label}
    </button>
  );
}

// Auto-growing textarea (`textarea` kind) — uncontrolled like TextCtl, resizes
// to fit content on input and commits on blur.
function TextareaCtl({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  return (
    <textarea
      key={value}
      ref={autoGrow}
      defaultValue={value}
      rows={2}
      onInput={(e) => autoGrow(e.currentTarget)}
      onBlur={(e) => onCommit(e.target.value)}
      style={{ ...CTL_STYLE, width: 130, resize: "none", overflow: "hidden", fontFamily: "inherit", lineHeight: 1.4 }}
    />
  );
}

// Small icon button used beside a Select (gear = "settings", jump = "go to net").
function IconAffordanceBtn({ svg, title, onClick }: { svg: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{ width: 22, height: 22, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", background: "var(--color-bg-surface)", color: "var(--color-text-secondary)", cursor: "pointer" }}
    >
      <Icon html={svg} size={11} />
    </button>
  );
}

const GEAR_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>';
const JUMP_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H8M17 7v9"/></svg>';

// Horizontal segmented control (`radio` kind) — 2–3 exclusive options.
function SegmentedCtl({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 2, minWidth: 130 }}>
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "var(--spacing-2) var(--spacing-2)",
              border: `var(--border-width-1) solid ${active ? "var(--color-violet-600)" : "var(--color-border-default)"}`,
              borderRadius: "var(--radius-md)",
              background: active ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
              color: active ? "var(--color-violet-600)" : "var(--color-text-secondary)",
              fontSize: "var(--font-size-2xs)",
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// 3×3 anchor picker (`origin` kind).
const ORIGIN_POSITIONS = [
  "Top Left", "Top Center", "Top Right",
  "Center Left", "Center", "Center Right",
  "Bottom Left", "Bottom Center", "Bottom Right",
];

function OriginGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(3, 1fr)", gap: 2, width: 54, height: 54, flex: "0 0 auto" }}>
      {ORIGIN_POSITIONS.map((pos) => {
        const active = pos === value;
        return (
          <button
            key={pos}
            type="button"
            title={pos}
            onClick={() => onChange(pos)}
            style={{
              width: "100%",
              height: "100%",
              padding: 0,
              border: `var(--border-width-1) solid ${active ? "var(--color-violet-600)" : "var(--color-border-default)"}`,
              borderRadius: "var(--radius-sm)",
              background: active ? "var(--color-violet-600)" : "var(--color-bg-surface)",
              cursor: "pointer",
            }}
          />
        );
      })}
    </div>
  );
}

// One field row — reads its binding (if any) and renders an interactive
// control; unbound fields render read-only per the agreed scope.
function FieldRow({ field, obj }: { field: InspectorField; obj: import("@/lib/pcb/types").CanvasObject | null }) {
  const state = usePcbState();
  const actions = usePcbActions();

  // Resolve binding → { value, set } or null (read-only).
  type BindVal = string | number | boolean | undefined;
  let bound: { value: BindVal; set: (v: BindVal) => void } | null = null;
  const b = field.bind;
  if (b) {
    if (b.startsWith("obj:") && obj) {
      const key = b.slice(4);
      const rec = obj as unknown as Record<string, BindVal>;
      bound = { value: rec[key], set: (v) => actions.setObjectField(obj.id, { [key]: v } as Partial<import("@/lib/pcb/types").CanvasObject>) };
    } else if (b.startsWith("prop:") && obj) {
      const key = b.slice(5);
      const props = (obj.props ?? {}) as Record<string, BindVal>;
      bound = { value: props[key], set: (v) => actions.setObjectProp(obj.id, key, v) };
    } else if (b.startsWith("set:")) {
      const key = b.slice(4);
      const bag = (state.boardSettings ?? {}) as Record<string, BindVal>;
      bound = { value: bag[key], set: (v) => actions.setBoardSetting(key, v) };
    } else if (b === "wire:color") bound = { value: state.netColor, set: (v) => actions.setNetColor(String(v)) };
    else if (b === "wire:lineWidth") bound = { value: state.wireLineWidth, set: (v) => actions.setWireLineWidth(String(v)) };
    else if (b === "wire:lineStyle") bound = { value: state.wireLineStyle, set: (v) => actions.setWireLineStyle(String(v)) };
    else if (b === "doc:unit") bound = { value: state.unit, set: (v) => actions.setUnit(String(v)) };
    else if (b === "doc:gridSize") bound = { value: state.gridSize, set: (v) => actions.setGridSize(String(v)) };
    else if (b === "doc:snap") bound = { value: state.snapEnabled !== false, set: () => actions.toggleSnap() };
  }

  const layerOpts = (state.pcbLayers ?? []).map((l: { name: string }) => l.name);
  const options = field.optionsToken === "layers"
    ? (layerOpts.length ? layerOpts : ["Top Layer", "Bottom Layer"])
    : field.options ?? [];

  // Checkbox-prefixed kinds (`checkText`/`checkDropdown`) persist their
  // show-on-silk state at `prop:<key>__show` (boolean, default on).
  const showKey = `${field.key}__show`;
  const showState = obj ? ((obj.props ?? {}) as Record<string, BindVal>)[showKey] !== false : true;
  const setShow = (v: boolean) => { if (obj) actions.setObjectProp(obj.id, showKey, v); };

  let control: React.ReactNode;
  if (field.computed && obj) {
    // Live derived values (doc: Length = live segment length, Net Length =
    // total length of the whole net). Read-only by definition.
    const segLen = (o: import("@/lib/pcb/types").CanvasObject) =>
      Math.hypot((o.endX ?? o.x) - o.x, (o.endY ?? o.y) - o.y);
    let v = 0;
    if (field.computed === "segmentLength") v = segLen(obj);
    else if (field.computed === "netLength" && obj.net) {
      v = state.objects
        .filter((o) => o.net === obj.net && o.endX != null)
        .reduce((sum, o) => sum + segLen(o), 0);
    }
    const disp = String(Math.round(v * 10) / 10);
    control = (
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>
        {field.unit ? `${disp} ${field.unit}` : disp}
      </span>
    );
  } else if (field.kind === "action") {
    // Wire actions that have a real implementation; the rest are placeholders.
    const run =
      field.key === "convertPcb" ? () => { actions.setMode("pcb"); actions.flashToast("Converted to PCB"); }
      : field.key === "sutureVias" ? () => { actions.setTool("sutureVias"); actions.flashToast("Suture vias — click the copper region"); }
      : field.key === "group" ? () => actions.flashToast("Grouped")
      : () => actions.flashToast(`${field.label} — coming soon`);
    control = <ActionCtl label={field.display ?? "Apply"} onClick={run} />;
  } else if (bound) {
    switch (field.kind) {
      case "text":
        control = <TextCtl value={String(bound.value ?? "")} onCommit={bound.set} />;
        break;
      case "number":
      case "coord":
        control = <NumberCtl value={String(bound.value ?? field.display ?? 0)} unit={field.unit} onCommit={bound.set} />;
        break;
      case "dropdown":
        control = <div style={{ minWidth: 130 }}><Select value={String(bound.value ?? options[0] ?? "")} onChange={bound.set} options={options.map((o) => ({ label: o, value: o }))} /></div>;
        break;
      case "color":
        control = <ColorCtl value={String(bound.value ?? field.display ?? "#000000")} onChange={bound.set} />;
        break;
      case "toggle":
        control = <ToggleCtl on={!!bound.value} onToggle={() => bound!.set(!bound!.value)} />;
        break;
      case "checkText":
        control = (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)" }}>
            <Checkbox checked={showState} onChange={() => setShow(!showState)} size="sm" />
            <TextCtl value={String(bound.value ?? "")} onCommit={bound.set} />
          </div>
        );
        break;
      case "checkDropdown":
        control = (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)" }}>
            <Checkbox checked={showState} onChange={() => setShow(!showState)} size="sm" />
            <Select value={String(bound.value ?? options[0] ?? "")} onChange={bound.set} options={options.map((o) => ({ label: o, value: o }))} minWidth={104} />
          </div>
        );
        break;
      case "dropdownGear":
        control = (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)" }}>
            <Select value={String(bound.value ?? options[0] ?? "")} onChange={bound.set} options={options.map((o) => ({ label: o, value: o }))} minWidth={104} />
            <IconAffordanceBtn svg={GEAR_SVG} title="Settings" onClick={() => actions.flashToast(`${field.label} settings — coming soon`)} />
          </div>
        );
        break;
      case "slider": {
        const n = Number(bound.value ?? field.display ?? 0);
        control = (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", minWidth: 130 }}>
            <input
              type="range"
              min={0}
              max={100}
              value={n}
              onChange={(e) => bound!.set(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: 22, textAlign: "right", fontSize: "var(--font-size-2xs)", color: "var(--color-text-tertiary)" }}>{n}</span>
          </div>
        );
        break;
      }
      case "radio":
        control = <SegmentedCtl value={String(bound.value ?? options[0] ?? "")} options={options} onChange={bound.set} />;
        break;
      case "origin":
        control = <OriginGrid value={String(bound.value ?? "Top Left")} onChange={bound.set} />;
        break;
      case "netRef": {
        const netOpts = options.length ? options : (state.pcbNets ?? []).map((n) => n.name);
        control = (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)" }}>
            <Select value={String(bound.value ?? netOpts[0] ?? "")} onChange={bound.set} options={netOpts.map((o) => ({ label: o, value: o }))} minWidth={104} />
            <IconAffordanceBtn svg={JUMP_SVG} title="Jump to net" onClick={() => actions.flashToast("Jump to net — coming soon")} />
          </div>
        );
        break;
      }
      case "textarea":
        control = <TextareaCtl value={String(bound.value ?? "")} onCommit={bound.set} />;
        break;
      default:
        control = <ValueCell>{String(bound.value ?? field.display ?? "—")}</ValueCell>;
    }
  } else {
    // Read-only display (unmodeled field).
    const objRec = obj as unknown as Record<string, BindVal>;
    const disp = field.display ?? (obj && field.bind?.startsWith("obj:") ? String(objRec[field.bind.slice(4)] ?? "—") : "—");
    control = field.kind === "color"
      ? <Swatch color={disp} />
      : <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{field.unit ? `${disp} ${field.unit}` : disp}</span>;
  }

  return <PropRow label={field.label}>{control}</PropRow>;
}

// Schema-driven Property Inspector — the single Properties-tab renderer for
// schematic + 2D. Resolves the selection type from the sheet schema and draws
// its collapsible sections and typed fields.
function InspectorPanel() {
  const state = usePcbState();
  const selId = state.selectedIds[0] ?? null;
  const obj = selId ? (state.objects.find((o) => o.id === selId) ?? null) : null;
  const resolved = resolveInspectorType(state.mode, obj?.kind ?? null, state.selected);
  const schemaMode = resolved.schemaMode;
  let typeKey = resolved.typeKey;
  // A selected component's floating designator/name label uses the Designator
  // panel (PDF §03) rather than the Component body panel.
  if (state.selSub !== "none" && schemaMode === "2d" && typeKey === "Component") {
    typeKey = "Designator";
  }
  const type = INSPECTOR_SCHEMA[schemaMode][typeKey];
  if (!type) return null;

  // Doc §09: the Silk group only shows when the object's layer is a
  // silkscreen layer. obj.layer may hold a layer id or a display name.
  const layerIsSilk = (() => {
    const lv = obj?.layer;
    if (!lv) return false;
    const l = (state.pcbLayers ?? []).find((x) => x.id === lv || x.name === lv);
    return l?.type === "silkscreen";
  })();
  const fieldVisible = (f: InspectorField) =>
    (!f.showIf || String((obj?.props ?? {})[f.showIf.prop] ?? "") === f.showIf.equals) &&
    (!f.showIfSilkLayer || layerIsSilk);

  const count = state.selectedIds.length;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--spacing-5) var(--spacing-8) var(--spacing-2)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>
          <span style={{ width: 15, height: 15, color: "var(--color-violet-600)", display: "inline-flex" }}>
            <DsIcon name={type.icon} size={15} />
          </span>
          <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>{type.label}</span>
        </span>
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
          {typeKey === "Canvas" ? "Nothing selected" : `Selected ${count || 1}`}
        </span>
      </div>
      {type.sections.map((sec, i) => {
        // Conditional fields (doc: "Custom reveals …", silk-layer-only groups)
        // render only when their condition matches; a section whose fields are
        // all hidden disappears entirely (e.g. Silk on a copper layer).
        const visible = sec.fields.filter(fieldVisible);
        if (visible.length === 0) return null;
        return (
          <React.Fragment key={sec.title + i}>
            {i > 0 && <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-2) var(--spacing-8)" }} />}
            <InspSection title={sec.title}>
              {visible.map((f) => <FieldRow key={f.key} field={f} obj={obj} />)}
            </InspSection>
          </React.Fragment>
        );
      })}
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


// ── Filter tab — EasyEDA PCB(2D) "Selection Filter" (PDF §01b) ─────────────
// One row per object kind: Checkbox (selectable on canvas, drives
// boardSettings[key] via isSelectable()) + label + eye toggle (visual-only,
// drives boardSettings[`vis_${key}`]). Grouped exactly per spec.
type FilterRowDef = { key: string; label: string; off?: boolean };
type FilterGroupDef = { title: string; rows: FilterRowDef[] };

const FILTER_GROUPS: FilterGroupDef[] = [
  {
    title: "Independent Object",
    rows: [
      { key: "fComponent", label: "Component" },
      { key: "fComponentProperty", label: "Component Property" },
      { key: "fComponentSilk", label: "Component Silkscreen", off: true },
      { key: "fTrack", label: "Track" },
      { key: "fTestPoint", label: "Test Point" },
      { key: "fPad", label: "Pad" },
      { key: "fVia", label: "Via" },
      { key: "fSutureHole", label: "Suture Hole" },
      { key: "fText", label: "Text" },
      { key: "fColorfulImage", label: "Colorful Image" },
      { key: "fImage", label: "Image" },
      { key: "fFpcStiffener", label: "FPC Stiffener" },
      { key: "fDimension", label: "Dimension" },
    ],
  },
  {
    title: "Outline Object",
    rows: [
      { key: "fOutline", label: "Outline" },
      { key: "fScrewPillar", label: "Screw Pillar" },
      { key: "fSideDatumLine", label: "Side Datum Line" },
      { key: "fSideSlotRegion", label: "Side Slot Region" },
      { key: "fTopBottomSlotRegion", label: "Top-Bottom Slot Region" },
      { key: "fSideEntity", label: "Side Entity" },
      { key: "fTopBottomEntity", label: "Top-Bottom Entity" },
    ],
  },
  {
    title: "Other",
    rows: [
      { key: "fPadPair", label: "Pad Pair", off: true },
      { key: "fNet", label: "Net", off: true },
      { key: "fTearDrop", label: "TearDrop" },
      { key: "fDrcMarking", label: "DRC Marking", off: true },
      { key: "fGroup", label: "Group", off: true },
    ],
  },
  {
    title: "Status",
    rows: [
      { key: "fLocked", label: "Locked" },
      { key: "fUnlocked", label: "UnLocked" },
    ],
  },
];

function FilterGroupHeader({ title }: { title: string }) {
  return (
    <div style={{ padding: "var(--spacing-5) var(--spacing-0) var(--spacing-2)" }}>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>
        {title}
      </span>
    </div>
  );
}

function FilterRow({ row }: { row: FilterRowDef }) {
  const state = usePcbState();
  const actions = usePcbActions();
  const bag = (state.boardSettings ?? {}) as Record<string, unknown>;
  const checked = row.off ? bag[row.key] === true : bag[row.key] !== false;
  const visKey = `vis_${row.key}`;
  const visible = bag[visKey] !== false;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-3) var(--spacing-0)" }}>
      <Checkbox checked={checked} onChange={() => actions.setBoardSetting(row.key, !checked)} />
      <span
        onClick={() => actions.setBoardSetting(row.key, !checked)}
        style={{ flex: 1, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", cursor: "pointer" }}
      >
        {row.label}
      </span>
      <span
        onClick={() => actions.setBoardSetting(visKey, !visible)}
        title={visible ? "Hide" : "Show"}
        style={{ display: "inline-flex", width: 16, height: 16, color: visible ? "var(--color-text-secondary)" : "var(--color-text-tertiary)", cursor: "pointer" }}
      >
        <Icon html={visible ? EYE : EYE_OFF} />
      </span>
    </div>
  );
}

// Dispatcher: schematic keeps its own (untouched) filter; PCB/2D use the
// EasyEDA PCB(2D) Selection Filter (PDF §01b). The two never share a list.
function FilterTab() {
  const state = usePcbState();
  return state.mode === "schematic" ? <SchematicFilterTab /> : <PcbFilterTab />;
}

// Schematic-side object filter — restored unchanged from before the PCB(2D)
// filter rebuild, so the schematic editor's Filter tab behaves exactly as it
// always did (cosmetic per-category list; schematic selection is never gated).
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

function SchematicFilterTab() {
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

function PcbFilterTab() {
  const actions = usePcbActions();

  const resetFilters = () => {
    FILTER_GROUPS.forEach((g) =>
      g.rows.forEach((r) => {
        actions.setBoardSetting(r.key, !r.off);
        actions.setBoardSetting(`vis_${r.key}`, true);
      }),
    );
  };

  return (
    <div style={{ padding: "var(--spacing-6) var(--spacing-8)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", marginBottom: "var(--spacing-4)" }}>
        <div style={{ flex: 1 }}>
          <Select value="Common(Default)" options={[{ label: "Common(Default)", value: "Common(Default)" }]} onChange={() => {}} minWidth={160} />
        </div>
        <button
          onClick={resetFilters}
          style={{
            padding: "var(--spacing-2) var(--spacing-4)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-bg-surface)",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            fontFamily: "inherit",
          }}
        >
          Reset
        </button>
      </div>
      {FILTER_GROUPS.map((g) => (
        <div key={g.title}>
          <FilterGroupHeader title={g.title} />
          {g.rows.map((r) => (
            <FilterRow key={r.key} row={r} />
          ))}
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

// Layer-type → which Figma group it sits under in the expanded view.
const LAYER_GROUPS: { id: string; label: string; types: string[] }[] = [
  { id: "topSide",   label: "Top Side",   types: ["signal-top", "topSilk", "topPaste", "topMask"] },
  { id: "bottomSide",label: "Bottom Side",types: ["signal-bottom", "bottomSilk", "bottomPaste", "bottomMask"] },
  { id: "inner",     label: "Inner",      types: ["signal-inner", "plane"] },
  { id: "other",     label: "Other",      types: ["drill", "mechanical"] },
];

// Maps a layer to its group id. Signal layers split by "top" / "bottom" / inner.
function groupOf(layer: { id: string; type: string }): string {
  if (layer.type === "signal") {
    if (layer.id === "top") return "topSide";
    if (layer.id === "bottom") return "bottomSide";
    return "inner";
  }
  if (layer.id.startsWith("top")) return "topSide";
  if (layer.id.startsWith("bottom")) return "bottomSide";
  return "other";
}

const FILTERS = ["All", "Copper", "Non Copper"] as const;
type LayerFilter = (typeof FILTERS)[number];
const PRESETS = ["Common (Default)", "All visible", "Signal only", "Outline only"];

function LayerTab() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [filter, setFilter] = React.useState<LayerFilter>("All");
  const [preset, setPreset] = React.useState(PRESETS[0]);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    topSide: true,
    bottomSide: true,
    inner: true,
    other: true,
  });

  const applyPreset = (p: string) => {
    setPreset(p);
    if (p === "All visible") state.pcbLayers.forEach((l) => !l.visible && actions.togglePcbLayerVis(l.id));
    else if (p === "Signal only")
      state.pcbLayers.forEach((l) => {
        const want = l.type === "signal";
        if (l.visible !== want) actions.togglePcbLayerVis(l.id);
      });
    else if (p === "Outline only")
      state.pcbLayers.forEach((l) => {
        const want = l.id === "outline";
        if (l.visible !== want) actions.togglePcbLayerVis(l.id);
      });
  };

  const reset = () => {
    setFilter("All");
    setPreset(PRESETS[0]);
    state.pcbLayers.forEach((l) => {
      if (!l.visible) actions.togglePcbLayerVis(l.id);
      if (l.locked) actions.togglePcbLayerLock(l.id);
    });
  };

  const filterFn = (l: { type: string }) => {
    if (filter === "Copper") return l.type === "signal" || l.type === "plane";
    if (filter === "Non Copper") return l.type !== "signal" && l.type !== "plane";
    return true;
  };

  return (
    <div style={{ padding: "var(--spacing-3) 0" }}>
      {/* Preset row + Reset */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-3)",
          padding: "var(--spacing-2) var(--spacing-8) var(--spacing-4)",
        }}
      >
        <div style={{ flex: 1 }}>
          <Select
            value={preset}
            options={PRESETS.map((v) => ({ label: v, value: v }))}
            onChange={applyPreset}
            minWidth={160}
          />
        </div>
        <button
          onClick={reset}
          style={{
            padding: "var(--spacing-2) var(--spacing-4)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-bg-surface)",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
          }}
        >
          Reset
        </button>
      </div>

      {/* All / Copper / Non-Copper filter */}
      <div
        style={{
          display: "flex",
          gap: 0,
          padding: "var(--spacing-0) var(--spacing-8) var(--spacing-4)",
        }}
      >
        {FILTERS.map((f) => {
          const isOn = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flex: 1,
                padding: "var(--spacing-3) var(--spacing-2)",
                border: "var(--border-width-1) solid var(--color-border-default)",
                background: isOn ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
                color: isOn ? "var(--color-text-brand)" : "var(--color-text-secondary)",
                fontWeight: 600,
                fontSize: "var(--font-size-xs)",
                cursor: "pointer",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Groups */}
      {LAYER_GROUPS.map((g) => {
        const groupLayers = state.pcbLayers.filter(
          (l) => groupOf(l) === g.id && filterFn(l),
        );
        if (groupLayers.length === 0) return null;
        const isOpen = openGroups[g.id];
        return (
          <div key={g.id}>
            <div
              onClick={() => setOpenGroups((s) => ({ ...s, [g.id]: !s[g.id] }))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-3)",
                padding: "var(--spacing-3) var(--spacing-8)",
                cursor: "pointer",
                background: "var(--color-bg-subtle)",
                borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
                userSelect: "none",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  width: 12,
                  height: 12,
                  color: "var(--color-violet-600)",
                  transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                  transition: "transform .15s ease",
                }}
              >
                <Icon html={CHEV_DOWN_SVG} />
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                }}
              >
                {g.label}
              </span>
              <span style={{ marginLeft: "auto", fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
                {groupLayers.length}
              </span>
            </div>
            {isOpen &&
              groupLayers.map((l) => {
                const on = l.visible;
                const isActive = state.activePcbLayer === l.id && state.mode === "pcb";
                return (
                  <div
                    key={l.id}
                    onClick={() => actions.setActivePcbLayer(l.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--spacing-5)",
                      padding: "var(--spacing-3) var(--spacing-8) var(--spacing-3) calc(var(--spacing-8) + 18px)",
                      borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
                      cursor: "pointer",
                      background: isActive ? "var(--color-bg-brand-subtle)" : "transparent",
                    }}
                  >
                    <label
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "relative",
                        width: 16,
                        height: 16,
                        borderRadius: "var(--radius-sm)",
                        background: l.color,
                        flex: "0 0 auto",
                        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.12)",
                        cursor: "pointer",
                        overflow: "hidden",
                      }}
                      title="Pick a color"
                    >
                      <input
                        type="color"
                        value={l.color}
                        onChange={(e) => actions.setPcbLayerColor(l.id, e.target.value)}
                        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", border: "none", padding: 0 }}
                      />
                    </label>
                    <span
                      style={{
                        flex: 1,
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-primary)",
                        opacity: on ? 1 : 0.45,
                        fontWeight: isActive ? 700 : 500,
                      }}
                    >
                      {l.name}
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        actions.togglePcbLayerVis(l.id);
                      }}
                      style={{
                        color: on ? "var(--color-violet-600)" : "var(--color-border-strong)",
                        display: "inline-flex",
                        cursor: "pointer",
                      }}
                    >
                      <Icon html={on ? EYE : EYE_OFF} />
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        actions.togglePcbLayerLock(l.id);
                      }}
                      style={{
                        color: l.locked ? "var(--color-violet-600)" : "var(--color-border-strong)",
                        display: "inline-flex",
                        cursor: "pointer",
                      }}
                    >
                      <Icon html={l.locked ? LOCK : LOCK_OPEN} />
                    </span>
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

const CHEV_DOWN_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg>';

function CoordReadout() {
  const state = usePcbState();
  const selId = state.selectedIds[0];
  const sel = selId ? state.objects.find((o) => o.id === selId) : null;
  const x = sel?.x ?? 0;
  const y = sel?.y ?? 0;
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
      {cell("X", `${x} mil`)}
      {cell("dx", "11.17 inch")}
      {cell("Y", `${y} mil`)}
      {cell("dY", "-0.12 inch")}
    </div>
  );
}
