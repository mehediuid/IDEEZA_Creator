// The spec in words — the card's facts, the gate's one line per product, the
// review aside — so every surface says the same thing about the same product.

import type { ConceptPart } from "../create/concept";
import { protocolOf } from "../create/confidence";
import { batteryOf } from "./batteries";
import type { ResolvedSpec } from "./types";
import { mm3, runtimeLabel } from "./units";

/** §4.9 #1 — until a fab partner is named, every board is drawn and checked
 *  against this one profile. One constant, so naming a partner is one edit. */
export const FAB_PROFILE =
  "Standard 2-layer — 0.15 mm track/space, 0.3 mm drill, 1.6 mm FR-4, HASL";

export function boardLabel(spec: ResolvedSpec): string {
  return spec.board
    ? `2-layer · ${spec.board.w} × ${spec.board.h} mm · ${spec.board.parts} part${spec.board.parts === 1 ? "" : "s"}`
    : "No board — none of its parts sits on one";
}

export function powerLabel(spec: ResolvedSpec): string {
  if (spec.battery === "none") return "USB powered";
  return runtimeLabel(spec.runtimeH) ?? batteryOf(spec.battery).label;
}

/** "RC Car Controller — 118 × 64 × 38 mm · 2-layer 58 × 42 · ~45 min". */
export function specLine(name: string, spec: ResolvedSpec): string {
  const board = spec.board ? `2-layer ${spec.board.w} × ${spec.board.h}` : "no board";
  return `${name} — ${mm3(spec.size)} · ${board} · ${powerLabel(spec)}`;
}

export function radioOf(parts: ConceptPart[]): string | null {
  // The MCU's built-in radio is the fallback, not the answer, when the
  // concept names a dedicated radio part — an ESP32's on-chip Wi-Fi would
  // otherwise outrank an nRF24L01 the concept actually carries.
  return protocolOf(parts.filter((p) => p.category === "Connectivity")) ?? protocolOf(parts);
}

export function ioOf(parts: ConceptPart[]): string[] {
  return parts
    .filter(
      (p) => p.category === "Sensor" || p.category === "Actuator" || p.category === "Display & I/O",
    )
    .map((p) => p.name);
}

export function mcuOf(parts: ConceptPart[]): string | null {
  return parts.find((p) => p.category === "Microcontroller")?.name ?? null;
}
