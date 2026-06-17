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
  | "toggleBottom"
  // Phase 5 — IT-692 schematic toolbar fillers
  | "openProject"
  | "save"
  | "saveAll"
  | "openFindSim"
  | "openTable"
  | "convert2D"
  | "alignGrid"
  | "openReannotate";

// `modes` constrains which editor modes accept the tool. Omitted → all modes.
// Items not for the current mode render greyed out and ignore clicks.
type Mode = "schematic" | "pcb" | "2d" | "3d";
type Item =
  | {
      kind: "icon";
      key: string;
      tool?: string;
      action?: ToolbarAction;
      label?: string;
      modes?: Mode[];
    }
  | { kind: "div" }
  | { kind: "dd"; field: "gridSize" | "unit"; options: string[]; label?: string };

const GRID_SIZES = ["0.001", "0.005", "0.01", "0.05", "0.1", "0.5", "1"];
const UNITS = ["Inch", "Mil", "mm"];

// Toolbar layout follows the Figma source order but every item is tagged with
// `modes` so the active editor mode (`schematic` / `pcb`) disables tools that
// don't apply. PCB-only tools added at the end (Polygon / Region / Slot / …).
const SCH: Mode[] = ["schematic"];
const PCB: Mode[] = ["pcb"];

const ITEMS: Item[] = [
  /* shared selection / nav */
  { kind: "icon", key: "tSelectVisible", tool: "select", label: "Select (V)" },
  { kind: "icon", key: "tHand", tool: "hand", label: "Hand — pan canvas (H or hold Space)" },
  { kind: "icon", key: "tViewDetails", tool: "selectVisible", label: "Select Visible Parts" },
  /* file (Phase 5 — IT-693/694/695) */
  { kind: "icon", key: "imp", action: "openProject", label: "Open Project" },
  { kind: "icon", key: "save", action: "save", label: "Save (Ctrl+S)" },
  { kind: "icon", key: "tSaveAll", action: "saveAll", label: "Save All" },
  { kind: "icon", key: "undo", action: "undo", label: "Undo" },
  { kind: "icon", key: "redo", action: "redo", label: "Redo" },
  { kind: "icon", key: "board", action: "toggleBottom", label: "Dashboard" },
  { kind: "icon", key: "findSim", action: "openFindSim", label: "Find Similar Object" },
  { kind: "icon", key: "tFitArea", tool: "viewDetails", label: "View details" },
  { kind: "div" },
  /* zoom / view */
  { kind: "icon", key: "zoomin", action: "zoomIn", label: "Zoom In" },
  { kind: "icon", key: "zoomout", action: "zoomOut", label: "Zoom Out" },
  { kind: "icon", key: "tFitAll", action: "fitAll", label: "Fit all in window" },
  { kind: "icon", key: "tFitSection", action: "fitSection", label: "Fit section" },
  { kind: "icon", key: "tFitArea", action: "fitArea", label: "Fit Area Selection view" },
  { kind: "icon", key: "tGridOptions", action: "toggleGrid", label: "Grid options" },
  { kind: "div" },
  { kind: "dd", field: "gridSize", options: GRID_SIZES, label: "Grid size" },
  { kind: "dd", field: "unit", options: UNITS, label: "Unit" },
  { kind: "div" },
  /* shared place */
  { kind: "icon", key: "tDevReuse", action: "openDeviceMgr", label: "Device / Reuse block" },
  /* schematic-only place tools */
  { kind: "icon", key: "tWire", tool: "wire", label: "Wire", modes: SCH },
  { kind: "icon", key: "tBus", tool: "bus", label: "Bus", modes: SCH },
  { kind: "icon", key: "tDiode", tool: "diode", label: "Diode", modes: SCH },
  { kind: "icon", key: "tResistor", tool: "resistor", label: "Resistor", modes: SCH },
  { kind: "icon", key: "tInductor", tool: "inductor", label: "Inductor", modes: SCH },
  { kind: "icon", key: "tCapacitor", tool: "capacitor", label: "Capacitor", modes: SCH },
  { kind: "icon", key: "tNetFlag", tool: "netFlag", label: "Net flag", modes: SCH },
  { kind: "icon", key: "tVcc5v", tool: "vcc5v", label: "+5V", modes: SCH },
  { kind: "icon", key: "tShortFlag", tool: "shortFlag", label: "Short Flag", modes: SCH },
  { kind: "icon", key: "tPort", tool: "port", label: "Port Out", modes: SCH },
  { kind: "icon", key: "tNoConn", tool: "noConnect", label: "No Connect", modes: SCH },
  { kind: "icon", key: "tText", tool: "text", label: "Text" },
  /* Phase 5 — schematic drawing additions (IT-706/707/708/703) */
  { kind: "icon", key: "pBezier", tool: "bezier", label: "Bezier", modes: SCH },
  { kind: "icon", key: "pImage", tool: "image", label: "Image" },
  { kind: "icon", key: "pTable", action: "openTable", label: "Table" },
  { kind: "icon", key: "pChip", action: "openDeviceMgr", label: "Component — open Device Manager", modes: SCH },
  { kind: "div" },
  /* schematic ↔ PCB actions */
  { kind: "icon", key: "tConvertPcb", action: "convertPcb", label: "Convert Schematic to PCB", modes: SCH },
  { kind: "icon", key: "dConvert", action: "convert2D", label: "Convert Schematic to 2D", modes: SCH },
  { kind: "icon", key: "tAlignGrid", action: "alignGrid", label: "Align Grid — snap selected to grid" },
  { kind: "icon", key: "dAnnotate", action: "openReannotate", label: "Reannotate Designators", modes: SCH },
  { kind: "icon", key: "tJlcpcb", action: "openJlcpcb", label: "JLCPCB Layout Service" },
  { kind: "icon", key: "tGenBlock", action: "openGenBlock", label: "Generate / Update Block Symbol", modes: SCH },
  { kind: "icon", key: "tPgnd", tool: "pgnd", label: "PGND", modes: SCH },
  { kind: "icon", key: "tAgnd", tool: "agnd", label: "AGND", modes: SCH },
  { kind: "div" },
  /* shared transforms */
  { kind: "icon", key: "tBringFront", action: "bringFront", label: "Bring to Front" },
  { kind: "icon", key: "tSendBack", action: "sendBack", label: "Send to Back" },
  { kind: "icon", key: "tRotRight", action: "rotateRight", label: "Rotate Right" },
  { kind: "icon", key: "tFlipV", action: "flipV", label: "Flip Up and Down" },
  { kind: "icon", key: "tFlipH", action: "flipH", label: "Flip Up and Left" },
  { kind: "icon", key: "tRotLeft", action: "rotateLeft", label: "Rotate Left" },
  { kind: "div" },
  /* shared managers */
  { kind: "icon", key: "tFootMgr", action: "openFootMgr", label: "Footprint Manager" },
  { kind: "icon", key: "tDevMgr", action: "openDeviceMgr", label: "Device Manager" },
  { kind: "div" },
  /* boolean ops — useful in both for polygons */
  { kind: "icon", key: "tBoolPreserve", action: "openBoolOp", label: "Preserve Overlapping Areas" },
  { kind: "icon", key: "tBoolMerge", action: "openBoolOp", label: "Merge Areas" },
  { kind: "icon", key: "tBoolSubtract", action: "openBoolOp", label: "Subtract Top Area" },
  { kind: "icon", key: "tBoolExclude", action: "openBoolOp", label: "Exclude Overlapping Areas" },
  { kind: "icon", key: "tBoolSplit", action: "openBoolOp", label: "Split Area With Holes" },
  { kind: "div" },
  /* PCB-only place tools */
  { kind: "icon", key: "tTrack", tool: "track", label: "Track — PCB route", modes: PCB },
  { kind: "icon", key: "tPad", tool: "pad", label: "Pad", modes: PCB },
  { kind: "icon", key: "tVia", tool: "via", label: "Via", modes: PCB },
  { kind: "icon", key: "tSutureVias", tool: "sutureVias", label: "Suture vias", modes: PCB },
  { kind: "icon", key: "tPolygon", tool: "polygon", label: "Copper Pour Polygon", modes: PCB },
  { kind: "icon", key: "tFillRegion", tool: "fillRegion", label: "Filled Region", modes: PCB },
  { kind: "icon", key: "tSlot", tool: "slot", label: "Slot", modes: PCB },
  { kind: "icon", key: "tBoardOutline", tool: "boardOutline", label: "Board Outline", modes: PCB },
  { kind: "icon", key: "tComponent", tool: "component", label: "Component / Footprint", modes: PCB },
  { kind: "icon", key: "tDimension", tool: "dimension", label: "Dimension", modes: PCB },
  /* PCB-only routing helpers */
  { kind: "icon", key: "tDiffPair", tool: "diffPair", label: "Differential Pair Route", modes: PCB },
  { kind: "icon", key: "tLengthTune", tool: "lengthTune", label: "Length Tuning", modes: PCB },
  { kind: "icon", key: "tAutoRoute", action: "openBoolOp", label: "Auto Route (coming)", modes: PCB },
  { kind: "div" },
  /* shared distribute / labels */
  { kind: "icon", key: "tDistH", action: "openDistribute", label: "Distribute Horizontally" },
  { kind: "icon", key: "tDistV", action: "openDistribute", label: "Distribute Vertically" },
  { kind: "div" },
  { kind: "icon", key: "tSettings", action: "openSettings", label: "Settings" },
  { kind: "icon", key: "tNetLabel", tool: "netLabel", label: "Net Label", modes: SCH },
];

// 2D editor toolbar — a reduced 11-icon strip (no inline dropdowns), faithful to
// the Figma "2D section" frame. Select / Undo / Redo / Dashboard / Search, then a
// divider, then the zoom & view controls.
const ITEMS_2D: Item[] = [
  { kind: "icon", key: "tSelectVisible", tool: "select", label: "Select (V)" },
  { kind: "icon", key: "undo", action: "undo", label: "Undo" },
  { kind: "icon", key: "redo", action: "redo", label: "Redo" },
  { kind: "icon", key: "board", action: "toggleBottom", label: "Dashboard" },
  { kind: "icon", key: "find", action: "openDeviceMgr", label: "Search Parts" },
  { kind: "div" },
  { kind: "icon", key: "zoomin", action: "zoomIn", label: "Zoom In" },
  { kind: "icon", key: "zoomout", action: "zoomOut", label: "Zoom Out" },
  { kind: "icon", key: "tFitAll", action: "fitAll", label: "Fit All in Window" },
  { kind: "icon", key: "findSim", action: "fitArea", label: "Zoom Area" },
  { kind: "icon", key: "tFitArea", action: "fitArea", label: "Zoom Selection" },
  { kind: "icon", key: "tGridOptions", action: "toggleGrid", label: "Toggle Grid" },
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

// Drop items whose `modes` don't include the current mode, then collapse
// consecutive / leading / trailing dividers so the toolbar reads cleanly.
// `customAllow` is an optional whitelist of `tool` ids — when provided, an
// icon item with a `tool` field is dropped unless its tool is in the set
// (action-only and divider items are unaffected). This is how the Top Tools
// Bar settings page actually customizes the toolbar.
function filterItems(items: Item[], mode: Mode, customAllow: Set<string> | null): Item[] {
  const kept = items.filter((it) => {
    if (it.kind !== "icon") return true;
    if (it.modes && !it.modes.includes(mode)) return false;
    if (customAllow && it.tool && !customAllow.has(it.tool)) return false;
    return true;
  });
  const out: Item[] = [];
  for (const it of kept) {
    if (it.kind === "div") {
      const last = out[out.length - 1];
      if (!last || last.kind === "div") continue; // skip leading + consecutive dividers
    }
    out.push(it);
  }
  while (out.length && out[out.length - 1].kind === "div") out.pop(); // trim trailing
  return out;
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
    // Phase 5 — IT-692 / IT-569 leftovers.
    openProject: () => actions.flashToast("Open Project — pick a file"),
    save: () => actions.flashToast("Saved"),
    saveAll: () => actions.flashToast("All projects saved"),
    openFindSim: () => actions.openModal("findReplace"),
    openTable: () => actions.openModal("tableProps"),
    convert2D: () => actions.setMode("2d"),
    alignGrid: () => actions.alignSelectedToGrid(),
    openReannotate: () => actions.openModal("reannotate"),
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
      {filterItems(
        state.mode === "2d" || state.mode === "3d" ? ITEMS_2D : ITEMS,
        state.mode as Mode,
        // Schematic/PCB modes use the Top Tools Bar Settings page's
        // per-scope selection to whitelist tool ids. Other modes opt out.
        state.mode === "schematic"
          ? new Set(state.toolbarCustomization.schematic)
          : state.mode === "pcb"
          ? new Set(state.toolbarCustomization.pcb)
          : null,
      ).map((it, i) => {
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
