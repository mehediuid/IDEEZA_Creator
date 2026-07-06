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
import { buildFindReplace } from "@/lib/pcb/content";
import { DEL_OBJ_NAMES } from "@/lib/pcb/types";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { PcbManagerModals } from "@/components/pcb/pcb-manager-modals";
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
  defaultPinMatrix,
  SEVERITY_COLOR,
  SEVERITY_SHORT,
  type RuleDef,
  type Severity,
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
          <PrimaryBtn onClick={actions.closeModal} style={{ padding: "var(--spacing-5) var(--spacing-16)" }}>Confirm</PrimaryBtn>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Array ──────────────────────────────────────────────────────────────────
function ArrayModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const fields: [string, keyof typeof state.arr][] = [
    ["Row", "row"],
    ["Column", "col"],
    ["Row Spacing", "rowSp"],
    ["Column Spacing", "colSp"],
  ];
  return (
    <Overlay>
      <Card width={780}>
        <Header title="Array" onClose={actions.closeModal} padding="20px 26px" />
        <div style={{ padding: "var(--spacing-12) var(--spacing-12)", display: "flex", flexDirection: "column", gap: "var(--spacing-8)" }}>
          {fields.map(([label, key]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)" }}>
              <span style={{ width: 120, flex: "0 0 auto", fontSize: "var(--font-size-md)", color: "var(--color-text-primary)" }}>{label}</span>
              <div style={{ flex: 1 }}>
                <NumberInput value={String(state.arr[key])} onChange={(v) => actions.setArr(key, v)} min={0} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", padding: "var(--spacing-7) var(--spacing-12) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Pill onClick={actions.closeModal} style={{ padding: "var(--spacing-5) var(--spacing-12)", borderRadius: "var(--radius-lg)" }}>Cancel</Pill>
          <div style={{ padding: "var(--spacing-5) var(--spacing-10)", background: "var(--color-bg-subtle)", borderRadius: "var(--radius-lg)", fontSize: "var(--font-size-md)", fontWeight: 500, color: "var(--color-text-tertiary)", cursor: "default" }}>adjust array spacing bu cursor</div>
          <Pill style={{ marginLeft: "auto", padding: "var(--spacing-5) var(--spacing-16)", borderRadius: "var(--radius-lg)" }}>Preview</Pill>
          <PrimaryBtn onClick={actions.closeModal} style={{ padding: "var(--spacing-5) var(--spacing-16)", borderRadius: "var(--radius-lg)" }}>Confirm</PrimaryBtn>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Find and Replace ───────────────────────────────────────────────────────
function FindReplaceModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const checks: [string, "frRegex" | "frMatch" | "frExt"][] = [
    ["Use Regular (?)", "frRegex"],
    ["Match case", "frMatch"],
    ["Use extension", "frExt"],
  ];
  return (
    <Overlay>
      <Card width={680} maxHeight="88%" flexCol>
        <Header title="Find and Replace" onClose={actions.closeModal} padding="18px 24px" />
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-8) var(--spacing-12) var(--spacing-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-16)", marginBottom: "var(--spacing-7)" }}>
            <span style={{ width: 110, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>Output Method</span>
            <div onClick={() => actions.setFr({ frScope: "page" })} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer" }}>
              <Radio on={state.frScope === "page"} />
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Current page</span>
            </div>
            <div onClick={() => actions.setFr({ frScope: "object" })} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer" }}>
              <Radio on={state.frScope === "object"} />
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Current selected object</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-16)", marginBottom: "var(--spacing-8)" }}>
            <span style={{ width: 110, flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>Scope</span>
            <Dropdown label="Component" minWidth={220} />
          </div>
          <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-0) var(--spacing-0) var(--spacing-7)" }} />
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-5)" }}>Property</div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-12)", marginBottom: "var(--spacing-7)" }}>
            {checks.map(([label, key]) => (
              <div key={key} onClick={() => actions.setFr({ [key]: !state[key] })} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer" }}>
                <Check on={state[key]} size={18} radius={5} checkSize={11} />
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{label}</span>
              </div>
            ))}
          </div>
          <div dangerouslySetInnerHTML={{ __html: buildFindReplace() }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-12)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Pill onClick={actions.closeModal}>Cancel</Pill>
          <Pill style={{ marginLeft: "auto" }}>Previous</Pill>
          <Pill>Next</Pill>
          <PrimaryBtn onClick={actions.closeModal}>Find All</PrimaryBtn>
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
type SchRuleState = { enabled: boolean; severity: Severity };
type SchRulesConfig = {
  Net: SchRuleState[];
  Component: SchRuleState[];
  "Reuse Block": SchRuleState[];
  pinMatrix: Severity[][];
  pinCheckEnabled: boolean;
};

const SCH_RULE_SETS: Record<"Net" | "Component" | "Reuse Block", RuleDef[]> = {
  Net: SCH_NET_RULES,
  Component: SCH_COMPONENT_RULES,
  "Reuse Block": SCH_REUSE_RULES,
};

function defaultSchRulesConfig(): SchRulesConfig {
  const mk = (defs: RuleDef[]) => defs.map((d) => ({ enabled: true, severity: d.severity }));
  return {
    Net: mk(SCH_NET_RULES),
    Component: mk(SCH_COMPONENT_RULES),
    "Reuse Block": mk(SCH_REUSE_RULES),
    pinMatrix: defaultPinMatrix(),
    pinCheckEnabled: true,
  };
}

let savedSchRulesConfig: SchRulesConfig | null = null;

const SCH_RULE_TABS = ["Net", "Component", "Reuse Block", "Connection"] as const;

function DesignRulesModal() {
  const actions = usePcbActions();
  const [tab, setTab] = React.useState<(typeof SCH_RULE_TABS)[number]>("Net");
  const [cfg, setCfg] = React.useState<SchRulesConfig>(
    () => savedSchRulesConfig ?? defaultSchRulesConfig(),
  );
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
    savedSchRulesConfig = cfg;
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
          <Button hierarchy="primary" size="md" onClick={() => { actions.flashToast("Reannotated"); actions.closeModal(); }}>Reannotate</Button>
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
  const [fileName, setFileName] = React.useState("3D shell_PCB1");
  const [type, setType] = React.useState<"STL" | "STEP" | "OBJ">("STL");
  const [opt, setOpt] = React.useState(true);
  const [obj, setObj] = React.useState<Record<string, boolean>>({
    PCB: true,
    "Silk screen": true,
    "Component Model": true,
    "Component Via": false,
    "Signal layer circuits": true,
    "Signal Via": false,
  });
  const toggle = (k: string) => setObj((s) => ({ ...s, [k]: !s[k] }));

  const labelCss: React.CSSProperties = { fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" };
  const groupCss: React.CSSProperties = { ...labelCss, marginBottom: "var(--spacing-4)", fontWeight: 600, color: "var(--color-text-primary)" };

  return (
    <Overlay>
      <Card width={460}>
        <Header title={shell ? "Export 3D Shell File" : "Export 3D File"} onClose={actions.closeModal} padding="18px 22px" />
        <div style={{ padding: "var(--spacing-9) var(--spacing-10)", display: "flex", flexDirection: "column", gap: "var(--spacing-8)" }}>
          {/* File name */}
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

          {/* Export 3D Type */}
          <div>
            <div style={groupCss}>Export 3D Type</div>
            <div style={{ display: "flex", gap: "var(--spacing-12)" }}>
              {(["STL", "STEP", "OBJ"] as const).map((t) => (
                <div key={t} onClick={() => setType(t)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer" }}>
                  <Radio on={type === t} />
                  <span style={labelCss}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Export Object (full file export only) */}
          {!shell && (
            <div>
              <div style={groupCss}>Export Object</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-4) var(--spacing-6)" }}>
                {Object.keys(obj).map((k) => (
                  <div key={k} onClick={() => toggle(k)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer" }}>
                    <Check on={obj[k]} />
                    <span style={labelCss}>{k}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export option note */}
          <div onClick={() => setOpt((o) => !o)} style={{ display: "flex", alignItems: "flex-start", gap: "var(--spacing-3)", cursor: "pointer" }}>
            <Check on={opt} />
            <span style={{ ...labelCss, lineHeight: 1.5 }}>
              For Components Whiteout bound 3D models, 3D models will be automatically generated (based on the height, property.
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-10) var(--spacing-9)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Order 3D shell</Button>
          <Button hierarchy="primary" size="md" onClick={actions.closeModal}>Export</Button>
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
}: {
  title: string;
  defaultName: string;
  formats: string[];
  extraOpts: string[];
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
          <Button hierarchy="primary" size="md" onClick={() => { actions.flashToast(`Exported ${fileName}`); actions.closeModal(); }}>Export</Button>
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
    case "convertConfirm":
      return <ConvertConfirmModal />;
    case "reannotate":
      return <ReannotateModal />;
    case "exportDxf2D":
      return <ExportFormatModal title="Export DXF" defaultName="board.dxf" formats={["AutoCAD 2018", "AutoCAD 2013", "AutoCAD 2010"]} extraOpts={["Top layer", "Bottom layer", "Silkscreen", "Drill"]} />;
    case "exportPdf2D":
      return <ExportFormatModal title="Export PDF" defaultName="board.pdf" formats={["A4", "A3", "Letter", "Tabloid"]} extraOpts={["Color print", "Mirror", "Outline only"]} />;
    case "exportGerber2D":
      return <ExportFormatModal title="Export Gerber" defaultName="board.gbr" formats={["RS-274X (Extended)", "RS-274D"]} extraOpts={["Generate drill file", "Include silk", "Include solder mask", "Compress as ZIP"]} />;
    case "exportPickPlace":
      return <ExportFormatModal title="Export Pick and Place" defaultName="board-pnp.csv" formats={["CSV", "TXT", "JSON"]} extraOpts={["Include top side", "Include bottom side", "Use metric units"]} />;
    case "exportBom":
      return <ExportFormatModal title="Export BOM (Bill of Materials)" defaultName="bom.csv" formats={["CSV", "XLSX", "HTML"]} extraOpts={["Group by reference", "Group by value", "Include supplier"]} />;
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
