// How the spec sheet prints its numbers — one place, so the card, the gate,
// the review and the project page all say "118 × 64 × 38 mm" the same way.

import type { Mm3 } from "./types";

export function mm3(m: Mm3): string {
  return `${m.l} × ${m.w} × ${m.h} mm`;
}

/** "~45 min", "~3.4 h", "~15 h" — a runtime is an estimate, and says so. */
export function runtimeLabel(hours: number | null): string | null {
  if (hours === null || !Number.isFinite(hours)) return null;
  if (hours < 1) return `~${Math.max(5, Math.round((hours * 60) / 5) * 5)} min`;
  if (hours < 10) return `~${hours.toFixed(1).replace(/\.0$/, "")} h`;
  return `~${Math.round(hours)} h`;
}
