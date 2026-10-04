### Task B2: The My projects card and the list's states

Scope note: this covers §5.2's card (spec §3.2 "The card, top to bottom") and
the list's four render states — loading, no projects at all, an empty tab, no
search match. The tab bar, search/sort toolbar polish, source facet,
pagination chrome, URL persistence and ARIA-tablist details (LST-1, 2, 3, 6,
7, 8, 15, 17, 18, 23, 27, 28, 56, 59, 60) are a sibling task's job; this task
only introduces the minimum working tab/search plumbing needed to make the
four states real and demonstrable, reusing today's toolbar markup wherever
it still fits.

Split in two because the card alone plus the wiring is well past one 30–90
minute unit — **B2a** is the new presentational module, **B2b** rewires
`my-projects.tsx` to it.

**Interfaces this task assumes from A3** (`src/lib/manual/project-summary.ts`,
spec §5.1.3, amended by the harness notes in `spec-delta.md`: A3 owns the
shared text helpers — `formatDate`, `formatDateTime`, `formatShortDate`,
`countLabel`, `IconName`, `cardText()` and `headerText()` — so this card and
the details header can't drift on wording, and this task reuses them rather
than formatting dates/counts itself. Exact names, not yet in this worktree,
reconstructed from the spec text plus the harness notes):

```ts
export type ProjectStatus = "draft" | "private" | "given" | "listed" | "minted";
export type IconName = "circle" | "lock" | "hand-heart" | "tag" | "hexagon" | "eye";
export const STATUS_WORD: Record<ProjectStatus, string>;
export const STATUS_ICON: Record<ProjectStatus, IconName>;
export const LISTED_SUBLINE: string;
export const SHOWCASE_BADGE: { word: string; icon: IconName };
export type ProjectSource = { kind: "build"; builds: number } | { kind: "build-gone" } | { kind: "hand" };
export type NextAction = { kind: string; label: string; href: string };
export type ActionPair = { first: NextAction; second: NextAction | null; violet: boolean };
export type ProjectSummary = {
  id: string; name: string; status: ProjectStatus; statusLine: string;
  showcase: { at: number } | null;
  products: { id: string; name: string; description: string }[];
  productCount: number; source: ProjectSource; next: ActionPair;
  when: { label: "Saved" | "Created"; at: number };
  version: { kind: "single"; v: number } | { kind: "builds"; k: number } | null;
  pendingVersion: { buildId: string; n: number; status: unknown } | null;
  cover: string | null; mintedAt: number | null; sortKey: number;
};
export function projectSummary(p: ManualProject, ctx: {
  builds: BuildJob[]; brief: StoredDraft | null; videoJobs: VideoJob[]; now: number;
}): ProjectSummary;

// Shared formatting (harness notes) — every string on the card comes from
// these, never a hand-rolled date/count join:
export function formatDate(at: number, now?: number): string;   // LST-41: today's time / "Mon D" / "Mon D, YYYY"
export function formatDateTime(at: number): string;              // full date + time, for a tooltip
export function formatShortDate(at: number): string;             // "Mon D, YYYY", unconditionally
export function countLabel(n: number, singular: string, plural?: string): string;
export type CardText = {
  productLine: string;    // LST-37, countLabel-based, "not named yet" fallback included
  source: string;         // LST-38: "AI build" | "By hand" | "AI build · not in this browser"
  sourceTooltip?: string;
  when: string;           // LST-41: "Saved 4:12 PM" | "Created Sep 22, 2026" (formatDate() inside)
  version: string | null; // LST-42: "Version 2" | "3 builds" | null
};
export function cardText(summary: ProjectSummary): CardText;
export function headerText(summary: ProjectSummary): unknown; // the details header's own strings — not consumed here
```

**Interfaces this task assumes from B1**, added to that *same* file per the
harness notes (My projects' tab/search/sort/pagination task, not yet in this
worktree):

```ts
export function matchProject(s: ProjectSummary, description: string, q: string): { hit: boolean; via?: string };
export type ListQuery = {
  tab: "all" | "draft" | "private" | "given" | "listed" | "showcase";
  q: string; sort: "updated" | "newest" | "oldest" | "name"; source: "any" | "build" | "hand"; page: number;
};
export const PAGE_SIZE = 12;
```

Also consumed (§5.1.4, shipped earlier in the Build order, same as A3):
`readBriefDraft(projectId: string): StoredDraft | null` and `type StoredDraft`
from `src/lib/brief/project-brief.ts`. And the already-shipped
`useVideoJobs(): { jobs: VideoJob[] }` from
`src/components/video-jobs/video-jobs-provider.tsx`.

**Cross-task contract from A4** (the controller's relay — the list half of
COR-105's once-only Showcase backfill for a project minted, with Share to
Innovations ticked, before `showcasedAt` existed): the same
`src/lib/brief/project-brief.ts` also exports

```ts
/** Null unless p.showcasedAt is absent AND the draft is minted with
 *  shareToNewsfeed ticked — then the time to backfill it to (mintedAt). */
export function showcaseBackfillOf(p: ManualProject, draft: StoredDraft | null): number | null;
```

and `useManualProjects()`'s Ctx carries a matching writer,
`backfillShowcase(id: string, at: number): void` (sets `showcasedAt = at`
without touching `updatedAt` — a backfill isn't a maker edit). B2b's brief-draft
read effect calls `showcaseBackfillOf` for every project it reads and, where
it returns a number, calls `backfillShowcase` once — see that effect below.

If A3 or B1 land any of these under different names, fix the affected import
lines in B2a/B2b — nothing else in this task depends on their internals.
Neither sub-task here adds a `tests/projects/*.test.mjs` file: both files are
either pure presentation (B2a) or page wiring with no logic A3/B1 don't
already own (B2b), so their check is the Step 5 browser check, not
`node --test "tests/projects/*.test.mjs"` (harness notes — quoted glob, never
the bare directory).

---

## Task B2a: `project-card.tsx` — the card, the skeleton, the three empty bodies

**Requirements:** LST-32 (consumes), LST-33, LST-35, LST-36, LST-37, LST-38,
LST-39, LST-40, LST-41, LST-42, LST-49, LST-51, LST-52, LST-53, LST-54,
LST-57, LST-65, LST-58 (Button/StateCard/Badge atoms), LST-14 (hook only —
`matchedProductName` prop, wired by whichever task builds real search
highlighting).

**Files:** Create `src/components/projects/project-card.tsx`.

**Interfaces:** Consumes: A3's `ProjectSummary`/`STATUS_WORD`/`STATUS_ICON`/
`SHOWCASE_BADGE`/`IconName`/`cardText`/`formatShortDate` (above) — every
display string on the card comes from `cardText()` or these tables, never a
locally-formatted date/count. Produces:

```ts
export function ProjectCard(props: {
  summary: ProjectSummary;
  matchedProductName?: string;
  onBeforeNavigate?: () => void;
}): JSX.Element;
export function ProjectCardSkeleton(): JSX.Element;
export function NoProjectsState(props: { onGoHome: () => void }): JSX.Element;
export function NoMatchState(props: {
  query: string; tabLabel: string; onClearSearch: () => void; onSearchAll?: () => void;
}): JSX.Element;
export function EmptyTabState(props: { tab: Exclude<ListQuery["tab"], "all"> }): JSX.Element;
```

- [ ] **Step 1–2: No pure logic to unit-test with `node:test`.** Every
  string this card shows — the product line, the source tag, the date, the
  version fact — comes from A3's `cardText()`/`formatShortDate`/`STATUS_WORD`
  (harness notes); this file itself is 100% JSX plus thin glue (which icon a
  name maps to, which of two DOM positions is visible at which container
  width). Per the plan's testing approach, "pure `src/lib/**` modules are
  tested with `node:test`" and "UI tasks end with a browser check" — this
  file lives under `src/components/`, so its check is Step 5 below (run
  together with B2b's, since this module renders nothing on its own until
  B2b imports it). A3's own task is where `cardText()` gets its `node:test`
  coverage.

- [ ] **Step 3: Implement.**

  ```tsx
  "use client";

  // The My projects card (spec §3.2, §5.2 LST-32…65) and the list's four
  // render states: the loading skeleton (LST-51) and the three empty bodies —
  // no projects at all (LST-52), an empty tab (LST-53), no search match
  // (LST-54). One ProjectSummary (src/lib/manual/project-summary.ts) feeds
  // this card and the details header alike (LST-32), so the two can't drift.
  //
  // No ⋮ menu, no step bar and no carousel dots (LST-49): every other action
  // the old card carried in a kebab now lives on the project page instead.
  //
  // Grid vs. row (LST-56, LST-57) is one DOM tree that repaints itself via a
  // container query on the list's own content box ([container-type:inline-size],
  // set by my-projects.tsx on the <ul>) — never the window, because the
  // sidebar changes the available width independently of the viewport.
  // Below a 560px content box the chip and Showcase badge can't float over a
  // 96×60 thumbnail the way they do over a 16:10 cover, so they're rendered
  // twice — once inline beside the title, once absolute over the cover — and
  // whichever the container query doesn't match is `hidden`. Same content,
  // two positions; nothing here can disagree with itself because both come
  // from the same `summary`.

  import * as React from "react";
  import Link from "next/link";
  import { useRouter } from "next/navigation";
  import {
    CircleIcon,
    LockIcon,
    HandHeartIcon,
    Tag01Icon,
    Hexagon01Icon,
    EyeIcon,
    CpuIcon,
    ImageNotFound01Icon,
    File01Icon,
    Search01Icon,
  } from "@hugeicons/core-free-icons";
  import { Icon, type IconValue } from "@/components/dashboard/icon";
  import { Badge, Button, StateCard } from "@/components/ideeza";
  import {
    STATUS_WORD,
    STATUS_ICON,
    SHOWCASE_BADGE,
    cardText,
    formatShortDate,
    type ProjectSummary,
    type CardText,
    type ListQuery,
    type IconName,
  } from "@/lib/manual/project-summary";

  // A3 names each chip/badge icon by a short string (STATUS_ICON,
  // SHOWCASE_BADGE.icon) rather than a Hugeicons value, so project-summary.ts
  // stays UI-free. This is the one place that turns those names into real
  // icons — §4's table: Draft ○ circle · Private lock · Given hand-heart ·
  // Listed tag · Minted hexagon · Showcase eye.
  const ICONS: Record<IconName, IconValue> = {
    circle: CircleIcon,
    lock: LockIcon,
    "hand-heart": HandHeartIcon,
    tag: Tag01Icon,
    hexagon: Hexagon01Icon,
    eye: EyeIcon,
  };

  // ───────────────────────── chip & badge ─────────────────────────

  /** LST-35: word + icon, sentence case; Draft neutral, every minted word
   *  success tone; the same word as the details chip — both read it from
   *  the same `STATUS_WORD` table (harness notes), so they can't drift.
   *  Never violet. */
  function StatusChip({ summary }: { summary: ProjectSummary }) {
    const neutral = summary.status === "draft";
    return (
      <span
        className={[
          "inline-flex h-[22px] items-center gap-[4px] whitespace-nowrap rounded-full px-[8px] text-2xs font-semibold",
          neutral ? "bg-bg-subtle text-text-secondary" : "bg-bg-success-subtle text-text-success",
        ].join(" ")}
      >
        <Icon icon={ICONS[STATUS_ICON[summary.status]]} size={12} />
        {STATUS_WORD[summary.status]}
      </span>
    );
  }

  /** LST-65: eye icon + "Showcase", info tone, never violet, not a control;
   *  its accessible name is "Showcased". Reuses the Badge atom's existing
   *  "blue" (info) tone rather than adding a new one to that shared file. */
  function ShowcaseBadge() {
    return (
      <span role="img" aria-label="Showcased" className="inline-flex">
        <Badge tone="blue" icon={<Icon icon={ICONS[SHOWCASE_BADGE.icon]} size={12} />}>
          {SHOWCASE_BADGE.word}
        </Badge>
      </span>
    );
  }

  // ───────────────────────── meta row ─────────────────────────

  /** LST-38 · LST-41 · LST-42 — "AI build · Saved 4:12 PM · Version 2".
   *  `text.source`/`text.when`/`text.version` are already the exact display
   *  strings (harness notes: every string on the card comes from
   *  `cardText()`, computed once by the caller); `formatShortDate` fills the
   *  `<time title>` tooltip with the unconditional full date, since
   *  `text.when` itself can be a bare time ("Saved 4:12 PM") that alone
   *  wouldn't tell a reader which day. */
  function MetaRow({ summary, text }: { summary: ProjectSummary; text: CardText }) {
    return (
      <>
        <span title={text.sourceTooltip}>{text.source}</span>
        <span aria-hidden>·</span>
        <time dateTime={new Date(summary.when.at).toISOString()} title={formatShortDate(summary.when.at)}>
          {text.when}
        </time>
        {text.version && (
          <>
            <span aria-hidden>·</span>
            <span>{text.version}</span>
          </>
        )}
      </>
    );
  }

  // ───────────────────────── next-action button ─────────────────────────

  /** LST-40: shows `next.first`, "Opening…" while it navigates, a second
   *  press blocked — the same press-state every LeaveButton on the details
   *  page uses, kept local here so this file has no dependency on that
   *  page's module. */
  function NextActionButton({ summary, onBeforeNavigate }: { summary: ProjectSummary; onBeforeNavigate?: () => void }) {
    const router = useRouter();
    const [busy, setBusy] = React.useState(false);
    const { first } = summary.next;
    return (
      <Button
        type="button"
        hierarchy="secondary"
        size="md"
        className="w-full"
        disabled={busy}
        aria-label={`${first.label} for ${summary.name}`}
        onClick={() => {
          if (busy) return;
          setBusy(true);
          onBeforeNavigate?.();
          router.push(first.href);
        }}
      >
        {busy ? "Opening…" : first.label}
      </Button>
    );
  }

  // ───────────────────────── the card ─────────────────────────

  export function ProjectCard({
    summary,
    matchedProductName,
    onBeforeNavigate,
  }: {
    summary: ProjectSummary;
    matchedProductName?: string;
    onBeforeNavigate?: () => void;
  }) {
    const [imgOk, setImgOk] = React.useState(true);
    const hasCover = Boolean(summary.cover);
    const text = cardText(summary);

    return (
      <article className="flex h-full flex-col gap-[10px] overflow-hidden rounded-[12px] border border-border bg-bg-surface p-[10px] [@container(min-width:560px)]:gap-0 [@container(min-width:560px)]:p-0">
        <div className="relative flex gap-[12px] [@container(min-width:560px)]:block">
          <div className="relative h-[60px] w-[96px] shrink-0 overflow-hidden rounded-[8px] bg-bg-surface-raised [@container(min-width:560px)]:aspect-[16/10] [@container(min-width:560px)]:h-auto [@container(min-width:560px)]:w-full [@container(min-width:560px)]:rounded-none">
            {hasCover && imgOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={summary.cover!}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => setImgOk(false)}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-[4px] text-text-tertiary">
                <Icon icon={hasCover ? ImageNotFound01Icon : CpuIcon} size={18} strokeWidth={1.4} />
                {hasCover && <span className="px-[6px] text-center text-[10px] leading-tight">Image didn&apos;t load</span>}
              </div>
            )}

            {/* Grid mode only: chip + badge float over the cover (LST-35, LST-65). */}
            {summary.showcase && (
              <span className="pointer-events-none absolute left-[10px] top-[10px] hidden [@container(min-width:560px)]:inline-flex">
                <ShowcaseBadge />
              </span>
            )}
            <span className="pointer-events-none absolute right-[10px] top-[10px] hidden [@container(min-width:560px)]:inline-flex">
              <StatusChip summary={summary} />
            </span>
          </div>

          <div className="min-w-0 flex-1 [@container(min-width:560px)]:px-[14px] [@container(min-width:560px)]:pt-[12px]">
            <div className="flex flex-wrap items-start justify-between gap-[6px]">
              <h3 className="line-clamp-2 min-w-0 text-md font-medium text-text-primary">
                <Link
                  href={`/projects/${summary.id}`}
                  title={summary.name}
                  className="outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
                >
                  {summary.name}
                </Link>
              </h3>
              {/* Row mode only: chip + badge sit beside the title (LST-57). */}
              <span className="flex shrink-0 items-center gap-[6px] [@container(min-width:560px)]:hidden">
                {summary.showcase && <ShowcaseBadge />}
                <StatusChip summary={summary} />
              </span>
            </div>

            <p className="mt-[4px] truncate text-sm text-text-tertiary">
              {text.productLine}
              {matchedProductName && <span> · matches {matchedProductName}</span>}
            </p>
            <p className="mt-[2px] line-clamp-2 text-sm text-text-secondary">{summary.statusLine}</p>
            <p className="mt-[4px] flex flex-wrap items-center gap-x-[6px] text-2xs font-medium text-text-tertiary">
              <MetaRow summary={summary} text={text} />
            </p>
          </div>
        </div>

        <div className="[@container(min-width:560px)]:mx-[14px] [@container(min-width:560px)]:mb-[14px]">
          <NextActionButton summary={summary} onBeforeNavigate={onBeforeNavigate} />
        </div>
      </article>
    );
  }

  // ───────────────────────── loading (LST-51) ─────────────────────────

  /** One of six, in the grid shape: cover block, two bars, a status-line bar,
   *  a button block. `motion-safe:animate-pulse` is Tailwind's own
   *  reduced-motion gate — under `prefers-reduced-motion` these stay static
   *  muted blocks instead of shimmering. */
  export function ProjectCardSkeleton() {
    return (
      <div
        aria-hidden
        className="flex flex-col gap-[10px] overflow-hidden rounded-[12px] border border-border bg-bg-surface p-[14px]"
      >
        <div className="aspect-[16/10] rounded-[8px] bg-bg-surface-raised motion-safe:animate-pulse" />
        <div className="h-[16px] w-3/4 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
        <div className="h-[13px] w-1/2 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
        <div className="h-[13px] w-2/3 rounded bg-bg-surface-raised motion-safe:animate-pulse" />
        <div className="h-[36px] w-full rounded-lg bg-bg-surface-raised motion-safe:animate-pulse" />
      </div>
    );
  }

  // ───────────────────────── empty states ─────────────────────────

  /** LST-52: no projects anywhere. The caller hides the tabs and toolbar. */
  export function NoProjectsState({ onGoHome }: { onGoHome: () => void }) {
    return (
      <StateCard
        tone="empty"
        icon={<Icon icon={File01Icon} size={32} />}
        title="No projects yet"
        body="A project starts on Home. Describe an idea and Generate with AI, then press Save Project on the finished build — or pick Build manually to start from an empty board. Either way it lands here."
        action={
          <Button hierarchy="primary" size="md" onClick={onGoHome}>
            Go to Home
          </Button>
        }
        className="mx-auto mt-[24px]"
      />
    );
  }

  /** LST-54: a search (on any tab or facet) came back empty. */
  export function NoMatchState({
    query,
    tabLabel,
    onClearSearch,
    onSearchAll,
  }: {
    query: string;
    tabLabel: string;
    onClearSearch: () => void;
    onSearchAll?: () => void;
  }) {
    return (
      <StateCard
        tone="empty"
        icon={<Icon icon={Search01Icon} size={32} />}
        title={`No matches for "${query}"`}
        body={`Nothing in ${tabLabel} has that in a project or product name or description.`}
        action={
          <div className="flex flex-wrap items-center justify-center gap-[10px]">
            <Button hierarchy="secondary" size="md" onClick={onClearSearch}>
              Clear search
            </Button>
            {onSearchAll && (
              <Button hierarchy="ghost" size="md" onClick={onSearchAll}>
                Search all projects
              </Button>
            )}
          </div>
        }
        className="mx-auto mt-[24px]"
      />
    );
  }

  /** LST-53: teaching copy, no button, one entry per real tab. */
  const EMPTY_TAB_COPY: Record<Exclude<ListQuery["tab"], "all">, { title: string; body: string; icon: IconName }> = {
    draft: {
      title: "No drafts",
      body: "Every project here has been minted. A build you save starts as a draft.",
      icon: "circle",
    },
    private: {
      title: "Nothing saved as private yet",
      body: "In a project's brief, choose Save as Private and mint. Only you can see it.",
      icon: "lock",
    },
    given: {
      title: "Nothing given to the community yet",
      body: "In a project's brief, choose Give to Community and mint.",
      icon: "hand-heart",
    },
    listed: {
      title: "Nothing listed yet",
      body: "In a project's brief, choose Sell Your Idea and mint. It goes on sale when the marketplace opens.",
      icon: "tag",
    },
    showcase: {
      title: "Nothing showcased yet",
      body: "Showcase a minted project from its page, or when its brief finishes. Nothing is posted until Innovations opens.",
      icon: "eye",
    },
  };

  export function EmptyTabState({ tab }: { tab: Exclude<ListQuery["tab"], "all"> }) {
    const copy = EMPTY_TAB_COPY[tab];
    return (
      <StateCard
        tone="empty"
        icon={<Icon icon={ICONS[copy.icon]} size={32} />}
        title={copy.title}
        body={copy.body}
        className="mx-auto mt-[24px]"
      />
    );
  }
  ```

- [ ] **Step 4:** `npx tsc --noEmit` clean against this file (real once A3 has
  landed — this task assumes it has, per the Build order).

- [ ] **Step 5 (browser check):** done jointly with B2b's, below — this file
  renders nothing until my-projects.tsx imports it.

- [ ] **Step 6:**
  ```
  npx tsc --noEmit
  npx eslint src/components/projects/project-card.tsx
  git add src/components/projects/project-card.tsx
  git commit -m "feat(projects): add the My projects card, skeleton and empty states

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

## Task B2b: `my-projects.tsx` — wire the card and the four list states

**Requirements:** LST-4 (the outcome tab set only — counts, membership;
ARIA-tablist polish and URL sync are out of scope here), LST-5 (consumes),
LST-9, LST-10, LST-13 (via `matchProject`), LST-26, LST-32 (wiring),
LST-51/52/53/54 (wiring the states from B2a), LST-61, COM-1 (consumes
`readBriefDraft`), COR-105 (the list half of the once-only Showcase
backfill, per A4's cross-task contract above).

**Files:** Modify `src/components/projects/my-projects.tsx` — replace lines
1–447 (everything from the top of the file through the end of the old local
`ProjectCard`) with the block below; delete lines 582–661 (the old
`EmptyShell`/`NoProjectsState`/`NoMatchState`/`NftEmptyState`) entirely.
Lines 449–580 (`Select`, `Pagination`, `pageItemsFor`) are **unchanged** —
they're pure layout helpers that don't reference status at all.

**Interfaces:** Consumes: A3's `projectSummary`/`ProjectSummary` (above); B1's
`matchProject`/`PAGE_SIZE`/`ListQuery` (added to the same
`project-summary.ts`, above); `readBriefDraft`/`StoredDraft` and A4's
`showcaseBackfillOf` from `src/lib/brief/project-brief.ts` (§5.1.4); the
shipped `useVideoJobs()` and `useManualProjects()`'s (also A4's)
`backfillShowcase`; B2a's `ProjectCard`, `ProjectCardSkeleton`,
`NoProjectsState`, `NoMatchState`, `EmptyTabState`. Produces: `MyProjects()`
(signature unchanged — it's the page's default export's source, no new
consumers depend on its internals).

- [ ] **Step 1–2:** No pure logic to unit-test here either — this component's
  only non-JSX branch (`filtered`, `counts`) is exercised by the browser
  check in Step 5, the same way the rest of the page always has been (there
  is no React test renderer in this repo).

- [ ] **Step 3: Implement.** First, confirm the current file still matches
  what this task was written against:

  ```
  sed -n '1,10p;445,450p;580,585p;660,661p' src/components/projects/my-projects.tsx
  ```

  If line numbers drifted (a sibling task landed first), re-anchor by
  content, not number — `"use client";` opens the replaced block and
  `function Select({` opens the kept block. Replace lines 1–447 with:

  ```tsx
  "use client";

  // MyProjects — /projects (spec §5.2). The tab/search/sort/pagination shell
  // below is intentionally minimal: LST-1/2/3/6/7/8/15/17/18/23/27/28/56/59/60
  // (header copy, "New project", the source facet, ARIA-tablist details, URL
  // persistence, the responsive grid-column count) are a sibling task's full
  // pass. This file's job is the outcome tab set the model actually derives
  // (Draft · Private · Given · Listed · Showcase — LST-4) and the card and
  // list states from ./project-card (LST-32…65).

  import * as React from "react";
  import { useRouter } from "next/navigation";
  import { ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon, Search01Icon } from "@hugeicons/core-free-icons";
  import { Icon } from "@/components/dashboard/icon";
  import { useCreateHistory } from "@/lib/create/history";
  import { useManualProjects } from "@/lib/manual/projects";
  import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
  import { readBriefDraft, showcaseBackfillOf, type StoredDraft } from "@/lib/brief/project-brief";
  import {
    projectSummary,
    matchProject,
    PAGE_SIZE,
    type ProjectSummary,
    type ListQuery,
  } from "@/lib/manual/project-summary";
  import { ProjectCard, ProjectCardSkeleton, NoProjectsState, NoMatchState, EmptyTabState } from "./project-card";

  // ───────────────────────── tabs & sorts ─────────────────────────

  type TabId = ListQuery["tab"];

  const OUTCOME_TABS: Array<{ id: Exclude<TabId, "all" | "showcase">; label: string }> = [
    { id: "draft", label: "Draft" },
    { id: "private", label: "Private" },
    { id: "given", label: "Given" },
    { id: "listed", label: "Listed" },
  ];

  const TAB_LABEL: Record<TabId, string> = {
    all: "All",
    draft: "Draft",
    private: "Private",
    given: "Given",
    listed: "Listed",
    showcase: "Showcase",
  };

  const SORTS = [
    { id: "recent", label: "Recently updated" },
    { id: "oldest", label: "Oldest first" },
    { id: "name", label: "Name A–Z" },
  ] as const;
  type SortId = (typeof SORTS)[number]["id"];

  // ───────────────────────── page ─────────────────────────

  export function MyProjects() {
    const { hydrated, projects, selectProject, backfillShowcase } = useManualProjects();
    const { builds } = useCreateHistory();
    const { jobs: videoJobs } = useVideoJobs();
    const router = useRouter();

    const [tab, setTab] = React.useState<TabId>("all");
    const [query, setQuery] = React.useState("");
    const [sort, setSort] = React.useState<SortId>("recent");
    const [page, setPage] = React.useState(1);

    // One brief draft per project (COM-1) — read after hydration, and again
    // on window focus and storage events, so a mint made in another tab
    // moves the card here too (LST-61). Corrupt/missing reads as null.
    //
    // The same pass does the list's half of COR-105's once-only Showcase
    // backfill (A4's cross-task contract): a project minted with Share to
    // Innovations ticked before `showcasedAt` existed has no way to pick that
    // up except being read here, so every draft read is followed by
    // `showcaseBackfillOf` and, where it names a time, one `backfillShowcase`
    // write. `showcaseBackfillOf` itself guards on `p.showcasedAt` already
    // being absent, so a maker who since stopped showcasing (`showcasedAt:
    // null`) is never overwritten, and a repeat read of an already-backfilled
    // project is a no-op.
    const [drafts, setDrafts] = React.useState<Map<string, StoredDraft | null> | null>(null);
    React.useEffect(() => {
      if (!hydrated) return;
      const read = () => {
        const next = new Map<string, StoredDraft | null>();
        for (const p of projects) {
          const draft = readBriefDraft(p.id);
          next.set(p.id, draft);
          const backfillAt = showcaseBackfillOf(p, draft);
          if (backfillAt != null) backfillShowcase(p.id, backfillAt);
        }
        setDrafts(next);
      };
      read();
      window.addEventListener("focus", read);
      window.addEventListener("storage", read);
      return () => {
        window.removeEventListener("focus", read);
        window.removeEventListener("storage", read);
      };
    }, [hydrated, projects, backfillShowcase]);

    // One derivation feeds every card (LST-32): the same object the details
    // header renders from, so the two can never disagree.
    const summaries = React.useMemo(() => {
      if (!drafts) return null;
      const now = Date.now();
      const map = new Map<string, ProjectSummary>();
      for (const p of projects) {
        map.set(p.id, projectSummary(p, { builds, brief: drafts.get(p.id) ?? null, videoJobs, now }));
      }
      return map;
    }, [projects, drafts, builds, videoJobs]);

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

    // Every project sits in exactly one outcome tab; Showcase is membership,
    // counted outside that sum (LST-4, LST-10). A minted-but-unreadable
    // project (LST-9) counts under All only, never under a guessed tab.
    const counts = React.useMemo(() => {
      if (!summaries) return null;
      let draft = 0,
        priv = 0,
        given = 0,
        listed = 0,
        showcase = 0;
      for (const s of summaries.values()) {
        if (s.status === "draft") draft++;
        else if (s.status === "private") priv++;
        else if (s.status === "given") given++;
        else if (s.status === "listed") listed++;
        if (s.showcase) showcase++;
      }
      return { all: summaries.size, draft, private: priv, given, listed, showcase };
    }, [summaries]);

    const filtered = React.useMemo(() => {
      if (!summaries) return [];
      let list = projects
        .map((p) => ({ project: p, summary: summaries.get(p.id) }))
        .filter((x): x is { project: (typeof projects)[number]; summary: ProjectSummary } => Boolean(x.summary));
      if (tab === "showcase") list = list.filter((x) => x.summary.showcase != null);
      else if (tab !== "all") list = list.filter((x) => x.summary.status === tab);
      const q = query.trim();
      if (q) list = list.filter((x) => matchProject(x.summary, x.project.description, q).hit);
      switch (sort) {
        case "oldest":
          list.sort((a, b) => a.summary.sortKey - b.summary.sortKey);
          break;
        case "name":
          list.sort((a, b) => a.summary.name.localeCompare(b.summary.name));
          break;
        default:
          list.sort((a, b) => b.summary.sortKey - a.summary.sortKey);
      }
      return list;
    }, [projects, summaries, tab, query, sort]);

    const filterApplied = tab !== "all" || query.trim().length > 0;
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const shownPage = Math.min(page, pageCount);
    const start = (shownPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);
    const allProjectsCount = summaries?.size ?? projects.length;

    return (
      <div className="w-full px-[32px] py-[28px]">
        <header className="mb-[20px]">
          <h1 className="text-xl font-bold tracking-tight text-text-primary">My projects</h1>
          <p className="mt-[4px] text-sm text-text-secondary">
            Everything you&apos;ve created — from an AI build you saved or a project you started by hand. Pick up
            any of them where you left off.
          </p>
        </header>

        {summaries && allProjectsCount === 0 ? (
          <NoProjectsState onGoHome={() => router.push("/")} />
        ) : (
          <>
            <div
              role="tablist"
              aria-label="Filter projects by status"
              className="flex flex-wrap items-center gap-[8px] border-b border-border pb-[16px]"
            >
              {[{ id: "all" as const, label: "All" }, ...OUTCOME_TABS].map((t) => (
                <TabButton
                  key={t.id}
                  id={t.id}
                  label={t.label}
                  active={tab === t.id}
                  count={!hydrated || !counts ? "—" : counts[t.id]}
                  onSelect={changeTab}
                />
              ))}
              <span aria-hidden className="mx-[4px] h-[20px] w-px bg-border" />
              <TabButton
                id="showcase"
                label="Showcase"
                active={tab === "showcase"}
                count={!hydrated || !counts ? "—" : counts.showcase}
                onSelect={changeTab}
              />
            </div>

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
                  placeholder="Search projects and products"
                  aria-label="Search projects"
                  className="h-[40px] w-full rounded-full border border-border bg-bg-surface pl-[42px] pr-[16px] text-sm text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus:border-border-focus placeholder:text-text-tertiary"
                />
              </form>
              <div className="flex items-center gap-[10px] min-[860px]:ml-auto">
                <Select label="Sort By" value={sort} onChange={(v) => changeSort(v as SortId)} options={SORTS} />
              </div>
            </div>

            {!hydrated || !summaries ? (
              <ul
                role="list"
                aria-hidden
                className="mt-[16px] grid grid-cols-1 gap-[24px] [container-type:inline-size] min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i}>
                    <ProjectCardSkeleton />
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <p className="mt-[16px] text-sm font-medium text-text-secondary">
                  {!filterApplied
                    ? `${allProjectsCount} ${allProjectsCount === 1 ? "project" : "projects"}`
                    : `${filtered.length} of ${allProjectsCount} ${allProjectsCount === 1 ? "project" : "projects"}`}
                </p>

                {filtered.length === 0 ? (
                  query.trim() ? (
                    <NoMatchState
                      query={query}
                      tabLabel={TAB_LABEL[tab]}
                      onClearSearch={() => changeQuery("")}
                      onSearchAll={tab !== "all" ? () => changeTab("all") : undefined}
                    />
                  ) : (
                    // Reachable only when tab !== "all": the "all" tab can't
                    // be empty here (the NoProjectsState branch above already
                    // caught allProjectsCount === 0), so this cast is safe.
                    <EmptyTabState tab={tab as Exclude<TabId, "all">} />
                  )
                ) : (
                  <>
                    <ul
                      role="list"
                      className="mt-[16px] grid grid-cols-1 gap-[24px] [container-type:inline-size] min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3"
                    >
                      {pageItems.map(({ project, summary }) => (
                        <li key={project.id}>
                          <ProjectCard summary={summary} onBeforeNavigate={() => selectProject(project.id)} />
                        </li>
                      ))}
                    </ul>

                    {pageCount > 1 && <Pagination page={shownPage} pageCount={pageCount} onChange={setPage} />}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  }

  function TabButton({
    id,
    label,
    active,
    count,
    onSelect,
  }: {
    id: TabId;
    label: string;
    active: boolean;
    count: number | "—";
    onSelect: (id: TabId) => void;
  }) {
    return (
      <button
        role="tab"
        aria-selected={active}
        type="button"
        onClick={() => onSelect(id)}
        className={[
          "inline-flex h-[36px] items-center gap-[8px] rounded-full border px-[14px] text-sm font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
          active
            ? "border-transparent bg-bg-brand-subtle text-text-brand"
            : "border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
        ].join(" ")}
      >
        {label}
        <span
          className={[
            "inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-[6px] text-2xs font-bold tabular-nums",
            active ? "bg-bg-brand text-text-on-brand" : "bg-bg-surface-raised text-text-tertiary",
          ].join(" ")}
        >
          {count}
        </span>
      </button>
    );
  }

  // ───────────────────────── shared bits ─────────────────────────
  ```

  That last comment line (`// ─── shared bits ───`) is already the header
  immediately above `function Select({` in the current file — stop the
  replacement there so `Select`, `Pagination` and `pageItemsFor` (today's
  lines 451–580) fall through unchanged.

  Then delete the old empty-state block — today's lines 582–661
  (`function EmptyShell` through the end of `function NftEmptyState`) —
  entirely; nothing replaces it, since `NoProjectsState`/`NoMatchState`/
  `EmptyTabState` now come from `./project-card`.

- [ ] **Step 4:** `npx tsc --noEmit` clean (real once A3 and
  `src/lib/brief/project-brief.ts` exist, per the Build order this task
  follows both).

- [ ] **Step 5 (browser check), on `http://localhost:3002/projects`:**
  1. Seed fixtures — in the browser console:
     ```js
     localStorage.setItem("ideeza:manual:projects", JSON.stringify([
       { id: "car", slug: "car", name: "Car", productName: "RC Car Controller", description: "A two-motor RC car.",
         products: [
           { id: "p1", name: "RC Car Controller", description: "" },
           { id: "p2", name: "Remote Controller", description: "" },
           { id: "p3", name: "Battery Charger", description: "" },
           { id: "p4", name: "Spare Battery Pack", description: "" },
         ],
         status: "draft", createdAt: Date.now() - 86400000, updatedAt: Date.now() - 3600000, flowState: {},
         // No matching entry is seeded in ideeza:create:builds, so this ref
         // resolves as "build-gone" (LST-4 row 4 still applies: build refs,
         // no draft → Add Brief) rather than needing a full BuildJob fixture.
         builds: [{ buildId: "b1", chatId: "chat1", version: 1, savedAt: Date.now() - 3600000 }] },
       { id: "soil", slug: "soil", name: "Plant Soil Monitor", productName: "Soil Probe", description: "Moisture sensor.",
         products: [{ id: "p1", name: "Soil Probe", description: "" }],
         status: "completed", createdAt: Date.now() - 604800000, updatedAt: Date.now() - 604800000,
         flowState: {}, showcasedAt: Date.now() - 500000000 },
       { id: "weather", slug: "weather", name: "Garden Weather Station", productName: "", description: "",
         products: [{ id: "p1", name: "", description: "" }],
         status: "draft", createdAt: Date.now() - 200000000, updatedAt: Date.now() - 200000000, flowState: {} },
     ]));
     location.reload();
     ```
  2. At 1440×900: confirm three vertical cards render — cover on top (16:10,
     Car's placeholder shows the CpuIcon tile: its build ref doesn't resolve
     to a job in this browser, so there's no cover to load), status chip
     top-right of the cover, no Showcase badge on Car/the weather station,
     and the Soil Monitor card shows the Showcase badge top-left of its
     cover (`showcasedAt` is seeded directly on it). Confirm the title
     truncates at 2 lines with a native tooltip on hover, the meta row on
     Car reads "AI build · not in this browser · Saved …" (its build ref has
     no matching job), the product line reads "4 products · RC Car
     Controller, Remote Controller +2" for Car and "1 product · not named
     yet" for the weather station, and the next-action button reads "Add
     Brief" for Car (build refs, no brief draft — LST-4 row 4 applies even
     though the build itself is gone) / "Open in editor" for the hand-made
     weather station (no build refs at all — row 5). Confirm there is no ⋮,
     no step/progress bar and no dots anywhere on any card.
  3. Resize to 400×800 (or the Browser pane's mobile preset): confirm every
     card becomes a row — 96×60 cover at the left, the chip beside the
     title, product/status/meta lines stacked to its right, and a full-width
     button below the row.
  4. Click the Draft tab: only Car and the weather station show (Soil
     Monitor is "completed"/minted). Click Given: the grid disappears and
     the "Nothing given to the community yet" `EmptyTabState` shows, no
     button, tabs still visible and clickable.
  5. Type "remote" in search: only Car remains, count line reads "1 of 3
     projects". Type "zzz-nomatch": the `NoMatchState` shows
     ("No matches for "zzz-nomatch""), with **Clear search** (restores all
     three) and, since the tab is "All", no **Search all projects** button;
     switch to the Draft tab first, search "zzz" again, and confirm
     **Search all projects** now appears and returns to All.
  6. `localStorage.removeItem("ideeza:manual:projects")`, reload: confirm
     `NoProjectsState` shows ("No projects yet") with the tabs and toolbar
     hidden, and **Go to Home** navigates to `/`.
  7. Throttle the network (or seed one project whose `cover` `img` src
     points at a URL that 404s) and confirm the placeholder shows "Image
     didn't load"; and briefly delay `hydrated` (reload with the store
     cleared mid-flight, or just observe the first paint) to see the six
     skeleton cards with the tab/search/sort chrome still present and counts
     reading "—".

- [ ] **Step 6:**
  ```
  npx tsc --noEmit
  npx eslint src/components/projects/my-projects.tsx
  git add src/components/projects/my-projects.tsx
  git commit -m "feat(projects): wire My projects to the shared card and its states

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```
