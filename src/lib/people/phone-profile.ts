// The creator profile on the phone (mobile Figma "People · 2026 update",
// PR-01…45): the words and addresses the phone's profile screens work out
// from the web's profile data (made.ts, portfolio.ts, fields.ts). Every count
// still comes from shared work only; these only say it the way the phone
// shows it. Pure, relative imports only.

import { SOCIAL_NETWORKS, SOCIAL_WORDS, socialNameOf, type Social, type Speciality } from "./fields";
import type { MadeItem } from "./made";
import { inProduction } from "./portfolio";

/** A creator's profile on the phone; `me` is always yours. */
export const phoneProfileHref = (handle: string) => `/m/creators/${encodeURIComponent(handle)}`;

/** Where a project card opens on the phone: that project's details. A sample post's project is
 *  its feed id ("sample:p3" → p3). */
export function phoneProjectHref(item: Pick<MadeItem, "projectId" | "key">): string {
  return `/m/projects/${encodeURIComponent(item.projectId ?? item.key.replace(/^sample:/, ""))}`;
}

export type Stat = { label: string; value: number };

/** The four counts, from shared work only; Appreciations only once there are some. None for a
 *  profile with nothing shared (PR-04: no stats). */
export function profileStatsOf(made: readonly Pick<MadeItem, "products" | "stageId">[], appreciations: number): Stat[] {
  if (!made.length) return [];
  const stats: Stat[] = [
    { label: "Projects shared", value: made.length },
    { label: "Products built", value: made.reduce((n, m) => n + m.products, 0) },
    { label: "In production", value: made.filter((m) => inProduction(m.stageId)).length },
  ];
  if (appreciations > 0) stats.push({ label: "Appreciations", value: appreciations });
  return stats;
}

/** 1 234 → "1.2k", 12 400 → "12k", 2 500 000 → "2.5m". */
export function compactCount(n: number): string {
  if (n < 1000) return String(Math.max(0, Math.round(n)));
  const [div, unit] = n >= 1_000_000 ? [1_000_000, "m"] : [1000, "k"];
  const v = n / div;
  return `${v >= 10 ? Math.round(v) : Math.round(v * 10) / 10}${unit}`;
}

/** A video's length as its badge says it: 42 000 ms → "0:42", 125 000 → "2:05". */
export function videoLengthOf(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How long ago, as the Activity rows say it: "now", "5 m", "3 h", "2 d", "1 w", "4 mo", "1 y". */
export function ageOf(at: number, now: number): string {
  const d = Math.max(0, now - at);
  if (d < MINUTE) return "now";
  if (d < HOUR) return `${Math.floor(d / MINUTE)} m`;
  if (d < DAY) return `${Math.floor(d / HOUR)} h`;
  if (d < 7 * DAY) return `${Math.floor(d / DAY)} d`;
  if (d < 30 * DAY) return `${Math.floor(d / (7 * DAY))} w`;
  if (d < 365 * DAY) return `${Math.floor(d / (30 * DAY))} mo`;
  return `${Math.floor(d / (365 * DAY))} y`;
}

/** "June 2025". */
export const monthYearOf = (at: number) => new Date(at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

/** The line under the headline: "Dhaka, Bangladesh · 3:40 pm there · Building on IDEEZA since
 *  June 2025"; null when there is nothing to say. */
export function metaLineOf(o: { location: string | null; localTime: string | null; since: number | null }): string | null {
  const parts: string[] = [];
  if (o.location) parts.push(o.location);
  if (o.location && o.localTime) parts.push(`${o.localTime} there`);
  if (o.since !== null) parts.push(`Building on IDEEZA since ${monthYearOf(o.since)}`);
  return parts.length ? parts.join(" · ") : null;
}

/** "Building on IDEEZA since June 2025": the meta line's last part on its own (the phone's one
 *  meta line keeps where and when; since when moves to the More about sheet). */
export const sinceLineOf = (since: number) => `Building on IDEEZA since ${monthYearOf(since)}`;

export const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] || name;

/** "naimrahman.dev/notes" from "https://www.naimrahman.dev/notes/". */
export function hostPathOf(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return url;
  }
}

export type LinkRow = { label: string; value: string; href: string };

/** Links and social, as the More about sheet lists them: each web address as Website, then each
 *  social account by its network with "@name". The same address twice shows once. */
export function linkRowsOf(links: readonly string[], social: Social): LinkRow[] {
  const rows: LinkRow[] = [];
  const seen = new Set<string>();
  for (const href of links) {
    if (seen.has(href)) continue;
    seen.add(href);
    rows.push({ label: "Website", value: hostPathOf(href), href });
  }
  for (const n of SOCIAL_NETWORKS) {
    const href = social[n];
    if (!href || seen.has(href)) continue;
    seen.add(href);
    rows.push({ label: SOCIAL_WORDS[n], value: `@${socialNameOf(n, href)}`, href });
  }
  return rows;
}

export type MoreAbout = {
  skills: readonly string[];
  specialities: readonly Speciality[];
  languages: readonly string[];
  builtWith: readonly string[];
  worksOn: readonly string[];
  links: readonly LinkRow[];
};

/** The More about row's value: the first two groups with something in them, Skills and Links
 *  first ("Skills · Links"); null when every group is empty (a visitor then sees no row). */
export function moreAboutSummaryOf(m: MoreAbout): string | null {
  const groups: [string, boolean][] = [
    ["Skills", m.skills.length > 0 || m.specialities.length > 0],
    ["Links", m.links.length > 0],
    ["Built with", m.builtWith.length > 0],
    ["Works on", m.worksOn.length > 0],
    ["Languages", m.languages.length > 0],
  ];
  const names = groups.filter(([, has]) => has).map(([name]) => name);
  return names.length ? names.slice(0, 2).join(" · ") : null;
}

/** "Firmware · 5+ years". */
export const specialityLabelOf = (s: Speciality) => `${s.skill} · ${s.years} years`;

/** Recent searches from the Profile tab's search (Main Profile-search), kept apart from Global
 *  Search's: the same shape (lib/innovations/search.ts), its own key. */
export const PROFILE_SEARCH_RECENT_KEY = "ideeza:m:profile-search:recent";

/** How many recent searches show before See all. */
export const RECENT_SHOWN = 5;

/** Edit profile on the phone. Its ✕ and Save go back to where it was opened from, else to your profile. */
export const PHONE_EDIT_PROFILE_HREF = "/m/profile/edit";

/** The Profile hub's in-place Settings rows that open a list of their own (master "Profile
 *  Settings" 10702:240249: General, Others). */
export const PHONE_SETTINGS_GENERAL_HREF = "/m/profile/settings/general";
export const PHONE_SETTINGS_OTHERS_HREF = "/m/profile/settings/others";

/** The app's version as the master page prints it at the foot of Profile Settings. */
export const PHONE_APP_VERSION = "1.1.5.451";

/** Demo creators whose profile is locked (PR-17): someone who doesn't work with them sees who
 *  they are and no more. Sample data only, like every Demo creator's words. */
const LOCKED_SAMPLES: ReadonlySet<string> = new Set(["feed:c7"]);
export const sampleProfileLocked = (personId: string) => LOCKED_SAMPLES.has(personId);

/** Phone copy uses the typographic apostrophe; a few shared strings still carry the straight one. */
export const curly = (text: string) => text.replace(/'/g, "’");

/** Other names people type for a language `Intl` lists under one name ("Bengali" → Bangla). */
const LANGUAGE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  Bangla: ["bengali"],
  Persian: ["farsi"],
  Chinese: ["mandarin", "cantonese"],
  Punjabi: ["panjabi"],
  Malay: ["bahasa melayu"],
  Indonesian: ["bahasa indonesia"],
  Spanish: ["castilian", "espanol", "español"],
  German: ["deutsch"],
  French: ["francais", "français"],
};

/** The languages a typed search finds: by name, or by another name people use for it. */
export function languageMatches(options: readonly string[], typed: string): string[] {
  const q = typed.trim().toLowerCase();
  if (!q) return [];
  return options.filter((l) => l.toLowerCase().includes(q) || (LANGUAGE_ALIASES[l] ?? []).some((a) => a.includes(q)));
}

/** "Oct 12" for a tile's meta line, "Oct 12, 2026" where the year matters (the web's words). */
export function shortDateOf(at: number, year = false): string {
  return new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}) });
}

/** All projects' search (owner 2026-11-24, View all projects): the projects whose name holds every
 *  word typed, in the list's own order. */
export function projectsMatching<T extends { title: string }>(items: readonly T[], query: string): T[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...items];
  return items.filter((m) => {
    const title = m.title.toLowerCase();
    return words.every((w) => title.includes(w));
  });
}
