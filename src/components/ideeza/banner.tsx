"use client";

// IDEEZA Design System — Banner
//
// One line saying where a step or a job stands. Four tones, each earning its
// place: `good` (it passed), `attention` (something needs fixing before Next),
// `info` (a state the user is waiting out — queued, starting shortly) and
// `error` (it failed, and not through anything the user did). There is
// deliberately no tone for "nothing to report" — a banner that says nothing is
// noise, and an empty state belongs in the panel it describes, not here.
//
// `info` and `error` arrived with the build page, which had grown its own
// second Banner with its own tone table and its own hardcoded padding. One
// atom now carries both — the package flow's pass/fail line and the build
// page's queue, partial-failure and system-failure banners.
//
// It is a polite live region: the pin/pad match re-evaluates on every pad edit,
// so an assertive alert would interrupt the user mid-drag on every change.

import * as React from "react";
import { cn } from "@/lib/utils";

// Weight matches urgency. Everything that asks something of the user, or
// reports a failure, takes a filled, bordered box; `good` is the absence of a
// problem, and a full-width saturated slab announcing that nothing is wrong
// competed with the step heading for the eye. It keeps the tick and the success
// colour, and gives up the fill and the edge.
const TONES = {
  good: {
    box: "text-[color:var(--color-text-success)]",
    boxed: false,
    glyph: "M20 6L9 17l-5-5",
  },
  attention: {
    box: "border-[var(--color-border-warning)] bg-[var(--color-bg-warning-subtle)] text-[color:var(--color-text-warning)]",
    boxed: true,
    glyph: "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z",
  },
  info: {
    box: "border-[var(--color-border-blue)] bg-[var(--color-bg-info-subtle)] text-[color:var(--color-text-blue)]",
    boxed: true,
    glyph: "M12 16v-4M12 8h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  error: {
    box: "border-[var(--color-border-error)] bg-[var(--color-bg-error-subtle)] text-[color:var(--color-text-error)]",
    boxed: true,
    glyph: "M15 9l-6 6M9 9l6 6M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
} as const;

export type BannerTone = keyof typeof TONES;

export interface BannerProps {
  tone: BannerTone;
  /**
   * Optional heading above the message. With one, the tone colours the glyph
   * alone and the words take the page's own text colours — a two-line banner
   * printed entirely in the tone reads as a warning about itself. Without one,
   * the whole line stays in the tone, which is what a single sentence wants.
   */
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Banner({ tone, title, children, className }: BannerProps) {
  const t = TONES[tone];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-[var(--spacing-4)] rounded-[var(--radius-lg)]",
        "text-[length:var(--font-size-md)] leading-md font-[family-name:var(--font-family-body)]",
        t.boxed ? "border px-[var(--spacing-6)] py-[var(--spacing-5)]" : "py-[var(--spacing-1)]",
        t.box,
        className,
      )}
      style={t.boxed ? { borderWidth: "var(--border-width-1)" } : undefined}
    >
      <svg
        aria-hidden
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-[var(--spacing-1)] shrink-0"
      >
        <path d={t.glyph} />
      </svg>
      {title ? (
        <span className="min-w-0 flex-1">
          <span className="block font-[var(--font-weight-semibold)] text-[color:var(--color-text-primary)]">{title}</span>
          <span className="mt-[var(--spacing-1)] block text-[length:var(--font-size-sm)] text-[color:var(--color-text-secondary)]">{children}</span>
        </span>
      ) : (
        <span className="min-w-0 flex-1">{children}</span>
      )}
    </div>
  );
}
