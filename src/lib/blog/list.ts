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
