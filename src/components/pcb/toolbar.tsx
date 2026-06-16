"use client";

// IDEEZA PCB Software — toolbar (converted from Raw HTML to JSX).
// Two rows of tools using the IDEEZA design-system icon set (Hugeicons) +
// the unit dropdowns. The select tool reflects state.tool.

import * as React from "react";
import { HugeiconsIcon, type HugeiconsProps } from "@hugeicons/react";
import {
  AlignBoxBottomCenterIcon,
  AlignBoxTopCenterIcon,
  AlignHorizontalCenterIcon,
  AlignLeftIcon,
  ArrowDataTransferHorizontalIcon,
  ArrowDown01Icon,
  ArrowTurnBackwardIcon,
  ArrowTurnForwardIcon,
  BringToFrontIcon,
  ConnectIcon,
  CropIcon,
  Cursor01Icon,
  DashboardSquare01Icon,
  DashboardSquare02Icon,
  DistributeHorizontalCenterIcon,
  DistributeVerticalCenterIcon,
  Flag01Icon,
  Flag02Icon,
  GridIcon,
  Login03Icon,
  Magnet01Icon,
  PinLocation01Icon,
  RotateClockwiseIcon,
  RotateCcwSquareIcon,
  RulerIcon,
  SendToBackIcon,
  SquareArrowExpand01Icon,
  Sun03Icon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
} from "@hugeicons/core-free-icons";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

type HIcon = NonNullable<HugeiconsProps["icon"]>;
type Item = { kind: "icon"; icon: HIcon; tool?: string } | { kind: "div" } | { kind: "dd"; label: string };

const ROW1: Item[] = [
  { kind: "icon", icon: Cursor01Icon, tool: "select" },
  { kind: "icon", icon: ArrowTurnBackwardIcon },
  { kind: "icon", icon: ArrowTurnForwardIcon },
  { kind: "icon", icon: DashboardSquare01Icon },
  { kind: "div" },
  { kind: "icon", icon: SquareArrowExpand01Icon },
  { kind: "icon", icon: CropIcon },
  { kind: "icon", icon: DashboardSquare02Icon },
  { kind: "icon", icon: ZoomInAreaIcon },
  { kind: "icon", icon: ZoomOutAreaIcon },
  { kind: "icon", icon: GridIcon },
  { kind: "div" },
  { kind: "dd", label: "0.05" },
  { kind: "dd", label: "Inch" },
  { kind: "div" },
  { kind: "icon", icon: Magnet01Icon },
  { kind: "icon", icon: RulerIcon },
  { kind: "icon", icon: ConnectIcon },
  { kind: "div" },
  { kind: "icon", icon: AlignBoxTopCenterIcon },
  { kind: "icon", icon: DistributeVerticalCenterIcon },
  { kind: "icon", icon: AlignBoxBottomCenterIcon },
  { kind: "icon", icon: Login03Icon },
  { kind: "div" },
  { kind: "icon", icon: AlignLeftIcon },
  { kind: "icon", icon: AlignHorizontalCenterIcon },
  { kind: "icon", icon: DistributeHorizontalCenterIcon },
  { kind: "icon", icon: DistributeVerticalCenterIcon },
  { kind: "icon", icon: RotateCcwSquareIcon },
  { kind: "icon", icon: RotateClockwiseIcon },
  { kind: "div" },
  { kind: "icon", icon: BringToFrontIcon },
  { kind: "icon", icon: SendToBackIcon },
];

const ROW2: Item[] = [
  { kind: "icon", icon: Flag01Icon },
  { kind: "icon", icon: Flag02Icon },
  { kind: "icon", icon: PinLocation01Icon },
  { kind: "icon", icon: ConnectIcon },
  { kind: "icon", icon: ArrowDataTransferHorizontalIcon },
  { kind: "icon", icon: Sun03Icon },
];

function Divider() {
  return <div style={{ width: 1, height: 22, background: "var(--color-border-default)", margin: "0 var(--spacing-3)" }} />;
}

function Dropdown({ label }: { label: string }) {
  return (
    <div
      className="ix-tool"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-3)",
        padding: "0 9px",
        height: 30,
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-lg)",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", fontWeight: 500 }}>{label}</span>
      <HugeiconsIcon icon={ArrowDown01Icon} size={12} color="var(--color-text-tertiary)" strokeWidth={2.2} />
    </div>
  );
}

function ToolIcon({ icon, active, onClick }: { icon: HIcon; active?: boolean; onClick?: () => void }) {
  return (
    <button
      className="ix-tool"
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        borderRadius: "var(--radius-lg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        border: "none",
        background: active ? "var(--color-violet-600)" : "transparent",
        color: active ? "var(--color-text-on-brand)" : "var(--color-text-primary)",
      }}
    >
      <HugeiconsIcon icon={icon} size={18} color="currentColor" strokeWidth={1.7} />
    </button>
  );
}

function Row({ items }: { items: Item[] }) {
  const state = usePcbState();
  const actions = usePcbActions();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)", flexWrap: "nowrap" }}>
      {items.map((it, i) =>
        it.kind === "div" ? (
          <Divider key={i} />
        ) : it.kind === "dd" ? (
          <Dropdown key={i} label={it.label} />
        ) : (
          <ToolIcon
            key={i}
            icon={it.icon}
            active={it.tool ? state.tool === it.tool : false}
            onClick={it.tool ? () => actions.setTool(it.tool!) : undefined}
          />
        ),
      )}
    </div>
  );
}

export function Toolbar() {
  return (
    <div
      style={{
        position: "absolute",
        top: 142,
        left: 0,
        right: 0,
        background: "var(--color-bg-surface)",
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        padding: "var(--spacing-3) var(--spacing-7)",
        zIndex: 18,
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-3)",
      }}
    >
      <Row items={ROW1} />
      <Row items={ROW2} />
    </div>
  );
}
