"use client";

// The two badges that ride on the My projects card (B2) and the project
// details header alike (B2 amendment: this file is shared so C2 doesn't
// build them again). §4's icon table: Draft ○ circle · Private lock · Given
// hand-heart · Listed tag · Minted hexagon · Showcase eye.

import * as React from "react";
import { CircleIcon, LockIcon, HandHeartIcon, Tag01Icon, Hexagon01Icon, EyeIcon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza";
import { SHOWCASE_BADGE, STATUS_ICON, type IconName, type ProjectStatus } from "@/lib/manual/project-summary";

/** The one place a status/showcase icon name (project-summary.ts is UI-free)
 *  turns into a real Hugeicons glyph. Exported so project-card.tsx's empty
 *  tab states (same five names) don't keep a second copy of this table. */
export const ICONS: Record<IconName, IconValue> = {
  circle: CircleIcon,
  lock: LockIcon,
  "hand-heart": HandHeartIcon,
  tag: Tag01Icon,
  hexagon: Hexagon01Icon,
  eye: EyeIcon,
};

/** LST-35: word + icon, sentence case; Draft neutral, every minted word
 *  success tone; the same word as the details chip — both callers pass
 *  `summary.status` / `summary.statusWord`, straight from `STATUS_WORD`
 *  (project-summary.ts), so they can't drift. Never violet. */
export function StatusChip({ status, word }: { status: ProjectStatus; word: string }) {
  const neutral = status === "draft";
  return (
    <Badge
      tone={neutral ? "neutral" : "success"}
      icon={<Icon icon={ICONS[STATUS_ICON[status]]} size={12} />}
      className="h-[22px] items-center gap-[4px] px-[8px] py-0 text-sm font-semibold leading-none"
    >
      {word}
    </Badge>
  );
}

/** LST-65: eye icon + "Showcase", info tone, never violet, not a control;
 *  its accessible name comes from `SHOWCASE_BADGE.ariaLabel` ("Showcased"). */
export function ShowcaseChip() {
  return (
    <span role="img" aria-label={SHOWCASE_BADGE.ariaLabel} className="inline-flex">
      <Badge
        tone="info"
        icon={<Icon icon={ICONS[SHOWCASE_BADGE.icon]} size={12} />}
        className="h-[22px] items-center gap-[4px] px-[8px] py-0 text-sm font-semibold leading-none"
      >
        {SHOWCASE_BADGE.word}
      </Badge>
    </span>
  );
}
