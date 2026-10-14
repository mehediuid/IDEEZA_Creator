// "Your blogs": a title search and the Figma's filters (requirements L1–L4) —
// Status (the seven Figma statuses), Reuse access (reuse.allowed) and a Date
// range over each row's date — newest change first, pages of PAGE_SIZE. The URL
// carries the state (?q=&status=&reuse=&from=&to=&page=) so Back and a shared
// link land on the same view. The old status tabs (?tab=) still parse and filter,
// for a link from before; the list no longer offers them.

import { displayTitle } from "./article";
import { dayKey, isDayKey, ordered, type DayKey } from "./date-range";
import { displayStatusOf, statusOf, tabOf, DISPLAY_STATUSES, STATUS_TABS, type DisplayStatus, type StatusTab } from "./status";
import { PAGE_SIZE, type BlogArticle } from "./types";

/** Reuse access (Figma frame 03): allowed for use by IDEEZA, or not. */
export type ReuseFilter = "allowed" | "not";

export const REUSE_FILTERS: readonly ReuseFilter[] = ["allowed", "not"];

export const REUSE_LABEL: Readonly<Record<ReuseFilter, string>> = { allowed: "Allowed for use", not: "Not allowed" };

/** Every filter but the search is left out while it is "All", so a bare /blog is the default view. */
export type BlogQuery = {
  tab: StatusTab;
  q: string;
  page: number;
  status?: DisplayStatus;
  reuse?: ReuseFilter;
  /** Both or neither: the first and last day of the range, inclusive. */
  from?: DayKey;
  to?: DayKey;
};

export const DEFAULT_QUERY: BlogQuery = { tab: "all", q: "", page: 1 };

const TAB_IDS = new Set<string>(STATUS_TABS.map((t) => t.id));

type Params = { get(name: string): string | null };

const STATUS_IDS = new Set<string>(DISPLAY_STATUSES);

export function parseBlogQuery(params: Params): BlogQuery {
  const tab = params.get("tab");
  const page = Number(params.get("page"));
  const out: BlogQuery = {
    tab: tab && TAB_IDS.has(tab) ? (tab as StatusTab) : "all",
    q: (params.get("q") ?? "").slice(0, 120),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
  const status = params.get("status");
  if (status && STATUS_IDS.has(status)) out.status = status as DisplayStatus;
  const reuse = params.get("reuse");
  if (reuse === "allowed" || reuse === "not") out.reuse = reuse;
  // One good end is a one-day range; two are put in order.
  const from = params.get("from");
  const to = params.get("to");
  const a = isDayKey(from) ? from : null;
  const b = isDayKey(to) ? to : null;
  if (a || b) Object.assign(out, ordered(a ?? b!, b ?? a!));
  return out;
}

export function blogQueryHref(q: BlogQuery): string {
  const p = new URLSearchParams();
  if (q.tab !== "all") p.set("tab", q.tab);
  if (q.q.trim()) p.set("q", q.q.trim());
  if (q.status) p.set("status", q.status);
  if (q.reuse) p.set("reuse", q.reuse);
  if (q.from && q.to) {
    p.set("from", q.from);
    p.set("to", q.to);
  }
  if (q.page > 1) p.set("page", String(q.page));
  const s = p.toString();
  return s ? `/blog?${s}` : "/blog";
}

/** Whether a filter other than the search narrows the list. */
export const hasFilters = (q: Pick<BlogQuery, "status" | "reuse" | "from">) => !!(q.status || q.reuse || q.from);

export function tabCounts(articles: readonly BlogArticle[]): Record<StatusTab, number> {
  const counts: Record<StatusTab, number> = { all: articles.length, drafts: 0, review: 0, needs: 0, live: 0 };
  for (const a of articles) {
    const t = tabOf(statusOf(a));
    if (t) counts[t] += 1;
  }
  return counts;
}

type Narrowing = Pick<BlogQuery, "tab" | "q"> & Partial<Pick<BlogQuery, "status" | "reuse" | "from" | "to">>;

const matchesSearch = (a: BlogArticle, needle: string) =>
  !needle || displayTitle(a).toLowerCase().includes(needle) || a.draft.title.toLowerCase().includes(needle);
const matchesReuse = (a: BlogArticle, r: ReuseFilter | undefined) => !r || a.reuse.allowed === (r === "allowed");
/** The row's date is its Date & Time column: the last change, as a local day. */
const matchesDates = (a: BlogArticle, from: DayKey | undefined, to: DayKey | undefined) => {
  if (!from || !to) return true;
  const day = dayKey(a.updatedAt);
  return day >= from && day <= to;
};

export function filterArticles(articles: readonly BlogArticle[], q: Narrowing): BlogArticle[] {
  const needle = q.q.trim().toLowerCase();
  return articles
    .filter((a) => q.tab === "all" || tabOf(statusOf(a)) === q.tab)
    .filter((a) => !q.status || displayStatusOf(a) === q.status)
    .filter((a) => matchesReuse(a, q.reuse))
    .filter((a) => matchesDates(a, q.from, q.to))
    .filter((a) => matchesSearch(a, needle))
    .sort((x, y) => y.updatedAt - x.updatedAt);
}

export type FilterCounts = {
  status: Record<"all" | DisplayStatus, number>;
  reuse: Record<"all" | ReuseFilter, number>;
};

/** Each filter's choices with how many blogs each would show, given everything else that
 *  narrows the list (the search, the dates and the other filter) — so a number is what
 *  choosing it really gives. */
export function filterCounts(articles: readonly BlogArticle[], q: Narrowing): FilterCounts {
  const status = { all: 0, featured: 0, approved: 0, draft: 0, resubmitted: 0, removed: 0, pending: 0, rejected: 0 };
  const reuse = { all: 0, allowed: 0, not: 0 };
  const forStatus = filterArticles(articles, { ...q, status: undefined });
  for (const a of forStatus) status[displayStatusOf(a)] += 1;
  status.all = forStatus.length;
  const forReuse = filterArticles(articles, { ...q, reuse: undefined });
  for (const a of forReuse) reuse[a.reuse.allowed ? "allowed" : "not"] += 1;
  reuse.all = forReuse.length;
  return { status, reuse };
}

export function pageOf<T>(items: readonly T[], page: number): { items: T[]; page: number; pageCount: number; from: number; to: number } {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const p = Math.min(Math.max(1, page), pageCount);
  const start = (p - 1) * PAGE_SIZE;
  const slice = items.slice(start, start + PAGE_SIZE);
  return { items: slice, page: p, pageCount, from: slice.length ? start + 1 : 0, to: start + slice.length };
}

/** "12 blogs" · "1 blog matches" · "Showing 13–14 of 14 blogs" · "No blogs match" · "No blogs":
 *  the list's polite count line, for the rows on screen. `searching` is any search or filter. */
export function countLine(p: { from: number; to: number; total: number; pageCount: number; searching: boolean }): string {
  if (p.total === 0) return p.searching ? "No blogs match" : "No blogs";
  const n = blogsLabel(p.total);
  if (p.pageCount > 1) return `Showing ${p.from}–${p.to} of ${n}`;
  return p.searching ? `${n} ${p.total === 1 ? "matches" : "match"}` : n;
}

/** A count read out in words: "Approved, 2 blogs". */
export const blogsLabel = (n: number) => `${n} blog${n === 1 ? "" : "s"}`;

/** The draft's details differ from what readers see (a new title, category, topics, project or
 *  a cover that waits for review). The body is compared by the caller, from the stored keys. */
export function draftMetaChanged(a: BlogArticle): boolean {
  if (!a.live) return false;
  const { draft: d, live: l } = a;
  return (
    d.title !== l.title ||
    d.categoryId !== l.categoryId ||
    d.projectId !== l.projectId ||
    d.topics.join("\u0000") !== l.topics.join("\u0000") ||
    JSON.stringify(d.cover) !== JSON.stringify(l.cover)
  );
}
