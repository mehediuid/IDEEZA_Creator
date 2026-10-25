"use client";

// The Tour Guide's corner card: it asks, it never starts anything by itself, never dims the page
// and never takes focus, so work goes on around it. It rises into place from the foot of the
// screen. Three askers use it:
// - the visit offer (spec D2): the first time a project page, an editor, Earn or Innovations
//   opens, that page's chapter — Show me or Not now (Not now once waits for a later visit);
// - the resume card: a part left half-way comes back once on a later visit;
// - the arrival card: someone who opened a shared post, listing or profile, and has made nothing
//   here yet, is told what IDEEZA is and offered to make their own.

import * as React from "react";
import { createPortal } from "react-dom";
import { Compass01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import type { TourChapter } from "@/lib/tour/types";

const ARRIVE =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-slow motion-safe:ease-decelerate";
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function CornerCard({
  title,
  body,
  primary,
  secondary,
  inEditor = false,
  onPrimary,
  onSecondary,
}: {
  title: string;
  body: string;
  primary: string;
  secondary: string;
  /** Clears the editors' status bar along their foot. */
  inEditor?: boolean;
  onPrimary: () => void;
  /** Also Escape. */
  onSecondary: () => void;
}) {
  const titleId = React.useId();
  const bodyId = React.useId();
  return createPortal(
    <div
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      data-tour-offer
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        onSecondary();
      }}
      className={cn(
        "fixed right-[16px] z-popover flex w-[340px] gap-6 rounded-lg border border-solid border-border bg-bg-surface p-8 shadow-3",
        "max-md:left-[8px] max-md:right-[8px] max-md:bottom-[max(8px,env(safe-area-inset-bottom))] max-md:w-auto",
        inEditor ? "bottom-[48px]" : "bottom-[16px]",
        ARRIVE,
      )}
    >
      <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand">
        <Icon icon={Compass01Icon} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id={titleId} className="text-md font-semibold leading-md text-text-primary">
          {title}
        </h2>
        <p id={bodyId} className="text-sm leading-sm text-text-secondary">
          {body}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button type="button" hierarchy="primary" size="sm" className={TAP} onClick={onPrimary}>
            {primary}
          </Button>
          <Button type="button" hierarchy="ghost" size="sm" className={TAP} onClick={onSecondary}>
            {secondary}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ChapterOffer({
  chapter,
  steps,
  inEditor,
  onStart,
  onDecline,
}: {
  chapter: TourChapter;
  steps: number;
  inEditor: boolean;
  onStart: () => void;
  onDecline: () => void;
}) {
  return (
    <CornerCard
      title="A quick tour of this page"
      body={`${chapter.name} · ${steps} ${steps === 1 ? "step" : "steps"}`}
      primary="Show me"
      secondary="Not now"
      inEditor={inEditor}
      onPrimary={onStart}
      onSecondary={onDecline}
    />
  );
}
