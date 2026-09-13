"use client";

// IDEEZA Design System — Banner
//
// One line at the top of a step saying whether it is clear to continue. Two
// tones only, on purpose: `good` (it passed) and `attention` (something needs
// fixing before Next). There is deliberately no neutral third state — a banner
// that says nothing is noise, and an empty state belongs in the panel it
// describes, not here.
//
// It is a polite live region: the pin/pad match re-evaluates on every pad edit,
// so an assertive alert would interrupt the user mid-drag on every change.

import * as React from "react";
import { cn } from "@/lib/utils";

// Weight matches urgency. `attention` blocks Next, so it takes a filled, bordered
// box; `good` is the absence of a problem, and a full-width saturated slab
// announcing that nothing is wrong competed with the step heading for the eye.
// It keeps the tick and the success colour, and gives up the fill and the edge.
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
} as const;

export type BannerTone = keyof typeof TONES;

export interface BannerProps {
  tone: BannerTone;
  children: React.ReactNode;
  className?: string;
}

export function Banner({ tone, children, className }: BannerProps) {
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
        className="mt-[2px] shrink-0"
      >
        <path d={t.glyph} />
      </svg>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}
