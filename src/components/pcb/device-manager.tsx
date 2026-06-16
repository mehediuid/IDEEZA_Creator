"use client";

// IDEEZA PCB Software — Device Manager.
// Opened from the Tools menu (store.manager === "device"). Full-screen overlay:
// left = scrollable component table, right = current/target device symbol +
// attribute tables + markup options. Cancel / Replace footer (Button).

import * as React from "react";
import { Button, IconButton, Checkbox } from "@/components/ideeza";
import { Icon } from "@/lib/pcb/icons";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

const CLOSE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const SYMBOL_SVG =
  '<svg viewBox="0 0 120 80" fill="none" stroke="var(--color-text-primary)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="34" y="20" width="52" height="40" rx="2"/><path d="M14 32h20M14 48h20M86 32h20M86 48h20"/><path d="M44 30v20M52 30v20" stroke-width="1.2"/></svg>';

type Row = { des: string; comment: string; foot: string; info: string };

const ROWS: Row[] = [
  { des: "C1", comment: "100nF", foot: "0402", info: "HDR-M_2.54_2x10" },
  { des: "C2", comment: "100nF", foot: "0402", info: "HDR-M_2.54_2x10" },
  { des: "C3", comment: "10uF", foot: "0603", info: "HDR-M_2.54_2x08" },
  { des: "C4", comment: "100nF", foot: "0402", info: "HDR-M_2.54_2x10" },
  { des: "C5", comment: "22pF", foot: "0402", info: "HDR-M_2.54_2x06" },
  { des: "C6", comment: "22pF", foot: "0402", info: "HDR-M_2.54_2x06" },
  { des: "R1", comment: "10k", foot: "0603", info: "HDR-M_2.54_2x10" },
  { des: "R2", comment: "10k", foot: "0603", info: "HDR-M_2.54_2x10" },
  { des: "R3", comment: "4.7k", foot: "0603", info: "HDR-M_2.54_2x08" },
  { des: "R4", comment: "1k", foot: "0402", info: "HDR-M_2.54_2x08" },
  { des: "R5", comment: "330", foot: "0402", info: "HDR-M_2.54_2x06" },
  { des: "R6", comment: "0", foot: "0402", info: "HDR-M_2.54_2x06" },
];

const CURRENT_ATTRS: [string, string, string][] = [
  ["Name", "U3e93-NBE", "—"],
  ["Value", "ATmega328P", "Comp"],
  ["Footprint", "TQFP-32", "PCB"],
  ["Designator", "U3", "Sch"],
];

const TARGET_ATTRS: [string, string, string][] = [
  ["Name", "U7c10-XBF", "—"],
  ["Value", "ATmega328PB", "Comp"],
  ["Footprint", "QFN-32", "PCB"],
  ["Designator", "U3", "Sch"],
];

const MARKUP_OPTS = [
  "Keep designators with Unique ID",
  "Keep current symbol",
  "Keep current footprint",
];

const OTHER_OPTS = [
  "Only display the device's variance properties",
  "Only Keep Target Design Tags",
  "Merge properties (Target first)",
  "Merge properties (current first)",
  "Keep the empty value Item",
];

const TH: React.CSSProperties = {
  textAlign: "left",
  fontSize: "var(--font-size-xs)",
  fontWeight: 700,
  color: "var(--color-text-secondary)",
  padding: "var(--spacing-4) var(--spacing-5)",
};
const TD: React.CSSProperties = {
  fontSize: "var(--font-size-sm)",
  color: "var(--color-text-primary)",
  padding: "var(--spacing-4) var(--spacing-5)",
};

function sectionLabel(text: string): React.ReactElement {
  return (
    <span style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>{text}</span>
  );
}

function attrTable(rows: [string, string, string][]): React.ReactElement {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", border: "var(--border-width-1) solid var(--color-border-subtle)", borderRadius: "var(--radius-md)" }}>
      <thead>
        <tr style={{ background: "var(--color-bg-subtle)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <th style={TH}>Attribute</th>
          <th style={TH}>Current</th>
          <th style={TH}>Tag</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, v, t], i) => (
          <tr key={a} style={{ background: i % 2 ? "var(--color-bg-subtle)" : "var(--color-bg-surface)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
            <td style={TD}>{a}</td>
            <td style={TD}>{v}</td>
            <td style={{ ...TD, color: "var(--color-text-tertiary)" }}>{t}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DeviceManager() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [rowChecks, setRowChecks] = React.useState<boolean[]>(() => ROWS.map(() => false));
  const [markup, setMarkup] = React.useState<Record<string, boolean>>({ "Keep current symbol": true });

  if (state.manager !== "device") return null;

  const toggleRow = (i: number) =>
    setRowChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  const allChecked = rowChecks.every(Boolean);
  const toggleAll = () => setRowChecks(ROWS.map(() => !allChecked));
  const toggleMarkup = (label: string) => setMarkup((m) => ({ ...m, [label]: !m[label] }));

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
          <span style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: "var(--color-text-primary)" }}>Device Manager</span>
          <IconButton hierarchy="ghost" size="sm" aria-label="Close" onClick={actions.closeManager} icon={<Icon html={CLOSE_SVG} />} />
        </div>

        {/* body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* LEFT — component table */}
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
                  <div style={{ ...TD, fontSize: "var(--font-size-xs)", fontWeight: 600 }}>{r.des}</div>
                  <div style={{ ...TD, fontSize: "var(--font-size-xs)" }}>{r.comment}</div>
                  <div style={{ ...TD, fontSize: "var(--font-size-xs)" }}>{r.foot}</div>
                  <div style={{ ...TD, fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>{r.info}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — current / target device */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "var(--spacing-7)",
              padding: "var(--spacing-8) var(--spacing-10)",
              overflowY: "auto",
            }}
          >
            {/* Current device */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-5)" }}>
              {sectionLabel("Current Device")}
              <div style={{ display: "flex", gap: "var(--spacing-8)", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 120,
                    height: 80,
                    flex: "0 0 auto",
                    border: "var(--border-width-1) solid var(--color-border-default)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-bg-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon html={SYMBOL_SVG} size={120} style={{ height: 80 }} />
                </div>
                <div style={{ flex: 1 }}>{attrTable(CURRENT_ATTRS)}</div>
              </div>
            </div>

            {/* Target device */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-5)" }}>
              {sectionLabel("Target Device")}

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-3)" }}>
                <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-secondary)" }}>Edit Mark up</span>
                {MARKUP_OPTS.map((label) => (
                  <div
                    key={label}
                    className="ix-row"
                    onClick={() => toggleMarkup(label)}
                    style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-2) var(--spacing-0)", cursor: "pointer" }}
                  >
                    <Checkbox checked={!!markup[label]} onChange={() => toggleMarkup(label)} size="md" />
                    <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{label}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-3)" }}>
                <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-secondary)" }}>Other properties</span>
                {OTHER_OPTS.map((label) => (
                  <div
                    key={label}
                    className="ix-row"
                    onClick={() => toggleMarkup(label)}
                    style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-2) var(--spacing-0)", cursor: "pointer" }}
                  >
                    <Checkbox checked={!!markup[label]} onChange={() => toggleMarkup(label)} size="md" />
                    <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{label}</span>
                  </div>
                ))}
              </div>

              <div style={{ flex: 1 }}>{attrTable(TARGET_ATTRS)}</div>
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
          <Button hierarchy="primary" size="lg" onClick={actions.closeManager}>Replace</Button>
        </div>
      </div>
    </div>
  );
}
