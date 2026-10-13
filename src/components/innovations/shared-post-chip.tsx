"use client";

// The project header's "Shared" chip for the maker (plan P5): a link to the
// post on Innovations, with the post's comment count — the one count the post
// and its feed card show (plan §7) — so new comments are one press away from
// the project. The thread itself lives only on the post (one home).

import * as React from "react";
import Link from "next/link";
import { ViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useCommentCount, type CommentSeed } from "@/lib/innovations/comments-store";
import { mineSlugOf, postHref, postIdOfProject } from "@/lib/innovations/slug";

const NO_SEED: CommentSeed = () => [];

export function SharedPostChip({ project }: { project: { id: string; name: string } }) {
  const count = useCommentCount(postIdOfProject(project.id), NO_SEED);
  const comments = count ? ` · ${count} ${count === 1 ? "comment" : "comments"}` : "";
  return (
    <Link
      href={`${postHref(mineSlugOf(project))}${count ? "#comments" : ""}`}
      aria-label={`Shared to Innovations${comments}. Open the post.`}
      className="inline-flex h-[22px] items-center gap-[4px] whitespace-nowrap rounded-full bg-badge-blue-bg px-[8px] text-sm font-semibold leading-none text-badge-blue-text outline-none transition-colors duration-fast hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <Icon icon={ViewIcon} size={12} aria-hidden />
      {`Shared${comments}`}
    </Link>
  );
}
