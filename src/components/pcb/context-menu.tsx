"use client";

// IDEEZA PCB Software — canvas right-click context menu.
// Renders the typed node list from data.buildCtxItems (mode-aware Schematic /
// PCB sets). Node types: ACTION/DIALOG (onClick), TOGGLE (checked → ✓), SUBMENU
// (submenu[] → hover/click flyout, flips left near the viewport edge), plus
// dividers. The whole menu clamps into the viewport; outside-click / Esc close.

import * as React from "react";
import { createPortal } from "react-dom";
import { DsIcon } from "@/lib/pcb/icons";
import { buildCtxItems } from "@/lib/pcb/data";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

type CtxNode = {
  divider?: boolean;
  label?: string;
  icon?: string;
  k?: string;
  checked?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
  submenu?: CtxNode[];
};

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l5 5L20 6" />
  </svg>
);
const Chevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

// One row: divider, submenu (nested flyout), or a leaf (action / toggle / dialog).
function Row({ node, close }: { node: CtxNode; close: () => void }) {
  const [open, setOpen] = React.useState(false);
  // Submenu is portalled to <body> and its viewport position is measured, so it
  // never gets clipped by an overflow ancestor and always stays fully on-screen.
  const [subPos, setSubPos] = React.useState<{ top: number; left: number } | null>(null);
  const rowRef = React.useRef<HTMLDivElement>(null);
  const subRef = React.useRef<HTMLDivElement>(null);
  const closeTimer = React.useRef<number | null>(null);

  const disabled = !!node.disabled;
  const isSubmenu = !!node.submenu && !disabled;
  const isToggle = typeof node.checked === "boolean";

  // Clamp the flyout into the viewport: prefer opening to the right of the row,
  // flip left near the right edge, and shift up so the bottom stays visible.
  React.useLayoutEffect(() => {
    if (!(isSubmenu && open)) { if (subPos) setSubPos(null); return; }
    const rr = rowRef.current?.getBoundingClientRect();
    if (!rr) return;
    const sr = subRef.current?.getBoundingClientRect();
    const w = sr?.width || 200;
    const h = sr?.height || 240;
    const M = 8;
    let left = rr.right + 4;
    if (left + w > window.innerWidth - M) left = rr.left - w - 4;
    left = Math.max(M, Math.min(left, window.innerWidth - M - w));
    let top = rr.top - 6;
    top = Math.max(M, Math.min(top, window.innerHeight - M - h));
    setSubPos((p) => (p && p.top === top && p.left === left ? p : { top, left }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubmenu, open]);

  if (node.divider) {
    return <div style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-2) var(--spacing-4)" }} />;
  }

  const openSub = () => {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <div
      ref={rowRef}
      className={disabled ? undefined : "ix-mi"}
      title={node.title}
      onClick={disabled || isSubmenu ? undefined : node.onClick ?? close}
      onMouseEnter={isSubmenu ? openSub : undefined}
      onMouseLeave={isSubmenu ? scheduleClose : undefined}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-5)",
        padding: "var(--spacing-4) var(--spacing-5)",
        borderRadius: "var(--radius-lg)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        background: open ? "var(--color-bg-brand-subtle)" : undefined,
      }}
    >
      {/* leading slot: ✓ for an active toggle, otherwise the icon */}
      <span style={{ width: 15, height: 15, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", color: isToggle && node.checked ? "var(--color-violet-600)" : "var(--color-text-secondary)" }}>
        {isToggle ? (node.checked ? <Check /> : null) : <DsIcon name={node.icon} size={15} />}
      </span>
      <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>{node.label}</span>
      {isSubmenu ? (
        <span style={{ color: "var(--color-text-tertiary)", display: "inline-flex" }}><Chevron /></span>
      ) : (
        <span className="ix-mi-k" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", minWidth: node.k ? undefined : 0 }}>{node.k}</span>
      )}

      {isSubmenu && open && createPortal(
        <div
          ref={subRef}
          data-ctx-sub
          role="menu"
          onMouseEnter={openSub}
          onMouseLeave={scheduleClose}
          style={{
            position: "fixed",
            top: subPos?.top ?? -9999,
            left: subPos?.left ?? -9999,
            visibility: subPos ? "visible" : "hidden",
            minWidth: 190,
            maxHeight: "calc(100vh - 16px)",
            overflowY: "auto",
            background: "var(--color-bg-surface)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--elevation-6)",
            padding: "var(--spacing-3)",
            zIndex: 80,
          }}
        >
          {node.submenu!.map((c, i) => <Row key={i} node={c} close={close} />)}
        </div>,
        document.body,
      )}
    </div>
  );
}

export function ContextMenu() {
  const state = usePcbState();
  const actions = usePcbActions();
  const ref = React.useRef<HTMLDivElement>(null);
  const [off, setOff] = React.useState({ dx: 0, dy: 0 });

  // Clamp the menu into the viewport after it lays out.
  React.useLayoutEffect(() => {
    if (!state.ctx || !ref.current) { setOff({ dx: 0, dy: 0 }); return; }
    const r = ref.current.getBoundingClientRect();
    let dx = 0, dy = 0;
    if (r.right > window.innerWidth - 8) dx = window.innerWidth - 8 - r.right;
    if (r.bottom > window.innerHeight - 8) dy = window.innerHeight - 8 - r.bottom;
    setOff((prev) => (prev.dx === dx && prev.dy === dy ? prev : { dx, dy }));
  }, [state.ctx, state.ctxX, state.ctxY]);

  // Outside-click / Escape close.
  React.useEffect(() => {
    if (!state.ctx) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      // Ignore clicks inside the root menu OR any portalled submenu.
      if (ref.current && !ref.current.contains(t) && !t.closest("[data-ctx-sub]")) actions.closeAll();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") actions.closeAll(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [state.ctx, actions]);

  if (!state.ctx) return null;
  const items = buildCtxItems(state, actions) as CtxNode[];

  return (
    <div
      ref={ref}
      data-ctx-menu
      style={{
        position: "absolute",
        top: state.ctxY,
        left: state.ctxX,
        transform: off.dx || off.dy ? `translate(${off.dx}px, ${off.dy}px)` : undefined,
        minWidth: 224,
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
      {items.map((it, i) => <Row key={i} node={it} close={actions.closeAll} />)}
    </div>
  );
}
