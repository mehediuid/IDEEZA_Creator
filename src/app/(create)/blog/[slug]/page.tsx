// /blog/[slug] — the writer's article page: the status card and the article as
// readers see it (spec § Screens 4). A thin server wrapper: the article is read
// from this browser's store inside ArticlePage, with the skeleton until then.

import { ArticlePage } from "@/components/blog/article/article-page";

type Props = { params: Promise<{ slug: string }> };

export default async function BlogArticleRoute({ params }: Props) {
  const { slug } = await params;
  return <ArticlePage slug={slug} />;
}
