// /innovations/[slug]/products/[productId] — one product of an Innovations
// post (plan §6, D2): media, 3D model and parts open to everyone; PCB,
// firmware and wiring come with a copy. Resolved on the client like the post.

import type { Metadata } from "next";
import * as React from "react";
import { PostProductPage } from "@/components/innovations/post-product-page";
import { PostProductSkeleton } from "@/components/innovations/post-states";
import { samplePostBySlug } from "@/lib/innovations/sample-posts";

type Props = { params: Promise<{ slug: string; productId: string }> };

/** postProductHref encodes the id; a stray "%" is left as it is. */
function idOf(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, productId } = await params;
  const post = samplePostBySlug(slug);
  const product = post?.products.find((p) => p.id === idOf(productId));
  if (!post || !product) return { title: "Innovations · IDEEZA" };
  return { title: `${product.name} · ${post.title} · Innovations · IDEEZA`, description: product.summary || undefined };
}

export default async function InnovationPostProductRoute({ params }: Props) {
  const { slug, productId } = await params;
  return (
    <React.Suspense fallback={<PostProductSkeleton />}>
      <PostProductPage slug={slug} productId={idOf(productId)} />
    </React.Suspense>
  );
}
