// /blog/[slug]/preview — the draft in the reader view, under a preview bar
// (spec § IA and routes). Read from this browser's store inside ArticlePreview.

import { ArticlePreview } from "@/components/blog/article/article-preview";

type Props = { params: Promise<{ slug: string }> };

export default async function BlogPreviewRoute({ params }: Props) {
  const { slug } = await params;
  return <ArticlePreview slug={slug} />;
}
