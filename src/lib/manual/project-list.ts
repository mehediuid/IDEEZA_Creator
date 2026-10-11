// My projects' list state (spec §5.2): which tab a project sits under, what
// the search and the Showcase only filter keep, the order, the page, and the
// URL that carries all of it (LST-4, LST-8, LST-10, LST-13, LST-23, LST-26–28,
// LST-31).
//
// Pure. The page derives each project's summary (projectSummary, §5.1.3) and
// hands the pairs in, so the tab counts, the order and the cards come from one
// pass, and a test can hold all of it.
//
// Value imports are relative: tsc leaves `@/` as it is in the node:test build.

import type { ManualProject } from "./projects";
import {
  PAGE_SIZE,
  STATUS_WORD,
  matchProject,
  type ListQuery,
  type ProjectStatus,
  type ProjectSummary,
} from "./project-summary";

export type ListTab = ListQuery["tab"];
export type ListSort = ListQuery["sort"];
export type ListCounts = Record<ListTab, number>;

export const DEFAULT_LIST_QUERY: ListQuery = { tab: "all", q: "", sort: "updated", showcase: false, page: 1 };

/** The tab row, in order (LST-4 as the owner simplified it on 2026-10-11; P2-LISTING-18,
 *  P2-CUSTOMERS-14): All · Draft · Minted · Listed · Sold. The labels read the status table, so a
 *  word changed there changes the tab too. Each card's chip still names its own status. */
export const LIST_TABS: readonly { id: ListTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: STATUS_WORD.draft },
  { id: "minted", label: STATUS_WORD.minted },
  { id: "listed", label: STATUS_WORD.listed },
  { id: "sold", label: STATUS_WORD.sold },
];

/** The statuses each outcome tab holds. Minted is every mint not on or through a marketplace:
 *  Private, Given and an unreadable mint (LST-9). Listed holds live and paused listings; Sold a
 *  Main sale with no live listing (a relisted Sold project reads Listed again). */
const TAB_STATUSES: Record<Exclude<ListTab, "all">, readonly ProjectStatus[]> = {
  draft: ["draft"],
  minted: ["private", "given", "minted"],
  listed: ["listed", "paused"],
  sold: ["sold"],
};

/** A saved link from before 2026-10-11 still opens: Private and Given are under Minted now, and
 *  the Showcase tab is the Showcase only filter. */
const OLD_TABS = new Map<string, Pick<ListQuery, "tab" | "showcase">>([
  ["private", { tab: "minted", showcase: false }],
  ["given", { tab: "minted", showcase: false }],
  ["showcase", { tab: "all", showcase: true }],
]);

/** LST-23. */
export const SORT_OPTIONS: { value: ListSort; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "newest", label: "Newest to oldest" },
  { value: "oldest", label: "Oldest to newest" },
  { value: "name", label: "Name A–Z" },
];

/** One project as the list holds it: the record (its createdAt and description) and its summary. */
export type ListItem = { project: ManualProject; summary: ProjectSummary };
/** A card to render. `via` names the product the search matched when it isn't the first (LST-14). */
export type ListRow = ListItem & { via?: string };

export type ListResult = {
  /** Per tab, over every project: the search and the Showcase filter narrow the rows, not the tabs. */
  counts: ListCounts;
  /** Every project. */
  total: number;
  /** Showcased projects, over every project: whether the Showcase filter can find any at all. */
  showcased: number;
  /** After the tab, the Showcase filter and the search. */
  matched: number;
  /** A tab, search or filter narrows the view — the count line says "4 of 38" (LST-26). */
  narrowed: boolean;
  /** 1-based, clamped to the last page (LST-31). */
  page: number;
  /** At least 1. */
  pageCount: number;
  /** This page's rows, PAGE_SIZE at most. */
  rows: ListRow[];
};

/** Which tab a project sits under: every project is in All and in exactly one outcome tab. */
export function inTab(s: Pick<ProjectSummary, "status">, tab: ListTab): boolean {
  return tab === "all" || TAB_STATUSES[tab].includes(s.status);
}

/** The Showcase only filter (LST-10): a project whose `showcasedAt` is a time, on any outcome. */
export function inShowcase(s: Pick<ProjectSummary, "showcase">, only: boolean): boolean {
  return !only || s.showcase !== null;
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

/** The list's one pass: tab counts, then the tab, the Showcase filter and the search, the order and the page. */
export function filterProjects(items: ListItem[], q: ListQuery): ListResult {
  const counts: ListCounts = { all: 0, draft: 0, minted: 0, listed: 0, sold: 0 };
  let showcased = 0;
  for (const { summary } of items) {
    for (const t of LIST_TABS) if (inTab(summary, t.id)) counts[t.id] += 1;
    if (summary.showcase !== null) showcased += 1;
  }

  const needle = q.q.trim();
  const kept: ListRow[] = [];
  for (const item of items) {
    if (!inTab(item.summary, q.tab) || !inShowcase(item.summary, q.showcase)) continue;
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
    showcased,
    matched: kept.length,
    narrowed: q.tab !== "all" || needle !== "" || q.showcase,
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

/** Reads /projects?tab=&q=&sort=&showcase=1&page=. An unknown value reads as its default; an old
 *  tab (OLD_TABS) as its new place; the retired `source=` is ignored. */
export function parseListQuery(params: { get(name: string): string | null }): ListQuery {
  const page = Number(params.get("page"));
  const tab = params.get("tab");
  const old = tab === null ? undefined : OLD_TABS.get(tab);
  return {
    tab: old?.tab ?? oneOf(tab, LIST_TABS.map((t) => t.id), DEFAULT_LIST_QUERY.tab),
    q: params.get("q") ?? "",
    sort: oneOf(params.get("sort"), SORT_OPTIONS.map((o) => o.value), DEFAULT_LIST_QUERY.sort),
    showcase: params.get("showcase") === "1" || old?.showcase === true,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** "" for the default view, else "?tab=…&q=…&sort=…&showcase=1&page=…" in that order, defaults left out. */
export function listQueryString(q: ListQuery): string {
  const out = new URLSearchParams();
  if (q.tab !== DEFAULT_LIST_QUERY.tab) out.set("tab", q.tab);
  if (searchInUrl(q.q)) out.set("q", q.q);
  if (q.sort !== DEFAULT_LIST_QUERY.sort) out.set("sort", q.sort);
  if (q.showcase) out.set("showcase", "1");
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

/** LST-26: "38 projects", or "4 of 38 projects" when a tab, search or filter narrows the view. */
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
