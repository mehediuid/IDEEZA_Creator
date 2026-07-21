"use client";

// IDEEZA PCB Software — Schematic right-panel properties shown when NOTHING is
// selected. Sheet-level settings in three groups:
//   Sheet        — collapsible: Name · Template
//   Sheet Border — checkbox-gated: Paper size · Orientation · Zone reference
//   Title Block  — checkbox-gated: Title · Doc. No. · Revision · Date · …
// All values live in the store (schemBasic / schemBorder / schemTitleFields)
// and drive the on-canvas sheet frame + title block, so edits are live.

import * as React from "react";
import { Checkbox, Select } from "@/components/ideeza";
import { Icon } from "@/lib/pcb/icons";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

const CHEV_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg>';

const PAD_X = "var(--spacing-8)";
const DIVIDER = "var(--border-width-1) solid var(--color-border-subtle)";

const TEMPLATES = ["A4 Landscape", "A4 Portrait", "A3 Landscape", "A3 Portrait", "US Letter", "Custom"];
const PAPER_SIZES: { label: string; value: string }[] = [
  { label: "A5 · 210×148", value: "A5" },
  { label: "A4 · 297×210", value: "A4" },
  { label: "A3 · 420×297", value: "A3" },
  { label: "A2 · 594×420", value: "A2" },
  { label: "US Letter · 279×216", value: "Letter" },
  { label: "Legal · 356×216", value: "Legal" },
];
const ORIENTATIONS = ["Landscape", "Portrait"];

const FIELD_STYLE: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "var(--spacing-3) var(--spacing-4)",
  border: "var(--border-width-1) solid var(--color-border-default)",
  borderRadius: "var(--radius-md)",
  background: "var(--color-bg-surface)",
  color: "var(--color-text-primary)",
  fontSize: "var(--font-size-sm)",
  outline: "none",
  fontFamily: "inherit",
};

function CaretHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", padding: `var(--spacing-5) ${PAD_X}`, cursor: "pointer", userSelect: "none" }}
    >
      <span
        style={{ display: "inline-flex", width: 13, height: 13, color: "var(--color-violet-600)", transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .15s ease" }}
      >
        <Icon html={CHEV_SVG} />
      </span>
      <span style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>{title}</span>
    </div>
  );
}

function CheckHeader({ title, checked, onToggle }: { title: string; checked: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", padding: `var(--spacing-5) ${PAD_X}` }}>
      <Checkbox checked={checked} onChange={onToggle} />
      <span style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>{title}</span>
    </div>
  );
}

// One property row. When `check` is provided it takes column 1 and the label
// shifts to column 2; otherwise the label spans columns 1–2. The control always
// lands in the (wider) final column so every field aligns down the panel.
function Row({
  check,
  label,
  labelOn = true,
  children,
}: {
  check?: React.ReactNode;
  label: string;
  labelOn?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "18px 1fr 1.25fr",
        alignItems: "center",
        gap: "var(--spacing-3)",
        padding: `var(--spacing-3) ${PAD_X}`,
      }}
    >
      {check ?? null}
      <span
        style={{
          gridColumn: check ? "2 / 3" : "1 / 3",
          fontSize: "var(--font-size-sm)",
          lineHeight: 1.2,
          color: labelOn ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <div style={{ gridColumn: "3 / 4", minWidth: 0 }}>{children}</div>
    </div>
  );
}

function TextValue({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} style={FIELD_STYLE} />;
}

function Sheet() {
  const state = usePcbState();
  const actions = usePcbActions();
  const open = state.schemSectionOpen.basic;
  return (
    <div style={{ borderBottom: DIVIDER }}>
      <CaretHeader title="Sheet" open={open} onToggle={() => actions.toggleSchemSection("basic")} />
      {open && (
        <>
          <Row label="Name">
            <TextValue value={state.schemBasic.name} onChange={(v) => actions.setSchemBasic({ name: v })} />
          </Row>
          <Row label="Template">
            <Select
              value={state.schemBasic.template}
              options={TEMPLATES.map((t) => ({ label: t, value: t }))}
              onChange={(v) => actions.setSchemBasic({ template: v })}
              size="sm"
            />
          </Row>
        </>
      )}
    </div>
  );
}

// Free-typing zone-reference field: shows "cols × rows" but commits back to the
// numeric xRegion / yRegion (which drive the on-canvas zone grid) only when the
// text parses cleanly, so the user can edit mid-string without fighting it.
function ZoneReference() {
  const b = usePcbState().schemBorder;
  const actions = usePcbActions();
  const [buf, setBuf] = React.useState(`${b.xRegion} × ${b.yRegion}`);
  React.useEffect(() => {
    setBuf(`${b.xRegion} × ${b.yRegion}`);
  }, [b.xRegion, b.yRegion]);
  const onChange = (v: string) => {
    setBuf(v);
    const m = v.match(/(\d+)\s*[×xX*]\s*(\d+)/);
    if (m) actions.setSchemBorder({ xRegion: m[1], yRegion: m[2] });
  };
  return <input value={buf} onChange={(e) => onChange(e.target.value)} style={FIELD_STYLE} />;
}

function SheetBorder() {
  const state = usePcbState();
  const actions = usePcbActions();
  const b = state.schemBorder;
  return (
    <div style={{ borderBottom: DIVIDER }}>
      <CheckHeader title="Sheet Border" checked={b.show} onToggle={() => actions.setSchemBorder({ show: !b.show })} />
      {b.show && (
        <>
          <Row label="Paper size">
            <Select
              value={b.size}
              options={PAPER_SIZES}
              onChange={(v) => actions.setSchemBorder({ size: v })}
              size="sm"
            />
          </Row>
          <Row label="Orientation">
            <Select
              value={b.orientation}
              options={ORIENTATIONS.map((o) => ({ label: o, value: o }))}
              onChange={(v) => actions.setSchemBorder({ orientation: v })}
              size="sm"
            />
          </Row>
          <Row
            check={<Checkbox checked={b.zoneRefOn} onChange={() => actions.setSchemBorder({ zoneRefOn: !b.zoneRefOn })} />}
            label="Zone reference"
            labelOn={b.zoneRefOn}
          >
            <ZoneReference />
          </Row>
        </>
      )}
    </div>
  );
}

function TitleBlock() {
  const state = usePcbState();
  const actions = usePcbActions();
  return (
    <div style={{ borderBottom: DIVIDER }}>
      <CheckHeader title="Sheet Info" checked={state.schemTitleShow} onToggle={actions.toggleSchemTitleShow} />
      {state.schemTitleShow &&
        state.schemTitleFields.map((f) => (
          <Row
            key={f.key}
            check={<Checkbox checked={f.on} onChange={() => actions.toggleSchemTitleField(f.key, "on")} />}
            label={f.label}
            labelOn={f.on}
          >
            <TextValue value={f.value} onChange={(v) => actions.setSchemTitleFieldValue(f.key, v)} />
          </Row>
        ))}
    </div>
  );
}

export function SchematicProperties() {
  return (
    <div>
      <Sheet />
      <SheetBorder />
      <TitleBlock />
    </div>
  );
}
