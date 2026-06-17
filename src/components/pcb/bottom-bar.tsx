"use client";

// IDEEZA PCB Software — bottom bar + collapsible bottom panel.
// The bar holds the Logs / Device Standardization / DRC / Final Result tabs and
// a chevron to toggle the panel. The panel (when open) shows the active tab's
// content via buildBottom.

import { DsIcon, Icon } from "@/lib/pcb/icons";
import { buildBottomTabs, bottomTitle } from "@/lib/pcb/data";
import { buildBottom } from "@/lib/pcb/content";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

const UPLOAD_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-violet-600)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5M9 10.8V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6.8l2 3.2H7z"/></svg>';
const REFRESH_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>';
const CLOSE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const CHEV_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>';

function ActiveLayerChip() {
  const state = usePcbState();
  const actions = usePcbActions();
  const active = state.pcbLayers.find((l) => l.id === state.activePcbLayer);
  if (!active) return null;
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}
      title="Switch active PCB layer"
    >
      Layer:
      <select
        value={state.activePcbLayer}
        onChange={(e) => actions.setActivePcbLayer(e.target.value)}
        style={{
          background: "transparent",
          color: "var(--color-text-secondary)",
          border: "none",
          outline: "none",
          fontWeight: 600,
          fontSize: "var(--font-size-xs)",
          cursor: "pointer",
        }}
      >
        {state.pcbLayers.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: 2,
          background: active.color,
          border: "1px solid rgba(0,0,0,.2)",
          display: "inline-block",
        }}
      />
    </span>
  );
}

export function BottomBar() {
  const state = usePcbState();
  const actions = usePcbActions();
  const tabs = buildBottomTabs(state, actions);

  return (
    <>
      {/* collapsible panel */}
      {state.bottomOpen && (
        <div
          style={{
            position: "absolute",
            bottom: 36,
            left: 366,
            right: 292,
            height: 248,
            background: "var(--color-bg-surface)",
            borderTop: "var(--border-width-1) solid var(--color-border-default)",
            boxShadow: "0 -8px 22px rgba(20,5,30,.07)",
            zIndex: 14,
            display: "flex",
            flexDirection: "column",
            animation: "ideeza-rise .22s cubic-bezier(.2,.9,.3,1.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--spacing-5) var(--spacing-8)",
              borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
              flex: "0 0 auto",
            }}
          >
            <span style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>{bottomTitle(state)}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>
              <div
                className="ix-tool"
                style={{ width: 28, height: 28, borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <Icon html={REFRESH_SVG} size={15} />
              </div>
              <div
                className="ix-tool"
                onClick={actions.closeBottom}
                style={{ width: 28, height: 28, borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <Icon html={CLOSE_SVG} size={16} />
              </div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }} dangerouslySetInnerHTML={{ __html: buildBottom(state.bottomTab) }} />
        </div>
      )}

      {/* bottom bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 36,
          background: "var(--color-bg-surface)",
          borderTop: "var(--border-width-1) solid var(--color-border-default)",
          display: "flex",
          alignItems: "center",
          padding: "var(--spacing-0) var(--spacing-7)",
          gap: "var(--spacing-2)",
          zIndex: 17,
        }}
      >
        <div
          className="ix-tool"
          style={{ width: 26, height: 26, borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginRight: "var(--spacing-3)" }}
        >
          <Icon html={UPLOAD_SVG} size={15} />
        </div>

        {tabs.map((b) => (
          <div
            key={b.label}
            className="ix-row"
            onClick={b.onClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-3)",
              padding: "var(--spacing-2) var(--spacing-6)",
              borderRadius: "var(--radius-lg)",
              cursor: "pointer",
              background: b.bg,
            }}
          >
            <span style={{ width: 14, height: 14, color: b.fg, display: "inline-flex" }}>
              <DsIcon name={b.icon} size={14} />
            </span>
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: Number(b.weight), color: b.fg }}>{b.label}</span>
          </div>
        ))}

        {/* Status indicator: current tool · grid · unit · zoom · active PCB layer */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-5)",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-tertiary)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span>
            Tool:{" "}
            <span style={{ color: "var(--color-text-brand)", fontWeight: 600 }}>{state.tool}</span>
          </span>
          <span>
            Grid: <span style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>{state.gridSize} {state.unit}</span>
          </span>
          <span>
            Zoom: <span style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>{Math.round(state.zoom * 100)}%</span>
          </span>
          {state.mode === "pcb" && <ActiveLayerChip />}
        </div>

        <div
          className="ix-tool"
          onClick={actions.toggleBottom}
          style={{ marginLeft: "var(--spacing-5)", width: 28, height: 26, borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <span
            style={{
              width: 16,
              height: 16,
              display: "inline-flex",
              color: state.bottomOpen ? "var(--color-violet-600)" : "var(--color-text-tertiary)",
              transform: `rotate(${state.bottomOpen ? "180deg" : "0deg"})`,
            }}
          >
            <Icon html={CHEV_SVG} />
          </span>
        </div>
      </div>
    </>
  );
}
