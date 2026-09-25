// The spec in words — the card's facts, the gate's one line per product, the
// review aside — so every surface says the same thing about the same product.

import type { ConceptPart } from "../create/concept";
import { protocolOf } from "../create/confidence";
import { batteryOf } from "./batteries";
import { RADIOS, radioKeyOf } from "./catalog";
import { cardFactsOf, needsNoPower, type CardFact, type RadioPair } from "./facts";
import type { Material, RadioKey, ResolvedSpec } from "./types";
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

// confidence.ts's name table, for a radio module the catalog doesn't list,
// read back to the sheet's key — so an unlisted nRF24 board is "nRF24L01"
// here too. Its "Bluetooth" is Bluetooth Classic (an HC-05), which no key is.
const PROTOCOL_KEY: Record<string, RadioKey> = {
  "Wi-Fi": "wifi",
  "Bluetooth LE": "ble",
  "ESP-NOW": "esp-now",
  nRF24: "nrf24",
  LoRa: "lora",
  Zigbee: "zigbee",
};

/** The radio the product uses, in the words the spec sheet picks it by
 *  (`RADIOS[key].label`) — the card, the rail and the review said "nRF24"
 *  beside a sheet that said "nRF24L01". A dedicated radio part first, then
 *  the one on its MCU's die, the way the sheet reads it (catalog.ts). Pass
 *  the edited parts: an ESP32 the maker set to None has no radio. Null for
 *  none. */
export function radioOf(parts: ConceptPart[]): string | null {
  const key = radioKeyOf(parts);
  if (key) return key === "none" ? null : RADIOS[key].label;
  const word =
    protocolOf(parts.filter((p) => p.category === "Connectivity")) ?? protocolOf(parts);
  const said = word ? PROTOCOL_KEY[word] : undefined;
  return said ? RADIOS[said].label : word;
}

export function mcuOf(parts: ConceptPart[]): string | null {
  return parts.find((p) => p.category === "Microcontroller")?.name ?? null;
}

/** What a card and its rail row say the product will be — chosen by what
 *  the product is (facts.ts), with the radio read off its parts here, or
 *  the products it pairs with over it (project-state.ts linksOf) in its
 *  place, as the rail row says them. */
export function cardFacts(
  spec: ResolvedSpec,
  parts: ConceptPart[],
  pairs: RadioPair[] = [],
): CardFact[] {
  return cardFactsOf(spec, parts, radioOf(parts), pairs);
}
