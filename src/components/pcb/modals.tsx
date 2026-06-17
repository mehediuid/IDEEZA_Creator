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
import { buildDesignRules, buildFindReplace } from "@/lib/pcb/content";
import { DEL_OBJ_NAMES } from "@/lib/pcb/types";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { PcbManagerModals } from "@/components/pcb/pcb-manager-modals";

const PRIMARY = "var(--color-violet-600)";
const CLOSE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const RESTORE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-violet-600)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>';
const ANNOT_PREVIEW_SVG =
  '<svg viewBox="0 0 100 64" fill="none" stroke="var(--color-text-primary)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14h62L14 50h62"/><path d="M66 8l14 6-14 6" fill="var(--color-text-primary)" stroke="none"/><path d="M62 44l14 6-14 6" fill="var(--color-text-primary)" stroke="none"/></svg>';

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
function DesignRulesModal() {
  const actions = usePcbActions();
  return (
    <Overlay>
      <Card width={980} maxHeight="86%" flexCol>
        <Header title="Design Rules" onClose={actions.closeModal} padding="18px 24px" />
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-7) var(--spacing-12)" }} dangerouslySetInnerHTML={{ __html: buildDesignRules() }} />
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-12)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Pill onClick={actions.closeModal}>Cancel</Pill>
          <Pill>Export</Pill>
          <Pill>Import</Pill>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--spacing-3)", color: PRIMARY, fontSize: "var(--font-size-md)", fontWeight: 600, cursor: "pointer" }}>
            <span>Restore Default</span>
            <Icon html={RESTORE_SVG} size={15} />
          </div>
          <div className="ix-pill" style={{ padding: "var(--spacing-5) var(--spacing-10)", border: "var(--border-width-1-5) solid var(--color-border-brand)", borderRadius: "var(--radius-lg)", fontSize: "var(--font-size-md)", fontWeight: 600, color: PRIMARY, cursor: "pointer" }}>Verify Now</div>
          <PrimaryBtn onClick={actions.closeModal} style={{ padding: "var(--spacing-5) var(--spacing-16)" }}>Confirm</PrimaryBtn>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Annotate Designator ────────────────────────────────────────────────────
function AnnotateModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const a = state.annot;

  const radioRow = (label: string, on: boolean, onClick: () => void) => (
    <div key={label} onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-3) var(--spacing-0)", cursor: "pointer" }}>
      <Radio on={on} />
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{label}</span>
    </div>
  );

  return (
    <Overlay>
      <Card width={560} maxHeight="88%" flexCol>
        <Header title="Annotate Designator" onClose={actions.closeModal} padding="18px 24px" />
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-8) var(--spacing-12)" }}>
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-5)" }}>Operation</div>
          <div onClick={() => actions.setAnnot({ existing: !a.existing })} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-3) var(--spacing-0)", cursor: "pointer" }}>
            <Check on={a.existing} size={18} radius={5} checkSize={11} />
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Existing Designators</span>
          </div>
          {["Annotate Designator", "Clear Designators"].map((v) => radioRow(v, a.op === v, () => actions.setAnnot({ op: v })))}

          <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-7) var(--spacing-0)" }} />
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-5)" }}>Range</div>
          {["Annotate Designator", "Current page", "Selected components at current page"].map((v) => radioRow(v, a.range === v, () => actions.setAnnot({ range: v })))}

          <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-7) var(--spacing-0)" }} />
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-5)" }}>Hierarchical</div>
          <div onClick={() => actions.setAnnot({ hierarchical: !a.hierarchical })} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-3) var(--spacing-0)", cursor: "pointer" }}>
            <Check on={a.hierarchical} size={18} radius={5} checkSize={11} />
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Simultaneously Operate the Underlying Grap</span>
          </div>

          <div style={{ display: "flex", gap: "var(--spacing-12)", marginTop: "var(--spacing-7)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-5)" }}>Order</div>
              {["Across Then Down", "Across Then Up", "Down Then Across", "Up Than Across"].map((v) => radioRow(v, a.order === v, () => actions.setAnnot({ order: v })))}
            </div>
            <div style={{ width: 150, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 140, height: 96, border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon html={ANNOT_PREVIEW_SVG} size={100} style={{ height: 64 }} />
              </div>
            </div>
          </div>

          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", margin: "var(--spacing-7) var(--spacing-0) var(--spacing-5)" }}>Designator Rule</div>
          {["Add page Number", "Custom Starting Number"].map((v) => radioRow(v, a.desRule === v, () => actions.setAnnot({ desRule: v })))}
          <div style={{ marginTop: "var(--spacing-4)" }}>
            <NumberInput value={String(a.customStart)} onChange={(v) => actions.setAnnot({ customStart: v })} min={0} placeholder="0" />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-7)", padding: "var(--spacing-7) var(--spacing-12)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Pill onClick={actions.closeModal} style={{ flex: 1, textAlign: "center", padding: "var(--spacing-5)", borderRadius: "var(--radius-lg)" }}>Cancel</Pill>
          <PrimaryBtn onClick={actions.closeModal} style={{ flex: 1, textAlign: "center", padding: "var(--spacing-5)", borderRadius: "var(--radius-lg)" }}>Confirm</PrimaryBtn>
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
