### Task C5: The Media tab — `src/components/projects/details/media-tab.tsx`

**Spec delta check (commit e599fcf):** read `.superpowers/pd/plan/spec-delta.md` in full. It amends Showcase, status badges, the Showcase tab, dropped products, version history and delete — none of it touches §5.8 (the Media tab), CNT-8/9/11/12/13/14/18/19/27, or the cover field. No change to this task from the delta.

**Requirements:** CNT-8, CNT-9, CNT-11, CNT-12, CNT-13, CNT-14, CNT-18, CNT-19, CNT-27, CNT-28 (satisfied by omission — no generator, no FAB), PPL-6 (the two controls this tab owns: "Use as cover" and the preview-clip note's Open Brief), COR-74 / PPL-2 (this tab derives nothing of its own — `refs`, `hydrated` and `draft` all come in as props from the page shell's one read).

Per the controller's scope for this task, two NEXT-categorized ids are pulled into NOW here, same as owner decisions elsewhere override the area files' own NOW/NEXT split:
- **CNT-15** ("Use as cover" / "Stop using as cover") — normally listed as NEXT in §6.1 (waits on "cover, media" stores), built now as the one control the Media tile owns; the full multi-source tile ⋮ menu (CNT-16, for when uploads exist) stays NEXT.
- **LST-34** ("A cover chosen on the details page wins over the default") — normally NEXT; the override this task writes is what LST-34 describes, landing now instead of waiting on the upload store.

**Out of scope, confirmed NEXT and not touched:** CNT-10 (Images/Videos filter — only matters once uploads exist), CNT-16 (the always-visible ⋮ with multiple items), CNT-17/20-26 (uploads, Add media, saving states, quotas), CNT-40/41 (Brief share copy — a different surface).

**Files:**
- Create: `src/components/projects/details/media-tab.tsx`
- Modify: none. Wiring `<MediaTab/>` into the tab strip's `tabpanel` (`?tab=media`) is the tabs/shell task's job (§5.5), not this one — this task's contract is the component and its props.
- Test: none. See "Why no `tests/projects/*.test.mjs`" below.

**Interfaces**

Consumes (exact, as spec §5.1 names them, plus the cover-field dependency this task places on A1/A2 — see Notes):
- A1, `src/lib/manual/projects.tsx`:
  - `type ManualProject` — reads `.id` only directly; the `cover?: ProductSource | null` field this task depends on is read *through* `coverOf()`, never inline.
  - `useManualProjects()`, specifically its **new** `setCover(id: string, cover: ProductSource | null): void` ctx member (COR-105's sibling — same shape as `setShowcase`, on/off replaced by a value/`null`). **This task requires A1 to add it**; it is not yet in the merged spec text (see Notes).
  - `stepHref(project: ManualProject | string, step: keyof ManualFlowState): string` — existing, unchanged (`projects.tsx:461-467`), used for the preview-clip note's Open Brief link.
- A2, `src/lib/manual/project-read.ts`:
  - `type BuildRef = ProjectBuildRef & { job: BuildJob | null }`
  - `coverOf(p: ManualProject, refs: BuildRef[]): string | null` (COR-96) — **this task requires A2 to check `p.cover` first** (resolve the build + product it names through `refs`/`productsOf`, else fall back to today's order: newest saved version's primary image → any product image → null). This is the only place the override needs to be taught; A3's `projectSummary().cover` already calls `coverOf()` verbatim, so once A2 does this, the My projects card picks up the same override for free (CNT-14: "The cover is what the My projects card shows") with no change to A3.
- `src/lib/manual/permissions.ts` (§5.1.5, file not yet landed as its own task at time of writing — cited from the spec directly, the same way A3 cites A2/A4 before they exist):
  - `type Viewer = { kind: "local-owner" } | { kind: "owner-preview" }`
  - `can(viewer: Viewer, action: Action): boolean`. This task reuses two actions **already in the spec's `Action` union** rather than asking for a new one: `"product.edit"` gates "Use as cover" (closest existing fit for "curate which image represents a product/project"; there is no `media.*` action in §5.1.5's list and adding one is out of this task's file scope), and `"project.brief"` gates the preview-clip note's Open Brief link (PPL-6 names this exact control by name as one that must be absent in preview — `project.brief` is the action already used to gate Brief entry points elsewhere).
- A4, `src/lib/brief/project-brief.ts`:
  - `type StoredDraft = { state: BriefState; step: BriefStepId }`. This task reads only `draft?.state.videoJobId`.
- Existing, unchanged:
  - `productsOf(job: BuildJob): BuildProduct[]` — `src/lib/create/history.tsx:396-411`. Returns the primary product (`id: "primary"`) followed by every companion, each with `.conceptImageUrl`, `.name`, `.id`.
  - `Badge`, `Banner`, `Button`, `IconButton`, `linkVariants` — `src/components/ideeza` (barrel).
  - `Icon` — `src/components/dashboard/icon.tsx`.

Produces (all exported from `src/components/projects/details/media-tab.tsx`):
```ts
export type MediaTile = {
  key: string;        // `${buildId}:${productId}`
  url: string;        // BuildProduct.conceptImageUrl — a reference, never copied (CNT-9)
  name: string;
  version: number;     // the BuildRef's version within its lineage
  buildId: string;
  productId: string;   // "primary" | a companion's id — together with buildId, a ProductSource
};

/** CNT-9: one tile per product per saved version, newest version first,
 *  primary before its companions, the same image URL shown once. A ref
 *  whose build isn't in this browser contributes nothing. */
export function mediaTilesOf(refs: BuildRef[]): MediaTile[];

export type MediaTabProps = {
  project: ManualProject;
  refs: BuildRef[];                        // buildsOf(project, builds) — computed once by the shell
  hydrated: boolean;                       // both stores read (COR-2); gates CNT-12's skeleton
  draft: StoredDraft | null | undefined;   // the shell's one useProjectBrief(project.id) read (COM-1)
  viewer: Viewer;
};
export function MediaTab(props: MediaTabProps): React.JSX.Element;

/** CNT-18's lightbox, exported so the Activity drawer (NEXT) can reuse it
 *  verbatim, per the spec's own note ("The Activity drawer reuses this
 *  component"). */
export function MediaLightbox(props: {
  tiles: MediaTile[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}): React.JSX.Element;
```

---

#### Notes and decisions (each stated once, so the reviewer can object)

1. **The `cover` field is a real, load-bearing dependency this task adds to A1 and A2.** As of this writing, A3 (`project-summary.ts`, already landed in this plan folder) lists `ManualProject`'s consumed fields as `builds?`, `lastOpened?`, `showcasedAt?`, `products?` — **no `cover` field**, and its `ProjectSummary.cover` is populated by calling `coverOf()` unmodified. That is exactly the shape this task needs to be true: A1 adds `cover?: ProductSource | null` (reusing the existing `ProductSource = { buildId, productId }` type from §5.1.1 — no new type) plus the `setCover` ctx member; A2 amends `coverOf()` to prefer it. Nothing else in the plan (A3, the My projects card task) needs to change for the override to reach both surfaces — they already call `coverOf()` as their one source of truth. If A1/A2 ship without this, "Use as cover" silently has no visible effect (the write happens, but `coverOf()` ignores it); flag this to the merge controller explicitly rather than have this task duplicate the resolution logic locally (which would risk the Media tab and the My projects card disagreeing on which tile is "the" cover — exactly what LST-32's shared-derivation test exists to prevent).
2. **Why no `tests/projects/*.test.mjs`.** Confirmed against `spec-delta.md`'s "Harness notes" (binding): "Any `src/lib/**` module that a test pulls in uses RELATIVE imports only, not `@/`, because tsc doesn't rewrite aliases in its output." `media-tab.tsx` lives in `src/components/**`, not `src/lib/**`, and imports `@hugeicons/core-free-icons`, `next/link` and the whole design system through `@/*` aliases throughout, like every other file under `src/components` — rewriting those to relative paths just for this one file would fight the rest of the tree for no reason, and the harness note's `jsx: "react-jsx"` requirement exists only because `project-summary.ts` (A3) transitively imports `projects.tsx`/`history.tsx`, not as an invitation to compile component files directly. `mediaTilesOf()` is pure and could in principle be unit-tested, but only by living in a `src/lib/**` file, which is out of this task's one-file scope — the Step 5 browser check verifies it end-to-end instead (dedup, ordering, and the cover/lightbox/empty-state behaviour together, which is closer to how a reviewer will actually see it break).
2a. **Harness note compliance, checked explicitly (per the controller's follow-up).** The binding reuse list — `formatDate`, `formatDateTime`, `formatShortDate`, `countLabel`, `IconName`, `cardText()`, `headerText()`, all from A3's `project-summary.ts` — has no overlap with this file: the Media tab renders no date (its captions are "{name} · v{n}", never a date; CNT-9/CNT-18 name no date field), no product count, and no status chip. Nothing in `media-tab.tsx` reimplements any of the seven; if a later reviewer adds a date to a tile caption, it must call `formatDate`/`formatShortDate` from `project-summary.ts` rather than a new local formatter.
3. **`can(viewer, "product.edit")` for "Use as cover".** §5.1.5's `Action` union has no cover- or media-specific entry. Reusing `product.edit` needs no change to `permissions.ts` and already returns `false` for `owner-preview` (PPL-6's requirement), which is the behaviour this task needs. If the permissions task lands with a more specific action (e.g. something under a future `media.*` name), swapping the one call site is a one-line follow-up — noted here so it isn't lost.
4. **Cover chip vs. "Use as cover" control, both per tile, never conflated.** CNT-14's chip is informational (not a control, `Badge`, non-interactive) and CNT-15's control is a real action. On the current cover's tile: the chip shows, and the tile's own button reads "Stop using as cover" (clears the override, reverting to `coverOf()`'s default order). On every other tile: no chip, and the button reads "Use as cover". Per CNT-27, the buyer preview hides the chip *and* the control — not just one of them — so `hideCoverChip` and `showCoverControl` are both independently threaded through, not derived from each other.
5. **Lightbox navigation is not capped at 24.** CNT-11's 24-item reveal is a grid-reveal limit ("Show more"), not a content limit; the lightbox group is always the full `tiles` list, so arrow-key navigation can reach an image that "Show more" hasn't revealed yet. Because `shown` is always `tiles.slice(0, N)` (a prefix, never reordered or filtered independently), the index passed to `onOpen` is valid in both the sliced and the full array without renumbering.
6. **One empty-state message covers two real scenarios.** CNT-13's copy is written for "a hand-made project with no build"; this task also shows it when every attached build's job is gone from this browser (`refs.length > 0` but none resolve — `mediaTilesOf` already returns `[]` in both cases). No CNT id gives Media its own "build not in this browser" wording the way COR-78 does for the Products tab, and inventing one here would be new copy outside this task's scope — reusing the one given sentence is the honest option, not a placeholder.
7. **Sort/dedup order.** Tiles are built newest-version-first, primary before companions, deduped by exact URL keeping the first (i.e. newest) occurrence — so a companion image unchanged across two versions is captioned with its newest version, matching `coverOf()`'s own "newest saved version" bias (COR-96 / X11) rather than reading as an arbitrary pick.
8. **"Use as cover" is absent, not disabled, in preview.** Consistent with PPL-6 ("every write or authoring control is absent, not disabled"): `showCoverControl` is computed from `can()` and simply leaves the `IconButton` out of the tree in preview, rather than rendering it `disabled`.

---

- [ ] Step 1: Confirm the failing state

This is a new, self-contained UI component (see the "why no test file" note above — there is no pure-module test to write first). The concrete RED state to confirm before Step 3:

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
test -f src/components/projects/details/media-tab.tsx && echo "already exists — stop" || echo "missing, as expected"
```
Expected: `missing, as expected`.

If the tabs/shell task (§5.5) has already landed and its tab panel imports `MediaTab` from `@/components/projects/details/media-tab`, this is additionally visible as a compile error:
```bash
npx tsc --noEmit
```
Expected in that case: `error TS2307: Cannot find module '@/components/projects/details/media-tab' or its corresponding type declarations.` If the shell hasn't landed yet, `tsc` simply has nothing to say about this path yet — proceed to Step 3 either way.

- [ ] Step 2: (see Step 1 — there is no separate test run to fail)

- [ ] Step 3: Implement (COMPLETE code)

Create `src/components/projects/details/media-tab.tsx`:

```tsx
"use client";

// MediaTab — the project page's Media tab (spec §5.8: CNT-8, CNT-9, CNT-11,
// CNT-12, CNT-13, CNT-14, CNT-18, CNT-19, CNT-27). The project's one media
// library: concept-image tiles gathered from every saved build ("From your
// builds", CNT-9), a single Cover chip with its "Use as cover" action
// (CNT-14 / CNT-15 — pulled into NOW for this task; the full multi-source
// tile menu, CNT-16, and uploads, CNT-10/17/20-26, stay NEXT), the Brief's
// preview-clip note (CNT-19) and a lightbox for viewing an image full-size
// (CNT-18). "Your uploads" and Add media are NEXT — there is nothing to
// build for them yet (CNT-28: one generator, in the Brief, no FAB here).
//
// Cover: `coverOf()` (src/lib/manual/project-read.ts) is the single source
// of truth for which image is the cover, on this tab and on the My projects
// card alike (CNT-14, LST-32) — it must check `ManualProject.cover` (the
// override "Use as cover" writes, through `setCover`) before its own default
// order. See task-C5.md's Notes for what this requires of that function.

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Bookmark02Icon,
  BookmarkCheck02Icon,
  Cancel01Icon,
  Image01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Banner, Button, IconButton, linkVariants } from "@/components/ideeza";
import { productsOf } from "@/lib/create/history";
import { stepHref, useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { coverOf, type BuildRef } from "@/lib/manual/project-read";
import { can, type Viewer } from "@/lib/manual/permissions";
import type { StoredDraft } from "@/lib/brief/project-brief";

// ─────────────────────────── tiles (CNT-9) ───────────────────────────

export type MediaTile = {
  /** `${buildId}:${productId}` — stable across renders, never reused. */
  key: string;
  url: string;
  name: string;
  version: number;
  buildId: string;
  productId: string;
};

/**
 * CNT-9: one tile per product per saved version, primary and companions
 * alike, read through `buildsOf` → `productsOf` (the caller passes `refs`,
 * already `buildsOf(project, builds)`). Newest version first, primary
 * before its companions; the same image URL shows once — the first time it
 * is seen, which (given the order below) is its newest occurrence. A ref
 * whose build isn't in this browser (`job: null`) contributes nothing: it
 * has no accessible image (COR-78 — never contradicts itself by guessing
 * at one).
 */
export function mediaTilesOf(refs: BuildRef[]): MediaTile[] {
  const seen = new Set<string>();
  const tiles: MediaTile[] = [];
  const byNewest = [...refs].filter((r) => r.job).sort((a, b) => b.version - a.version);
  for (const ref of byNewest) {
    for (const product of productsOf(ref.job!)) {
      const url = product.conceptImageUrl;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      tiles.push({
        key: `${ref.buildId}:${product.id}`,
        url,
        name: product.name.trim() || "Not named yet",
        version: ref.version,
        buildId: ref.buildId,
        productId: product.id,
      });
    }
  }
  return tiles;
}

const VISIBLE_STEP = 24; // CNT-11: the first 24, then "Show more (n)" — no numbered pages.

// ─────────────────────────── the tab ───────────────────────────

export type MediaTabProps = {
  project: ManualProject;
  /** `buildsOf(project, builds)` — computed once by the page shell (COR-74:
   *  one derivation feeds the page; this tab never derives its own). */
  refs: BuildRef[];
  /** True once both the projects and the builds stores have hydrated
   *  (COR-2). Until then, CNT-12's per-slot skeleton shows instead of any
   *  content — including the empty state, which must never flash first. */
  hydrated: boolean;
  /** The project's Brief draft (COM-1's `useProjectBrief`, read once by the
   *  page shell) — `undefined` before it is read, `null` when there is
   *  none. CNT-19 reads only `draft.state.videoJobId` from it. */
  draft: StoredDraft | null | undefined;
  viewer: Viewer;
};

export function MediaTab({ project, refs, hydrated, draft, viewer }: MediaTabProps) {
  const { setCover } = useManualProjects();
  const [expanded, setExpanded] = React.useState(false);
  const [lightbox, setLightbox] = React.useState<{ index: number; trigger: HTMLElement } | null>(null);

  const tiles = React.useMemo(() => mediaTilesOf(refs), [refs]);
  const coverUrl = coverOf(project, refs); // the one source of truth (CNT-14); its own override wins (LST-34).
  const shown = expanded ? tiles : tiles.slice(0, VISIBLE_STEP);
  const remaining = tiles.length - shown.length;

  const buyerView = viewer.kind === "owner-preview"; // CNT-27: no Cover chip, no menus, in Preview as buyer.
  const showCoverControl = !buyerView && can(viewer, "product.edit");
  const canOpenBrief = can(viewer, "project.brief"); // PPL-6: the preview-clip note's Open Brief is owner-only.
  const videoJobId = draft?.state.videoJobId ?? null;

  const openLightbox = (index: number, trigger: HTMLElement) => setLightbox({ index, trigger });
  const closeLightbox = () => {
    const trigger = lightbox?.trigger;
    setLightbox(null);
    trigger?.focus();
  };

  return (
    <section aria-labelledby="media-heading" className="mt-16">
      <h2 id="media-heading" className="text-lg font-bold text-text-primary">
        Media
      </h2>

      {!hydrated ? (
        <MediaSkeleton />
      ) : (
        <>
          {videoJobId && (
            <Banner tone="info" className="mt-7">
              {"Preview clip — made in the Brief. Rendering is simulated in this prototype, so there's no video file to show yet."}
              {canOpenBrief && (
                <>
                  {" "}
                  <Link href={stepHref(project, "brief")} className={linkVariants({ color: "brand", size: "sm" })}>
                    Open Brief
                  </Link>
                </>
              )}
            </Banner>
          )}

          {tiles.length === 0 ? (
            <EmptyMedia />
          ) : (
            <>
              <h3 className="mt-7 text-sm font-semibold text-text-secondary">From your builds</h3>
              <ul role="list" className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6">
                {shown.map((tile, i) => (
                  <MediaTileCard
                    key={tile.key}
                    tile={tile}
                    isCover={tile.url === coverUrl}
                    showCoverControl={showCoverControl}
                    hideCoverChip={buyerView}
                    onOpen={(el) => openLightbox(i, el)}
                    onToggleCover={() =>
                      setCover(
                        project.id,
                        tile.url === coverUrl ? null : { buildId: tile.buildId, productId: tile.productId },
                      )
                    }
                  />
                ))}
              </ul>
              {remaining > 0 && (
                <Button hierarchy="secondary" size="sm" className="mt-6" onClick={() => setExpanded(true)}>
                  Show more ({remaining})
                </Button>
              )}
            </>
          )}
        </>
      )}

      {lightbox && (
        <MediaLightbox
          tiles={tiles}
          index={lightbox.index}
          onIndexChange={(index) => setLightbox((v) => (v ? { ...v, index } : v))}
          onClose={closeLightbox}
        />
      )}
    </section>
  );
}

// ─────────────────────────── empty / loading (CNT-12, CNT-13) ───────────────────────────

function EmptyMedia() {
  return (
    <div className="mt-7 flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-bg-surface px-10 py-16 text-center">
      <span aria-hidden className="text-text-tertiary">
        <Icon icon={Image01Icon} size={24} />
      </span>
      <p className="max-w-[56ch] text-sm text-text-secondary">
        {"No images yet — concept images from AI builds appear here."}
      </p>
    </div>
  );
}

function MediaSkeleton() {
  return (
    <ul aria-hidden className="mt-7 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <li key={i} className="aspect-[4/3] animate-pulse rounded-lg bg-bg-subtle motion-reduce:animate-none" />
      ))}
    </ul>
  );
}

// ─────────────────────────── one tile (CNT-9, CNT-14, CNT-15) ───────────────────────────

function MediaTileCard({
  tile,
  isCover,
  showCoverControl,
  hideCoverChip,
  onOpen,
  onToggleCover,
}: {
  tile: MediaTile;
  isCover: boolean;
  showCoverControl: boolean;
  hideCoverChip: boolean;
  onOpen: (trigger: HTMLElement) => void;
  onToggleCover: () => void;
}) {
  const [broken, setBroken] = React.useState(false);
  const caption = `${tile.name} · v${tile.version}`;

  return (
    <li className="relative">
      <button
        type="button"
        onClick={(e) => onOpen(e.currentTarget)}
        aria-label={`View ${caption}`}
        className="group block w-full overflow-hidden rounded-lg border border-border bg-bg-surface-raised text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <span className="relative block aspect-[4/3] w-full overflow-hidden bg-bg-surface-raised">
          {!broken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tile.url}
              alt={`${tile.name} concept image, v${tile.version}`}
              loading="lazy"
              decoding="async"
              onError={() => setBroken(true)}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-105 motion-reduce:transition-none"
            />
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-tertiary">
              <Icon icon={Image01Icon} size={20} />
              <span className="text-xs">{"Image didn't load"}</span>
            </span>
          )}
        </span>
        <span className="block truncate px-3 py-2 text-xs text-text-secondary">{caption}</span>
      </button>

      {isCover && !hideCoverChip && (
        <Badge tone="blue" icon={<Icon icon={BookmarkCheck02Icon} size={12} />} className="absolute left-2 top-2">
          Cover
        </Badge>
      )}

      {showCoverControl && (
        <IconButton
          hierarchy="secondary"
          size="sm"
          icon={<Icon icon={isCover ? BookmarkCheck02Icon : Bookmark02Icon} size={16} />}
          aria-label={`${isCover ? "Stop using as cover" : "Use as cover"} — ${caption}`}
          title={isCover ? "Stop using as cover" : "Use as cover"}
          onClick={onToggleCover}
          className="absolute right-2 top-2 bg-bg-surface/90"
        />
      )}
    </li>
  );
}

// ─────────────────────────── lightbox (CNT-18) ───────────────────────────

/**
 * CNT-18: opened from a tile; `contain`-fit within ~90vw × 85vh; ←/→ within
 * the group with a counter and the item's name; × and Esc close and return
 * focus to the tile (the caller's `onClose` does the focus-return, since
 * only it knows which tile opened this); one dark scrim; no Desktop/Mobile
 * toggle; never a play button (there are no video files in NOW). Exported
 * so the Activity drawer can reuse it as-is (NEXT).
 */
export function MediaLightbox({
  tiles,
  index,
  onIndexChange,
  onClose,
}: {
  tiles: MediaTile[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const tile = tiles[index];

  React.useEffect(() => {
    requestAnimationFrame(() => closeRef.current?.focus());
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      else if (e.key === "ArrowRight" && index < tiles.length - 1) onIndexChange(index + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, tiles.length, onClose, onIndexChange]);

  if (!tile) return null;
  const caption = `${tile.name} · v${tile.version}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={caption}
      onClick={onClose}
      className="fixed inset-0 z-modal flex flex-col items-center justify-center gap-4 px-4 py-6"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] backdrop-blur-sm"
      />

      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 inline-flex h-[44px] w-[44px] items-center justify-center rounded-lg text-text-on-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus hover:bg-white/10"
      >
        <Icon icon={Cancel01Icon} size={22} />
      </button>

      {index > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(index - 1);
          }}
          aria-label="Previous image"
          className="absolute left-4 top-1/2 z-10 inline-flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-lg text-text-on-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus hover:bg-white/10"
        >
          <Icon icon={ArrowLeft01Icon} size={22} />
        </button>
      )}
      {index < tiles.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(index + 1);
          }}
          aria-label="Next image"
          className="absolute right-4 top-1/2 z-10 inline-flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-lg text-text-on-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus hover:bg-white/10"
        >
          <Icon icon={ArrowRight01Icon} size={22} />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tile.url}
        alt={`${tile.name} concept image, v${tile.version}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
      />

      <p onClick={(e) => e.stopPropagation()} className="relative z-10 text-sm text-text-on-brand">
        {index + 1} of {tiles.length} · {caption}
      </p>
    </div>
  );
}
```

- [ ] Step 4: Run, expected PASS

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
npx tsc --noEmit
```
Expected: clean once A1 (`setCover`, `cover?`), A2 (`coverOf`, `BuildRef`), A4 (`StoredDraft`) and `permissions.ts` (`can`, `Viewer`) exist with the signatures above. Until they land, the errors are exactly the four missing-module/missing-member errors named in the Notes — not a defect in this file.

- [ ] Step 5 (UI task): Browser check

Seed two builds of one chat (a "rebuild"), one hand-made project, and a Brief draft, then check every state:

1. Seed `ideeza:create:builds` (localStorage) with two `BuildJob`s sharing `chatId: "chat_1"`: `job_1` (primary `conceptImageUrl: "/api/concept/image/demo-a"`, one companion `{id: "comp1", name: "Remote Controller", conceptImageUrl: "/api/concept/image/demo-b"}`) and `job_2`, same chat, primary `conceptImageUrl: "/api/concept/image/demo-c"` (a new image — simulates a changed concept) and the same companion `comp1` with the **same** `demo-b` URL (simulates an unchanged companion image across the rebuild).
2. Seed `ideeza:manual:projects` with `proj_1` (`slug: "car"`, `builds: [{buildId:"job_1", chatId:"chat_1", version:1, savedAt: <t1>}, {buildId:"job_2", chatId:"chat_1", version:2, savedAt: <t2>}]`, no `cover` field yet) and a second, hand-made `proj_2` (`slug: "hand"`, no `builds`).
3. Open `/projects/proj_1?tab=media`. Expect: heading "Media", subheading "From your builds", **3 tiles** (job_2's primary "demo-c", job_1's primary "demo-a", and comp1's "demo-b" once — not twice, proving the URL dedupe), each captioned "{name} · v{n}" — comp1's tile reads "Remote Controller · v2" (the newest occurrence wins, per the ordering decision above), and its `alt` reads "Remote Controller concept image, v2".
4. Expect exactly one **Cover** chip, on job_2's primary tile (`demo-c` — the newest version's primary image, `coverOf()`'s default).
5. Click the "Use as cover" button on the comp1 tile. Expect: the Cover chip moves to that tile immediately, and its own button now reads "Stop using as cover" (check the title/aria-label). Reload the page: the chip is still on that tile (persisted through `setCover` → `ManualProject.cover`).
6. Click "Stop using as cover" on that same tile. Expect: the chip reverts to job_2's primary tile (back to the default order).
7. Click a tile's image (not its corner button). Expect: the lightbox opens, image `contain`-fit, a counter reading "1 of 3" (or the tile's actual position) and the same "{name} · v{n}" caption. Press → twice, then ←; confirm the image and counter update and the arrows disappear at each end of the group. Press Esc; confirm the lightbox closes and keyboard focus is back on the exact tile button that opened it (Tab from there should move to the *next* tile, not restart at the top of the page).
8. Seed `ideeza:brief:draft:proj_1` with a normalized `BriefState` whose `videoJobId` is a non-empty string. Reload `/projects/proj_1?tab=media`. Expect the info banner: "Preview clip — made in the Brief. Rendering is simulated in this prototype, so there's no video file to show yet." with an "Open Brief" link that navigates to `/project/car/brief`. Set `videoJobId` back to `null` and reload; the banner is gone.
9. Open `/projects/proj_2?tab=media` (the hand-made project, no builds). Expect: no "From your builds" heading, no grid, and the sentence "No images yet — concept images from AI builds appear here." No Cover chip anywhere on this project.
10. With the shell's buyer preview wired (`?view=buyer`, resolving `viewer: {kind: "owner-preview"}`): open `/projects/proj_1?tab=media&view=buyer`. Expect: the tiles still render, but no Cover chip on any tile, no "Use as cover" / "Stop using as cover" button on any tile, and — if a `videoJobId` is seeded — the preview-clip banner text still shows but its "Open Brief" link is gone.
11. Seed 25+ distinct build/product image URLs on one project (e.g. by adding more companions across a few builds). Expect exactly 24 tiles plus a "Show more (n)" button with the correct remaining count; clicking it reveals the rest with no pagination controls appearing.
12. With the OS/browser "reduce motion" setting on, confirm the loading skeleton (`hydrated={false}`) does not shimmer and a tile's hover no longer scales.

- [ ] Step 6: tsc + eslint + commit

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
npx tsc --noEmit
npx eslint src/components/projects/details/media-tab.tsx
git add src/components/projects/details/media-tab.tsx
git commit -m "feat(projects): add the project page's Media tab

Build tiles gathered from every saved version (CNT-9), a single Cover
chip with Use as cover / Stop using as cover (CNT-14/15), the Brief's
preview-clip note (CNT-19), a reusable lightbox (CNT-18), and the
no-images empty state for a hand-made project (CNT-13).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Expected: `tsc` and `eslint` print nothing and exit 0. The commit contains exactly this one file.
