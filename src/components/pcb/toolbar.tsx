"use client";

// IDEEZA PCB Software — toolbar (Schematic).
// Order matches the Figma source of truth (node 433:230819) exactly. The 52
// icons stream left-to-right via a single flex-wrap container; dividers come
// from explicit { kind: "div" } items.

import * as React from "react";
import { DsIcon } from "@/lib/pcb/icons";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { buildModeTabs } from "@/lib/pcb/data";

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
  | "openReannotate"
  // Phase 7 — 2D Main Toolbar (IT-718) extras
  | "openArray"
  | "view2D"
  | "view3D"
  | "flipBoard"
  | "openDrc"
  | "openGerber"
  | "openPickPlace"
  // Main Toolbar Comparison — sub-grouped parity additions.
  | "copy"
  | "paste"
  | "toggleSnap"
  | "openPdf"
  | "openDevicePicker"
  | "openAutoRoute"
  | "openDesignRules"
  | "openAnnotate"
  | "alignLeft"
  | "alignRight"
  | "alignTop"
  | "alignBottom";

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

// Main Toolbar — sub-grouped per Ideeza_Main_Toolbar_Comparison.xlsx.
// One array, mode-tagged; filterItems() hides mode-mismatched items and
// collapses the resulting empty dividers, so Schematic mode renders the
// Schematic sheet's sub-groups and PCB mode renders the 2D/PCB sheet's.
// Group order follows the sheet: File Ops → Edit/History → View/Zoom +
// View Modes → Grid/Units → Placement (Components&Wiring / Drawing&Shapes /
// Pads·Vias·Regions / Drawing&Text / Text&Media) → Convert → Routing →
// Layout → Managers → Export&Mfg → Tools&Misc/Settings.
const ITEMS: Item[] = [
  /* shared selection / nav */
  { kind: "icon", key: "tSelectVisible", tool: "select", label: "Select (V)" },
  { kind: "icon", key: "tHand", tool: "hand", label: "Hand — pan canvas (H or hold Space)" },
  { kind: "icon", key: "tViewDetails", tool: "selectVisible", label: "Select Visible Parts" },
  { kind: "div" },
  /* File Operations */
  { kind: "icon", key: "imp", action: "openProject", label: "Open Project" },
  { kind: "icon", key: "save", action: "save", label: "Save (Ctrl+S)" },
  { kind: "icon", key: "tSaveAll", action: "saveAll", label: "Save All" },
  { kind: "div" },
  /* Edit / History */
  { kind: "icon", key: "copy", action: "copy", label: "Copy" },
  { kind: "icon", key: "paste", action: "paste", label: "Paste" },
  { kind: "icon", key: "undo", action: "undo", label: "Undo" },
  { kind: "icon", key: "redo", action: "redo", label: "Redo" },
  { kind: "icon", key: "array", action: "openArray", label: "Array" },
  { kind: "icon", key: "findSim", action: "openFindSim", label: "Find Similar Object" },
  { kind: "div" },
  /* View / Zoom */
  { kind: "icon", key: "zoomin", action: "zoomIn", label: "Zoom In" },
  { kind: "icon", key: "zoomout", action: "zoomOut", label: "Zoom Out" },
  { kind: "icon", key: "tFitAll", action: "fitAll", label: "Fit all in window" },
  { kind: "icon", key: "tFitSection", action: "fitSection", label: "Fit section" },
  { kind: "icon", key: "tFitArea", action: "fitArea", label: "Fit Area Selection view" },
  /* View Modes (PCB sheet) */
  { kind: "icon", key: "board", action: "view2D", label: "2D View", modes: PCB },
  { kind: "icon", key: "cube", action: "view3D", label: "3D View", modes: PCB },
  { kind: "icon", key: "convert", action: "flipBoard", label: "Flip Board", modes: PCB },
  { kind: "div" },
  /* Grid / Units */
  { kind: "icon", key: "tGridOptions", action: "toggleGrid", label: "Grid Style" },
  { kind: "dd", field: "gridSize", options: GRID_SIZES, label: "Grid size" },
  { kind: "dd", field: "unit", options: UNITS, label: "Unit" },
  { kind: "icon", key: "snap", action: "toggleSnap", label: "Snap" },
  { kind: "div" },
  /* Placement — Components & Wiring (Schematic) */
  { kind: "icon", key: "tDevReuse", action: "openDevicePicker", label: "Device / Reuse block" },
  { kind: "icon", key: "tWire", tool: "wire", label: "Wire", modes: SCH },
  { kind: "icon", key: "tBus", tool: "bus", label: "Bus", modes: SCH },
  { kind: "icon", key: "pNetLabel", tool: "net", label: "Net", modes: SCH },
  { kind: "icon", key: "tVcc5v", tool: "vcc5v", label: "+5V (VCC)", modes: SCH },
  { kind: "icon", key: "power", tool: "gnd", label: "GND", modes: SCH },
  { kind: "icon", key: "tNoConn", tool: "noConnect", label: "No Connect", modes: SCH },
  { kind: "icon", key: "pTestPoint", tool: "junction", label: "Junction", modes: SCH },
  { kind: "icon", key: "tNetFlag", tool: "netFlag", label: "Net flag", modes: SCH },
  { kind: "icon", key: "tShortFlag", tool: "shortFlag", label: "Short Flag", modes: SCH },
  { kind: "icon", key: "tPort", tool: "port", label: "Port Out", modes: SCH },
  { kind: "icon", key: "tDiode", tool: "diode", label: "Diode", modes: SCH },
  { kind: "icon", key: "tResistor", tool: "resistor", label: "Resistor", modes: SCH },
  { kind: "icon", key: "tInductor", tool: "inductor", label: "Inductor", modes: SCH },
  { kind: "icon", key: "tCapacitor", tool: "capacitor", label: "Capacitor", modes: SCH },
  { kind: "icon", key: "tPgnd", tool: "pgnd", label: "PGND", modes: SCH },
  { kind: "icon", key: "tAgnd", tool: "agnd", label: "AGND", modes: SCH },
  { kind: "icon", key: "pNetLabel", tool: "pin", label: "Pin", modes: SCH },
  { kind: "icon", key: "tNetLabel", tool: "netLabel", label: "Net Label", modes: SCH },
  { kind: "div" },
  /* Placement — Drawing & Shapes (Schematic) */
  { kind: "icon", key: "pPolyline", tool: "polyline", label: "Polyline", modes: SCH },
  { kind: "icon", key: "pArc", tool: "arc", label: "Arc", modes: SCH },
  { kind: "icon", key: "pCircle", tool: "circle", label: "Circle", modes: SCH },
  { kind: "icon", key: "pRect", tool: "rectangle", label: "Rectangle", modes: SCH },
  { kind: "icon", key: "pBezier", tool: "bezier", label: "Bezier", modes: SCH },
  { kind: "icon", key: "pEllipse", tool: "ellipse", label: "Ellipse", modes: SCH },
  { kind: "div" },
  /* Placement — Pads, Vias & Regions (PCB) */
  { kind: "icon", key: "tPad", tool: "pad", label: "Pad", modes: PCB },
  { kind: "icon", key: "tVia", tool: "via", label: "Via", modes: PCB },
  { kind: "icon", key: "tSutureVias", tool: "sutureVias", label: "Suture vias", modes: PCB },
  { kind: "icon", key: "tBoardOutline", tool: "boardOutline", label: "Board Outline", modes: PCB },
  { kind: "icon", key: "tPolygon", tool: "polygon", label: "Copper Pour Polygon", modes: PCB },
  { kind: "icon", key: "tFillRegion", tool: "fillRegion", label: "Filled Region", modes: PCB },
  { kind: "icon", key: "tSlot", tool: "slot", label: "Slot", modes: PCB },
  { kind: "icon", key: "pNoConnect", tool: "prohibitedRegion", label: "Prohibited Region", modes: PCB },
  { kind: "icon", key: "tComponent", tool: "component", label: "Component / Footprint", modes: PCB },
  { kind: "div" },
  /* Placement — Drawing & Text (PCB) */
  { kind: "icon", key: "pPolyline", tool: "polyline", label: "Polyline", modes: PCB },
  { kind: "icon", key: "tDimension", tool: "dimension", label: "Dimension", modes: PCB },
  { kind: "div" },
  /* Placement — Text & Media (shared) */
  { kind: "icon", key: "tText", tool: "text", label: "Text" },
  { kind: "icon", key: "pImage", tool: "image", label: "Image" },
  { kind: "icon", key: "pTable", action: "openTable", label: "Table" },
  { kind: "div" },
  /* Convert / Export Actions (Schematic) */
  { kind: "icon", key: "tConvertPcb", action: "convertPcb", label: "Convert Schematic to PCB", modes: SCH },
  { kind: "icon", key: "dConvert", action: "convert2D", label: "Convert Schematic to 2D", modes: SCH },
  { kind: "icon", key: "dAnnotate", action: "openReannotate", label: "Reannotate Designators", modes: SCH },
  { kind: "icon", key: "tJlcpcb", action: "openJlcpcb", label: "JLCPCB Layout Service", modes: SCH },
  { kind: "icon", key: "tGenBlock", action: "openGenBlock", label: "Generate / Update Block Symbol", modes: SCH },
  { kind: "div" },
  /* Routing (PCB) */
  { kind: "icon", key: "dCheck", action: "openDrc", label: "Design Rule Check", modes: PCB },
  { kind: "icon", key: "tTrack", tool: "track", label: "Single Route — PCB route", modes: PCB },
  { kind: "icon", key: "pWire", tool: "stretchTrack", label: "Stretch Track", modes: PCB },
  { kind: "icon", key: "tDiffPair", tool: "diffPair", label: "Differential Pair Route", modes: PCB },
  { kind: "icon", key: "pArc", tool: "routingCorner", label: "Routing Corner", modes: PCB },
  { kind: "icon", key: "tLengthTune", tool: "lengthTune", label: "Length Tuning", modes: PCB },
  { kind: "icon", key: "tAutoRoute", action: "openAutoRoute", label: "Auto Route", modes: PCB },
  { kind: "div" },
  /* Layout — Align, Distribute, Rotate, Flip (shared) */
  { kind: "icon", key: "alignLeft", action: "alignLeft", label: "Align Left" },
  { kind: "icon", key: "alignRight", action: "alignRight", label: "Align Right" },
  { kind: "icon", key: "alignTop", action: "alignTop", label: "Align Top" },
  { kind: "icon", key: "alignBottom", action: "alignBottom", label: "Align Bottom" },
  { kind: "icon", key: "tAlignGrid", action: "alignGrid", label: "Align Grid — snap selected to grid" },
  { kind: "icon", key: "tDistH", action: "openDistribute", label: "Distribute Horizontally" },
  { kind: "icon", key: "tDistV", action: "openDistribute", label: "Distribute Vertically" },
  { kind: "icon", key: "tRotLeft", action: "rotateLeft", label: "Rotate Left" },
  { kind: "icon", key: "tRotRight", action: "rotateRight", label: "Rotate Right" },
  { kind: "icon", key: "tFlipH", action: "flipH", label: "Flip Horizontal" },
  { kind: "icon", key: "tFlipV", action: "flipV", label: "Flip Vertical" },
  { kind: "icon", key: "tBringFront", action: "bringFront", label: "Bring to Front" },
  { kind: "icon", key: "tSendBack", action: "sendBack", label: "Send to Back" },
  { kind: "div" },
  /* Managers + boolean ops (shared, live extras — kept) */
  { kind: "icon", key: "tFootMgr", action: "openFootMgr", label: "Footprint Manager" },
  { kind: "icon", key: "tDevMgr", action: "openDeviceMgr", label: "Device Manager" },
  { kind: "icon", key: "tBoolPreserve", action: "openBoolOp", label: "Preserve Overlapping Areas" },
  { kind: "icon", key: "tBoolMerge", action: "openBoolOp", label: "Merge Areas" },
  { kind: "icon", key: "tBoolSubtract", action: "openBoolOp", label: "Subtract Top Area" },
  { kind: "icon", key: "tBoolExclude", action: "openBoolOp", label: "Exclude Overlapping Areas" },
  { kind: "icon", key: "tBoolSplit", action: "openBoolOp", label: "Split Area With Holes" },
  { kind: "div" },
  /* Export & Manufacturing (PCB) */
  { kind: "icon", key: "gerber", action: "openGerber", label: "Gerber", modes: PCB },
  { kind: "icon", key: "bom", action: "openPickPlace", label: "Pick and Place", modes: PCB },
  { kind: "icon", key: "pdf", action: "openPdf", label: "Export PDF", modes: PCB },
  { kind: "div" },
  /* Tools & Misc (PCB) + Settings (shared) */
  { kind: "icon", key: "pTestPoint", tool: "mountingHole", label: "Mounting Hole", modes: PCB },
  { kind: "icon", key: "tSettings", action: "openSettings", label: "Settings" },
];

// 2D editor toolbar — Phase 7 (IT-718) expansion from the reduced strip.
// Covers File / Edit / View / Place / Route / Design / Transform / Export groups.
const ITEMS_2D: Item[] = [
  /* select + file */
  { kind: "icon", key: "tSelectVisible", tool: "select", label: "Select (V)" },
  { kind: "icon", key: "imp", action: "openProject", label: "Open Project" },
  { kind: "icon", key: "save", action: "save", label: "Save (Ctrl+S)" },
  { kind: "icon", key: "tSaveAll", action: "saveAll", label: "Save All" },
  { kind: "div" },
  /* edit */
  { kind: "icon", key: "copy", action: "openDistribute", label: "Copy" },
  { kind: "icon", key: "paste", action: "openDistribute", label: "Paste" },
  { kind: "icon", key: "undo", action: "undo", label: "Undo" },
  { kind: "icon", key: "redo", action: "redo", label: "Redo" },
  { kind: "icon", key: "array", action: "openArray", label: "Array" },
  { kind: "icon", key: "findSim", action: "openFindSim", label: "Find Similar Object" },
  { kind: "div" },
  /* view */
  { kind: "icon", key: "zoomin", action: "zoomIn", label: "Zoom In" },
  { kind: "icon", key: "zoomout", action: "zoomOut", label: "Zoom Out" },
  { kind: "icon", key: "tFitAll", action: "fitAll", label: "Fit All in Window" },
  { kind: "icon", key: "tGridOptions", action: "toggleGrid", label: "Toggle Grid" },
  { kind: "icon", key: "board", action: "view2D", label: "2D View" },
  { kind: "icon", key: "cube", action: "view3D", label: "3D View" },
  { kind: "icon", key: "convert", action: "flipBoard", label: "Flip Board" },
  { kind: "div" },
  /* unit (existing dropdown) */
  { kind: "dd", field: "unit", options: UNITS, label: "Unit" },
  { kind: "div" },
  /* place / PCB tools */
  { kind: "icon", key: "find", action: "openDeviceMgr", label: "Search Parts / Component" },
  { kind: "icon", key: "tPolygon", tool: "polygon", label: "Polygon Pour (already built)" },
  { kind: "icon", key: "tFillRegion", tool: "fillRegion", label: "Fill Region (already built)" },
  { kind: "icon", key: "tSlot", tool: "slot", label: "Slot Region (already built)" },
  { kind: "icon", key: "tBoardOutline", tool: "boardOutline", label: "Board Outline (already built)" },
  { kind: "icon", key: "del", tool: "prohibitedRegion", label: "Prohibited Region" },
  { kind: "icon", key: "pText", tool: "text", label: "Text" },
  { kind: "icon", key: "tDimension", tool: "dimension", label: "Dimension (already built)" },
  { kind: "div" },
  /* route */
  { kind: "icon", key: "tTrack", tool: "track", label: "Single Route (already built)" },
  { kind: "icon", key: "pWire", tool: "stretchTrack", label: "Stretch Track" },
  { kind: "icon", key: "wire", action: "openDistribute", label: "Routing Corner (set)" },
  { kind: "div" },
  /* design / DRC */
  { kind: "icon", key: "dCheck", action: "openDrc", label: "Design Rule Check" },
  { kind: "div" },
  /* transform */
  { kind: "icon", key: "tRotLeft", action: "rotateLeft", label: "Rotate Left" },
  { kind: "icon", key: "tRotRight", action: "rotateRight", label: "Rotate Right" },
  { kind: "icon", key: "tDistH", action: "openDistribute", label: "Distribute" },
  { kind: "div" },
  /* export */
  { kind: "icon", key: "gerber", action: "openGerber", label: "Gerber" },
  { kind: "icon", key: "bom", action: "openPickPlace", label: "Pick and Place" },
];

// `gutter` overrides the horizontal margin (px). Because flex `gap` also adds
// space around each item, the caller passes a gutter that nets the desired
// visible side-gap: (gutter + containerGap) px on each side of the rule.
function Divider({ gutter }: { gutter?: number } = {}) {
  return (
    <div
      style={{
        width: 1,
        height: 22,
        background: "var(--color-border-default)",
        margin: gutter != null ? `0 ${gutter}px` : "0 var(--spacing-3)",
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
      <DsIcon name={iconKey} size={20} strokeWidth={1.7} />
    </button>
  );
}

// Schematic top toolbar — a fixed set of the 12 essential controls (the rest
// live in the "…" overflow). Icons render at 20px with a 20px icon-to-icon gap.
const SCHEM_ESSENTIAL: Item[] = [
  { kind: "icon", key: "dRule", action: "openDesignRules", label: "Design Rule" },
  { kind: "icon", key: "dAnnotate", action: "openAnnotate", label: "Annotate Designator" },
  { kind: "icon", key: "tConvertPcb", action: "convertPcb", label: "Convert to PCB" },
  { kind: "div" },
  { kind: "icon", key: "undo", action: "undo", label: "Undo" },
  { kind: "icon", key: "redo", action: "redo", label: "Redo" },
  { kind: "div" },
  { kind: "icon", key: "zoomin", action: "zoomIn", label: "Zoom In" },
  { kind: "icon", key: "zoomout", action: "zoomOut", label: "Zoom Out" },
  { kind: "icon", key: "tFitAll", action: "fitAll", label: "Fit to Screen" },
  { kind: "div" },
  { kind: "icon", key: "tGridOptions", action: "toggleGrid", label: "Grid" },
  { kind: "dd", field: "gridSize", options: GRID_SIZES, label: "Grid size" },
  { kind: "dd", field: "unit", options: UNITS, label: "Unit" },
  { kind: "div" },
  { kind: "icon", key: "find", action: "openFindSim", label: "Find / Search" },
];
const SCHEM_OVERFLOW: Item[] = [
  { kind: "icon", key: "imp", action: "openProject", label: "Open Project" },
  { kind: "icon", key: "save", action: "save", label: "Save" },
  { kind: "icon", key: "tSaveAll", action: "saveAll", label: "Save All" },
  { kind: "icon", key: "copy", action: "copy", label: "Copy" },
  { kind: "icon", key: "paste", action: "paste", label: "Paste" },
  { kind: "icon", key: "array", action: "openArray", label: "Array" },
  { kind: "icon", key: "tFitSection", action: "fitSection", label: "Fit Section" },
  { kind: "icon", key: "tFitArea", action: "fitArea", label: "Fit Area" },
  { kind: "icon", key: "snap", action: "toggleSnap", label: "Snap" },
  { kind: "icon", key: "tSettings", action: "openSettings", label: "Settings" },
];

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
    openProject: () => actions.openModal("openProject"),
    save: () => actions.flashToast("Saved"),
    saveAll: () => actions.flashToast("All projects saved"),
    openFindSim: () => actions.openModal("findReplace"),
    openTable: () => actions.openModal("tableProps"),
    convert2D: () => actions.setMode("2d"),
    alignGrid: () => actions.alignSelectedToGrid(),
    openReannotate: () => actions.openModal("reannotate"),
    // Phase 7 — IT-718 toolbar additions
    openArray: () => actions.openModal("array"),
    view2D: () => actions.setMode("2d"),
    view3D: () => actions.setMode("3d"),
    flipBoard: () => actions.flashToast("Board flipped (Top ↔ Bottom)"),
    openDrc: () => actions.openModal("pcbDrc"),
    openGerber: () => actions.openModal("exportGerber2D"),
    openPickPlace: () => actions.openModal("exportPickPlace"),
    // Main Toolbar Comparison — sub-grouped parity additions.
    copy: () => actions.copySelection(),
    paste: () => actions.pasteClipboard(),
    toggleSnap: () => actions.toggleSnap(),
    openPdf: () => actions.openModal("exportPdf2D"),
    openDevicePicker: () => actions.openModal("devicePicker"),
    openAutoRoute: () => actions.openModal("autoRoute"),
    openDesignRules: () => actions.openModal("designRules"),
    openAnnotate: () => actions.openModal("annotate"),
    // Align L/R/T/B have no bounding-box impl yet (menu parity items are
    // placeholders too) — flag intent via toast.
    alignLeft: () => actions.flashToast("Align Left — coming soon"),
    alignRight: () => actions.flashToast("Align Right — coming soon"),
    alignTop: () => actions.flashToast("Align Top — coming soon"),
    alignBottom: () => actions.flashToast("Align Bottom — coming soon"),
  };

  const modeTabs = buildModeTabs(state, actions);

  // One flat list of the current mode's tools (icons + dividers + dropdowns),
  // already filtered by mode + the per-scope customization whitelist.
  const items = filterItems(
    state.mode === "2d" || state.mode === "3d" ? ITEMS_2D : ITEMS,
    state.mode as Mode,
    state.mode === "schematic"
      ? new Set(state.toolbarCustomization.schematic)
      : state.mode === "pcb"
      ? new Set(state.toolbarCustomization.pcb)
      : null,
  );

  // Render a single toolbar entry (icon / divider / dropdown).
  const renderItem = (it: Item, i: number) => {
    if (it.kind === "div") return <Divider key={i} />;
    if (it.kind === "dd") {
      const v = it.field === "gridSize" ? state.gridSize : state.unit;
      const set = it.field === "gridSize" ? actions.setGridSize : actions.setUnit;
      return <Dropdown key={i} value={v} options={it.options} onChange={set} ariaLabel={it.label} />;
    }
    const active = it.tool ? state.tool === it.tool : false;
    const onClick = it.action ? handlers[it.action] : it.tool ? () => actions.setTool(it.tool!) : undefined;
    return <ToolIcon key={i} iconKey={it.key} active={active} label={it.label} onClick={onClick} />;
  };

  // Compact single-row bar: the primary tools stay inline; the rest fold into
  // a "…" overflow. PRIMARY_INLINE is tuned so the row never wraps.
  const PRIMARY_INLINE = 15;
  const iconItems = items.filter((it) => it.kind === "icon"); // dividers handled by grouping below
  const inline = iconItems.slice(0, PRIMARY_INLINE);
  const overflow = iconItems.slice(PRIMARY_INLINE);
  const dropdowns = items.filter((it) => it.kind === "dd");

  // The toolbar is a bar that sits over the canvas column only — the side
  // panels run full-height under the TopBar and flank it. Its left/right
  // insets mirror the canvas so it aligns exactly with the drawing area.
  const v = state.viewTog;
  const leftInset = v["Left-Side panel"] !== false ? 366 : 74;
  const rightInset = v["Right-Side Panel"] !== false ? 292 : 0;

  return (
    <div
      style={{
        position: "absolute",
        top: 62,
        left: leftInset,
        right: rightInset,
        height: 46,
        background: "var(--color-bg-surface)",
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        padding: "0 var(--spacing-6)",
        zIndex: 18,
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-2)",
      }}
    >
      {/* Schematic | PCB (+ 2D / 3D) mode toggle */}
      <div style={{ display: "flex", background: "var(--color-bg-brand-subtle)", borderRadius: "var(--radius-full)", padding: 3, flex: "0 0 auto" }}>
        {modeTabs.map((mt) => {
          const active = mt.bg !== "transparent";
          return (
            <button
              key={mt.label}
              onClick={mt.onClick}
              style={{
                padding: "6px 16px",
                borderRadius: "var(--radius-full)",
                border: "none",
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                fontWeight: 700,
                fontFamily: "inherit",
                background: active ? "var(--color-violet-600)" : "transparent",
                color: active ? "#fff" : "var(--color-text-secondary)",
                transition: "background .14s, color .14s",
              }}
            >
              {mt.label}
            </button>
          );
        })}
      </div>

      {/* leading rule: 12px each side (outer gap is --spacing-2 = 4px → +8) */}
      <Divider gutter={state.mode === "schematic" ? 8 : undefined} />

      {state.mode === "schematic" ? (
        <>
          {/* schematic: fixed 12 essentials — 20px icon-to-icon; each divider
              nets 12px per side (row gap 20 + −8 margin). */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 20, overflow: "hidden" }}>
            {SCHEM_ESSENTIAL.map((it, i) =>
              it.kind === "div" ? <Divider key={i} gutter={-8} /> : renderItem(it, i),
            )}
          </div>
          <OverflowMenu items={SCHEM_OVERFLOW} render={renderItem} />
        </>
      ) : (
        <>
          {/* other modes: primary tools inline, the rest fold into "…" */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "var(--spacing-1)", overflow: "hidden" }}>
            {inline.map((it, i) => renderItem(it, i))}
            {dropdowns.length > 0 && <Divider />}
            {dropdowns.map((it, i) => renderItem(it, 1000 + i))}
          </div>
          {overflow.length > 0 && <OverflowMenu items={overflow} render={renderItem} />}
        </>
      )}
    </div>
  );
}

// "…" overflow: opens a popover grid of the remaining tools. Uses position:
// fixed so it escapes the toolbar's clipping.
function OverflowMenu({ items, render }: { items: Item[]; render: (it: Item, i: number) => React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const [pos, setPos] = React.useState<{ top: number; right: number }>({ top: 0, right: 0 });
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!btnRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const toggle = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    setOpen((v) => !v);
  };
  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label="More tools"
        aria-expanded={open}
        title="More tools"
        className="ix-tool"
        style={{ width: 30, height: 30, flex: "0 0 auto", borderRadius: "var(--radius-md)", border: "none", background: open ? "var(--color-bg-brand-subtle)" : "transparent", color: "var(--color-text-primary)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
      </button>
      {open && (
        <div
          role="menu"
          style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 62, background: "var(--color-bg-surface)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-xl)", boxShadow: "var(--elevation-6, 0 16px 40px -8px rgba(0,0,0,.22))", padding: "var(--spacing-4)", display: "grid", gridTemplateColumns: "repeat(6, 30px)", gap: "var(--spacing-2)", maxWidth: 260 }}
          onClick={() => setOpen(false)}
        >
          {items.map((it, i) => render(it, 5000 + i))}
        </div>
      )}
    </>
  );
}
