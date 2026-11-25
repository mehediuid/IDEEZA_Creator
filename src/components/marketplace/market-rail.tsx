"use client";

// Two rail blocks only Explore marketplace's buyer view has (owner,
// 2026-11-15: the marketplace details page is the shop page, Innovations the
// story page; each links to the other and neither copies the other), for a
// listing of this browser's — its project page and its product pages. Both are
// drawn by rail-blocks.tsx, the same blocks a sample's page shows (owner,
// 2026-11-24: one rail on every marketplace page):
// - Creator: who made it — the creator's avatar, name (a link to their
//   profile) and projects on Innovations — and the one way to them: "Ask the
//   creator", or "Get creator support" for a holder (AskCreator,
//   buyer-rail.tsx). It stays open when the rail stacks, so the way to the
//   creator never hides behind a fold. "See what you own" is the Marketplace
//   block's, with the purchase.
// - On Innovations: only while the project is shared there. Its appreciations
//   and comments, and "Read the story" to the post — the mirror of the post's
//   "On Marketplace" card. The conversation has one home, the post.

import * as React from "react";
import { PersonName } from "@/components/profile/person-name";
import { useMakerPostCount, makerLineOf } from "@/components/innovations/post-rail";
import type { SlotProps } from "@/components/projects/details/slots";
import { useCommentCount, type CommentSeed } from "@/lib/innovations/comments-store";
import { countsOf, useReactions } from "@/lib/innovations/reactions";
import { mineSlugOf, postHref, postIdOfProject } from "@/lib/innovations/slug";
import { ME_ID } from "@/lib/innovations/types";
import { ME } from "@/lib/messages/types";
import { AskCreator } from "./buyer-rail";
import { CreatorBlock, OnInnovationsBlock } from "./rail-blocks";
import { useCreator } from "./use-creator-name";

/** A shared project's post starts with no comments of its own (use-post.ts). */
const NO_SEED: CommentSeed = () => [];

export function CreatorRailBlock({ project, view, viewer }: Pick<SlotProps, "project" | "view" | "viewer">) {
  const creator = useCreator();
  const count = useMakerPostCount(ME_ID);
  if (viewer.kind !== "demo-buyer") return null;
  return (
    <CreatorBlock
      initials={creator.initials}
      color="var(--color-gray-700)"
      name={
        <PersonName id={ME} className="truncate">
          {creator.name}
        </PersonName>
      }
      supporting={makerLineOf(count)}
      actions={[<AskCreator projectId={project.id} sales={view.sales} buyerId={viewer.buyerId} key="ask" />]}
    />
  );
}

export function StoryRailBlock({ project, viewer }: Pick<SlotProps, "project" | "viewer">) {
  const shared = typeof project.showcasedAt === "number";
  const postId = postIdOfProject(project.id);
  const { reactions } = useReactions();
  const comments = useCommentCount(shared ? postId : null, NO_SEED);
  if (!shared || viewer.kind !== "demo-buyer") return null;
  const { appreciations } = countsOf(reactions, postId, { appreciations: 0, views: 0 });
  return (
    <OnInnovationsBlock title={project.name} href={postHref(mineSlugOf(project))} appreciations={appreciations} comments={comments ?? 0} />
  );
}
