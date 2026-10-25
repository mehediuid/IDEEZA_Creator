"use client";

// The post's media stage (plan §5): one 16:9 stage and, when there is more
// than one, a row of thumbnails that picks what it shows. It opens on the
// project video, which stands for the whole project (owner, 2026-10-21), then
// each product's video in product order (owner, 2026-10-13: every post and
// every product starts with its video), then the images.
// A shared project's video plays in the app's own player (its clip read from
// this browser's clip store); a sample post's video is a file, in the
// browser's player, never autoplaying (with Data saver on it doesn't even
// preload). An image opens the media lightbox,
// which steps through the post's images. Nothing renders when the post has no
// media.

import * as React from "react";
import { PlayIcon, VideoReplayIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { MediaLightbox, type MediaTile } from "@/components/projects/details/media-tab";
import { useClipUrl, VideoPlayer } from "@/components/video-jobs/video-player";
import type { InnovationPost, PostMedia, PostVideo } from "@/lib/innovations/types";
import { isProjectKey } from "@/lib/video/project-video";
import type { VideoTake } from "@/lib/video/types";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { durationLabel, ImageGone, PostImg } from "./post-bits";
import type { MinePostFacts } from "./use-post";

/** 16:9 across the story column, but never so tall that the title under it
 *  leaves the first screen: on a wide, short window (an ultrawide, a docked
 *  laptop) its width stops where its height would pass the window less the
 *  room the crumbs, thumbnails and title take. It keeps the column's left edge. */
const STAGE =
  "relative aspect-video w-full max-w-[calc((100dvh-var(--spacing-48)*3)*16/9)] overflow-hidden rounded-2xl border border-solid border-border bg-bg-surface-raised";

/** A "mine" post's take by id, from the project's videos. */
export function takeOf(mine: MinePostFacts | null, takeId: string): VideoTake | null {
  const products = mine?.view.videos.record?.products;
  if (!products) return null;
  for (const pv of Object.values(products)) {
    const take = pv.takes.find((t) => t.id === takeId);
    if (take) return take;
  }
  return null;
}

/** An image as the lightbox takes it. */
export function lightboxTile(src: string, name: string): MediaTile {
  return { key: src, url: src, name, version: 1, buildId: "", productId: "" };
}

export function PostMediaStage({ post, mine, className }: { post: InnovationPost; mine: MinePostFacts | null; className?: string }) {
  const [at, setAt] = React.useState(0);
  const [zoom, setZoom] = React.useState<number | null>(null);
  const media = post.media;
  const images = React.useMemo(
    () => media.filter((m): m is Extract<PostMedia, { kind: "image" }> => m.kind === "image"),
    [media],
  );
  const tiles = React.useMemo(() => images.map((m) => lightboxTile(m.src, m.label)), [images]);
  if (media.length === 0) return null;
  const cur = media[Math.min(at, media.length - 1)];

  return (
    <div data-tour="post-media" className={cn("flex flex-col gap-6", className)}>
      {cur.kind !== "image" ? (
        <PostVideoStage key={mediaKey(cur)} post={post} mine={mine} video={cur} />
      ) : (
        <button
          type="button"
          onClick={() => setZoom(images.indexOf(cur))}
          aria-label={`${cur.alt}. Open it larger`}
          className={cn(STAGE, "group block cursor-zoom-in p-0 outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-page")}
        >
          <PostImg src={cur.src} className="absolute inset-0 h-full w-full object-cover" fallback={<ImageGone label="Image didn't load" />} />
        </button>
      )}

      {media.length > 1 && (
        <div role="group" aria-label="The post's media" className="flex flex-wrap gap-5">
          {media.map((m, i) => (
            <Thumb key={mediaKey(m)} media={m} on={i === Math.min(at, media.length - 1)} onPick={() => setAt(i)} />
          ))}
        </div>
      )}

      {zoom !== null && zoom >= 0 && (
        <MediaLightbox tiles={tiles} index={zoom} onIndexChange={setZoom} onClose={() => setZoom(null)} />
      )}
    </div>
  );
}

const mediaKey = (m: PostMedia) => (m.kind === "clip" ? m.takeId : m.src);

/** A product's video in the 16:9 stage: a shared project's clip in the app's player, a sample's file in the browser's. */
export function PostVideoStage({ post, mine, video }: { post: InnovationPost; mine: MinePostFacts | null; video: PostVideo }) {
  return video.kind === "clip" ? <ClipStage post={post} mine={mine} media={video} /> : <FileVideoStage video={video} />;
}

const noSubscribe = () => () => {};

function FileVideoStage({ video }: { video: Extract<PostVideo, { kind: "video" }> }) {
  const [failed, setFailed] = React.useState(false);
  // Settings › Appearance › Data saver: not a byte until Play is pressed. The
  // server's HTML can't know the setting, so the first paint never preloads;
  // with Data saver off, metadata loads once the page is running.
  const dataSaver = useSettings().appearance.dataSaver;
  const running = React.useSyncExternalStore(noSubscribe, () => true, () => false);
  if (failed) {
    return (
      <div className={cn(STAGE, "flex flex-col items-center justify-center gap-4 px-8 text-center")}>
        <span aria-hidden className="text-text-tertiary">
          <Icon icon={VideoReplayIcon} size={24} />
        </span>
        <p className="max-w-[44ch] text-md leading-md text-text-secondary">This video didn&apos;t load.</p>
      </div>
    );
  }
  return (
    <div className={STAGE}>
      {/* The clip carries its words on screen and has no sound, so it needs no captions track. */}
      <video
        src={video.src}
        poster={video.poster ?? undefined}
        controls
        playsInline
        preload={running && !dataSaver ? "metadata" : "none"}
        aria-label={video.alt}
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}

function ClipStage({ post, mine, media }: { post: InnovationPost; mine: MinePostFacts | null; media: Extract<PostMedia, { kind: "clip" }> }) {
  const take = takeOf(mine, media.takeId);
  if (!take || !mine) {
    return (
      <div className={cn(STAGE, "flex flex-col items-center justify-center gap-4 px-8 text-center")}>
        <span aria-hidden className="text-text-tertiary">
          <Icon icon={VideoReplayIcon} size={24} />
        </span>
        <p className="max-w-[44ch] text-md leading-md text-text-secondary">This video isn&apos;t in this browser.</p>
      </div>
    );
  }
  // The project video is the whole project's: named after it, never looked up among the products.
  const name = isProjectKey(take.productId)
    ? post.title
    : (post.products.find((p) => p.id === take.productId)?.name ?? media.label);
  return <VideoPlayer take={take} productName={name} projectId={mine.project.id} />;
}

function Thumb({ media, on, onPick }: { media: PostMedia; on: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={on}
      aria-label={`Show ${media.label}`}
      className={cn(
        "relative aspect-[4/3] w-[96px] shrink-0 overflow-hidden rounded-lg bg-bg-surface-raised p-0 outline-none transition-shadow duration-fast ease-out focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-page max-md:w-[64px] motion-reduce:transition-none",
        on ? "ring-2 ring-border-brand ring-offset-2 ring-offset-bg-page" : "border border-solid border-border",
      )}
    >
      {media.kind === "clip" ? (
        <ClipPoster takeId={media.takeId} duration={durationLabel(media.durationMs)} />
      ) : media.kind === "video" ? (
        <>
          {media.poster ? (
            <PostImg src={media.poster} className="block h-full w-full object-cover" fallback={<ImageGone />} />
          ) : (
            <span aria-hidden className="flex h-full w-full items-center justify-center text-text-tertiary">
              <Icon icon={PlayIcon} size={18} />
            </span>
          )}
          <PlayBadge duration={durationLabel(media.durationMs)} />
        </>
      ) : (
        <PostImg src={media.src} className="block h-full w-full object-cover" fallback={<ImageGone />} />
      )}
    </button>
  );
}

function PlayBadge({ duration }: { duration: string | null }) {
  return (
    <span
      aria-hidden
      className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-sm bg-[color-mix(in_srgb,var(--color-bg-overlay)_72%,transparent)] px-2 text-xs font-semibold leading-xs text-text-on-brand"
    >
      <Icon icon={PlayIcon} size={10} />
      {duration ?? "Video"}
    </span>
  );
}

function ClipPoster({ takeId, duration }: { takeId: string; duration: string | null }) {
  const clip = useClipUrl(takeId);
  return (
    <>
      {clip.state === "ready" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={clip.posterUrl} alt="" className="block h-full w-full object-cover" />
      ) : (
        <span aria-hidden className="flex h-full w-full items-center justify-center text-text-tertiary">
          <Icon icon={PlayIcon} size={18} />
        </span>
      )}
      <PlayBadge duration={duration} />
    </>
  );
}
