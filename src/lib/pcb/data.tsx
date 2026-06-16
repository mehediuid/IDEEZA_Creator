// @ts-nocheck
// IDEEZA PCB Software — data builders (menus, tree, context menu).
// Ported from the prototype. `iconEl(x)` is reduced to the raw SVG string `x`,
// which components render via <Icon html={...} />. Handlers route through the store.
import { ic } from "./icons";
import { C } from "./colors";
import type { PcbState } from "./types";
import type { PcbActions } from "./store";

export function buildMenus(state: PcbState, actions: PcbActions) {
  const mk = (label, k, ik, sub) => ({ label, k, ik, submenu: !!sub, sub: Array.isArray(sub) ? sub : null });
    const dv = { divider: true };
    const ck = (label, k) => ({ label, k, check: true });
    const data = {
      edit: { label: 'Edit', key: 'E', items: [ mk('Undo','Ctrl+Z','undo'), mk('Redo','Ctrl+Y','redo'), mk('Repeat(F4)','F4','blank'), mk('Copy(C)','Ctrl+C','copy'), mk('Cut (X)','Ctrl+X','cut'), mk('Paste(P)','Ctrl+P','paste'), mk('Delete','','del',[{label:'Selected',k:'Delete',action:'deleteObjects'},{label:'Objects',k:'',action:'deleteObjects'},{label:'All',k:'',action:'deleteObjects'}]), dv, mk('Snap','Alt+S','check'), mk('Select Objects','','blank',[{label:'All (A)',k:'Ctrl+A',ik:'blank'},{label:'Rectangle Inside (I)',k:'',ik:'rectIn'},{label:'Rectangle Outside (O)',k:'',ik:'rectOut'},{label:'Polygon Inside',k:'',ik:'polyIn'},{label:'Polygon Outside',k:'',ik:'polyOut'},{label:'Linde Touched (L)',k:'',ik:'lineT'},{divider:true},{label:'Toggle selection',k:'',ik:'toggleSel'}]), mk('Array Objects','','array'), mk('Find and Replace','Ctrl+F','find'), mk('Find Similar Objects (N)','Ctrl+Shift+F','findSim') ] },
      view: { label: 'View', key: 'V', items: [
        mk('Zoom In (I)','','zoomin'), mk('Zoom Out (O)','','zoomout'),
        mk('Fit All in Window (F)','K','fit'), mk('Fit Selection View (E)','','fitsel'), mk('Fit Area Selection View (A)','','fitarea'),
        mk('Full Screen','F11','fullscreen'), dv,
        mk('Unit','Q','blank',[{label:'mil',k:''},{label:'mm',k:''},{label:'inch',k:''}]),
        mk('Grid Size (G)','','blank',[{label:'5 mil',k:''},{label:'10 mil',k:''},{label:'25 mil',k:''},{label:'50 mil',k:''},{label:'100 mil',k:''}]),
        mk('Grid Type','','blank',[{label:'Grid',k:''},{label:'Dot',k:''},{label:'None',k:''}]), dv,
        mk('Highlight Net','','blank',[{label:'Highlight Net',k:'Shift+H',disabled:true},{label:'Unhighlight Net',k:'Shift+H',disabled:true},{label:'Highlight Net while Hovering Wire',k:''}]),
        ck('Top Toolbar',''), ck('Left-Side panel','['), ck('Right-Side Panel',']'), ck('Bottom-Side Panel','/'),
        mk('Window Arrangement (W)','','blank',[{label:'Default',k:''},{label:'Horizontal Split',k:''},{label:'Vertical Split',k:''},{label:'Grid View',k:''}]),
        ck('Floating Tool',''),
      ] },
      place: { label: 'Place', key: 'P', items: [
        mk('Device/ Reuse Block (P)','Shift+F','pChip'),
        mk('Shortcut Device (F)','','pChip',[{label:'Resistor',k:''},{label:'Capacitor',k:''},{label:'Inductor',k:''},{label:'Diode',k:''},{label:'Transistor',k:''}]),
        mk('Wire (W)','Alt+W','pWire'), mk('Bus (B)','Alt+B','pBus'), mk('Net Label (N)','Alt+N','pNetLabel'), mk('Short Flag (D)','','pShortFlag'),
        mk('Net Flag (O)','','pNetFlag',[{label:'VCC',k:'V'},{label:'+5V',k:''},{label:'-5V',k:''},{label:'GND',k:''},{label:'AGND',k:''},{label:'PGND',k:''}]),
        mk('Net Port (I)','','pPort',[{label:'Input',k:''},{label:'Output',k:''},{label:'Bidirectional',k:''},{label:'Passive',k:''}]),
        mk('No Connect Flag (C)','','pNoConnect'), mk('Test Point (T)','','pTestPoint'), mk('Component Mask','','blank'), mk('Reuse Block (S)','','pChip'), dv,
        mk('Polyline (L)','Alt+L','pPolyline'), mk('Arc (A)','Alt+A','pArc'), mk('Bezier (Z)','Alt+Z','pBezier'), mk('Circle (U)','Alt+C','pCircle'), mk('Elipse (E)','Alt+E','pEllipse'), mk('Rectangle (R)','Alt+R','pRect'), mk('Text (T)','Alt+T','pText'), mk('Image (G)','','pImage'), mk('Table','','pTable'),
      ] },
      design: { label: 'Design', key: 'D', items: [
        mk('Update/Conver Schematic to PCB','Alt+I','dConvert'),
        mk('JLCPCB Layout Service','','dLayout',[{label:'Auto Layout',k:''},{label:'Manual Layout',k:''},{label:'Order PCB Now',k:''}]),
        mk('Import Changes from PCB','','dImport'), dv,
        mk('Design Rule','','dRule'), mk('Check DRC','','dCheck'), mk('Annotate Designator','','dAnnotate'), dv,
        mk('Cross Probe','Shift+P','dCross'), mk('Placement Transfer','Ctrl+Shift+P','dTransfer'), dv,
        mk('Reset Component Unique ID','','dReset'),
      ] },
      layout: { label: 'Layout', key: 'L', items: [ mk('Align Left','','fit'), mk('Align Center','','fit'), dv, mk('Distribute Horizontally','','array'), mk('Distribute Vertically','','array'), dv, mk('Bring to Front',']','layer'), mk('Send to Back','[','layer') ] },
      tools: { label: 'Tools', key: 'T', items: [ mk('Design Rule Check','','rules'), mk('Electrical Rule Check','','rules'), dv, mk('Device Manager','','chip'), mk('Footprint Manager','','foot'), dv, mk('Measure Distance','','measure'), mk('Cross Probe','','wire'), mk('Auto Router','','convert') ] },
      export: { label: 'Export', key: 'R', items: [ mk('Export PDF','','pdf'), mk('Export Gerber','','gerber'), mk('Export BOM','','bom'), mk('Export Netlist','','bom'), mk('Export Image','','pdf'), dv, mk('Export Altium Designer','','imp'), mk('Export Kicad Designer','','imp'), mk('Export Eagle Designer','','imp') ] },
      import: { label: 'Import', key: 'M', items: [ mk('Import DXF','','imp'), mk('Import Schematic','','imp'), mk('Import Netlist','','imp'), mk('Import Library','','imp'), mk('Import Footprint','','imp'), dv, mk('Import Altium','','imp'), mk('Import Kicad','','imp') ] },
      setting: { label: 'Setting', key: 'I', items: [ mk('System Setting','','sys'), mk('Drawing Setting','','draw'), mk('Hotkey Setting','','key'), mk('Property Setting','','prop'), mk('Save Setting','','save') ] },
      help: { label: 'Help', key: 'H', items: [ mk('Documentation','','doc'), mk('Keyboard Shortcuts','','key'), mk('Community','','doc'), mk('About IDEEZA','','doc') ] },
    };
    const settingMap = { 'System Setting':'system','Drawing Setting':'drawing','Hotkey Setting':'hotkey','Property Setting':'property','Save Setting':'save' };
    return Object.keys(data).map(id => ({
      ...data[id], open: state.openMenu === id, toggle: () => actions.toggleMenu(id),
      items: data[id].items.map(it => {
        if (it.divider) return { divider: true };
        if (it.check) {
          const isBottom = it.label === 'Bottom-Side Panel';
          const on = isBottom ? state.bottomOpen : (state.viewTog[it.label] !== false);
          return { label: it.label, k: it.k, submenu: false, hasSub: false, icon: (on ? 'check' : ''), sub: [],
            onClick: () => isBottom ? actions.toggleBottom() : actions.toggleView(it.label) };
        }
        return {
          label: it.label, k: it.k, submenu: it.submenu, hasSub: !!it.sub, icon: (it.ik || ''),
          sub: (it.sub || []).map(su => su.divider ? { divider: true } : ({ label: su.label, k: su.k, fg: su.disabled ? 'var(--color-text-disabled)' : 'var(--color-text-primary)', icon: (su.ik || ''), onClick: () => su.action ? actions.openModal(su.action) : actions.closeAll() })),
          onClick: () => { if (it.sub) return;
            if (id === 'setting' && settingMap[it.label]) actions.openSettings(settingMap[it.label]);
            else if (id === 'import') { if (it.label === 'Import Altium') actions.openModal('importAltium'); else if (it.label === 'Import Kicad') actions.openModal('importKicad'); else actions.openModal('importDfx'); }
            else if (it.label === 'Device Manager') actions.openManager('device');
            else if (it.label === 'Footprint Manager') actions.openManager('footprint');
            else if (it.label === 'Export Altium Designer') actions.openModal('exportAltium');
            else if (it.label === 'Export Kicad Designer') actions.openModal('exportKicad');
            else if (it.label === 'Export Eagle Designer') actions.openModal('exportEagle');
            else if (it.label === 'Array Objects') actions.openModal('array');
            else if (it.label === 'Find and Replace') actions.openModal('findReplace');
            else if (it.label === 'Table') actions.openModal('tableProps');
            else if (it.label === 'Design Rule') actions.openModal('designRules');
            else if (it.label === 'Annotate Designator') actions.openModal('annotate');
            else if (it.label === 'Update/Conver Schematic to PCB') actions.setMode('pcb');
            else if (it.label === 'Check DRC' || it.label === 'Design Rule Check' || it.label === 'Electrical Rule Check') actions.clickBottomTab('drc');
            else actions.closeAll(); },
        };
      }),
    }));
}

// Nested tree node: [label, icon, { weight?, iconColor?, leaf? }, children?]
function walkTree(nodes, state, actions, depth = 0, rows = [], path = "") {
  const e = state.expanded;
  const sel = state.selectedTree;
  for (const n of nodes) {
    const [label, icon, opts = {}, children] = n;
    const key = path + "/" + label + "@" + depth; // unique-ish expand key
    const hasChildren = Array.isArray(children) && children.length > 0;
    const open = e[key] !== false; // default expanded
    rows.push({
      label, key, pad: (8 + depth * 16) + "px",
      hasCaret: hasChildren, caretRot: open ? "90deg" : "0deg",
      icon: icon || "sch", iconColor: opts.iconColor || C.gray,
      fg: sel === key ? C.primary : (opts.fg || C.text),
      weight: opts.weight || "500",
      bg: sel === key ? C.weak : "transparent",
      onClick: () => { if (hasChildren) actions.toggleExpandedKey(key); else actions.setSelectedTree(key); },
    });
    if (hasChildren && open) walkTree(children, state, actions, depth + 1, rows, key);
  }
  return rows;
}

const HDR = "H1 (HDR-M__2.54_2x, 1,p1.S..";
const PAGE_TREE = [
  ["Testing", "page", { weight: "600", iconColor: C.body }, [
    ["Board-1", "board", { weight: "600", iconColor: C.body }, [
      ["schematic 1", "sch", {}], ["PCB 1", "chip", {}], ["PCB 1_1", "chip", {}], ["PCB 4", "chip", {}],
    ]],
    ["Board-2", "board", { weight: "600", iconColor: C.body }, [
      ["schematic 1", "sch", {}], ["PCB 1", "chip", {}], ["PCB 1_1", "chip", {}], ["PCB 4", "chip", {}],
    ]],
  ]],
];
const NET_TREE = [
  ["Testing", "page", { weight: "600", iconColor: C.body }, [
    ["Board1", "board", { weight: "600", iconColor: C.body }, [
      ["Schematic- 1", "sch", {}, [
        ["$1N135 (2", "wire", {}, [["+5V", "power", {}, [["R1:2", "chip", {}], ["R1:2", "chip", {}], ["R1:2", "chip", {}]]]]],
      ]],
    ]],
    ["Board2", "board", { weight: "600", iconColor: C.body }, [
      ["Schematic- 2", "sch", {}, [
        ["$1N135 (2", "wire", {}, [["+5V", "power", {}, [["R1:2", "chip", {}], ["R1:2", "chip", {}], ["R1:2", "chip", {}]]]]],
      ]],
    ]],
  ]],
];
// The component list rendered identically across all Component sub-tabs — the
// only difference between Designator/Name/Device/Footprint is the grouping row
// the rows sit under (per Figma 433:237781/239485/241199/242918).
const HDR_ROWS = [
  [HDR, "chip", {}, [[HDR, "chip", {}], [HDR, "chip", {}]]],
  [HDR, "chip", {}, [["H1 (HDR-M__2.54_2x, 1,p1.Schetict", "chip", {}]]],
  [HDR, "chip", {}], [HDR, "chip", {}], [HDR, "chip", {}], [HDR, "chip", {}], [HDR, "chip", {}],
];
// Designator: rows sit directly under "Schematic- 1" (no grouping row).
const COMP_TREE_DESIGNATOR = [
  ["Testing", "page", { weight: "600", iconColor: C.body }, [
    ["Board1", "board", { weight: "600", iconColor: C.body }, [
      ["Schematic- 1", "sch", {}, HDR_ROWS],
    ]],
  ]],
];
// Name / Device: rows grouped under a "None (10)" node inside "Schematic- 1".
const COMP_TREE_NAME = [
  ["Testing", "page", { weight: "600", iconColor: C.body }, [
    ["Board1", "board", { weight: "600", iconColor: C.body }, [
      ["Schematic- 1", "sch", {}, [["None (10)", "chip", { weight: "600" }, HDR_ROWS]]],
    ]],
  ]],
];
const COMP_TREE_DEVICE = COMP_TREE_NAME;
// Footprint: grouping row replaces the schematic node with "Schematic- (12)".
const COMP_TREE_FOOTPRINT = [
  ["Testing", "page", { weight: "600", iconColor: C.body }, [
    ["Board1", "board", { weight: "600", iconColor: C.body }, [
      ["Schematic- (12)", "sch", {}, HDR_ROWS],
    ]],
  ]],
];
const COMP_TREES = {
  designator: COMP_TREE_DESIGNATOR,
  name: COMP_TREE_NAME,
  device: COMP_TREE_DEVICE,
  footprint: COMP_TREE_FOOTPRINT,
};
const OBJECT_TREE = [
  ["Testing", "page", { weight: "600", iconColor: C.body }, [
    ["Board1", "board", { weight: "600", iconColor: C.body }, [
      ["Schematic- 1", "sch", {}, [
        ["1.P1", "chip", {}, [["Component (12)", "chip", {}, [["H:2", "sch", {}], ["L:1", "sch", {}], ["Q:1", "sch", {}]]]]],
      ]],
    ]],
    ["Board1", "board", { weight: "600", iconColor: C.body }, [
      ["Schematic- 1", "sch", {}, [
        ["1.P1", "chip", {}, [["Component (12)", "chip", {}, [["H:2", "sch", {}], ["L:1", "sch", {}], ["Q:1", "sch", {}]]]]],
      ]],
    ]],
  ]],
];

export function buildTree(state: PcbState, actions: PcbActions) {
  const tree =
    state.leftSub === "net" ? (state.netSub === "component" ? COMP_TREE_DESIGNATOR : NET_TREE) :
    state.leftSub === "component" ? (COMP_TREES[state.compSub] || COMP_TREE_DESIGNATOR) :
    state.leftSub === "object" ? OBJECT_TREE : PAGE_TREE;
  return walkTree(tree, state, actions);
}

// Sub-pills shown above the tree for the Net and Component tabs.
export function buildNetPills(state: PcbState, actions: PcbActions) {
  return ([["net", "Net"], ["component", "Component"]] as const).map(([k, l]) => ({
    label: l,
    active: state.netSub === k,
    onClick: () => actions.setNetSub(k),
  }));
}
export function buildCompPills(state: PcbState, actions: PcbActions) {
  return ([["designator", "Designator"], ["name", "Name"], ["device", "Device"], ["footprint", "Footprint"]] as const).map(([k, l]) => ({
    label: l,
    active: state.compSub === k,
    onClick: () => actions.setCompSub(k),
  }));
}

export function buildCtxItems() {
  return [
      { label: 'Cut', k: 'Ctrl+X', icon: 'cut' },
      { label: 'Copy', k: 'Ctrl+C', icon: 'copy' },
      { label: 'Paste', k: 'Ctrl+V', icon: 'paste' },
      { divider: true },
      { label: 'Duplicate', k: 'Ctrl+D', icon: 'dup' },
      { label: 'Rotate 90°', k: 'Space', icon: 'rot' },
      { label: 'Find Similar', k: '', icon: 'find' },
      { divider: true },
      { label: 'Properties', k: '', icon: 'prop' },
      { label: 'Delete', k: 'Del', icon: 'del' },
    ].map(i => i.divider ? i : ({ ...i, icon: (i.icon) }));
}

// ── Rail + tab builders (from the prototype's renderVals) ──────────────────
// `iconEl(x)` reduced to the raw SVG string `x` (rendered via <Icon html=.../>).

export function buildRail(state: PcbState) {
  const railDefs = [
    { key: 'pcb', label: 'PCB Design', icon: 'pcb' },
    { key: 'code', label: 'Code', icon: 'code' },
    { key: '3d', label: '3D Module', icon: 'cube' },
    { key: 'preview', label: 'Product Preview', icon: 'preview' },
    { key: 'brief', label: 'Add Brief', icon: 'brief', faded: true },
  ];
  return railDefs.map((r, i) => ({
    key: r.key,
    label: r.label,
    icon: r.icon,
    bg: i === 0 ? C.weak : 'transparent',
    fg: i === 0 ? C.primary : (r.faded ? 'var(--color-border-strong)' : C.body),
    opacity: r.faded ? 'var(--opacity-muted)' : '1',
    cursor: r.faded ? 'default' : 'pointer',
  }));
}

export function buildLeftTabs(state: PcbState, actions: PcbActions) {
  return ([['project', 'Project Design'], ['library', 'Library']] as const).map(([k, l]) => ({
    label: l,
    bg: state.leftMain === k ? '#fff' : 'transparent',
    fg: state.leftMain === k ? C.primary : 'var(--color-text-tertiary)',
    onClick: () => actions.setLeftMain(k),
  }));
}

export function buildSubTabs(state: PcbState, actions: PcbActions) {
  // 2D / 3D modes collapse the left panel to just the Page tree (Figma 433:251073/252704).
  const defs = state.mode === '2d' || state.mode === '3d'
    ? ([['page', 'Page']] as const)
    : ([['page', 'Page'], ['net', 'Net'], ['component', 'Component'], ['object', 'Object']] as const);
  return defs.map(([k, l]) => ({
    label: l,
    fg: state.leftSub === k ? C.text : 'var(--color-text-tertiary)',
    weight: state.leftSub === k ? '700' : '500',
    bd: state.leftSub === k ? C.primary : 'transparent',
    onClick: () => actions.setLeftSub(k),
  }));
}

export function buildModeTabs(state: PcbState, actions: PcbActions) {
  const modeDefs = state.mode === 'schematic'
    ? [['schematic', 'Schematic'], ['pcb', 'PCB']]
    : [['schematic', 'Schematic'], ['pcb', 'PCB'], ['2d', '2D'], ['3d', '3D']];
  return modeDefs.map(([k, l]) => ({
    label: l,
    bg: state.mode === k ? C.primary : 'transparent',
    fg: state.mode === k ? '#fff' : 'var(--color-text-secondary)',
    onClick: () => actions.setMode(k),
  }));
}

export function buildRightTabs(state: PcbState, actions: PcbActions) {
  // Schematic right panel exposes only Properties | Filter; Layer is a PCB-mode tab.
  const tabs = state.mode === 'schematic'
    ? ([['properties', 'Properties'], ['filter', 'Filter']] as const)
    : ([['properties', 'Properties'], ['filter', 'Filter'], ['layer', 'Layer']] as const);
  return tabs.map(([k, l]) => ({
    label: l,
    fg: state.rightTab === k ? C.text : 'var(--color-text-tertiary)',
    weight: state.rightTab === k ? '700' : '500',
    bd: state.rightTab === k ? C.primary : 'transparent',
    onClick: () => actions.setRightTab(k),
  }));
}

const BOTTOM_DEFS = [
  ['logs', 'Logs', 'logs'],
  ['device', 'Device Standardization', 'device'],
  ['drc', 'DRC', 'drc'],
  ['result', 'Final Result', 'result'],
] as const;

export function buildBottomTabs(state: PcbState, actions: PcbActions) {
  const active = (k: string) => state.bottomOpen && state.bottomTab === k;
  return BOTTOM_DEFS.map(([k, l, icon]) => ({
    label: l,
    icon,
    bg: active(k) ? C.weak : 'transparent',
    fg: active(k) ? C.primary : 'var(--color-text-secondary)',
    weight: active(k) ? '600' : '500',
    onClick: () => actions.clickBottomTab(k),
  }));
}

export function bottomTitle(state: PcbState) {
  return (BOTTOM_DEFS.find((d) => d[0] === state.bottomTab) || ['', 'Logs'])[1];
}

const SET_NAV_DEFS = [
  ['system', 'System Setting', 'sys'],
  ['drawing', 'Drawing Setting', 'draw'],
  ['hotkey', 'Hotkey Setting', 'key'],
  ['property', 'Property Setting', 'prop'],
  ['save', 'Save Setting', 'save'],
  ['font', 'Common Fonts', 'font'],
  ['footprint', 'PCB Footprint', 'foot'],
  ['panel', 'Panel Lib', 'panel'],
  ['symbol', 'Schematic Symbol', 'symbol'],
  ['toptools', 'Top Tools Bar', 'chip'],
] as const;

export function buildSettingsNav(state: PcbState, actions: PcbActions) {
  return SET_NAV_DEFS.map(([k, l, icon]) => ({
    label: l,
    icon,
    bg: state.settingsPage === k ? C.weak : 'transparent',
    fg: state.settingsPage === k ? C.primary : C.body,
    weight: state.settingsPage === k ? '700' : '500',
    onClick: () => actions.setSettingsPage(k),
  }));
}

export function settingsTitle(state: PcbState) {
  return (SET_NAV_DEFS.find((d) => d[0] === state.settingsPage) || ['', 'Settings'])[1];
}
