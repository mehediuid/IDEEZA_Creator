// Storage migration commerce-split@1 (Build and Earn P1-1): copies each
// project's commerce fields out of `ideeza:manual:projects` into its own
// `ideeza:commerce:<projectId>` (./record.ts), once, on load
// (commerce-root.tsx), then records the flag in `ideeza:migrations`.
// - Safe to run twice: with the flag it does nothing, and without it a copy
//   already in the commerce key wins field by field, so a rerun writes nothing.
// - It copies, never moves: the record keeps its fields, so a rollback that
//   reads only the projects key loses nothing.
// - A key it can't read is left exactly as it is. A projects key it can't
//   read, or a write the browser refuses, leaves the flag unset, so the next
//   load tries again.
//
// Pure over a storage-like object; relative imports, so node:test loads it.

import { normalizeProjects, PROJECTS_KEY } from "../manual/public";
import {
  commerceKey,
  commerceRecordOf,
  mergeCommerceRecords,
  readCommerceRecord,
  sameValue,
  type CommerceStore,
} from "./record";

export const MIGRATIONS_KEY = "ideeza:migrations";
export const COMMERCE_SPLIT = "commerce-split@1";

export type MigrationResult =
  | { ran: false; why: "done" | "unreadable" }
  /** `copied`: the projects whose commerce key this run wrote. `complete`: the flag was recorded. */
  | { ran: true; copied: string[]; complete: boolean };

/** The flags, as an object; `unreadable` when the key is present but isn't one. */
function readFlags(store: CommerceStore): { flags: Record<string, unknown>; unreadable: boolean } {
  const raw = store.getItem(MIGRATIONS_KEY);
  if (raw === null) return { flags: {}, unreadable: false };
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? { flags: value as Record<string, unknown>, unreadable: false }
      : { flags: {}, unreadable: true };
  } catch {
    return { flags: {}, unreadable: true };
  }
}

export function migrateCommerceSplit(store: CommerceStore, now: number): MigrationResult {
  try {
    const { flags, unreadable } = readFlags(store);
    if (Object.prototype.hasOwnProperty.call(flags, COMMERCE_SPLIT)) return { ran: false, why: "done" };

    const raw = store.getItem(PROJECTS_KEY);
    let list: unknown = [];
    if (raw !== null) {
      try {
        list = JSON.parse(raw);
      } catch {
        return { ran: false, why: "unreadable" };
      }
      if (!Array.isArray(list)) return { ran: false, why: "unreadable" };
    }

    const copied: string[] = [];
    let wrote = true;
    for (const p of normalizeProjects(list)) {
      const from = commerceRecordOf(p);
      if (!from) continue;
      const stored = readCommerceRecord(store, p.id);
      if (stored.unreadable) continue;
      const merged = mergeCommerceRecords(stored.record, from);
      if (stored.record && sameValue(stored.record, merged)) continue;
      try {
        store.setItem(commerceKey(p.id), JSON.stringify(merged));
        copied.push(p.id);
      } catch {
        wrote = false;
      }
    }

    // An unreadable flags key is left as it is too: the copy above is safe to repeat.
    if (!wrote || unreadable) return { ran: true, copied, complete: false };
    try {
      store.setItem(MIGRATIONS_KEY, JSON.stringify({ ...flags, [COMMERCE_SPLIT]: now }));
    } catch {
      return { ran: true, copied, complete: false };
    }
    return { ran: true, copied, complete: true };
  } catch {
    // Storage itself is unreachable: nothing to copy, and the next load tries again.
    return { ran: false, why: "unreadable" };
  }
}
