"use client";

// One held listing or post in place of its Sell / Share control (owner, 2026-11-18, D6–D9): the
// "Waiting for videos" chip, what it waits for and when it goes live, how far the videos are, and
// its two ways forward — Review videos (the Videos panel, at this project) and Cancel (nothing it
// held was ever live, so nothing to undo).

import * as React from "react";
import { Clock01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ProgressBar } from "@/components/ideeza";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { formatDateTime } from "@/lib/manual/project-summary";
import { dropHeld, HELD_CHIP, heldLabelOf, heldLine, heldWhereOf, type HeldItem } from "@/lib/market/held";
import { useProjectVideos } from "@/lib/video/store";
import { cn } from "@/lib/utils";
import { heldWaitOf } from "./held-wait";
import { useVideoJobs } from "./video-jobs-provider";
import { openVideosPanel } from "./videos-panel-store";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/** The chip, wherever a waiting item shows (a tile, a card, the project header). */
export function HeldChip({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-full bg-bg-warning-subtle px-[8px] text-sm font-semibold text-text-warning", className)}>
      <Icon icon={Clock01Icon} size={14} />
      {HELD_CHIP}
    </span>
  );
}

export function HeldBlock({
  item,
  projectId,
  products,
  onCancelled,
  className,
}: {
  item: HeldItem;
  projectId: string;
  products: ProjectProduct[];
  onCancelled?: (message: string) => void;
  className?: string;
}) {
  const { jobs, now } = useVideoJobs();
  const { record } = useProjectVideos(projectId);
  const wait = heldWaitOf(item, products, record, jobs, now);
  const where = heldWhereOf(item.kind);
  const [confirming, setConfirming] = React.useState(false);
  const cancelLabel = item.kind === "share" ? "Cancel the post" : "Cancel listing";
  return (
    <div className={cn("flex flex-col gap-4 rounded-lg border border-solid border-[var(--color-border-warning)] bg-bg-warning-subtle px-6 py-5", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <HeldChip />
        <span className="text-sm text-text-secondary">{heldLabelOf(item)} · signed {formatDateTime(item.at)}</span>
      </div>
      <p className="m-0 text-md text-text-primary">
        {heldLine(where, Math.max(1, wait.total))} Nobody can see {item.kind === "share" ? "the post" : "or buy it"} yet.
      </p>
      <div className="flex flex-col gap-2">
        <ProgressBar value={wait.total ? (wait.ready / wait.total) * 100 : 0} label="Videos ready" className="max-w-[320px]" />
        <span className="text-sm text-text-secondary">
          {wait.ready} of {wait.total} {wait.total === 1 ? "video" : "videos"} ready{wait.reason ? ` · ${wait.reason}` : ""}
        </span>
      </div>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-md text-text-primary">{item.kind === "share" ? "Take the post back?" : "Cancel this listing?"} Nothing of it was live.</span>
          <Button type="button" hierarchy="secondary" size="md" className={TAP} onClick={() => setConfirming(false)}>
            Keep it
          </Button>
          <Button
            type="button"
            hierarchy="danger"
            size="md"
            className={TAP}
            onClick={() => {
              dropHeld(item.id);
              onCancelled?.(item.kind === "share" ? "The post is cancelled." : "The listing is cancelled.");
            }}
          >
            {cancelLabel}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <Button type="button" hierarchy="primary" size="md" className={TAP} onClick={() => openVideosPanel(projectId)}>
            Review videos
          </Button>
          <Button type="button" hierarchy="ghost" size="md" className={TAP} onClick={() => setConfirming(true)}>
            {cancelLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
