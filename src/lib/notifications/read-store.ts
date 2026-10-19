// The bell's read keys in this browser, live across tabs through key-store's
// subscription. A key that can't be read counts as nothing read: the bell may
// show a notice as new again, never hide one.

import * as React from "react";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { addReadKeys, decodeReadKeys, NOTICE_READ_KEY } from "./read";

export function useNoticeReads(): { hydrated: boolean; keys: ReadonlySet<string> } {
  const { hydrated, raw } = useStoredKey(NOTICE_READ_KEY);
  const keys = React.useMemo(() => new Set(decodeReadKeys(parseStored(raw).value)), [raw]);
  return { hydrated, keys };
}

/** Marks the notices read; a no-op when they already are. */
export function markNoticesRead(ids: readonly string[]): WriteResult {
  if (!ids.length) return { ok: true };
  const current = decodeReadKeys(parseStored(readStoredKey(NOTICE_READ_KEY)).value);
  const next = addReadKeys(current, ids);
  if (next.length === current.length && next.every((k, i) => k === current[i])) return { ok: true };
  return writeStoredKey(NOTICE_READ_KEY, next);
}
