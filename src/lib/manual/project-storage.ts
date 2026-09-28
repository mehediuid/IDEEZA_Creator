// What a project keeps in this browser beside its record, and the rules for
// writing and removing it. Pure — no React, no window: the provider passes the
// clock (and, for removal, the storage) in, so node runs this in the tests.
// Value imports stay relative, because tsc doesn't rewrite `@/` in its output.

import type { ManualProject, ProjectStep } from "./projects";

// ── lastOpened (COR-91) ─────────────────────────────────────────────────

/** At most one lastOpened write per step per minute (§5.1.10). */
export const OPENED_EVERY_MS = 60_000;

/** The project with `step` recorded as the editor step last opened — Open in
 *  editor's resume target. Returns the same object when that step was already
 *  stamped under a minute ago, so the caller can skip the write. Never touches
 *  `updatedAt`: opening a step changes nothing in the project. */
export function stampOpened(p: ManualProject, step: ProjectStep, now: number): ManualProject {
  const last = p.lastOpened;
  if (last && last.step === step && now - last.at < OPENED_EVERY_MS) return p;
  return { ...p, lastOpened: { step, at: now } };
}
