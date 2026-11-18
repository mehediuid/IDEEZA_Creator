"use client";

// The Feed's phone-side stores (lib/innovations/feed-prefs.ts, search.ts and
// lib/notifications/phone.ts) through the shared key store, so every screen
// that reads one moves when another writes it. Writes read the key afresh, so
// two quick taps never lose one, and nothing is written before the key is read.

import * as React from "react";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey } from "@/lib/key-store";
import { FEED_PREFS_KEY, feedPrefsIn, type FeedPrefs } from "@/lib/innovations/feed-prefs";
import { RECENT_SEARCHES_KEY, recentIn, type RecentSearch } from "@/lib/innovations/search";
import { NOTICE_CLEARED_KEY, clearedIn, type Cleared } from "@/lib/notifications/phone";

function useStoredValue<T>(key: string, decode: (value: unknown) => T) {
  const { hydrated, raw } = useStoredKey(key);
  const value = React.useMemo(() => decode(parseStored(raw).value), [raw, decode]);
  const update = React.useCallback(
    (fn: (cur: T) => T): boolean => {
      if (!hydrated) return false;
      return writeStoredKey(key, fn(decode(parseStored(readStoredKey(key)).value))).ok;
    },
    [hydrated, key, decode],
  );
  return { hydrated, value, update };
}

export function useFeedPrefs(): { hydrated: boolean; prefs: FeedPrefs; update: (fn: (p: FeedPrefs) => FeedPrefs) => boolean } {
  const { hydrated, value, update } = useStoredValue(FEED_PREFS_KEY, feedPrefsIn);
  return { hydrated, prefs: value, update };
}

export function useRecentSearches(): {
  hydrated: boolean;
  recent: RecentSearch[];
  update: (fn: (r: RecentSearch[]) => RecentSearch[]) => boolean;
} {
  const { hydrated, value, update } = useStoredValue(RECENT_SEARCHES_KEY, recentIn);
  return { hydrated, recent: value, update };
}

export function useClearedNotices(): { hydrated: boolean; cleared: Cleared; update: (fn: (c: Cleared) => Cleared) => boolean } {
  const { hydrated, value, update } = useStoredValue(NOTICE_CLEARED_KEY, clearedIn);
  return { hydrated, cleared: value, update };
}

/** A fresh id for a share or a comment. */
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function subscribeMinute(onChange: () => void) {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
}
const minuteNow = () => Math.floor(Date.now() / 60_000) * 60_000;

/** "Now" to the minute, moving on its own: what "5 minutes ago" is measured from. 0 before hydration. */
export function useMinuteNow(): number {
  return React.useSyncExternalStore(subscribeMinute, minuteNow, () => 0);
}
