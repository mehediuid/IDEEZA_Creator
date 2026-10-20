// /tutorials/[category] — a category has no page of its own (the Figma draws none): its first
// tutorial page opens instead, and an unknown category is a 404.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { categoryBySlug, firstPageOf, pageHref } from "@/lib/tutorials/catalog";
import { TUTORIAL_CATEGORIES } from "@/lib/tutorials/content";

type Props = { params: Promise<{ category: string }> };

// An unknown category's 404 still names its tab.
export const metadata: Metadata = { title: "Tutorials · IDEEZA" };

export default async function TutorialCategoryRoute({ params }: Props) {
  const { category: slug } = await params;
  const category = categoryBySlug(TUTORIAL_CATEGORIES, slug);
  const first = category ? firstPageOf(category) : null;
  if (!category || !first) notFound();
  redirect(pageHref(category.slug, first.slug));
}
