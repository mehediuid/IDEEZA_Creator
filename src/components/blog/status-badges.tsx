"use client";

// A blog's status as a DS A17 badge, in the Figma's words (requirements L9):
// Featured · Approved · Draft · Re-submitted · Removed · Pending · Rejected. The
// word always shows, so colour never carries the meaning alone. Tones come from
// the DS A17 Subtle set: Featured brand, Approved success, Pending warning,
// Re-submitted blue (the DS has no magenta), Draft and Removed neutral, and
// Rejected the A17 Subtle/Error fill (5.91:1 light, 6.93:1 dark) as frame 01
// draws it. A leading mark only where the Figma or the meaning needs one:
// Featured's star (the Figma's gem reads as "paid") and Removed's eye-off. A
// Featured blog whose update waits for review keeps its Featured badge beside
// Re-submitted, so the feature never looks lost (F23).

import * as React from "react";
import { StarIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, type BadgeTone } from "@/components/ideeza";
import { DISPLAY_LABEL, DISPLAY_SENTENCE, displayStatusOf, featuredUpdating, type DisplayStatus } from "@/lib/blog/status";
import type { BlogArticle } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

const TONE: Record<DisplayStatus, BadgeTone> = {
  featured: "brand",
  approved: "success",
  draft: "neutral",
  resubmitted: "info",
  removed: "neutral",
  pending: "warning",
  rejected: "error",
};

/** DS Badge MD: 24 px tall, Caption/MD. */
const MD = "gap-2 px-4 py-2 text-sm leading-xs";

function iconOf(s: DisplayStatus): React.ReactNode {
  if (s === "featured") return <Icon icon={StarIcon} size={12} />;
  if (s === "removed") return <Icon icon={ViewOffSlashIcon} size={12} />;
  return undefined;
}

export function StatusBadge({ status, className }: { status: DisplayStatus; className?: string }) {
  return (
    <Badge tone={TONE[status]} className={cn(MD, className)} icon={iconOf(status)}>
      <span title={DISPLAY_SENTENCE[status]}>{DISPLAY_LABEL[status]}</span>
    </Badge>
  );
}

/** The blog's badge, or two when a Featured blog's update waits for review. */
export function StatusBadges({ article, className }: { article: BlogArticle; className?: string }) {
  const status = displayStatusOf(article);
  if (!featuredUpdating(article)) return <StatusBadge status={status} className={className} />;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <StatusBadge status="featured" />
      <StatusBadge status={status} />
    </span>
  );
}
