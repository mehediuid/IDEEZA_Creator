// /tutorials/[category]/[topic] — one tutorial page (Figma User Panel V2 › Tutorial 38577:5727):
// the topics menu, the article with its videos, and Page Content.

import type { Metadata } from "next";
import { TopicPage } from "@/components/tutorials/topic-page";
import { findPage } from "@/lib/tutorials/catalog";
import { TUTORIAL_CATEGORIES } from "@/lib/tutorials/content";

type Props = { params: Promise<{ category: string; topic: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, topic } = await params;
  const match = findPage(TUTORIAL_CATEGORIES, category, topic);
  if (!match) return { title: "Tutorials · IDEEZA" };
  return { title: `${match.page.title} · ${match.category.title} · Tutorials · IDEEZA`, description: match.page.summary };
}

export default async function TutorialTopicRoute({ params }: Props) {
  const { category, topic } = await params;
  return <TopicPage categorySlug={category} pageSlug={topic} />;
}
