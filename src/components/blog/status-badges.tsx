"use client";

// A blog's status as a DS A17 badge, in the Figma's words (requirements L9):
// Featured · Approved · Draft · Re-submitted · Removed · Pending · Rejected. The
// word always shows, so colour never carries the meaning alone. Tones come from
// the DS: Featured brand with a star (the Figma's gem reads as "paid"); Approved
// success; Pending warning; Re-submitted blue (the DS has no magenta); Draft and
// Removed neutral, Removed with its eye-off mark; Rejected the error ink on the
// surface with an error border — the DS error fill under 12 px text fails AA.

import * as React from "react";
import { Clock01Icon, StarIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, type BadgeTone } from "@/components/ideeza";
import { DISPLAY_LABEL, DISPLAY_SENTENCE, displayStatusOf, type DisplayStatus } from "@/lib/blog/status";
import type { BlogArticle } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

const TONE: Record<DisplayStatus, BadgeTone> = {
  featured: "brand",
  approved: "success",
  draft: "neutral",
  resubmitted: "info",
  removed: "neutral",
  pending: "warning",
  rejected: "neutral",
};

/** DS Badge MD: 24 px tall, Caption/MD. */
const MD = "gap-2 px-4 py-2 text-sm leading-xs";

const EXTRA: Partial<Record<DisplayStatus, string>> = {
  rejected: "border border-solid border-border-error bg-bg-surface text-text-error",
};

function iconOf(s: DisplayStatus): React.ReactNode {
  if (s === "featured") return <Icon icon={StarIcon} size={12} />;
  if (s === "removed") return <Icon icon={ViewOffSlashIcon} size={12} />;
  if (s === "pending" || s === "resubmitted") return <Icon icon={Clock01Icon} size={12} />;
  return undefined;
}

export function StatusBadge({ status, className }: { status: DisplayStatus; className?: string }) {
  return (
    <Badge tone={TONE[status]} className={cn(MD, EXTRA[status], className)} icon={iconOf(status)}>
      <span title={DISPLAY_SENTENCE[status]}>{DISPLAY_LABEL[status]}</span>
    </Badge>
  );
}

export function StatusBadges({ article, className }: { article: BlogArticle; className?: string }) {
  return <StatusBadge status={displayStatusOf(article)} className={className} />;
}
