// A profile's Timeline on the phone (owner 2026-11-22: "a timeline on my profile — which projects I
// share, which products, what kind"): every post the creator put on the Feed, newest first.
// · A project they shared ("Share to Feed" on its page, `showcasedAt`; a sample creator's post): the
//   project with its story, its picture, its current Activity, every product in it, and what of it
//   is on sale (Main NFT · Physical NFT · Virtual NFT, the marketplace's words).
// · A clip shared to their Feed with their words ("Share to your Feed"): a project or one product,
//   theirs or someone else's, with the caption and who sees it (Public / Only me — only they see an
//   Only me post, so a public view leaves it out).
// The Projects tab (Featured + More projects) and the Activity tab stay as they were: other ways to
// read the same work. Pure, relative imports only.

import type { ClipKind, ClipOffer, ClipOfferKind, FeedClip } from "../innovations/clips";
import type { FeedShare, ShareAudience } from "../innovations/feed-prefs";

/** A product inside a project post: its picture and name, opening its details. */
export type TimelineProduct = { id: string; name: string; image: string | null; href: string };

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
  /** A project post's products, in the project's order. */
  products: TimelineProduct[];
  offers: ClipOffer[];
  /** The post its hearts, comments and views are keyed by. */
  postId: string;
  base: { appreciations: number; views: number };
  /** A share's id, for "Remove from your Feed"; null for a project post. */
  shareId: string | null;
  /** The clip a share shows (its comments open there). */
  clipId: string | null;
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
  products: readonly { id: string; name: string; image: string | null }[];
  /** The project's clip on the Feed, when it plays there. */
  clip: Pick<FeedClip, "id" | "offers"> | null;
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
    products: input.products.map((p) => ({ id: p.id, name: p.name.trim() || "Untitled product", image: p.image, href: phoneDetailsHref(input.projectId, p.id) })),
    offers: input.clip ? [...input.clip.offers] : [],
    postId: input.postId,
    base: input.base ?? { appreciations: 0, views: 0 },
    shareId: null,
    clipId: input.clip?.id ?? null,
  };
}

/** A clip shared to the Feed with words, drawn as the post it shares: a project with its products, a
 *  product with its project's name. `ownerId` is the profile's person, so their own work carries no "by". */
export function sharePostOf(
  share: FeedShare,
  clip: FeedClip,
  ctx: { projectTitle: string | null; products?: readonly { id: string; name: string; image: string | null }[]; ownerId: string },
): TimelinePost {
  const { projectTitle, ownerId } = ctx;
  return {
    key: `share:${share.id}`,
    at: share.at,
    kind: clip.kind,
    via: "share",
    caption: share.caption.trim(),
    audience: share.audience,
    title: clip.title,
    from: clip.kind === "product" ? projectTitle : null,
    by: clip.source === "mine" || clip.creator.id === ownerId ? null : clip.creator.name,
    cover: clip.poster,
    playHref: phoneClipHref(clip.id),
    detailsHref: phoneDetailsHref(clip.projectId, clip.productId),
    stage: clip.stage,
    products:
      clip.kind === "project"
        ? (ctx.products ?? []).map((p) => ({ id: p.id, name: p.name.trim() || "Untitled product", image: p.image, href: phoneDetailsHref(clip.projectId, p.id) }))
        : [],
    offers: [...clip.offers],
    postId: clip.postId,
    base: clip.base,
    shareId: share.id,
    clipId: clip.id,
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

/** The picture's chip: "Project · 3 products", "Project", "Product". */
export function kindChipOf(post: Pick<TimelinePost, "kind" | "products">): string {
  if (post.kind === "product") return "Product";
  const n = post.products.length;
  return n > 0 ? `Project · ${n} ${n === 1 ? "product" : "products"}` : "Project";
}

const ORDER: readonly ClipOfferKind[] = ["main", "physical", "virtual"];
const NAME: Readonly<Record<ClipOfferKind, string>> = { main: "Main NFT", physical: "Physical NFT", virtual: "Virtual NFT" };

const amountOf = (price: string) => {
  const n = Number.parseFloat(price);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
};

/** What is on sale, one part per kind, cheapest first when a kind has several prices:
 *  "Main NFT 0.3 ETH · Physical NFT from 0.02 ETH · Virtual NFT 0.01 ETH". An auction's part is its
 *  bid in the marketplace's words ("Main NFT (Current bid 0.4 ETH)"). Null with nothing on sale. */
export function offerLineOf(offers: readonly ClipOffer[]): string | null {
  const parts: string[] = [];
  for (const kind of ORDER) {
    const of = offers.filter((o) => o.kind === kind);
    if (!of.length) continue;
    const auction = of.find((o) => o.auction);
    if (auction?.auction) {
      parts.push(`${NAME[kind]} (${auction.auction.bidLabel} ${auction.auction.bid})`);
      continue;
    }
    const cheapest = of.reduce((a, b) => (amountOf(b.price) < amountOf(a.price) ? b : a));
    const several = new Set(of.map((o) => o.price)).size > 1;
    parts.push(`${NAME[kind]} ${several ? "from " : ""}${cheapest.price}`);
  }
  return parts.length ? parts.join(" · ") : null;
}
