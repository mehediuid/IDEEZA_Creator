"use client";

// IDEEZA PCB — 3D-view standalone Setting dialogs (Ideeza_PCB3D_Dialogs spec).
// Each 3D-menu "Setting > X" item opens its own lightweight card modal (as the
// designer drew them), not the unified SettingsOverlay. Data-driven: every
// dialog is a spec of rows/fields rendered by one component. Values live in
// the editor's one settings record (`ideeza:pcb:appSettings`, written by the
// store), shared with the overlay: Measurement Unit and the font are the same
// fields the overlay's System and Common Fonts pages edit. Hotkey and Top
// toolbar open the overlay's own pages. Each dialog opens with a line saying
// which of its values the editor acts on today (DIALOG_TRUTH).

import * as React from "react";
import { Button, Select } from "@/components/ideeza";
import { DsIcon } from "@/lib/pcb/icons";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { DEFAULT_FONTS, type PcbDialogValue } from "@/lib/pcb/types";
import { DIALOG_TRUTH } from "@/lib/pcb/app-settings";
import {
  DEFAULT_MEASUREMENT_UNIT,
  MEASUREMENT_UNITS,
  MEASUREMENT_UNIT_LABELS,
  unitFrom,
} from "@/lib/pcb/measurement-unit";

/** Fields that are the overlay's too, kept in their own store fields rather
 *  than in the dialogs' own values. */
const SHARED_KEYS = ["measurementUnit", "font"];

// ── Field / dialog spec ───────────────────────────────────────────────────────
type Field =
  | { k: "sel"; key: string; label: string; options: string[]; def: string }
  | { k: "txt"; key: string; label: string; def: string }
  | { k: "tog"; key: string; label: string; desc?: string; def: boolean }
  | { k: "pills"; key: string; label: string; options: string[]; def: string[] }
  | { k: "note"; text: string }
  | { k: "preview"; text: string }
  /** A fact, not a choice: what the editor does, with no control. */
  | { k: "info"; label: string; value: string; desc: string };
type Row = Field[]; // input fields (sel/txt) render side-by-side; others full-width
type DialogSpec = { title: string; icon: string; rows: Row[] };

// Every 3D Setting dialog, keyed by its ModalId.
export const SETTING_DIALOGS: Record<string, DialogSpec> = {
  set3dSysGeneral: {
    title: "System — General",
    icon: "sys",
    rows: [
      [{ k: "sel", key: "measurementUnit", label: "Measurement Unit", options: MEASUREMENT_UNITS.map((u) => MEASUREMENT_UNIT_LABELS[u]), def: MEASUREMENT_UNIT_LABELS[DEFAULT_MEASUREMENT_UNIT] }],
      [{ k: "info", label: "Language", value: "English", desc: "Other languages aren't available yet." }],
      [{ k: "info", label: "Auto-save", value: "Always on", desc: "Every change is saved in this browser a moment after you make it." }],
      [{ k: "tog", key: "reopenLast", label: "Reopen last project on launch", def: true }],
      [{ k: "tog", key: "startupTips", label: "Show startup tips", def: false }],
    ],
  },
  set3dSysCommon: {
    title: "System — Common",
    icon: "sys",
    rows: [
      [
        { k: "txt", key: "defaultGridSize", label: "Default Grid Size", def: "0.5 mm" },
        { k: "txt", key: "undoDepth", label: "Undo History Depth", def: "100 steps" },
      ],
      [{ k: "tog", key: "confirmDelete", label: "Confirm before delete", desc: "Show a warning before removing objects", def: true }],
      [{ k: "tog", key: "invertZoom", label: "Invert scroll-wheel zoom direction", def: false }],
      [{ k: "tog", key: "snapDefault", label: "Snap to grid by default", def: true }],
    ],
  },
  set3dSysLib: {
    title: "System — Common Library",
    icon: "sys",
    rows: [
      [{ k: "sel", key: "libSource", label: "Default Library Source", options: ["Ideeza Cloud Library", "Local Only", "LCSC"], def: "Ideeza Cloud Library" }],
      [{ k: "txt", key: "libPath", label: "Local Library Path", def: "C:\\Users\\Ideeza\\Libraries" }],
      [{ k: "tog", key: "libSync", label: "Sync library in background", desc: "Keep local cache up to date automatically", def: true }],
      [{ k: "info", label: "Local cache", value: "None", desc: "The parts library ships with the app, so nothing is cached in this browser." }],
    ],
  },
  set3dPanelGeneral: {
    title: "Panel/Panel Lib — General",
    icon: "panel",
    rows: [
      [
        { k: "txt", key: "panelSpacing", label: "Default Panel Spacing", def: "2.0 mm" },
        { k: "txt", key: "panelArray", label: "Default Array", def: "2 x 2" },
      ],
      [{ k: "sel", key: "panelNaming", label: "Panel Naming Convention", options: ["Board Name + Index (e.g. Board1_01)", "Sequential (01, 02…)", "Custom"], def: "Board Name + Index (e.g. Board1_01)" }],
      [{ k: "tog", key: "panelFiducials", label: "Auto-add fiducials to new panels", def: true }],
      [{ k: "tog", key: "panelMousebites", label: "Auto-add mouse-bites between boards", def: false }],
    ],
  },
  set3dPanelTheme: {
    title: "Panel/Panel Lib — Canvas theme",
    icon: "panel",
    rows: [
      [
        { k: "sel", key: "panelOutlineColor", label: "Panel Outline Color", options: ["Purple (#7B2FF2)", "Green (#3BB56F)", "Blue (#4A7FC9)", "Red (#E34C4C)"], def: "Purple (#7B2FF2)" },
        { k: "sel", key: "panelOutlineStyle", label: "Panel Outline Style", options: ["Dashed", "Solid", "Dotted"], def: "Dashed" },
      ],
      [{ k: "sel", key: "panelLabelFont", label: "Label Font", options: ["Inter, 10pt", "Inter, 8pt", "Mono, 10pt"], def: "Inter, 10pt" }],
      [{ k: "tog", key: "panelShowIndex", label: "Show board index labels on canvas", def: true }],
      [{ k: "tog", key: "panelHighlightActive", label: "Highlight active board in panel", def: true }],
    ],
  },
  set3dFont: {
    title: "Common Font Family",
    icon: "font",
    rows: [
      [
        { k: "sel", key: "font", label: "Font", options: DEFAULT_FONTS, def: "Inter" },
        { k: "txt", key: "fontDefaultSize", label: "Default Size", def: "1.0 mm" },
      ],
      [{ k: "sel", key: "designatorFont", label: "Designator Font", options: ["Ideeza Mono", "Ideeza Sans"], def: "Ideeza Mono" }],
      [{ k: "preview", text: "R1 C22 U4 Aa Bb Cc 123" }],
    ],
  },
  set3dDrawing: {
    title: "Drawing",
    icon: "draw",
    rows: [
      [
        { k: "txt", key: "traceWidth", label: "Default Trace Width", def: "0.25 mm" },
        { k: "txt", key: "viaSize", label: "Default Via Size", def: "0.6 / 0.3 mm" },
      ],
      [
        { k: "sel", key: "arcSmoothness", label: "Arc Smoothness", options: ["High", "Medium", "Low"], def: "High" },
        { k: "sel", key: "snapAngle", label: "Snap Angle Increment", options: ["45°", "90°", "30°", "15°"], def: "45°" },
      ],
      [{ k: "tog", key: "autoTeardrops", label: "Auto-apply teardrops to new traces", def: false }],
    ],
  },
  set3dProperty: {
    title: "Property",
    icon: "prop",
    rows: [
      [{ k: "pills", key: "sidebarFields", label: "Show in sidebar by default", options: ["Board Material", "Board Color", "Pad Plating Color", "Silkscreen Technology", "Layer Stackup"], def: ["Board Material", "Board Color", "Pad Plating Color", "Layer Stackup"] }],
      [{ k: "sel", key: "decimalPrecision", label: "Decimal Precision", options: ["3 decimal places (0.000)", "2 decimal places (0.00)", "4 decimal places (0.0000)"], def: "3 decimal places (0.000)" }],
    ],
  },
};

// Default value map for a dialog's fields.
function defaultsOf(spec: DialogSpec): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const row of spec.rows) for (const f of row) {
    if (f.k === "sel" || f.k === "txt") out[f.key] = f.def;
    else if (f.k === "tog") out[f.key] = f.def;
    else if (f.k === "pills") out[f.key] = f.def;
  }
  return out;
}

/** The keys a dialog stores itself (its fields minus the shared ones). */
function ownKeysOf(spec: DialogSpec): string[] {
  return Object.keys(defaultsOf(spec)).filter((k) => !SHARED_KEYS.includes(k));
}

// ── Small atoms ───────────────────────────────────────────────────────────────
const LABEL: React.CSSProperties = { fontSize: "var(--font-size-xs)", fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", color: "var(--color-text-tertiary)", marginBottom: "var(--spacing-3)" };
const INPUT: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "var(--spacing-4) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", background: "var(--color-bg-surface)", color: "var(--color-text-primary)", fontSize: "var(--font-size-sm)", fontFamily: "inherit", outline: "none" };

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle}
      style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: on ? "var(--color-violet-600)" : "var(--color-border-default)", position: "relative", transition: "background .15s", flex: "0 0 auto" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
    </button>
  );
}

// ── Dialog ────────────────────────────────────────────────────────────────────
export function SettingDialog({ id }: { id: string }) {
  const spec = SETTING_DIALOGS[id];
  const state = usePcbState();
  const actions = usePcbActions();
  const [draft, setDraft] = React.useState<Record<string, unknown>>(() => ({
    ...defaultsOf(spec),
    ...state.dialogSettings,
    measurementUnit: MEASUREMENT_UNIT_LABELS[state.measurementUnit],
    font: state.fonts.selected,
  }));
  if (!spec) return null;

  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  const save = () => {
    const own: Record<string, PcbDialogValue> = {};
    for (const k of ownKeysOf(spec)) own[k] = draft[k] as PcbDialogValue;
    actions.saveDialogSettings(own);
    // The shared fields: the same store fields the overlay edits.
    const keys = Object.keys(defaultsOf(spec));
    const unit = unitFrom(draft.measurementUnit);
    if (keys.includes("measurementUnit") && unit) actions.setMeasurementUnit(unit);
    if (keys.includes("font") && typeof draft.font === "string") actions.setSelectedFont(draft.font);
    actions.flashToast(`${spec.title} saved`);
    actions.closeModal();
  };
  const reset = () => setDraft(defaultsOf(spec));

  const renderField = (f: Field, i: number) => {
    if (f.k === "sel") {
      return (
        <div key={i} style={{ flex: 1, minWidth: 0 }}>
          <div style={LABEL}>{f.label}</div>
          <Select value={String(draft[f.key] ?? f.def)} options={f.options.map((o) => ({ label: o, value: o }))} onChange={(v) => set(f.key, v)} />
        </div>
      );
    }
    if (f.k === "txt") {
      return (
        <div key={i} style={{ flex: 1, minWidth: 0 }}>
          <div style={LABEL}>{f.label}</div>
          <input style={INPUT} value={String(draft[f.key] ?? f.def)} onChange={(e) => set(f.key, e.target.value)} />
        </div>
      );
    }
    if (f.k === "tog") {
      return (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-6)", padding: "var(--spacing-4) 0", width: "100%" }}>
          <div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{f.label}</div>
            {f.desc && <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>{f.desc}</div>}
          </div>
          <Switch on={draft[f.key] !== false} onToggle={() => set(f.key, !(draft[f.key] !== false))} />
        </div>
      );
    }
    if (f.k === "pills") {
      const sel = (draft[f.key] as string[]) ?? f.def;
      return (
        <div key={i} style={{ width: "100%" }}>
          <div style={LABEL}>{f.label}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-3)" }}>
            {f.options.map((o) => {
              const on = sel.includes(o);
              return (
                <button key={o} type="button" onClick={() => set(f.key, on ? sel.filter((x) => x !== o) : [...sel, o])}
                  style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-2)", padding: "var(--spacing-3) var(--spacing-5)", borderRadius: "var(--radius-full)", border: `var(--border-width-1) solid ${on ? "var(--color-violet-600)" : "var(--color-border-default)"}`, background: on ? "var(--color-bg-brand-subtle)" : "transparent", color: on ? "var(--color-text-brand)" : "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", fontWeight: on ? 600 : 500, cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: on ? "var(--color-violet-600)" : "var(--color-border-strong, #888)" }} />
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    if (f.k === "note") {
      return (
        <div key={i} style={{ width: "100%", padding: "var(--spacing-4) var(--spacing-5)", borderLeft: "3px solid var(--color-violet-600)", background: "var(--color-bg-subtle)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>{f.text}</div>
      );
    }
    if (f.k === "preview") {
      return (
        <div key={i} style={{ width: "100%", padding: "var(--spacing-6)", borderLeft: "3px solid var(--color-violet-600)", background: "var(--color-bg-subtle)", borderRadius: "var(--radius-md)", textAlign: "center", fontSize: "var(--font-size-xl)", color: "var(--color-text-primary)", fontFamily: typeof draft.font === "string" ? `${draft.font}, sans-serif` : undefined }}>{f.text}</div>
      );
    }
    // info: a fact with no control
    return (
      <div key={i} className="flex w-full items-center justify-between gap-[var(--spacing-6)] py-[var(--spacing-4)]">
        <div>
          <div className="text-sm leading-sm text-text-primary">{f.label}</div>
          <div className="mt-[2px] text-xs leading-xs text-text-tertiary">{f.desc}</div>
        </div>
        <span className="shrink-0 text-sm leading-sm text-text-secondary">{f.value}</span>
      </div>
    );
  };

  return (
    <DialogShell title={spec.title} icon={spec.icon} onClose={actions.closeModal} truth={DIALOG_TRUTH[id]}
      footer={<>
        <Button hierarchy="secondary" size="md" onClick={reset}>Reset to Default</Button>
        <Button hierarchy="primary" size="md" onClick={save}>Save</Button>
      </>}>
      {spec.rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap: "var(--spacing-6)", alignItems: "flex-end" }}>
          {row.map((f, fi) => renderField(f, fi))}
        </div>
      ))}
    </DialogShell>
  );
}

// ── Reusable card shell (violet header + scrollable body + footer) ────────────
function DialogShell({ title, icon, onClose, footer, truth, width = 460, children }: { title: string; icon: string; onClose: () => void; footer: React.ReactNode; truth?: string; width?: number; children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 88, background: "rgba(20,8,30,.34)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width, maxWidth: "90vw", background: "var(--color-bg-surface)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--elevation-6)", overflow: "hidden", animation: "ideeza-rise .2s cubic-bezier(.2,.9,.3,1.1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--spacing-6) var(--spacing-8)", background: "var(--color-violet-600)", color: "#fff" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", fontSize: "var(--font-size-lg)", fontWeight: 700 }}>
            <span style={{ width: 24, height: 24, borderRadius: "var(--radius-md)", background: "rgba(255,255,255,.18)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><DsIcon name={icon} size={15} /></span>
            {title}
          </span>
          <button type="button" aria-label="Close" onClick={onClose} style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", display: "inline-flex", padding: 4, borderRadius: "var(--radius-md)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div style={{ padding: "var(--spacing-7) var(--spacing-8)", display: "flex", flexDirection: "column", gap: "var(--spacing-5)", maxHeight: "70vh", overflowY: "auto" }}>
          {truth && <p className="text-sm leading-sm text-text-tertiary">{truth}</p>}
          {children}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-4)", padding: "var(--spacing-5) var(--spacing-8) var(--spacing-7)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

// ── Online Chat (spec §13) — floating support panel, not a modal ──────────────
// Opened ONLY from Help ▸ Online Chat (state.chatOpen); expanded panel over the
// 3D view, never blocks the canvas. No persistent minimized bubble — it used to
// sit bottom-right and overlap the status bar, so the panel only shows when the
// user explicitly opens it, and closes back to nothing.
export function OnlineChat() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [msg, setMsg] = React.useState("");
  if (!state.chatOpen) return null;
  const bubble = (mine: boolean): React.CSSProperties => ({ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", padding: "var(--spacing-3) var(--spacing-4)", background: mine ? "var(--color-violet-600)" : "var(--color-bg-subtle)", color: mine ? "#fff" : "var(--color-text-primary)", borderRadius: "var(--radius-lg)", fontSize: "var(--font-size-sm)", lineHeight: 1.4 });
  return (
    <div style={{ position: "absolute", right: 20, bottom: 64, zIndex: 80, width: 322, maxWidth: "calc(100vw - 40px)", background: "var(--color-bg-surface)", borderRadius: "var(--radius-xl)", boxShadow: "var(--elevation-6)", border: "var(--border-width-1) solid var(--color-border-subtle)", overflow: "hidden", display: "flex", flexDirection: "column", animation: "ideeza-rise .18s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--spacing-5) var(--spacing-6)", background: "var(--color-violet-600)", color: "#fff" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", fontWeight: 700, fontSize: "var(--font-size-md)" }}>
          <span style={{ display: "inline-flex" }} dangerouslySetInnerHTML={{ __html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' }} />
          Ideeza Support
        </span>
        <button type="button" aria-label="Minimize chat" onClick={() => actions.setChatOpen(false)} style={{ border: "none", background: "transparent", color: "#fff", cursor: "pointer", display: "inline-flex", padding: 2 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div style={{ padding: "var(--spacing-6)", display: "flex", flexDirection: "column", gap: "var(--spacing-4)", maxHeight: 300, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>
          <span style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-violet-400, #b088e8)", flex: "0 0 auto" }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Amina · Support</div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>Typically replies in 2 minutes</div>
          </div>
        </div>
        <div style={bubble(false)}>Hi! Need help with the 3D export or anything else in PCB Creator?</div>
        <div style={bubble(true)}>My STL export is missing the component models</div>
      </div>
      <div style={{ padding: "var(--spacing-4) var(--spacing-6) var(--spacing-6)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        <input value={msg} placeholder="Type a message…" onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && msg.trim()) { actions.flashToast("Message sent"); setMsg(""); } }} style={INPUT} />
      </div>
    </div>
  );
}
