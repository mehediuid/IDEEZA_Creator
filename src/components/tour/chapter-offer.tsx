"use client";

// The first-visit offer (spec D2): the first time a project page or an editor is opened, a small
// M10 Popover in the corner offers its chapter — Show me or Not now. It asks; it never starts a
// tour by itself, never dims the page and never takes focus, so work goes on around it.

import * as React from "react";
import { createPortal } from "react-dom";
import { Button, Popover } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import type { TourChapter } from "@/lib/tour/types";

const ENTER = "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal motion-safe:ease-decelerate";
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function ChapterOffer({
  chapter,
  steps,
  inEditor,
  onStart,
  onDecline,
}: {
  chapter: TourChapter;
  steps: number;
  /** Clears the editors' status bar along their foot. */
  inEditor: boolean;
  onStart: () => void;
  onDecline: () => void;
}) {
  const titleId = React.useId();
  const bodyId = React.useId();
  return createPortal(
    <div
      className={cn(
        "fixed right-[16px] z-popover max-md:left-[8px] max-md:right-[8px] max-md:bottom-[8px]",
        inEditor ? "bottom-[48px]" : "bottom-[16px]",
        ENTER,
      )}
    >
      <Popover
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        data-tour-offer
        arrow={false}
        className="max-md:w-full max-md:max-w-none"
        titleId={titleId}
        bodyId={bodyId}
        title={chapter.name}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            onDecline();
          }
        }}
        header={<span className="mb-3 text-sm font-medium leading-sm text-text-tertiary">First time here?</span>}
        actions={
          <>
            <Button type="button" hierarchy="secondary" size="md" className={TAP} onClick={onDecline}>
              Not now
            </Button>
            <Button type="button" hierarchy="primary" size="md" className={TAP} onClick={onStart}>
              Show me
            </Button>
          </>
        }
      >
        <p>A quick tour shows what is where, in {steps} steps.</p>
      </Popover>
    </div>,
    document.body,
  );
}
