"use client";

// IDEEZA PCB Software — canvas right-click context menu.
// Opened by right-clicking the canvas (store.openCanvasCtx); any item closes it.

import { DsIcon } from "@/lib/pcb/icons";
import { buildCtxItems } from "@/lib/pcb/data";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

type CtxItem = { divider?: boolean; label?: string; k?: string; icon?: string };

export function ContextMenu() {
  const state = usePcbState();
  const actions = usePcbActions();
  if (!state.ctx) return null;
  const items = buildCtxItems() as CtxItem[];

  return (
    <div
      style={{
        position: "absolute",
        top: state.ctxY,
        left: state.ctxX,
        minWidth: 220,
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--elevation-6)",
        padding: "var(--spacing-3)",
        zIndex: 70,
        animation: "ideeza-ctx .14s cubic-bezier(.2,.9,.3,1.2)",
        transformOrigin: "top left",
      }}
    >
      {items.map((ci, i) =>
        ci.divider ? (
          <div key={i} style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-2) var(--spacing-4)" }} />
        ) : (
          <div
            key={i}
            className="ix-mi"
            onClick={actions.closeAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-5)",
              padding: "var(--spacing-4) var(--spacing-5)",
              borderRadius: "var(--radius-lg)",
              cursor: "pointer",
            }}
          >
            <span style={{ width: 15, height: 15, color: "var(--color-text-secondary)", display: "inline-flex" }}>
              <DsIcon name={ci.icon} size={15} />
            </span>
            <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{ci.label}</span>
            <span className="ix-mi-k" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
              {ci.k}
            </span>
          </div>
        ),
      )}
    </div>
  );
}
