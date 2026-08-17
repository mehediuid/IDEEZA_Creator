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
import { DEL_OBJ_NAMES, SEL_FILTER_KINDS, type CanvasObject } from "@/lib/pcb/types";
import { ERC_ENFORCED_ROWS } from "@/lib/pcb/nets";
import { convertSchematicToPcb } from "@/lib/pcb/schematic-to-pcb";
import { isCombinable } from "@/lib/pcb/shape-boolean";
import { defaultSutureConfig, planSutureVias, sutureRegions, type SutureConfig } from "@/lib/pcb/suture-vias";
import { parseGltfFile } from "@/lib/pcb/gltf-import";
import { dxfLayers, dxfToObjects, parseDxf, pxPerUnit, summariseDxf, type DxfDoc, type DxfLayerMap } from "@/lib/pcb/dxf-import";
import {
  MODULE_CATALOG,
  NO_FILTERS,
  PICKER_RAILS,
  RAIL_EMPTY,
  featureOptions,
  filterModules,
  filterParts,
  manufacturerOptions,
  packageOptions,
  partsForRail,
  projectPartIds,
  pushRecent,
  readFavorites,
  readPersonal,
  readPersonalModules,
  type PersonalModule,
  readRecents,
  toggleFavorite,
  type AgileModule,
  type CatalogPart,
  type PartFilters,
  type PickerRail,
} from "@/lib/pcb/part-catalog";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { useManualProjects } from "@/lib/manual/projects";
import { exportGerberViaKicad } from "@/lib/pcb/kicad-export";
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
  captureSchematicSvg,
  rasterizeToPng,
  buildSheetPdf,
  type SchemCapture,
} from "@/lib/pcb/exporters";
import { ProjectInfoModal } from "@/components/dashboard/project-info-modal";
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
function Check({ on, size = 18, decorative }: { on: boolean; size?: number; radius?: number; checkSize?: number; decorative?: boolean }) {
  return <DsCheckbox checked={on} size={size >= 22 ? "lg" : "md"} decorative={decorative} />;
}

function Radio({ on }: { on: boolean }) {
  return <DsRadio checked={on} size="md" />;
}

/** A checkbox + label that Tab reaches and Space/Enter toggles. A `<span
 *  onClick>` around a painted box is invisible to the keyboard, and these
 *  toggles decide what the checker reports. */
function CheckRow({
  on, onToggle, children, hint, gap = 4, style,
}: {
  on: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hint?: React.ReactNode;
  gap?: number;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === " ") { e.preventDefault(); onToggle(); } }}
      style={{
        display: "flex", alignItems: "center", gap: `var(--spacing-${gap})`,
        padding: 0, border: "none", background: "none", cursor: "pointer",
        textAlign: "left", font: "inherit", color: "inherit", ...style,
      }}
    >
      <Check on={on} size={17} decorative />
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{children}</span>
      {hint}
    </button>
  );
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

// ── Find & Replace ──────────────────────────────────────────────────────────
// Reads like a find bar, not a form: the query leads, the match count answers
// as you type, and every option is wired to the search (the old dialog carried
// three dead controls — object kinds, search range and the regex flag never
// reached the matcher).
const FR_SCOPES = [
  { label: "This sheet", value: "sheet" },
  { label: "All sheets", value: "all" },
  { label: "Current selection", value: "selection" },
];

// Which object kinds each "search in" chip covers. Reuses the app's own
// category predicates (SEL_FILTER_KINDS) so a new symbol kind can't silently
// fall out of search — a hand-written list already missed `resistorBox`.
const FR_KINDS: Record<string, (o: CanvasObject) => boolean> = {
  Parts: (o) => SEL_FILTER_KINDS.symbol(o.kind) || o.kind === "reuseBlock",
  Nets: (o) => SEL_FILTER_KINDS.net(o.kind) || SEL_FILTER_KINDS.wirebus(o.kind) || !!o.net,
  Pins: (o) => SEL_FILTER_KINDS.pin(o.kind),
  Text: (o) => ["text", "note", "field"].includes(o.kind),
};
const FR_OBJECTS = Object.keys(FR_KINDS);

function FindReplaceModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [tab, setTab] = React.useState("Find");
  const [findText, setFindText] = React.useState("");
  const [replaceText, setReplaceText] = React.useState("");
  const [scope, setScope] = React.useState("sheet");
  const [objects, setObjects] = React.useState<Record<string, boolean>>({ Parts: true, Nets: true, Pins: true, Text: true });
  const [matchCase, setMatchCase] = React.useState(false);
  const [useRegex, setUseRegex] = React.useState(false);
  const [wholeValue, setWholeValue] = React.useState(false);
  const cursor = React.useRef(-1);
  const isReplace = tab === "Replace";
  const toast = (m: string) => actions.flashToast(m);

  // One matcher for search, stepping, replace and the live count — so what the
  // count promises is exactly what the buttons act on.
  const tester = React.useMemo(() => {
    const raw = findText.trim();
    if (!raw) return null;
    if (useRegex) {
      try {
        const re = new RegExp(wholeValue ? `^(?:${raw})$` : raw, matchCase ? "" : "i");
        return { ok: true as const, test: (v: string) => re.test(v), re };
      } catch {
        return { ok: false as const, test: () => false, re: null };
      }
    }
    const q = matchCase ? raw : raw.toLowerCase();
    const norm = (v: string) => (matchCase ? v : v.toLowerCase());
    return { ok: true as const, test: (v: string) => (wholeValue ? norm(v) === q : norm(v).includes(q)), re: null };
  }, [findText, useRegex, matchCase, wholeValue]);

  const pool = React.useMemo(() => {
    const sheetOf = (o: CanvasObject) => o.sheetId ?? state.activeSheetId;
    const base =
      scope === "selection"
        ? state.objects.filter((o) => state.selectedIds.includes(o.id))
        : scope === "sheet"
        ? state.objects.filter((o) => sheetOf(o) === state.activeSheetId)
        : state.objects;
    const on = FR_OBJECTS.filter((k) => objects[k]);
    return base.filter((o) => on.some((k) => FR_KINDS[k](o)));
  }, [state.objects, state.selectedIds, state.activeSheetId, scope, objects]);

  const matches = React.useMemo(() => {
    if (!tester?.ok) return [];
    const fields = (o: CanvasObject) => [o.text, o.net, o.comment, o.footprint].filter(Boolean) as string[];
    return pool.filter((o) => fields(o).some((v) => tester.test(v)));
  }, [pool, tester]);

  const findAll = () => {
    if (!tester) { toast("Enter search text"); return; }
    if (!tester.ok) { toast("That regular expression isn't valid"); return; }
    actions.merge({ selectedIds: matches.map((o) => o.id) });
    actions.runFind(
      matches.map((o) => ({
        id: o.id,
        objectId: o.id,
        page: state.schematicSheets.find((sh) => sh.id === (o.sheetId ?? state.activeSheetId))?.name ?? "Sheet",
        device: o.footprint || o.comment || o.kind,
        symbol: o.kind,
        name: o.text || o.net || "—",
        globalNet: o.net || "—",
        pinName: o.kind === "pin" ? o.text || "—" : "",
        kind: o.kind,
      })),
    );
    actions.closeModal();
    toast(matches.length ? `Found ${matches.length} — see Find Result` : "No matches");
  };

  const step = (dir: 1 | -1) => {
    if (!matches.length) { toast(tester ? "No matches" : "Enter search text"); return; }
    cursor.current = (cursor.current + dir + matches.length) % matches.length;
    actions.merge({ selectedIds: [matches[cursor.current].id] });
    toast(`Match ${cursor.current + 1} of ${matches.length}`);
  };

  const doReplace = (onlyCurrent: boolean) => {
    if (!tester?.ok) { toast(tester ? "That regular expression isn't valid" : "Enter search text"); return; }
    const targets = onlyCurrent
      ? matches.filter((o) => state.selectedIds.includes(o.id))
      : matches;
    if (!targets.length) { toast(onlyCurrent ? "Select a match first" : "No matches to replace"); return; }
    const ids = new Set(targets.map((o) => o.id));
    const raw = findText.trim();
    const re = useRegex
      ? new RegExp(raw, matchCase ? "g" : "gi")
      : new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), matchCase ? "g" : "gi");
    let n = 0;
    const next = state.objects.map((o) => {
      if (!ids.has(o.id) || !o.text) return o;
      const text = wholeValue ? replaceText : o.text.replace(re, replaceText);
      if (text === o.text) return o;
      n++;
      return { ...o, text };
    });
    if (!n) { toast("Nothing changed"); return; }
    actions.merge({ objects: next });
    toast(`Replaced in ${n} object${n > 1 ? "s" : ""}`);
  };

  const chip = (label: string, on: boolean, onClick: () => void, title?: string) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={title}
      style={{
        padding: "var(--spacing-2) var(--spacing-5)",
        borderRadius: "var(--radius-full)",
        border: `var(--border-width-1) solid ${on ? "var(--color-violet-600)" : "var(--color-border-default)"}`,
        background: on ? "var(--color-bg-brand-subtle)" : "transparent",
        color: on ? "var(--color-violet-600)" : "var(--color-text-secondary)",
        fontSize: "var(--font-size-xs)",
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  const section = (label: string) => (
    <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, margin: "var(--spacing-7) 0 var(--spacing-4)" }}>{label}</div>
  );

  const countText = !findText.trim()
    ? "Type to search"
    : !tester?.ok
    ? "Invalid regular expression"
    : `${matches.length} match${matches.length === 1 ? "" : "es"}`;

  return (
    <Overlay>
      <Card width={560} maxHeight="90%" flexCol>
        <Header title="Find & Replace" onClose={actions.closeModal} padding="16px 22px" />
        <div style={{ padding: "var(--spacing-4) var(--spacing-8) 0", flex: "0 0 auto" }}>
          <ModalTabBar tabs={["Find", "Replace"]} active={tab} onChange={setTab} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-4)" }}>
          <input
            autoFocus
            value={findText}
            onChange={(e) => { setFindText(e.target.value); cursor.current = -1; }}
            onKeyDown={(e) => e.key === "Enter" && (isReplace ? doReplace(false) : findAll())}
            placeholder="Find text, designator, net or value…"
            style={{ width: "100%", boxSizing: "border-box", padding: "var(--spacing-5) var(--spacing-6)", border: `var(--border-width-1) solid ${tester && !tester.ok ? "var(--color-border-error, #c0392b)" : "var(--color-border-default)"}`, borderRadius: "var(--radius-md)", fontSize: "var(--font-size-md)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", marginTop: "var(--spacing-4)", flexWrap: "wrap" }}>
            {chip("Aa", matchCase, () => setMatchCase((v) => !v), "Match case")}
            {chip(".*", useRegex, () => setUseRegex((v) => !v), "Regular expression")}
            {chip("Whole value", wholeValue, () => setWholeValue((v) => !v), "Match the whole field, not part of it")}
            <span style={{ marginLeft: "auto", fontSize: "var(--font-size-xs)", fontWeight: 600, color: tester && !tester.ok ? "var(--color-text-error, #c0392b)" : "var(--color-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
              {countText}
            </span>
          </div>

          {isReplace && (
            <>
              {section("Replace with")}
              <input
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="New text…"
                style={{ width: "100%", boxSizing: "border-box", padding: "var(--spacing-5) var(--spacing-6)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-md)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }}
              />
            </>
          )}

          {section("Search in")}
          <div style={{ maxWidth: 240 }}>
            <DsSelect value={scope} options={FR_SCOPES} onChange={setScope} minWidth={240} />
          </div>
          <div style={{ display: "flex", gap: "var(--spacing-3)", marginTop: "var(--spacing-4)", flexWrap: "wrap" }}>
            {FR_OBJECTS.map((o) => chip(o, !!objects[o], () => setObjects((s) => ({ ...s, [o]: !s[o] }))))}
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: "var(--spacing-4)" }}>
            {pool.length} object{pool.length === 1 ? "" : "s"} in range · searches name, net, value and footprint
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-6) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Pill onClick={actions.closeModal}>Cancel</Pill>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--spacing-4)" }}>
            {isReplace ? (
              <>
                <Pill onClick={() => doReplace(true)}>Replace selected</Pill>
                <PrimaryBtn onClick={() => doReplace(false)}>Replace all</PrimaryBtn>
              </>
            ) : (
              <>
                <Pill onClick={() => step(-1)}>‹ Previous</Pill>
                <Pill onClick={() => step(1)}>Next ›</Pill>
                <PrimaryBtn onClick={findAll}>Find all</PrimaryBtn>
              </>
            )}
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

// ── Design Rules (schematic) ────────────────────────────────────────────────
// Tunes the ERC: `state.designRules` is what `runErc` reads, so the *shape* of
// the config is load-bearing — the engine looks rules up by category + row
// index (ERC_TO_DIALOG). This dialog therefore never reorders or filters the
// underlying arrays; the search box filters what is *displayed* and each row
// keeps its true index. Rules the checker doesn't implement yet are labelled as
// such instead of pretending the toggle does something.
const SCH_RULE_SETS: Record<"Net" | "Component" | "Reuse Block", RuleDef[]> = {
  Net: SCH_NET_RULES,
  Component: SCH_COMPONENT_RULES,
  "Reuse Block": SCH_REUSE_RULES,
};
type RuleCat = keyof typeof SCH_RULE_SETS;
// Config keys stay as the engine knows them; only the labels are ours.
const CAT_LABEL: Record<RuleCat, string> = {
  Net: "Nets & connectivity",
  Component: "Components",
  "Reuse Block": "Agile Modules",
};
const SEV_TONE: Record<string, { fg: string; bg: string }> = {
  "Fatal Error": { fg: "var(--color-text-error, #b3261e)", bg: "rgba(179,38,30,.12)" },
  Error: { fg: "var(--color-text-error, #b3261e)", bg: "rgba(179,38,30,.09)" },
  Warning: { fg: "var(--color-text-warning, #96600a)", bg: "rgba(150,96,10,.12)" },
  Note: { fg: "var(--color-text-secondary)", bg: "var(--color-bg-subtle)" },
  Ignore: { fg: "var(--color-text-tertiary)", bg: "var(--color-bg-subtle)" },
};

function DesignRulesModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [cat, setCat] = React.useState<RuleCat | "Connection">("Net");
  // Local edit buffer seeded from the store; committed on Save/Verify so Cancel
  // discards. The store copy is what the ERC engine actually reads.
  const [cfg, setCfg] = React.useState<SchRulesConfig>(() => state.designRules);
  const [query, setQuery] = React.useState("");
  const [onlyEnforced, setOnlyEnforced] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const openImportPicker = React.useCallback(() => fileRef.current?.click(), []);

  const catKey = cat === "Connection" ? null : cat;
  const rows = catKey ? cfg[catKey] : [];

  // Displayed subset — carries each rule's TRUE index so edits stay aligned
  // with what the engine reads.
  const shown = React.useMemo(() => {
    if (!catKey) return [];
    const q = query.trim().toLowerCase();
    return SCH_RULE_SETS[catKey]
      .map((def, idx) => ({ def, idx }))
      .filter(({ def, idx }) =>
        (!q || def.text.toLowerCase().includes(q)) &&
        (!onlyEnforced || ERC_ENFORCED_ROWS[catKey].has(idx)),
      );
  }, [catKey, query, onlyEnforced]);

  const setRow = (i: number, patch: Partial<SchRuleState>) => {
    if (!catKey) return;
    setCfg((c) => ({ ...c, [catKey]: c[catKey].map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  };
  const setAllShown = (enabled: boolean) => {
    if (!catKey) { setCfg((c) => ({ ...c, pinCheckEnabled: enabled })); return; }
    const ids = new Set(shown.map((s) => s.idx));
    setCfg((c) => ({ ...c, [catKey]: c[catKey].map((r, j) => (ids.has(j) ? { ...r, enabled } : r)) }));
  };

  const save = () => actions.setDesignRules(cfg);

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

  // Whole-config summary, so the dialog opens with its state stated.
  const summary = React.useMemo(() => {
    const cats: RuleCat[] = ["Net", "Component", "Reuse Block"];
    let on = 0, total = 0, enforcedOn = 0;
    const bySev: Record<string, number> = {};
    for (const c of cats) {
      cfg[c].forEach((r, idx) => {
        total++;
        if (!r.enabled) return;
        on++;
        bySev[r.severity] = (bySev[r.severity] ?? 0) + 1;
        if (ERC_ENFORCED_ROWS[c].has(idx)) enforcedOn++;
      });
    }
    return { on, total, enforcedOn, bySev };
  }, [cfg]);

  const catRow = (key: RuleCat | "Connection", label: string, meta: string) => {
    const on = cat === key;
    return (
      <div
        key={key}
        className="ix-row"
        onClick={() => setCat(key)}
        style={{ padding: "var(--spacing-4) var(--spacing-5)", borderRadius: "var(--radius-md)", cursor: "pointer", background: on ? "var(--color-bg-brand-subtle)" : "transparent" }}
      >
        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: on ? 700 : 500, color: on ? "var(--color-text-brand)" : "var(--color-text-primary)" }}>{label}</div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 1 }}>{meta}</div>
      </div>
    );
  };

  const enabledCount = (c: RuleCat) => cfg[c].filter((r) => r.enabled).length;

  return (
    <Overlay>
      <Card width={1000} maxHeight="88%" flexCol>
        <Header title="Design Rules" onClose={actions.closeModal} padding="18px 24px" />

        {/* State of the whole config, before any detail */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", padding: "0 var(--spacing-12) var(--spacing-5)", flex: "0 0 auto", flexWrap: "wrap" }}>
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
            <b style={{ color: "var(--color-text-primary)" }}>{summary.on} of {summary.total}</b> rules on ·{" "}
            <b style={{ color: "var(--color-text-primary)" }}>{summary.enforcedOn}</b> of them checked by the engine today
          </span>
          <span style={{ display: "flex", gap: "var(--spacing-3)", marginLeft: "auto", flexWrap: "wrap" }}>
            {(["Fatal Error", "Error", "Warning", "Note"] as const).map((sv) =>
              summary.bySev[sv] ? (
                <span key={sv} style={{ padding: "2px 8px", borderRadius: "var(--radius-full)", fontSize: 11, fontWeight: 700, color: SEV_TONE[sv].fg, background: SEV_TONE[sv].bg }}>
                  {summary.bySev[sv]} {sv === "Fatal Error" ? "fatal" : sv.toLowerCase()}
                </span>
              ) : null,
            )}
          </span>
        </div>

        <div style={{ flex: 1, display: "flex", minHeight: 0, borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          {/* Categories */}
          <div style={{ width: 224, flex: "0 0 auto", borderRight: "var(--border-width-1) solid var(--color-border-subtle)", padding: "var(--spacing-4)", overflowY: "auto" }}>
            {(["Net", "Component", "Reuse Block"] as RuleCat[]).map((c) =>
              catRow(c, CAT_LABEL[c], `${enabledCount(c)} / ${cfg[c].length} on · ${ERC_ENFORCED_ROWS[c].size} checked`),
            )}
            {catRow("Connection", "Pin conflicts", cfg.pinCheckEnabled ? "Matrix on" : "Matrix off")}
          </div>

          {/* Rules */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {catKey ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-5) var(--spacing-8) var(--spacing-4)", flex: "0 0 auto", flexWrap: "wrap" }}>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter rules…"
                    style={{ flex: 1, minWidth: 180, boxSizing: "border-box", padding: "var(--spacing-3) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }}
                  />
                  <CheckRow on={onlyEnforced} onToggle={() => setOnlyEnforced((v) => !v)} gap={3}>
                    Only rules the engine checks
                  </CheckRow>
                  <span style={{ display: "flex", gap: "var(--spacing-3)" }}>
                    <Pill onClick={() => setAllShown(true)}>Enable shown</Pill>
                    <Pill onClick={() => setAllShown(false)}>Disable shown</Pill>
                  </span>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "0 var(--spacing-8) var(--spacing-6)" }}>
                  {shown.map(({ def, idx }) => {
                    const r = rows[idx];
                    const enforced = ERC_ENFORCED_ROWS[catKey].has(idx);
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "9px 2px", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)", opacity: r.enabled ? 1 : 0.55 }}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={r.enabled}
                          aria-label={`${def.text} — ${r.enabled ? "on" : "off"}`}
                          onClick={() => setRow(idx, { enabled: !r.enabled })}
                          onKeyDown={(e) => { if (e.key === " ") { e.preventDefault(); setRow(idx, { enabled: !r.enabled }); } }}
                          style={{ display: "inline-flex", cursor: "pointer", flex: "0 0 auto", padding: 0, border: "none", background: "none" }}
                        >
                          <Check on={r.enabled} size={17} decorative />
                        </button>
                        <span style={{ width: 22, flex: "0 0 auto", fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", lineHeight: 1.35 }}>
                          {def.text}
                          {!enforced && (
                            <span title="Listed for completeness — the checker doesn't implement this rule yet, so the toggle won't change results." style={{ marginLeft: 8, padding: "1px 6px", borderRadius: "var(--radius-full)", fontSize: 10, fontWeight: 700, color: "var(--color-text-tertiary)", background: "var(--color-bg-subtle)", whiteSpace: "nowrap" }}>
                              not checked yet
                            </span>
                          )}
                        </span>
                        <SeverityChip value={r.severity} onChange={(sv) => setRow(idx, { severity: sv })} disabled={!r.enabled} />
                      </div>
                    );
                  })}
                  {shown.length === 0 && (
                    <div style={{ padding: "var(--spacing-12)", textAlign: "center", fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>
                      No rule matches “{query}”{onlyEnforced ? " among the checked rules" : ""}.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, overflow: "auto", padding: "var(--spacing-5) var(--spacing-8) var(--spacing-6)" }}>
                <CheckRow
                  on={cfg.pinCheckEnabled}
                  onToggle={() => setCfg((c) => ({ ...c, pinCheckEnabled: !c.pinCheckEnabled }))}
                  style={{ marginBottom: "var(--spacing-5)" }}
                  hint={
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
                      Click a cell to cycle its severity. A No-Connect flag suppresses the net.
                    </span>
                  }
                >
                  Check pin-to-pin conflicts
                </CheckRow>
                <PinConflictMatrix
                  matrix={cfg.pinMatrix}
                  enabled={cfg.pinCheckEnabled}
                  onCell={(r, c) =>
                    setCfg((cf) => ({
                      ...cf,
                      pinMatrix: cf.pinMatrix.map((row, ri) =>
                        ri === r ? row.map((sv, ci) => (ci === c ? nextSeverity(sv) : sv)) : row,
                      ),
                    }))
                  }
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-6) var(--spacing-12)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto", flexWrap: "wrap" }}>
          <Pill onClick={openImportPicker}>Import…</Pill>
          <Pill onClick={exportConfig}>Export</Pill>
          <div onClick={() => { setCfg(defaultSchRulesConfig()); actions.flashToast("Design rules restored to defaults"); }} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", color: PRIMARY, fontSize: "var(--font-size-sm)", fontWeight: 600, cursor: "pointer" }}>
            <span>Restore defaults</span>
            <Icon html={RESTORE_SVG} size={15} />
          </div>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importConfig(f); e.target.value = ""; }} />
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--spacing-4)" }}>
            <Pill onClick={actions.closeModal}>Cancel</Pill>
            {/* Saves, then actually runs the check and shows the results tab. */}
            <Pill onClick={() => { save(); actions.runErcCheck(); actions.closeModal(); }}>Save &amp; check now</Pill>
            <PrimaryBtn onClick={() => { save(); actions.flashToast("Design rules saved"); actions.closeModal(); }} style={{ padding: "var(--spacing-4) var(--spacing-12)" }}>
              Save
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
  // resistorBox is the schematic's box-style resistor — it was missing here,
  // so annotation silently skipped every one of them.
  resistorBox: "R",
  transistor: "Q",
  opamp: "U",
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
  const clearing = a.op === "Clear designators";
  const desRule = isPcbSheet
    ? "Custom starting number"
    : a.desRule === "Add page number" || a.desRule === "Custom starting number"
      ? a.desRule
      : "Custom starting number";

  // Dry run — the exact assignment the Annotate button will commit, so the
  // preview can never disagree with the result.
  const plan = React.useMemo(() => {
    const dirs: Record<string, (o1: { x: number; y: number }, o2: { x: number; y: number }) => number> = {
      "Across then down": (p, q) => p.y - q.y || p.x - q.x,
      "Across then up": (p, q) => q.y - p.y || p.x - q.x,
      "Down then across": (p, q) => p.x - q.x || p.y - q.y,
      "Up then across": (p, q) => p.x - q.x || q.y - p.y,
    };
    const inRange = (o: CanvasObject) => {
      if (!(o.kind in ANNOT_PREFIX)) return false;
      if (range === "Selected components at current page" || range === "Selected Components") return state.selectedIds.includes(o.id);
      if (range === "Top Layer Components") return (o.side ?? "top") === "top";
      if (range === "Bottom Layer Components") return o.side === "bottom";
      return true;
    };
    const targets = state.objects.filter(inRange).sort(dirs[order] ?? dirs["Across then down"]);
    // Each prefix counts independently from the start number — R1,R2 · C1,C2.
    // (The old loop shared one running number, so a lone capacitor came out C2.)
    const start = Math.max(1, parseInt(String(a.customStart), 10) || 1);
    const counters: Record<string, number> = {};
    const next = new Map<string, string>();
    for (const o of targets) {
      const prefix = ANNOT_PREFIX[o.kind];
      const hasDesignator = !!o.text && !o.text.includes("?");
      if (clearing) { next.set(o.id, `${prefix}?`); continue; }
      if (hasDesignator && !a.existing) continue;
      counters[prefix] = counters[prefix] ?? start;
      const pagePrefix = !isPcbSheet && desRule === "Add page number" ? "1-" : "";
      const assigned = `${prefix}${pagePrefix}${counters[prefix]++}`;
      // A part that already carries the number it would get isn't a change.
      if (assigned !== o.text) next.set(o.id, assigned);
    }
    const sample = targets.filter((o) => next.has(o.id)).slice(0, 6).map((o) => `${o.text || "—"} → ${next.get(o.id)}`);
    return { next, count: next.size, scanned: targets.length, sample };
  }, [state.objects, state.selectedIds, range, order, a.customStart, a.existing, clearing, desRule, isPcbSheet]);

  const run = () => {
    if (plan.count === 0) {
      actions.flashToast(plan.scanned ? "Nothing to change — every part already has a designator" : "No components in this range");
      return 0;
    }
    actions.merge({ objects: state.objects.map((o) => (plan.next.has(o.id) ? { ...o, text: plan.next.get(o.id)! } : o)) });
    actions.flashToast(clearing ? `Cleared ${plan.count} designators` : `Annotated ${plan.count} components`);
    return plan.count;
  };

  const section = (label: string) => (
    <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, margin: "var(--spacing-7) 0 var(--spacing-4)" }}>{label}</div>
  );

  const seg = (options: { label: string; value: string }[], value: string, onChange: (v: string) => void) => (
    <div style={{ display: "inline-flex", background: "var(--color-bg-subtle)", borderRadius: "var(--radius-lg)", padding: 3, gap: 2 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            style={{ padding: "var(--spacing-3) var(--spacing-6)", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "var(--font-size-sm)", fontWeight: 600, background: on ? "var(--color-violet-600)" : "transparent", color: on ? "var(--color-text-on-brand)" : "var(--color-text-secondary)", transition: "background .14s, color .14s" }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <Overlay>
      <Card width={560} maxHeight="88%" flexCol>
        <Header title="Annotate Designators" onClose={actions.closeModal} padding="18px 24px" />
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-2) var(--spacing-12) var(--spacing-8)" }}>
          {section("Operation")}
          {seg(
            [{ label: "Assign designators", value: "Annotate designators" }, { label: "Clear designators", value: "Clear designators" }],
            clearing ? "Clear designators" : "Annotate designators",
            (v) => actions.setAnnot({ op: v }),
          )}
          {!clearing && (
            <div
              onClick={() => actions.setAnnot({ existing: !a.existing })}
              style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", marginTop: "var(--spacing-5)", cursor: "pointer" }}
            >
              <Check on={a.existing} size={18} radius={5} checkSize={11} />
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
                Renumber parts that already have a designator
              </span>
            </div>
          )}

          {section("Which parts")}
          <div style={{ maxWidth: 300 }}>
            <DsSelect value={range} options={ranges.map((r) => ({ label: r, value: r }))} onChange={(v) => actions.setAnnot({ range: v })} minWidth={300} />
          </div>
          {!isPcbSheet && (
            <div onClick={() => actions.setAnnot({ hierarchical: !a.hierarchical })} style={{ display: "flex", alignItems: "flex-start", gap: "var(--spacing-4)", marginTop: "var(--spacing-5)", cursor: "pointer" }}>
              <span style={{ marginTop: 1 }}><Check on={a.hierarchical} size={18} radius={5} checkSize={11} /></span>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
                Assign instance designators
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>
                  Overwrites designators inherited from a template page.
                </div>
              </span>
            </div>
          )}

          {section("Numbering order")}
          <DirectionTiles value={order} onChange={(v) => actions.setAnnot({ order: v })} />

          {section("Numbering")}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", flexWrap: "wrap" }}>
            <div style={{ width: 130 }}>
              <NumberInput
                value={String(a.customStart)}
                // Numbering starts at 1 at the lowest, so the field can't show a
                // value the run would ignore (empty stays empty while typing).
                onChange={(v) => actions.setAnnot({ customStart: v === "" ? v : String(Math.max(1, parseInt(v, 10) || 1)) })}
                min={1}
                placeholder="1"
                size="sm"
              />
            </div>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>Start counting from</span>
            {!isPcbSheet && (
              <div onClick={() => actions.setAnnot({ desRule: desRule === "Add page number" ? "Custom starting number" : "Add page number" })} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer", marginLeft: "auto" }}>
                <Check on={desRule === "Add page number"} size={18} radius={5} checkSize={11} />
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Prefix the page number</span>
              </div>
            )}
          </div>

          {/* Live dry run — the same assignment the button commits. */}
          <div style={{ marginTop: "var(--spacing-8)", padding: "var(--spacing-6)", borderRadius: "var(--radius-lg)", background: "var(--color-bg-subtle)", border: "var(--border-width-1) solid var(--color-border-subtle)" }}>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: plan.count ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>
              {plan.count === 0
                ? plan.scanned
                  ? "Nothing to change — every part in range already has a designator"
                  : "No components in this range"
                : clearing
                  ? `${plan.count} designator${plan.count === 1 ? "" : "s"} will be cleared`
                  : `${plan.count} of ${plan.scanned} part${plan.scanned === 1 ? "" : "s"} will be renumbered`}
            </div>
            {plan.sample.length > 0 && (
              <div style={{ marginTop: "var(--spacing-4)", display: "flex", flexWrap: "wrap", gap: "var(--spacing-3) var(--spacing-6)", fontFamily: "var(--font-family-mono), monospace", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
                {plan.sample.map((line, i) => <span key={i}>{line}</span>)}
                {plan.count > plan.sample.length && <span style={{ color: "var(--color-text-tertiary)" }}>+{plan.count - plan.sample.length} more</span>}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-6) var(--spacing-12)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Pill onClick={actions.closeModal}>Cancel</Pill>
          <div style={{ marginLeft: "auto", display: "flex", gap: "var(--spacing-4)" }}>
            <Pill onClick={run}>Apply</Pill>
            <PrimaryBtn onClick={() => { run(); actions.closeModal(); }}>
              {clearing ? "Clear designators" : "Annotate"}
            </PrimaryBtn>
          </div>
        </div>
      </Card>
    </Overlay>
  );
}


// ── Import 3D Model (glTF / GLB) ─────────────────────────────────────────────
// Real import: the file is parsed by three's GLTFLoader, so what the dialog
// reports (meshes, vertices, size) comes from the actual geometry and a bad file
// fails with the loader's own message. Imported models show in the 3D view —
// either at the board origin or riding a selected part.
function ImportGltfModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const parts = state.objects.filter((o) => o.scope === "pcb" && o.kind === "footprint" && state.selectedIds.includes(o.id));
  const part = parts[0] ?? null;
  const [target, setTarget] = React.useState<string>("board");
  const targetOptions = [
    { label: "Board origin", value: "board" },
    ...(part ? [{ label: `On ${part.text || "selected part"}`, value: part.id }] : []),
  ];

  const take = (file: File) => {
    setError(null);
    setBusy(true);
    parseGltfFile(file, target)
      .then((m) => {
        actions.addImportedModel(m);
        actions.flashToast(`Imported ${m.name} — ${m.meshes} mesh${m.meshes === 1 ? "" : "es"}`);
      })
      .catch((e: Error) => setError(e.message || "Import failed"))
      .finally(() => setBusy(false));
  };

  const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

  return (
    <Overlay>
      <Card width={560} flexCol>
        <Header title="Import 3D Model" onClose={actions.closeModal} padding="18px 24px" />
        <div style={{ padding: "var(--spacing-4) var(--spacing-12) var(--spacing-8)" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
            Accepts <b>.glb</b> and <b>.gltf</b>. The model appears in the PCB 3D view; it is kept for this
            session only and is not written into the saved document.
          </div>

          <div style={{ margin: "var(--spacing-7) 0 var(--spacing-4)", fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Place it
          </div>
          <div style={{ maxWidth: 280 }}>
            <DsSelect value={target} options={targetOptions} onChange={setTarget} minWidth={280} />
          </div>
          {!part && (
            <div style={{ marginTop: "var(--spacing-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
              Select a part on the board first to ride it on that part.
            </div>
          )}

          <div
            onClick={() => !busy && fileRef.current?.click()}
            style={{ marginTop: "var(--spacing-8)", padding: "var(--spacing-10)", textAlign: "center", borderRadius: "var(--radius-lg)", border: `var(--border-width-1-5) dashed ${error ? "var(--color-text-error, #b3261e)" : "var(--color-border-default)"}`, cursor: busy ? "progress" : "pointer", background: "var(--color-bg-subtle)" }}
          >
            <div style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>
              {busy ? "Reading model…" : "Choose a .glb / .gltf file"}
            </div>
            <div style={{ marginTop: 4, fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
              Parsed on import — meshes and vertex counts below come from the file itself.
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) take(f); e.target.value = ""; }}
          />
          {error && (
            <div style={{ marginTop: "var(--spacing-4)", fontSize: "var(--font-size-sm)", color: "var(--color-text-error, #b3261e)" }}>{error}</div>
          )}

          {state.importedModels.length > 0 && (
            <>
              <div style={{ margin: "var(--spacing-8) 0 var(--spacing-3)", fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                In this session
              </div>
              {state.importedModels.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-4) 0", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
                      {m.meshes} meshes · {m.vertices.toLocaleString()} vertices · {kb(m.bytes)} · {m.target === "board" ? "board origin" : "on part"}
                    </div>
                  </div>
                  <Pill onClick={() => actions.removeImportedModel(m.id)}>Remove</Pill>
                </div>
              ))}
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", padding: "var(--spacing-6) var(--spacing-12)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
            {state.mode === "3d" ? "Visible in this view" : "Switch to the PCB 3D view to see it"}
          </span>
          <PrimaryBtn style={{ marginLeft: "auto" }} onClick={actions.closeModal}>Done</PrimaryBtn>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Import DXF ───────────────────────────────────────────────────────────────
// Real import: the file is parsed (dxf-import.ts), its entities are counted and
// previewed from the parsed geometry, and Confirm places editable objects. The
// unit / scale / reference-point controls change the result — the dialog used to
// show a hard-coded preview and a Replace button that only closed it.
function ImportDfxModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [name, setName] = React.useState("");
  const [doc, setDoc] = React.useState<DxfDoc | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [unit, setUnit] = React.useState<"mm" | "inch">("mm");
  const [scale, setScale] = React.useState("1");
  const [reference, setReference] = React.useState<"origin" | "center">("origin");
  const [strokeW, setStrokeW] = React.useState("1.7");
  const [layerMap, setLayerMap] = React.useState<DxfLayerMap>({});

  const scaleNum = Math.max(0.001, Number(scale) || 1);
  const summary = doc ? summariseDxf(doc) : null;
  const skipped = doc ? Object.entries(doc.skipped) : [];
  const layerRows = doc ? dxfLayers(doc) : [];
  const included = doc ? doc.entities.filter((e) => layerMap[e.layer]?.include !== false).length : 0;

  const take = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onerror = () => setError("Could not read the file");
    reader.onload = () => {
      try {
        const parsed = parseDxf(String(reader.result));
        if (parsed.entities.length === 0) {
          setDoc(null);
          setError("No importable entities found (lines, polylines, circles, arcs or text).");
          return;
        }
        setDoc(parsed);
        setName(file.name);
        if (parsed.units !== "unknown") setUnit(parsed.units);
        // Every file layer starts included; the board's mechanical layer is the
        // sensible landing place for a mechanical drawing.
        const map: DxfLayerMap = {};
        for (const l of dxfLayers(parsed)) map[l.name] = { include: true, target: "outline" };
        setLayerMap(map);
      } catch {
        setDoc(null);
        setError("That file isn't readable as ASCII DXF");
      }
    };
    reader.readAsText(file);
  };

  // Preview straight off the parsed geometry, so it can't disagree with what
  // Confirm will place — excluded layers drop out of both together.
  const preview = React.useMemo(() => {
    if (!doc?.bbox) return null;
    const { minX, minY, maxX, maxY } = doc.bbox;
    const w = Math.max(1e-6, maxX - minX), h = Math.max(1e-6, maxY - minY);
    const pad = Math.max(w, h) * 0.04;
    const parts: string[] = [];
    const P = (x: number, y: number) => `${(x - minX + pad).toFixed(3)},${(maxY - y + pad).toFixed(3)}`;
    for (const e of doc.entities) {
      if (layerMap[e.layer]?.include === false) continue;
      if (e.type === "LINE") parts.push(`<line x1="${P(e.x1, e.y1).split(",")[0]}" y1="${P(e.x1, e.y1).split(",")[1]}" x2="${P(e.x2, e.y2).split(",")[0]}" y2="${P(e.x2, e.y2).split(",")[1]}" />`);
      else if (e.type === "POLYLINE") parts.push(`<polyline points="${e.pts.map((q) => P(q.x, q.y)).join(" ")}" fill="none" />`);
      else if (e.type === "CIRCLE") parts.push(`<circle cx="${(e.cx - minX + pad).toFixed(3)}" cy="${(maxY - e.cy + pad).toFixed(3)}" r="${e.r.toFixed(3)}" fill="none" />`);
      else if (e.type === "ARC") {
        const a1 = (e.a1 * Math.PI) / 180, a2 = (e.a2 * Math.PI) / 180;
        const pts: string[] = [];
        const span = a2 <= a1 ? a2 + Math.PI * 2 - a1 : a2 - a1;
        for (let i = 0; i <= 24; i++) {
          const t = a1 + (span * i) / 24;
          pts.push(P(e.cx + Math.cos(t) * e.r, e.cy + Math.sin(t) * e.r));
        }
        parts.push(`<polyline points="${pts.join(" ")}" fill="none" />`);
      } else if (e.type === "TEXT") {
        parts.push(`<circle cx="${(e.x - minX + pad).toFixed(3)}" cy="${(maxY - e.y + pad).toFixed(3)}" r="${(Math.max(w, h) * 0.006).toFixed(3)}" />`);
      }
    }
    const vw = (w + pad * 2).toFixed(3), vh = (h + pad * 2).toFixed(3);
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" stroke="var(--color-violet-600)" stroke-width="${(Math.max(w, h) * 0.004).toFixed(4)}" vector-effect="non-scaling-stroke">${parts.join("")}</svg>`, w, h };
  }, [doc, layerMap]);

  const sizePx = preview ? { w: preview.w * pxPerUnit(unit, scaleNum), h: preview.h * pxPerUnit(unit, scaleNum) } : null;

  const doImport = () => {
    if (!doc) return;
    // Targets only mean something on the board — schematic objects carry no layer.
    const layers: DxfLayerMap = {};
    for (const [k, v] of Object.entries(layerMap)) layers[k] = { include: v.include, target: state.mode === "schematic" ? undefined : v.target };
    // Prefix from the board's own size, so a second import can't reissue the
    // first one's ids.
    const objs = dxfToObjects(
      doc,
      { unit, scale: scaleNum, reference, at: { x: 260, y: 220 }, layers, strokeWidth: Math.max(0.2, Math.min(20, Number(strokeW) || 1.7)) },
      `dxf${state.objects.length}`,
    );
    if (objs.length === 0) { actions.flashToast("Nothing to import"); return; }
    const scoped = objs.map((o) => ({ ...o, scope: state.mode === "schematic" ? ("schematic" as const) : ("pcb" as const), sheetId: state.mode === "schematic" ? state.activeSheetId : undefined }));
    actions.addObjects(scoped);
    actions.flashToast(`Imported ${scoped.length} object${scoped.length === 1 ? "" : "s"} from ${name}`);
    actions.closeModal();
  };

  const field = (label: string, control: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", marginBottom: "var(--spacing-5)" }}>
      <span style={{ width: 132, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>{label}</span>
      {control}
    </div>
  );
  const val = (t: string) => <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}>{t}</span>;

  return (
    <Overlay>
      <Card width={940} maxHeight="90%" flexCol>
        <Header title="Import DXF" onClose={actions.closeModal} padding="18px 24px" />
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 320 }}>
          <div style={{ width: 400, flex: "0 0 auto", padding: "var(--spacing-7) var(--spacing-8)", overflowY: "auto", borderRight: "var(--border-width-1) solid var(--color-border-subtle)" }}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{ width: "100%", padding: "var(--spacing-6)", borderRadius: "var(--radius-lg)", border: `var(--border-width-1-5) dashed ${error ? "var(--color-text-error, #b3261e)" : "var(--color-border-default)"}`, background: "var(--color-bg-subtle)", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}
            >
              <div style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>
                {name || "Choose a .dxf file"}
              </div>
              <div style={{ marginTop: 2, fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
                ASCII DXF · lines, polylines, circles, arcs, text
              </div>
            </button>
            <input ref={fileRef} type="file" accept=".dxf,image/vnd.dxf,application/dxf" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) take(f); e.target.value = ""; }} />
            {error && <div style={{ marginTop: "var(--spacing-4)", fontSize: "var(--font-size-sm)", color: "var(--color-text-error, #b3261e)" }}>{error}</div>}

            {doc && summary && (
              <div style={{ marginTop: "var(--spacing-7)" }}>
                {field("Entities", val(Object.entries(summary.counts).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(" · ")))}
                {field("File unit", (
                  <div style={{ minWidth: 150 }}>
                    <DsSelect
                      value={unit}
                      options={[{ label: "Millimetres", value: "mm" }, { label: "Inches", value: "inch" }]}
                      onChange={(v) => setUnit(v as "mm" | "inch")}
                      minWidth={150}
                    />
                  </div>
                ))}
                {doc.units !== "unknown" && (
                  <div style={{ marginTop: -8, marginBottom: "var(--spacing-5)", marginLeft: 132, fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
                    File declares {doc.units === "mm" ? "millimetres" : "inches"} ($INSUNITS)
                  </div>
                )}
                {field("DXF size", val(`${preview!.w.toFixed(2)} × ${preview!.h.toFixed(2)} ${unit}`))}
                {field("Scale", (
                  <input
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                    style={{ width: 110, padding: "var(--spacing-3) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", fontFamily: "inherit", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none" }}
                  />
                ))}
                {field("Import size", val(sizePx ? `${Math.round(sizePx.w)} × ${Math.round(sizePx.h)} px` : "—"))}
                {field("Stroke width", (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-3)" }}>
                    <input
                      value={strokeW}
                      onChange={(e) => setStrokeW(e.target.value)}
                      style={{ width: 110, padding: "var(--spacing-3) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", fontFamily: "inherit", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none" }}
                    />
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>px</span>
                  </span>
                ))}
                {field("Reference point", (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-3)" }}>
                    {([["origin", "DXF origin"], ["center", "Graphics centre"]] as const).map(([k, l]) => (
                      <div key={k} onClick={() => setReference(k)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer" }}>
                        <Radio on={reference === k} />
                        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{l}</span>
                      </div>
                    ))}
                  </div>
                ))}
                {layerRows.length > 0 && (
                  <div style={{ marginTop: "var(--spacing-6)" }}>
                    <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "var(--spacing-4)" }}>
                      Layers <span style={{ fontWeight: 400, color: "var(--color-text-tertiary)" }}>— what to import{state.mode === "schematic" ? "" : " and where it lands"}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-3)" }}>
                      {layerRows.map((l) => {
                        const m = layerMap[l.name] ?? { include: true, target: "outline" };
                        return (
                          <div key={l.name} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", minHeight: 28 }}>
                            <span
                              onClick={() => setLayerMap((prev) => ({ ...prev, [l.name]: { ...m, include: !m.include } }))}
                              style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer", flex: 1, minWidth: 0 }}
                            >
                              <Check on={m.include} size={16} />
                              <span style={{ fontSize: "var(--font-size-sm)", color: m.include ? "var(--color-text-primary)" : "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</span>
                              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>{l.count}</span>
                            </span>
                            {state.mode !== "schematic" && (
                              <span style={{ opacity: m.include ? 1 : 0.45, pointerEvents: m.include ? "auto" : "none" }}>
                                <DsSelect
                                  value={m.target ?? "outline"}
                                  options={(state.pcbLayers ?? []).map((pl) => ({ label: pl.name, value: pl.id }))}
                                  onChange={(v) => setLayerMap((prev) => ({ ...prev, [l.name]: { ...m, target: v } }))}
                                  minWidth={140}
                                />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {skipped.length > 0 && (
                  <div style={{ marginTop: "var(--spacing-5)", padding: "var(--spacing-4) var(--spacing-5)", borderRadius: "var(--radius-md)", background: "var(--color-bg-subtle)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
                    Not imported: {skipped.map(([k, v]) => `${v} ${k.toLowerCase()}`).join(" · ")} — blocks, splines, dimensions and hatches aren&apos;t supported yet.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* preview — drawn from the parsed entities */}
          <div style={{ flex: 1, padding: "var(--spacing-8)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg-subtle)" }}>
            {preview ? (
              <div
                style={{ width: "100%", height: "100%", maxHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", background: "var(--color-bg-surface)", padding: "var(--spacing-5)" }}
                dangerouslySetInnerHTML={{ __html: preview.svg }}
              />
            ) : (
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", textAlign: "center", maxWidth: 260 }}>
                Pick a DXF to see what will be imported.
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--spacing-6) var(--spacing-8)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
            {doc
              ? included === 0
                ? "Every layer is excluded — nothing would be imported"
                : `Places ${included} of ${summary!.total} entit${summary!.total === 1 ? "y" : "ies"} as editable objects on the current ${state.mode === "schematic" ? "sheet" : "board"}`
              : ""}
          </span>
          <span style={{ display: "flex", gap: "var(--spacing-5)" }}>
            <Pill onClick={actions.closeModal}>Cancel</Pill>
            <PrimaryBtn onClick={doImport} style={{ opacity: doc && included > 0 ? 1 : 0.5, pointerEvents: doc && included > 0 ? "auto" : "none" }}>Import</PrimaryBtn>
          </span>
        </div>
      </Card>
    </Overlay>
  );
}


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
  const state = usePcbState();
  const actions = usePcbActions();
  // The dialog runs the converter as a dry run and lists what it found. Same
  // function the Confirm executes, so the list can't promise something else.
  const plan = React.useMemo(() => convertSchematicToPcb(state.objects), [state.objects]);
  const p = plan.plan;
  const cell: React.CSSProperties = {
    padding: "var(--spacing-3) var(--spacing-5)",
    fontSize: "var(--font-size-sm)",
    color: "var(--color-text-primary)",
    borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
    textAlign: "left",
  };
  const head: React.CSSProperties = {
    ...cell,
    fontWeight: 700,
    color: "var(--color-text-secondary)",
    position: "sticky",
    top: 0,
    background: "var(--color-bg-surface)",
  };
  const note = (text: React.ReactNode) => (
    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>{text}</div>
  );
  return (
    <Overlay>
      <Card width={560} maxHeight="86%" flexCol>
        <Header title="Convert schematic to PCB" onClose={actions.closeModal} padding="18px 22px" />

        <div style={{ padding: "var(--spacing-6) var(--spacing-12) var(--spacing-4)", flex: "0 0 auto", display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
            <b style={{ color: "var(--color-text-primary)" }}>{plan.parts} part{plan.parts === 1 ? "" : "s"}</b> get a land pattern on the board,
            connected by <b style={{ color: "var(--color-text-primary)" }}>{plan.airwires} airwire{plan.airwires === 1 ? "" : "s"}</b> across{" "}
            <b style={{ color: "var(--color-text-primary)" }}>{plan.nets} signal net{plan.nets === 1 ? "" : "s"}</b>.
          </div>
          {p.powerNets.length > 0 &&
            note(<>Power nets stay off the ratsnest: {p.powerNets.join(" · ")}. Pour or route them deliberately.</>)}
          {p.autoNamed > 0 &&
            note(<>{p.autoNamed} part{p.autoNamed === 1 ? " has" : "s have"} no designator, so the converter names {p.autoNamed === 1 ? "it" : "them"}. Annotate first if you want your own.</>)}
          {p.noFootprint.length > 0 &&
            note(
              <>
                No land pattern yet for {p.noFootprint.map((m) => `${m.count}× ${m.symbol}`).join(" · ")} — {p.noFootprint.length === 1 ? "it stays" : "they stay"} on the sheet.
              </>,
            )}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 var(--spacing-12)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={head}>Designator</th>
                <th style={head}>Symbol</th>
                <th style={head}>Footprint</th>
              </tr>
            </thead>
            <tbody>
              {p.rows.map((r, i) => (
                <tr key={`${r.designator}-${i}`}>
                  <td style={{ ...cell, fontWeight: 600 }}>{r.designator}</td>
                  <td style={{ ...cell, color: "var(--color-text-secondary)" }}>{r.symbol}</td>
                  <td style={{ ...cell, fontVariantNumeric: "tabular-nums" }}>{r.footprint}</td>
                </tr>
              ))}
              {p.rows.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ ...cell, textAlign: "center", color: "var(--color-text-tertiary)", padding: "var(--spacing-10)" }}>
                    Nothing to place — draw parts on the sheet first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-6) var(--spacing-12)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          {note("Tracks are not routed yet — Auto Route does that on the board.")}
          <span style={{ marginLeft: "auto", display: "flex", gap: "var(--spacing-5)" }}>
            <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
            <Button
              hierarchy="primary"
              size="md"
              disabled={p.rows.length === 0}
              onClick={() => { actions.closeModal(); actions.convertSchematicToPcb(); }}
            >
              Convert
            </Button>
          </span>
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

// ── Parts & Agile Module picker (Insert ▸ Place a Part) ──────────────────────
// Every control here queries the catalogue for real: the left rail switches
// between the built-in catalogue and lists derived from actual work (Recent
// placements, parts already on this board) or owned by the user (Favourites,
// Personal); the three attribute filters and the search box narrow the rows
// live. Placing records a Recent and drops the real symbol on the canvas.
const DEVICE_TABS = ["Parts", "Agile Module"];

function DevicePickerModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [tab, setTab] = React.useState(
    DEVICE_TABS.includes(state.pickerTab ?? "") ? (state.pickerTab as string) : DEVICE_TABS[0],
  );
  const [rail, setRail] = React.useState<PickerRail>("System");
  const [filters, setFilters] = React.useState<PartFilters>(NO_FILTERS);
  // localStorage-backed lists, read once when the dialog mounts (it only ever
  // mounts client-side, after the user opens it).
  const [favorites, setFavorites] = React.useState<string[]>(readFavorites);
  const [recents, setRecents] = React.useState<string[]>(readRecents);
  const [personal] = React.useState<string[]>(readPersonal);
  // Modules the user captured from a selection — read once on mount, same as
  // the other localStorage-backed lists.
  const [ownModules] = React.useState<PersonalModule[]>(readPersonalModules);

  const projectIds = React.useMemo(() => projectPartIds(state.objects), [state.objects]);
  const isModules = tab === "Agile Module";

  const railRows = React.useMemo(
    () => partsForRail(rail, { favorites, recents, personal, projectIds }),
    [rail, favorites, recents, personal, projectIds],
  );
  const parts = React.useMemo(() => filterParts(railRows, filters), [railRows, filters]);
  const modules = React.useMemo(
    () => filterModules([...MODULE_CATALOG, ...ownModules], filters),
    [filters, ownModules],
  );

  // Drop the object on the canvas near the centre, offset per placement.
  const placeOn = (fields: Partial<CanvasObject> & { kind: string }, note: string) => {
    let n = state.objects.length + 1;
    while (state.objects.some((o) => o.id === `obj_dp${n}`)) n++;
    const id = `obj_dp${n}`;
    const offset = (state.objects.length % 5) * 30;
    actions.merge({
      objects: [...state.objects, { id, x: 420 + offset, y: 300 + offset, ...fields } as CanvasObject],
      selectedIds: [id],
    });
    actions.flashToast(note);
    actions.closeModal();
  };

  const placePart = (p: CatalogPart) => {
    setRecents(pushRecent(p.id));
    placeOn({ kind: p.kind, text: p.part, footprint: p.pkg, comment: p.mfr }, `Placed ${p.part} (${p.pkg})`);
  };

  // A captured module really re-creates its objects; a catalogue module (which
  // has no geometry yet) lands as one reusable block carrying its name.
  const placeModule = (m: AgileModule) => {
    const own = ownModules.find((o) => o.id === m.id);
    if (own?.objects.length) {
      const base = state.objects.length;
      const dx = 420 + (base % 5) * 30, dy = 300 + (base % 5) * 30;
      const xs = own.objects.map((o) => Number(o.x) || 0), ys = own.objects.map((o) => Number(o.y) || 0);
      const ox = Math.min(...xs), oy = Math.min(...ys);
      const made = own.objects.map((o, i) => ({
        ...(o as Partial<CanvasObject>),
        id: `obj_mod${base + i + 1}`,
        x: dx + ((Number(o.x) || 0) - ox),
        y: dy + ((Number(o.y) || 0) - oy),
        endX: typeof o.endX === "number" ? dx + (o.endX - ox) : undefined,
        endY: typeof o.endY === "number" ? dy + (o.endY - oy) : undefined,
      })) as CanvasObject[];
      actions.merge({ objects: [...state.objects, ...made], selectedIds: made.map((o) => o.id) });
      actions.flashToast(`Placed ${m.name} — ${made.length} object${made.length === 1 ? "" : "s"}`);
      actions.closeModal();
      return;
    }
    placeOn({ kind: "reuseBlock", text: m.name, comment: m.summary }, `Placed ${m.name} (${m.parts.length} parts)`);
  };

  const star = (id: string) => setFavorites(toggleFavorite(id));

  const activeFilters = [filters.pkg, filters.mfr, filters.feature].filter(Boolean).length;
  const cellCss: React.CSSProperties = { padding: "var(--spacing-4) var(--spacing-5)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" };
  const headCss: React.CSSProperties = { ...cellCss, fontWeight: 700, color: "var(--color-text-secondary)", position: "sticky", top: 0, background: "var(--color-bg-surface)" };
  const selCss: React.CSSProperties = { minWidth: 148 };

  const filterSelect = (
    label: string,
    value: string,
    options: string[],
    onChange: (v: string) => void,
  ) => (
    <div key={label} style={selCss}>
      <DsSelect
        value={value}
        placeholder={label}
        options={[{ label: `All ${label.toLowerCase()}s`, value: "" }, ...options.map((o) => ({ label: o, value: o }))]}
        onChange={onChange}
        minWidth={148}
      />
    </div>
  );

  const emptyRow = (msg: string, cols: number) => (
    <tr>
      <td colSpan={cols} style={{ ...cellCss, textAlign: "center", color: "var(--color-text-tertiary)", padding: "var(--spacing-10)" }}>
        {msg}
      </td>
    </tr>
  );

  return (
    <Overlay>
      <Card width={980} maxHeight="88%" flexCol>
        <Header title="Parts &amp; Agile Module" onClose={actions.closeModal} padding="16px 22px" />
        <div style={{ padding: "var(--spacing-4) var(--spacing-8) 0", flex: "0 0 auto" }}>
          <ModalTabBar tabs={DEVICE_TABS} active={tab} onChange={setTab} />
        </div>
        <div style={{ padding: "var(--spacing-6) var(--spacing-8) var(--spacing-4)", flex: "0 0 auto" }}>
          <input
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder={isModules ? "Search modules…" : "Search part, manufacturer or feature…"}
            style={{ width: "100%", boxSizing: "border-box", padding: "var(--spacing-4) var(--spacing-6)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", marginTop: "var(--spacing-4)", flexWrap: "wrap" }}>
            {!isModules && filterSelect("Package", filters.pkg, packageOptions(), (v) => setFilters((f) => ({ ...f, pkg: v })))}
            {!isModules && filterSelect("Manufacturer", filters.mfr, manufacturerOptions(), (v) => setFilters((f) => ({ ...f, mfr: v })))}
            {filterSelect("Feature", filters.feature, featureOptions(), (v) => setFilters((f) => ({ ...f, feature: v })))}
            <span style={{ marginLeft: "auto", fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
              {activeFilters ? `${activeFilters} filter${activeFilters > 1 ? "s" : ""} on` : "Filters apply as you choose"}
            </span>
            <Pill onClick={() => setFilters(NO_FILTERS)}>Clear Filters</Pill>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* rail — real sources, not labels */}
          <div style={{ width: 150, flex: "0 0 auto", borderRight: "var(--border-width-1) solid var(--color-border-subtle)", overflowY: "auto", padding: "var(--spacing-3)" }}>
            {PICKER_RAILS.map((r) => {
              const count = partsForRail(r, { favorites, recents, personal, projectIds }).length;
              const on = rail === r;
              return (
                <div
                  key={r}
                  onClick={() => setRail(r)}
                  className="ix-row"
                  style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", padding: "var(--spacing-3) var(--spacing-5)", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--font-size-sm)", fontWeight: on ? 700 : 500, color: on ? "var(--color-text-brand)" : "var(--color-text-primary)", background: on ? "var(--color-bg-brand-subtle)" : "transparent", opacity: isModules ? 0.45 : 1, pointerEvents: isModules ? "none" : "auto" }}
                >
                  <span style={{ flex: 1 }}>{r}</span>
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>{count}</span>
                </div>
              );
            })}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {isModules ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...headCss, textAlign: "left" }}>Module</th>
                    <th style={{ ...headCss, textAlign: "left" }}>Contains</th>
                    <th style={{ ...headCss, textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((m) => (
                    <tr key={m.id}>
                      <td style={cellCss}>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>{m.summary}</div>
                      </td>
                      <td style={{ ...cellCss, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
                        {m.parts.join(" · ")}
                      </td>
                      <td style={{ ...cellCss, textAlign: "right" }}>
                        <Button hierarchy="primary" size="sm" onClick={() => placeModule(m)}>Place</Button>
                      </td>
                    </tr>
                  ))}
                  {modules.length === 0 && emptyRow("No modules match these filters.", 3)}
                </tbody>
              </table>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...headCss, width: 40 }}></th>
                    <th style={{ ...headCss, textAlign: "left" }}>Part</th>
                    <th style={{ ...headCss, textAlign: "left" }}>Package / Manufacturer</th>
                    <th style={{ ...headCss, textAlign: "left" }}>Price (5+)</th>
                    <th style={{ ...headCss, textAlign: "left" }}>Stock</th>
                    <th style={{ ...headCss, textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p) => {
                    const fav = favorites.includes(p.id);
                    return (
                      <tr key={p.id}>
                        <td style={{ ...cellCss, textAlign: "center" }}>
                          <span
                            role="button"
                            aria-label={fav ? `Remove ${p.part} from favourites` : `Add ${p.part} to favourites`}
                            aria-pressed={fav}
                            onClick={() => star(p.id)}
                            style={{ cursor: "pointer", display: "inline-flex", color: fav ? "var(--color-violet-600)" : "var(--color-text-tertiary)" }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden>
                              <path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z" />
                            </svg>
                          </span>
                        </td>
                        <td style={cellCss}>
                          <div>{p.part}</div>
                          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>{p.features.join(" · ")}</div>
                        </td>
                        <td style={cellCss}>{p.pkg} · {p.mfr}</td>
                        <td style={cellCss}>{p.price}</td>
                        <td style={cellCss}>{p.stock}</td>
                        <td style={{ ...cellCss, textAlign: "right" }}>
                          <Button hierarchy="primary" size="sm" onClick={() => placePart(p)}>Place</Button>
                        </td>
                      </tr>
                    );
                  })}
                  {parts.length === 0 &&
                    emptyRow(railRows.length === 0 ? RAIL_EMPTY[rail] : "No parts match these filters.", 6)}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-5) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
            {isModules ? `${modules.length} module${modules.length === 1 ? "" : "s"}` : `${parts.length} part${parts.length === 1 ? "" : "s"} in ${rail}`}
          </span>
          <Pill style={{ marginLeft: "auto" }} onClick={actions.closeModal}>Cancel</Pill>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Export BOM ───────────────────────────────────────────────────────────────
// The dialog's own configuration reaches the file: which columns, how they sort,
// and whether identical parts collapse into one line with a quantity. Before,
// the table was static decoration and the exporter always wrote the same five
// columns (Manufacturer permanently "-"), while picking XLSX still wrote CSV.
type BomColKey = "no" | "qty" | "designator" | "comment" | "value" | "footprint" | "package" | "layer" | "mpn" | "description";
const BOM_COLUMNS: { key: BomColKey; label: string; of: (o: CanvasObject) => string }[] = [
  { key: "no", label: "No.", of: () => "" },
  { key: "qty", label: "Qty", of: () => "1" },
  { key: "designator", label: "Designator", of: (o) => (o.text || "").trim() },
  { key: "comment", label: "Comment", of: (o) => (o.comment || "").trim() },
  { key: "value", label: "Value", of: (o) => String((o.props as Record<string, unknown> | undefined)?.value ?? (o.comment || "")).trim() },
  { key: "footprint", label: "Footprint", of: (o) => (o.footprint || "").trim() },
  { key: "package", label: "Package", of: (o) => String((o.props as Record<string, unknown> | undefined)?.package ?? o.footprint ?? "").trim() },
  { key: "layer", label: "Side", of: (o) => ((o.side ?? o.layer) === "bottom" ? "Bottom" : "Top") },
  { key: "mpn", label: "MPN / Supplier", of: (o) => String((o.props as Record<string, unknown> | undefined)?.mpn ?? "").trim() },
  { key: "description", label: "Description", of: (o) => String((o.props as Record<string, unknown> | undefined)?.manufacturer ?? "").trim() },
];
const BOM_COMPONENT_KINDS = new Set(["component", "resistor", "capacitor", "inductor", "diode", "ic", "connector", "resistorBox", "transistor", "opamp", "crystal", "fp0805", "fpSOD123", "fpSOT23", "fpSOIC8", "footprint"]);

function BomModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [cols, setCols] = React.useState<Record<BomColKey, boolean>>({
    no: true, qty: true, designator: true, comment: true, value: false,
    footprint: true, package: false, layer: true, mpn: false, description: false,
  });
  const [sortBy, setSortBy] = React.useState<BomColKey>("designator");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [groupSame, setGroupSame] = React.useState(true);
  const [fileName, setFileName] = React.useState("bom");
  const [fileType, setFileType] = React.useState<"CSV" | "TSV" | "JSON">("CSV");

  // One builder for the preview and the download, so the table on screen is
  // exactly the file (the old dialog previewed a hardcoded five-row table).
  const built = React.useMemo(() => {
    // `scope` defaults to "schematic" everywhere else (see CanvasObject), so
    // `(o.scope ?? "pcb") !== "schematic"` used to sweep unscoped schematic
    // parts into a board BOM — the opposite default from `collectPcbModel`,
    // which every other export uses. The BOM now lists the surface you're on:
    // the board's footprints on the board, the sheet's parts in the schematic.
    const wantPcb = state.mode !== "schematic";
    const comps = state.objects.filter(
      (o) => BOM_COMPONENT_KINDS.has(o.kind) && ((o.scope ?? "schematic") === "pcb") === wantPcb,
    );
    const active = BOM_COLUMNS.filter((c) => cols[c.key]);
    const keyOf = (o: CanvasObject) =>
      [BOM_COLUMNS.find((c) => c.key === "comment")!.of(o), o.footprint ?? "", BOM_COLUMNS.find((c) => c.key === "value")!.of(o)].join("|");
    type Line = { cells: Record<string, string>; qty: number; designators: string[] };
    const lines: Line[] = [];
    if (groupSame) {
      const byKey = new Map<string, Line>();
      for (const o of comps) {
        const k = keyOf(o);
        const found = byKey.get(k);
        const des = BOM_COLUMNS.find((c) => c.key === "designator")!.of(o);
        if (found) { found.qty += 1; if (des) found.designators.push(des); continue; }
        const cells: Record<string, string> = {};
        for (const c of BOM_COLUMNS) cells[c.key] = c.of(o);
        const line: Line = { cells, qty: 1, designators: des ? [des] : [] };
        byKey.set(k, line);
        lines.push(line);
      }
    } else {
      for (const o of comps) {
        const cells: Record<string, string> = {};
        for (const c of BOM_COLUMNS) cells[c.key] = c.of(o);
        const des = cells.designator;
        lines.push({ cells, qty: 1, designators: des ? [des] : [] });
      }
    }
    for (const l of lines) {
      l.cells.qty = String(l.qty);
      if (groupSame && l.designators.length) l.cells.designator = l.designators.sort().join(", ");
    }
    const dir = sortDir === "asc" ? 1 : -1;
    lines.sort((a, b) => {
      const av = a.cells[sortBy] ?? "", bv = b.cells[sortBy] ?? "";
      const an = parseFloat(av), bn = parseFloat(bv);
      if (Number.isFinite(an) && Number.isFinite(bn) && String(an) === av.trim() && String(bn) === bv.trim()) return (an - bn) * dir;
      return av.localeCompare(bv, undefined, { numeric: true }) * dir;
    });
    lines.forEach((l, i) => { l.cells.no = String(i + 1); });
    return { active, lines, parts: comps.length, from: wantPcb ? "board" : "schematic" };
  }, [state.objects, state.mode, cols, sortBy, sortDir, groupSame]);

  const download = () => {
    const head = built.active.map((c) => c.label);
    const rows = built.lines.map((l) => built.active.map((c) => l.cells[c.key] ?? ""));
    const base = (fileName || "bom").replace(/\.(csv|tsv|json)$/i, "");
    if (fileType === "JSON") {
      const objs = built.lines.map((l) => Object.fromEntries(built.active.map((c) => [c.label, l.cells[c.key] ?? ""])));
      downloadBlob(`${base}.json`, JSON.stringify(objs, null, 2), "application/json");
    } else if (fileType === "TSV") {
      downloadBlob(`${base}.tsv`, [head, ...rows].map((r) => r.join("\t")).join("\n"), "text/tab-separated-values");
    } else {
      const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
      downloadBlob(`${base}.csv`, [head, ...rows].map((r) => r.map(esc).join(",")).join("\n"), "text/csv");
    }
    actions.flashToast(built.lines.length ? `Exported ${built.lines.length} BOM line${built.lines.length > 1 ? "s" : ""} (${fileType})` : "Exported BOM — no components on the board yet");
    actions.closeModal();
  };

  const cellCss: React.CSSProperties = { padding: "var(--spacing-3) var(--spacing-5)", fontSize: "var(--font-size-xs)", color: "var(--color-text-primary)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)", textAlign: "left", whiteSpace: "nowrap" };
  const labelCss: React.CSSProperties = { width: 110, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" };
  const row = (n: string, node: React.ReactNode) => (
    <div key={n} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
      <span style={labelCss}>{n}</span>
      <div style={{ flex: 1 }}>{node}</div>
    </div>
  );

  return (
    <Overlay>
      <Card width={860} maxHeight="90%" flexCol>
        <Header title="Export BOM" onClose={actions.closeModal} padding="16px 22px" />
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-8) var(--spacing-10) var(--spacing-4)", display: "flex", flexDirection: "column", gap: "var(--spacing-6)" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
            {built.parts
              ? `${built.parts} part${built.parts > 1 ? "s" : ""} on the ${built.from} → ${built.lines.length} line${built.lines.length > 1 ? "s" : ""}${groupSame ? " (identical parts grouped)" : ""}.`
              : built.from === "board"
              ? "No components on the board yet — convert the schematic or place parts first."
              : "No components on this schematic yet — place parts first."}
          </div>
          <div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-4)" }}>Columns</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-4) var(--spacing-6)" }}>
              {BOM_COLUMNS.map((c) => (
                <div key={c.key} onClick={() => setCols((s) => ({ ...s, [c.key]: !s[c.key] }))} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer", minWidth: 130 }}>
                  <Check on={cols[c.key]} /><span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
          {row("Sort by", (
            <div style={{ display: "flex", gap: "var(--spacing-5)" }}>
              <div style={{ minWidth: 170 }}>
                <DsSelect value={sortBy} options={BOM_COLUMNS.filter((c) => c.key !== "no").map((c) => ({ label: c.label, value: c.key }))} onChange={(v) => setSortBy(v as BomColKey)} minWidth={170} />
              </div>
              <div style={{ minWidth: 140 }}>
                <DsSelect value={sortDir} options={[{ label: "Ascending", value: "asc" }, { label: "Descending", value: "desc" }]} onChange={(v) => setSortDir(v as "asc" | "desc")} minWidth={140} />
              </div>
            </div>
          ))}
          <div onClick={() => setGroupSame((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer" }}>
            <Check on={groupSame} /><span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Group identical parts into one line with a quantity</span>
          </div>
          {row("File Name", <input value={fileName} onChange={(e) => setFileName(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "var(--spacing-4) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }} />)}
          {row("Format", <DsSelect value={fileType} options={[{ label: "CSV", value: "CSV" }, { label: "TSV", value: "TSV" }, { label: "JSON", value: "JSON" }]} onChange={(v) => setFileType(v as "CSV" | "TSV" | "JSON")} />)}
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
            XLSX is deliberately absent — writing a real workbook needs a library we don&#39;t bundle, and labelling CSV as XLSX would be a lie. CSV opens in Excel and Sheets.
          </div>
          <div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-4)" }}>Preview — this is the file</div>
            <div style={{ overflowX: "auto", border: "var(--border-width-1) solid var(--color-border-subtle)", borderRadius: "var(--radius-md)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{built.active.map((c) => <th key={c.key} style={{ ...cellCss, fontWeight: 700, color: "var(--color-text-secondary)", background: "var(--color-bg-subtle)" }}>{c.label}</th>)}</tr>
                </thead>
                <tbody>
                  {built.lines.slice(0, 8).map((l, i) => (
                    <tr key={i}>{built.active.map((c) => <td key={c.key} style={cellCss}>{l.cells[c.key] || "—"}</td>)}</tr>
                  ))}
                  {built.lines.length === 0 && (
                    <tr><td style={{ ...cellCss, color: "var(--color-text-tertiary)" }} colSpan={Math.max(1, built.active.length)}>Nothing to list yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {built.lines.length > 8 && (
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: "var(--spacing-3)" }}>
                + {built.lines.length - 8} more line{built.lines.length - 8 > 1 ? "s" : ""} in the file.
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-6) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto", flexWrap: "wrap" }}>
          <Pill onClick={() => { actions.closeModal(); actions.openManager("device"); }}>Device Standardization</Pill>
          <div style={{ marginLeft: "auto", display: "flex", gap: "var(--spacing-4)" }}>
            <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
            <Button hierarchy="primary" size="md" disabled={!built.active.length} onClick={download}>Export BOM</Button>
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
  const sel = state.selectedIds.length;
  const [range, setRange] = React.useState<"board" | "selection">("board");
  const [fileName, setFileName] = React.useState("board.dxf");
  const [unit, setUnit] = React.useState<"mm" | "inch">("mm");
  const [scale, setScale] = React.useState("1");
  const [inc, setInc] = React.useState({ outline: true, tracks: true, pads: true, vias: true, comps: true });
  const [side, setSide] = React.useState<"both" | "top" | "bottom">("both");
  const labelCss: React.CSSProperties = { width: 110, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" };
  const row = (n: string, node: React.ReactNode) => (
    <div key={n} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
      <span style={labelCss}>{n}</span>
      <div style={{ flex: 1 }}>{node}</div>
    </div>
  );
  const check = (on: boolean, text: string, onClick: () => void) => (
    <div key={text} onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer", minWidth: 118 }}>
      <Check on={on} /><span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{text}</span>
    </div>
  );
  // What the file will hold, counted from the model the export will build.
  const model = React.useMemo(
    () => collectPcbModel(state, { onlySelected: range === "selection" }),
    [state, range],
  );
  const counts = [
    inc.outline ? `outline${model.cutouts.length ? ` + ${model.cutouts.length} cutout${model.cutouts.length > 1 ? "s" : ""}` : ""}` : null,
    inc.tracks && model.tracks.length ? `${model.tracks.length} track${model.tracks.length > 1 ? "s" : ""}` : null,
    inc.pads && model.pads.length ? `${model.pads.length} pad${model.pads.length > 1 ? "s" : ""}` : null,
    inc.vias && model.vias.length ? `${model.vias.length} via${model.vias.length > 1 ? "s" : ""}` : null,
    inc.comps && model.comps.length ? `${model.comps.length} component outline${model.comps.length > 1 ? "s" : ""}` : null,
  ].filter(Boolean);
  const nothing = counts.length === 0;
  return (
    <Overlay>
      <Card width={520} maxHeight="88%" flexCol>
        <Header title="Export DXF" onClose={actions.closeModal} padding="16px 22px" />
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-9) var(--spacing-10)", display: "flex", flexDirection: "column", gap: "var(--spacing-7)" }}>
          {row("Range", <DsSelect value={range} options={[{ label: "Whole board", value: "board" }, { label: sel ? `Selection (${sel})` : "Selection — nothing selected", value: "selection" }]} onChange={(v) => setRange(v as "board" | "selection")} />)}
          {row("File Name", <input value={fileName} onChange={(e) => setFileName(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "var(--spacing-4) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }} />)}
          {row("Units", <DsSelect value={unit} options={[{ label: "Millimetres", value: "mm" }, { label: "Inches", value: "inch" }]} onChange={(v) => setUnit(v as "mm" | "inch")} />)}
          {row("Scale", <NumberInput value={scale} onChange={setScale} min={0.01} />)}
          {row("Copper side", <DsSelect value={side} options={[{ label: "Both sides", value: "both" }, { label: "Top only", value: "top" }, { label: "Bottom only", value: "bottom" }]} onChange={(v) => setSide(v as "both" | "top" | "bottom")} />)}
          <div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-4)" }}>Include</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-5) var(--spacing-6)" }}>
              {check(inc.outline, "Board outline", () => setInc((c) => ({ ...c, outline: !c.outline })))}
              {check(inc.tracks, "Tracks", () => setInc((c) => ({ ...c, tracks: !c.tracks })))}
              {check(inc.pads, "Pads", () => setInc((c) => ({ ...c, pads: !c.pads })))}
              {check(inc.vias, "Vias + drills", () => setInc((c) => ({ ...c, vias: !c.vias })))}
              {check(inc.comps, "Component outlines", () => setInc((c) => ({ ...c, comps: !c.comps })))}
            </div>
          </div>
          <div style={{ fontSize: "var(--font-size-sm)", color: nothing ? "var(--color-text-tertiary)" : "var(--color-text-secondary)", lineHeight: 1.5 }}>
            {nothing ? "Nothing selected to export — tick at least one layer." : `Will write ${counts.join(" · ")} in ${unit === "inch" ? "inches" : "mm"}${Number(scale) !== 1 ? ` at ${scale}×` : ""}.`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="primary" size="md" disabled={nothing} onClick={() => {
            const name = fileName.replace(/\.dxf$/i, "") || "board";
            downloadBlob(`${name}.dxf`, buildDxf(model, { unit, scale: Number(scale) || 1, include: { ...inc, side } }), "application/dxf");
            actions.flashToast(`Exported ${name}.dxf — ${counts.join(" · ")}`);
            actions.closeModal();
          }}>Export</Button>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Export Document / PDF·PNG·SVG (Popup 13) ─────────────────────────────────
function DocumentModal() {
  const actions = usePcbActions();
  const state = usePcbState();
  const sel = state.selectedIds.length;
  const [fileType, setFileType] = React.useState<"PDF" | "PNG" | "SVG">("PDF");
  const [theme, setTheme] = React.useState<"default" | "whiteOnBlack" | "blackOnWhite">("default");
  const [hairline, setHairline] = React.useState(false);
  const [range, setRange] = React.useState<"board" | "selection">("board");
  const [output, setOutput] = React.useState<"merged" | "perSide">("merged");
  const [fileName, setFileName] = React.useState("board");
  const model = React.useMemo(
    () => collectPcbModel(state, { onlySelected: range === "selection" }),
    [state, range],
  );
  const themeLabel = { default: "Board colours", whiteOnBlack: "White on black", blackOnWhite: "Black on white" } as const;

  const write = async (side: "both" | "top" | "bottom", suffix: string) => {
    const opts = { theme, hairline, include: { side } } as const;
    const base = (fileName || "board").replace(/\.(pdf|png|svg)$/i, "") + suffix;
    if (fileType === "SVG") downloadBlob(`${base}.svg`, buildSvg(model, opts), "image/svg+xml");
    else if (fileType === "PNG") {
      const png = await rasterizeSvgToPng(buildSvg(model, opts), model.boardWmm + 8, model.boardHmm + 8);
      downloadDataUrl(`${base}.png`, png);
    } else downloadBlob(`${base}.pdf`, buildPdf(model, opts), "application/pdf");
  };

  const rowSeg = <T extends string>(name: string, options: { label: string; value: T }[], value: T, onChange: (v: T) => void) => (
    <div key={name} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)" }}>
      <span style={{ width: 120, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>{name}</span>
      <div style={{ display: "flex", gap: "var(--spacing-7)", flexWrap: "wrap" }}>
        {options.map((o) => (
          <div key={o.value} onClick={() => onChange(o.value)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer" }}>
            <Radio on={value === o.value} /><span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{o.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Overlay>
      <Card width={580} maxHeight="90%" flexCol>
        <Header title="Export Document" onClose={actions.closeModal} padding="16px 22px" />
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-9) var(--spacing-10)", display: "flex", flexDirection: "column", gap: "var(--spacing-7)" }}>
          {rowSeg("File Type", [{ label: "PDF", value: "PDF" as const }, { label: "PNG", value: "PNG" as const }, { label: "SVG", value: "SVG" as const }], fileType, setFileType)}
          {rowSeg("Theme", [{ label: "Board colours", value: "default" as const }, { label: "White on black", value: "whiteOnBlack" as const }, { label: "Black on white", value: "blackOnWhite" as const }], theme, setTheme)}
          {rowSeg("Line Width", [{ label: "True widths", value: false as unknown as string }, { label: "Hairline", value: true as unknown as string }] as { label: string; value: string }[], (hairline ? true : false) as unknown as string, (v) => setHairline(Boolean(v)))}
          {rowSeg("Range", [{ label: "Whole board", value: "board" as const }, { label: sel ? `Selection (${sel})` : "Selection — nothing selected", value: "selection" as const }], range, setRange)}
          {rowSeg("Output", [{ label: "One sheet", value: "merged" as const }, { label: "One file per side", value: "perSide" as const }], output, setOutput)}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
            <span style={{ width: 120, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>File Name</span>
            <input value={fileName} onChange={(e) => setFileName(e.target.value)} style={{ flex: 1, padding: "var(--spacing-4) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }} />
          </div>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            {`${output === "perSide" ? "Two files" : "One file"} · ${themeLabel[theme]} · ${hairline ? "hairline strokes" : "true copper widths"} · ${model.tracks.length} track${model.tracks.length === 1 ? "" : "s"}, ${model.comps.length} component${model.comps.length === 1 ? "" : "s"}.`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Pill style={{ marginLeft: "auto" }} onClick={() => {
            const url = URL.createObjectURL(buildPdf(model, { theme, hairline }));
            window.open(url, "_blank");
            window.setTimeout(() => URL.revokeObjectURL(url), 8000);
          }}>Print</Pill>
          <Button hierarchy="primary" size="md" onClick={async () => {
            if (output === "perSide") { await write("top", "-top"); await write("bottom", "-bottom"); }
            else await write("both", "");
            actions.flashToast(`Exported ${fileType}${output === "perSide" ? " — top + bottom" : ""}`);
            actions.closeModal();
          }}>Export</Button>
        </div>
      </Card>
    </Overlay>
  );
}

// UIUX-67 + UIUX-65 — the schematic sheet's own export dialog. The board's
// DocumentModal exports the PCB model; this one captures the live sheet, so
// PDF · PNG · SVG all leave from one home. Two panes: calibration left, a live
// preview right that renders the very capture the export writes. Range picks
// this sheet, the current selection (content-cropped), or every sheet — the
// all-sheets runner walks the real sheets (gotoSheet → render → capture) and
// restores where you were.
function SheetExportModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [fmt, setFmt] = React.useState<"PDF" | "PNG" | "SVG">("PDF");
  const [frame, setFrame] = React.useState(true);
  const [ink, setInk] = React.useState<"asDrawn" | "print">("asDrawn");
  const [detail, setDetail] = React.useState<1 | 2 | 3>(2);
  const [range, setRange] = React.useState<"sheet" | "selection" | "all">("sheet");
  const [busy, setBusy] = React.useState(false);
  const [preview, setPreview] = React.useState<SchemCapture | null>(null);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "sheet";
  const firstSheetId = state.schematicSheets[0]?.id;
  const sheet = state.schematicSheets.find((s) => s.id === state.activeSheetId) ?? state.schematicSheets[0];
  const onSheet = (sheetId: string | undefined) =>
    state.objects.filter((o) => o.scope !== "pcb" && (o.sheetId ?? firstSheetId) === (sheetId ?? firstSheetId));
  const sheetCount = onSheet(sheet?.id).length;
  const selCount = state.selectedIds.length;
  const allCount = state.objects.filter((o) => o.scope !== "pcb").length;
  const sheetsN = state.schematicSheets.length;
  const rangeCount = range === "selection" ? selCount : range === "all" ? allCount : sheetCount;
  const { activeProject } = useManualProjects();
  // The default filename names what the range exports — the sheet for a
  // single-sheet export, the project for the all-sheets set (`sheet-1-sheet-1`
  // was the default naming itself twice). A hand-edited name is left alone.
  const [customName, setCustomName] = React.useState<string | null>(null);
  const fileName = customName ?? (range === "all" ? slugify(activeProject?.name ?? "sheets") : slugify(sheet?.name ?? "sheet"));

  // Selection export crops to the picked objects — a full sheet frame around a
  // detail crop would be a lie about what the file contains.
  const effFrame = frame && range !== "selection";
  const capOpts = React.useMemo(
    () => ({ includeFrame: effFrame, ink, onlyIds: range === "selection" && selCount > 0 ? state.selectedIds : undefined }),
    [effFrame, ink, range, selCount, state.selectedIds],
  );

  // The preview IS the capture the export writes (for All sheets: the active
  // sheet, since the others aren't in the DOM until the runner visits them).
  // Captured after paint (rAF) — the capture reads the live canvas DOM.
  React.useEffect(() => {
    let live = true;
    const raf = requestAnimationFrame(() => {
      if (live) setPreview(rangeCount === 0 ? null : captureSchematicSvg(capOpts));
    });
    return () => { live = false; cancelAnimationFrame(raf); };
  }, [capOpts, rangeCount]);

  const nextFrames = (n: number) =>
    new Promise<void>((resolve) => {
      const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
      step(n);
    });

  // Walk every sheet for real: switch, let the canvas render, capture, move on
  // — then put the user back on their sheet with their selection.
  const captureAllSheets = async (): Promise<Array<{ cap: SchemCapture; name: string }>> => {
    const origSheet = state.activeSheetId;
    const origSel = state.selectedIds;
    const out: Array<{ cap: SchemCapture; name: string }> = [];
    for (const sh of state.schematicSheets) {
      actions.gotoSheet(sh.id);
      await nextFrames(3);
      const cap = captureSchematicSvg({ includeFrame: effFrame, ink });
      if (cap) out.push({ cap, name: sh.name });
    }
    actions.gotoSheet(origSheet);
    await nextFrames(2);
    if (origSel.length) actions.selectMany(origSel);
    return out;
  };

  const buildPdfBlob = async (): Promise<Blob | null> => {
    if (range === "all") {
      const pages = await captureAllSheets();
      return pages.length ? buildSheetPdf(pages.map((p) => p.cap), detail) : null;
    }
    const cap = captureSchematicSvg(capOpts);
    return cap ? buildSheetPdf([cap], detail) : null;
  };

  const doExport = async () => {
    if (busy) return;
    const base = (fileName || "sheet").replace(/\.(pdf|png|svg)$/i, "").slice(0, 60);
    setBusy(true);
    try {
      if (range === "all" && fmt !== "PDF") {
        // One file per sheet; a multi-page PNG/SVG doesn't exist.
        const pages = await captureAllSheets();
        if (!pages.length) { actions.flashToast("Nothing on any sheet to export"); return; }
        for (const p of pages) {
          const name = `${base}-${slugify(p.name)}`;
          if (fmt === "SVG") downloadBlob(`${name}.svg`, p.cap.svg, "image/svg+xml");
          else downloadDataUrl(`${name}.png`, await rasterizeToPng(p.cap.svg, p.cap.width, p.cap.height, detail));
        }
        const skipped = sheetsN - pages.length;
        actions.flashToast(`Exported ${pages.length} sheet${pages.length === 1 ? "" : "s"} as ${fmt}${skipped ? ` — ${skipped} empty sheet${skipped === 1 ? "" : "s"} skipped` : ""}`);
      } else if (fmt === "PDF") {
        const blob = await buildPdfBlob();
        if (!blob) { actions.flashToast("Nothing to export"); return; }
        downloadBlob(`${base}.pdf`, blob, "application/pdf");
        actions.flashToast(range === "all" ? `Exported ${base}.pdf — one page per sheet` : `Exported ${base}.pdf`);
      } else {
        const cap = captureSchematicSvg(capOpts);
        if (!cap) { actions.flashToast("Nothing to export"); return; }
        if (fmt === "SVG") downloadBlob(`${base}.svg`, cap.svg, "image/svg+xml");
        else downloadDataUrl(`${base}.png`, await rasterizeToPng(cap.svg, cap.width, cap.height, detail));
        actions.flashToast(`Exported ${base}.${fmt.toLowerCase()}`);
      }
      actions.closeModal();
    } catch {
      actions.flashToast(`${fmt} export failed`);
    } finally {
      setBusy(false);
    }
  };

  const rowSeg = <T extends string>(name: string, options: { label: string; value: T; off?: boolean }[], value: T, onChange: (v: T) => void, muted?: boolean) => (
    <div key={name} style={{ display: "flex", alignItems: "flex-start", gap: "var(--spacing-8)", opacity: muted ? 0.45 : 1, pointerEvents: muted ? "none" : "auto" }} aria-disabled={muted || undefined}>
      <span style={{ width: 104, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "20px" }}>{name}</span>
      <div style={{ display: "flex", gap: "var(--spacing-4) var(--spacing-7)", flexWrap: "wrap" }}>
        {options.map((o) => (
          <div key={o.value} onClick={o.off ? undefined : () => onChange(o.value)} aria-disabled={o.off || undefined} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: o.off ? "default" : "pointer", opacity: o.off ? 0.45 : 1 }}>
            <Radio on={value === o.value} /><span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>{o.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const summary = rangeCount === 0
    ? range === "selection"
      ? "Nothing selected — select objects on the sheet to export a detail."
      : "Nothing to export yet — place symbols or wires first."
    : range === "all"
    ? `All sheets · ${sheetsN} sheet${sheetsN === 1 ? "" : "s"} · ${allCount} objects · ${effFrame ? "frame & title block" : "content only"}${fmt === "PDF" ? " · one page per sheet" : ` · one ${fmt} per sheet`}`
    : `${range === "selection" ? `Selection · ${selCount}` : `${sheet?.name ?? "Sheet"} · ${state.schemBorder.size} ${state.schemBorder.orientation} · ${sheetCount}`} object${rangeCount === 1 ? "" : "s"} · ${effFrame ? "frame & title block" : range === "selection" ? "cropped to the selection" : "content only"}${fmt !== "SVG" ? ` · ${detail}×` : ""}${ink === "print" ? " · black on white" : ""}`;

  const previewUrl = preview ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(preview.svg)}` : null;

  return (
    <Overlay>
      <Card width={960} maxHeight="90%" flexCol>
        <Header title="Export Sheet" onClose={actions.closeModal} padding="16px 22px" />
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 340 }}>
          <div style={{ width: 420, flex: "0 0 auto", padding: "var(--spacing-8) var(--spacing-9)", overflowY: "auto", borderRight: "var(--border-width-1) solid var(--color-border-subtle)", display: "flex", flexDirection: "column", gap: "var(--spacing-7)" }}>
            {rowSeg("Format", [{ label: "PDF", value: "PDF" as const }, { label: "PNG", value: "PNG" as const }, { label: "SVG", value: "SVG" as const }], fmt, setFmt)}
            {rowSeg("Range", [
              { label: "This sheet", value: "sheet" as const },
              { label: selCount ? `Selection (${selCount})` : "Selection — nothing selected", value: "selection" as const, off: selCount === 0 },
              { label: `All sheets (${sheetsN})`, value: "all" as const },
            ], range, setRange)}
            {rowSeg("Ink", [{ label: "As drawn (editor colours)", value: "asDrawn" as const }, { label: "Black on white (print)", value: "print" as const }], ink, setInk)}
            {rowSeg("Detail", [{ label: "1×", value: "1" as const }, { label: "2×", value: "2" as const }, { label: "3×", value: "3" as const }], String(detail) as "1" | "2" | "3", (v) => setDetail(Number(v) as 1 | 2 | 3), fmt === "SVG")}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)", opacity: range === "selection" ? 0.45 : 1, pointerEvents: range === "selection" ? "none" : "auto" }} aria-disabled={range === "selection" || undefined}>
              <span style={{ width: 104, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>Sheet frame</span>
              <div onClick={() => setFrame((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer" }}>
                <Check on={effFrame} size={18} />
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Include the frame & title block</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
              <span style={{ width: 104, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>File Name</span>
              <input value={fileName} onChange={(e) => setCustomName(e.target.value)} style={{ flex: 1, padding: "var(--spacing-4) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }} />
            </div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{summary}</div>
            {fmt === "SVG" && (
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>SVG is vector — Detail doesn&apos;t apply.</div>
            )}
            {range === "selection" && (
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>A selection exports as a crop — the sheet frame doesn&apos;t apply.</div>
            )}
          </div>

          {/* live preview — rendered from the same capture the export writes */}
          <div style={{ flex: 1, padding: "var(--spacing-8)", display: "flex", flexDirection: "column", gap: "var(--spacing-4)", background: "var(--color-bg-subtle)", minWidth: 0 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", background: "var(--color-bg-surface)", padding: "var(--spacing-5)", overflow: "hidden" }}>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local data: URI preview
                <img src={previewUrl} alt="Export preview" style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }} />
              ) : (
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", textAlign: "center", maxWidth: 280 }}>
                  {range === "selection" ? "Select something on the sheet to preview the crop." : "Nothing to preview yet."}
                </span>
              )}
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", textAlign: "center" }}>
              {preview
                ? range === "all"
                  ? `Previewing ${sheet?.name ?? "the open sheet"} — every sheet exports${busy ? " · exporting…" : ""}`
                  : `${preview.width} × ${preview.height} px${fmt !== "SVG" ? ` · ${preview.width * detail} × ${preview.height * detail} at ${detail}×` : ""}`
                : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Pill style={{ marginLeft: "auto", ...(rangeCount === 0 || busy ? { opacity: 0.45, pointerEvents: "none" } : null) }} onClick={async () => {
            if (busy) return;
            setBusy(true);
            try {
              const blob = await buildPdfBlob();
              if (!blob) { actions.flashToast("Nothing to export"); return; }
              const url = URL.createObjectURL(blob);
              window.open(url, "_blank");
              window.setTimeout(() => URL.revokeObjectURL(url), 8000);
            } finally {
              setBusy(false);
            }
          }}>Print</Pill>
          <Button hierarchy="primary" size="md" disabled={rangeCount === 0 || busy} onClick={doExport}>{busy ? "Exporting…" : "Export"}</Button>
        </div>
      </Card>
    </Overlay>
  );
}

// Import Image — Project ▸ Import ▸ Image… had no dialog at all (a toast on the
// schematic side, a picture-frame glyph on the board). This reads a real file,
// optionally reduces it to 1-bit silkscreen ink, and places a real image object.
function ImportImageModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [name, setName] = React.useState("");
  const [src, setSrc] = React.useState<string | null>(null);
  const [nat, setNat] = React.useState<{ w: number; h: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [w, setW] = React.useState(160);
  const [h, setH] = React.useState(120);
  const [lock, setLock] = React.useState(true);
  const [layer, setLayer] = React.useState("topSilk");
  const [mono, setMono] = React.useState(false);
  const [threshold, setThreshold] = React.useState(128);
  const [invert, setInvert] = React.useState(false);

  const layers = (state.pcbLayers ?? []).map((l) => ({ label: l.name, value: l.id }));
  const label: React.CSSProperties = { width: 120, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" };
  const row = (n: string, node: React.ReactNode) => (
    <div key={n} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
      <span style={label}>{n}</span>
      <div style={{ flex: 1 }}>{node}</div>
    </div>
  );

  const take = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onerror = () => setError("Could not read that file");
    reader.onload = () => {
      const url = String(reader.result);
      const img = new window.Image();
      img.onload = () => {
        setSrc(url);
        setName(file.name);
        setNat({ w: img.naturalWidth, h: img.naturalHeight });
        // Land at a sane board size: 160 px wide, height from the real aspect.
        const ratio = img.naturalHeight / Math.max(1, img.naturalWidth);
        setW(160);
        setH(Math.max(4, Math.round(160 * ratio)));
      };
      img.onerror = () => setError("That file isn't an image the browser can decode");
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const ratio = nat ? nat.h / Math.max(1, nat.w) : 0.75;
  const setWidth = (v: number) => { setW(v); if (lock) setH(Math.max(4, Math.round(v * ratio))); };
  const setHeight = (v: number) => { setH(v); if (lock) setW(Math.max(4, Math.round(v / (ratio || 0.75)))); };

  // 1-bit reduction for silkscreen: luminance vs threshold, ink kept opaque and
  // everything else transparent, so the board shows through.
  const toMono = (url: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const cv = document.createElement("canvas");
        cv.width = img.naturalWidth;
        cv.height = img.naturalHeight;
        const ctx = cv.getContext("2d");
        if (!ctx) { resolve(url); return; }
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, cv.width, cv.height);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          const lum = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
          const ink = invert ? lum > threshold : lum <= threshold;
          px[i] = px[i + 1] = px[i + 2] = 255;
          px[i + 3] = ink ? 255 : 0;
        }
        ctx.putImageData(data, 0, 0);
        resolve(cv.toDataURL("image/png"));
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });

  const place = async () => {
    if (!src) return;
    const finalSrc = mono ? await toMono(src) : src;
    const bw = state.pcbBoard?.width && state.pcbBoard.width > 0 ? state.pcbBoard.width : 720;
    const bh = state.pcbBoard?.height && state.pcbBoard.height > 0 ? state.pcbBoard.height : 480;
    actions.addObjects([
      {
        id: `img_${Date.now().toString(36)}`,
        kind: "image",
        x: Math.round(60 + bw / 2),
        y: Math.round(60 + bh / 2),
        rotation: 0,
        scope: "pcb",
        layer,
        width: w,
        height: h,
        props: { src: finalSrc, name, mono, threshold, invert, natW: nat?.w ?? 0, natH: nat?.h ?? 0 },
      },
    ]);
    actions.flashToast(`Placed ${name || "image"} on ${layers.find((l) => l.value === layer)?.label ?? layer}`);
    actions.closeModal();
  };

  return (
    <Overlay>
      <Card width={560} maxHeight="90%" flexCol>
        <Header title="Import image" onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-9) var(--spacing-12)", display: "flex", flexDirection: "column", gap: "var(--spacing-7)" }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) take(f); }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
            <Pill onClick={() => fileRef.current?.click()}>Choose file…</Pill>
            <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: src ? "var(--color-text-primary)" : "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {src ? `${name} · ${nat?.w ?? 0} × ${nat?.h ?? 0} px` : "PNG · JPG · SVG · WebP"}
            </span>
          </div>
          {error && <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-error)" }}>{error}</div>}
          {src && (
            <div style={{ display: "flex", gap: "var(--spacing-8)" }}>
              <div style={{ width: 150, height: 110, flex: "0 0 auto", border: "var(--border-width-1) solid var(--color-border-subtle)", borderRadius: "var(--radius-md)", background: "var(--color-bg-subtle)", display: "grid", placeItems: "center", overflow: "hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- local data: URI preview */}
                <img src={src} alt="preview" style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--spacing-6)" }}>
                {row("Width (mil)", <NumberInput value={String(w)} onChange={(v) => setWidth(parseFloat(v) || 0)} min={4} />)}
                {row("Height (mil)", <NumberInput value={String(h)} onChange={(v) => setHeight(parseFloat(v) || 0)} min={4} />)}
                <div onClick={() => setLock((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer" }}>
                  <Check on={lock} size={18} />
                  <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Keep the original aspect ratio</span>
                </div>
              </div>
            </div>
          )}
          {row("Layer", <DsSelect value={layer} options={layers.length ? layers : [{ label: "Top Silkscreen", value: "topSilk" }]} onChange={setLayer} />)}
          <div onClick={() => setMono((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer" }}>
            <Check on={mono} size={18} />
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Reduce to silkscreen ink (1-bit)</span>
          </div>
          {mono && (
            <>
              {row("Threshold", <NumberInput value={String(threshold)} onChange={(v) => setThreshold(Math.max(0, Math.min(255, parseFloat(v) || 0)))} min={0} />)}
              <div onClick={() => setInvert((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer" }}>
                <Check on={invert} size={18} />
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Invert — keep the light pixels as ink</span>
              </div>
            </>
          )}
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>
            The image lands in the middle of the board and can be moved, resized and rotated like any object.
            {mono ? " Ink pixels stay opaque and the rest becomes transparent, so the board shows through." : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="primary" size="md" disabled={!src} onClick={place}>Place image</Button>
        </div>
      </Card>
    </Overlay>
  );
}

// #86 — Move by step: nudge the selection by an exact offset, or one grid step
// at a time with the arrow buttons. The old Move rows armed a tool that had no
// handler, so nothing moved at all.
function MoveStepModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const step = Math.max(1, Math.round(parseFloat(String(state.gridSize)) * 100) || 10);
  const [dx, setDx] = React.useState("0");
  const [dy, setDy] = React.useState("0");
  const n = state.selectedIds.length;
  const label: React.CSSProperties = { width: 96, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" };
  const nudge = (ax: "x" | "y", dir: number) => {
    actions.moveSelectedBy(ax === "x" ? step * dir : 0, ax === "y" ? step * dir : 0);
  };
  return (
    <Overlay>
      <Card width={430}>
        <Header title="Move by step" onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-12)", display: "flex", flexDirection: "column", gap: "var(--spacing-7)" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: n ? "var(--color-text-secondary)" : "var(--color-text-tertiary)", lineHeight: 1.5 }}>
            {n ? `${n} object${n > 1 ? "s" : ""} selected. Type an offset, or step by the grid (${step} px per press).` : "Select something on the board first — this moves the selection."}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
            <span style={label}>Step by grid</span>
            <div style={{ display: "flex", gap: "var(--spacing-4)" }}>
              {([["←", "x", -1], ["→", "x", 1], ["↑", "y", -1], ["↓", "y", 1]] as const).map(([t, ax, dir]) => (
                <Button key={t} hierarchy="secondary" size="sm" disabled={!n} onClick={() => nudge(ax, dir)}>{t}</Button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
            <span style={label}>Offset X</span>
            <div style={{ flex: 1 }}><NumberInput value={dx} onChange={setDx} /></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
            <span style={label}>Offset Y</span>
            <div style={{ flex: 1 }}><NumberInput value={dy} onChange={setDy} /></div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Close</Button>
          <Button hierarchy="primary" size="md" disabled={!n} onClick={() => { actions.moveSelectedBy(parseFloat(dx) || 0, parseFloat(dy) || 0); actions.closeModal(); }}>Move</Button>
        </div>
      </Card>
    </Overlay>
  );
}

// #79 — New ▸ Part: authors a part into the personal library, which the picker's
// Personal rail lists and can place. (The rail was empty until now.)
function NewPartModal() {
  const actions = usePcbActions();
  const [name, setName] = React.useState("");
  const [mpn, setMpn] = React.useState("");
  const [pkg, setPkg] = React.useState("0805");
  const [maker, setMaker] = React.useState("");
  const [symbol, setSymbol] = React.useState("resistor");
  const SYMBOLS = ["resistor", "resistorBox", "capacitor", "inductor", "diode", "crystal", "opamp", "component"];
  const label: React.CSSProperties = { width: 110, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" };
  const row = (n: string, node: React.ReactNode) => (
    <div key={n} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
      <span style={label}>{n}</span><div style={{ flex: 1 }}>{node}</div>
    </div>
  );
  const input = (v: string, set: (s: string) => void, ph = "") => (
    <input value={v} placeholder={ph} onChange={(e) => set(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "var(--spacing-4) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }} />
  );
  const save = () => {
    const part = { name: name.trim(), mpn: mpn.trim(), pkg: pkg.trim(), maker: maker.trim(), symbol };
    try {
      const raw = window.localStorage.getItem("ideeza:pcb:personalParts");
      const list = raw ? (JSON.parse(raw) as unknown[]) : [];
      window.localStorage.setItem("ideeza:pcb:personalParts", JSON.stringify([...(Array.isArray(list) ? list : []), part]));
    } catch {}
    actions.flashToast(`Saved ${part.name || "part"} to your personal library`);
    actions.closeModal();
    actions.openPicker("Parts");
  };
  return (
    <Overlay>
      <Card width={470}>
        <Header title="New part" onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-12)", display: "flex", flexDirection: "column", gap: "var(--spacing-6)" }}>
          {row("Name", input(name, setName, "e.g. 10k 1% thin film"))}
          {row("MPN", input(mpn, setMpn, "manufacturer part number"))}
          {row("Package", input(pkg, setPkg))}
          {row("Manufacturer", input(maker, setMaker))}
          {row("Symbol", <DsSelect value={symbol} options={SYMBOLS.map((v) => ({ label: v, value: v }))} onChange={setSymbol} />)}
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>
            The part is stored in this browser and appears under <b>Personal</b> in Place a Part, ready to place with the symbol you picked. Drawing a brand-new symbol needs the symbol editor, which isn&#39;t built yet.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="primary" size="md" disabled={!name.trim()} onClick={save}>Save part</Button>
        </div>
      </Card>
    </Overlay>
  );
}

// #79 — New ▸ Agile Module: captures the current selection as a reusable module.
function NewModuleModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [name, setName] = React.useState("");
  const picked = state.objects.filter((o) => state.selectedIds.includes(o.id));
  const save = () => {
    const body = picked.map((o) => ({ ...o, id: undefined }));
    try {
      const raw = window.localStorage.getItem("ideeza:pcb:personalModules");
      const list = raw ? (JSON.parse(raw) as unknown[]) : [];
      window.localStorage.setItem("ideeza:pcb:personalModules", JSON.stringify([...(Array.isArray(list) ? list : []), { name: name.trim(), objects: body }]));
    } catch {}
    actions.flashToast(`Saved “${name.trim()}” — ${picked.length} object${picked.length > 1 ? "s" : ""} in the module`);
    actions.closeModal();
    actions.openPicker("Agile Module");
  };
  return (
    <Overlay>
      <Card width={460}>
        <Header title="New agile module" onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-12)", display: "flex", flexDirection: "column", gap: "var(--spacing-6)" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: picked.length ? "var(--color-text-secondary)" : "var(--color-text-tertiary)", lineHeight: 1.5 }}>
            {picked.length
              ? `A module is a block you can drop again later. ${picked.length} selected object${picked.length > 1 ? "s" : ""} will be captured.`
              : "Select the objects that make up the block first — a module is captured from a selection."}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
            <span style={{ width: 90, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. USB-C power input" style={{ flex: 1, padding: "var(--spacing-4) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }} />
          </div>
          {picked.length > 0 && (
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
              {[...new Set(picked.map((o) => o.kind))].slice(0, 8).join(" · ")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="primary" size="md" disabled={!name.trim() || !picked.length} onClick={save}>Save module</Button>
        </div>
      </Card>
    </Overlay>
  );
}

// Suture (stitching) vias — Insert ▸ Suture Vias. The row used to arm a tool
// that stamped a 5-via glyph, with nowhere to say pitch, net or where. This
// dialog plans a real lattice with `planSutureVias` (the same function the
// store action places from, so the count can't lie) and drops real vias.
function SutureViasModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const regions = sutureRegions(state);
  const [cfg, setCfg] = React.useState<SutureConfig>(() => ({
    ...defaultSutureConfig(),
    target: sutureRegions(state).length ? "region" : "board",
  }));
  const set = (patch: Partial<SutureConfig>) => setCfg((c) => ({ ...c, ...patch }));
  const plan = React.useMemo(() => planSutureVias(state, cfg), [state, cfg]);
  const nets = React.useMemo(() => {
    const names = new Set<string>(state.pcbNets.map((n) => n.name));
    for (const o of state.objects) if (o.net) names.add(o.net);
    names.add("GND");
    return [...names];
  }, [state.pcbNets, state.objects]);
  const existing = state.objects.filter((o) => (o.props as Record<string, unknown> | undefined)?.suture).length;

  const label: React.CSSProperties = { width: 130, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" };
  const row = (name: string, node: React.ReactNode) => (
    <div key={name} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
      <span style={label}>{name}</span>
      <div style={{ flex: 1 }}>{node}</div>
    </div>
  );
  function seg<T extends string>(options: { label: string; value: T; disabled?: boolean }[], value: T, onChange: (v: T) => void) {
    return (
      <div style={{ display: "inline-flex", background: "var(--color-bg-subtle)", borderRadius: "var(--radius-lg)", padding: 3, gap: 2 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              disabled={o.disabled}
              title={o.disabled ? "Select a copper region first" : undefined}
              onClick={() => onChange(o.value)}
              style={{ padding: "var(--spacing-3) var(--spacing-6)", borderRadius: "var(--radius-md)", border: "none", cursor: o.disabled ? "default" : "pointer", fontFamily: "inherit", fontSize: "var(--font-size-sm)", fontWeight: 600, opacity: o.disabled ? 0.45 : 1, background: on ? "var(--color-violet-600)" : "transparent", color: on ? "var(--color-text-on-brand)" : "var(--color-text-secondary)" }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Overlay>
      <Card width={500} maxHeight="88%" flexCol>
        <Header title="Stitch suture vias" onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-9) var(--spacing-12)", display: "flex", flexDirection: "column", gap: "var(--spacing-7)" }}>
          {row("Where", seg([
            { label: regions.length ? `Selected region (${regions.length})` : "Selected region", value: "region" as const, disabled: !regions.length },
            { label: "Whole board", value: "board" as const },
          ], cfg.target, (v) => set({ target: v })))}
          {row("Net", <DsSelect value={cfg.net} options={nets.map((n) => ({ label: n, value: n }))} onChange={(v) => set({ net: v })} />)}
          {row("Pattern", seg([
            { label: "Staggered", value: "staggered" as const },
            { label: "Grid", value: "grid" as const },
          ], cfg.pattern, (v) => set({ pattern: v })))}
          {row("Spacing (mil)", <NumberInput value={String(cfg.pitch)} onChange={(v) => set({ pitch: parseFloat(v) || 0 })} min={4} />)}
          {row("Via size (mil)", <NumberInput value={String(cfg.size)} onChange={(v) => set({ size: parseFloat(v) || 0 })} min={1} />)}
          {row("Drill (mil)", <NumberInput value={String(cfg.drill)} onChange={(v) => set({ drill: parseFloat(v) || 0 })} min={1} />)}
          {row("Edge clearance", <NumberInput value={String(cfg.clearance)} onChange={(v) => set({ clearance: parseFloat(v) || 0 })} min={0} />)}
          <div style={{ fontSize: "var(--font-size-sm)", lineHeight: 1.5, color: plan.points.length ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>
            {plan.points.length
              ? `Will stitch ${plan.points.length} via${plan.points.length > 1 ? "s" : ""} — real vias on ${cfg.net || "no net"}, so the DRC, the 3D view and the exports all see them.`
              : plan.reason}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          {existing > 0 && (
            <Pill onClick={() => { actions.removeSutureVias("all"); actions.closeModal(); }}>
              Remove {existing} existing
            </Pill>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: "var(--spacing-5)" }}>
            <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
            <Button
              hierarchy="primary"
              size="md"
              disabled={!plan.points.length}
              onClick={() => { actions.generateSutureVias(cfg); actions.closeModal(); }}
            >
              Stitch vias
            </Button>
          </div>
        </div>
      </Card>
    </Overlay>
  );
}

// Add Chamfer / Add Fillet — real corner geometry. Apply used to be a toast:
// the size went into the store and nothing ever read it. Now the dialog names
// what it can act on (the same shapes Combine accepts) and Apply rewrites the
// rings through `applyCornerOp`, so the change is on the canvas and undoable.
function ChamferFilletModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const op = state.cornerOp;
  const isChamfer = op.mode === "chamfer";
  const eligible = state.objects.filter((o) => state.selectedIds.includes(o.id) && isCombinable(o));
  const skipped = state.selectedIds.length - eligible.length;
  const size = Number(op.radius) || 0;
  const can = eligible.length > 0 && size > 0;
  const seg = (
    <div style={{ display: "inline-flex", background: "var(--color-bg-subtle)", borderRadius: "var(--radius-lg)", padding: 3, gap: 2 }}>
      {([["chamfer", "Chamfer"], ["fillet", "Fillet"]] as const).map(([v, label]) => {
        const on = op.mode === v;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            onClick={() => actions.setCornerOp({ mode: v })}
            style={{ padding: "var(--spacing-3) var(--spacing-7)", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "var(--font-size-sm)", fontWeight: 600, background: on ? "var(--color-violet-600)" : "transparent", color: on ? "var(--color-text-on-brand)" : "var(--color-text-secondary)", transition: "background .14s, color .14s" }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
  return (
    <Overlay>
      <Card width={460}>
        <Header title="Round board corners" onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-12)", display: "flex", flexDirection: "column", gap: "var(--spacing-7)" }}>
          {seg}
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.55 }}>
            {isChamfer
              ? "Every corner of the selected shapes is cut back to a straight bevel of this size."
              : "Every corner of the selected shapes is replaced with a real arc of this radius, tangent to both edges."}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)" }}>
            <span style={{ width: 140, fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
              {isChamfer ? "Chamfer size (mil)" : "Fillet radius (mil)"}
            </span>
            <div style={{ flex: 1 }}>
              <NumberInput value={String(op.radius)} onChange={(v) => actions.setCornerOp({ radius: parseFloat(v) || 0 })} min={0} />
            </div>
          </div>
          <div style={{ fontSize: "var(--font-size-sm)", color: eligible.length ? "var(--color-text-secondary)" : "var(--color-text-tertiary)", lineHeight: 1.5 }}>
            {eligible.length
              ? `Will apply to ${eligible.length} shape${eligible.length > 1 ? "s" : ""}${skipped ? ` · ${skipped} in the selection can't be rounded (only shapes, regions and outlines can)` : ""}. A size bigger than an edge is clamped to fit, and you'll be told how many corners were clamped.`
              : "Select a shape, copper region or outline on the board first — those are the objects with corners to round."}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button
            hierarchy="primary"
            size="md"
            disabled={!can}
            onClick={() => { actions.applyCornerOp(op.mode === "fillet" ? "fillet" : "chamfer", size); actions.closeModal(); }}
          >
            Apply
          </Button>
        </div>
      </Card>
    </Overlay>
  );
}

// Phase 7 — Auto Routing options + start button (IT-665).
function AutoRouteModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [scope, setScope] = React.useState<"all" | "selected" | "unrouted">("unrouted");
  const [respectClass, setRespectClass] = React.useState(true);
  const [smoothCorners, setSmoothCorners] = React.useState(true);
  // What each scope would actually route, counted off the live board — so the
  // dialog can't offer a run that has nothing to do.
  const airwires = state.objects.filter((o) => o.kind === "ratsnest");
  const selNets = new Set(
    state.objects.filter((o) => state.selectedIds.includes(o.id) && o.net).map((o) => o.net),
  );
  const routedTracks = state.objects.filter(
    (o) => o.kind === "track" && (o.props as Record<string, unknown> | undefined)?.gen === "route",
  ).length;
  const counts = {
    unrouted: airwires.length,
    selected: airwires.filter((o) => selNets.has(o.net)).length,
    all: airwires.length + routedTracks,
  };
  return (
    <Overlay>
      <Card width={500}>
        <Header title="Auto Routing" onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-12)", display: "flex", flexDirection: "column", gap: "var(--spacing-7)" }}>
          <div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-4)" }}>Scope</div>
            {([
              ["unrouted", "Unrouted nets only", `${counts.unrouted} airwire${counts.unrouted === 1 ? "" : "s"}`],
              ["selected", "Selected nets", selNets.size ? `${counts.selected} on ${selNets.size} net${selNets.size === 1 ? "" : "s"}` : "nothing selected"],
              ["all", "All nets (re-route)", `${counts.unrouted} airwire${counts.unrouted === 1 ? "" : "s"} + ${routedTracks} routed segment${routedTracks === 1 ? "" : "s"}`],
            ] as const).map(([v, label, note]) => (
              <div key={v} onClick={() => setScope(v)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-3) 0", cursor: "pointer" }}>
                <Radio on={scope === v} />
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{label}</span>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>{note}</span>
              </div>
            ))}
          </div>
          <div onClick={() => setRespectClass(!respectClass)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer" }}>
            <Check on={respectClass} />
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Use each net&#39;s class track width</span>
          </div>
          <div onClick={() => setSmoothCorners(!smoothCorners)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer" }}>
            <Check on={smoothCorners} />
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Mitre corners to 45°</span>
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>
            The router lays an orthogonal track per airwire on the top layer. It does not yet push existing copper aside, so run the DRC afterwards.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button
            hierarchy="primary"
            size="md"
            disabled={counts[scope] === 0}
            onClick={() => {
              actions.autoRoute({ scope, respectClass, mitre: smoothCorners });
              actions.closeModal();
            }}
          >
            Start Routing
          </Button>
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
// Cut out board area — the old dialog described a gesture that did not exist
// (the `cutout` tool was in neither PLACE_TOOLS nor DRAFT_TOOLS, so arming it
// did nothing). Now it states the one real gesture and what it produces.
function CutoutModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const existing = state.objects.filter((o) => o.kind === "cutout");
  const row: React.CSSProperties = { fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: 1.55 };
  return (
    <Overlay>
      <Card width={470}>
        <Header title="Cut out board area" onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-12)", display: "flex", flexDirection: "column", gap: "var(--spacing-6)" }}>
          <div style={{ ...row, color: "var(--color-text-primary)" }}>
            Drag the two corners of the area on the board — that rectangle is removed from the board.
          </div>
          <div style={row}>
            The hole is real: it shows through in the <b>3D view</b> and is written as a board edge into the
            <b> DXF</b>, <b>PDF</b> and Gerber outline. The tool stays armed, so you can cut several areas;
            <b> Esc</b> returns to Select.
          </div>
          {existing.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-5) var(--spacing-6)", borderRadius: "var(--radius-lg)", background: "var(--color-bg-subtle)" }}>
              <span style={{ ...row, flex: 1 }}>
                {existing.length} cutout{existing.length > 1 ? "s" : ""} already on this board.
              </span>
              <Pill onClick={() => {
                actions.selectMany(existing.map((o) => o.id));
                actions.deleteSelected();
                actions.closeModal();
              }}>Remove all</Pill>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="primary" size="md" onClick={() => { actions.setTool("cutout"); actions.closeModal(); }}>Start cutting</Button>
        </div>
      </Card>
    </Overlay>
  );
}

export function Modals() {
  const state = usePcbState();
  const actions = usePcbActions();
  switch (state.modal) {
    // File ▸ New ▸ Project — the same "Project Information" dialog the manual
    // create flow uses, so both entry points share one create path.
    case "newProject":
      return <ProjectInfoModal open onClose={actions.closeModal} />;
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
    case "importGltf":
      return <ImportGltfModal />;
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
    case "exportSheet":
      return <SheetExportModal />;
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
    case "cutout":
      return <CutoutModal />;
    case "sutureVias":
      return <SutureViasModal />;
    case "importImage":
      return <ImportImageModal />;
    case "moveStep":
      return <MoveStepModal />;
    case "newPart":
      return <NewPartModal />;
    case "newModule":
      return <NewModuleModal />;
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
