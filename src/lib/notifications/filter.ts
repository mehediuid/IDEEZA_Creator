// What the Notification settings do to the notices (V5). The bell never deletes
// a record: every notice is listed. The settings decide only whether one is
// heard, that is whether it pops up and adds to the bell's count:
// - a kind switched off (its `web` channel; email and mobile arrive with
//   sign-in, so they decide nothing in the app) isn't heard;
// - nor is a muted project's notice, a bid under the threshold, or a notice
//   that uses one of your hidden words (the bell masks its text too);
// - messages and team conversations count on the Messages badge, never on the
//   bell, though they are listed and may pop up;
// - quiet hours: no pop-ups, and the bell's count doesn't grow with what comes
//   in during the window, except a sale when "Let sales through" is on;
// - pop-ups: right away, once a day (one summary, popups.ts, and the bell
//   grouped by day) or paused (none at all; the count still grows).
// Pure; local wall-clock time comes from `Date`, so a test builds its times
// with `new Date(y, m, d, h)`.

import { WORD_HIDDEN_FOR_OWNER } from "../innovations/comments";
import { hasHiddenWord } from "../settings/audience";
import { formatDate } from "../settings/dates";
import { DEVICE_ZONE } from "../people/time-zones";
import { inQuietHours, type DateLocale, type NoticeKind, type SettingsV1 } from "../settings/prefs";
import { isNoticeRead } from "./read";
import type { Notice } from "./types";

const DAY = 86_400_000;
/** A read notice stays in the bell this long; an unread one until it is read. */
export const RECENT_MS = 30 * DAY;
/** The most notices the bell lists. */
export const BELL_MAX = 50;

/** The kinds the Messages badge counts: the bell lists them but never counts them. */
export const MESSAGES_KINDS: ReadonlySet<NoticeKind> = new Set<NoticeKind>(["message", "teams"]);

/** What the bell shows in place of text that uses a hidden word (the comments' own words). */
export const WORD_HIDDEN = WORD_HIDDEN_FOR_OWNER;

export function usesHiddenWord(n: Notice, words: readonly string[]): boolean {
  if (!words.length) return false;
  return hasHiddenWord(n.title, words) || (!!n.body && hasHiddenWord(n.body, words));
}

/** `n` as the bell shows it: a title that uses a hidden word is masked with its body; a body alone
 *  is masked on its own. Untouched (the same object) otherwise. */
export function maskNotice(n: Notice, words: readonly string[]): Notice {
  if (!words.length) return n;
  if (hasHiddenWord(n.title, words)) return { ...n, title: WORD_HIDDEN, body: undefined };
  if (n.body && hasHiddenWord(n.body, words)) return { ...n, body: WORD_HIDDEN };
  return n;
}

/** Whether the settings let `n` make itself heard: a pop-up, and (but for messages) the count. */
export function isHeard(n: Notice, s: SettingsV1): boolean {
  const p = s.notifications;
  if (!p.channels[n.kind].web) return false;
  if (n.projectId && p.mutedProjects.includes(n.projectId)) return false;
  if (n.bid && p.bidThreshold !== null && n.bid.usd !== null && n.bid.usd < p.bidThreshold) return false;
  return !usesHiddenWord(n, s.blocking.hiddenWords);
}

/** Whether `n`, unread, adds to the bell's count (quiet hours aside). */
export const countsOnBell = (n: Notice, s: SettingsV1) => !MESSAGES_KINDS.has(n.kind) && isHeard(n, s);

/** Newest first; read notices older than RECENT_MS dropped; at most BELL_MAX. */
export function bellNotices(list: readonly Notice[], readKeys: ReadonlySet<string>, now: number): Notice[] {
  return list
    .filter((n) => !isNoticeRead(n, readKeys) || now - n.at <= RECENT_MS)
    .sort((a, b) => b.at - a.at || a.id.localeCompare(b.id))
    .slice(0, BELL_MAX);
}

/** When the quiet hours holding `now` began, or null when `now` is outside them (or they're off). */
export function quietWindowStart(s: SettingsV1, now: number): number | null {
  const d = new Date(now);
  const minutes = d.getHours() * 60 + d.getMinutes();
  if (!inQuietHours(s, minutes)) return null;
  const [h, m] = s.notifications.quietHours.from.split(":").map(Number);
  const start = new Date(d);
  start.setHours(h, m, 0, 0);
  if (start.getTime() > now) start.setDate(start.getDate() - 1);
  return start.getTime();
}

/** A sale, with "Let sales through" on: it counts and pops up in quiet hours. */
export const breaksThrough = (n: Notice, s: SettingsV1) => !!n.urgent && s.notifications.quietHours.urgentBreaksThrough;

/** The bell's count: unread notices that count on it, less what came in during the current quiet hours. */
export function unreadCount(list: readonly Notice[], readKeys: ReadonlySet<string>, s: SettingsV1, now: number): number {
  const since = quietWindowStart(s, now);
  return list.filter(
    (n) => !isNoticeRead(n, readKeys) && countsOnBell(n, s) && (since === null || n.at < since || breaksThrough(n, s)),
  ).length;
}

export type PopupMode = "now" | "daily" | "paused";

export function popupModeOf(s: SettingsV1): PopupMode {
  if (s.notifications.popupsPaused) return "paused";
  return s.notifications.digest === "instant" ? "now" : "daily";
}

/** The settings patch that chooses `mode`. Pausing keeps the digest, so unpausing is a choice again. */
export function popupModePatch(mode: PopupMode): Partial<SettingsV1["notifications"]> {
  if (mode === "paused") return { popupsPaused: true };
  return { popupsPaused: false, digest: mode === "now" ? "instant" : "daily" };
}

/** Whether `n` may pop up now: heard, pop-ups right away, and outside quiet hours (or a sale let through). */
export function toastAllowed(n: Notice, s: SettingsV1, now: number): boolean {
  if (!isHeard(n, s) || popupModeOf(s) !== "now") return false;
  return quietWindowStart(s, now) === null || breaksThrough(n, s);
}

export type NoticeGroup = { key: string; label: string | null; notices: Notice[] };

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const dayLabel = (day: number, today: number, locale?: DateLocale) => {
  if (day === today) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === yesterday.getTime()) return "Yesterday";
  // `day` is a midnight on this device's calendar: named on that calendar.
  return formatDate(day, locale, { style: "weekday", timeZone: DEVICE_ZONE });
};

/** The bell's list: one list, or once a day a heading per day. `list` is already newest first;
 *  `locale` is the Date & Time Formatting choice (Settings › Language). */
export function groupNotices(list: readonly Notice[], mode: PopupMode, now: number, locale?: DateLocale): NoticeGroup[] {
  if (mode !== "daily") return [{ key: "all", label: null, notices: [...list] }];
  const today = startOfDay(now);
  const groups: NoticeGroup[] = [];
  for (const n of list) {
    const k = startOfDay(n.at);
    const key = String(k);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.notices.push(n);
    else groups.push({ key, label: dayLabel(k, today, locale), notices: [n] });
  }
  return groups;
}
