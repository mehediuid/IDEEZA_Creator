// My projects' list state (spec §5.2): which tab a project sits under, what
// the search and the Source facet keep, the order, the page, and the URL that
// carries all of it (LST-4, LST-8, LST-13, LST-17, LST-23, LST-26–28, LST-31).
//
// Pure. The page derives each project's summary (projectSummary, §5.1.3) and
// hands the pairs in, so the tab counts, the order and the cards come from one
// pass, and a test can hold all of it.
//
// Value imports are relative: tsc leaves `@/` as it is in the node:test build.

import type { ManualProject } from "./projects";
import {
  PAGE_SIZE,
  SHOWCASE_BADGE,
  STATUS_WORD,
  matchProject,
  type ListQuery,
  type ProjectSummary,
} from "./project-summary";

export type ListTab = ListQuery["tab"];
export type ListSort = ListQuery["sort"];
export type ListSource = ListQuery["source"];
export type ListCounts = Record<ListTab, number>;

export const DEFAULT_LIST_QUERY: ListQuery = { tab: "all", q: "", sort: "updated", source: "any", page: 1 };

/** The tab row, in order (LST-4). The outcome tabs read the status table, so a word
 *  changed there changes the tab too. Showcase is membership and sits after the divider (LST-10). */
export const LIST_TABS: readonly { id: ListTab; label: string; divider: boolean }[] = [
  { id: "all", label: "All", divider: false },
  { id: "draft", label: STATUS_WORD.draft, divider: false },
  { id: "private", label: STATUS_WORD.private, divider: false },
  { id: "given", label: STATUS_WORD.given, divider: false },
  { id: "listed", label: STATUS_WORD.listed, divider: false },
  { id: "showcase", label: SHOWCASE_BADGE.word, divider: true },
];

/** LST-23. */
export const SORT_OPTIONS: { value: ListSort; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "newest", label: "Newest to oldest" },
  { value: "oldest", label: "Oldest to newest" },
  { value: "name", label: "Name A–Z" },
];

/** LST-17: "AI build" = the project holds a build (buildsOf), still in this browser or not. */
export const SOURCE_OPTIONS: { value: ListSource; label: string }[] = [
  { value: "any", label: "Any source" },
  { value: "build", label: "AI build" },
  { value: "hand", label: "By hand" },
];

/** One project as the list holds it: the record (its createdAt and description) and its summary. */
export type ListItem = { project: ManualProject; summary: ProjectSummary };
/** A card to render. `via` names the product the search matched when it isn't the first (LST-14). */
export type ListRow = ListItem & { via?: string };

export type ListResult = {
  /** Per tab, over every project: the search and the facets narrow the rows, not the tabs. */
  counts: ListCounts;
  /** Every project. */
  total: number;
  /** After the tab, the search and the Source facet. */
  matched: number;
  /** A tab, search or facet narrows the view — the count line says "4 of 38" (LST-26). */
  narrowed: boolean;
  /** 1-based, clamped to the last page (LST-31). */
  page: number;
  /** At least 1. */
  pageCount: number;
  /** This page's rows, PAGE_SIZE at most. */
  rows: ListRow[];
};

function inTab(s: ProjectSummary, tab: ListTab): boolean {
  if (tab === "all") return true;
  if (tab === "showcase") return s.showcase !== null;
  return s.status === tab; // an unreadable mint ("minted", LST-9) is in no outcome tab
}

function inSource(s: ProjectSummary, source: ListSource): boolean {
  if (source === "any") return true;
  return (s.source.kind === "hand") === (source === "hand");
}

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

/** Name A–Z, then id — the tie-break every order ends on (LST-23). */
function byName(a: ListRow, b: ListRow): number {
  const named = collator.compare(a.summary.name, b.summary.name);
  if (named) return named;
  return a.summary.id < b.summary.id ? -1 : a.summary.id > b.summary.id ? 1 : 0;
}

const ORDER: Record<ListSort, (a: ListRow, b: ListRow) => number> = {
  updated: (a, b) => b.summary.sortKey - a.summary.sortKey || byName(a, b),
  newest: (a, b) => b.project.createdAt - a.project.createdAt || byName(a, b),
  oldest: (a, b) => a.project.createdAt - b.project.createdAt || byName(a, b),
  name: byName,
};

/** The list's one pass: tab counts, then the tab, the Source facet and the search, the order and the page. */
export function filterProjects(items: ListItem[], q: ListQuery): ListResult {
  const counts: ListCounts = { all: 0, draft: 0, private: 0, given: 0, listed: 0, showcase: 0 };
  for (const { summary } of items) {
    for (const t of LIST_TABS) if (inTab(summary, t.id)) counts[t.id] += 1;
  }

  const needle = q.q.trim();
  const kept: ListRow[] = [];
  for (const item of items) {
    if (!inTab(item.summary, q.tab) || !inSource(item.summary, q.source)) continue;
    if (!needle) {
      kept.push(item);
      continue;
    }
    const m = matchProject(item.summary, item.project.description, needle);
    if (m.hit) kept.push(m.via ? { ...item, via: m.via } : item);
  }
  kept.sort(ORDER[q.sort]);

  const pageCount = Math.max(1, Math.ceil(kept.length / PAGE_SIZE));
  const want = Number.isInteger(q.page) && q.page >= 1 ? q.page : 1;
  const page = Math.min(want, pageCount);
  return {
    counts,
    total: items.length,
    matched: kept.length,
    narrowed: q.tab !== "all" || needle !== "" || q.source !== "any",
    page,
    pageCount,
    rows: kept.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

// ─────────────────────────── the URL (LST-28) ───────────────────────────

/** The search text as the URL carries it: left out when blank. */
export function searchInUrl(text: string): string {
  return text.trim() ? text : "";
}

function oneOf<T extends string>(v: string | null, allowed: readonly T[], fallback: T): T {
  return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Reads /projects?tab=&q=&sort=&source=&page=. An unknown value reads as its default. */
export function parseListQuery(params: { get(name: string): string | null }): ListQuery {
  const page = Number(params.get("page"));
  return {
    tab: oneOf(params.get("tab"), LIST_TABS.map((t) => t.id), DEFAULT_LIST_QUERY.tab),
    q: params.get("q") ?? "",
    sort: oneOf(params.get("sort"), SORT_OPTIONS.map((o) => o.value), DEFAULT_LIST_QUERY.sort),
    source: oneOf(params.get("source"), SOURCE_OPTIONS.map((o) => o.value), DEFAULT_LIST_QUERY.source),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** "" for the default view, else "?tab=…&q=…&sort=…&source=…&page=…" in that order, defaults left out. */
export function listQueryString(q: ListQuery): string {
  const out = new URLSearchParams();
  if (q.tab !== DEFAULT_LIST_QUERY.tab) out.set("tab", q.tab);
  if (searchInUrl(q.q)) out.set("q", q.q);
  if (q.sort !== DEFAULT_LIST_QUERY.sort) out.set("sort", q.sort);
  if (q.source !== DEFAULT_LIST_QUERY.source) out.set("source", q.source);
  if (q.page > 1) out.set("page", String(q.page));
  const s = out.toString();
  return s ? `?${s}` : "";
}

// ─────────────────────────── the words ───────────────────────────

function projectsWord(n: number): string {
  return n === 1 ? "project" : "projects";
}

/** A tab's accessible count (LST-8): "Draft, 9 projects". */
export function tabCountLabel(n: number): string {
  return `${n} ${projectsWord(n)}`;
}

/** LST-26: "38 projects", or "4 of 38 projects" when a tab, search or facet narrows the view. */
export function countLine(r: Pick<ListResult, "matched" | "total" | "narrowed">): string {
  return r.narrowed ? `${r.matched} of ${r.total} ${projectsWord(r.total)}` : tabCountLabel(r.total);
}

/** LST-27: 1 … n-1 n n+1 … last. Every rendered number is a page that exists. */
export function pageItemsFor(page: number, pageCount: number): Array<number | "ellipsis"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const out: Array<number | "ellipsis"> = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pageCount - 1, page + 1);
  if (from > 2) out.push("ellipsis");
  for (let i = from; i <= to; i++) out.push(i);
  if (to < pageCount - 1) out.push("ellipsis");
  out.push(pageCount);
  return out;
}
