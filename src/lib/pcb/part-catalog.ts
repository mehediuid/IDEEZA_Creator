// Part + Agile-Module catalogue behind the Insert ▸ Place a Part dialog.
//
// The picker's left rail and its attribute filters are real queries over this
// data — not decoration. Two of the rails are derived from what the user has
// actually done (Recent from placements, Project from the open board) and two
// are user-owned lists persisted in localStorage (Favorite, Personal).

import { familyOf, type CanvasObject } from "./types";

export type CatalogPart = {
  id: string;
  /** Manufacturer part number — what the row is titled with. */
  part: string;
  /** Package / footprint, e.g. "0402", "SOT-23-6". Drives the Package filter. */
  pkg: string;
  mfr: string;
  price: string;
  stock: string;
  /** Free-text capability tags, drives the Features filter. */
  features: string[];
  /** Placed object kind — a real schematic symbol, never a generic box. */
  kind: string;
};

/** Agile Module — a reusable multi-part block placed as one object. */
export type AgileModule = {
  id: string;
  name: string;
  summary: string;
  /** Part references the block is built from (shown as its content). */
  parts: string[];
  features: string[];
};

export const PART_CATALOG: CatalogPart[] = [
  { id: "p1", part: "AP4313KTR-G1", pkg: "SOT-23-6", mfr: "DIODES", price: "$0.0829", stock: "90,080", features: ["Regulator", "Adjustable"], kind: "ic" },
  { id: "p2", part: "INA180A2IDBVR", pkg: "SOT-23-5", mfr: "TI", price: "$0.1805", stock: "86,910", features: ["Current sense", "Amplifier"], kind: "ic" },
  { id: "p3", part: "LAN7800-I/9JX", pkg: "QFN-56", mfr: "Microchip", price: "$4.9200", stock: "218,430", features: ["USB", "Ethernet"], kind: "ic" },
  { id: "p4", part: "ESP32-C3-MINI-1", pkg: "SMD-53", mfr: "Espressif", price: "$1.6500", stock: "42,300", features: ["MCU", "Wi-Fi", "Bluetooth"], kind: "ic" },
  { id: "p5", part: "STM32G031F6P6", pkg: "TSSOP-20", mfr: "ST", price: "$0.8400", stock: "31,900", features: ["MCU", "Low power"], kind: "ic" },
  { id: "p6", part: "GRM155R71C104KA88D", pkg: "0402", mfr: "Murata", price: "$0.0038", stock: "1,015,195", features: ["Capacitor", "X7R"], kind: "capacitor" },
  { id: "p7", part: "CL10A106MP8NNNC", pkg: "0603", mfr: "Samsung", price: "$0.0164", stock: "620,400", features: ["Capacitor", "Bulk"], kind: "capacitor" },
  { id: "p8", part: "RC0402FR-0710KL", pkg: "0402", mfr: "Yageo", price: "$0.0012", stock: "2,051,765", features: ["Resistor", "1%"], kind: "resistor" },
  { id: "p9", part: "RC0603FR-07100RL", pkg: "0603", mfr: "Yageo", price: "$0.0014", stock: "1,740,220", features: ["Resistor", "1%"], kind: "resistor" },
  { id: "p10", part: "SRN4018-100M", pkg: "1806", mfr: "Bourns", price: "$0.1120", stock: "58,600", features: ["Inductor", "Power"], kind: "inductor" },
  { id: "p11", part: "1N4148W-7-F", pkg: "SOD-123", mfr: "DIODES", price: "$0.0142", stock: "410,700", features: ["Diode", "Switching"], kind: "diode" },
  { id: "p12", part: "SS34", pkg: "SMA", mfr: "MDD", price: "$0.0290", stock: "160,240", features: ["Diode", "Schottky"], kind: "diode" },
  { id: "p13", part: "BSS138", pkg: "SOT-23", mfr: "onsemi", price: "$0.0410", stock: "220,910", features: ["MOSFET", "Level shift"], kind: "transistor" },
  { id: "p14", part: "USB4110-GF-A", pkg: "USB-C-16P", mfr: "GCT", price: "$0.4800", stock: "24,110", features: ["Connector", "USB-C"], kind: "connector" },
  { id: "p15", part: "PJ-320A", pkg: "TH-5P", mfr: "Xkb", price: "$0.0930", stock: "77,050", features: ["Connector", "Audio"], kind: "connector" },
];

export const MODULE_CATALOG: AgileModule[] = [
  { id: "m1", name: "USB-C Power Input", summary: "5 V input with ESD and bulk decoupling", parts: ["USB4110-GF-A", "SS34", "CL10A106MP8NNNC"], features: ["Power", "USB-C"] },
  { id: "m2", name: "ESP32-C3 Core", summary: "MCU with boot strapping, decoupling and antenna keep-out", parts: ["ESP32-C3-MINI-1", "GRM155R71C104KA88D", "RC0402FR-0710KL"], features: ["MCU", "Wi-Fi"] },
  { id: "m3", name: "Buck 5 V → 3V3", summary: "Adjustable regulator with feedback divider", parts: ["AP4313KTR-G1", "SRN4018-100M", "RC0603FR-07100RL"], features: ["Power", "Regulator"] },
  { id: "m4", name: "High-Side Current Sense", summary: "Shunt + amplifier scaled for 0–3 A", parts: ["INA180A2IDBVR", "RC0402FR-0710KL"], features: ["Measurement", "Analog"] },
  { id: "m5", name: "Level Shifter 3V3 ⇄ 5 V", summary: "Bidirectional MOSFET pair with pull-ups", parts: ["BSS138", "RC0603FR-07100RL"], features: ["Interface", "Level shift"] },
];

export const PICKER_RAILS = ["System", "Recent", "Personal", "Favorite", "Project"] as const;
export type PickerRail = (typeof PICKER_RAILS)[number];

const FAVORITES_KEY = "ideeza:pcb:partFavorites";
const RECENTS_KEY = "ideeza:pcb:partRecents";
const PERSONAL_KEY = "ideeza:pcb:partPersonal";
// Parts the user authored via Project ▸ New ▸ Part — full catalogue rows, so
// every filter, search and placement path treats them like any other part.
const PERSONAL_PARTS_KEY = "ideeza:pcb:personalParts";
// Modules the user captured from a selection via Project ▸ New ▸ Agile Module —
// the captured objects travel with the row, so placing one re-creates the block.
const PERSONAL_MODULES_KEY = "ideeza:pcb:personalModules";
const RECENTS_MAX = 12;

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, v: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}

export const readFavorites = () => readList(FAVORITES_KEY);
export const readRecents = () => readList(RECENTS_KEY);
/** Parts the user authored — empty until the part editor exists. */
export const readPersonal = () => [...readList(PERSONAL_KEY), ...readPersonalParts().map((p) => p.id)];

/** Catalogue rows the user authored (New ▸ Part), newest last. */
export function readPersonalParts(): CatalogPart[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PERSONAL_PARTS_KEY);
    const v = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(v)) return [];
    return v
      .filter((x) => x && typeof x.name === "string" && x.name.trim())
      .map((x, i) => ({
        id: `own_${i}_${String(x.mpn || x.name).replace(/\s+/g, "").slice(0, 16)}`,
        part: String(x.mpn || x.name),
        pkg: String(x.pkg || "—"),
        mfr: String(x.maker || "Personal"),
        price: "—",
        stock: "own",
        features: ["Personal"],
        kind: String(x.symbol || "component"),
      }));
  } catch {
    return [];
  }
}

/** The catalogue plus the user's own parts — one list for every query. */
export const allParts = (): CatalogPart[] => [...PART_CATALOG, ...readPersonalParts()];

/** An Agile Module the user captured, with the objects it was captured from. */
export type PersonalModule = AgileModule & { objects: Record<string, unknown>[] };

/** Modules the user captured (New ▸ Agile Module), newest last. */
export function readPersonalModules(): PersonalModule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PERSONAL_MODULES_KEY);
    const v = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(v)) return [];
    return v
      .filter((x) => x && typeof x.name === "string" && x.name.trim() && Array.isArray(x.objects))
      .map((x, i) => {
        const objs = (x.objects as Record<string, unknown>[]).filter((o) => o && typeof o.kind === "string");
        // Family names, not kind ids — the Contains column is user-facing copy.
        const kinds = [...new Set(objs.map((o) => familyOf(String(o.kind))))];
        return {
          id: `ownmod_${i}_${String(x.name).replace(/\s+/g, "").slice(0, 16)}`,
          name: String(x.name),
          summary: `Captured in this browser — ${objs.length} object${objs.length === 1 ? "" : "s"}`,
          parts: kinds,
          features: ["Personal"],
          objects: objs,
        };
      });
  } catch {
    return [];
  }
}

/** The module catalogue plus the user's own — one list for every query. */
export const allModules = (): AgileModule[] => [...MODULE_CATALOG, ...readPersonalModules()];

export function toggleFavorite(id: string): string[] {
  const cur = readFavorites();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  writeList(FAVORITES_KEY, next);
  return next;
}

/** Record a placement so the Recent rail reflects real work, most recent first. */
export function pushRecent(id: string): string[] {
  const next = [id, ...readRecents().filter((x) => x !== id)].slice(0, RECENTS_MAX);
  writeList(RECENTS_KEY, next);
  return next;
}

/** Catalogue entries whose part number is already placed on this board. */
export function projectPartIds(objects: CanvasObject[]): string[] {
  const onBoard = new Set(
    objects.flatMap((o) => [o.text, o.comment, o.footprint].filter(Boolean) as string[]),
  );
  return allParts().filter((p) => onBoard.has(p.part) || onBoard.has(p.pkg)).map((p) => p.id);
}

/** The rows a rail shows. Order matters for Recent (most recent first). */
export function partsForRail(
  rail: PickerRail,
  ctx: { favorites: string[]; recents: string[]; personal: string[]; projectIds: string[] },
): CatalogPart[] {
  const byId = new Map(allParts().map((p) => [p.id, p]));
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter(Boolean) as CatalogPart[];
  switch (rail) {
    case "Recent":
      return pick(ctx.recents);
    case "Favorite":
      return pick(ctx.favorites);
    case "Personal":
      return pick(ctx.personal);
    case "Project":
      return pick(ctx.projectIds);
    default:
      return allParts();
  }
}

/** Why a rail is empty — the picker teaches instead of showing a blank table. */
export const RAIL_EMPTY: Record<PickerRail, string> = {
  System: "No parts in the catalogue.",
  Recent: "Nothing placed yet — parts you place show up here.",
  Personal: "No parts of your own yet — Project ▸ New ▸ Part creates one.",
  Favorite: "No favourites yet — star a part to keep it here.",
  Project: "This board has no catalogue parts on it yet.",
};

export const uniqueSorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

/** Attribute filter options, derived from the catalogue so they can't drift. */
export const packageOptions = () => uniqueSorted(allParts().map((p) => p.pkg));
export const manufacturerOptions = () => uniqueSorted(allParts().map((p) => p.mfr));
export const featureOptions = () => uniqueSorted(allParts().flatMap((p) => p.features));

export type PartFilters = { pkg: string; mfr: string; feature: string; query: string };
export const NO_FILTERS: PartFilters = { pkg: "", mfr: "", feature: "", query: "" };

export function filterParts(rows: CatalogPart[], f: PartFilters): CatalogPart[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter(
    (p) =>
      (!f.pkg || p.pkg === f.pkg) &&
      (!f.mfr || p.mfr === f.mfr) &&
      (!f.feature || p.features.includes(f.feature)) &&
      (q.length < 2 ||
        p.part.toLowerCase().includes(q) ||
        p.mfr.toLowerCase().includes(q) ||
        p.features.some((t) => t.toLowerCase().includes(q))),
  );
}

export function filterModules(rows: AgileModule[], f: PartFilters): AgileModule[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter(
    (m) =>
      (!f.feature || m.features.includes(f.feature)) &&
      (q.length < 2 ||
        m.name.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.parts.some((p) => p.toLowerCase().includes(q))),
  );
}
