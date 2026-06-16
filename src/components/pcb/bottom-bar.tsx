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

        <div
          className="ix-tool"
          onClick={actions.toggleBottom}
          style={{ marginLeft: "auto", width: 28, height: 26, borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
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
