// The phone's Notification screen (mobile Figma, Design - Light Mode ›
// Notification) over the web's notices (sources.ts, the bell's one list):
// - All and Unread; All puts what is unread under "New", then what was read by
//   day (Today, Yesterday, then the date); Unread lists by day;
// - each notice's button says what it does there ("Try again", "Reply",
//   "View sale"), and leads to the phone's own screen for exactly that: the
//   thread, the build's chat, Plans, the project's Earn tab, the comment;
// - Delete this notification and Clear all take notices off this phone's list
//   (the web's bell keeps every record; the phone keeps what it cleared under
//   `ideeza:m:notifications:cleared`).
// Pure, relative imports only.

import type { Notice } from "./types";

export const NOTICE_CLEARED_KEY = "ideeza:m:notifications:cleared";
export const CLEARED_MAX = 1000;

/** What this phone took off its list: single notices, and everything up to a moment (Clear all). */
export type Cleared = { v: 1; ids: string[]; before: number | null };

export const NOTHING_CLEARED: Cleared = { v: 1, ids: [], before: null };

export function clearedIn(value: unknown): Cleared {
  if (typeof value !== "object" || value === null) return NOTHING_CLEARED;
  const r = value as Record<string, unknown>;
  const list = Array.isArray(r.ids) ? [...new Set(r.ids.filter((x): x is string => typeof x === "string" && x.length > 0))] : [];
  return { v: 1, ids: list.slice(-CLEARED_MAX), before: typeof r.before === "number" && Number.isFinite(r.before) ? r.before : null };
}

export const isCleared = (n: Pick<Notice, "id" | "at">, c: Cleared) => c.ids.includes(n.id) || (c.before !== null && n.at <= c.before);

export function withClearedId(c: Cleared, id: string): Cleared {
  return c.ids.includes(id) ? c : { ...c, ids: [...c.ids, id].slice(-CLEARED_MAX) };
}

/** Clear all: everything that has happened up to `now`; what comes later still arrives. */
export function withAllCleared(c: Cleared, now: number): Cleared {
  return { v: 1, ids: [], before: Math.max(now, c.before ?? 0) };
}

// ─────────────────────────── groups ───────────────────────────

export type PhoneTab = "all" | "unread";

export type PhoneGroup = { key: string; label: string; notices: Notice[] };

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** "27 December, 2024" (the Figma's date), on this device's calendar. */
export function longDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "long" })}, ${d.getFullYear()}`;
}

/** "27 December, 2024 12:44". */
export function noticeTime(ms: number): string {
  const d = new Date(ms);
  return `${longDate(ms)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "Today", "Yesterday", else the date (`date` writes it: Settings › Language's format in the app). */
export function dayLabelOf(day: number, now: number, date: (ms: number) => string = longDate): string {
  const today = startOfDay(now);
  if (day === today) return "Today";
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (day === y.getTime()) return "Yesterday";
  return date(day);
}

function byDay(list: readonly Notice[], now: number, date?: (ms: number) => string): PhoneGroup[] {
  const groups: PhoneGroup[] = [];
  for (const n of list) {
    const day = startOfDay(n.at);
    const last = groups[groups.length - 1];
    if (last && last.key === String(day)) last.notices.push(n);
    else groups.push({ key: String(day), label: dayLabelOf(day, now, date), notices: [n] });
  }
  return groups;
}

/** The list under its headings. `list` is newest first and already without what was cleared. */
export function phoneGroups(
  list: readonly Notice[],
  isRead: (n: Notice) => boolean,
  tab: PhoneTab,
  now: number,
  date?: (ms: number) => string,
): PhoneGroup[] {
  const unread = list.filter((n) => !isRead(n));
  if (tab === "unread") return byDay(unread, now, date);
  const read = list.filter((n) => isRead(n));
  return [...(unread.length ? [{ key: "new", label: "New", notices: unread }] : []), ...byDay(read, now, date)];
}

// ─────────────────────────── what each notice offers ───────────────────────────

/** The notice's button, by what it is (its id says: "build:…:retry", "sale:…"). */
export function actionLabelOf(n: Pick<Notice, "id" | "kind">): string {
  const [type, , reason] = n.id.split(":");
  switch (type) {
    case "build":
      return reason === "retry" ? "Try again" : reason === "credits" ? "Buy credits" : reason === "cap" ? "See limits" : "Review build";
    case "msg":
      return "Reply";
    case "req":
      return "See request";
    case "team":
      return "Open chat";
    case "sale":
      return "View sale";
    case "bid":
      return "View bids";
    case "auction":
      return "View auction";
    case "coin":
      return n.id.startsWith("coin:plan") ? "See plan" : "Buy credits";
    case "payout":
      return "See Get paid";
    case "video":
      return "Watch video";
    case "comment":
      return "View comment";
    case "blog":
      return "Read";
    case "sec":
      return n.id.startsWith("sec:device:") ? "It’s me" : "Review";
    default:
      return "Open";
  }
}

/** The notice's second button, when the Figma draws two (a new sign-in: It's me · Log Out). */
export function secondActionOf(n: Pick<Notice, "id">): { label: string; does: "sign-out-device" } | null {
  return n.id.startsWith("sec:device:") ? { label: "Log Out", does: "sign-out-device" } : null;
}

/** The device a "new sign-in" notice is about. */
export const deviceIdOf = (n: Pick<Notice, "id">) => (n.id.startsWith("sec:device:") ? n.id.slice("sec:device:".length) : null);

// ─────────────────────────── account & security ───────────────────────────

export type SecurityFacts = {
  passwordChangedAt: number;
  twoStepSince: number | null;
  /** Other devices signed in to the account (this phone is not one of them). */
  devices: readonly { id: string; name: string; os: string; where: string; signedInAt: number; demo?: boolean }[];
};

/** The phone's account and security notices (mobile Figma Notification: a new sign-in with It's
 *  me / Log Out, password changed, 2-step turned on), from what Sign-in & security keeps. They
 *  are the phone's own: the web's bell has no account notices. */
export function securityNotices(f: SecurityFacts): Notice[] {
  const tag = "Account & security";
  const out: Notice[] = f.devices.map((d) => ({
    id: `sec:device:${d.id}`,
    kind: "other",
    tag,
    title: `New sign-in on ${d.name}`,
    // The Shared kit's stand-in phone says it is one (SET-5): no real device signed in.
    body: d.demo ? `Demo · ${[d.os, d.where].filter(Boolean).join(" · ")}. No real device signed in.` : [d.os, d.where].filter(Boolean).join(" · ") + ". Was this you?",
    href: "/settings/security",
    at: d.signedInAt,
  }));
  if (f.passwordChangedAt > 0) {
    out.push({ id: `sec:password:${f.passwordChangedAt}`, kind: "other", tag, title: "Your password was changed", body: "If this wasn’t you, change it now.", href: "/settings/security", at: f.passwordChangedAt });
  }
  if (f.twoStepSince !== null) {
    out.push({ id: `sec:two-step:${f.twoStepSince}`, kind: "other", tag, title: "2-step verification is on", href: "/settings/security", at: f.twoStepSince });
  }
  return out;
}

const enc = encodeURIComponent;

/** The phone's screen for what a notice is about (`href` is the web address it carries):
 *  - a product → its details; a project's Earn (a sale, a bid, an auction) → the same Earn tab,
 *    keeping `?sale=`; a project → its page;
 *  - a comment on a project you shared → your clip, on that comment;
 *  - a conversation → its thread; a build → its chat, or its own page;
 *  - credits → Plans › Credits; the plan → Plans; Get paid → Get paid; Notification settings and
 *    the rest of Settings → their phone pages; a blog → its reader. */
export function phoneHrefOf(n: Pick<Notice, "href" | "projectId">): string {
  const [beforeHash, hash = ""] = n.href.split("#");
  const [path, query = ""] = beforeHash.split("?");
  const qs = query ? `?${query}` : "";

  const product = /^\/projects\/([^/]+)\/products\/([^/]+)/.exec(path);
  if (product) return `/m/projects/${product[1]}/products/${product[2]}`;
  const earn = /^\/projects\/([^/]+)\/earn(?:\/([^/]+))?/.exec(path);
  if (earn) {
    const section = earn[2] === "sell" || earn[2] === "plan" || earn[2] === "money" ? `/${earn[2]}` : "";
    return `/m/projects/${earn[1]}/earn${section}${qs}`;
  }
  const project = /^\/projects\/([^/]+)/.exec(path);
  if (project) return `/m/projects/${project[1]}`;

  if (path.startsWith("/innovations/")) {
    if (!n.projectId) return "/m";
    const clip = `/m/clip/${enc(`mine:${n.projectId}`)}`;
    return hash.startsWith("comment-") ? `${clip}?comment=${enc(hash.slice("comment-".length))}` : clip;
  }

  const thread = /^\/messages\/([^/]+)/.exec(path);
  if (thread) return `/m/messages/${thread[1]}`;
  if (path.startsWith("/messages")) return "/m/messages";
  const chat = /^\/chat\/([^/]+)/.exec(path);
  if (chat) return `/m/ai/chat/${chat[1]}`;
  const build = /^\/build\/([^/]+)/.exec(path);
  if (build) return `/m/ai/build/${build[1]}`;

  const blog = /^\/blog\/([^/]+)/.exec(path);
  if (blog) return `/m/blog/${blog[1]}`;

  if (path.startsWith("/settings/plan")) return new URLSearchParams(query).get("tab") === "credits" ? "/m/plans/credits" : "/m/plans";
  if (path.startsWith("/settings/get-paid")) return "/m/settings/idz-pay";
  if (path.startsWith("/settings/notifications")) return "/m/settings/notifications";
  if (path.startsWith("/settings/security")) return "/m/settings/security";
  if (path.startsWith("/settings")) return "/m/settings";
  return "/m";
}
