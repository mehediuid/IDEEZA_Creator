"use client";

// Preview — the 4th step in the product creation flow. CAD-style composite
// preview modelled on Onshape's part-studio layout: PreviewToolbar (top),
// InstancesPanel (left tree), live ThreeViewport (center), PreviewRightPanel
// (right). Flow chrome lives on top: the global TopBar carries the IDEEZA
// menu bar + profile + premium parts chip.
//
// Wires every piece to a shared PreviewContext so the toolbar, tree,
// view-cube and side icons all act on the same scene state. Shapes are read
// from (and persisted to) the SAME localStorage slot the /3d module owns,
// so the preview is a true viewer of what the user built upstream.

import * as React from "react";
import { useStepNav } from "@/components/manual/use-step-nav";
import { EditorShell } from "@/components/pcb/editor-shell";
import { TopBar } from "@/components/pcb/top-bar";
import { LeftRail } from "@/components/pcb/left-rail";
import { LeftPanel } from "@/components/pcb/left-panel";
import {
  PreviewProvider,
  usePreview,
  type FitVerdict,
} from "./preview-context";
import { PreviewToolbar } from "./preview-toolbar";
import { InstancesSection } from "./preview-instances";
import { PreviewViewport } from "./preview-viewport";
import { PreviewRightPanel } from "./preview-right-panel";
import { PreviewContextMenu } from "./preview-context-menu";

const TOP_BAR_H = 62;
const PREVIEW_TOOLBAR_H = 40;
const LEFT_RAIL_W = 74;
// Shared project panel (Project Design | Library) — same width everywhere.
const LEFT_PANEL_W = 292;
// Right side: full panel matching the PCB / 3D module pattern (292px) with
// content + a vertical tab strip on its inner-right edge.
const RIGHT_PANEL_W = 292;

// Total vertical chrome above the viewport.
const VIEWPORT_TOP = TOP_BAR_H + PREVIEW_TOOLBAR_H;

// The Wiring step reuses the whole Preview workspace for now (same scene,
// panels and toolbar) — only the rail highlight and the flow pills differ.
// When wiring gets its own tools this becomes its own module.
export type PreviewVariant = "preview" | "wiring";

export function PreviewApp({ variant = "preview" }: { variant?: PreviewVariant }) {
  return (
    <PreviewProvider>
      <PreviewBody variant={variant} />
    </PreviewProvider>
  );
}

function PreviewBody({ variant }: { variant: PreviewVariant }) {
  const { go: goStep } = useStepNav();
  const { showInstancesPanel, toast } = usePreview();
  const isWiring = variant === "wiring";

  // Reflow viewport + flow pills when the instances panel is collapsed via
  // the side-icon toggle.
  const leftPanelOffset = showInstancesPanel ? LEFT_PANEL_W : 0;
  const viewportLeft = LEFT_RAIL_W + leftPanelOffset;

  return (
    <EditorShell>
      <TopBar />
      <PreviewToolbar />

      {/* Shared module-switcher rail (PCB Design / Code / 3D Module /
          Product Preview / Add Brief). */}
      <LeftRail
        topOffset={VIEWPORT_TOP}
        bottomOffset={0}
        activeKey={isWiring ? "wiring" : "preview"}
      />

      {/* Shared project panel — preview's instances tree merges into the
          same Project Design | Library navigator every tab has. */}
      {showInstancesPanel && (
        <LeftPanel
          topOffset={VIEWPORT_TOP}
          bottomOffset={0}
          moduleSlot={<InstancesSection />}
        />
      )}

      <PreviewViewport
        topOffset={VIEWPORT_TOP}
        leftOffset={viewportLeft}
        rightOffset={RIGHT_PANEL_W}
      />
      <PreviewRightPanel topOffset={VIEWPORT_TOP} />
      <FitStatusBadge
        topOffset={VIEWPORT_TOP + 16}
        leftOffset={viewportLeft + 16}
      />

      {/* Back — bottom-LEFT inside the viewport area. */}
      <FlowPill
        kind="back"
        label={isWiring ? "Back to Preview" : "Back to 3D"}
        onClick={() => goStep(isWiring ? "preview" : "three")}
        style={{ left: viewportLeft + 20, bottom: 20 }}
      />

      {/* Continue — bottom-RIGHT inside the viewport area. */}
      <FlowPill
        kind="forward"
        label={isWiring ? "Continue to Brief" : "Continue to Wiring"}
        onClick={() => goStep(isWiring ? "brief" : "wiring")}
        style={{ right: RIGHT_PANEL_W + 20, bottom: 20 }}
      />

      {toast && <PreviewToast text={toast} />}
      <PreviewContextMenu />
    </EditorShell>
  );
}

// FitStatusBadge — top-left pill showing whether the PCB fits inside the
// enclosure. The underlying canvas computes the verdict from real Box3
// math, so this badge is a true reflection of the merged scene.
function FitStatusBadge({
  topOffset,
  leftOffset,
}: {
  topOffset: number;
  leftOffset: number;
}) {
  const { fitVerdict, showPcb, showEnclosure } = usePreview();
  if (!showPcb || !showEnclosure) return null;

  const { tone, icon, title, sub } = describeVerdict(fitVerdict);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        top: topOffset,
        left: leftOffset,
        zIndex: 20,
        padding: "10px 14px 10px 12px",
        background: "var(--color-bg-surface)",
        border: `var(--border-width-1-5) solid ${toneBorder(tone)}`,
        borderRadius: 999,
        boxShadow: "0 8px 26px -8px rgba(0,0,0,.18)",
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        maxWidth: 360,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          background: toneBg(tone),
          color: toneFg(tone),
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 28px",
        }}
      >
        {icon}
      </span>
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        {sub && (
          <span
            style={{
              fontSize: 11,
              color: "var(--color-text-secondary)",
              marginTop: 1,
            }}
          >
            {sub}
          </span>
        )}
      </span>
    </div>
  );
}

type Tone = "ok" | "warn" | "neutral";

function describeVerdict(v: FitVerdict): {
  tone: Tone;
  icon: React.ReactNode;
  title: string;
  sub?: string;
} {
  if (v.kind === "fits") {
    const smallest = Math.min(...v.headroom);
    return {
      tone: "ok",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4 10-10" />
        </svg>
      ),
      title: "PCB fits inside enclosure",
      sub: `Tightest clearance ${smallest.toFixed(2)} u`,
    };
  }
  if (v.kind === "overflow") {
    const axes = ["X", "Y", "Z"];
    const worstIdx = v.overflow.indexOf(Math.max(...v.overflow));
    return {
      tone: "warn",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l10 18H2z" />
          <path d="M12 10v5" />
          <path d="M12 18h.01" />
        </svg>
      ),
      title: "PCB exceeds enclosure",
      sub: `Worst overflow ${v.overflow[worstIdx].toFixed(2)} u on ${axes[worstIdx]} axis`,
    };
  }
  if (v.kind === "enclosure-missing") {
    return {
      tone: "neutral",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7l8-4 8 4-8 4z" />
          <path d="M4 7v10l8 4 8-4V7" />
        </svg>
      ),
      title: "No enclosure to check against",
      sub: "Design one in the 3D module or add a part here.",
    };
  }
  return {
    tone: "neutral",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="12" rx="1" />
        <path d="M7 6v12M17 6v12" />
      </svg>
    ),
    title: "No PCB to check",
    sub: "Place components in the PCB module.",
  };
}

function toneBg(t: Tone) {
  if (t === "ok") return "var(--color-green-100)";
  if (t === "warn")
    return "var(--color-orange-100, var(--color-bg-brand-subtle))";
  return "var(--color-bg-surface-raised)";
}
function toneFg(t: Tone) {
  if (t === "ok") return "var(--color-green-700)";
  if (t === "warn")
    return "var(--color-orange-600, var(--color-text-error))";
  return "var(--color-text-secondary)";
}
function toneBorder(t: Tone) {
  if (t === "ok") return "var(--color-green-500)";
  if (t === "warn")
    return "var(--color-orange-500, var(--color-border-strong))";
  return "var(--color-border-subtle)";
}

function PreviewToast({ text }: { text: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 90,
        padding: "10px 18px",
        background: "var(--color-bg-inverse, #1E1E1E)",
        color: "var(--color-text-on-brand, #FFFFFF)",
        borderRadius: 999,
        boxShadow: "0 12px 32px -8px rgba(0,0,0,.3)",
        fontSize: 13,
        fontWeight: 500,
        animation: "ix-preview-toast .18s ease-out",
      }}
    >
      {text}
      <style>{`
        @keyframes ix-preview-toast {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}

function FlowPill({
  kind,
  label,
  onClick,
  style,
}: {
  kind: "back" | "forward";
  label: string;
  onClick: () => void;
  style: React.CSSProperties;
}) {
  const isForward = kind === "forward";
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        zIndex: 20,
        padding: "10px 18px",
        background: isForward
          ? "var(--color-violet-600)"
          : "var(--color-bg-surface)",
        color: isForward
          ? "var(--color-text-on-brand)"
          : "var(--color-text-primary)",
        border: isForward
          ? "none"
          : "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-3xl)",
        fontSize: 13,
        fontWeight: isForward ? 700 : 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        boxShadow: isForward
          ? "0 8px 26px -8px rgba(124, 45, 185, .42)"
          : "0 4px 12px -4px rgba(0,0,0,.18)",
        fontFamily: "inherit",
        ...style,
      }}
    >
      {!isForward && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      )}
      {label}
      {isForward && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      )}
    </button>
  );
}
