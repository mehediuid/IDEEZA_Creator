// A profile's Made list (spec 2026-10-14-creator-profile-design.md): only what
// is already public. For you, a project shared to Innovations or with a live
// Main listing or live copies; never a draft or a private project, not even as
// a count others can see. For a sample creator, their Innovations posts. Each
// item opens its public page (the post when shared, else the marketplace
// listing) and carries its current Activity. Up to three pinned projects lead,
// then the newest change. Pure, relative imports only.

import { currentOf, shortOf, type ProjectJourney } from "../manual/journey";
import { mineSlugOf, postHref } from "../innovations/slug";
import { sampleJourneyOf } from "../innovations/sample-activity";
import type { InnovationPost } from "../innovations/types";

export type MadeSale = "whole" | "copies";

export type MadeItem = {
  key: string;
  /** Your project's id; null for a sample post. */
  projectId: string | null;
  title: string;
  href: string;
  cover: string | null;
  /** The current Activity's short name ("Testing"). */
  stage: string | null;
  /** Its catalogue id ("testing"), for the badge tone and "in production". */
  stageId: string | null;
  stageAt: number | null;
  sale: MadeSale | null;
  pinned: boolean;
  changedAt: number;
  /** Products in the project. */
  products: number;
  /** One or two plain sentences: the post's description or story. */
  summary: string;
  /** The feed category ("IoT"); null when the project has none. */
  category: string | null;
};

export type MineInput = {
  id: string;
  name: string;
  createdAt: number;
  showcasedAt: number | null;
  cover: string | null;
  /** The newest Main listing is live (Buy now or a running auction). */
  mainLive: boolean;
  /** At least one copy track is listed and not sold out. */
  copiesLive: boolean;
  journey: ProjectJourney;
  /** When the live listing (or the newest live track) went up. */
  listedAt: number | null;
  products?: number;
  summary?: string;
  category?: string | null;
};

const PROJECT = { kind: "project" } as const;

function stageOf(j: ProjectJourney, projectId: string, createdAt: number): { stage: string | null; stageId: string | null; at: number | null } {
  const current = currentOf(j, projectId, PROJECT, createdAt);
  return current ? { stage: shortOf(current), stageId: current.type, at: current.updatedAt } : { stage: null, stageId: null, at: null };
}

function ordered(items: MadeItem[], pins: readonly string[]): MadeItem[] {
  const pinned = pins.flatMap((id) => items.filter((m) => m.projectId === id));
  const rest = items.filter((m) => !m.pinned).sort((a, b) => b.changedAt - a.changedAt);
  return [...pinned, ...rest];
}

export function madeOfMine(projects: readonly MineInput[], pins: readonly string[]): MadeItem[] {
  const items: MadeItem[] = [];
  for (const p of projects) {
    const shared = p.showcasedAt !== null;
    if (!shared && !p.mainLive && !p.copiesLive) continue;
    const { stage, stageId, at } = stageOf(p.journey, p.id, p.createdAt);
    const title = p.name.trim() || "Untitled project";
    items.push({
      key: `mine:${p.id}`,
      projectId: p.id,
      title,
      href: shared ? postHref(mineSlugOf({ id: p.id, name: p.name })) : `/marketplace/${encodeURIComponent(p.id)}`,
      cover: p.cover,
      stage,
      stageId,
      stageAt: at,
      sale: p.mainLive ? "whole" : p.copiesLive ? "copies" : null,
      pinned: pins.includes(p.id),
      changedAt: Math.max(at ?? 0, p.showcasedAt ?? 0, p.listedAt ?? 0),
      products: p.products ?? 0,
      summary: (p.summary ?? "").trim(),
      category: p.category ?? null,
    });
  }
  return ordered(items, pins);
}

function coverOfPost(post: InnovationPost): string | null {
  const image = post.media.find((m) => m.kind === "image");
  if (image && image.kind === "image") return image.src;
  return post.products.find((p) => p.image)?.image ?? null;
}

/** A sample creator's posts (`creatorFeedId` is the feed's own id, "c1"). `now`, when given,
 *  dates their Activity as the post page does, so the two never disagree. */
export function madeOfSample(posts: readonly InnovationPost[], creatorFeedId: string, now?: number): MadeItem[] {
  const items: MadeItem[] = posts
    .filter((post) => post.creator.id === creatorFeedId)
    .map((post) => {
      const current = currentOf(sampleJourneyOf(post, now), post.id, PROJECT, post.createdAt);
      const at = current ? current.updatedAt : null;
      return {
        key: post.id,
        projectId: null,
        title: post.title,
        href: postHref(post.slug),
        cover: coverOfPost(post),
        stage: current ? shortOf(current) : post.stage,
        stageId: current ? current.type : post.stage,
        stageAt: at,
        sale: post.listing ? "whole" : null,
        pinned: false,
        changedAt: Math.max(at ?? 0, post.updatedAt),
        products: post.products.length,
        summary: (post.description || post.story).trim(),
        category: post.category,
      };
    });
  return ordered(items, []);
}

/** For your own line: how many projects others see, and how many stay private. */
export function ownerCounts(all: readonly { id: string }[], made: readonly MadeItem[]): { shown: number; hidden: number } {
  const shown = made.filter((m) => m.projectId !== null).length;
  return { shown, hidden: Math.max(0, all.length - shown) };
}
