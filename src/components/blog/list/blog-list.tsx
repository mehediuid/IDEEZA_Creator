"use client";

// Your blogs — /blog (Figma frames 01–09, requirements L1–L15). One surface, as
// the Figma draws it: the toolbar (search by blog title, the Reuse access and
// Status filters with their counts, the Date range calendar, Create a new
// blog), the table (Blog title · Category · Date & Time · Status · ⋯; cards
// below a 600 px content box) and the pages. Every value comes from the Blog
// store (useBlog), through the pure list helpers (lib/blog/list.ts).
//
// The view lives in the URL — ?q=&status=&reuse=&from=&to=&page=, defaults left
// out — written with replaceState as My projects does: Next keeps
// useSearchParams in step, a keystroke never waits on a navigation, nothing
// scrolls, and Back leaves the list (from a blog it lands on the same view).
// The ⋯ actions are the shared useArticleActions, so the list and the blog's
// page behave alike; this page adds Change thumbnail (the shared dialog) and
// Quick view (a drawer). When an action takes a row away, focus goes to the
// row that took its place, else to the results heading.

import * as React from "react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { SearchInput, buttonVariants } from "@/components/ideeza";
import { Pagination } from "@/components/projects/pagination";
import { whenDialogsClose } from "@/components/create/use-dialog-focus";
import { useArticleActions } from "@/components/blog/article-actions";
import { ChangeCoverDialog } from "@/components/blog/send/change-cover-dialog";
import { useTabTitle } from "@/components/blog/use-tab-title";
import { findArticle } from "@/lib/blog/article";
import {
  blogQueryHref,
  countLine,
  filterArticles,
  filterCounts,
  hasFilters,
  pageOf,
  parseBlogQuery,
  REUSE_FILTERS,
  REUSE_LABEL,
  type BlogQuery,
  type ReuseFilter,
} from "@/lib/blog/list";
import { newArticleHref } from "@/lib/blog/slug";
import { DISPLAY_LABEL, DISPLAY_STATUSES, type DisplayStatus } from "@/lib/blog/status";
import { useBlog } from "@/lib/blog/store";
import type { BlogArticle } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import { ArticleRow, ArticleRowSkeleton, ROW_COLS } from "./article-row";
import { DateRangeFilter } from "./date-range-filter";
import { FilterSelect, type FilterOption } from "./filter-select";
import { EmptyStatusState, FirstVisitState, NoMatchState, UnreadableState } from "./list-states";
import { QuickView } from "./quick-view";

const LIST = "m-0 flex list-none flex-col gap-5 p-0 [@container(min-width:600px)]:gap-0";
const WIDE_SURFACE =
  "[@container(min-width:600px)]:rounded-xl [@container(min-width:600px)]:border [@container(min-width:600px)]:border-solid [@container(min-width:600px)]:border-border-subtle [@container(min-width:600px)]:bg-bg-surface";

type StatusChoice = "all" | DisplayStatus;
type ReuseChoice = "all" | ReuseFilter;

export function BlogList() {
  const { hydrated, data, unreadable } = useBlog();
  const params = useSearchParams();
  const [coverFor, setCoverFor] = React.useState<string | null>(null);
  const [quickFor, setQuickFor] = React.useState<string | null>(null);
  // Coming back from the editor or a blog keeps the layout's metadata, so Next leaves the
  // tab named after the last blog: name it again.
  useTabTitle("Blog · IDEEZA");
  const actions = useArticleActions({
    onChangeCover: (a) => setCoverFor(a.id),
    onQuickView: (a) => setQuickFor(a.id),
  });

  // ── the view ──
  // The old status tabs (?tab=) are gone from the page: a link that still carries one shows
  // every blog, and the next change drops it from the address.
  const query = React.useMemo<BlogQuery>(() => ({ ...parseBlogQuery(params), tab: "all" }), [params]);
  // The field keeps its own copy of q, so typing never waits on the URL. A navigation that
  // brings another q (a pasted link, the sidebar's bare /blog) is adopted; our own echo of
  // what was typed is not.
  const [text, setText] = React.useState(query.q);
  const [seenQ, setSeenQ] = React.useState(query.q);
  if (seenQ !== query.q) {
    setSeenQ(query.q);
    if (text.trim() !== query.q.trim()) setText(query.q);
  }
  const view = React.useMemo<BlogQuery>(() => ({ ...query, q: text }), [query, text]);
  const write = React.useCallback((next: BlogQuery) => {
    window.history.replaceState(null, "", blogQueryHref(next));
  }, []);
  const changeView = (patch: Partial<BlogQuery>) => write({ ...view, ...patch, page: 1 });
  const changeQuery = (q: string) => {
    setText(q);
    write({ ...view, q, page: 1 });
  };

  // ── the rows ──
  const filtered = React.useMemo(() => filterArticles(data.articles, view), [data, view]);
  const counts = React.useMemo(() => (hydrated ? filterCounts(data.articles, view) : null), [hydrated, data, view]);
  const paged = pageOf(filtered, view.page);
  const narrowed = view.q.trim() !== "" || hasFilters(view);

  // A page the list no longer reaches (a delete emptied it, a stale link) shows the last
  // one, and the URL follows so Back lands there too.
  React.useEffect(() => {
    if (hydrated && paged.page !== view.page) write({ ...view, page: paged.page });
  }, [hydrated, paged.page, view, write]);

  const statusOptions: FilterOption<StatusChoice>[] = [
    { value: "all", label: "All", count: counts?.status.all ?? null },
    ...DISPLAY_STATUSES.map((s) => ({ value: s, label: DISPLAY_LABEL[s], count: counts?.status[s] ?? null })),
  ];
  const reuseOptions: FilterOption<ReuseChoice>[] = [
    { value: "all", label: "All", count: counts?.reuse.all ?? null },
    ...REUSE_FILTERS.map((r) => ({ value: r, label: REUSE_LABEL[r], count: counts?.reuse[r] ?? null })),
  ];

  // ── focus ──
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const sectionRef = React.useRef<HTMLElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const lastRow = React.useRef<number | null>(null);
  const rowsKey = paged.items.map((a) => a.id).join("|");

  // Which row the keyboard or pointer was last on — forgotten once either moves somewhere
  // else on the page (a menu, dialog or drawer the row opened doesn't count).
  React.useEffect(() => {
    const away = (t: EventTarget | null) =>
      t instanceof Element && !listRef.current?.contains(t) && !t.closest('[role="menu"], [role="dialog"], [role="alertdialog"]');
    const forget = (e: Event) => {
      if (away(e.target)) lastRow.current = null;
    };
    document.addEventListener("focusin", forget);
    document.addEventListener("pointerdown", forget, true);
    return () => {
      document.removeEventListener("focusin", forget);
      document.removeEventListener("pointerdown", forget, true);
    };
  }, []);

  // A row that had focus went away with what its menu did: once the dialog has handed focus
  // back (to a ⋯ that is gone, so to nothing), the row now in its place takes it, else the
  // results heading.
  React.useEffect(() => {
    const at = lastRow.current;
    if (at === null) return;
    const frame = requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active && active !== document.body && active.isConnected) return;
      const links = listRef.current?.querySelectorAll<HTMLElement>("[data-row-link]");
      const target = links && links.length ? links[Math.min(at, links.length - 1)] : headingRef.current;
      target?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [rowsKey]);

  const changePage = (page: number) => {
    write({ ...view, page });
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sectionRef.current?.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  };

  // Edit from the quick view: the drawer closes and hands focus back to the ⋯ first, so the
  // "take it out of review" question (a submitted blog) returns there too.
  const editFromQuickView = (a: BlogArticle) => {
    setQuickFor(null);
    whenDialogsClose(() => actions.run("edit", a));
  };

  const firstVisit = hydrated && !unreadable && data.articles.length === 0;

  // The table's column heads, from 600 px: visual only, as each row reads in order.
  const heads = (
    <div
      aria-hidden
      className={cn(
        "hidden gap-x-8 border-0 border-b border-t border-solid border-border-subtle px-8 py-6 text-sm font-semibold leading-xs text-text-secondary [@container(min-width:600px)]:grid",
        ROW_COLS,
      )}
    >
      <span>Blog title</span>
      <span>Category</span>
      <span>Date &amp; time</span>
      <span>Status</span>
      <span />
    </div>
  );

  let body: React.ReactNode;
  if (!hydrated) {
    body = (
      <>
        {heads}
        <ul aria-busy="true" aria-label="Loading your blogs" className={LIST}>
          {Array.from({ length: 6 }, (_, i) => (
            <ArticleRowSkeleton key={i} />
          ))}
        </ul>
      </>
    );
  } else if (paged.items.length === 0) {
    // The Status filter alone, on a status that holds nothing; else the search or the filters
    // emptied it.
    body =
      view.status && !view.q.trim() && !view.reuse && !view.from ? (
        <EmptyStatusState status={view.status} onShowAll={() => changeView({ status: undefined })} />
      ) : (
        <NoMatchState
          query={view.q}
          filtered={hasFilters(view)}
          onClearSearch={() => {
            changeQuery("");
            searchRef.current?.focus();
          }}
          onClearFilters={() => {
            changeView({ status: undefined, reuse: undefined, from: undefined, to: undefined });
            searchRef.current?.focus();
          }}
        />
      );
  } else {
    body = (
      <>
        {heads}
        <ul
          ref={listRef}
          aria-label="Your blogs"
          onFocus={(e) => {
            const row = (e.target as HTMLElement).closest<HTMLElement>("li[data-row]");
            if (row) lastRow.current = Number(row.dataset.row);
          }}
          className={LIST}
        >
          {paged.items.map((a, i) => (
            <ArticleRow key={a.id} article={a} index={i} menuItems={actions.menuItems(a)} />
          ))}
        </ul>
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] px-8 pb-24 pt-12 min-[640px]:px-16">
      <div className="flex flex-col gap-10 [container-type:inline-size]">
        {/* The Figma opens straight on the list: the page's name is for screen readers. */}
        <h1 className="sr-only">Blog</h1>

        {unreadable ? (
          <UnreadableState />
        ) : firstVisit ? (
          <FirstVisitState />
        ) : (
          <section ref={sectionRef} aria-label="Your blogs" className={cn("flex scroll-mt-12 flex-col", WIDE_SURFACE)}>
            {/* The toolbar (Figma frame 01): search on the left, the filters and Create a new
                blog on the right, wrapping under it when the box is narrower. Below 600 px:
                search, the filters, then Create, each on its own row. */}
            <div className="flex flex-col gap-6 pb-8 [@container(min-width:600px)]:flex-row [@container(min-width:600px)]:flex-wrap [@container(min-width:600px)]:items-center [@container(min-width:600px)]:p-8">
              <form
                role="search"
                onSubmit={(e) => e.preventDefault()}
                className="[@container(min-width:600px)]:min-w-[220px] [@container(min-width:600px)]:flex-1 [@container(min-width:1000px)]:max-w-[320px]"
              >
                <SearchInput
                  ref={searchRef}
                  value={text}
                  onValueChange={changeQuery}
                  onClear={() => searchRef.current?.focus()}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && text) {
                      e.preventDefault();
                      changeQuery("");
                    }
                  }}
                  placeholder="Search by blog title"
                  aria-label="Search by blog title"
                  enterKeyHint="search"
                  className="text-[length:var(--font-size-md)]"
                  containerClassName="min-h-[42px] [@container(max-width:599px)]:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)] [&>button]:before:-inset-[15.5px]"
                />
              </form>
              <div role="group" aria-label="Filters" className="flex flex-wrap items-center gap-4 [@container(min-width:1000px)]:ml-auto">
                <FilterSelect<ReuseChoice>
                  name="Reuse access"
                  value={view.reuse ?? "all"}
                  allValue="all"
                  options={reuseOptions}
                  triggerText={(o) => (o.value === "allowed" ? "Reuse: allowed" : "Reuse: not allowed")}
                  onChange={(v) => changeView({ reuse: v === "all" ? undefined : v })}
                  className="[@container(max-width:599px)]:flex-auto"
                />
                <FilterSelect<StatusChoice>
                  name="Status"
                  value={view.status ?? "all"}
                  allValue="all"
                  options={statusOptions}
                  triggerText={(o) => `Status: ${o.label}`}
                  onChange={(v) => changeView({ status: v === "all" ? undefined : v })}
                  className="[@container(max-width:599px)]:flex-auto"
                />
                <DateRangeFilter
                  value={view.from && view.to ? { from: view.from, to: view.to } : null}
                  onChange={(r) => changeView({ from: r?.from, to: r?.to })}
                  className="[@container(max-width:599px)]:flex-auto"
                />
              </div>
              <NextLink
                href={newArticleHref()}
                className={cn(
                  buttonVariants({ hierarchy: "primary", size: "lg" }),
                  "no-underline [@container(max-width:599px)]:min-h-[var(--touch-min)] [@container(min-width:600px)]:ml-auto [@container(min-width:1000px)]:ml-0 [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
                )}
              >
                <Icon icon={Add01Icon} size={16} />
                Create a new blog
              </NextLink>
            </div>

            <div className="flex flex-col">
              <h2 ref={headingRef} tabIndex={-1} className="sr-only">
                Your blogs
              </h2>
              {body}
              <div className="flex flex-wrap items-center justify-between gap-6 pt-8 [@container(min-width:600px)]:border-0 [@container(min-width:600px)]:border-t [@container(min-width:600px)]:border-solid [@container(min-width:600px)]:border-border-subtle [@container(min-width:600px)]:px-8 [@container(min-width:600px)]:py-6">
                <p role="status" aria-atomic="true" className="m-0 text-sm leading-sm text-text-secondary">
                  {hydrated
                    ? countLine({ from: paged.from, to: paged.to, total: filtered.length, pageCount: paged.pageCount, searching: narrowed })
                    : "Loading your blogs…"}
                </p>
                {hydrated && paged.pageCount > 1 && (
                  <div className="[&>nav]:mt-0">
                    <Pagination page={paged.page} pageCount={paged.pageCount} onChange={changePage} />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
      {actions.dialogs}
      <ChangeCoverDialog article={coverFor ? findArticle(data, coverFor) : null} onClose={() => setCoverFor(null)} />
      <QuickView article={quickFor ? findArticle(data, quickFor) : null} onClose={() => setQuickFor(null)} onEdit={editFromQuickView} />
    </div>
  );
}
