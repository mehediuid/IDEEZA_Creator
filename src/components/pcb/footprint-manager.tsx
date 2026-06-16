"use client";

// IDEEZA PCB Software — Footprint Manager.
// Opened from the Tools menu (store.manager === "footprint"). Full-screen
// overlay: left = component table + filtered footprint list + pagination,
// right = symbol preview + dimension preview (gold SMD pads). Cancel / Update
// footer (Button).

import * as React from "react";
import { Button, IconButton, Checkbox, ButtonGroup } from "@/components/ideeza";
import { Icon } from "@/lib/pcb/icons";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

const CLOSE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const SYMBOL_SVG =
  '<svg viewBox="0 0 160 90" fill="none" stroke="var(--color-text-primary)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" font-family="sans-serif"><rect x="50" y="24" width="60" height="42" rx="2"/><path d="M22 45h28M110 45h28"/><circle cx="22" cy="45" r="2.4" fill="var(--color-text-primary)"/><circle cx="138" cy="45" r="2.4" fill="var(--color-text-primary)"/><text x="40" y="40" font-size="11" fill="var(--color-text-secondary)" stroke="none">1</text><text x="118" y="40" font-size="11" fill="var(--color-text-secondary)" stroke="none">2</text></svg>';

type Row = { des: string; comment: string; foot: string; info: string };
type Foot = { name: string; pin: string; fun: string; dim: string };

const ROWS: Row[] = [
  { des: "C1", comment: "100nF", foot: "0402", info: "HDR-M_2.54_2x10" },
  { des: "C2", comment: "100nF", foot: "0402", info: "HDR-M_2.54_2x10" },
  { des: "C3", comment: "10uF", foot: "0603", info: "HDR-M_2.54_2x08" },
  { des: "R1", comment: "10k", foot: "0603", info: "HDR-M_2.54_2x10" },
  { des: "R2", comment: "10k", foot: "0603", info: "HDR-M_2.54_2x10" },
  { des: "R3", comment: "4.7k", foot: "0603", info: "HDR-M_2.54_2x08" },
  { des: "R4", comment: "1k", foot: "0402", info: "HDR-M_2.54_2x08" },
  { des: "R5", comment: "330", foot: "0402", info: "HDR-M_2.54_2x06" },
];

const FOOTS: Foot[] = [
  { name: "0402", pin: "2", fun: "C", dim: "1.0×0.5" },
  { name: "0603", pin: "2", fun: "C", dim: "1.6×0.8" },
  { name: "0805", pin: "2", fun: "R", dim: "2.0×1.2" },
  { name: "1206", pin: "2", fun: "R", dim: "3.2×1.6" },
  { name: "SOT-23", pin: "3", fun: "Q", dim: "2.9×1.3" },
  { name: "SOIC-8", pin: "8", fun: "U", dim: "4.9×3.9" },
];

const FILTERS = [
  { label: "System", value: "system" },
  { label: "Personal", value: "personal" },
  { label: "Project", value: "project" },
  { label: "Favorite", value: "favorite" },
];

const NAME_NO: [string, string][] = [
  ["Name", "0603_R"],
  ["No", "RES-0603-1608"],
];

const DIMS: [string, string][] = [
  ["Length", "1.6mm"],
  ["Width", "0.8mm"],
  ["Pitch", "1.0mm"],
];

const TH: React.CSSProperties = {
  textAlign: "left",
  fontSize: "var(--font-size-xs)",
  fontWeight: 700,
  color: "var(--color-text-secondary)",
  padding: "var(--spacing-4) var(--spacing-5)",
};
const TD: React.CSSProperties = {
  fontSize: "var(--font-size-xs)",
  color: "var(--color-text-primary)",
  padding: "var(--spacing-4) var(--spacing-5)",
};

function kvTable(rows: [string, string][]): React.ReactElement {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", border: "var(--border-width-1) solid var(--color-border-subtle)", borderRadius: "var(--radius-md)" }}>
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={k} style={{ background: i % 2 ? "var(--color-bg-subtle)" : "var(--color-bg-surface)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
            <td style={{ ...TD, fontWeight: 600, color: "var(--color-text-secondary)", width: "40%" }}>{k}</td>
            <td style={TD}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FootprintManager() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [rowChecks, setRowChecks] = React.useState<boolean[]>(() => ROWS.map(() => false));
  const [filter, setFilter] = React.useState("system");
  const [selFoot, setSelFoot] = React.useState(1);

  if (state.manager !== "footprint") return null;

  const toggleRow = (i: number) =>
    setRowChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  const allChecked = rowChecks.every(Boolean);
  const toggleAll = () => setRowChecks(ROWS.map(() => !allChecked));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 80,
        background: "rgba(20,8,30,.34)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 1120,
          height: 700,
          background: "var(--color-bg-surface)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--elevation-6)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "ideeza-rise .26s cubic-bezier(.2,.9,.3,1.1)",
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--spacing-8) var(--spacing-10)",
            borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
            flex: "0 0 auto",
          }}
        >
          <span style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: "var(--color-text-primary)" }}>Footprint Manager</span>
          <IconButton hierarchy="ghost" size="sm" aria-label="Close" onClick={actions.closeManager} icon={<Icon html={CLOSE_SVG} />} />
        </div>

        {/* body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* LEFT */}
          <div
            style={{
              width: "46%",
              flex: "0 0 auto",
              display: "flex",
              flexDirection: "column",
              borderRight: "var(--border-width-1) solid var(--color-border-subtle)",
              overflow: "hidden",
            }}
          >
            {/* component table */}
            <div style={{ flex: "0 0 auto", maxHeight: 220, display: "flex", flexDirection: "column", borderBottom: "var(--border-width-1) solid var(--color-border-default)", overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr 1fr 1fr 1.4fr",
                  alignItems: "center",
                  background: "var(--color-bg-subtle)",
                  borderBottom: "var(--border-width-1) solid var(--color-border-default)",
                  flex: "0 0 auto",
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", padding: "var(--spacing-4)" }}>
                  <Checkbox checked={allChecked} onChange={toggleAll} size="md" />
                </div>
                {["Designator", "Comment", "Footprint", "Information"].map((c) => (
                  <div key={c} style={{ ...TH }}>{c}</div>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {ROWS.map((r, i) => (
                  <div
                    key={r.des}
                    className="ix-row"
                    onClick={() => toggleRow(i)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "44px 1fr 1fr 1fr 1.4fr",
                      alignItems: "center",
                      background: i % 2 ? "var(--color-bg-subtle)" : "var(--color-bg-surface)",
                      borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "center", padding: "var(--spacing-4)" }}>
                      <Checkbox checked={rowChecks[i]} onChange={() => toggleRow(i)} size="md" />
                    </div>
                    <div style={{ ...TD, fontWeight: 600 }}>{r.des}</div>
                    <div style={TD}>{r.comment}</div>
                    <div style={TD}>{r.foot}</div>
                    <div style={{ ...TD, color: "var(--color-text-tertiary)" }}>{r.info}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* filter + footprint list */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "var(--spacing-6) var(--spacing-6) var(--spacing-0)", overflow: "hidden" }}>
              <ButtonGroup items={FILTERS} value={filter} onChange={setFilter} size="md" />

              <div style={{ flex: 1, marginTop: "var(--spacing-5)", overflowY: "auto", border: "var(--border-width-1) solid var(--color-border-subtle)", borderRadius: "var(--radius-md)" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.6fr 1fr 1fr 1.2fr",
                    background: "var(--color-bg-subtle)",
                    borderBottom: "var(--border-width-1) solid var(--color-border-default)",
                  }}
                >
                  {["Footprint", "Pin", "Fun.", "Dim."].map((c) => (
                    <div key={c} style={TH}>{c}</div>
                  ))}
                </div>
                {FOOTS.map((f, i) => (
                  <div
                    key={f.name}
                    className="ix-row"
                    onClick={() => setSelFoot(i)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.6fr 1fr 1fr 1.2fr",
                      background: selFoot === i ? "var(--color-bg-subtle)" : i % 2 ? "var(--color-bg-subtle)" : "var(--color-bg-surface)",
                      borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
                      cursor: "pointer",
                      boxShadow: selFoot === i ? "inset 2px 0 0 var(--color-violet-600)" : undefined,
                    }}
                  >
                    <div style={{ ...TD, fontWeight: 600 }}>{f.name}</div>
                    <div style={TD}>{f.pin}</div>
                    <div style={TD}>{f.fun}</div>
                    <div style={{ ...TD, color: "var(--color-text-tertiary)" }}>{f.dim}</div>
                  </div>
                ))}
              </div>

              {/* pagination */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--spacing-4)", padding: "var(--spacing-5) var(--spacing-0)", flex: "0 0 auto" }}>
                {["‹", "1", "2", "3", "…", "›"].map((p, i) => (
                  <span
                    key={i}
                    style={{
                      minWidth: 24,
                      textAlign: "center",
                      fontSize: "var(--font-size-sm)",
                      color: p === "1" ? "var(--color-text-on-brand)" : "var(--color-text-secondary)",
                      background: p === "1" ? "var(--color-violet-600)" : "transparent",
                      borderRadius: "var(--radius-sm)",
                      padding: "var(--spacing-2) var(--spacing-3)",
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "var(--spacing-8)",
              padding: "var(--spacing-8) var(--spacing-10)",
              overflowY: "auto",
            }}
          >
            {/* symbol preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-5)" }}>
              <span style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>Symbol</span>
              <div style={{ display: "flex", gap: "var(--spacing-8)", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 200,
                    height: 120,
                    flex: "0 0 auto",
                    border: "var(--border-width-1) solid var(--color-border-default)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-bg-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon html={SYMBOL_SVG} size={200} style={{ height: 120 }} />
                </div>
                <div style={{ flex: 1 }}>{kvTable(NAME_NO)}</div>
              </div>
            </div>

            {/* dimension preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-5)" }}>
              <span style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>Check Footprint Dimension</span>
              <div style={{ display: "flex", gap: "var(--spacing-8)", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 240,
                    height: 140,
                    flex: "0 0 auto",
                    border: "var(--border-width-1) solid var(--color-border-default)",
                    borderRadius: "var(--radius-md)",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="100%" height="100%" viewBox="0 0 240 140" preserveAspectRatio="xMidYMid meet">
                    <rect x="0" y="0" width="240" height="140" fill="#1a1a1a" />
                    <rect x="48" y="48" width="56" height="44" rx="6" fill="#d9a441" />
                    <rect x="136" y="48" width="56" height="44" rx="6" fill="#d9a441" />
                    <text x="76" y="120" textAnchor="middle" fontSize="11" fill="#cccccc">1</text>
                    <text x="164" y="120" textAnchor="middle" fontSize="11" fill="#cccccc">2</text>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>{kvTable(DIMS)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--spacing-5)",
            padding: "var(--spacing-7) var(--spacing-10)",
            borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
            flex: "0 0 auto",
          }}
        >
          <Button hierarchy="secondary" size="lg" onClick={actions.closeManager}>Cancel</Button>
          <Button hierarchy="primary" size="lg" onClick={actions.closeManager}>Update</Button>
        </div>
      </div>
    </div>
  );
}
