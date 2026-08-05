"use client";

// IDEEZA PCB Software — bottom bar + collapsible bottom panel.
// The bar holds the Logs / Device Standardization / DRC / Final Result tabs and
// a chevron to toggle the panel. The panel (when open) shows the active tab's
// content via buildBottom.

import * as React from "react";
import { DsIcon, Icon } from "@/lib/pcb/icons";
import { buildBottomTabs, bottomTitle } from "@/lib/pcb/data";
import { BottomContent } from "./bottom-content";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { SCHEM_TOOLS, PCB_TOOLS } from "@/components/pcb/canvas-area";
import { Splitter } from "@/components/pcb/splitter";
import { buildToolLabels, toolLabel } from "@/lib/pcb/tool-labels";

const UPLOAD_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-violet-600)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5M9 10.8V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6.8l2 3.2H7z"/></svg>';
const REFRESH_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>';
const CLOSE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const CHEV_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>';
// Same eye the right panel's Layer tab uses, so one meaning has one glyph (the
// strip used to draw ◉ / ◌ text circles).
const EYE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="2.6"/></svg>';
const EYE_OFF_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a13 13 0 0 1-2.2 3M6.6 6.6A13 13 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.3-1M3 3l18 18"/></svg>';


// #141 — the layer strip: the board's layers where your hand already is. The
// strip is where you PICK the active layer and flick visibility; the right
// panel's Layer tab keeps the settings (colour · transparency · lock), so the
// two don't duplicate each other.
function LayerStrip() {
  const state = usePcbState();
  const actions = usePcbActions();
  if (state.mode === "schematic" || state.mode === "3d") return null;
  const layers = state.pcbLayers ?? [];
  if (!layers.length) return null;
  const side = (id: string) => (id.startsWith("bottom") ? "bottom" : id.startsWith("inner") ? "inner" : "top");
  return (
    <div
      data-layer-strip
      style={{
        position: "absolute",
        bottom: 36 + (state.bottomOpen ? state.panelSizes.bottom : 0),
        left: 74 + state.panelSizes.left,
        right: state.panelSizes.right,
        height: 34,
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-3)",
        padding: "0 var(--spacing-6)",
        background: "var(--color-bg-surface)",
        borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
        overflowX: "auto",
        zIndex: 13,
      }}
    >
      <button
        type="button"
        className="ix-pill"
        aria-pressed={state.focusActiveLayer}
        title="Dim the layers you're not working on"
        onClick={() => actions.toggleFocusActiveLayer()}
        style={{
          flex: "0 0 auto", padding: "0 10px", height: 24, borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
          fontSize: "var(--font-size-2xs, 10px)", fontWeight: 700,
          border: `var(--border-width-1) solid ${state.focusActiveLayer ? "var(--color-violet-600)" : "var(--color-border-default)"}`,
          background: state.focusActiveLayer ? "var(--color-bg-brand-subtle)" : "transparent",
          color: state.focusActiveLayer ? "var(--color-text-brand)" : "var(--color-text-secondary)",
        }}
      >
        Focus
      </button>
      <span style={{ width: 1, height: 16, background: "var(--color-border-subtle)", flex: "0 0 auto" }} />
      {layers.map((l) => {
        const active = l.id === state.activePcbLayer;
        return (
          <span key={l.id} style={{ display: "inline-flex", alignItems: "center", flex: "0 0 auto" }}>
            <button
              type="button"
              className="ix-tool"
              aria-pressed={active}
              title={`${l.name} — click to make it the active layer${side(l.id) === "bottom" ? " (bottom side)" : ""}`}
              onClick={() => actions.setActivePcbLayer(l.id)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "0 8px", height: 24, borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
                cursor: "pointer", fontFamily: "inherit", fontSize: "var(--font-size-2xs, 10px)",
                fontWeight: active ? 700 : 500,
                borderTop: `var(--border-width-1) solid ${active ? "var(--color-violet-600)" : "var(--color-border-subtle)"}`,
                borderBottom: `var(--border-width-1) solid ${active ? "var(--color-violet-600)" : "var(--color-border-subtle)"}`,
                borderLeft: `var(--border-width-1) solid ${active ? "var(--color-violet-600)" : "var(--color-border-subtle)"}`,
                borderRight: "none",
                background: active ? "var(--color-bg-brand-subtle)" : "transparent",
                color: l.visible === false ? "var(--color-text-tertiary)" : active ? "var(--color-text-brand)" : "var(--color-text-secondary)",
                opacity: l.visible === false ? 0.55 : 1,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: 2, background: l.color, border: "var(--border-width-1) solid var(--color-border-default)", flex: "0 0 auto" }} />
              {l.name}
            </button>
            <button
              type="button"
              className="ix-tool"
              aria-label={`${l.visible === false ? "Show" : "Hide"} ${l.name}`}
              title={l.visible === false ? "Hidden — click to show" : "Visible — click to hide"}
              onClick={() => actions.togglePcbLayerVis(l.id)}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 24, height: 24, padding: 0, borderRadius: "0 var(--radius-md) var(--radius-md) 0", cursor: "pointer",
                border: `var(--border-width-1) solid ${active ? "var(--color-violet-600)" : "var(--color-border-subtle)"}`,
                background: "transparent", color: l.visible === false ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
              }}
            >
              <Icon html={l.visible === false ? EYE_OFF_SVG : EYE_SVG} size={13} />
            </button>
          </span>
        );
      })}
    </div>
  );
}

export function BottomBar() {
  const state = usePcbState();
  // Same labels the palette shows, so the status bar stops printing raw ids.
  const toolLabels = React.useMemo(() => buildToolLabels(SCHEM_TOOLS, PCB_TOOLS), []);
  const toolName = toolLabel(state.tool, toolLabels, state.placeText);
  const actions = usePcbActions();
  const tabs = buildBottomTabs(state, actions);

  return (
    <>
      {/* #141 — the layer strip sits between the canvas and the status bar. */}
      <LayerStrip />

      {/* collapsible panel */}
      {state.bottomOpen && (
        <div
          style={{
            position: "absolute",
            bottom: 36,
            left: 74 + state.panelSizes.left,
            right: state.panelSizes.right,
            height: state.panelSizes.bottom,
            background: "var(--color-bg-surface)",
            borderTop: "var(--border-width-1) solid var(--color-border-default)",
            boxShadow: "0 -8px 22px rgba(20,5,30,.07)",
            zIndex: 14,
            display: "flex",
            flexDirection: "column",
            animation: "ideeza-rise .22s cubic-bezier(.2,.9,.3,1.1)",
          }}
        >
          <Splitter side="bottom" size={state.panelSizes.bottom} label="Resize the bottom panel" />
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
          <div style={{ flex: 1, minHeight: 0 }}>
            <BottomContent tab={state.bottomTab} />
          </div>
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
            <span style={{ color: "var(--color-text-brand)", fontWeight: 600 }}>{toolName}</span>
          </span>
          <span>
            Grid: <span style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>{state.gridSize} {state.unit}</span>
          </span>
          <span>
            Zoom: <span style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>{Math.round(state.zoom * 100)}%</span>
          </span>
          <span>
            Plane: <span style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>XY</span>
          </span>
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
