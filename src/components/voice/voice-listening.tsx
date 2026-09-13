"use client";

// VoiceListening — what a prompt box becomes while the microphone is
// open: the state it is in, the sound it is actually hearing, and the
// two ways out. Presentational only — every value arrives as a prop, so
// the composer that hosts it owns the `useVoiceInput` session and this
// view can't hold a second, disagreeing copy of it.
//
// The waveform is the microphone's real loudness (`levels` from the
// hook, 0..1, newest last), not a decorative animation.

import * as React from "react";
import { cn } from "@/lib/utils";

// One screenful of waveform — the same count `useVoiceInput` keeps, so a
// full buffer fills the row exactly and a shorter one leaves the tail at
// rest rather than stretching to fit.
const BARS = 78;
// A bar with no sound in it is still a bar; loudness adds on top.
const BAR_MIN = 4;
const BAR_SPAN = 32;

export function VoiceListening({
  levels,
  interim,
  onCancel,
  onStop,
  className,
}: {
  levels: number[];
  interim: string;
  onCancel: () => void;
  onStop: () => void;
  className?: string;
}): React.JSX.Element {
  // Newest last: until the buffer is full the recorded samples sit left
  // and the rest wait at rest height; after that the row scrolls.
  const recorded = levels.length > BARS ? levels.slice(-BARS) : levels;
  const said = interim.trim();

  return (
    <div
      className={cn(
        "flex flex-col gap-[14px] rounded-2xl border-[1.5px] border-solid border-border-brand bg-bg-surface p-[16px]",
        className,
      )}
    >
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-[8px]"
      >
        <span
          aria-hidden="true"
          className="h-[10px] w-[10px] shrink-0 rounded-full bg-bg-brand"
        />
        <span className="text-[15px] font-semibold text-text-primary">
          Listening…
        </span>
      </div>

      {/* The header already says what is happening; the bars are the
          picture of it, so they stay out of the accessibility tree. */}
      <div
        aria-hidden="true"
        className="flex h-[48px] items-center gap-[3px] overflow-hidden"
      >
        {Array.from({ length: BARS }, (_, i) => {
          const level = recorded[i];
          const heard = level !== undefined;
          const height = heard
            ? BAR_MIN + BAR_SPAN * Math.min(1, Math.max(0, level))
            : BAR_MIN;
          return (
            <span
              key={i}
              data-bar={heard ? "heard" : "waiting"}
              style={{ height: `${height}px` }}
              className={cn(
                "w-[3px] shrink-0 rounded-[2px] bg-bg-brand",
                "transition-[height] duration-normal ease-decelerate motion-reduce:transition-none",
                !heard && "opacity-20",
              )}
            />
          );
        })}
      </div>

      {said && <p className="truncate text-sm text-text-secondary">{said}</p>}

      <div className="flex items-center justify-between gap-[12px]">
        <span className="text-sm text-text-tertiary">
          Tap Stop when you&apos;re done
        </span>
        <div className="flex shrink-0 items-center gap-[8px]">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-[36px] items-center rounded-lg px-[14px] text-md font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onStop}
            className="inline-flex h-[36px] items-center rounded-lg bg-bg-brand px-[16px] text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Stop &amp; review
          </button>
        </div>
      </div>
    </div>
  );
}
