"use client";

// 11b · Review the video, and 11d · Your clip (a clip this phone recorded or
// uploaded): the player, its line, then the maker's word — Use this video /
// Use this clip on top, the other ways on in one list card (the mobile
// Figma's "Other choices"). The web's review choices and words: Make another
// take (the same storyboard, a new render) · Edit storyboard · Change the
// prompt · Decide later; "Take n stays in use until you choose"; and, with
// more than one finished take, Your takes to go back to.

import * as React from "react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { formatDate } from "@/lib/manual/project-summary";
import { describeClip } from "@/lib/video/frames";
import type { ProductVideo, VideoTake } from "@/lib/video/types";
import { clipMetaLine, honestyLine, resolutionOf } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { Chevron, LIST_CARD, LIST_DIVIDERS } from "../../kit/list";
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
            className="flex min-h-[56px] w-full items-center gap-6 px-8 py-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle"
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

/** "What's in this video": the transcript of what is on screen (the clip is silent). */
function WhatsIn({ lines }: { lines: string[] }) {
  return (
    <details className="group">
      <summary className={cn(T.rowTitle, "-my-6 flex min-h-[44px] cursor-pointer list-none items-center gap-2 outline-none focus-visible:underline")}>
        What&apos;s in this video
      </summary>
      <ul className={cn(T.meta, "mt-4 flex list-disc flex-col gap-2 pl-8")}>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </details>
  );
}

export function TakeReview({
  take,
  video,
  productName,
  error,
  onUse,
  choices,
}: {
  take: VideoTake;
  video: ProductVideo | undefined;
  productName: string;
  error: string | null;
  /** Use this video — or, from Your takes, an earlier take instead. */
  onUse: (chosen: VideoTake) => void;
  choices: ReviewChoice[];
}) {
  const inUse = video?.inUseId && video.inUseId !== take.id ? video.takes.find((t) => t.id === video.inUseId) : undefined;
  const finished = (video?.takes ?? []).filter((t) => t.readyAt && !t.failure);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <PhoneVideo takeId={take.id} label={`${productName} video, take ${take.n}`} />
        <p className={T.meta}>{clipMetaLine(take, formatDate(take.readyAt ?? take.createdAt))}</p>
        <WhatsIn lines={describeClip(take, productName, take.source !== null)} />
        <p className={cn(T.meta, "text-text-tertiary")}>{honestyLine(productName)}</p>
      </div>
      <div className="flex flex-col gap-6">
        <h2 className={T.section}>Is this the video you want?</h2>
        <Button size="xl" className="w-full" onClick={() => onUse(take)}>
          Use this video
        </Button>
        {inUse && <p className={T.body}>Take {inUse.n} stays in use until you choose.</p>}
        {error && (
          <p role="alert" className={cn(T.body, "text-text-error")}>
            {error}
          </p>
        )}
        <ChoiceList choices={choices} label="Other choices" />
      </div>
      {finished.length > 1 && (
        <div className="flex flex-col gap-4">
          <h3 className={cn(T.section, "text-text-secondary")}>Your takes</h3>
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
