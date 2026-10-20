// Reading the tutorial content: the pages of a category in menu order, one
// page by its address, its neighbours, its headings (the "Page Content"
// rail) and the counts the category card shows. Everything here is derived
// from the content, so a card can never disagree with the pages it opens.
//
// Pure, relative imports only.

import { addAmounts, compareAmounts, fromMicros, toMicros } from "../wallet/money";
import type { Amount } from "../wallet/types";
import type { TutorialBlock, TutorialCategory, TutorialTopic, TutorialVideo } from "./types";

/** A page in menu order, with the group it sits in (the menu's third level). */
export type PageEntry = { page: TutorialTopic; group: TutorialTopic | null };

export type PageMatch = {
  category: TutorialCategory;
  page: TutorialTopic;
  group: TutorialTopic | null;
  prev: PageEntry | null;
  next: PageEntry | null;
};

export type Heading = { level: 2 | 3; text: string; anchor: string };

export function isGroup(topic: TutorialTopic): boolean {
  return !!topic.children?.length;
}

/** Every page of a category, in the order the menu lists them. */
export function pagesOf(category: TutorialCategory): PageEntry[] {
  const out: PageEntry[] = [];
  for (const topic of category.topics) {
    if (isGroup(topic)) for (const child of topic.children!) out.push({ page: child, group: topic });
    else out.push({ page: topic, group: null });
  }
  return out;
}

export function categoryBySlug(categories: readonly TutorialCategory[], slug: string): TutorialCategory | null {
  return categories.find((c) => c.slug === slug) ?? null;
}

/** The page at /tutorials/<category>/<page>, with its neighbours within the category. */
export function findPage(categories: readonly TutorialCategory[], categorySlug: string, pageSlug: string): PageMatch | null {
  const category = categoryBySlug(categories, categorySlug);
  if (!category) return null;
  const pages = pagesOf(category);
  const at = pages.findIndex((p) => p.page.slug === pageSlug);
  if (at < 0) return null;
  return {
    category,
    page: pages[at].page,
    group: pages[at].group,
    prev: pages[at - 1] ?? null,
    next: pages[at + 1] ?? null,
  };
}

export function pageHref(categorySlug: string, pageSlug: string): string {
  return `/tutorials/${categorySlug}/${pageSlug}`;
}

export function firstPageOf(category: TutorialCategory): TutorialTopic | null {
  return pagesOf(category)[0]?.page ?? null;
}

export function videosOfPage(page: TutorialTopic): TutorialVideo[] {
  return (page.blocks ?? []).filter((b): b is TutorialVideo => b.kind === "video");
}

export function videosOf(category: TutorialCategory): TutorialVideo[] {
  return pagesOf(category).flatMap((p) => videosOfPage(p.page));
}

/** A video that can be watched: its file has arrived (D1). */
export function isAvailable(video: TutorialVideo): boolean {
  return !!video.src;
}

export type CategoryStats = {
  /** Pages, the menu's readable topics. */
  topics: number;
  /** Videos that can be watched now. */
  videos: number;
  /** Video slots still waiting for their file. */
  comingSoon: number;
  /** What the watchable videos pay together. */
  idz: Amount;
};

export function statsOf(category: TutorialCategory): CategoryStats {
  const videos = videosOf(category);
  const ready = videos.filter(isAvailable);
  return {
    topics: pagesOf(category).length,
    videos: ready.length,
    comingSoon: videos.length - ready.length,
    idz: ready.length ? addAmounts(...ready.map((v) => v.reward)) : "0",
  };
}

/** "1 Topic" · "3 Topics". */
export function countLabel(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** The Figma's amounts keep one decimal at least: "2" → "2.0", "2.5" → "2.5", "0.25" → "0.25". */
export function formatIdz(amount: Amount): string {
  const n = toMicros(amount);
  const plain = n === null ? amount : fromMicros(n);
  return plain.includes(".") ? plain : `${plain}.0`;
}

export function isZero(amount: Amount): boolean {
  return compareAmounts(amount, "0") === 0;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

/** The page's H2s and H3s with unique anchors, in reading order. The same anchors
 *  `anchorsOf` hands the body, so a rail link always finds its heading. */
export function headingsOf(blocks: readonly TutorialBlock[]): Heading[] {
  const used = new Map<string, number>();
  const out: Heading[] = [];
  for (const b of blocks) {
    if (b.kind !== "heading") continue;
    const base = slugify(b.text);
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    out.push({ level: b.level, text: b.text, anchor: n ? `${base}-${n + 1}` : base });
  }
  return out;
}

/** Each heading block's anchor, by its index in `blocks`. */
export function anchorsOf(blocks: readonly TutorialBlock[]): Map<number, string> {
  const headings = headingsOf(blocks);
  const out = new Map<number, string>();
  let h = 0;
  blocks.forEach((b, i) => {
    if (b.kind === "heading") out.set(i, headings[h++].anchor);
  });
  return out;
}
