// What a project keeps in this browser beside its record, and the rules for
// writing and removing it. Pure — no React, no window: the provider passes the
// clock (and, for removal, the storage) in, so node runs this in the tests.
// Value imports stay relative, because tsc doesn't rewrite `@/` in its output.
//
// A safe cycle with editor-scope.ts: `projectStorageKeys` calls its
// `editorKeysOf`, and it calls this file's `OPENED_EVERY_MS`. Neither is read
// at module-evaluation time, only from inside a function body once both
// modules have finished loading — the same tolerated pattern project-read.ts
// documents for its own cycle with projects.tsx.

import type { ManualProject, ProjectStep } from "./projects";
import { briefDraftKey } from "../brief/types";
import { editorKeysOf } from "./editor-scope";

// ── lastOpened (COR-91) ─────────────────────────────────────────────────

/** At most one lastOpened write per step per minute (§5.1.10). */
export const OPENED_EVERY_MS = 60_000;

/** The project with `step` recorded as the editor step last opened — Open in
 *  editor's resume target. Returns the same object when that step was already
 *  stamped under a minute ago, so the caller can skip the write. Never touches
 *  `updatedAt`: opening a step changes nothing in the project.
 *
 *  @deprecated Superseded by `editor-scope.ts`'s `stampEditorOpened`, which
 *  is per-product (P2-EDITOR-7). Kept, unchanged, until the provider's
 *  `touchOpened` (projects.tsx, T09) switches its one call site over — this
 *  file can't make that edit itself (out of this task's file list). */
export function stampOpened(p: ManualProject, step: ProjectStep, now: number): ManualProject {
  const last = p.lastOpened;
  if (last && last.step === step && now - last.at < OPENED_EVERY_MS) return p;
  return { ...p, lastOpened: { step, at: now } };
}

// ── the delete sweep (COR-92, §5.1.9, extended P2 §3.2/§3.4) ────────────

/** Every browser key that belongs to one project and goes with it. Exact keys,
 *  never a prefix, so deleting `proj_a` can't take `proj_ab`'s. `rowIds` is
 *  every product row the project ever held (dropped rows keep their
 *  documents, O9), so its per-product editor keys sweep too (P2-EDITOR-3,
 *  BUILDLOAD C6 — `editorKeysOf` also returns each row's seed record and its
 *  `:prev` backups).
 *  Not here, on purpose:
 *  - `ideeza:network:<id>` — `deleteNetwork(id)` removes it, so the network's
 *    subscribers hear;
 *  - `ideeza:manual:projects` / `ideeza:manual:active` — the provider's own
 *    state and save effects;
 *  - `ideeza:brief:draft:build:<buildId>` — it belongs to the build;
 *  - `ideeza:create:*` — builds keep their now-dangling projectId (COR-71);
 *  - `ideeza:code:*`, `ideeza:3d:*`, `ideeza:preview:*` globals — shared by
 *    every project in this browser, so they can't be attributed to one
 *    (P2-EDITOR-4/C4);
 *  - `ideeza:market:*` — a listed or sold project keeps its market rows;
 *    `MarketProvider` drops what's droppable on the delete event instead;
 *  - IndexedDB (`ideeza-video`, `ideeza-media`) — their own stores listen
 *    for the delete event and clear their own blobs. */
export function projectStorageKeys(id: string, rowIds: readonly string[]): string[] {
  return [
    ...editorKeysOf(id, rowIds),
    `ideeza:pcb:doc:${id}`, // pcb/store.tsx PCB_DOC_PREFIX — legacy, first row only
    `ideeza:wiring:doc:${id}`, // wiring-context.tsx docKey() — legacy, first row only
    `ideeza:assembly:${id}`, // assembly-app.tsx PROGRESS_PREFIX — legacy, first row only
    `ideeza:three:aimodel:${id}`, // ai-generate-modal.tsx storeKey() — legacy, first row only
    briefDraftKey(id), // brief/types.ts — ideeza:brief:draft:<id>
    `ideeza:video:${id}`, // video/product-video.ts ProjectVideos (T06)
    `ideeza:project:journey:${id}`, // manual/journey.ts ProjectJourney (T08/T11)
    `ideeza:project:bizplan:${id}`, // manual/business-plan.ts BusinessPlan (T08/T11)
    `ideeza:project:editions:${id}`, // market/editions.ts EditionTrack[] (T04)
  ];
}

export type KeyStore = Pick<Storage, "getItem" | "removeItem">;

/** Removes the project's keys from `store` and returns the ones it removed.
 *  A key the browser refuses to remove is skipped, never thrown — the rest
 *  still go.
 *
 *  The 2-arg form sweeps only the per-project keys (no `rowIds` known), kept
 *  for the provider's current call site until it passes the project's row
 *  ids through (T09); prefer the 3-arg form, which is the full P2 sweep. */
export function sweepProjectKeys(id: string, store: KeyStore): string[];
export function sweepProjectKeys(id: string, rowIds: readonly string[], store: KeyStore): string[];
export function sweepProjectKeys(
  id: string,
  rowIdsOrStore: readonly string[] | KeyStore,
  maybeStore?: KeyStore,
): string[] {
  const [rowIds, store]: [readonly string[], KeyStore] = Array.isArray(rowIdsOrStore)
    ? [rowIdsOrStore, maybeStore as KeyStore]
    : [[], rowIdsOrStore as KeyStore];
  const removed: string[] = [];
  for (const key of projectStorageKeys(id, rowIds)) {
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
