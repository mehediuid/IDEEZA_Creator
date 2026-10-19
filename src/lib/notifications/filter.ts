// What the Notification settings do to the notices (spec §5.6):
// - a kind's Web notification off hides its notices (email and mobile arrive
//   with sign-in, so they decide nothing in the app);
// - the bid threshold hides bids and offers under it (a coin with no dollar
//   value is never hidden by it: better shown than guessed);
// - a muted project's notices are hidden;
// - quiet hours: no toasts, and the bell's count doesn't grow with what comes
//   in during the window, except urgent notices (money received) when they
//   are let through;
// - a daily or weekly summary sends no toasts and groups the bell by day or
//   by week.
// Pure; local wall-clock time comes from `Date`, so a test builds its times
// with `new Date(y, m, d, h)`.

import { formatDate } from "../settings/dates";
import { inQuietHours, type DateLocale, type SettingsV1 } from "../settings/prefs";
import { isNoticeRead } from "./read";
import type { Notice } from "./types";

const DAY = 86_400_000;
/** A read notice stays in the bell this long; an unread one until it is read. */
export const RECENT_MS = 30 * DAY;
/** The most notices the bell lists. */
export const BELL_MAX = 50;

/** Whether the settings let `n` show at all. */
export function passesPrefs(n: Notice, s: SettingsV1): boolean {
  const p = s.notifications;
  if (!p.channels[n.kind].web) return false;
  if (n.projectId && p.mutedProjects.includes(n.projectId)) return false;
  if (n.bid && p.bidThreshold !== null && n.bid.usd !== null && n.bid.usd < p.bidThreshold) return false;
  return true;
}

export function filterNotices(list: readonly Notice[], s: SettingsV1): Notice[] {
  return list.filter((n) => passesPrefs(n, s));
}

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

/** An urgent notice the settings let through quiet hours. */
export const breaksThrough = (n: Notice, s: SettingsV1) => !!n.urgent && s.notifications.quietHours.urgentBreaksThrough;

/** The bell's count: unread notices, less what came in during the current quiet hours. */
export function unreadCount(list: readonly Notice[], readKeys: ReadonlySet<string>, s: SettingsV1, now: number): number {
  const since = quietWindowStart(s, now);
  return list.filter((n) => !isNoticeRead(n, readKeys) && (since === null || n.at < since || breaksThrough(n, s))).length;
}

/** Whether `n` may show as a toast now. */
export function toastAllowed(n: Notice, s: SettingsV1, now: number): boolean {
  if (!passesPrefs(n, s) || s.notifications.digest !== "instant") return false;
  return quietWindowStart(s, now) === null || breaksThrough(n, s);
}

export type NoticeGroup = { key: string; label: string | null; notices: Notice[] };

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Monday 00:00 of the week holding `ms`. */
const startOfWeek = (ms: number) => {
  const d = new Date(startOfDay(ms));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
};

const dayLabel = (day: number, today: number, locale?: DateLocale) => {
  if (day === today) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === yesterday.getTime()) return "Yesterday";
  return formatDate(day, locale, { style: "weekday" });
};

const weekLabel = (week: number, thisWeek: number, locale?: DateLocale) => {
  if (week === thisWeek) return "This week";
  const last = new Date(thisWeek);
  last.setDate(last.getDate() - 7);
  if (week === last.getTime()) return "Last week";
  return `Week of ${formatDate(week, locale, { style: "day" })}`;
};

/** The bell's list as the digest shows it: one list right away, else a heading per day or week.
 *  `list` is already newest first. */
/** `locale` is the Date & Time Formatting choice (Settings › Language). */
export function groupNotices(
  list: readonly Notice[],
  digest: SettingsV1["notifications"]["digest"],
  now: number,
  locale?: DateLocale,
): NoticeGroup[] {
  if (digest === "instant") return [{ key: "all", label: null, notices: [...list] }];
  const of = digest === "daily" ? startOfDay : startOfWeek;
  const label = digest === "daily" ? (k: number) => dayLabel(k, startOfDay(now), locale) : (k: number) => weekLabel(k, startOfWeek(now), locale);
  const groups: NoticeGroup[] = [];
  for (const n of list) {
    const k = of(n.at);
    const key = String(k);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.notices.push(n);
    else groups.push({ key, label: label(k), notices: [n] });
  }
  return groups;
}
