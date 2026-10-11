// The projects store's two seams for the layer above it (Build and Earn P1-1).
// Commerce keeps its own copy of the commerce fields a `ManualProject` still
// carries (`mint`, `contributors[].share`, `legal`, `ownerConfirmedAt`) under
// `ideeza:commerce:<id>`, and the store never imports commerce. So commerce
// registers two hooks at the app root:
// - `read`: every record the store reads from storage passes through it, and
//   the commerce copy is laid over the record's own fields — the new key wins;
// - `wrote`: every list the store writes is handed to it once the write held,
//   so the commerce copy follows the record's fields — both are written.
//
// Pure: no React and no storage; relative imports, so node:test loads it.

import type { ManualProject } from "./projects";

export type ProjectRecordHooks = {
  readonly id: string;
  /** `p` with the layer's copy of its fields laid over it; `p` itself when nothing differs. */
  read(p: ManualProject): ManualProject;
  /** A list the store has just written to storage. */
  wrote(list: readonly ManualProject[]): void;
};

const hooks = new Map<string, ProjectRecordHooks>();

/** Registers `h` under its id (a later one with the same id replaces it); returns the unregister. */
export function registerProjectRecordHooks(h: ProjectRecordHooks): () => void {
  hooks.set(h.id, h);
  return () => {
    if (hooks.get(h.id) === h) hooks.delete(h.id);
  };
}

/** `list` read through every hook: the same array when no record changed. */
export function readThroughHooks(list: ManualProject[]): ManualProject[] {
  if (!hooks.size) return list;
  let same = true;
  const out = list.map((p) => {
    let next = p;
    for (const h of hooks.values()) next = h.read(next);
    if (next !== p) same = false;
    return next;
  });
  return same ? list : out;
}

/** Tells every hook that `list` is what storage now holds. */
export function wroteThroughHooks(list: readonly ManualProject[]): void {
  for (const h of hooks.values()) h.wrote(list);
}
