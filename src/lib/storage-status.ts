// Writes the browser refused (COR-93). Both stores used to `catch {}` a failed
// localStorage write, so a full browser dropped the maker's change without a
// word. Each save now reports whether it went through, per key, and the page
// shows one error line while any key's latest write is still unsaved.
//
// One record for both stores: the projects store and the create-history store
// each report here, and `useManualProjects().writeError` reads it through
// useSyncExternalStore — a store the save effects update, instead of a
// setState inside them. No React and no imports, so node runs it in the tests.

export type WriteError = { at: number; key: string };

/** Keys whose latest write failed, with when it failed. */
export type WriteFailures = Readonly<Record<string, number>>;

export const WRITE_ERROR_MESSAGE =
  "This browser's storage is full — your last change wasn't saved.";

/** The failure set after one write of `key`. A failure records the key; a
 *  success clears only that key — another key still failing stays failing.
 *  A success on a key that wasn't failing returns the same object. */
export function recordWrite(
  failing: WriteFailures,
  key: string,
  ok: boolean,
  now: number,
): WriteFailures {
  if (!ok) return { ...failing, [key]: now };
  if (!Object.hasOwn(failing, key)) return failing;
  const rest: Record<string, number> = { ...failing };
  delete rest[key];
  return rest;
}

/** The newest failure, or null when every key's latest write went through. */
export function lastFailure(failing: WriteFailures): WriteError | null {
  let out: WriteError | null = null;
  for (const [key, at] of Object.entries(failing)) {
    if (!out || at >= out.at) out = { key, at };
  }
  return out;
}

let failing: WriteFailures = {};
let current: WriteError | null = null;
const listeners = new Set<() => void>();

/** Called by a store's save effect with what its write returned. */
export function reportWrite(key: string, ok: boolean, now: number = Date.now()): void {
  const next = recordWrite(failing, key, ok, now);
  if (next === failing) return;
  failing = next;
  current = lastFailure(failing);
  for (const fn of listeners) fn();
}

export function subscribeWriteError(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** The snapshot useSyncExternalStore reads — the same object until a report
 *  changes the failure set. */
export function currentWriteError(): WriteError | null {
  return current;
}
