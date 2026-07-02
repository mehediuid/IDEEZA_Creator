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
      place: { label: 'Place', key: 'P', items: (state.mode === 'pcb' ? [
        // PCB-mode Place menu — PCB primitives (track/via/pad/etc).
        mk('Component / Footprint (C)','Alt+C','pChip'),
        mk('Track (T)','Alt+T','pWire'),
        mk('Differential Pair (D)','Alt+D','diffPair'),
        mk('Via (V)','Alt+V','via'),
        mk('Suture Vias','','via'),
        mk('Pad (P)','Alt+P','pad'),
        dv,
        mk('Copper Pour Polygon (G)','Alt+G','pRect'),
        mk('Filled Region','','pRect'),
        mk('Board Outline','','blank'),
        mk('Slot','','blank'),
        mk('Cut-out','','blank'),
        dv,
        mk('Dimension','','measure'),
        mk('Ruler','','measure'),
        mk('Text (X)','Alt+X','pText'),
        mk('Image','','pImage'),
        mk('Table','','pTable'),
        dv,
        mk('Length Tune','','wire'),
        mk('Auto Route','','convert'),
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
        mk('JLCPCB Layout Service','','dLayout',[{label:'Auto Layout',k:''},{label:'Manual Layout',k:''},{label:'Order PCB Now',k:''}]),
        mk('Import Changes from PCB','','dImport'), dv,
        mk('Design Rule','','dRule'), mk('Check DRC','','dCheck'), mk('Annotate Designator','','dAnnotate'), dv,
        mk('Cross Probe','Shift+P','dCross'), mk('Placement Transfer','Ctrl+Shift+P','dTransfer'), dv,
        mk('Reset Component Unique ID','','dReset'),
      ] },
      layout: { label: 'Layout', key: 'L', items: [ mk('Align Left','','fit'), mk('Align Center','','fit'), dv, mk('Distribute Horizontally','','array'), mk('Distribute Vertically','','array'), dv, mk('Bring to Front',']','layer'), mk('Send to Back','[','layer') ] },
      tools: { label: 'Tools', key: 'T', items: (state.mode === 'pcb' ? [
        // PCB-mode Tools — Phase 3 manager modals.
        mk('Layer Manager','','layer'),
        mk('Net Class Manager','','wire'),
        mk('Differential Pair Manager','','diffPair'),
        mk('Equal Length Group Manager','','measure'),
        mk('Pad Pair Group Manager','','chip'),
        mk('Copper Manager','','foot'),
        mk('Tear Drop','','del'),
        mk('IPC / DAC-2552 (PCB DRC)','','rules'),
        mk('Remove Unused Pad','','del'),
        dv,
        mk('Device Manager','','chip'),
        mk('Footprint Manager','','foot'),
        mk('Measure Distance','','measure'),
        mk('Auto Router','','convert'),
      ] : [
        mk('Design Rule Check','','rules'),
        mk('Electrical Rule Check','','rules'),
        dv,
        mk('Device Manager','','chip'),
        mk('Footprint Manager','','foot'),
        dv,
        mk('Measure Distance','','measure'),
        mk('Cross Probe','','wire'),
        mk('Auto Router','','convert'),
      ]) },
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
              };
              if (placeToolMap[it.label]) actions.setTool(placeToolMap[it.label]);
              else actions.closeAll();
            }
            else if (it.label === 'Update/Conver Schematic to PCB') actions.setMode('pcb');
            else if (it.label === 'Check DRC' || it.label === 'Electrical Rule Check') actions.clickBottomTab('drc');
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

// 2D editor menu bar — reduced 4-menu set (View / Export / Setting / Help).
// Faithful to Figma "2D section" board (node 198:190620). Returns the same shape
// MenuBar consumes from buildMenus, so no render changes are needed. Verbatim
// source typos are preserved intentionally ("Marge All", "Desinger", "About..").
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
    su("Common Grid/Snap setting"),
    su("Grid Range setting (Po..."),
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
        item("New", { k: "Ctrl+N", icon: "blank", onClick: () => actions.flashToast("New project") }),
        item("Open Project", { k: "Ctrl+O", icon: "imp", onClick: () => actions.flashToast("Open Project — pick a file") }),
        item("Save", { k: "Ctrl+S", icon: "save", onClick: () => actions.flashToast("Saved") }),
        item("Save All", { k: "Ctrl+Shift+S", icon: "save", onClick: () => actions.flashToast("All projects saved") }),
        dv,
        item("Import", {
          icon: "imp",
          sub: [
            su("DXF", "", { icon: "imp", onClick: () => actions.openModal("importDfx") }),
            su("Altium", "", { icon: "imp", onClick: () => actions.openModal("importAltium") }),
            su("Kicad", "", { icon: "imp", onClick: () => actions.openModal("importKicad") }),
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
        item("Delete", { k: "Del", icon: "del", onClick: () => actions.deleteSelected() }),
        dv,
        // Phase 8 — Move with sub-options (IT-534).
        item("Move", {
          k: "M",
          icon: "blank",
          sub: [
            su("Move by Center point", "", { onClick: () => { actions.setTool("move"); actions.flashToast("Move: anchor on center"); } }),
            su("Move by Origin point", "", { onClick: () => { actions.setTool("move"); actions.flashToast("Move: anchor on origin"); } }),
            su("Move by reference point", "", { onClick: () => { actions.setTool("move"); actions.flashToast("Move: pick reference"); } }),
          ],
        }),
        snapToggle(),
        item("Find and Replace", { k: "Ctrl+F", icon: "find", onClick: () => actions.openModal("findReplace") }),
        dv,
        item("Edit Outline", { icon: "draw", onClick: () => actions.openModal("editOutline") }),
        item("Cutout", { icon: "del", onClick: () => actions.openModal("cutout") }),
        item("Array Object", { icon: "array", onClick: () => actions.openModal("array") }),
        dv,
        item("Add Chamfer", { icon: "blank", onClick: () => { actions.setCornerOp({ mode: "chamfer" }); actions.openModal("chamferFillet"); } }),
        item("Add Fillet", { icon: "blank", onClick: () => { actions.setCornerOp({ mode: "fillet" }); actions.openModal("chamferFillet"); } }),
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
        item("Full Screen", { k: "F11", icon: "fullscreen" }),
        dv,
        item("Flip Board", { k: "Alt+F" }),
        item("Grid Size (G)", { sub: gridFlyout }),
        item("Snap Size", { sub: gridFlyout }),
        item("Grid Type", {
          sub: [
            su("Cartesian Coordinate System", "", { icon: "check" }),
            su("Polar Coordinate System"),
            dv,
            su("Grid dot"),
            su("Grid"),
            su("None", "", { icon: "check" }),
          ],
        }),
        // Phase 8 — Appearance (IT-550). Dark / Light / System theme picker.
        item("Appearance", {
          sub: [
            su("Light Mode", "", { onClick: () => actions.flashToast("Switch theme via Setting → System") }),
            su("Dark Mode", "", { onClick: () => actions.flashToast("Switch theme via Setting → System") }),
            su("System Default", "", { onClick: () => actions.flashToast("Switch theme via Setting → System") }),
            dv,
            su("Open Theme Settings…", "", { onClick: () => actions.openSettings("system") }),
          ],
        }),
        dv,
        check("Top Toolbar"),
        check("Left-Side panel", "["),
        check("Right-Side Panel", "]"),
        check("Bottom-Side Panel", "/", true),
        item("Window Arrangement (W)", {
          sub: [
            su("Tile Horizontally (H)"),
            su("Tile Vertically (V)"),
            su("Tile Vertically (V)"),
            su("Marge All (M)"),
          ],
        }),
        check("Floating Tool"),
      ],
    },
    // Phase 8 — Place menu (IT-510). 2D-side primitives + Move-to-Layer.
    {
      id: "place",
      label: "Place",
      key: "P",
      items: [
        item("Device", { icon: "pChip", onClick: () => actions.openManager("device") }),
        item("Vias", { icon: "via", onClick: () => actions.setTool("via") }),
        item("Suture Vias", { icon: "via", onClick: () => actions.setTool("sutureVias") }),
        item("Pad", { icon: "pad", onClick: () => actions.setTool("pad") }),
        item("Board Outline", { icon: "blank", onClick: () => actions.setTool("boardOutline") }),
        item("Copper Region", { icon: "pRect", onClick: () => actions.setTool("polygon") }),
        item("Fill Region", { icon: "pRect", onClick: () => actions.setTool("fillRegion") }),
        item("Slot Region", { icon: "pRect", onClick: () => actions.setTool("slot") }),
        item("Prohibited Region", { icon: "del", onClick: () => actions.setTool("prohibitedRegion") }),
        item("Constraint Region", { icon: "del", onClick: () => actions.setTool("constraintRegion") }),
        dv,
        item("Line", { icon: "pPolyline", onClick: () => actions.setTool("line") }),
        item("Dimension", { icon: "measure", onClick: () => actions.setTool("dimension") }),
        item("Text", { icon: "pText", onClick: () => actions.setTool("text") }),
        item("Image", { icon: "pImage", onClick: () => actions.setTool("image") }),
        item("Table", { icon: "pTable", onClick: () => actions.openModal("tableProps") }),
        dv,
        item("Move to Different Layer", { icon: "layer", onClick: () => actions.openModal("layerManager") }),
      ],
    },
    // Phase 8 — Layout menu (IT-513). Already-built primitives (Group / Align
    // / Distribute / Rotate / Flip / Level) surfaced from the toolbar.
    {
      id: "layout",
      label: "Layout",
      key: "L",
      items: [
        item("Group", { icon: "blank", onClick: () => actions.flashToast("Grouped") }),
        item("Align", {
          sub: [
            su("Align Left"),
            su("Align Right"),
            su("Align Top"),
            su("Align Bottom"),
            su("Align Horizontal centers"),
            su("Align Vertical Center"),
          ],
        }),
        item("Distribute", {
          sub: [
            su("Distribute Horizontally", "", { onClick: () => actions.openModal("distribute") }),
            su("Distribute Vertically", "", { onClick: () => actions.openModal("distribute") }),
          ],
        }),
        item("Rotate", {
          sub: [
            su("Rotate Left", "", { onClick: () => actions.rotateSelectedPlaced(-90) }),
            su("Rotate Right", "", { onClick: () => actions.rotateSelectedPlaced(90) }),
          ],
        }),
        item("Flip", {
          sub: [
            su("Flip Horizontal", "", { onClick: () => actions.flipSelectedH() }),
            su("Flip Vertical", "", { onClick: () => actions.flipSelectedV() }),
          ],
        }),
        item("Level", {
          sub: [
            su("Bring to Front", "", { onClick: () => actions.bringFront() }),
            su("Send to Back", "", { onClick: () => actions.sendBack() }),
          ],
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
        item("Design Rule", { icon: "dRule", onClick: () => actions.openModal("pcbDrc") }),
        item("Check DRC", { icon: "dCheck", onClick: () => actions.clickBottomTab("drc") }),
        item("Differential Pair Manager", { icon: "dCross", onClick: () => actions.openModal("diffPair") }),
        dv,
        item("Add Mounting Hole", { icon: "pTestPoint", onClick: () => actions.setTool("mountingHole") }),
        item("Manage Layer", { icon: "layer", onClick: () => actions.openModal("layerManager") }),
        dv,
        item("Polygon Pour", { icon: "pRect", onClick: () => actions.setTool("polygon") }),
        item("Fill all Plane", { icon: "pRect", onClick: () => actions.flashToast("Filled all planes") }),
        dv,
        item("Annotate Designator", { icon: "dAnnotate", onClick: () => actions.openModal("annotate") }),
      ],
    },
    // Phase 7 — Route menu (IT-658).
    {
      id: "route",
      label: "Route",
      key: "U",
      items: [
        item("Single Routing", { k: "T", icon: "pWire", onClick: () => actions.setTool("track") }),
        item("Differential Routing", { k: "D", icon: "diffPair", onClick: () => actions.setTool("diffPair") }),
        item("Stretch Track", { icon: "pWire", onClick: () => actions.setTool("stretchTrack") }),
        item("Gloss Selected Track", { icon: "wire", onClick: () => actions.flashToast("Glossed selected tracks") }),
        dv,
        item("Equal Length Tuning", { icon: "measure", onClick: () => actions.openModal("equalLength") }),
        item("Differential Pair Equal Length Tuning", { icon: "measure", onClick: () => actions.openModal("equalLength") }),
        dv,
        item("Auto Routing", { icon: "convert", onClick: () => actions.openModal("autoRoute") }),
        item("Routing Mode", {
          sub: [
            su("45° Diagonal", "", { icon: state.routingMode === "45deg" ? "check" : "blank", onClick: () => actions.setRoutingMode("45deg") }),
            su("90° Orthogonal", "", { icon: state.routingMode === "90deg" ? "check" : "blank", onClick: () => actions.setRoutingMode("90deg") }),
            su("Curved", "", { icon: state.routingMode === "curved" ? "check" : "blank", onClick: () => actions.setRoutingMode("curved") }),
          ],
        }),
        item("Routing Corner", {
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
    // Phase 6 — Export menu (IT-656).
    {
      id: "export",
      label: "Export",
      key: "R",
      items: [
        item("BOM (Bill of Materials)", { icon: "bom", onClick: () => actions.openModal("exportBom") }),
        item("DXF", { icon: "imp", onClick: () => actions.openModal("exportDxf2D") }),
        item("PDF", { icon: "pdf", onClick: () => actions.openModal("exportPdf2D") }),
        item("Gerber", { icon: "gerber", onClick: () => actions.openModal("exportGerber2D") }),
        item("Pick and Place", { icon: "bom", onClick: () => actions.openModal("exportPickPlace") }),
        item("3D", { icon: "cube", onClick: () => actions.openModal("export3dFile") }),
        dv,
        item("Altium Desinger", { onClick: () => actions.openModal("exportAltium") }),
        item("Kicad Desinger", { onClick: () => actions.openModal("exportKicad") }),
        item("Eagle Designer", { onClick: () => actions.openModal("exportEagle") }),
      ],
    },
    {
      id: "setting",
      label: "Setting",
      key: "I",
      items: [
        item("System", { icon: "sys", sub: [su("General"), su("Common"), su("Common Library")] }),
        item("Schematic/Symbol", { sub: [su("General"), su("Theme")] }),
        item("PCB/Footprint", {
          sub: [
            su("General"),
            su("Theme"),
            su("Common Grid/Snap Sie setting"),
            su("Common Track Width Setting"),
            su("Common Via Size Setting"),
            su("Snap"),
          ],
        }),
        item("Panel/Panel Lib", { sub: [su("General"), su("Theme")] }),
        item("Common Font Family"),
        item("Drawing", { onClick: () => actions.openSettings("drawing") }),
        item("Property", { onClick: () => actions.openSettings("property") }),
        item("Hotkey", { onClick: () => actions.openSettings("hotkey") }),
        item("Top toolbar"),
        item("Save", { onClick: () => actions.openSettings("save") }),
      ],
    },
    {
      id: "help",
      label: "Help",
      key: "H",
      items: [
        item("community"),
        item("Tutorials", { k: "F1" }),
        item("Contact"),
        item("Online chat"),
        item("About..", { icon: "doc" }),
        dv,
        item("Video Capture..."),
        item("Performance Diagnostic..."),
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
        item("Full Screen", { k: "F11", icon: "fullscreen" }),
        check("Top Toolbar"),
        check("Left-Side panel", "["),
        check("Right-Side Panel", "]"),
        check("Bottom-Side Panel", "/", true),
        item("Window Arrangement", {
          sub: [
            su("Tile Horizontally (H)"),
            su("Tile Vertically (V)"),
            su("Tile Vertically (V)"),
            su("Marge All (M)"),
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
        item("3D File", { onClick: () => actions.openModal("export3dFile") }),
        item("3D Shell File", { onClick: () => actions.openModal("export3dShell") }),
        item("PNG"),
      ],
    },
    {
      id: "setting",
      label: "Setting",
      key: "I",
      items: [
        item("System", { icon: "sys", sub: [su("General"), su("Common"), su("Common Library")] }),
        item("Schematic/Symbol", { sub: [su("General"), su("Theme")] }),
        item("PCB/Footprint", {
          sub: [
            su("General"),
            su("Theme"),
            su("Common Grid/Snap Sie setting"),
            su("Common Track Width Setting"),
            su("Common Via Size Setting"),
            su("Snap"),
          ],
        }),
        item("Panel/Panel Lib", { sub: [su("General"), su("Theme")] }),
        item("Common Font Family"),
        item("Drawing", { onClick: () => actions.openSettings("drawing") }),
        item("Property", { onClick: () => actions.openSettings("property") }),
        item("Hotkey", { onClick: () => actions.openSettings("hotkey") }),
        item("Top toolbar"),
        item("Save", { onClick: () => actions.openSettings("save") }),
      ],
    },
    {
      id: "help",
      label: "Help",
      key: "H",
      items: [
        item("community"),
        item("Tutorials", { k: "F1" }),
        item("Contact"),
        item("Online chat"),
        item("About..", { icon: "doc" }),
        dv,
        item("Video Capture..."),
        item("Performance Diagnostic..."),
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
export function buildCtxItems(state: PcbState, actions: PcbActions) {
  const dv = { divider: true };
  const hasSel = (state.selectedIds || []).length > 0;
  const hasClip = (state.clipboardObjects || []).length > 0;
  const selObj = hasSel ? state.objects.find((o) => o.id === state.selectedIds[0]) : null;
  const selKind = selObj?.kind;
  const inPcb = state.mode === 'pcb';
  const items: any[] = [];

  if (hasSel) {
    items.push({ label: 'Cut', k: 'Ctrl+X', icon: 'cut', onClick: () => { actions.cutSelection(); actions.closeAll(); } });
    items.push({ label: 'Copy', k: 'Ctrl+C', icon: 'copy', onClick: () => { actions.copySelection(); actions.closeAll(); } });
  }
  if (hasClip) {
    items.push({ label: 'Paste', k: 'Ctrl+V', icon: 'paste', onClick: () => { actions.pasteClipboard(); actions.closeAll(); } });
  }
  if (hasSel || hasClip) items.push(dv);

  if (hasSel) {
    items.push({ label: 'Duplicate', k: 'Ctrl+D', icon: 'dup', onClick: () => { actions.copySelection(); actions.pasteClipboard(); actions.closeAll(); } });
    items.push({ label: 'Rotate 90°', k: 'Space', icon: 'rot', onClick: () => { actions.rotateSelectedPlaced(90); actions.closeAll(); } });
    items.push({ label: 'Flip Horizontal', k: '', icon: 'rot', onClick: () => { actions.flipSelectedH(); actions.closeAll(); } });
    items.push({ label: 'Flip Vertical', k: '', icon: 'rot', onClick: () => { actions.flipSelectedV(); actions.closeAll(); } });
    items.push(dv);
    items.push({ label: 'Bring to Front', k: ']', icon: 'layer', onClick: () => { actions.bringFront(); actions.closeAll(); } });
    items.push({ label: 'Send to Back', k: '[', icon: 'layer', onClick: () => { actions.sendBack(); actions.closeAll(); } });
    items.push(dv);

    // ── PCB kind-specific items ─────────────────────────────────────────
    if (inPcb && selKind === 'track') {
      items.push({ label: 'Add Tear Drop', k: '', icon: 'wire', onClick: () => actions.openModal('tearDrop') });
      items.push({ label: 'Assign to Net Class…', k: '', icon: 'wire', onClick: () => actions.openModal('netClass') });
      items.push(dv);
    }
    if (inPcb && (selKind === 'via' || selKind === 'pad')) {
      items.push({ label: 'Add Tear Drop', k: '', icon: 'wire', onClick: () => actions.openModal('tearDrop') });
      items.push({ label: 'Remove Unused Pad…', k: '', icon: 'del', onClick: () => actions.openModal('removeUnusedPad') });
      items.push(dv);
    }
    if (inPcb && (selKind === 'polygon' || selKind === 'fillRegion')) {
      items.push({ label: 'Edit Copper…', k: '', icon: 'foot', onClick: () => actions.openModal('copper') });
      items.push(dv);
    }
    if (inPcb && selKind === 'component') {
      items.push({ label: 'Footprint Manager…', k: '', icon: 'foot', onClick: () => actions.openManager('footprint') });
      items.push({ label: 'Annotate Designator…', k: '', icon: 'prop', onClick: () => actions.openModal('annotate') });
      items.push(dv);
    }
    if (!inPcb && (selKind === 'wire' || selKind === 'bus')) {
      items.push({ label: 'Place Net Label', k: 'N', icon: 'pNetLabel', onClick: () => { actions.setTool('netLabel'); actions.closeAll(); } });
      items.push(dv);
    }

    items.push({ label: 'Find Similar', k: '', icon: 'find', onClick: () => { actions.openModal('findReplace'); } });
    items.push({ label: 'Properties', k: '', icon: 'prop', onClick: () => { actions.setRightTab('properties'); actions.closeAll(); } });
    items.push({ label: 'Delete', k: 'Del', icon: 'del', onClick: () => { actions.deleteSelected(); actions.closeAll(); } });
  } else {
    // No selection: defaults
    items.push({ label: 'Select All', k: 'Ctrl+A', icon: 'blank', onClick: () => { actions.selectAll(); actions.closeAll(); } });
    items.push({ label: 'Zoom Fit', k: 'Ctrl+0', icon: 'fit', onClick: () => { actions.zoomFit(); actions.closeAll(); } });
    items.push(dv);
    items.push({ label: 'Settings…', k: '', icon: 'sys', onClick: () => actions.openSettings() });
  }

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
