// Delete-Objects dialog: map an object kind → its dialog category (or null if
// the dialog doesn't cover it, so it is never deleted). Pure — unit-testable.

import type { DelObjName } from "./types";

export const DEL_SYMBOL_KINDS = new Set([
  "component", "resistor", "resistorBox", "capacitor", "inductor", "diode",
  "currentSource", "opamp", "ic", "connector", "transistor", "led", "crystal",
  "fp0805", "fpSOD123", "fpSOT23", "fpSOIC8",
  "vcc5v", "vcc3v3", "vcc", "gnd", "pgnd", "agnd",
]);

export function delCategoryOf(kind: string): DelObjName | null {
  if (["wire", "bus", "busEntry", "track", "ratsnest"].includes(kind)) return "Wire and Bus";
  if (["text", "note", "field"].includes(kind)) return "Text";
  if (kind === "arc") return "Arc";
  if (kind === "rectangle") return "Rectangle";
  if (["circle", "ellipse"].includes(kind)) return "Circle";
  if (["polyline", "line"].includes(kind)) return "Polyline";
  if (kind === "image") return "Image";
  if (DEL_SYMBOL_KINDS.has(kind)) return "Symbol";
  return null;
}
