// "Find a setting": a forgiving word match over the eight settings pages and
// their rows, for the home page's search and for ⌘K. People type what they
// want ("how do I turn off emails", "delete my data"), not our labels, so:
//   - filler words are dropped ("how", "do", "my", "turn", …),
//   - each word may be the start of a word in the row ("pass" → "password"),
//     and plurals fold ("notifications" = "notification"),
//   - a few everyday words also look for ours (synonyms, worth half a
//     typed-word match),
//   - rows holding the most of the words win, then where they hold them
//     (label beats keywords beats help), so one stray word never empties
//     the list and a near-miss never outranks a full match.
// Only the side-nav pages are searched; the folded Phase 1 pages have no rows.

import { NAV_PAGES, type SettingsPageId } from "./registry";
import { SETTINGS_ROWS, type SettingsRowEntry } from "./rows";

export interface SettingsHit {
  page: SettingsPageId;
  pageLabel: string;
  rowId: string | null;
  label: string;
  help?: string;
  href: string;
}

export const SEARCH_LIMIT = 12;

const STOP = new Set(
  (
    "a an and are as at be can change do does find for from get go how i in into is it make me my of on or " +
    "see set setting settings show the to turn up want where which with you your off"
  ).split(" "),
);

/** Everyday words → the words our rows use (both sides stemmed). */
const SYNONYMS: Record<string, string[]> = {
  dark: ["theme"],
  light: ["theme"],
  night: ["theme", "quiet"],
  mode: ["theme"],
  font: ["text"],
  bigger: ["text"],
  email: ["notification", "pop"],
  alert: ["notification", "pop"],
  notify: ["notification"],
  push: ["pop", "browser"],
  password: ["sign"],
  login: ["sign"],
  logout: ["sign"],
  security: ["sign"],
  delete: ["erase"],
  remove: ["erase"],
  wipe: ["erase"],
  export: ["download"],
  backup: ["download", "restore"],
  import: ["restore"],
  money: ["balance", "withdraw"],
  payout: ["withdraw"],
  cash: ["withdraw"],
  earning: ["balance"],
  kyc: ["identity"],
  verification: ["identity"],
  bangla: ["language"],
  bengali: ["language"],
  translate: ["language"],
  mute: ["quiet", "muted"],
  silence: ["quiet"],
  dnd: ["quiet"],
  receipt: ["invoice"],
  subscription: ["plan"],
  upgrade: ["plan"],
  buy: ["credit"],
  dm: ["message"],
  chat: ["message"],
  harass: ["block", "report"],
  abuse: ["block", "report"],
  photo: ["public"],
  avatar: ["public"],
  bio: ["public"],
  username: ["handle"],
  private: ["lock"],
  hide: ["lock", "hidden"],
  mic: ["voice"],
  dictation: ["voice"],
  timezone: ["time"],
  clock: ["time"],
  animation: ["motion"],
  train: ["training"],
};

const fold = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
const split = (s: string) => fold(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** A crude stem: plural and -ing/-ed endings off, so forms of a word meet. */
function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed") && !w.endsWith("eed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) return w.slice(0, -1);
  return w;
}

const wordsOf = (s: string) => split(s).map(stem);

/** The query's meaningful words, each with the words it may stand for. */
function queryTerms(query: string): string[][] {
  const out: string[][] = [];
  for (const raw of split(query)) {
    if (STOP.has(raw)) continue;
    const w = stem(raw);
    out.push([w, ...(SYNONYMS[w] ?? SYNONYMS[raw] ?? [])]);
  }
  return out;
}

/** How a word of `hay` meets `term`: 2 = the typed word starts it, 1 = only
 *  a synonym does, 0 = neither. A one- or two-letter form must be a whole
 *  word, so "ai" never finds "email". */
function meets(hay: string[], term: string[]): 0 | 1 | 2 {
  const hit = (t: string) => hay.some((h) => (t.length <= 2 ? h === t : h.startsWith(t)));
  if (hit(term[0])) return 2;
  return term.slice(1).some(hit) ? 1 : 0;
}

/** How many of the terms the fields hold, and how well: each term counts
 *  its best field's weight, halved when only a synonym matched. */
function rate(terms: string[][], fields: [string[], number][]): { matched: number; weight: number } {
  let matched = 0;
  let weight = 0;
  for (const term of terms) {
    let best = 0;
    for (const [hay, w] of fields) best = Math.max(best, (w * meets(hay, term)) / 2);
    if (best) matched++;
    weight += best;
  }
  return { matched, weight };
}

function hrefOf(pageHref: string, row: SettingsRowEntry): string {
  return row.href ?? `${pageHref}#${row.id}`;
}

/** The settings matching `query`, best first; empty for a blank query. */
export function searchSettings(query: string, limit = SEARCH_LIMIT): SettingsHit[] {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  const scored: { hit: SettingsHit; matched: number; weight: number; order: number }[] = [];
  let order = 0;
  for (const page of NAV_PAGES) {
    const pageWords = wordsOf(page.label);
    const p = rate(terms, [[pageWords, 5]]);
    if (p.matched) {
      scored.push({
        hit: { page: page.id, pageLabel: page.label, rowId: null, label: page.label, href: page.href },
        ...p,
        order: order++,
      });
    }
    for (const row of SETTINGS_ROWS[page.id] ?? []) {
      const own: [string[], number][] = [
        [wordsOf(row.label), 4],
        [wordsOf((row.keywords ?? []).join(" ")), 3],
        [wordsOf(row.help ?? ""), 2],
      ];
      // A row the query reaches only through its page's name adds nothing
      // the page hit doesn't already say ("emails" lists Notifications once).
      if (!rate(terms, own).matched) continue;
      const r = rate(terms, [...own, [pageWords, 1]]);
      scored.push({
        hit: {
          page: page.id,
          pageLabel: page.label,
          rowId: row.id,
          label: row.label,
          help: row.help,
          href: hrefOf(page.href, row),
        },
        ...r,
        order: order++,
      });
    }
  }
  // Keep only the rows that hold the most words any row holds: "dark mode
  // zebra" still finds Theme, and "time zone" doesn't list every "time" row.
  const most = Math.max(0, ...scored.map((s) => s.matched));
  const keep = scored.filter((s) => s.matched === most);
  keep.sort((a, b) => b.weight - a.weight || a.order - b.order);
  const seen = new Set<string>();
  const out: SettingsHit[] = [];
  for (const s of keep) {
    if (seen.has(s.hit.href)) continue;
    seen.add(s.hit.href);
    out.push(s.hit);
    if (out.length >= limit) break;
  }
  return out;
}
