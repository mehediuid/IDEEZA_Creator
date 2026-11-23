"use client";

// 03 · Media (03, 03b, 03c, 03f–03h): the web's Media tab on a screen of its
// own (`?tab=media`, the page's Media row), in its order —
// · Project video: while there is none (or it is out of date, rendering,
//   failed) its card says why; the web's action (Make project video, Update,
//   Try again, Review → the Project video screen, 03d / 03e) is the screen's
//   bar. Once ready, the player, "Take n · 480p · 19 s · Made {date}", then
//   rows: What's in this video (the scenes, a sheet), Takes (n) (a sheet: In
//   use, Use this, delete — the take's file goes, 03f) and Regenerate;
// · Product videos: one whole-row tap per current product (the web shows a
//   tile): a ready one plays in a sheet; one with the owner's action (Generate
//   AI video, Try again, Review) says its state with the web's action word and
//   opens that product's video maker on the right take, as the web's tile
//   button opens Generate video and the readiness rows go (PRJ-4,
//   `phoneVideoActionHref`) — a ready video with a newer take waiting says so
//   ("Video ready · Take 2 to review") and opens its review; one rendering
//   shows its progress;
// · Assembly snapshots (owner): the pictures Product Preview's Snapshot kept,
//   as the web's Media tab lists them; a tap opens the viewer, where Remove
//   asks first;
// · From your builds: the concept images in a 3-column grid, the Cover chip
//   on the cover; a tap opens the image viewer (03b), where "Use as cover"
//   lives (03g "This image is the cover", 03h the toast). The page's cover
//   opens the same viewer (`BuildImagesViewer`).
// Every picture opens in the kit's one full-screen viewer (kit/image-viewer:
// dark in both themes, white text, ✕, "n of N", the caption, ← action →).

import * as React from "react";
import Link from "next/link";
import {
  Alert02Icon,
  Bookmark02Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  Film01Icon,
  ListViewIcon,
  LockIcon,
  PlayCircleIcon,
  PlayIcon,
  RepeatIcon,
  Tick02Icon,
  VideoOffIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { mediaTilesOf } from "@/components/projects/details/media-tab";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { coverOf } from "@/lib/manual/project-read";
import { formatDate } from "@/lib/manual/project-summary";
import { useManualProjects } from "@/lib/manual/projects";
import { currentProductsOf } from "@/lib/manual/readiness";
import { phoneProjectPath } from "@/lib/manual/phone-project";
import { describeJoin, projectVideoStatusOf } from "@/lib/video/project-video";
import { productVideoStatus } from "@/lib/video/product-video";
import { phoneVideoActionHref } from "@/lib/video/phone-video";
import { readSnapshots, removeSnapshot, type Snapshot } from "@/lib/manual/snapshots";
import { useProjectVideos } from "@/lib/video/store";
import { PROJECT_VIDEO_KEY, type VideoTake } from "@/lib/video/types";
import {
  PROJECT_GROUP_META,
  PROJECT_VIDEO_TITLE,
  actionLabel,
  projectActionLabel,
  projectRowCopy,
  resolutionOf,
  statusCopy,
  videosGroupMeta,
} from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ImageViewer } from "../kit/image-viewer";
import { Chevron, ListCard as KitListCard, ListRow } from "../kit/list";
import { MEDIA_GROUND, MEDIA_INK } from "../kit/media";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { PRESSED } from "../kit/press";
import { T } from "../type";
import { useProject } from "./context";
import { LIST_CARD, LIST_ROW, ListCard, SectionHeading, Thumb } from "./parts";
import { PhoneVideo } from "./video";

export function MediaTab() {
  return (
    <div className="flex flex-col gap-12">
      <ProjectVideoSection />
      <ProductVideosSection />
      <SnapshotsSection />
      <BuildImagesSection />
    </div>
  );
}

const TONE_ICON: Record<string, IconValue> = {
  lock: LockIcon,
  check: CheckmarkCircle02Icon,
  alert: Alert02Icon,
  info: Alert02Icon,
  eye: PlayCircleIcon,
  spinner: PlayCircleIcon,
  cross: VideoOffIcon,
};

const TONE_INK: Record<string, string> = {
  success: "text-text-success",
  error: "text-text-error",
  warning: "text-text-warning",
  brand: "text-text-brand",
  neutral: "text-text-secondary",
};

function SectionMeta({ title, meta }: { title: string; meta: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className={T.section}>{title}</h2>
      {meta && <span className={T.meta}>{meta}</span>}
    </div>
  );
}

// ─────────────────────────── Project video (03, 03c, 03f) ───────────────────────────

/** The project video's state, its takes and its one action (Make project video, Update, Try
 *  again, Review → the Project video screen), read by the section and the screen's bar. */
function useProjectVideoState() {
  const { project, view, viewer } = useProject();
  const owner = can(viewer, "video.generate", view.canCtx);
  const { record } = useProjectVideos(project.id);
  const { jobs, now } = useVideoJobs();
  const current = currentProductsOf(view.products);
  const status = projectVideoStatusOf({ products: view.products, videos: record, jobs, now });
  const copy = projectRowCopy(status);
  const v = status.video;
  const inUse = v.state === "ready" ? v.take : null;
  const takes = record?.products[PROJECT_VIDEO_KEY]?.takes ?? [];
  const videoHref = phoneProjectPath(project.id, "video");
  const toReview = copy.action === "review" ? (status.review ?? (v.state === "review" ? v.take : null)) : null;
  const actionHref = toReview ? `${videoHref}?review=${encodeURIComponent(toReview.id)}` : videoHref;
  return { owner, current, status, copy, v, inUse, takes, videoHref, actionHref, actionText: projectActionLabel(copy.action) };
}

/** The Media screen's one primary: the project video's action, when it has one. */
export function MediaBar() {
  const { owner, current, actionText, actionHref } = useProjectVideoState();
  // One product: its video is the project's, so there is nothing to make here (owner, 2026-11-17).
  if (!owner || current.length < 2 || !actionText) return null;
  return (
    <BottomBar className="pt-8">
      <Link href={actionHref} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
        {actionText}
      </Link>
    </BottomBar>
  );
}

function ProjectVideoSection() {
  const { project } = useProject();
  const { owner, current, status, copy, v, inUse, takes, videoHref } = useProjectVideoState();
  const { pickTake, deleteTake } = useVideoJobs();
  const toast = useToast();
  const [sheet, setSheet] = React.useState<"takes" | "scenes" | null>(null);
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<VideoTake | null>(null);
  // One product: its video (under Product videos) is the project's (owner, 2026-11-17).
  if (current.length < 2) return null;

  const playing = (playingId && takes.find((t) => t.id === playingId && t.readyAt && !t.failure)) || inUse;
  const showRow = !inUse || status.state !== "ready" || copy.action !== null;
  const canRegenerate = copy.action === null && status.state === "ready" && !(v.state === "ready" && v.next);

  if (!owner && !inUse) return null;
  return (
    <section aria-label={PROJECT_VIDEO_TITLE} className="flex flex-col gap-4">
      <SectionMeta title={PROJECT_VIDEO_TITLE} meta={owner ? PROJECT_GROUP_META : null} />
      {owner && showRow && (
        // Its state; its action is the screen's bar.
        <div className={cn(LIST_CARD, !inUse && "border-dashed", "flex-row items-start gap-6 p-6")}>
          <span className="grid size-[56px] shrink-0 grid-cols-2 grid-rows-2 gap-[1px] overflow-hidden rounded-md bg-bg-surface-raised">
            {current.slice(0, 4).map((p) => (
              <Thumb key={p.id} url={p.built?.product.conceptImageUrl} className="size-full rounded-none" />
            ))}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className={cn(T.name, "truncate")}>{project.name}</span>
            <span className={cn(T.meta, "flex items-start gap-2", TONE_INK[copy.tone])}>
              <span aria-hidden className="mt-[2px]">
                <Icon icon={TONE_ICON[copy.icon] ?? LockIcon} size={14} />
              </span>
              <span className="text-text-secondary">{copy.text}</span>
            </span>
            {copy.sub && <span className={T.meta}>{copy.sub}</span>}
            {copy.progress !== null && <ProgressBar value={copy.progress} label="Project video render" />}
          </span>
        </div>
      )}
      {playing && (
        <div className="flex flex-col gap-4">
          <PhoneVideo takeId={playing.id} label={`${project.name} project video`} />
          <p className={T.meta}>
            {[
              `Take ${playing.n}`,
              resolutionOf(playing.quality),
              playing.clip ? `${Math.round(playing.clip.durationMs / 1000)} s` : null,
              playing.readyAt ? `Made ${formatDate(playing.readyAt)}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {(playing.join || owner) && (
            <KitListCard label="Project video">
              {playing.join && <ListRow icon={ListViewIcon} title="What’s in this video" onClick={() => setSheet("scenes")} />}
              {owner && <ListRow icon={Film01Icon} title="Takes" value={String(takes.length)} onClick={() => setSheet("takes")} />}
              {owner && canRegenerate && <ListRow icon={RepeatIcon} title="Regenerate" href={videoHref} />}
            </KitListCard>
          )}
        </div>
      )}
      <Sheet open={sheet === "scenes" && !!playing?.join} onClose={() => setSheet(null)} title="What’s in this video">
        {playing?.join && (
          <ul className={cn(T.body, "flex flex-col gap-2 pb-8")}>
            {describeJoin(playing.join).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </Sheet>
      <Sheet open={sheet === "takes"} onClose={() => setSheet(null)} title={`Takes (${takes.length})`}>
        <div className="pb-8">
          <ListCard label="Takes">
            {[...takes].reverse().map((t) => {
              const ready = !!t.readyAt && !t.failure;
              const using = inUse?.id === t.id;
              return (
                <li key={t.id} className={cn(LIST_ROW, "flex items-center gap-4 p-6")}>
                  <button
                    type="button"
                    disabled={!ready}
                    aria-label={`Play take ${t.n}`}
                    onClick={() => {
                      setPlayingId(t.id);
                      setSheet(null);
                    }}
                    className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:text-text-disabled"
                  >
                    <Icon icon={PlayCircleIcon} size={20} />
                  </button>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={T.rowTitle}>Take {t.n}</span>
                    <span className={T.meta}>
                      {[resolutionOf(t.quality), t.clip ? `${Math.round(t.clip.durationMs / 1000)} s` : null, formatDate(t.createdAt), t.failure ? "Failed" : !t.readyAt ? "Rendering" : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {using ? (
                    <Badge tone="success">In use</Badge>
                  ) : (
                    <>
                      {ready && (
                        <Button
                          hierarchy="ghost"
                          size="lg"
                          onClick={() => {
                            if (pickTake(project.id, PROJECT_VIDEO_KEY, t.id).ok) {
                              setPlayingId(t.id);
                              toast({ title: `Take ${t.n} is now the project video.` });
                            } else toast({ title: "That take couldn't be put in use. Try again.", lead: "error" });
                          }}
                        >
                          Use this
                        </Button>
                      )}
                      <Button
                        hierarchy="secondary"
                        size="xl"
                        iconOnly
                        aria-label={`Delete take ${t.n}`}
                        disabled={!t.readyAt && !t.failure}
                        onClick={() => setDeleting(t)}
                      >
                        <Icon icon={Delete02Icon} size={20} />
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ListCard>
        </div>
      </Sheet>
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
          if (deleteTake(project.id, PROJECT_VIDEO_KEY, t.id).ok) {
            if (playingId === t.id) setPlayingId(null);
            toast({ title: `Take ${t.n} deleted.` });
          } else toast({ title: "That take couldn't be deleted. Try again.", lead: "error" });
        }}
      />
    </section>
  );
}

// ─────────────────────────── Product videos ───────────────────────────

const ROW_TAP = cn("flex w-full items-center gap-6 p-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle", PRESSED);

/** Each current product's video as one whole-row tap: the owner's action (the web's word as the
 *  row's last line) opens the video maker on the right take; a settled ready one plays in a sheet. */
function ProductVideosSection() {
  const { project, view, viewer } = useProject();
  const owner = can(viewer, "video.generate", view.canCtx);
  const { record } = useProjectVideos(project.id);
  const { jobs, now } = useVideoJobs();
  const [watching, setWatching] = React.useState<{ take: VideoTake; name: string } | null>(null);
  const products = currentProductsOf(view.products);
  const rows = products.map((p) => ({ product: p, name: displayProductName(p.name), status: productVideoStatus(record?.products[p.id], jobs, now) }));
  const shown = owner ? rows : rows.filter((r) => r.status.state === "ready");
  if (shown.length === 0) return null;
  const ready = rows.filter((r) => r.status.state === "ready").length;

  return (
    <section aria-label="Product videos" className="flex flex-col gap-4">
      <SectionMeta title="Product videos" meta={owner ? videosGroupMeta(ready, rows.length) : null} />
      <ListCard label="Product videos">
        {shown.map(({ product, name, status }) => {
          const copy = statusCopy(status);
          const take = status.state === "ready" ? status.take : null;
          // The owner's action in this state (none while it renders or once settled); a ready video
          // with a newer take waiting has Review, as the web's tile does.
          const label = owner ? actionLabel(copy.action) : null;
          const plays = take !== null && !label;
          const body = (
            <>
              <Thumb url={product.built?.product.conceptImageUrl}>
                {plays && (
                  <span aria-hidden className={cn(MEDIA_GROUND, MEDIA_INK, "absolute inline-flex size-[28px] items-center justify-center rounded-full")}>
                    <Icon icon={PlayIcon} size={16} />
                  </span>
                )}
              </Thumb>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={cn(T.name, "truncate")}>{name}</span>
                <span className={cn(T.meta, "flex items-center gap-2", TONE_INK[copy.tone])}>
                  <Icon icon={TONE_ICON[copy.icon] ?? VideoOffIcon} size={14} />
                  <span className="text-text-secondary">
                    {plays && take
                      ? [take.clip ? `0:${String(Math.round(take.clip.durationMs / 1000)).padStart(2, "0")}` : null, resolutionOf(take.quality)].filter(Boolean).join(" · ")
                      : copy.text}
                  </span>
                </span>
                {copy.progress !== null && <ProgressBar value={copy.progress} label={`${name} video render`} />}
                {label && <span className={cn(T.rowTitle, "text-text-brand")}>{label}</span>}
              </span>
              {label && <Chevron />}
            </>
          );
          return (
            <li key={product.id} className={LIST_ROW}>
              {label ? (
                <Link href={phoneVideoActionHref(project.id, product.id, status)} aria-label={`${name}: ${label}`} className={ROW_TAP}>
                  {body}
                </Link>
              ) : take ? (
                <button type="button" aria-haspopup="dialog" aria-label={`Play ${name} video`} onClick={() => setWatching({ take, name })} className={ROW_TAP}>
                  {body}
                </button>
              ) : (
                <div className={cn(ROW_TAP, "hover:bg-transparent")}>{body}</div>
              )}
            </li>
          );
        })}
      </ListCard>
      <Sheet open={watching !== null} onClose={() => setWatching(null)} title={watching?.name ?? ""} description={watching ? `Take ${watching.take.n} · ${resolutionOf(watching.take.quality)}` : undefined}>
        {watching && <PhoneVideo takeId={watching.take.id} label={`${watching.name} video`} className="mb-8" />}
      </Sheet>
    </section>
  );
}

// ─────────────────────────── From your builds (03, 03b, 03g, 03h) ───────────────────────────

function BuildImagesSection() {
  const { project, view, viewer, gate } = useProject();
  const tiles = React.useMemo(() => mediaTilesOf(view.refs), [view.refs]);
  const coverUrl = coverOf(project, view.refs);
  const ownerFacts = can(viewer, "facts.seeOwnerOnly", view.canCtx);
  const [at, setAt] = React.useState<number | null>(null);
  if (tiles.length === 0) {
    return (
      <section aria-label="From your builds" className="flex flex-col gap-4">
        <SectionHeading title="From your builds" />
        <p className={T.body}>No images yet. A build&apos;s concept images show here once it is saved to this project.</p>
      </section>
    );
  }
  return (
    <section aria-label="From your builds" className="flex flex-col gap-4">
      <SectionHeading title="From your builds" />
      <ul className="grid grid-cols-3 gap-4">
        {tiles.map((t, i) => (
          <li key={t.key}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`${t.name}, version ${t.version}${t.url === coverUrl ? ", the cover" : ""}`}
              onClick={() => setAt(i)}
              className="flex w-full flex-col gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <span className="relative block aspect-square w-full overflow-hidden rounded-md bg-bg-surface-raised">
                {/* eslint-disable-next-line @next/next/no-img-element -- a concept image from the build store */}
                <img src={t.url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                {ownerFacts && t.url === coverUrl && (
                  <span className="absolute left-2 top-2">
                    <Badge tone="brand-solid" icon={<Icon icon={Bookmark02Icon} size={12} />}>
                      Cover
                    </Badge>
                  </span>
                )}
              </span>
              <span className={cn(T.meta, "line-clamp-2")}>
                {t.name} · v{t.version}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {ownerFacts && <p className={T.meta}>Tap an image to see it full size or make it the cover.</p>}
      {at !== null && at < tiles.length && (
        <BuildImageViewer
          tiles={tiles}
          index={at}
          coverUrl={coverUrl}
          canCover={can(viewer, "product.edit", view.canCtx)}
          gate={gate}
          projectId={project.id}
          onIndex={setAt}
          onClose={() => setAt(null)}
        />
      )}
    </section>
  );
}

type Tile = ReturnType<typeof mediaTilesOf>[number];

/** The build images full size, opened at `startUrl` (the page's cover): Use as cover lives here. */
export function BuildImagesViewer({ startUrl, onClose }: { startUrl: string | null; onClose: () => void }) {
  const { project, view, viewer, gate } = useProject();
  const tiles = React.useMemo(() => mediaTilesOf(view.refs), [view.refs]);
  const [at, setAt] = React.useState(() => Math.max(0, tiles.findIndex((t) => t.url === startUrl)));
  if (tiles.length === 0) return null;
  return (
    <BuildImageViewer
      tiles={tiles}
      index={Math.min(at, tiles.length - 1)}
      coverUrl={coverOf(project, view.refs)}
      canCover={can(viewer, "product.edit", view.canCtx)}
      gate={gate}
      projectId={project.id}
      onIndex={setAt}
      onClose={onClose}
    />
  );
}

// ─────────────────────────── Assembly snapshots (the web's SnapshotsGroup) ───────────────────────────

const snapshotWhen = (at: number) => new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function SnapshotsSection() {
  const { project, view, viewer } = useProject();
  const owner = can(viewer, "facts.seeOwnerOnly", view.canCtx);
  const canRemove = can(viewer, "product.edit", view.canCtx);
  const toast = useToast();
  const [list, setList] = React.useState<Snapshot[]>([]);
  const [at, setAt] = React.useState<number | null>(null);
  const [removing, setRemoving] = React.useState<Snapshot | null>(null);
  React.useEffect(() => {
    const read = () => {
      try {
        setList(readSnapshots(project.id, window.localStorage));
      } catch {
        setList([]);
      }
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, [project.id]);
  if (!owner || list.length === 0) return null;
  const open = at !== null && at < list.length ? list[at] : null;
  return (
    <section aria-label="Assembly snapshots" className="flex flex-col gap-4">
      <SectionHeading title="Assembly snapshots" />
      <ul className="grid grid-cols-3 gap-4">
        {list.map((snap, i) => (
          <li key={snap.id}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`${snap.productName}, assembled, ${snapshotWhen(snap.at)}`}
              onClick={() => setAt(i)}
              className="flex w-full flex-col gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <span className="relative block aspect-square w-full overflow-hidden rounded-md bg-bg-surface-raised">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL */}
                <img src={snap.dataUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
              </span>
              <span className={cn(T.meta, "line-clamp-2")}>{snap.productName}</span>
            </button>
          </li>
        ))}
      </ul>
      <ImageViewer
        open={open !== null}
        onClose={() => setAt(null)}
        index={at ?? 0}
        count={list.length}
        onIndex={setAt}
        noun="Snapshot"
        src={open?.dataUrl ?? null}
        alt={open ? `${open.productName}, assembled` : ""}
        caption={open ? `${open.productName} · ${snapshotWhen(open.at)}` : undefined}
        action={
          canRemove && open ? (
            <Button hierarchy="secondary" size="xl" className="flex-1" onClick={() => setRemoving(open)}>
              Remove
            </Button>
          ) : undefined
        }
      />
      <ConfirmSheet
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove this snapshot?"
        body="The picture is removed from this browser. It can’t be undone."
        verb="Remove snapshot"
        destructive
        onConfirm={() => {
          const snap = removing;
          if (!snap) return;
          try {
            const next = removeSnapshot(project.id, snap.id, window.localStorage);
            setList(next);
            setAt(null);
            toast({ title: "Snapshot removed" });
          } catch {
            toast({ title: "It couldn’t be removed. This browser’s storage refused.", lead: "error" });
          }
        }}
      />
    </section>
  );
}

// ─────────────────────────── 03b · the image viewer ───────────────────────────

/** 03b · a build's concept images full size, with Use as cover (03g, 03h). */
function BuildImageViewer({
  tiles,
  index,
  coverUrl,
  canCover,
  gate,
  projectId,
  onIndex,
  onClose,
}: {
  tiles: Tile[];
  index: number;
  coverUrl: string | null;
  canCover: boolean;
  gate: ReturnType<typeof useProject>["gate"];
  projectId: string;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { setCover } = useManualProjects();
  const toast = useToast();
  const [refused, setRefused] = React.useState<string | null>(null);
  const tile = tiles[index];
  const isCover = tile.url === coverUrl;

  const useAsCover = () => {
    setRefused(null);
    const out = gate.guard("cover", () => {
      setCover(projectId, { buildId: tile.buildId, productId: tile.productId });
      toast({ title: "Cover changed" });
    });
    if (out.kind === "refused") setRefused(out.reason);
  };

  return (
    <ImageViewer
      open
      onClose={onClose}
      index={index}
      count={tiles.length}
      onIndex={(i) => {
        setRefused(null);
        onIndex(i);
      }}
      noun="Image"
      src={tile.url}
      alt={`${tile.name}, version ${tile.version}`}
      caption={`${tile.name} · v${tile.version}`}
      note={refused}
      action={
        !canCover ? undefined : isCover ? (
          <p className={cn(T.bodyStrong, MEDIA_INK, "flex h-[44px] flex-1 items-center justify-center gap-2")}>
            <Icon icon={Tick02Icon} size={20} />
            This image is the cover
          </p>
        ) : (
          <Button hierarchy="secondary" size="xl" className="flex-1" iconLeading={<Icon icon={Tick02Icon} size={20} />} onClick={useAsCover}>
            Use as cover
          </Button>
        )
      }
    />
  );
}
