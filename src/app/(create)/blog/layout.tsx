// /blog — your articles, the editor and each article's page (spec
// docs/superpowers/specs/2026-10-14-blog-design.md). Pages read the list's
// state from the URL (useSearchParams), so they render under Suspense. One toast
// for every Blog page (the Innovations toast: polite, one at a time).

import type { Metadata } from "next";
import * as React from "react";
import { PostToastProvider } from "@/components/innovations/toast";

export const metadata: Metadata = { title: "Blog · IDEEZA" };

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <PostToastProvider>
      <React.Suspense fallback={<div className="h-full bg-bg-page" />}>{children}</React.Suspense>
    </PostToastProvider>
  );
}
