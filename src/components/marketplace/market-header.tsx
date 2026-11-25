"use client";

// The buyer view's header (Phase 2 spec §2.4; P2-MARKETPLACE-8, -9 as
// changed; owner, 2026-11-15: the marketplace details page is a shop page,
// media first, as the phone's approved market screen):
// - the project's media stage on top — the project video in use, then each
//   product's, then the images, with their thumbnails — the Innovations
//   post's own stage (post-media.tsx), so the two pages show the project the
//   same way;
// - then the project page's own ProjectHeader in its "market" context, so
//   the two can't drift: the h1 with no pencil, the status chip ("Listed" for
//   any live listing, the line naming Auction), "Created by {the creator} ·
//   Listed {date}" — the page speaks to the buyer, never "you" for the
//   creator — the read-only description and the project's Activity. `can()`
//   refuses the demo buyer every owner control, so the pair, the pencil and
//   Preview as buyer are absent, not disabled (PPL-6).
// The way back to the owner's own page is the Testnet demo banner's.
// Share sits at the end of the title row (owner, 2026-11-22): this is your
// own project, so it holds Copy link and the networks only — Share to
// Innovations for it is the project page's ⋯ (shares/share-button.tsx).

import * as React from "react";
import { PostMediaStage } from "@/components/innovations/post-media";
import { ProjectHeader } from "@/components/projects/details/header";
import type { HeaderSlotProps, SlotProps } from "@/components/projects/details/slots";
import { MarketShareButton } from "@/components/shares/share-button";
import { minePostOf } from "@/lib/innovations/mine-post";
import { shareItemId } from "@/lib/innovations/share-items";
import { postIdOfProject } from "@/lib/innovations/slug";
import { MarketReportMenu } from "./report-menu";
import { useCreatorName } from "./use-creator-name";

/** The title row's Share, then ⋯ with Report project (owner, 2026-11-24), pushed to the row's end. */
function MarketShare({ project }: SlotProps) {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-4">
      <MarketShareButton itemId={shareItemId("mine", project.id)} title={project.name.trim() || "Untitled project"} />
      <MarketReportMenu reportId={postIdOfProject(project.id)} target="project" />
    </div>
  );
}

const PARTS = { titleRow: [MarketShare] };

export function MarketHeader(props: HeaderSlotProps) {
  const { project, view, brief } = props;
  const creator = useCreatorName();
  const post = React.useMemo(() => minePostOf(project, view), [project, view]);
  const mine = React.useMemo(() => ({ project, view, brief }), [project, view, brief]);
  return (
    <div className="flex flex-col gap-10">
      <PostMediaStage post={post} mine={mine} />
      <ProjectHeader {...props} context="market" creatorName={creator} parts={PARTS} />
    </div>
  );
}
