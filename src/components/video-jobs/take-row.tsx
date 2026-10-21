"use client";

// One take in a Takes list (P2-VIDEO-8): its poster (which loads it into the player), its label,
// and "In use" or Use this take · Delete. A take still rendering, or one that failed, is its words
// alone. The product page's Media panel and the project video's Media section share it.

import * as React from "react";
import { Delete02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, IconButton } from "@/components/ideeza";
import { formatDate } from "@/lib/manual/project-summary";
import { etaLabel } from "@/lib/video/jobs";
import type { VideoTake } from "@/lib/video/types";
import { FAILURE_COPY, takeLabel } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { useClipUrl } from "./video-player";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function TakeRow({
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
    return <li className="px-6 py-5 text-md text-text-secondary">{line}</li>;
  }
  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-4 px-6 py-5">
      <TakePoster take={take} playing={playing} onPlay={onPlay} />
      <span className="min-w-0 flex-1 text-md text-text-primary">{takeLabel(take, formatDate(take.readyAt!))}</span>
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
