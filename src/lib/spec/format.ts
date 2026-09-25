// The spec in words — the card's facts, the gate's one line per product, the
// review aside — so every surface says the same thing about the same product.

import type { ConceptPart } from "../create/concept";
import { radioOf } from "../create/confidence";
import { batteryOf } from "./batteries";
import { cardFactsOf, needsNoPower, type CardFact } from "./facts";
import type { Material, ResolvedSpec } from "./types";
import { mm3, runtimeLabel } from "./units";

export { needsNoPower, type CardFact, type SpecFactTone } from "./facts";

/** §4.9 #1 — until a fab partner is named, every board is drawn and checked
 *  against this one profile. One constant, so naming a partner is one edit. */
export const FAB_PROFILE =
  "Standard 2-layer — 0.15 mm track/space, 0.3 mm drill, 1.6 mm FR-4, HASL";

export function boardLabel(spec: ResolvedSpec): string {
  if (spec.board) {
    return `2-layer · ${spec.board.w} × ${spec.board.h} mm · ${spec.board.parts} part${spec.board.parts === 1 ? "" : "s"}`;
  }
  return needsNoPower(spec) ? "None — no electronics" : "No board — none of its parts sits on one";
}

export function powerLabel(spec: ResolvedSpec): string {
  if (needsNoPower(spec)) return "No power needed";
  if (spec.battery === "none") return "USB powered";
  return runtimeLabel(spec.runtimeH) ?? batteryOf(spec.battery).label;
}

/** What each case plastic is for, in the words a maker picks one by. */
export const MATERIAL_NOTE: Record<Material, string> = {
  PLA: "easy to print, indoor",
  PETG: "tough, everyday",
  ASA: "outdoor, UV-safe",
  TPU: "flexible, wearable",
};

/** "RC Car Controller — 118 × 64 × 38 mm · 2-layer 58 × 42 · ~45 min". */
export function specLine(name: string, spec: ResolvedSpec): string {
  const board = spec.board ? `2-layer ${spec.board.w} × ${spec.board.h}` : "no board";
  return `${name} — ${mm3(spec.size)} · ${board} · ${powerLabel(spec)}`;
}

/** The radio the product uses — a dedicated radio part first, then the one
 *  on its MCU's die (confidence.ts reads it the way the sheet does). Pass
 *  the edited parts: an ESP32 the maker set to None has no radio. */
export { radioOf };

export function mcuOf(parts: ConceptPart[]): string | null {
  return parts.find((p) => p.category === "Microcontroller")?.name ?? null;
}

/** What a card and its rail row say the product will be — chosen by what
 *  the product is (facts.ts), with the radio read off its parts here. */
export function cardFacts(spec: ResolvedSpec, parts: ConceptPart[]): CardFact[] {
  return cardFactsOf(spec, parts, radioOf(parts));
}
