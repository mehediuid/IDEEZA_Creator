// @ts-nocheck
// IDEEZA PCB Software — data builders (menus, tree, context menu).
// Ported from the prototype. `iconEl(x)` is reduced to the raw SVG string `x`,
// which components render via <Icon html={...} />. Handlers route through the store.
import { ic } from "./icons";
import { C } from "./colors";
import { exportKicadPcb, exportGerberViaKicad } from "./kicad-export";
import { GRID_PRESETS } from "./types";
import type { PcbState } from "./types";

// ── Grid & snap, shared by View ▸ Grid Size and the board's right-click menu
// so the two surfaces can't drift apart (UIUX-54/57). ────────────────────────
/** Snap is stored in mil; the grid is in the document's unit. */
const gridToMil = (v, unit) => {
  const n = parseFloat(v);
  if (!isFinite(n)) return null;
  const u = String(unit || "Inch").toLowerCase();
  return u === "mil" ? n : u === "mm" ? n / 0.0254 : n * 1000;
};
export const keepRatioOn = (state) => (state.boardSettings ?? {}).gridKeepRatio === true;
/** Set the grid; with Keep Ratio on, snap follows it instead of drifting. */
export const pickGridSize = (state, actions, g) => {
  actions.setGridSize(g);
  if (!keepRatioOn(state)) return;
  const mil = gridToMil(g, state.unit);
  if (mil != null) actions.setBoardSetting("snapSize", Math.round(mil * 1000) / 1000);
};
export const toggleKeepRatio = (state, actions) =>
  actions.setBoardSetting("gridKeepRatio", !keepRatioOn(state));
/**
 * Grid and snap already live in the right panel's Document section, so the
 * menu rows reveal that rather than opening a third copy of the same fields.
 * It is the nothing-selected panel, hence the deselect.
 */
export const openGridSettingsPanel = (state, actions) => {
  actions.selectMany([]);
  actions.setRightTab("properties");
  if (state.viewTog["Right-Side Panel"] === false) actions.toggleView("Right-Side Panel");
};
/** Snap presets offered by the right-click menu, in mil. */
export const SNAP_PRESETS = [1, 2, 5, 10, 25];
import type { PcbActions } from "./store";

// (An earlier generic `buildMenus` lived here. It was superseded by the three
// mode-aware builders below — `buildMenusSchematic`, `buildMenus2D`,
// `buildMenus3D` — and nothing imported it, so it is gone rather than left as
// a second, silently-diverging copy of the menu IA.)

// Schematic-side menu bar — per the "In Schematic Side" spec sheet.
// Eight menus (File / Edit / View / Place / Design / Layout / Export / Setting);
// items marked "Remove" on the sheet (Board Shape, Reannotate, Convert to New
// Version, Insert BOM Table, Generate Data From Chatbot, Import Image) are
// intentionally absent.
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
    disabled: !!o.disabled,
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
  // Panel toggles. `o.tog` is the internal viewTog key; `label` is what the
  // user reads — so the wording can change without renaming persisted state.
  const check = (label, k = "", o = {}) => {
    const key = o.tog || label;
    const on = o.bottom ? state.bottomOpen : state.viewTog[key] !== false;
    return {
      label,
      k,
      submenu: false,
      hasSub: false,
      icon: on ? "check" : "blank",
      sub: [],
      onClick: () => (o.bottom ? actions.toggleBottom() : actions.toggleView(key)),
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
  // Same symbol kind, different rail name stamped on the placed object.
  const rail = (t, text) => () => actions.setToolAs(t, text);
  const toastSu = (label, msg) => su(label, "", { onClick: () => actions.flashToast(msg ?? `${label.replace(/…$/, "")} — coming soon`) });

  const data = [
    {
      id: "file",
      label: "File",
      key: "F",
      items: [
        // New ▸ — five entries. Project reuses the manual create flow's
        // Project Information dialog; Schematic adds a real sheet. The three
        // that have no engine behind them yet are disabled with a reason
        // rather than shipped as toasts.
        item("New", {
          k: "Ctrl+N",
          icon: "page",
          sub: [
            su("Project", "", { icon: "folder", onClick: () => actions.openModal("newProject") }),
            su("Board", "", { icon: "board", disabled: true, note: "One board per project for now — multi-board documents aren't modelled yet." }),
            su("Schematic", "", { icon: "page", onClick: () => { actions.addSheet(); actions.flashToast("New schematic sheet added"); actions.closeAll(); } }),
            su("New Part", "", { icon: "pChip", disabled: true, note: "Needs the part editor — not built yet." }),
            su("Agile Module", "", { icon: "tDevReuse", disabled: true, note: "Needs the module editor — not built yet." }),
          ],
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
        // The three "Move by <anchor>" rows all armed `setTool("move")`, which no
        // handler implements — so they toasted an anchor and did nothing. Grab-move
        // is the schematic's one Move; the exact-offset "Move by step…" is the
        // board menu's row only (UIUX-34) — grid + snap cover the sheet.
        item("Move", { k: "M", icon: "tMoveGrab", onClick: () => actions.startMoveSelected() }),
        item("Find & replace", { k: "Ctrl+F", icon: "find", onClick: () => actions.openModal("findReplace") }),
        item("Duplicate in grid", { icon: "array", onClick: () => actions.openModal("array") }),
      ],
    },
    {
      id: "view",
      label: "View",
      key: "V",
      // View reads top-to-bottom as three questions: how close am I (zoom),
      // what is the sheet doing under my cursor (grid/snap/units), and which
      // panels are up. Panels are named after what they hold, not where they
      // sit. Theme is deliberately absent — it lives in Setting ▸ System.
      items: [
        item("Zoom In", { k: "I", icon: "zoomin", onClick: () => actions.zoomIn() }),
        item("Zoom Out", { k: "O", icon: "zoomout", onClick: () => actions.zoomOut() }),
        item("Zoom to Fit", { k: "F", icon: "fit", onClick: () => actions.zoomFit("all") }),
        item("Zoom to Selection", { icon: "fitsel", onClick: () => actions.zoomFit("selection") }),
        dv,
        item("Grid Size", {
          k: "G",
          icon: "grid",
          sub: ["0.1", "0.05", "0.02", "0.01"].map((g) =>
            su(`${g} inch`, "", { icon: state.gridSize === g ? "check" : "blank", onClick: () => actions.setGridSize(g) }),
          ),
        }),
        snapToggle(),
        // Schematic units are inch · mm.
        item("Units", {
          icon: "ruler",
          sub: [["Inch", "Inches"], ["mm", "Millimetres"]].map(([u, label]) =>
            su(label, "", { icon: state.unit === u ? "check" : "blank", onClick: () => actions.setUnit(u) }),
          ),
        }),
        dv,
        check("Toolbar", "", { tog: "Top Toolbar" }),
        check("Navigator", "[", { tog: "Left-Side panel" }),
        check("Properties", "]", { tog: "Right-Side Panel" }),
        check("Console", "/", { bottom: true }),
      ],
    },
    {
      id: "place",
      label: "Place",
      key: "P",
      items: [
        item("Place a Part", { icon: "pChip", onClick: () => actions.openModal("devicePicker") }),
        // Agile Module rides directly under Place a Part — both drop a ready
        // block on the sheet, and the module is a first-class way in (UIUX-4).
        item("Agile Module", { icon: "tDevReuse", onClick: tool("reuseBlock") }),
        item("Wire", { k: "Alt+W", icon: "pWire", onClick: tool("wire") }),
        // Each row places its own symbol under its own name — VCC, -5V and GND
        // used to arm a generic net flag ("F1"), which is not what they say.
        // Two menus, not one list (UIUX-98): a supply and a return are opposite
        // ends of the same net, and you reach for one or the other, never scan
        // both. Each supply rides the same symbol under its own name, so the
        // netlist really carries VCC / +12V / -12V as separate nets.
        item("Power", {
          icon: "pwrRailMenu",
          sub: [
            su("VCC", "V", { icon: "pwrVcc", onClick: rail("vcc5v", "VCC") }),
            su("+5V", "", { icon: "pwr5v", onClick: rail("vcc5v", "+5V") }),
            su("+12V", "", { icon: "pwr12v", onClick: rail("vcc5v", "+12V") }),
            su("-5V", "", { icon: "pwrN5v", onClick: rail("vcc5v", "-5V") }),
            su("-12V", "", { icon: "pwrN12v", onClick: rail("vcc5v", "-12V") }),
          ],
        }),
        item("Ground", {
          icon: "pwrGndMenu",
          sub: [
            su("GND", "", { icon: "pwrGnd", onClick: tool("gnd") }),
            // Digital ground — the GND symbol under its own name, so the
            // netlist really carries a separate DGND net.
            su("DGND", "", { icon: "pwrDgnd", onClick: rail("gnd", "DGND") }),
            su("Analog GND", "", { icon: "pwrAgnd", onClick: tool("agnd") }),
            su("Power GND", "", { icon: "pwrPgnd", onClick: tool("pgnd") }),
          ],
        }),
        // The left palette keeps one Net Label button (the local label you
        // reach for constantly); the rest of the label family lives here, so
        // every kind stays placeable without a five-deep flyout on the canvas.
        // It sits right under the supplies — both name what a node *is*
        // (UIUX-32).
        // UIUX-33 — two rows, and the parent no longer shares a name with its
        // own child. The other five label kinds moved to the canvas palette's
        // Net Label flyout rather than being deleted: cutting them from here
        // would have taken them out of ⌘K too, and left them unplaceable.
        item("Net Markers", {
          k: "Alt+N",
          icon: "pNetLabel",
          sub: [
            su("Net Label", "Alt+N", { icon: "pNetLabel", onClick: tool("netLabel") }),
            su("Net Flag", "", { icon: "pNetFlag", onClick: tool("netFlag") }),
          ],
        }),
        item("Bus", { k: "Alt+B", icon: "pBus", onClick: tool("bus") }),
        item("No Connect", { icon: "pNoConnect", onClick: tool("noConnect") }),
        item("Junction", { icon: "pJunction", onClick: tool("junction") }),
        // UIUX-31: Differential Pair, Keep-out area and Part mask are board
        // work, not schematic insertions — diff-pair routing lives in the 2D
        // Route menu and the PCB palette. The diff-pair *tag* stays: it marks
        // a pair on the sheet, which is where that marking belongs.
        item("Diff-pair tag", { icon: "pDiffFlag", onClick: tool("diffPairFlag") }),
        dv,
        // Drawing primitives.
        item("Polyline", { k: "Alt+L", icon: "pPolyline", onClick: tool("polyline") }),
        item("Arc", { k: "Alt+A", icon: "pArc", onClick: tool("arc") }),
        item("Bezier", { k: "Alt+Z", icon: "pBezier", onClick: tool("bezier") }),
        item("Circle", { k: "Alt+C", icon: "pCircle", onClick: tool("circle") }),
        item("Rectangle", { k: "Alt+R", icon: "pRect", onClick: tool("rectangle") }),
        dv,
        // Annotation objects — their own group, not drawing primitives.
        item("Text", { k: "Alt+T", icon: "pText", onClick: tool("text") }),
        item("Image", { icon: "pImage", onClick: tool("image") }),
        item("Table", { icon: "pTable", onClick: () => actions.openModal("tableProps") }),
      ],
    },
    {
      id: "design",
      label: "Design",
      key: "D",
      items: [
        item("Generate PCB", { k: "Alt+I", icon: "dConvert", onClick: () => actions.convertSchematicToPcb() }),
        dv,
        // The sheet's rules are electrical — "Design rules" pointed at the
        // board's DRC, and the row now carries the toolbar's own ERC glyph so
        // both doors to the same checker look alike (UIUX-6).
        item("Electrical Rules", { icon: "dErc", onClick: () => actions.openModal("designRules") }),
        item("Run electrical check (ERC)", { icon: "dCheck", onClick: () => actions.runErcCheck() }),
        item("Diff-pair manager", { icon: "dCross", onClick: () => actions.openModal("diffPair") }),
        dv,
        item("Import 3D Model…", { icon: "cube", onClick: () => actions.openModal("importGltf") }),
        // Annotate Designator is gone from here and from the toolbar (UIUX-3):
        // parts number themselves as they land. Re-numbering a whole sheet
        // stays available on a component's right-click menu.
      ],
    },
    // Arrange — ordered by what the geometry does: relate objects to each
    // other (group), to a shared edge (align), to even spacing (distribute),
    // then transform them, then re-stack them. Submenu labels drop the
    // repeated verb; the two stacking commands are flat (only two, always
    // relevant), so no submenu is worth the extra hop.
    {
      id: "layout",
      label: "Layout",
      key: "L",
      items: [
        item("Group", { k: "Ctrl+G", icon: "group", onClick: () => actions.groupSelection() }),
        item("Ungroup", { k: "Ctrl+Shift+G", icon: "ungroup", onClick: () => actions.ungroupSelection() }),
        dv,
        item("Align", {
          icon: "align",
          sub: [
            su("Left edges", "", { icon: "alignLeft", onClick: () => actions.alignSelected("left") }),
            su("Horizontal centers", "", { icon: "alignHCenter", onClick: () => actions.alignSelected("hcenter") }),
            su("Right edges", "", { icon: "alignRight", onClick: () => actions.alignSelected("right") }),
            dv,
            su("Top edges", "", { icon: "alignTop", onClick: () => actions.alignSelected("top") }),
            su("Vertical centers", "", { icon: "alignVCenter", onClick: () => actions.alignSelected("vcenter") }),
            su("Bottom edges", "", { icon: "alignBottom", onClick: () => actions.alignSelected("bottom") }),
          ],
        }),
        item("Space evenly", {
          icon: "distribute",
          sub: [
            su("Across", "", { icon: "distribute", onClick: () => actions.alignSelected("distH") }),
            su("Down", "", { icon: "distributeV", onClick: () => actions.alignSelected("distV") }),
          ],
        }),
        dv,
        item("Rotate", {
          icon: "rot",
          sub: [
            su("90° counter-clockwise", "", { icon: "tRotLeft", onClick: () => actions.rotateSelectedPlaced(-90) }),
            su("90° clockwise", "", { icon: "tRotRight", onClick: () => actions.rotateSelectedPlaced(90) }),
          ],
        }),
        item("Mirror", {
          icon: "flip",
          sub: [
            su("Left ↔ right", "", { icon: "flip", onClick: () => actions.flipSelectedH() }),
            su("Top ↔ bottom", "", { icon: "flipV", onClick: () => actions.flipSelectedV() }),
          ],
        }),
        // Z-order left this menu to match the board's Arrange, where it went
        // first; the right sidebar's Position panel is its one home (UIUX-5).
        // The ] / [ shortcuts still work.
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
        // UIUX-67: the sheet's own export dialog — captures the live schematic
        // (frame + title block included); the board's PDF stays in the 2D menu.
        item("Sheet (PDF · PNG · SVG)…", { icon: "pdf", onClick: () => actions.openModal("exportSheet") }),
        dv,
        item("Design files", { icon: "cube", onClick: () => actions.openModal("exportDesignFiles") }),
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
        item("Community", { icon: "community" }),
        item("Tutorials", { k: "F1", icon: "tutorial" }),
        item("Contact", { icon: "contact" }),
        item("Online chat", { icon: "chat" }),
        item("About", { icon: "about" }),
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
    disabled: !!o.disabled,
    note: o.note,
    onClick: o.onClick || close,
  });
  // top-level item; pass `sub` for a hover flyout
  // UIUX-86/92/97 — every board area is drawn, not stamped: one shape picker
  // (Rectangle · Circle · Polygon) reused by every row instead of six copies.
  const areaSub = (kind) => [
    su("Rectangle", "", { icon: "pRect", onClick: () => actions.setTool(`area:${kind}:rect`) }),
    su("Circle", "", { icon: "pCircle", onClick: () => actions.setTool(`area:${kind}:circle`) }),
    su("Polygon", "", { icon: "tPolygon", onClick: () => actions.setTool(`area:${kind}:polygon`) }),
  ];
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

  // UIUX-57/58 — this flyout was an EasyEDA transcription in which no row did
  // anything: five identical placeholders ("0.015,0.051mm | 2.0,2,mil"), a
  // keep-ratio row with no state behind it, and two settings rows that opened
  // nothing. Every row is real now, and the presets are the same list the
  // toolbar's grid-size dropdown offers, so the two can't drift apart.
  const keepRatio = keepRatioOn(state);
  const pickGrid = (g) => pickGridSize(state, actions, g);
  const openGridSettings = () => openGridSettingsPanel(state, actions);
  const gridFlyout = [
    ...GRID_PRESETS.map((g) =>
      su(`${g} ${state.unit || "Inch"}`, "", {
        icon: state.gridSize === g ? "check" : "blank",
        onClick: () => pickGrid(g),
      }),
    ),
    dv,
    su("Grid/Snap keep Ratio", "", {
      icon: keepRatio ? "check" : "blank",
      onClick: () => actions.setBoardSetting("gridKeepRatio", !keepRatio),
    }),
    su("Grid & snap settings…", "", { icon: "grid", onClick: openGridSettings }),
    su("Grid range settings…", "", { icon: "fitarea", onClick: openGridSettings }),
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
        // #79 — three rows, each doing real work (no toasts, no dead rows).
        item("New", {
          k: "Ctrl+N",
          icon: "page",
          sub: [
            // Part… and Agile Module… left the board (UIUX-75): the PCB is
            // downstream of the sheet, so a part authored here would have no
            // symbol to come from. Both keep their home in the schematic's
            // Project ▸ New.
            su("PCB", "", { icon: "board", onClick: () => actions.createPcbDoc() }),
          ],
        }),
        // #78 — the projects the user already created, listed in the menu; the
        // dialog stays one row below for workspace/filter and New Window.
        item("Open Project", {
          k: "Ctrl+O",
          icon: "folder",
          sub: [
            ...(state.recentProjects.length
              ? state.recentProjects.slice(0, 8).map((pr) =>
                  su(pr.name, "", { icon: "folder", onClick: () => actions.openManualProject(pr.id, pr.slug) }),
                )
              : [su("No projects yet — Project ▸ New", "", { disabled: true, note: "Create a project first" })]),
            dv,
            su("Browse all projects…", "", { icon: "folder", onClick: () => actions.openModal("openProject") }),
          ],
        }),
        item("Save", { k: "Ctrl+S", icon: "save", onClick: () => actions.saveDoc() }),
        item("Save All", { k: "Ctrl+Shift+S", icon: "save", onClick: () => actions.saveDoc() }),
        dv,
        // PDF Part 2: per-format importer cascade (PCB formats).
        item("Import", {
          icon: "imp",
          sub: [
            su("DXF…", "", { icon: "imp", onClick: () => actions.openModal("importDfx") }),
            su("Image…", "", { icon: "pImage", onClick: () => actions.openModal("importImage") }),
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
        // #86 — Move grabs the selection for real (`setTool("move")` armed a
        // tool with no handler); Move by step nudges it by an exact offset.
        item("Move", { k: "M", icon: "tMoveGrab", onClick: () => actions.startMoveSelected() }),
        snapToggle(),
        item("Find & replace", { k: "Ctrl+F", icon: "find", onClick: () => actions.openModal("findReplace") }),
        dv,
        // "Edit Outline" opened a dialog whose Confirm armed `editOutline` — a
        // tool id with no handler, so nothing could be edited. Vertex editing
        // needs an engine we don't have; until then the palette's Board Outline
        // tools (rectangle / circle / polygon) are how an outline is drawn.
        item("Cutout", { icon: "del", sub: areaSub("cutout") }),
        dv,
        item("Add Chamfer", { icon: "dChamfer", onClick: () => { actions.setCornerOp({ mode: "chamfer" }); actions.openModal("chamferFillet"); } }),
        item("Add Fillet", { icon: "dFillet", onClick: () => { actions.setCornerOp({ mode: "fillet" }); actions.openModal("chamferFillet"); } }),
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
        // #90/#110 — Place a Part, Pad and Via left this menu: the board's quick
        // row on the top toolbar is their declared single home. Board Outline is
        // the left palette's (three shape variants a menu row can't carry, and
        // the one-click tool this row armed placed a degenerate 2×2 outline).
        item("Suture Vias…", { icon: "tSutureVias", onClick: () => actions.openModal("sutureVias") }),
        // Copper Area and Fill Area moved here from Design (UIUX-96): they are
        // things you place, so they belong with the other regions. The pour
        // *operations* they feed stayed in Design, where board-level work lives.
        item("Copper Area", { icon: "tCopperArea", sub: areaSub("polygon") }),
        item("Fill Area", { icon: "tFillArea", sub: areaSub("fillRegion") }),
        item("Slot Region", { icon: "tSlot", sub: areaSub("slot") }),
        item("Prohibited Region", { icon: "pNoConnect", sub: areaSub("prohibitedRegion") }),
        item("Constraint Region", { icon: "rectIn", sub: areaSub("constraintRegion") }),
        dv,
        // The palette's Shapes flyout and this row arm the same tools, so the
        // menu carries the same list instead of only the first one (UIUX-9).
        item("Line", { icon: "pPolyline", sub: [
          su("Line", "", { icon: "pPolyline", onClick: () => actions.setTool("line") }),
          su("Polyline", "", { icon: "pPolyline", onClick: () => actions.setTool("polyline") }),
          su("Rectangle", "", { icon: "pRect", onClick: () => actions.setTool("rectangle") }),
          su("Circle", "", { icon: "pCircle", onClick: () => actions.setTool("circle") }),
          su("Ellipse", "", { icon: "pEllipse", onClick: () => actions.setTool("ellipse") }),
          su("Arc", "", { icon: "pArc", onClick: () => actions.setTool("arc") }),
        ] }),
        item("Dimension", { icon: "measure", onClick: () => actions.setTool("dimension") }),
        item("Text", { icon: "pText", onClick: () => actions.setTool("text") }),
        item("Image", { icon: "pImage", onClick: () => actions.setTool("image") }),
        item("Table", { icon: "pTable", onClick: () => actions.openModal("tableProps") }),
        item("Canvas Origin", { icon: "ruler", onClick: () => actions.setTool("canvasOrigin") }),
      ],
    },
    // Phase 7 — Design menu (IT-646).
    {
      id: "design",
      label: "Design",
      key: "D",
      items: [
        item("Import Changes From Schematic", { k: "Alt+I", icon: "dConvert", onClick: () => actions.importChangesFromSchematic() }),
        item("Design rules", { icon: "dDrc", onClick: () => actions.openModal("pcbDrc") }),
        item("Diff-pair manager", { icon: "dCross", onClick: () => actions.openModal("diffPair") }),
        dv,
        // #94/95 — the copper region lives here with the pour operations that
        // make it real copper. (Fill Region is the top toolbar's — #110.)
        // Copper Area and Fill Area are placements, so they live in Insert
        // (UIUX-96). What stays here is the pour work they feed.
        // Draw a copper ring and it fills itself — the pour is the point, so it
        // is its own row rather than a shape hidden under Copper Area (UIUX-87).
        item("Polygon Pour", { icon: "tCopperArea", onClick: () => actions.armPolygonPour() }),
        item("Pour / Rebuild copper", { icon: "tPolygon", onClick: () => actions.pourRegions() }),
        // Board-wide, not per-region (UIUX-88).
        item("Fill All Planes", { icon: "tFillArea", onClick: () => actions.fillAllPlanes() }),
        item("Remove all pours", { icon: "del", onClick: () => actions.clearPours() }),
        dv,
        // Copper fillets where a track meets a pad or via — real geometry, so
        // the DRC, the 3D view and the exporters see them like any copper.
        item("Teardrop", {
          icon: "tCopperArea",
          sub: [
            su("Add to all joints", "", { icon: "tCopperArea", onClick: () => actions.addTeardrops(false) }),
            su("Add to selected tracks", "", {
              icon: "tCopperArea",
              disabled: !state.selectedIds.length,
              note: state.selectedIds.length ? undefined : "Select one or more tracks",
              onClick: () => actions.addTeardrops(true),
            }),
            dv,
            su("Remove all teardrops", "", { icon: "del", onClick: () => actions.removeTeardrops() }),
          ],
        }),
        dv,
        // #101 — Import DXF/Image live in Project ▸ Import, their one home.
        item("Manage Layer", { icon: "layer", onClick: () => actions.openModal("layerManager") }),
        item("Footprint Manager", { icon: "foot", onClick: () => actions.openManager("footprint") }),
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
        dv,
        // PDF Part 2 (Popup 6): grouping / length-matching managers.
        item("Net Class Manager", { icon: "wire", onClick: () => actions.openModal("netClass") }),
        item("Equal Length Group Manager", { icon: "tLengthTune", onClick: () => actions.openModal("equalLength") }),
        item("Pad Pair Group Manager", { icon: "tPad", onClick: () => actions.openModal("padPair") }),
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
        item("Gloss Selected Track", { icon: "tGloss", onClick: () => actions.flashToast("Glossed selected tracks") }),
        dv,
        item("Equal Length Tuning", { icon: "tLenTune", onClick: () => actions.openModal("equalLength") }),
        item("Differential Pair Equal Length Tuning", { icon: "tDiffLenTune", onClick: () => actions.openModal("equalLength") }),
        dv,
        item("Auto Routing", { icon: "tAutoRoute", onClick: () => actions.autoRoute() }),
        // #103 — Routing Mode is about obstacles (the 45/90 shapes moved to
        // Routing Corner, where they belong). Every option drives the draft.
        item("Routing Mode", {
          icon: "route",
          sub: [
            su("Ignore obstacles", "", { icon: state.routingMode === "ignore" ? "check" : "blank", onClick: () => actions.setRoutingMode("ignore") }),
            su("Walk around obstacles", "", { icon: state.routingMode === "walkaround" ? "check" : "blank", onClick: () => actions.setRoutingMode("walkaround") }),
            su("Push obstacles", "", { icon: state.routingMode === "push" ? "check" : "blank", onClick: () => actions.setRoutingMode("push") }),
          ],
        }),
        // #104 — Routing Corner is the angle of the bend.
        item("Routing Corner", {
          icon: "tRouteCorner",
          sub: [
            su("Any angle", "", { icon: state.routingCorner === "any" ? "check" : "blank", onClick: () => actions.setRoutingCorner("any") }),
            su("45°", "", { icon: state.routingCorner === "45" ? "check" : "blank", onClick: () => actions.setRoutingCorner("45") }),
            su("90°", "", { icon: state.routingCorner === "90" ? "check" : "blank", onClick: () => actions.setRoutingCorner("90") }),
          ],
        }),
        item("Routing Width…", { icon: "tRouteWidth", onClick: () => actions.openModal("routingWidth") }),
        dv,
        item("Unroute", { icon: "del", onClick: () => actions.flashToast("Unrouted") }),
        // "Remove Loop" left this menu (UIUX-19) — Unroute above it is the real
        // command, and the row only toasted.
      ],
    },
    // Phase 8 — Layout menu (IT-513). Already-built primitives (Group / Align
    // / Distribute / Rotate / Flip / Level) surfaced from the toolbar.
    {
      id: "layout",
      label: "Layout",
      key: "L",
      items: [
        item("Group", {
          icon: "group",
          sub: (() => {
            const n = state.selectedIds.length;
            const inGroup = state.objects.some(
              (o) => state.selectedIds.includes(o.id) && (o.props as Record<string, unknown> | undefined)?.groupId,
            );
            return [
              su("Group selected", "Ctrl+G", {
                icon: "group",
                disabled: n < 2,
                note: n < 2 ? "Select 2 or more objects" : undefined,
                onClick: () => actions.groupSelection(),
              }),
              su("Ungroup selected", "Ctrl+Shift+G", {
                icon: "ungroup",
                disabled: !inGroup,
                note: inGroup ? undefined : "Selection isn't in a group",
                onClick: () => actions.ungroupSelection(),
              }),
              dv,
              su("Select group members", "", {
                disabled: !inGroup,
                note: inGroup ? undefined : "Select an object that belongs to a group",
                onClick: () => actions.selectGroupMembers(),
              }),
            ];
          })(),
        }),
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
        item("Design files", { icon: "cube", onClick: () => actions.openModal("exportDesignFiles") }),
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
        item("Community", { icon: "community" }),
        item("Tutorials", { k: "F1", icon: "tutorial" }),
        item("Contact", { icon: "contact" }),
        item("Online chat", { icon: "chat" }),
        item("About", { icon: "about" }),
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
  // Panel toggles: `o.tog` is the internal viewTog key, `label` is what the
  // user reads — so wording can change without touching persisted state.
  const check = (label, k = "", o = {}) => {
    const key = o.tog || label;
    const on = o.bottom ? state.bottomOpen : state.viewTog[key] !== false;
    return {
      label,
      k,
      submenu: false,
      hasSub: false,
      icon: on ? "check" : "blank",
      sub: [],
      onClick: () => (o.bottom ? actions.toggleBottom() : actions.toggleView(key)),
    };
  };

  const data = [
    {
      id: "view",
      label: "View",
      key: "V",
      items: [
        item("Full screen", { k: "F11", icon: "fullscreen", onClick: () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch {} actions.closeAll(); } }),
        // #132 — panels named for what they hold (the schematic's vocabulary),
        // #133 — Window Arrangement gone: its four rows did nothing at all.
        check("Toolbar", "", { tog: "Top Toolbar" }),
        check("Navigator", "[", { tog: "Left-Side panel" }),
        check("Properties", "]", { tog: "Right-Side Panel" }),
        check("Console", "\\", { bottom: true }),
        check("View controls", "", { tog: "Floating Tool" }),
      ],
    },
    {
      id: "export",
      label: "Export",
      key: "R",
      items: [
        // #131 — each row names the file it produces, not EasyEDA's shorthand.
        item("3D model (STL / OBJ)…", { icon: "cube", onClick: () => actions.openModal("export3dFile") }),
        item("Enclosure shell…", { icon: "cube", onClick: () => actions.openModal("export3dShell") }),
        item("3D model (GLB)", { icon: "cube", onClick: () => actions.exportGlb() }),
        item("Snapshot (PNG)", { icon: "png", onClick: () => actions.export3dPng() }),
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
        item("About", { icon: "about" }),
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
  const inGroup = state.objects.some(
    (o) => (state.selectedIds || []).includes(o.id) && (o.props || {}).groupId,
  );
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
  // Cross Probe works both ways: a schematic symbol finds the footprint that
  // Convert linked to it, a footprint walks its own sourceId back to the symbol.
  const probeTarget = selObj
    ? state.objects.find((o) => o.sourceId === selObj.id) ??
      (selObj.sourceId ? state.objects.find((o) => o.id === selObj.sourceId) : undefined)
    : null;

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
    items.push(A('Cross Probe', 'find', '', () => selObj && actions.crossProbe(selObj.id), !probeTarget,
      !probeTarget ? 'Select a converted component to jump to its PCB footprint' : 'Jump to the linked PCB footprint'));
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
    // ─────────────── PCB 2D ───────────────
    // UIUX-54 — the board's right-click had none of the everyday commands, so
    // copying or deleting meant reaching for the keyboard or the menu bar.
    // Each is the same action its shortcut and menu row already run.
    items.push(A('Copy', 'copy', 'Ctrl+C', () => actions.copySelection(), !hasSel,
      !hasSel ? 'Select something to copy' : undefined));
    items.push(A('Paste', 'paste', 'Ctrl+V', () => actions.pasteClipboard(), !hasClip));
    items.push(A('Delete', 'del', 'Del', () => actions.deleteSelected(), !hasSel,
      !hasSel ? 'Select something to delete' : undefined));
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
    items.push(A('Cross Probe', 'dCross', '', () => selObj && actions.crossProbe(selObj.id), !probeTarget,
      !probeTarget ? 'Select a converted footprint to jump back to its schematic symbol' : 'Jump to the linked schematic symbol'));
    items.push(A('Unhighlight All', 'wire', '', () => actions.unhighlightAll(), !state.highlightedNet, !state.highlightedNet ? 'Nothing is highlighted' : undefined));
    items.push({ label: 'Filter', icon: 'filter', submenu: filterSubmenu('pcb', [
      ['all', 'Common'], ['track', 'Only Track'], ['padvia', 'Only Pad / Via'], ['copper', 'Only Copper Region'],
    ]) });
    items.push(dv);
    items.push(A('Fit All in Window', 'fit', 'K', () => actions.zoomFit('all')));
    items.push(A('Zoom In', 'zoomin', 'I', () => actions.zoomIn()));
    items.push(A('Zoom Out', 'zoomout', 'O', () => actions.zoomOut()));
    items.push(dv);
    // Grid and snap, at the cursor rather than a trip to the sidebar. The rows
    // drive the same state the toolbar and the Document panel do (UIUX-54).
    items.push({
      label: 'Grid Size', icon: 'grid',
      submenu: GRID_PRESETS.map((g) => ({
        label: `${g} ${state.unit || 'Inch'}`, icon: state.gridSize === g ? 'check' : 'blank',
        onClick: () => pickGridSize(state, actions, g),
      })),
    });
    items.push({
      label: 'Snap Size', icon: 'snap',
      submenu: SNAP_PRESETS.map((s) => ({
        label: `${s} mil`, icon: Number((state.boardSettings ?? {}).snapSize) === s ? 'check' : 'blank',
        onClick: () => actions.setBoardSetting('snapSize', s),
      })),
    });
    items.push(T('Keep Ratio', 'tGridOptions', keepRatioOn(state), () => toggleKeepRatio(state, actions)));
    items.push(T('Snap', 'tGridOptions', state.snapEnabled, () => actions.toggleSnap()));
    items.push(A('Snap Settings…', 'prop', '', () => openGridSettingsPanel(state, actions)));
    items.push(dv);
    items.push({
      label: 'Group', icon: 'group',
      submenu: [
        A('Group selected', 'group', 'Ctrl+G', () => actions.groupSelection(), state.selectedIds.length < 2,
          state.selectedIds.length < 2 ? 'Select 2 or more objects' : undefined),
        A('Ungroup selected', 'ungroup', 'Ctrl+Shift+G', () => actions.ungroupSelection(), !inGroup,
          !inGroup ? "Selection isn't in a group" : undefined),
        A('Select group members', 'group', '', () => actions.selectGroupMembers(), !inGroup,
          !inGroup ? 'Select an object that belongs to a group' : undefined),
      ],
    });
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

// The panel's destinations. Only which one is current — the segmented control
// in `left-panel.tsx` owns how that looks. It used to hand back `bg: '#fff'`
// and a hardcoded violet, so the active tab was a pure-white slab that could
// not follow the theme.
export function buildLeftTabs(state: PcbState, actions: PcbActions) {
  // "Project", not "Project Design": at the panel's real width the longer label
  // was truncated to "Project Desi…", and the sub-tab row right below already
  // says "Project design", so the two read as the same word twice.
  return ([['project', 'Project'], ['library', 'Library']] as const).map(([k, l]) => ({
    label: l,
    active: state.leftMain === k,
    onClick: () => actions.setLeftMain(k),
  }));
}

export function buildSubTabs(state: PcbState, actions: PcbActions) {
  // 2D / 3D modes collapse the left panel to just the Page tree (Figma 433:251073/252704).
  const defs = state.mode === '2d' || state.mode === '3d'
    // 'Project design' rather than 'Sheets': the tab holds the whole tree —
    // project → schematic sheets *and* the PCB.
    ? ([['page', 'Project design']] as const)
    : ([['page', 'Project design'], ['net', 'Nets'], ['component', 'Parts'], ['object', 'Objects']] as const);
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
  // The PCB tab IS the Schematic→PCB hand-off: `setMode` converts on the first
  // entry, which is why there is no "Convert to PCB" button on the bar. Say so,
  // so the conversion isn't a surprise.
  const hasLayout = (state.objects ?? []).some(
    (o) => o.props?.gen === 'convert' || o.props?.gen === 'route',
  );
  const title: Record<string, string> = {
    schematic: 'Draw the circuit',
    pcb: hasLayout
      ? 'Open the board layout'
      : 'Lay out the board — the schematic is converted to footprints and a ratsnest on the way in',
  };
  return defs.map(([k, l, active]) => ({
    label: l,
    active,
    title: title[k],
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
  // #137 — 3D is a read-only inspection view: a selection filter has nothing to
  // filter there, so the tab is 2D/schematic only.
  const tabs = state.mode === 'schematic'
    ? ([['properties', 'Properties'], ['filter', 'Filter']] as const)
    : state.mode === '3d'
    ? ([['properties', 'Properties'], ['layer', 'Layer']] as const)
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

  // Project = File. Export is its own top-level menu in every mode — it is a
  // destination of its own (manufacturing output), not a File sub-branch.
  const project = by.file ? { ...by.file, label: "Project" } : null;

  const primary = [
    project,
    by.edit,
    relabel(by.place, "Insert"),
    by.design,
    by.route,
    relabel(by.layout, "Arrange"),
    by.view,
    by.export,
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
