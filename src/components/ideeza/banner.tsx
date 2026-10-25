"use client";

// IDEEZA Design System — Banner (Figma M01 Alert, Size=SM)
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
import {
  AlertCircleIcon,
  CancelCircleHalfDotIcon,
  CheckmarkCircle04Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";

// M01's Severity: every tone is the same box (its subtle fill and its edge),
// and the tone lives in the 18 px badge and the action. The words take the
// page's ink, as M01 sets them.
const TONES = {
  good: {
    box: "border-[var(--color-border-success)] bg-[var(--color-bg-success-subtle)]",
    badge: "bg-[var(--color-icon-success)]",
    action: "text-[color:var(--color-icon-success)]",
    glyph: CheckmarkCircle04Icon,
  },
  attention: {
    box: "border-[var(--color-border-warning)] bg-[var(--color-bg-warning-subtle)]",
    badge: "bg-[var(--color-icon-warning)]",
    action: "text-[color:var(--color-icon-warning)]",
    glyph: AlertCircleIcon,
  },
  info: {
    box: "border-[var(--color-border-blue)] bg-[var(--color-bg-info-subtle)]",
    badge: "bg-[var(--color-icon-blue)]",
    action: "text-[color:var(--color-icon-blue)]",
    glyph: InformationCircleIcon,
  },
  error: {
    box: "border-[var(--color-border-error)] bg-[var(--color-bg-error-subtle)]",
    badge: "bg-[var(--color-icon-error)]",
    action: "text-[color:var(--color-icon-error)]",
    glyph: CancelCircleHalfDotIcon,
  },
} as const;

export type BannerTone = keyof typeof TONES;

export interface BannerProps {
  tone: BannerTone;
  /** Optional heading above the message (M01's title, with the message as its description). */
  title?: React.ReactNode;
  children: React.ReactNode;
  /**
   * A control the banner offers with its message — e.g. Preview as buyer's
   * Exit preview (PPL-5), or a pending-version notice's Review version /
   * Open chat (COR-18). It sits under the text, as M01's action row does, in
   * the tone's icon colour.
   */
  action?: React.ReactNode;
  className?: string;
}

export function Banner({ tone, title, children, action, className }: BannerProps) {
  const t = TONES[tone];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        // M01 SM pads 12 / 14 inside its stroke; the CSS border sits outside, so it comes off the padding.
        "flex items-center gap-[var(--spacing-5)] rounded-[var(--radius-lg)] border-[length:var(--border-width-1)] border-solid",
        "px-[calc(var(--spacing-7)_-_var(--border-width-1))] py-[calc(var(--spacing-6)_-_var(--border-width-1))]",
        "font-[family-name:var(--font-family-body)] text-[length:var(--font-size-md)] leading-md text-[color:var(--color-text-primary)]",
        t.box,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex size-[var(--spacing-9)] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-on-brand)]",
          t.badge,
        )}
      >
        <Icon icon={t.glyph} size={12} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-1)]">
        {title ? (
          <>
            <div className="font-medium">{title}</div>
            <div className="text-[length:var(--font-size-sm)] leading-xs text-[color:var(--color-text-secondary)]">{children}</div>
          </>
        ) : (
          <div className="font-medium">{children}</div>
        )}
        {action && <div className={cn("flex flex-wrap items-center font-medium", t.action)}>{action}</div>}
      </div>
    </div>
  );
}
