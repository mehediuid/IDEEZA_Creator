// An Innovations post — what a visitor sees when a maker shares a project
// (owner, 2026-10-13; plan https://claude.ai/artifact/XEhXzAt3kt3YPmaSLxjmxr).
// One shape for both sources, so the post page is one page:
// - "sample": a feed project (lib/feed.ts) with the sample story, products and
//   specs sample-posts.ts writes for it;
// - "mine": a project this browser shared (`showcasedAt`), read through
//   mine-post.ts from the project, its builds and its videos.
//
// Pure types, relative imports only (node:test loads the compiled module).

export type PostSource = "sample" | "mine";

/** Someone on Innovations: a sample creator or commenter, or `ME` — this browser's maker. */
export type PostPerson = {
  id: string;
  name: string;
  initials: string;
  /** Avatar fill, a DS colour token (`var(--color-…)`), never a raw hex. */
  color: string;
  pro: boolean;
};

/** This browser's maker. Until there are accounts it is the only real person here. */
export const ME_ID = "you";

/** The five pieces a build delivers (lib/create/history.ts `BuildItemKind`). */
export type PostPiece = "3d" | "pcb" | "code" | "wiring" | "parts";

/** D2 (owner, 2026-10-13): the 3D model, the parts list and the specs are open to everyone; the
 *  PCB, the firmware and the wiring come with a copy, so a visitor sees their names, never their files. */
export const OPEN_PIECES: readonly PostPiece[] = ["3d", "parts"];
export const LOCKED_PIECES: readonly PostPiece[] = ["pcb", "code", "wiring"];

export const PIECE_LABEL: Record<PostPiece, string> = {
  "3d": "3D model",
  pcb: "PCB",
  code: "Firmware",
  wiring: "Wiring",
  parts: "Parts",
};

export type PostPart = { name: string; qty: number; use: string };
export type PostSpec = { label: string; value: string };

export type PostProduct = {
  id: string;
  name: string;
  summary: string;
  /** The concept image; null = none. */
  image: string | null;
  /** The pieces this product's build delivered, in PIECE order. */
  pieces: PostPiece[];
  specs: PostSpec[];
  parts: PostPart[];
  /** "mine" only: the build product behind it, so the post can show the real 3D model and parts. */
  build: { buildId: string; productId: string } | null;
  /** The product's video, what its view opens on; null only when it has none (sharing requires one). */
  video: PostVideo | null;
};

/** Every post and every product opens on its video (owner, 2026-10-13); images and the rest follow. */
export type PostMedia =
  | { kind: "image"; src: string; alt: string; label: string }
  /** A product's video as a file (sample posts: `public/innovations/videos/`). */
  | { kind: "video"; src: string; poster: string | null; alt: string; label: string; durationMs: number | null; productId: string }
  /** A product's video in this browser's clip store ("mine" only). */
  | { kind: "clip"; takeId: string; alt: string; label: string; durationMs: number | null; productId: string };

export type PostVideo = Extract<PostMedia, { kind: "video" | "clip" }>;

export const isPostVideo = (m: PostMedia): m is PostVideo => m.kind === "video" || m.kind === "clip";

/** What the post says about a sale. Buying happens on the Marketplace page (one home). */
export type PostListing = {
  rows: { label: string; price: string }[];
  href: string;
};

export type InnovationPost = {
  /** "sample:<feed id>" or "mine:<project id>". Comments and reactions are keyed by it. */
  id: string;
  slug: string;
  source: PostSource;
  /** The ManualProject behind a "mine" post; null for a sample. */
  projectId: string | null;
  title: string;
  /** The feed category label ("IoT"); null when the project has none. */
  category: string | null;
  description: string;
  /** The maker's own words, up to 500 characters (share-post.ts). */
  story: string;
  /** The project's current Activity type (journey.ts CATALOGUES.project), the post's status; null for Others. */
  stage: string | null;
  /** When it was (last) shared. */
  sharedAt: number;
  createdAt: number;
  updatedAt: number;
  creator: PostPerson;
  minted: boolean;
  license: string | null;
  chain: string | null;
  /** "Mesh · 1 hub, 4 probes"; null = no network. */
  network: string | null;
  media: PostMedia[];
  products: PostProduct[];
  partsCount: number;
  listing: PostListing | null;
  /** Everyone else's appreciations and views. This browser's own come from the reactions store. */
  base: { appreciations: number; views: number };
  /** False once the maker stopped sharing ("mine"); a sample is always shared. */
  shared: boolean;
};
