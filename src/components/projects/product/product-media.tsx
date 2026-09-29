"use client";

// The product page's Media panel (Phase 2 spec §2.3; VIDEO P2-VIDEO-8 and 11
// as changed in §4.3): `ProductVideoSection` first, then this product's own
// concept images in v1's tile grid. It is PRODUCT_SLOTS.panels.media.
//
// Video, for the owner (can(viewer, "video.generate")):
// - none: a dashed 16:9 box, "No video yet — every product needs one…",
//   with Generate AI video;
// - rendering, ready, failed: the player (or P2-VIDEO-4's panel in its box),
//   Regenerate beside the heading, and the Takes list — play any ready take
//   in the player, make it the one in use, or delete one that isn't;
// - "Made from version {n}" when the take was drawn from another version.
// A buyer sees the in-use video only, and no section when there is none.
// Every video button here is secondary: the page's violet is Open in editor.

import * as React from "react";
import { Delete02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, ConfirmDialog, IconButton } from "@/components/ideeza";
import { GenerateVideoDialog, videoTargetOf } from "@/components/video-jobs/generate-video-dialog";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { VideoPlayer, useClipUrl } from "@/components/video-jobs/video-player";
import { productsOf } from "@/lib/create/history";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { formatDate } from "@/lib/manual/project-summary";
import { verifyClips } from "@/lib/video/clip-store";
import { etaLabel, progressOf } from "@/lib/video/jobs";
import { productVideoStatus } from "@/lib/video/product-video";
import { useProjectVideos } from "@/lib/video/store";
import type { VideoTake } from "@/lib/video/types";
import { FAILURE_COPY, NO_VIDEO_PRODUCT, takeLabel } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { MediaLightbox, MediaTileCard, type MediaTile } from "../details/media-tab";
import type { ProductSlotProps } from "./product-slots";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function ProductMediaPanel(props: ProductSlotProps) {
  return (
    <div className="flex flex-col gap-12">
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
        <h2 id={headingId} className="text-lg font-bold text-text-primary">
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
        <h2 id={headingId} className="text-lg font-bold text-text-primary">
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
        <h2 id={headingId} className="text-lg font-bold text-text-primary">
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
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-border bg-bg-surface px-8 text-center">
          <p className="max-w-[52ch] text-sm text-text-secondary">{NO_VIDEO_PRODUCT}</p>
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
          <VideoPlayer
            take={playing}
            productName={name}
            projectId={project.id}
            owner
            status={status}
            onGenerate={() => openGenerate(playing ?? latest)}
          />
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
              <p role="alert" className="text-sm text-text-error">
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

function TakeRow({
  take,
  inUse,
  playing,
  progress,
  onPlay,
  onUse,
  onDelete,
}: {
  take: VideoTake;
  inUse: boolean;
  playing: boolean;
  progress: { total: number; etaSec: number } | null;
  onPlay: () => void;
  onUse: () => void;
  onDelete: () => void;
}) {
  const ready = !!take.readyAt && !take.failure;
  if (!ready) {
    // A take still rendering, or one that failed: its words and nothing else.
    const line = take.failure
      ? `Take ${take.n} · ${FAILURE_COPY[take.failure.kind]}`
      : progress
        ? `Take ${take.n} · rendering ${Math.round(progress.total)} % · ${etaLabel(progress.etaSec)} left`
        : `Take ${take.n} · ${FAILURE_COPY.interrupted}`;
    return <li className="px-6 py-5 text-sm text-text-secondary">{line}</li>;
  }
  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-4 px-6 py-5">
      <TakePoster take={take} playing={playing} onPlay={onPlay} />
      <span className="min-w-0 flex-1 text-sm text-text-primary">{takeLabel(take, formatDate(take.readyAt!))}</span>
      {inUse ? (
        <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} strokeWidth={2.5} />}>
          In use
        </Badge>
      ) : (
        <span className="flex items-center gap-4">
          <Button type="button" hierarchy="secondary" size="md" className={TAP} onClick={onUse}>
            Use this take
          </Button>
          <IconButton
            hierarchy="ghost"
            size="md"
            icon={<Icon icon={Delete02Icon} size={18} />}
            aria-label={`Delete take ${take.n}`}
            title={`Delete take ${take.n}`}
            onClick={onDelete}
            className="max-md:size-[var(--touch-min)] [@media(pointer:coarse)]:size-[var(--touch-min)]"
          />
        </span>
      )}
    </li>
  );
}

/** 120 × 68: "Play take {n}" loads it into the player, which never autoplays. */
function TakePoster({ take, playing, onPlay }: { take: VideoTake; playing: boolean; onPlay: () => void }) {
  const clip = useClipUrl(take.id);
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Play take ${take.n}`}
      aria-pressed={playing}
      className={cn(
        "relative h-[68px] w-[120px] shrink-0 overflow-hidden rounded-md border border-solid bg-bg-surface-raised outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        playing ? "border-border-brand" : "border-border",
      )}
    >
      {clip.state === "ready" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={clip.posterUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 bg-bg-subtle motion-safe:animate-pulse" />
      )}
    </button>
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
      <h2 id={headingId} className="text-lg font-bold text-text-primary">
        Images
      </h2>
      {tiles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-bg-surface px-8 py-10 text-center text-sm text-text-secondary">
          {"No images yet — this product's concept images from AI builds appear here."}
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
