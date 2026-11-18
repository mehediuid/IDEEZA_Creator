"use client";

import { useParams } from "next/navigation";
import { BlogArticleScreen } from "@/components/mobile/feed/blog-article";

// Global Search › Blog › an article (mobile Figma "When click any card on previous blog then redirect to this page").
export default function Page() {
  const { slug } = useParams<{ slug: string }>();
  return <BlogArticleScreen slug={decodeURIComponent(slug)} />;
}
