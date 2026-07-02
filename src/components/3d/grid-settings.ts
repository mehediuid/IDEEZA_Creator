// Grid + resolution settings shared by the 3D module and the product preview.
// Single source of truth for the label→value mappings so the two editors can't
// drift apart (same "IDEEZA-50" grid, same "Ultra" tessellation everywhere).

export const GRID_OPTIONS = ["IDEEZA-100", "IDEEZA-50", "IDEEZA-25", "IDEEZA-10"];
export const RES_OPTIONS = ["Auto", "Low", "Medium", "High", "Ultra"];

// Resolution label → mesh segment count.
export function getResolutionSegments(res: string): number {
  switch (res) {
    case "Low":    return 8;
    case "Medium": return 16;
    case "High":   return 48;
    case "Ultra":  return 96;
    case "Auto":
    default:       return 32;
  }
}

// Grid label → world cell size.
export function getGridStep(label: string): number {
  if (label === "IDEEZA-50") return 0.5;
  if (label === "IDEEZA-25") return 0.25;
  if (label === "IDEEZA-10") return 0.1;
  return 1.0;
}
