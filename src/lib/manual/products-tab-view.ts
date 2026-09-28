// STAND-IN for Task C3's src/lib/manual/products-tab-view.ts (spec §5.6,
// COR-22…25). C4 depends on this file's `productFacts` and
// `displayProductName`, but C3 hadn't landed in this worktree when C4 ran.
// This file holds ONLY the two exports C4 needs, copied verbatim from
// task-C3.md §Step 3 (`productFacts`, `displayProductName`) so the product
// page's words match what C3 will produce. When Task C3 lands for real, its
// commit should replace this file wholesale (it also exports `piecesOf`,
// `droppedNoteOf`, `productsHeadingOf`, `headlineConfidenceOf`, which the
// Products tab needs and this stand-in does not provide).
//
// Relative imports only (not "@/…"): this file is pulled into the node:test
// compile graph, whose tsc output doesn't rewrite path aliases
// (tests/projects/tsconfig.json — harness notes).

import type { ConceptPart } from "../create/concept";
import type { ResolvedSpec } from "../spec/types";
import { needsNoPower, replacedNotRecharged } from "../spec/facts";
import { radioOf } from "../spec/format";
import { batteryOf } from "../spec/batteries";
import { mm3, runtimeLabel } from "../spec/units";

/** COR-23's labelled facts — Size always, then whatever this product
 *  actually has. A fact that would only read "None" or "0 × 0" is left out
 *  rather than printed. */
export type ProductFact = {
  label: "Size" | "Board" | "Power" | "Radio";
  value: string;
};

export function productFacts(spec: ResolvedSpec, parts: ConceptPart[]): ProductFact[] {
  const facts: ProductFact[] = [{ label: "Size", value: mm3(spec.size) }];
  if (spec.board) {
    facts.push({
      label: "Board",
      value: `2-layer ${spec.board.w} × ${spec.board.h} mm`,
    });
  }
  if (!needsNoPower(spec)) {
    if (spec.battery === "none") {
      if (spec.drawMa > 0) facts.push({ label: "Power", value: "USB powered" });
    } else if (spec.battery === "adapter") {
      facts.push({ label: "Power", value: "Wall adapter" });
    } else {
      const runtime = runtimeLabel(spec.runtimeH);
      if (runtime) {
        const per = replacedNotRecharged(spec.battery) ? "per battery" : "per charge";
        facts.push({
          label: "Power",
          value: `${batteryOf(spec.battery).label} · ${runtime} ${per}`,
        });
      }
    }
  }
  const radio = radioOf(parts);
  if (radio) facts.push({ label: "Radio", value: radio });
  return facts;
}

/** COR-23 / LST-37: an unnamed product reads "Not named yet" everywhere
 *  its name is the visible label. */
export function displayProductName(name: string): string {
  return name.trim() ? name : "Not named yet";
}
