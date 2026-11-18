"use client";

// After each export, the editor's toast says what is left of the plan's
// exports this month (upgrade plan C6). Soft: an export is never stopped; at
// none left it says when they come back and, on a plan below Disruptor, what
// the next plan gives (lib/create/export-count.ts). Renders nothing.

import * as React from "react";
import { exportLine, exportsIn, useExports } from "@/lib/create/export-count";
import { useCreatePlan } from "@/lib/create/plan";
import { creditPeriod, planOf } from "@/lib/create/plans";
import { pitchPlan } from "@/lib/create/upsell";
import { usePcbActions } from "@/lib/pcb/store";

export function ExportMeter() {
  const actions = usePcbActions();
  const { hydrated, at } = useExports();
  const { hydrated: planReady, sub } = useCreatePlan();
  const seen = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!hydrated || !planReady) return;
    const last = at[at.length - 1] ?? 0;
    // The first read is what was there before this editor opened: no toast for it.
    if (seen.current === null || last === seen.current) {
      seen.current = last;
      return;
    }
    seen.current = last;
    const now = Date.now();
    const period = creditPeriod(sub, now);
    const plan = planOf(sub.tier);
    const pitch = pitchPlan(sub.tier);
    const refill = new Date(period.end).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    actions.flashToast(
      exportLine(exportsIn(at, period.start, period.end), plan.exports, refill, pitch ? { name: pitch.name, exports: pitch.exports } : null),
    );
  }, [hydrated, planReady, at, sub, actions]);

  return null;
}
