// The one Measurement Unit default (settings spec 2026-10-19, D12): chosen in
// the PCB editor's Setting (the 2D overlay's System page or the 3D System —
// General dialog), kept in `ideeza:pcb:appSettings`, and read by the
// schematic, the board and Parts › New Package. A document's own unit wins
// when it has one: a board you already set keeps its unit, a new one starts
// on the default. No imports, so the parts flow can read it without pulling
// in the editor, and node runs it in the tests.

export const MEASUREMENT_UNITS = ["mm", "mil", "inch"] as const;
export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

/** Millimetres: the 3D dialog's own default, the parts flow's, and the one
 *  unit every editor's own unit menu offers. */
export const DEFAULT_MEASUREMENT_UNIT: MeasurementUnit = "mm";

/** The labels the 3D System — General dialog has always shown (and v1 of the
 *  record stored as the value). */
export const MEASUREMENT_UNIT_LABELS: Record<MeasurementUnit, string> = {
  mm: "Millimeters (mm)",
  mil: "Mils",
  inch: "Inches",
};

/** A unit from anything stored or picked: our ids, the dialog labels, or a
 *  board document's own spelling ("mm" · "Mil" · "Inch"). */
export function unitFrom(v: unknown): MeasurementUnit | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if (s === "mm" || s.startsWith("millimet")) return "mm";
  if (s === "mil" || s === "mils") return "mil";
  if (s === "inch" || s === "inches" || s === "in") return "inch";
  return null;
}

/** How a board document spells the unit (its View ▸ Units and Document rows). */
export function docUnitOf(u: MeasurementUnit): "mm" | "Mil" | "Inch" {
  return u === "mil" ? "Mil" : u === "inch" ? "Inch" : "mm";
}

/** A board's unit: its document's own when it has a real one, else the
 *  default, in the document's spelling. */
export function boardUnitFor(docUnit: unknown, fallback: MeasurementUnit): "mm" | "Mil" | "Inch" {
  return docUnitOf(unitFrom(docUnit) ?? fallback);
}

/** A part draft's display unit: the draft's own when it has one, else the default. */
export function packageUnitFor(draftUnit: unknown, fallback: MeasurementUnit): MeasurementUnit {
  return typeof draftUnit === "string" && (MEASUREMENT_UNITS as readonly string[]).includes(draftUnit)
    ? (draftUnit as MeasurementUnit)
    : fallback;
}

export const PCB_APP_SETTINGS_KEY = "ideeza:pcb:appSettings";

/** The default unit as stored — v2 `measurementUnit` ("mm"), v1 the dialog
 *  label ("Millimeters (mm)"). Never throws: blocked or broken storage reads
 *  as the default. */
export function readMeasurementUnit(storage: Pick<Storage, "getItem"> | null): MeasurementUnit {
  try {
    const raw = storage?.getItem(PCB_APP_SETTINGS_KEY);
    const r = raw ? (JSON.parse(raw) as unknown) : null;
    if (r && typeof r === "object") return unitFrom((r as { measurementUnit?: unknown }).measurementUnit) ?? DEFAULT_MEASUREMENT_UNIT;
  } catch {
    // Unreadable storage or a hand-broken record: the default.
  }
  return DEFAULT_MEASUREMENT_UNIT;
}
