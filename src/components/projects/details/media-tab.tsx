"use client";

// MediaTab — the project page's Media tab (spec §5.8: CNT-8, CNT-9, CNT-11,
// CNT-12, CNT-13, CNT-14, CNT-18, CNT-27; Phase 2 VIDEO P2-VIDEO-10). The
// project's one media library:
// - **Videos** (Phase 2, first): one tile per current product, the product's
//   in-use take. A ready tile opens VideoLightbox; the owner also sees every
//   other state in P2-VIDEO-4's words, with its action (Generate AI video /
//   Try again → the Generate dialog). A buyer sees ready tiles only — no
//   status, no actions, no counts — and no group at all when none is ready.
// - **From your builds**: concept-image tiles gathered from every saved build
//   (CNT-9), a single Cover chip with its "Use as cover" action (CNT-14 /
//   CNT-15) behind the edit gate (a live listing pauses first, P2-LISTING-13),
//   and a lightbox for viewing an image full-size (CNT-18).
// The Brief's old "Preview clip … no video file to show yet" note (CNT-19) is
// gone: the clip is a real file now, in the Videos group.
//
// Cover: `coverOf()` (src/lib/manual/project-read.ts) is the single source
// of truth for which image is the cover, on this tab and on the My projects
// card alike (CNT-14, LST-32).

import * as React from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Bookmark02Icon,
  BookmarkCheck02Icon,
  Cancel01Icon,
  Image01Icon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { Badge, Banner, Button, IconButton, ProgressBar } from "@/components/ideeza";
import { GenerateVideoDialog, videoTargetOf, type VideoTarget } from "@/components/video-jobs/generate-video-dialog";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { StatusGlyph, useClipUrl } from "@/components/video-jobs/video-player";
import { VideoLightbox, type LightboxVideo } from "@/components/video-jobs/video-lightbox";
import { useProjectEditGate } from "@/components/projects/use-edit-gate";
import { productsOf } from "@/lib/create/history";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { coverOf, productsOfProject, type BuildRef, type ProjectProduct } from "@/lib/manual/project-read";
import { can, type CanContext, type Viewer } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { currentProductsOf } from "@/lib/manual/readiness";
import type { StoredDraft } from "@/lib/brief/project-brief";
import { verifyClips } from "@/lib/video/clip-store";
import { productVideoStatus } from "@/lib/video/product-video";
import { useProjectVideos } from "@/lib/video/store";
import type { ProductVideoStatus, VideoTake } from "@/lib/video/types";
import { actionLabel, resolutionOf, statusCopy, videosGroupMeta } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";

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
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

// ─────────────────────────── the tab ───────────────────────────

export type MediaTabProps = {
  project: ManualProject;
  /** `buildsOf(project, builds)` — computed once by the page shell (COR-74:
   *  one derivation feeds the page; this tab never derives its own). The
   *  page shows its skeleton until every store is read (COR-2), so this tab
   *  never renders before its data — the empty state can't flash first. */
  refs: BuildRef[];
  /** The project's Brief draft — `null` when there is none. */
  draft: StoredDraft | null;
  viewer: Viewer;
  /** The page's `view.canCtx` (§3.7). Until the page passes it, the lock is
   *  read from the edit gate, which reads the same market. */
  canCtx?: CanContext;
};

export function MediaTab({ project, refs, viewer, canCtx }: MediaTabProps) {
  const { setCover } = useManualProjects();
  const gate = useProjectEditGate(project.id);
  const [expanded, setExpanded] = React.useState(false);
  const [lightbox, setLightbox] = React.useState<{ index: number; trigger: HTMLElement } | null>(null);
  const [coverNote, setCoverNote] = React.useState<string | null>(null);

  const ctx: CanContext = canCtx ?? { locked: gate.gateOf("cover").kind === "locked" };
  const tiles = React.useMemo(() => mediaTilesOf(refs), [refs]);
  // `productsOfProject` over the page's own refs is the view's `products`.
  const products = React.useMemo(() => currentProductsOf(productsOfProject(project, refs)), [project, refs]);
  const coverUrl = coverOf(project, refs); // the one source of truth (CNT-14); its own override wins (LST-34).
  // What the cover would be without the maker's pick. "Stop using as cover"
  // is offered only where the pick is what makes the cover — on the default
  // cover it would change nothing, so that tile keeps its chip and no toggle.
  const pinned = React.useMemo(
    () => project.cover != null && coverUrl !== null && coverUrl !== coverOf({ ...project, cover: null }, refs),
    [project, refs, coverUrl],
  );
  const shown = expanded ? tiles : tiles.slice(0, VISIBLE_STEP);
  const remaining = tiles.length - shown.length;

  // CNT-27: no Cover chip and no cover control where the owner-only facts
  // don't show (Preview as buyer); no control either once the project is locked.
  const ownerFacts = can(viewer, "facts.seeOwnerOnly", ctx);
  const showCoverControl = can(viewer, "product.edit", ctx);

  // The tile takes focus as it opens the lightbox (Safari doesn't focus a
  // clicked button), so the dialog's focus return always lands on it.
  const openLightbox = (index: number, trigger: HTMLElement) => {
    trigger.focus();
    setLightbox({ index, trigger });
  };
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

      <VideosGroup project={project} products={products} viewer={viewer} ctx={ctx} />

      {tiles.length === 0 ? (
        <EmptyMedia />
      ) : (
        <>
          <h3 className="mt-7 text-sm font-semibold text-text-secondary">From your builds</h3>
          {coverNote && (
            <Banner tone="attention" className="mt-4">
              {coverNote}
            </Banner>
          )}
          <ul role="list" className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6">
            {shown.map((tile, i) => {
              const isCover = tile.url === coverUrl;
              return (
                <MediaTileCard
                  key={tile.key}
                  tile={tile}
                  isCover={isCover}
                  // Use as cover on every other tile; Stop only on the maker's own pick.
                  coverControl={!showCoverControl ? null : !isCover ? "use" : pinned ? "stop" : null}
                  hideCoverChip={!ownerFacts}
                  onOpen={(el) => openLightbox(i, el)}
                  onToggleCover={() => {
                    // A live listing pauses first (P2-LISTING-13); an auction or the lock refuses.
                    const out = gate.guard("cover", () => {
                      setCoverNote(null);
                      setCover(project.id, isCover ? null : { buildId: tile.buildId, productId: tile.productId });
                    });
                    if (out.kind === "refused") setCoverNote(out.reason);
                  }}
                />
              );
            })}
          </ul>
          {remaining > 0 && (
            <Button hierarchy="secondary" size="sm" className="mt-6" onClick={() => setExpanded(true)}>
              Show more ({remaining})
            </Button>
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
      {gate.dialog}
    </section>
  );
}

// ─────────────────────────── Videos (P2-VIDEO-10) ───────────────────────────

type VideoRow = { product: ProjectProduct; name: string; status: ProductVideoStatus };

function VideosGroup({
  project,
  products,
  viewer,
  ctx,
}: {
  project: ManualProject;
  products: ProjectProduct[];
  viewer: Viewer;
  ctx: CanContext;
}) {
  const owner = can(viewer, "video.generate", ctx);
  const { record, hydrated } = useProjectVideos(project.id);
  const { jobs, now, hydrated: jobsHydrated } = useVideoJobs();
  const [checked, setChecked] = React.useState<string | null>(null);
  const [generate, setGenerate] = React.useState<{ target: VideoTarget; from: string | null } | null>(null);
  // The items are kept as they were on open: a file that vanishes mid-view
  // shows its "lost" copy in the player rather than closing the lightbox.
  const [lightbox, setLightbox] = React.useState<{ index: number; trigger: HTMLElement; items: LightboxVideo[] } | null>(null);
  const headingId = React.useId();
  const tileRefs = React.useRef(new Map<string, HTMLLIElement>());

  // The files are listed before the tiles draw, so a take whose file is gone
  // reads as lost here rather than as a broken poster (P2-VIDEO-19).
  React.useEffect(() => {
    let alive = true;
    verifyClips(project.id)
      .catch(() => undefined)
      .finally(() => {
        if (alive) setChecked(project.id);
      });
    return () => {
      alive = false;
    };
  }, [project.id]);

  const rows: VideoRow[] = products.map((p) => ({
    product: p,
    name: displayProductName(p.name),
    status: productVideoStatus(record?.products[p.id], jobs, now),
  }));
  const ready = rows.filter((r) => r.status.state === "ready");
  const loading = !hydrated || !jobsHydrated || checked !== project.id;

  // Owner with no current products, or a buyer with nothing ready: no group.
  if (owner ? rows.length === 0 : ready.length === 0) return null;
  const shown = owner ? rows : ready;

  const items: LightboxVideo[] = ready.map((r) => ({
    take: (r.status as Extract<ProductVideoStatus, { state: "ready" }>).take,
    productName: r.name,
    productHref: owner ? `/projects/${project.id}/products/${r.product.id}` : null,
  }));
  const openLightbox = (productId: string, trigger: HTMLElement) => {
    const index = ready.findIndex((r) => r.product.id === productId);
    if (index === -1) return;
    trigger.focus();
    setLightbox({ index, trigger, items });
  };
  const closeLightbox = () => {
    const trigger = lightbox?.trigger;
    setLightbox(null);
    trigger?.focus();
  };

  return (
    <div className="mt-7 [container-type:inline-size]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 id={headingId} className="text-sm font-semibold text-text-secondary">
          Videos
        </h3>
        {owner && !loading && <span className="text-sm text-text-secondary">{videosGroupMeta(ready.length, rows.length)}</span>}
      </div>
      <ul
        role="list"
        aria-labelledby={headingId}
        aria-busy={loading || undefined}
        className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[12px] [@container(max-width:439px)]:grid-cols-1"
      >
        {shown.map((r) =>
          loading ? (
            <li key={r.product.id} className="flex flex-col gap-2">
              <span className="block aspect-video w-full rounded-lg bg-bg-subtle motion-safe:animate-pulse" />
              <span className="block h-[12px] w-2/3 rounded bg-bg-subtle motion-safe:animate-pulse" />
            </li>
          ) : (
            <VideoTileCard
              key={r.product.id}
              tileRef={(el) => {
                if (el) tileRefs.current.set(r.product.id, el);
                else tileRefs.current.delete(r.product.id);
              }}
              row={r}
              owner={owner}
              onOpen={(el) => openLightbox(r.product.id, el)}
              onAction={() =>
                setGenerate({
                  target: videoTargetOf(project, r.product),
                  from: r.status.state === "failed" ? r.status.take.id : null,
                })
              }
            />
          ),
        )}
      </ul>

      {lightbox && (
        <VideoLightbox
          items={lightbox.items}
          index={lightbox.index}
          projectId={project.id}
          onIndexChange={(index) => setLightbox((v) => (v ? { ...v, index } : v))}
          onClose={closeLightbox}
        />
      )}
      {owner && (
        <GenerateVideoDialog
          open={generate !== null}
          target={generate?.target ?? null}
          fromTakeId={generate?.from ?? null}
          onClose={() => setGenerate(null)}
          // The tile's own button turns into "Rendering"; its tile takes focus.
          fallbackFocus={() => (generate ? (tileRefs.current.get(generate.target.productId) ?? null) : null)}
        />
      )}
    </div>
  );
}

function VideoTileCard({
  row,
  owner,
  tileRef,
  onOpen,
  onAction,
}: {
  row: VideoRow;
  tileRef: (el: HTMLLIElement | null) => void;
  owner: boolean;
  onOpen: (trigger: HTMLElement) => void;
  onAction: () => void;
}) {
  const { status, name } = row;
  const take: VideoTake | null = status.state === "ready" ? status.take : null;
  const copy = statusCopy(status);
  const action = actionLabel(copy.action);
  const caption = take ? `${name} · ${resolutionOf(take.quality)}` : name;

  return (
    <li
      ref={tileRef}
      tabIndex={-1}
      aria-label={owner && !take ? `${name}: ${copy.text}` : undefined}
      className="flex flex-col gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      {take ? (
        <PosterButton take={take} name={name} onOpen={onOpen} />
      ) : (
        <span className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-border bg-bg-surface">
          <StatusGlyph icon={copy.icon} tone={copy.tone} size={20} />
        </span>
      )}
      <div className="flex flex-col gap-1">
        <span className="truncate text-sm font-semibold text-text-primary">{caption}</span>
        {owner && !take && (
          <>
            <span className="flex items-center gap-2 text-sm text-text-secondary">
              <StatusGlyph icon={copy.icon} tone={copy.tone} size={14} />
              <span>{copy.text}</span>
            </span>
            {copy.progress !== null && <ProgressBar value={copy.progress} label={`${name} video`} className="mt-1" />}
            {copy.sub && <span className="text-xs text-text-tertiary">{copy.sub}</span>}
          </>
        )}
      </div>
      {owner && action && (
        <Button
          type="button"
          hierarchy="secondary"
          size="md"
          className={cn("self-start", TAP)}
          onClick={(e) => {
            // Safari doesn't focus a clicked button; the dialog returns focus here.
            e.currentTarget.focus();
            onAction();
          }}
        >
          {action}
        </Button>
      )}
    </li>
  );
}

/** A ready tile: the in-use poster, a play glyph and its "0:10" chip. */
function PosterButton({ take, name, onOpen }: { take: VideoTake; name: string; onOpen: (trigger: HTMLElement) => void }) {
  const clip = useClipUrl(take.id);
  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget)}
      aria-label={`Play ${name} video`}
      className="group relative block aspect-video w-full overflow-hidden rounded-lg border border-solid border-border bg-bg-surface-raised outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      {clip.state === "ready" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={clip.posterUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-105 motion-reduce:transition-none"
        />
      ) : clip.state === "loading" ? (
        <span className="absolute inset-0 bg-bg-subtle motion-safe:animate-pulse" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-text-tertiary">
          <Icon icon={Image01Icon} size={20} />
        </span>
      )}
      <span aria-hidden className="absolute inset-0 flex items-center justify-center">
        <span className="inline-flex size-[40px] items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-bg-overlay)_72%,transparent)] text-text-on-brand">
          <Icon icon={PlayIcon} size={20} />
        </span>
      </span>
      <span
        aria-hidden
        className="absolute bottom-2 right-2 rounded-md bg-[color-mix(in_srgb,var(--color-bg-overlay)_80%,transparent)] px-[6px] py-[1px] text-xs font-semibold tabular-nums text-text-on-brand"
      >
        0:10
      </span>
    </button>
  );
}

// ─────────────────────────── empty (CNT-13) ───────────────────────────

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

// ─────────────────────────── one tile (CNT-9, CNT-14, CNT-15) ───────────────────────────

/** One image tile. Exported for the product page's Media panel, which draws
 *  that product's own images in the same grid, without cover controls. */
export function MediaTileCard({
  tile,
  isCover,
  coverControl,
  hideCoverChip,
  onOpen,
  onToggleCover,
}: {
  tile: MediaTile;
  isCover: boolean;
  /** "use" → Use as cover; "stop" → Stop using as cover (the maker's own
   *  pick only); null → no toggle (a buyer, or the default cover). */
  coverControl: "use" | "stop" | null;
  hideCoverChip: boolean;
  onOpen: (trigger: HTMLElement) => void;
  onToggleCover?: () => void;
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

      {coverControl && onToggleCover && (
        <IconButton
          hierarchy="secondary"
          size="sm"
          icon={<Icon icon={coverControl === "stop" ? BookmarkCheck02Icon : Bookmark02Icon} size={16} />}
          aria-label={`${coverControl === "stop" ? "Stop using as cover" : "Use as cover"} — ${caption}`}
          title={coverControl === "stop" ? "Stop using as cover" : "Use as cover"}
          onClick={onToggleCover}
          className="absolute right-2 top-2 bg-bg-surface/90 [@media(pointer:coarse)]:size-[var(--touch-min)]"
        />
      )}
    </li>
  );
}

// ─────────────────────────── lightbox (CNT-18) ───────────────────────────

// The lightbox's round controls sit on the dark scrim in both themes: white
// glyphs (text-on-brand is white in both), a faint white wash on hover.
const LIGHTBOX_BUTTON =
  "z-10 inline-flex h-[var(--touch-min)] w-[var(--touch-min)] items-center justify-center rounded-lg text-text-on-brand outline-none transition-colors duration-normal ease-decelerate hover:bg-[color-mix(in_srgb,var(--color-text-on-brand)_10%,transparent)] focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none";

/**
 * CNT-18: opened from a tile; `contain`-fit within ~90vw × 85vh; ←/→ within
 * the group with a counter and the item's name; × and Esc close; one dark
 * scrim; no Desktop/Mobile toggle. Videos have their own (VideoLightbox).
 * It renders through a portal over the page, like every ModalFrame
 * (ideeza/dialog.tsx), and keeps the keyboard the way they do
 * (useDialogFocus): focus starts on ×, Tab stays inside, and closing hands
 * focus back to the tile that opened it. Exported so the Activity drawer and
 * the product page's Media panel reuse it as-is.
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
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const tile = tiles[index];
  useDialogFocus(true, dialogRef, closeRef);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      else if (e.key === "ArrowRight" && index < tiles.length - 1) onIndexChange(index + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, tiles.length, onClose, onIndexChange]);

  if (!tile || typeof document === "undefined") return null;
  const caption = `${tile.name} · v${tile.version}`;

  return createPortal(
    <div
      ref={dialogRef}
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
        className={`absolute right-4 top-4 ${LIGHTBOX_BUTTON}`}
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
          className={`absolute left-4 top-1/2 -translate-y-1/2 ${LIGHTBOX_BUTTON}`}
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
          className={`absolute right-4 top-1/2 -translate-y-1/2 ${LIGHTBOX_BUTTON}`}
        >
          <Icon icon={ArrowRight01Icon} size={22} />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tile.url}
        alt={`${tile.name} concept image, v${tile.version}`}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
      />

      <p onClick={(e) => e.stopPropagation()} className="relative z-10 text-sm text-text-on-brand">
        {index + 1} of {tiles.length} · {caption}
      </p>
    </div>,
    document.body,
  );
}
