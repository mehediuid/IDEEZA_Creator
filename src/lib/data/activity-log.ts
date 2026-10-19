// Your activity's own log (Settings › Your activity, spec §5.12): the searches
// you ran — ⌘K queries you acted on, Innovations and Explore marketplace
// searches — and the post videos you watched (played for 3 seconds or more).
// One versioned key, `ideeza:activity`, newest first. Both lists keep 90 days
// and at most 200 lines; older lines go on every read and write. Typing one
// search is one line: a longer or shorter form of the last query from the same
// place within a few minutes replaces it. Nothing here leaves this browser.
//
// Appreciations and comments are not copied here: they are read from the
// Innovations stores where they live.
//
// Relative imports only (node:test loads the pure part).

import * as React from "react";
import { parseStored, storedUnreadable, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { dayDate } from "../blog/dates";

export const ACTIVITY_KEY = "ideeza:activity";
export const KEEP_DAYS = 90;
export const MAX_ENTRIES = 200;
/** Within this, a longer or shorter form of the last query is the same search being typed. */
export const COALESCE_MS = 3 * 60 * 1000;
export const QUERY_MAX = 200;
/** A video counts as watched once it has played this long. */
export const WATCHED_SECONDS = 3;

export const SEARCH_SOURCES = ["palette", "innovations", "explore"] as const;
export type SearchSource = (typeof SEARCH_SOURCES)[number];

export const SEARCH_SOURCE_LABEL: Record<SearchSource, string> = {
  palette: "Search (⌘K)",
  innovations: "Innovations",
  explore: "Explore marketplace",
};

export type SearchEntry = { id: string; at: number; source: SearchSource; query: string; opened: string | null };
export type WatchEntry = { id: string; at: number; postId: string; postTitle: string; href: string; video: string };
export type ActivityLog = { v: 1; searches: SearchEntry[]; watches: WatchEntry[] };

export const EMPTY_LOG: ActivityLog = Object.freeze({ v: 1, searches: [], watches: [] }) as ActivityLog;

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

function watchIn(v: unknown): WatchEntry | null {
  if (!isObj(v)) return null;
  const id = str(v.id, 64);
  const at = time(v.at);
  const postId = str(v.postId, 200);
  const href = str(v.href, 400);
  if (!id || !at || !postId || !href || !href.startsWith("/")) return null;
  const postTitle = str(v.postTitle, 200) ?? "Untitled post";
  return { id, at, postId, postTitle, href, video: str(v.video, 200) ?? postTitle };
}

const newestFirst = <T extends { at: number }>(list: T[]) => list.slice().sort((a, b) => b.at - a.at);

function keep<T extends { at: number }>(list: readonly T[], now: number): T[] {
  const from = now - KEEP_DAYS * DAY_MS;
  return newestFirst(list.filter((e) => e.at >= from)).slice(0, MAX_ENTRIES);
}

/** Drops what is past 90 days or past 200 lines. Returns the same log when nothing goes. */
export function pruneLog(log: ActivityLog, now: number): ActivityLog {
  const searches = keep(log.searches, now);
  const watches = keep(log.watches, now);
  const same = (a: { id: string }[], b: { id: string }[]) => a.length === b.length && a.every((x, i) => x.id === b[i].id);
  return same(searches, log.searches) && same(watches, log.watches) ? log : { v: 1, searches, watches };
}

export function normalizeActivityLog(raw: unknown, now: number): ActivityLog {
  if (!isObj(raw) || raw.v !== 1) return EMPTY_LOG;
  const searches = Array.isArray(raw.searches) ? raw.searches.map(searchIn).filter((s): s is SearchEntry => s !== null) : [];
  const watches = Array.isArray(raw.watches) ? raw.watches.map(watchIn).filter((w): w is WatchEntry => w !== null) : [];
  if (!searches.length && !watches.length) return EMPTY_LOG;
  return { v: 1, searches: keep(searches, now), watches: keep(watches, now) };
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

/** One video more. The same video again on the same day moves up instead of repeating. */
export function withWatch(
  log: ActivityLog,
  input: { postId: string; postTitle: string; href: string; video: string },
  now: number,
  id: string,
): ActivityLog {
  const today = dayKey(now);
  const again = log.watches.find((w) => w.postId === input.postId && w.video === input.video && dayKey(w.at) === today);
  const rest = again ? log.watches.filter((w) => w.id !== again.id) : log.watches;
  const entry: WatchEntry = { id: again ? again.id : id, at: now, ...input };
  return pruneLog({ ...log, watches: [entry, ...rest] }, now);
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

/** Keeps a search you ran. Called by ⌘K (when you open a result), Innovations and Explore. */
export function recordSearch(source: SearchSource, query: string, opened?: string | null): void {
  if (!query.trim()) return;
  updateLog((log, now) => withSearch(log, { source, query, opened }, now, newId()));
}

/** Keeps a post video you watched for 3 seconds or more. */
export function recordWatch(input: { postId: string; postTitle: string; href: string; video: string }): void {
  updateLog((log, now) => withWatch(log, input, now, newId()));
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

export function clearSearchHistory(): WriteResult {
  return writeStoredKey(ACTIVITY_KEY, { ...readLog(Date.now()), searches: [] });
}

export function clearWatchHistory(): WriteResult {
  return writeStoredKey(ACTIVITY_KEY, { ...readLog(Date.now()), watches: [] });
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
