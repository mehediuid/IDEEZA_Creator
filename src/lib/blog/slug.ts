// Article addresses: the title for people, the end of the id for the app. A
// renamed article keeps working at its old address, because only the id tail
// is matched; the page then replaces the URL with the current slug.

import { slugify } from "../innovations/slug";
import { displayTitle } from "./article";
import type { BlogArticle, BlogData } from "./types";

const tailOf = (id: string) => id.toLowerCase().replace(/[^a-z0-9]/g, "").slice(-8);

/** "designing-a-2-layer-pcb-for-a-smart-lamp-k3v9x2qa". */
export function articleSlug(a: Pick<BlogArticle, "id"> & { title: string }): string {
  const title = a.title.trim() === "Untitled draft" ? "" : a.title;
  return `${slugify(title) || "untitled"}-${tailOf(a.id)}`;
}

/** The article's current address, from the title readers see. */
export function slugOf(a: BlogArticle): string {
  return articleSlug({ id: a.id, title: displayTitle(a) });
}

export function findBySlug(data: BlogData, slug: string): BlogArticle | null {
  const tail = slug.toLowerCase().split("-").pop() ?? "";
  if (tail.length < 4) return null;
  return data.articles.find((a) => tailOf(a.id) === tail) ?? null;
}

export const blogHref = () => "/blog";
export const newArticleHref = () => "/blog/new";
export const articleHref = (slug: string) => `/blog/${slug}`;
export const editHref = (slug: string) => `/blog/${slug}/edit`;
export const previewHref = (slug: string) => `/blog/${slug}/preview`;
