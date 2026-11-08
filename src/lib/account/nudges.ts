// What the upgrade nudges remember, per account (decision 5 of the upgrade plan):
// - a card the app shows on its own (the first-build card, the return coupon)
//   shows at most one a day across the app;
// - ✕ hides that card for 7 days;
// - a once-only card (the first build) never comes back after it was shown;
// - the return coupon (F2) shows at most once in 30 days. It shows inside a
//   limit moment (the Buy credits dialog), so it doesn't take the day's card.
// Limit moments (no credits, the Buy credits dialog, a locked quality) are not
// capped: there the plan sits beside the fix.
//
// `ideeza:nudges`, by email, through the shared key store. Relative imports only.

import * as React from "react";
import { parseStored, readStoredKey, storedUnreadable, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";

export const NUDGES_KEY = "ideeza:nudges";
export const DISMISS_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

export type NudgeEntry = {
  /** The local day ("2026-11-08") a capped card last showed, and which one. */
  shownDay: string | null;
  shownId: string | null;
  /** When each card last showed. */
  shown: Record<string, number>;
  /** When ✕ was pressed on each card. */
  dismissed: Record<string, number>;
};

type NudgeRecord = { v: 1; byEmail: Record<string, NudgeEntry> };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const key = (email: string) => email.trim().toLowerCase();
const times = (v: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (!isObj(v)) return out;
  for (const [k, t] of Object.entries(v)) if (typeof t === "number" && Number.isFinite(t) && t > 0) out[k] = t;
  return out;
};

export const EMPTY_NUDGES: NudgeEntry = { shownDay: null, shownId: null, shown: {}, dismissed: {} };

export function normalizeNudges(raw: unknown): NudgeRecord {
  const out: NudgeRecord = { v: 1, byEmail: {} };
  if (!isObj(raw) || !isObj(raw.byEmail)) return out;
  for (const [email, e] of Object.entries(raw.byEmail)) {
    if (!isObj(e)) continue;
    out.byEmail[key(email)] = {
      shownDay: typeof e.shownDay === "string" ? e.shownDay : null,
      shownId: typeof e.shownId === "string" ? e.shownId : null,
      shown: times(e.shown),
      dismissed: times(e.dismissed),
    };
  }
  return out;
}

/** The maker's local day, "2026-11-08". */
export function dayKey(now: number): string {
  const d = new Date(now);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

export type NudgeRule = {
  /** Shown once ever (the first-build card). */
  once?: boolean;
  /** At most once in this many days (the return coupon: 30). */
  everyDays?: number;
  /** Counts as the day's one card (default). False for a line inside a limit moment. */
  capped?: boolean;
};

/** Whether a capped card may show now. A card already shown today keeps showing for the rest of the day. */
export function mayShow(entry: NudgeEntry, id: string, now: number, rule: NudgeRule = {}): boolean {
  const dismissedAt = entry.dismissed[id];
  if (dismissedAt !== undefined && now - dismissedAt < DISMISS_DAYS * DAY) return false;
  const today = dayKey(now);
  if (entry.shownDay === today && entry.shownId === id) return true;
  const shownAt = entry.shown[id];
  if (rule.once && shownAt !== undefined) return false;
  if (rule.everyDays && shownAt !== undefined && now - shownAt < rule.everyDays * DAY) {
    // Still the same day it showed: it keeps showing for the rest of the day.
    return rule.capped === false && dayKey(shownAt) === today;
  }
  if (rule.capped === false) return true;
  // One card a day across the app.
  return entry.shownDay !== today;
}

export function withShown(entry: NudgeEntry, id: string, now: number, capped = true): NudgeEntry {
  const today = dayKey(now);
  if (entry.shownDay === today && entry.shownId === id) return entry;
  if (!capped) {
    const at = entry.shown[id];
    return at !== undefined && dayKey(at) === today ? entry : { ...entry, shown: { ...entry.shown, [id]: now } };
  }
  return { ...entry, shownDay: today, shownId: id, shown: { ...entry.shown, [id]: now } };
}

export function withDismissed(entry: NudgeEntry, id: string, now: number): NudgeEntry {
  return { ...entry, dismissed: { ...entry.dismissed, [id]: now } };
}

// ─────────────────────────── the store ───────────────────────────

function read(): NudgeRecord {
  return normalizeNudges(parseStored(readStoredKey(NUDGES_KEY)).value);
}

function write(email: string, next: (e: NudgeEntry) => NudgeEntry): WriteResult {
  if (storedUnreadable(NUDGES_KEY, isObj)) return { ok: false };
  const rec = read();
  const before = rec.byEmail[key(email)] ?? EMPTY_NUDGES;
  const after = next(before);
  if (after === before) return { ok: true };
  return writeStoredKey(NUDGES_KEY, { ...rec, byEmail: { ...rec.byEmail, [key(email)]: after } });
}

export function markNudgeShown(email: string, id: string, now: number, capped = true): WriteResult {
  return write(email, (e) => withShown(e, id, now, capped));
}

export function dismissNudge(email: string, id: string, now: number): WriteResult {
  return write(email, (e) => withDismissed(e, id, now));
}

/** An account's nudge record, live. */
export function useNudgeEntry(email: string | null): { hydrated: boolean; entry: NudgeEntry } {
  const { hydrated, raw } = useStoredKey(NUDGES_KEY);
  return React.useMemo(
    () => ({ hydrated, entry: email ? (normalizeNudges(parseStored(raw).value).byEmail[key(email)] ?? EMPTY_NUDGES) : EMPTY_NUDGES }),
    [hydrated, raw, email],
  );
}
