// /innovations/[slug] — an Innovations post (plan §5): a sample post, or a
// project this browser shared. A thin server wrapper: the post is resolved
// inside PostPage, against the sample posts and this browser's stores, with
// the skeleton until they are read. A sample post's title is known here; a
// post of this browser's own project gets its title from the client.

import type { Metadata } from "next";
import * as React from "react";
import { PostPage } from "@/components/innovations/post-page";
import { PostSkeleton } from "@/components/innovations/post-states";
import { samplePostBySlug } from "@/lib/innovations/sample-posts";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = samplePostBySlug(slug);
  if (!post) return { title: "Innovations · IDEEZA" };
  return { title: `${post.title} · Innovations · IDEEZA`, description: post.description || post.story || undefined };
}

export default async function InnovationPostRoute({ params }: Props) {
  const { slug } = await params;
  return (
    // PostPage reads `?focus=comments` (useSearchParams), which needs a Suspense boundary.
    <React.Suspense fallback={<PostSkeleton />}>
      <PostPage slug={slug} />
    </React.Suspense>
  );
}
