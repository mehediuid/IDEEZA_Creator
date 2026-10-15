// "Your blogs": a search by blog title or user name and the Figma's filters
// (requirements L1–L4) — Status (the seven Figma statuses), Reuse access
// (reuse.allowed) and a Date range over each row's date — newest first, pages of
// PAGE_SIZE. A row's date is its latest status event (sent, decided, removed;
// the last edit for a draft), so a thumbnail swap never moves a blog that waits
// for review and a result that came in while the writer was away is on top. The
// URL carries the state (?q=&status=&reuse=&from=&to=&page=) so Back and a shared
// link land on the same view, and this tab remembers the last view (listHref) so
// every in-app way back to the list lands on it too. The old status tabs (?tab=)
// still parse and filter, for a link from before; the list no longer offers them.

import { displayTitle, thingsToFix } from "./article";
import { dayKey, isDayKey, ordered, type DayKey } from "./date-range";
import { MIN_WORDS } from "./demo-review";
import { REASONS } from "./reasons";
import { displayStatusOf, lastReview, liveNote, statusOf, tabOf, DISPLAY_STATUSES, STATUS_TABS, type DisplayStatus, type StatusTab } from "./status";
import { PAGE_SIZE, type BlogArticle } from "./types";

/** The first visit's "What the IDEEZA team looks for" (F20): what the review asks for, said
 *  before sending — each reason's fix as the reasons themselves say it, and the word count the
 *  check counts. */
export const LOOKS_FOR: readonly string[] = Object.entries(REASONS).map(([id, r]) =>
  id === "needs-detail" ? `${r.fix} Write at least ${MIN_WORDS} words.` : r.fix,
);

/** Reuse access (Figma frame 03): allowed for use by IDEEZA, or not. */
export type ReuseFilter = "allowed" | "not";

export const REUSE_FILTERS: readonly ReuseFilter[] = ["allowed", "not"];

/** The Figma's own words (frame 03), in sentence case. */
export const REUSE_LABEL: Readonly<Record<ReuseFilter, string>> = { allowed: "Allow for use", not: "Not allow" };

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

// ─────────────────────────── the remembered view ───────────────────────────
// The list writes its view here on every change; the crumb, "Back to your blogs" and the
// redirects after a send or a delete read it back, so the writer lands on the filters and the
// page they left. This tab only (sessionStorage), and a browser that refuses storage simply
// gets the bare list.

export const LIST_QUERY_KEY = "ideeza:blog:list-query";

type SessionLike = Pick<Storage, "getItem" | "setItem">;

function tabStorage(): SessionLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function rememberListQuery(q: BlogQuery, store: SessionLike | null = tabStorage()): void {
  try {
    store?.setItem(LIST_QUERY_KEY, blogQueryHref({ ...q, tab: "all" }));
  } catch {
    // Storage refused (private mode, quota): the way back is the bare list.
  }
}

/** Where "back to the list" goes: the last view of it in this tab, else /blog. What was stored
 *  is parsed again, so nothing but the list's own keys ever comes back. */
export function listHref(store: SessionLike | null = tabStorage()): string {
  try {
    const raw = store?.getItem(LIST_QUERY_KEY);
    if (!raw || !/^\/blog(\?|$)/.test(raw)) return "/blog";
    const at = raw.indexOf("?");
    if (at < 0) return "/blog";
    return blogQueryHref({ ...parseBlogQuery(new URLSearchParams(raw.slice(at + 1))), tab: "all" });
  } catch {
    return "/blog";
  }
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

// ─────────────────────────── the row's date ───────────────────────────

/** What the Date & time column's moment was, in a word or two. */
export type RowMoment =
  | "Last edited"
  | "Sent for review"
  | "Sent again for review"
  | "Update sent for review"
  | "Rejected"
  | "Update rejected"
  | "Live since"
  | "Removed";

/** A live blog whose latest update the IDEEZA team sent back: readers still see the published
 *  version, but the writer has something to fix, so the Rejected filter finds it too. */
export function updateRejected(a: BlogArticle): boolean {
  if (statusOf(a) !== "live" || !a.live) return false;
  const r = lastReview(a);
  return !!r && r.outcome === "changes" && r.at > a.live.approvedAt;
}

/** The row's date: the latest status event — removed, sent, decided — or, for a draft, the last
 *  edit. The list sorts and the Date range filters by it, and the row names it. */
export function rowEvent(a: BlogArticle): { at: number; moment: RowMoment } {
  if (a.takenDown) return { at: a.takenDown.at, moment: "Removed" };
  if (a.submission) {
    const moment: RowMoment = a.live ? "Update sent for review" : a.submission.kind === "again" ? "Sent again for review" : "Sent for review";
    return { at: a.submission.at, moment };
  }
  const r = lastReview(a);
  if (a.live) return r && updateRejected(a) ? { at: r.at, moment: "Update rejected" } : { at: a.live.approvedAt, moment: "Live since" };
  if (r && r.outcome === "changes") return { at: r.at, moment: "Rejected" };
  return { at: a.updatedAt, moment: "Last edited" };
}

/** The second line under a live blog's badge while its update waits (F22). */
export const LIVE_UPDATE_NOTE = "Live · update in review";

/** The row's second line, beside its badge: what to fix (counted as `thingsToFix` counts it), a
 *  live blog's update in review, or its rejected update or unsent changes. */
export function rowNote(a: BlogArticle, draftDiffers: boolean): string | null {
  return thingsToFix(a) ?? (statusOf(a) === "changes" ? LIVE_UPDATE_NOTE : liveNote(a, draftDiffers));
}

// ─────────────────────────── the search ───────────────────────────

/** Search folding: one Unicode form, lower case, punctuation and symbols (hyphens too) dropped,
 *  runs of space as one — so "re-flow", "Reflow" and "reflow" are the same word. */
export function foldText(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{S}]+/gu, "").replace(/\s+/g, " ").trim();
}

/** The words of a search, each to be found somewhere, in any order. */
export const searchWords = (q: string): string[] => foldText(q).split(" ").filter(Boolean);

/** Where a search matched: the title the row shows, or only the draft's newer title (the row
 *  then says "Update: …"). `writer` holds the writer's own names (D-6): a word found there
 *  counts, so "Nick lamp" finds Nick's lamp blog. */
export function searchMatch(a: BlogArticle, words: readonly string[], writer: readonly string[] = []): "title" | "draft" | null {
  if (!words.length) return "title";
  const names = writer.map(foldText).join(" ");
  const hits = (title: string) => {
    const hay = `${foldText(title)} ${names}`;
    return words.every((w) => hay.includes(w));
  };
  const shown = displayTitle(a);
  if (hits(shown)) return "title";
  const draft = a.draft.title.trim();
  return draft && draft !== shown && hits(draft) ? "draft" : null;
}

type Narrowing = Pick<BlogQuery, "tab" | "q"> &
  Partial<Pick<BlogQuery, "status" | "reuse" | "from" | "to">> & {
    /** The writer's own names, for the "user name" half of the search. */
    writer?: readonly string[];
  };

const matchesStatus = (a: BlogArticle, s: DisplayStatus | undefined) => !s || displayStatusOf(a) === s || (s === "rejected" && updateRejected(a));
const matchesReuse = (a: BlogArticle, r: ReuseFilter | undefined) => !r || a.reuse.allowed === (r === "allowed");
/** The row's date is its Date & time column, as a local day. */
const matchesDates = (a: BlogArticle, from: DayKey | undefined, to: DayKey | undefined) => {
  if (!from || !to) return true;
  const day = dayKey(rowEvent(a).at);
  return day >= from && day <= to;
};

export function filterArticles(articles: readonly BlogArticle[], q: Narrowing): BlogArticle[] {
  const words = searchWords(q.q);
  return articles
    .filter((a) => q.tab === "all" || tabOf(statusOf(a)) === q.tab)
    .filter((a) => matchesStatus(a, q.status))
    .filter((a) => matchesReuse(a, q.reuse))
    .filter((a) => matchesDates(a, q.from, q.to))
    .filter((a) => searchMatch(a, words, q.writer) !== null)
    .sort((x, y) => rowEvent(y).at - rowEvent(x).at || y.updatedAt - x.updatedAt);
}

export type FilterCounts = {
  status: Record<"all" | DisplayStatus, number>;
  reuse: Record<"all" | ReuseFilter, number>;
};

/** Each filter's choices with how many blogs each would show, given everything else that
 *  narrows the list (the search, the dates and the other filter) — so a number is what
 *  choosing it really gives. A live blog whose update was rejected counts under its badge
 *  (Approved or Featured) and under Rejected, as the Rejected filter lists it. */
export function filterCounts(articles: readonly BlogArticle[], q: Narrowing): FilterCounts {
  const status = { all: 0, featured: 0, approved: 0, draft: 0, resubmitted: 0, removed: 0, pending: 0, rejected: 0 };
  const reuse = { all: 0, allowed: 0, not: 0 };
  const forStatus = filterArticles(articles, { ...q, status: undefined });
  for (const a of forStatus) {
    const s = displayStatusOf(a);
    status[s] += 1;
    if (s !== "rejected" && updateRejected(a)) status.rejected += 1;
  }
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

/** "12 blogs" · "1 blog matches" · "Showing 13–14 of 14 blogs" · "Showing 13 of 13 blogs" ·
 *  "No blogs match" · "No blogs": the list's polite count line, for the rows on screen.
 *  `searching` is any search or filter. */
export function countLine(p: { from: number; to: number; total: number; pageCount: number; searching: boolean }): string {
  if (p.total === 0) return p.searching ? "No blogs match" : "No blogs";
  const n = blogsLabel(p.total);
  if (p.pageCount > 1) return p.from === p.to ? `Showing ${p.from} of ${n}` : `Showing ${p.from}–${p.to} of ${n}`;
  return p.searching ? `${n} ${p.total === 1 ? "matches" : "match"}` : n;
}

/** A count read out in words: "Approved, 2 blogs". */
export const blogsLabel = (n: number) => `${n} blog${n === 1 ? "" : "s"}`;

/** First-letter typeahead in a list of choices (the SelectMenu's rule): one letter walks on to
 *  the next choice that starts with it, so pressing it again cycles; a longer run of letters
 *  refines from where it is. -1 when nothing starts so. */
export function typeaheadIndex(labels: readonly string[], current: number, text: string): number {
  const t = text.toLowerCase();
  const n = labels.length;
  if (!t || !n) return -1;
  const from = current < 0 ? 0 : current + (t.length === 1 ? 1 : 0);
  for (let k = 0; k < n; k++) {
    const i = (from + k) % n;
    if (labels[i].toLowerCase().startsWith(t)) return i;
  }
  return -1;
}

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
