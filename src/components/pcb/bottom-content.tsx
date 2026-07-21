"use client";

// IDEEZA PCB Software — bottom-panel tab content (real React, interactive).
// Replaces the old buildBottom() HTML-string mock. Five tabs, each a two-pane
// layout (left controls + right data): Log · Parts Audit (Device
// Standardization) · DRC · Find Result · Property List. Controls actually work
// — severity filters filter, chips filter, search filters, selection drives
// Property List, and Find Result reads store.findResults.

import * as React from "react";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import type { CanvasObject } from "@/lib/pcb/types";

// ── shared atoms ─────────────────────────────────────────────────────────────
const T = {
  ink: "var(--color-text-primary)",
  ink2: "var(--color-text-secondary)",
  mut: "var(--color-text-tertiary)",
  line: "var(--color-border-subtle)",
  line2: "var(--color-border-default)",
  brand: "var(--color-violet-600)",
  sm: "var(--font-size-sm)",
  xs: "var(--font-size-xs)",
};

function Pane({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      <div style={{ width: 208, flex: "0 0 auto", borderRight: `1px solid ${T.line2}`, padding: "12px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {left}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>{right}</div>
    </div>
  );
}

function Btn({ children, onClick, primary, full }: { children: React.ReactNode; onClick?: () => void; primary?: boolean; full?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "6px 12px", borderRadius: "var(--radius-md)", cursor: "pointer",
        fontSize: T.sm, fontWeight: 600, fontFamily: "inherit",
        width: full ? "100%" : undefined,
        background: primary ? T.brand : "transparent",
        color: primary ? "var(--color-text-on-brand)" : T.ink2,
        border: primary ? "none" : `1px solid ${T.line2}`,
      }}
    >
      {children}
    </button>
  );
}

function Check({ label, count, color, on, onToggle }: { label: string; count: number; color?: string; on: boolean; onToggle: () => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "3px 0", fontSize: T.sm }}>
      <span style={{ width: 15, height: 15, borderRadius: 4, flex: "0 0 auto", border: `1.5px solid ${on ? T.brand : "var(--color-border-strong)"}`, background: on ? T.brand : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-on-brand)" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6" /></svg>}
      </span>
      {color && <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flex: "0 0 auto" }} />}
      <span style={{ flex: 1, color: T.ink }}>{label}</span>
      <span style={{ color: T.mut, fontVariantNumeric: "tabular-nums" }}>{count}</span>
    </label>
  );
}

function Chip({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, cursor: "pointer",
      fontSize: T.xs, fontWeight: active ? 700 : 500, fontFamily: "inherit",
      background: active ? "var(--color-bg-brand-subtle)" : "transparent",
      color: active ? T.brand : T.ink2, border: `1px solid ${active ? "var(--color-border-brand)" : T.line2}`,
    }}>
      {label}{count != null && <span style={{ color: active ? T.brand : T.mut }}>{count}</span>}
    </button>
  );
}

function Tgl({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: T.sm, color: T.ink2 }}>
      <span onClick={onToggle} style={{ width: 30, height: 17, borderRadius: 999, flex: "0 0 auto", background: on ? T.brand : "var(--color-border-strong)", position: "relative", transition: "background .15s" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 15 : 2, width: 13, height: 13, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
      </span>
      {label}
    </label>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "9px 12px", fontSize: T.xs, fontWeight: 700, color: T.mut, textTransform: "uppercase", letterSpacing: ".3px", whiteSpace: "nowrap", position: "sticky", top: 0, background: "var(--color-bg-surface)", borderBottom: `1px solid ${T.line2}` };
const td: React.CSSProperties = { padding: "9px 12px", fontSize: T.sm, color: T.ink2, whiteSpace: "nowrap", borderBottom: `1px solid ${T.line}` };

function Empty({ text }: { text: string }) {
  return <div style={{ height: "100%", minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center", color: T.mut, fontSize: T.sm }}>{text}</div>;
}

// ── severity model (shared by Log + DRC) ─────────────────────────────────────
type Sev = "fatal" | "error" | "warn" | "info";
const SEV: Record<Sev, { label: string; color: string }> = {
  fatal: { label: "Fatal Error", color: "var(--color-text-error)" },
  error: { label: "Error", color: "#e0742e" },
  warn: { label: "Warn", color: "var(--color-text-warning)" },
  info: { label: "Info", color: "var(--color-text-secondary)" },
};
const SEV_ORDER: Sev[] = ["fatal", "error", "warn", "info"];

function SevControls({ rows, sev, setSev, onExport, onClear }: {
  rows: Array<{ sev: Sev }>; sev: Record<Sev, boolean>;
  setSev: (v: Record<Sev, boolean>) => void; onExport: () => void; onClear: () => void;
}) {
  const all = SEV_ORDER.every((k) => sev[k]);
  return (
    <>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={onExport}>Export</Btn>
        <Btn onClick={onClear}>Clear</Btn>
      </div>
      <div style={{ marginTop: 4 }}>
        <Check label="All" count={rows.length} on={all} onToggle={() => setSev(SEV_ORDER.reduce((a, k) => ({ ...a, [k]: !all }), {} as Record<Sev, boolean>))} />
        {SEV_ORDER.map((k) => (
          <Check key={k} label={SEV[k].label} color={SEV[k].color} count={rows.filter((r) => r.sev === k).length} on={sev[k]} onToggle={() => setSev({ ...sev, [k]: !sev[k] })} />
        ))}
      </div>
    </>
  );
}

// ── Log tab ──────────────────────────────────────────────────────────────────
interface LogRow { ts: string; sev: Sev; msg: string; links?: string[]; tail?: string }
const LOG_ROWS: LogRow[] = [
  { ts: "2026-07-19 10:04:21", sev: "info", msg: 'Project "Testing" loaded successfully' },
  { ts: "2026-07-19 10:04:22", sev: "info", msg: "Schematic Board-1 / Page-1 opened" },
  { ts: "2026-07-19 10:05:13", sev: "warn", msg: "Net N12 has only one connection" },
  { ts: "2026-07-19 10:06:02", sev: "info", msg: "Auto-save completed" },
  { ts: "2026-07-19 10:07:44", sev: "error", msg: "Footprint missing for", links: ["U3"], tail: "(LM358)" },
  { ts: "2026-07-19 10:08:10", sev: "warn", msg: "Designator R5 duplicated — auto-renamed to R7" },
  { ts: "2026-07-19 10:09:12", sev: "fatal", msg: "3D binding failed — not generated in 3D:", links: ["SCREW1", "SCREW2", "SCREW3", "SCREW4"] },
  { ts: "2026-07-19 10:09:55", sev: "info", msg: "Converted schematic to PCB · 42 parts placed" },
];

function LinkList({ names }: { names: string[] }) {
  const actions = usePcbActions();
  return (
    <>
      {names.map((n, i) => (
        <React.Fragment key={n}>
          <span onClick={() => actions.flashToast(`Locate ${n}`)} style={{ color: T.brand, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>{n}</span>
          {i < names.length - 1 && <span style={{ color: T.mut }}>, </span>}
        </React.Fragment>
      ))}
    </>
  );
}

function LogTab() {
  const actions = usePcbActions();
  const [rows, setRows] = React.useState<LogRow[]>(LOG_ROWS);
  const [sev, setSev] = React.useState<Record<Sev, boolean>>({ fatal: true, error: true, warn: true, info: true });
  const shown = rows.filter((r) => sev[r.sev]);
  return (
    <Pane
      left={<SevControls rows={rows} sev={sev} setSev={setSev} onExport={() => actions.flashToast(`Exported ${shown.length} log entries`)} onClear={() => setRows([])} />}
      right={
        shown.length === 0 ? <Empty text="No log entries" /> : (
          <div style={{ padding: "4px 0" }}>
            {shown.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "baseline", padding: "6px 16px", borderBottom: `1px solid ${T.line}`, fontSize: T.sm }}>
                <span style={{ color: T.mut, width: 128, flex: "0 0 auto", fontVariantNumeric: "tabular-nums" }}>{r.ts}</span>
                <span style={{ color: SEV[r.sev].color, fontWeight: 700, width: 74, flex: "0 0 auto", fontSize: T.xs }}>[{SEV[r.sev].label}]</span>
                <span style={{ color: T.ink2 }}>{r.msg} {r.links && <LinkList names={r.links} />} {r.tail}</span>
              </div>
            ))}
          </div>
        )
      }
    />
  );
}

// ── Parts Audit (Device Standardization) tab ─────────────────────────────────
interface DevRow { no: number; desig: string; cat: string; supPart: string; supplier: string; stock: string; price: string; comment: string; fp: string; count: number; mfrPart: string; mfr: string }
const DEV_ROWS: DevRow[] = [
  { no: 1, desig: "C7,C8", cat: "exact", supPart: "C1525", supplier: "LCSC", stock: "48,210", price: "0.001", comment: "100nF", fp: "C0402", count: 2, mfrPart: "CL05B104", mfr: "SAMSUNG" },
  { no: 2, desig: "R1,R2", cat: "exact", supPart: "C25804", supplier: "LCSC", stock: "120,000", price: "0.0008", comment: "10k", fp: "R0603", count: 2, mfrPart: "0603WAF1002", mfr: "UNI-ROYAL" },
  { no: 3, desig: "U3", cat: "undetermined", supPart: "—", supplier: "—", stock: "—", price: "—", comment: "LM358", fp: "SOIC-8", count: 1, mfrPart: "—", mfr: "—" },
  { no: 4, desig: "J1", cat: "notcheck", supPart: "—", supplier: "—", stock: "—", price: "—", comment: "USB-C", fp: "TYPE-C-16P", count: 1, mfrPart: "—", mfr: "—" },
  { no: 5, desig: "D2", cat: "alloc", supPart: "C2128", supplier: "LCSC", stock: "9,400", price: "0.004", comment: "1N4148", fp: "SOD-123", count: 1, mfrPart: "1N4148W", mfr: "DIODES" },
  { no: 6, desig: "Q1", cat: "exact", supPart: "C6295", supplier: "LCSC", stock: "31,200", price: "0.012", comment: "BSS138", fp: "SOT-23", count: 1, mfrPart: "BSS138", mfr: "ONSEMI" },
];
const DEV_FILTERS: Array<[string, string]> = [["all", "All"], ["undetermined", "Undetermined"], ["alloc", "Allocation Number"], ["exact", "Exact Match"], ["notcheck", "Not Check"]];
const DEV_COLS = ["No.", "Designator", "Operation", "Supplier Part", "Supplier", "LCSC Stock", "Unit Price", "Comment", "Footprint", "Count", "Manufacturer Part", "Manufacturer"];

function DeviceTab() {
  const actions = usePcbActions();
  const [filter, setFilter] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [combined, setCombined] = React.useState(true);
  const [recs, setRecs] = React.useState(true);
  const [sel, setSel] = React.useState<Set<number>>(new Set());
  const count = (c: string) => (c === "all" ? DEV_ROWS.length : DEV_ROWS.filter((r) => r.cat === c).length);
  const shown = DEV_ROWS.filter((r) => (filter === "all" || r.cat === filter) && (!q || r.desig.toLowerCase().includes(q.toLowerCase()) || r.comment.toLowerCase().includes(q.toLowerCase())));
  const toggleRow = (n: number) => setSel((s) => { const c = new Set(s); c.has(n) ? c.delete(n) : c.add(n); return c; });
  return (
    <Pane
      left={
        <>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, at least 2 characters" style={{ padding: "7px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${T.line2}`, background: "var(--color-bg-subtle)", color: T.ink, fontSize: T.sm, fontFamily: "inherit", outline: "none" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {DEV_FILTERS.map(([k, l]) => <Chip key={k} label={l} count={count(k)} active={filter === k} onClick={() => setFilter(k)} />)}
          </div>
          <div style={{ height: 1, background: T.line, margin: "4px 0" }} />
          <Tgl label="Combined Designators" on={combined} onToggle={() => setCombined((v) => !v)} />
          <Tgl label="Show Recommendations" on={recs} onToggle={() => setRecs((v) => !v)} />
          <Btn full onClick={() => actions.flashToast("Re-scanned schematic for designators")}>Refresh List</Btn>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn onClick={() => actions.flashToast(`${sel.size || "0"} row(s) → Check`)}>Set to Check</Btn>
            <Btn onClick={() => actions.flashToast(`${sel.size || "0"} row(s) → Not Check`)}>Not Check</Btn>
          </div>
        </>
      }
      right={
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th style={{ ...th, width: 30 }}></th>{DEV_COLS.map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.no}>
                <td style={td}><input type="checkbox" checked={sel.has(r.no)} onChange={() => toggleRow(r.no)} /></td>
                <td style={td}>{r.no}</td>
                <td style={{ ...td, color: T.ink, fontWeight: 600 }}>{r.desig}</td>
                <td style={td}><span onClick={() => actions.flashToast(`Assign LCSC part for ${r.desig}`)} style={{ color: T.brand, cursor: "pointer" }}>Assign LCSC Part</span></td>
                <td style={td}>{r.supPart}</td><td style={td}>{r.supplier}</td><td style={td}>{r.stock}</td><td style={td}>{r.price}</td>
                <td style={td}>{r.comment}</td><td style={td}>{r.fp}</td><td style={td}>{r.count}</td><td style={td}>{r.mfrPart}</td><td style={td}>{r.mfr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    />
  );
}

// ── DRC tab ──────────────────────────────────────────────────────────────────
interface DrcRow { sev: Sev; title: string; loc: string }
const DRC_ROWS: DrcRow[] = [
  { sev: "fatal", title: "Clearance Violation", loc: "Track to Pad < 0.15mm near U3.2" },
  { sev: "error", title: "Unrouted Net", loc: "Net VCC not fully routed (2 segments left)" },
  { sev: "warn", title: "Silkscreen Overlap", loc: "R5 designator overlaps component pad" },
  { sev: "warn", title: "Acute Angle", loc: "Track angle < 90° at junction J1.1" },
  { sev: "info", title: "Hole Size Check", loc: "124 holes within tolerance — passed" },
  { sev: "info", title: "Annular Ring", loc: "All vias meet minimum ring — passed" },
];

function DrcTab() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [ran, setRan] = React.useState(false);
  const [sev, setSev] = React.useState<Record<Sev, boolean>>({ fatal: true, error: true, warn: true, info: true });

  // Schematic → live ERC (Electrical Rule Check) from real connectivity.
  if (state.mode === "schematic") {
    const issues = state.ercResults;
    const col = { fatal: SEV.fatal.color, error: SEV.error.color, warning: SEV.warn.color, note: SEV.info.color };
    return (
      <Pane
        left={
          <>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn primary full onClick={() => actions.runErcCheck()}>Run ERC</Btn>
            </div>
            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: T.sm, color: T.mut }}>Fatal: {issues.filter((i) => i.severity === "fatal").length}</div>
              <div style={{ fontSize: T.sm, color: T.mut }}>Errors: {issues.filter((i) => i.severity === "error").length}</div>
              <div style={{ fontSize: T.sm, color: T.mut }}>Warnings: {issues.filter((i) => i.severity === "warning").length}</div>
              <div style={{ fontSize: T.sm, color: T.mut }}>Notes: {issues.filter((i) => i.severity === "note").length}</div>
            </div>
          </>
        }
        right={
          issues.length === 0 ? <Empty text='Click "Run ERC" to check the schematic connectivity' /> : (
            <div style={{ padding: "4px 0" }}>
              {issues.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "9px 16px", borderBottom: `1px solid ${T.line}` }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: col[r.severity], marginTop: 5, flex: "0 0 auto" }} />
                  <div><div style={{ fontSize: T.sm, fontWeight: 600, color: T.ink }}>{r.title}</div><div style={{ fontSize: T.sm, color: T.mut }}>{r.detail}</div></div>
                </div>
              ))}
            </div>
          )
        }
      />
    );
  }

  const shown = DRC_ROWS.filter((r) => sev[r.sev]);
  return (
    <Pane
      left={
        <>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn primary full onClick={() => { setRan(true); actions.flashToast("Design rule check complete"); }}>Check DRC</Btn>
            <Btn onClick={() => actions.flashToast("DRC rule settings — coming soon")}>⚙</Btn>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => actions.flashToast("Exported DRC results")}>Export</Btn>
            <Btn onClick={() => setRan(false)}>Clear</Btn>
          </div>
          <div style={{ marginTop: 4 }}>
            <Check label="All" count={DRC_ROWS.length} on={SEV_ORDER.every((k) => sev[k])} onToggle={() => { const all = SEV_ORDER.every((k) => sev[k]); setSev(SEV_ORDER.reduce((a, k) => ({ ...a, [k]: !all }), {} as Record<Sev, boolean>)); }} />
            {SEV_ORDER.map((k) => <Check key={k} label={SEV[k].label} color={SEV[k].color} count={DRC_ROWS.filter((r) => r.sev === k).length} on={sev[k]} onToggle={() => setSev({ ...sev, [k]: !sev[k] })} />)}
          </div>
        </>
      }
      right={
        !ran ? <Empty text='Click "Check DRC" to run the design rule check' /> : shown.length === 0 ? <Empty text="No violations at these severities" /> : (
          <div style={{ padding: "4px 0" }}>
            {shown.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "9px 16px", borderBottom: `1px solid ${T.line}` }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: SEV[r.sev].color, marginTop: 5, flex: "0 0 auto" }} />
                <div><div style={{ fontSize: T.sm, fontWeight: 600, color: T.ink }}>{r.title}</div><div style={{ fontSize: T.sm, color: T.mut }}>{r.loc}</div></div>
              </div>
            ))}
          </div>
        )
      }
    />
  );
}

// ── Find Result tab ──────────────────────────────────────────────────────────
const FIND_COLS = ["No.", "ID", "Page", "Device", "Symbol", "Name", "Global Net Name", "Pin Name"];
function FindResultTab() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [kind, setKind] = React.useState("all");
  const results = state.findResults;
  const kinds = Array.from(new Set(results.map((r) => r.kind)));
  const shown = results.filter((r) => kind === "all" || r.kind === kind);
  if (results.length === 0) return <Empty text="No Data!  —  press Ctrl+F, search, then Find All" />;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${T.line2}`, flexWrap: "wrap" }}>
        <Btn onClick={() => actions.clearFind()}>Clear</Btn>
        <Chip label="All" count={results.length} active={kind === "all"} onClick={() => setKind("all")} />
        {kinds.map((k) => <Chip key={k} label={k} count={results.filter((r) => r.kind === k).length} active={kind === k} onClick={() => setKind(k)} />)}
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>{FIND_COLS.map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => actions.selectMany([r.id])}>
                <td style={td}>{i + 1}</td><td style={td}>{r.objectId}</td><td style={td}>{r.page}</td><td style={td}>{r.device}</td>
                <td style={td}>{r.symbol}</td><td style={td}>{r.name}</td><td style={td}>{r.globalNet}</td><td style={td}>{r.pinName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Property List tab ────────────────────────────────────────────────────────
const PL_COLS = ["Object Type", "Name", "ID", "Device", "Global Net Name", "Description", "Group"];
const BATCH_FIELDS: Array<[string, string]> = [["text", "Name"], ["text", "Designator"], ["footprint", "Footprint"], ["value", "Value"], ["manufacturer", "Manufacturer"], ["manufacturerPart", "Mfr part no."], ["supplier", "Supplier"]];

function PropertyListTab() {
  const state = usePcbState();
  const actions = usePcbActions();
  const objs = state.objects.filter((o) => state.selectedIds.includes(o.id));
  const [typeFilter, setTypeFilter] = React.useState("all");
  const kinds = Array.from(new Set(objs.map((o) => o.kind)));
  if (objs.length === 0) return <Empty text="Select one or more objects to list their properties" />;

  // Mode B — mixed types → batch-edit form.
  if (kinds.length > 1) {
    const setAll = (bind: string, v: string) => objs.forEach((o) => (["text", "footprint", "comment"].includes(bind) ? actions.setObjectField(o.id, { [bind]: v } as Partial<CanvasObject>) : actions.setObjectProp(o.id, bind, v)));
    return (
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: T.xs, color: T.mut, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 10 }}>Batch edit · {objs.length} objects · {kinds.length} types</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {["all", ...kinds].map((k) => <Chip key={k} label={k === "all" ? "All" : k} count={k === "all" ? objs.length : objs.filter((o) => o.kind === k).length} active={typeFilter === k} onClick={() => setTypeFilter(k)} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "10px 24px" }}>
          {BATCH_FIELDS.map(([bind, label]) => (
            <label key={bind} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: T.sm }}>
              <span style={{ width: 96, color: T.ink2, flex: "0 0 auto" }}>{label}</span>
              <input onBlur={(e) => e.target.value && setAll(bind === "Designator" ? "text" : bind, e.target.value)} placeholder="<…>" style={{ flex: 1, minWidth: 0, padding: "6px 9px", borderRadius: "var(--radius-md)", border: `1px solid ${T.line2}`, background: "var(--color-bg-surface)", color: T.ink, fontSize: T.sm, fontFamily: "inherit", outline: "none" }} />
            </label>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: T.xs, color: T.mut }}>Type a value + tab out → applies to every selected object of that type.</div>
      </div>
    );
  }

  // Mode A — single / uniform type → read-only table.
  const shown = objs.filter((o) => typeFilter === "all" || o.kind === typeFilter);
  const cell = (o: CanvasObject) => ({
    type: o.kind, name: o.text || o.net || "—", id: o.id, device: o.footprint || o.comment || "—",
    net: o.net || "—", desc: String((o.props ?? {}).description ?? "—"), group: String((o.props ?? {}).groupName ?? "—"),
  });
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${T.line2}`, flexWrap: "wrap" }}>
        <Chip label="All" count={objs.length} active={typeFilter === "all"} onClick={() => setTypeFilter("all")} />
        {kinds.map((k) => <Chip key={k} label={k} count={objs.filter((o) => o.kind === k).length} active={typeFilter === k} onClick={() => setTypeFilter(k)} />)}
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>{PL_COLS.map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
          <tbody>
            {shown.map((o) => { const c = cell(o); return (
              <tr key={o.id} style={{ cursor: "pointer" }} onClick={() => actions.selectMany([o.id])}>
                <td style={{ ...td, color: T.ink, fontWeight: 600 }}>{c.type}</td><td style={td}>{c.name}</td><td style={td}>{c.id}</td>
                <td style={td}>{c.device}</td><td style={td}>{c.net}</td><td style={td}>{c.desc}</td><td style={td}>{c.group}</td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── switcher ─────────────────────────────────────────────────────────────────
export function BottomContent({ tab }: { tab: string }) {
  if (tab === "logs") return <LogTab />;
  if (tab === "device") return <DeviceTab />;
  if (tab === "drc") return <DrcTab />;
  if (tab === "find") return <FindResultTab />;
  if (tab === "prop") return <PropertyListTab />;
  return null;
}
