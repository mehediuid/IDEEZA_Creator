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

// Sheet templates are just (paper size + orientation) pairs, so the dropdown is
// derived from those two — picking one sets them, and changing either shows
// "Custom". It used to write `schemBasic.template`, which nothing ever read.
const TEMPLATES: Array<{ label: string; size: string; orientation: string }> = [
  { label: "A4 Landscape", size: "A4", orientation: "Landscape" },
  { label: "A4 Portrait", size: "A4", orientation: "Portrait" },
  { label: "A3 Landscape", size: "A3", orientation: "Landscape" },
  { label: "A3 Portrait", size: "A3", orientation: "Portrait" },
  { label: "US Letter", size: "Letter", orientation: "Landscape" },
];
const templateOf = (size: string, orientation: string) =>
  TEMPLATES.find((t) => t.size === size && t.orientation === orientation)?.label ?? "Custom";
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

// One group header for every section: the caret on the left collapses the view,
// and the optional checkbox on the right is the feature's own on/off. They used
// to be the same control — the checkbox both hid the rows and switched the
// border/title block off — so there was no way to fold a group away without
// changing the drawing, or to keep a group open while its feature was off.
function GroupHeader({
  title, open, onToggle, check,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  check?: { on: boolean; toggle: () => void; label: string };
}) {
  return (
    <div
      onClick={onToggle}
      role="button"
      aria-expanded={open}
      style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", padding: `var(--spacing-5) ${PAD_X}`, cursor: "pointer", userSelect: "none" }}
    >
      <span
        style={{ display: "inline-flex", width: 13, height: 13, color: "var(--color-violet-600)", transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .15s ease" }}
      >
        <Icon html={CHEV_SVG} />
      </span>
      <span style={{ flex: 1, fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>{title}</span>
      {check && (
        // The toggle must not also collapse the group, so the click stops here
        // (Checkbox fires its own onChange).
        <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center" }} title={check.label}>
          <Checkbox checked={check.on} onChange={check.toggle} />
        </span>
      )}
    </div>
  );
}

// A group whose feature is switched off keeps its rows on screen but inert, so
// you can still read the values you set — and it says why they are inert.
function OffNotice({ text }: { text: string }) {
  return (
    <div style={{ padding: `var(--spacing-0) ${PAD_X} var(--spacing-4)`, fontSize: "var(--font-size-2xs)", color: "var(--color-text-tertiary)" }}>
      {text}
    </div>
  );
}

function GroupBody({ on, children }: { on: boolean; children: React.ReactNode }) {
  // `inert`, not `pointer-events: none` — the latter only stops the mouse, so a
  // switched-off group could still be tabbed into and edited from the keyboard
  // while the panel showed it as inactive.
  return (
    <div inert={!on} aria-disabled={!on} style={{ opacity: on ? 1 : 0.45 }}>
      {children}
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
  const b = state.schemBorder;
  const activeSheet = state.schematicSheets.find((sh) => sh.id === state.activeSheetId) ?? state.schematicSheets[0];
  return (
    <div style={{ borderBottom: DIVIDER }}>
      <GroupHeader title="Sheet" open={open} onToggle={() => actions.toggleSchemSection("basic")} />
      {open && (
        <>
          {/* Name edits the active sheet — the same name the Sheets tree and the
              page tabs show. It used to write a field nothing read. */}
          <Row label="Name">
            <TextValue
              value={activeSheet?.name ?? ""}
              onChange={(v) => activeSheet && actions.renameSheet(activeSheet.id, v)}
            />
          </Row>
          <Row label="Template">
            <Select
              value={templateOf(b.size, b.orientation)}
              options={[...TEMPLATES.map((t) => ({ label: t.label, value: t.label })), { label: "Custom", value: "Custom" }]}
              onChange={(v) => {
                const t = TEMPLATES.find((x) => x.label === v);
                if (t) actions.setSchemBorder({ size: t.size, orientation: t.orientation });
              }}
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
      <GroupHeader
        title="Sheet Border"
        open={state.schemSectionOpen.border}
        onToggle={() => actions.toggleSchemSection("border")}
        check={{ on: b.show, toggle: () => actions.setSchemBorder({ show: !b.show }), label: b.show ? "Border is drawn — click to hide it" : "Border is hidden — click to draw it" }}
      />
      {state.schemSectionOpen.border && (
        <GroupBody on={b.show}>
          {!b.show && <OffNotice text="The border is switched off, so these settings aren't applied to the sheet." />}
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
        </GroupBody>
      )}
    </div>
  );
}

function TitleBlock() {
  const state = usePcbState();
  const actions = usePcbActions();
  const on = state.schemTitleShow;
  return (
    <div style={{ borderBottom: DIVIDER }}>
      <GroupHeader
        title="Sheet Info"
        open={state.schemSectionOpen.title}
        onToggle={() => actions.toggleSchemSection("title")}
        check={{ on, toggle: actions.toggleSchemTitleShow, label: on ? "Title block is shown — click to hide it" : "Title block is hidden — click to show it" }}
      />
      {state.schemSectionOpen.title && (
        <GroupBody on={on}>
          {!on && <OffNotice text="The title block is hidden, so these fields aren't drawn on the sheet." />}
          {state.schemTitleFields.map((f) => (
            <Row
              key={f.key}
              check={<Checkbox checked={f.on} onChange={() => actions.toggleSchemTitleField(f.key, "on")} />}
              label={f.label}
              labelOn={f.on}
            >
              {f.key === "sheetSize" ? (
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                  {state.schemBorder.size} · {state.schemBorder.orientation}
                </span>
              ) : (
                <TextValue value={f.value} onChange={(v) => actions.setSchemTitleFieldValue(f.key, v)} />
              )}
            </Row>
          ))}
        </GroupBody>
      )}
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
