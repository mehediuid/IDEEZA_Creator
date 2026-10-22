// A project this browser shared, read as an Innovations post (plan §8). Every
// fact comes from what the project page already derives (`projectView`), so
// the post never disagrees with the project: its products and their build
// pieces, its videos in use, its mint, its listing and copies.
//
// Pure, relative imports only.

import { NETWORKS } from "../brief/types";
import type { BuildItemKind, BuildProduct } from "../create/history";
import { productFacts } from "../manual/products-tab-view";
import type { ProjectProduct, ProjectView } from "../manual/project-read";
import { coverOf } from "../manual/project-read";
import type { ManualProject } from "../manual/projects";
import { formatAmount } from "../manual/rail-copy";
import { PROJECT_VIDEO_KEY } from "../video/types";
import { PROJECT_VIDEO_TITLE } from "../video/video-copy";
import { ME } from "./people";
import { mineSlugOf, postIdOfProject } from "./slug";
import type { InnovationPost, PostMedia, PostPart, PostPiece, PostProduct, PostVideo } from "./types";

// The post's own five (types.ts PostPiece); a build's Assembly is not one of
// them yet.
const PIECE_ORDER: readonly PostPiece[] = ["3d", "pcb", "code", "wiring", "parts"];

/** The parts as a list: the same part named twice is one row with its count. */
export function partsOf(product: BuildProduct): PostPart[] {
  const rows: PostPart[] = [];
  for (const p of product.parts) {
    const name = p.name.trim();
    if (!name) continue;
    const row = rows.find((r) => r.name === name);
    if (row) row.qty += 1;
    else rows.push({ name, qty: 1, use: p.role.trim() });
  }
  return rows;
}

/** A product's video in use, as the post plays it from this browser's clip store. */
function clipOf(p: ProjectProduct, view: ProjectView): PostVideo | null {
  const pv = view.videos.record?.products[p.id];
  const take = pv?.inUseId ? pv.takes.find((t) => t.id === pv.inUseId) : null;
  if (!take) return null;
  const name = p.name.trim() || "Untitled product";
  return { kind: "clip", takeId: take.id, alt: `${name}, its video`, label: `${name} video`, durationMs: take.clip?.durationMs ?? null, productId: p.id };
}

/** The project video in use: it stands for the whole project (owner, 2026-10-21), so it is named
 *  after the project, never a product. */
function projectClipOf(project: ManualProject, view: ProjectView): PostVideo | null {
  const pv = view.videos.record?.products[PROJECT_VIDEO_KEY];
  const take = pv?.inUseId ? pv.takes.find((t) => t.id === pv.inUseId) : null;
  if (!take) return null;
  const name = project.name.trim() || "Untitled project";
  return {
    kind: "clip",
    takeId: take.id,
    alt: `${name}, its project video`,
    label: `${PROJECT_VIDEO_TITLE} · ${name}`,
    durationMs: take.clip?.durationMs ?? null,
    productId: PROJECT_VIDEO_KEY,
  };
}

function postProductOf(p: ProjectProduct, view: ProjectView): PostProduct {
  const built = p.built?.product ?? null;
  const pieces: PostPiece[] = built
    ? PIECE_ORDER.filter((k) => built.items.some((i) => i.kind === k && i.status === "ready"))
    : [];
  return {
    id: p.id,
    name: p.name.trim() || "Untitled product",
    summary: p.description.trim() || built?.description?.trim() || "",
    image: built?.conceptImageUrl || null,
    pieces,
    specs: built?.spec ? productFacts(built.spec, built.parts).map((f) => ({ label: f.label, value: f.value })) : [],
    parts: built ? partsOf(built) : [],
    build: p.built ? { buildId: p.built.ref.buildId, productId: built?.id ?? "primary" } : null,
    video: clipOf(p, view),
  };
}


/** The post's sale rows: the Main listing and every listed copy. Null when nothing is for sale. */
export function listingOf(project: ManualProject, view: ProjectView): InnovationPost["listing"] {
  const rows: { label: string; price: string }[] = [];
  const l = view.listing;
  if (l.kind === "live" || l.kind === "paused") {
    const amount = l.listing.type === "auction" ? l.listing.auctionBuyNow ?? l.listing.minBid : l.listing.price;
    const price = formatAmount(amount, l.listing.token);
    if (price) rows.push({ label: l.listing.type === "auction" ? "Whole project (Main NFT), auction" : "Whole project (Main NFT)", price });
  }
  for (const t of view.editions) {
    if (!t.listing) continue;
    const price = formatAmount(t.listing.regular, t.listing.token);
    if (!price) continue;
    const product = t.productId === "project" ? null : view.products.find((p) => p.id === t.productId)?.name;
    const kind = t.kind === "physical" ? "Physical copy" : "Virtual copy";
    rows.push({ label: product ? `${kind} of ${product}` : kind, price });
  }
  return rows.length ? { rows, href: `/marketplace/${project.id}` } : null;
}

export function minePostOf(project: ManualProject, view: ProjectView, network: string | null = null): InnovationPost {
  const current = view.products.filter((p) => p.dropped === null);
  const products = current.map((p) => postProductOf(p, view));
  // The videos lead: the project video (owner, 2026-10-21), then one per product in product order
  // (owner, 2026-10-13); the images follow.
  const own = projectClipOf(project, view);
  const media: PostMedia[] = [...(own ? [own] : []), ...products.flatMap((p) => (p.video ? [p.video] : []))];
  const cover = coverOf(project, view.refs);
  const seen = new Set<string>();
  const addImage = (src: string | null, label: string, alt: string) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    media.push({ kind: "image", src, alt, label });
  };
  addImage(cover, "Cover", `${project.name}, the cover`);
  for (const p of products) addImage(p.image, p.name, `${p.name}, the concept image`);

  const mint = view.mint;
  const minted = mint.status !== "notMinted";
  // The post's status is the project's current Activity, never a second one to keep in step
  // (owner, 2026-10-13); Others has no place on the stage line, so it shows none.
  const stage = view.current.type !== "others" ? view.current.type : null;
  return {
    id: postIdOfProject(project.id),
    slug: mineSlugOf(project),
    source: "mine",
    projectId: project.id,
    title: project.name.trim() || "Untitled project",
    category: null,
    description: project.description.trim(),
    story: project.post?.story.trim() ?? "",
    stage,
    sharedAt: typeof project.showcasedAt === "number" ? project.showcasedAt : project.updatedAt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    creator: ME,
    minted,
    license: null,
    chain: minted && mint.record ? NETWORKS.find((n) => n.value === mint.record?.network)?.label ?? null : null,
    network,
    media,
    products,
    partsCount: products.reduce((n, p) => n + p.parts.length, 0),
    listing: listingOf(project, view),
    base: { appreciations: 0, views: 0 },
    shared: typeof project.showcasedAt === "number",
  };
}
