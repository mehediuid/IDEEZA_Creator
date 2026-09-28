// A built product's parts, as the wiring editor's own document
// (P2-BUILDLOAD-5). The wiring library holds six peripherals and no board
// or MCU part, so a unit is placed only when the library has its kind, and
// no wire is drawn: every wire the build names has the MCU, the regulator
// or ground at one end (BUILDLOAD Q2).
//
// Pure, relative imports only (node:test).

import type { ArtifactSource } from "../create/build-artifacts";
import { bomUnitsOf, refPrefixOf } from "../pcb/from-build";
import type { WiringReport } from "../manual/build-load";
import type { WireObj, WirePart } from "./types";

const LED_NAME = /\bleds?\b|ws2812|sk6812|neopixel/;

/** Units the library has a part for, by designator letter. */
const KIND_BY_PREFIX: Record<string, string> = { S: "sensor", M: "motor", SW: "button", J: "connector" };

/** Units that are peripherals the library has no part for yet. */
const NO_PART = new Set(["BT", "DSP", "BZ", "LS", "K", "RV"]);

/** The wiring library kind a unit is placed as, "none" for a peripheral the
 *  library lacks, or null for a board part or hardware (neither). */
export function wiringKindOf(ref: string, name: string): string | "none" | null {
  const prefix = refPrefixOf(ref);
  if (prefix === "D") return LED_NAME.test(name.toLowerCase()) ? "led" : null;
  if (KIND_BY_PREFIX[prefix]) return KIND_BY_PREFIX[prefix];
  return NO_PART.has(prefix) ? "none" : null;
}

/** The parts to place, on `placePart`'s own grid (wiring-context.tsx), and
 *  what the notice says about them. Wires are always empty. */
export function wiringFromBuild(src: ArtifactSource): { parts: WirePart[]; wires: WireObj[]; report: WiringReport } {
  const parts: WirePart[] = [];
  const noPart: string[] = [];
  for (const u of bomUnitsOf(src)) {
    const kind = wiringKindOf(u.ref, u.part.name);
    if (kind === null) continue;
    if (kind === "none") {
      const label = `${u.row.ref} ${u.row.name}`;
      if (!noPart.includes(label)) noPart.push(label);
      continue;
    }
    const i = parts.length;
    parts.push({ id: `wp_${i + 1}`, kind, name: u.ref, x: 320 + (i % 3) * 220, y: 240 + Math.floor(i / 3) * 170 });
  }
  return { parts, wires: [], report: { placed: parts.map((p) => p.name), noPart } };
}
