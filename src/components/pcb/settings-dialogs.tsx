"use client";

// IDEEZA PCB — 3D-view standalone Setting dialogs (Ideeza_PCB3D_Dialogs spec).
// Each 3D-menu "Setting > X" item opens its own lightweight card modal (as the
// designer drew them), not the unified SettingsOverlay. Data-driven: every
// dialog is a spec of rows/fields rendered by one component; values persist to
// localStorage so Save/Reset are real.

import * as React from "react";
import { Button, Select } from "@/components/ideeza";
import { DsIcon } from "@/lib/pcb/icons";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

const STORE_KEY = "ideeza:pcb:appSettings";

// ── Field / dialog spec ───────────────────────────────────────────────────────
type Field =
  | { k: "sel"; key: string; label: string; options: string[]; def: string }
  | { k: "txt"; key: string; label: string; def: string }
  | { k: "tog"; key: string; label: string; desc?: string; def: boolean }
  | { k: "pills"; key: string; label: string; options: string[]; def: string[] }
  | { k: "note"; text: string }
  | { k: "preview"; text: string }
  | { k: "cache"; key: string; label: string; value: string; button: string };
type Row = Field[]; // input fields (sel/txt) render side-by-side; others full-width
type DialogSpec = { title: string; icon: string; rows: Row[] };

// Every 3D Setting dialog, keyed by its ModalId.
export const SETTING_DIALOGS: Record<string, DialogSpec> = {
  set3dSysGeneral: {
    title: "System — General",
    icon: "sys",
    rows: [
      [
        { k: "sel", key: "measurementUnit", label: "Measurement Unit", options: ["Millimeters (mm)", "Mils", "Inches"], def: "Millimeters (mm)" },
        { k: "sel", key: "language", label: "Language", options: ["English", "中文", "日本語", "Deutsch"], def: "English" },
      ],
      [{ k: "tog", key: "autoSave", label: "Auto-save", desc: "Every 5 minutes", def: true }],
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
      [{ k: "cache", key: "libCache", label: "Local cache size", value: "1.8 GB used", button: "Clear Cache" }],
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
    title: "Panel/Panel Lib — Theme",
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
        { k: "sel", key: "silkFont", label: "Silkscreen Font", options: ["Ideeza Sans", "Ideeza Mono", "Arial"], def: "Ideeza Sans" },
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

function loadSaved(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(STORE_KEY) || "{}"); } catch { return {}; }
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
  const actions = usePcbActions();
  const [draft, setDraft] = React.useState<Record<string, unknown>>(() => ({ ...defaultsOf(spec), ...loadSaved() }));
  if (!spec) return null;

  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  const save = () => {
    const merged = { ...loadSaved(), ...draft };
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(merged)); } catch {}
    // Wire the settings that drive real app behaviour.
    if (id === "set3dSysGeneral") {
      const u = String(draft.measurementUnit || "");
      actions.setUnit(u.startsWith("Mil") && !u.startsWith("Milli") ? "Mil" : u.startsWith("Inch") ? "Inch" : "mm");
    }
    actions.flashToast(`${spec.title} — saved`);
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
        <div key={i} style={{ width: "100%", padding: "var(--spacing-6)", borderLeft: "3px solid var(--color-violet-600)", background: "var(--color-bg-subtle)", borderRadius: "var(--radius-md)", textAlign: "center", fontSize: "var(--font-size-xl)", color: "var(--color-text-primary)" }}>{f.text}</div>
      );
    }
    // cache
    return (
      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "var(--spacing-4) 0" }}>
        <div>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{f.label}</div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>{f.value}</div>
        </div>
        <Button hierarchy="secondary" size="sm" onClick={() => actions.flashToast("Cache cleared")}>{f.button}</Button>
      </div>
    );
  };

  return (
    <DialogShell title={spec.title} icon={spec.icon} onClose={actions.closeModal}
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
function DialogShell({ title, icon, onClose, footer, width = 460, children }: { title: string; icon: string; onClose: () => void; footer: React.ReactNode; width?: number; children: React.ReactNode }) {
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
          {children}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-4)", padding: "var(--spacing-5) var(--spacing-8) var(--spacing-7)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

// ── Hotkey dialog (spec §11) — search + keybindings grouped by menu ───────────
const HOTKEY_GROUPS: { group: string; rows: { action: string; key: string }[] }[] = [
  { group: "VIEW", rows: [
    { action: "Full Screen", key: "F11" },
    { action: "Window Arrangement › Tile Horizontally", key: "H" },
    { action: "Window Arrangement › Merge All", key: "M" },
  ] },
  { group: "HELP", rows: [{ action: "Tutorials", key: "F1" }] },
];

export function HotkeyDialog() {
  const actions = usePcbActions();
  const [q, setQ] = React.useState("");
  const groups = HOTKEY_GROUPS
    .map((g) => ({ ...g, rows: g.rows.filter((r) => r.action.toLowerCase().includes(q.toLowerCase())) }))
    .filter((g) => g.rows.length);
  return (
    <DialogShell title="Hotkey" icon="key" onClose={actions.closeModal} width={540}
      footer={<>
        <Button hierarchy="secondary" size="md" onClick={() => { setQ(""); actions.flashToast("Hotkeys reset to default"); }}>Reset All to Default</Button>
        <Button hierarchy="primary" size="md" onClick={() => { actions.flashToast("Hotkeys saved"); actions.closeModal(); }}>Save</Button>
      </>}>
      <input placeholder="Search actions…" value={q} onChange={(e) => setQ(e.target.value)} style={INPUT} />
      {groups.map((g) => (
        <div key={g.group}>
          <div style={{ ...LABEL, color: "var(--color-text-brand)", marginBottom: "var(--spacing-2)" }}>{g.group}</div>
          {g.rows.map((r) => (
            <div key={r.action} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--spacing-4) 0", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{r.action}</span>
              <kbd style={{ padding: "3px 9px", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-sm)", background: "var(--color-bg-subtle)", fontSize: "var(--font-size-xs)", fontFamily: "monospace", color: "var(--color-text-secondary)" }}>{r.key}</kbd>
            </div>
          ))}
        </div>
      ))}
      {groups.length === 0 && <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", textAlign: "center", padding: "var(--spacing-6)" }}>No actions match &ldquo;{q}&rdquo;</div>}
    </DialogShell>
  );
}

// ── Top Toolbar dialog (spec §12) — two-column customizer ─────────────────────
const TOOLBAR_TOOLS = ["Pan (Hand Tool)", "Zoom In / Out", "Top / Bottom / Left / Right View", "Outline / Normal View", "Dimension Measurement", "Align Object", "Back View"];
const TOOLBAR_DEFAULT = ["Pan (Hand Tool)", "Zoom In / Out", "Top / Bottom / Left / Right View", "Outline / Normal View"];

export function TopToolbarDialog() {
  const actions = usePcbActions();
  const [active, setActive] = React.useState<string[]>(() => {
    const s = loadSaved();
    return Array.isArray(s.threeDToolbar) ? (s.threeDToolbar as string[]) : TOOLBAR_DEFAULT;
  });
  const toggle = (t: string) => setActive((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t]));
  const col = (title: string, items: string[]) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={LABEL}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2)" }}>
        {items.map((t) => {
          const on = active.includes(t);
          return (
            <div key={t} onClick={() => toggle(t)} className="ix-row" style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", padding: "var(--spacing-3) var(--spacing-4)", border: "var(--border-width-1) solid var(--color-border-subtle)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
              <span style={{ width: 15, height: 15, borderRadius: 4, border: `2px solid ${on ? "var(--color-violet-600)" : "var(--color-border-default)"}`, background: on ? "var(--color-violet-600)" : "transparent", flex: "0 0 auto" }} />
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t}</span>
            </div>
          );
        })}
        {items.length === 0 && <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", padding: "var(--spacing-4)" }}>—</div>}
      </div>
    </div>
  );
  const save = () => {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify({ ...loadSaved(), threeDToolbar: active })); } catch {}
    actions.flashToast("Top toolbar saved");
    actions.closeModal();
  };
  return (
    <DialogShell title="Top Toolbar" icon="grid" onClose={actions.closeModal} width={580}
      footer={<>
        <Button hierarchy="secondary" size="md" onClick={() => setActive(TOOLBAR_DEFAULT)}>Reset to Default</Button>
        <Button hierarchy="primary" size="md" onClick={save}>Save</Button>
      </>}>
      <div style={{ display: "flex", gap: "var(--spacing-6)" }}>
        {col("Available Tools", TOOLBAR_TOOLS.filter((t) => !active.includes(t)))}
        {col("Active on Toolbar", TOOLBAR_TOOLS.filter((t) => active.includes(t)))}
      </div>
    </DialogShell>
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
