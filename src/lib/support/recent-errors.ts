// The last few errors this tab hit, for a problem report to carry. Pure
// apart from the store it's handed, so node:test can drive it.
//
// Fed from src/instrumentation-client.ts, which runs before the app hydrates,
// so an error from the first render is caught too, and by the 3D viewers'
// error boundaries (recordCaught), whose errors never reach `window`. Kept on globalThis (one
// ring whichever chunk imports this) and mirrored to sessionStorage, so the
// errors that broke a page survive the reload the maker does before
// reporting it, and go no further than this tab.

import { pageRefFor } from "./page-context";

export type RecentError = {
  at: number;
  message: string;
  /** "chunk.js:12": where it was thrown, query cut. */
  where?: string;
  /** The page label at the time, never a name. */
  page: string;
  count: number;
};

export const RECENT_MAX = 5;
const MESSAGE_MAX = 160;
const KEY = "ideeza:recent-errors";

/** Noise every app sees and no report needs. */
export function isNoise(message: string, filename = "", name = ""): boolean {
  if (!message || message === "Script error." || /ResizeObserver loop/.test(message)) return true;
  if (name === "AbortError") return true;
  return /^(chrome|moz|safari-web)-extension:/.test(filename);
}

/** URLs lose their query and hash (a token can ride in one), and the
 *  message is capped. */
export function cleanMessage(message: string): string {
  const flat = message.replace(/\s+/g, " ").trim().replace(/(https?:\/\/[^\s?#]+)[?#]\S*/g, "$1");
  return flat.length > MESSAGE_MAX ? `${flat.slice(0, MESSAGE_MAX - 1)}…` : flat;
}

export function whereOf(filename: string | undefined, line: number | undefined): string | undefined {
  if (!filename) return undefined;
  const base = filename.split(/[?#]/)[0].split("/").pop() || filename;
  return line ? `${base}:${line}` : base;
}

/** The same message again bumps its count and moves it to the front. */
export function pushError(list: readonly RecentError[], e: Omit<RecentError, "count">): RecentError[] {
  const same = list.find((x) => x.message === e.message && x.where === e.where);
  const rest = list.filter((x) => x !== same);
  const next: RecentError = same ? { ...e, count: same.count + 1 } : { ...e, count: 1 };
  return [next, ...rest].slice(0, RECENT_MAX);
}

type Ring = { list: RecentError[] };
const SLOT = Symbol.for("ideeza.recentErrors");

function ring(): Ring {
  const g = globalThis as unknown as Record<symbol, Ring | undefined>;
  if (!g[SLOT]) {
    let list: RecentError[] = [];
    try {
      const raw = sessionStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      if (Array.isArray(parsed)) list = parsed.filter((x) => x && typeof x.message === "string").slice(0, RECENT_MAX);
    } catch {
      // Storage blocked (Safari private mode): the ring lives in memory only.
    }
    g[SLOT] = { list };
  }
  return g[SLOT]!;
}

export function recordError(e: Omit<RecentError, "count">): void {
  const r = ring();
  r.list = pushError(r.list, e);
  try {
    sessionStorage.setItem(KEY, JSON.stringify(r.list));
  } catch {
    // As above.
  }
}

/** An error a React error boundary caught: it never reaches `window`'s
 *  error event, so a boundary hands it over itself. */
export function recordCaught(error: unknown): void {
  const e = error as { message?: unknown; name?: unknown } | null;
  const message = String(e?.message ?? error ?? "");
  if (typeof location === "undefined" || isNoise(message, "", typeof e?.name === "string" ? e.name : "")) return;
  recordError({ at: Date.now(), message: cleanMessage(message), page: pageRefFor(location.pathname, location.search).page });
}

export function recentErrors(): RecentError[] {
  return ring().list.slice();
}
