"use client";

// An article's status as DS A17 badges (spec § Statuses): the word always shows,
// so colour never carries the meaning alone. Live adds ★ Featured when the IDEEZA
// team picked it, and "Changes in review" while an update waits. Never the error
// badge (it fails contrast); never violet (that is for selection).

import * as React from "react";
import { Clock01Icon, StarIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, type BadgeTone } from "@/components/ideeza";
import { STATUS_LABEL, statusOf, type ArticleStatus } from "@/lib/blog/status";
import type { BlogArticle } from "@/lib/blog/types";

const TONE: Record<ArticleStatus, BadgeTone> = {
  draft: "neutral",
  review: "info",
  needs: "warning",
  live: "success",
  changes: "success",
  down: "neutral",
};

/** DS Badge MD: 24 px tall, Caption/MD. */
const MD = "gap-2 px-4 py-2 text-sm leading-xs";

export function StatusBadges({ article, className }: { article: BlogArticle; className?: string }) {
  const s = statusOf(article);
  return (
    <span className={["inline-flex flex-wrap items-center gap-2", className].filter(Boolean).join(" ")}>
      <Badge
        tone={TONE[s]}
        className={MD}
        icon={s === "down" ? <Icon icon={ViewOffSlashIcon} size={12} /> : s === "review" ? <Icon icon={Clock01Icon} size={12} /> : undefined}
      >
        {STATUS_LABEL[s]}
      </Badge>
      {article.featured && s !== "down" && (
        <Badge tone="success" className={MD} icon={<Icon icon={StarIcon} size={12} />}>
          Featured
        </Badge>
      )}
      {s === "changes" && (
        <Badge tone="info" className={MD} icon={<Icon icon={Clock01Icon} size={12} />}>
          Changes in review
        </Badge>
      )}
    </span>
  );
}
