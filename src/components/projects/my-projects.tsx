"use client";

// MyProjects — /projects, the only index of projects (spec §3.2, §5.2). The
// shell follows User Panel V2's "My project" section (Figma 16838:392921):
// header, tab row, toolbar, card grid, pagination. Every value comes from the
// real stores — the project records (`useManualProjects`), their builds
// (`useCreateHistory`), the preview clips (`useVideoJobs`) and one brief draft
// per project (`readBriefDraft`) — through one derivation, `projectSummary()`,
// which the details header shares (LST-32). One pure pass, `filterProjects()`,
// turns the summaries into the tab counts, the search, the Showcase filter, the
// order and the page.
//
// The tabs are the outcome — All · Draft · Minted · Listed · Sold (owner,
// 2026-10-11). Showcase is membership, not a state (owner decision O5), so it is
// a filter beside Sort: Showcase only.
//
// The view lives in the URL (LST-28): tab, q, sort, showcase and page, written
// with replaceState and defaults left out; an old tab=private|given|showcase
// still opens (parseListQuery). The scroller is the (create)
// layout's <main>, which Next's own restoration doesn't cover, so the list
// also puts its scroll offset back when Back returns to it.

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EyeIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ProjectNotice } from "@/components/projects/project-notice";
import { StorageErrorBanner } from "@/components/projects/storage-error-banner";
import { SearchInput, SelectMenu, buttonVariants } from "@/components/ideeza";
import { PAGE_GRID, Page } from "@/components/ideeza/page";
import { PageHeader } from "@/components/ideeza/page-header";
import { useMinuteClock } from "@/components/create/build-status";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useCreateHistory } from "@/lib/create/history";
import { useMarket } from "@/lib/market/market-store";
import { readBriefDraft, showcaseBackfillOf } from "@/lib/brief/project-brief";
import { briefDraftKey } from "@/lib/brief/types";
import { projectSummary, type ListQuery } from "@/lib/manual/project-summary";
import {
  LIST_TABS,
  SORT_OPTIONS,
  countLine,
  filterProjects,
  listQueryString,
  parseListQuery,
  searchInUrl,
  tabCountLabel,
  type ListCounts,
  type ListItem,
  type ListTab,
} from "@/lib/manual/project-list";
import { useManualProjects } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import {
  ProjectCard,
  ProjectCardSkeleton,
  NoProjectsState,
  NoMatchState,
  EmptyTabState,
  NoShowcaseState,
} from "./project-card";
import { Pagination } from "./pagination";
import { motionReduced } from "@/lib/settings/appearance";

const PANEL_ID = "projects-panel";
const tabId = (tab: ListTab) => `projects-tab-${tab}`;

// ───────────────────────── brief drafts ─────────────────────────

// The drafts are read in render, keyed on a version this store bumps on
// window focus and on another tab's draft write (LST-7), so a mint finished
// in another tab moves its card here. The server snapshot is -1: the first
// frame renders the counts as "—" and the reads happen on the client only.
const DRAFT_PREFIX = briefDraftKey("");
let draftsVersion = 0;

function subscribeDrafts(onChange: () => void): () => void {
  const bump = () => {
    draftsVersion += 1;
    onChange();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith(DRAFT_PREFIX)) bump();
  };
  window.addEventListener("focus", bump);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("focus", bump);
    window.removeEventListener("storage", onStorage);
  };
}
const draftsSnapshot = () => draftsVersion;
const draftsServerSnapshot = () => -1;

// ───────────────────────── scroll memory ─────────────────────────

// Back from a project returns the same view at the same scroll position
// (LST-28). The offset is kept per view URL when a click in the list leaves
// the page, and put back only when the list arrives at a view by a history
// traversal, so a fresh visit (the sidebar, a link) starts at the top.
const SCROLL_KEY = "ideeza:projects:scroll";
let popTarget: string | null = null;
/** The popstate a mount already restored from, inside its own dispatch (below). */
let handledPop: Event | null = null;

function here(): string {
  return window.location.pathname + window.location.search;
}

if (typeof window !== "undefined") {
  // Records the target for a Back whose list renders after the event (a route
  // the router has to fetch). One the mount already handled arms nothing, so a
  // later fresh visit to the same URL still starts at the top.
  window.addEventListener(
    "popstate",
    (e) => {
      popTarget = e === handledPop ? null : here();
    },
    { capture: true },
  );
}

function rememberScroll(): void {
  const main = document.getElementById("main-content");
  if (!main) return;
  try {
    window.sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ url: here(), top: main.scrollTop }));
  } catch {
    // Storage blocked: Back starts at the top, as a fresh visit does.
  }
}

/** Where <main> goes when the list arrives at a view: back to the saved
 *  offset after Back or Forward, else to the top. */
function settleScroll(): void {
  const url = here();
  const main = document.getElementById("main-content");
  // A Back to a route the router holds renders inside the popstate dispatch:
  // React flushes the router's transition eagerly, before the listener above
  // runs — this lazily loaded module adds it after the router's own, and
  // listeners on window run in the order they were added. So the event in
  // flight counts as the traversal too.
  const inFlight = window.event?.type === "popstate" ? window.event : null;
  if (popTarget !== url && !inFlight) {
    // A fresh visit starts at the top. The router doesn't always see to it: a
    // link to /projects while the list shows a view it wrote keeps this page
    // mounted and leaves <main> where it was.
    if (main) main.scrollTop = 0;
    return;
  }
  popTarget = null;
  handledPop = inFlight;
  try {
    const raw = window.sessionStorage.getItem(SCROLL_KEY);
    const saved = raw ? (JSON.parse(raw) as { url?: unknown; top?: unknown }) : null;
    if (main && saved?.url === url && typeof saved.top === "number") main.scrollTop = saved.top;
  } catch {
    // A corrupt entry is ignored.
  }
}

/** "/" focuses search unless focus is already somewhere that takes typing (LST-15). */
function isTypingTarget(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el.closest('[role="dialog"], [role="listbox"], [role="menu"]')) return true;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

// ───────────────────────── page ─────────────────────────

export function MyProjects() {
  const { hydrated, projects, selectProject, backfillShowcase } = useManualProjects();
  const { hydrated: buildsHydrated, builds } = useCreateHistory();
  const { hydrated: jobsHydrated, jobs } = useVideoJobs();
  const { hydrated: marketHydrated, data: market } = useMarket();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const now = useMinuteClock();

  // ── the view ──
  const query = React.useMemo(() => parseListQuery(params), [params]);
  // The field keeps its own copy of q, so a keystroke never waits on the
  // router. A navigation that changes q (a pasted link, the sidebar's bare
  // /projects) is adopted; our own echo of what was typed is not.
  const [text, setText] = React.useState(query.q);
  const [seenQ, setSeenQ] = React.useState(query.q);
  if (seenQ !== query.q) {
    setSeenQ(query.q);
    if (searchInUrl(text) !== query.q) setText(query.q);
  }
  const view = React.useMemo<ListQuery>(() => ({ ...query, q: text }), [query, text]);

  // replaceState: a tab, a sort or a typed word is not a history step, so Back
  // leaves the list rather than undoing it one keystroke at a time. Next keeps
  // useSearchParams in step with it (docs: "Native History API").
  // urlSearch is the search the URL had when the list last looked: what
  // write() put there, or what a navigation brought.
  const urlSearch = React.useRef<string | null>(null);
  const write = React.useCallback(
    (next: ListQuery) => {
      const qs = listQueryString(next);
      urlSearch.current = qs;
      window.history.replaceState(null, "", `${pathname}${qs}`);
    },
    [pathname],
  );
  // Every change but a page turn goes back to page 1; the rest of the view stays (LST-8).
  const changeView = (patch: Partial<Omit<ListQuery, "page">>) => write({ ...view, ...patch, page: 1 });
  const changeQuery = (next: string) => {
    setText(next);
    write({ ...view, q: next, page: 1 });
  };

  // ── the data ──
  const draftsTick = React.useSyncExternalStore(subscribeDrafts, draftsSnapshot, draftsServerSnapshot);
  const storesReady = hydrated && buildsHydrated && jobsHydrated && marketHydrated;
  const drafts = React.useMemo(
    () =>
      storesReady && draftsTick >= 0
        ? new Map(projects.map((p) => [p.id, readBriefDraft(p.id)] as const))
        : null,
    [storesReady, draftsTick, projects],
  );

  // Showcase, once, for a project minted with Share to Innovations before the
  // flag existed (COR-105): it gets showcasedAt = mintedAt the first time its
  // draft is read. null — the maker stopped showcasing — is never overwritten.
  // The same rule the project page runs (showcaseBackfillOf), written through
  // backfillShowcase, which records an old fact and so leaves updatedAt alone.
  React.useEffect(() => {
    if (!drafts) return;
    for (const p of projects) {
      const at = showcaseBackfillOf(p, drafts.get(p.id) ?? null);
      if (at !== null) backfillShowcase(p.id, at);
    }
  }, [drafts, projects, backfillShowcase]);

  const items = React.useMemo<ListItem[] | null>(
    () =>
      drafts
        ? projects.map((project) => ({
            project,
            summary: projectSummary(project, {
              builds,
              brief: drafts.get(project.id) ?? null,
              videoJobs: jobs,
              now,
              projects,
              market,
            }),
          }))
        : null,
    [drafts, projects, builds, jobs, now, market],
  );
  const result = React.useMemo(() => (items ? filterProjects(items, view) : null), [items, view]);

  // Back to this view puts the scroll offset back, once the cards are there.
  const restored = React.useRef(false);
  React.useEffect(() => {
    if (!result || restored.current) return;
    restored.current = true;
    settleScroll();
  }, [result]);

  // A navigation that keeps this page mounted — the router does for a change
  // of search alone, such as the sidebar's bare /projects — is an arrival too.
  // Our own replaceState echoes are not: the URL still holds what write() put there.
  React.useEffect(() => {
    const search = window.location.search;
    const arrived = urlSearch.current !== null && urlSearch.current !== search;
    urlSearch.current = search;
    if (arrived) settleScroll();
  }, [params]);

  // A page the list no longer reaches — a delete emptied it, or a stale link —
  // shows the last page, and the URL follows so Back lands there too (LST-31).
  React.useEffect(() => {
    if (result && result.page !== view.page) write({ ...view, page: result.page });
  }, [result, view, write]);

  // ── "/" focuses search; ⌘K stays with the command palette (LST-15) ──
  const searchRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const input = searchRef.current;
      if (!input || isTypingTarget(document.activeElement)) return;
      e.preventDefault();
      input.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ── a page turn goes to the results and focuses their heading (LST-27) ──
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const changePage = (page: number) => {
    write({ ...view, page });
    const still = motionReduced();
    resultsRef.current?.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  };

  const tabLabel = LIST_TABS.find((t) => t.id === view.tab)?.label ?? "All";
  const noProjects = result !== null && result.total === 0;

  return (
    // The page container is what the toolbar, the chips and the pagination
    // ask about: layout switches read the page, never the window.
    <Page>
      <div onClickCapture={rememberScroll}>
        <ProjectsHeader />
        {/* Notices sit under the title, never above it. */}
        <StorageErrorBanner className="mb-8" />
        <ProjectNotice className="mb-8" />

        {noProjects ? (
          <NoProjectsState onGoHome={() => router.push("/")} />
        ) : (
          <>
            <ProjectTabs tab={view.tab} counts={result?.counts ?? null} onChange={(tab) => changeView({ tab })} />

            <div role="tabpanel" id={PANEL_ID} aria-labelledby={tabId(view.tab)}>
              {/* The results heading (LST-60): the focus target after a page turn. */}
              <h2 ref={headingRef} tabIndex={-1} className="sr-only">
                {tabLabel} projects
              </h2>

              {/* Toolbar: search, then Showcase only and Sort. Below a 720 px page
                  search takes the row and the other two share the next (LST-57). */}
              <div className="mt-[16px] grid grid-cols-2 gap-[12px] [@container(min-width:720px)]:flex [@container(min-width:720px)]:items-center">
                <form
                  role="search"
                  onSubmit={(e) => e.preventDefault()}
                  className="col-span-2 [@container(min-width:720px)]:max-w-[420px] [@container(min-width:720px)]:flex-1"
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
                    placeholder="Search projects and products"
                    aria-label="Search projects and products"
                    aria-keyshortcuts="/"
                    enterKeyHint="search"
                    className="text-[length:var(--font-size-md)]"
                    containerClassName="min-h-[44px] [&>button]:before:-inset-[15.5px]"
                  />
                </form>
                {/* A filter, not a tab: membership on any outcome (LST-10). Pressed reads as
                    the active tab does; the field-shaped border matches Sort beside it. */}
                <button
                  type="button"
                  aria-pressed={view.showcase}
                  onClick={() => changeView({ showcase: !view.showcase })}
                  className={cn(
                    "inline-flex min-h-[44px] items-center justify-center gap-[8px] rounded-[var(--radius-lg)] border border-solid px-[var(--spacing-6)] text-[length:var(--font-size-md)] font-semibold outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-page motion-reduce:transition-none [@container(min-width:720px)]:ml-auto [@container(min-width:720px)]:shrink-0",
                    view.showcase
                      ? "border-transparent bg-bg-brand-subtle text-text-brand"
                      : "border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
                  )}
                >
                  <Icon icon={EyeIcon} size={16} />
                  Shared only
                </button>
                <SelectMenu
                  ariaLabel="Sort"
                  value={view.sort}
                  onChange={(sort) => changeView({ sort })}
                  options={SORT_OPTIONS}
                  placeholder="Recently updated"
                  className="[&>button]:min-h-[44px] [@container(min-width:720px)]:w-[200px] [@container(min-width:720px)]:shrink-0"
                />
              </div>

              {/* The count line (LST-26). */}
              <div ref={resultsRef} className="mt-[16px] scroll-mt-[16px]">
                <p aria-live="polite" aria-atomic="true" className="text-md font-medium text-text-secondary">
                  {result ? countLine(result) : "—"}
                </p>
              </div>

              {!result ? (
                // LST-51: six skeleton cards, the tab/search/sort chrome above
                // still present (counts read "—" until it too has hydrated).
                <ProjectsSkeleton className="mt-8" />
              ) : result.rows.length === 0 ? (
                // LST-53 when the outcome tab itself holds nothing; else the search
                // emptied it (LST-54); else the Showcase filter did.
                view.tab !== "all" && result.counts[view.tab] === 0 ? (
                  <EmptyTabState tab={view.tab} />
                ) : view.q.trim() ? (
                  // Each way out removes the button that was pressed, so focus
                  // goes to the search box rather than falling to the body.
                  <NoMatchState
                    query={view.q}
                    scopeLabel={view.showcase ? `${tabLabel} (Shared only)` : tabLabel}
                    onClearSearch={() => {
                      setText("");
                      write({ ...view, q: "", page: 1 });
                      searchRef.current?.focus();
                    }}
                    // The same words over every project: the tab and the Showcase
                    // filter both go, whichever of them narrowed the list.
                    onSearchAll={
                      view.tab !== "all" || view.showcase
                        ? () => {
                            changeView({ tab: "all", showcase: false });
                            searchRef.current?.focus();
                          }
                        : undefined
                    }
                  />
                ) : (
                  <NoShowcaseState tabLabel={result.showcased > 0 ? tabLabel : null} />
                )
              ) : (
                <>
                  <ul role="list" className={cn(CARD_GRID, "mt-8")}>
                    {result.rows.map((row) => (
                      <li key={row.project.id}>
                        <ProjectCard
                          summary={row.summary}
                          matchedProductName={row.via}
                          now={now}
                          onBeforeNavigate={() => selectProject(row.project.id)}
                        />
                      </li>
                    ))}
                  </ul>

                  {result.pageCount > 1 ? (
                    <Pagination page={result.page} pageCount={result.pageCount} onChange={changePage} />
                  ) : null}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Page>
  );
}

// ───────────────────────── header and loading ─────────────────────────

// The page's grid: as many columns as fit. The list is its own container
// too, so a card turns into a row below a 560 px list (project-card.tsx).
const CARD_GRID = cn(PAGE_GRID, "[container-type:inline-size]");

/** The page's header, shared with the route's loading fallback so the title
 *  is on the frame's edge before the list hydrates. */
export function ProjectsHeader() {
  return (
    <PageHeader
      title="My projects"
      description="Every project you've saved — from an AI build or started by hand. They're stored in this browser."
      descriptionClassName="max-w-[62ch] text-md text-text-secondary"
      actions={
        // Creation lives on Home (owner decision O11): a link, not a flow on this page.
        <Link
          href="/"
          className={cn(
            buttonVariants({ hierarchy: "secondary", size: "md" }),
            "shrink-0 [@container(max-width:559px)]:min-h-[44px]",
          )}
        >
          <span aria-hidden className="inline-flex size-[16px] shrink-0 items-center justify-center">
            <Icon icon={PlusSignIcon} size={16} />
          </span>
          New project
        </Link>
      }
    />
  );
}

/** LST-51: six skeleton cards on the grid's own edges. */
export function ProjectsSkeleton({ className }: { className?: string }) {
  return (
    <ul role="list" aria-hidden className={cn(CARD_GRID, className)}>
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i}>
          <ProjectCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

// ───────────────────────── tabs ─────────────────────────

// A real ARIA tablist (LST-8): one Tab stop, ← → Home End move and select,
// every tab names its count, and all of them control the one panel.
function ProjectTabs({
  tab,
  counts,
  onChange,
}: {
  tab: ListTab;
  counts: ListCounts | null;
  onChange: (tab: ListTab) => void;
}) {
  const refs = React.useRef(new Map<ListTab, HTMLButtonElement>());
  const ids = LIST_TABS.map((t) => t.id);

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, from: ListTab) => {
    const i = ids.indexOf(from);
    const to =
      e.key === "ArrowRight"
        ? ids[(i + 1) % ids.length]
        : e.key === "ArrowLeft"
          ? ids[(i - 1 + ids.length) % ids.length]
          : e.key === "Home"
            ? ids[0]
            : e.key === "End"
              ? ids[ids.length - 1]
              : null;
    if (!to) return;
    e.preventDefault();
    onChange(to);
    refs.current.get(to)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Projects by outcome"
      className="flex flex-wrap items-center gap-[8px] border-b border-solid border-border pb-[16px]"
    >
      {LIST_TABS.map((t) => {
        const active = t.id === tab;
        // "—" until the projects and every brief draft have been read (LST-7).
        const n = counts ? counts[t.id] : null;
        return (
          <button
            key={t.id}
            ref={(el) => {
              if (el) refs.current.set(t.id, el);
              else refs.current.delete(t.id);
            }}
            id={tabId(t.id)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={PANEL_ID}
            aria-label={`${t.label}, ${n === null ? "not counted yet" : tabCountLabel(n)}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, t.id)}
            className={cn(
              "inline-flex h-[36px] items-center gap-[8px] rounded-full border border-solid px-[14px] text-md font-semibold outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-page motion-reduce:transition-none [@container(max-width:559px)]:h-[44px]",
              active
                ? "border-transparent bg-bg-brand-subtle text-text-brand"
                : "border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
            )}
          >
            {t.label}
            <span
              aria-hidden
              className={cn(
                "inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-[6px] text-sm font-semibold tabular-nums",
                active ? "bg-bg-brand text-text-on-brand" : "bg-bg-subtle text-text-secondary",
              )}
            >
              {n ?? "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

