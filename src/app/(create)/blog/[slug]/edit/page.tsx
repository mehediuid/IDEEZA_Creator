// /blog/[slug]/edit — Edit blog: the editor for one blog. The blog is found by the
// end of its id, so an old address still works; the page then shows its current address.

import type { Metadata } from "next";
import { BlogEditorRoute } from "@/components/blog/editor/editor-route";

export const metadata: Metadata = { title: "Edit blog · Blog · IDEEZA" };

export default async function EditArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BlogEditorRoute slug={slug} />;
}
