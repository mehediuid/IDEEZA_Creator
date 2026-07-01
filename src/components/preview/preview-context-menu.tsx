"use client";

// Onshape-style right-click context menu for the /preview scene. Opens at
// the cursor whenever a mesh receives a right-click, auto-flips when it
// would overflow the viewport edges, and dismisses on outside click / Esc /
// item activation.
//
// Sections (top → bottom) match the Onshape part-studio menu:
//   1. Visibility       — Hide / Hide others / Hide all / Isolate / Make transparent
//   2. Geometry tools   — Section view / Fix / Tessellation
//   3. Mates            — Show / Hide
//   4. Object actions   — Copy «name» «#» / Create Drawing(s) / Export
//   5. Navigation       — Edit in context / Find in instance list / Add mate connector / Switch to «group» / Switch to «root»
//   6. Selection        — Clear selection / Select other
//   7. Misc             — Add comment
//   8. Camera           — Zoom to fit / Zoom to selection / View normal to
//
// Items wired to real behaviour route through PreviewContext; the rest flash
// a "Coming soon" toast so the menu still feels complete.

import * as React from "react";
import { usePreview } from "./preview-context";

const MENU_WIDTH = 300;
const ROW_H = 32;
const SAFE_PAD = 12;

export function PreviewContextMenu() {
  const {
    contextMenu,
    closeContextMenu,
    describeInstance,
    hideInstance,
    hideOtherInstances,
    hideAllInGroup,
    isolateInstance,
    duplicateInstance,
    switchToGroup,
    flashInstance,
    selectShape,
    fitCamera,
    fitToSelection,
    flashToast,
  } = usePreview();

  const ref = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<{
    left: number;
    top: number;
  } | null>(null);

  // Place + auto-flip the menu so it always stays on-screen.
  React.useLayoutEffect(() => {
    if (!contextMenu) {
      setPosition(null);
      return;
    }
    const node = ref.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Measure the actual rendered height once, else fall back to a guess.
    const h = node?.offsetHeight ?? 560;
    const w = node?.offsetWidth ?? MENU_WIDTH;
    let left = contextMenu.x;
    let top = contextMenu.y;
    if (left + w + SAFE_PAD > vw) left = Math.max(SAFE_PAD, vw - w - SAFE_PAD);
    if (top + h + SAFE_PAD > vh) top = Math.max(SAFE_PAD, vh - h - SAFE_PAD);
    setPosition({ left, top });
  }, [contextMenu]);

  // Outside click / Escape / scroll dismiss.
  React.useEffect(() => {
    if (!contextMenu) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu();
    };
    const onScroll = () => closeContextMenu();
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [contextMenu, closeContextMenu]);

  if (!contextMenu) return null;
  const info = describeInstance(contextMenu.targetId);
  if (!info) return null;

  const targetLabel = `${info.name} ${info.instanceIndex}`;
  const targetLabelWithInstance = `${info.name} <${info.instanceIndex}>`;
  const otherGroup: "pcb" | "enclosure" =
    info.group === "pcb" ? "enclosure" : "pcb";
  const otherGroupLabel = otherGroup === "pcb" ? "PCB" : "Enclosure";

  const run = (fn: () => void) => () => {
    fn();
    closeContextMenu();
  };
  const tbd = (label: string) =>
    run(() => flashToast(`${label} — coming soon`));

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Actions for ${targetLabel}`}
      style={{
        position: "fixed",
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        zIndex: 1000,
        width: MENU_WIDTH,
        maxHeight: "calc(100vh - 24px)",
        overflowY: "auto",
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: 12,
        boxShadow:
          "0 18px 40px -12px rgba(0,0,0,.25), 0 4px 12px -4px rgba(0,0,0,.18)",
        padding: "6px 0",
        fontFamily: "inherit",
        // Until layout effect measures it, keep it invisible to avoid flicker
        // in the wrong corner.
        opacity: position ? 1 : 0,
        pointerEvents: position ? "auto" : "none",
      }}
    >
      {/* 1. Visibility */}
      <Section>
        <MenuItem
          icon={<IconHide />}
          label="Hide"
          onClick={run(() => hideInstance(info.id))}
        />
        <MenuItem
          label="Hide other instances"
          onClick={run(() => hideOtherInstances(info.id))}
        />
        <MenuItem
          label="Hide all instances"
          onClick={run(() => hideAllInGroup(info.group))}
        />
        <MenuItem
          label="Isolate…"
          onClick={run(() => isolateInstance(info.id))}
        />
        <MenuItem
          label="Make transparent…"
          onClick={tbd("Make transparent")}
        />
      </Section>

      {/* 2. Geometry tools */}
      <Divider />
      <Section>
        <MenuItem
          icon={<IconSection />}
          label="Section view…"
          onClick={tbd("Section view")}
        />
        <MenuItem icon={<IconFix />} label="Fix" onClick={tbd("Fix")} />
        <MenuItem
          label="Use best available tessellation"
          onClick={tbd("Best tessellation")}
        />
      </Section>

      {/* 3. Mates */}
      <Divider />
      <Section>
        <MenuItem label="Show mates" onClick={tbd("Show mates")} />
        <MenuItem label="Hide mates" onClick={tbd("Hide mates")} />
      </Section>

      {/* 4. Object actions */}
      <Divider />
      <Section>
        <MenuItem
          icon={<IconCopy />}
          label={
            <>
              Copy {info.name} <em style={emStyle}>{`<${info.instanceIndex}>`}</em>
            </>
          }
          onClick={run(() => duplicateInstance(info.id))}
        />
        <MenuItem
          icon={<IconDrawing />}
          label={`Create Drawing of ${targetLabelWithInstance}…`}
          onClick={tbd("Create Drawing")}
        />
        <MenuItem
          icon={<IconDrawing />}
          label={`Create Drawing of ${info.rootLabel}…`}
          onClick={tbd("Create Drawing")}
        />
        <MenuItem label="Export…" onClick={tbd("Export")} />
      </Section>

      {/* 5. Navigation */}
      <Divider />
      <Section>
        <MenuItem
          label="Edit in context"
          rightIcon={<IconChevron />}
          onClick={tbd("Edit in context")}
        />
        <MenuItem
          label="Find in instance list"
          onClick={run(() => flashInstance(info.id))}
        />
        <MenuItem
          icon={<IconMate />}
          label="Add mate connector to instance origin…"
          onClick={tbd("Add mate connector")}
        />
        <MenuItem
          icon={<IconAssembly />}
          label={`Switch to ${info.groupLabel}`}
          onClick={run(() => switchToGroup(info.group))}
        />
        <MenuItem
          icon={<IconAssembly />}
          label={`Switch to ${otherGroupLabel}`}
          onClick={run(() => switchToGroup(otherGroup))}
        />
      </Section>

      {/* 6. Selection */}
      <Divider />
      <Section>
        <MenuItem
          label="Clear selection"
          onClick={run(() => selectShape(null))}
        />
        <MenuItem label="Select other…" onClick={tbd("Select other")} />
      </Section>

      {/* 7. Misc */}
      <Divider />
      <Section>
        <MenuItem
          icon={<IconComment />}
          label="Add comment"
          onClick={tbd("Add comment")}
        />
      </Section>

      {/* 8. Camera */}
      <Divider />
      <Section>
        <MenuItem
          label="Zoom to fit"
          onClick={run(() => fitCamera())}
        />
        <MenuItem
          label="Zoom to selection"
          onClick={run(() => fitToSelection())}
        />
        <MenuItem label="View normal to" onClick={tbd("View normal to")} />
      </Section>
    </div>
  );
}

// ───────────────────────────── primitives ─────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "2px 0" }}>{children}</div>;
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: "var(--color-border-subtle)",
        margin: "2px 8px",
      }}
    />
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  rightIcon,
}: {
  icon?: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  rightIcon?: React.ReactNode;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      style={{
        width: "100%",
        height: ROW_H,
        padding: "0 12px 0 14px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 13,
        color: "var(--color-text-primary)",
        textAlign: "left",
        fontFamily: "inherit",
        fontWeight: 500,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "var(--color-bg-brand-subtle)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 18,
          height: 18,
          flex: "0 0 18px",
          color: "var(--color-text-secondary)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon ?? null}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
      {rightIcon && (
        <span
          aria-hidden="true"
          style={{
            color: "var(--color-text-tertiary)",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {rightIcon}
        </span>
      )}
    </button>
  );
}

const emStyle: React.CSSProperties = {
  fontStyle: "normal",
  color: "var(--color-text-secondary)",
  marginLeft: 4,
};

// ───────────────────────────── icons ─────────────────────────────

function IconHide() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18M10.5 6.7a8 8 0 0 1 9.5 5.3 8 8 0 0 1-3 4.3M6.6 6.6A8 8 0 0 0 4 12s3 7 8 7c1.6 0 3-.4 4.3-1.1" />
    </svg>
  );
}
function IconSection() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18M3 6h18M3 18h18" />
      <path d="M9 3l-2 4M15 21l2-4" />
    </svg>
  );
}
function IconFix() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M6 18l4-4M14 10l4-4" />
      <path d="M14 10l-4-4 4-4 4 4z" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="1.5" />
      <path d="M5 15V5a1 1 0 0 1 1-1h10" />
    </svg>
  );
}
function IconDrawing() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="13" height="18" rx="1.5" />
      <path d="M8 8h5M8 12h7M8 16h4" />
      <path d="M19 6v6M22 9h-6" />
    </svg>
  );
}
function IconMate() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    </svg>
  );
}
function IconAssembly() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
      <path d="M11 7h6a2 2 0 0 1 2 2v4" />
    </svg>
  );
}
function IconComment() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-4A8 8 0 1 1 21 12z" />
    </svg>
  );
}
function IconChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
