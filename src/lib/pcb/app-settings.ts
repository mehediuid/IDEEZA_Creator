// The PCB editor's settings: one global record, `ideeza:pcb:appSettings`
// (settings spec 2026-10-19, D12), shared by the 2D/schematic Settings
// overlay and the 3D view's Setting dialogs, so a value changed in one shows
// in the other and survives a reload. Not per product: a board's own unit,
// grid and layers stay in its document (`ideeza:pcb:doc:…`).
//
// v1 (before 2026-10-19) was the 3D dialogs' flat field map, e.g.
// `{ measurementUnit: "Millimeters (mm)", language: "English", autoSave: true }`,
// and the overlay was not kept at all. v2 keeps every v1 value (in `dialogs`)
// and adds the overlay's pages. Reading never throws: a missing, broken or
// older record falls back field by field, so one bad value never resets the rest.

import {
  DEFAULT_DRAWINGS,
  DEFAULT_FONTS,
  DEFAULT_HOTKEYS,
  DEFAULT_PANEL_LIB_SETTINGS,
  DEFAULT_PCB_FOOTPRINT_SETTINGS,
  DEFAULT_PROPERTY_ROWS,
  DEFAULT_SCHEM_SYMBOL_SETTINGS,
  DEFAULT_SYSTEM_SETTINGS,
  DEFAULT_TOOLBAR_CUSTOMIZATION,
  TOOLBAR_CATALOGS,
  type PcbDialogValue,
  type PcbState,
  type SettingsPage,
  type ToolbarScope,
} from "./types";
import {
  DEFAULT_MEASUREMENT_UNIT,
  PCB_APP_SETTINGS_KEY,
  unitFrom,
  type MeasurementUnit,
} from "./measurement-unit";

export const PCB_APP_SETTINGS_VERSION = 2;

/** The overlay's pages, as the store holds them. */
export const OVERLAY_KEYS = [
  "systemSettings",
  "propertySettings",
  "hotkeys",
  "drawings",
  "fonts",
  "saveSettings",
  "schemSymbolSettings",
  "pcbFootprintSettings",
  "panelLibSettings",
  "toolbarCustomization",
] as const;
export type OverlayKey = (typeof OVERLAY_KEYS)[number];
export type OverlaySettings = Pick<PcbState, OverlayKey>;

export type PcbAppSettings = {
  version: 2;
  measurementUnit: MeasurementUnit;
  overlay: OverlaySettings;
  /** The 3D Setting dialogs' own fields, by field key. */
  dialogs: Record<string, PcbDialogValue>;
};

/** The store fields this record is made of. */
export type AppSettingsFields = Pick<PcbState, OverlayKey | "measurementUnit" | "dialogSettings">;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function defaultOverlay(): OverlaySettings {
  return clone({
    systemSettings: DEFAULT_SYSTEM_SETTINGS,
    propertySettings: { rows: DEFAULT_PROPERTY_ROWS, selectedId: null },
    hotkeys: DEFAULT_HOTKEYS,
    drawings: DEFAULT_DRAWINGS,
    fonts: { common: DEFAULT_FONTS, selected: "Inter" },
    saveSettings: { interval: 5, backups: 3, location: "Cloud + Local", compress: true, onExit: true },
    schemSymbolSettings: DEFAULT_SCHEM_SYMBOL_SETTINGS,
    pcbFootprintSettings: DEFAULT_PCB_FOOTPRINT_SETTINGS,
    panelLibSettings: DEFAULT_PANEL_LIB_SETTINGS,
    toolbarCustomization: DEFAULT_TOOLBAR_CUSTOMIZATION,
  });
}

export function defaultPcbAppSettings(): PcbAppSettings {
  return { version: 2, measurementUnit: DEFAULT_MEASUREMENT_UNIT, overlay: defaultOverlay(), dialogs: {} };
}

// ─────────────────────────────── normalizing ──────────────────────────────

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

/** Lists the maker builds (adds to, removes from, reorders): kept as stored,
 *  minus any item that isn't well formed. */
const OWN_LISTS = new Set([
  "propertySettings.rows",
  "pcbFootprintSettings.trackWidths",
  "toolbarCustomization.schematic",
  "toolbarCustomization.symbol",
  "toolbarCustomization.pcb",
  "toolbarCustomization.panel",
]);
/** The app's own words on a fixed list's rows: never taken from storage. */
const APP_FIELDS = new Set(["id", "label", "name", "function", "comment"]);

const sameType = (def: unknown, v: unknown) =>
  typeof v === typeof def && (typeof v !== "number" || Number.isFinite(v));

/** Same shape as `sample`: every key it has, of the same type. */
function wellFormed(sample: unknown, v: unknown): boolean {
  if (isObj(sample)) return isObj(v) && Object.keys(sample).every((k) => sameType(sample[k], v[k]));
  return sameType(sample, v);
}

/** `raw` shaped like `def`: each value of the right type is kept, anything
 *  else is the default's. Fixed lists of rows (hotkeys, colours, categories)
 *  merge row by row on `id`, in the app's order and with the app's labels. */
function like<T>(def: T, raw: unknown, path: string): T {
  if (Array.isArray(def)) {
    if (!Array.isArray(raw)) return def;
    const sample = def[0] as unknown;
    if (OWN_LISTS.has(path)) {
      return (sample === undefined ? def : raw.filter((x) => wellFormed(sample, x))) as T;
    }
    if (isObj(sample) && "id" in sample) {
      return def.map((d) => {
        const r = raw.find((x) => isObj(x) && x.id === (d as Obj).id);
        if (!isObj(r)) return d;
        const out: Obj = { ...(d as Obj) };
        for (const k of Object.keys(d as Obj)) {
          if (!APP_FIELDS.has(k)) out[k] = like((d as Obj)[k], r[k], `${path}[].${k}`);
        }
        return out;
      }) as T;
    }
    return def;
  }
  if (isObj(def)) {
    if (!isObj(raw)) return def;
    const out: Obj = {};
    for (const k of Object.keys(def)) out[k] = like(def[k], raw[k], path ? `${path}.${k}` : k);
    return out as T;
  }
  if (def === null) return def;
  return sameType(def, raw) ? (raw as T) : def;
}

const oneOf = <T extends string>(v: string, list: readonly T[], d: T): T =>
  (list as readonly string[]).includes(v) ? (v as T) : d;

const SYSTEM_TABS = ["general", "category", "libDevice", "libPanel"] as const;
const SYMBOL_TABS = ["general", "theme"] as const;
const FOOTPRINT_TABS = ["general", "theme", "layer", "gridCart", "gridPolar", "trackWidth", "snap"] as const;
const PANEL_TABS = ["general", "theme", "themeLine", "themeStroke"] as const;
const LINE_STYLES = ["Solid", "Dashed", "Dotted", "Dash-Dot"] as const;
const SCOPES: readonly ToolbarScope[] = ["schematic", "symbol", "pcb", "panel"];

function normalizeOverlay(raw: unknown): OverlaySettings {
  const def = defaultOverlay();
  const o = like(def, raw, "");
  const sys = o.systemSettings;
  sys.subPage = oneOf(sys.subPage, SYSTEM_TABS, "general");
  sys.docMode = oneOf(sys.docMode, ["easy", "professional"] as const, "easy");
  o.schemSymbolSettings.subPage = oneOf(o.schemSymbolSettings.subPage, SYMBOL_TABS, "general");
  o.pcbFootprintSettings.subPage = oneOf(o.pcbFootprintSettings.subPage, FOOTPRINT_TABS, "general");
  o.panelLibSettings.subPage = oneOf(o.panelLibSettings.subPage, PANEL_TABS, "general");
  o.panelLibSettings.lineStyles = o.panelLibSettings.lineStyles.map((l, i) => ({
    ...l,
    style: oneOf(l.style, LINE_STYLES, def.panelLibSettings.lineStyles[i].style),
  }));
  const tb = o.toolbarCustomization;
  tb.scope = oneOf(tb.scope, SCOPES, "schematic");
  for (const sc of SCOPES) {
    const ids = new Set(TOOLBAR_CATALOGS[sc].map((t) => t.id));
    tb[sc] = [...new Set(tb[sc].filter((id) => ids.has(id)))];
  }
  if (!o.fonts.common.includes(o.fonts.selected)) o.fonts.selected = def.fonts.selected;
  o.propertySettings.selectedId = null;
  return o;
}

const isDialogValue = (v: unknown): v is PcbDialogValue =>
  typeof v === "string" || typeof v === "boolean" || (Array.isArray(v) && v.every((x) => typeof x === "string"));

function dialogValues(raw: unknown, skip: readonly string[] = []): Record<string, PcbDialogValue> {
  const out: Record<string, PcbDialogValue> = {};
  if (!isObj(raw)) return out;
  for (const [k, v] of Object.entries(raw)) if (!skip.includes(k) && isDialogValue(v)) out[k] = v;
  return out;
}

/** Any stored value → a complete v2 record. */
export function normalizePcbAppSettings(raw: unknown): PcbAppSettings {
  if (!isObj(raw)) return defaultPcbAppSettings();
  const measurementUnit = unitFrom(raw.measurementUnit) ?? DEFAULT_MEASUREMENT_UNIT;
  if (raw.version === PCB_APP_SETTINGS_VERSION) {
    return {
      version: 2,
      measurementUnit,
      overlay: normalizeOverlay(raw.overlay),
      dialogs: dialogValues(raw.dialogs),
    };
  }
  // v1: the 3D dialogs' flat map. Every value but the unit moves to `dialogs`.
  return {
    version: 2,
    measurementUnit,
    overlay: defaultOverlay(),
    dialogs: dialogValues(raw, ["measurementUnit", "version"]),
  };
}

export function readPcbAppSettings(storage: Pick<Storage, "getItem"> | null): PcbAppSettings {
  try {
    const raw = storage?.getItem(PCB_APP_SETTINGS_KEY);
    return normalizePcbAppSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultPcbAppSettings();
  }
}

/** False when storage refused it (full, or blocked site data). */
export function writePcbAppSettings(s: PcbAppSettings, storage: Pick<Storage, "setItem"> | null): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PCB_APP_SETTINGS_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────── the store's fields ───────────────────────────

/** The record a store state holds. What the overlay is pointing at (a picked
 *  Property row) is not a setting. */
export function appSettingsOf(state: AppSettingsFields): PcbAppSettings {
  const overlay = {} as Record<OverlayKey, unknown>;
  for (const k of OVERLAY_KEYS) overlay[k] = state[k];
  const o = overlay as OverlaySettings;
  return {
    version: 2,
    measurementUnit: state.measurementUnit,
    overlay: { ...o, propertySettings: { ...o.propertySettings, selectedId: null } },
    dialogs: state.dialogSettings,
  };
}

/** The store fields a record sets. */
export function appSettingsPatch(s: PcbAppSettings): AppSettingsFields {
  return { ...s.overlay, measurementUnit: s.measurementUnit, dialogSettings: s.dialogs };
}

// ──────────────────────────── what each page does ─────────────────────────
// No silent controls: each overlay page and 3D dialog opens with one line
// saying which of its values the editor acts on today.

const NOT_YET = "Saved in this browser. The editor doesn't use these yet.";

/** The line over an overlay page (`sub` = its open tab), or null when every
 *  value on it is live. */
export function overlayTruth(page: SettingsPage, sub: string): string | null {
  switch (page) {
    case "system":
      return sub === "general"
        ? "Measurement unit applies now. The other choices here are saved in this browser; the editor doesn't use them yet."
        : NOT_YET;
    case "save":
      return "Your work already saves as you go: each change is kept in this browser a moment after you make it. These choices are saved but don't change that yet.";
    case "hotkey":
      return "Saved in this browser. The editor's keys don't follow this list yet.";
    case "footprint":
      return sub === "layer" ? "Layer color and visibility change this board now." : NOT_YET;
    case "toptools":
      return sub === "schematic" || sub === "pcb"
        ? null
        : "Saved in this browser. The symbol and panel editors don't read this list yet.";
    default:
      return NOT_YET;
  }
}

/** The line over each 3D Setting dialog. */
export const DIALOG_TRUTH: Record<string, string> = {
  set3dSysGeneral:
    "Measurement unit applies now. Reopen last project and Show startup tips are saved in this browser; the editor doesn't use them yet.",
  set3dSysCommon: NOT_YET,
  set3dSysLib: NOT_YET,
  set3dPanelGeneral: NOT_YET,
  set3dPanelTheme: NOT_YET,
  set3dFont: "The font is the one the Common Fonts page picks. Saved in this browser; the editor doesn't draw text in it yet.",
  set3dDrawing: NOT_YET,
  set3dProperty: NOT_YET,
};
