// Settings › the PCB editor's own settings (spec 2026-10-19 D12): one global
// record for the 2D/schematic Settings overlay and the 3D Setting dialogs,
// the v1 → v2 migration that keeps every saved 3D value, field-by-field
// repair, the one Measurement Unit default and who wins over it.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  PCB_APP_SETTINGS_VERSION,
  defaultPcbAppSettings,
  normalizePcbAppSettings,
  readPcbAppSettings,
  writePcbAppSettings,
  appSettingsOf,
  appSettingsPatch,
  overlayTruth,
  DIALOG_TRUTH,
} = await import("../../.tmp-test/lib/pcb/app-settings.js");
const {
  PCB_APP_SETTINGS_KEY,
  DEFAULT_MEASUREMENT_UNIT,
  MEASUREMENT_UNIT_LABELS,
  unitFrom,
  docUnitOf,
  boardUnitFor,
  packageUnitFor,
  readMeasurementUnit,
} = await import("../../.tmp-test/lib/pcb/measurement-unit.js");
const { initialState, DEFAULT_HOTKEYS, TOOLBAR_CATALOGS } = await import("../../.tmp-test/lib/pcb/types.js");

class MemStorage {
  constructor(entries = {}, { refuse = false, broken = false } = {}) {
    this.map = new Map(Object.entries(entries));
    this.refuse = refuse;
    this.broken = broken;
  }
  getItem(k) {
    if (this.broken) throw new Error("SecurityError");
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    if (this.refuse) throw new Error("QuotaExceededError");
    this.map.set(k, String(v));
  }
}

test("the key is the one the 3D dialogs always used; the record is versioned", () => {
  assert.equal(PCB_APP_SETTINGS_KEY, "ideeza:pcb:appSettings");
  assert.equal(PCB_APP_SETTINGS_VERSION, 2);
  assert.equal(defaultPcbAppSettings().version, 2);
});

test("nothing stored reads as the defaults: millimetres, the overlay's own defaults, no dialog values", () => {
  for (const raw of [null, undefined, "x", 4, [], {}]) {
    const s = normalizePcbAppSettings(raw);
    assert.equal(s.measurementUnit, "mm");
    assert.deepEqual(s.dialogs, {});
    assert.deepEqual(s.overlay.saveSettings, initialState.saveSettings);
    assert.deepEqual(s.overlay.hotkeys, DEFAULT_HOTKEYS);
    assert.deepEqual(s.overlay.toolbarCustomization, initialState.toolbarCustomization);
  }
  assert.equal(DEFAULT_MEASUREMENT_UNIT, "mm");
});

test("v1 (the 3D dialogs' flat values) migrates: the unit label becomes the id, every other value is kept", () => {
  const v1 = {
    measurementUnit: "Inches",
    language: "Deutsch",
    autoSave: false,
    silkFont: "Ideeza Mono",
    sidebarFields: ["Board Material", "Board Color"],
    threeDToolbar: ["Pan (Hand Tool)"],
    junk: { nested: true },
  };
  const s = normalizePcbAppSettings(v1);
  assert.equal(s.version, 2);
  assert.equal(s.measurementUnit, "inch");
  assert.deepEqual(s.dialogs, {
    language: "Deutsch",
    autoSave: false,
    silkFont: "Ideeza Mono",
    sidebarFields: ["Board Material", "Board Color"],
    threeDToolbar: ["Pan (Hand Tool)"],
  });
  // The overlay was never stored before v2: it starts on its defaults.
  assert.deepEqual(s.overlay.systemSettings, initialState.systemSettings);
});

test("each v1 unit label maps to its unit; an unknown one falls back to millimetres", () => {
  assert.equal(normalizePcbAppSettings({ measurementUnit: "Millimeters (mm)" }).measurementUnit, "mm");
  assert.equal(normalizePcbAppSettings({ measurementUnit: "Mils" }).measurementUnit, "mil");
  assert.equal(normalizePcbAppSettings({ measurementUnit: "Furlongs" }).measurementUnit, "mm");
  for (const [u, label] of Object.entries(MEASUREMENT_UNIT_LABELS)) assert.equal(unitFrom(label), u);
});

test("v2 round-trips through storage unchanged", () => {
  const s = defaultPcbAppSettings();
  s.measurementUnit = "mil";
  s.dialogs = { language: "English", autoTeardrops: true };
  s.overlay.fonts = { ...s.overlay.fonts, selected: "Roboto" };
  s.overlay.saveSettings = { ...s.overlay.saveSettings, interval: 15, compress: false };
  s.overlay.hotkeys = s.overlay.hotkeys.map((h) => (h.id === 4 ? { ...h, key: "Ctrl+Shift+Z" } : h));
  s.overlay.propertySettings = {
    rows: [...s.overlay.propertySettings.rows, { id: "p_9", property: "Tolerance", object: "PCB Default", displayInCanvas: "Hide" }],
    selectedId: null,
  };
  const storage = new MemStorage();
  assert.equal(writePcbAppSettings(s, storage), true);
  assert.deepEqual(readPcbAppSettings(storage), s);
});

test("a broken field falls back alone; the rest is kept", () => {
  const good = defaultPcbAppSettings();
  const raw = JSON.parse(JSON.stringify(good));
  raw.measurementUnit = "parsec";
  raw.overlay.saveSettings.interval = "often";
  raw.overlay.saveSettings.backups = 10;
  raw.overlay.fonts.selected = "Comic Sans Pro";
  raw.overlay.systemSettings.subPage = "nowhere";
  raw.overlay.systemSettings.docMode = "expert";
  raw.overlay.systemSettings.showWelcomeScreen = true;
  raw.overlay.hotkeys = [{ id: 4, function: "Renamed by hand", key: "Ctrl+U" }, { id: 999, function: "Ghost", key: "Q" }, "nope"];
  raw.overlay.toolbarCustomization.pcb = ["select", "not-a-tool", 7];
  raw.overlay.toolbarCustomization.scope = "cockpit";
  raw.overlay.propertySettings = { rows: [{ id: "p_1", property: "Name" }, { id: "p_2", property: "Designator", object: "Schematic Default", displayInCanvas: "Show" }], selectedId: "p_2" };
  raw.overlay.pcbFootprintSettings.trackWidths = [4, "x", 12];
  raw.overlay.panelLibSettings.lineStyles[0].style = "Zigzag";
  raw.dialogs = { language: "English", bad: { x: 1 }, list: ["a", 2] };

  const s = normalizePcbAppSettings(raw);
  assert.equal(s.measurementUnit, "mm");
  assert.equal(s.overlay.saveSettings.interval, good.overlay.saveSettings.interval);
  assert.equal(s.overlay.saveSettings.backups, 10);
  assert.equal(s.overlay.fonts.selected, good.overlay.fonts.selected);
  assert.deepEqual(s.overlay.fonts.common, good.overlay.fonts.common);
  assert.equal(s.overlay.systemSettings.subPage, "general");
  assert.equal(s.overlay.systemSettings.docMode, "easy");
  assert.equal(s.overlay.systemSettings.showWelcomeScreen, true);
  // Hotkeys: the editable key is kept, the app's own name wins, strangers go.
  assert.equal(s.overlay.hotkeys.length, DEFAULT_HOTKEYS.length);
  const undo = s.overlay.hotkeys.find((h) => h.id === 4);
  assert.equal(undo.key, "Ctrl+U");
  assert.equal(undo.function, "Undo");
  assert.ok(!s.overlay.hotkeys.some((h) => h.id === 999));
  const catalog = new Set(TOOLBAR_CATALOGS.pcb.map((t) => t.id));
  assert.ok(s.overlay.toolbarCustomization.pcb.every((id) => catalog.has(id)));
  assert.deepEqual(s.overlay.toolbarCustomization.pcb, ["select"]);
  assert.equal(s.overlay.toolbarCustomization.scope, "schematic");
  // A list the maker builds keeps its well-formed rows and drops the rest.
  assert.deepEqual(s.overlay.propertySettings.rows.map((r) => r.id), ["p_2"]);
  assert.equal(s.overlay.propertySettings.selectedId, null);
  assert.deepEqual(s.overlay.pcbFootprintSettings.trackWidths, [4, 12]);
  assert.equal(s.overlay.panelLibSettings.lineStyles[0].style, good.overlay.panelLibSettings.lineStyles[0].style);
  assert.deepEqual(s.dialogs, { language: "English" });
});

test("reading never throws, and a refused write says so", () => {
  assert.deepEqual(readPcbAppSettings(new MemStorage({}, { broken: true })), defaultPcbAppSettings());
  assert.deepEqual(readPcbAppSettings(new MemStorage({ [PCB_APP_SETTINGS_KEY]: "{not json" })), defaultPcbAppSettings());
  assert.deepEqual(readPcbAppSettings(null), defaultPcbAppSettings());
  assert.equal(writePcbAppSettings(defaultPcbAppSettings(), new MemStorage({}, { refuse: true })), false);
  assert.equal(writePcbAppSettings(defaultPcbAppSettings(), null), false);
});

test("the editor state and the record convert both ways (one record for both settings systems)", () => {
  const s = defaultPcbAppSettings();
  s.measurementUnit = "inch";
  s.dialogs = { autoTeardrops: true };
  s.overlay.fonts = { ...s.overlay.fonts, selected: "Georgia" };
  const state = { ...initialState, ...appSettingsPatch(s) };
  assert.equal(state.measurementUnit, "inch");
  assert.equal(state.fonts.selected, "Georgia");
  assert.deepEqual(state.dialogSettings, { autoTeardrops: true });
  assert.deepEqual(appSettingsOf(state), s);
  // What the overlay is showing (a tab, a picked row) is not a setting.
  const browsing = { ...state, systemSettings: { ...state.systemSettings, subPage: "category" }, propertySettings: { ...state.propertySettings, selectedId: "p_1" } };
  assert.equal(appSettingsOf(browsing).overlay.propertySettings.selectedId, null);
});

test("a board's own unit wins; a board without one starts on the default", () => {
  assert.equal(boardUnitFor("Mil", "mm"), "Mil");
  assert.equal(boardUnitFor("Inch", "mil"), "Inch");
  assert.equal(boardUnitFor("mm", "inch"), "mm");
  assert.equal(boardUnitFor(undefined, "inch"), "Inch");
  assert.equal(boardUnitFor("furlong", "mil"), "Mil");
  assert.equal(docUnitOf("mm"), "mm");
  assert.equal(docUnitOf("mil"), "Mil");
  assert.equal(docUnitOf("inch"), "Inch");
});

test("a part draft's own unit wins; a new draft starts on the default", () => {
  assert.equal(packageUnitFor("mil", "inch"), "mil");
  assert.equal(packageUnitFor(undefined, "inch"), "inch");
  assert.equal(packageUnitFor("Mils", "mm"), "mm");
});

test("the parts flow reads the default straight from the record, v1 or v2", () => {
  assert.equal(readMeasurementUnit(new MemStorage()), "mm");
  assert.equal(readMeasurementUnit(new MemStorage({ [PCB_APP_SETTINGS_KEY]: JSON.stringify({ measurementUnit: "Mils" }) })), "mil");
  assert.equal(readMeasurementUnit(new MemStorage({ [PCB_APP_SETTINGS_KEY]: JSON.stringify({ version: 2, measurementUnit: "inch" }) })), "inch");
  assert.equal(readMeasurementUnit(new MemStorage({}, { broken: true })), "mm");
});

test("every overlay page and 3D dialog says what it does today; live pages say nothing extra", () => {
  for (const page of ["system", "drawing", "hotkey", "property", "save", "font", "footprint", "panel", "symbol"]) {
    assert.equal(typeof overlayTruth(page, "general"), "string", page);
  }
  assert.match(overlayTruth("system", "general"), /Measurement unit applies now/);
  assert.equal(overlayTruth("toptools", "schematic"), null);
  assert.equal(overlayTruth("toptools", "pcb"), null);
  assert.equal(typeof overlayTruth("toptools", "symbol"), "string");
  assert.match(overlayTruth("footprint", "layer"), /this board now/);
  for (const id of ["set3dSysGeneral", "set3dSysCommon", "set3dSysLib", "set3dPanelGeneral", "set3dPanelTheme", "set3dFont", "set3dDrawing", "set3dProperty"]) {
    assert.equal(typeof DIALOG_TRUTH[id], "string", id);
  }
  // Plain copy: no em-dash standing in for a full stop.
  for (const line of [...Object.values(DIALOG_TRUTH), overlayTruth("save", "general"), overlayTruth("hotkey", "general")]) {
    assert.ok(!line.includes("—"), line);
  }
});
