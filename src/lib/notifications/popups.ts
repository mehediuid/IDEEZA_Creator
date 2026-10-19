// When a notice pops up beyond the bell (V5): the once-a-day summary, the
// browser's own pop-ups outside a hidden tab, and asking for those once, when
// a build starts. The settings' gate is filter.ts `toastAllowed`; this file
// adds what the browser decides (permission, a hidden tab) and what the
// summary counts. Pure, relative imports only.

import { isHeard, popupModeOf, quietWindowStart, toastAllowed } from "./filter";
import { isNoticeRead } from "./read";
import { KIND_LABELS, SHOWN_KINDS, type Notice, type ShownKind } from "./types";
import type { SettingsV1 } from "../settings/prefs";

const DAY = 86_400_000;

// ─────────────────────────── once a day ───────────────────────────

/** The last summary shown in this browser: its local day and when. */
export const SUMMARY_KEY = "ideeza:notifications:summary";
export type SummaryMark = { day: string; at: number };

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-14": the local day holding `ms`. */
export function dayKeyOf(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function decodeSummaryMark(v: unknown): SummaryMark | null {
  if (!v || typeof v !== "object") return null;
  const { day, at } = v as { day?: unknown; at?: unknown };
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  if (typeof at !== "number" || !Number.isFinite(at) || at <= 0) return null;
  return { day, at };
}

/** Once a day, the first look after the day turns, outside quiet hours. */
export function summaryDue(s: SettingsV1, mark: SummaryMark | null, now: number): boolean {
  if (popupModeOf(s) !== "daily") return false;
  if (mark && mark.day === dayKeyOf(now)) return false;
  return quietWindowStart(s, now) === null;
}

export type DailySummary = {
  total: number;
  parts: { kind: ShownKind; label: string; count: number }[];
  /** "last": since the last summary; "day": the first one, over the last day. */
  since: "last" | "day";
};

/** What came in since the last summary (or over the last day) that is heard and still unread. */
export function dailySummary(
  list: readonly Notice[],
  readKeys: ReadonlySet<string>,
  s: SettingsV1,
  mark: SummaryMark | null,
  now: number,
): DailySummary {
  const from = mark ? mark.at : now - DAY;
  const counts = new Map<ShownKind, number>();
  for (const n of list) {
    if (n.at <= from || n.at > now || isNoticeRead(n, readKeys) || !isHeard(n, s)) continue;
    const kind = n.kind as ShownKind;
    if (!SHOWN_KINDS.includes(kind)) continue;
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  const parts = SHOWN_KINDS.filter((k) => counts.has(k)).map((k) => ({ kind: k, label: KIND_LABELS[k], count: counts.get(k)! }));
  return { total: parts.reduce((sum, p) => sum + p.count, 0), parts, since: mark ? "last" : "day" };
}

/** "4 new since your last summary: Sales and bids 2, Builds and videos 1, Messages and requests 1." */
export function summaryLine(sum: DailySummary): string {
  const when = sum.since === "last" ? "since your last summary" : "in the last day";
  return `${sum.total} new ${when}: ${sum.parts.map((p) => `${p.label} ${p.count}`).join(", ")}.`;
}

// ─────────────────────────── outside the tab ───────────────────────────

/** The browser's answer for its own pop-ups, or "unsupported" when it has none (iOS Safari in a tab). */
export type PopupPermission = "granted" | "denied" | "default" | "unsupported";

/** Set once IDEEZA has asked at a build, so it never asks there again. */
export const ASKED_KEY = "ideeza:notifications:asked";

/** Ask when a build starts: only if the browser hasn't been asked, IDEEZA never asked at a build,
 *  and a finished build could pop up right away. */
export function shouldAskAtBuild(permission: PopupPermission, asked: boolean, s: SettingsV1): boolean {
  return permission === "default" && !asked && popupModeOf(s) === "now" && s.notifications.channels.product.web;
}

/** The notices this tab hasn't seen before, unread. */
export function freshNotices(list: readonly Notice[], known: ReadonlySet<string>, readKeys: ReadonlySet<string>): Notice[] {
  return list.filter((n) => !known.has(n.id) && !isNoticeRead(n, readKeys));
}

/** A browser pop-up: the tab is out of view (in view, the page itself shows it), the browser allows
 *  it, and the settings let `n` pop up now. */
export function browserPopupAllowed(
  n: Notice,
  s: SettingsV1,
  now: number,
  tab: { hidden: boolean; permission: PopupPermission },
): boolean {
  return tab.hidden && tab.permission === "granted" && toastAllowed(n, s, now);
}
