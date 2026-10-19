// SaveStatus — one answer, for the open editor, to "is my work saved?" (owner
// D3, 2026-10-19). Every editor saves as it goes (PCB and Wiring after a short
// pause, Code, 3D, Preview and Assembly on every change), and every one of
// those writes reports here: which source wrote, whether the browser kept it,
// and how to write it again. The top bar's status reads the summary: Saved
// (with the time of the last write), or Not saved · Retry while any source's
// last write was refused (storage full or blocked).
//
// Writers with a pending, debounced write (PCB, Wiring, Preview's shapes)
// register a flusher, so saving on purpose — Ctrl+S, File › Save, Finish —
// writes everything now (`saveNow`). There is no Save step: the project is a
// Draft from the moment it exists.
//
// A module-level store, not React state: the PCB store (app root) and every
// editor report into the same one. ProjectWorkspace resets it when it opens
// another product. No React here, so the summary is unit-tested in Node.

export type SaveEntry = { ok: boolean; at: number; retry: (() => boolean) | null };

export type SaveSnapshot = {
  /** The sources whose last write was refused, sorted. */
  failed: readonly string[];
  /** When the last kept write landed, from any source; null before the first. */
  at: number | null;
  /** When the maker last saved on purpose and everything was kept. */
  savedNowAt: number | null;
};

/** The summary of a set of entries. */
export function summarizeSaves(entries: ReadonlyMap<string, SaveEntry>, savedNowAt: number | null): SaveSnapshot {
  const failed: string[] = [];
  let at: number | null = null;
  for (const [source, e] of entries) {
    if (!e.ok) failed.push(source);
    else if (at === null || e.at > at) at = e.at;
  }
  failed.sort();
  return { failed, at, savedNowAt };
}

const entries = new Map<string, SaveEntry>();
const flushers = new Map<string, () => boolean | null>();
const listeners = new Set<() => void>();
let savedNowAt: number | null = null;
let snapshot: SaveSnapshot = summarizeSaves(entries, null);

function publish() {
  snapshot = summarizeSaves(entries, savedNowAt);
  for (const l of listeners) l();
}

export function subscribeSaves(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSaveSnapshot(): SaveSnapshot {
  return snapshot;
}

/** A write's result. `retry` writes the same thing again and says whether it was kept. */
export function reportSave(source: string, ok: boolean, retry?: () => boolean, now: number = Date.now()): void {
  entries.set(source, { ok, at: now, retry: retry ?? null });
  publish();
}

/** `localStorage.setItem` that reports: a refused write keeps its retry. */
export function writeReported(source: string, key: string, value: string): boolean {
  const write = () => {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  };
  const ok = write();
  reportSave(source, ok, write);
  return ok;
}

/** A source with a pending write: `flush` writes it now (null when nothing was pending). The
 *  flush reports through the writer's own path. */
export function registerSaveFlusher(source: string, flush: () => boolean | null): () => void {
  flushers.set(source, flush);
  return () => {
    if (flushers.get(source) === flush) flushers.delete(source);
  };
}

/** Writes every refused source again. True when nothing is left unsaved. */
export function retryFailedSaves(now: number = Date.now()): boolean {
  let changed = false;
  for (const [source, e] of entries) {
    if (e.ok || !e.retry) continue;
    entries.set(source, { ok: e.retry(), at: now, retry: e.retry });
    changed = true;
  }
  if (changed) publish();
  return snapshot.failed.length === 0;
}

/** Save on purpose (Ctrl+S, File › Save, Finish): pending writes go now and refused ones are
 *  tried again. True when everything is kept; the status then says "Saved" for a moment. */
export function saveNow(now: number = Date.now()): boolean {
  for (const flush of flushers.values()) flush();
  const ok = retryFailedSaves(now);
  if (ok) {
    savedNowAt = now;
    publish();
  }
  return ok;
}

/** Another product opened: its editors report afresh. Flushers stay — they belong to mounted
 *  writers and unregister themselves. */
export function resetSaveStatus(): void {
  entries.clear();
  savedNowAt = null;
  publish();
}
