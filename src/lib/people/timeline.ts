// A profile's Timeline on the phone (owner 2026-11-22: "a timeline on my profile — which projects I
// share, which products, what kind"): every post the creator put on the Feed, newest first.
// · A project they shared ("Share to Feed" on its page, `showcasedAt`; a sample creator's post): the
//   project with its story, its picture and its current Activity.
// · A share ("Share to your Feed", owner 2026-11-22: Facebook's re-share): their words over the
//   original item — any project or product of the Marketplace, theirs or someone else's — with its
//   creator, and who sees it (Public / Only me — only they see an Only me post, so a public view
//   leaves it out). It stays after the item leaves the Marketplace; an item that is gone reads as no
//   longer available. A share has its own appreciations (keyed by the share), as on Facebook.
// A post is one share, not the project's details (owner 2026-11-22: "a share is single — how many
// products a project has, which ones, belongs on its details"): no product list, no product count,
// no prices (what is on sale is the details' and the marketplace's); the title opens the details.
// The Projects tab (Featured + More projects) and the Activity tab stay as they were: other ways to
// read the same work. Pure, relative imports only.

import type { ClipKind, FeedClip } from "../innovations/clips";
import { parseShareItemId, type ShareItem } from "../innovations/share-items";
import type { FeedShare, ShareAudience } from "../innovations/feed-prefs";

export type TimelinePost = {
  key: string;
  at: number;
  /** What was shared: the project, or one product of it. */
  kind: ClipKind;
  /** "post": shared from the project ("Share to Feed"); "share": a clip shared to the Feed with words. */
  via: "post" | "share";
  /** The story of a project post, or the words of a share. */
  caption: string;
  audience: ShareAudience;
  title: string;
  /** A product's project ("from Smart Home Kit"); null for a project. */
  from: string | null;
  /** Whose work a share shows when it isn't the profile's own; null for their own work. */
  by: string | null;
  cover: string | null;
  /** It plays as a clip on the Feed (on the marketplace with a video). */
  playHref: string | null;
  detailsHref: string;
  /** The current Activity's name ("Prototype"); null for none. */
  stage: string | null;
  /** The post its hearts, comments and views are keyed by. */
  postId: string;
  base: { appreciations: number; views: number };
  /** A share's id, for "Remove from your Feed"; null for a project post. */
  shareId: string | null;
  /** The clip a share shows (its comments open there). */
  clipId: string | null;
  /** A share's original, drawn as its own card under the words: its creator. Null for a project post. */
  original: { name: string; initials: string; color: string | null } | null;
  /** A share whose item is gone (deleted): its card says it is no longer available. */
  gone: boolean;
};

const enc = encodeURIComponent;

/** A project's details on the phone, or one of its products'. */
export function phoneDetailsHref(projectId: string, productId: string | null = null): string {
  const project = `/m/projects/${enc(projectId)}`;
  return productId ? `${project}/products/${enc(productId)}` : project;
}

export const phoneClipHref = (clipId: string) => `/m/clip/${enc(clipId)}`;

/** A project post: the project as it was shared. */
export function projectPostOf(input: {
  projectId: string;
  postId: string;
  title: string;
  caption: string;
  at: number;
  cover: string | null;
  stage: string | null;
  /** The project's clip on the Feed, when it plays there. */
  clip: Pick<FeedClip, "id"> | null;
  base?: { appreciations: number; views: number };
}): TimelinePost {
  return {
    key: `post:${input.postId}`,
    at: input.at,
    kind: "project",
    via: "post",
    caption: input.caption.trim(),
    audience: "public",
    title: input.title.trim() || "Untitled project",
    from: null,
    by: null,
    cover: input.cover,
    playHref: input.clip ? phoneClipHref(input.clip.id) : null,
    detailsHref: phoneDetailsHref(input.projectId),
    stage: input.stage,
    postId: input.postId,
    base: input.base ?? { appreciations: 0, views: 0 },
    shareId: null,
    clipId: input.clip?.id ?? null,
    original: null,
    gone: false,
  };
}

/** A share: the words over the original item (`item`, null once it is gone), with its creator.
 *  `playHref` is set while the item plays on the Feed. `ownerId` is the profile's person, so their
 *  own work carries no "by". */
export function sharePostOf(share: FeedShare, item: ShareItem | null, ctx: { playHref: string | null; ownerId: string }): TimelinePost {
  const at = parseShareItemId(share.clipId);
  const kind: ClipKind = item?.kind ?? (at?.productId ? "product" : "project");
  return {
    key: `share:${share.id}`,
    at: share.at,
    kind,
    via: "share",
    caption: share.caption.trim(),
    audience: share.audience,
    title: item?.title ?? "",
    from: item?.projectTitle ?? null,
    by: !item || item.source === "mine" || item.creator.id === ctx.ownerId ? null : item.creator.name,
    cover: item?.cover ?? null,
    playHref: item ? ctx.playHref : null,
    detailsHref: item ? phoneDetailsHref(item.projectId, item.productId) : "",
    stage: item?.stage ?? null,
    // Its own appreciations, as a Facebook share has.
    postId: `share:${share.id}`,
    base: { appreciations: 0, views: 0 },
    shareId: share.id,
    clipId: item && ctx.playHref ? item.id : null,
    original: item ? { name: item.creator.name, initials: item.creator.initials, color: item.creator.color ?? null } : null,
    gone: !item,
  };
}

/** Newest first; a public view leaves out what only the creator sees. */
export function timelineOf(posts: readonly TimelinePost[], publicView: boolean): TimelinePost[] {
  return posts.filter((p) => !publicView || p.audience === "public").sort((a, b) => b.at - a.at);
}

/** The post's head line: "Shared a project", "Shared a product", "Shared Leo Park’s product". */
export function sharedLineOf(post: Pick<TimelinePost, "kind" | "by">): string {
  return post.by ? `Shared ${post.by}’s ${post.kind}` : `Shared a ${post.kind}`;
}

/** The picture's chip: what was shared, "Project" or "Product". */
export function kindChipOf(post: Pick<TimelinePost, "kind">): string {
  return post.kind === "product" ? "Product" : "Project";
}
