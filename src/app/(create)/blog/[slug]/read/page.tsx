// /blog/[slug]/read — the reading view of the published version (owner D-1): what
// "View to website" opens and Copy link copies. Read from this browser's store
// inside ArticleRead; a public route for readers elsewhere is Later.

import { ArticleRead } from "@/components/blog/article/article-read";

type Props = { params: Promise<{ slug: string }> };

export default async function BlogReadRoute({ params }: Props) {
  const { slug } = await params;
  return <ArticleRead slug={slug} />;
}
