// Global Search on the phone (mobile Figma, Design - Light Mode › Global
// Search): one field over People, Post (the Feed's clips, yours too),
// Projects, Parts & Agile Module, Marketplace and Blog, then — as the web's
// search finds them — Settings rows and Help & tutorials. Typing offers a few
// matches per kind (People, Projects, Blogs, as the Figma draws); Search shows
// every kind, or one under its chip. Recent searches (a query or a person
// opened) are kept on this phone, newest first, ten at most, only while
// Settings › Search history keeps searches.
//
// The index is built by the screen from the stores the web already keeps;
// these functions only rank and group it. Pure, relative imports only.

export type SearchKind = "people" | "post" | "projects" | "parts" | "marketplace" | "blog" | "settings" | "help";

export const SEARCH_KINDS: readonly { id: SearchKind; label: string }[] = [
  { id: "people", label: "People" },
  { id: "post", label: "Post" },
  { id: "projects", label: "Projects" },
  { id: "parts", label: "Parts & Agile Module" },
  { id: "marketplace", label: "Marketplace" },
  { id: "blog", label: "Blog" },
  { id: "settings", label: "Settings" },
  { id: "help", label: "Help & tutorials" },
];

/** What typing offers, in this order (Figma "When User writing something on Search bar"). */
export const SUGGEST_KINDS: readonly SearchKind[] = ["people", "projects", "blog"];

export const SUGGEST_LABEL: Readonly<Record<SearchKind, string>> = {
  people: "People",
  post: "Post",
  projects: "Projects",
  parts: "Parts & Agile Module",
  marketplace: "Marketplace",
  blog: "Blogs",
  settings: "Settings",
  help: "Help & tutorials",
};

export type SearchEntry<T = unknown> = {
  kind: SearchKind;
  id: string;
  title: string;
  /** Other words it is found by (the maker, a summary, a category). */
  words: readonly string[];
  ref: T;
};

const norm = (s: string) => s.toLocaleLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").trim();

/** How well an entry answers `q`: 4 the title starts with it, 3 a title word does, 2 the title
 *  holds it, 1 another of its words does, 0 not at all. Every word of `q` must be found. */
export function matchScore(e: Pick<SearchEntry, "title" | "words">, q: string): number {
  const query = norm(q);
  if (!query) return 0;
  const title = norm(e.title);
  const rest = e.words.map(norm).join(" ");
  const terms = query.split(/\s+/);
  if (!terms.every((t) => title.includes(t) || rest.includes(t))) return 0;
  if (title.startsWith(query)) return 4;
  if (title.split(/[^\p{L}\p{N}]+/u).some((w) => w.startsWith(terms[0]))) return 3;
  if (title.includes(query)) return 2;
  return 1;
}

/** The entries that answer `q`, best first (ties keep the index's order); one kind when given. */
export function searchEntries<T>(entries: readonly SearchEntry<T>[], q: string, kind: SearchKind | null = null): SearchEntry<T>[] {
  return entries
    .map((e, i) => ({ e, i, s: kind && e.kind !== kind ? 0 : matchScore(e, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.e);
}

/** Results by kind, in the chips' order, each kind's best first; kinds with nothing left out. */
export function groupResults<T>(entries: readonly SearchEntry<T>[], q: string): { kind: SearchKind; entries: SearchEntry<T>[] }[] {
  const found = searchEntries(entries, q);
  return SEARCH_KINDS.map((k) => ({ kind: k.id, entries: found.filter((e) => e.kind === k.id) })).filter((g) => g.entries.length > 0);
}

/** What typing offers: up to `per` of each suggested kind. */
export function suggestionsOf<T>(entries: readonly SearchEntry<T>[], q: string, per = 3): { kind: SearchKind; entries: SearchEntry<T>[] }[] {
  const found = searchEntries(entries, q);
  return SUGGEST_KINDS.map((kind) => ({ kind, entries: found.filter((e) => e.kind === kind).slice(0, per) })).filter((g) => g.entries.length > 0);
}

/** `text` cut where it matches `q`, so the match can be drawn in the brand ink. */
export function highlightParts(text: string, q: string): { text: string; match: boolean }[] {
  const query = q.trim();
  if (!query) return [{ text, match: false }];
  const lower = text.toLocaleLowerCase();
  const needle = query.toLocaleLowerCase();
  const out: { text: string; match: boolean }[] = [];
  let from = 0;
  for (let at = lower.indexOf(needle); at >= 0; at = lower.indexOf(needle, from)) {
    if (at > from) out.push({ text: text.slice(from, at), match: false });
    out.push({ text: text.slice(at, at + needle.length), match: true });
    from = at + needle.length;
  }
  if (from < text.length) out.push({ text: text.slice(from), match: false });
  return out.length ? out : [{ text, match: false }];
}

// ─────────────────────────── recent searches ───────────────────────────

export const RECENT_SEARCHES_KEY = "ideeza:m:search:recent";
export const RECENT_MAX = 10;
export const QUERY_MAX = 100;

export type RecentSearch =
  | { kind: "query"; text: string; at: number }
  /** A person opened from the results: drawn as their row, with what they do. */
  | { kind: "person"; id: string; name: string; subtitle: string; href: string; at: number };

export const recentKeyOf = (r: RecentSearch) => (r.kind === "query" ? `q:${norm(r.text)}` : `p:${r.id}`);

export function recentIn(value: unknown): RecentSearch[] {
  if (!Array.isArray(value)) return [];
  const out: RecentSearch[] = [];
  for (const x of value) {
    if (typeof x !== "object" || x === null) continue;
    const r = x as Record<string, unknown>;
    if (typeof r.at !== "number") continue;
    if (r.kind === "query" && typeof r.text === "string" && r.text.trim()) {
      out.push({ kind: "query", text: r.text.trim().slice(0, QUERY_MAX), at: r.at });
    } else if (r.kind === "person" && typeof r.id === "string" && typeof r.name === "string" && typeof r.href === "string" && r.href.startsWith("/m/")) {
      out.push({ kind: "person", id: r.id, name: r.name, subtitle: typeof r.subtitle === "string" ? r.subtitle : "", href: r.href, at: r.at });
    }
  }
  return out.slice(0, RECENT_MAX);
}

/** `r` first; the same query or person earlier in the list goes; ten at most. */
export function withRecent(list: readonly RecentSearch[], r: RecentSearch): RecentSearch[] {
  if (r.kind === "query" && !r.text.trim()) return list.slice();
  const item: RecentSearch = r.kind === "query" ? { ...r, text: r.text.trim().slice(0, QUERY_MAX) } : r;
  const key = recentKeyOf(item);
  return [item, ...list.filter((x) => recentKeyOf(x) !== key)].slice(0, RECENT_MAX);
}

export function withoutRecent(list: readonly RecentSearch[], key: string): RecentSearch[] {
  return list.filter((x) => recentKeyOf(x) !== key);
}
