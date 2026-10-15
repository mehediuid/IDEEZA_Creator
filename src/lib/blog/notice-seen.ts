// Which Featured and Removed bell items the writer has opened (owner D-16). The
// IDEEZA team sets `featured` and `takenDown` without a review round, so the
// record has no `seen` for them; their keys (article.ts `noticeKeysOf`) are kept
// here, beside the index, in the same browser. A key that can't be read counts as
// nothing seen: the bell may show an item again, never hide one.

import * as React from "react";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey } from "../key-store";

export const NOTICE_SEEN_KEY = "ideeza:blog:seen-notices";
/** Enough for every blog a writer keeps; the oldest keys go first. */
const MAX_KEYS = 500;

function decode(raw: string | null): string[] {
  const { value } = parseStored(raw);
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function useSeenNotices(): { hydrated: boolean; seen: ReadonlySet<string> } {
  const { hydrated, raw } = useStoredKey(NOTICE_SEEN_KEY);
  const seen = React.useMemo(() => new Set(decode(raw)), [raw]);
  return { hydrated, seen };
}

/** Marks the keys opened; a no-op when they already are. */
export function markNoticesSeen(keys: readonly string[]): void {
  if (!keys.length) return;
  const current = decode(readStoredKey(NOTICE_SEEN_KEY));
  const fresh = keys.filter((k) => !current.includes(k));
  if (!fresh.length) return;
  writeStoredKey(NOTICE_SEEN_KEY, [...current, ...fresh].slice(-MAX_KEYS));
}
