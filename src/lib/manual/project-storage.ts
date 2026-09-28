// What a project keeps in this browser beside its record, and the rules for
// writing and removing it. Pure — no React, no window: the provider passes the
// clock (and, for removal, the storage) in, so node runs this in the tests.
// Value imports stay relative, because tsc doesn't rewrite `@/` in its output.

import type { ManualProject, ProjectStep } from "./projects";
import { briefDraftKey } from "../brief/types";

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

// ── the delete sweep (COR-92, §5.1.9) ───────────────────────────────────

/** Every browser key that belongs to one project and goes with it. Exact keys,
 *  never a prefix, so deleting `proj_a` can't take `proj_ab`'s.
 *  Not here, on purpose:
 *  - `ideeza:network:<id>` — `deleteNetwork(id)` removes it, so the network's
 *    subscribers hear;
 *  - `ideeza:manual:projects` / `ideeza:manual:active` — the provider's own
 *    state and save effects;
 *  - `ideeza:brief:draft:build:<buildId>` — it belongs to the build;
 *  - `ideeza:create:*` — builds keep their now-dangling projectId (COR-71);
 *  - `ideeza:code:*`, `ideeza:3d:*`, `ideeza:preview:*` — shared by every
 *    project today, so they can't be attributed (sub-project B). */
export function projectStorageKeys(id: string): string[] {
  return [
    `ideeza:pcb:doc:${id}`, // pcb/store.tsx PCB_DOC_PREFIX
    `ideeza:wiring:doc:${id}`, // wiring-context.tsx docKey()
    `ideeza:assembly:${id}`, // assembly-app.tsx PROGRESS_PREFIX
    `ideeza:three:aimodel:${id}`, // ai-generate-modal.tsx storeKey()
    briefDraftKey(id), // brief/types.ts — ideeza:brief:draft:<id>
  ];
}

export type KeyStore = Pick<Storage, "getItem" | "removeItem">;

/** Removes the project's keys from `store` and returns the ones it removed.
 *  A key the browser refuses to remove is skipped, never thrown — the rest
 *  still go. */
export function sweepProjectKeys(id: string, store: KeyStore): string[] {
  const removed: string[] = [];
  for (const key of projectStorageKeys(id)) {
    try {
      if (store.getItem(key) === null) continue;
      store.removeItem(key);
      removed.push(key);
    } catch {
      // Storage refused this key (blocked site data, private mode).
    }
  }
  return removed;
}
