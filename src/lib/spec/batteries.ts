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
  { key: "li-1s-400", label: "1S Li-Po 400 mAh", mAh: 400, volts: 3.7, maxMa: 400, body: { l: 35, w: 25, h: 5 } },
  { key: "li-1s-1000", label: "1S Li-Po 1000 mAh", mAh: 1000, volts: 3.7, maxMa: 1000, body: { l: 50, w: 34, h: 6 } },
  { key: "li-1s-2000", label: "1S 18650 2000 mAh", mAh: 2000, volts: 3.7, maxMa: 4000, body: { l: 65, w: 18.5, h: 18.5 } },
  { key: "li-2s-1500", label: "2S Li-Po 1500 mAh", mAh: 1500, volts: 7.4, maxMa: 15000, body: { l: 72, w: 34, h: 17 } },
  { key: "aa-2", label: "2 × AA", mAh: 2000, volts: 3, maxMa: 1000, body: { l: 58, w: 32, h: 16 } },
  { key: "aa-4", label: "4 × AA", mAh: 2000, volts: 6, maxMa: 1000, body: { l: 62, w: 58, h: 16 } },
];

export function batteryOf(key: BatteryKey): BatteryInfo {
  return BATTERIES.find((b) => b.key === key) ?? BATTERIES[0];
}

// A pack the concept already lists is replaced by the spec's, so a battery is
// never counted twice. Chargers, gauges and protection boards are not packs,
// and a "cell" outside power and mechanics is a load cell, not a battery.
const PACK = /batter|li-?po|li-?ion|18650|\bcells?\b|\baaa?\b/i;
const NOT_PACK = /charg|gauge|monitor|protect|\bbms\b/i;

export function isBatteryPart(part: ConceptPart): boolean {
  if (part.category !== "Power Management" && part.category !== "Connector & mech") {
    return false;
  }
  return PACK.test(part.name) && !NOT_PACK.test(part.name);
}
