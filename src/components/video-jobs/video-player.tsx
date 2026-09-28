"use client";

// VideoPlayer — one player for every surface that shows a product video
// (Phase 2 VIDEO P2-VIDEO-9): the Media tab's lightbox, the product page's
// Media panel, the Generate dialog's result, the render toast's Watch, and
// MARKET's buyer view. Exported with `useClipUrl` and `VideoPlayerDialog`.
//
// - Nothing autoplays, ever, and nothing loops. Before the first play a
//   centred Play button (≥ 44 px) covers the poster; pressing it plays the
//   clip and hands focus to the <video>, whose keys then take over: Space or
//   K plays and pauses, ←/→ seek a second, Home/End jump to either end.
// - The meta line is always visible and describes the video to a screen
//   reader; "What's in this video" is the transcript of what is actually on
//   screen (WCAG 1.2.1 — the clip is silent, so there are no captions).
// - States: loading (a skeleton that doesn't pulse under reduced motion),
//   ready, lost (the file is gone from this browser — the take is marked
//   lost), cannot play (`video.onerror`), and — owner only — the rendering
//   and failed panels of P2-VIDEO-4 in the same 16:9 box.

import * as React from "react";
import { AlertCircleIcon, Cancel01Icon, PlayIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ModalFrame, ProgressBar, Spinner } from "@/components/ideeza";
import { formatDate } from "@/lib/manual/project-summary";
import { getClip, verifyClips } from "@/lib/video/clip-store";
import { describeClip } from "@/lib/video/frames";
import type { ProductVideoStatus, VideoTake } from "@/lib/video/types";
import {
  CANNOT_PLAY_COPY,
  FAILURE_COPY,
  actionLabel,
  clipMetaLine,
  honestyLine,
  statusCopy,
} from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";

const GLYPH_TONE = {
  error: "text-text-error",
  success: "text-text-success",
  neutral: "text-text-secondary",
} as const;

/** P2-VIDEO-4's icon for a state — always beside its words, never alone. */
export function StatusGlyph({
  icon,
  tone,
  size = 16,
}: {
  icon: "cross" | "spinner" | "check" | "alert";
  tone: keyof typeof GLYPH_TONE;
  size?: number;
}) {
  if (icon === "spinner") return <Spinner size={size} />;
  const glyph = icon === "check" ? Tick02Icon : icon === "cross" ? Cancel01Icon : AlertCircleIcon;
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center", GLYPH_TONE[tone])}>
      <Icon icon={glyph} size={size} strokeWidth={2} />
    </span>
  );
}

export type ClipUrl =
  | { state: "idle" | "loading" | "lost"; url: null; posterUrl: null; usedImage: false }
  | { state: "ready"; url: string; posterUrl: string; usedImage: boolean };

const IDLE: ClipUrl = { state: "idle", url: null, posterUrl: null, usedImage: false };

/** A take's clip and poster as object URLs, read from IndexedDB and revoked
 *  on unmount (or when the take changes). `lost` = this browser doesn't
 *  hold the file. */
export function useClipUrl(takeId: string | null | undefined): ClipUrl {
  const [clip, setClip] = React.useState<{ id: string; value: ClipUrl } | null>(null);
  React.useEffect(() => {
    if (!takeId) return;
    let alive = true;
    let urls: string[] = [];
    getClip(takeId)
      .then((rec) => {
        if (!alive) return;
        if (!rec) {
          setClip({ id: takeId, value: { state: "lost", url: null, posterUrl: null, usedImage: false } });
          return;
        }
        const url = URL.createObjectURL(rec.video);
        const posterUrl = URL.createObjectURL(rec.poster);
        urls = [url, posterUrl];
        setClip({ id: takeId, value: { state: "ready", url, posterUrl, usedImage: rec.usedImage !== false } });
      })
      .catch(() => {
        // IndexedDB unreadable: say so the way a missing file is said,
        // without marking anything lost (verifyClips won't either).
        if (alive) setClip({ id: takeId, value: { state: "lost", url: null, posterUrl: null, usedImage: false } });
      });
    return () => {
      alive = false;
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [takeId]);
  if (!takeId) return IDLE;
  if (!clip || clip.id !== takeId) return { state: "loading", url: null, posterUrl: null, usedImage: false };
  return clip.value;
}

export type VideoPlayerProps = {
  /** The take to play; null while nothing is ready (then `status` shows). */
  take: VideoTake | null;
  productName: string;
  projectId: string;
  /** can(viewer, "video.generate"): the owner's states and actions. */
  owner?: boolean;
  /** The product's P2-VIDEO-4 status; its rendering/failed panels are the
   *  owner's, drawn in the player's box when there's no take to play. */
  status?: ProductVideoStatus;
  /** "Generate again" / "Try again" / "Generate AI video" — owner only. */
  onGenerate?: () => void;
  className?: string;
};

const BOX = "relative aspect-video w-full overflow-hidden rounded-xl border border-solid border-border bg-bg-surface-raised";

export function VideoPlayer({ take, productName, projectId, owner = false, status, onGenerate, className }: VideoPlayerProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {take ? (
        <ReadyPlayer key={take.id} take={take} productName={productName} projectId={projectId} owner={owner} onGenerate={onGenerate} />
      ) : owner && status ? (
        <StatusPanel status={status} productName={productName} onGenerate={onGenerate} />
      ) : null}
    </div>
  );
}

/** P2-VIDEO-4 in the player's box: rendering, failed or none (owner only). */
export function StatusPanel({
  status,
  productName,
  onGenerate,
}: {
  status: ProductVideoStatus;
  productName: string;
  onGenerate?: () => void;
}) {
  const copy = statusCopy(status);
  const action = actionLabel(copy.action);
  return (
    <div className={cn(BOX, "flex flex-col items-center justify-center gap-4 px-8 text-center")}>
      <StatusGlyph icon={copy.icon} tone={copy.tone} size={20} />
      <p className="text-md font-semibold text-text-primary">{copy.text}</p>
      {copy.progress !== null && (
        <ProgressBar value={copy.progress} label={`${productName} video`} className="max-w-[320px]" />
      )}
      {copy.sub && <p className="max-w-[48ch] text-sm text-text-secondary">{copy.sub}</p>}
      {action && onGenerate && (
        <Button hierarchy="secondary" size="md" className="[@media(pointer:coarse)]:min-h-[var(--touch-min)] max-md:min-h-[var(--touch-min)]" onClick={onGenerate}>
          {action}
        </Button>
      )}
    </div>
  );
}

function ReadyPlayer({
  take,
  productName,
  projectId,
  owner,
  onGenerate,
}: {
  take: VideoTake;
  productName: string;
  projectId: string;
  owner: boolean;
  onGenerate?: () => void;
}) {
  const clip = useClipUrl(take.id);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [started, setStarted] = React.useState(false);
  const [broken, setBroken] = React.useState(false);
  const metaId = React.useId();
  const label = `${productName} video`;

  // A file that's gone turns the take lost, so it stops counting as ready
  // everywhere the gate reads it (P2-VIDEO-9, P2-VIDEO-19).
  const lost = clip.state === "lost";
  React.useEffect(() => {
    if (lost) void verifyClips(projectId).catch(() => undefined);
  }, [lost, projectId]);

  const play = () => {
    const v = videoRef.current;
    if (!v) return;
    setStarted(true);
    v.play().catch(() => undefined);
    v.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    const seek = (to: number) => {
      v.currentTime = Math.max(0, Math.min(Number.isFinite(v.duration) ? v.duration : to, to));
    };
    switch (e.key) {
      case " ":
      case "k":
      case "K":
        if (v.paused) v.play().catch(() => undefined);
        else v.pause();
        break;
      case "ArrowLeft":
        seek(v.currentTime - 1);
        break;
      case "ArrowRight":
        seek(v.currentTime + 1);
        break;
      case "Home":
        seek(0);
        break;
      case "End":
        seek(Number.isFinite(v.duration) ? v.duration : 10);
        break;
      default:
        return;
    }
    // The player owns these keys while it has focus: the native controls
    // don't act on them a second time, and a lightbox's ←/→ leave them be.
    e.preventDefault();
    e.stopPropagation();
  };

  const meta = clipMetaLine(take, formatDate(take.readyAt ?? take.createdAt));
  const transcript = describeClip(take, productName, clip.state === "ready" ? clip.usedImage : take.source !== null);

  let box: React.ReactNode;
  if (clip.state === "loading" || clip.state === "idle") {
    box = (
      <div aria-busy="true" className={cn(BOX, "motion-safe:animate-pulse")}>
        <span className="sr-only">Loading video</span>
      </div>
    );
  } else if (clip.state === "lost" || broken) {
    box = (
      <div className={cn(BOX, "flex flex-col items-center justify-center gap-4 px-8 text-center")}>
        <StatusGlyph icon="alert" tone="error" size={20} />
        <p className="max-w-[48ch] text-sm text-text-primary">{broken ? CANNOT_PLAY_COPY : FAILURE_COPY.lost}</p>
        {owner && onGenerate && (
          <Button hierarchy="secondary" size="md" className="max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]" onClick={onGenerate}>
            Generate again
          </Button>
        )}
      </div>
    );
  } else {
    box = (
      <div className={cn(BOX, "bg-bg-overlay")}>
        <video
          ref={videoRef}
          src={clip.url ?? undefined}
          poster={clip.posterUrl ?? undefined}
          controls
          preload="metadata"
          playsInline
          aria-label={label}
          aria-describedby={metaId}
          // Behind the Play button it would be a hidden Tab stop; it joins the
          // order once the clip has been started.
          tabIndex={started ? 0 : -1}
          onPlay={() => setStarted(true)}
          onError={() => setBroken(true)}
          onKeyDown={onKeyDown}
          className="absolute inset-0 h-full w-full object-contain outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
        />
        {!started && (
          <button
            type="button"
            onClick={play}
            aria-label={`Play ${label}`}
            className="group absolute inset-0 flex items-center justify-center outline-none"
          >
            <span className="inline-flex size-[56px] items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-bg-overlay)_72%,transparent)] text-text-on-brand shadow-3 transition-transform duration-fast ease-decelerate group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-border-focus group-focus-visible:ring-offset-2 motion-reduce:transition-none">
              <Icon icon={PlayIcon} size={26} />
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {box}
      <div className="flex flex-col gap-3">
        <p id={metaId} className="text-sm text-text-secondary">
          {meta}
        </p>
        <details className="group text-sm text-text-secondary">
          <summary className="inline-flex min-h-[24px] cursor-pointer items-center gap-2 rounded-md font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]">
            {"What's in this video"}
          </summary>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-8">
            {transcript.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
        <p className="text-xs text-text-tertiary">{honestyLine(productName)}</p>
      </div>
    </>
  );
}

/** A take in a dialog of its own: the render toast's Watch. */
export function VideoPlayerDialog({
  open,
  take,
  productName,
  projectId,
  onClose,
}: {
  open: boolean;
  take: VideoTake | null;
  productName: string;
  projectId: string;
  onClose: () => void;
}) {
  return (
    <ModalFrame open={open} onClose={onClose} title={`${productName} video`} size="lg">
      {take ? <VideoPlayer take={take} productName={productName} projectId={projectId} /> : null}
    </ModalFrame>
  );
}
