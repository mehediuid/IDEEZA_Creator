// The phone's Home: the Feed (mobile Figma "Feed · 2026 update" 10646:2, owner
// 2026-10-31: the app has no Innovations; Home is full-screen clips of the
// projects and products shared on the marketplace). A clip is read from an
// Innovations post (sample-posts.ts), so the phone and the web show the same
// project, the same video, the same heart and the same comments:
// - every post is a Project clip, playing its first video;
// - every further product with its own video is a Product clip;
// - the post's listing rows are the clip's offers: a project offers its Main
//   NFT and copies, a product only copies ("a product has no Main NFT");
// - only what is on the marketplace is on the Feed (owner 2026-10-31, again
//   2026-11-12): a clip with nothing on sale (a post with no listing, or a
//   product whose project sells only its Main NFT) stays off it. A listing
//   goes live only after the mint, so every clip here is minted.
// Reactions and comments are the post's, so a Product clip's heart is its
// project's (one count everywhere, plan §7).
//
// A project you shared ("Share to Feed" on its page, `showcasedAt`) is a clip
// too, as the web lists it under "Shared by you": `mine:<projectId>`, built by
// `mineClipsOf` from what the project's own stores say (its video in use, its
// listing, its current Activity). It leads your Feed, newest first, and a clip
// you shared to your Feed ("Share to your Feed") leads it with your caption.
//
// What the viewer told the Feed (Interested, Not interested, Hide) reorders
// and filters it here. Pure, relative imports only.

import { CREATORS, PROJECTS, type ProjectCategory } from "../feed";
import { CATALOGUES } from "../manual/journey";
import { formatAmount } from "../wallet/money";
import { savedRows, type FeedShare } from "./feed-prefs";
import { follows, type Reactions } from "./reactions";
import { SAMPLE_POSTS } from "./sample-posts";
import type { InnovationPost, PostPerson } from "./types";

export type ClipKind = "project" | "product";
export type ClipOfferKind = "main" | "physical" | "virtual";

export type ClipOffer = {
  kind: ClipOfferKind;
  /** "0.25 ETH", written as the marketplace writes it. */
  price: string;
  /** A copy's license in the Sell flow's words ("Personal use", "Business use"); null for Main. */
  use: string | null;
  /** "6 of 50 sold", when the listing says. */
  sold: { count: number; of: number } | null;
  /** The Main NFT's share of the project on sale ("Selling 10%"), when the listing says. */
  sharePct?: number;
  /** A Main NFT on auction: the bid in the marketplace's words ("Current bid" once someone bid,
   *  else "Starting bid"), the least the next bid may be, and when it ends. */
  auction?: { bidLabel: "Current bid" | "Starting bid"; bid: string; next: string; endsAt: number | null };
};

export type FeedClip = {
  /** "p1" for a Project clip, "p1~remote" for a Product clip. */
  id: string;
  /** The post behind it ("sample:p1"): reactions and comments are keyed by it. */
  postId: string;
  kind: ClipKind;
  /** The feed project's id, the address of its details. */
  projectId: string;
  productId: string | null;
  title: string;
  description: string;
  category: ProjectCategory | null;
  creator: PostPerson;
  /** What the sample dataset says about following this creator, before the viewer's own choice. */
  followedByDataset: boolean;
  /** A sample's file. A project you shared plays `takeId` and has no `src`. */
  video: { src: string; label: string };
  /** "mine": the video in use, in this browser's clip store; null when it has none here. */
  takeId: string | null;
  poster: string | null;
  offers: ClipOffer[];
  base: { appreciations: number; views: number };
  sharedAt: number;
  /** "sample": a Feed post; "mine": a project you shared to the Feed. */
  source: "sample" | "mine";
  /** The project's current Activity, in the web's words ("Prototype", "Pilot run"); null for none. */
  stage: string | null;
  minted: boolean;
  /** Set on the copy that leads your Feed after "Share to your Feed": your words and who sees it. */
  share?: FeedShare;
};

const PRODUCT_SEP = "~";

/** "0.80 ETH" as the marketplace writes it everywhere else ("0.8 ETH"); other words stay as they are. */
export function tidyPrice(text: string): string {
  const m = /^\s*(\d*\.?\d+)\s+([A-Z]+)\s*$/.exec(text);
  return m ? formatAmount(m[1], m[2] as Parameters<typeof formatAmount>[1]) : text.trim();
}

/** A stage id ("pilot-run") in the words the project page uses for it. */
export function stageLabelOf(stage: string | null): string | null {
  return stage ? (CATALOGUES.project.find((t) => t.id === stage)?.label ?? null) : null;
}

/** The license words of the web's Sell flow (sell-flow.ts USE_LABEL); a sample's "Commercial use" is Business use. */
export function licenseWordOf(license: string | null): string | null {
  if (!license) return null;
  return /commercial|business/i.test(license) ? "Business use" : "Personal use";
}

/** One listing row ("Whole project (Main NFT)", "Physical copy · 6 of 50 sold", "Virtual copy") as an offer. */
export function offerOf(row: { label: string; price: string }, license: string | null): ClipOffer | null {
  const use = licenseWordOf(license);
  const price = tidyPrice(row.price);
  if (/main nft/i.test(row.label)) return { kind: "main", price, use: null, sold: null };
  if (/^physical/i.test(row.label)) {
    const m = /(\d+)\s+of\s+(\d+)\s+sold/i.exec(row.label);
    return { kind: "physical", price, use, sold: m ? { count: Number(m[1]), of: Number(m[2]) } : null };
  }
  if (/^virtual/i.test(row.label)) return { kind: "virtual", price, use, sold: null };
  return null;
}

function offersOf(post: InnovationPost, kind: ClipKind): ClipOffer[] {
  if (!post.listing) return [];
  return post.listing.rows
    .map((r) => offerOf(r, post.license))
    .filter((o): o is ClipOffer => o !== null && (kind === "project" || o.kind !== "main"));
}

/** The clips of one post: the project, then each further product that has its own video. */
export function clipsOfPost(post: InnovationPost): FeedClip[] {
  const feedId = post.id.replace(/^sample:/, "");
  const project = PROJECTS.find((p) => p.id === feedId);
  const creator = CREATORS.find((c) => c.id === post.creator.id);
  const first = post.products[0];
  const shared = {
    postId: post.id,
    projectId: feedId,
    category: project?.category ?? null,
    creator: post.creator,
    followedByDataset: creator?.following ?? false,
    base: post.base,
    sharedAt: post.sharedAt,
    takeId: null,
    source: "sample" as const,
    stage: stageLabelOf(post.stage),
    minted: post.minted,
  };
  const out: FeedClip[] = [];
  if (first?.video?.kind === "video") {
    out.push({
      ...shared,
      id: feedId,
      kind: "project",
      productId: null,
      title: post.title,
      description: post.description,
      video: { src: first.video.src, label: first.video.label },
      poster: first.video.poster ?? first.image,
      offers: offersOf(post, "project"),
    });
  }
  for (const p of post.products.slice(1)) {
    if (p.video?.kind !== "video") continue;
    out.push({
      ...shared,
      id: `${feedId}${PRODUCT_SEP}${p.id}`,
      kind: "product",
      productId: p.id,
      title: p.name,
      description: p.summary,
      video: { src: p.video.src, label: p.video.label },
      poster: p.video.poster ?? p.image,
      offers: offersOf(post, "product"),
    });
  }
  return out;
}

/** A clip is on the marketplace when it has something on sale. */
export function onMarketplace(clip: FeedClip): boolean {
  return clip.offers.length > 0;
}

/** Every sample clip on the Feed, in post order: only what is on the marketplace. Your own shared
 *  projects join them through `mineClipsOf` (the Feed's screens read both with `useFeedClips`). */
export const FEED_CLIPS: readonly FeedClip[] = SAMPLE_POSTS.flatMap(clipsOfPost).filter(onMarketplace);

/** A sample clip by its id; a project you shared (`mine:…`) is found in `useFeedClips`. */
export function clipById(id: string): FeedClip | null {
  return FEED_CLIPS.find((c) => c.id === id) ?? null;
}

// ─────────────────────────── a project you shared ───────────────────────────

const MINE = "mine:";

/** The clip (and the post) of a project you shared: "mine:<projectId>". */
export const mineClipId = (projectId: string) => `${MINE}${projectId}`;
export const isMineClipId = (id: string) => id.startsWith(MINE);

/** One video of a shared project: the project video (`productId` null), or a product's. */
export type MineVideo = { productId: string | null; name: string; summary: string; takeId: string; poster: string | null };

export type MineClipInput = {
  projectId: string;
  title: string;
  /** The post's story, else the project's description. */
  description: string;
  creator: PostPerson;
  sharedAt: number;
  /** The cover: what shows while the video loads, or when it isn't in this browser. */
  cover: string | null;
  /** The current Activity's label; null for none. */
  stage: string | null;
  minted: boolean;
  /** The videos in use, the one that leads first (the project video, else the first product's). */
  videos: readonly MineVideo[];
  /** The live Main listing and the listed copies of the whole project. */
  offers: readonly ClipOffer[];
  /** The listed copies of one product, by product id. */
  productOffers?: Readonly<Record<string, readonly ClipOffer[]>>;
};

/** A project you shared, as the Feed plays it: the Project clip (always there, so "Share to Feed"
 *  shows on the Feed even when its video isn't in this browser), then a Product clip for each
 *  further product video, as a sample post has. */
export function mineClipsOf(input: MineClipInput): FeedClip[] {
  const postId = mineClipId(input.projectId);
  const shared = {
    postId,
    projectId: input.projectId,
    category: null,
    creator: input.creator,
    followedByDataset: false,
    base: { appreciations: 0, views: 0 },
    sharedAt: input.sharedAt,
    source: "mine" as const,
    stage: input.stage,
    minted: input.minted,
  };
  const lead = input.videos[0] ?? null;
  const out: FeedClip[] = [
    {
      ...shared,
      id: postId,
      kind: "project",
      productId: null,
      title: input.title,
      description: input.description,
      video: { src: "", label: `${input.title} video` },
      takeId: lead?.takeId ?? null,
      poster: lead?.poster ?? input.cover,
      offers: [...input.offers],
    },
  ];
  for (const v of input.videos.slice(1)) {
    if (!v.productId || v.productId === lead?.productId) continue;
    out.push({
      ...shared,
      id: `${postId}${PRODUCT_SEP}${v.productId}`,
      kind: "product",
      productId: v.productId,
      title: v.name,
      description: v.summary,
      video: { src: "", label: `${v.name} video` },
      takeId: v.takeId,
      poster: v.poster ?? input.cover,
      offers: [...(input.productOffers?.[v.productId] ?? [])],
    });
  }
  return out;
}

/** The Feed tab's list: the clips you shared to your Feed (newest share first, each once, with
 *  its share on it), then your own shared projects (newest first), then everyone else's in the
 *  Feed's order. A clip you shared isn't listed a second time further down. */
export function feedClips(
  samples: readonly FeedClip[],
  mine: readonly FeedClip[],
  shares: readonly FeedShare[],
  choices: ClipChoices = NO_CHOICES,
): FeedClip[] {
  const gone = new Set(choices.hidden);
  const all = [...mine, ...samples];
  const led: FeedClip[] = [];
  for (const s of shares.slice().sort((a, b) => b.at - a.at)) {
    if (led.some((c) => c.id === s.clipId) || gone.has(s.clipId)) continue;
    const clip = all.find((c) => c.id === s.clipId);
    if (clip) led.push({ ...clip, share: s });
  }
  const taken = new Set(led.map((c) => c.id));
  const own = mine.filter((c) => !taken.has(c.id) && !gone.has(c.id)).sort((a, b) => b.sharedAt - a.sharedAt);
  return [...led, ...own, ...orderClips(samples, choices).filter((c) => !taken.has(c.id))];
}

/** What the viewer told the Feed from a clip's ⋯ menu. */
export type ClipChoices = {
  interested: readonly string[];
  notInterested: readonly string[];
  hidden: readonly string[];
};

export const NO_CHOICES: ClipChoices = { interested: [], notInterested: [], hidden: [] };

const categoriesOf = (ids: readonly string[]) =>
  new Set(ids.map((id) => clipById(id)?.category).filter((c): c is ProjectCategory => !!c));

/** The Feed tab: hidden and not-interested clips left out; more like an Interested clip first,
 *  fewer like a Not interested one; the rest by appreciation and reach (the web's
 *  "New & noteworthy"). A Product clip trails its project a little. */
export function orderClips(clips: readonly FeedClip[], choices: ClipChoices = NO_CHOICES): FeedClip[] {
  const gone = new Set([...choices.hidden, ...choices.notInterested]);
  const more = categoriesOf(choices.interested);
  const fewer = categoriesOf(choices.notInterested);
  const score = (c: FeedClip) => {
    let s = c.base.appreciations + c.base.views / 12;
    if (c.kind === "product") s *= 0.8;
    if (c.category && more.has(c.category)) s *= 2;
    if (c.category && fewer.has(c.category)) s *= 0.4;
    return s;
  };
  return clips
    .filter((c) => !gone.has(c.id))
    .map((c, i) => ({ c, i, s: score(c) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.c);
}

/** The Following tab: the clips of the creators the viewer follows (their own choice, else the
 *  dataset's — the web's rule, which the phone's Feed, profile and Following sheet all use;
 *  `withDataset` false: their own choice only), newest first; hidden ones left out. */
export function followingClips(clips: readonly FeedClip[], reactions: Reactions, choices: ClipChoices = NO_CHOICES, withDataset = true): FeedClip[] {
  const gone = new Set(choices.hidden);
  return clips
    .filter((c) => !gone.has(c.id) && follows(reactions, c.creator.id, withDataset && c.followedByDataset))
    .slice()
    .sort((a, b) => b.sharedAt - a.sharedAt);
}

/** Where a clip's title opens: its project's details, or its product's. */
export function clipDetailsHref(c: Pick<FeedClip, "projectId" | "productId">): string {
  const project = `/m/projects/${encodeURIComponent(c.projectId)}`;
  return c.productId ? `${project}/products/${encodeURIComponent(c.productId)}` : project;
}

/** Where an offer's button goes: the marketplace of the project or product (buying has one home).
 *  A project you shared has its own marketplace page (the buyer's view of your listing); a product's
 *  own copies sell only on that product's market view (CL-018 scope). A sample's copies are the
 *  whole project's, so a sample product's clip buys on its project's marketplace. The page's buy box
 *  opens on the kind the clip's pill shows first (`?nft=`, owner 2026-11-22: what the buyer saw is
 *  what is picked). */
export function clipBuyHref(c: Pick<FeedClip, "projectId" | "productId"> & { source?: FeedClip["source"]; offers?: readonly Pick<ClipOffer, "kind">[] }): string {
  const project = `/m/projects/${encodeURIComponent(c.projectId)}`;
  const kind = c.offers?.[0]?.kind ?? null;
  const nft = kind ? `nft=${kind}` : null;
  if (c.source === "mine") return c.productId ? `${clipDetailsHref(c)}?view=market` : `${project}/market${nft ? `?${nft}` : ""}`;
  return `${project}?tab=marketplace${nft ? `&${nft}` : ""}`;
}

/** The address of one clip on its own (Copy link, Saved › View original post). */
export const clipHref = (id: string) => `/m/clip/${encodeURIComponent(id)}`;

/** "Buy Main NFT (0.25 ETH)", "Place bid (0.01 ETH)" on an auction (the marketplace's words for
 *  the Figma's "Make an offer"), "Buy Physical NFT (0.04 ETH)" for a copy. */
export function offerActionLabel(o: ClipOffer): string {
  if (o.kind === "main" && o.auction) return `Place bid (${o.auction.next})`;
  if (o.kind === "main") return `Buy Main NFT (${o.price})`;
  return `Buy ${o.kind === "physical" ? "Physical" : "Virtual"} NFT (${o.price})`;
}

export const OFFER_NAME: Readonly<Record<ClipOfferKind, string>> = {
  main: "Main NFT",
  physical: "Physical NFT",
  virtual: "Virtual NFT",
};

// ─────────────────────────── a post off the Feed ───────────────────────────
// The Feed plays only what is on the marketplace, but a post stays after its item leaves it, as the
// web's post page does: Saved and Appreciated still list it, its address still leads somewhere, and
// its comments are still read.

/** The id of a post's item (share-items.ts), which is also its Project clip's id: "sample:p12" →
 *  "p12"; "mine:<projectId>" stays as it is. */
export const postItemIdOf = (postId: string) => postId.replace(/^sample:/, "");

/** A post of the samples' or of yours ("sample:…", "mine:…"), not a share's own thread ("share:…"). */
const isPostId = (id: string) => id.startsWith("sample:") || id.startsWith(MINE);

/** A row of Saved or Appreciated: one clip of a post on the Feed, or a post with none (`clip` null). */
export type PostRow<C> = { postId: string; clip: C | null; at: number | null };

type PostClipRef = Pick<FeedClip, "id" | "postId" | "kind">;

/** The newest date this phone noted for saving a post or any of its clips; null when it knows none. */
function newestMarkOf(savedAt: Readonly<Record<string, number>>, postId: string): number | null {
  const base = postItemIdOf(postId);
  let at = 0;
  for (const [k, v] of Object.entries(savedAt)) {
    if (k === postId || k === base || k.startsWith(`${base}${PRODUCT_SEP}`)) at = Math.max(at, v || 0);
  }
  return at || null;
}

/** The marks this phone keeps for a post (`savedAt` keys: the post's, its clips'), so unsaving a
 *  post with no clip leaves no date behind. */
export function postMarksOf(savedAt: Readonly<Record<string, number>>, postId: string): string[] {
  const base = postItemIdOf(postId);
  return Object.keys(savedAt).filter((k) => k === postId || k === base || k.startsWith(`${base}${PRODUCT_SEP}`));
}

/** Saved (SOC-4): every post on the web's Saved list. A post with a clip on the Feed is listed by its
 *  clips as `savedRows` lists them; a post with none (never on the marketplace, or off sale now) is
 *  listed as itself, dated by the newest mark this phone keeps for it — so a post saved on the web,
 *  or saved here while it was on sale, is never missing. Newest saved first, as `savedRows` orders. */
export function savedPostRows<C extends PostClipRef>(savedPosts: readonly string[], savedAt: Readonly<Record<string, number>>, clips: readonly C[]): PostRow<C>[] {
  const posts = savedPosts.filter(isPostId);
  const index = new Map(posts.map((p, i) => [p, i] as const));
  const listed = savedRows(posts, savedAt, clips).map((r) => ({ postId: r.clip.postId, clip: r.clip as C | null, at: r.at, i: index.get(r.clip.postId) ?? 0 }));
  const shown = new Set(listed.map((r) => r.postId));
  const bare = posts.flatMap((postId, i) => (shown.has(postId) ? [] : [{ postId, clip: null, at: newestMarkOf(savedAt, postId), i }]));
  return [...listed, ...bare].sort((a, b) => (b.at ?? 0) - (a.at ?? 0) || b.i - a.i).map(({ postId, clip, at }) => ({ postId, clip, at }));
}

/** Appreciated (SOC-4): every post you appreciated, newest first — its Project clip while it plays on
 *  the Feed, else the post itself. A share's own appreciations stay on the Timeline. */
export function appreciatedPostRows<C extends PostClipRef>(appreciated: readonly string[], clips: readonly C[]): PostRow<C>[] {
  return appreciated
    .filter(isPostId)
    .map((postId) => ({ postId, clip: clips.find((c) => c.postId === postId && c.kind === "project") ?? null, at: null }))
    .reverse();
}

/** Where a clip's address leads when the clip isn't on the Feed but its item is still there — it left
 *  the Marketplace, or was never on it (SOC-9, SOC-3); the web's post page stays, comments and all:
 *  - an address that opens the comments (`?comment=`: a comment notice, a copied comment link) opens
 *    the post on its maker's Timeline (`timeline`, that profile's address) with its comments, on that
 *    comment;
 *  - any other, or a post on no Timeline (`timeline` null: your own project, never shared), opens the
 *    item's details, never "Clip not found". */
export function offFeedHrefOf(
  item: Pick<FeedClip, "projectId" | "productId" | "postId">,
  comment: string | null,
  timeline: string | null,
): string {
  if (comment === null || !timeline) return clipDetailsHref(item);
  const q = new URLSearchParams({ post: item.postId });
  if (comment) q.set("comment", comment);
  return `${timeline}?${q}`;
}
