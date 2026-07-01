// Newsfeed data + helpers.
//
// The newsfeed is a Dribbble-style project showcase (a grid of project
// thumbnails), NOT a social timeline. This module is the single source for:
//   • types + the option lists the controls render
//   • a deterministic mock dataset (stand-in for a real backend)
//   • getFeedPage() — filter / sort / paginate, used by /api/feed
//   • URL <-> params helpers (so the view is shareable / restorable)
//   • client fetch helpers (fetchFeed, postAppreciate, postSave)
//
// Pure + isomorphic — safe to import from the edge API route and from client
// components alike. Counts here are the dataset's own values; the UI binds to
// the API and never invents counts.

import { GENERATED_IMAGES } from "./feed-image-manifest";

export type FeedMode = "discover" | "following";
export type SortKey = "noteworthy" | "appreciated" | "views" | "newest";
export type CategoryId = "all" | "robotics" | "iot" | "wearables" | "power" | "audio";
export type ProjectCategory = Exclude<CategoryId, "all">;

export type Creator = {
  id: string;
  name: string;
  initials: string;
  /** Avatar background — a DS color token, never a raw hex. */
  color: string;
  pro: boolean;
  /** Whether the current user follows this creator (drives Following mode). */
  following: boolean;
};

export type Project = {
  id: string;
  slug: string;
  title: string;
  category: ProjectCategory;
  /** Thumbnail placeholder background (token-based gradient). */
  gradient: string;
  minted: boolean;
  appreciations: number;
  views: number;
  appreciated: boolean;
  saved: boolean;
  createdAt: number;
  creator: Creator;
  image?: string;
};

export type FeedParams = {
  mode: FeedMode;
  category: CategoryId;
  sort: SortKey;
  q: string;
};

export type FeedResponse = {
  projects: Project[];
  nextCursor: string | null;
  total: number;
};

// ── Option lists (the controls render these) ────────────────────────────────

export const MODES: { id: FeedMode; label: string }[] = [
  { id: "discover", label: "Discover" },
  { id: "following", label: "Following" },
];

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "robotics", label: "Robotics" },
  { id: "iot", label: "IoT" },
  { id: "wearables", label: "Wearables" },
  { id: "power", label: "Power" },
  { id: "audio", label: "Audio" },
];

export const SORTS: { id: SortKey; label: string }[] = [
  { id: "noteworthy", label: "New & noteworthy" },
  { id: "appreciated", label: "Most appreciated" },
  { id: "views", label: "Most viewed" },
  { id: "newest", label: "Newest" },
];

export const PAGE_SIZE = 12;
export const DEFAULTS: FeedParams = {
  mode: "discover",
  category: "all",
  sort: "noteworthy",
  q: "",
};

// ── Mock dataset (deterministic — stable counts across requests) ─────────────

// Token-based gradients for the thumbnail placeholders. These stand in for real
// project preview images; cycling them gives the grid visual variety on-brand.
const GRADIENTS = [
  "linear-gradient(135deg, var(--color-violet-500), var(--color-violet-900))",
  "linear-gradient(135deg, var(--color-blue-400), var(--color-violet-700))",
  "linear-gradient(135deg, var(--color-green-400), var(--color-blue-600))",
  "linear-gradient(135deg, var(--color-orange-400), var(--color-red-600))",
  "linear-gradient(135deg, var(--color-violet-400), var(--color-blue-700))",
  "linear-gradient(135deg, var(--color-yellow-400), var(--color-orange-600))",
  "linear-gradient(135deg, var(--color-blue-500), var(--color-green-500))",
  "linear-gradient(135deg, var(--color-red-400), var(--color-violet-700))",
];

const CREATORS: Creator[] = [
  { id: "c1", name: "Naim Rahman", initials: "NR", color: "var(--color-violet-600)", pro: true, following: true },
  { id: "c2", name: "Sora Min", initials: "SM", color: "var(--color-blue-600)", pro: true, following: false },
  { id: "c3", name: "Diego Alvarez", initials: "DA", color: "var(--color-green-600)", pro: false, following: true },
  { id: "c4", name: "Aiko Tanaka", initials: "AT", color: "var(--color-orange-600)", pro: true, following: false },
  { id: "c5", name: "Liam Foster", initials: "LF", color: "var(--color-red-600)", pro: false, following: true },
  { id: "c6", name: "Priya Nair", initials: "PN", color: "var(--color-violet-700)", pro: true, following: false },
  { id: "c7", name: "Tomas Berg", initials: "TB", color: "var(--color-blue-700)", pro: false, following: false },
  { id: "c8", name: "Mei Chen", initials: "MC", color: "var(--color-green-700)", pro: true, following: true },
];

type Seed = { title: string; category: ProjectCategory };

const SEEDS: Seed[] = [
  { title: "Hexapod walking robot", category: "robotics" },
  { title: "Soil moisture mesh network", category: "iot" },
  { title: "E-ink smartwatch", category: "wearables" },
  { title: "65W GaN charger board", category: "power" },
  { title: "Pocket synth + sequencer", category: "audio" },
  { title: "Line-following micro rover", category: "robotics" },
  { title: "Air quality room sensor", category: "iot" },
  { title: "Gesture-control glove", category: "wearables" },
  { title: "Solar MPPT controller", category: "power" },
  { title: "Lo-fi guitar pedal", category: "audio" },
  { title: "Robotic arm with haptics", category: "robotics" },
  { title: "Smart plant watering hub", category: "iot" },
  { title: "Heart-rate fitness band", category: "wearables" },
  { title: "Bench power supply 0-30V", category: "power" },
  { title: "Eurorack noise module", category: "audio" },
  { title: "Self-balancing two-wheeler", category: "robotics" },
  { title: "Door + window contact sensor", category: "iot" },
  { title: "AR caption glasses", category: "wearables" },
  { title: "USB-C power meter", category: "power" },
  { title: "Portable contact mic mixer", category: "audio" },
  { title: "Swarm beacon drone", category: "robotics" },
  { title: "LoRa weather station", category: "iot" },
  { title: "Posture-tracking pendant", category: "wearables" },
  { title: "18650 battery balancer", category: "power" },
  { title: "Tube preamp clone", category: "audio" },
  { title: "Quadruped pet companion", category: "robotics" },
  { title: "Desk occupancy tracker", category: "iot" },
  { title: "Sleep-stage ring", category: "wearables" },
  { title: "Wireless Qi charge pad", category: "power" },
  { title: "Granular sampler box", category: "audio" },
  { title: "Pick-and-place head", category: "robotics" },
  { title: "Greenhouse climate node", category: "iot" },
  { title: "Haptic navigation cuff", category: "wearables" },
  { title: "Supercapacitor jump pack", category: "power" },
  { title: "Modular drum machine", category: "audio" },
  { title: "Cable-driven gripper", category: "robotics" },
];

// Verified-working Unsplash CDN photo IDs (electronics / hardware / tech). Each
// one was confirmed to return 200 from images.unsplash.com — unlike random
// sources (loremflickr) or unverified IDs, these never 404 and load fast (the
// CDN serves WebP/AVIF via auto=format). Cycled across the dataset.
const UNSPLASH_IDS = [
  "1518770660439-4636190af475",
  "1517336714731-489689fd1ca8",
  "1498049794561-7780e7231661",
  "1526378722484-bd91ca387e72",
  "1581091226825-a6a2a5aee158",
  "1535378917042-10a22c95931a",
  "1564466809058-bf4114d55352",
  "1591799264318-7e6ef8ddb7ea",
  "1591488320449-011701bb6704",
  "1581092160562-40aa08e78837",
  "1555617981-dac3880eac6e",
  "1601737487795-dab272f52420",
  "1518186285589-2f7649de83e0",
  "1546054454-aa26e2b734c7",
  "1597852074816-d933c7d2b988",
];

// 800×600 crop, modern format, sensible quality — matches the card's 4:3 ratio.
function unsplash(id: string): string {
  return `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop&q=80&auto=format`;
}

// Prefer a real generated thumbnail when one has been produced for this slug
// (see scripts/generate-feed-images.mjs), else fall back to the Unsplash image.
function imageFor(slug: string, idx: number): string {
  return GENERATED_IMAGES[slug] ?? unsplash(UNSPLASH_IDS[idx % UNSPLASH_IDS.length]);
}

function buildProjects(): Project[] {
  const base = 1_750_000_000_000; // fixed epoch so ordering is deterministic
  return SEEDS.map((s, i) => {
    const creator = CREATORS[i % CREATORS.length];
    const appreciations = 24 + ((i * 53) % 460);
    const views = appreciations * (6 + (i % 7)) + ((i * 17) % 300);
    const slug = s.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return {
      id: `p${i + 1}`,
      slug,
      title: s.title,
      category: s.category,
      gradient: GRADIENTS[i % GRADIENTS.length],
      minted: i % 5 !== 0 && i % 3 !== 1, // a deterministic ~40% spread
      appreciations,
      views,
      appreciated: false,
      saved: false,
      createdAt: base - i * 3_600_000,
      creator,
      image: imageFor(slug, i),
    };
  });
}

export const PROJECTS: Project[] = buildProjects();

// ── Query logic (used by /api/feed) ─────────────────────────────────────────

export function getFeedPage(params: FeedParams, cursor: string | null): FeedResponse {
  let list = PROJECTS.slice();

  if (params.mode === "following") {
    list = list.filter((p) => p.creator.following);
  }
  if (params.category !== "all") {
    list = list.filter((p) => p.category === params.category);
  }
  const q = params.q.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.creator.name.toLowerCase().includes(q),
    );
  }

  switch (params.sort) {
    case "appreciated":
      list.sort((a, b) => b.appreciations - a.appreciations);
      break;
    case "views":
      list.sort((a, b) => b.views - a.views);
      break;
    case "newest":
      list.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case "noteworthy":
    default:
      // A blend of appreciation + reach, lightly favouring recency.
      list.sort(
        (a, b) =>
          b.appreciations + b.views / 12 - (a.appreciations + a.views / 12),
      );
      break;
  }

  const total = list.length;
  const offset = cursor ? Math.max(0, parseInt(cursor, 10) || 0) : 0;
  const page = list.slice(offset, offset + PAGE_SIZE);
  const nextCursor = offset + PAGE_SIZE < total ? String(offset + PAGE_SIZE) : null;
  return { projects: page, nextCursor, total };
}

// ── URL <-> params ───────────────────────────────────────────────────────────

type Getter = { get(key: string): string | null };

export function parseFeedParams(sp: Getter): FeedParams {
  const mode: FeedMode = sp.get("mode") === "following" ? "following" : "discover";
  const rawCat = (sp.get("category") || "all") as CategoryId;
  const category = CATEGORIES.some((c) => c.id === rawCat) ? rawCat : "all";
  const rawSort = (sp.get("sort") || "noteworthy") as SortKey;
  const sort = SORTS.some((s) => s.id === rawSort) ? rawSort : "noteworthy";
  const q = sp.get("q") || "";
  return { mode, category, sort, q };
}

/** Address-bar query — omits defaults so shared URLs stay clean. */
export function toUrlQuery(p: FeedParams): string {
  const sp = new URLSearchParams();
  if (p.mode !== "discover") sp.set("mode", p.mode);
  if (p.category !== "all") sp.set("category", p.category);
  if (p.sort !== "noteworthy") sp.set("sort", p.sort);
  if (p.q.trim()) sp.set("q", p.q.trim());
  return sp.toString();
}

// ── Client fetch helpers ─────────────────────────────────────────────────────

export async function fetchFeed(
  params: FeedParams,
  cursor: string | null,
): Promise<FeedResponse> {
  const sp = new URLSearchParams();
  sp.set("mode", params.mode);
  sp.set("category", params.category);
  sp.set("sort", params.sort);
  if (params.q.trim()) sp.set("q", params.q.trim());
  if (cursor) sp.set("cursor", cursor);
  const res = await fetch(`/api/feed?${sp.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load feed");
  return res.json();
}

export async function postAppreciate(
  id: string,
  active: boolean,
): Promise<{ ok: boolean; active: boolean }> {
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}/appreciate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) throw new Error("Failed to appreciate");
  return res.json();
}

export async function postSave(
  id: string,
  active: boolean,
): Promise<{ ok: boolean; active: boolean }> {
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}/save`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) throw new Error("Failed to save");
  return res.json();
}
