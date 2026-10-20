// Search history (Settings › AI & your data): the searches you ran — ⌘K
// queries you acted on, Innovations and Explore marketplace searches — kept
// only while "Keep my search history" is on (`privacy.keepSearchHistory`, off
// by default). One versioned key, `ideeza:activity`, newest first: 90 days and
// at most 200 lines; older lines go on every read and write. Typing one search
// is one line: a longer or shorter form of the last query from the same place
// within a few minutes replaces it. Nothing here leaves this browser.
//
// Older versions also logged the post videos you watched; that log is gone,
// and reading a record drops what is left of it.
//
// Relative imports only (node:test loads the pure part).

import * as React from "react";
import { parseStored, readStoredKey, storedUnreadable, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { dayDate } from "../blog/dates";
import { readSettings } from "../settings/prefs";

export const ACTIVITY_KEY = "ideeza:activity";
export const KEEP_DAYS = 90;
export const MAX_ENTRIES = 200;
/** Within this, a longer or shorter form of the last query is the same search being typed. */
export const COALESCE_MS = 3 * 60 * 1000;
export const QUERY_MAX = 200;

export const SEARCH_SOURCES = ["palette", "innovations", "explore"] as const;
export type SearchSource = (typeof SEARCH_SOURCES)[number];

export const SEARCH_SOURCE_LABEL: Record<SearchSource, string> = {
  palette: "Search (⌘K)",
  innovations: "Innovations",
  explore: "Explore marketplace",
};

export type SearchEntry = { id: string; at: number; source: SearchSource; query: string; opened: string | null };
export type ActivityLog = { v: 1; searches: SearchEntry[] };

export const EMPTY_LOG: ActivityLog = Object.freeze({ v: 1, searches: [] }) as ActivityLog;

const DAY_MS = 24 * 60 * 60 * 1000;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 300): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const time = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

function searchIn(v: unknown): SearchEntry | null {
  if (!isObj(v)) return null;
  const id = str(v.id, 64);
  const at = time(v.at);
  const query = str(v.query, QUERY_MAX);
  const source = SEARCH_SOURCES.find((s) => s === v.source);
  if (!id || !at || !query || !source) return null;
  return { id, at, source, query, opened: str(v.opened, 120) };
}

const newestFirst = <T extends { at: number }>(list: T[]) => list.slice().sort((a, b) => b.at - a.at);

function keep<T extends { at: number }>(list: readonly T[], now: number): T[] {
  const from = now - KEEP_DAYS * DAY_MS;
  return newestFirst(list.filter((e) => e.at >= from)).slice(0, MAX_ENTRIES);
}

/** Drops what is past 90 days or past 200 lines. Returns the same log when nothing goes. */
export function pruneLog(log: ActivityLog, now: number): ActivityLog {
  const searches = keep(log.searches, now);
  const same = searches.length === log.searches.length && searches.every((x, i) => x.id === log.searches[i].id);
  return same ? log : { v: 1, searches };
}

/** The stored log, checked. An older record's `watches` are dropped. */
export function normalizeActivityLog(raw: unknown, now: number): ActivityLog {
  if (!isObj(raw) || raw.v !== 1) return EMPTY_LOG;
  const searches = Array.isArray(raw.searches) ? raw.searches.map(searchIn).filter((s): s is SearchEntry => s !== null) : [];
  if (!searches.length) return EMPTY_LOG;
  return { v: 1, searches: keep(searches, now) };
}

const sameTyping = (a: string, b: string) => {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x.startsWith(y) || y.startsWith(x);
};

/** One search more. An empty query changes nothing (the same log comes back). */
export function withSearch(
  log: ActivityLog,
  input: { source: SearchSource; query: string; opened?: string | null },
  now: number,
  id: string,
): ActivityLog {
  const query = input.query.trim().slice(0, QUERY_MAX);
  if (!query) return log;
  const opened = input.opened?.trim() ? input.opened.trim().slice(0, 120) : null;
  const last = log.searches.find((s) => s.source === input.source);
  const typing = !!last && now - last.at <= COALESCE_MS && sameTyping(last.query, query);
  const rest = typing ? log.searches.filter((s) => s.id !== last.id) : log.searches;
  const entry: SearchEntry = { id: typing ? last.id : id, at: now, source: input.source, query, opened };
  return pruneLog({ ...log, searches: [entry, ...rest] }, now);
}

/** A local calendar day, "2026-10-19". */
export function dayKey(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type DayGroup<T> = { key: string; label: string; items: T[] };

/** Items (newest first) under their local day: "Today", "Yesterday", then "2 Oct 2026". */
export function groupByDay<T extends { at: number }>(items: readonly T[], now: number): DayGroup<T>[] {
  const today = dayKey(now);
  const yesterday = dayKey(new Date(new Date(now).setDate(new Date(now).getDate() - 1)).getTime());
  const out: DayGroup<T>[] = [];
  for (const item of newestFirst(items.slice())) {
    const key = dayKey(item.at);
    let group = out.find((g) => g.key === key);
    if (!group) {
      group = { key, label: key === today ? "Today" : key === yesterday ? "Yesterday" : dayDate(item.at), items: [] };
      out.push(group);
    }
    group.items.push(item);
  }
  return out;
}

/** Where a search can run again: Innovations and Explore keep their query in the address. */
export function searchHref(e: Pick<SearchEntry, "source" | "query">): string | null {
  const qs = new URLSearchParams({ q: e.query }).toString();
  if (e.source === "innovations") return `/innovations?${qs}`;
  if (e.source === "explore") return `/marketplace?${qs}`;
  return null;
}

// ──────────────────────────────── browser ─────────────────────────────────

const isLogShape = (v: unknown) => isObj(v) && v.v === 1;

function readLog(now: number): ActivityLog {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(ACTIVITY_KEY);
  } catch {
    return EMPTY_LOG;
  }
  return normalizeActivityLog(parseStored(raw).value, now);
}

function newId(): string {
  return `act_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Applies `fn` to the freshest log and saves it. A log that can't be read is never written over. */
function updateLog(fn: (log: ActivityLog, now: number) => ActivityLog): WriteResult {
  if (typeof window === "undefined") return { ok: false };
  if (storedUnreadable(ACTIVITY_KEY, isLogShape)) return { ok: false };
  const now = Date.now();
  const cur = readLog(now);
  const next = fn(cur, now);
  if (next === cur) return { ok: true };
  return writeStoredKey(ACTIVITY_KEY, next);
}

/** Keeps a search you ran, only while "Keep my search history" is on. Called by ⌘K (when you
 *  open a result), Innovations and Explore. */
export function recordSearch(source: SearchSource, query: string, opened?: string | null): void {
  if (!query.trim() || !readSettings().privacy.keepSearchHistory) return;
  updateLog((log, now) => withSearch(log, { source, query, opened }, now, newId()));
}

/** ⌘K's results, each keeping the query when it is opened. Only a typed query is kept. */
export function logActivations<T extends { label: string; onActivate: () => void }>(items: T[], query: string): T[] {
  if (!query.trim()) return items;
  return items.map((item) => ({
    ...item,
    onActivate: () => {
      recordSearch("palette", query, item.label);
      item.onActivate();
    },
  }));
}

/** Rewrites a stored log that still holds the old video watch log, without it. */
export function dropOldWatchLog(): void {
  const { value, unreadable } = parseStored(readStoredKey(ACTIVITY_KEY));
  if (unreadable || !isObj(value) || !("watches" in value)) return;
  writeStoredKey(ACTIVITY_KEY, normalizeActivityLog(value, Date.now()));
}

export function clearSearchHistory(): WriteResult {
  return writeStoredKey(ACTIVITY_KEY, EMPTY_LOG);
}

const MINUTE = 60_000;
const subscribeMinute = (onChange: () => void) => {
  const t = window.setInterval(onChange, MINUTE);
  return () => window.clearInterval(t);
};

/** The wall clock to the minute, so lines past 90 days drop while the page is open and render stays pure. */
export function useMinuteNow(): number {
  return React.useSyncExternalStore(subscribeMinute, () => Math.floor(Date.now() / MINUTE) * MINUTE, () => 0);
}

/** The log, live. `unreadable` = something is stored that isn't a log (it is never written over, except by Clear). */
export function useActivityLog(): { hydrated: boolean; log: ActivityLog; unreadable: boolean; now: number } {
  const { hydrated, raw } = useStoredKey(ACTIVITY_KEY);
  const now = useMinuteNow();
  return React.useMemo(() => {
    const { value, unreadable } = parseStored(raw);
    return {
      hydrated,
      now,
      log: normalizeActivityLog(value, now),
      unreadable: raw !== null && (unreadable || !isLogShape(value)),
    };
  }, [hydrated, raw, now]);
}
