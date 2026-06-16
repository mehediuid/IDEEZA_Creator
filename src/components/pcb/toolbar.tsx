"use client";

// IDEEZA PCB Software — toolbar (Schematic).
// Order matches the Figma source of truth (node 433:230819) exactly. The 52
// icons stream left-to-right via a single flex-wrap container; dividers come
// from explicit { kind: "div" } items.

import * as React from "react";
import { DsIcon } from "@/lib/pcb/icons";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

type ToolbarAction =
  | "undo"
  | "redo"
  | "zoomIn"
  | "zoomOut"
  | "fitAll"
  | "fitSection"
  | "fitArea"
  | "toggleGrid"
  | "openSettings"
  | "openDeviceMgr"
  | "openFootMgr"
  | "convertPcb"
  | "openJlcpcb"
  | "openGenBlock"
  | "openBoolOp"
  | "openDistribute"
  | "rotateRight"
  | "rotateLeft"
  | "flipV"
  | "flipH"
  | "bringFront"
  | "sendBack"
  | "toggleBottom";

type Item =
  | { kind: "icon"; key: string; tool?: string; action?: ToolbarAction; label?: string }
  | { kind: "div" }
  | { kind: "dd"; field: "gridSize" | "unit"; options: string[]; label?: string };

const GRID_SIZES = ["0.001", "0.005", "0.01", "0.05", "0.1", "0.5", "1"];
const UNITS = ["Inch", "Mil", "mm"];

// Order matches Figma exact data-name sequence (52 items).
const ITEMS: Item[] = [
  /*  1 */ { kind: "icon", key: "tSelectVisible", tool: "select", label: "Select (V)" },
  /*  1b*/ { kind: "icon", key: "tHand", tool: "hand", label: "Hand — pan canvas (H or hold Space)" },
  /*  2 */ { kind: "icon", key: "tViewDetails", tool: "selectVisible", label: "Select Visible Parts" },
  /*  3 */ { kind: "icon", key: "undo", action: "undo", label: "Undo" },
  /*  4 */ { kind: "icon", key: "redo", action: "redo", label: "Redo" },
  /*  5 */ { kind: "icon", key: "board", action: "toggleBottom", label: "Dashboard" },
  /*  6 */ { kind: "icon", key: "tFitArea", tool: "viewDetails", label: "View details" },
  { kind: "div" },
  /*  7 */ { kind: "icon", key: "zoomin", action: "zoomIn", label: "Zoom In" },
  /*  8 */ { kind: "icon", key: "zoomout", action: "zoomOut", label: "Zoom Out" },
  /*  9 */ { kind: "icon", key: "tFitAll", action: "fitAll", label: "Fit all in window" },
  /* 10 */ { kind: "icon", key: "tFitSection", action: "fitSection", label: "Fit section" },
  /* 11 */ { kind: "icon", key: "tFitArea", action: "fitArea", label: "Fit Area Selection view" },
  /* 12 */ { kind: "icon", key: "tGridOptions", action: "toggleGrid", label: "Grid options" },
  { kind: "div" },
  /* 13 */ { kind: "dd", field: "gridSize", options: GRID_SIZES, label: "Grid size" },
  /* 14 */ { kind: "dd", field: "unit", options: UNITS, label: "Unit" },
  { kind: "div" },
  /* 15 */ { kind: "icon", key: "tDevReuse", action: "openDeviceMgr", label: "Device / Reuse block" },
  /* 16 */ { kind: "icon", key: "tWire", tool: "wire", label: "Wire" },
  /* 17 */ { kind: "icon", key: "tBus", tool: "bus", label: "Bus" },
  /* 18 */ { kind: "icon", key: "tDiode", tool: "diode", label: "Diode" },
  /* 19 */ { kind: "icon", key: "tResistor", tool: "resistor", label: "Resistor" },
  /* 20 */ { kind: "icon", key: "tInductor", tool: "inductor", label: "Inductor" },
  /* 21 */ { kind: "icon", key: "tCapacitor", tool: "capacitor", label: "Capacitor" },
  /* 22 */ { kind: "icon", key: "tNetFlag", tool: "netFlag", label: "Net flag" },
  /* 23 */ { kind: "icon", key: "tVcc5v", tool: "vcc5v", label: "+5V" },
  /* 24 */ { kind: "icon", key: "tShortFlag", tool: "shortFlag", label: "Short Flag" },
  /* 25 */ { kind: "icon", key: "tPort", tool: "port", label: "Port Out" },
  /* 26 */ { kind: "icon", key: "tNoConn", tool: "noConnect", label: "No Connect" },
  /* 27 */ { kind: "icon", key: "tText", tool: "text", label: "Text" },
  { kind: "div" },
  /* 28 */ { kind: "icon", key: "tConvertPcb", action: "convertPcb", label: "Convert Schematic to PCB" },
  /* 29 */ { kind: "icon", key: "tJlcpcb", action: "openJlcpcb", label: "JLCPCB Layout Service" },
  /* 30 */ { kind: "icon", key: "tGenBlock", action: "openGenBlock", label: "Generate / Update Block Symbol" },
  /* 31 */ { kind: "icon", key: "tPgnd", tool: "pgnd", label: "PGND" },
  /* 32 */ { kind: "icon", key: "tAgnd", tool: "agnd", label: "AGND" },
  { kind: "div" },
  /* 33 */ { kind: "icon", key: "tBringFront", action: "bringFront", label: "Bring to Front" },
  /* 34 */ { kind: "icon", key: "tSendBack", action: "sendBack", label: "Send to Back" },
  /* 35 */ { kind: "icon", key: "tRotRight", action: "rotateRight", label: "Rotate Right" },
  /* 36 */ { kind: "icon", key: "tFlipV", action: "flipV", label: "Flip Up and Down" },
  /* 37 */ { kind: "icon", key: "tFlipH", action: "flipH", label: "Flip Up and Left" },
  /* 38 */ { kind: "icon", key: "tRotLeft", action: "rotateLeft", label: "Rotate Left" },
  { kind: "div" },
  /* 39 */ { kind: "icon", key: "tFootMgr", action: "openFootMgr", label: "Footprint Manager" },
  /* 40 */ { kind: "icon", key: "tDevMgr", action: "openDeviceMgr", label: "Device Manager" },
  { kind: "div" },
  /* 41 */ { kind: "icon", key: "tBoolPreserve", action: "openBoolOp", label: "Preserve Overlapping Areas" },
  /* 42 */ { kind: "icon", key: "tBoolMerge", action: "openBoolOp", label: "Merge Areas" },
  /* 43 */ { kind: "icon", key: "tBoolSubtract", action: "openBoolOp", label: "Subtract Top Area" },
  /* 44 */ { kind: "icon", key: "tBoolExclude", action: "openBoolOp", label: "Exclude Overlapping Areas" },
  /* 45 */ { kind: "icon", key: "tBoolSplit", action: "openBoolOp", label: "Split Area With Holes" },
  { kind: "div" },
  /* 46 */ { kind: "icon", key: "tVia", tool: "via", label: "Via" },
  /* 47 */ { kind: "icon", key: "tSutureVias", tool: "sutureVias", label: "Suture vias" },
  /* 48 */ { kind: "icon", key: "tPad", tool: "pad", label: "Pad" },
  { kind: "div" },
  /* 49 */ { kind: "icon", key: "tDistH", action: "openDistribute", label: "Distribute Horizontally" },
  /* 50 */ { kind: "icon", key: "tDistV", action: "openDistribute", label: "Distribute Vertically" },
  { kind: "div" },
  /* 51 */ { kind: "icon", key: "tSettings", action: "openSettings", label: "Settings" },
  /* 52 */ { kind: "icon", key: "tNetLabel", tool: "netLabel", label: "Net Label" },
];

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 22,
        background: "var(--color-border-default)",
        margin: "0 var(--spacing-3)",
        flex: "0 0 auto",
      }}
    />
  );
}

function Dropdown({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flex: "0 0 auto" }}>
      <button
        type="button"
        className="ix-tool"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-3)",
          padding: "0 9px",
          height: 30,
          border: "var(--border-width-1) solid var(--color-border-default)",
          borderRadius: "var(--radius-lg)",
          cursor: "pointer",
          background: "var(--color-bg-surface)",
          color: "var(--color-text-primary)",
        }}
      >
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>{value}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2.2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: "100%",
            background: "var(--color-bg-surface)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--elevation-3)",
            zIndex: 50,
            padding: "var(--spacing-2)",
          }}
        >
          {options.map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "var(--spacing-2) var(--spacing-4)",
                background: opt === value ? "var(--color-bg-brand-subtle)" : "transparent",
                color: opt === value ? "var(--color-text-brand)" : "var(--color-text-primary)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                textAlign: "left",
                fontWeight: 500,
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolIcon({
  iconKey,
  active,
  onClick,
  label,
}: {
  iconKey: string;
  active?: boolean;
  onClick?: () => void;
  label?: string;
}) {
  return (
    <button
      className="ix-tool"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        width: 30,
        height: 30,
        borderRadius: "var(--radius-md)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        border: "none",
        background: active ? "var(--color-violet-600)" : "transparent",
        color: active ? "var(--color-text-on-brand)" : "var(--color-text-primary)",
        flex: "0 0 auto",
        padding: 0,
      }}
    >
      <DsIcon name={iconKey} size={18} strokeWidth={1.7} />
    </button>
  );
}

export function Toolbar() {
  const state = usePcbState();
  const actions = usePcbActions();

  const handlers: Record<ToolbarAction, () => void> = {
    undo: () => actions.undo(),
    redo: () => actions.redo(),
    zoomIn: () => actions.zoomIn(),
    zoomOut: () => actions.zoomOut(),
    fitAll: () => actions.zoomFit(),
    fitSection: () => actions.setZoom(1.5),
    fitArea: () => actions.setZoom(2),
    toggleGrid: () => actions.toggleGridVisible(),
    openSettings: () => actions.openSettings(),
    openDeviceMgr: () => actions.openManager("device"),
    openFootMgr: () => actions.openManager("footprint"),
    convertPcb: () => actions.openModal("convertConfirm"),
    openJlcpcb: () => actions.openModal("jlcpcb"),
    openGenBlock: () => actions.openModal("genBlock"),
    openBoolOp: () => actions.openModal("boolOp"),
    openDistribute: () => actions.openModal("distribute"),
    // Rotate/Flip target placed canvas objects first; fall back to the legacy
    // U12 component when nothing on the canvas is selected.
    rotateRight: () =>
      state.selectedIds.length > 0 ? actions.rotateSelectedPlaced(90) : actions.rotateSelBy(90),
    rotateLeft: () =>
      state.selectedIds.length > 0 ? actions.rotateSelectedPlaced(-90) : actions.rotateSelBy(-90),
    flipV: () => actions.flipSelectedV(),
    flipH: () => actions.flipSelectedH(),
    bringFront: () => actions.bringFront(),
    sendBack: () => actions.sendBack(),
    toggleBottom: () => actions.toggleBottom(),
  };

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
        flexWrap: "wrap",
        rowGap: "var(--spacing-3)",
        columnGap: "var(--spacing-2)",
        alignItems: "center",
      }}
    >
      {ITEMS.map((it, i) => {
        if (it.kind === "div") return <Divider key={i} />;
        if (it.kind === "dd") {
          const v = it.field === "gridSize" ? state.gridSize : state.unit;
          const set = it.field === "gridSize" ? actions.setGridSize : actions.setUnit;
          return <Dropdown key={i} value={v} options={it.options} onChange={set} ariaLabel={it.label} />;
        }
        const active = it.tool ? state.tool === it.tool : false;
        const onClick = it.action
          ? handlers[it.action]
          : it.tool
          ? () => actions.setTool(it.tool!)
          : undefined;
        return (
          <ToolIcon key={i} iconKey={it.key} active={active} label={it.label} onClick={onClick} />
        );
      })}
    </div>
  );
}
