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

export function Modals() {
  const state = usePcbState();
  switch (state.modal) {
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
    default:
      return null;
  }
}
