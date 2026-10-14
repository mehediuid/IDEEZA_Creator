// What the Portfolio profile (owner picked direction A, 2026-10-14) works out
// from a creator's shared projects: the chips and modules they build with,
// how far each project has come, how many are in production, their recent
// Activity, and the local time where they are. Everything here is read from
// what is already public; nothing is typed in or guessed. Pure, relative
// imports only.

import { labelOf, type ProjectJourney } from "../manual/journey";

export type StageTone = "neutral" | "blue" | "warning" | "success";

const TONE: Record<string, StageTone> = {
  testing: "blue",
  certification: "blue",
  "ready-for-manufacture": "warning",
  "pilot-run": "warning",
  manufacturing: "warning",
  launched: "success",
  improvement: "success",
};

/** A project's current Activity type as a badge tone: early work neutral, testing blue,
 *  production amber, launched green. */
export function stageToneOf(typeId: string | null): StageTone {
  return (typeId && TONE[typeId]) || "neutral";
}

const PRODUCTION = new Set(["pilot-run", "manufacturing", "launched", "improvement"]);

/** Made in batches or on sale: a pilot run or later. */
export function inProduction(typeId: string | null): boolean {
  return !!typeId && PRODUCTION.has(typeId);
}

/** Passives, connectors and mechanical parts: real, but nobody's craft. */
const NOT_A_CHIP =
  /resistor|capacitor|inductor|ferrite|crystal|oscillator|screw|nut|washer|standoff|spacer|enclosure|shell|case|lid|housing|receptacle|connector|header|socket|cable|wire|jumper|button|switch|fuse|\bled\b|battery|cell|holder|magnet|gasket|label|sticker|pcb|board|antenna|heatsink|foam|tape|o-ring/i;

/** A part's own number: the first word that mixes letters and digits ("ESP32-C3-MINI-1", "BMI270"). */
function partNumberOf(name: string): string | null {
  if (NOT_A_CHIP.test(name)) return null;
  for (const word of name.replace(/[(),]/g, " ").split(/\s+/)) {
    if (/^[A-Za-z][A-Za-z0-9.+-]*\d[A-Za-z0-9.+-]*$/.test(word) && /[A-Za-z]{2,}|[A-Za-z]\d/.test(word) && word.length >= 4) {
      return word.replace(/[.-]+$/, "");
    }
  }
  return null;
}

/** The chips and modules used across the most projects (one count per project), most first. */
export function builtWithOf(partNamesPerProject: readonly (readonly string[])[], max = 6): string[] {
  const counts = new Map<string, { n: number; first: number }>();
  let order = 0;
  for (const names of partNamesPerProject) {
    const seen = new Set<string>();
    for (const name of names) {
      const id = partNumberOf(name);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const c = counts.get(id);
      if (c) c.n += 1;
      else counts.set(id, { n: 1, first: order++ });
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].n - a[1].n || a[1].first - b[1].first)
    .slice(0, max)
    .map(([id]) => id);
}

export type ActivityItem = { key: string; type: string; project: string; href: string; text: string; at: number };

/** The newest Activity entries of shared projects, project-level, never the synthesized
 *  default Planning (it says nothing a visitor can check). */
export function activityOf(
  projects: readonly { id: string; title: string; href: string; journey: ProjectJourney }[],
  limit: number,
): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const p of projects) {
    for (const a of p.journey.activities) {
      if (a.target.kind !== "project") continue;
      items.push({ key: `${p.id}:${a.id}`, type: labelOf(a), project: p.title, href: p.href, text: a.description.trim(), at: a.updatedAt });
    }
  }
  return items.sort((a, b) => b.at - a.at).slice(0, limit);
}

/** "9:40 pm" where they are; null without a readable time zone. */
export function localTimeOf(timeZone: string | null, now: number): string | null {
  if (!timeZone) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", hour12: true })
      .format(new Date(now))
      .replace(/ |\s/g, " ")
      .replace(" AM", " am")
      .replace(" PM", " pm");
  } catch {
    return null;
  }
}

/** The feed categories a creator works in, the most used first. */
export function worksOnOf(items: readonly { category: string | null }[]): string[] {
  const counts = new Map<string, number>();
  for (const { category } of items) {
    const c = category?.trim();
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
}

const RANK = new Map<string, number>(
  ["design", "prototype", "testing", "certification", "ready-for-manufacture", "pilot-run", "manufacturing", "launched", "improvement"].map(
    (id, i) => [id, i + 1],
  ),
);

/** The project that leads the page: the first pin, else the one that has come furthest (a
 *  launched project before a prototype), the newer on a tie. `items` arrive pins first, then
 *  newest first, as the Made list orders them. */
export function featuredOf<T extends { pinned: boolean; stageId: string | null }>(
  items: readonly T[],
): { featured: T; pinned: boolean; rest: T[] } | null {
  if (!items.length) return null;
  let at = items.findIndex((m) => m.pinned);
  const pinned = at >= 0;
  if (!pinned) {
    at = 0;
    items.forEach((m, i) => {
      if ((RANK.get(m.stageId ?? "") ?? 0) > (RANK.get(items[at].stageId ?? "") ?? 0)) at = i;
    });
  }
  return { featured: items[at], pinned, rest: items.filter((_, i) => i !== at) };
}
