"use client";

// MyProjects — /projects, the only index of projects (spec §3.2, §5.2). The
// shell follows User Panel V2's "My project" section (Figma 16838:392921):
// header, tab row, toolbar, card grid, pagination. Every value comes from the
// real stores — the project records (`useManualProjects`), their builds
// (`useCreateHistory`), the preview clips (`useVideoJobs`) and one brief draft
// per project (`readBriefDraft`) — through one derivation, `projectSummary()`,
// which the details header shares (LST-32). One pure pass, `filterProjects()`,
// turns the summaries into the tab counts, the search, the Source facet, the
// order and the page.
//
// The tabs are the outcome — All · Draft · Private · Given · Listed — then
// Showcase, which is membership, not a state (owner decision O5, LST-4).
//
// The view lives in the URL (LST-28): tab, q, sort, source and page, written
// with replaceState and defaults left out. The scroller is the (create)
// layout's <main>, which Next's own restoration doesn't cover, so the list
// also puts its scroll offset back when Back returns to it.

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CpuIcon,
  Search01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkBadge01Icon,
  PencilEdit01Icon,
  File01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { ProjectNotice } from "@/components/projects/project-notice";
import { StorageErrorBanner } from "@/components/projects/storage-error-banner";
import { SearchInput, SelectMenu, buttonVariants } from "@/components/ideeza";
import { useMinuteClock } from "@/components/create/build-status";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useCreateHistory } from "@/lib/create/history";
import { readBriefDraft, showcaseBackfillOf } from "@/lib/brief/project-brief";
import { briefDraftKey } from "@/lib/brief/types";
import { projectSummary, type ListQuery } from "@/lib/manual/project-summary";
import {
  LIST_TABS,
  SORT_OPTIONS,
  SOURCE_OPTIONS,
  countLine,
  filterProjects,
  listQueryString,
  pageItemsFor,
  parseListQuery,
  searchInUrl,
  tabCountLabel,
  type ListCounts,
  type ListItem,
  type ListTab,
} from "@/lib/manual/project-list";
import { resumeStepOf } from "@/lib/manual/project-read";
import {
  FLOW_STEPS,
  STEP_LABELS,
  completedCount,
  productLabel,
  stepHref,
  useManualProjects,
  type ManualProject,
} from "@/lib/manual/projects";
import { cn, formatRelativeTime } from "@/lib/utils";

const TOTAL_STEPS = FLOW_STEPS.length;

const PANEL_ID = "projects-panel";
const SOURCE_ID = "projects-source";
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
  const storesReady = hydrated && buildsHydrated && jobsHydrated;
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
            }),
          }))
        : null,
    [drafts, projects, builds, jobs, now],
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
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current?.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  };

  const open = (project: ManualProject) => {
    selectProject(project.id);
    router.push(stepHref(project, resumeStepOf(project)));
  };

  const tabLabel = LIST_TABS.find((t) => t.id === view.tab)?.label ?? "All";
  const sourceLabel = SOURCE_OPTIONS.find((o) => o.value === view.source)?.label ?? "";
  const noProjects = result !== null && result.total === 0;

  return (
    // The content box is the container the toolbar, the chips and the
    // pagination ask about: layout switches read the page, never the window.
    <div
      onClickCapture={rememberScroll}
      className="mx-auto w-full max-w-[1280px] px-[16px] py-[28px] [container-type:inline-size] min-[640px]:px-[32px]"
    >
      <StorageErrorBanner className="mb-[16px]" />
      <ProjectNotice className="mb-[16px]" />
      <header className="mb-[20px] flex flex-col gap-[4px]">
        <div className="flex items-center justify-between gap-[12px]">
          <h1 className="text-xl font-bold tracking-tight text-text-primary">My projects</h1>
          {/* Creation lives on Home (owner decision O11): a link, not a flow on this page. */}
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
        </div>
        <p className="max-w-[62ch] text-md text-text-secondary">
          Every project you&apos;ve saved — from an AI build or started by hand. They&apos;re stored in this
          browser.
        </p>
      </header>

      {noProjects ? (
        <NoProjectsState />
      ) : (
        <>
          <ProjectTabs tab={view.tab} counts={result?.counts ?? null} onChange={(tab) => changeView({ tab })} />

          <div role="tabpanel" id={PANEL_ID} aria-labelledby={tabId(view.tab)}>
            {/* The results heading (LST-60): the focus target after a page turn. */}
            <h2 ref={headingRef} tabIndex={-1} className="sr-only">
              {tabLabel} projects
            </h2>

            {/* Toolbar: search, then Source and Sort. Below a 720 px content box
                search takes the row and the two menus share the next (LST-57). */}
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
              <SelectMenu
                id={SOURCE_ID}
                ariaLabel="Source"
                value={view.source}
                onChange={(source) => changeView({ source })}
                options={SOURCE_OPTIONS}
                placeholder="Any source"
                className="[&>button]:min-h-[44px] [@container(min-width:720px)]:ml-auto [@container(min-width:720px)]:w-[176px] [@container(min-width:720px)]:shrink-0"
              />
              <SelectMenu
                ariaLabel="Sort"
                value={view.sort}
                onChange={(sort) => changeView({ sort })}
                options={SORT_OPTIONS}
                placeholder="Recently updated"
                className="[&>button]:min-h-[44px] [@container(min-width:720px)]:w-[200px] [@container(min-width:720px)]:shrink-0"
              />
            </div>

            {/* The count line on the left, the active facet as a removable chip on the right (LST-18, LST-26). */}
            <div
              ref={resultsRef}
              className="mt-[16px] flex scroll-mt-[16px] flex-wrap items-center justify-between gap-x-[12px] gap-y-[8px]"
            >
              <p aria-live="polite" aria-atomic="true" className="text-md font-medium text-text-secondary">
                {result ? countLine(result) : "—"}
              </p>
              {view.source !== "any" ? (
                <button
                  type="button"
                  aria-label={`Remove the Source filter: ${sourceLabel}`}
                  onClick={() => {
                    changeView({ source: "any" });
                    document.getElementById(SOURCE_ID)?.focus();
                  }}
                  className="inline-flex h-[28px] items-center gap-[6px] rounded-full border border-solid border-border bg-bg-surface pl-[10px] pr-[8px] text-sm font-semibold text-text-primary outline-none transition-colors duration-normal ease-decelerate hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-page motion-reduce:transition-none [@container(max-width:559px)]:h-[44px]"
                >
                  Source: {sourceLabel}
                  <Icon icon={Cancel01Icon} size={14} />
                </button>
              ) : null}
            </div>

            {!result ? (
              <p className="mt-[24px] text-md text-text-tertiary">Loading…</p>
            ) : result.rows.length === 0 ? (
              <NoMatchState
                onClear={() => {
                  setText("");
                  write({ ...view, tab: "all", q: "", source: "any", page: 1 });
                }}
              />
            ) : (
              <>
                <ul
                  role="list"
                  className="mt-[16px] grid grid-cols-1 gap-[24px] min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3"
                >
                  {result.rows.map((row) => (
                    <li key={row.project.id}>
                      <ProjectCard
                        project={row.project}
                        image={row.summary.cover ?? undefined}
                        via={row.via}
                        onOpen={() => open(row.project)}
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
          <React.Fragment key={t.id}>
            {t.divider ? <span aria-hidden className="mx-[4px] h-[20px] w-px shrink-0 bg-border" /> : null}
            <button
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
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ───────────────────────── project card ─────────────────────────

function ProjectCard({
  project,
  image,
  via,
  onOpen,
}: {
  project: ManualProject;
  image?: string;
  /** The product the search matched when it isn't the first (LST-14). */
  via?: string;
  onOpen: () => void;
}) {
  const [imgOk, setImgOk] = React.useState(true);
  const done = completedCount(project);
  const next = resumeStepOf(project);
  const completed = project.status === "completed";

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[12px] border border-border bg-bg-surface">
      <div className="group/thumb relative aspect-[16/10] overflow-hidden bg-bg-surface-raised">
        {image && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={`Concept image for ${project.name}`}
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover/thumb:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center bg-bg-surface-raised text-text-tertiary"
          >
            <Icon icon={CpuIcon} size={28} strokeWidth={1.4} />
          </div>
        )}

        <span
          className={[
            "absolute left-[10px] top-[10px] inline-flex h-[24px] items-center gap-[6px] rounded-full px-[10px] text-2xs font-bold",
            completed
              ? "bg-bg-success-subtle text-text-success"
              : "bg-bg-brand-subtle text-text-brand",
          ].join(" ")}
        >
          <Icon
            icon={completed ? CheckmarkBadge01Icon : PencilEdit01Icon}
            size={12}
          />
          {completed ? "Completed" : "Draft"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-[10px] p-[14px]">
        <div className="flex items-start justify-between gap-[10px]">
          <div className="min-w-0">
            <p className="truncate text-md font-medium text-text-primary">
              {project.name}
            </p>
            <p className="mt-[2px] truncate text-sm text-text-tertiary">
              {productLabel(project)}
              {via ? ` · matches ${via}` : null}
            </p>
          </div>
          <Link
            href={`/projects/${project.id}`}
            className="inline-flex h-[28px] shrink-0 items-center rounded-full px-[10px] text-sm font-semibold text-text-brand outline-none transition-colors duration-fast hover:bg-bg-brand-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Details
          </Link>
        </div>

        {/* Progress across the editor's seven steps — the one number the
            model really carries about how far the project has got. */}
        <div
          role="progressbar"
          aria-label={`${project.name} progress`}
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={TOTAL_STEPS}
          className="h-[4px] w-full overflow-hidden rounded-full bg-bg-surface-raised"
        >
          <div
            className="h-full rounded-full bg-violet-500 transition-[width] duration-normal ease-decelerate"
            style={{ width: `${(done / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[4px] text-2xs font-medium text-text-tertiary">
          <span className="inline-flex items-center gap-[5px] tabular-nums">
            <Icon icon={File01Icon} size={13} strokeWidth={1.6} />
            {done}/{TOTAL_STEPS} steps
          </span>
          {!completed && (
            <span className="truncate">Next: {STEP_LABELS[next]}</span>
          )}
          <span className="ml-auto shrink-0">
            Updated {formatRelativeTime(project.updatedAt)}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="mt-auto inline-flex h-[36px] w-full items-center justify-center rounded-lg border border-border bg-bg-surface text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:border-border-strong hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          {completed ? "Open in editor" : `Resume — ${STEP_LABELS[next]}`}
        </button>
      </div>
    </article>
  );
}

// ───────────────────────── pagination ─────────────────────────

// LST-27: ‹ 1 … n-1 n n+1 … last ›, the current page marked. Below a 480 px
// content box the numbers give way to "Page 2 of 4". Hidden on a single page
// (the caller doesn't render it).
function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
}) {
  const btn =
    "inline-flex h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-solid px-[8px] text-md font-medium outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-page motion-reduce:transition-none [@container(max-width:559px)]:h-[44px] [@container(max-width:559px)]:min-w-[44px]";
  const idle =
    "border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary";
  const numbersOnly = "[@container(max-width:479px)]:hidden";

  return (
    <nav aria-label="Pagination" className="mt-[28px] flex items-center justify-end gap-[6px]">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={cn(btn, idle, "disabled:cursor-not-allowed disabled:opacity-40")}
      >
        <Icon icon={ArrowLeft01Icon} size={16} />
      </button>

      <p className="px-[8px] text-md font-medium text-text-secondary [@container(min-width:480px)]:hidden">
        Page {page} of {pageCount}
      </p>

      {pageItemsFor(page, pageCount).map((it, i) =>
        it === "ellipsis" ? (
          <span
            key={`e-${i}`}
            aria-hidden
            className={cn(
              "inline-flex h-[36px] min-w-[24px] items-center justify-center text-md text-text-tertiary",
              numbersOnly,
            )}
          >
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            aria-label={`Page ${it}`}
            aria-current={it === page ? "page" : undefined}
            onClick={() => onChange(it)}
            className={cn(
              btn,
              numbersOnly,
              it === page ? "border-transparent bg-bg-brand-subtle font-semibold text-text-brand" : idle,
            )}
          >
            {it}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className={cn(btn, idle, "disabled:cursor-not-allowed disabled:opacity-40")}
      >
        <Icon icon={ArrowRight01Icon} size={16} />
      </button>
    </nav>
  );
}

// ───────────────────────── empty states ─────────────────────────

function EmptyShell({
  icon,
  title,
  children,
}: {
  icon: IconValue;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-[24px] flex flex-col items-center gap-[10px] rounded-[12px] border border-border bg-bg-surface px-[24px] py-[48px] text-center">
      <span
        aria-hidden
        className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-full bg-bg-brand-subtle text-text-brand"
      >
        <Icon icon={icon} size={20} />
      </span>
      <p className="text-md font-semibold text-text-primary">{title}</p>
      {children}
    </div>
  );
}

function NoProjectsState() {
  return (
    <EmptyShell icon={File01Icon} title="No projects yet">
      <p className="max-w-[460px] text-sm text-text-secondary">
        A project starts on Home. Describe an idea and{" "}
        <strong className="font-semibold text-text-primary">
          Generate with AI
        </strong>
        , then press <strong className="font-semibold text-text-primary">Save
        Project</strong> on the finished build — or pick{" "}
        <strong className="font-semibold text-text-primary">
          Build manually
        </strong>{" "}
        to start from an empty board. Either way it lands here.
      </p>
      <Link
        href="/"
        className="mt-[8px] inline-flex h-[36px] items-center rounded-lg bg-violet-600 px-[16px] text-sm font-bold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        Go to Home
      </Link>
    </EmptyShell>
  );
}

function NoMatchState({ onClear }: { onClear: () => void }) {
  return (
    <EmptyShell icon={Search01Icon} title="Nothing in this view">
      <p className="max-w-[420px] text-sm text-text-secondary">
        No project matches this tab and search.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-[8px] inline-flex h-[36px] items-center rounded-lg border border-border bg-bg-surface px-[16px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        Show all projects
      </button>
    </EmptyShell>
  );
}
