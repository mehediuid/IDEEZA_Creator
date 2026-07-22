// Translate the PCB Design-Rules dialog's rule form → the DRC engine config,
// for the rules the engine actually enforces (Safe-Spacing clearance matrix,
// track width, via size, net-length range, diff-pair skew). Rules the engine
// does not yet enforce keep the engine defaults, so tuning the dialog really
// changes what runDrcCheck reports. Pure (no React) so it is unit-testable.

import { defaultPcbDrcConfig, type PcbDrcConfig } from "./drc";
import type { ClearanceRow } from "./design-rules-data";

export interface RuleLike {
  leaf: string;
  clearance?: ClearanceRow[];
  params?: Record<string, number | boolean | string>;
}

export function rulesToDrcConfig(rules: RuleLike[]): PcbDrcConfig {
  const d = defaultPcbDrcConfig();
  const byLeaf = (leaf: string) => rules.find((r) => r.leaf === leaf);
  const num = (leaf: string, key: string, dflt: number) => {
    const v = byLeaf(leaf)?.params?.[key];
    return typeof v === "number" && isFinite(v) ? v : dflt;
  };
  const safe = byLeaf("Safe Spacing");
  return {
    ...d,
    clearance: safe?.clearance && safe.clearance.length ? safe.clearance : d.clearance,
    physics: {
      trackWidthMin: num("Track", "strokeWidth.all.min", d.physics.trackWidthMin),
      trackWidthMax: num("Track", "strokeWidth.all.max", d.physics.trackWidthMax),
      viaOuterMin: num("Via Size", "outerMin", d.physics.viaOuterMin),
      viaOuterMax: num("Via Size", "outerMax", d.physics.viaOuterMax),
      viaInnerMin: num("Via Size", "innerMin", d.physics.viaInnerMin),
      viaInnerMax: num("Via Size", "innerMax", d.physics.viaInnerMax),
      netLengthMin: num("Net Length Range", "min", d.physics.netLengthMin),
      netLengthMax: num("Net Length Range", "max", d.physics.netLengthMax),
    },
    diffPairSkewMax: num("Net Length Tolerance", "tolerance", d.diffPairSkewMax),
  };
}
