"use client";

// IDEEZA PCB Software — modals.
// Delete Objects, Array, Find and Replace, Table Properties, Design Rules,
// Annotate Designator. Opened via the menu/edit actions (store.openModal) and
// the canvas; all controls are wired to the store. Faithful to the prototype.

import * as React from "react";
import {
  Button,
  IconButton,
  Checkbox as DsCheckbox,
  Radio as DsRadio,
  Select as DsSelect,
  NumberInput,
} from "@/components/ideeza";
import { Icon } from "@/lib/pcb/icons";
import { DEL_OBJ_NAMES } from "@/lib/pcb/types";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { useManualProjects } from "@/lib/manual/projects";
import { downloadTextFile, exportGerberViaKicad } from "@/lib/pcb/kicad-export";
import {
  collectPcbModel,
  buildPickPlace,
  buildDxf,
  buildSvg,
  buildPdf,
  rasterizeSvgToPng,
  buildStl,
  buildObj,
  downloadBlob,
  downloadDataUrl,
} from "@/lib/pcb/exporters";
import { PcbManagerModals } from "@/components/pcb/pcb-manager-modals";
import { SettingDialog, HotkeyDialog, TopToolbarDialog } from "@/components/pcb/settings-dialogs";
import {
  ModalTabBar,
  SeverityChip,
  nextSeverity,
  DirectionTiles,
  ORDER_OPTIONS,
} from "@/components/pcb/modal-kit";
import {
  SCH_NET_RULES,
  SCH_COMPONENT_RULES,
  SCH_REUSE_RULES,
  PIN_TYPES,
  defaultSchRulesConfig,
  SEVERITY_COLOR,
  SEVERITY_SHORT,
  type RuleDef,
  type Severity,
  type SchRulesConfig,
  type SchRuleState,
} from "@/lib/pcb/design-rules-data";

const PRIMARY = "var(--color-violet-600)";
const CLOSE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const RESTORE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-violet-600)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>';
// (The old annotate-preview illustration was replaced by the PDF-spec
// direction tiles in modal-kit's DirectionTiles.)

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 85,
        background: "rgba(20,8,30,.34)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function Card({
  width,
  maxHeight,
  flexCol,
  children,
}: {
  width: number;
  maxHeight?: string;
  flexCol?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width,
        maxHeight,
        background: "var(--color-bg-surface)",
        borderRadius: "var(--radius-2xl)",
        boxShadow: "var(--elevation-6)",
        overflow: "hidden",
        display: flexCol ? "flex" : undefined,
        flexDirection: flexCol ? "column" : undefined,
        animation: "ideeza-rise .22s cubic-bezier(.2,.9,.3,1.1)",
      }}
    >
      {children}
    </div>
  );
}

function Header({ title, onClose, padding }: { title: string; onClose: () => void; padding: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding,
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        flex: "0 0 auto",
      }}
    >
      <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)" }}>{title}</span>
      <IconButton hierarchy="ghost" size="sm" aria-label="Close" onClick={onClose} icon={<Icon html={CLOSE_SVG} />} />
    </div>
  );
}

// Thin adapters onto the IDEEZA DS atoms (A08). Keep the prototype's px-sized
// `on` API at the call sites; map to the DS size scale underneath.
function Check({ on, size = 18 }: { on: boolean; size?: number; radius?: number; checkSize?: number }) {
  return <DsCheckbox checked={on} size={size >= 22 ? "lg" : "md"} />;
}

function Radio({ on }: { on: boolean }) {
  return <DsRadio checked={on} size="md" />;
}

// Forward only layout-affecting styles to the design-system Button; the DS owns
// padding / radius / color / typography.
function layoutOnly(style?: React.CSSProperties): React.CSSProperties | undefined {
  if (!style) return undefined;
  const { flex, marginLeft, marginRight, marginTop, marginBottom, width, textAlign, alignSelf } = style;
  return { flex, marginLeft, marginRight, marginTop, marginBottom, width, textAlign, alignSelf };
}

function Pill({ children, onClick, style }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <Button hierarchy="secondary" size="md" onClick={onClick} style={layoutOnly(style)}>
      {children}
    </Button>
  );
}

function PrimaryBtn({ children, onClick, style }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <Button hierarchy="primary" size="md" onClick={onClick} style={layoutOnly(style)}>
      {children}
    </Button>
  );
}

// Prototype dropdowns are single-value display triggers; back them with the DS
// A06 Select (the label is the selected option).
function Dropdown({ label, minWidth }: { label: string; minWidth?: number }) {
  return <DsSelect value={label} options={[{ label, value: label }]} minWidth={minWidth} />;
}

// ── Delete Objects ─────────────────────────────────────────────────────────
function DeleteObjectsModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const allChecked = DEL_OBJ_NAMES.every((n) => state.delObj[n]);

  return (
    <Overlay>
      <Card width={380}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--spacing-10) var(--spacing-10) var(--spacing-7)" }}>
          <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)" }}>Delete Objects</span>
          <IconButton hierarchy="ghost" size="sm" aria-label="Close" onClick={actions.closeModal} icon={<Icon html={CLOSE_SVG} />} />
        </div>
        <div style={{ padding: "var(--spacing-0) var(--spacing-10) var(--spacing-4)" }}>
          <div className="ix-row" onClick={actions.toggleDelAll} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", padding: "var(--spacing-4) var(--spacing-2)", borderRadius: "var(--radius-lg)", cursor: "pointer" }}>
            <Check on={allChecked} size={22} radius={6} checkSize={13} />
            <span style={{ fontSize: "var(--font-size-md)", fontWeight: 600, color: "var(--color-text-primary)" }}>Select All</span>
          </div>
          <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-3) var(--spacing-2) var(--spacing-2)" }} />
          {DEL_OBJ_NAMES.map((n) => (
            <div key={n} className="ix-row" onClick={() => actions.toggleDelObj(n)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", padding: "var(--spacing-4) var(--spacing-2)", borderRadius: "var(--radius-lg)", cursor: "pointer" }}>
              <Check on={!!state.delObj[n]} size={22} radius={6} checkSize={13} />
              <span style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-primary)" }}>{n}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--spacing-8) var(--spacing-10) var(--spacing-10)" }}>
          <Pill onClick={actions.closeModal} style={{ padding: "var(--spacing-5) var(--spacing-12)" }}>Cancel</Pill>
          <PrimaryBtn onClick={() => { actions.deleteObjectsByCategory(); actions.closeModal(); }} style={{ padding: "var(--spacing-5) var(--spacing-16)" }}>Confirm</PrimaryBtn>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Array ──────────────────────────────────────────────────────────────────
function ArrayModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const unit = state.unit === "mm" ? "mm" : state.unit === "Mil" ? "mil" : "inch";
  const hasSel = state.selectedIds.length > 0;

  // REAL array: clone the selection rows×cols with the given spacing.
  // Spacing is interpreted in canvas px (0 → sensible 60px step).
  const runArray = () => {
    if (!hasSel) { actions.flashToast("Select objects to array first"); return; }
    const rows = Math.max(1, parseInt(String(state.arr.row), 10) || 1);
    const cols = Math.max(1, parseInt(String(state.arr.col), 10) || 1);
    const rsp = parseFloat(String(state.arr.rowSp)) || 60;
    const csp = parseFloat(String(state.arr.colSp)) || 60;
    const src = state.objects.filter((o) => state.selectedIds.includes(o.id));
    const stamp = Date.now().toString(36);
    let n = 0;
    const clones: typeof state.objects = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === 0 && c === 0) continue; // originals stay
        for (const o of src) {
          clones.push({
            ...o,
            id: `obj_a${stamp}_${n++}`,
            x: o.x + c * csp,
            y: o.y + r * rsp,
            endX: o.endX != null ? o.endX + c * csp : o.endX,
            endY: o.endY != null ? o.endY + r * rsp : o.endY,
          });
        }
      }
    }
    if (!clones.length) { actions.flashToast("Row × Column must be more than 1×1"); return; }
    actions.merge({ objects: [...state.objects, ...clones] });
    actions.flashToast(`Array created — ${clones.length} cop${clones.length === 1 ? "y" : "ies"}`);
    actions.closeModal();
  };
  const fields: [string, keyof typeof state.arr, boolean][] = [
    ["Row", "row", false],
    ["Column", "col", false],
    ["Row Spacing", "rowSp", true],
    ["Column Spacing", "colSp", true],
  ];
  return (
    <Overlay>
      <Card width={780}>
        <Header title="Array" onClose={actions.closeModal} padding="20px 26px" />
        {!hasSel && (
          <div style={{ margin: "var(--spacing-8) var(--spacing-12) 0", padding: "var(--spacing-5) var(--spacing-7)", background: "var(--color-bg-warning-subtle, var(--color-bg-subtle))", border: "var(--border-width-1) solid var(--color-border-subtle)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
            Select one or more objects (component, pin, wire…) to array.
          </div>
        )}
        <div style={{ padding: "var(--spacing-10) var(--spacing-12)", display: "flex", flexDirection: "column", gap: "var(--spacing-8)" }}>
          {fields.map(([label, key, isSpacing]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)" }}>
              <span style={{ width: 120, flex: "0 0 auto", fontSize: "var(--font-size-md)", color: "var(--color-text-primary)" }}>{label}</span>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "var(--spacing-4)" }}>
                <div style={{ flex: 1 }}>
                  <NumberInput value={String(state.arr[key])} onChange={(v) => actions.setArr(key, v)} min={0} />
                </div>
                {isSpacing && <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", width: 32 }}>{unit}</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", padding: "var(--spacing-7) var(--spacing-12) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Pill onClick={actions.closeModal} style={{ padding: "var(--spacing-5) var(--spacing-12)", borderRadius: "var(--radius-lg)" }}>Cancel</Pill>
          <button
            type="button"
            onClick={() => hasSel && actions.flashToast("Drag on canvas to set spacing")}
            disabled={!hasSel}
            style={{ padding: "var(--spacing-5) var(--spacing-10)", background: "var(--color-bg-subtle)", border: "none", borderRadius: "var(--radius-lg)", fontSize: "var(--font-size-md)", fontWeight: 500, color: "var(--color-text-tertiary)", cursor: hasSel ? "pointer" : "not-allowed", opacity: hasSel ? 1 : 0.5, fontFamily: "inherit" }}
          >
            Adjust Array Spacing By Cursor
          </button>
          <Pill style={{ marginLeft: "auto", padding: "var(--spacing-5) var(--spacing-16)", borderRadius: "var(--radius-lg)" }} onClick={() => actions.flashToast(`Preview: ${state.arr.row} × ${state.arr.col} array`)}>Preview</Pill>
          <PrimaryBtn onClick={runArray} style={{ padding: "var(--spacing-5) var(--spacing-16)", borderRadius: "var(--radius-lg)" }}>Confirm</PrimaryBtn>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Find And Replace (Popup 7) ───────────────────────────────────────────────
// Two tabs (Find / Replace). Find Content scope + Blur|Equal mode + text,
// Replace As (replace tab), Search Range (6 opts), Search Objects, Input
// Format, Find in Result. Tab-aware footer. Fields kept in local state — this
// is a transient search dialog; actions flash a toast (no live index yet).
const FR_CONTENT_SCOPES = [
  "All",
  "Basic Properties: ID",
  "Basic Properties: Text",
  "Basic Properties: Pin Name",
  "Basic Properties: Pin Number",
  "Basic Properties: Pin Type",
  "Basic Properties: Name",
  "Basic Properties: Symbol",
  "Custom Properties: Device",
  "Custom Properties: Description",
  "Custom Properties: Supplier Part",
  "Custom Properties: Manufacturer",
  "Custom Properties: Datasheet",
];
const FR_RANGES = [
  "Current Schematic",
  "Project",
  "Board1",
  "Board2",
  "Current Page",
  "Current Page Selected Objects",
];
const FR_OBJECTS = ["Components", "Net", "Pins", "Texts"];

function FieldRowFR({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)", marginBottom: "var(--spacing-6)" }}>
      <span style={{ width: 120, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>{label}</span>
      <div style={{ flex: 1, display: "flex", gap: "var(--spacing-4)", alignItems: "center" }}>{children}</div>
    </div>
  );
}

function TextField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ flex: 1, minWidth: 0, padding: "var(--spacing-4) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }}
    />
  );
}

function FindReplaceModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [tab, setTab] = React.useState("Find");
  const [scope, setScope] = React.useState(FR_CONTENT_SCOPES[0]);
  const [mode, setMode] = React.useState("Blur");
  const [findText, setFindText] = React.useState("");
  const [replaceText, setReplaceText] = React.useState("");
  const [range, setRange] = React.useState(FR_RANGES[0]);
  const [objects, setObjects] = React.useState<Record<string, boolean>>({ Components: true, Net: true, Pins: false, Texts: true });
  const [fmt, setFmt] = React.useState<Record<string, boolean>>({ regex: false, matchCase: false, expr: false });
  const [findInResult, setFindInResult] = React.useState(false);
  const cursor = React.useRef(-1);
  const isReplace = tab === "Replace";
  const toast = (m: string) => { actions.flashToast(m); };

  // REAL search over the canvas objects (text / net / kind / comment /
  // footprint fields), honoring Match case + Blur|Equal + Find in Result.
  const matchIds = () => {
    const raw = findText.trim();
    if (!raw) return null;
    const q = fmt.matchCase ? raw : raw.toLowerCase();
    const hits = (s?: string) => {
      if (!s) return false;
      const v = fmt.matchCase ? s : s.toLowerCase();
      return mode === "Equal" ? v === q : v.includes(q);
    };
    const pool = findInResult && state.selectedIds.length
      ? state.objects.filter((o) => state.selectedIds.includes(o.id))
      : state.objects;
    return pool
      .filter((o) => hits(o.text) || hits(o.net) || hits(o.kind) || hits(o.comment) || hits(o.footprint))
      .map((o) => o.id);
  };
  const findAll = () => {
    const ids = matchIds();
    if (ids === null) { toast("Enter search text"); return; }
    const byId = new Map(state.objects.map((o) => [o.id, o]));
    const matches = ids.map((id) => {
      const o = byId.get(id)!;
      return {
        id: o.id,
        objectId: o.id,
        page: "USB & Power",
        device: o.footprint || o.comment || o.kind,
        symbol: o.kind,
        name: o.text || o.net || "—",
        globalNet: o.net || "—",
        pinName: o.kind === "pin" ? (o.text || "—") : "",
        kind: o.kind,
      };
    });
    actions.merge({ selectedIds: ids });
    actions.runFind(matches);       // populates + opens the Find Result tab
    actions.closeModal();
    toast(ids.length ? `Found ${ids.length} — see Find Result` : "No matches");
  };
  const step = (dir: 1 | -1) => {
    const ids = matchIds();
    if (ids === null) { toast("Enter search text"); return; }
    if (!ids.length) { toast("No matches"); return; }
    cursor.current = (cursor.current + dir + ids.length) % ids.length;
    actions.merge({ selectedIds: [ids[cursor.current]] });
    toast(`Match ${cursor.current + 1} of ${ids.length}`);
  };
  const doReplace = (onlySelected: boolean) => {
    const raw = findText.trim();
    if (!raw) { toast("Enter search text"); return; }
    const re = new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), fmt.matchCase ? "g" : "gi");
    let count = 0;
    const next = state.objects.map((o) => {
      if (onlySelected && !state.selectedIds.includes(o.id)) return o;
      if (!o.text || !re.test(o.text)) { re.lastIndex = 0; return o; }
      re.lastIndex = 0;
      count++;
      return { ...o, text: mode === "Equal" ? replaceText : o.text.replace(re, replaceText) };
    });
    if (!count) { toast("No matches to replace"); return; }
    actions.merge({ objects: next });
    toast(`Replaced in ${count} object${count > 1 ? "s" : ""}`);
  };

  return (
    <Overlay>
      <Card width={640} maxHeight="90%" flexCol>
        <Header title="Find And Replace" onClose={actions.closeModal} padding="16px 22px" />
        <div style={{ padding: "var(--spacing-4) var(--spacing-8) 0", flex: "0 0 auto" }}>
          <ModalTabBar tabs={["Find", "Replace"]} active={tab} onChange={setTab} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-8) var(--spacing-10) var(--spacing-4)" }}>
          <FieldRowFR label="Find Content">
            <div style={{ minWidth: 150 }}><DsSelect value={scope} options={FR_CONTENT_SCOPES.map((s) => ({ label: s, value: s }))} onChange={setScope} minWidth={150} /></div>
            <div style={{ minWidth: 90 }}><DsSelect value={mode} options={["Blur", "Equal"].map((s) => ({ label: s, value: s }))} onChange={setMode} minWidth={90} /></div>
          </FieldRowFR>
          <FieldRowFR label=" ">
            <TextField value={findText} onChange={setFindText} placeholder="Search text…" />
          </FieldRowFR>
          {isReplace && (
            <FieldRowFR label="Replace As">
              <TextField value={replaceText} onChange={setReplaceText} placeholder="Replacement text…" />
            </FieldRowFR>
          )}
          <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-4) 0 var(--spacing-7)" }} />
          <FieldRowFR label="Search Range">
            <div style={{ minWidth: 220 }}><DsSelect value={range} options={FR_RANGES.map((s) => ({ label: s, value: s }))} onChange={setRange} minWidth={220} /></div>
          </FieldRowFR>
          <FieldRowFR label="Search Objects">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-8)" }}>
              {FR_OBJECTS.map((o) => (
                <div key={o} onClick={() => setObjects((s) => ({ ...s, [o]: !s[o] }))} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer" }}>
                  <Check on={!!objects[o]} size={18} />
                  <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{o}</span>
                </div>
              ))}
            </div>
          </FieldRowFR>
          <FieldRowFR label="Input Format">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-8)" }}>
              {([["Use Regular[*?]", "regex"], ["Match case", "matchCase"], ["Use expression", "expr"]] as const).map(([label, key]) => (
                <div key={key} onClick={() => setFmt((s) => ({ ...s, [key]: !s[key] }))} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer" }}>
                  <Check on={!!fmt[key]} size={18} />
                  <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{label}</span>
                </div>
              ))}
            </div>
          </FieldRowFR>
          <FieldRowFR label="Filter objects">
            <div onClick={() => setFindInResult((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer" }}>
              <Check on={findInResult} size={18} />
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Find in Result</span>
            </div>
          </FieldRowFR>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-7) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Pill onClick={actions.closeModal}>Cancel</Pill>
          <div style={{ marginLeft: "auto", display: "flex", gap: "var(--spacing-4)" }}>
            {isReplace && <Pill onClick={() => doReplace(true)}>Replace Current</Pill>}
            {isReplace && <Pill onClick={() => doReplace(false)}>Replace…</Pill>}
            <Pill onClick={() => step(-1)}>Find Previous</Pill>
            <Pill onClick={() => step(1)}>Find Next</Pill>
            <PrimaryBtn onClick={findAll}>Find All</PrimaryBtn>
          </div>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Table Properties ───────────────────────────────────────────────────────
function TableModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const fields: [string, keyof typeof state.tbl][] = [
    ["Row", "row"],
    ["Column", "col"],
  ];
  return (
    <Overlay>
      <Card width={420}>
        <Header title="Table Properties" onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-10)", display: "flex", flexDirection: "column", gap: "var(--spacing-8)" }}>
          {fields.map(([label, key]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)" }}>
              <span style={{ width: 90, flex: "0 0 auto", fontSize: "var(--font-size-md)", color: "var(--color-text-primary)" }}>{label}</span>
              <div style={{ flex: 1 }}>
                <NumberInput value={String(state.tbl[key])} onChange={(v) => actions.setTbl(key, v)} min={0} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Pill onClick={actions.closeModal} style={{ padding: "var(--spacing-5) var(--spacing-12)" }}>Cancel</Pill>
          <PrimaryBtn onClick={actions.closeModal} style={{ padding: "var(--spacing-5) var(--spacing-16)" }}>Confirm</PrimaryBtn>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Design Rules ───────────────────────────────────────────────────────────
// Popup 1 (PDF Part 3) — Schematic Design Rules. Four category tabs (Net 20 ·
// Component 12 · Reuse Block 3 · Connection pin-matrix); rows = enable
// checkbox + number + text + severity chip; enable-all per category; overflow
// (…) holds Import/Export Config; Connection tab = master toggle + 11×11
// lower-triangular pin-conflict matrix (click a cell to cycle severity).
// Config survives reopen within the session via a module-level cache.
const SCH_RULE_SETS: Record<"Net" | "Component" | "Reuse Block", RuleDef[]> = {
  Net: SCH_NET_RULES,
  Component: SCH_COMPONENT_RULES,
  "Reuse Block": SCH_REUSE_RULES,
};

const SCH_RULE_TABS = ["Net", "Component", "Reuse Block", "Connection"] as const;

function DesignRulesModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [tab, setTab] = React.useState<(typeof SCH_RULE_TABS)[number]>("Net");
  // Local edit buffer seeded from the store; committed on Save/Verify so Cancel
  // discards. The store copy is what the ERC engine actually reads.
  const [cfg, setCfg] = React.useState<SchRulesConfig>(() => state.designRules);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const openImportPicker = React.useCallback(() => {
    fileRef.current?.click();
  }, []);

  const catKey = tab === "Connection" ? null : tab;
  const rows = catKey ? cfg[catKey] : [];
  const allOn = catKey ? rows.every((r) => r.enabled) : cfg.pinCheckEnabled;

  const setRow = (i: number, patch: Partial<SchRuleState>) => {
    if (!catKey) return;
    setCfg((c) => ({ ...c, [catKey]: c[catKey].map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  };
  const setAll = (enabled: boolean) => {
    if (catKey) setCfg((c) => ({ ...c, [catKey]: c[catKey].map((r) => ({ ...r, enabled })) }));
    else setCfg((c) => ({ ...c, pinCheckEnabled: enabled }));
  };

  const save = () => {
    actions.setDesignRules(cfg);
  };
  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ideeza-schematic-design-rules.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    actions.flashToast("Design rule config exported");
  };
  const importConfig = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as SchRulesConfig;
        if (parsed && Array.isArray(parsed.Net)) {
          setCfg({ ...defaultSchRulesConfig(), ...parsed });
          actions.flashToast("Design rule config imported");
          return;
        }
      } catch {}
      actions.flashToast("Not a valid design-rule config file");
    };
    reader.readAsText(file);
  };

  return (
    <Overlay>
      <Card width={980} maxHeight="88%" flexCol>
        <Header title="Design Rules" onClose={actions.closeModal} padding="18px 24px" />
        <ModalTabBar
          tabs={[...SCH_RULE_TABS]}
          active={tab}
          onChange={(t) => setTab(t as typeof tab)}
          badges={{ Net: SCH_NET_RULES.length, Component: SCH_COMPONENT_RULES.length, "Reuse Block": SCH_REUSE_RULES.length }}
        />

        {/* Enable-all + overflow row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px 0", flex: "0 0 auto" }}>
          <div onClick={() => setAll(!allOn)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", cursor: "pointer" }}>
            <Check on={allOn} size={18} radius={5} checkSize={11} />
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", fontWeight: 600 }}>
              {tab === "Connection" ? "Pin Conflicts Detection" : "Enable all rules in this category"}
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              aria-label="More options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              style={{ width: 30, height: 26, border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", background: "var(--color-bg-surface)", color: "var(--color-text-secondary)", cursor: "pointer", fontWeight: 700 }}
            >
              …
            </button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 40, minWidth: 160, background: "var(--color-bg-surface)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-lg)", boxShadow: "var(--elevation-6, 0 12px 30px -6px rgba(0,0,0,.3))", padding: "var(--spacing-2)" }}>
                <div className="ix-mi" onClick={() => { openImportPicker(); setMenuOpen(false); }} style={{ padding: "7px 10px", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", cursor: "pointer" }}>
                  Import Config
                </div>
                <div className="ix-mi" onClick={() => { exportConfig(); setMenuOpen(false); }} style={{ padding: "7px 10px", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", cursor: "pointer" }}>
                  Export Config
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importConfig(f); e.target.value = ""; }} />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 24px 16px" }}>
          {catKey ? (
            SCH_RULE_SETS[catKey].map((def, i) => {
              const r = rows[i];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", padding: "7px 4px", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)", opacity: r.enabled ? 1 : 0.55 }}>
                  <span onClick={() => setRow(i, { enabled: !r.enabled })} style={{ display: "inline-flex", cursor: "pointer", flex: "0 0 auto" }}>
                    <Check on={r.enabled} size={17} radius={4} checkSize={10} />
                  </span>
                  <span style={{ width: 24, flex: "0 0 auto", fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{def.text}</span>
                  <SeverityChip value={r.severity} onChange={(s) => setRow(i, { severity: s })} disabled={!r.enabled} />
                </div>
              );
            })
          ) : (
            <PinConflictMatrix
              matrix={cfg.pinMatrix}
              enabled={cfg.pinCheckEnabled}
              onCell={(r, c) =>
                setCfg((cf) => ({
                  ...cf,
                  pinMatrix: cf.pinMatrix.map((row, ri) =>
                    ri === r ? row.map((s, ci) => (ci === c ? nextSeverity(s) : s)) : row,
                  ),
                }))
              }
            />
          )}
        </div>

        {/* Footer — exact spec button set */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-7) var(--spacing-12)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto", flexWrap: "wrap" }}>
          <Pill onClick={openImportPicker}>Import Config</Pill>
          <Pill onClick={exportConfig}>Export Config</Pill>
          <div onClick={() => { setCfg(defaultSchRulesConfig()); actions.flashToast("Design rules restored to defaults"); }} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", color: PRIMARY, fontSize: "var(--font-size-sm)", fontWeight: 600, cursor: "pointer" }}>
            <span>Restore Default</span>
            <Icon html={RESTORE_SVG} size={15} />
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--spacing-4)" }}>
            <div className="ix-pill" onClick={() => { save(); actions.clickBottomTab("drc"); actions.flashToast("Verifying design rules…"); }} style={{ padding: "var(--spacing-4) var(--spacing-9)", border: "var(--border-width-1-5) solid var(--color-border-brand)", borderRadius: "var(--radius-lg)", fontSize: "var(--font-size-sm)", fontWeight: 600, color: PRIMARY, cursor: "pointer" }}>
              Verify Now
            </div>
            <Pill onClick={actions.closeModal}>Cancel</Pill>
            <PrimaryBtn onClick={() => { save(); actions.flashToast("Design rules saved"); actions.closeModal(); }} style={{ padding: "var(--spacing-4) var(--spacing-14)" }}>
              Confirm
            </PrimaryBtn>
          </div>
        </div>
      </Card>
    </Overlay>
  );
}

// 11×11 lower-triangular pin-conflict grid — click a cell to cycle severity.
function PinConflictMatrix({
  matrix,
  enabled,
  onCell,
}: {
  matrix: Severity[][];
  enabled: boolean;
  onCell: (row: number, col: number) => void;
}) {
  return (
    <div style={{ overflowX: "auto", opacity: enabled ? 1 : 0.45, pointerEvents: enabled ? "auto" : "none" }}>
      <table style={{ borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
        <thead>
          <tr>
            <th style={{ position: "sticky", left: 0, background: "var(--color-bg-surface)" }} />
            {PIN_TYPES.map((t) => (
              <th key={t} style={{ padding: "4px 6px", fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", whiteSpace: "nowrap", maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis" }} title={t}>
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, r) => (
            <tr key={r}>
              <th style={{ padding: "4px 8px", fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textAlign: "right", whiteSpace: "nowrap", position: "sticky", left: 0, background: "var(--color-bg-surface)" }}>
                {PIN_TYPES[r]}
              </th>
              {row.map((s, c) => {
                const col = SEVERITY_COLOR[s];
                return (
                  <td key={c} style={{ padding: 2 }}>
                    <button
                      type="button"
                      onClick={() => onCell(r, c)}
                      title={`${PIN_TYPES[r]} × ${PIN_TYPES[c]}: ${s} — click to change`}
                      aria-label={`${PIN_TYPES[r]} versus ${PIN_TYPES[c]}: ${s}`}
                      style={{ minWidth: 58, height: 26, borderRadius: "var(--radius-sm)", border: `var(--border-width-1) solid ${col.fg}`, background: col.bg, color: col.fg, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      {SEVERITY_SHORT[s]}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8, fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
        Click a cell to cycle its severity (Ignore → Note → Warning → Error → Fatal Error).
      </div>
    </div>
  );
}

// ── Annotate Designator — Popups 2 (Schematic) & 5 (2D/PCB) ────────────────
// Same dialog shape; Range + Hierarchical differ per sheet (verified live in
// the PDF): schematic ranges are page-scoped with a hierarchical option, PCB
// ranges are layer-scoped with no hierarchical and no page-number rule.
const SCH_RANGES = [
  "Current schematic",
  "Current page",
  "Selected components at current page",
];
const PCB_RANGES = [
  "All components",
  "Top Layer Components",
  "Bottom Layer Components",
  "Selected Components",
];

// Kinds that carry designators, with their prefix letters.
const ANNOT_PREFIX: Record<string, string> = {
  resistor: "R",
  capacitor: "C",
  inductor: "L",
  diode: "D",
  connector: "J",
  ic: "U",
  component: "U",
};

function AnnotateModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const a = state.annot;
  const isPcbSheet = state.mode !== "schematic";
  const ranges = isPcbSheet ? PCB_RANGES : SCH_RANGES;
  const range = ranges.includes(a.range) ? a.range : ranges[0];
  const order = ORDER_OPTIONS.some((o) => o.value === a.order) ? a.order : ORDER_OPTIONS[0].value;
  const desRule = isPcbSheet
    ? "Custom starting number"
    : a.desRule === "Add page number" || a.desRule === "Custom starting number"
      ? a.desRule
      : "Custom starting number";

  const radioRow = (label: string, on: boolean, onClick: () => void, sub?: string) => (
    <div key={label} onClick={onClick} role="radio" aria-checked={on} style={{ display: "flex", alignItems: "flex-start", gap: "var(--spacing-5)", padding: "var(--spacing-3) 0", cursor: "pointer" }}>
      <span style={{ marginTop: 1 }}><Radio on={on} /></span>
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
        {label}
        {sub && <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>{sub}</div>}
      </span>
    </div>
  );

  // Real annotation — sweep the placed components in the chosen order and
  // write designators into their `text` field (or reset to "<prefix>?").
  const run = () => {
    const clearing = a.op === "Clear designators";
    const dirs: Record<string, (o1: { x: number; y: number }, o2: { x: number; y: number }) => number> = {
      "Across then down": (p, q) => p.y - q.y || p.x - q.x,
      "Across then up": (p, q) => q.y - p.y || p.x - q.x,
      "Down then across": (p, q) => p.x - q.x || p.y - q.y,
      "Up then across": (p, q) => p.x - q.x || q.y - p.y,
    };
    const inRange = (o: (typeof state.objects)[number]) => {
      if (!(o.kind in ANNOT_PREFIX)) return false;
      if (range === "Selected components at current page" || range === "Selected Components") {
        return state.selectedIds.includes(o.id);
      }
      if (range === "Top Layer Components") return (o.side ?? "top") === "top";
      if (range === "Bottom Layer Components") return o.side === "bottom";
      return true; // Current schematic / Current page / All components
    };
    const targets = state.objects.filter(inRange).sort(dirs[order] ?? dirs["Across then down"]);
    let n = Math.max(0, parseInt(a.customStart, 10) || 1) || 1;
    const counters: Record<string, number> = {};
    const nextText = new Map<string, string>();
    for (const o of targets) {
      const prefix = ANNOT_PREFIX[o.kind];
      const hasDesignator = !!o.text && !o.text.includes("?");
      if (clearing) {
        nextText.set(o.id, `${prefix}?`);
        continue;
      }
      if (hasDesignator && !a.existing) continue; // keep existing unless re-processing
      counters[prefix] = counters[prefix] ?? n;
      const pagePrefix = !isPcbSheet && desRule === "Add page number" ? "1-" : "";
      nextText.set(o.id, `${prefix}${pagePrefix}${counters[prefix]++}`);
      n = Math.max(n, counters[prefix]);
    }
    if (nextText.size === 0) {
      actions.flashToast("No components in the selected range");
      return 0;
    }
    actions.merge({
      objects: state.objects.map((o) => (nextText.has(o.id) ? { ...o, text: nextText.get(o.id)! } : o)),
    });
    actions.flashToast(clearing ? `Cleared ${nextText.size} designators` : `Annotated ${nextText.size} components`);
    return nextText.size;
  };

  const section = (label: string, extra?: string) => (
    <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, margin: "var(--spacing-7) 0 var(--spacing-3)" }}>
      {label}
      {extra && <span style={{ marginLeft: 8, textTransform: "none", fontWeight: 500, letterSpacing: 0, color: "var(--color-text-tertiary)" }}>{extra}</span>}
    </div>
  );

  return (
    <Overlay>
      <Card width={560} maxHeight="88%" flexCol>
        <Header title="Annotate Designators" onClose={actions.closeModal} padding="18px 24px" />
        <div style={{ flex: 1, overflowY: "auto", padding: "0 var(--spacing-12) var(--spacing-8)" }}>
          {/* OPERATION — radio pair + existing checkbox, one group */}
          {section("Operation")}
          {radioRow("Annotate designators", a.op !== "Clear designators", () => actions.setAnnot({ op: "Annotate designators" }))}
          <div onClick={() => actions.setAnnot({ existing: !a.existing })} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-3) 0 var(--spacing-3) 26px", cursor: "pointer", opacity: a.op === "Clear designators" ? 0.5 : 1 }}>
            <Check on={a.existing} size={18} radius={5} checkSize={11} />
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Existing designators</span>
          </div>
          {radioRow("Clear designators", a.op === "Clear designators", () => actions.setAnnot({ op: "Clear designators" }))}

          {/* RANGE — sheet-specific options */}
          {section("Range", isPcbSheet ? undefined : undefined)}
          <div role="radiogroup" aria-label="Range">
            {ranges.map((v) => radioRow(v, range === v, () => actions.setAnnot({ range: v })))}
          </div>

          {/* Hierarchical — schematic only (PDF: no such option on PCB) */}
          {!isPcbSheet && (
            <div onClick={() => actions.setAnnot({ hierarchical: !a.hierarchical })} style={{ display: "flex", alignItems: "flex-start", gap: "var(--spacing-5)", padding: "var(--spacing-4) 0 0", cursor: "pointer" }}>
              <span style={{ marginTop: 1 }}><Check on={a.hierarchical} size={18} radius={5} checkSize={11} /></span>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
                Assign instance Designator
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>
                  (overwrites the splice Designator from the template page)
                </div>
              </span>
            </div>
          )}

          {/* ORDER — 4 direction tiles */}
          {section("Order")}
          <DirectionTiles value={order} onChange={(v) => actions.setAnnot({ order: v })} />
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 6 }}>
            Across then down · Across then up · Down then across · Up then across
          </div>

          {/* DESIGNATOR RULE — page-number option is schematic-only */}
          {section("Designator Rule")}
          <div role="radiogroup" aria-label="Designator rule">
            {!isPcbSheet && radioRow("Add page number", desRule === "Add page number", () => actions.setAnnot({ desRule: "Add page number" }))}
            {radioRow("Custom starting number", desRule === "Custom starting number", () => actions.setAnnot({ desRule: "Custom starting number" }))}
          </div>
          <div style={{ marginTop: "var(--spacing-3)", maxWidth: 180, opacity: desRule === "Custom starting number" ? 1 : 0.5, pointerEvents: desRule === "Custom starting number" ? "auto" : "none" }}>
            <NumberInput value={String(a.customStart)} onChange={(v) => actions.setAnnot({ customStart: v })} min={1} placeholder="1" size="sm" />
          </div>
        </div>

        {/* Footer — Apply · Confirm · Cancel (spec order kept, Confirm primary) */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-12)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Pill onClick={run} style={{ flex: 1, textAlign: "center", padding: "var(--spacing-5)", borderRadius: "var(--radius-lg)" }}>Apply</Pill>
          <Pill onClick={actions.closeModal} style={{ flex: 1, textAlign: "center", padding: "var(--spacing-5)", borderRadius: "var(--radius-lg)" }}>Cancel</Pill>
          <PrimaryBtn onClick={() => { run(); actions.closeModal(); }} style={{ flex: 1, textAlign: "center", padding: "var(--spacing-5)", borderRadius: "var(--radius-lg)" }}>Confirm</PrimaryBtn>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Import DFX ───────────────────────────────────────────────────────────────
function ImportDfxModal() {
  const actions = usePcbActions();
  const [ref, setRef] = React.useState("origin");
  const field = (label: string, control: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", marginBottom: "var(--spacing-5)" }}>
      <span style={{ width: 150, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>{label}</span>
      {control}
    </div>
  );
  const input = (val: string, w = 1) => (
    <input defaultValue={val} className="ix-arr-input" style={{ flex: w, padding: "var(--spacing-3) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", fontFamily: "var(--font-family-body)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none" }} />
  );

  return (
    <Overlay>
      <Card width={1000} maxHeight="90%" flexCol>
        <Header title="Import DFX" onClose={actions.closeModal} padding="18px 24px" />
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* form */}
          <div style={{ width: 400, flex: "0 0 auto", padding: "var(--spacing-8) var(--spacing-8)", overflowY: "auto", borderRight: "var(--border-width-1) solid var(--color-border-subtle)" }}>
            {field("File Name", input("DXF_P1_Schematic1_2025-12-2", 1))}
            {field("File Unit", <Dropdown label="Project Name" minWidth={170} />)}
            {field("DXF Size(Width) :", <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>17.89inch x 11.79inch</span>)}
            {field("Import Size(W*H):", <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>17.89inch x 11.79inch</span>)}
            {field(
              "Reference Point",
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-3)" }}>
                {[["origin", "DXF Origin"], ["center", "Graphics Center"]].map(([k, l]) => (
                  <div key={k} onClick={() => setRef(k)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer" }}>
                    <Radio on={ref === k} />
                    <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{l}</span>
                  </div>
                ))}
              </div>,
            )}
            {field("Scaling Ratio:", <>{input("1", 1)}<Icon html={REFRESH_DD} size={16} /></>)}
            {field("Stroke Width", <><Dropdown label="1" minWidth={120} /><Icon html={REFRESH_DD} size={16} /></>)}
          </div>
          {/* preview */}
          <div style={{ flex: 1, padding: "var(--spacing-8)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg-subtle)" }}>
            <div style={{ width: "100%", maxWidth: 560, aspectRatio: "1.4", border: "var(--border-width-2) solid #fbd5f3", borderRadius: "var(--radius-sm)", background: "var(--color-bg-surface)", position: "relative", overflow: "hidden" }}>
              <svg width="100%" height="100%" viewBox="0 0 560 400" preserveAspectRatio="xMidYMid meet">
                <rect x="14" y="14" width="532" height="372" fill="none" stroke="#c9c2d4" strokeWidth="1" />
                {[[40, 40], [200, 40], [360, 40], [40, 160], [220, 160], [380, 160], [120, 270], [320, 270]].map(([x, y], i) => (
                  <rect key={i} x={x} y={y} width={i % 2 ? 70 : 100} height={i % 2 ? 44 : 60} fill="none" stroke="#39b56f" strokeWidth="1.5" />
                ))}
                {[[140, 70, 200], [300, 70, 360], [140, 190, 220], [320, 190, 380]].map(([x1, y1, x2], i) => (
                  <path key={"w" + i} d={`M${x1} ${y1} H${x2}`} stroke="#e34c4c" strokeWidth="1.5" fill="none" />
                ))}
                <rect x="360" y="300" width="180" height="74" fill="none" stroke="#1a1a1a" strokeWidth="1" />
                <text x="450" y="342" textAnchor="middle" fontSize="11" fill="var(--color-text-secondary)">Universal Remote Controller</text>
              </svg>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--spacing-5) var(--spacing-8)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Pill onClick={actions.closeModal}>Cancel</Pill>
          <PrimaryBtn onClick={actions.closeModal}>Replace</PrimaryBtn>
        </div>
      </Card>
    </Overlay>
  );
}

const REFRESH_DD =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>';

// ── Reannotate (Phase 5 — IT-575) ──────────────────────────────────────────
// Re-runs designator annotation across the schematic with the chosen scope
// and starting index. Visually a slim variant of AnnotateModal — same atoms,
// reduced field set per the Jira ticket.
function ReannotateModal() {
  const actions = usePcbActions();
  const [scope, setScope] = React.useState<"all" | "selected" | "page">("all");
  const [start, setStart] = React.useState("1");
  const [keepHidden, setKeepHidden] = React.useState(true);
  return (
    <Overlay>
      <Card width={460}>
        <Header title="Reannotate Designators" onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-12)", display: "flex", flexDirection: "column", gap: "var(--spacing-7)" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.55 }}>
            Renumber component designators (R?, C?, U?, …) across the chosen scope. Existing locked designators are preserved.
          </div>
          <div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-4)" }}>Scope</div>
            {[
              ["all", "Entire schematic"],
              ["page", "Current page"],
              ["selected", "Selected components"],
            ].map(([v, label]) => (
              <div key={v} onClick={() => setScope(v as typeof scope)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-3) 0", cursor: "pointer" }}>
                <Radio on={scope === v} />
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
            <span style={{ width: 140, fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>Start Number</span>
            <div style={{ flex: 1 }}>
              <NumberInput value={start} onChange={setStart} min={1} />
            </div>
          </div>
          <div onClick={() => setKeepHidden((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer" }}>
            <DsCheckbox checked={keepHidden} size="md" />
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Keep hidden designators unchanged</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="primary" size="md" onClick={() => { actions.reannotate(); actions.closeModal(); }}>Reannotate</Button>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Notice / confirm modal (EDA-format Export + Import flows) ─────────────────
function ConvertConfirmModal() {
  const actions = usePcbActions();
  return (
    <Overlay>
      <Card width={460}>
        <div style={{ padding: "var(--spacing-10)" }}>
          <div style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-6)" }}>
            Convert Schematic to PCB?
          </div>
          <div style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-10)", lineHeight: 1.5 }}>
            This will switch the canvas to PCB layout mode and place the current schematic components onto a board. You can switch back to the Schematic tab at any time.
          </div>
          <div style={{ display: "flex", gap: "var(--spacing-5)", justifyContent: "flex-end" }}>
            <Button hierarchy="secondary" size="lg" onClick={actions.closeModal}>Cancel</Button>
            <Button hierarchy="primary" size="lg" onClick={() => { actions.closeModal(); actions.setMode("pcb"); }}>Convert</Button>
          </div>
        </div>
      </Card>
    </Overlay>
  );
}

function NoticeModal({
  title,
  body,
  cta,
  checkboxLabel,
}: {
  title: string;
  body: React.ReactNode;
  cta: string;
  checkboxLabel?: string;
}) {
  const actions = usePcbActions();
  const [agreed, setAgreed] = React.useState(false);
  return (
    <Overlay>
      <Card width={460}>
        <Header title={title} onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-10)" }}>
          <div style={{ fontSize: "var(--font-size-sm)", lineHeight: 1.6, color: "var(--color-text-secondary)" }}>{body}</div>
          <div onClick={() => setAgreed((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", marginTop: "var(--spacing-8)", cursor: "pointer" }}>
            <DsCheckbox checked={agreed} size="md" />
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{checkboxLabel ?? "I have read and agreed, continue."}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="primary" size="md" disabled={!agreed} onClick={actions.closeModal}>{cta}</Button>
        </div>
      </Card>
    </Overlay>
  );
}

// EDA-export disclaimer, faithful to the Figma "2D section" export modals.
// `tool` is the target designer name; source typos ("has some different",
// "contiune") are preserved deliberately.
function exportNoticeBody(tool: string): React.ReactNode {
  return (
    <>
      1.Because the different file format and object design, the format translation will has some different, please check carefully at {tool} after exported.
      <br />
      2.Please be sure to read the notice before exporting :{" "}
      <span style={{ color: "var(--color-violet-600)", textDecoration: "underline" }}>Export {tool}/PADS Notice and Disclaimer</span>
      <br />
      3.Please export Gerber file instead of exporting {tool} if you are going to do PCB manufacturing. All PCB factories support the Gerber file.
      <br />
      4.EasyEDA are not responsible for any loss of fabrication due to export differences.
    </>
  );
}

const EXPORT_CHECKBOX = "I have learned and agreed, contiune to export";

const NOTICE: Record<string, { title: string; body: React.ReactNode; cta: string; checkboxLabel?: string }> = {
  exportAltium: { title: "Notice", body: exportNoticeBody("Altium Designer"), cta: "Export Altium Designer", checkboxLabel: EXPORT_CHECKBOX },
  exportKicad: { title: "Notice", body: exportNoticeBody("Kicad Designer"), cta: "Export Kicad Designer", checkboxLabel: EXPORT_CHECKBOX },
  exportEagle: { title: "Notice", body: exportNoticeBody("Eagle Designer"), cta: "Export Eagle Designer", checkboxLabel: EXPORT_CHECKBOX },
  importAltium: { title: "Notice", body: "Importing an Altium project will translate the schematic and footprints. Some properties may not map exactly — please review the imported design carefully.", cta: "Import Altium" },
  importKicad: { title: "Notice", body: "Importing a KiCad project will translate the schematic and footprints. Some properties may not map exactly — please review the imported design carefully.", cta: "Import Kicad" },
  jlcpcb: { title: "JLCPCB Layout Service", body: "Send your board to JLCPCB for professional layout and assembly. We'll route your design and prepare it for manufacturing.", cta: "Request Layout" },
  genBlock: { title: "Generate / Update Block Symbol", body: "Generate a reusable block symbol from the current sheet, or update an existing symbol to reflect schematic changes.", cta: "Generate" },
  boolOp: { title: "Boolean Operation", body: "Select two or more overlapping polygon areas on the canvas, then apply the operation (Preserve / Merge / Subtract / Exclude / Split).", cta: "OK" },
  distribute: { title: "Distribute Selection", body: "Select 3 or more objects on the canvas to distribute their spacing evenly along the chosen axis.", cta: "OK" },
};

// ── Text (double-click designator → edit) ──────────────────────────────────
function TextModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const labelStyle: React.CSSProperties = { width: 92, flex: "0 0 auto", fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)" };
  const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "var(--spacing-8)" };
  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: "var(--spacing-4) var(--spacing-6)",
    border: "var(--border-width-1) solid var(--color-border-default)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--font-size-md)",
    fontFamily: "var(--font-family-body)",
    color: "var(--color-text-primary)",
    background: "var(--color-bg-surface)",
    outline: "none",
  };
  const styleBtn = (k: "b" | "i" | "u", label: string, css: React.CSSProperties) => (
    <button
      onClick={() => actions.toggleTextStyle(k)}
      style={{
        flex: 1,
        padding: "var(--spacing-3) var(--spacing-0)",
        border: "none",
        borderRight: k !== "u" ? "var(--border-width-1) solid var(--color-border-default)" : "none",
        background: state.textStyle[k] ? "var(--color-bg-brand-subtle)" : "transparent",
        color: state.textStyle[k] ? "var(--color-violet-600)" : "var(--color-text-primary)",
        fontSize: "var(--font-size-md)",
        cursor: "pointer",
        ...css,
      }}
    >
      {label}
    </button>
  );
  return (
    <Overlay>
      <Card width={440}>
        <Header title="Text" onClose={actions.closeModal} padding="16px 22px" />
        <div style={{ padding: "var(--spacing-10) var(--spacing-12)", display: "flex", flexDirection: "column", gap: "var(--spacing-8)" }}>
          <div>
            <textarea
              value={state.editText}
              onChange={(e) => actions.setEditText(e.target.value)}
              rows={2}
              style={{ ...inputStyle, width: "100%", resize: "none", boxSizing: "border-box" }}
            />
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", marginTop: "var(--spacing-2)" }}>Ctrl/shift/Alt+ enter for line</div>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Font Color</span>
            <span style={{ width: 30, height: 24, borderRadius: "var(--radius-sm)", background: "#1E1E1E", flex: "0 0 auto" }} />
            <div style={{ ...inputStyle, flex: 1 }}>1E1E1E</div>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Transparency</span>
            <div style={{ flex: 1 }}><Dropdown label="100%" /></div>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Font Family</span>
            <div style={{ flex: 1 }}><Dropdown label="Arial" /></div>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Font size</span>
            <div style={{ ...inputStyle, flex: 1 }}>0.1 inch</div>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Style</span>
            <div style={{ display: "flex", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", overflow: "hidden", width: 120 }}>
              {styleBtn("b", "B", { fontWeight: 800 })}
              {styleBtn("i", "I", { fontStyle: "italic" })}
              {styleBtn("u", "U", { textDecoration: "underline" })}
            </div>
          </div>
          <div style={{ ...rowStyle, alignItems: "flex-start" }}>
            <span style={labelStyle}>Origin</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,16px)", gridTemplateRows: "repeat(3,16px)", gap: "var(--spacing-2)" }}>
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} style={{ width: 16, height: 16, borderRadius: "var(--radius-xs)", background: i === 6 ? "var(--color-violet-600)" : "var(--color-bg-subtle)", border: "var(--border-width-1) solid var(--color-border-default)" }} />
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--spacing-7) var(--spacing-12) var(--spacing-10)" }}>
          <Pill onClick={actions.closeModal} style={{ padding: "var(--spacing-5) var(--spacing-14)" }}>Cancel</Pill>
          <PrimaryBtn onClick={actions.closeModal} style={{ padding: "var(--spacing-5) var(--spacing-16)" }}>Place</PrimaryBtn>
        </div>
      </Card>
    </Overlay>
  );
}

// ── 3D export (Export ▸ 3D File / 3D Shell File) ─────────────────────────────
// Faithful UI to the Figma "3D Section" export modals; controls are interactive
// (local state) but Export/Cancel just close — no real file generation.
function Export3DModal({ shell }: { shell?: boolean }) {
  const actions = usePcbActions();
  const state = usePcbState();
  const [fileName, setFileName] = React.useState("3D_shell_PCB1");
  const [type, setType] = React.useState<"STL" | "OBJ">("STL");
  const [autoGen, setAutoGen] = React.useState(true);
  const INCLUDE = ["PCB Board", "Component Models", "Silkscreen", "Signal Layer Circuits", "Vias"];
  const [inc, setInc] = React.useState<Record<string, boolean>>({ "PCB Board": true, "Component Models": true, Silkscreen: true, "Signal Layer Circuits": true, Vias: false });

  const groupCss: React.CSSProperties = { fontSize: "var(--font-size-xs)", fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", color: "var(--color-text-tertiary)", marginBottom: "var(--spacing-4)" };
  const inputCss: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "var(--spacing-4) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", background: "var(--color-bg-surface)", color: "var(--color-text-primary)", fontSize: "var(--font-size-sm)", outline: "none", fontFamily: "inherit" };
  const noteCss: React.CSSProperties = { padding: "var(--spacing-4) var(--spacing-5)", borderLeft: "3px solid var(--color-violet-600)", background: "var(--color-bg-subtle)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.5 };

  return (
    <Overlay>
      <Card width={480}>
        <Header title={shell ? "Export 3D Shell File" : "Export 3D File"} onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-10)", display: "flex", flexDirection: "column", gap: "var(--spacing-8)" }}>
          {/* File name */}
          <div>
            <div style={groupCss}>File Name</div>
            <input value={fileName} onChange={(e) => setFileName(e.target.value)} style={inputCss} />
          </div>

          {/* Export format — segmented pills */}
          <div>
            <div style={groupCss}>Export Format</div>
            <div style={{ display: "flex", gap: "var(--spacing-3)" }}>
              {(["STL", "OBJ"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  style={{ flex: 1, padding: "var(--spacing-4)", borderRadius: "var(--radius-md)", border: `var(--border-width-1) solid ${type === t ? "var(--color-violet-600)" : "var(--color-border-default)"}`, background: type === t ? "var(--color-violet-600)" : "transparent", color: type === t ? "#fff" : "var(--color-text-secondary)", fontWeight: 700, fontSize: "var(--font-size-sm)", cursor: "pointer", fontFamily: "inherit" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Include in export — multi-select pills (full file only) */}
          {!shell && (
            <div>
              <div style={groupCss}>Include in Export</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-3)" }}>
                {INCLUDE.map((k) => {
                  const on = inc[k];
                  return (
                    <button key={k} type="button" onClick={() => setInc((s) => ({ ...s, [k]: !s[k] }))}
                      style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-2)", padding: "var(--spacing-3) var(--spacing-5)", borderRadius: "var(--radius-full)", border: `var(--border-width-1) solid ${on ? "var(--color-violet-600)" : "var(--color-border-default)"}`, background: on ? "var(--color-bg-brand-subtle)" : "transparent", color: on ? "var(--color-text-brand)" : "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", fontWeight: on ? 600 : 500, cursor: "pointer", fontFamily: "inherit" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: on ? "var(--color-violet-600)" : "var(--color-border-strong, #888)" }} />
                      {k}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!shell ? (
            <>
              {/* Auto-generate toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-6)" }}>
                <div>
                  <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Auto-generate missing 3D models</div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>Components without a bound 3D model will be built from footprint height data</div>
                </div>
                <button type="button" role="switch" aria-checked={autoGen} onClick={() => setAutoGen((v) => !v)}
                  style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: autoGen ? "var(--color-violet-600)" : "var(--color-border-default)", position: "relative", flex: "0 0 auto", transition: "background .15s" }}>
                  <span style={{ position: "absolute", top: 2, left: autoGen ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
                </button>
              </div>
              <div style={noteCss}>Estimated file size: ~4.2 MB · Last exported 3 days ago</div>
            </>
          ) : (
            <div style={noteCss}>Shell-only export includes board outline + mounting holes. For full component geometry, use &ldquo;3D File&rdquo; instead.</div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="secondary" size="md" onClick={() => { actions.flashToast("Order placed — 3D shell"); actions.closeModal(); }}>Order 3D Shell</Button>
          <Button hierarchy="primary" size="md" onClick={() => {
            const m = collectPcbModel(state);
            const include = shell ? { board: true, comps: false } : { board: inc["PCB Board"] !== false, comps: inc["Component Models"] !== false };
            const base = fileName.replace(/\.(stl|obj)$/i, "");
            if (type === "OBJ") downloadBlob(`${base}.obj`, buildObj(m, include), "text/plain;charset=utf-8");
            else downloadBlob(`${base}.stl`, buildStl(m, include), "model/stl");
            actions.flashToast(`Exported ${base}.${type.toLowerCase()}`);
            actions.closeModal();
          }}>Export</Button>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Phase 6 — 2D side modals ─────────────────────────────────────────────────

// Generic export form: file name input, format radio, options checkboxes,
// Cancel / Export footer. Used by DXF / PDF / Gerber / Pick & Place / BOM.
function ExportFormatModal({
  title,
  defaultName,
  formats,
  extraOpts,
  onExport,
}: {
  title: string;
  defaultName: string;
  formats: string[];
  extraOpts: string[];
  // Optional real export action; falls back to the toast placeholder.
  onExport?: (fileName: string, format: string, opts: Record<string, boolean>) => void;
}) {
  const actions = usePcbActions();
  const [fileName, setFileName] = React.useState(defaultName);
  const [format, setFormat] = React.useState(formats[0]);
  const [opts, setOpts] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(extraOpts.map((o, i) => [o, i < 2])),
  );
  const labelCss: React.CSSProperties = { fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" };
  const groupCss: React.CSSProperties = { ...labelCss, marginBottom: "var(--spacing-4)", fontWeight: 600, color: "var(--color-text-primary)" };
  return (
    <Overlay>
      <Card width={460}>
        <Header title={title} onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-10)", display: "flex", flexDirection: "column", gap: "var(--spacing-8)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
            <span style={{ ...labelCss, width: 84, flex: "0 0 auto" }}>File Name</span>
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              style={{
                flex: 1,
                padding: "var(--spacing-3) var(--spacing-5)",
                border: "var(--border-width-1) solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-bg-surface)",
                color: "var(--color-text-primary)",
                fontSize: "var(--font-size-sm)",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div>
            <div style={groupCss}>Format</div>
            <div style={{ display: "flex", gap: "var(--spacing-8)", flexWrap: "wrap" }}>
              {formats.map((f) => (
                <div key={f} onClick={() => setFormat(f)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer" }}>
                  <Radio on={format === f} />
                  <span style={labelCss}>{f}</span>
                </div>
              ))}
            </div>
          </div>
          {extraOpts.length > 0 && (
            <div>
              <div style={groupCss}>Options</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-4) var(--spacing-6)" }}>
                {extraOpts.map((o) => (
                  <div key={o} onClick={() => setOpts((s) => ({ ...s, [o]: !s[o] }))} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer" }}>
                    <Check on={!!opts[o]} />
                    <span style={labelCss}>{o}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="primary" size="md" onClick={() => { if (onExport) onExport(fileName, format, opts); else actions.flashToast(`Exported ${fileName}`); actions.closeModal(); }}>Export</Button>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Open Project (Popup 9) ───────────────────────────────────────────────────
// Project-browser dialog. Real projects from the manual-projects store plus a
// few sample rows (no backend), Work Space + Filter dropdowns, footer actions.
const SAMPLE_PROJECTS = [
  "sohaib_tahir",
  "Gigabit Ethernet to USB controller LAN7800_copy",
  "New Project_2026-07-03_13-01-08",
  "New one",
  "New Project_2026-06-21_13-57-15",
  "PCB_PCB_2026-06-17",
  "New Project_2026-06-08_10-47-57",
  "Participated",
  "LCSC-Examples",
];

function OpenProjectModal() {
  const actions = usePcbActions();
  const { projects, selectProject } = useManualProjects();
  const [workspace, setWorkspace] = React.useState("Personal");
  const [filter, setFilter] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  // Real projects (openable — carry id+slug) first, sample rows after.
  const entries = React.useMemo(() => {
    const real = (projects ?? []).map((p) => ({ name: p.name, id: p.id, slug: p.slug }));
    const realNames = new Set(real.map((r) => r.name));
    return [
      ...real,
      ...SAMPLE_PROJECTS.filter((s) => !realNames.has(s)).map((s) => ({ name: s, id: undefined as string | undefined, slug: undefined as string | undefined })),
    ];
  }, [projects]);
  const q = filter.trim().toLowerCase();
  const shown = entries.filter((e) => !q || e.name.toLowerCase().includes(q));

  // REAL open: activate the project in the manual-projects store and jump
  // to its PCB editor. Sample rows have no local data — explain via toast.
  const openSelected = (newWindow: boolean) => {
    if (!selected) { actions.flashToast("Select a project first"); return; }
    const e = entries.find((x) => x.name === selected);
    if (e?.id && e.slug) {
      selectProject(e.id);
      const url = `/project/${e.slug}/pcb`;
      if (newWindow) window.open(url, "_blank");
      else window.location.href = url;
      actions.closeModal();
    } else {
      actions.flashToast(`"${selected}" is a sample — no local data to open`);
    }
  };

  return (
    <Overlay>
      <Card width={560} maxHeight="82%" flexCol>
        <Header title="Open" onClose={actions.closeModal} padding="16px 22px" />
        <div style={{ display: "flex", gap: "var(--spacing-6)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-5)", flex: "0 0 auto" }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>Work Space</span>
            <DsSelect value={workspace} options={["Personal", "Team", "Participated"].map((s) => ({ label: s, value: s }))} onChange={setWorkspace} minWidth={180} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", display: "block", marginBottom: 4 }}>Filter</span>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" style={{ width: "100%", boxSizing: "border-box", padding: "var(--spacing-4) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 var(--spacing-10)" }}>
          {shown.map((e) => (
            <div
              key={e.name}
              onClick={() => setSelected(e.name)}
              onDoubleClick={() => { setSelected(e.name); openSelected(false); }}
              className="ix-row"
              style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-4) var(--spacing-5)", borderRadius: "var(--radius-md)", cursor: "pointer", background: selected === e.name ? "var(--color-bg-brand-subtle)" : "transparent" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={selected === e.name ? "var(--color-violet-600)" : "var(--color-text-tertiary)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: selected === e.name ? "var(--color-text-brand)" : "var(--color-text-primary)", fontWeight: selected === e.name ? 600 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
              {!e.id && <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-tertiary)" }}>sample</span>}
            </div>
          ))}
          {shown.length === 0 && <div style={{ padding: "var(--spacing-8)", textAlign: "center", fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>No projects match.</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Pill onClick={actions.closeModal}>Cancel</Pill>
          <Pill style={{ marginLeft: "auto" }} onClick={() => openSelected(true)}>Open in New Window</Pill>
          <PrimaryBtn onClick={() => openSelected(false)}>Open Project</PrimaryBtn>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Device / Reuse Block picker (Popup 10) — the parts-library dialog ─────────
// Distinct from the Device *Standardization* manager. Source tabs, search,
// left rail, filter row, result table + Place, sort/pagination. Sample parts.
const SAMPLE_PARTS = [
  { part: "AP4313KTR-G1", footprint: "SOT-23-6", brand: "DIODES", price: "$0.0829", stock: "LCSC 90080" },
  { part: "INA180A2IDBVR", footprint: "SOT-23-5", brand: "TI", price: "$0.1805", stock: "LCSC 86910" },
  { part: "LAN7800-I/9JX", footprint: "QFN-56", brand: "Microchip", price: "$4.9200", stock: "LCSC 218430" },
  { part: "GRM155R71C104KA88D", footprint: "0402", brand: "Murata", price: "$0.0038", stock: "LCSC 15195" },
  { part: "RC0402FR-0710KL", footprint: "0402", brand: "Yageo", price: "$0.0012", stock: "LCSC 51765" },
];
const DEVICE_TABS = ["LCSC Electronics", "EasyEDA", "Reuse Block"];
const DEVICE_RAIL = ["System", "Recent", "Personal", "Favorite", "Project"];

function DevicePickerModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [tab, setTab] = React.useState(DEVICE_TABS[0]);
  const [rail, setRail] = React.useState(DEVICE_RAIL[0]);
  const [search, setSearch] = React.useState("");

  // REAL place: drop a component object carrying the part number onto the
  // canvas (near center, offset a little per placement) and select it.
  const placePart = (p: (typeof SAMPLE_PARTS)[number]) => {
    // Deterministic unique id — scan existing ids instead of a timestamp.
    let n = state.objects.length + 1;
    while (state.objects.some((o) => o.id === `obj_dp${n}`)) n++;
    const id = `obj_dp${n}`;
    const offset = (state.objects.length % 5) * 30;
    actions.merge({
      objects: [
        ...state.objects,
        { id, kind: "component", x: 420 + offset, y: 300 + offset, text: p.part, footprint: p.footprint, comment: p.brand },
      ],
      selectedIds: [id],
    });
    actions.flashToast(`Placed ${p.part} (${p.footprint})`);
    actions.closeModal();
  };
  const q = search.trim().toLowerCase();
  const rows = SAMPLE_PARTS.filter((p) => q.length < 2 || p.part.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
  const cellCss: React.CSSProperties = { padding: "var(--spacing-4) var(--spacing-5)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" };
  const headCss: React.CSSProperties = { ...cellCss, fontWeight: 700, color: "var(--color-text-secondary)", position: "sticky", top: 0, background: "var(--color-bg-surface)" };

  return (
    <Overlay>
      <Card width={980} maxHeight="88%" flexCol>
        <Header title="Device / Reuse Block" onClose={actions.closeModal} padding="16px 22px" />
        <div style={{ padding: "var(--spacing-4) var(--spacing-8) 0", flex: "0 0 auto" }}>
          <ModalTabBar tabs={DEVICE_TABS} active={tab} onChange={setTab} />
        </div>
        <div style={{ padding: "var(--spacing-6) var(--spacing-8) var(--spacing-4)", flex: "0 0 auto" }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search, at least 2 characters…" style={{ width: "100%", boxSizing: "border-box", padding: "var(--spacing-4) var(--spacing-6)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: "var(--spacing-4)", marginTop: "var(--spacing-4)", flexWrap: "wrap" }}>
            {["Package", "Manufacturer", "Features"].map((f) => (
              <div key={f} style={{ minWidth: 130 }}><DsSelect value={f} options={[{ label: f, value: f }]} minWidth={130} /></div>
            ))}
            <Pill style={{ marginLeft: "auto" }} onClick={() => actions.flashToast("Filters cleared")}>Clear Filters</Pill>
            <PrimaryBtn onClick={() => actions.flashToast("Filters applied")}>Apply Filters</PrimaryBtn>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* left rail */}
          <div style={{ width: 150, flex: "0 0 auto", borderRight: "var(--border-width-1) solid var(--color-border-subtle)", overflowY: "auto", padding: "var(--spacing-3)" }}>
            {DEVICE_RAIL.map((r) => (
              <div key={r} onClick={() => setRail(r)} className="ix-row" style={{ padding: "var(--spacing-3) var(--spacing-5)", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--font-size-sm)", fontWeight: rail === r ? 700 : 500, color: rail === r ? "var(--color-text-brand)" : "var(--color-text-primary)", background: rail === r ? "var(--color-bg-brand-subtle)" : "transparent" }}>{r}</div>
            ))}
          </div>
          {/* result table */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...headCss, textAlign: "left" }}>Part</th>
                  <th style={{ ...headCss, textAlign: "left" }}>Footprint / Brand</th>
                  <th style={{ ...headCss, textAlign: "left" }}>Price (5+)</th>
                  <th style={{ ...headCss, textAlign: "left" }}>Stock</th>
                  <th style={{ ...headCss, textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.part}>
                    <td style={cellCss}>{p.part}</td>
                    <td style={cellCss}>{p.footprint} · {p.brand}</td>
                    <td style={cellCss}>{p.price}</td>
                    <td style={cellCss}>{p.stock}</td>
                    <td style={{ ...cellCss, textAlign: "right" }}>
                      <Button hierarchy="primary" size="sm" onClick={() => placePart(p)}>Place</Button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={5} style={{ ...cellCss, textAlign: "center", color: "var(--color-text-tertiary)" }}>{q.length < 2 ? "Type at least 2 characters to search." : "No parts found."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-5) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>Sort: Price / Stock / Sales · {rows.length} results</span>
          <Pill style={{ marginLeft: "auto" }} onClick={actions.closeModal}>Cancel</Pill>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Export BOM (Popup 11) ────────────────────────────────────────────────────
// Device Standardization notice → BOM dialog with Filter-Option table.
const BOM_ROWS: { title: string; property: string; sort: string; group: string }[] = [
  { title: "No.", property: "Number", sort: "None", group: "None" },
  { title: "Comment", property: "Comment", sort: "None", group: "Yes" },
  { title: "Designator", property: "Designator", sort: "Ascending", group: "No" },
  { title: "Footprint", property: "Footprint", sort: "None", group: "Yes" },
  { title: "Manufacturer", property: "Manufacturer", sort: "None", group: "Yes" },
];

const BOM_COMPONENT_KINDS = new Set(["component", "resistor", "capacitor", "inductor", "diode", "ic", "connector"]);

function BomModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [notice, setNotice] = React.useState(true);

  // REAL export: build a CSV from the components on the canvas and download
  // it (XLSX choice still ships CSV content until a real workbook writer).
  const exportBomFile = (fileName: string, fileType: string) => {
    const comps = state.objects.filter((o) => BOM_COMPONENT_KINDS.has(o.kind));
    const rows: string[][] = [
      ["No.", "Comment", "Designator", "Footprint", "Manufacturer"],
      ...comps.map((o, i) => [
        String(i + 1),
        o.comment || o.kind,
        o.text || `U${i + 1}`,
        o.footprint || "-",
        "-",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadTextFile(`${fileName.slice(0, 60)}.csv`, csv);
    actions.flashToast(comps.length ? `Exported BOM — ${comps.length} component${comps.length > 1 ? "s" : ""} (${fileType} as CSV)` : "Exported BOM — no components on canvas yet");
    actions.closeModal();
  };
  const [range, setRange] = React.useState("Board1 : Gigabit Eth to USB Controller");
  const [variant, setVariant] = React.useState("Basic");
  const [fileName] = React.useState("BOM_Board1_Gigabit Eth to USB Controller_2026");
  const [fileType, setFileType] = React.useState("XLSX");
  const [template, setTemplate] = React.useState("None");
  const cellCss: React.CSSProperties = { padding: "var(--spacing-3) var(--spacing-5)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)", textAlign: "left" };
  const labelCss: React.CSSProperties = { width: 120, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" };

  if (notice) {
    return (
      <Overlay>
        <Card width={460}>
          <Header title="Notice" onClose={actions.closeModal} padding="16px 22px" />
          <div style={{ padding: "var(--spacing-9) var(--spacing-10)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", lineHeight: 1.6 }}>
            It is recommended to use Device Standardization before exporting the BOM, so every part maps to a consistent supplier / manufacturer entry.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
            <Pill onClick={() => { actions.closeModal(); actions.openManager("device"); }}>Device Standardization</Pill>
            <PrimaryBtn style={{ marginLeft: "auto" }} onClick={() => setNotice(false)}>Export BOM</PrimaryBtn>
            <Pill onClick={actions.closeModal}>Cancel</Pill>
          </div>
        </Card>
      </Overlay>
    );
  }

  return (
    <Overlay>
      <Card width={820} maxHeight="88%" flexCol>
        <Header title="Export BOM" onClose={actions.closeModal} padding="16px 22px" />
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-8) var(--spacing-10) var(--spacing-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", marginBottom: "var(--spacing-6)" }}>
            <span style={labelCss}>Range</span>
            <div style={{ flex: 1 }}><DsSelect value={range} options={[range, "Board2 : Panel"].map((s) => ({ label: s, value: s }))} onChange={setRange} /></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", marginBottom: "var(--spacing-6)" }}>
            <span style={labelCss}>Assembly Variant</span>
            <div style={{ minWidth: 160 }}><DsSelect value={variant} options={["Basic", "Extended", "Custom"].map((s) => ({ label: s, value: s }))} onChange={setVariant} minWidth={160} /></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", marginBottom: "var(--spacing-6)" }}>
            <span style={labelCss}>File Name</span>
            <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)", marginBottom: "var(--spacing-6)" }}>
            <span style={labelCss}>File Type</span>
            {["XLSX", "CSV"].map((t) => (
              <div key={t} onClick={() => setFileType(t)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer" }}>
                <Radio on={fileType === t} /><span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", marginBottom: "var(--spacing-8)" }}>
            <span style={labelCss}>Template</span>
            <div style={{ minWidth: 160 }}><DsSelect value={template} options={["None", "Standard", "JLCPCB"].map((s) => ({ label: s, value: s }))} onChange={setTemplate} minWidth={160} /></div>
          </div>
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-4)" }}>Filter Option</div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "var(--border-width-1) solid var(--color-border-subtle)" }}>
            <thead>
              <tr>{["Title", "Property", "Sort", "Group"].map((h) => <th key={h} style={{ ...cellCss, fontWeight: 700, color: "var(--color-text-secondary)", background: "var(--color-bg-subtle)" }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {BOM_ROWS.map((r) => (
                <tr key={r.title}>
                  <td style={cellCss}>{r.title}</td>
                  <td style={cellCss}>{r.property}</td>
                  <td style={cellCss}>{r.sort}</td>
                  <td style={cellCss}>{r.group}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-6) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto", flexWrap: "wrap" }}>
          <Pill onClick={() => actions.flashToast("Import Config")}>Import Config</Pill>
          <Pill onClick={() => actions.flashToast("Export Config")}>Export Config</Pill>
          <Pill onClick={() => actions.flashToast("Restored defaults")}>Restore Default</Pill>
          <Pill onClick={() => { actions.closeModal(); actions.openManager("device"); }}>Device Standardization</Pill>
          <div style={{ marginLeft: "auto", display: "flex", gap: "var(--spacing-4)" }}>
            <Pill onClick={() => actions.flashToast("Order Parts")}>Order Parts</Pill>
            <PrimaryBtn onClick={() => exportBomFile(fileName, fileType)}>Export BOM</PrimaryBtn>
            <Pill onClick={actions.closeModal}>Cancel</Pill>
          </div>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Export DXF (Popup 12) ────────────────────────────────────────────────────
function DxfModal() {
  const actions = usePcbActions();
  const state = usePcbState();
  const [range, setRange] = React.useState("Board1:Gigabit Eth to USB Controller");
  const [fileName, setFileName] = React.useState("board.dxf");
  const [containPages, setContainPages] = React.useState(false);
  const labelCss: React.CSSProperties = { width: 100, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" };
  return (
    <Overlay>
      <Card width={480}>
        <Header title="Export DXF" onClose={actions.closeModal} padding="16px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-10)", display: "flex", flexDirection: "column", gap: "var(--spacing-7)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
            <span style={labelCss}>Range</span>
            <div style={{ flex: 1 }}><DsSelect value={range} options={[range, "Board2 : Panel"].map((s) => ({ label: s, value: s }))} onChange={setRange} /></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
            <span style={labelCss}>File Name</span>
            <input value={fileName} onChange={(e) => setFileName(e.target.value)} style={{ flex: 1, padding: "var(--spacing-4) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }} />
          </div>
          <div onClick={() => setContainPages((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer" }}>
            <Check on={containPages} /><span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Contain pages</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Pill onClick={actions.closeModal}>Cancel</Pill>
          <PrimaryBtn onClick={() => { const m = collectPcbModel(state); downloadBlob(`${fileName.replace(/\.dxf$/i, "")}.dxf`, buildDxf(m), "application/dxf"); actions.flashToast(`Exported ${fileName.replace(/\.dxf$/i, "")}.dxf`); actions.closeModal(); }}>Export</PrimaryBtn>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Export Document / PDF·PNG·SVG (Popup 13) ─────────────────────────────────
function RowRadios({ label, opts, val, set }: { label: string; opts: string[]; val: string; set: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)" }}>
      <span style={{ width: 120, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>{label}</span>
      <div style={{ display: "flex", gap: "var(--spacing-8)", flexWrap: "wrap" }}>
        {opts.map((o) => (
          <div key={o} onClick={() => set(o)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer" }}>
            <Radio on={val === o} /><span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{o}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentModal() {
  const actions = usePcbActions();
  const state = usePcbState();
  const [fileType, setFileType] = React.useState("PDF");
  const [theme, setTheme] = React.useState("Default");
  const [lineWidth, setLineWidth] = React.useState("Default");
  const [range, setRange] = React.useState("All");
  const [output, setOutput] = React.useState("Merged sheet");
  return (
    <Overlay>
      <Card width={560}>
        <Header title="Export Document" onClose={actions.closeModal} padding="16px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-10)", display: "flex", flexDirection: "column", gap: "var(--spacing-7)" }}>
          <RowRadios label="File Type" opts={["PDF", "PNG", "SVG"]} val={fileType} set={setFileType} />
          <RowRadios label="Theme" opts={["Default", "White on Black", "Black on White"]} val={theme} set={setTheme} />
          <RowRadios label="Line Width" opts={["Default", "Always 1px", "Follow Zoom"]} val={lineWidth} set={setLineWidth} />
          <RowRadios label="Range" opts={["All", "Custom"]} val={range} set={setRange} />
          <RowRadios label="Output Method" opts={["Merged sheet", "Separated sheet"]} val={output} set={setOutput} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Pill onClick={actions.closeModal}>Cancel</Pill>
          <Pill style={{ marginLeft: "auto" }} onClick={() => { const m = collectPcbModel(state); const url = URL.createObjectURL(buildPdf(m)); window.open(url, "_blank"); window.setTimeout(() => URL.revokeObjectURL(url), 8000); }}>Print</Pill>
          <PrimaryBtn onClick={async () => {
            const m = collectPcbModel(state);
            if (fileType === "SVG") downloadBlob("board.svg", buildSvg(m), "image/svg+xml");
            else if (fileType === "PNG") { try { const png = await rasterizeSvgToPng(buildSvg(m), m.boardWmm + 8, m.boardHmm + 8); downloadDataUrl("board.png", png); } catch { actions.flashToast("PNG export failed"); } }
            else downloadBlob("board.pdf", buildPdf(m), "application/pdf");
            actions.flashToast(`Exported ${fileType}`); actions.closeModal();
          }}>Export</PrimaryBtn>
        </div>
      </Card>
    </Overlay>
  );
}

// Chamfer / Fillet (IT-609 / IT-610) — single corner-radius input, mode read
// from store so the menu sets it before opening.
function ChamferFilletModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const op = state.cornerOp;
  const isChamfer = op.mode === "chamfer";
  return (
    <Overlay>
      <Card width={420}>
        <Header title={isChamfer ? "Add Chamfer" : "Add Fillet"} onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-12)", display: "flex", flexDirection: "column", gap: "var(--spacing-7)" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.55 }}>
            {isChamfer
              ? "Replaces sharp corners on selected polygons or outlines with bevel cuts of the chosen size."
              : "Replaces sharp corners on selected polygons or outlines with rounded arcs of the chosen radius."}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)" }}>
            <span style={{ width: 140, fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
              {isChamfer ? "Chamfer size (mil)" : "Fillet radius (mil)"}
            </span>
            <div style={{ flex: 1 }}>
              <NumberInput value={String(op.radius)} onChange={(v) => actions.setCornerOp({ radius: parseFloat(v) || 0 })} min={0} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="primary" size="md" onClick={() => { actions.flashToast(`${isChamfer ? "Chamfer" : "Fillet"} applied`); actions.closeModal(); }}>
            Apply
          </Button>
        </div>
      </Card>
    </Overlay>
  );
}

// Phase 7 — Auto Routing options + start button (IT-665).
function AutoRouteModal() {
  const actions = usePcbActions();
  const [scope, setScope] = React.useState<"all" | "selected" | "unrouted">("unrouted");
  const [strategy, setStrategy] = React.useState<"fast" | "balanced" | "high">("balanced");
  const [respectClass, setRespectClass] = React.useState(true);
  const [smoothCorners, setSmoothCorners] = React.useState(true);
  return (
    <Overlay>
      <Card width={500}>
        <Header title="Auto Routing" onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-12)", display: "flex", flexDirection: "column", gap: "var(--spacing-7)" }}>
          <div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-4)" }}>Scope</div>
            {[
              ["unrouted", "Unrouted nets only"],
              ["selected", "Selected nets"],
              ["all", "All nets (re-route)"],
            ].map(([v, label]) => (
              <div key={v} onClick={() => setScope(v as typeof scope)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-3) 0", cursor: "pointer" }}>
                <Radio on={scope === v} />
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{label}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-4)" }}>Strategy</div>
            <div style={{ display: "flex", gap: "var(--spacing-8)" }}>
              {[
                ["fast", "Fast"],
                ["balanced", "Balanced"],
                ["high", "High quality"],
              ].map(([v, label]) => (
                <div key={v} onClick={() => setStrategy(v as typeof strategy)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer" }}>
                  <Radio on={strategy === v} />
                  <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div onClick={() => setRespectClass(!respectClass)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer" }}>
            <Check on={respectClass} />
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Respect Net Class widths and clearances</span>
          </div>
          <div onClick={() => setSmoothCorners(!smoothCorners)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer" }}>
            <Check on={smoothCorners} />
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Smooth corners after routing</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="primary" size="md" onClick={() => { actions.flashToast("Auto routing started…"); actions.closeModal(); }}>Start Routing</Button>
        </div>
      </Card>
    </Overlay>
  );
}

// Phase 7 — Routing Width (IT-668): pick a class or custom width in mil.
function RoutingWidthModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const presets = [4, 6, 8, 10, 12, 15, 20, 25, 30];
  return (
    <Overlay>
      <Card width={420}>
        <Header title="Routing Width" onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-12)", display: "flex", flexDirection: "column", gap: "var(--spacing-7)" }}>
          <div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-4)" }}>Common widths (mil)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-3)" }}>
              {presets.map((w) => (
                <button
                  key={w}
                  onClick={() => actions.setRoutingWidth(w)}
                  style={{
                    padding: "var(--spacing-3) var(--spacing-6)",
                    border: state.routingWidth === w ? "var(--border-width-1-5) solid var(--color-border-brand)" : "var(--border-width-1) solid var(--color-border-default)",
                    borderRadius: "var(--radius-md)",
                    background: state.routingWidth === w ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
                    color: state.routingWidth === w ? "var(--color-violet-600)" : "var(--color-text-primary)",
                    fontWeight: state.routingWidth === w ? 700 : 500,
                    fontSize: "var(--font-size-sm)",
                    cursor: "pointer",
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)" }}>
            <span style={{ width: 130, fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>Custom (mil)</span>
            <div style={{ flex: 1 }}>
              <NumberInput value={String(state.routingWidth)} onChange={(v) => actions.setRoutingWidth(parseFloat(v) || 0)} min={0} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="primary" size="md" onClick={() => { actions.flashToast(`Routing width set to ${state.routingWidth} mil`); actions.closeModal(); }}>Apply</Button>
        </div>
      </Card>
    </Overlay>
  );
}

// Lightweight info + confirm dialog (Edit Outline, Cutout).
function SimpleConfirmModal({ title, body, cta, onConfirm }: { title: string; body: string; cta: string; onConfirm: () => void }) {
  const actions = usePcbActions();
  return (
    <Overlay>
      <Card width={460}>
        <Header title={title} onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-12)" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.55 }}>{body}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="primary" size="md" onClick={() => { onConfirm(); actions.closeModal(); }}>{cta}</Button>
        </div>
      </Card>
    </Overlay>
  );
}

export function Modals() {
  const state = usePcbState();
  const actions = usePcbActions();
  switch (state.modal) {
    case "textEdit":
      return <TextModal />;
    case "deleteObjects":
      return <DeleteObjectsModal />;
    case "array":
      return <ArrayModal />;
    case "findReplace":
      return <FindReplaceModal />;
    case "tableProps":
      return <TableModal />;
    case "designRules":
      return <DesignRulesModal />;
    case "annotate":
      return <AnnotateModal />;
    case "importDfx":
      return <ImportDfxModal />;
    case "exportAltium":
    case "exportKicad":
    case "exportEagle":
    case "importAltium":
    case "importKicad":
    case "jlcpcb":
    case "genBlock":
    case "boolOp":
    case "distribute":
      return <NoticeModal {...NOTICE[state.modal]} />;
    case "export3dFile":
      return <Export3DModal />;
    case "export3dShell":
      return <Export3DModal shell />;
    case "set3dSysGeneral":
    case "set3dSysCommon":
    case "set3dSysLib":
    case "set3dPanelGeneral":
    case "set3dPanelTheme":
    case "set3dFont":
    case "set3dDrawing":
    case "set3dProperty":
      return <SettingDialog id={state.modal} />;
    case "set3dHotkey":
      return <HotkeyDialog />;
    case "set3dTopToolbar":
      return <TopToolbarDialog />;
    case "convertConfirm":
      return <ConvertConfirmModal />;
    case "reannotate":
      return <ReannotateModal />;
    case "exportDxf2D":
      return <DxfModal />;
    case "exportPdf2D":
      return <DocumentModal />;
    case "openProject":
      return <OpenProjectModal />;
    case "devicePicker":
      return <DevicePickerModal />;
    case "exportGerber2D":
      // Real pipeline: server-side kicad-cli (graceful 501 hint if not installed).
      return <ExportFormatModal title="Export Gerber" defaultName="board.gbr" formats={["RS-274X (Extended)", "RS-274D"]} extraOpts={["Generate drill file", "Include silk", "Include solder mask", "Compress as ZIP"]} onExport={() => { exportGerberViaKicad(state, actions.flashToast); }} />;
    case "exportPickPlace":
      return <ExportFormatModal title="Export Pick and Place" defaultName="board-pnp" formats={["CSV", "TXT", "JSON"]} extraOpts={["Include top side", "Include bottom side", "Use metric units"]} onExport={(name, fmt) => {
        const m = collectPcbModel(state);
        const f = fmt === "TXT" ? "TXT" : fmt === "JSON" ? "JSON" : "CSV";
        const { text, ext, mime } = buildPickPlace(m, f);
        downloadBlob(`${name.replace(/\.(csv|txt|json)$/i, "").slice(0, 60)}.${ext}`, text, mime);
        actions.flashToast(m.comps.length ? `Exported ${m.comps.length} placement${m.comps.length > 1 ? "s" : ""} (${ext.toUpperCase()})` : "Export Pick & Place — no components placed yet");
      }} />;
    case "exportBom":
      return <BomModal />;
    case "chamferFillet":
      return <ChamferFilletModal />;
    case "editOutline":
      return <SimpleConfirmModal title="Edit Board Outline" body="Click vertices on the board outline to move them, or drag edges to add new points. Click outside the outline to commit changes." cta="Enter Edit Mode" onConfirm={() => actions.setTool("editOutline")} />;
    case "cutout":
      return <SimpleConfirmModal title="Cutout" body="Draw a rectangle, polygon, or circle on the board to define a cutout region. The selected area will be removed from the board." cta="Start Cutout" onConfirm={() => actions.setTool("cutout")} />;
    case "autoRoute":
      return <AutoRouteModal />;
    case "routingWidth":
      return <RoutingWidthModal />;
    case "layerManager":
    case "netClass":
    case "diffPair":
    case "equalLength":
    case "padPair":
    case "copper":
    case "tearDrop":
    case "removeUnusedPad":
    case "pcbDrc":
      return <PcbManagerModals />;
    default:
      return null;
  }
}
