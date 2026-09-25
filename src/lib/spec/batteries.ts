// The packs a spec can choose between. Sizes are the common cell or pack
// outlines in millimetres; `maxMa` is the continuous current a pack of that
// kind gives without sagging (1C for small pouches, more for 18650s and RC
// packs, about an amp for alkaline AAs). "none" is a USB-powered product.

import type { ConceptPart } from "../create/concept";
import type { BatteryKey, Mm3 } from "./types";

export type BatteryInfo = {
  key: BatteryKey;
  label: string;
  mAh: number;
  volts: number;
  maxMa: number;
  body: Mm3 | null;
};

/** What USB 2.0 promises a device that has not negotiated more. */
export const USB_BUDGET_MA = 500;

export const BATTERIES: BatteryInfo[] = [
  { key: "none", label: "USB powered", mAh: 0, volts: 5, maxMa: USB_BUDGET_MA, body: null },
  // Wired to a barrel jack, an AC-DC brick or the mains — not a pack at all,
  // so it has no body to place and no capacity to run flat.
  { key: "adapter", label: "Wall adapter (12 V · 2 A)", mAh: 0, volts: 12, maxMa: 2000, body: null },
  { key: "li-1s-100", label: "1S Li-Po 100 mAh", mAh: 100, volts: 3.7, maxMa: 100, body: { l: 20, w: 12, h: 4 } },
  { key: "li-1s-400", label: "1S Li-Po 400 mAh", mAh: 400, volts: 3.7, maxMa: 400, body: { l: 35, w: 25, h: 5 } },
  { key: "li-1s-1000", label: "1S Li-Po 1000 mAh", mAh: 1000, volts: 3.7, maxMa: 1000, body: { l: 50, w: 34, h: 6 } },
  { key: "li-1s-2000", label: "1S 18650 2000 mAh", mAh: 2000, volts: 3.7, maxMa: 4000, body: { l: 65, w: 18.5, h: 18.5 } },
  { key: "li-2s-1500", label: "2S Li-Po 1500 mAh", mAh: 1500, volts: 7.4, maxMa: 15000, body: { l: 72, w: 34, h: 17 } },
  { key: "aa-2", label: "2 × AA", mAh: 2000, volts: 3, maxMa: 1000, body: { l: 58, w: 32, h: 16 } },
  { key: "aa-4", label: "4 × AA", mAh: 2000, volts: 6, maxMa: 1000, body: { l: 62, w: 58, h: 16 } },
  { key: "9v", label: "9 V battery", mAh: 550, volts: 9, maxMa: 300, body: { l: 48.5, w: 26.5, h: 17.5 } },
];

export function batteryOf(key: BatteryKey): BatteryInfo {
  return BATTERIES.find((b) => b.key === key) ?? BATTERIES[0];
}

// A pack the concept already lists is replaced by the spec's, so a battery is
// never counted twice. Chargers, gauges and protection boards are not packs,
// and a "cell" outside power and mechanics is a load cell, not a battery.
// A bare "connector"/"level"/"indicator" used to disqualify the part outright
// — but a real pack naming its own connector ("2S LiPo battery (XT60
// connector)") or a hand-off pin block ("1S LiPo 1000mAh battery with JST
// connector") is still a pack, and losing it dropped the maker's named
// capacity/cell-count and left a duplicate generic body in the BOM. Only the
// phrase "battery connector/level/indicator" — the word immediately after
// "battery" — names an accessory instead of the cell.
// A cell count ("1S", "2s", or our own key's "li-1s") and a stated capacity
// ("1000 mAh") name a pack too — a model that answers with a key like
// "Li-1s-400" as the part's name means the pack, not an unknown part to size
// by its category.
const PACK = /batter|li-?po|li-?ion|18650|\bcells?\b|\baaa?\b|\b(?:li-?)?\d\s?s\b|\d{2,5}\s*mah\b/i;
const NOT_PACK = /charg|gauge|monitor|protect|\bbms\b|solar|photo|batter(?:y|ies)\s+(?:connector|level|indicator)/i;

export function isBatteryPart(part: ConceptPart): boolean {
  if (part.category !== "Power Management" && part.category !== "Connector & mech") {
    return false;
  }
  return PACK.test(part.name) && !NOT_PACK.test(part.name);
}
