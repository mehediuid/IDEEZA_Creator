"use client";

// The product page's Media panel (Phase 2 spec §2.3; VIDEO P2-VIDEO-8 and 11
// as changed in §4.3): `ProductVideoSection` first, then this product's own
// concept images in v1's tile grid. It is PRODUCT_SLOTS.panels.media.
//
// Video, for the owner (can(viewer, "video.generate")):
// - none: one compact dashed row, "No video yet" and why, with Generate AI
//   video;
// - rendering, ready, failed: the player (or P2-VIDEO-4's panel in its box),
//   Regenerate beside the heading, and the Takes list — play any ready take
//   in the player, make it the one in use, or delete one that isn't;
// - "Made from version {n}" when the take was drawn from another version.
// A buyer sees the in-use video only, and no section when there is none.
// Every video button here is secondary: the page's violet is Open in editor.

import * as React from "react";
import { Button, ConfirmDialog } from "@/components/ideeza";
import { GenerateVideoDialog, videoTargetOf } from "@/components/video-jobs/generate-video-dialog";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { TakeRow } from "@/components/video-jobs/take-row";
import { VideoPlayer } from "@/components/video-jobs/video-player";
import { productsOf } from "@/lib/create/history";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { verifyClips } from "@/lib/video/clip-store";
import { progressOf } from "@/lib/video/jobs";
import { productVideoStatus } from "@/lib/video/product-video";
import { useProjectVideos } from "@/lib/video/store";
import type { VideoTake } from "@/lib/video/types";

/** Under "No video yet": why it matters, in one line. */
const NO_VIDEO_LINE = "Every product needs one before you can share or sell the project.";
import { MediaLightbox, MediaTileCard, type MediaTile } from "../details/media-tab";
import type { ProductSlotProps } from "./product-slots";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function ProductMediaPanel(props: ProductSlotProps) {
  return (
    <div className="flex flex-col gap-12 [container-type:inline-size]">
      <ProductVideoSection {...props} />
      <ProductImages {...props} />
    </div>
  );
}

// ─────────────────────────── Video ───────────────────────────

export function ProductVideoSection({ project, view, product, version, viewer, announce }: ProductSlotProps) {
  const owner = can(viewer, "video.generate", view.canCtx);
  const { record, hydrated } = useProjectVideos(project.id);
  const { jobs, now, hydrated: jobsHydrated, pickTake, deleteTake } = useVideoJobs();
  const [generate, setGenerate] = React.useState<{ from: string | null } | null>(null);
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<VideoTake | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const headingId = React.useId();
  const sectionRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    void verifyClips(project.id).catch(() => undefined);
  }, [project.id]);

  const name = displayProductName(product.name);
  const video = record?.products[product.id];
  const status = productVideoStatus(video, jobs, now);
  const inUse = status.state === "ready" ? status.take : null;
  const takes = video?.takes ?? [];
  const isReady = (t: VideoTake) => !!t.readyAt && !t.failure;
  const picked = playingId ? takes.find((t) => t.id === playingId && isReady(t)) ?? null : null;
  const playing = picked ?? inUse;

  if (!hydrated || !jobsHydrated) {
    return (
      <section aria-labelledby={headingId} aria-busy="true" className="flex flex-col gap-6">
        <h2 id={headingId} className="text-2xl font-semibold leading-2xl text-text-primary">
          Video
        </h2>
        <div className="aspect-video w-full rounded-xl bg-bg-subtle motion-safe:animate-pulse" />
      </section>
    );
  }

  // The buyer: the in-use video, or nothing at all.
  if (!owner) {
    if (!inUse) return null;
    return (
      <section aria-labelledby={headingId} className="flex flex-col gap-6">
        <h2 id={headingId} className="text-2xl font-semibold leading-2xl text-text-primary">
          Video
        </h2>
        <VideoPlayer take={inUse} productName={name} projectId={project.id} />
      </section>
    );
  }

  const target = videoTargetOf(project, product);
  const latest = takes[takes.length - 1] ?? null;
  const openGenerate = (from: VideoTake | null) => {
    // Safari doesn't focus a clicked button; the dialog returns focus to it.
    if (document.activeElement === document.body) sectionRef.current?.focus();
    setGenerate({ from: from?.id ?? null });
  };
  const focusSelf = (e: React.MouseEvent<HTMLElement>) => e.currentTarget.focus();

  // "Made from version {n}": the take was drawn from another version's build.
  const madeFrom = (() => {
    const src = playing?.source;
    if (!src) return null;
    if (src.buildId === version?.build.buildId && src.productId === version?.productId) return null;
    return view.refs.find((r) => r.buildId === src.buildId)?.version ?? null;
  })();

  return (
    <section ref={sectionRef} tabIndex={-1} aria-labelledby={headingId} className="flex flex-col gap-6 outline-none">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h2 id={headingId} className="text-2xl font-semibold leading-2xl text-text-primary">
          Video
        </h2>
        {status.state !== "none" && (
          <Button
            type="button"
            hierarchy="secondary"
            size="md"
            className={TAP}
            onClick={(e) => {
              focusSelf(e);
              openGenerate(inUse ?? latest);
            }}
          >
            Regenerate
          </Button>
        )}
      </div>

      {status.state === "none" ? (
        // One compact row, not an empty 16:9 box (owner, 2026-10-11).
        <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border bg-bg-surface px-8 py-6 [@container(min-width:560px)]:flex-row [@container(min-width:560px)]:items-center [@container(min-width:560px)]:justify-between [@container(min-width:560px)]:gap-8">
          <p className="flex max-w-[52ch] flex-col gap-1 text-md text-text-secondary">
            <span className="text-md font-semibold text-text-primary">No video yet</span>
            {NO_VIDEO_LINE}
          </p>
          <Button
            type="button"
            hierarchy="secondary"
            size="md"
            className={TAP}
            onClick={(e) => {
              focusSelf(e);
              openGenerate(null);
            }}
          >
            Generate AI video
          </Button>
        </div>
      ) : (
        <>
          {/* No Generate again inside the player: Regenerate above is the one way to a new take. */}
          <VideoPlayer take={playing} productName={name} projectId={project.id} owner status={status} />
          {madeFrom !== null && <p className="text-sm text-text-secondary">Made from version {madeFrom}</p>}

          <div className="flex flex-col gap-4">
            <h3 className="text-md font-semibold text-text-primary">Takes</h3>
            <ul role="list" aria-label="Takes" className="flex flex-col divide-y divide-border rounded-lg border border-solid border-border">
              {[...takes].reverse().map((t) => (
                <TakeRow
                  key={t.id}
                  take={t}
                  inUse={inUse?.id === t.id}
                  playing={playing?.id === t.id}
                  progress={(() => {
                    const job = jobs.find((j) => j.id === t.id);
                    return job && job.stage !== "done" && job.stage !== "failed" ? progressOf(job, now) : null;
                  })()}
                  onPlay={() => setPlayingId(t.id)}
                  onUse={() => {
                    setError(null);
                    if (pickTake(project.id, product.id, t.id).ok) {
                      setPlayingId(t.id);
                      announce(`Take ${t.n} is now ${name}'s video.`);
                    } else setError("That take couldn't be put in use. Try again.");
                  }}
                  onDelete={() => setDeleting(t)}
                />
              ))}
            </ul>
            {error && (
              <p role="alert" className="text-md text-text-error">
                {error}
              </p>
            )}
          </div>
        </>
      )}

      <GenerateVideoDialog
        open={generate !== null}
        target={target}
        fromTakeId={generate?.from ?? null}
        onClose={() => setGenerate(null)}
        // "Generate AI video" gives way to Regenerate once a take exists.
        fallbackFocus={() =>
          [...(sectionRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find(
            (b) => b.textContent?.trim() === "Regenerate",
          ) ?? null
        }
      />
      <ConfirmDialog
        open={deleting !== null}
        title={`Delete take ${deleting?.n ?? ""}?`}
        confirmLabel="Delete take"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const t = deleting;
          setDeleting(null);
          if (!t) return;
          if (deleteTake(project.id, product.id, t.id).ok) {
            if (playingId === t.id) setPlayingId(null);
            announce(`Take ${t.n} deleted.`);
          } else setError("That take couldn't be deleted. Try again.");
        }}
      >
        {"This video is removed from this browser. It can't be undone."}
      </ConfirmDialog>
    </section>
  );
}

// ─────────────────────────── Images ───────────────────────────

/** This product's concept images across its versions, newest first, each
 *  image once — the project Media tab's tiles, for one product. Version
 *  history is the owner's: anyone else gets the version on screen only. */
function productImageTiles({ view, product, version, viewer }: Pick<ProductSlotProps, "view" | "product" | "version" | "viewer">): MediaTile[] {
  // A hand-made product has no build, so no version and no images.
  const at = version?.build.buildId ?? product.built?.ref.buildId;
  const lineage = at ? (view.versions.find((g) => g.some((x) => x.buildId === at)) ?? []) : [];
  const group = can(viewer, "facts.seeOwnerOnly") ? lineage : lineage.filter((x) => x.buildId === at);
  const seen = new Set<string>();
  const tiles: MediaTile[] = [];
  for (const x of [...group].sort((a, b) => b.version - a.version)) {
    if (!x.job) continue;
    const id =
      x.products.find((p) => p.rowId === product.id)?.productId ??
      (x.buildId === product.built?.ref.buildId ? product.built.product.id : null);
    if (!id) continue;
    const bp = productsOf(x.job).find((p) => p.id === id);
    const url = bp?.conceptImageUrl;
    if (!bp || !url || seen.has(url)) continue;
    seen.add(url);
    tiles.push({
      key: `${x.buildId}:${id}`,
      url,
      name: displayProductName(product.name),
      version: x.version,
      buildId: x.buildId,
      productId: id,
    });
  }
  return tiles;
}

function ProductImages(props: ProductSlotProps) {
  const tiles = React.useMemo(() => productImageTiles(props), [props]);
  const [lightbox, setLightbox] = React.useState<{ index: number; trigger: HTMLElement } | null>(null);
  const headingId = React.useId();
  const close = () => {
    const trigger = lightbox?.trigger;
    setLightbox(null);
    trigger?.focus();
  };
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <h2 id={headingId} className="text-2xl font-semibold leading-2xl text-text-primary">
        Images
      </h2>
      {tiles.length === 0 ? (
        <p className="flex flex-col gap-1 rounded-xl border border-dashed border-border bg-bg-surface px-8 py-6 text-md text-text-secondary">
          <span className="text-md font-semibold text-text-primary">No images yet</span>
          {"Concept images from its AI builds show here."}
        </p>
      ) : (
        <ul role="list" className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6">
          {tiles.map((tile, i) => (
            <MediaTileCard
              key={tile.key}
              tile={tile}
              isCover={false}
              coverControl={null}
              hideCoverChip
              onOpen={(el) => {
                el.focus();
                setLightbox({ index: i, trigger: el });
              }}
            />
          ))}
        </ul>
      )}
      {lightbox && (
        <MediaLightbox
          tiles={tiles}
          index={lightbox.index}
          onIndexChange={(index) => setLightbox((v) => (v ? { ...v, index } : v))}
          onClose={close}
        />
      )}
    </section>
  );
}
