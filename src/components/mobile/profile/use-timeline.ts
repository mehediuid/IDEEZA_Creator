"use client";

// The Timeline's posts (lib/people/timeline.ts), read from the stores the Feed and the project pages
// read, so a post never disagrees with its project or its clip:
// · yours — every project you shared ("Share to Feed", `showcasedAt`) with its story and its clip
//   while it is on the marketplace, then everything you shared with your words ("Share to your
//   Feed": any marketplace project or product, yours or someone else's, read by share-items.ts — it
//   stays after the item leaves the Marketplace, and plays while its clip is on the Feed);
// · a sample creator's — their Feed posts, each with its clip.

import * as React from "react";
import { useCreateHistory } from "@/lib/create/history";
import { FEED_CLIPS, stageLabelOf } from "@/lib/innovations/clips";
import { ME } from "@/lib/innovations/people";
import { SAMPLE_POSTS } from "@/lib/innovations/sample-posts";
import { buildsOf, coverOf } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import type { MadeItem } from "@/lib/people/made";
import { phoneClipHref, projectPostOf, sharePostOf, timelineOf, type TimelinePost } from "@/lib/people/timeline";
import { useShareItems } from "@/components/shares/use-share-items";
import { useMineClips } from "../feed/use-clips";
import { useFeedPrefs } from "../feed/use-feed";

/** Your posts, newest first; `publicView` leaves out the shares only you see. */
export function useOwnTimeline(made: readonly MadeItem[], publicView: boolean): { ready: boolean; posts: TimelinePost[] } {
  const { hydrated: projectsReady, projects } = useManualProjects();
  const { hydrated: buildsReady, builds } = useCreateHistory();
  const { hydrated: clipsReady, clips } = useMineClips();
  const { hydrated: prefsReady, prefs } = useFeedPrefs();
  const items = useShareItems();
  const ready = projectsReady && buildsReady && clipsReady && prefsReady && items.hydrated;

  const posts = React.useMemo(() => {
    if (!ready) return [];
    const stageOf = new Map(made.flatMap((m) => (m.projectId ? [[m.projectId, m.stage] as const] : [])));
    const shared = projects.filter((p) => typeof p.showcasedAt === "number");
    const own = shared.map((p) => {
      const refs = buildsOf(p, builds);
      const clip = clips.find((c) => c.projectId === p.id && c.kind === "project") ?? null;
      return projectPostOf({
        projectId: p.id,
        postId: `mine:${p.id}`,
        title: p.name,
        caption: p.post?.story || p.description,
        at: p.showcasedAt as number,
        cover: coverOf(p, refs),
        stage: stageOf.get(p.id) ?? clip?.stage ?? null,
        clip,
      });
    });
    const playable = new Set([...clips.map((c) => c.id), ...FEED_CLIPS.map((c) => c.id)]);
    const shares = prefs.shares.map((s) => {
      const item = items.itemOf(s.clipId);
      return sharePostOf(s, item, { playHref: item && playable.has(item.id) ? phoneClipHref(item.id) : null, ownerId: ME.id });
    });
    return timelineOf([...own, ...shares], publicView);
  }, [ready, made, projects, builds, clips, prefs.shares, items, publicView]);

  return { ready, posts };
}

/** A sample creator's Feed posts, newest first. */
export function useSampleTimeline(feedId: string | null): TimelinePost[] {
  return React.useMemo(() => {
    if (!feedId) return [];
    const posts = SAMPLE_POSTS.filter((p) => p.creator.id === feedId).map((post) => {
      const clip = FEED_CLIPS.find((c) => c.postId === post.id && c.kind === "project") ?? null;
      return projectPostOf({
        projectId: post.id.replace(/^sample:/, ""),
        postId: post.id,
        title: post.title,
        caption: post.story || post.description,
        at: post.sharedAt,
        cover: clip?.poster ?? post.products[0]?.image ?? null,
        stage: stageLabelOf(post.stage),
        clip,
        base: post.base,
      });
    });
    return timelineOf(posts, true);
  }, [feedId]);
}
