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
  | "readonly"
  | "checkText"
  | "checkDropdown"
  | "dropdownGear"
  | "slider"
  | "radio"
  | "origin"
  | "netRef"
  | "textarea";

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
  // Conditional visibility: render this field only when the selected object's
  // props[prop] equals the given value (e.g. mask-expansion fields appear
  // only when the General/Custom radio is set to "Custom", per the doc).
  showIf?: { prop: string; equals: string };
  // Live computed read-only value (doc: "live segment length" / "total
  // length of the whole net") — derived from the selection, never edited.
  computed?: "segmentLength" | "netLength";
  // Doc §09: the Silk group only appears when the object's layer is a
  // silkscreen layer.
  showIfSilkLayer?: boolean;
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
const EXP_MODES = ["General", "Custom"];

// ═══════════════════════ SCHEMATIC (7 types) ═══════════════════════
const SCHEMATIC: Record<string, InspectorType> = {
  Canvas: {
    label: "Canvas",
    icon: "board",
    sections: [
      {
        title: "General",
        fields: [
          { key: "name", label: "Name", kind: "text", bind: "doc:name", display: "P1" },
          { key: "drawing", label: "Drawing", kind: "dropdown", options: ["Right Bottom", "Left Top", "Center"], display: "Right Bottom" },
        ],
      },
      {
        title: "Sheet border",
        fields: [
          { key: "border", label: "Border", kind: "toggle", display: "On" },
          { key: "titleBlockPos", label: "Sheet info position", kind: "dropdown", options: ["Right Bottom", "Left Bottom", "Right Top"], display: "Right Bottom" },
          { key: "size", label: "Size", kind: "dropdown", options: ["A0", "A1", "A2", "A3", "A4"], display: "A4" },
          { key: "drawingWidth", label: "Sheet width", kind: "number", unit: "in", display: "16.5" },
          { key: "drawingHeight", label: "Sheet height", kind: "number", unit: "in", display: "11.7" },
          { key: "regionStart", label: "Zone origin", kind: "dropdown", options: ["Left Top", "Left Bottom"], display: "Left Top" },
          { key: "xRegionCount", label: "X zones", kind: "number", display: "7" },
          { key: "yRegionCount", label: "Y zones", kind: "number", display: "6" },
          { key: "bladeWidth", label: "Tick width", kind: "number", unit: "mm", display: "0" },
          { key: "color", label: "Color", kind: "color", display: "#1E1E1E" },
        ],
      },
      {
        title: "Sheet info",
        fields: [
          { key: "titleBlockShow", label: "Show", kind: "toggle", display: "Visible" },
          { key: "createDate", label: "Created", kind: "readonly", display: "—" },
          { key: "createTime", label: "Created (time)", kind: "readonly", display: "—" },
          { key: "pageCount", label: "Sheet count", kind: "readonly", display: "1" },
          { key: "pageName", label: "Sheet name", kind: "text", display: "P1" },
          { key: "pageNo", label: "Sheet no", kind: "text", display: "01" },
          { key: "projectName", label: "Project Name", kind: "readonly", display: "—" },
          { key: "boardName", label: "Board Name", kind: "readonly", display: "—" },
          { key: "schematicName", label: "Schematic Name", kind: "readonly", display: "Schematic 1" },
          { key: "updateDate", label: "Modified", kind: "readonly", display: "—" },
          { key: "updateTime", label: "Modified (time)", kind: "readonly", display: "—" },
          { key: "company", label: "Company", kind: "text", display: "IDEEZA" },
          { key: "pageSize", label: "Sheet size", kind: "dropdown", options: ["A0", "A1", "A2", "A3", "A4"], display: "A4" },
          { key: "reviewed", label: "Reviewed by", kind: "text", display: "-" },
          { key: "drawn", label: "Drawn by", kind: "text", display: "-" },
          { key: "partNumber", label: "Part Number", kind: "text", display: "-" },
          { key: "version", label: "Version", kind: "text", display: "-" },
          { key: "description", label: "Description", kind: "text", display: "-" },
          { key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" },
        ],
      },
    ],
  },
  Component: {
    label: "Component",
    icon: "pChip",
    sections: [
      {
        title: "General",
        fields: [
          { key: "name", label: "Name", kind: "text", bind: "obj:comment", display: "—" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
          { key: "designator", label: "Reference (R1)", kind: "text", bind: "obj:text", display: "U?" },
          { key: "devices", label: "Symbol", kind: "readonly", display: "—" },
          { key: "footprint", label: "Footprint", kind: "text", bind: "obj:footprint", display: "—" },
          { key: "addBom", label: "Include in BOM", kind: "toggle", bind: "prop:addBom", display: "Yes" },
          { key: "convertPcb", label: "Send to PCB", kind: "action", display: "Convert" },
          { key: "pcbLayer", label: "PCB Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:layer" },
        ],
      },
      {
        title: "Part details",
        fields: [
          { key: "value", label: "Value", kind: "text", bind: "prop:value", display: "0Ω" },
          { key: "manufacturer", label: "Manufacturer", kind: "text", bind: "prop:manufacturer", display: "—" },
          { key: "manufacturerPart", label: "Mfr part no.", kind: "text", bind: "prop:manufacturerPart", display: "—" },
          { key: "supplier", label: "Supplier", kind: "text", bind: "prop:supplier", display: "—" },
          { key: "supplierPart", label: "Supplier Part", kind: "text", bind: "prop:supplierPart", display: "—" },
        ],
      },
      { title: "Advanced", fields: [
        { key: "lcscPart", label: "LCSC Part Name", kind: "text", bind: "prop:lcscPart", display: "—" },
        { key: "supplierFootprint", label: "Supplier Footprint", kind: "text", bind: "prop:supplierFootprint", display: "—" },
        { key: "jlcpcbClass", label: "JLCPCB Part Class", kind: "text", bind: "prop:jlcpcbClass", display: "—" },
        { key: "datasheet", label: "Datasheet", kind: "text", bind: "prop:datasheet", display: "—" },
        { key: "description", label: "Description", kind: "text", bind: "prop:description", display: "—" },
        { key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" },
      ] },
      { title: "Reusable block", fields: [
        { key: "reuseBlock", label: "Reuse Block", kind: "readonly", display: "—" },
        { key: "groupId", label: "Group ID", kind: "text", bind: "prop:groupId", display: "—" },
        { key: "channelId", label: "Channel ID", kind: "text", bind: "prop:channelId", display: "—" },
      ] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  Pin: {
    label: "Pin",
    icon: "pNetLabel",
    sections: [
      {
        title: "General",
        fields: [
          { key: "pinName", label: "Pin Name", kind: "text", bind: "prop:pinName", display: "—" },
          { key: "pinNumber", label: "Pin Number", kind: "text", bind: "prop:pinNumber", display: "1" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
          { key: "pinType", label: "Pin Type", kind: "dropdown", options: PIN_TYPES, bind: "prop:pinType", display: "Undefined" },
          { key: "pinShape", label: "Pin Shape", kind: "dropdown", options: PIN_SHAPES, bind: "prop:pinShape", display: "Line" },
          { key: "noConnectFlag", label: "No-connect", kind: "toggle", bind: "prop:noConnectFlag", display: "Off" },
        ],
      },
      { title: "Advanced", fields: [{ key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" }] },
    ],
  },
  Nets: {
    label: "Nets",
    icon: "wire",
    sections: [
      {
        title: "General",
        fields: [
          { key: "name", label: "Name", kind: "text", bind: "obj:net", display: "—" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
          { key: "relevance", label: "Applies to", kind: "readonly", display: "—" },
          { key: "device", label: "Symbol", kind: "readonly", display: "—" },
          { key: "type", label: "Type", kind: "dropdown", options: ["Signal", "Power", "Ground"], bind: "prop:type", display: "Signal" },
        ],
      },
      { title: "Advanced", fields: [{ key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" }] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  // PDF §03 — Net Flag (VCC / +5V / GND / AGND / PGND). Global Net Name is the
  // field that ties same-named flags together electrically across the project.
  "Net Flag": {
    label: "Net Flag",
    icon: "wire",
    sections: [
      {
        title: "General",
        fields: [
          { key: "name", label: "Name", kind: "text", bind: "obj:net", display: "GND" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
          { key: "relevance", label: "Applies to", kind: "readonly", display: "All" },
          { key: "device", label: "Symbol", kind: "readonly", display: "Ground-GND" },
          { key: "globalNetName", label: "Net name", kind: "text", bind: "prop:globalNetName", display: "GND" },
        ],
      },
      { title: "Advanced", fields: [
        { key: "description", label: "Description", kind: "text", bind: "prop:description", display: "—" },
        { key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" },
      ] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  // PDF §03 — Net Port (IN / OUT / BI). Off-Page Connector shares this field set.
  "Net Port": {
    label: "Net Port",
    icon: "wire",
    sections: [
      {
        title: "General",
        fields: [
          { key: "name", label: "Name", kind: "text", bind: "obj:net", display: "PORT" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
          { key: "relevance", label: "Applies to", kind: "readonly", display: "All" },
          { key: "device", label: "Symbol", kind: "readonly", display: "—" },
          { key: "type", label: "Direction", kind: "dropdown", options: ["In", "Out", "Bidirectional"], bind: "prop:portType", display: "In" },
        ],
      },
      { title: "Advanced", fields: [
        { key: "description", label: "Description", kind: "text", bind: "prop:description", display: "—" },
        { key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" },
      ] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  // PDF §03 — Short Flag (D). No Relevance / Type — Device + Description only.
  "Short Flag": {
    label: "Short Flag",
    icon: "wire",
    sections: [
      {
        title: "General",
        fields: [
          { key: "name", label: "Name", kind: "text", bind: "obj:net", display: "—" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
          { key: "device", label: "Symbol", kind: "readonly", display: "—" },
          { key: "description", label: "Description", kind: "text", bind: "prop:description", display: "—" },
        ],
      },
      { title: "Advanced", fields: [{ key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" }] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  // PDF §02 — Net Label (standalone). A text-like label, NOT a net-marker: it
  // carries Font / Style / Origin, not Relevance / Device.
  "Net Label": {
    label: "Net Label",
    icon: "pNetLabel",
    sections: [
      {
        title: "General",
        fields: [
          { key: "name", label: "Name", kind: "text", bind: "obj:net", display: "NET1" },
          { key: "fontColor", label: "Font Color", kind: "color", bind: "obj:color", display: "#0000FF" },
          { key: "font", label: "Font", kind: "dropdown", options: ["Inter", "Arial", "Roboto", "Courier"], bind: "prop:font", display: "Arial" },
          { key: "fontSize", label: "Font Size", kind: "number", unit: "px", bind: "prop:fontSize", display: "12" },
          { key: "style", label: "Style", kind: "dropdown", options: FONT_STYLES, bind: "prop:style", display: "Normal" },
          { key: "origin", label: "Anchor", kind: "dropdown", options: ORIGINS, bind: "prop:origin", display: "Center" },
        ],
      },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  // PDF §07 — Table, the richest object: three groups (Basic / Cell / Text).
  "Table": {
    label: "Table",
    icon: "pTable",
    sections: [
      {
        title: "Basic",
        fields: [
          { key: "tableWidth", label: "Width", kind: "number", unit: "in", bind: "prop:tableWidth", display: "0.4" },
          { key: "tableHeight", label: "Height", kind: "number", unit: "in", bind: "prop:tableHeight", display: "0.3" },
        ],
      },
      {
        title: "Cells",
        fields: [
          { key: "cellWidth", label: "Width", kind: "number", unit: "in", bind: "prop:cellWidth", display: "0.1" },
          { key: "cellHeight", label: "Height", kind: "number", unit: "in", bind: "prop:cellHeight", display: "0.1" },
          { key: "strokeColor", label: "Outline color", kind: "color", bind: "prop:strokeColor", display: "#A00000" },
          { key: "fillColor", label: "Fill Color", kind: "color", bind: "prop:fillColor", display: "#FFFFFF" },
          { key: "fill", label: "Fill", kind: "dropdown", options: ["Solid", "None"], bind: "prop:fill", display: "Solid" },
          { key: "lineWidth", label: "Line Width", kind: "number", unit: "mm", bind: "prop:lineWidth", display: "1" },
        ],
      },
      {
        title: "Text",
        fields: [
          { key: "text", label: "Text", kind: "textarea", bind: "obj:text", display: "—" },
          { key: "fontColor", label: "Font Color", kind: "color", bind: "obj:color", display: "#000000" },
          { key: "font", label: "Font", kind: "dropdown", options: ["Inter", "Arial", "Roboto", "Courier"], bind: "prop:font", display: "Arial" },
          { key: "fontSize", label: "Font Size", kind: "number", unit: "px", bind: "prop:fontSize", display: "12" },
          { key: "rowSpacing", label: "Row Spacing", kind: "dropdown", options: ["1.0", "1.2", "1.5", "2.0"], bind: "prop:rowSpacing", display: "1.2" },
          { key: "style", label: "Style", kind: "dropdown", options: FONT_STYLES, bind: "prop:style", display: "Normal" },
          { key: "hAlign", label: "Horizontal Align", kind: "dropdown", options: ["Left", "Center", "Right"], bind: "prop:hAlign", display: "Left" },
          { key: "vAlign", label: "Vertical Align", kind: "dropdown", options: ["Top", "Middle", "Bottom"], bind: "prop:vAlign", display: "Middle" },
        ],
      },
      { title: "Group", fields: [
        { key: "resetStyle", label: "Reset style", kind: "action", display: "Reset" },
        { key: "group", label: "Group", kind: "action", display: "Group" },
      ] },
    ],
  },
  // PDF §05 — Test Point is a full Component-type object in the schematic
  // (designator TP1, Device/Footprint "Test-Point"), not a PCB pad.
  "Test Point": {
    label: "Test Point",
    icon: "pChip",
    sections: [
      {
        title: "General",
        fields: [
          { key: "name", label: "Name", kind: "text", bind: "obj:comment", display: "—" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
          { key: "designator", label: "Reference (R1)", kind: "text", bind: "obj:text", display: "TP1" },
          { key: "footprint", label: "Part / footprint", kind: "text", bind: "obj:footprint", display: "Test-Point" },
          { key: "addBom", label: "Include in BOM", kind: "toggle", bind: "prop:addBom", display: "Yes" },
          { key: "convertPcb", label: "Send to PCB", kind: "action", display: "Convert" },
          { key: "pcbLayer", label: "PCB Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:layer" },
        ],
      },
      { title: "Advanced", fields: [
        { key: "description", label: "Description", kind: "text", bind: "prop:description", display: "Test Point" },
        { key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" },
      ] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  // PDF §02 — Bus (Alt+B): auto-named BUS[0:5], Line Width default 2.
  "Bus": {
    label: "Bus",
    icon: "tWire",
    sections: [
      { title: "General", fields: [
        { key: "name", label: "Name", kind: "text", bind: "obj:net", display: "BUS[0:5]" },
        { key: "id", label: "ID", kind: "readonly", display: "—" },
        { key: "color", label: "Color", kind: "color", bind: "obj:color", display: "#008800" },
        { key: "lineWidth", label: "Line Width", kind: "dropdown", options: ["1", "2", "3"], bind: "prop:lineWidth", display: "2" },
        { key: "lineStyle", label: "Line Style", kind: "dropdown", options: LINE_STYLES, bind: "prop:lineStyle", display: "Solid" },
      ] },
      { title: "Advanced", fields: [{ key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" }] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  // PDF §03 — Off-Page Connector (V): field-for-field identical to Net Port.
  "Off-Page Connector": {
    label: "Off-Page Connector",
    icon: "wire",
    sections: [
      { title: "General", fields: [
        { key: "name", label: "Name", kind: "text", bind: "obj:net", display: "—" },
        { key: "id", label: "ID", kind: "readonly", display: "—" },
        { key: "relevance", label: "Applies to", kind: "readonly", display: "All" },
        { key: "device", label: "Symbol", kind: "readonly", display: "Off-Page-Connector-In" },
        { key: "type", label: "Direction", kind: "dropdown", options: ["In", "Out", "Bidirectional"], bind: "prop:portType", display: "In" },
      ] },
      { title: "Advanced", fields: [
        { key: "description", label: "Description", kind: "text", bind: "prop:description", display: "—" },
        { key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" },
      ] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  // PDF §05 — Mask Region (Mask defaults Yes).
  "Mask Region": {
    label: "Mask Region",
    icon: "pPolyline",
    sections: [
      { title: "General", fields: [
        { key: "mask", label: "Mask", kind: "dropdown", options: ["Yes", "No"], bind: "prop:mask", display: "Yes" },
        { key: "id", label: "ID", kind: "readonly", display: "—" },
        { key: "maskWidth", label: "Width", kind: "number", unit: "in", bind: "prop:maskWidth", display: "0" },
        { key: "maskHeight", label: "Height", kind: "number", unit: "in", bind: "prop:maskHeight", display: "0" },
        { key: "lineWidth", label: "Line Width", kind: "number", unit: "mm", bind: "prop:lineWidth", display: "1" },
        { key: "lineStyle", label: "Line Style", kind: "dropdown", options: LINE_STYLES, bind: "prop:lineStyle", display: "Solid" },
        { key: "strokeColor", label: "Outline color", kind: "color", bind: "obj:color", display: "#000000" },
        { key: "fillColor", label: "Fill Color", kind: "color", bind: "prop:fillColor", display: "#FFFFFF" },
      ] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  // PDF §05 — Component Mask: identical to Mask Region, Mask defaults No.
  "Component Mask": {
    label: "Component Mask",
    icon: "pPolyline",
    sections: [
      { title: "General", fields: [
        { key: "mask", label: "Mask", kind: "dropdown", options: ["Yes", "No"], bind: "prop:mask", display: "No" },
        { key: "id", label: "ID", kind: "readonly", display: "—" },
        { key: "maskWidth", label: "Width", kind: "number", unit: "in", bind: "prop:maskWidth", display: "0" },
        { key: "maskHeight", label: "Height", kind: "number", unit: "in", bind: "prop:maskHeight", display: "0" },
        { key: "lineWidth", label: "Line Width", kind: "number", unit: "mm", bind: "prop:lineWidth", display: "1" },
        { key: "lineStyle", label: "Line Style", kind: "dropdown", options: LINE_STYLES, bind: "prop:lineStyle", display: "Solid" },
        { key: "strokeColor", label: "Outline color", kind: "color", bind: "obj:color", display: "#000000" },
        { key: "fillColor", label: "Fill Color", kind: "color", bind: "prop:fillColor", display: "#FFFFFF" },
      ] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  // PDF §08 — Differential Pairs Flag (F): lightweight annotation.
  "Differential Pairs Flag": {
    label: "Differential Pairs Flag",
    icon: "wire",
    sections: [
      { title: "General", fields: [
        { key: "name", label: "Name", kind: "text", bind: "obj:net", display: "—" },
        { key: "id", label: "ID", kind: "readonly", display: "—" },
        { key: "color", label: "Color", kind: "color", bind: "obj:color", display: "#A00000" },
      ] },
      { title: "Advanced", fields: [
        { key: "description", label: "Description", kind: "text", bind: "prop:description", display: "—" },
        { key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" },
      ] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  // PDF §10 — Junction Flag: connection dot, minimal (constraint-only).
  "Junction": {
    label: "Junction",
    icon: "pNetLabel",
    sections: [
      { title: "General", fields: [
        { key: "name", label: "Name", kind: "text", bind: "obj:net", display: "—" },
        { key: "id", label: "ID", kind: "readonly", display: "—" },
      ] },
    ],
  },
  // PDF §04/§10 — Reuse Block instance (needs a saved block asset).
  "Reuse Block": {
    label: "Reuse Block",
    icon: "pChip",
    sections: [
      { title: "General", fields: [
        { key: "name", label: "Name", kind: "text", bind: "obj:comment", display: "—" },
        { key: "id", label: "ID", kind: "readonly", display: "—" },
        { key: "groupId", label: "Group ID", kind: "text", bind: "prop:groupId", display: "—" },
        { key: "channelId", label: "Channel ID", kind: "text", bind: "prop:channelId", display: "—" },
      ] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  // PDF §10 — Image: print-layer only, minimal panel.
  "Image": {
    label: "Image",
    icon: "pImage",
    sections: [
      { title: "General", fields: [
        { key: "id", label: "ID", kind: "readonly", display: "—" },
        { key: "imgWidth", label: "Width", kind: "number", unit: "in", bind: "prop:imgWidth", display: "1" },
        { key: "imgHeight", label: "Height", kind: "number", unit: "in", bind: "prop:imgHeight", display: "1" },
      ] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  // PDF §02 — Net / Bus Label (attached child): distinguished by read-only Parent.
  "Attached Net Label": {
    label: "Net / Bus Label",
    icon: "pNetLabel",
    sections: [
      { title: "General", fields: [
        { key: "globalNetName", label: "Net name", kind: "textarea", bind: "obj:net", display: "—" },
        { key: "parent", label: "Parent", kind: "readonly", display: "—" },
        { key: "fontColor", label: "Font Color", kind: "color", bind: "obj:color", display: "#0000FF" },
        { key: "font", label: "Font", kind: "dropdown", options: ["Inter", "Arial", "Roboto", "Courier"], bind: "prop:font", display: "Arial" },
        { key: "fontSize", label: "Font Size", kind: "number", unit: "px", bind: "prop:fontSize", display: "12" },
        { key: "style", label: "Style", kind: "dropdown", options: FONT_STYLES, bind: "prop:style", display: "Normal" },
        { key: "origin", label: "Anchor", kind: "dropdown", options: ORIGINS, bind: "prop:origin", display: "Center" },
        { key: "resetStyle", label: "Reset style", kind: "action", display: "Reset" },
      ] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  "Drawing Tools": {
    label: "Drawing Tools",
    icon: "pPolyline",
    sections: [
      {
        title: "General",
        fields: [
          { key: "lineWidth", label: "Line Width", kind: "number", unit: "mm", bind: "obj:width", display: "0.15" },
          { key: "lineStyle", label: "Line Style", kind: "dropdown", options: LINE_STYLES, bind: "prop:lineStyle", display: "Solid" },
          { key: "strokeColor", label: "Outline color", kind: "color", bind: "obj:color", display: "#1E1E1E" },
          { key: "fillColor", label: "Fill Color", kind: "color", bind: "prop:fillColor", display: "#FFFFFF" },
          { key: "fillColor2", label: "Fill Color", kind: "color", bind: "prop:fillColor2", display: "#FFFFFF" },
          { key: "roundRadius", label: "Corner radius", kind: "number", unit: "mm", bind: "prop:roundRadius", display: "0" },
          { key: "rectWidth", label: "Width (Rectangle)", kind: "number", unit: "mm", bind: "prop:rectWidth", display: "0" },
          { key: "rectHeight", label: "Height (Rectangle)", kind: "number", unit: "mm", bind: "prop:rectHeight", display: "0" },
          { key: "circleRadius", label: "Radius (Circle)", kind: "number", unit: "mm", bind: "prop:circleRadius", display: "0" },
          { key: "xLocation", label: "X Location (Circle/Ellipse)", kind: "number", unit: "in", bind: "prop:xLocation", display: "0" },
          { key: "yLocation", label: "Y Location (Circle/Ellipse)", kind: "number", unit: "in", bind: "prop:yLocation", display: "0" },
          { key: "xRadius", label: "X Radius (Ellipse)", kind: "number", unit: "in", bind: "prop:xRadius", display: "0.15" },
          { key: "yRadius", label: "Y Radius (Ellipse)", kind: "number", unit: "in", bind: "prop:yRadius", display: "0.15" },
          { key: "resetStyle", label: "Reset style", kind: "action", display: "Reset" },
        ],
      },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  Text: {
    label: "Text",
    icon: "pText",
    sections: [
      {
        title: "General",
        fields: [
          { key: "text", label: "Text", kind: "text", bind: "obj:text", display: "Text" },
          { key: "fontColor", label: "Font Color", kind: "color", bind: "obj:color", display: "#1E1E1E" },
          { key: "font", label: "Font", kind: "dropdown", options: ["Inter", "Arial", "Roboto", "Courier"], bind: "prop:font", display: "Inter" },
          { key: "fontSize", label: "Font Size", kind: "number", unit: "px", bind: "prop:fontSize", display: "12" },
          { key: "style", label: "Style", kind: "dropdown", options: FONT_STYLES, bind: "prop:style", display: "Normal" },
          { key: "origin", label: "Anchor", kind: "dropdown", options: ORIGINS, bind: "prop:origin", display: "Top Left" },
          { key: "resetStyle", label: "Reset style", kind: "action", display: "Reset" },
        ],
      },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
    ],
  },
  Wire: {
    label: "Wire",
    icon: "tWire",
    sections: [
      {
        title: "General",
        fields: [
          { key: "name", label: "Name", kind: "text", bind: "obj:net", display: "—" },
          { key: "id", label: "ID", kind: "readonly", display: "—" },
          { key: "globalNetName", label: "Net name", kind: "text", bind: "prop:globalNetName", display: "—" },
          { key: "relevance", label: "Applies to", kind: "readonly", display: "—" },
          { key: "color", label: "Color", kind: "color", bind: "wire:color", display: "#1E1E1E" },
          { key: "lineWidth", label: "Line Width", kind: "dropdown", bind: "wire:lineWidth", options: ["Thin", "Medium", "Thick"], display: "Medium" },
          { key: "lineStyle", label: "Line Style", kind: "dropdown", bind: "wire:lineStyle", options: LINE_STYLES, display: "Solid" },
          { key: "resetStyle", label: "Reset style", kind: "action", display: "Reset" },
        ],
      },
      { title: "Advanced", fields: [{ key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" }] },
      { title: "Group", fields: [{ key: "group", label: "Group", kind: "action", display: "Group" }] },
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
        title: "General",
        fields: [
          { key: "name", label: "Name", kind: "checkText", bind: "obj:comment", display: "—" },
          { key: "id", label: "ID", kind: "readonly", bind: "obj:id", display: "—" },
          { key: "designator", label: "Reference (R1)", kind: "checkText", bind: "obj:text", display: "U?" },
          { key: "devices", label: "Symbol", kind: "readonly", display: "—" },
          { key: "footprint", label: "Footprint", kind: "checkText", bind: "obj:footprint", display: "—" },
          { key: "addBom", label: "Include in BOM", kind: "checkDropdown", options: ["Yes", "No"], bind: "prop:addBom", display: "Yes" },
          { key: "model3d", label: "3d Model Title", kind: "checkText", bind: "prop:model3d", display: "—" },
        ],
      },
      {
        title: "Part details",
        fields: [
          { key: "manufacturer", label: "Manufacturer", kind: "text", bind: "prop:manufacturer", display: "—" },
          { key: "manufacturerPart", label: "Mfr part no.", kind: "text", bind: "prop:manufacturerPart", display: "—" },
          { key: "supplier", label: "Supplier", kind: "text", bind: "prop:supplier", display: "—" },
          { key: "supplierPart", label: "Supplier Part", kind: "text", bind: "prop:supplierPart", display: "—" },
          { key: "value", label: "Value", kind: "checkText", bind: "prop:value", display: "—" },
        ],
      },
      {
        title: "Advanced",
        fields: [
          { key: "description", label: "Description", kind: "checkText", bind: "prop:description", display: "—" },
          { key: "supplierFootprint", label: "Supplier Footprint", kind: "checkText", bind: "prop:supplierFootprint", display: "—" },
          { key: "addProperty", label: "Add Property", kind: "dropdownGear", options: ["Add Property"], display: "+ Add" },
        ],
      },
      {
        title: "Combination / Reuse Block",
        fields: [
          { key: "group", label: "Group", kind: "dropdown", options: ["None"], bind: "prop:group", display: "None" },
          { key: "reuseBlock", label: "Reuse Block", kind: "dropdown", options: ["None"], bind: "prop:reuseBlock", display: "None" },
        ],
      },
    ],
  },
  Designator: {
    label: "Reference (R1)",
    icon: "pText",
    sections: [
      {
        title: "Property",
        fields: [
          { key: "propName", label: "Property Name", kind: "readonly", display: "Designator" },
          { key: "propValue", label: "Property Value", kind: "text", bind: "obj:text", display: "R?" },
          { key: "layer", label: "Layer", kind: "dropdown", optionsToken: "layers", bind: "prop:desig_layer" },
          { key: "mirror", label: "Mirror", kind: "dropdown", options: ["No", "Yes"], bind: "prop:desig_mirror", display: "No" },
        ],
      },
      {
        title: "Font Type",
        fields: [
          { key: "fontFamily", label: "Font Family", kind: "dropdown", options: ["default", "Inter", "Arial", "Roboto", "Courier"], bind: "prop:desig_font", display: "default" },
          { key: "strokeWidth", label: "Stroke Width", kind: "text", unit: "mil", bind: "prop:desig_stroke", display: "6" },
          { key: "height", label: "Height", kind: "text", unit: "mil", bind: "prop:desig_height", display: "45" },
          { key: "inverted", label: "Inverted", kind: "dropdown", options: ["No", "Yes"], bind: "prop:desig_inverted", display: "No" },
          { key: "invExp", label: "Inverted Expansion", kind: "text", unit: "mil", bind: "prop:desig_invexp", display: "0" },
        ],
      },
      {
        title: "Location",
        fields: [
          { key: "centerX", label: "Center X", kind: "coord", unit: "mil", bind: "prop:desig_x" },
          { key: "centerY", label: "Center Y", kind: "coord", unit: "mil", bind: "prop:desig_y" },
          { key: "rotation", label: "Rotation", kind: "text", unit: "°", bind: "prop:desig_rot", display: "0" },
          { key: "locked", label: "Locked", kind: "toggle", bind: "prop:desig_locked", display: "Off" },
          { key: "origin", label: "Anchor", kind: "origin", bind: "prop:desig_origin", display: "Top Left" },
        ],
      },
      {
        title: "Silk",
        fields: [
          { key: "silk", label: "Silk Screen Color", kind: "color", bind: "prop:desig_silk", display: "#FFFFFF" },
        ],
      },
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
          { key: "net", label: "Net", kind: "netRef", bind: "obj:net", display: "—" },
          { key: "netLength", label: "Net Length", kind: "readonly", unit: "mil", computed: "netLength", display: "0" },
          { key: "id", label: "ID", kind: "readonly", bind: "obj:id", display: "—" },
        ],
      },
      {
        title: "Size",
        fields: [
          { key: "general", label: "General", kind: "radio", options: ["General", "Custom"], bind: "prop:sizeGeneral", display: "On" },
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
          { key: "expMode", label: "General / Custom", kind: "radio", options: EXP_MODES, bind: "prop:expMode", display: "General" },
          // Doc §04: selecting Custom reveals the two expansion fields.
          { key: "solderMaskExp", label: "Solder Mask Expansion", kind: "number", unit: "mil", bind: "prop:solderMaskExp", display: "4", showIf: { prop: "expMode", equals: "Custom" } },
          { key: "pasteMaskExp", label: "Paste Mask Expansion", kind: "number", unit: "mil", bind: "prop:pasteMaskExp", display: "0", showIf: { prop: "expMode", equals: "Custom" } },
        ],
      },
      {
        title: "Thermal",
        fields: [
          { key: "thermalGeneral", label: "General / Custom", kind: "radio", options: EXP_MODES, bind: "prop:thermalGeneral", display: "General" },
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
          { key: "throughVia", label: "Through Via / Blind Or Buried Via", kind: "radio", options: ["Through Via", "Blind Or buried Via"], bind: "prop:throughVia", display: "Through Via" },
          { key: "startLayer", label: "Start Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:startLayer" },
          { key: "endLayer", label: "End Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:endLayer" },
          { key: "net", label: "Net", kind: "netRef", bind: "obj:net", display: "—" },
          { key: "netLength", label: "Net Length", kind: "readonly", unit: "mil", computed: "netLength", display: "0" },
          { key: "id", label: "ID", kind: "readonly", bind: "obj:id", display: "—" },
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
          { key: "expMode", label: "General / Custom", kind: "radio", options: EXP_MODES, bind: "prop:expMode", display: "General" },
          // Doc §05: Custom reveals TopLayer / BottomLayer solder-mask
          // expansion overrides (unlike Pad's Solder/Paste pair).
          { key: "topMaskExp", label: "Top Layer Expansion", kind: "number", unit: "mil", bind: "prop:topMaskExp", display: "4", showIf: { prop: "expMode", equals: "Custom" } },
          { key: "bottomMaskExp", label: "Bottom Layer Expansion", kind: "number", unit: "mil", bind: "prop:bottomMaskExp", display: "4", showIf: { prop: "expMode", equals: "Custom" } },
        ],
      },
      { title: "Combination", fields: [{ key: "group", label: "Group", kind: "dropdown", options: ["None"], bind: "prop:group", display: "None" }] },
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
          { key: "length", label: "Length", kind: "readonly", unit: "mil", computed: "segmentLength", display: "0" },
          { key: "net", label: "Net", kind: "netRef", bind: "obj:net", display: "—" },
          { key: "netLength", label: "Net Length", kind: "readonly", unit: "mil", computed: "netLength", display: "0" },
          { key: "id", label: "ID", kind: "readonly", bind: "obj:id", display: "—" },
          { key: "locked", label: "Locked", kind: "toggle", bind: "obj:locked", display: "Off" },
        ],
      },
      {
        title: "Path",
        fields: [
          { key: "startX", label: "Start X", kind: "coord", unit: "mil", bind: "obj:x" },
          { key: "startY", label: "Start Y", kind: "coord", unit: "mil", bind: "obj:y" },
          { key: "endX", label: "End X", kind: "coord", unit: "mil", bind: "obj:endX" },
          { key: "endY", label: "End Y", kind: "coord", unit: "mil", bind: "obj:endY" },
        ],
      },
      { title: "Combination", fields: [{ key: "group", label: "Group", kind: "dropdown", options: ["None"], bind: "prop:group", display: "None" }] },
    ],
  },
  "Outline Object": {
    label: "Outline Object",
    icon: "tBoardOutline",
    sections: [
      {
        title: "Property",
        fields: [
          { key: "type", label: "Type", kind: "dropdown", options: ["Board Outline"], bind: "prop:type", display: "Board Outline" },
          { key: "layer", label: "Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:layer" },
          // Stroke width — distinct from the geometry Width below (obj:width),
          // which previously shared the same bind and cross-edited.
          { key: "lineWidth", label: "Line width", kind: "number", unit: "mil", bind: "prop:lineWidth", display: "10" },
          { key: "id", label: "ID", kind: "readonly", bind: "obj:id", display: "—" },
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
      { title: "Combination", fields: [{ key: "group", label: "Group", kind: "dropdown", options: ["None"], bind: "prop:group", display: "None" }] },
    ],
  },
  "Copper Fills": {
    label: "Copper Fills",
    icon: "tPolygon",
    sections: [
      {
        title: "Property",
        fields: [
          { key: "type", label: "Type", kind: "dropdown", options: ["Copper Region"], bind: "prop:type", display: "Copper Region" },
          { key: "name", label: "Name", kind: "text", bind: "prop:name", display: "POUR1" },
          { key: "layer", label: "Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:layer" },
          { key: "net", label: "Net", kind: "netRef", bind: "obj:net", display: "—" },
          { key: "locked", label: "Locked", kind: "toggle", bind: "obj:locked", display: "Off" },
          { key: "id", label: "ID", kind: "readonly", bind: "obj:id", display: "—" },
          // Doc §08 live capture: "Convert to Fill Region" / "Add Solder Mask
          // Region" are NOT sidebar fields (likely context-menu actions) —
          // deliberately absent here.
        ],
      },
      {
        title: "Fill Setup",
        fields: [
          { key: "fillStyle", label: "Fill Style", kind: "dropdown", options: ["Solid", "Hatched", "None"], bind: "prop:fillStyle", display: "Solid" },
          { key: "keepIsland", label: "Keep Island", kind: "dropdown", options: ["No", "Yes"], bind: "prop:keepIsland", display: "No" },
          { key: "optimization", label: "Optimization", kind: "dropdown", options: ["Yes", "No"], bind: "prop:optimization", display: "Yes" },
          { key: "minOptWidth", label: "Minimum Optimized Width", kind: "number", unit: "mil", bind: "prop:minOptWidth", display: "8" },
          { key: "rebuild", label: "Rebuild Copper Region", kind: "action", display: "Rebuild" },
          { key: "sutureVias", label: "Place/Remove Suture Vias", kind: "action", display: "Apply" },
        ],
      },
      {
        title: "Rule Setting",
        fields: [
          { key: "ruleScope", label: "By Network / Custom", kind: "radio", options: ["By Network", "Custom"], bind: "prop:ruleScope", display: "By Network" },
          { key: "netSpacingRule", label: "Net Spacing Rule", kind: "text", bind: "prop:netSpacingRule", display: "—" },
          { key: "networkSpacing", label: "Network Spacing", kind: "number", unit: "mil", bind: "prop:networkSpacing", display: "10" },
        ],
      },
      {
        title: "Multi-layer Pad",
        fields: [
          { key: "mlPadConnection", label: "Pad Connection", kind: "dropdown", options: ["Spoke", "Direct", "None"], bind: "prop:mlPadConnection", display: "Spoke" },
          { key: "spokeSpacing", label: "Spoke Spacing", kind: "number", unit: "mil", bind: "prop:spokeSpacing", display: "10" },
          { key: "spokeWidth", label: "Spoke Width", kind: "number", unit: "mil", bind: "prop:spokeWidth", display: "10" },
          { key: "spokeAngles", label: "Spoke Angles", kind: "text", bind: "prop:spokeAngles", display: "90 Degrees" },
          { key: "trackConnection", label: "Track Connection", kind: "dropdown", options: ["Direct", "Spoke"], bind: "prop:trackConnection", display: "Direct" },
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
      {
        title: "Combination",
        fields: [{ key: "group", label: "Group", kind: "dropdown", options: ["None"], bind: "prop:group", display: "None" }],
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
          { key: "content", label: "Content", kind: "textarea", bind: "obj:text", display: "Text" },
          { key: "layer", label: "Layer", kind: "dropdown", optionsToken: "layers", bind: "obj:layer" },
          { key: "mirror", label: "Mirror", kind: "dropdown", options: ["No", "Yes"], bind: "prop:mirror", display: "No" },
        ],
      },
      {
        title: "Font Type",
        fields: [
          { key: "fontFamily", label: "Font Family", kind: "dropdown", options: ["default", "Inter", "Arial", "Roboto", "Courier"], bind: "prop:fontFamily", display: "default" },
          { key: "strokeWidth", label: "Stroke Width", kind: "number", unit: "mil", bind: "prop:strokeWidth", display: "8" },
          { key: "height", label: "Height", kind: "number", unit: "mil", bind: "obj:height", display: "120" },
          { key: "inverted", label: "Inverted", kind: "dropdown", options: ["No", "Yes"], bind: "prop:inverted", display: "No" },
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
          { key: "origin", label: "Anchor", kind: "origin", options: ORIGINS, bind: "prop:origin", display: "Top Left" },
        ],
      },
      { title: "Combination", fields: [{ key: "group", label: "Group", kind: "dropdown", options: ["None"], bind: "prop:group", display: "None" }] },
      // Doc §09: the Silk group only appears when Layer is a silkscreen layer.
      { title: "Silk", fields: [{ key: "silkColor", label: "Silk Screen Color", kind: "color", bind: "prop:silkColor", display: "#FFFFFF", showIfSilkLayer: true }] },
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
  // schematic sample symbols + converted PCB footprint glyphs are all components
  resistorBox: "Component", opamp: "Component", currentSource: "Component", crystal: "Component",
  fp0805: "Component", fpSOD123: "Component", fpSOT23: "Component", fpSOIC8: "Component",
  // schematic electrical
  wire: "Wire", bus: "Bus",
  net: "Nets", netLabel: "Net Label", netFlag: "Net Flag",
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
  // power flags → dedicated Net Flag panel (PDF §03); ports → Net Port.
  gnd: "Net Flag", vcc5v: "Net Flag", agnd: "Net Flag", pgnd: "Net Flag",
  shortFlag: "Short Flag", port: "Net Port",
  offPageConnector: "Off-Page Connector",
  netBusLabel: "Attached Net Label", busLabel: "Attached Net Label",
  diffPairFlag: "Differential Pairs Flag", diffFlag: "Differential Pairs Flag",
  maskRegion: "Mask Region", componentMask: "Component Mask",
  reuseBlock: "Reuse Block",
  junction: "Junction", noConnect: "Nets",
  // pcb regions → Copper Fills (region-style inspector)
  prohibitedRegion: "Copper Fills", constraintRegion: "Copper Fills",
  // mechanical / misc
  mountingHole: "Via", image: "DrawingLike",
  // PDF §10 place-menu inventory — panels pending doc capture; mapped to the
  // closest captured panel so selection never falls back to Canvas.
  testPoint: "Pad", shapedPad: "Pad", viaFence: "Via",
  fpcStiffener: "Copper Fills",
  table: "Table", stackTable: "Table", drillTable: "Table", canvasOrigin: "Text",
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
    if (selectedKind === "image" && schemaMode === "schematic") {
      // PDF §10: schematic Image has its own minimal panel (print-layer only).
      typeKey = "Image";
    } else if (mapped === "DrawingLike") {
      typeKey = schemaMode === "schematic" ? "Drawing Tools" : "Outline Object";
    } else if (mapped === "Via") {
      typeKey = "Vias";
    } else if (selectedKind === "testPoint" && schemaMode === "schematic") {
      // PDF §05: in the schematic a Test Point is a Component-type object, not a PCB pad.
      typeKey = "Test Point";
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
