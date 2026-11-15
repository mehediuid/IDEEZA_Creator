"use client";

// 11b · Review the video, and 11d · Your clip (a clip this phone recorded or
// uploaded): the player, its line, a "What's in this video" row (the lines on
// screen and the honesty line, in a sheet), then the maker's word — Use this
// video / Use this clip is the screen's one primary at the foot (`UseBar`,
// with "Take n stays in use until you choose" and any error over it), the
// other ways under "Is this the video you want?" in one list card (the mobile
// Figma's "Other choices"). The web's review choices and words: Make another
// take (the same storyboard, a new render) · Edit storyboard · Change the
// prompt · Decide later; and, with more than one finished take, Your takes to
// go back to.

import * as React from "react";
import { TextIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { formatDate } from "@/lib/manual/project-summary";
import { describeClip } from "@/lib/video/frames";
import type { ProductVideo, VideoTake } from "@/lib/video/types";
import { clipMetaLine, honestyLine, resolutionOf } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW } from "../../kit/list";
import { Sheet } from "../../kit/sheet";
import { PhoneVideo } from "../../project/video";
import { T } from "../../type";

export type ReviewChoice = { title: string; text: string; onClick: () => void };

/** The "Other choices" card: each row a title, what it does, and a chevron. */
export function ChoiceList({ choices, label }: { choices: ReviewChoice[]; label: string }) {
  return (
    <ul aria-label={label} className={cn(LIST_CARD, LIST_DIVIDERS)}>
      {choices.map((c) => (
        <li key={c.title}>
          <button
            type="button"
            onClick={c.onClick}
            className="flex min-h-[56px] w-full items-center gap-6 px-8 py-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle active:bg-bg-subtle"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={T.rowTitle}>{c.title}</span>
              <span className={T.meta}>{c.text}</span>
            </span>
            <Chevron />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** "What's in this video": a row that opens the transcript of what is on screen (the clip is
 *  silent) and the honesty line. */
function WhatsIn({ lines, note }: { lines: string[]; note: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <div className={LIST_CARD}>
        <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={cn(LIST_ROW, "active:bg-bg-subtle")}>
          <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
            <Icon icon={TextIcon} size={24} />
          </span>
          <span className={cn(T.body, "min-w-0 flex-1 text-text-primary")}>What&apos;s in this video</span>
          <Chevron />
        </button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="What's in this video">
        <ul className={cn(T.body, "flex list-disc flex-col gap-2 pl-8 text-text-primary")}>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className={cn(T.meta, "text-text-tertiary")}>{note}</p>
      </Sheet>
    </>
  );
}

/** The foot of a review: the line over it (what stays in use, or the error), then the one primary. */
export function UseBar({ label, onUse, note, error, disabled, loading }: { label: string; onUse: () => void; note?: string | null; error?: string | null; disabled?: boolean; loading?: boolean }) {
  return (
    <>
      {note && <p className={T.meta}>{note}</p>}
      {error && (
        <p role="alert" className={cn(T.body, "text-text-error")}>
          {error}
        </p>
      )}
      <Button size="xl" className="w-full" disabled={disabled} loading={loading} onClick={onUse}>
        {label}
      </Button>
    </>
  );
}

/** "Take n stays in use until you choose." while another take is in use; null otherwise. */
export function inUseNote(take: VideoTake, video: ProductVideo | undefined): string | null {
  const inUse = video?.inUseId && video.inUseId !== take.id ? video.takes.find((t) => t.id === video.inUseId) : undefined;
  return inUse ? `Take ${inUse.n} stays in use until you choose.` : null;
}

export function TakeReview({
  take,
  video,
  productName,
  onUse,
  choices,
}: {
  take: VideoTake;
  video: ProductVideo | undefined;
  productName: string;
  /** From Your takes: an earlier take instead (Use this video itself is the foot's). */
  onUse: (chosen: VideoTake) => void;
  choices: ReviewChoice[];
}) {
  const finished = (video?.takes ?? []).filter((t) => t.readyAt && !t.failure);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <PhoneVideo takeId={take.id} label={`${productName} video, take ${take.n}`} />
        <p className={T.meta}>{clipMetaLine(take, formatDate(take.readyAt ?? take.createdAt))}</p>
      </div>
      <WhatsIn lines={describeClip(take, productName, take.source !== null)} note={honestyLine(productName)} />
      <div className="flex flex-col gap-4">
        <h2 className={T.section}>Is this the video you want?</h2>
        <ChoiceList choices={choices} label="Other choices" />
      </div>
      {finished.length > 1 && (
        <div className="flex flex-col gap-4">
          <h3 className={T.section}>Your takes</h3>
          <ul aria-label="Your takes" className={cn(LIST_CARD, LIST_DIVIDERS)}>
            {[...finished].reverse().map((t) => (
              <li key={t.id} className="flex min-h-[56px] items-center gap-6 px-8 py-4">
                <span className={cn(T.body, "min-w-0 flex-1 text-text-primary")}>
                  Take {t.n} · {resolutionOf(t.quality)} · {t.clip ? Math.round(t.clip.durationMs / 1000) : 10} s
                </span>
                {t.id === take.id ? (
                  <span className={cn(T.meta, "text-text-tertiary")}>This one</span>
                ) : t.id === video?.inUseId ? (
                  <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
                    In use
                  </Badge>
                ) : (
                  <Button hierarchy="secondary" size="lg" onClick={() => onUse(t)}>
                    Use this take
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** "Sent to {Product} when you use it. Your recording stays on this phone until then." */
export function clipKeptLine(productName: string): string {
  return `Sent to ${productName} when you use it. Your recording stays on this phone until then.`;
}
