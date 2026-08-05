// Human names + next-step hints for the armed tool.
//
// The names come from the left palette's own option labels (one source — a tool
// renamed there is renamed everywhere), with a prettifier for the tools that
// only exist in menus. The status bar used to print the raw id (`vcc5v`,
// `netBusLabel`), and nothing anywhere said what to do next.

import { PLACE_TOOLS, DRAFT_TOOLS } from "./types";

type ToolSource = ReadonlyArray<{
  label: string;
  tool?: string;
  options?: ReadonlyArray<{ label: string; tool?: string; railText?: string }>;
}>;

/** tool id → the label the palette shows for it. */
export function buildToolLabels(...sets: ToolSource[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const set of sets) {
    for (const t of set) {
      if (t.tool && !out[t.tool]) out[t.tool] = t.label;
      for (const o of t.options ?? []) {
        // Rail variants share one kind (VCC / +5V / DGND) — the group name is
        // the honest label for the kind, so don't let a variant overwrite it.
        if (o.tool && !o.railText && !out[o.tool]) out[o.tool] = o.label;
      }
    }
  }
  return out;
}

/** `netBusLabel` → "Net Bus Label" — the fallback for menu-only tools. */
export function prettifyTool(id: string): string {
  const spaced = id.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function toolLabel(id: string, labels: Record<string, string>, placeText?: string | null): string {
  const base = labels[id] ?? prettifyTool(id);
  // A rail tool carries the name it will stamp, so say which one is armed.
  return placeText && placeText !== base ? `${placeText} (${base})` : base;
}

/** What the pointer does next with this tool armed. */
export function toolHint(id: string): string {
  if (id === "select") return "Click to pick · drag to rubber-band";
  if (id === "lasso") return "Drag a freeform loop around the objects";
  if (id === "areaSelect") return "Drag a box over the objects";
  if (id === "hand") return "Drag to pan · Space also pans";
  if (id === "cutout") return "Drag the area to cut out of the board · Esc cancels";
  if (id === "boardOutlineRect") return "Drag the board's rectangle · Esc cancels";
  if (id === "boardOutlineCircle") return "Drag from the centre to set the radius · Esc cancels";
  if (id === "boardOutlinePoly") return "Click each corner · Enter or double-click to close · Esc cancels";
  if (DRAFT_TOOLS.includes(id)) return "Click to start, click again to finish · Esc cancels";
  if (PLACE_TOOLS.includes(id)) return "Click on the sheet to place · Esc cancels";
  return "Esc returns to Select";
}
