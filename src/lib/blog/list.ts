// The "Your articles" list: status tabs with counts, a title search, newest
// change first, pages of PAGE_SIZE. The URL carries the state (?tab=&q=&page=)
// so Back and a shared link land on the same view.

import { displayTitle } from "./article";
import { statusOf, tabOf, STATUS_TABS, type StatusTab } from "./status";
import { PAGE_SIZE, type BlogArticle } from "./types";

export type BlogQuery = { tab: StatusTab; q: string; page: number };

export const DEFAULT_QUERY: BlogQuery = { tab: "all", q: "", page: 1 };

const TAB_IDS = new Set<string>(STATUS_TABS.map((t) => t.id));

type Params = { get(name: string): string | null };

export function parseBlogQuery(params: Params): BlogQuery {
  const tab = params.get("tab");
  const page = Number(params.get("page"));
  return {
    tab: tab && TAB_IDS.has(tab) ? (tab as StatusTab) : "all",
    q: (params.get("q") ?? "").slice(0, 120),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function blogQueryHref(q: BlogQuery): string {
  const p = new URLSearchParams();
  if (q.tab !== "all") p.set("tab", q.tab);
  if (q.q.trim()) p.set("q", q.q.trim());
  if (q.page > 1) p.set("page", String(q.page));
  const s = p.toString();
  return s ? `/blog?${s}` : "/blog";
}

export function tabCounts(articles: readonly BlogArticle[]): Record<StatusTab, number> {
  const counts: Record<StatusTab, number> = { all: articles.length, drafts: 0, review: 0, needs: 0, live: 0 };
  for (const a of articles) {
    const t = tabOf(statusOf(a));
    if (t) counts[t] += 1;
  }
  return counts;
}

export function filterArticles(articles: readonly BlogArticle[], q: Pick<BlogQuery, "tab" | "q">): BlogArticle[] {
  const needle = q.q.trim().toLowerCase();
  return articles
    .filter((a) => q.tab === "all" || tabOf(statusOf(a)) === q.tab)
    .filter((a) => !needle || displayTitle(a).toLowerCase().includes(needle) || a.draft.title.toLowerCase().includes(needle))
    .sort((x, y) => y.updatedAt - x.updatedAt);
}

export function pageOf<T>(items: readonly T[], page: number): { items: T[]; page: number; pageCount: number; from: number; to: number } {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const p = Math.min(Math.max(1, page), pageCount);
  const start = (p - 1) * PAGE_SIZE;
  const slice = items.slice(start, start + PAGE_SIZE);
  return { items: slice, page: p, pageCount, from: slice.length ? start + 1 : 0, to: start + slice.length };
}

/** "12 articles" · "1 article matches" · "Showing 13–14 of 14 articles" · "No articles match" ·
 *  "No articles": the list's polite count line, for the rows on screen. */
export function countLine(p: { from: number; to: number; total: number; pageCount: number; searching: boolean }): string {
  if (p.total === 0) return p.searching ? "No articles match" : "No articles";
  const n = `${p.total} article${p.total === 1 ? "" : "s"}`;
  if (p.pageCount > 1) return `Showing ${p.from}–${p.to} of ${n}`;
  return p.searching ? `${n} ${p.total === 1 ? "matches" : "match"}` : n;
}

/** A tab's count, read out with it: "Drafts, 2 articles". */
export const articlesLabel = (n: number) => `${n} article${n === 1 ? "" : "s"}`;

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
