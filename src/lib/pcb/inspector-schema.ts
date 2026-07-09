// IDEEZA PCB Software — right-sidebar Property Inspector schema.
// Source of truth: Sidebar Properties.xlsx (SCHEMATIC + 2D sheets). Each
// selection type maps to an ordered list of collapsible Sections, each with
// typed Fields. Fields carry an optional `bind` token — when present the
// renderer draws an interactive control wired to the store; otherwise the
// field renders read-only (per the agreed "modeled = editable, rest =
// display-only" scope). Nothing here is mode-specific logic — the resolver in
// right-panel.tsx picks the type from the current selection + editor mode.

export type FieldKind =
  | "text"
  | "number"
  | "dropdown"
  | "color"
  | "toggle"
  | "coord" // single axis of an X/Y pair (label carries the axis)
  | "action"
  | "readonly";

export interface InspectorField {
  key: string;
  label: string;
  kind: FieldKind;
  unit?: string;
  // Static dropdown options, or a dynamic token ("layers") resolved at render.
  options?: string[];
  optionsToken?: "layers";
  // Binding token — "obj:<field>" (selected CanvasObject), "wire:*", "doc:*".
  // Absent → read-only display.
  bind?: string;
  // Fallback display value for read-only fields with no live source.
  display?: string;
}

export interface InspectorSection {
  title: string;
  fields: InspectorField[];
}

export interface InspectorType {
  label: string;
  icon: string;
  sections: InspectorSection[];
}

// ── shared option lists ──────────────────────────────────────────────────
const LINE_STYLES = ["Solid", "Dashed", "Dotted"];
const PIN_TYPES = [
  "Undefined", "Input", "Output", "I/O", "Power", "Passive",
  "Open Collector", "Open Emitter", "HiZ", "Pull Up", "Pull Down",
];
const PIN_SHAPES = ["Line", "Inverted", "Clock", "Inverted Clock", "Input Low", "Output Low"];
const FONT_STYLES = ["Normal", "Bold", "Italic", "Bold Italic"];
const ORIGINS = ["Top Left", "Top Center", "Center", "Bottom Left", "Bottom Center"];
const GRID_TYPES = ["Grid Dot", "Grid", "None"];
const ROUTING_MODES = ["45° Diagonal", "90° Orthogonal", "Curved"];
const PAD_SHAPES = ["Round", "Rectangle", "Oval"];
const VIA_KINDS = ["Through", "Blind", "Buried"];
const EXP_MODES = ["General", "Custom"];

// ═══════════════════════ SCHEMATIC (7 types) ═══════════════════════
const SCHEMATIC: Record<string, InspectorType> = {
  Canvas: {
    label: "Canvas",
    icon: "board",
    sections: [
      {
        title: "Basic Properties",
        fields: [
          { key: "name", label: "Name", kind: "text", bind: "doc:name", display: "P1" },
          { key: "drawing", label: "Drawing", kind: "dropdown", options: ["Right Bottom", "Left Top", "Center"], display: "Right Bottom" },
        ],
      },
      {
        title: "Drawing Border",
        fields: [
          { key: "border", label: "Border", kind: "toggle", display: "On" },
          { key: "titleBlockPos", label: "Title Block Position", kind: "dropdown", options: ["Right Bottom", "Left Bottom", "Right Top"], display: "Right Bottom" },
          { key: "size", label: "Size", kind: "dropdown", options: ["A0", "A1", "A2", "A3", "A4"], display: "A4" },
          { key: "drawingWidth", label: "Drawing Width", kind: "number", unit: "in", display: "16.5" },
          { key: "drawingHeight", label: "Drawing Height", kind: "number", unit: "in", display: "11.7" },
          { key: "regionStart", label: "Region Start", kind: "dropdown", options: ["Left Top", "Left Bottom"], display: "Left Top" },
          { key: "xRegionCount", label: "X Region Count", kind: "number", display: "7" },
          { key: "yRegionCount", label: "Y Region Count", kind: "number", display: "6" },
          { key: "bladeWidth", label: "Blade Width", kind: "number", unit: "mm", display: "0" },
          { key: "color", label: "Color", kind: "color", display: "#1E1E1E" },
        ],
      },
      {
        title: "Title Block",
        fields: [
          { key: "titleBlockShow", label: "Title Block", kind: "toggle", display: "Visible" },
          { key: "createDate", label: "Create date", kind: "readonly", display: "—" },
          { key: "createTime", label: "Create Time", kind: "readonly", display: "—" },
          { key: "pageCount", label: "Page count", kind: "readonly", display: "1" },
          { key: "pageName", label: "Page Name", kind: "text", display: "P1" },
          { key: "pageNo", label: "Page No", kind: "text", display: "01" },
          { key: "projectName", label: "Project Name", kind: "readonly", display: "—" },
          { key: "boardName", label: "Board Name", kind: "readonly", display: "—" },
          { key: "schematicName", label: "Schematic Name", kind: "readonly", display: "Schematic 1" },
          { key: "updateDate", label: "Update Date", kind: "readonly", display: "—" },
          { key: "updateTime", label: "Update Time", kind: "readonly", display: "—" },
          { key: "company", label: "Company", kind: "text", display: "IDEEZA" },
          { key: "pageSize", label: "Page size", kind: "dropdown", options: ["A0", "A1", "A2", "A3", "A4"], display: "A4" },
          { key: "reviewed", label: "Reviewed", kind: "text", display: "-" },
          { key: "drawn", label: "Drawn", kind: "text", display: "-" },
          { key: "description", label: "Description", kind: "text", display: "-" },
        ],
      },
    ],
  },
  Component: {
    label: "Component",
    icon: "pChip",
    sections: [
      {
        title: "Basic Properties",
        fields: [
          { key: "name", label: "Name", kind: "text", bind: "obj:comment", display: "—" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
          { key: "designator", label: "Designator", kind: "text", bind: "obj:text", display: "U?" },
          { key: "uniqueId", label: "Unique ID", kind: "readonly", display: "—" },
          { key: "devices", label: "Devices", kind: "readonly", display: "—" },
          { key: "footprint", label: "Footprint", kind: "text", bind: "obj:footprint", display: "—" },
          { key: "addBom", label: "Add into BOM", kind: "toggle", bind: "prop:addBom", display: "Yes" },
          { key: "convertPcb", label: "Convert to PCB", kind: "action", display: "Convert" },
          { key: "pcbLayer", label: "PCB Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:layer" },
        ],
      },
      {
        title: "Key Properties",
        fields: [
          { key: "manufacturer", label: "Manufacturer", kind: "text", bind: "prop:manufacturer", display: "—" },
          { key: "manufacturerPart", label: "Manufacturer Part", kind: "text", bind: "prop:manufacturerPart", display: "—" },
          { key: "supplier", label: "Supplier", kind: "text", bind: "prop:supplier", display: "—" },
          { key: "supplierPart", label: "Supplier Part", kind: "text", bind: "prop:supplierPart", display: "—" },
        ],
      },
      { title: "More Properties", fields: [{ key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" }] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  Pin: {
    label: "Pin",
    icon: "pNetLabel",
    sections: [
      {
        title: "Basic Properties",
        fields: [
          { key: "pinName", label: "Pin Name", kind: "text", bind: "prop:pinName", display: "—" },
          { key: "pinNumber", label: "Pin Number", kind: "text", bind: "prop:pinNumber", display: "1" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
          { key: "pinType", label: "Pin Type", kind: "dropdown", options: PIN_TYPES, bind: "prop:pinType", display: "Undefined" },
          { key: "pinShape", label: "Pin Shape", kind: "dropdown", options: PIN_SHAPES, bind: "prop:pinShape", display: "Line" },
          { key: "noConnectFlag", label: "No Connect Flag", kind: "toggle", bind: "prop:noConnectFlag", display: "Off" },
        ],
      },
      { title: "More Properties", fields: [{ key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" }] },
    ],
  },
  Nets: {
    label: "Nets",
    icon: "wire",
    sections: [
      {
        title: "Basic Properties",
        fields: [
          { key: "name", label: "Name", kind: "text", bind: "obj:net", display: "—" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
          { key: "relevance", label: "Relevance", kind: "readonly", display: "—" },
          { key: "device", label: "Device", kind: "readonly", display: "—" },
          { key: "type", label: "Type", kind: "dropdown", options: ["Signal", "Power", "Ground"], bind: "prop:type", display: "Signal" },
        ],
      },
      { title: "More Properties", fields: [{ key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" }] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  "Drawing Tools": {
    label: "Drawing Tools",
    icon: "pPolyline",
    sections: [
      {
        title: "Basic Properties",
        fields: [
          { key: "lineWidth", label: "Line Width", kind: "number", unit: "mm", bind: "obj:width", display: "0.15" },
          { key: "lineStyle", label: "Line Style", kind: "dropdown", options: LINE_STYLES, bind: "prop:lineStyle", display: "Solid" },
          { key: "strokeColor", label: "Stroke Color", kind: "color", bind: "obj:color", display: "#1E1E1E" },
          { key: "fillColor", label: "Fill Color", kind: "color", bind: "prop:fillColor", display: "#FFFFFF" },
          { key: "fillColor2", label: "Fill Color", kind: "color", bind: "prop:fillColor2", display: "#FFFFFF" },
          { key: "roundRadius", label: "Round Radius (Rectangle)", kind: "number", unit: "mm", bind: "prop:roundRadius", display: "0" },
          { key: "rectWidth", label: "Width (Rectangle)", kind: "number", unit: "mm", bind: "prop:rectWidth", display: "0" },
          { key: "rectHeight", label: "Height (Rectangle)", kind: "number", unit: "mm", bind: "prop:rectHeight", display: "0" },
          { key: "circleRadius", label: "Radius (Circle)", kind: "number", unit: "mm", bind: "prop:circleRadius", display: "0" },
        ],
      },
    ],
  },
  Text: {
    label: "Text",
    icon: "pText",
    sections: [
      {
        title: "Basic Properties",
        fields: [
          { key: "text", label: "Text", kind: "text", bind: "obj:text", display: "Text" },
          { key: "fontColor", label: "Font Color", kind: "color", bind: "obj:color", display: "#1E1E1E" },
          { key: "font", label: "Font", kind: "dropdown", options: ["Inter", "Arial", "Roboto", "Courier"], bind: "prop:font", display: "Inter" },
          { key: "fontSize", label: "Font Size", kind: "number", unit: "px", bind: "prop:fontSize", display: "12" },
          { key: "style", label: "Style", kind: "dropdown", options: FONT_STYLES, bind: "prop:style", display: "Normal" },
          { key: "origin", label: "Origin", kind: "dropdown", options: ORIGINS, bind: "prop:origin", display: "Top Left" },
        ],
      },
    ],
  },
  Wire: {
    label: "Wire",
    icon: "tWire",
    sections: [
      {
        title: "Basic Properties",
        fields: [
          { key: "name", label: "Name", kind: "text", bind: "obj:net", display: "—" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
          { key: "globalNetName", label: "Global Net Name", kind: "text", bind: "prop:globalNetName", display: "—" },
          { key: "relevance", label: "Relevance", kind: "readonly", display: "—" },
          { key: "color", label: "Color", kind: "color", bind: "wire:color", display: "#1E1E1E" },
          { key: "lineWidth", label: "Line Width", kind: "dropdown", bind: "wire:lineWidth", options: ["Thin", "Medium", "Thick"], display: "Medium" },
          { key: "lineStyle", label: "Line Style", kind: "dropdown", bind: "wire:lineStyle", options: LINE_STYLES, display: "Solid" },
        ],
      },
      { title: "More Properties", fields: [{ key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" }] },
    ],
  },
};

// ═══════════════════════ 2D / PCB (8 types) ═══════════════════════
const TWOD: Record<string, InspectorType> = {
  Canvas: {
    label: "Canvas",
    icon: "board",
    sections: [
      {
        title: "Selection Filter",
        fields: [
          { key: "allOn", label: "All On", kind: "toggle", bind: "set:allOn", display: "On" },
          { key: "fComponents", label: "Components", kind: "toggle", bind: "set:fComponents", display: "On" },
          { key: "fWires", label: "Wires", kind: "toggle", bind: "set:fWires", display: "On" },
          { key: "fBuses", label: "Buses", kind: "toggle", bind: "set:fBuses", display: "On" },
          { key: "fSheetSymbols", label: "Sheet Symbols", kind: "toggle", bind: "set:fSheetSymbols", display: "On" },
          { key: "fSheetEntries", label: "Sheet Entries", kind: "toggle", bind: "set:fSheetEntries", display: "On" },
          { key: "fNetLabels", label: "Net Labels", kind: "toggle", bind: "set:fNetLabels", display: "On" },
          { key: "fParameters", label: "Parameters", kind: "toggle", bind: "set:fParameters", display: "On" },
          { key: "fPorts", label: "Ports", kind: "toggle", bind: "set:fPorts", display: "On" },
          { key: "fTexts", label: "Texts", kind: "toggle", bind: "set:fTexts", display: "On" },
          { key: "fDrawingObjects", label: "Drawing Objects", kind: "toggle", bind: "set:fDrawingObjects", display: "On" },
        ],
      },
      {
        title: "Document",
        fields: [
          { key: "unit", label: "Unit", kind: "dropdown", bind: "doc:unit", options: ["Mil", "mm"], display: "Mil" },
          { key: "gridType", label: "Grid Type", kind: "dropdown", bind: "set:gridType", options: GRID_TYPES, display: "Grid Dot" },
          { key: "boldGridType", label: "Bold Grid Type", kind: "dropdown", bind: "set:boldGridType", options: GRID_TYPES, display: "Grid" },
          { key: "boldGridRatio", label: "Bold Grid Ratio", kind: "number", bind: "set:boldGridRatio", display: "5" },
          { key: "gridSize", label: "Grid Size", kind: "dropdown", bind: "doc:gridSize", optionsToken: undefined, options: ["0.001", "0.005", "0.01", "0.05", "0.1"], display: "0.05" },
          { key: "snapSize", label: "Snap Size", kind: "number", bind: "set:snapSize", unit: "mil", display: "2" },
          { key: "snap", label: "Snap", kind: "toggle", bind: "doc:snap", display: "On" },
          { key: "altSnapSize", label: "Alt Snap Size", kind: "number", bind: "set:altSnapSize", unit: "mil", display: "1" },
          { key: "highlight", label: "Highlight", kind: "toggle", bind: "set:highlight", display: "On" },
        ],
      },
      {
        title: "Common Setting",
        fields: [
          { key: "startTrackWidth", label: "Start Track width", kind: "number", bind: "set:startTrackWidth", unit: "mil", display: "8" },
          { key: "trackWidth", label: "Track Width", kind: "number", bind: "set:trackWidth", unit: "mil", display: "10" },
          { key: "startViaSize", label: "Start Via size", kind: "number", bind: "set:startViaSize", unit: "mil", display: "24" },
          { key: "viaOuter", label: "Via Outside diameter", kind: "number", bind: "set:viaOuter", unit: "mil", display: "24" },
          { key: "viaInner", label: "VIa Inside Diameter", kind: "number", bind: "set:viaInner", unit: "mil", display: "12" },
          { key: "routingMode", label: "Routing Mode", kind: "dropdown", bind: "set:routingMode", options: ROUTING_MODES, display: "45° Diagonal" },
          { key: "trackOpt", label: "Current Track Path Optimization", kind: "toggle", bind: "set:trackOpt", display: "On" },
          { key: "removeLoop", label: "Remove Loop", kind: "toggle", bind: "set:removeLoop", display: "On" },
          { key: "hideCopper", label: "Hide Copper Region", kind: "toggle", bind: "set:hideCopper", display: "Off" },
          { key: "moveFootprint", label: "Move Footprint The Wire Follows", kind: "toggle", bind: "set:moveFootprint", display: "On" },
          { key: "rotationObjects", label: "Rotation Objects", kind: "number", bind: "set:rotationObjects", unit: "°", display: "90" },
          { key: "minTrackCorners", label: "Minimum Track Corners", kind: "number", bind: "set:minTrackCorners", display: "0" },
        ],
      },
    ],
  },
  Component: {
    label: "Component",
    icon: "tComponent",
    sections: [
      {
        title: "Location",
        fields: [
          { key: "layer", label: "Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:layer" },
          { key: "centerX", label: "Center X", kind: "coord", unit: "mil", bind: "obj:x" },
          { key: "centerY", label: "Center Y", kind: "coord", unit: "mil", bind: "obj:y" },
          { key: "rotation", label: "Rotation", kind: "number", unit: "°", bind: "obj:rotation", display: "0" },
          { key: "locked", label: "Locked", kind: "toggle", bind: "obj:locked", display: "Off" },
          { key: "silkColor", label: "Silk Screen Color", kind: "color", bind: "prop:silkColor", display: "#FFFFFF" },
        ],
      },
      {
        title: "Basic Properties",
        fields: [
          { key: "name", label: "Name", kind: "text", bind: "obj:comment", display: "—" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
          { key: "designator", label: "Designator", kind: "text", bind: "obj:text", display: "U?" },
          { key: "uniqueId", label: "Unique ID", kind: "readonly", display: "—" },
          { key: "devices", label: "Devices", kind: "readonly", display: "—" },
          { key: "footprint", label: "Footprint", kind: "text", bind: "obj:footprint", display: "—" },
          { key: "addBom", label: "Add into BOM", kind: "toggle", bind: "prop:addBom", display: "Yes" },
          { key: "model3d", label: "3d Model Title", kind: "text", bind: "prop:model3d", display: "—" },
        ],
      },
      {
        title: "Key Properties",
        fields: [
          { key: "manufacturer", label: "Manufacturer", kind: "text", bind: "prop:manufacturer", display: "—" },
          { key: "manufacturerPart", label: "Manufacturer Part", kind: "text", bind: "prop:manufacturerPart", display: "—" },
          { key: "supplier", label: "Supplier", kind: "text", bind: "prop:supplier", display: "—" },
          { key: "supplierPart", label: "Supplier Part", kind: "text", bind: "prop:supplierPart", display: "—" },
          { key: "value", label: "Value", kind: "text", bind: "prop:value", display: "—" },
        ],
      },
      { title: "More Properties", fields: [{ key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" }] },
    ],
  },
  Pad: {
    label: "Pad",
    icon: "tPad",
    sections: [
      {
        title: "Property",
        fields: [
          { key: "layer", label: "Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:layer" },
          { key: "number", label: "Number", kind: "text", bind: "prop:number", display: "1" },
          { key: "net", label: "Net", kind: "text", bind: "obj:net", display: "—" },
          { key: "netLength", label: "Net Length", kind: "readonly", unit: "mil", display: "0" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
        ],
      },
      {
        title: "Size",
        fields: [
          { key: "general", label: "General", kind: "toggle", bind: "prop:sizeGeneral", display: "On" },
          { key: "shape", label: "Shape", kind: "dropdown", options: PAD_SHAPES, bind: "obj:padShape", display: "Round" },
          { key: "width", label: "Width", kind: "number", unit: "mil", bind: "obj:width", display: "60" },
          { key: "height", label: "Height", kind: "number", unit: "mil", bind: "obj:height", display: "60" },
          { key: "cornerRadiusRatio", label: "Corner Radius Ratio", kind: "number", unit: "%", bind: "prop:cornerRadiusRatio", display: "0" },
        ],
      },
      {
        title: "Location",
        fields: [
          { key: "centerX", label: "Center X", kind: "coord", unit: "mil", bind: "obj:x" },
          { key: "centerY", label: "Center Y", kind: "coord", unit: "mil", bind: "obj:y" },
          { key: "rotation", label: "Rotation", kind: "number", unit: "°", bind: "obj:rotation", display: "0" },
          { key: "locked", label: "Locked", kind: "toggle", bind: "obj:locked", display: "Off" },
        ],
      },
      {
        title: "Solder / Paste Mask Expansion",
        fields: [
          { key: "expMode", label: "General", kind: "dropdown", options: EXP_MODES, bind: "prop:expMode", display: "General" },
          { key: "expCustom", label: "Custom", kind: "toggle", bind: "prop:expCustom", display: "Off" },
          { key: "solderMaskExp", label: "Solder Mask Expansion", kind: "number", unit: "mil", bind: "prop:solderMaskExp", display: "4" },
          { key: "pasteMaskExp", label: "Paste Mask Expansion", kind: "number", unit: "mil", bind: "prop:pasteMaskExp", display: "0" },
        ],
      },
      {
        title: "Thermal",
        fields: [
          { key: "thermalGeneral", label: "General", kind: "dropdown", options: EXP_MODES, bind: "prop:thermalGeneral", display: "General" },
          { key: "thermalCustom", label: "Custom", kind: "toggle", bind: "prop:thermalCustom", display: "Off" },
          { key: "padConnection", label: "Pad Connection", kind: "dropdown", options: ["Direct", "Thermal Relief", "None"], bind: "prop:padConnection", display: "Thermal Relief" },
        ],
      },
      {
        title: "Pin Delay",
        fields: [{ key: "pinLength", label: "Pin Length", kind: "number", unit: "mil", bind: "prop:pinLength", display: "0" }],
      },
    ],
  },
  Vias: {
    label: "Vias",
    icon: "tVia",
    sections: [
      {
        title: "Property",
        fields: [
          { key: "throughVia", label: "Through Via", kind: "toggle", bind: "prop:throughVia", display: "On" },
          { key: "blindBuried", label: "Blind Or buried Via", kind: "dropdown", options: VIA_KINDS, bind: "prop:blindBuried", display: "Through" },
          { key: "startLayer", label: "Start Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:startLayer" },
          { key: "endLayer", label: "End Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:endLayer" },
          { key: "net", label: "Net", kind: "text", bind: "obj:net", display: "—" },
          { key: "netLength", label: "Net Length", kind: "readonly", unit: "mil", display: "0" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
        ],
      },
      {
        title: "Via Diameter",
        fields: [
          { key: "outer", label: "Outside diameter", kind: "number", unit: "mil", bind: "obj:width", display: "24" },
          { key: "inner", label: "Inside Diameter", kind: "number", unit: "mil", bind: "obj:drill", display: "12" },
        ],
      },
      {
        title: "Location",
        fields: [
          { key: "centerX", label: "Center X", kind: "coord", unit: "mil", bind: "obj:x" },
          { key: "centerY", label: "Center Y", kind: "coord", unit: "mil", bind: "obj:y" },
          { key: "locked", label: "Locked", kind: "toggle", bind: "obj:locked", display: "Off" },
        ],
      },
      {
        title: "Solder / Paste Mask Expansion",
        fields: [
          { key: "expMode", label: "General", kind: "dropdown", options: EXP_MODES, bind: "prop:expMode", display: "General" },
          { key: "expCustom", label: "Custom", kind: "toggle", bind: "prop:expCustom", display: "Off" },
          { key: "solderMaskExp", label: "Solder Mask Expansion", kind: "number", unit: "mil", bind: "prop:solderMaskExp", display: "4" },
          { key: "pasteMaskExp", label: "Paste Mask Expansion", kind: "number", unit: "mil", bind: "prop:pasteMaskExp", display: "0" },
        ],
      },
      { title: "Combination", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  Track: {
    label: "Track",
    icon: "tTrack",
    sections: [
      {
        title: "Property",
        fields: [
          { key: "layer", label: "Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:layer" },
          { key: "lineWidth", label: "Line width", kind: "number", unit: "mil", bind: "obj:width", display: "10" },
          { key: "length", label: "Length", kind: "readonly", unit: "mil", display: "0" },
          { key: "net", label: "Net", kind: "text", bind: "obj:net", display: "—" },
          { key: "netLength", label: "Net Length", kind: "readonly", unit: "mil", display: "0" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
          { key: "locked", label: "Locked", kind: "toggle", bind: "obj:locked", display: "Off" },
        ],
      },
      { title: "Combination", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  "Outline Object": {
    label: "Outline Object",
    icon: "tBoardOutline",
    sections: [
      {
        title: "Property",
        fields: [
          { key: "type", label: "Type", kind: "dropdown", options: ["Rectangle", "Polygon", "Circle"], bind: "prop:type", display: "Rectangle" },
          { key: "layer", label: "Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:layer" },
          { key: "lineWidth", label: "Line width", kind: "number", unit: "mil", bind: "obj:width", display: "10" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
          { key: "locked", label: "Locked", kind: "toggle", bind: "obj:locked", display: "Off" },
        ],
      },
      {
        title: "Rectangle Outline",
        fields: [
          { key: "startX", label: "Start X", kind: "coord", unit: "mil", bind: "obj:x" },
          { key: "startY", label: "Start Y", kind: "coord", unit: "mil", bind: "obj:y" },
          { key: "width", label: "Width", kind: "number", unit: "mil", bind: "obj:width", display: "0" },
          { key: "height", label: "Height", kind: "number", unit: "mil", bind: "obj:height", display: "0" },
          { key: "cornerRadius", label: "Corner Radius", kind: "number", unit: "mil", bind: "prop:cornerRadius", display: "0" },
          { key: "rotation", label: "Rotation", kind: "number", unit: "°", bind: "obj:rotation", display: "0" },
        ],
      },
      { title: "Combination", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  "Copper Fills": {
    label: "Copper Fills",
    icon: "tPolygon",
    sections: [
      {
        title: "Property",
        fields: [
          { key: "layer", label: "Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:layer" },
          { key: "parent", label: "Parent", kind: "readonly", display: "—" },
          { key: "net", label: "Net", kind: "text", bind: "obj:net", display: "—" },
          { key: "rebuild", label: "Rebuilt Copper Region", kind: "action", display: "Rebuild" },
          { key: "sutureVias", label: "Place/Remove Suture Vias", kind: "action", display: "Apply" },
          { key: "convertFill", label: "Convert to Fill Region", kind: "action", display: "Convert" },
          { key: "solderMaskRegion", label: "Add Solder Mask Region", kind: "action", display: "Add" },
        ],
      },
    ],
  },
  Text: {
    label: "Text",
    icon: "pText",
    sections: [
      {
        title: "Property",
        fields: [
          { key: "content", label: "Content", kind: "text", bind: "obj:text", display: "Text" },
          { key: "layer", label: "Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:layer" },
          { key: "mirror", label: "Mirror", kind: "toggle", bind: "prop:mirror", display: "Off" },
        ],
      },
      {
        title: "Font Type",
        fields: [
          { key: "fontFamily", label: "Font Family", kind: "dropdown", options: ["Inter", "Arial", "Roboto", "Courier"], bind: "prop:fontFamily", display: "Inter" },
          { key: "strokeWidth", label: "Stroke Width", kind: "number", unit: "mil", bind: "prop:strokeWidth", display: "6" },
          { key: "height", label: "Height", kind: "number", unit: "mil", bind: "obj:height", display: "60" },
          { key: "inverted", label: "Inverted", kind: "toggle", bind: "prop:inverted", display: "Off" },
          { key: "invertedExpansion", label: "Inverted Expansion", kind: "number", unit: "mil", bind: "prop:invertedExpansion", display: "0" },
        ],
      },
      {
        title: "Location",
        fields: [
          { key: "centerX", label: "Center X", kind: "coord", unit: "mil", bind: "obj:x" },
          { key: "centerY", label: "Center Y", kind: "coord", unit: "mil", bind: "obj:y" },
          { key: "rotation", label: "Rotation", kind: "number", unit: "°", bind: "obj:rotation", display: "0" },
          { key: "locked", label: "Locked", kind: "toggle", bind: "obj:locked", display: "Off" },
          { key: "origin", label: "Origin", kind: "dropdown", options: ORIGINS, bind: "prop:origin", display: "Top Left" },
        ],
      },
      { title: "Combination", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
      { title: "Silk", fields: [{ key: "silkColor", label: "Silk Screen Color", kind: "color", bind: "prop:silkColor", display: "#FFFFFF" }] },
    ],
  },
};

export const INSPECTOR_SCHEMA: Record<"schematic" | "2d", Record<string, InspectorType>> = {
  schematic: SCHEMATIC,
  "2d": TWOD,
};

// Map a selected CanvasObject.kind (or the coarse state.selected token) to an
// InspectorType key. Mode decides which schema table is used.
const KIND_TO_TYPE: Record<string, string> = {
  // components
  component: "Component", resistor: "Component", capacitor: "Component",
  inductor: "Component", diode: "Component", ic: "Component", connector: "Component",
  // schematic electrical
  wire: "Wire", bus: "Wire",
  net: "Nets", netLabel: "Nets", netFlag: "Nets",
  pin: "Pin",
  // pcb primitives
  pad: "Pad", via: "Via", sutureVias: "Via",
  track: "Track", diffPair: "Track",
  boardOutline: "Outline Object", slot: "Outline Object",
  polygon: "Copper Fills", fillRegion: "Copper Fills",
  // drawing
  polyline: "DrawingLike", arc: "DrawingLike", circle: "DrawingLike",
  rectangle: "DrawingLike", bezier: "DrawingLike", ellipse: "DrawingLike",
  // text
  text: "Text",
};

// Vias key differs between resolver ("Via") and 2D schema ("Vias").
export function resolveInspectorType(
  mode: string,
  selectedKind: string | null,
  coarse: "none" | "comp" | "wire" | "pin",
): { schemaMode: "schematic" | "2d"; typeKey: string } {
  const schemaMode: "schematic" | "2d" = mode === "schematic" ? "schematic" : "2d";
  let typeKey = "Canvas";

  if (selectedKind) {
    const mapped = KIND_TO_TYPE[selectedKind];
    if (mapped === "DrawingLike") {
      typeKey = schemaMode === "schematic" ? "Drawing Tools" : "Outline Object";
    } else if (mapped === "Via") {
      typeKey = "Vias";
    } else if (mapped) {
      typeKey = mapped;
    }
  } else if (coarse === "comp") {
    typeKey = "Component";
  } else if (coarse === "wire") {
    typeKey = "Wire";
  } else if (coarse === "pin") {
    typeKey = "Pin";
  }

  const table = INSPECTOR_SCHEMA[schemaMode];
  if (!table[typeKey]) typeKey = "Canvas";
  return { schemaMode, typeKey };
}
