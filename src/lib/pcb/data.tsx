// @ts-nocheck
// IDEEZA PCB Software — data builders (menus, tree, context menu).
// Ported from the prototype. `iconEl(x)` is reduced to the raw SVG string `x`,
// which components render via <Icon html={...} />. Handlers route through the store.
import { ic } from "./icons";
import { C } from "./colors";
import { exportKicadPcb, exportGerberViaKicad } from "./kicad-export";
import type { PcbState } from "./types";
import type { PcbActions } from "./store";

export function buildMenus(state: PcbState, actions: PcbActions) {
  const mk = (label, k, ik, sub) => ({ label, k, ik, submenu: !!sub, sub: Array.isArray(sub) ? sub : null });
    const dv = { divider: true };
    const ck = (label, k) => ({ label, k, check: true });
    const data = {
      edit: { label: 'Edit', key: 'E', items: [ mk('Undo','Ctrl+Z','undo'), mk('Redo','Ctrl+Y','redo'), mk('Repeat(F4)','F4','repeat'), mk('Copy(C)','Ctrl+C','copy'), mk('Cut (X)','Ctrl+X','cut'), mk('Paste(P)','Ctrl+P','paste'), mk('Delete','','del',[{label:'Selected',k:'Delete',ik:'del',action:'deleteObjects'},{label:'Objects',k:'',ik:'del',action:'deleteObjects'},{label:'All',k:'',ik:'del',action:'deleteObjects'}]), dv, mk('Snap','Alt+S','check'), mk('Select Objects','','toggleSel',[{label:'All (A)',k:'Ctrl+A',ik:'toggleSel'},{label:'Rectangle Inside (I)',k:'',ik:'rectIn'},{label:'Rectangle Outside (O)',k:'',ik:'rectOut'},{label:'Polygon Inside',k:'',ik:'polyIn'},{label:'Polygon Outside',k:'',ik:'polyOut'},{label:'Linde Touched (L)',k:'',ik:'lineT'},{divider:true},{label:'Toggle selection',k:'',ik:'toggleSel'}]), mk('Array Objects','','array'), mk('Find and Replace','Ctrl+F','find'), mk('Find Similar Objects (N)','Ctrl+Shift+F','findSim') ] },
      view: { label: 'View', key: 'V', items: [
        mk('Zoom In (I)','','zoomin'), mk('Zoom Out (O)','','zoomout'),
        mk('Fit All in Window (F)','K','fit'), mk('Fit Selection View (E)','','fitsel'), mk('Fit Area Selection View (A)','','fitarea'),
        mk('Full Screen','F11','fullscreen'), dv,
        mk('Unit','Q','ruler',[{label:'mil',k:''},{label:'mm',k:''},{label:'inch',k:''}]),
        mk('Grid Size (G)','','grid',[{label:'5 mil',k:''},{label:'10 mil',k:''},{label:'25 mil',k:''},{label:'50 mil',k:''},{label:'100 mil',k:''}]),
        mk('Grid Type','','tGridOptions',[{label:'Grid',k:''},{label:'Dot',k:''},{label:'None',k:''}]), dv,
        mk('Highlight Net','','wire',[{label:'Highlight Net',k:'Shift+H',ik:'wire',disabled:true},{label:'Unhighlight Net',k:'Shift+H',ik:'wire',disabled:true},{label:'Highlight Net while Hovering Wire',k:'',ik:'wire'}]),
        ck('Top Toolbar',''), ck('Left-Side panel','['), ck('Right-Side Panel',']'), ck('Bottom-Side Panel','/'),
        mk('Window Arrangement (W)','','window',[{label:'Default',k:'',ik:'window'},{label:'Horizontal Split',k:'',ik:'window'},{label:'Vertical Split',k:'',ik:'window'},{label:'Grid View',k:'',ik:'window'}]),
        ck('Floating Tool',''),
      ] },
      place: { label: 'Place', key: 'P', items: (state.mode === 'pcb' ? [
        // PCB-mode Place menu — PCB primitives (track/via/pad/etc).
        mk('Component / Footprint (C)','Alt+C','pChip'),
        mk('Track (T)','Alt+T','tTrack'),
        mk('Differential Pair (D)','Alt+D','tDiffPair'),
        mk('Via (V)','Alt+V','tVia'),
        mk('Suture Vias','','tSutureVias'),
        mk('Via Fence','','tVia'),
        mk('Pad (P)','Alt+P','tPad'),
        mk('Shaped Pad','','tPad'),
        mk('Test Point','','pTestPoint'),
        dv,
        mk('Copper Pour Polygon (G)','Alt+G','tPolygon'),
        mk('Filled Region','','tFillRegion'),
        mk('Board Outline','','tBoardOutline'),
        mk('Slot','','tSlot'),
        mk('FPC Stiffener','','tFillRegion'),
        mk('Cut-out','','del'),
        dv,
        mk('Dimension','','tDimension'),
        mk('Ruler','','ruler'),
        mk('Text (X)','Alt+X','pText'),
        mk('Image','','pImage'),
        mk('Table','','pTable'),
        mk('Stack Table','','pTable'),
        mk('Drill Table','','pTable'),
        mk('Canvas Origin','','ruler'),
        dv,
        mk('Length Tune','','tLengthTune'),
        mk('Auto Route','','tAutoRoute'),
        mk('Interactive Route','','convert'),
      ] : [
        mk('Device/ Reuse Block (P)','Shift+F','pChip'),
        mk('Shortcut Device (F)','','pChip',[{label:'Resistor',k:''},{label:'Capacitor',k:''},{label:'Inductor',k:''},{label:'Diode',k:''},{label:'Transistor',k:''}]),
        mk('Wire (W)','Alt+W','pWire'), mk('Bus (B)','Alt+B','pBus'), mk('Net Label (N)','Alt+N','pNetLabel'), mk('Short Flag (D)','','pShortFlag'),
        mk('Net Flag (O)','','pNetFlag',[{label:'VCC',k:'V'},{label:'+5V',k:''},{label:'-5V',k:''},{label:'GND',k:''},{label:'AGND',k:''},{label:'PGND',k:''}]),
        mk('Net Port (I)','','pPort',[{label:'Input',k:''},{label:'Output',k:''},{label:'Bidirectional',k:''},{label:'Passive',k:''}]),
        mk('No Connect Flag (C)','','pNoConnect'), mk('Test Point (T)','','pTestPoint'), mk('Component Mask','','blank'), mk('Reuse Block (S)','','pChip'), dv,
        mk('Polyline (L)','Alt+L','pPolyline'), mk('Arc (A)','Alt+A','pArc'), mk('Bezier (Z)','Alt+Z','pBezier'), mk('Circle (U)','Alt+C','pCircle'), mk('Elipse (E)','Alt+E','pEllipse'), mk('Rectangle (R)','Alt+R','pRect'), mk('Text (T)','Alt+T','pText'), mk('Image (G)','','pImage'), mk('Table','','pTable'),
      ]) },
      design: { label: 'Design', key: 'D', items: [
        mk('Update/Conver Schematic to PCB','Alt+I','dConvert'),
        mk('JLCPCB Layout Service','','dLayout',[{label:'Auto Layout',k:'',ik:'dLayout'},{label:'Manual Layout',k:'',ik:'dLayout'},{label:'Order PCB Now',k:'',ik:'dLayout'}]),
        mk('Import Changes from PCB','','dImport'), dv,
        mk('Design Rule','','dRule'), mk('Check DRC','','dCheck'), mk('Annotate Designator','','dAnnotate'), dv,
        mk('Cross Probe','Shift+P','dCross'), mk('Placement Transfer','Ctrl+Shift+P','dTransfer'), dv,
        mk('Reset Component Unique ID','','dReset'),
      ] },
      layout: { label: 'Layout', key: 'L', items: [ mk('Align Left','','alignLeft'), mk('Align Center','','alignHCenter'), dv, mk('Distribute Horizontally','','tDistH'), mk('Distribute Vertically','','tDistV'), dv, mk('Bring to Front',']','tBringFront'), mk('Send to Back','[','tSendBack') ] },
      tools: { label: 'Tools', key: 'T', items: (state.mode === 'pcb' ? [
        // PCB-mode Tools — Phase 3 manager modals.
        mk('Layer Manager','','layer'),
        mk('Net Class Manager','','wire'),
        mk('Differential Pair Manager','','tDiffPair'),
        mk('Equal Length Group Manager','','tLengthTune'),
        mk('Pad Pair Group Manager','','tPad'),
        mk('Copper Manager','','foot'),
        mk('Tear Drop','','del'),
        mk('IPC / DAC-2552 (PCB DRC)','','rules'),
        mk('Remove Unused Pad','','del'),
        dv,
        mk('Device Manager','','tDevMgr'),
        mk('Footprint Manager','','tFootMgr'),
        mk('Measure Distance','','measure'),
        mk('Auto Router','','tAutoRoute'),
      ] : [
        mk('Design Rule Check','','rules'),
        mk('Electrical Rule Check','','rules'),
        dv,
        mk('Device Manager','','tDevMgr'),
        mk('Footprint Manager','','tFootMgr'),
        dv,
        mk('Measure Distance','','measure'),
        mk('Cross Probe','','wire'),
        mk('Auto Router','','convert'),
      ]) },
      export: { label: 'Export', key: 'R', items: [ mk('Export PDF','','pdf'), mk('Export Gerber','','gerber'), mk('Export BOM','','bom'), mk('Export Netlist','','bom'), mk('Export Image','','pImage'), dv, mk('Export Altium Designer','','exp'), mk('Export Kicad Designer','','exp'), mk('Export Eagle Designer','','exp') ] },
      import: { label: 'Import', key: 'M', items: [ mk('Import DXF','','imp'), mk('Import Schematic','','imp'), mk('Import Netlist','','imp'), mk('Import Library','','imp'), mk('Import Footprint','','imp'), dv, mk('Import Altium','','imp'), mk('Import Kicad','','imp') ] },
      setting: { label: 'Setting', key: 'I', items: [ mk('System Setting','','sys'), mk('Drawing Setting','','draw'), mk('Hotkey Setting','','key'), mk('Property Setting','','prop'), mk('Save Setting','','save') ] },
      help: { label: 'Help', key: 'H', items: [ mk('Documentation','','doc'), mk('Keyboard Shortcuts','','key'), mk('Community','','community'), mk('About IDEEZA','','about') ] },
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
            // Real KiCad pipeline — generates an actual .kicad_pcb from the
            // canvas document; Gerber goes through /api/kicad (kicad-cli).
            else if (it.label === 'Export Kicad Designer') { exportKicadPcb(state, actions.flashToast); actions.closeAll(); }
            else if (it.label === 'Export Gerber') { exportGerberViaKicad(state, actions.flashToast); actions.closeAll(); }
            else if (it.label === 'Export Eagle Designer') actions.openModal('exportEagle');
            else if (it.label === 'Export Netlist') { actions.exportNetlist(); actions.closeAll(); }
            else if (it.label === 'Array Objects') actions.openModal('array');
            else if (it.label === 'Find and Replace') actions.openModal('findReplace');
            else if (it.label === 'Table') actions.openModal('tableProps');
            else if (it.label === 'Design Rule') actions.openModal('designRules');
            else if (it.label === 'Annotate Designator') actions.openModal('annotate');
            else if (id === 'place' && state.mode === 'pcb') {
              const placeToolMap = {
                'Component / Footprint (C)': 'component',
                'Track (T)': 'track',
                'Differential Pair (D)': 'diffPair',
                'Via (V)': 'via',
                'Suture Vias': 'sutureVias',
                'Pad (P)': 'pad',
                'Copper Pour Polygon (G)': 'polygon',
                'Filled Region': 'fillRegion',
                'Board Outline': 'boardOutline',
                'Slot': 'slot',
                'Dimension': 'dimension',
                'Length Tune': 'lengthTune',
                'Text (X)': 'text',
                // PDF §10 place-menu inventory
                'Test Point': 'testPoint',
                'Via Fence': 'viaFence',
                'Shaped Pad': 'shapedPad',
                'FPC Stiffener': 'fpcStiffener',
                'Stack Table': 'stackTable',
                'Drill Table': 'drillTable',
                'Canvas Origin': 'canvasOrigin',
                'Image': 'image',
              };
              if (placeToolMap[it.label]) actions.setTool(placeToolMap[it.label]);
              else actions.closeAll();
            }
            else if (it.label === 'Update/Conver Schematic to PCB') actions.setMode('pcb');
            else if (it.label === 'Electrical Rule Check') actions.runErcCheck();
            else if (it.label === 'Check DRC') actions.runDrcCheck();
            // Phase 3 — PCB-mode Tools menu → modals
            else if (it.label === 'Layer Manager') actions.openModal('layerManager');
            else if (it.label === 'Net Class Manager') actions.openModal('netClass');
            else if (it.label === 'Differential Pair Manager') actions.openModal('diffPair');
            else if (it.label === 'Equal Length Group Manager') actions.openModal('equalLength');
            else if (it.label === 'Pad Pair Group Manager') actions.openModal('padPair');
            else if (it.label === 'Copper Manager') actions.openModal('copper');
            else if (it.label === 'Tear Drop') actions.openModal('tearDrop');
            else if (it.label === 'IPC / DAC-2552 (PCB DRC)' || it.label === 'Design Rule Check') actions.openModal('pcbDrc');
            else if (it.label === 'Remove Unused Pad') actions.openModal('removeUnusedPad');
            else actions.closeAll(); },
        };
      }),
    }));
}

// Schematic-side menu bar — per the "In Schematic Side" spec sheet.
// Eight menus (File / Edit / View / Place / Design / Layout / Export / Setting);
// items marked "Remove" on the sheet (Board Shape, Reannotate, Convert to New
// Version, Insert BOM Table, Generate Data From Chatbot, Import Image) are
// intentionally absent. PCB mode keeps buildMenus untouched.
export function buildMenusSchematic(state: PcbState, actions: PcbActions) {
  const close = () => actions.closeAll();
  const noop = () => {};
  const dv = { divider: true };
  const su = (label, k = "", o = {}) => ({
    label,
    k,
    fg: o.disabled ? "var(--color-text-disabled)" : "var(--color-text-primary)",
    icon: o.icon || "blank",
    flagged: !!o.flagged,
    note: o.note,
    onClick: o.onClick || close,
  });
  const item = (label, o = {}) => ({
    label,
    k: o.k || "",
    submenu: !!o.sub,
    hasSub: !!o.sub,
    icon: o.icon || "blank",
    sub: o.sub || [],
    flagged: !!o.flagged,
    note: o.note,
    onClick: o.sub ? noop : o.onClick || close,
  });
  const check = (label, k = "", isBottom = false) => {
    const on = isBottom ? state.bottomOpen : state.viewTog[label] !== false;
    return {
      label,
      k,
      submenu: false,
      hasSub: false,
      icon: on ? "check" : "blank",
      sub: [],
      onClick: () => (isBottom ? actions.toggleBottom() : actions.toggleView(label)),
    };
  };
  const snapToggle = () => {
    const on = state.snapEnabled !== false;
    return {
      label: "Snap",
      k: "Alt+S",
      submenu: false,
      hasSub: false,
      icon: on ? "check" : "blank",
      sub: [],
      onClick: () => actions.toggleSnap(),
    };
  };
  const tool = (t) => () => actions.setTool(t);
  const toastSu = (label, msg) => su(label, "", { onClick: () => actions.flashToast(msg ?? `${label.replace(/…$/, "")} — coming soon`) });

  const data = [
    {
      id: "file",
      label: "File",
      key: "F",
      items: [
        // PDF Part 1: File ▸ New is a 17-item cascade on the schematic sheet.
        item("New", {
          k: "Ctrl+N",
          icon: "page",
          sub: [
            "Project", "Board", "Schematic", "Page", "PCB", "Panel",
            "Component…", "Footprint…", "3D Model…", "Sim Model…", "Drawing…",
            "Net Flag…", "Net Port…", "Off Page Connector…",
            "Non-Electronic Flag…", "Reuse Block…", "Panel Lib…",
          ].map((n) => su(n, "", { icon: "page", onClick: () => actions.flashToast(`New ${n.replace(/…$/, "")} created`) })),
        }),
        item("Load Sample Circuit", {
          icon: "page",
          onClick: () => {
            actions.loadSampleSchematic();
            actions.flashToast("Sample circuit loaded — current-sense amplifier");
            actions.closeAll();
          },
        }),
        item("Open Project", { k: "Ctrl+O", icon: "folder", onClick: () => actions.openModal("openProject") }),
        item("Save", { k: "Ctrl+S", icon: "save", onClick: () => actions.saveDoc() }),
        item("Save All", { k: "Ctrl+Shift+S", icon: "save", onClick: () => actions.saveDoc() }),
        dv,
        // PDF Part 1: per-format importer cascade.
        item("Import", {
          icon: "imp",
          sub: [
            su("DXF…", "", { icon: "imp", onClick: () => actions.openModal("importDfx") }),
            toastSu("Image…"),
            toastSu("EasyEDA (Standard)…"),
            toastSu("EasyEDA (Professional)…"),
            su("Altium Designer…", "", { icon: "imp", onClick: () => actions.openModal("importAltium") }),
            toastSu("Allegro/OrCad…"),
            toastSu("EAGLE…"),
            su("KiCad…", "", { icon: "imp", onClick: () => actions.openModal("importKicad") }),
            toastSu("PADS/PADS Pro…"),
            toastSu("Protel…"),
            toastSu("LTspice…"),
            toastSu("T/DISA 4001…"),
          ],
        }),
      ],
    },
    {
      id: "edit",
      label: "Edit",
      key: "E",
      items: [
        item("Undo", { k: "Ctrl+Z", icon: "undo", onClick: () => actions.undo() }),
        item("Redo", { k: "Ctrl+Y", icon: "redo", onClick: () => actions.redo() }),
        dv,
        item("Copy", { k: "Ctrl+C", icon: "copy", onClick: () => actions.copySelection() }),
        item("Cut", { k: "Ctrl+X", icon: "cut", onClick: () => actions.cutSelection() }),
        item("Paste", { k: "Ctrl+V", icon: "paste", onClick: () => actions.pasteClipboard() }),
        // PDF Parts 1–2: Delete is a cascade — Selected · Objects… · All.
        item("Delete", {
          k: "Del",
          icon: "del",
          sub: [
            su("Selected", "Del", { icon: "del", onClick: () => actions.deleteSelected() }),
            su("Objects…", "", { icon: "del", onClick: () => actions.openModal("deleteObjects") }),
            su("All", "", { icon: "del", onClick: () => { actions.merge({ objects: [] }); actions.flashToast("All objects deleted"); } }),
          ],
        }),
        dv,
        item("Move", {
          k: "M",
          icon: "move",
          sub: [
            su("Move by Center point", "", { icon: "move", onClick: () => { actions.setTool("move"); actions.flashToast("Move: anchor on center"); } }),
            su("Move by Origin point", "", { icon: "move", onClick: () => { actions.setTool("move"); actions.flashToast("Move: anchor on origin"); } }),
            su("Move by reference point", "", { icon: "move", onClick: () => { actions.setTool("move"); actions.flashToast("Move: pick reference"); } }),
          ],
        }),
        snapToggle(),
        item("Find & replace", { k: "Ctrl+F", icon: "find", onClick: () => actions.openModal("findReplace") }),
        item("Duplicate in grid", { icon: "array", onClick: () => actions.openModal("array") }),
      ],
    },
    {
      id: "view",
      label: "View",
      key: "V",
      items: [
        item("Zoom In (I)", { icon: "zoomin", onClick: () => actions.zoomIn() }),
        item("Zoom Out (O)", { icon: "zoomout", onClick: () => actions.zoomOut() }),
        item("Fit All in Window (F)", { k: "K", icon: "fit", onClick: () => actions.zoomFit() }),
        dv,
        // PDF Part 1: schematic units are inch · mm; grid presets in inch.
        item("Unit", {
          icon: "ruler",
          sub: ["Inch", "mm"].map((u) =>
            su(u === "Inch" ? "inch" : u, "", { icon: state.unit === u ? "check" : "blank", onClick: () => actions.setUnit(u) }),
          ),
        }),
        item("Grid Size (G)", {
          icon: "grid",
          sub: ["0.1", "0.05", "0.02", "0.01"].map((g) =>
            su(`${g} inch`, "", { icon: state.gridSize === g ? "check" : "blank", onClick: () => actions.setGridSize(g) }),
          ),
        }),
        item("Grid Type", {
          icon: "tGridOptions",
          sub: [
            su("Grid Dot", "", { onClick: () => actions.flashToast("Grid type: Grid Dot") }),
            su("Grid", "", { onClick: () => actions.flashToast("Grid type: Grid") }),
            su("None", "", { onClick: () => actions.flashToast("Grid type: None") }),
          ],
        }),
        item("Appearance", {
          icon: "appearance",
          sub: [
            su("Light Mode", "", { icon: "sun", onClick: () => actions.flashToast("Switch theme via Setting → System") }),
            su("Dark Mode", "", { icon: "moon", onClick: () => actions.flashToast("Switch theme via Setting → System") }),
            su("System Default", "", { icon: "sys", onClick: () => actions.flashToast("Switch theme via Setting → System") }),
            dv,
            su("Open Theme Settings…", "", { icon: "appearance", onClick: () => actions.openSettings("system") }),
          ],
        }),
        dv,
        check("Top Toolbar"),
        check("Left-Side panel", "["),
        check("Right-Side Panel", "]"),
        check("Bottom-Side Panel", "/", true),
      ],
    },
    {
      id: "place",
      label: "Place",
      key: "P",
      items: [
        item("Place a Part", { icon: "pChip", onClick: () => actions.openModal("devicePicker") }),
        item("Wire", { k: "Alt+W", icon: "pWire", onClick: tool("wire") }),
        item("Power & Ground", {
          icon: "pNetFlag",
          sub: [
            su("VCC", "V", { icon: "power", onClick: tool("netFlag") }),
            su("+5V", "", { icon: "power", onClick: tool("vcc5v") }),
            su("-5V", "", { icon: "power", onClick: tool("netFlag") }),
            su("GND", "", { icon: "power", onClick: tool("netFlag") }),
            su("Analog GND", "", { icon: "power", onClick: tool("agnd") }),
            su("Power GND", "", { icon: "power", onClick: tool("pgnd") }),
            dv,
            su("Port", "", { icon: "pNetLabel", onClick: tool("port") }),
            su("Off-sheet link", "", { icon: "pNetLabel", onClick: tool("offPageConnector") }),
            su("Short", "", { icon: "pNetLabel", onClick: tool("shortFlag") }),
          ],
        }),
        item("Bus", { k: "Alt+B", icon: "pBus", onClick: tool("bus") }),
        item("No-connect (Ã)", { icon: "pNoConnect", onClick: tool("noConnect") }),
        item("Junction", { icon: "pTestPoint", onClick: tool("junction") }),
        item("Differential Pair", { icon: "tDiffPair", onClick: tool("diffPair") }),
        item("Diff-pair tag", { icon: "tDiffPair", onClick: tool("diffPairFlag") }),
        item("Keep-out area", { icon: "pPolyline", onClick: tool("maskRegion") }),
        item("Part mask", { icon: "pPolyline", onClick: tool("componentMask") }),
        item("Reusable block", { icon: "pChip", onClick: tool("reuseBlock") }),
        dv,
        item("Polyline", { k: "Alt+L", icon: "pPolyline", onClick: tool("polyline") }),
        item("Arc", { k: "Alt+A", icon: "pArc", onClick: tool("arc") }),
        item("Bezier", { k: "Alt+Z", icon: "pBezier", onClick: tool("bezier") }),
        item("Circle", { k: "Alt+C", icon: "pCircle", onClick: tool("circle") }),
        item("Rectangle", { k: "Alt+R", icon: "pRect", onClick: tool("rectangle") }),
        item("Text", { k: "Alt+T", icon: "pText", onClick: tool("text") }),
        item("Image", { icon: "pImage", onClick: tool("image") }),
        item("Table", { icon: "pTable", onClick: () => actions.openModal("tableProps") }),
        // Final list: "Board Shape" is flagged Remove but kept in scope,
        // clearly marked — confirm with team before dropping.
        dv,
        item("Net Label", { k: "Alt+N", icon: "pNetLabel", onClick: tool("netLabel") }),
        item("Attached net label", { icon: "pNetLabel", onClick: tool("netBusLabel") }),
      ],
    },
    {
      id: "design",
      label: "Design",
      key: "D",
      items: [
        item("Generate PCB", { k: "Alt+I", icon: "dConvert", onClick: () => actions.convertSchematicToPcb() }),
        dv,
        item("Design rules", { icon: "dRule", onClick: () => actions.openModal("designRules") }),
        item("Run design check (DRC)", { icon: "dCheck", onClick: () => actions.runDrcCheck() }),
        item("Diff-pair manager", { icon: "dCross", onClick: () => actions.openModal("diffPair") }),
        dv,
        item("Import GLTF", { icon: "cube", onClick: () => actions.flashToast("Import GLTF — pick a file") }),
        item("Auto-number parts", { icon: "dAnnotate", onClick: () => actions.openModal("annotate") }),
        dv,
        // Final list: the items below are flagged Remove but kept in scope,
        // clearly marked (⚑) — confirm with team before dropping.
      ],
    },
    {
      id: "layout",
      label: "Layout",
      key: "L",
      items: [
        item("Group", { icon: "group", onClick: () => actions.groupSelection() }),
        item("Align", {
          icon: "align",
          sub: [
            su("Align Left", "", { icon: "alignLeft", onClick: () => actions.alignSelected("left") }),
            su("Align Right", "", { icon: "alignRight", onClick: () => actions.alignSelected("right") }),
            su("Align Top", "", { icon: "alignTop", onClick: () => actions.alignSelected("top") }),
            su("Align Bottom", "", { icon: "alignBottom", onClick: () => actions.alignSelected("bottom") }),
            su("Align Horizontal centers", "", { icon: "alignHCenter", onClick: () => actions.alignSelected("hcenter") }),
            su("Align Vertical Center", "", { icon: "alignVCenter", onClick: () => actions.alignSelected("vcenter") }),
          ],
        }),
        item("Distribute", {
          icon: "distribute",
          sub: [
            su("Distribute Horizontally", "", { icon: "distribute", onClick: () => actions.openModal("distribute") }),
            su("Distribute Vertically", "", { icon: "distributeV", onClick: () => actions.openModal("distribute") }),
          ],
        }),
        item("Rotate", {
          icon: "rot",
          sub: [
            su("Rotate Left", "", { icon: "tRotLeft", onClick: () => actions.rotateSelectedPlaced(-90) }),
            su("Rotate Right", "", { icon: "tRotRight", onClick: () => actions.rotateSelectedPlaced(90) }),
          ],
        }),
        item("Flip", {
          icon: "flip",
          sub: [
            su("Flip Horizontal", "", { icon: "flip", onClick: () => actions.flipSelectedH() }),
            su("Flip Vertical", "", { icon: "flipV", onClick: () => actions.flipSelectedV() }),
          ],
        }),
        item("Order", {
          icon: "layer",
          sub: [
            su("Bring to Front", "]", { icon: "tBringFront", onClick: () => actions.bringFront() }),
            su("Send to Back", "[", { icon: "tSendBack", onClick: () => actions.sendBack() }),
          ],
        }),
      ],
    },
    {
      id: "export",
      label: "Export",
      key: "R",
      items: [
        item("Netlist", { icon: "wire", onClick: () => actions.exportNetlist() }),
        item("BOM (Bill of Materials)", { icon: "bom", onClick: () => actions.openModal("exportBom") }),
        item("DXF", { icon: "exp", onClick: () => actions.openModal("exportDxf2D") }),
        item("PDF", { icon: "pdf", onClick: () => actions.openModal("exportPdf2D") }),
      ],
    },
    {
      id: "setting",
      label: "Setting",
      key: "I",
      items: [
        item("System", { icon: "sys", onClick: () => actions.openSettings("system") }),
        item("Schematic/Symbol", { icon: "symbol", onClick: () => actions.openSettings("symbol") }),
        item("PCB/Footprint", { icon: "foot", onClick: () => actions.openSettings("footprint") }),
        item("Panel", { icon: "panel", onClick: () => actions.openSettings("panel") }),
      ],
    },
    {
      id: "help",
      label: "Help",
      key: "H",
      items: [
        item("community", { icon: "community" }),
        item("Tutorials", { k: "F1", icon: "tutorial" }),
        item("Contact", { icon: "contact" }),
        item("Online chat", { icon: "chat" }),
        item("About..", { icon: "about" }),
        dv,
        item("Video Capture...", { icon: "video" }),
        item("Performance Diagnostic...", { icon: "diagnostic" }),
      ],
    },
  ];

  return data.map((m) => ({
    ...m,
    open: state.openMenu === m.id,
    toggle: () => actions.toggleMenu(m.id),
  }));
}

// 2D editor menu bar — per the "In 2D Side" spec sheets (File / Edit / View /
// Place / Design / Route / Layout / Export / Setting / Help). Items marked
// "Remove" on the detail sheet (Polygon Pour, Fill all Plane, per-item
// Align/Rotate/Level entries under Design, Altium/Kicad/Eagle exports) are
// intentionally absent.
export function buildMenus2D(state: PcbState, actions: PcbActions) {
  const close = () => actions.closeAll();
  const noop = () => {};
  const dv = { divider: true };
  // submenu leaf
  const su = (label, k = "", o = {}) => ({
    label,
    k,
    fg: o.disabled ? "var(--color-text-disabled)" : "var(--color-text-primary)",
    icon: o.icon || "blank",
    flagged: !!o.flagged,
    note: o.note,
    onClick: o.onClick || close,
  });
  // top-level item; pass `sub` for a hover flyout
  const item = (label, o = {}) => ({
    label,
    k: o.k || "",
    submenu: !!o.sub,
    hasSub: !!o.sub,
    icon: o.icon || "blank",
    sub: o.sub || [],
    flagged: !!o.flagged,
    note: o.note,
    onClick: o.sub ? noop : o.onClick || close,
  });
  // view toggle (checkmark reflects current panel visibility)
  const check = (label, k = "", isBottom = false) => {
    const on = isBottom ? state.bottomOpen : state.viewTog[label] !== false;
    return {
      label,
      k,
      submenu: false,
      hasSub: false,
      icon: on ? "check" : "blank",
      sub: [],
      onClick: () => (isBottom ? actions.toggleBottom() : actions.toggleView(label)),
    };
  };

  // Grid Size and Snap Size share an identical flyout in the source.
  const gridFlyout = [
    su("0.015,0.051mm | 2.0,2,mil"),
    su("0.015,0.051mm | 2.0,2,mil"),
    su("0.015,0.051mm | 2.0,2,mil"),
    su("0.015,0.051mm | 2.0,2,mil"),
    su("0.015,0.051mm | 2.0,2,mil", "", { icon: "check" }),
    dv,
    su("Grid/Snap keep Ratio", "", { icon: "check" }),
    su("Common Grid/Snap setting", "", { icon: "grid" }),
    su("Grid Range setting (Po...", "", { icon: "fitarea" }),
  ];

  // Snap toggle reflects current `snapEnabled` flag (Phase 6, IT-604).
  const snapToggle = () => {
    const on = state.snapEnabled !== false;
    return {
      label: "Snap",
      k: "Alt+S",
      submenu: false,
      hasSub: false,
      icon: on ? "check" : "blank",
      sub: [],
      onClick: () => actions.toggleSnap(),
    };
  };

  const data = [
    // Phase 6 — File menu (IT-590).
    {
      id: "file",
      label: "File",
      key: "F",
      items: [
        // PDF Part 2: 2D File ▸ New cascade (board-scoped item set).
        item("New", {
          k: "Ctrl+N",
          icon: "page",
          sub: ["Board", "PCB", "Footprint", "Panel", "Component…"].map((n) =>
            su(n, "", { icon: "page", onClick: () => actions.flashToast(`New ${n.replace(/…$/, "")} created`) }),
          ),
        }),
        item("Open Project", { k: "Ctrl+O", icon: "folder", onClick: () => actions.openModal("openProject") }),
        item("Save", { k: "Ctrl+S", icon: "save", onClick: () => actions.saveDoc() }),
        item("Save All", { k: "Ctrl+Shift+S", icon: "save", onClick: () => actions.saveDoc() }),
        dv,
        // PDF Part 2: per-format importer cascade (PCB formats).
        item("Import", {
          icon: "imp",
          sub: [
            su("DXF…", "", { icon: "imp", onClick: () => actions.openModal("importDfx") }),
            su("Image…", "", { onClick: () => actions.flashToast("Image — coming soon") }),
            su("Altium…", "", { icon: "imp", onClick: () => actions.openModal("importAltium") }),
            su("Allegro/OrCad…", "", { onClick: () => actions.flashToast("Allegro/OrCad — coming soon") }),
            su("EAGLE…", "", { onClick: () => actions.flashToast("EAGLE — coming soon") }),
            su("KiCad…", "", { icon: "imp", onClick: () => actions.openModal("importKicad") }),
            su("PADS…", "", { onClick: () => actions.flashToast("PADS — coming soon") }),
            su("Protel…", "", { onClick: () => actions.flashToast("Protel — coming soon") }),
          ],
        }),
      ],
    },
    // Phase 6 — Edit menu (IT-596).
    {
      id: "edit",
      label: "Edit",
      key: "E",
      items: [
        item("Undo", { k: "Ctrl+Z", icon: "undo", onClick: () => actions.undo() }),
        item("Redo", { k: "Ctrl+Y", icon: "redo", onClick: () => actions.redo() }),
        dv,
        item("Copy", { k: "Ctrl+C", icon: "copy", onClick: () => actions.copySelection() }),
        item("Cut", { k: "Ctrl+X", icon: "cut", onClick: () => actions.cutSelection() }),
        item("Paste", { k: "Ctrl+V", icon: "paste", onClick: () => actions.pasteClipboard() }),
        // PDF Parts 1–2: Delete is a cascade — Selected · Objects… · All.
        item("Delete", {
          k: "Del",
          icon: "del",
          sub: [
            su("Selected", "Del", { icon: "del", onClick: () => actions.deleteSelected() }),
            su("Objects…", "", { icon: "del", onClick: () => actions.openModal("deleteObjects") }),
            su("All", "", { icon: "del", onClick: () => { actions.merge({ objects: [] }); actions.flashToast("All objects deleted"); } }),
          ],
        }),
        dv,
        // Phase 8 — Move with sub-options (IT-534).
        item("Move", {
          k: "M",
          icon: "move",
          sub: [
            su("Move by Center point", "", { icon: "move", onClick: () => { actions.setTool("move"); actions.flashToast("Move: anchor on center"); } }),
            su("Move by Origin point", "", { icon: "move", onClick: () => { actions.setTool("move"); actions.flashToast("Move: anchor on origin"); } }),
            su("Move by reference point", "", { icon: "move", onClick: () => { actions.setTool("move"); actions.flashToast("Move: pick reference"); } }),
          ],
        }),
        snapToggle(),
        item("Find & replace", { k: "Ctrl+F", icon: "find", onClick: () => actions.openModal("findReplace") }),
        dv,
        item("Edit Outline", { icon: "draw", onClick: () => actions.openModal("editOutline") }),
        item("Cutout", { icon: "del", onClick: () => actions.openModal("cutout") }),
        dv,
        item("Add Chamfer", { icon: "pPolyline", onClick: () => { actions.setCornerOp({ mode: "chamfer" }); actions.openModal("chamferFillet"); } }),
        item("Add Fillet", { icon: "pArc", onClick: () => { actions.setCornerOp({ mode: "fillet" }); actions.openModal("chamferFillet"); } }),
      ],
    },
    {
      id: "view",
      label: "View",
      key: "V",
      items: [
        item("Zoom In (I)", { icon: "zoomin", onClick: () => actions.zoomIn() }),
        item("Zoom Out (O)", { icon: "zoomout", onClick: () => actions.zoomOut() }),
        item("Fit All in Window (F)", { k: "K", icon: "fit", onClick: () => actions.zoomFit() }),
        dv,
        // PDF Part 2: PCB units are mil · mm.
        item("Unit", {
          icon: "ruler",
          sub: ["Mil", "mm"].map((u) =>
            su(u === "Mil" ? "mil" : u, "", { icon: state.unit === u ? "check" : "blank", onClick: () => actions.setUnit(u) }),
          ),
        }),
        item("Grid Size (G)", { icon: "grid", sub: gridFlyout }),
        item("Snap Size", { icon: "snap", sub: gridFlyout }),
        item("Grid Type", {
          icon: "tGridOptions",
          sub: [
            su("Cartesian Coordinate System", "", { icon: "check" }),
            su("Polar Coordinate System"),
            dv,
            su("Grid dot"),
            su("Grid"),
            su("None", "", { icon: "check" }),
          ],
        }),
        dv,
        item("2D View", { icon: "board", onClick: () => actions.setMode("pcb") }),
        item("3D View", { icon: "cube", onClick: () => actions.setMode("3d") }),
        item("Normal View", { icon: "preview", onClick: () => actions.flashToast("Normal view") }),
        item("Outline View", { icon: "pRect", onClick: () => actions.flashToast("Outline view") }),
        item("Flip Board", { k: "Alt+F", icon: "flipV" }),
        item("Ratline", { icon: "wire", onClick: () => actions.flashToast("Ratline visibility toggled") }),
        dv,
        // Phase 8 — Appearance (IT-550). Dark / Light / System theme picker.
        item("Appearance", {
          icon: "appearance",
          sub: [
            su("Light Mode", "", { icon: "sun", onClick: () => actions.flashToast("Switch theme via Setting → System") }),
            su("Dark Mode", "", { icon: "moon", onClick: () => actions.flashToast("Switch theme via Setting → System") }),
            su("System Default", "", { icon: "sys", onClick: () => actions.flashToast("Switch theme via Setting → System") }),
            dv,
            su("Open Theme Settings…", "", { icon: "appearance", onClick: () => actions.openSettings("system") }),
          ],
        }),
        check("Top Toolbar"),
        check("Left-Side panel", "["),
        check("Right-Side Panel", "]"),
        check("Bottom-Side Panel", "/", true),
      ],
    },
    // Phase 8 — Place menu (IT-510). 2D-side primitives + Move-to-Layer.
    {
      id: "place",
      label: "Place",
      key: "P",
      items: [
        item("Place a Part", { icon: "pChip", onClick: () => actions.openModal("devicePicker") }),
        item("Vias", { icon: "tVia", onClick: () => actions.setTool("via") }),
        item("Suture Vias", { icon: "tSutureVias", onClick: () => actions.setTool("sutureVias") }),
        item("Pad", { icon: "tPad", onClick: () => actions.setTool("pad") }),
        item("Board Outline", { icon: "tBoardOutline", onClick: () => actions.setTool("boardOutline") }),
        item("Copper Region", { icon: "tPolygon", onClick: () => actions.setTool("polygon") }),
        item("Fill Region", { icon: "tFillRegion", onClick: () => actions.setTool("fillRegion") }),
        item("Slot Region", { icon: "tSlot", onClick: () => actions.setTool("slot") }),
        item("Prohibited Region", { icon: "pNoConnect", onClick: () => actions.setTool("prohibitedRegion") }),
        item("Constraint Region", { icon: "rectIn", onClick: () => actions.setTool("constraintRegion") }),
        // PDF §10 place-menu inventory
        item("Test Point", { icon: "pTestPoint", onClick: () => actions.setTool("testPoint") }),
        item("Via Fence", { icon: "tVia", onClick: () => actions.setTool("viaFence") }),
        item("Shaped Pad", { icon: "tPad", onClick: () => actions.setTool("shapedPad") }),
        item("FPC Stiffener", { icon: "tFillRegion", onClick: () => actions.setTool("fpcStiffener") }),
        dv,
        item("Line", { icon: "pPolyline", onClick: () => actions.setTool("line") }),
        item("Dimension", { icon: "measure", onClick: () => actions.setTool("dimension") }),
        item("Text", { icon: "pText", onClick: () => actions.setTool("text") }),
        item("Image", { icon: "pImage", onClick: () => actions.setTool("image") }),
        item("Table", { icon: "pTable", onClick: () => actions.openModal("tableProps") }),
        item("Stack Table", { icon: "pTable", onClick: () => actions.setTool("stackTable") }),
        item("Drill Table", { icon: "pTable", onClick: () => actions.setTool("drillTable") }),
        item("Canvas Origin", { icon: "ruler", onClick: () => actions.setTool("canvasOrigin") }),
        dv,
        // PDF Part 2: cascade of target layers.
        item("Move to Different Layer", {
          icon: "layer",
          sub: (state.pcbLayers ?? []).map((l) =>
            su(l.name, "", {
              icon: "layer",
              onClick: () => {
                const n = state.selectedIds.length;
                if (!n) { actions.flashToast("Nothing selected"); return; }
                actions.merge({
                  objects: state.objects.map((o) =>
                    state.selectedIds.includes(o.id) ? { ...o, layer: l.id } : o,
                  ),
                });
                actions.flashToast(`${n} object${n > 1 ? "s" : ""} moved to ${l.name}`);
                actions.closeAll();
              },
            }),
          ),
        }),
      ],
    },
    // Phase 7 — Design menu (IT-646).
    {
      id: "design",
      label: "Design",
      key: "D",
      items: [
        item("Update PCB to Schematic", { k: "Alt+I", icon: "dConvert", onClick: () => actions.setMode("schematic") }),
        item("Design rules", { icon: "dRule", onClick: () => actions.openModal("pcbDrc") }),
        item("Run design check (DRC)", { icon: "dCheck", onClick: () => actions.runDrcCheck() }),
        item("Diff-pair manager", { icon: "dCross", onClick: () => actions.openModal("diffPair") }),
        dv,
        item("Add Mounting Hole", { icon: "pTestPoint", onClick: () => actions.setTool("mountingHole") }),
        item("Import DXF", { icon: "imp", onClick: () => actions.openModal("importDfx") }),
        item("Import Image", { icon: "pImage", onClick: () => actions.setTool("image") }),
        item("Manage Layer", { icon: "layer", onClick: () => actions.openModal("layerManager") }),
        dv,
        // PDF Part 2 (Popup 6): grouping / length-matching managers.
        item("Net Class Manager", { icon: "wire", onClick: () => actions.openModal("netClass") }),
        item("Equal Length Group Manager", { icon: "tLengthTune", onClick: () => actions.openModal("equalLength") }),
        item("Pad Pair Group Manager", { icon: "tPad", onClick: () => actions.openModal("padPair") }),
        dv,
        item("Auto-number parts", { icon: "dAnnotate", onClick: () => actions.openModal("annotate") }),
        dv,
        // Final list: the items below are flagged Remove but kept in scope,
        // clearly marked (⚑) — confirm with team before dropping. Ones with an
        // obvious existing action are wired; the rest are placeholders.
      ],
    },
    // Phase 7 — Route menu (IT-658).
    {
      id: "route",
      label: "Route",
      key: "U",
      items: [
        item("Single Routing", { k: "T", icon: "tTrack", onClick: () => actions.setTool("track") }),
        item("Differential Routing", { k: "D", icon: "tDiffPair", onClick: () => actions.setTool("diffPair") }),
        item("Stretch Track", { icon: "pWire", onClick: () => actions.setTool("stretchTrack") }),
        item("Gloss Selected Track", { icon: "wire", onClick: () => actions.flashToast("Glossed selected tracks") }),
        dv,
        item("Equal Length Tuning", { icon: "measure", onClick: () => actions.openModal("equalLength") }),
        item("Differential Pair Equal Length Tuning", { icon: "measure", onClick: () => actions.openModal("equalLength") }),
        dv,
        item("Auto Routing", { icon: "tAutoRoute", onClick: () => actions.autoRoute() }),
        item("Routing Mode", {
          icon: "route",
          sub: [
            su("45° Diagonal", "", { icon: state.routingMode === "45deg" ? "check" : "blank", onClick: () => actions.setRoutingMode("45deg") }),
            su("90° Orthogonal", "", { icon: state.routingMode === "90deg" ? "check" : "blank", onClick: () => actions.setRoutingMode("90deg") }),
            su("Curved", "", { icon: state.routingMode === "curved" ? "check" : "blank", onClick: () => actions.setRoutingMode("curved") }),
          ],
        }),
        item("Routing Corner", {
          icon: "pArc",
          sub: [
            su("Miter", "", { icon: state.routingCorner === "miter" ? "check" : "blank", onClick: () => actions.setRoutingCorner("miter") }),
            su("Round", "", { icon: state.routingCorner === "round" ? "check" : "blank", onClick: () => actions.setRoutingCorner("round") }),
            su("Chamfer", "", { icon: state.routingCorner === "chamfer" ? "check" : "blank", onClick: () => actions.setRoutingCorner("chamfer") }),
          ],
        }),
        item("Routing Width…", { icon: "wire", onClick: () => actions.openModal("routingWidth") }),
        dv,
        item("Unroute", { icon: "del", onClick: () => actions.flashToast("Unrouted") }),
        item("Remove Loop", { icon: "del", onClick: () => actions.flashToast("Loop removed") }),
      ],
    },
    // Phase 8 — Layout menu (IT-513). Already-built primitives (Group / Align
    // / Distribute / Rotate / Flip / Level) surfaced from the toolbar.
    {
      id: "layout",
      label: "Layout",
      key: "L",
      items: [
        item("Group", { icon: "group", onClick: () => actions.groupSelection() }),
        item("Align", {
          icon: "align",
          sub: [
            su("Align Left", "", { icon: "alignLeft", onClick: () => actions.alignSelected("left") }),
            su("Align Right", "", { icon: "alignRight", onClick: () => actions.alignSelected("right") }),
            su("Align Top", "", { icon: "alignTop", onClick: () => actions.alignSelected("top") }),
            su("Align Bottom", "", { icon: "alignBottom", onClick: () => actions.alignSelected("bottom") }),
            su("Align Horizontal centers", "", { icon: "alignHCenter", onClick: () => actions.alignSelected("hcenter") }),
            su("Align Vertical Center", "", { icon: "alignVCenter", onClick: () => actions.alignSelected("vcenter") }),
          ],
        }),
        item("Distribute", {
          icon: "distribute",
          sub: [
            su("Distribute Horizontally", "", { icon: "distribute", onClick: () => actions.openModal("distribute") }),
            su("Distribute Vertically", "", { icon: "distributeV", onClick: () => actions.openModal("distribute") }),
          ],
        }),
        item("Rotate", {
          icon: "rot",
          sub: [
            su("Rotate Left", "", { icon: "tRotLeft", onClick: () => actions.rotateSelectedPlaced(-90) }),
            su("Rotate Right", "", { icon: "tRotRight", onClick: () => actions.rotateSelectedPlaced(90) }),
          ],
        }),
        item("Flip", {
          icon: "flip",
          sub: [
            su("Flip Horizontal", "", { icon: "flip", onClick: () => actions.flipSelectedH() }),
            su("Flip Vertical", "", { icon: "flipV", onClick: () => actions.flipSelectedV() }),
          ],
        }),
        item("Order", {
          icon: "layer",
          sub: [
            su("Bring to Front", "", { icon: "tBringFront", onClick: () => actions.bringFront() }),
            su("Send to Back", "", { icon: "tSendBack", onClick: () => actions.sendBack() }),
          ],
        }),
      ],
    },
    // Phase 6 — Export menu (IT-656), trimmed to the "In 2D Side" sheet set.
    {
      id: "export",
      label: "Export",
      key: "R",
      items: [
        item("BOM (Bill of Materials)", { icon: "bom", onClick: () => actions.openModal("exportBom") }),
        item("DXF", { icon: "exp", onClick: () => actions.openModal("exportDxf2D") }),
        item("PDF", { icon: "pdf", onClick: () => actions.openModal("exportPdf2D") }),
        item("Gerber", { icon: "gerber", onClick: () => actions.openModal("exportGerber2D") }),
        item("Pick and Place", { icon: "bom", onClick: () => actions.openModal("exportPickPlace") }),
        item("3D", { icon: "cube", onClick: () => actions.openModal("export3dFile") }),
      ],
    },
    {
      id: "setting",
      label: "Setting",
      key: "I",
      items: [
        item("System", { icon: "sys", onClick: () => actions.openSettings("system") }),
        item("Schematic/Symbol", { icon: "symbol", onClick: () => actions.openSettings("symbol") }),
        item("PCB/Footprint", { icon: "foot", onClick: () => actions.openSettings("footprint") }),
        item("Panel", { icon: "panel", onClick: () => actions.openSettings("panel") }),
      ],
    },
    {
      id: "help",
      label: "Help",
      key: "H",
      items: [
        item("community", { icon: "community" }),
        item("Tutorials", { k: "F1", icon: "tutorial" }),
        item("Contact", { icon: "contact" }),
        item("Online chat", { icon: "chat" }),
        item("About..", { icon: "about" }),
        dv,
        item("Video Capture...", { icon: "video" }),
        item("Performance Diagnostic...", { icon: "diagnostic" }),
      ],
    },
  ];

  return data.map((m) => ({
    ...m,
    open: state.openMenu === m.id,
    toggle: () => actions.toggleMenu(m.id),
  }));
}

// 3D editor menu bar — reduced 4-menu set (View / Export / Setting / Help).
// Faithful to Figma "3D Section" board (node 190:257520). Differs from the 2D
// menus only in View (canvas-geometry items dropped) and Export (3D file types).
export function buildMenus3D(state: PcbState, actions: PcbActions) {
  const close = () => actions.closeAll();
  const noop = () => {};
  const dv = { divider: true };
  const su = (label, k = "", o = {}) => ({
    label,
    k,
    fg: o.disabled ? "var(--color-text-disabled)" : "var(--color-text-primary)",
    icon: o.icon || "blank",
    onClick: o.onClick || close,
  });
  const item = (label, o = {}) => ({
    label,
    k: o.k || "",
    submenu: !!o.sub,
    hasSub: !!o.sub,
    icon: o.icon || "blank",
    sub: o.sub || [],
    onClick: o.sub ? noop : o.onClick || close,
  });
  const check = (label, k = "", isBottom = false) => {
    const on = isBottom ? state.bottomOpen : state.viewTog[label] !== false;
    return {
      label,
      k,
      submenu: false,
      hasSub: false,
      icon: on ? "check" : "blank",
      sub: [],
      onClick: () => (isBottom ? actions.toggleBottom() : actions.toggleView(label)),
    };
  };

  const data = [
    {
      id: "view",
      label: "View",
      key: "V",
      items: [
        item("Full Screen", { k: "F11", icon: "fullscreen", onClick: () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch {} actions.closeAll(); } }),
        check("Top Toolbar"),
        check("Left-Side panel", "["),
        check("Right-Side Panel", "]"),
        check("Bottom-Side Panel", "\\", true),
        item("Window Arrangement", {
          icon: "window",
          sub: [
            su("Tile Horizontally (H)", "", { icon: "window" }),
            su("Tile Vertically (V)", "", { icon: "window" }),
            su("Tile All (T)", "", { icon: "window" }),
            su("Merge All (M)", "", { icon: "window" }),
          ],
        }),
        check("Floating Tool"),
      ],
    },
    {
      id: "export",
      label: "Export",
      key: "R",
      items: [
        item("3D File", { icon: "cube", onClick: () => actions.openModal("export3dFile") }),
        item("3D Shell File", { icon: "cube", onClick: () => actions.openModal("export3dShell") }),
        item("PNG", { icon: "png", onClick: () => actions.export3dPng() }),
      ],
    },
    {
      id: "setting",
      label: "Setting",
      key: "I",
      items: [
        item("System", { icon: "sys", sub: [su("General", "", { icon: "sys", onClick: () => actions.openModal("set3dSysGeneral") }), su("Common", "", { icon: "prop", onClick: () => actions.openModal("set3dSysCommon") }), su("Common Library", "", { icon: "doc", onClick: () => actions.openModal("set3dSysLib") })] }),
        item("Schematic/Symbol", { icon: "symbol", sub: [su("General", "", { icon: "sys", onClick: () => actions.openSettings("symbol") }), su("Theme", "", { icon: "appearance", onClick: () => actions.openSettings("symbol") })] }),
        item("PCB/Footprint", {
          icon: "foot",
          sub: [
            su("General", "", { icon: "sys", onClick: () => actions.openSettings("footprint") }),
            su("Theme", "", { icon: "appearance", onClick: () => actions.openSettings("footprint") }),
            su("Common Grid/Snap Size setting", "", { icon: "grid", onClick: () => actions.openSettings("footprint") }),
            su("Common Track Width Setting", "", { icon: "wire", onClick: () => actions.openSettings("footprint") }),
            su("Common Via Size Setting", "", { icon: "tVia", onClick: () => actions.openSettings("footprint") }),
            su("Snap", "", { icon: "snap", onClick: () => actions.toggleSnap() }),
          ],
        }),
        item("Panel/Panel Lib", { icon: "panel", sub: [su("General", "", { icon: "sys", onClick: () => actions.openModal("set3dPanelGeneral") }), su("Theme", "", { icon: "appearance", onClick: () => actions.openModal("set3dPanelTheme") })] }),
        item("Common Font Family", { icon: "font", onClick: () => actions.openModal("set3dFont") }),
        item("Drawing", { icon: "draw", onClick: () => actions.openModal("set3dDrawing") }),
        item("Property", { icon: "prop", onClick: () => actions.openModal("set3dProperty") }),
        item("Hotkey", { icon: "key", onClick: () => actions.openModal("set3dHotkey") }),
        item("Top toolbar", { icon: "grid", onClick: () => actions.openModal("set3dTopToolbar") }),
        item("Save", { icon: "save", onClick: () => actions.saveDoc() }),
      ],
    },
    {
      id: "help",
      label: "Help",
      key: "H",
      items: [
        item("Community", { icon: "community" }),
        item("Tutorials", { k: "F1", icon: "tutorial" }),
        item("Contact", { icon: "contact" }),
        item("Online Chat", { icon: "chat", onClick: () => actions.toggleChat() }),
        item("About...", { icon: "about" }),
        dv,
        item("Video Capture...", { icon: "video" }),
        item("Performance Diagnostic...", { icon: "diagnostic" }),
      ],
    },
  ];

  return data.map((m) => ({
    ...m,
    open: state.openMenu === m.id,
    toggle: () => actions.toggleMenu(m.id),
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

// Kind-aware context menu — Phase 4b.
// Inspects the current selection and emits items + onClick handlers.
// When there is no selection, only paste/select-all/zoom-fit show; with
// selection, all transform/clipboard/delete items + kind-specific extras show.
// Canvas right-click menu — matches the Ideeza "Right-Click Menu" spec.
// Two mode-specific sets (Schematic = 11, PCB-2D = 7). Node shape read by
// context-menu.tsx: { divider } | leaf { label,icon,k?,checked?,disabled?,title?,onClick? }
// | submenu { label,icon,submenu:[…] }. `k` is the shortcut hint.
// Item types map to fields: ACTION/DIALOG → onClick; TOGGLE → `checked`;
// SUBMENU → `submenu`. Anything not yet wired renders disabled with a `title`
// explaining what enables it (honest placeholder, not a fake toast).
export function buildCtxItems(state: PcbState, actions: PcbActions) {
  const dv = { divider: true };
  const close = actions.closeAll;
  const hasSel = (state.selectedIds || []).length > 0;
  const hasClip = (state.clipboardObjects || []).length > 0;
  const selObj = hasSel ? state.objects.find((o) => o.id === state.selectedIds[0]) : null;
  const selKind = selObj?.kind;
  const inPcb = state.mode === 'pcb' || state.mode === '2d';
  // ACTION/DIALOG helper — runs then closes; `disabled` greys it out; `title`
  // is the hover tooltip (used to explain why an item is disabled).
  const A = (label, icon, k, run, disabled?, title?) => ({
    label, icon, k: k || '', title,
    disabled: !!disabled,
    onClick: disabled ? undefined : () => { run(); close(); },
  });
  // TOGGLE helper — shows a ✓ when `checked`; fires immediately.
  const T = (label, icon, checked, run) => ({
    label, icon, checked: !!checked,
    onClick: () => { run(); close(); },
  });
  // Selection-filter submenu — one active category ("Only X") per scope, stored
  // in boardSettings; the ✓ marks the current one; "Common" clears it.
  const bag: any = state.boardSettings || {};
  const filterSubmenu = (scope, cats) => {
    const key = scope === 'schematic' ? 'selFilterSchematic' : 'selFilterPcb';
    const cur = bag[key] || 'all';
    const pick = (v) => () => { actions.setBoardSetting(key, v); close(); };
    return cats.map(([v, label]) => ({ label, checked: cur === v, onClick: pick(v) }))
      .concat([{ divider: true }, A('More…', 'filter', '', () => actions.setRightTab('filter'))]);
  };
  const items: any[] = [];

  if (!inPcb) {
    // ─────────────── SCHEMATIC (spec: 11 items) ───────────────
    items.push(A('Copy', 'copy', 'Ctrl+C', () => actions.copySelection(), !hasSel));
    items.push(A('Paste', 'paste', 'Ctrl+V', () => actions.pasteClipboard(), !hasClip));
    items.push(A('Delete', 'del', 'Del', () => actions.deleteSelected(), !hasSel));
    items.push(dv);
    items.push({
      label: 'Group', icon: 'layer', disabled: !hasSel,
      submenu: [
        A('Group', 'layer', '', () => actions.groupSelection(), !hasSel),
        A('Ungroup', 'layer', '', () => actions.ungroupSelection(), !hasSel),
      ],
    });
    items.push(dv);
    const probeTarget = selObj ? state.objects.find((o) => o.sourceId === selObj.id) : null;
    items.push(A('Cross Probe', 'find', '', () => selObj && actions.crossProbe(selObj.id), !probeTarget, !probeTarget ? 'Select a converted component to jump to its PCB footprint' : undefined));
    items.push(A('Fit All in Window', 'fit', 'K', () => actions.zoomFit('all')));
    items.push(dv);
    const sheets = state.schematicSheets || [];
    const si = sheets.findIndex((sh) => sh.id === state.activeSheetId);
    items.push(A('Previous Page', 'page', '', () => actions.prevSheet(), si <= 0));
    items.push(A('Next Page', 'page', '', () => actions.nextSheet(), si >= sheets.length - 1));
    items.push({
      label: 'Goto Page', icon: 'page',
      submenu: sheets
        .map((sh) => ({ label: sh.name, checked: sh.id === state.activeSheetId, onClick: () => { actions.gotoSheet(sh.id); close(); } }))
        .concat([{ divider: true }, A('New Sheet', 'page', '', () => actions.addSheet())]),
    });
    items.push(dv);
    items.push(T('Snap', 'tGridOptions', state.snapEnabled, () => actions.toggleSnap()));
    items.push({ label: 'Filter', icon: 'filter', submenu: filterSubmenu('schematic', [
      ['all', 'Common'], ['pin', 'Only Pin'], ['symbol', 'Only Symbol'],
      ['wirebus', 'Only Wire and Bus'], ['pinpair', 'Only Pin Pair'], ['net', 'Only Net'],
    ]) });
    items.push(A('Property…', 'prop', '', () => actions.setRightTab('properties')));
  } else {
    // ─────────────── PCB 2D (spec: 7 items) ───────────────
    items.push(A('Paste', 'paste', 'Ctrl+V', () => actions.pasteClipboard(), !hasClip));
    items.push({
      label: 'Move', icon: 'move', disabled: !hasSel,
      submenu: [
        A('Move', 'move', '', () => actions.startMoveSelected(), !hasSel),
        A('Rotate 90°', 'rot', 'Space', () => actions.rotateSelectedPlaced(90), !hasSel),
        A('Flip Horizontal', 'rot', '', () => actions.flipSelectedH(), !hasSel),
        A('Flip Vertical', 'rot', '', () => actions.flipSelectedV(), !hasSel),
      ],
    });
    items.push(dv);
    items.push(A('Find…', 'find', 'Ctrl+F', () => actions.openModal('findReplace')));
    items.push(A('Unhighlight All', 'wire', '', () => actions.unhighlightAll(), !state.highlightedNet, !state.highlightedNet ? 'Nothing is highlighted' : undefined));
    items.push({ label: 'Filter', icon: 'filter', submenu: filterSubmenu('pcb', [
      ['all', 'Common'], ['track', 'Only Track'], ['padvia', 'Only Pad / Via'], ['copper', 'Only Copper Region'],
    ]) });
    items.push(dv);
    items.push(A('Fit All in Window', 'fit', 'K', () => actions.zoomFit('all')));
    items.push(T('Snap', 'tGridOptions', state.snapEnabled, () => actions.toggleSnap()));
  }

  // ── Contextual extras (kept from before) — only for the matching object
  // kind; appended below a divider so the standard spec list stays clean.
  const extras: any[] = [];
  if (hasSel && inPcb && selKind === 'track') {
    extras.push(A('Add Tear Drop', 'wire', '', () => actions.openModal('tearDrop')));
    extras.push(A('Assign to Net Class…', 'wire', '', () => actions.openModal('netClass')));
  }
  if (hasSel && inPcb && (selKind === 'via' || selKind === 'pad')) {
    extras.push(A('Add Tear Drop', 'wire', '', () => actions.openModal('tearDrop')));
    extras.push(A('Remove Unused Pad…', 'del', '', () => actions.openModal('removeUnusedPad')));
  }
  if (hasSel && inPcb && (selKind === 'polygon' || selKind === 'fillRegion')) {
    extras.push(A('Edit Copper…', 'foot', '', () => actions.openModal('copper')));
  }
  if (hasSel && inPcb && selKind === 'component') {
    extras.push(A('Footprint Manager…', 'foot', '', () => actions.openManager('footprint')));
    extras.push(A('Annotate Designator…', 'prop', '', () => actions.openModal('annotate')));
  }
  if (hasSel && !inPcb && (selKind === 'wire' || selKind === 'bus')) {
    extras.push(A('Place Net Label', 'pNetLabel', 'N', () => actions.setTool('netLabel')));
  }
  // Highlight Net — entry point that makes "Unhighlight All" meaningful; shown
  // whenever the selected object carries a net.
  if (hasSel && selObj?.net) {
    extras.push(A('Highlight Net', 'wire', '', () => actions.highlightNet(selObj.net)));
  }
  if (extras.length) { items.push(dv); items.push(...extras); }

  return items;
}

// ── Rail + tab builders (from the prototype's renderVals) ──────────────────
// `iconEl(x)` reduced to the raw SVG string `x` (rendered via <Icon html=.../>).

export function buildRail(_state: PcbState | null = null, activeKey: string = 'pcb') {
  const railDefs = [
    { key: 'pcb', label: 'PCB Design', icon: 'pcb' },
    { key: 'code', label: 'Code', icon: 'code' },
    { key: '3d', label: '3D Module', icon: 'cube' },
    { key: 'preview', label: 'Product Preview', icon: 'preview' },
    { key: 'wiring', label: 'Wiring', icon: 'wire' },
    { key: 'brief', label: 'Add Brief', icon: 'brief' },
  ];
  return railDefs.map((r) => {
    const active = r.key === activeKey;
    return {
      key: r.key,
      label: r.label,
      icon: r.icon,
      bg: active ? C.weak : 'transparent',
      fg: active ? C.primary : (r.faded ? 'var(--color-border-strong)' : C.body),
      opacity: r.faded ? 'var(--opacity-muted)' : '1',
      cursor: r.faded ? 'default' : 'pointer',
      href: r.key === 'pcb' ? '/pcb' : r.key === 'code' ? '/code' : r.key === '3d' ? '/3d' : r.key === 'preview' ? '/preview' : r.key === 'wiring' ? '/wiring' : r.key === 'brief' ? '/brief' : null,
    };
  });
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
    ? ([['page', 'Sheets']] as const)
    : ([['page', 'Sheets'], ['net', 'Nets'], ['component', 'Parts'], ['object', 'Objects']] as const);
  return defs.map(([k, l]) => ({
    label: l,
    fg: state.leftSub === k ? C.text : 'var(--color-text-tertiary)',
    weight: state.leftSub === k ? '700' : '500',
    bd: state.leftSub === k ? C.primary : 'transparent',
    onClick: () => actions.setLeftSub(k),
  }));
}

export function buildModeTabs(state: PcbState, actions: PcbActions) {
  // Two top-level tabs. PCB stays active across both its sub-views (2D · 3D),
  // so entering PCB lands on its 2D view by default.
  const inPcb = state.mode === 'pcb' || state.mode === '3d';
  const defs: Array<[string, string, boolean]> = [
    ['schematic', 'Schematic', state.mode === 'schematic'],
    ['pcb', 'PCB', inPcb],
  ];
  return defs.map(([k, l, active]) => ({
    label: l,
    bg: active ? C.primary : 'transparent',
    fg: active ? '#fff' : 'var(--color-text-secondary)',
    onClick: () => actions.setMode(k),
  }));
}

// PCB sub-tabs (rendered only inside the PCB context): 2D = the layout editor
// (mode "pcb"), 3D = the board preview (mode "3d"). PCB defaults to 2D.
export function buildPcbViewTabs(state: PcbState, actions: PcbActions) {
  const defs: Array<[string, string]> = [['pcb', '2D'], ['3d', '3D']];
  return defs.map(([k, l]) => ({
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
  ['device', 'Parts Audit', 'device'],
  ['drc', 'DRC', 'drc'],
  ['find', 'Find Result', 'find'],
  ['prop', 'Property List', 'prop'],
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

// ── IDEEZA menu regroup ────────────────────────────────────────────────────
// The raw builders still describe every action under the familiar
// File / Edit / View / Place / Design / Layout / Export / Setting / Help
// buckets — that's where the spec-parity lives. For the app chrome we present
// a leaner, IDEEZA-native shape so it no longer reads as an EasyEDA clone:
//   • File (+ Export folded in)  → "Project"
//   • Place                       → "Insert"
//   • Layout                      → "Arrange"
//   • Setting / Help              → right-side icon cluster (⚙ / ?)
// Nothing is dropped — items are only moved / relabelled, and menu ids stay
// intact so the existing open/toggle wiring keeps working.
export function regroupMenus(menus) {
  const by = {};
  for (const m of menus) by[m.id] = m;
  const relabel = (m, label) => (m ? { ...m, label } : null);

  // Project = File, with Export folded in as a hover flyout at the bottom.
  let project = null;
  if (by.file) {
    const items = [...by.file.items];
    if (by.export) {
      items.push({ divider: true });
      items.push({
        label: "Export",
        icon: "exp",
        submenu: true,
        hasSub: true,
        sub: by.export.items,
        onClick: () => {},
      });
    }
    project = { ...by.file, label: "Project", items };
  }

  const primary = [
    project,
    by.edit,
    relabel(by.place, "Insert"),
    by.design,
    by.route,
    relabel(by.layout, "Arrange"),
    by.view,
    // Modes without a File menu (e.g. 3D) keep Export as its own menu.
    !by.file ? by.export : null,
  ].filter(Boolean);

  return {
    primary,
    settings: relabel(by.setting, "Settings"),
    help: by.help || null,
  };
}

// Flatten a regrouped menu set into a searchable command list for ⌘K. Every
// leaf action (including one level of hover-flyout children) becomes one
// command carrying its structure — { group, trail, label } — so the palette
// can group results and show a clean primary label with a muted breadcrumb
// tail. Dividers, pure containers, and label-less rows are skipped.
export function flattenCommands(groups) {
  const menus = [groups.primary, groups.settings ? [groups.settings] : [], groups.help ? [groups.help] : []].flat();
  const out = [];
  const seen = new Set();
  const push = (group, trail, label, icon, onClick) => {
    if (!label || typeof onClick !== "function") return;
    const key = `${group}/${trail}/${label}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ group, trail, label, icon: icon || "blank", onClick });
  };
  for (const m of menus) {
    for (const it of m.items || []) {
      if (it.divider || !it.label) continue;
      const children = (it.sub || []).filter((s) => s && !s.divider && s.label);
      if (children.length) {
        for (const s of children) push(m.label, it.label, s.label, s.icon, s.onClick);
      } else {
        push(m.label, "", it.label, it.icon, it.onClick);
      }
    }
  }
  return out;
}
