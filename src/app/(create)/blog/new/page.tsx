// /blog/new — Create new blog: an empty editor. Nothing is stored until there is
// something to keep; then the blog is created and the address becomes its edit
// address in place.

import type { Metadata } from "next";
import { BlogEditorRoute } from "@/components/blog/editor/editor-route";

export const metadata: Metadata = { title: "Create new blog · Blog · IDEEZA" };

export default function NewArticlePage() {
  return <BlogEditorRoute slug={null} />;
}
