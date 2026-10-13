"use client";

// Your articles — /blog (spec § Screens 1, mockup Main / PhoneList / States).
// The header (Blog, what happens to an article, New article), then one surface
// holding the status tabs with their counts, the title search, the rows (a
// table from a 600 px content box, cards below it) and a footer with the count
// line and the pages. Every value comes from the Blog store (useBlog), through
// the pure list helpers (lib/blog/list.ts).
//
// The view lives in the URL — ?tab=&q=&page=, defaults left out — written with
// replaceState as My projects does: Next keeps useSearchParams in step, a
// keystroke never waits on a navigation, nothing scrolls, and Back leaves the
// list (from an article it lands on the same view). The ⋯ actions are the
// shared useArticleActions, so the list and the article page behave alike;
// when an action takes a row away (delete, take offline from the Live tab),
// focus goes to the row that took its place, else to the heading.

import * as React from "react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { SearchInput, buttonVariants } from "@/components/ideeza";
import { Pagination } from "@/components/projects/pagination";
import { useNow } from "@/components/innovations/comments/comment-dom";
import { useArticleActions } from "@/components/blog/article-actions";
import { ChangeCoverDialog } from "@/components/blog/send/change-cover-dialog";
import { findArticle } from "@/lib/blog/article";
import { blogQueryHref, countLine, filterArticles, pageOf, parseBlogQuery, tabCounts, type BlogQuery } from "@/lib/blog/list";
import { newArticleHref } from "@/lib/blog/slug";
import type { StatusTab } from "@/lib/blog/status";
import { useBlog } from "@/lib/blog/store";
import { cn } from "@/lib/utils";
import { ArticleRow, ArticleRowSkeleton, ROW_COLS } from "./article-row";
import { BLOG_PANEL_ID, BlogTabs, blogTabId } from "./blog-tabs";
import { EmptyTabState, FirstVisitState, NoMatchState, UnreadableState } from "./list-states";

/** The results heading a page turn focuses (visually hidden). */
const HEADING: Record<StatusTab, string> = {
  all: "All articles",
  drafts: "Drafts",
  review: "Articles in review",
  needs: "Articles that need changes",
  live: "Live articles",
};

const LIST = "m-0 flex list-none flex-col gap-5 p-0 [@container(min-width:600px)]:gap-0";

export function BlogList() {
  const { hydrated, data, unreadable } = useBlog();
  const params = useSearchParams();
  const now = useNow();
  const [coverFor, setCoverFor] = React.useState<string | null>(null);
  // Coming back from the editor or an article keeps the layout's metadata, so Next leaves the
  // tab named after the last article: name it again.
  React.useEffect(() => {
    document.title = "Blog · IDEEZA";
  }, []);
  const actions = useArticleActions({ onChangeCover: (a) => setCoverFor(a.id) });

  // ── the view ──
  const query = React.useMemo(() => parseBlogQuery(params), [params]);
  // The field keeps its own copy of q, so typing never waits on the URL. A
  // navigation that brings another q (a pasted link, the sidebar's bare /blog)
  // is adopted; our own echo of what was typed is not.
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
  const changeTab = (tab: StatusTab) => write({ ...view, tab, page: 1 });
  const changeQuery = (q: string) => {
    setText(q);
    write({ ...view, q, page: 1 });
  };

  // ── the rows ──
  const counts = React.useMemo(() => tabCounts(data.articles), [data]);
  const filtered = React.useMemo(() => filterArticles(data.articles, view), [data, view]);
  const paged = pageOf(filtered, view.page);
  const searching = view.q.trim() !== "";

  // A page the list no longer reaches (a delete emptied it, a stale link) shows
  // the last one, and the URL follows so Back lands there too.
  React.useEffect(() => {
    if (hydrated && paged.page !== view.page) write({ ...view, page: paged.page });
  }, [hydrated, paged.page, view, write]);

  // ── focus ──
  const h1Ref = React.useRef<HTMLHeadingElement>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const sectionRef = React.useRef<HTMLElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const lastRow = React.useRef<number | null>(null);
  const rowsKey = paged.items.map((a) => a.id).join("|");

  // Which row the keyboard or pointer was last on — forgotten once either moves
  // somewhere else on the page (a menu or dialog the row opened doesn't count).
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

  // A row that had focus went away with what its menu did: once the dialog has
  // handed focus back (to a ⋯ that is gone, so to nothing), the row now in its
  // place takes it, else the one above, else the page's heading.
  React.useEffect(() => {
    const at = lastRow.current;
    if (at === null) return;
    const frame = requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active && active !== document.body && active.isConnected) return;
      const links = listRef.current?.querySelectorAll<HTMLElement>("[data-row-link]");
      const target = links && links.length ? links[Math.min(at, links.length - 1)] : h1Ref.current;
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

  const clearSearch = () => {
    changeQuery("");
    searchRef.current?.focus();
  };

  const firstVisit = hydrated && !unreadable && data.articles.length === 0;

  // The table's column heads, from 600 px: visual only, as each row reads in order (title, category, status, date).
  const heads = (
    <div
      aria-hidden
      className={cn("hidden gap-x-8 px-8 py-5 text-sm font-semibold leading-xs text-text-secondary [@container(min-width:600px)]:grid", ROW_COLS)}
    >
      <span>Article</span>
      <span>Status</span>
      <span>Last change</span>
      <span />
    </div>
  );

  let body: React.ReactNode;
  if (!hydrated) {
    body = (
      <>
        {heads}
        <ul aria-busy="true" aria-label="Loading your articles" className={LIST}>
          {Array.from({ length: 4 }, (_, i) => (
            <ArticleRowSkeleton key={i} />
          ))}
        </ul>
      </>
    );
  } else if (paged.items.length === 0) {
    // The tab itself holds nothing; else the search emptied it.
    body =
      view.tab !== "all" && counts[view.tab] === 0 ? (
        <EmptyTabState tab={view.tab} />
      ) : (
        <NoMatchState
          tab={view.tab}
          query={view.q}
          onClear={clearSearch}
          onSearchAll={() => {
            changeTab("all");
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
          aria-label="Your articles"
          onFocus={(e) => {
            const row = (e.target as HTMLElement).closest<HTMLElement>("li[data-row]");
            if (row) lastRow.current = Number(row.dataset.row);
          }}
          className={LIST}
        >
          {paged.items.map((a, i) => (
            <ArticleRow key={a.id} article={a} index={i} now={now} menuItems={actions.menuItems(a)} />
          ))}
        </ul>
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] px-8 pb-24 pt-12 min-[640px]:px-16">
      <div className="flex flex-col gap-10 [container-type:inline-size]">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-8 gap-y-2">
          <h1
            ref={h1Ref}
            tabIndex={-1}
            className="col-start-1 row-start-1 m-0 text-3xl font-semibold leading-3xl tracking-slight text-text-primary outline-none"
          >
            Blog
          </h1>
          <NextLink
            href={newArticleHref()}
            className={cn(
              buttonVariants({ hierarchy: "primary", size: "lg" }),
              "col-start-2 row-start-1 ring-offset-bg-page [@container(max-width:599px)]:min-h-[var(--touch-min)] [@container(min-width:600px)]:row-span-2 [@container(min-width:600px)]:self-end [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
            )}
          >
            <Icon icon={Add01Icon} size={16} />
            New article
          </NextLink>
          <p className="col-span-2 row-start-2 m-0 max-w-[62ch] text-md leading-md text-text-secondary [@container(min-width:600px)]:col-span-1">
            Write about what you build. The IDEEZA team reads each article before it goes live.
          </p>
        </header>

        {unreadable ? (
          <UnreadableState />
        ) : firstVisit ? (
          <FirstVisitState />
        ) : (
          <section
            ref={sectionRef}
            aria-label="Your articles"
            className="flex scroll-mt-12 flex-col [@container(min-width:600px)]:rounded-xl [@container(min-width:600px)]:border [@container(min-width:600px)]:border-solid [@container(min-width:600px)]:border-border-subtle [@container(min-width:600px)]:bg-bg-surface"
          >
            {/* Tabs and search: one row from a 760 px content box (tabs, then the
                search on the right); narrower, the search on top at full width and
                the tabs under it, scrolling sideways. On the surface from 600 px. */}
            <div className="flex flex-col gap-4 [@container(min-width:600px)]:border-b [@container(min-width:600px)]:border-solid [@container(min-width:600px)]:border-border-subtle [@container(min-width:600px)]:px-8 [@container(min-width:600px)]:pt-6 [@container(min-width:760px)]:flex-row [@container(min-width:760px)]:items-end [@container(min-width:760px)]:justify-between [@container(min-width:760px)]:gap-8">
              <BlogTabs
                tab={view.tab}
                counts={hydrated ? counts : null}
                onChange={changeTab}
                className="-mx-8 px-8 [@container(min-width:760px)]:mx-0 [@container(min-width:760px)]:min-w-0 [@container(min-width:760px)]:flex-1 [@container(min-width:760px)]:px-0"
              />
              <form
                role="search"
                onSubmit={(e) => e.preventDefault()}
                className="order-first [@container(min-width:760px)]:order-none [@container(min-width:760px)]:w-[280px] [@container(min-width:760px)]:shrink-0 [@container(min-width:760px)]:pb-4"
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
                  placeholder="Search your articles"
                  aria-label="Search articles by title"
                  enterKeyHint="search"
                  className="text-[length:var(--font-size-md)]"
                  containerClassName="min-h-[36px] [@container(max-width:599px)]:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)] [&>button]:before:-inset-[15.5px]"
                />
              </form>
            </div>

            <div
              role="tabpanel"
              id={BLOG_PANEL_ID}
              aria-labelledby={blogTabId(view.tab)}
              className="flex flex-col pt-6 [@container(min-width:600px)]:pt-0"
            >
              <h2 ref={headingRef} tabIndex={-1} className="sr-only">
                {HEADING[view.tab]}
              </h2>
              {body}
              <div className="flex flex-wrap items-center justify-between gap-6 pt-8 [@container(min-width:600px)]:border-t [@container(min-width:600px)]:border-solid [@container(min-width:600px)]:border-border-subtle [@container(min-width:600px)]:px-8 [@container(min-width:600px)]:py-6">
                <p role="status" aria-atomic="true" className="m-0 text-sm leading-sm text-text-secondary">
                  {hydrated
                    ? countLine({ from: paged.from, to: paged.to, total: filtered.length, pageCount: paged.pageCount, searching })
                    : "Loading your articles…"}
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
    </div>
  );
}
