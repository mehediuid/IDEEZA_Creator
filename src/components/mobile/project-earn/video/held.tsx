"use client";

// Waiting for videos on the phone (CL-030; the web's held-block.tsx, its words): what the maker
// signed while a video still rendered or waited for review (lib/market/held.ts) stays off Explore
// marketplace and the Feed until every video it needs has Use this video, then goes live by
// itself (HeldPublisher, mounted at the root, runs on /m too).
// · HeldChip — "Waiting for videos" (DS A17 warning, the clock), wherever a waiting item shows;
// · HeldCard — the waiting block: the chip, what was signed and when, where and when it goes live,
//   the Videos ready bar and "n of m videos ready · {what's left}". On a screen with its own
//   bottom bar (an item's screen) the bar carries Review videos and a row carries Cancel listing
//   (`HeldActions`); elsewhere (the mint's Done) the card holds both itself;
// · CancelHeldSheet — "Cancel this listing? Nothing of it was live." · Keep it · Cancel listing;
// · useHeldItems — the project's waiting items, live across tabs.
// Review videos opens the phone's Videos sheet at this project (the tray subscribes to the web's
// videos-panel-store, so `openVideosPanel` works the same here).

import * as React from "react";
import { Cancel01Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { heldWaitOf } from "@/components/video-jobs/held-wait";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { openVideosPanel } from "@/components/video-jobs/videos-panel-store";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { formatDateTime } from "@/lib/manual/project-summary";
import { dropHeld, HELD_CHIP, heldLabelOf, heldLine, heldOf, useHeld, type HeldItem, type HeldKind } from "@/lib/market/held";
import { useProjectVideos } from "@/lib/video/store";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { LIST_ROW } from "../../kit/list";
import { PRESSED } from "../../kit/press";
import { T } from "../../type";

/** Where it goes live, the phone's words: the post goes on the Feed (the phone has no Innovations). */
export function phoneHeldWhere(kind: HeldKind): string {
  return kind === "share" ? "Feed" : "Explore marketplace";
}

/** The project's waiting items, oldest first. */
export function useHeldItems(projectId: string): HeldItem[] {
  const { store } = useHeld();
  return React.useMemo(() => heldOf(store, projectId), [store, projectId]);
}

export function HeldChip({ className }: { className?: string }) {
  return (
    <Badge tone="warning" icon={<Icon icon={Clock01Icon} size={12} />} className={cn("shrink-0", className)}>
      {HELD_CHIP}
    </Badge>
  );
}

/** "Cancel listing" / "Cancel the post": the item's own words. */
export function cancelLabelOf(item: HeldItem): string {
  return item.kind === "share" ? "Cancel the post" : "Cancel listing";
}

/** The waiting block. `actions`: "inline" draws Review videos and Cancel in the card; "none" leaves
 *  them to the screen (its bottom bar and a row, `HeldActions`). */
export function HeldCard({
  item,
  projectId,
  products,
  actions = "none",
  onCancelled,
}: {
  item: HeldItem;
  projectId: string;
  products: ProjectProduct[];
  actions?: "inline" | "none";
  onCancelled?: (message: string) => void;
}) {
  const { jobs, now } = useVideoJobs();
  const { record } = useProjectVideos(projectId);
  const wait = heldWaitOf(item, products, record, jobs, now);
  const where = phoneHeldWhere(item.kind);
  const [confirming, setConfirming] = React.useState(false);
  return (
    <section
      aria-label={HELD_CHIP}
      className="flex flex-col gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-[color:var(--color-border-warning)] bg-bg-warning-subtle p-8"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <HeldChip />
        <span className={cn(T.meta, "min-w-0 break-words")}>{`${heldLabelOf(item)} · signed ${formatDateTime(item.at)}`}</span>
      </div>
      <p className={cn(T.body, "text-text-primary")}>
        {`${heldLine(where, Math.max(1, wait.total))} Nobody can see ${item.kind === "share" ? "the post" : "or buy it"} yet.`}
      </p>
      <div className="flex flex-col gap-2">
        <ProgressBar value={wait.total ? (wait.ready / wait.total) * 100 : 0} label="Videos ready" />
        <span className={cn(T.meta, "break-words")}>
          {`${wait.ready} of ${wait.total} ${wait.total === 1 ? "video" : "videos"} ready${wait.reason ? ` · ${wait.reason}` : ""}`}
        </span>
      </div>
      {actions === "inline" && (
        <div className="flex flex-col gap-2">
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => openVideosPanel(projectId)}>
            Review videos
          </Button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={cn(T.rowTitle, "inline-flex min-h-[44px] items-center justify-center rounded-lg text-text-error outline-none focus-visible:ring-2 focus-visible:ring-border-focus", PRESSED)}
          >
            {cancelLabelOf(item)}
          </button>
        </div>
      )}
      <CancelHeldSheet item={item} open={confirming} onClose={() => setConfirming(false)} onCancelled={onCancelled} />
    </section>
  );
}

/** On an item's screen: Cancel listing as a row (the bottom bar carries Review videos). */
export function HeldCancelRow({ item, onCancelled }: { item: HeldItem; onCancelled?: (message: string) => void }) {
  const [confirming, setConfirming] = React.useState(false);
  return (
    <li>
      <button type="button" onClick={() => setConfirming(true)} className={cn(LIST_ROW, PRESSED)}>
        <span aria-hidden className="shrink-0 text-[color:var(--color-icon-error)]">
          <Icon icon={Cancel01Icon} size={24} />
        </span>
        <span className={cn(T.body, "min-w-0 flex-1 text-text-error")}>{cancelLabelOf(item)}</span>
      </button>
      <CancelHeldSheet item={item} open={confirming} onClose={() => setConfirming(false)} onCancelled={onCancelled} />
    </li>
  );
}

/** Review videos as a screen's one primary. */
export function ReviewVideosButton({ projectId }: { projectId: string }) {
  return (
    <Button size="xl" className="w-full" onClick={() => openVideosPanel(projectId)}>
      Review videos
    </Button>
  );
}

/** "Cancel this listing? Nothing of it was live." — Keep it · Cancel listing. Nothing to undo. */
export function CancelHeldSheet({
  item,
  open,
  onClose,
  onCancelled,
}: {
  item: HeldItem;
  open: boolean;
  onClose: () => void;
  onCancelled?: (message: string) => void;
}) {
  const share = item.kind === "share";
  return (
    <ConfirmSheet
      open={open}
      onClose={onClose}
      title={share ? "Take the post back?" : "Cancel this listing?"}
      body="Nothing of it was live."
      cancelLabel="Keep it"
      verb={cancelLabelOf(item)}
      destructive
      onConfirm={() => {
        if (!dropHeld(item.id).ok) throw new Error("storage");
        onCancelled?.(share ? "The post is cancelled." : "The listing is cancelled.");
      }}
    />
  );
}
