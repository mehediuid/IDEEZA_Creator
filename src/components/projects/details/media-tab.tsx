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
import { createPortal } from "react-dom";
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
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { Badge, Banner, Button, IconButton, linkVariants } from "@/components/ideeza";
import { productsOf } from "@/lib/create/history";
import { stepHref, useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { coverOf, type BuildRef } from "@/lib/manual/project-read";
import { can, type Viewer } from "@/lib/manual/permissions";
import type { StoredDraft } from "@/lib/brief/project-brief";
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

// ─────────────────────────── the tab ───────────────────────────

export type MediaTabProps = {
  project: ManualProject;
  /** `buildsOf(project, builds)` — computed once by the page shell (COR-74:
   *  one derivation feeds the page; this tab never derives its own). The
   *  page shows its skeleton until every store is read (COR-2), so this tab
   *  never renders before its data — the empty state can't flash first. */
  refs: BuildRef[];
  /** The project's Brief draft (COM-1's `useProjectBrief`, read once by the
   *  page shell) — `null` when there is none. CNT-19 reads only
   *  `draft.state.videoJobId` from it. */
  draft: StoredDraft | null;
  viewer: Viewer;
};

export function MediaTab({ project, refs, draft, viewer }: MediaTabProps) {
  const { setCover } = useManualProjects();
  const [expanded, setExpanded] = React.useState(false);
  const [lightbox, setLightbox] = React.useState<{ index: number; trigger: HTMLElement } | null>(null);

  const tiles = React.useMemo(() => mediaTilesOf(refs), [refs]);
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

  const buyerView = viewer.kind === "owner-preview"; // CNT-27: no Cover chip, no menus, in Preview as buyer.
  const showCoverControl = !buyerView && can(viewer, "product.edit");
  const canOpenBrief = can(viewer, "project.brief"); // PPL-6: the preview-clip note's Open Brief is owner-only.
  const videoJobId = draft?.state.videoJobId ?? null;

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

      {videoJobId && (
        <Banner tone="info" className="mt-7">
          {"Preview clip — made in the Brief. Rendering is simulated in this prototype, so there's no video file to show yet."}
          {canOpenBrief && (
            <>
              {" "}
              {/* Neutral, underlined: the page's one violet is its primary action. */}
              <Link
                href={stepHref(project, "brief")}
                className={cn(linkVariants({ color: "neutral", size: "md" }), "font-semibold underline underline-offset-2")}
              >
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
            {shown.map((tile, i) => {
              const isCover = tile.url === coverUrl;
              return (
                <MediaTileCard
                  key={tile.key}
                  tile={tile}
                  isCover={isCover}
                  // Use as cover on every other tile; Stop only on the maker's own pick.
                  coverControl={!showCoverControl ? null : !isCover ? "use" : pinned ? "stop" : null}
                  hideCoverChip={buyerView}
                  onOpen={(el) => openLightbox(i, el)}
                  onToggleCover={() =>
                    setCover(project.id, isCover ? null : { buildId: tile.buildId, productId: tile.productId })
                  }
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
    </section>
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

function MediaTileCard({
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

      {coverControl && (
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
 * scrim; no Desktop/Mobile toggle; never a play button (there are no video
 * files in NOW). It renders through a portal over the page, like every
 * ModalFrame (ideeza/dialog.tsx), and keeps the keyboard the way they do
 * (useDialogFocus): focus starts on ×, Tab stays inside, and closing hands
 * focus back to the tile that opened it. Exported so the Activity drawer can
 * reuse it as-is (NEXT).
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
