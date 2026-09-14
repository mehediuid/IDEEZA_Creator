"use client";

// MyProjects — /projects. The visual shell is the "My Projects" surface
// from User Panel V2 (Figma node 16838:392921): the tab row, the search
// toolbar, the card grid and the pagination. Every value in it comes
// from the real store — `useManualProjects()` for the projects and
// `useCreateHistory()` for the build a project was generated from — so a
// build saved with "Save Project" is on this page the moment the user
// lands on it.
//
// Tabs the model can answer: All · Draft · Completed. The Figma's
// Public / Contributed / Private tabs are gone — `ManualProject` carries
// no visibility or collaborator field, so membership would have to be
// invented. Utility NFT lists projects whose own Brief draft really has
// `mintedAt !== null` (read via `briefDraftKey`/`normalizeBrief`), and says
// plainly that nothing has been minted yet when that set is empty.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CpuIcon,
  Search01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  PencilEdit01Icon,
  File01Icon,
  Hexagon01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { useCreateHistory } from "@/lib/create/history";
import {
  FLOW_STEPS,
  STEP_LABELS,
  completedCount,
  firstIncompleteStep,
  productLabel,
  stepHref,
  useManualProjects,
  type ManualProject,
} from "@/lib/manual/projects";
import { briefDraftKey, normalizeBrief } from "@/lib/brief/types";
import { formatRelativeTime } from "@/lib/utils";

// ───────────────────────── tabs & sorts ─────────────────────────

type TabId = "all" | "draft" | "completed" | "nft";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "completed", label: "Completed" },
  { id: "nft", label: "Utility NFT" },
];

const SORTS = [
  { id: "recent", label: "Recently updated" },
  { id: "oldest", label: "Oldest first" },
  { id: "name", label: "Name A–Z" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

// Three across at the widest breakpoint — a full page is three rows.
const PAGE_SIZE = 9;

const TOTAL_STEPS = FLOW_STEPS.length;

// ───────────────────────── page ─────────────────────────

export function MyProjects() {
  const { hydrated, projects, selectProject } = useManualProjects();
  const { builds } = useCreateHistory();
  const router = useRouter();

  // "All" is the landing tab on purpose: a project saved from a finished
  // build is a draft, and the user must see it without hunting a tab.
  const [tab, setTab] = React.useState<TabId>("all");
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortId>("recent");
  const [page, setPage] = React.useState(1);

  // Concept image per build id — the card thumbnail for a project that
  // came from an AI build. A hand-made project has none, and gets the
  // placeholder rather than a borrowed picture.
  const conceptImage = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const b of builds) {
      if (b.conceptImageUrl) map.set(b.id, b.conceptImageUrl);
    }
    return map;
  }, [builds]);

  // Switching scope, searching or resorting all reset to the first page —
  // whatever changes what the grid shows must also stop pointing at a page
  // that may no longer exist.
  const changeTab = (id: TabId) => {
    setTab(id);
    setPage(1);
  };
  const changeQuery = (q: string) => {
    setQuery(q);
    setPage(1);
  };
  const changeSort = (id: SortId) => {
    setSort(id);
    setPage(1);
  };

  const counts = React.useMemo(
    () => ({
      all: projects.length,
      draft: projects.filter((p) => p.status === "draft").length,
      completed: projects.filter((p) => p.status === "completed").length,
    }),
    [projects],
  );

  // Utility NFT membership — read from each project's own Brief draft
  // (`briefDraftKey` + `normalizeBrief`, both exported for exactly this).
  // `null` means "not read yet"; read in an effect (not during render) so
  // the first frame stays server/client-consistent, then hydrates from
  // localStorage like everything else on this page.
  const [mintedIds, setMintedIds] = React.useState<Set<string> | null>(null);
  React.useEffect(() => {
    if (!hydrated) return;
    const minted = new Set<string>();
    for (const p of projects) {
      try {
        const raw = window.localStorage.getItem(briefDraftKey(p.id));
        if (raw) {
          const parsed = JSON.parse(raw) as { state?: unknown };
          if (normalizeBrief(parsed.state).mintedAt !== null) minted.add(p.id);
        }
      } catch {
        // Corrupt/missing draft reads as "not minted" — never fatal here.
      }
    }
    setMintedIds(minted);
  }, [hydrated, projects]);

  const filtered = React.useMemo(() => {
    if (tab === "nft") {
      if (!mintedIds) return [];
      return projects.filter((p) => mintedIds.has(p.id));
    }
    let list = projects.slice();
    if (tab === "draft") list = list.filter((p) => p.status === "draft");
    if (tab === "completed") list = list.filter((p) => p.status === "completed");
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        [p.name, p.productName, p.description]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q)),
      );
    }
    switch (sort) {
      case "oldest":
        list.sort((a, b) => a.updatedAt - b.updatedAt);
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        list.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return list;
  }, [projects, tab, query, sort, mintedIds]);

  // Whether the current view is narrower than "everything" — drives the
  // count line's wording below (item can't just compare list lengths: a
  // filter that happens to match every project must still read as filtered).
  const filterApplied = tab !== "all" || query.trim().length > 0;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shownPage = Math.min(page, pageCount);
  const start = (shownPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const open = (project: ManualProject) => {
    selectProject(project.id);
    router.push(stepHref(project, firstIncompleteStep(project)));
  };

  return (
    <div className="w-full px-[32px] py-[28px]">
      <header className="mb-[20px]">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">
          My projects
        </h1>
        <p className="mt-[4px] text-sm text-text-secondary">
          Everything you&apos;ve created — from an AI build you saved or a
          project you started by hand. Pick up any of them where you left off.
        </p>
      </header>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Filter projects by status"
        className="flex flex-wrap items-center gap-[8px] border-b border-border pb-[16px]"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          // Counts read straight from the store, so they must wait for it
          // like everything else on this page — "—" rather than a false
          // "0" while hydration is still in flight. Utility NFT additionally
          // waits on its own mint-status read (see mintedIds above).
          const count = !hydrated
            ? "—"
            : t.id === "nft"
              ? (mintedIds ? mintedIds.size : "—")
              : counts[t.id];
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => changeTab(t.id)}
              className={[
                "inline-flex h-[36px] items-center gap-[8px] rounded-full border px-[14px] text-sm font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                active
                  ? "border-transparent bg-bg-brand-subtle text-text-brand"
                  : "border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
              ].join(" ")}
            >
              {t.label}
              <span
                className={[
                  "inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-[6px] text-2xs font-bold tabular-nums",
                  active
                    ? "bg-violet-600 text-text-on-brand"
                    : "bg-bg-surface-raised text-text-tertiary",
                ].join(" ")}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar: search + sort */}
      <div className="mt-[16px] flex flex-col gap-[12px] min-[860px]:flex-row min-[860px]:items-center">
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="relative min-[860px]:max-w-[420px] min-[860px]:flex-1"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-text-tertiary"
          >
            <Icon icon={Search01Icon} size={18} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            placeholder="Search by project, product or description"
            aria-label="Search projects"
            disabled={tab === "nft"}
            className="h-[40px] w-full rounded-full border border-border bg-bg-surface pl-[42px] pr-[16px] text-sm text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus:border-border-focus disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-text-tertiary"
          />
        </form>

        <div className="flex items-center gap-[10px] min-[860px]:ml-auto">
          <Select
            label="Sort By"
            value={sort}
            onChange={(v) => changeSort(v as SortId)}
            options={SORTS}
            disabled={tab === "nft"}
          />
        </div>
      </div>

      {!hydrated || (tab === "nft" && !mintedIds) ? (
        <p className="mt-[24px] text-sm text-text-tertiary">Loading…</p>
      ) : projects.length === 0 ? (
        <NoProjectsState />
      ) : (
        <>
          <p className="mt-[16px] text-sm font-medium text-text-secondary">
            {!filterApplied
              ? `${projects.length} ${projects.length === 1 ? "project" : "projects"}`
              : `${filtered.length} of ${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
          </p>

          {filtered.length === 0 ? (
            tab === "nft" ? (
              <NftEmptyState />
            ) : (
              <NoMatchState
                onClear={() => {
                  changeQuery("");
                  changeTab("all");
                }}
              />
            )
          ) : (
            <>
              <ul
                role="list"
                className="mt-[16px] grid grid-cols-1 gap-[24px] min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3"
              >
                {pageItems.map((p) => (
                  <li key={p.id}>
                    <ProjectCard
                      project={p}
                      image={p.buildId ? conceptImage.get(p.buildId) : undefined}
                      onOpen={() => open(p)}
                    />
                  </li>
                ))}
              </ul>

              {pageCount > 1 && (
                <Pagination
                  page={shownPage}
                  pageCount={pageCount}
                  onChange={setPage}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ───────────────────────── project card ─────────────────────────

function ProjectCard({
  project,
  image,
  onOpen,
}: {
  project: ManualProject;
  image?: string;
  onOpen: () => void;
}) {
  const [imgOk, setImgOk] = React.useState(true);
  const done = completedCount(project);
  const next = firstIncompleteStep(project);
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

// ───────────────────────── shared bits ─────────────────────────

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ id: string; label: string }>;
  disabled?: boolean;
}) {
  const id = `sel-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-[40px] appearance-none rounded-full border border-border bg-bg-surface pl-[14px] pr-[38px] text-sm font-medium text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus:border-border-focus disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-text-tertiary"
      >
        <Icon icon={ArrowDown01Icon} size={16} />
      </span>
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
}) {
  const items = pageItemsFor(page, pageCount);

  const btn =
    "inline-flex h-[36px] min-w-[36px] items-center justify-center rounded-lg border px-[8px] text-sm font-medium outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus";

  return (
    <nav
      aria-label="Pagination"
      className="mt-[28px] flex items-center justify-end gap-[6px]"
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        className={`${btn} border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Icon icon={ArrowLeft01Icon} size={16} />
      </button>

      {items.map((it, i) =>
        it === "ellipsis" ? (
          <span
            key={`e-${i}`}
            aria-hidden
            className="inline-flex h-[36px] min-w-[24px] items-center justify-center text-sm text-text-tertiary"
          >
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            aria-label={`Page ${it}`}
            aria-current={page === it ? "page" : undefined}
            onClick={() => onChange(it)}
            className={[
              btn,
              page === it
                ? "border-border-strong bg-bg-surface text-text-primary"
                : "border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
            ].join(" ")}
          >
            {it}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onChange(Math.min(pageCount, page + 1))}
        className={`${btn} border-border bg-bg-surface text-text-secondary shadow-1 hover:border-border-strong hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Icon icon={ArrowRight01Icon} size={16} />
      </button>
    </nav>
  );
}

// 1 … n-1 n n+1 … last — every rendered number is a page that exists.
function pageItemsFor(
  page: number,
  pageCount: number,
): Array<number | "ellipsis"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const out: Array<number | "ellipsis"> = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pageCount - 1, page + 1);
  if (from > 2) out.push("ellipsis");
  for (let i = from; i <= to; i++) out.push(i);
  if (to < pageCount - 1) out.push("ellipsis");
  out.push(pageCount);
  return out;
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

function NftEmptyState() {
  return (
    <EmptyShell icon={Hexagon01Icon} title="No minted projects yet">
      <p className="max-w-[460px] text-sm text-text-secondary">
        A design becomes a Utility NFT in the{" "}
        <strong className="font-semibold text-text-primary">Add Brief</strong>{" "}
        step of the editor — idea, video, mint. Nothing has been minted from
        this browser, so there is nothing to list here.
      </p>
    </EmptyShell>
  );
}
