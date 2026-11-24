// What a share points at (owner, 2026-11-22: "I see a good product or project on the marketplace —
// whether I can buy it or not, I want others to see it"; then "think of Facebook: a re-share carries
// the original owner's information"). A share is the sharer's words on top and the original under them,
// with its creator: any project or one product that is live on the Marketplace, anyone's, bought or not.
// It is never a copy of the item and never the creator's own post (Share to Innovations / Share to Feed
// on your own project stays that).
//
// An item's id is a clip's id where the item has a clip, so a share made on the Feed and one made on a
// marketplace page are the same thing:
// · a sample project "p12", one of its products "p12~probe";
// · your own project "mine:<projectId>", one of its products "mine:<projectId>~<productId>".
// The stored share keeps it in `FeedShare.clipId` (feed-prefs.ts), read for every item, clip or not.
//
// After the share, the item may leave the Marketplace (sold out, delisted): the share stays and shows
// the item as it is now. If the item itself is gone (deleted), the share says it is no longer available.
// Pure, relative imports only.

import { stageLabelOf } from "./clips";
import { SAMPLE_POSTS } from "./sample-posts";
import type { InnovationPost, PostPerson } from "./types";

export type ShareKind = "project" | "product";

export type ShareItem = {
  id: string;
  kind: ShareKind;
  source: "sample" | "mine";
  /** The feed id of a sample ("p12"), or your project's id. */
  projectId: string;
  productId: string | null;
  title: string;
  /** A product's project ("Smart plant watering hub"); null for a project. */
  projectTitle: string | null;
  cover: string | null;
  creator: PostPerson;
  /** The current Activity's name ("Prototype"); null for none. */
  stage: string | null;
  /** The post its hearts and comments are keyed by (the project's). */
  postId: string;
  base: { appreciations: number; views: number };
};

const MINE = "mine:";
const SEP = "~";
const enc = encodeURIComponent;

/** The id of a project, or of one of its products. */
export function shareItemId(source: ShareItem["source"], projectId: string, productId: string | null = null): string {
  const base = source === "mine" ? `${MINE}${projectId}` : projectId;
  return productId ? `${base}${SEP}${productId}` : base;
}

/** An item id read back; null when it names nothing. */
export function parseShareItemId(id: string): { source: ShareItem["source"]; projectId: string; productId: string | null } | null {
  const mine = id.startsWith(MINE);
  const rest = mine ? id.slice(MINE.length) : id;
  const at = rest.indexOf(SEP);
  const projectId = at < 0 ? rest : rest.slice(0, at);
  const productId = at < 0 ? null : rest.slice(at + SEP.length) || null;
  if (!projectId) return null;
  return { source: mine ? "mine" : "sample", projectId, productId };
}

const sampleSalesRows = (post: InnovationPost, kind: ShareKind) =>
  (post.listing?.rows ?? []).filter((r) => (kind === "project" ? true : !/main nft/i.test(r.label)));

/** A sample item, from its Innovations post; null when the post or product isn't there. */
export function sampleShareItem(id: string): ShareItem | null {
  const at = parseShareItemId(id);
  if (!at || at.source !== "sample") return null;
  const post = SAMPLE_POSTS.find((p) => p.id === `sample:${at.projectId}`);
  if (!post) return null;
  const product = at.productId ? post.products.find((p) => p.id === at.productId) : null;
  if (at.productId && !product) return null;
  const lead = product ?? post.products[0];
  const poster = lead?.video && lead.video.kind === "video" ? lead.video.poster : null;
  return {
    id,
    kind: product ? "product" : "project",
    source: "sample",
    projectId: at.projectId,
    productId: product?.id ?? null,
    title: product?.name ?? post.title,
    projectTitle: product ? post.title : null,
    cover: poster ?? lead?.image ?? null,
    creator: post.creator,
    stage: stageLabelOf(post.stage),
    postId: post.id,
    base: post.base,
  };
}

/** A sample item is on the Marketplace while its post lists something it sells (a product: a copy). */
export function sampleOnMarketplace(id: string): boolean {
  const at = parseShareItemId(id);
  if (!at || at.source !== "sample") return false;
  const post = SAMPLE_POSTS.find((p) => p.id === `sample:${at.projectId}`);
  return !!post && sampleSalesRows(post, at.productId ? "product" : "project").length > 0;
}

/** What your own project gives an item. */
export type MineShareInput = {
  projectId: string;
  name: string;
  products: readonly { id: string; name: string; image: string | null }[];
  cover: string | null;
  stage: string | null;
  creator: PostPerson;
};

/** Your own item; null when the product isn't in the project. */
export function mineShareItem(id: string, input: MineShareInput): ShareItem | null {
  const at = parseShareItemId(id);
  if (!at || at.source !== "mine" || at.projectId !== input.projectId) return null;
  const product = at.productId ? input.products.find((p) => p.id === at.productId) : null;
  if (at.productId && !product) return null;
  const title = input.name.trim() || "Untitled project";
  return {
    id,
    kind: product ? "product" : "project",
    source: "mine",
    projectId: input.projectId,
    productId: product?.id ?? null,
    title: product ? product.name.trim() || "Untitled product" : title,
    projectTitle: product ? title : null,
    cover: product?.image ?? input.cover,
    creator: input.creator,
    stage: input.stage,
    postId: `${MINE}${input.projectId}`,
    base: { appreciations: 0, views: 0 },
  };
}

/** Where the item opens on the phone: its project's details, or its product's. */
export function phoneItemHref(item: Pick<ShareItem, "projectId" | "productId">): string {
  const project = `/m/projects/${enc(item.projectId)}`;
  return item.productId ? `${project}/products/${enc(item.productId)}` : project;
}

/** Where the item opens on the web: its marketplace page (a sample's shop page; your product's own
 *  marketplace page). A sample's products sell on its shop page. */
export function webItemHref(item: Pick<ShareItem, "projectId" | "productId" | "source">): string {
  const project = `/marketplace/${enc(item.projectId)}`;
  return item.productId && item.source === "mine" ? `${project}/products/${enc(item.productId)}` : project;
}

/** The share's head line: "You shared Leo Park's product", "You shared a project" (your own item). */
export function sharedHeadOf(sharer: string, item: Pick<ShareItem, "kind" | "creator" | "source">, ownerId: string): string {
  const mine = item.source === "mine" || item.creator.id === ownerId;
  return mine ? `${sharer} shared a ${item.kind}` : `${sharer} shared ${item.creator.name}’s ${item.kind}`;
}
