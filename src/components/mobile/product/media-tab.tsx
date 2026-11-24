"use client";

// The product's Media (Product Details 10f, 10h, 10t, 25a–25d) — the web's
// product Media panel in its words (product-media.tsx). The owner reads it on
// its own screen (`…/media`, from the object page's Media row; owner
// 2026-11-15: the page leads with the video or image itself, the takes are
// one tap away); a buyer in the Media tab:
// - Video, for the owner: "No video yet" and why; a finished take waiting for
//   review ("Video ready · Take 2 to review" + Review, 25a); the player, or
//   the render's state in its box (rendering with its progress and time left,
//   25c; failed with its reason and Try again, 25d; Ready to review); the meta
//   line, "Made from version {n}", What's in this video (a row), the honesty
//   line; Takes — play one, Use this take, In use, delete (25b asks first).
//   The screen's one primary sits in the Bottom action bar: Generate AI video,
//   or Regenerate. Generating and reviewing are the product video screens
//   (`…/video`, the Earn agent's), which every action here opens;
// - a buyer sees the video in use, or no section;
// - Images: this product's concept images across its versions (a buyer's
//   only the version on offer), "Tap an image to see it full size." — the
//   image viewer, full screen.

import * as React from "react";
import Link from "next/link";
import { AlertCircleIcon, CheckmarkCircle02Icon, Delete02Icon, Image02Icon, InformationCircleIcon, PlayCircleIcon, Tick02Icon, Video01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Spinner } from "@/components/ideeza/spinner";
import { useClipUrl } from "@/components/video-jobs/video-player";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { can } from "@/lib/manual/permissions";
import { formatDate } from "@/lib/manual/project-summary";
import { verifyClips } from "@/lib/video/clip-store";
import { describeClip } from "@/lib/video/frames";
import { etaLabel, progressOf } from "@/lib/video/jobs";
import { productVideoStatus } from "@/lib/video/product-video";
import { useProjectVideos } from "@/lib/video/store";
import type { ProductVideoStatus, VideoTake } from "@/lib/video/types";
import { FAILURE_COPY, clipMetaLine, honestyLine, statusCopy, takeLabel } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ListCard, ListRow } from "../kit/list";
import { ImageViewer } from "../kit/image-viewer";
import { Sheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { SectionHeading } from "../project/parts";
import { PhoneVideo } from "../project/video";
import { useProductImages, useVideoStatus } from "./hero";
import { CARD } from "./parts";
import { ProductLoading, ProductMissing, ProjectMissing } from "./states";
import { ProductProvider, useProduct, useProductData } from "./use-product";

const BOX = "flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-md border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface-raised px-8 text-center";

/** `oneHeading`: "Media" heads the panel and the two empty cards sit under it without a heading
 *  each (10t). `screen`: the owner's Media screen, whose Bottom action bar holds Generate /
 *  Regenerate, so the panel doesn't repeat them. */
export function MediaTab({ oneHeading = false, screen = false }: { oneHeading?: boolean; screen?: boolean }) {
  return (
    <div className={cn("flex flex-col", oneHeading ? "gap-6" : "gap-12")}>
      {oneHeading && <SectionHeading title="Media" />}
      <VideoSection bare={oneHeading} screen={screen} />
      <ImagesSection bare={oneHeading} />
    </div>
  );
}

/** The video's state in a few words, for the object page's Media row: the web's words
 *  (`statusCopy`). Since CL-030 a video never stops a share or a sale — a listing waits for it —
 *  so "No video yet" says no more than that (LEAD-1); Generate AI video is the Media screen's
 *  one primary. */
export function videoLine(status: ProductVideoStatus | null): string {
  if (!status) return "Video";
  switch (status.state) {
    case "ready":
      return status.review ? `Video ready · Take ${status.review.n} to review` : `Take ${status.take.n} in use`;
    default:
      return statusCopy(status).text;
  }
}

/** `…/media`: the owner's Media on its own screen. */
export function ProductMediaScreen({ id, productId }: { id: string; productId: string }) {
  const data = useProductData(id, productId);
  if (data.state === "loading") return <ProductLoading />;
  if (data.state === "missing") return <ProjectMissing />;
  if (data.state === "no-product") return <ProductMissing projectName={data.projectName} back={`/m/projects/${encodeURIComponent(data.projectId)}?tab=products`} />;
  return (
    <ProductProvider value={data.ctx}>
      <MediaScreen />
    </ProductProvider>
  );
}

function MediaScreen() {
  const { project, view, product, viewer, path } = useProduct();
  const owner = can(viewer, "video.generate", view.canCtx);
  const status = useVideoStatus();
  const { record } = useProjectVideos(project.id);
  const takes = record?.products[product.id]?.takes ?? [];
  const from = (status?.state === "ready" ? status.take : null) ?? takes[takes.length - 1] ?? null;
  const footer =
    owner && status ? (
      <BottomBar>
        {status.state === "none" ? (
          <Link href={path("video")} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
            Generate AI video
          </Link>
        ) : (
          <Link href={path("video", from ? { from: from.id } : {})} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full border-solid")}>
            Regenerate
          </Link>
        )}
      </BottomBar>
    ) : undefined;
  return (
    <Screen top={<TopBar back={path("")} title="Media" />} footer={footer}>
      <div className="px-8 pb-12 pt-2">
        <MediaTab screen />
      </div>
    </Screen>
  );
}

// ─────────────────────────── Video ───────────────────────────

function VideoSection({ bare, screen }: { bare: boolean; screen: boolean }) {
  const { project, view, product, version, viewer, name, path } = useProduct();
  const owner = can(viewer, "video.generate", view.canCtx);
  const { record, hydrated } = useProjectVideos(project.id);
  const { jobs, now, hydrated: jobsHydrated, pickTake, deleteTake } = useVideoJobs();
  const toast = useToast();
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<VideoTake | null>(null);
  const [showing, setShowing] = React.useState<VideoTake | null>(null);

  React.useEffect(() => {
    void verifyClips(project.id).catch(() => undefined);
  }, [project.id]);

  if (!hydrated || !jobsHydrated) {
    return (
      <section aria-label="Video" aria-busy="true" className="flex flex-col gap-4">
        <SectionHeading title="Video" />
        <div className="aspect-video w-full rounded-md bg-bg-subtle motion-safe:animate-pulse" />
      </section>
    );
  }

  const video = record?.products[product.id];
  const status = productVideoStatus(video, jobs, now);
  const inUse = status.state === "ready" ? status.take : null;
  const takes = video?.takes ?? [];
  const isReady = (t: VideoTake) => !!t.readyAt && !t.failure;
  const picked = playingId ? (takes.find((t) => t.id === playingId && isReady(t)) ?? null) : null;
  const playing = picked ?? inUse;

  if (!owner) {
    if (!inUse) return null;
    return (
      <section aria-labelledby="pd-video" className="flex flex-col gap-4">
        <SectionHeading id="pd-video" title="Video" />
        <Player take={inUse} onWhat={() => setShowing(inUse)} />
        <WhatSheet take={showing} onClose={() => setShowing(null)} />
      </section>
    );
  }

  const videoHref = path("video");
  const waiting = status.state === "review" ? status.take : status.state === "ready" ? (status.review ?? null) : null;
  const copy = statusCopy(status);
  const latest = takes[takes.length - 1] ?? null;
  const madeFrom = (() => {
    const src = playing?.source;
    if (!src) return null;
    if (src.buildId === version?.build.buildId && src.productId === version?.productId) return null;
    return view.refs.find((r) => r.buildId === src.buildId)?.version ?? null;
  })();

  if (status.state === "none") {
    return (
      <section aria-label="Video" className="flex flex-col gap-4">
        {!bare && <SectionHeading title="Video" />}
        <EmptyState
          icon={Video01Icon}
          title="No video yet"
          body="Every product needs one before you can share or sell the project."
          action={screen ? undefined : { label: "Generate AI video", href: videoHref }}
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="pd-video" className="flex flex-col gap-4">
      <SectionHeading
        id="pd-video"
        title="Video"
        action={
          screen ? undefined : (
            <Link href={path("video", (inUse ?? latest) ? { from: (inUse ?? latest)!.id } : {})} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "border-solid")}>
              Regenerate
            </Link>
          )
        }
      />
      <>
          {inUse && waiting && (
            <div className="flex items-center gap-4 rounded-md bg-bg-surface-raised px-6 py-4">
              <span aria-hidden className="text-[color:var(--color-icon-success)]">
                <Icon icon={CheckmarkCircle02Icon} size={20} />
              </span>
              <span className={cn(T.body, "min-w-0 flex-1 text-text-primary")}>{copy.text}</span>
              <Link href={path("video", { review: waiting.id })} className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }))}>
                Review
              </Link>
            </div>
          )}
          {playing ? (
            <Player take={playing} onWhat={() => setShowing(playing)} madeFrom={madeFrom} />
          ) : status.state === "rendering" ? (
            <div className={BOX} role="status">
              <Spinner />
              <span className={T.name}>{copy.text}</span>
              <ProgressBar value={status.progress} label={`${name} video render`} className="w-[220px] max-w-full" />
              <span className={T.meta}>{copy.sub}</span>
            </div>
          ) : status.state === "failed" ? (
            <div className={BOX}>
              <span aria-hidden className="text-[color:var(--color-icon-error)]">
                <Icon icon={AlertCircleIcon} size={28} />
              </span>
              <span className={T.name}>{copy.text}</span>
              <span className={T.meta}>{copy.sub}</span>
              <Link href={path("video", { from: status.take.id })} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }))}>
                Try again
              </Link>
            </div>
          ) : waiting ? (
            <div className={BOX}>
              <span className={T.name}>Ready to review</span>
              <Link href={path("video", { review: waiting.id })} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }))}>
                Review
              </Link>
            </div>
          ) : null}
          <div className="flex flex-col gap-4">
            <h3 className={T.name}>Takes</h3>
            <ul aria-label="Takes" className={CARD}>
              {[...takes].reverse().map((t) => {
                const job = jobs.find((j) => j.id === t.id);
                const prog = job && job.stage !== "done" && job.stage !== "failed" ? progressOf(job, now) : null;
                return (
                  <TakeLine
                    key={t.id}
                    take={t}
                    inUse={inUse?.id === t.id}
                    playing={playing?.id === t.id}
                    progress={prog}
                    onPlay={() => setPlayingId(t.id)}
                    onUse={() => {
                      if (pickTake(project.id, product.id, t.id).ok) {
                        setPlayingId(t.id);
                        toast({ title: `Take ${t.n} is in use.` });
                      } else toast({ title: "That take couldn't be put in use. Try again.", lead: "error" });
                    }}
                    onDelete={() => setDeleting(t)}
                  />
                );
              })}
            </ul>
          </div>
      </>
      <WhatSheet take={showing} onClose={() => setShowing(null)} />
      <ConfirmSheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete take ${deleting?.n ?? ""}?`}
        body="This video is removed from this browser. It can't be undone."
        verb="Delete take"
        destructive
        onConfirm={() => {
          const t = deleting;
          if (!t) return;
          if (deleteTake(project.id, product.id, t.id).ok) {
            if (playingId === t.id) setPlayingId(null);
            toast({ title: `Take ${t.n} deleted.` });
          } else toast({ title: "That take couldn't be deleted. Try again.", lead: "error" });
        }}
      />
    </section>
  );
}

/** Mobile / Video player, its meta line, What's in this video and the honesty line. */
function Player({ take, onWhat, madeFrom = null }: { take: VideoTake; onWhat: () => void; madeFrom?: number | null }) {
  const { name } = useProduct();
  return (
    <div className="flex flex-col gap-3">
      <PhoneVideo takeId={take.id} label={`${name} video`} />
      <p className={T.meta}>{clipMetaLine(take, formatDate(take.readyAt ?? take.createdAt))}</p>
      {madeFrom !== null && <p className={T.meta}>Made from version {madeFrom}</p>}
      <ListCard label="About this video">
        <ListRow icon={InformationCircleIcon} title="What’s in this video" onClick={onWhat} />
      </ListCard>
      <p className={T.meta}>{honestyLine(name)}</p>
    </div>
  );
}

function WhatSheet({ take, onClose }: { take: VideoTake | null; onClose: () => void }) {
  const { name } = useProduct();
  const clip = useClipUrl(take?.id ?? null);
  const lines = take ? describeClip(take, name, clip.state === "ready" ? clip.usedImage : take.source !== null) : [];
  return (
    <Sheet open={take !== null} onClose={onClose} title="What's in this video" description={take ? `Take ${take.n}` : undefined}>
      <ul className={cn(T.body, "flex list-disc flex-col gap-2 pb-8 pl-8")}>
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </Sheet>
  );
}

function TakeLine({
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
    const line = take.failure
      ? `Take ${take.n} · ${FAILURE_COPY[take.failure.kind]}`
      : progress
        ? `Take ${take.n} · rendering ${Math.round(progress.total)} % · ${etaLabel(progress.etaSec)} left`
        : `Take ${take.n} · ${FAILURE_COPY.interrupted}`;
    return <li className={cn(T.body, "p-6")}>{line}</li>;
  }
  return (
    <li className="flex items-center gap-4 p-4">
      <TakePoster take={take} playing={playing} onPlay={onPlay} />
      <span className={cn(T.meta, "min-w-0 flex-1 text-text-primary")}>{takeLabel(take, formatDate(take.readyAt!))}</span>
      {inUse ? (
        <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
          In use
        </Badge>
      ) : (
        <>
          <Button hierarchy="secondary" size="lg" onClick={onUse}>
            Use this take
          </Button>
          <Button hierarchy="ghost" size="xl" iconOnly aria-label={`Delete take ${take.n}`} onClick={onDelete}>
            <Icon icon={Delete02Icon} size={20} />
          </Button>
        </>
      )}
    </li>
  );
}

function TakePoster({ take, playing, onPlay }: { take: VideoTake; playing: boolean; onPlay: () => void }) {
  const clip = useClipUrl(take.id);
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Play take ${take.n}`}
      aria-pressed={playing}
      className={cn(
        "relative flex h-[44px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-md border-[length:var(--border-width-1)] border-solid bg-bg-surface-raised outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        playing ? "border-border-brand" : "border-border",
      )}
    >
      {clip.state === "ready" ? (
        // eslint-disable-next-line @next/next/no-img-element -- a take's poster from this browser's clip store
        <img src={clip.posterUrl} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span aria-hidden className="text-[color:var(--color-icon-secondary)]">
          <Icon icon={PlayCircleIcon} size={20} />
        </span>
      )}
    </button>
  );
}

// ─────────────────────────── Images ───────────────────────────

function ImagesSection({ bare }: { bare: boolean }) {
  const { name } = useProduct();
  const tiles = useProductImages();
  const [at, setAt] = React.useState<number | null>(null);
  const shown = at !== null ? (tiles[at] ?? null) : null;
  if (tiles.length === 0) {
    return (
      <section aria-label="Images" className="flex flex-col gap-4">
        {!bare && <SectionHeading title="Images" />}
        <EmptyState icon={Image02Icon} title="No images yet" body="Concept images from its AI builds show here." />
      </section>
    );
  }
  return (
    <section aria-labelledby="pd-images" className="flex flex-col gap-4">
      <SectionHeading id="pd-images" title="Images" />
      <ul className="grid grid-cols-2 gap-6">
        {tiles.map((t, i) => (
          <li key={t.key}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`${name}, version ${t.version}`}
              onClick={() => setAt(i)}
              className="flex w-full flex-col gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-md bg-bg-surface-raised">
                {/* eslint-disable-next-line @next/next/no-img-element -- a concept image from the build store */}
                <img src={t.url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
              </span>
              <span className={T.meta}>
                {name} · v{t.version}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className={T.meta}>Tap an image to see it full size.</p>
      <ImageViewer
        open={shown !== null}
        onClose={() => setAt(null)}
        index={at ?? 0}
        count={tiles.length}
        onIndex={setAt}
        src={shown?.url ?? null}
        alt={shown ? `${name}, version ${shown.version}` : ""}
        caption={shown ? `${name} · v${shown.version}` : undefined}
        noun="Image"
      />
    </section>
  );
}
