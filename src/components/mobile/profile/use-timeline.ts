"use client";

// The Timeline's posts (lib/people/timeline.ts), read from the stores the Feed and the project pages
// read, so a post never disagrees with its project or its clip:
// · yours — every project you shared ("Share to Feed", `showcasedAt`) with its story, its products
//   and its clip while it is on the marketplace, then every clip you shared to your Feed with words
//   ("Share to your Feed", yours or someone else's);
// · a sample creator's — their Feed posts, each with its products and its clip.

import * as React from "react";
import { useCreateHistory } from "@/lib/create/history";
import { FEED_CLIPS, stageLabelOf, type FeedClip } from "@/lib/innovations/clips";
import { ME } from "@/lib/innovations/people";
import { SAMPLE_POSTS } from "@/lib/innovations/sample-posts";
import { buildsOf, coverOf, productsOfProject } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import type { MadeItem } from "@/lib/people/made";
import { projectPostOf, sharePostOf, timelineOf, type TimelinePost } from "@/lib/people/timeline";
import { useMineClips } from "../feed/use-clips";
import { useFeedPrefs } from "../feed/use-feed";

/** Your posts, newest first; `publicView` leaves out the shares only you see. */
export function useOwnTimeline(made: readonly MadeItem[], publicView: boolean): { ready: boolean; posts: TimelinePost[] } {
  const { hydrated: projectsReady, projects } = useManualProjects();
  const { hydrated: buildsReady, builds } = useCreateHistory();
  const { hydrated: clipsReady, clips } = useMineClips();
  const { hydrated: prefsReady, prefs } = useFeedPrefs();
  const ready = projectsReady && buildsReady && clipsReady && prefsReady;

  const posts = React.useMemo(() => {
    if (!ready) return [];
    const stageOf = new Map(made.flatMap((m) => (m.projectId ? [[m.projectId, m.stage] as const] : [])));
    const shared = projects.filter((p) => typeof p.showcasedAt === "number");
    const own = shared.map((p) => {
      const refs = buildsOf(p, builds);
      const products = productsOfProject(p, refs).filter((x) => x.dropped === null);
      const clip = clips.find((c) => c.projectId === p.id && c.kind === "project") ?? null;
      return projectPostOf({
        projectId: p.id,
        postId: `mine:${p.id}`,
        title: p.name,
        caption: p.post?.story || p.description,
        at: p.showcasedAt as number,
        cover: coverOf(p, refs),
        stage: stageOf.get(p.id) ?? clip?.stage ?? null,
        products: products.map((x) => ({ id: x.id, name: x.name, image: x.built?.product.conceptImageUrl || null })),
        clip,
      });
    });
    const byId = (id: string): FeedClip | null => clips.find((c) => c.id === id) ?? FEED_CLIPS.find((c) => c.id === id) ?? null;
    // A shared clip reads as the post it shares: a project with its products, a product with its project.
    const shares = prefs.shares.flatMap((s) => {
      const clip = byId(s.clipId);
      if (!clip) return [];
      if (clip.source === "mine") {
        const p = projects.find((x) => x.id === clip.projectId);
        const products = p ? productsOfProject(p, buildsOf(p, builds)).filter((x) => x.dropped === null) : [];
        return [
          sharePostOf(s, clip, {
            projectTitle: p?.name.trim() || null,
            products: products.map((x) => ({ id: x.id, name: x.name, image: x.built?.product.conceptImageUrl || null })),
            ownerId: ME.id,
          }),
        ];
      }
      const post = SAMPLE_POSTS.find((p) => p.id === clip.postId);
      return [sharePostOf(s, clip, { projectTitle: post?.title ?? null, products: post?.products ?? [], ownerId: ME.id })];
    });
    return timelineOf([...own, ...shares], publicView);
  }, [ready, made, projects, builds, clips, prefs.shares, publicView]);

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
        products: post.products.map((x) => ({ id: x.id, name: x.name, image: x.image })),
        clip,
        base: post.base,
      });
    });
    return timelineOf(posts, true);
  }, [feedId]);
}
