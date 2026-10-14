"use client";

// usePost — the post at /innovations/<slug>, from either source (plan §8):
// a sample post straight from sample-posts.ts, or a project this browser
// shared, read through the project page's own derivation (useProjectPageData)
// so the post and the project never disagree. Until every store is read it
// says "loading", so nothing flashes a state it isn't.
//
// `owner` is true only on this browser's own project: then the post shows the
// maker's bar (Edit post, Stop sharing) and the maker's comment menu.

import * as React from "react";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import type { StoredDraft } from "@/lib/brief/project-brief";
import type { CommentSeed } from "@/lib/innovations/comments-store";
import { minePostOf } from "@/lib/innovations/mine-post";
import { samplePostBySlug, sampleSeedOf } from "@/lib/innovations/sample-posts";
import { findMineBySlug } from "@/lib/innovations/slug";
import type { InnovationPost } from "@/lib/innovations/types";
import type { ProjectView } from "@/lib/manual/project-read";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { protocolShort } from "@/lib/network/catalog";
import { useProjectNetwork } from "@/lib/network/store";
import { useMe } from "@/lib/people/profile-store";

export type MinePostFacts = { project: ManualProject; view: ProjectView; brief: StoredDraft | null };

export type PostPageData =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "ready"; post: InnovationPost; owner: boolean; seed: CommentSeed; mine: MinePostFacts | null };

const NO_SEED: CommentSeed = () => [];

export function usePost(slug: string): PostPageData {
  const sample = React.useMemo(() => samplePostBySlug(slug), [slug]);
  const { hydrated, projects } = useManualProjects();
  const project = sample ? null : findMineBySlug(projects, slug);
  const data = useProjectPageData(project?.id ?? "", "project");
  const { network } = useProjectNetwork(project?.id ?? null);

  const networkLabel = network
    ? `${protocolShort(network.protocol)} · ${network.productIds.length} ${network.productIds.length === 1 ? "product" : "products"}`
    : null;
  // Your own post carries your profile name and initials ("You" until you give a name).
  const me = useMe();
  const mine = React.useMemo(() => {
    if (data.state !== "ready") return null;
    const post = minePostOf(data.project, data.view, networkLabel);
    return { ...post, creator: { ...post.creator, name: me.name, initials: me.initials } };
  }, [data, networkLabel, me]);

  if (sample) return { state: "ready", post: sample, owner: false, seed: sampleSeedOf(sample.id), mine: null };
  if (!hydrated) return { state: "loading" };
  if (!project) return { state: "missing" };
  if (data.state !== "ready" || !mine) return data.state === "missing" ? { state: "missing" } : { state: "loading" };
  return { state: "ready", post: mine, owner: true, seed: NO_SEED, mine: { project: data.project, view: data.view, brief: data.brief } };
}
