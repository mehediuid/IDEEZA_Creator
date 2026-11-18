"use client";

// Two rail blocks only Explore marketplace's buyer view has (owner,
// 2026-11-15: the marketplace details page is the shop page, Innovations the
// story page; each links to the other and neither copies the other):
// - Creator: who made it — the creator's avatar and name (a link to their
//   profile) — and the one way to them: "Ask the creator", or "Get creator
//   support" for a holder (AskCreator, buyer-rail.tsx). It stays open when the
//   rail stacks, so the way to the creator never hides behind a fold.
// - On Innovations: only while the project is shared there. Its appreciations
//   and comments, and "Read the story" to the post — the mirror of the post's
//   "On Marketplace" card. The conversation has one home, the post.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { AvatarLabelGroup, buttonVariants } from "@/components/ideeza";
import { PersonName } from "@/components/profile/person-name";
import { RailBlock } from "@/components/projects/details/rail-block";
import type { SlotProps } from "@/components/projects/details/slots";
import { useCommentCount, type CommentSeed } from "@/lib/innovations/comments-store";
import { countsOf, useReactions } from "@/lib/innovations/reactions";
import { mineSlugOf, postHref, postIdOfProject } from "@/lib/innovations/slug";
import { ME } from "@/lib/messages/types";
import { cn } from "@/lib/utils";
import { AskCreator } from "./buyer-rail";
import { useCreator } from "./use-creator-name";

/** A shared project's post starts with no comments of its own (use-post.ts). */
const NO_SEED: CommentSeed = () => [];

export function CreatorRailBlock({ project, view, viewer }: SlotProps) {
  const creator = useCreator();
  if (viewer.kind !== "demo-buyer") return null;
  return (
    <RailBlock title="Creator" collapsible={false}>
      <div className="flex flex-col gap-6">
        <AvatarLabelGroup
          size="md"
          initials={creator.initials}
          color="var(--color-gray-700)"
          name={
            <PersonName id={ME} className="truncate">
              {creator.name}
            </PersonName>
          }
          supporting={`Made ${project.name}`}
        />
        <AskCreator projectId={project.id} sales={view.sales} buyerId={viewer.buyerId} />
      </div>
    </RailBlock>
  );
}

export function StoryRailBlock({ project, viewer }: SlotProps) {
  const shared = typeof project.showcasedAt === "number";
  const postId = postIdOfProject(project.id);
  const { reactions } = useReactions();
  const comments = useCommentCount(shared ? postId : null, NO_SEED);
  if (!shared || viewer.kind !== "demo-buyer") return null;
  const { appreciations } = countsOf(reactions, postId, { appreciations: 0, views: 0 });
  const said = comments ?? 0;
  return (
    <RailBlock title="On Innovations" meta={`${appreciations} appreciations · ${said} comments`}>
      <div className="flex flex-col gap-6">
        <p className="m-0 text-md text-text-secondary">
          <span className="tabular-nums">
            {appreciations} {appreciations === 1 ? "appreciation" : "appreciations"} · {said} {said === 1 ? "comment" : "comments"}
          </span>
          <br />
          The creator&apos;s story and the conversation about {project.name} are on its Innovations post.
        </p>
        <Link
          href={postHref(mineSlugOf(project))}
          className={cn(
            buttonVariants({ hierarchy: "secondary", size: "lg" }),
            "h-[44px] w-full gap-2 hover:text-[color:var(--color-button-secondary-text)]",
          )}
        >
          Read the story
          <Icon icon={ArrowRight01Icon} size={16} />
        </Link>
      </div>
    </RailBlock>
  );
}
